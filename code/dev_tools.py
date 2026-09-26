"""
Εργαλεία δοκιμών για την web έκδοση της LASCA (ΜΟΝΟ για τον υπολογιστή σου).

Χρήση, από τον φάκελο LASCA του repo και με τον server ΣΤΑΜΑΤΗΜΕΝΟ:

    python code/dev_tools.py reset    # σβήνει χρήστες, projects και εικόνες προφίλ
    python code/dev_tools.py seed     # φορτώνει χρήστες και projects δοκιμής
    python code/dev_tools.py fresh    # reset + seed μαζί
    python code/dev_tools.py list     # δείχνει τι υπάρχει στη βάση

Για ασφάλεια δουλεύει μόνο όταν το code/.env έχει LASCA_ENV=development και
LASCA_PROJECTS_DIR ξεχωριστό από τον φάκελο της desktop εφαρμογής (~/LASCA).
Στον server δεν βάζεις LASCA_ENV, οπότε το script αρνείται να τρέξει εκεί.
"""
import os
import shutil
import sys
from pathlib import Path

# Οι σχετικές διαδρομές του .env (./local_data κ.λπ.) μετράνε από τον φάκελο του repo,
# όπως και όταν τρέχεις τον server με `python code/main_4_app.py`.
REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Φορτώνει την εφαρμογή (και το code/.env) χωρίς να ξεκινήσει τον server.
import main_4_app as lasca  # noqa: E402
from project_manager import TopoProject  # noqa: E402

app, db = lasca.app, lasca.db
User, Project, ProjectMember = lasca.User, lasca.Project, lasca.ProjectMember
WORKSPACE_DIR = lasca.WORKSPACE_DIR
AVATAR_DIR = lasca.USER_AVATAR_DIR

SEED_PASSWORD = 'lasca123'

# Το .test είναι δεσμευμένο domain: κανένα από αυτά τα email δεν είναι πραγματικό.
SEED_USERS = [
    {'email': 'savvas@lasca.test', 'name': 'SAVVAS (test)'},
    {'email': 'ilias@lasca.test', 'name': 'Liakos (test)'},
    {'email': 'alex@lasca.test', 'name': 'Tragos (test)'},
]

# owner = email δημιουργού, shared_with = emails που έχουν πρόσβαση
SEED_PROJECTS = [
    {'name': 'Άσκηση 1 - Όδευση', 'owner': 'savvas@lasca.test', 'shared_with': ['alex@lasca.test'],
     'settings': {'designer': 'Μαρία', 'employer': 'ΑΠΘ', 'location': 'Πανεπιστημιούπολη'}},
    {'name': 'Αποτύπωση Κτιρίου', 'owner': 'ilias@lasca.test', 'shared_with': [],
     'settings': {'designer': 'Μαρία', 'employer': 'ΑΠΘ', 'location': 'Θεσσαλονίκη'}},
    {'name': 'Χωροστάθμηση Campus', 'owner': 'alex@lasca.test', 'shared_with': ['savvas@lasca.test', 'ilias@lasca.test'],
     'settings': {'designer': 'Νίκος', 'employer': 'ΑΠΘ', 'location': 'Πανεπιστημιούπολη'}},
]


def check_safe():
    if os.getenv('LASCA_ENV', '').strip().lower() != 'development':
        sys.exit('ΣΤΟΠ: βάλε LASCA_ENV=development στο code/.env. '
                 'Το script δεν τρέχει χωρίς αυτό, ώστε να μην τρέξει ποτέ κατά λάθος στον server.')
    if not os.getenv('LASCA_PROJECTS_DIR', '').strip():
        sys.exit('ΣΤΟΠ: βάλε LASCA_PROJECTS_DIR=./local_data/projects στο code/.env, '
                 'ώστε τα projects δοκιμής να μην ανακατεύονται με της desktop εφαρμογής.')
    if WORKSPACE_DIR.resolve() == (Path.home() / 'LASCA').resolve():
        sys.exit(f'ΣΤΟΠ: ο φάκελος projects είναι ο {WORKSPACE_DIR}, ο φάκελος της desktop εφαρμογής. '
                 'Δεν τον αγγίζω.')


def clear_folder(folder: Path):
    if not folder.exists():
        return 0
    count = 0
    for child in folder.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
        count += 1
    return count


def reset():
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()
    projects = clear_folder(WORKSPACE_DIR)
    avatars = clear_folder(AVATAR_DIR)
    print(f'✔ Άδειασε η βάση χρηστών ({lasca.app.config["SQLALCHEMY_DATABASE_URI"]})')
    print(f'✔ Σβήστηκαν {projects} φάκελοι projects από {WORKSPACE_DIR}')
    print(f'✔ Σβήστηκαν {avatars} εικόνες προφίλ')


def seed():
    with app.app_context():
        users = {}
        for spec in SEED_USERS:
            user = User.query.filter_by(email=spec['email']).first()
            if user is None:
                user = User(email=spec['email'], display_name=spec['name'])
                user.set_password(SEED_PASSWORD)
                db.session.add(user)
                print(f'✔ Χρήστης {spec["email"]}')
            users[spec['email']] = user
        db.session.commit()

        for spec in SEED_PROJECTS:
            project = Project.query.filter_by(name=spec['name']).first()
            if project is None:
                project = Project(name=spec['name'], owner_id=users[spec['owner']].id)
                db.session.add(project)
                db.session.commit()
                print(f'✔ Project «{spec["name"]}» του {spec["owner"]}')
            TopoProject(workspace_dir=str(WORKSPACE_DIR), project_name=spec['name']) \
                .setup_project_structure(initial_settings=spec['settings'])
            for email in spec['shared_with']:
                member = users[email]
                if not ProjectMember.query.filter_by(project_id=project.id, user_id=member.id).first():
                    db.session.add(ProjectMember(project_id=project.id, user_id=member.id, role='editor'))
                    print(f'  ↳ κοινό με {email}')
        db.session.commit()

    print(f'\nΌλοι οι χρήστες δοκιμής έχουν κωδικό: {SEED_PASSWORD}')


def show():
    with app.app_context():
        print('Χρήστες:')
        for u in User.query.order_by(User.id).all():
            print(f'  #{u.id}  {u.email}  ({u.display_name})')
        print('Projects:')
        for p in Project.query.order_by(Project.id).all():
            members = [m.user.email for m in ProjectMember.query.filter_by(project_id=p.id).all() if m.user]
            shared = f'  κοινό με: {", ".join(members)}' if members else ''
            print(f'  «{p.name}»  owner: {p.owner.email if p.owner else "?"}{shared}')
    print(f'Φάκελος projects: {WORKSPACE_DIR}')


COMMANDS = {'reset': [reset], 'seed': [seed], 'fresh': [reset, seed], 'list': [show]}

if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command not in COMMANDS:
        sys.exit(__doc__)
    if command != 'list':
        check_safe()
    for step in COMMANDS[command]:
        step()
    if command in {'reset', 'fresh'}:
        print('\nΚαθάρισε και τον browser (F12 → Application → Clear site data) ή κάνε Αποσύνδεση, '
              'αλλιώς μπορεί να βρεθείς συνδεδεμένος ως άλλος χρήστης.')


# python code\dev_tools.py fresh	Σβήνει τα πάντα και φορτώνει τα δεδομένα δοκιμής. Αυτό θα χρησιμοποιείς συνήθως
# python code\dev_tools.py reset	Μόνο σβήσιμο: χρήστες, projects, εικόνες προφίλ
# python code\dev_tools.py seed     Μόνο φόρτωση δεδομένων δοκιμής (δεν σβήνει ό,τι υπάρχει)
# python code\dev_tools.py list	    Δείχνει ποιοι χρήστες και projects υπάρχουν