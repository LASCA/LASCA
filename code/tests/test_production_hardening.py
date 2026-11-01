"""
Έλεγχος: η σελίδα όπως τρέχει στην παραγωγή (lasca.gr), με Clerk.

  * Η παλιά σύνδεση της lasca.db (κωδικός/Google/2FA/επαναφορά) είναι κλειστή και τα παλιά cookies δεν συνδέουν.
  * Tokens του Clerk για άλλη σελίδα (azp) απορρίπτονται.
  * «Αποσύνδεση από όλες τις συσκευές» ακυρώνει και τα sessions του Clerk (εκτός από το τρέχον).
  * Αναφορές PDF: ονόματα σημείων/έργων δεν γίνονται markup (<img src=...> → τοπικά αρχεία / SSRF).
  * Αναγνώστης project δεν γράφει αρχεία του project μέσω των υπολογισμών.
  * Υπολογισμός με όνομα project που δεν υπάρχει δεν φτιάχνει φάκελο.
  * Εικόνες προφίλ μόνο με υπογεγραμμένη διεύθυνση.
  * Σφάλματα 5xx χωρίς εσωτερικές λεπτομέρειες.

    python code/tests/test_production_hardening.py
"""
import base64
import io
import json
import os
import sys
import tempfile
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
                   'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'),
                   'LASCA_PROJECTS_DIR': str(TMP / 'projects'), 'API_THROTTLE': '0',
                   'PUBLIC_URL': 'https://lasca.gr'})
for key in ('LASCA_ENV', 'TEAM_GATE_PASSWORD', 'LEGACY_AUTH', 'CLERK_WEBHOOK_SECRET'):
    os.environ.pop(key, None)
os.environ['CLERK_PUBLISHABLE_KEY'] = 'pk_live_' + base64.b64encode(b'clerk.lasca.test$').decode().rstrip('=')
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import main_4_app as m  # noqa: E402
import clerk_sync  # noqa: E402

ok = lambda cond, msg: print(('PASS ' if cond else 'FAIL ') + msg) or (cond or sys.exit(1))

# Δοκιμαστική διαδρομή που σκάει με εσωτερικό σφάλμα (όπως τα endpoints υπολογισμών με str(e)).
@m.app.route('/api/_test_boom', methods=['POST'])
def _test_boom():
    try:
        {}['missing']
    except Exception as e:  # noqa: BLE001
        return m.jsonify({'error': str(e), 'traceback': 'Traceback (most recent call last): /srv/lasca/code/x.py'}), 500


@m.app.route('/api/_test_greek_500', methods=['POST'])
def _test_greek_500():
    return m.jsonify({'error': 'Η ζενίθια γωνία είναι πολύ κοντά σε 0g, 200g ή 400g.'}), 500


ok(m.CLERK_ONLY, 'Clerk configured → only Clerk signs users in')

# --- Ψεύτικο Clerk -----------------------------------------------------------------------------------------
CLERK_USERS = {
    'user_SavvasAAAA0001': {'email': 'savvas@lasca.test', 'email_verified': True, 'display_name': 'Σάββας',
                            'external_id': '', 'terms_version': '', 'school': '', 'company': ''},
    'user_AlexAAAAAA0002': {'email': 'alex@lasca.test', 'email_verified': True, 'display_name': 'Αλέξανδρος',
                            'external_id': '', 'terms_version': '', 'school': '', 'company': ''},
    'user_IliasAAAAA0003': {'email': 'ilias@lasca.test', 'email_verified': True, 'display_name': 'Ηλίας',
                            'external_id': '', 'terms_version': '', 'school': '', 'company': ''},
}


def fake_verify(token):
    # token = "clerk:<sub>[:<azp>]"
    if not token.startswith('clerk:'):
        return None, 'Invalid token'
    parts = token[6:].split('|')
    claims = {'sub': parts[0], 'sid': 'sess_Current00000001', 'fva': [2, -1]}
    if len(parts) > 1:
        claims['azp'] = parts[1]
    return claims, None


m.verify_clerk_token = fake_verify
m.fetch_clerk_profile = lambda sub: CLERK_USERS.get(sub)
H = lambda sub, azp='https://lasca.gr': {'Authorization': f'Bearer clerk:{sub}|{azp}', 'Origin': 'https://lasca.gr'}
SAV, ALX, ILI = 'user_SavvasAAAA0001', 'user_AlexAAAAAA0002', 'user_IliasAAAAA0003'
c = m.app.test_client()

me = c.get('/api/me', headers=H(SAV))
ok(me.status_code == 200 and me.json['email'] == 'savvas@lasca.test', 'Clerk token signs in')
ok(c.get('/api/me', headers=H(SAV, 'https://evil.example')).status_code == 401, 'token issued for another site (azp) rejected')
ok(c.get('/api/me', headers={'Authorization': f'Bearer clerk:{SAV}'}).status_code == 200, 'token without azp still accepted')
for sub in (ALX, ILI):
    c.get('/api/me', headers=H(sub))
with m.app.app_context():
    ids = {u.email: u.id for u in m.User.query.all()}
    savvas = m.db.session.get(m.User, ids['savvas@lasca.test'])
    savvas.set_password('Old-Local-Pass-2026!')
    savvas.has_password = True
    m.db.session.commit()
    sav_version = savvas.session_version or 0

# --- 1. Παλιά σύνδεση κλειστή --------------------------------------------------------------------------------
anon = m.app.test_client()
anon.environ_base['HTTP_ORIGIN'] = 'https://lasca.gr'
r = anon.post('/api/login', json={'email': 'savvas@lasca.test', 'password': 'Old-Local-Pass-2026!'})
ok(r.status_code == 410 and r.json['code'] == 'legacy_auth_disabled', 'old local password no longer signs in')
for path, body in (('/api/register', {'email': 'n@lasca.test', 'password': 'Xx-Strong-Pass-2026!', 'display_name': 'N',
                                      'accept_terms': True, 'age_confirmed': True}),
                   ('/api/auth/google', {'credential': 'x'}), ('/api/auth/forgot', {'email': 'savvas@lasca.test'}),
                   ('/api/auth/reset', {'token': 'x', 'password': 'y'}), ('/api/auth/2fa/verify', {'code': '1'}),
                   ('/api/auth/device-token', {'email': 'savvas@lasca.test', 'password': 'Old-Local-Pass-2026!'})):
    ok(anon.post(path, json=body).status_code == 410, f'{path} closed')
ok(c.post('/api/me/2fa/setup', json={}, headers=H(SAV)).status_code == 410, 'local 2FA (does not protect Clerk) closed')
ok(c.post('/api/me/password', json={}, headers=H(SAV)).status_code == 410, 'local password change closed')
ok(anon.delete('/api/auth/device-token').status_code == 200, 'exe can still revoke its own device token')
ok(anon.post('/api/auth/desktop/start', json={'challenge': 'a' * 64}).status_code == 201,
   'exe browser sign-in flow still available')

# Παλιό cookie σύνδεσης (π.χ. «Να με θυμάσαι» από πριν το Clerk): δεν συνδέει κανέναν.
stale = m.app.test_client()
with stale.session_transaction() as sess:
    sess['_user_id'] = f"{ids['savvas@lasca.test']}:{sav_version}"
    sess['_fresh'] = True
ok(stale.get('/api/me').status_code == 401, 'stale pre-Clerk session cookie is ignored')
ok(stale.get('/api/me/projects').status_code == 401, 'stale cookie gives no API access')

# --- 2. Αποσύνδεση από όλες τις συσκευές → και στο Clerk ------------------------------------------------------
class FakeResp:
    def __init__(self, status, data=None):
        self.status_code, self._data = status, data

    def json(self):
        return self._data


CALLS = []


def fake_api(method, path, **kw):
    CALLS.append((method, path, kw.get('params')))
    if method == 'GET' and path == '/sessions':
        return FakeResp(200, [{'id': 'sess_Current00000001'}, {'id': 'sess_OtherLaptop0002'}, {'id': '../users/x'}])
    if method == 'POST' and path.endswith('/revoke'):
        return FakeResp(200, {})
    return FakeResp(404, {})


clerk_sync.clerk_api = fake_api
os.environ['CLERK_SECRET_KEY'] = 'sk_test_dummy'
r = c.post('/api/me/logout-all', headers=H(SAV))
revoked = [p for meth, p, _ in CALLS if meth == 'POST']
ok(r.status_code == 200 and r.json['revoked'] == 1, 'logout-all revokes the other Clerk sessions')
ok(revoked == ['/sessions/sess_OtherLaptop0002/revoke'], 'current session kept, malformed ids never reach the API')
ok(CALLS[0][2]['user_id'] == SAV, 'sessions listed only for this user')
clerk_sync.clerk_api = lambda *a, **k: FakeResp(500, {})
ok(c.post('/api/me/logout-all', headers=H(SAV)).status_code == 502, 'Clerk failure is reported, not hidden')
os.environ.pop('CLERK_SECRET_KEY')

# --- 3. Αναφορές PDF: χωρίς markup από τον χρήστη -----------------------------------------------------------
import reportlab.lib.utils as rl_utils  # noqa: E402
from reportlab import rl_config  # noqa: E402
opened = []
_orig_open = rl_utils.open_for_read


def spy_open(name, *a, **k):
    opened.append(str(name))
    return _orig_open(name, *a, **k)


rl_utils.open_for_read = spy_open
evil = '<img src="/etc/hostname" width="5" height="5"/>'
payload = {'projectInfo': {'name': evil, 'engineer': '<font color="red">x</b>', 'client': '<a href="http://x">y</a>',
                           'location': 'Θεσσαλονίκη & <b>Κέντρο</b>'},
           'initialData': [{'from': evil, 'to': 'B'}], 'results': [{'from': evil, 'to': 'B'}]}
r = c.post('/api/reports/trig-leveling', json=payload, headers=H(SAV))
ok(r.status_code == 200 and r.data[:4] == b'%PDF', 'PDF still builds with hostile names')
ok('/etc/hostname' not in opened, 'point/project names cannot make reportlab open server files')
rl_utils.open_for_read = _orig_open
ok(not {'http', 'https', 'ftp'} & set(rl_config.trustedSchemes), 'reportlab may not fetch URLs (no SSRF)')
ok(m._safe_pdf_markup('υ<sub>ji</sub> <br/>') == 'υ<sub>ji</sub> <br/>', 'harmless formatting tags kept')
ok(m._safe_pdf_markup('<img src="x"/> & <font>') == '&lt;img src="x"/&gt; &amp; &lt;font&gt;', 'everything else escaped')

# --- 4. Δικαιώματα αρχείων project -----------------------------------------------------------------------------
st = c.post('/api/projects/load', json={'project_name': 'Χωροστάθμηση Campus'}, headers=H(SAV)).json
pid = st['_meta']['public_id']
c.post(f'/api/projects/{pid}/members', json={'email': 'alex@lasca.test', 'role': 'viewer'}, headers=H(SAV))
c.post(f'/api/projects/{pid}/members', json={'email': 'ilias@lasca.test', 'role': 'editor'}, headers=H(SAV))
lev_file = TMP / 'projects' / 'Χωροστάθμηση Campus' / 'latest_leveling.json'
lev = {'forward': [{'point': 'BM1', 'backsight': '1.5', 'foresight': '1.2', 'bs_s': '30', 'fs_s': '30'}],
       'backward': [{'point': 'BM2', 'backsight': '1.2', 'foresight': '1.5', 'bs_s': '30', 'fs_s': '30'}]}
proj_h = lambda sub: {**H(sub), 'Active-Project': 'Χωροστάθμηση Campus'}
r = c.post('/api/leveling', json=lev, headers=proj_h(ALX))
ok(r.status_code == 200, 'viewer can still run the calculation')
ok(not lev_file.exists(), 'viewer cannot write project files through a calculation')
r = c.post('/api/leveling', json=lev, headers=proj_h(ILI))
ok(r.status_code == 200 and lev_file.exists(), 'editor saves results to the project')
before = lev_file.read_bytes()
c.post('/api/leveling', json={**lev, 'forward': [{**lev['forward'][0], 'backsight': '9'}]}, headers=proj_h(ALX))
ok(lev_file.read_bytes() == before, 'viewer cannot overwrite existing results')
stranger = 'user_StrangerAA0004'
CLERK_USERS[stranger] = {**CLERK_USERS[ILI], 'email': 'stranger@lasca.test'}
ok(c.post('/api/leveling', json=lev, headers=proj_h(stranger)).status_code == 403, 'non-member blocked')
r = c.post('/api/leveling', json=lev, headers={**H(stranger), 'Active-Project': 'Κανενός Project'})
ok(not (TMP / 'projects' / 'Κανενός Project').exists(), 'unknown project name never creates a folder')
ok(c.post('/api/leveling', json=lev, headers={**H(stranger), 'Active-Project': '../../etc'}).status_code == 400,
   'path traversal in project name rejected')

# --- 5. Εικόνες προφίλ ----------------------------------------------------------------------------------------
from PIL import Image  # noqa: E402
buf = io.BytesIO()
Image.new('RGB', (64, 64), (10, 120, 200)).save(buf, 'PNG')
buf.seek(0)
r = c.put('/api/me', data={'avatar': (buf, 'a.png')}, content_type='multipart/form-data', headers=H(SAV))
url = r.json['avatar_url']
ok('&s=' in url, 'avatar url is signed')
ok(anon.get(url).mimetype == 'image/webp', 'signed url works without auth header (<img>)')
ok(anon.get(f"/api/users/{ids['savvas@lasca.test']}/avatar").mimetype == 'image/svg+xml',
   'guessing ids only returns the default image')

# --- 6. Σφάλματα 5xx --------------------------------------------------------------------------------------------
r = c.post('/api/_test_boom', headers=H(SAV))
ok(r.status_code == 500 and r.json['error'] == m.GENERIC_SERVER_ERROR and 'traceback' not in r.json,
   'internal exception text hidden from users')
r = c.post('/api/_test_greek_500', headers=H(SAV))
ok(r.json['error'].startswith('Η ζενίθια γωνία'), 'our own Greek messages still reach the user')

print('\nΌλοι οι έλεγχοι πέρασαν.')
