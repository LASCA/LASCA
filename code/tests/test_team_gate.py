"""Έλεγχος της «πόρτας» της ομάδας (TEAM_GATE_PASSWORD).   python code/tests/test_team_gate.py"""
import os, sys, tempfile
from pathlib import Path
TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
                   'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'), 'LASCA_PROJECTS_DIR': str(TMP / 'projects'),
                   'TEAM_GATE_PASSWORD': 'Ομάδα-LASCA-2026', 'PUBLIC_URL': 'https://lasca.gr'})
os.environ.pop('LASCA_ENV', None)
os.environ['REQUIRE_EMAIL_VERIFICATION'] = '0'  # εδώ δεν ελέγχεται η επιβεβαίωση email (βλ. test_security)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import main_4_app as m  # noqa: E402
ok = lambda c, msg: print(('PASS ' if c else 'FAIL ') + msg) or (c or sys.exit(1))

with m.app.app_context():
    u = m.User(email='a@lasca.test', display_name='A'); u.set_password('Lasca-Test-Pass-2026!'); m.db.session.add(u); m.db.session.commit()

c = m.app.test_client()
r = c.get('/'); ok(r.status_code == 401 and 'Κωδικός ομάδας' in r.get_data(as_text=True), 'landing page asks for the team password')
ok(r.headers.get('X-Robots-Tag', '').startswith('noindex'), 'not indexed by search engines')
ok(c.get('/assets/x.js').status_code == 401, 'static files hidden too')
r = c.post('/api/register', json={'email': 'x@y.z'}); ok(r.status_code == 401 and r.json['code'] == 'team_gate', 'API (e.g. sign up) closed to strangers')
r = c.post('/team-gate', data={'password': 'λάθος', 'next': '/login'}); ok(r.status_code == 401 and 'Λάθος κωδικός' in r.get_data(as_text=True), 'wrong password')
r = c.post('/team-gate', data={'password': 'Ομάδα-LASCA-2026', 'next': '//evil.example'}, headers={'Origin': 'https://lasca.gr'})
ok(r.status_code == 303 and r.headers['Location'].endswith('/') and 'evil' not in r.headers['Location'], 'no open redirect')
ok('HttpOnly' in r.headers.get('Set-Cookie', '') and 'SameSite=Lax' in r.headers.get('Set-Cookie', ''), 'gate cookie HttpOnly + Lax')
ok(c.get('/').status_code in (200, 404), 'after password: site opens')  # 404 όταν δεν υπάρχει build του frontend
ok(c.get('/api/auth/config').status_code == 200, 'API reachable after gate')
x = m.app.test_client()
ok(x.post('/team-gate', data={'password': 'Ομάδα-LASCA-2026'}, headers={'Origin': 'https://evil.example'}).status_code == 403, 'gate form not postable from other sites')
# πρόγραμμα των Windows
d = m.app.test_client()
r = d.post('/api/auth/device-token', json={'email': 'a@lasca.test', 'password': 'Lasca-Test-Pass-2026!'})
ok(r.status_code == 201, 'desktop app can still log in (no browser)')
tok = r.json['token']
ok(d.get('/api/me/projects', headers={'Authorization': f'Bearer {tok}'}).status_code == 200, 'desktop Bearer requests pass')
ok(d.get('/api/me/projects', headers={'Authorization': 'Bearer wrong'}).status_code == 401, 'fake Bearer still needs a real account')
r = d.get('/api/me', headers={'Authorization': f'Bearer {tok}'})
ok(r.status_code == 200 and r.json.get('email') == 'a@lasca.test', 'desktop can read its profile (/api/me) with a real key')
r = d.get('/api/me', headers={'Authorization': 'Bearer wrong'})
ok(r.status_code == 401 and r.json.get('code') == 'invalid_token', 'fake/revoked Bearer on /api/me: 401 so the exe logs out')
ok(d.post('/api/register', json={'email': 'x@y.z'}, headers={'Authorization': 'Bearer fake'}).status_code == 401, 'fake Bearer cannot reach sign up')
ok(d.get('/', headers={'Authorization': 'Bearer fake'}).status_code == 401, 'fake Bearer cannot see pages')
ok(d.post('/api/auth/desktop/start', json={'challenge': 'a' * 64}).status_code == 201, 'desktop browser-login start passes')
z = m.app.test_client()
for _ in range(10): z.post('/team-gate', data={'password': 'no'})
ok(z.post('/team-gate', data={'password': 'Ομάδα-LASCA-2026'}).status_code == 429, 'brute force limited')
print('\nALL TEAM-GATE CHECKS PASS')
