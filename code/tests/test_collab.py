"""
Έλεγχος κοινών projects / ρόλων / προσκλήσεων / ζωντανού συγχρονισμού / προφίλ.
Τρέχει σε προσωρινό φάκελο, δεν αγγίζει τα δεδομένα σου:

    python code/tests/test_collab.py
"""
import io, os, sys, tempfile
from pathlib import Path

TMP = Path(tempfile.mkdtemp(prefix='lasca-test-'))
os.environ.update({'SECRET_KEY': 'test-secret-key-0123456789abcdef0123456789', 'COOKIE_SECURE': '0', 'HIBP_CHECK': '0', 'LASCA_DATA': str(TMP),
                   'LASCA_SQLITE_DB': str(TMP / 'lasca.db'), 'LASCA_PROJECTS_DIR': str(TMP / 'projects')})
os.environ.pop('LASCA_ENV', None)
os.environ['REQUIRE_EMAIL_VERIFICATION'] = '0'  # εδώ δεν ελέγχεται η επιβεβαίωση email (βλ. test_security)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main_4_app as m  # noqa: E402

PW = 'Lasca-Test-Pass-2026!'

ok = lambda cond, msg: print(('PASS ' if cond else 'FAIL ') + msg) or (cond or sys.exit(1))

with m.app.app_context():
    for email in ('savvas@lasca.test', 'alex@lasca.test', 'ilias@lasca.test'):
        u = m.User(email=email, display_name=email.split('@')[0]); u.set_password(PW); m.db.session.add(u)
    m.db.session.commit()
    ids = {u.email: u.id for u in m.User.query.all()}
    for name, owner, shared in (('Άσκηση 1 - Όδευση', 'savvas', [('alex', 'editor')]),
                                ('Χωροστάθμηση Campus', 'alex', [('savvas', 'editor'), ('ilias', 'viewer')])):
        p = m.Project(name=name, owner_id=ids[f'{owner}@lasca.test']); m.db.session.add(p); m.db.session.flush()
        for who, role in shared:
            m.db.session.add(m.ProjectMember(project_id=p.id, user_id=ids[f'{who}@lasca.test'], role=role))
    m.db.session.commit()

def client(email):
    c=m.app.test_client(); c.environ_base['HTTP_ORIGIN']='http://localhost'; r=c.post('/api/login',json={'email':email,'password':PW}); assert r.status_code==200,r.json; return c
S,A,I=client('savvas@lasca.test'),client('alex@lasca.test'),client('ilias@lasca.test')

# --- roles via load ---
r=A.post('/api/projects/load',json={'project_name':'Χωροστάθμηση Campus'}); meta=r.json['_meta']; pid=meta['public_id']
ok(meta['role']=='owner','alex owner of Campus')
ok(I.post('/api/projects/load',json={'project_name':'Χωροστάθμηση Campus'}).json['_meta']['role']=='viewer','ilias is viewer')
r=I.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{'traverse_data':[1]}}); ok(r.status_code==403 and r.json['code']=='read_only','viewer cannot save')

# --- versions + conflict ---
st=S.post('/api/projects/load',json={'project_name':'Χωροστάθμηση Campus'}).json; v0=st['_meta']['version']
r=S.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{**st,'traverse_data':[{'id':1,'x':'100'}]},'base_version':v0}); ok(r.status_code==200 and r.json['version']==v0+1,'savvas saves -> version+1')
r=S.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{**st,'traverse_data':[{'id':1,'x':'100'}]},'base_version':v0+1}); ok(r.json['changed'] is False,'identical save does not bump version')
r=A.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{**st,'traverse_data':[{'id':9,'x':'200'}]},'base_version':v0}); ok(r.status_code==409 and r.json['current']['updated_by']['display_name'],'stale save from other user -> 409 conflict')
r=A.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{**st,'traverse_data':[{'id':9,'x':'200'}]},'base_version':v0,'force':True}); ok(r.status_code==200,'force save wins')

# --- sync: presence, remote state, activity ---
r=S.post(f'/api/projects/{pid}/sync',json={'since_version':v0+1,'tool':'traverse'}); j=r.json
ok('state' in j and j['state']['traverse_data']==[{'id':9,'x':'200'}],'sync returns other user change')
ok(any(p['self'] for p in j['presence']),'presence includes me')
r=A.post(f'/api/projects/{pid}/sync',json={'since_version':j['project']['version'],'tool':'dashboard'}); j2=r.json
ok('state' not in j2,'no state when nothing new from others'); ok(len(j2['presence'])==2,'two users online')
ok(any(a['action']=='saved' for a in j2['activity']),'activity has saves')

# --- members/roles ---
r=A.get(f'/api/projects/{pid}/members'); ok([x['role'] for x in r.json['members']]==['owner','editor','viewer'],'members with roles')
iid=[x for x in r.json['members'] if x['email']=='ilias@lasca.test'][0]['id']
ok(S.patch(f'/api/projects/{pid}/members/{iid}',json={'role':'editor'}).status_code==403,'editor cannot change roles')
ok(A.patch(f'/api/projects/{pid}/members/{iid}',json={'role':'editor'}).status_code==200,'owner changes role')
ok(I.post('/api/projects/save',json={'project_name':'Χωροστάθμηση Campus','state':{'x':1}}).status_code==200,'ilias can now save')

# --- invites ---
r=S.post('/api/projects/load',json={'project_name':'Αποτύπωση Νέα'}); pid2=r.json['_meta']['public_id']
r=S.post(f'/api/projects/{pid2}/invites',json={'role':'viewer','days':7,'max_uses':1}); tok=r.json['invite']['token']; ok(r.status_code==201 and '/invite/' in r.json['invite']['url'],'invite created')
anon=m.app.test_client(); anon.environ_base['HTTP_ORIGIN']='http://localhost'; r=anon.get(f'/api/invites/{tok}'); ok(r.status_code==200 and r.json['role']=='viewer','invite preview without login')
ok(anon.post(f'/api/invites/{tok}/accept').status_code==401,'accept needs login')
r=I.post(f'/api/invites/{tok}/accept'); ok(r.json['joined'] and r.json['project']['role']=='viewer','ilias joined via link')
ok(A.post(f'/api/invites/{tok}/accept').status_code==410,'max_uses enforced')
ok(I.get('/api/projects/list').json.count('Αποτύπωση Νέα')==1,'shared project in ilias list')

# --- leave / transfer ---
ok(I.post(f'/api/projects/{pid2}/leave').status_code==200,'ilias leaves'); ok('Αποτύπωση Νέα' not in I.get('/api/projects/list').json,'gone from list')
S.post(f'/api/projects/{pid2}/members',json={'email':'alex@lasca.test','role':'editor'})
aid=[x for x in S.get(f'/api/projects/{pid2}/members').json['members'] if x['email']=='alex@lasca.test'][0]['id']
r=S.post(f'/api/projects/{pid2}/transfer',json={'user_id':aid}); ok(r.json['project']['role']=='editor','savvas now editor after transfer')
ok(A.get(f'/api/projects/{pid2}/members').json['members'][0]['email']=='alex@lasca.test','alex is new owner')
ok(S.post(f'/api/projects/{pid2}/members',json={'email':'ilias@lasca.test'}).status_code==403,'ex-owner cannot add members')

# --- profile ---
from PIL import Image
buf=io.BytesIO(); Image.new('RGB',(600,300),(200,40,40)).save(buf,'PNG'); buf.seek(0)
r=S.put('/api/me',data={'display_name':'Σάββας','avatar':(buf,'a.png')},content_type='multipart/form-data'); ok(r.status_code==200 and r.json['avatar_url'],'avatar upload processed')
ok(A.get(r.json['avatar_url']).mimetype=='image/webp','collaborator sees avatar (signed url)')
lonely=m.app.test_client(); lonely.environ_base['HTTP_ORIGIN']='http://localhost'; lonely.post('/api/register',json={'email':'x@lasca.test','password':'Another-Strong-Pass-77?','display_name':'X','accept_terms':True,'age_confirmed':True})
ok(lonely.get(r.json['avatar_url']).mimetype=='image/webp','signed avatar url works in <img> without an auth header')
_unsigned=lonely.get(r.json['avatar_url'].split('?')[0]); ok(_unsigned.status_code==200 and _unsigned.mimetype=='image/svg+xml','unsigned avatar url gives only the default image (no id enumeration)')
_forged=lonely.get(r.json['avatar_url'].split('&s=')[0]+'&s='+'0'*32); ok(_forged.mimetype=='image/svg+xml','forged avatar signature rejected')
ok(S.get('/api/me/projects').json['stats']['collaborators']==2,'profile stats')
ok(S.post('/api/me/password',json={'current_password':'wrong','new_password':'Brand-New-Pass-2026#'}).status_code==403,'wrong current password rejected')
S2=client('savvas@lasca.test')
ok(S.post('/api/me/password',json={'current_password':PW,'new_password':'Brand-New-Pass-2026#'}).status_code==200,'password changed')
ok(S.get('/api/me').status_code==200,'current device stays logged in')
ok(S2.get('/api/me').status_code==401,'other device logged out')
ok(S.get('/api/users/lookup?q=il').json['users'][0]['email']=='ilias@lasca.test','user lookup')

# --- device token (exe) ---
r=anon.post('/api/auth/device-token',json={'email':'alex@lasca.test','password':PW}); tok=r.json['token']; H={'Authorization':'Bearer '+tok}
ok(r.status_code==201,'device token issued')
ok(anon.get('/api/me/projects',headers=H).status_code==200,'bearer token works')
ok(anon.post('/api/projects',json={'name':'Άσκηση 1 - Όδευση','state':{'traverse_data':[1]}},headers=H).json['project']['name']=='Άσκηση 1 - Όδευση (2)','create with unique name')
A.post('/api/me/logout-all'); ok(anon.get('/api/me/projects',headers=H).status_code==401,'logout-all revokes device token')

# --- Clerk bearer token on project routes ---
_verify_clerk_token=m.verify_clerk_token
_fetch_clerk_profile=m.fetch_clerk_profile
m.verify_clerk_token=lambda token: ({'sub':'clerk_test_alex'},None)
m.fetch_clerk_profile=lambda clerk_user_id: {
    'email':'alex@lasca.test','email_verified':True,'display_name':'alex'
}
clerk_headers={'Authorization':'Bearer clerk-session-token' + ('x'*220)}
r=anon.post('/api/projects/load',json={'project_name':'Clerk Bearer Project'},headers=clerk_headers)
ok(r.status_code==200 and r.json['_meta']['name']=='Clerk Bearer Project',
   'Clerk bearer token authenticates project load and creation')
ok(anon.get('/api/me/projects',headers=clerk_headers).status_code==200,
   'Clerk bearer token authenticates the profile project list')
m.verify_clerk_token=_verify_clerk_token
m.fetch_clerk_profile=_fetch_clerk_profile

# --- delete account keeps shared projects ---
r=A.delete('/api/me',json={'password':PW,'confirm':'ΔΙΑΓΡΑΦΗ'}); ok(r.status_code==200 and 'Χωροστάθμηση Campus' in r.json['transferred'],'account deleted, shared project transferred')
ok('Χωροστάθμηση Campus' in I.get('/api/projects/list').json,'collaborator still has project')
print('ALL PASS')
