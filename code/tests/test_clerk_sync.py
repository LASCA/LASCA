"""
Έλεγχος: σύνδεση των λογαριασμών του Clerk με τη lasca.db (code/clerk_sync.py).
Παλιοί χρήστες κρατούν projects/συνεργάτες, webhook (υπογραφή Svix) για αλλαγές και διαγραφές,
διαγραφή από το Προφίλ σβήνει και τον χρήστη στο Clerk, εισαγωγή κωδικών (deploy/clerk_import.py).

    python code/tests/test_clerk_sync.py
"""
import base64, hashlib, hmac, json, os, sys, tempfile, time
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
                   'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'),
                   'LASCA_PROJECTS_DIR': str(TMP / 'projects'), 'API_THROTTLE': '0'})
os.environ.pop('LASCA_ENV', None)
os.environ['REQUIRE_EMAIL_VERIFICATION'] = '0'
os.environ.pop('CLERK_WEBHOOK_SECRET', None)
os.environ['CLERK_PUBLISHABLE_KEY'] = 'pk_test_' + __import__('base64').b64encode(b'clerk.lasca.test$').decode().rstrip('=')
# Δοκιμάζει τη συνύπαρξη παλιάς σύνδεσης + Clerk (μετάβαση). Στην παραγωγή η παλιά σύνδεση είναι κλειστή:
# βλ. code/tests/test_production_hardening.py.
os.environ['LEGACY_AUTH'] = '1'
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / 'deploy'))

import main_4_app as m  # noqa: E402
import clerk_sync  # noqa: E402

PW = 'Lasca-Test-Pass-2026!'
ok = lambda cond, msg: print(('PASS ' if cond else 'FAIL ') + msg) or (cond or sys.exit(1))

with m.app.app_context():
    for email, name in (('savvas@lasca.test', 'Σάββας'), ('alex@lasca.test', 'Αλέξανδρος'),
                        ('ilias@lasca.test', 'Ηλίας'), ('kostas@lasca.test', 'Κώστας')):
        u = m.User(email=email, display_name=name, email_verified=True); u.set_password(PW); m.db.session.add(u)
    m.db.session.commit()
    IDS = {u.email: u.id for u in m.User.query.all()}


def client(email):
    c = m.app.test_client(); c.environ_base['HTTP_ORIGIN'] = 'http://localhost'
    r = c.post('/api/login', json={'email': email, 'password': PW}); assert r.status_code == 200, r.json
    return c


S, A = client('savvas@lasca.test'), client('alex@lasca.test')
st = S.post('/api/projects/load', json={'project_name': 'Όδευση Campus'}).json
pid = st['_meta']['public_id']
S.post(f'/api/projects/{pid}/members', json={'email': 'alex@lasca.test', 'role': 'editor'})
S.post('/api/projects/load', json={'project_name': 'Μόνο του Σάββα'})

# Ψεύτικο Clerk: token = "clerk:<sub>", προφίλ από το CLERK_USERS
CLERK_USERS = {}
m.verify_clerk_token = lambda token: (({'sub': token[6:], 'fva': [2, -1]}, None) if token.startswith('clerk:')
                                     else (None, 'Invalid token'))
m.fetch_clerk_profile = lambda sub: CLERK_USERS.get(sub)
anon = m.app.test_client()
H = lambda sub: {'Authorization': f'Bearer clerk:{sub}'}

# --- 1. παλιός χρήστης μπαίνει με Clerk: ίδιος λογαριασμός, ίδια projects --------------------
CLERK_USERS['user_savvas'] = {'email': 'savvas@lasca.test', 'email_verified': True, 'display_name': 'Σάββας Τσιγκού',
                              'external_id': ''}
r = anon.get('/api/me', headers=H('user_savvas'))
ok(r.status_code == 200 and r.json['id'] == IDS['savvas@lasca.test'], 'existing user is linked by verified email')
ok(r.json['display_name'] == 'Σάββας Τσιγκού', 'name comes from Clerk')
names = {p['name'] for p in anon.get('/api/me/projects', headers=H('user_savvas')).json['owned']}
ok({'Όδευση Campus', 'Μόνο του Σάββα'} <= names, 'linked user keeps all projects')
with m.app.app_context():
    ok(m.User.query.filter_by(email='savvas@lasca.test').first().clerk_id == 'user_savvas', 'clerk_user_id stored')
    ok(m.User.query.count() == 4, 'no duplicate account created')

# μη επιβεβαιωμένο email στο Clerk: όχι σύνδεση με τον παλιό λογαριασμό
CLERK_USERS['user_fake_alex'] = {'email': 'alex@lasca.test', 'email_verified': False, 'display_name': 'x', 'external_id': ''}
ok(anon.get('/api/me', headers=H('user_fake_alex')).status_code == 403, 'unverified Clerk email cannot take an account')
# δεύτερος λογαριασμός Clerk με email ήδη συνδεδεμένου χρήστη
CLERK_USERS['user_other'] = {'email': 'savvas@lasca.test', 'email_verified': True, 'display_name': 'x', 'external_id': ''}
ok(anon.get('/api/me', headers=H('user_other')).status_code == 409, 'account linked to another Clerk user is refused')

# external_id (από το deploy/clerk_import.py): σύνδεση ακόμα κι αν άλλαξε το email
CLERK_USERS['user_ilias'] = {'email': 'ilias.k@lasca.test', 'email_verified': True, 'display_name': 'Ηλίας Κ.',
                             'external_id': str(IDS['ilias@lasca.test'])}
r = anon.get('/api/me', headers=H('user_ilias'))
ok(r.status_code == 200 and r.json['id'] == IDS['ilias@lasca.test'] and r.json['email'] == 'ilias.k@lasca.test',
   'external_id links the imported user and updates the email')

# νέος χρήστης
CLERK_USERS['user_new'] = {'email': 'new@lasca.test', 'email_verified': True, 'display_name': 'Κώστας Τ.', 'external_id': '',
                           'school': '  ΑΤΜ   ΑΠΘ ', 'company': ''}
r = anon.get('/api/me', headers=H('user_new'))
ok(r.status_code == 200 and r.json['display_name'] == 'Κώστας Τ.', 'new Clerk user gets a local account')
ok(r.json['school'] == 'ΑΤΜ ΑΠΘ' and r.json['company'] == '', 'optional signup fields (unsafe_metadata) reach lasca.db')
from clerk_auth import profile_from_user_payload  # noqa: E402
_p = profile_from_user_payload({'first_name': '', 'last_name': None, 'primary_email_address_id': 'e',
                                'email_addresses': [{'id': 'e', 'email_address': 'n@x.gr', 'verification': {'status': 'verified'}}],
                                'unsafe_metadata': {'name': 'Κώστας Τ.', 'school': 'ΑΠΘ'}})
ok(_p['display_name'] == 'Κώστας Τ.' and _p['school'] == 'ΑΠΘ', 'name from the signup page is used when Clerk has no name')

csp = anon.get('/').headers.get('Content-Security-Policy', '')
ok('https://clerk.lasca.test' in csp and 'https://img.clerk.com' in csp, 'CSP allows the Clerk Frontend API')

# --- 2. webhook --------------------------------------------------------------------------------
SECRET = 'whsec_' + base64.b64encode(b'0123456789abcdef0123456789abcdef').decode()


def signed(payload, secret=SECRET, ts=None, msg_id='msg_1'):
    body = json.dumps(payload).encode()
    ts = str(int(ts or time.time()))
    key = base64.b64decode(secret.split('_', 1)[1])
    sig = base64.b64encode(hmac.new(key, f'{msg_id}.{ts}.'.encode() + body, hashlib.sha256).digest()).decode()
    return body, {'svix-id': msg_id, 'svix-timestamp': ts, 'svix-signature': f'v1,bogus v1,{sig}',
                  'Content-Type': 'application/json'}


def hook(payload, **kw):
    body, headers = signed(payload, **kw)
    return anon.post('/api/clerk/webhook', data=body, headers=headers)


def clerk_user(sub, email, first, last='', verified=True, external_id=None):
    return {'id': sub, 'first_name': first, 'last_name': last, 'external_id': external_id,
            'primary_email_address_id': 'idn_1',
            'email_addresses': [{'id': 'idn_1', 'email_address': email,
                                 'verification': {'status': 'verified' if verified else 'unverified'}}]}


evt = {'type': 'user.updated', 'data': clerk_user('user_savvas', 'savvas@lasca.test', 'Σάββας', 'Τ.')}
ok(hook(evt).status_code == 503, 'webhook disabled without CLERK_WEBHOOK_SECRET')
os.environ['CLERK_WEBHOOK_SECRET'] = SECRET
body, headers = signed(evt); headers['svix-signature'] = 'v1,' + base64.b64encode(b'x' * 32).decode()
ok(anon.post('/api/clerk/webhook', data=body, headers=headers).status_code == 401, 'bad signature rejected')
ok(hook(evt, ts=time.time() - 3600).status_code == 401, 'old (replayed) webhook rejected')
ok(hook(evt, secret='whsec_' + base64.b64encode(b'another-secret-another-secret!!').decode()).status_code == 401,
   'signature with another secret rejected')
r = hook(evt)
ok(r.status_code == 200 and r.json['status'] == 'updated', 'signed user.updated accepted')
with m.app.app_context():
    ok(m.db.session.get(m.User, IDS['savvas@lasca.test']).display_name == 'Σάββας Τ.', 'name change in Clerk reaches lasca.db')

evt = {'type': 'user.updated', 'data': clerk_user('user_savvas', 'alex@lasca.test', 'Σάββας', 'Τ.')}
hook(evt)
with m.app.app_context():
    ok(m.db.session.get(m.User, IDS['savvas@lasca.test']).email == 'savvas@lasca.test',
       'email already used by another account is not taken over')
hook({'type': 'user.updated', 'data': clerk_user('user_savvas', 'savvas.t@lasca.test', 'Σάββας', 'Τ.')})
with m.app.app_context():
    ok(m.db.session.get(m.User, IDS['savvas@lasca.test']).email == 'savvas.t@lasca.test', 'verified email change synced')

r = hook({'type': 'user.created', 'data': clerk_user('user_kostas', 'kostas@lasca.test', 'Κώστας', 'Τ.')})
with m.app.app_context():
    u = m.db.session.get(m.User, IDS['kostas@lasca.test'])
    ok(r.json['status'] == 'linked' and u.clerk_id == 'user_kostas' and u.display_name == 'Κώστας Τ.',
       'user.created links an existing local user')
meta_user = clerk_user('user_kostas', 'kostas@lasca.test', 'Κώστας', 'Τ.')
meta_user['unsafe_metadata'] = {'school': 'ΣΑΤΜ ΕΜΠ', 'company': 'Γεωμετρική ΙΚΕ'}
hook({'type': 'user.updated', 'data': meta_user})
with m.app.app_context():
    u = m.db.session.get(m.User, IDS['kostas@lasca.test'])
    ok(u.school == 'ΣΑΤΜ ΕΜΠ' and u.company == 'Γεωμετρική ΙΚΕ', 'webhook fills empty school/company')
meta_user['unsafe_metadata'] = {'school': 'Άλλη', 'company': 'Άλλη'}
hook({'type': 'user.updated', 'data': meta_user})
with m.app.app_context():
    ok(m.db.session.get(m.User, IDS['kostas@lasca.test']).school == 'ΣΑΤΜ ΕΜΠ', 'values edited in LASCA are not overwritten')
r = hook({'type': 'user.created', 'data': clerk_user('user_bot', 'bot@lasca.test', 'Bot', verified=False)})
with m.app.app_context():
    ok(r.json['status'] == 'ignored' and m.User.query.filter_by(email='bot@lasca.test').first() is None,
       'unverified user.created is ignored')

# user.deleted: τα κοινά projects περνούν στον συνεργάτη, τα υπόλοιπα σβήνονται
r = hook({'type': 'user.deleted', 'data': {'id': 'user_savvas', 'deleted': True}})
with m.app.app_context():
    ok(r.json['status'] == 'deleted' and m.db.session.get(m.User, IDS['savvas@lasca.test']) is None,
       'user.deleted removes the local user')
    shared = m.Project.query.filter_by(name='Όδευση Campus').first()
    ok(shared is not None and shared.owner_id == IDS['alex@lasca.test'], 'shared project passes to the collaborator')
    ok(m.Project.query.filter_by(name='Μόνο του Σάββα').first() is None, 'private projects are deleted')
ok(hook({'type': 'user.deleted', 'data': {'id': 'user_savvas', 'deleted': True}}).json['status'] == 'ignored',
   'repeated user.deleted is harmless')
ok(hook({'type': 'session.created', 'data': {'id': 'sess_1'}}).json['status'] == 'ignored', 'other events ignored')

# --- 3. διαγραφή από το Προφίλ σβήνει και στο Clerk ---------------------------------------------
deleted = []
clerk_sync.delete_clerk_user = lambda cid: deleted.append(cid) or True
CLERK_USERS['user_kostas'] = {'email': 'kostas@lasca.test', 'email_verified': True, 'display_name': 'Κώστας Τ.',
                              'external_id': ''}
r = anon.delete('/api/me', json={'confirm': 'ΔΙΑΓΡΑΦΗ'}, headers=H('user_kostas'))
ok(r.status_code == 200 and deleted == ['user_kostas'], 'profile deletion also deletes the Clerk user (fresh sign-in)')
m.verify_clerk_token = lambda token: ({'sub': token[6:], 'fva': [45, -1]}, None)
r = anon.delete('/api/me', json={'confirm': 'ΔΙΑΓΡΑΦΗ'}, headers=H('user_new'))
ok(r.status_code == 403 and r.json.get('code') == 'reauth_required', 'old Clerk sign-in must sign in again to delete')

# --- 4. εισαγωγή κωδικών στο Clerk (deploy/clerk_import.py) -------------------------------------
import clerk_import  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

h = generate_password_hash('Secret-Pass-1!', method='scrypt')
method, salt, hexhash = h.split('$')
variants = clerk_import.scrypt_variants(h)
ok(len(variants) == 4 and all(v.count('$') >= 2 for v in variants.values()), 'scrypt digest variants built')
ok(variants['A'] == f'${method}${salt}${base64.b64encode(bytes.fromhex(hexhash)).decode()}', 'documented Clerk format')
h2 = generate_password_hash('Secret-Pass-1!', method='pbkdf2:sha256:600000')
hasher, digest = clerk_import.clerk_digest(h2, 'A')
_, it, s64, d64 = digest.split('$')
ok(hasher == 'pbkdf2_sha256' and it == '600000' and
   hashlib.pbkdf2_hmac('sha256', b'Secret-Pass-1!', base64.b64decode(s64), 600000) == base64.b64decode(d64),
   'pbkdf2 digest converted to Clerk pbkdf2_sha256 (salt/hash base64)')
ok(clerk_import.split_name('Κώστας Τ.') == ('Κώστας', 'Τ.') and clerk_import.split_name('Ηλίας') == ('Ηλίας', ''),
   'names split into first/last')

# ψεύτικο Clerk Backend API: δέχεται μόνο τη μορφή «B» για να ελεγχθεί η αναζήτηση του --probe
class FakeResp:
    def __init__(self, status, data=None): self.status_code, self._data, self.headers, self.text = status, data, {}, ''
    def json(self): return self._data
CLERK_DB, CALLS = {}, []
def fake_api(method, path, **kw):
    CALLS.append((method, path))
    if method == 'GET' and path == '/users':
        email = kw['params']['email_address'][0]
        return FakeResp(200, [u for u in CLERK_DB.values() if email in u['email_address']])
    if method == 'POST' and path == '/users':
        body = kw['json']; cid = f'user_imp{len(CLERK_DB) + 1}'
        CLERK_DB[cid] = {**body, 'id': cid}; return FakeResp(200, {'id': cid})
    if method == 'POST' and path.endswith('/verify_password'):
        u = CLERK_DB[path.split('/')[2]]
        return FakeResp(200, {'verified': u.get('password_digest') == clerk_import.scrypt_variants(PROBE_HASH)['B']})
    if method == 'DELETE':
        CLERK_DB.pop(path.split('/')[2], None); return FakeResp(200, {})
    return FakeResp(404, {})
clerk_sync.clerk_api = fake_api
os.environ['CLERK_SECRET_KEY'] = 'sk_test_dummy'
with m.app.app_context():
    m.User.query.filter_by(email='alex@lasca.test').first().clerk_id = None
    g1 = m.User(email='google@lasca.test', display_name='Μαρία', email_verified=True, has_password=False)
    g1.password_hash = 'x'; m.db.session.add(g1)
    nv = m.User(email='unverified@lasca.test', display_name='Bot', email_verified=False); nv.set_password(PW); m.db.session.add(nv)
    m.db.session.commit()
    PROBE_HASH = m.User.query.filter_by(email='alex@lasca.test').first().password_hash
import getpass  # noqa: E402
getpass.getpass = lambda prompt='': PW
sys.argv = ['clerk_import.py', '--probe', 'alex@lasca.test']
ok(clerk_import.main() == 0, 'probe finds the hash format Clerk accepts')
with m.app.app_context():
    alex = m.User.query.filter_by(email='alex@lasca.test').first()
    ok(alex.clerk_id in CLERK_DB and CLERK_DB[alex.clerk_id]['external_id'] == str(alex.id),
       'probe keeps the working Clerk user, linked by external_id')
ok(sum(1 for c in CALLS if c[0] == 'DELETE') == 1, 'failed attempts are removed from Clerk')
CALLS.clear(); sys.argv = ['clerk_import.py']
ok(clerk_import.main() == 0 and not any(c[0] == 'POST' for c in CALLS), 'dry run changes nothing')
sys.argv = ['clerk_import.py', '--apply', '--scrypt-format', 'B']
ok(clerk_import.main() == 0, 'bulk import runs')
with m.app.app_context():
    g1 = m.User.query.filter_by(email='google@lasca.test').first()
    ok(g1.clerk_id and CLERK_DB[g1.clerk_id].get('skip_password_requirement') is True, 'Google-only user imported without password')
    ok(m.User.query.filter_by(email='unverified@lasca.test').first().clerk_id is None, 'unverified accounts are skipped')
    ok(m.User.query.filter(m.User.clerk_id.is_(None), m.User.email_verified.is_(True)).count() == 0, 'every verified user is linked')
CALLS.clear(); ok(clerk_import.main() == 0 and not any(c[0] == 'POST' for c in CALLS), 'running again is harmless')
with m.app.app_context():
    ok(m.User.query.filter(m.User.clerk_id.isnot(None), m.User.email_verified.is_(False)).count() == 0,
       'imported users are marked verified (Clerk keeps their email verified)')
# παλιός λογαριασμός με clerk_user_id αλλά email_verified=False (π.χ. εισαγωγή πριν τη διόρθωση): δουλεύει με Clerk
os.environ.pop('REQUIRE_EMAIL_VERIFICATION', None)
with m.app.app_context():
    u = m.User(email='legacy@lasca.test', display_name='Legacy', email_verified=False, clerk_id='user_legacy')
    u.set_password(PW); m.db.session.add(u); m.db.session.commit()
m.verify_clerk_token = lambda token: ({'sub': token[6:], 'fva': [2, -1]}, None)
ok(anon.get('/api/me/projects', headers=H('user_legacy')).status_code == 200,
   'Clerk session opens the app even if the local row was unverified')
os.environ['REQUIRE_EMAIL_VERIFICATION'] = '0'

# --- 5. όριο μηνυμάτων επικοινωνίας: 3 την ημέρα ανά λογαριασμό (Resend: 100 δωρεάν) -------------
os.environ.update({'RESEND_API_KEY': 're_test', 'NOTIFICATION_EMAIL': 'team@lasca.test'})
m.resend.Emails.send = staticmethod(lambda params: {'id': 'x'})
fb = client('alex@lasca.test')
codes = [fb.post('/api/feedback', json={'type': 'bug', 'details': f'μήνυμα {k}'}).status_code for k in range(4)]
ok(codes == [200, 200, 200, 429], f'feedback limited to 3 per day per user ({codes})')
ok(fb.post('/api/feedback', json={'type': 'bug', 'details': ''}).status_code == 400, 'invalid feedback is rejected before the limit')

# --- 6. εγγραφή με αποδοχή Όρων (checkbox) και όνομα από το LASCA ----------------------------------
from clerk_auth import profile_from_user_payload  # noqa: E402
CLERK_USERS['user_terms'] = {'email': 'terms@lasca.test', 'email_verified': True, 'display_name': 'Νέος',
                             'external_id': '', 'terms_version': m.TERMS_VERSION}
me = anon.get('/api/me', headers=H('user_terms')).json
ok(me.get('terms_current') is True, 'signup checkbox: new Clerk account starts with the current Terms accepted')
CLERK_USERS['user_noterms'] = {'email': 'noterms@lasca.test', 'email_verified': True, 'display_name': 'Χωρίς',
                               'external_id': ''}
ok(anon.get('/api/me', headers=H('user_noterms')).json.get('terms_current') is False,
   'without the checkbox (e.g. Google from the login page) the Terms are still asked')
payload = {'primary_email_address_id': 'e1', 'first_name': 'Παλιό', 'last_name': 'Όνομα', 'unsafe_metadata': {'name': 'Κώστας Τ.'},
           'email_addresses': [{'id': 'e1', 'email_address': 'k@lasca.test', 'verification': {'status': 'verified'}}]}
ok(profile_from_user_payload(payload)['display_name'] == 'Κώστας Τ.', 'name set in LASCA wins over the Clerk first/last name')

print('\nALL CLERK-SYNC CHECKS PASS')
