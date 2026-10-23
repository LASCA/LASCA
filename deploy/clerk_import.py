#!/usr/bin/env python3
"""Περνάει τους χρήστες της lasca.db στο Clerk, με τους ΙΔΙΟΥΣ κωδικούς (χωρίς να τους ξέρουμε).

Ο κωδικός μεταφέρεται ως hash (Werkzeug scrypt ή pbkdf2), οπότε ο χρήστης μπαίνει με τον ίδιο κωδικό.
Κάθε χρήστης δημιουργείται με external_id = το id του στη lasca.db και το clerk_user_id γράφεται πίσω,
ώστε στην πρώτη είσοδο να βρει τα projects του. Το email μπαίνει στο Clerk ως επιβεβαιωμένο, άρα
περνούν ΜΟΝΟ λογαριασμοί με επιβεβαιωμένο email (εκτός αν δοθεί --include-unverified).

Στον server, από το /srv/lasca (μία εντολή τη φορά):

  1. Τι θα γίνει (δεν αλλάζει τίποτα):
       venv/bin/python deploy/clerk_import.py
  2. Δοκιμή με ΕΝΑΝ λογαριασμό που ξέρεις τον κωδικό του (βρίσκει ποια μορφή hash δέχεται το Clerk):
       venv/bin/python deploy/clerk_import.py --probe το-email-σου@example.com
  3. Όλοι οι υπόλοιποι, με τη μορφή που βρήκε το βήμα 2 (π.χ. A):
       venv/bin/python deploy/clerk_import.py --apply --scrypt-format A

Χρειάζεται CLERK_SECRET_KEY στο code/.env. Ξανατρέχει με ασφάλεια: όποιος έχει ήδη clerk_user_id παραλείπεται,
και όποιο email υπάρχει ήδη στο Clerk απλώς συνδέεται.
"""
import argparse
import base64
import getpass
import os
import sys
import time
from datetime import timezone
from pathlib import Path

CODE_DIR = Path(__file__).resolve().parent.parent / 'code'


# ---------------------------------------------------------------------------
# Μετατροπή hash Werkzeug → μορφή Clerk (χωρίς δίκτυο· ελέγχεται στο tests/test_clerk_sync.py)
# ---------------------------------------------------------------------------
def scrypt_variants(werkzeug_hash):
    """Το Clerk (scrypt_werkzeug) περιγράφει «$<algorithm args>$<salt>$<hash σε Base64>». Το Werkzeug γράφει
    «scrypt:N:r:p$<salt>$<hash σε hex>». Επειδή η τεκμηρίωση δεν είναι σαφής, το --probe δοκιμάζει όλες."""
    method, salt, hexhash = werkzeug_hash.split('$', 2)
    b64 = base64.b64encode(bytes.fromhex(hexhash)).decode()
    return {'A': f'${method}${salt}${b64}', 'B': f'{method}${salt}${b64}',
            'C': werkzeug_hash, 'D': f'${werkzeug_hash}'}


def clerk_digest(werkzeug_hash, scrypt_format='A'):
    """(password_hasher, password_digest) για το Clerk, ή (None, None) αν η μορφή δεν υποστηρίζεται."""
    method = werkzeug_hash.split('$', 1)[0]
    if method.startswith('scrypt:'):
        return 'scrypt_werkzeug', scrypt_variants(werkzeug_hash)[scrypt_format]
    if method.startswith('pbkdf2:sha256'):
        parts = method.split(':')
        iterations = parts[2] if len(parts) > 2 else '600000'
        _, salt, hexhash = werkzeug_hash.split('$', 2)
        return 'pbkdf2_sha256', '$'.join(['pbkdf2_sha256', iterations, base64.b64encode(salt.encode()).decode(),
                                          base64.b64encode(bytes.fromhex(hexhash)).decode()])
    return None, None


def split_name(display_name):
    """«Κώστας Τ.» → ('Κώστας', 'Τ.')· μία λέξη → μόνο όνομα."""
    parts = str(display_name or '').split()
    if len(parts) <= 1:
        return (parts[0] if parts else ''), ''
    return ' '.join(parts[:-1]), parts[-1]


# ---------------------------------------------------------------------------
# Clerk Backend API
# ---------------------------------------------------------------------------
def api(method, path, **kwargs):
    from clerk_sync import clerk_api
    for attempt in range(5):
        resp = clerk_api(method, path, **kwargs)
        if resp.status_code != 429:
            return resp
        time.sleep(float(resp.headers.get('Retry-After') or 2 ** attempt))
    return resp


def error_text(resp):
    try:
        errors = resp.json().get('errors') or []
        return '; '.join(f"{e.get('code')}: {e.get('long_message') or e.get('message')}" for e in errors) or resp.text[:300]
    except ValueError:
        return resp.text[:300]


def find_clerk_user(email):
    resp = api('GET', '/users', params={'email_address': [email], 'limit': 1})
    if resp.status_code != 200:
        raise RuntimeError(f'Clerk: αναζήτηση email απέτυχε ({resp.status_code}): {error_text(resp)}')
    users = resp.json()
    users = users.get('data', users) if isinstance(users, dict) else users
    return users[0] if users else None


def create_payload(user, scrypt_format):
    first, last = split_name(user.display_name)
    payload = {'external_id': str(user.id), 'email_address': [user.email], 'first_name': first or None,
               'last_name': last or None, 'skip_password_checks': True, 'skip_legal_checks': True}
    if user.terms_accepted_at:
        payload['legal_accepted_at'] = user.terms_accepted_at.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')
    hasher, digest = (clerk_digest(user.password_hash, scrypt_format) if user.has_password and user.password_hash
                      else (None, None))
    if hasher:
        payload['password_hasher'], payload['password_digest'] = hasher, digest
    else:
        payload['skip_password_requirement'] = True   # μόνο Google ή άγνωστη μορφή hash: μπαίνει με Google / «Ξέχασα»
    return {k: v for k, v in payload.items() if v is not None}


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='Εισαγωγή των χρηστών της lasca.db στο Clerk')
    ap.add_argument('--apply', action='store_true', help='κάνε πραγματικά την εισαγωγή (χωρίς αυτό: μόνο αναφορά)')
    ap.add_argument('--probe', metavar='EMAIL', help='δοκιμή με έναν λογαριασμό που ξέρεις τον κωδικό του')
    ap.add_argument('--only', metavar='EMAIL', help='μόνο αυτός ο λογαριασμός')
    ap.add_argument('--scrypt-format', choices='ABCD', default='A', help='μορφή hash που βρήκε το --probe')
    ap.add_argument('--include-unverified', action='store_true', help='και λογαριασμοί χωρίς επιβεβαιωμένο email')
    args = ap.parse_args()

    sys.path.insert(0, str(CODE_DIR))
    import main_4_app as m   # φορτώνει code/.env και τη βάση (ίδια με τον server)
    if not os.getenv('CLERK_SECRET_KEY', '').strip():
        sys.exit('✗ Λείπει το CLERK_SECRET_KEY από το code/.env')

    with m.app.app_context():
        if args.probe:
            return probe(m, args.probe)
        query = m.User.query.filter(m.User.clerk_id.is_(None))
        if args.only:
            query = query.filter(m.User.email == m.normalize_email(args.only))
        users = query.order_by(m.User.id).all()
        todo = [u for u in users if u.email_verified or args.include_unverified]
        skipped = len(users) - len(todo)
        print(f'Χρήστες χωρίς Clerk: {len(users)} · για εισαγωγή: {len(todo)} · χωρίς επιβεβαιωμένο email (παραλείπονται): {skipped}')
        if not args.apply:
            for u in todo[:20]:
                hasher = clerk_digest(u.password_hash, 'A')[0] if u.has_password else None
                print(f'  {u.id:>5}  {u.email:40}  κωδικός: {hasher or "όχι (Google)"}')
            if len(todo) > 20:
                print(f'  … και {len(todo) - 20} ακόμα')
            print('\nΤίποτα δεν άλλαξε. Πρώτα: --probe ΤΟ-EMAIL-ΣΟΥ, μετά: --apply --scrypt-format <μορφή>')
            return 0

        created = linked = failed = 0
        for u in todo:
            try:
                existing = find_clerk_user(u.email)
                if existing:
                    u.clerk_id = existing['id']
                    u.email_verified = True
                    m.db.session.commit()
                    linked += 1
                    print(f'  ↔ {u.email}: υπήρχε ήδη στο Clerk, συνδέθηκε')
                    continue
                resp = api('POST', '/users', json=create_payload(u, args.scrypt_format))
                if resp.status_code not in (200, 201):
                    failed += 1
                    print(f'  ✗ {u.email}: {error_text(resp)}')
                    continue
                u.clerk_id = resp.json()['id']
                u.email_verified = True   # στο Clerk το email δημιουργείται επιβεβαιωμένο
                m.db.session.commit()
                created += 1
                print(f'  ✓ {u.email}')
            except Exception as exc:  # noqa: BLE001
                m.db.session.rollback()
                failed += 1
                print(f'  ✗ {u.email}: {type(exc).__name__}: {exc}')
            time.sleep(0.15)
        print(f'\nΝέοι στο Clerk: {created} · συνδέθηκαν με υπάρχοντες: {linked} · απέτυχαν: {failed}')
        return 1 if failed else 0


def probe(m, email):
    """Ένας λογαριασμός με γνωστό κωδικό: δοκιμάζει κάθε μορφή μέχρι το Clerk να δεχτεί τον κωδικό."""
    user = m.User.query.filter_by(email=m.normalize_email(email)).first()
    if user is None:
        sys.exit('✗ Δεν υπάρχει τέτοιος χρήστης στη lasca.db')
    if user.clerk_id:
        sys.exit(f'✗ Ο χρήστης είναι ήδη συνδεδεμένος με το Clerk ({user.clerk_id}). Δοκίμασε με άλλον.')
    if not (user.has_password and user.password_hash):
        sys.exit('✗ Ο λογαριασμός δεν έχει κωδικό (μόνο Google). Δοκίμασε με λογαριασμό με κωδικό.')
    if find_clerk_user(user.email):
        sys.exit('✗ Το email υπάρχει ήδη στο Clerk. Σβήσ\' το από το Clerk Dashboard ή δοκίμασε με άλλον λογαριασμό.')
    password = getpass.getpass(f'Κωδικός του {user.email} (δεν φαίνεται): ')
    if not user.check_password(password):
        sys.exit('✗ Λάθος κωδικός για τη lasca.db.')

    method = user.password_hash.split('$', 1)[0]
    formats = list('ABCD') if method.startswith('scrypt:') else ['A']
    for fmt in formats:
        resp = api('POST', '/users', json=create_payload(user, fmt))
        if resp.status_code not in (200, 201):
            print(f'  μορφή {fmt}: το Clerk δεν τη δέχτηκε ({error_text(resp)})')
            continue
        clerk_id = resp.json()['id']
        check = api('POST', f'/users/{clerk_id}/verify_password', json={'password': password})
        if check.status_code == 200 and check.json().get('verified'):
            user.clerk_id = clerk_id
            user.email_verified = True
            m.db.session.commit()
            print(f'\n✓ Μορφή {fmt}: ο ίδιος κωδικός δουλεύει στο Clerk και ο λογαριασμός συνδέθηκε.')
            print(f'  Για όλους τους υπόλοιπους: venv/bin/python deploy/clerk_import.py --apply --scrypt-format {fmt}')
            return 0
        api('DELETE', f'/users/{clerk_id}')
        print(f'  μορφή {fmt}: δημιουργήθηκε αλλά ο κωδικός δεν ταιριάζει (σβήστηκε)')
    print('\n✗ Καμία μορφή δεν δούλεψε. Οι χρήστες μπορούν να μπουν με «Ξέχασες τον κωδικό;» ή Google, και ο λογαριασμός')
    print('  τους συνδέεται αυτόματα με το ίδιο email. Ή στείλε μου το αποτέλεσμα για να το δούμε.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
