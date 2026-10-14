"""
Έλεγχος: λεπτομερές ιστορικό αλλαγών, ειδοποιήσεις «νέες αλλαγές», λίστα projects με μέλη,
διαγραφή με public_id και σύνδεση του exe μέσω browser (Google κ.λπ.).

    python code/tests/test_history.py
"""
import hashlib, os, secrets, sys, tempfile
from datetime import timedelta
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
                   'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'),
                   'LASCA_PROJECTS_DIR': str(TMP / 'projects'), 'API_THROTTLE': '0'})
os.environ.pop('LASCA_ENV', None)
os.environ['REQUIRE_EMAIL_VERIFICATION'] = '0'  # εδώ δεν ελέγχεται η επιβεβαίωση email (βλ. test_security)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main_4_app as m  # noqa: E402
from history_diff import diff_states  # noqa: E402

PW = 'Lasca-Test-Pass-2026!'
ok = lambda cond, msg: print(('PASS ' if cond else 'FAIL ') + msg) or (cond or sys.exit(1))

with m.app.app_context():
    for email in ('savvas@lasca.test', 'alex@lasca.test', 'ilias@lasca.test'):
        u = m.User(email=email, display_name=email.split('@')[0]); u.set_password(PW); m.db.session.add(u)
    m.db.session.commit()


def client(email):
    c = m.app.test_client(); c.environ_base['HTTP_ORIGIN'] = 'http://localhost'
    r = c.post('/api/login', json={'email': email, 'password': PW}); assert r.status_code == 200, r.json
    return c


S, A, I = client('savvas@lasca.test'), client('alex@lasca.test'), client('ilias@lasca.test')

# --- 1. diff engine -------------------------------------------------------------
old = {'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '1000.00', 'y': '500'}, {'id': 2, 'name': 'Σ2', 'x': '1100', 'y': '600'}],
       'settings': {'designer': 'Άννα', 'created_at': '1'}, 'stakeoutData': {'station': {'name': 'St1', 'x': '', 'y': ''}, 'points': []}}
new = {'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '1000.50', 'y': '500'}, {'id': 3, 'name': 'Σ3', 'x': '1', 'y': '2'},
                         {'id': 4, 'name': '', 'x': '', 'y': ''}],
       'settings': {'designer': 'Βασίλης', 'created_at': '2'}, 'stakeoutData': {'station': {'name': 'St1', 'x': '10', 'y': ''}, 'points': []},
       'metrics': {'fx': 0.01}}
d = {s['key']: s for s in diff_states(old, new)}
t = d['traverse_data']
ok(t['added'] == 1 and t['removed'] == 1 and t['modified'] == 1, 'traverse: +1 −1 ~1 (empty new row ignored)')
mod = next(c for c in t['changes'] if c['kind'] == 'modified')
ok(mod['row'] == 'Σ1' and mod['fields'][0] == {'field': 'X', 'from': '1000.00', 'to': '1000.50'}, 'field-level change with row label')
ok(d['settings']['changes'][0]['fields'][0]['field'] == 'Μελετητής' and d['settings']['modified'] == 1, 'settings change (timestamps ignored)')
ok(d['stakeoutData']['changes'][0]['row'] == 'station' or 'X' in str(d['stakeoutData']['changes']), 'nested dict change (stakeout station)')
ok(t.get('recalculated') is True, 'results recalculation flagged on the same tool')
ok(diff_states(old, old) == [], 'no diff for identical states')
default_stake = {'station': {'name': 'St1', 'x': '', 'y': ''}, 'backsight': {'name': 'BS1', 'x': '', 'y': ''}, 'azimuthBs': '---',
                 'points': [{'id': 1, 'name': 'P1', 'x': '', 'y': '', 'hz_stake': '', 'dist_stake': ''}]}
ok(diff_states({}, {'stakeoutData': default_stake, 'levelingForward': [{'id': 1, 'point': 'BM1', 'backsight': '', 'foresight': ''}],
                    'tachymetryData': {'measurements': [], 'stations': [], 'results': []}}) == [],
   'opening a project (app default rows) is not reported as a change')
st_change = diff_states({'stakeoutData': default_stake}, {'stakeoutData': {**default_stake, 'station': {'name': 'St1', 'x': '1000', 'y': ''}}})
ok(st_change and st_change[0]['changes'][0]['fields'][0]['to'] == '1000', 'real value in default row is reported')
ok(diff_states({'traverse_data': [{'id': 1, 'x': '1.0'}]}, {'traverse_data': [{'id': 1, 'x': '1'}]}) == [], '1.0 == 1 (numeric)')
rows_old = {'levelingForward': [{'point': 'BM1', 'backsight': '1.2'}]}
rows_new = {'levelingForward': [{'point': 'BM1', 'backsight': '1.25'}, {'point': 'A', 'backsight': '0.9'}]}
lf = diff_states(rows_old, rows_new)[0]
ok(lf['added'] == 1 and lf['modified'] == 1 and lf['tool'] == 'geom_leveling', 'rows without id compared by position')

# --- 2. history entries on save ---------------------------------------------------
st = S.post('/api/projects/load', json={'project_name': 'Ιστορικό'}).json
pid = st['_meta']['public_id']
r = S.post(f'/api/projects/{pid}/members', json={'email': 'alex@lasca.test', 'role': 'editor'}); ok(r.status_code == 201, 'share with alex')
S.post(f'/api/projects/{pid}/members', json={'email': 'ilias@lasca.test', 'role': 'viewer'})
st.pop('_meta')

# alex ανοίγει το project → αρχικά 0 νέες αλλαγές
j = A.post(f'/api/projects/{pid}/sync', json={'tool': 'dashboard'}).json
ok(j['unread'] == 0, 'new member starts with 0 unread')
S.post(f'/api/projects/{pid}/sync', json={'tool': 'dashboard'})

v = S.post('/api/projects/save', json={'project_name': 'Ιστορικό', 'state': {**st, 'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '10'}]}}).json['version']
acts = S.get(f'/api/projects/{pid}/activity').json['activity']
saved = [a for a in acts if a['action'] == 'saved']
ok(len(saved) == 1 and saved[0]['detail']['sections'][0]['label'] == 'Όδευση (X,Y)' and saved[0]['detail']['client'] == 'web',
   'save creates detailed history entry')
first_id, session = saved[0]['id'], saved[0]['detail']['session']
S.post('/api/projects/save', json={'project_name': 'Ιστορικό', 'state': {**st, 'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '10'}, {'id': 2, 'name': 'Σ2', 'x': '20'}]}})
acts = S.get(f'/api/projects/{pid}/activity').json['activity']
saved = [a for a in acts if a['action'] == 'saved']
ok(len(saved) == 1 and saved[0]['id'] > first_id and saved[0]['detail']['session'] == session,
   'consecutive saves merge into one entry with a new id (same session)')
ok(saved[0]['detail']['sections'][0]['added'] == 2, 'merged entry diffs from session start (+2 rows)')
with m.app.app_context():
    ok(m.ProjectActivity.query.filter(m.ProjectActivity.snapshot.isnot(None)).count() == 1, 'only one snapshot kept')

# alex: 1 νέα αλλαγή (μέλος + αποθηκεύσεις του savvas)
j = A.post(f'/api/projects/{pid}/sync', json={'tool': 'traverse'}).json
ok(j['unread'] >= 1, f"alex sees unread changes ({j['unread']})")
lst = A.get('/api/me/projects').json
proj = next(p for p in lst['shared'] if p['public_id'] == pid)
ok(proj['unread'] == j['unread'] and len(proj['members']) == 3 and proj['members'][0]['role'] == 'owner',
   'project list has unread count and members (owner first)')
ok(all('email' not in mm for mm in proj['members']), 'members preview hides emails')
r = A.post(f'/api/projects/{pid}/activity/seen', json={'last_id': j['last_activity']}).json
ok(r['unread'] == 0, 'mark seen clears unread')
ok(A.post(f'/api/projects/{pid}/activity/seen', json={'last_id': 10 ** 9}).json['last_seen'] == j['last_activity'],
   'cannot mark beyond newest entry')

# alex αλλάζει → νέα εγγραφή (άλλος χρήστης), savvas βλέπει 1 νέα
A.post('/api/projects/save', json={'project_name': 'Ιστορικό', 'state': {**st, 'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '11'}, {'id': 2, 'name': 'Σ2', 'x': '20'}]}})
acts = S.get(f'/api/projects/{pid}/activity').json['activity']
ok(acts[0]['user']['display_name'] == 'alex' and acts[0]['detail']['sections'][0]['changes'][0]['fields'][0]['to'] == '11',
   "other user's save is its own entry with field change")
ok(S.post(f'/api/projects/{pid}/sync', json={}).json['unread'] == 1, 'owner sees 1 unread (own saves not counted)')

# επαναφορά: αν ο alex σβήσει την αλλαγή του, η εγγραφή φεύγει
A.post('/api/projects/save', json={'project_name': 'Ιστορικό', 'state': {**st, 'traverse_data': [{'id': 1, 'name': 'Σ1', 'x': '10'}, {'id': 2, 'name': 'Σ2', 'x': '20'}]}})
acts = S.get(f'/api/projects/{pid}/activity').json['activity']
ok(not any(a['action'] == 'saved' and a['user']['display_name'] == 'alex' for a in acts), 'reverted change disappears from history')

# exe: PUT state με client=desktop
r = A.put(f'/api/projects/{pid}/state', json={'state': {**st, 'goniometryData': [{'id': 5, 'from': 'A', 'to': 'B', 'faceI': '100'}]}, 'client': 'desktop'})
acts = S.get(f'/api/projects/{pid}/activity').json['activity']
gon = next(x for x in acts[0]['detail']['sections'] if x['key'] == 'goniometryData')
ok(acts[0]['detail']['client'] == 'desktop' and gon['changes'][0]['row'] == 'A→B', 'desktop saves are tagged and labelled')

# viewer δεν μπορεί να σβήσει ιστορικό / project
ok(I.post(f'/api/projects/{pid}/delete').status_code == 403, 'viewer cannot delete by id')
ok(A.post(f'/api/projects/{pid}/delete').status_code == 403, 'editor cannot delete by id')

# --- 3. σύνδεση exe μέσω browser ------------------------------------------------------
D = m.app.test_client()   # το exe: χωρίς cookies, χωρίς Origin
secret = secrets.token_urlsafe(32)
challenge = hashlib.sha256(secret.encode()).hexdigest()
ok(D.post('/api/auth/desktop/start', json={'challenge': 'xyz'}).status_code == 400, 'start rejects bad challenge')
r = D.post('/api/auth/desktop/start', json={'challenge': challenge, 'device_name': 'LASCA για Windows (PC-1)'})
ok(r.status_code == 201 and len(r.json['user_code']) == 9 and '/desktop-login/' in r.json['url'], 'start returns code + browser url')
rid, code = r.json['request_id'], r.json['user_code']
ok(m.app.test_client().get(f'/api/auth/desktop/{rid}').status_code == 401, 'info needs a logged-in browser')
info = S.get(f'/api/auth/desktop/{rid}').json
ok(info['user_code'] == code and info['status'] == 'pending' and 'PC-1' in info['device_name'], 'browser sees same code + device')
ok(D.post('/api/desktop-link/poll', json={'request_id': rid, 'secret': secret}).json['status'] == 'pending', 'poll: pending')
ok(D.post('/api/desktop-link/poll', json={'request_id': rid, 'secret': 'wrong'}).status_code == 403, 'poll with wrong secret refused')
ok(D.post('/api/desktop-link/poll', json={'request_id': 'nope', 'secret': secret}).status_code == 404, 'poll unknown request')
X = m.app.test_client()
ok(X.post(f'/api/auth/desktop/{rid}/approve', headers={'Origin': 'https://evil.example'}).status_code in (401, 403),
   'approve needs session + same origin')
ok(S.post(f'/api/auth/desktop/{rid}/approve').json['status'] == 'approved', 'user approves in browser')
ok(A.post(f'/api/auth/desktop/{rid}/approve').status_code == 409, 'another user cannot re-approve')
r = D.post('/api/desktop-link/poll', json={'request_id': rid, 'secret': secret})
ok(r.status_code == 200 and r.json['status'] == 'approved' and r.json['user']['email'] == 'savvas@lasca.test', 'poll returns token')
token = r.json['token']
ok(D.get('/api/me/projects', headers={'Authorization': f'Bearer {token}'}).status_code == 200, 'token works as Bearer')
ok(D.post('/api/desktop-link/poll', json={'request_id': rid, 'secret': secret}).status_code == 404, 'single use')
events = S.get('/api/me/security-events').json['events']
ok(any(e['event'] == 'desktop_login_approved' for e in events), 'approval shows in security log')

# άρνηση
secret2 = secrets.token_urlsafe(32)
rid2 = D.post('/api/auth/desktop/start', json={'challenge': hashlib.sha256(secret2.encode()).hexdigest()}).json['request_id']
ok(S.post(f'/api/auth/desktop/{rid2}/deny').json['status'] == 'denied', 'user can deny')
r = D.post('/api/desktop-link/poll', json={'request_id': rid2, 'secret': secret2})
ok(r.status_code == 410 and r.json['code'] == 'denied', 'poll after deny → denied')
ok(S.post(f'/api/auth/desktop/{rid2}/approve').status_code == 404, 'denied request is gone')

# λήξη
secret3 = secrets.token_urlsafe(32)
rid3 = D.post('/api/auth/desktop/start', json={'challenge': hashlib.sha256(secret3.encode()).hexdigest()}).json['request_id']
with m.app.app_context():
    row = m.DesktopLogin.query.order_by(m.DesktopLogin.id.desc()).first()
    row.expires_at = row.created_at - timedelta(seconds=1); m.db.session.commit()
ok(S.post(f'/api/auth/desktop/{rid3}/approve').status_code == 410, 'expired request cannot be approved')
ok(D.post('/api/desktop-link/poll', json={'request_id': rid3, 'secret': secret3}).json['code'] == 'expired', 'poll after expiry')

# εγκεκριμένο αλλά όχι παραληφθέν: λήγει, και ακυρώνεται με «αποσύνδεση από παντού»
secret4 = secrets.token_urlsafe(32)
rid4 = D.post('/api/auth/desktop/start', json={'challenge': hashlib.sha256(secret4.encode()).hexdigest()}).json['request_id']
S.post(f'/api/auth/desktop/{rid4}/approve')
S.post('/api/me/logout-all')
ok(D.post('/api/desktop-link/poll', json={'request_id': rid4, 'secret': secret4}).status_code == 404,
   'logout-all also cancels approved, unclaimed desktop logins')
S = client('savvas@lasca.test')
secret5 = secrets.token_urlsafe(32)
rid5 = D.post('/api/auth/desktop/start', json={'challenge': hashlib.sha256(secret5.encode()).hexdigest()}).json['request_id']
S.post(f'/api/auth/desktop/{rid5}/approve')
with m.app.app_context():
    row = m.DesktopLogin.query.order_by(m.DesktopLogin.id.desc()).first()
    row.expires_at = row.created_at - timedelta(seconds=1); m.db.session.commit()
ok(D.post('/api/desktop-link/poll', json={'request_id': rid5, 'secret': secret5}).json.get('code') == 'expired',
   'approved requests expire too')

# ανέβασμα από το exe με client_ref: αν ξαναγίνει (π.χ. μετά από timeout) δεν φτιάχνει διπλό
r1 = S.post('/api/projects', json={'name': 'Από exe', 'state': {'traverse_data': [{'id': 1, 'x': '1'}]}, 'client': 'desktop', 'client_ref': 'ref-123'})
r2 = S.post('/api/projects', json={'name': 'Από exe', 'state': {'traverse_data': [{'id': 1, 'x': '1'}]}, 'client': 'desktop', 'client_ref': 'ref-123'})
ok(r1.status_code == 201 and r2.status_code == 200 and r1.json['project']['public_id'] == r2.json['project']['public_id'],
   'repeated upload with same client_ref returns the same project')
ok(A.post('/api/projects', json={'name': 'Από exe', 'client_ref': 'ref-123'}).json['project']['public_id'] != r1.json['project']['public_id'],
   'client_ref is per owner')

# --- 4. διαγραφή με public_id (ιδιοκτήτης) ----------------------------------------------
r = S.post(f'/api/projects/{pid}/delete'); ok(r.status_code == 200, 'owner deletes by public id')
with m.app.app_context():
    ok(m.ProjectRead.query.count() == 0 or all(x.project_id != pid for x in m.ProjectRead.query.all()), 'read markers removed')
ok(A.post(f'/api/projects/{pid}/sync', json={}).status_code == 404, 'members lose access after delete')

print('\nALL HISTORY / DESKTOP-LOGIN CHECKS PASS')
