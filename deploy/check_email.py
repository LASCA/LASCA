#!/usr/bin/env python3
"""Έλεγχος του email (Resend) στον server, χωρίς να τυπώνει μυστικά.

    cd /srv/lasca && venv/bin/python deploy/check_email.py το-email-σου@example.com

Δείχνει αν υπάρχουν οι ρυθμίσεις στο code/.env και στέλνει ένα δοκιμαστικό email με τον ίδιο αποστολέα
που χρησιμοποιεί το LASCA (επιβεβαίωση λογαριασμού, κωδικοί, φόρμα επικοινωνίας). Αν το Resend το απορρίψει,
τυπώνει την αιτία (π.χ. «domain is not verified», «API key is invalid»).
"""
import os
import sys
from pathlib import Path

ENV = Path(__file__).resolve().parent.parent / 'code' / '.env'

try:
    from dotenv import load_dotenv
except ImportError:
    sys.exit('Λείπει το python-dotenv: τρέξε το με venv/bin/python')
if not ENV.is_file():
    sys.exit(f'Δεν βρέθηκε το {ENV}')
load_dotenv(ENV)


def show(name, secret=False):
    value = os.getenv(name, '').strip()
    if not value:
        print(f'  {name:28} ΛΕΙΠΕΙ')
    elif secret:
        print(f'  {name:28} ορισμένο ({len(value)} χαρακτήρες, αρχίζει με {value[:3]}…)')
    else:
        print(f'  {name:28} {value}')
    return value


print(f'Ρυθμίσεις από {ENV}:')
key = show('RESEND_API_KEY', secret=True)
sender = show('EMAIL_FROM') or 'LASCA <onboarding@resend.dev>'
show('NOTIFICATION_EMAIL')
show('PUBLIC_URL')
show('REQUIRE_EMAIL_VERIFICATION')
show('LASCA_ENV')
if os.getenv('LASCA_ENV', '').strip().lower() in {'development', 'dev'}:
    print('\n✗ LASCA_ENV=development: ΜΗΝ το έχεις στον server (κλείνει την επιβεβαίωση email και άλλους ελέγχους).')

try:
    import resend
except ImportError:
    sys.exit('\n✗ Λείπει το πακέτο resend: venv/bin/pip install -r deploy/requirements-web.txt')
if not key:
    sys.exit('\n✗ Χωρίς RESEND_API_KEY δεν στέλνεται κανένα email (και κλείνουν οι νέες εγγραφές).')
if 'resend.dev' in sender:
    print('\n! Ο αποστολέας είναι onboarding@resend.dev: το Resend τον παραδίδει ΜΟΝΟ στο email του λογαριασμού σου στο Resend.\n'
          '  Για email σε όλους: resend.com → Domains → Add domain (lasca.gr), βάλε τις εγγραφές DNS,\n'
          '  και μετά στο code/.env: EMAIL_FROM=LASCA <noreply@lasca.gr>')

if len(sys.argv) < 2:
    sys.exit('\nΓια δοκιμαστικό email: venv/bin/python deploy/check_email.py το-email-σου@example.com')

to = sys.argv[1].strip()
resend.api_key = key
print(f'\nΑποστολή δοκιμαστικού email από «{sender}» προς {to} …')
try:
    result = resend.Emails.send({'from': sender, 'to': [to], 'subject': 'LASCA · δοκιμή email',
                                 'html': '<p>Το email του LASCA δουλεύει.</p>'})
except Exception as exc:  # noqa: BLE001 (θέλουμε να δείξουμε ό,τι απαντήσει το Resend)
    sys.exit(f'✗ Το Resend απέρριψε το email: {type(exc).__name__}: {exc}')
print(f'✓ Στάλθηκε (id: {result.get("id") if isinstance(result, dict) else result}). Δες τα εισερχόμενα και τα «Ανεπιθύμητα».')
