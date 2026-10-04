"""
«Επίθεση» στη δική μας εφαρμογή: ελέγχει ότι τα μέτρα ασφαλείας δουλεύουν.
Τρέχει σε προσωρινό φάκελο, δεν αγγίζει τα δεδομένα σου, δεν χρειάζεται internet:

    python code/tests/test_security.py

Καλύπτει: κεφαλίδες/cookies, CSRF (Origin), endpoints χωρίς σύνδεση, κανόνες κωδικού, όρια
προσπαθειών/κλείδωμα/CAPTCHA, 2FA (TOTP, εφεδρικοί, email), επαναφορά κωδικού, IDOR / απομόνωση
χρηστών, αλλοίωση πεδίων, SQL injection, XSS, uploads, «κομμένες» απαντήσεις, όρια χρήσης, 404.
"""
import io
import os
import re
import sys
import tempfile
import time
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-sec-'))
os.environ.update({
    'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
    'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'), 'LASCA_PROJECTS_DIR': str(TMP / 'projects'),
    'MAX_PROJECTS_PER_USER': '6', 'PUBLIC_URL': 'http://localhost', 'RESEND_API_KEY': '',
})
os.environ.pop('LASCA_ENV', None)
os.environ.pop('TURNSTILE_SECRET_KEY', None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main_4_app as m  # noqa: E402
import auth_security as sec  # noqa: E402
from security import limiter  # noqa: E402

FAILS = []


def ok(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


PW = 'Strong-Survey-Pass-42!'
_ip = [10]


def client(ip=None, origin='http://localhost'):
    c = m.app.test_client()
    _ip[0] += 1
    c.environ_base['REMOTE_ADDR'] = ip or f'10.0.0.{_ip[0]}'
    if origin:
        c.environ_base['HTTP_ORIGIN'] = origin
    return c


def signup(email, pw=PW, **extra):
    c = client()
    r = c.post('/api/register', json={'email': email, 'password': pw, 'display_name': email.split('@')[0],
                                      'accept_terms': True, 'age_confirmed': True, **extra})
    return c, r


SENT = []
sec.send_email = lambda to, subject, html, dev_hint=None: SENT.append((to, subject, html)) or True
sec.email_enabled = lambda: True

# ---------------------------------------------------------------- headers / cookies
alice, r = signup('alice@lasca.test')
ok(r.status_code == 200, 'signup with strong password')
cookie = r.headers.get('Set-Cookie', '')
ok('HttpOnly' in cookie and 'SameSite=Strict' in cookie, 'session cookie is HttpOnly + SameSite=Strict')
h = alice.get('/api/me').headers
ok("frame-ancestors 'none'" in h.get('Content-Security-Policy', '') and "object-src 'none'" in h['Content-Security-Policy'],
   'CSP sent (no framing, no plugins)')
ok(h.get('X-Content-Type-Options') == 'nosniff' and h.get('X-Frame-Options') == 'DENY', 'nosniff + X-Frame-Options')
ok(h.get('Cache-Control') == 'no-store', 'API responses are not cached')
ok('Referrer-Policy' in h and 'Permissions-Policy' in h, 'Referrer-Policy + Permissions-Policy')
ok("'unsafe-eval'" not in h['Content-Security-Policy'] and "script-src 'self'" in h['Content-Security-Policy'],
   'no inline/eval scripts allowed by CSP')

# ---------------------------------------------------------------- CSRF / origin
ok(client(origin=None).post('/api/login', json={'email': 'a@b.cc', 'password': 'x'}).status_code == 403,
   'POST without Origin is blocked')
evil = alice.post('/api/me/logout-all', headers={'Origin': 'https://evil.example'})
ok(evil.status_code == 403 and evil.json['code'] == 'bad_origin', 'cross-site POST with session cookie is blocked')
ok(alice.get('/api/me').status_code == 200, 'session still valid after blocked CSRF')

# ---------------------------------------------------------------- unauthenticated access
anon = client()
public = set(m.PUBLIC_API_PATHS)
leaks = []
for rule in m.app.url_map.iter_rules():
    path = rule.rule
    if not path.startswith('/api/') or path in public or path.startswith('/api/invites/'):
        continue
    url = re.sub(r'<(?:int:)?[^>]+>', '1', path)
    for method in sorted(rule.methods - {'HEAD', 'OPTIONS'}):
        resp = anon.open(url, method=method, json={})
        if resp.status_code != 401:
            leaks.append(f'{method} {path} -> {resp.status_code}')
ok(not leaks, f'every private API route needs login ({len(leaks)} leaks: {leaks[:5]})')

# ---------------------------------------------------------------- password policy
for weak, why in [('short1!A', 'too short'), ('alllowercase-123', 'no uppercase'), ('NoSymbolsHere123', 'no symbol'),
                  ('Password123!', 'common word + digits'), ('P@ssw0rd2024!', 'leet common'),
                  ('aaaaaaaaaaaA1!', 'repeated chars'), ('bob-SURVEYOR-1!x', 'contains email')]:
    _, r = signup('bob-surveyor@lasca.test' if why == 'contains email' else f'weak{abs(hash(weak)) % 999}@lasca.test', weak)
    ok(r.status_code == 400 and r.json.get('code') in ('weak_password', 'common_password'), f'weak password rejected ({why})')
ok(sec.is_common_password('password123') and sec.is_common_password('12345678'), 'common list blocks password123/12345678')
_, r = signup('noterms@lasca.test', accept_terms=False)
ok(r.status_code == 400 and r.json['code'] == 'terms_required', 'signup requires accepting terms')
_, r = signup('noage@lasca.test', age_confirmed=False)
ok(r.status_code == 400 and r.json['code'] == 'age_required', 'signup requires age confirmation (age gate)')
_, r = signup('bot@lasca.test', website='http://spam')
ok(r.status_code == 400 and r.json['code'] == 'spam', 'honeypot field blocks bots')
_, r = signup('alice@lasca.test')
ok(r.status_code == 409, 'duplicate email rejected')
sec.A.hibp_enabled = True
_orig_pwned = sec.pwned_count
sec.pwned_count = lambda pw: 12345 if pw == 'Leaked-But-Long-9!' else 0
_, r = signup('breach@lasca.test', 'Leaked-But-Long-9!')
ok(r.status_code == 400 and r.json['code'] == 'breached_password', 'breached password (haveibeenpwned) rejected')
sec.pwned_count = _orig_pwned
sec.A.hibp_enabled = False
ok(client().post('/api/auth/password-check', json={'password': 'Password123!'}).json['ok'] is False,
   'live password check endpoint flags weak passwords')

# ---------------------------------------------------------------- brute force protection
carol, _ = signup('carol@lasca.test')
attacker = client(ip='66.66.66.66')
codes = [attacker.post('/api/login', json={'email': 'carol@lasca.test', 'password': f'wrong{i}'}).status_code
         for i in range(7)]
ok(codes[:3] == [401, 401, 401] and 429 in codes, f'IP limited after 5 failures / backoff kicks in ({codes})')
r = attacker.post('/api/login', json={'email': 'carol@lasca.test', 'password': PW})
ok(r.status_code == 429, 'even the right password is refused from the blocked IP')
frank, _ = signup('frank@lasca.test')
r = client().post('/api/login', json={'email': 'nobody@lasca.test', 'password': 'whatever'})
r2 = client().post('/api/login', json={'email': 'frank@lasca.test', 'password': 'whatever'})
ok(r.status_code == r2.status_code == 401 and r.json['error'].split('.')[0] == r2.json['error'].split('.')[0],
   'unknown email and wrong password give the same answer (no account enumeration)')

with m.app.app_context():
    n_failed = m.AuthEvent.query.filter_by(event='login_failed').count()
ok(n_failed >= 5, f'all failed attempts are logged ({n_failed})')

# account lockout from many IPs (distributed attack)
dave, _ = signup('dave@lasca.test')
from datetime import datetime, timedelta  # noqa: E402
with m.app.app_context():
    for i in range(10):   # 10 αποτυχίες από διαφορετικές IP (χωρίς να περιμένουμε το backoff)
        m.db.session.add(m.AuthEvent(event='login_failed', email='dave@lasca.test', ip=f'77.0.0.{i}',
                                     created_at=datetime.utcnow()))
    m.db.session.commit()
r = client().post('/api/login', json={'email': 'dave@lasca.test', 'password': PW})
ok(r.status_code == 423 and r.json['code'] == 'account_locked' and r.json['retry_after'] > 60,
   'account locked after 10 failures (even with right password)')

# CAPTCHA after 3 failures (when Turnstile is configured)
sec.A.turnstile_site, sec.A.turnstile_secret = 'site', 'secret'
sec.verify_captcha = lambda token: token == 'good-token'
erin, _ = signup('erin@lasca.test', captcha_token='good-token')
ec = client()
for i in range(3):
    ec.post('/api/login', json={'email': 'erin@lasca.test', 'password': f'bad{i}'})
    time.sleep(1.1 * (2 ** max(0, i - 2)))
r = ec.post('/api/login', json={'email': 'erin@lasca.test', 'password': PW})
ok(r.status_code == 400 and r.json['code'] == 'captcha_required', 'CAPTCHA required after 3 failures')
time.sleep(1.2)
r = ec.post('/api/login', json={'email': 'erin@lasca.test', 'password': PW, 'captcha_token': 'good-token'})
ok(r.status_code == 200, 'login works with solved CAPTCHA')
_, r = signup('nocaptcha@lasca.test')
ok(r.status_code == 400 and r.json['code'] == 'captcha_required', 'signup needs CAPTCHA when configured')
sec.A.turnstile_site = sec.A.turnstile_secret = ''

# ---------------------------------------------------------------- 2FA
r = alice.post('/api/me/2fa/setup')
secret = r.json['secret']
ok(r.status_code == 200 and r.json['otpauth_uri'].startswith('otpauth://totp/') and (r.json['qr'] or '').startswith('data:image/svg'),
   '2FA setup returns secret + QR')
ok(alice.post('/api/me/2fa/enable', json={'code': '000000'}).status_code == 400, 'wrong code does not enable 2FA')
step = int(time.time()) // 30
r = alice.post('/api/me/2fa/enable', json={'code': sec.totp_at(secret, step)})
backup = r.json.get('backup_codes', [])
ok(r.status_code == 200 and len(backup) == 10, '2FA enabled, 10 backup codes shown once')
with m.app.app_context():
    u = m.User.query.filter_by(email='alice@lasca.test').first()
    ok(secret not in (u.totp_secret_enc or '') and all(c not in (u.backup_codes or '') for c in backup),
       'TOTP secret encrypted and backup codes hashed in the database')
me = alice.get('/api/me').json
ok(me['two_factor_enabled'] is True and not any(k in me for k in ('totp_secret_enc', 'backup_codes', 'password_hash')),
   '/api/me exposes no secrets')

a2 = client()
r = a2.post('/api/login', json={'email': 'alice@lasca.test', 'password': PW})
ok(r.status_code == 200 and r.json.get('requires_2fa') and a2.get('/api/me').status_code == 401,
   'password alone is not enough when 2FA is on')
ok(a2.post('/api/auth/2fa/verify', json={'code': '123456'}).status_code == 401, 'wrong TOTP rejected')
r = a2.post('/api/auth/2fa/verify', json={'code': sec.totp_at(secret, step)})
ok(r.status_code == 401, 'TOTP code cannot be replayed')
r = a2.post('/api/auth/2fa/verify', json={'code': backup[0], 'method': 'backup'})
ok(r.status_code == 200 and a2.get('/api/me').status_code == 200, 'backup code completes login')
a3 = client()
a3.post('/api/login', json={'email': 'alice@lasca.test', 'password': PW})
ok(a3.post('/api/auth/2fa/verify', json={'code': backup[0], 'method': 'backup'}).status_code == 401,
   'backup code works only once')
r = a3.post('/api/auth/2fa/email')
code = re.search(r'>(\d{6})<', SENT[-1][2]).group(1) if SENT else ''
ok(r.status_code == 200 and code, 'email OTP sent')
ok(a3.post('/api/auth/2fa/verify', json={'code': code, 'method': 'email'}).status_code == 200, 'email OTP completes login')
a4 = client()
a4.post('/api/login', json={'email': 'alice@lasca.test', 'password': PW})
results = [a4.post('/api/auth/2fa/verify', json={'code': f'{i:06d}'}).status_code for i in range(7)]
ok(429 in results, f'2FA verification is rate limited ({results})')
with m.app.app_context():   # νέο παράθυρο 15 λεπτών για τα λάθη 2FA της alice
    m.AuthEvent.query.filter_by(event='2fa_failed').delete()
    m.db.session.commit()
dev = client()
r = dev.post('/api/auth/device-token', json={'email': 'alice@lasca.test', 'password': PW})
ok(r.status_code == 401 and r.json['code'] == '2fa_required', 'desktop app login also requires 2FA')
r = dev.post('/api/auth/device-token', json={'email': 'alice@lasca.test', 'password': PW, 'otp': backup[1]})
ok(r.status_code == 201, 'desktop app login with backup code')
ok(alice.post('/api/me/2fa/disable', json={'password': 'wrong', 'code': backup[2]}).status_code == 403,
   'disabling 2FA needs the password')

# ---------------------------------------------------------------- forgot / reset password
SENT.clear()
fr = client()
r1 = fr.post('/api/auth/forgot', json={'email': 'carol@lasca.test'})
r2 = fr.post('/api/auth/forgot', json={'email': 'ghost@lasca.test'})
ok(r1.status_code == r2.status_code == 200 and r1.json == r2.json, 'forgot-password gives the same answer for unknown emails')
link = re.search(r'href="([^"]+)"', SENT[0][2]).group(1) if SENT else ''
token = link.split('#token=')[-1]
ok('#token=' in link and len(SENT) == 1, 'reset link sent only to the real account, token in URL fragment')
carol_session = client()
carol_session.post('/api/login', json={'email': 'carol@lasca.test', 'password': PW})
ok(fr.post('/api/auth/reset', json={'token': token, 'password': 'short'}).status_code == 400,
   'reset enforces password rules')
NEWPW = 'Reset-Into-New-Pass-77#'
ok(fr.post('/api/auth/reset', json={'token': token, 'password': NEWPW}).status_code == 200, 'password reset works')
ok(fr.post('/api/auth/reset', json={'token': token, 'password': NEWPW + 'x'}).status_code == 410, 'reset link is single-use')
ok(fr.post('/api/auth/reset', json={'token': 'forged-token', 'password': NEWPW}).status_code == 410, 'forged token rejected')
with m.app.app_context():
    row = m.PasswordReset.query.first()
    ok(row.token_hash != token, 'reset token stored only as hash')
r = client().post('/api/login', json={'email': 'carol@lasca.test', 'password': NEWPW})
ok(r.status_code == 200, 'login with the new password')
limits = [client(ip='55.5.5.5').post('/api/auth/forgot', json={'email': f'x{i}@lasca.test'}).status_code for i in range(7)]
ok(429 in limits, f'forgot-password is rate limited per IP ({limits})')

# ---------------------------------------------------------------- IDOR / user isolation
owner, _ = signup('owner@lasca.test')
mallory, _ = signup('mallory@lasca.test')
meta = owner.post('/api/projects/load', json={'project_name': 'Μυστικό Project'}).json['_meta']
pid = meta['public_id']
owner.post('/api/projects/save', json={'project_name': 'Μυστικό Project', 'state': {'traverse_data': [{'x': 1}]}})
inv = owner.post(f'/api/projects/{pid}/invites', json={'role': 'viewer'}).json['invite']
attempts = {
    'state': mallory.get(f'/api/projects/{pid}/state'),
    'sync': mallory.post(f'/api/projects/{pid}/sync', json={}),
    'activity': mallory.get(f'/api/projects/{pid}/activity'),
    'members': mallory.get(f'/api/projects/{pid}/members'),
    'add member': mallory.post(f'/api/projects/{pid}/members', json={'email': 'mallory@lasca.test'}),
    'invites': mallory.get(f'/api/projects/{pid}/invites'),
    'revoke invite': mallory.delete(f'/api/projects/{pid}/invites/{inv["id"]}'),
    'put state': mallory.put(f'/api/projects/{pid}/state', json={'state': {}}),
    'load by name': mallory.post('/api/projects/load', json={'project_name': 'Μυστικό Project'}),
    'load by casefold name': mallory.post('/api/projects/load', json={'project_name': 'μυστικό project'}),
    'save by name': mallory.post('/api/projects/save', json={'project_name': 'Μυστικό Project', 'state': {}}),
    'delete by name': mallory.delete('/api/projects/Μυστικό Project'),
    'transfer': mallory.post(f'/api/projects/{pid}/transfer', json={'user_id': 1}),
    'compute with project': mallory.post('/api/tachymetry', json={'project': 'Μυστικό Project'}),
}
bad = {k: v.status_code for k, v in attempts.items() if v.status_code not in (401, 403, 404)}
ok(not bad, f'another user cannot read/modify a private project ({bad})')
ok(all('traverse_data' not in (v.get_data(as_text=True)) for v in attempts.values()), 'no project data leaks in errors')
ok(owner.get(f'/api/projects/{pid}/state').json['state']['traverse_data'] == [{'x': 1}], 'owner data untouched')
mid = owner.get('/api/me').json['id']
ok(mallory.get(f'/api/users/{mid}/avatar').status_code in (403, 404), 'cannot fetch avatar of a stranger')
lk = mallory.get('/api/users/lookup?q=owner').json['users']
ok(lk == [], 'user lookup does not list strangers by partial name')

# ---------------------------------------------------------------- field tampering
r = mallory.put('/api/me', json={'display_name': 'Mal', 'email': 'admin@lasca.test', 'id': 1, 'session_version': 99,
                                 'totp_enabled': True, 'has_password': False})
me = mallory.get('/api/me').json
ok(me['email'] == 'mallory@lasca.test' and me['two_factor_enabled'] is False and me['has_password'] is True,
   'profile update ignores protected fields (email, id, 2FA, password flags)')
r = mallory.post('/api/projects', json={'name': 'Δικό μου', 'owner_id': mid, 'state': {'_meta': {'role': 'owner'}}})
with m.app.app_context():
    p = m.Project.query.filter_by(public_id=r.json['project']['public_id']).first()
    ok(p.owner_id != mid, 'cannot create a project owned by someone else')
r = owner.post(f'/api/projects/{pid}/invites', json={'role': 'owner'})
ok(r.json['invite']['role'] == 'editor', 'invite role cannot be escalated to owner')

# ---------------------------------------------------------------- input validation / injection
for payload in ["' OR '1'='1", "admin@lasca.test' --", '"; DROP TABLE users; --']:
    r = client().post('/api/login', json={'email': payload, 'password': payload})
    ok(r.status_code in (400, 401), f'SQL injection in login handled ({r.status_code})')
r = owner.get("/api/users/lookup?q=' OR 1=1 --")
ok(r.status_code == 200 and r.json['users'] == [], 'SQL injection in lookup returns nothing')
with m.app.app_context():
    ok(m.User.query.count() > 5, 'users table intact')
for name in ['../../etc', 'a/b', 'con:1', '..', 'x' * 200, '<script>']:
    r = owner.post('/api/projects/load', json={'project_name': name})
    ok(r.status_code == 400, f'bad project name rejected: {name[:20]!r}')
r = owner.post('/api/projects/load', json={'project_name': ['list']})
ok(r.status_code == 400, 'non-string project name rejected')
r = client().post('/api/login', json=['not', 'an', 'object'])
ok(r.status_code == 400, 'non-object JSON rejected')

# XSS: stored as text, returned as JSON (React escapes on render), control chars removed
r = owner.put('/api/me', json={'display_name': '<img src=x onerror=alert(1)>‮\u0000Οwner'})
ok(r.status_code == 200 and r.mimetype == 'application/json' and '‮' not in r.json['display_name']
   and '\x00' not in r.json['display_name'], 'display name is sanitized (no control/bidi chars), served as JSON')
html = sec._email_layout('<b>t</b>', '')
ok('<b>t</b>' not in html, 'email templates escape user text')

# ---------------------------------------------------------------- uploads
r = owner.put('/api/me', data={'avatar': (io.BytesIO(b'<svg onload=alert(1)>'), 'a.png')}, content_type='multipart/form-data')
ok(r.status_code == 400, 'avatar: fake image rejected')
r = owner.put('/api/me', data={'avatar': (io.BytesIO(b'<html><script>alert(1)</script>'), 'x.html')},
              content_type='multipart/form-data')
ok(r.status_code == 400, 'avatar: HTML file rejected')
r = owner.post('/api/feedback', data={'type': 'bug', 'message': 'hi', 'screenshot': (io.BytesIO(b'MZ\x90\x00 fake exe'), 's.png')},
               content_type='multipart/form-data')
ok(r.status_code == 400, 'feedback: non-image screenshot rejected')
big = io.BytesIO(b'0' * (9 * 1024 * 1024))
r = owner.put('/api/me', data={'avatar': (big, 'big.png')}, content_type='multipart/form-data')
ok(r.status_code == 413, 'oversized upload rejected (413)')
ok(m._sanitize_image(b'GIF89a....') is None, 'only PNG/JPG/WEBP accepted by image sanitizer')

# ---------------------------------------------------------------- quotas / throttling
quota = [owner.post('/api/projects', json={'name': f'Q{i}'}).status_code for i in range(8)]
ok(403 in quota, f'project quota enforced ({quota})')
limiter.reset()
burst = client(ip='88.8.8.8')
codes = [burst.post('/api/register', json={}).status_code for _ in range(45)]
ok(429 in codes, 'auth endpoints throttled per IP (in-memory layer)')
limiter.reset()

# ---------------------------------------------------------------- misc
r = client().get('/totally-unknown-page')
ok(r.status_code == 404 and b'<div id="root">' in r.data if r.status_code == 404 and r.data else r.status_code == 404,
   'unknown page returns the app 404 page with status 404')
ok(client().get('/api/nope').status_code == 401 and owner.get('/api/nope').status_code == 404,
   'unknown API route: 401 for guests (nothing revealed), JSON 404 for users')
ok(client().get('/login').status_code in (200, 404), 'SPA route served')
r = client().get('/robots.txt')
ok(r.status_code == 200 and 'Disallow: /api/' in r.get_data(as_text=True) and 'Sitemap:' in r.get_data(as_text=True), 'robots.txt')
r = client().get('/sitemap.xml')
ok(r.status_code == 200 and '<loc>http://localhost/privacy</loc>' in r.get_data(as_text=True), 'sitemap.xml')
r = client().get('/api/auth/config').json
ok(set(r) >= {'google_client_id', 'captcha_site_key', 'password_min'} and 'secret' not in str(r).lower(),
   'auth config exposes only public values')
r = owner.get('/api/me/security-events').json['events']
ok(any(e['event'] == 'login_success' or e['event'] == 'signup' for e in r) and all('…' in (e['ip'] or '…') for e in r),
   'security log visible to the user with masked IPs')

print()
if FAILS:
    print(f'{len(FAILS)} FAILED:')
    for f in FAILS:
        print('  -', f)
    sys.exit(1)
print('ALL SECURITY CHECKS PASS')
