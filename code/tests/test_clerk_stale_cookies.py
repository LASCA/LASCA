"""
Έλεγχος: browser με ΠΑΛΙΑ cookies από την προ-Clerk σύνδεση («να με θυμάσαι» + session) που στέλνει και
token του Clerk. Οι υπολογισμοί (POST, με όριο αιτημάτων ανά χρήστη) πρέπει να περνούν, όχι 401.
Το όριο αιτημάτων είναι ΕΝΕΡΓΟ εδώ (στα υπόλοιπα tests είναι κλειστό).

    python code/tests/test_clerk_stale_cookies.py
"""
import os, sys, tempfile
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0',
                   'LASCA_DATA': str(TMP), 'LASCA_SQLITE_DB': str(TMP / 'lasca.db'),
                   'LASCA_PROJECTS_DIR': str(TMP / 'projects'), 'API_THROTTLE': '1', 'REQUIRE_EMAIL_VERIFICATION': '0'})
os.environ.pop('LASCA_ENV', None)
os.environ.pop('TEAM_GATE_PASSWORD', None)
os.environ['CLERK_PUBLISHABLE_KEY'] = 'pk_test_' + __import__('base64').b64encode(b'clerk.lasca.test$').decode().rstrip('=')
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import main_4_app as m  # noqa: E402

PW = 'Lasca-Test-Pass-2026!'
ok = lambda cond, msg: print(('PASS ' if cond else 'FAIL ') + msg) or (cond or sys.exit(1))

with m.app.app_context():
    u = m.User(email='kostas@lasca.test', display_name='Κώστας', email_verified=True, clerk_id='user_kostas')
    u.set_password(PW); m.db.session.add(u); m.db.session.commit()

m.verify_clerk_token = lambda token: (({'sub': token[6:], 'fva': [2, -1]}, None) if token.startswith('clerk:')
                                     else (None, 'Invalid token'))
H = {'Authorization': 'Bearer clerk:user_kostas'}
BODY = {'measurements': [{'station': 'S1', 'target': 'S2', 'Period': '1', 'Face_I': '10.0000', 'Face_II': '210.0000'}]}

# Καθαρός browser (όπως η ανώνυμη περιήγηση)
fresh = m.app.test_client(); fresh.environ_base['HTTP_ORIGIN'] = 'http://localhost'
r = fresh.post('/api/adjustment', json=BODY, headers=H)
ok(r.status_code != 401, f'clean browser: adjustment with Clerk token is accepted ({r.status_code})')

# Browser με παλιά σύνδεση «να με θυμάσαι», που μετά άκυρώθηκε (αλλαγή κωδικού/αποσύνδεση παντού)
old = m.app.test_client(); old.environ_base['HTTP_ORIGIN'] = 'http://localhost'
r = old.post('/api/login', json={'email': 'kostas@lasca.test', 'password': PW, 'remember': True})
ok(r.status_code == 200, 'legacy login with remember-me')
ok(any('remember' in c.key for c in old._cookies.values()), 'browser keeps the legacy remember-me cookie')
with m.app.app_context():
    u = m.User.query.filter_by(email='kostas@lasca.test').first(); u.session_version = (u.session_version or 0) + 1
    m.db.session.commit()

for path, body in (('/api/adjustment', BODY), ('/api/basic_calc/scale', {'scale': 1000})):
    r = old.post(path, json=body, headers=H)
    ok(r.status_code != 401, f'stale cookies + Clerk token: POST {path} is not 401 ({r.status_code})')
ok(old.get('/api/me/projects', headers=H).status_code == 200, 'stale cookies + Clerk token: project list works')

# Χωρίς token του Clerk, τα παλιά cookies ΔΕΝ ανοίγουν τίποτα.
ok(old.post('/api/adjustment', json=BODY).status_code == 401, 'stale cookies alone are rejected')

# Επικοινωνία: browser με ΕΓΚΥΡΟ παλιό cookie του λογαριασμού Α, συνδεδεμένος τώρα στο Clerk ως Β.
# Το μήνυμα πρέπει να φεύγει ως Β (όχι πάντα ως Α).
os.environ.update({'RESEND_API_KEY': 're_test', 'NOTIFICATION_EMAIL': 'team@lasca.test'})
SENT = []
m.resend.Emails.send = staticmethod(lambda params: SENT.append(params) or {'id': 'x'})
with m.app.app_context():
    for email, sub in (('anna@lasca.test', 'user_anna'), ('bob@lasca.test', 'user_bob')):
        u = m.User(email=email, display_name=email[:4], email_verified=True, clerk_id=sub)
        u.set_password(PW); m.db.session.add(u)
    m.db.session.commit()
shared = m.app.test_client(); shared.environ_base['HTTP_ORIGIN'] = 'http://localhost'
ok(shared.post('/api/login', json={'email': 'anna@lasca.test', 'password': PW, 'remember': True}).status_code == 200,
   'legacy session cookie for account A')
r = shared.post('/api/feedback', json={'type': 'bug', 'details': 'από τον Β'}, headers={'Authorization': 'Bearer clerk:user_bob'})
ok(r.status_code == 200 and SENT and 'bob@lasca.test' in SENT[-1]['subject'] and SENT[-1].get('reply_to') == 'bob@lasca.test',
   f'feedback is sent as the Clerk account, not the old cookie ({r.status_code}, {SENT[-1]["subject"] if SENT else "-"})')
r = shared.post('/api/feedback', json={'type': 'bug', 'details': 'από την Α'}, headers={'Authorization': 'Bearer clerk:user_anna'})
ok(r.status_code == 200 and 'anna@lasca.test' in SENT[-1]['subject'], 'switching account changes the sender')

print('\nALL STALE-COOKIE CHECKS PASS')
