"""
Σύνδεση, εγγραφή και ασφάλεια λογαριασμών της LASCA (web server).

  * Εγγραφή: έλεγχος κωδικού (12+ χαρακτήρες, κεφαλαία/πεζά/αριθμός/σύμβολο, όχι από τους
    10.000 πιο συνηθισμένους, όχι διαρρευμένος κατά το haveibeenpwned), αποδοχή όρων και
    επιβεβαίωση ηλικίας, CAPTCHA (Cloudflare Turnstile) και κρυφό πεδίο κατά των bots.
  * Σύνδεση: όριο αποτυχιών ανά IP (5 / 15 λεπτά), αυξανόμενη αναμονή μετά από 3 λάθη,
    CAPTCHA μετά από 3 λάθη, κλείδωμα λογαριασμού μετά από 10, καταγραφή όλων των αποτυχιών.
  * Έλεγχος δύο βημάτων (2FA): εφαρμογή authenticator (TOTP), κωδικός μέσω email,
    εφεδρικοί κωδικοί μίας χρήσης.
  * Ξέχασα τον κωδικό / επαναφορά κωδικού με σύνδεσμο μίας χρήσης (30 λεπτά).
  * Σύνδεση του προγράμματος των Windows (device token) με τους ίδιους ελέγχους.

Τα μοντέλα της βάσης ορίζονται στο main_4_app.py και περνάνε εδώ με την init_auth().
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import struct
import time
import unicodedata
from datetime import datetime, timedelta
from html import escape
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import quote

from flask import Blueprint, current_app, jsonify, request, session
from flask_login import current_user, login_required, login_user

from security import client_ip

bp = Blueprint('auth_security', __name__)
A = SimpleNamespace()  # μοντέλα/ρυθμίσεις (γεμίζει στην init_auth)

# Κάτω από PASSWORD_MIN ο κωδικός απορρίπτεται. Από PASSWORD_MIN έως PASSWORD_RECOMMENDED γίνεται δεκτός,
# αλλά η σελίδα δείχνει πορτοκαλί προειδοποίηση («προτείνονται 12+ χαρακτήρες»).
PASSWORD_MIN = 8
PASSWORD_RECOMMENDED = 12
PASSWORD_MAX = 128
DISPLAY_NAME_MAX = 60

IP_FAIL_LIMIT = 5                 # αποτυχημένες συνδέσεις ανά IP ...
IP_FAIL_WINDOW = timedelta(minutes=15)   # ... σε 15 λεπτά
CAPTCHA_AFTER = 3                 # μετά από 3 λάθη ζητείται CAPTCHA
BACKOFF_AFTER = 3                 # και αρχίζει αυξανόμενη αναμονή (1, 2, 4, ... 60 δευτ.)
LOCK_AFTER = 10                   # μετά από 10 λάθη ο λογαριασμός κλειδώνει
LOCK_BASE = timedelta(minutes=15)
LOCK_MAX = timedelta(hours=24)
FAIL_MEMORY = timedelta(hours=24)

TWOFA_PENDING_TTL = timedelta(minutes=10)
TWOFA_FAIL_LIMIT = 5
EMAIL_OTP_TTL = timedelta(minutes=10)
EMAIL_OTP_SEND_LIMIT = 3          # αποστολές κωδικού ανά 15 λεπτά
RESET_TTL = timedelta(minutes=30)
BACKUP_CODE_COUNT = 10
SIGNUP_IP_LIMIT = 5               # νέοι λογαριασμοί ανά IP ανά ώρα
EVENT_RETENTION = timedelta(days=90)

FAIL_EVENTS = ('login_failed',)


def init_auth(app, **refs):
    A.__dict__.update(refs)
    A.turnstile_site = os.getenv('TURNSTILE_SITE_KEY', '').strip()
    A.turnstile_secret = os.getenv('TURNSTILE_SECRET_KEY', '').strip()
    A.hibp_enabled = os.getenv('HIBP_CHECK', '1').strip().lower() not in {'0', 'false', 'no'}
    A.email_from = os.getenv('EMAIL_FROM', 'LASCA <onboarding@resend.dev>').strip()
    A.max_emails_day = int(os.getenv('MAX_EMAILS_PER_DAY', '200'))
    A.dev = A.is_development
    key_material = os.getenv('TOTP_ENCRYPTION_KEY', '').strip() or app.config['SECRET_KEY']
    A.fernet_key = base64.urlsafe_b64encode(hashlib.sha256(('lasca-totp:' + key_material).encode()).digest())
    A.hmac_key = hashlib.sha256(('lasca-codes:' + key_material).encode()).digest()
    if not A.turnstile_secret and not A.dev:
        A.logger.warning('TURNSTILE_SECRET_KEY is not set: CAPTCHA is disabled (rate limits still apply)')
    app.register_blueprint(bp)


# ---------------------------------------------------------------------------
# Βοηθητικά
# ---------------------------------------------------------------------------
class AuthError(Exception):
    def __init__(self, message, status=400, code=None, **extra):
        super().__init__(message)
        self.message, self.status, self.code, self.extra = message, status, code, extra


@bp.app_errorhandler(AuthError)
def _auth_error(err):
    payload = {'error': err.message}
    if err.code:
        payload['code'] = err.code
    payload.update(err.extra)
    resp = jsonify(payload)
    resp.status_code = err.status
    if 'retry_after' in err.extra:
        resp.headers['Retry-After'] = str(err.extra['retry_after'])
    return resp


def utcnow():
    return datetime.utcnow()


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text_field(data, key, max_len=320):
    value = data.get(key)
    if value is None:
        return ''
    if not isinstance(value, (str, int, float)):
        raise AuthError('Μη έγκυρα δεδομένα.', 400, code='invalid_input')
    return str(value)[:max_len]


def clean_display_name(value):
    # Χωρίς χαρακτήρες ελέγχου/αόρατους, ένα κενό ανάμεσα στις λέξεις.
    value = ''.join(ch for ch in str(value or '') if unicodedata.category(ch)[0] != 'C')
    return ' '.join(value.split())[:DISPLAY_NAME_MAX]


def mask_email(email):
    if not email or '@' not in email:
        return '<none>'
    local, _, domain = email.partition('@')
    return f'{local[:2]}***@{domain}'


def mask_ip(ip):
    if not ip:
        return None
    if ':' in ip:
        return ':'.join(ip.split(':')[:3]) + ':…'
    parts = ip.split('.')
    return '.'.join(parts[:2] + ['…']) if len(parts) == 4 else ip


def keyed_hash(value):
    return hmac.new(A.hmac_key, value.encode('utf-8'), hashlib.sha256).hexdigest()


def find_user(email):
    if not email:
        return None
    return A.User.query.filter(A.db.func.lower(A.User.email) == email).first()


_DUMMY_HASH = None


def burn_password_check(password):
    """Ίδιος χρόνος απάντησης όταν το email δεν υπάρχει (να μη φαίνεται ποια emails έχουν λογαριασμό)."""
    global _DUMMY_HASH
    from werkzeug.security import check_password_hash, generate_password_hash
    if _DUMMY_HASH is None:
        _DUMMY_HASH = generate_password_hash(secrets.token_hex(16))
    check_password_hash(_DUMMY_HASH, password)


# ---------------------------------------------------------------------------
# Καταγραφή γεγονότων ασφαλείας και μετρητές στη βάση
# ---------------------------------------------------------------------------
def record(event, user=None, email=None, detail=None, commit=True):
    ua = (request.headers.get('User-Agent') or '')[:200] if request else ''
    row = A.AuthEvent(event=event, user_id=getattr(user, 'id', None),
                      email=(email or getattr(user, 'email', None) or None),
                      ip=client_ip(), user_agent=ua,
                      detail=json.dumps(detail, ensure_ascii=False)[:500] if detail else None,
                      created_at=utcnow())
    A.db.session.add(row)
    if commit:
        A.db.session.commit()
    if event in FAIL_EVENTS or event.endswith('_failed') or event.endswith('_blocked'):
        A.logger.warning('auth event=%s email=%s ip=%s detail=%s', event, mask_email(row.email), row.ip,
                         detail if detail else '')
    return row


def db_hit(key, limit, window: timedelta):
    """Μετρητής στη βάση (κοινός για όλους τους workers του gunicorn).
    Επιστρέφει 0 αν επιτρέπεται (και καταγράφει), αλλιώς δευτερόλεπτα αναμονής."""
    now = utcnow()
    since = now - window
    q = A.RateHit.query.filter(A.RateHit.key == key, A.RateHit.created_at > since)
    if q.count() >= limit:
        oldest = q.order_by(A.RateHit.created_at.asc()).first()
        return max(1, int((oldest.created_at + window - now).total_seconds()) + 1)
    A.db.session.add(A.RateHit(key=key, created_at=now))
    A.db.session.commit()
    return 0


def cleanup_old_rows():
    """Σβήνει παλιά γεγονότα (90 ημέρες) και μετρητές (2 ημέρες). Τρέχει περιστασιακά."""
    if secrets.randbelow(50):
        return
    now = utcnow()
    A.AuthEvent.query.filter(A.AuthEvent.created_at < now - EVENT_RETENTION).delete()
    A.RateHit.query.filter(A.RateHit.created_at < now - timedelta(days=2)).delete()
    A.PasswordReset.query.filter(A.PasswordReset.expires_at < now - timedelta(days=1)).delete()
    A.EmailOtp.query.filter(A.EmailOtp.expires_at < now - timedelta(days=1)).delete()
    A.db.session.commit()


def throttle(key, limit, window, message='Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.'):
    wait = db_hit(key, limit, window)
    if wait:
        raise AuthError(message, 429, code='rate_limited', retry_after=wait)


# ---------------------------------------------------------------------------
# Κανόνες κωδικού
# ---------------------------------------------------------------------------
_COMMON = None
_LEET = str.maketrans({'@': 'a', '4': 'a', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '$': 's', '5': 's', '7': 't'})


def common_passwords():
    global _COMMON
    if _COMMON is None:
        path = Path(__file__).resolve().parent / 'security_data' / 'common_passwords.txt'
        try:
            _COMMON = {line.strip().lower() for line in path.read_text(encoding='utf-8').splitlines() if line.strip()}
        except OSError:
            A.logger.error('common_passwords.txt is missing: common-password check disabled')
            _COMMON = set()
    return _COMMON


def is_common_password(password):
    common = common_passwords()
    lowered = password.lower()
    candidates = {lowered, lowered.translate(_LEET)}
    stripped = re.sub(r'^[^a-zα-ω]+|[^a-zα-ω]+$', '', lowered)          # «Password123!» → «password»
    if len(stripped) >= 4:
        candidates |= {stripped, stripped.translate(_LEET)}
    if len(set(lowered)) <= 3:                                          # «aaaaaaaaaaaa», «abababab...»
        return True
    return any(c in common for c in candidates)


def pwned_count(password):
    """haveibeenpwned με k-anonymity: στέλνονται μόνο οι 5 πρώτοι χαρακτήρες του SHA-1.
    Αν η υπηρεσία δεν απαντήσει, δεν μπλοκάρουμε τον χρήστη (επιστρέφει 0)."""
    if not A.hibp_enabled:
        return 0
    digest = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    prefix, suffix = digest[:5], digest[5:]
    try:
        from urllib.request import Request, urlopen
        req = Request(f'https://api.pwnedpasswords.com/range/{prefix}',
                      headers={'Add-Padding': 'true', 'User-Agent': 'LASCA-password-check'})
        with urlopen(req, timeout=3) as resp:
            for line in resp.read().decode('utf-8', 'ignore').splitlines():
                hash_suffix, _, count = line.partition(':')
                if hash_suffix.strip() == suffix:
                    return int(count.strip() or 0)
    except Exception as exc:  # χωρίς internet / timeout
        A.logger.info('HIBP check skipped: %s', type(exc).__name__)
    return 0


def password_problems(password, email='', display_name=''):
    problems = []
    if len(password) < PASSWORD_MIN:
        problems.append(f'τουλάχιστον {PASSWORD_MIN} χαρακτήρες')
    if len(password) > PASSWORD_MAX:
        problems.append(f'το πολύ {PASSWORD_MAX} χαρακτήρες')
    if not re.search(r'[a-zα-ωά-ώ]', password):
        problems.append('ένα πεζό γράμμα')
    if not re.search(r'[A-ZΑ-ΩΆ-Ώ]', password):
        problems.append('ένα κεφαλαίο γράμμα')
    if not re.search(r'\d', password):
        problems.append('έναν αριθμό')
    if not re.search(r'[^\w\s]|_', password):
        problems.append('ένα σύμβολο (π.χ. ! ? # @)')
    return problems


def validate_new_password(password, email='', display_name='', check_breach=True):
    """Πετάει AuthError με εξήγηση αν ο κωδικός δεν είναι αρκετά ισχυρός."""
    if not isinstance(password, str):
        raise AuthError('Μη έγκυρος κωδικός.', 400, code='weak_password')
    problems = password_problems(password, email, display_name)
    if problems:
        raise AuthError('Ο κωδικός χρειάζεται ' + ', '.join(problems) + '.', 400, code='weak_password',
                        requirements=problems)
    lowered = password.lower()
    local = (email or '').split('@', 1)[0].lower()
    if len(local) >= 4 and local in lowered:
        raise AuthError('Ο κωδικός δεν πρέπει να περιέχει το email σου.', 400, code='weak_password')
    name = (display_name or '').lower().replace(' ', '')
    if len(name) >= 4 and name in lowered.replace(' ', ''):
        raise AuthError('Ο κωδικός δεν πρέπει να περιέχει το όνομά σου.', 400, code='weak_password')
    if 'lasca' in lowered and len(lowered.replace('lasca', '')) < 8:
        raise AuthError('Ο κωδικός μοιάζει πολύ με το όνομα της εφαρμογής.', 400, code='weak_password')
    if is_common_password(password):
        raise AuthError('Αυτός ο κωδικός είναι από τους πιο συνηθισμένους και σπάει εύκολα. Διάλεξε άλλον.',
                        400, code='common_password')
    if check_breach:
        count = pwned_count(password)
        if count:
            raise AuthError(f'Αυτός ο κωδικός έχει βρεθεί σε διαρροές δεδομένων ({count:,} φορές). '
                            'Διάλεξε κάποιον που δεν έχεις χρησιμοποιήσει αλλού.', 400, code='breached_password')


# ---------------------------------------------------------------------------
# CAPTCHA (Cloudflare Turnstile)
# ---------------------------------------------------------------------------
def captcha_enabled():
    return bool(A.turnstile_secret and A.turnstile_site)


def verify_captcha(token):
    if not captcha_enabled():
        return True
    if not token or not isinstance(token, str) or len(token) > 4096:
        return False
    try:
        from urllib.parse import urlencode
        from urllib.request import Request, urlopen
        data = urlencode({'secret': A.turnstile_secret, 'response': token, 'remoteip': client_ip()}).encode()
        req = Request('https://challenges.cloudflare.com/turnstile/v0/siteverify', data=data, method='POST')
        with urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        return bool(result.get('success'))
    except Exception as exc:
        A.logger.error('Turnstile verification failed: %s', type(exc).__name__)
        return False


def require_captcha(data, reason='captcha'):
    if not captcha_enabled():
        return
    if not verify_captcha(data.get('captcha_token')):
        raise AuthError('Επιβεβαίωσε ότι δεν είσαι ρομπότ.', 400, code='captcha_required',
                        captcha_site_key=A.turnstile_site)


# ---------------------------------------------------------------------------
# Προστασία σύνδεσης (όρια, αναμονή, κλείδωμα)
# ---------------------------------------------------------------------------
def _fail_state(email):
    """Πόσα λάθη έχει το email από την τελευταία επιτυχή σύνδεση/επαναφορά (24 ώρες)."""
    Ev = A.AuthEvent
    now = utcnow()
    last_ok = Ev.query.filter(Ev.email == email, Ev.event.in_(('login_success', 'password_reset')),
                              Ev.created_at > now - FAIL_MEMORY) \
        .order_by(Ev.created_at.desc()).first()
    since = max(now - FAIL_MEMORY, last_ok.created_at) if last_ok else now - FAIL_MEMORY
    q = Ev.query.filter(Ev.email == email, Ev.event.in_(FAIL_EVENTS), Ev.created_at > since)
    count = q.count()
    last = q.order_by(Ev.created_at.desc()).first() if count else None
    return count, (last.created_at if last else None)


def _ip_failures():
    Ev = A.AuthEvent
    since = utcnow() - IP_FAIL_WINDOW
    q = Ev.query.filter(Ev.ip == client_ip(), Ev.event.in_(FAIL_EVENTS), Ev.created_at > since)
    count = q.count()
    oldest = q.order_by(Ev.created_at.asc()).first() if count else None
    return count, (oldest.created_at if oldest else None)


def lock_remaining(fails, last_fail):
    if fails < LOCK_AFTER or last_fail is None:
        return 0
    lock = min(LOCK_BASE * (2 ** ((fails - LOCK_AFTER) // 5)), LOCK_MAX)
    return max(0, int((last_fail + lock - utcnow()).total_seconds()))


def backoff_remaining(fails, last_fail):
    if fails < BACKOFF_AFTER or last_fail is None:
        return 0
    wait = min(2 ** (fails - BACKOFF_AFTER), 60)
    return max(0, int((last_fail + timedelta(seconds=wait) - utcnow()).total_seconds() + 0.999))


def guard_login_attempt(email, data, allow_captcha=True):
    """Τρέχει ΠΡΙΝ ελεγχθεί ο κωδικός. Πετάει AuthError αν η προσπάθεια δεν επιτρέπεται."""
    cleanup_old_rows()
    ip_fails, oldest = _ip_failures()
    if ip_fails >= IP_FAIL_LIMIT:
        wait = int((oldest + IP_FAIL_WINDOW - utcnow()).total_seconds()) + 1
        record('login_blocked', email=email, detail={'reason': 'ip_limit'})
        raise AuthError('Πάρα πολλές αποτυχημένες προσπάθειες από αυτό το δίκτυο. Δοκίμασε ξανά αργότερα.',
                        429, code='rate_limited', retry_after=max(wait, 1))
    fails, last_fail = _fail_state(email)
    locked = lock_remaining(fails, last_fail)
    if locked:
        if allow_captcha and captcha_enabled():
            # «Μαλακό» κλείδωμα: ο πραγματικός χρήστης μπαίνει με σωστό κωδικό + CAPTCHA, ώστε κανείς
            # να μην μπορεί να κρατάει κλειδωμένο τον λογαριασμό κάποιου άλλου (lockout DoS).
            if not verify_captcha(data.get('captcha_token')):
                raise AuthError('Πολλές αποτυχημένες προσπάθειες σε αυτόν τον λογαριασμό. Επιβεβαίωσε ότι δεν είσαι ρομπότ.',
                                400, code='captcha_required', captcha_site_key=A.turnstile_site)
            return fails
        record('login_blocked', email=email, detail={'reason': 'locked'})
        raise AuthError('Ο λογαριασμός κλειδώθηκε προσωρινά λόγω πολλών λάθος κωδικών. '
                        'Δοκίμασε αργότερα ή κάνε επαναφορά κωδικού.', 423, code='account_locked',
                        retry_after=locked)
    wait = backoff_remaining(fails, last_fail)
    if wait:
        raise AuthError(f'Περίμενε {wait} δευτ. πριν ξαναδοκιμάσεις.', 429, code='slow_down', retry_after=wait)
    if allow_captcha and (fails >= CAPTCHA_AFTER or ip_fails >= CAPTCHA_AFTER):
        require_captcha(data)
    return fails


def login_failed(email, user=None, reason='bad_password'):
    record('login_failed', user=user, email=email, detail={'reason': reason})
    fails, _ = _fail_state(email)
    ip_fails, _ = _ip_failures()
    extra = {}
    if captcha_enabled() and (fails >= CAPTCHA_AFTER or ip_fails >= CAPTCHA_AFTER):
        extra = {'captcha_required': True, 'captcha_site_key': A.turnstile_site}
    if fails >= LOCK_AFTER and not captcha_enabled():
        raise AuthError('Ο λογαριασμός κλειδώθηκε προσωρινά λόγω πολλών λάθος κωδικών. '
                        'Δοκίμασε αργότερα ή κάνε επαναφορά κωδικού.', 423, code='account_locked',
                        retry_after=lock_remaining(fails, utcnow()), **extra)
    remaining = LOCK_AFTER - fails
    msg = 'Λανθασμένο email ή κωδικός.'
    if fails >= BACKOFF_AFTER and remaining <= 5:
        msg += f' Μετά από {remaining} ακόμα λάθη ο λογαριασμός θα κλειδώσει προσωρινά.'
    raise AuthError(msg, 401, code='bad_credentials', **extra)


# ---------------------------------------------------------------------------
# TOTP (RFC 6238), εφεδρικοί κωδικοί, κρυπτογράφηση μυστικού
# ---------------------------------------------------------------------------
def _fernet():
    from cryptography.fernet import Fernet
    return Fernet(A.fernet_key)


def encrypt_secret(secret):
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token):
    return _fernet().decrypt(token.encode()).decode()


def new_totp_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def totp_at(secret, step):
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f'{code:06d}'


def totp_match(secret, code, last_step=None, window=1):
    """Επιστρέφει το βήμα χρόνου που ταίριαξε (ή None). Ένας κωδικός δεν περνάει δεύτερη φορά."""
    code = re.sub(r'\s', '', str(code or ''))
    if not re.fullmatch(r'\d{6}', code):
        return None
    now_step = int(time.time()) // 30
    for step in range(now_step - window, now_step + window + 1):
        if last_step is not None and step <= last_step:
            continue
        if hmac.compare_digest(totp_at(secret, step), code):
            return step
    return None


def otpauth_uri(secret, email):
    label = quote(f'LASCA:{email}')
    return f'otpauth://totp/{label}?secret={secret}&issuer=LASCA&algorithm=SHA1&digits=6&period=30'


def qr_svg_data_uri(text):
    try:
        import qrcode
        import qrcode.image.svg
    except ImportError:
        return None
    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return 'data:image/svg+xml;base64,' + base64.b64encode(buf.getvalue()).decode()


_BACKUP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'


def new_backup_codes():
    codes = [''.join(secrets.choice(_BACKUP_ALPHABET) for _ in range(10)) for _ in range(BACKUP_CODE_COUNT)]
    return [f'{c[:5]}-{c[5:]}' for c in codes]


def _norm_backup(code):
    return re.sub(r'[^a-z0-9]', '', str(code or '').lower())


def store_backup_codes(user, codes):
    user.backup_codes = json.dumps([keyed_hash(_norm_backup(c)) for c in codes])


def use_backup_code(user, code):
    """Επιστρέφει τη νέα λίστα (JSON) χωρίς τον κωδικό που χρησιμοποιήθηκε, ή None αν δεν ταιριάζει.
    ΔΕΝ αλλάζει τον χρήστη: η αλλαγή γίνεται ατομικά στη βάση (check_second_factor)."""
    norm = _norm_backup(code)
    if len(norm) != 10:
        return None
    try:
        hashes = json.loads(user.backup_codes or '[]')
    except ValueError:
        hashes = []
    target = keyed_hash(norm)
    for h in hashes:
        if hmac.compare_digest(h, target):
            hashes.remove(h)
            return json.dumps(hashes)
    return None


def backup_codes_left(user):
    try:
        return len(json.loads(user.backup_codes or '[]'))
    except ValueError:
        return 0


def _atomic_update(table_model, where_sql, params, set_sql):
    """UPDATE ... WHERE ...: επιτυγχάνει μόνο για ΕΝΑ από δύο ταυτόχρονα αιτήματα (κανένας κωδικός δύο φορές)."""
    from sqlalchemy import text
    res = A.db.session.execute(text(f'UPDATE {table_model.__tablename__} SET {set_sql} WHERE {where_sql}'), params)
    return res.rowcount == 1


def check_second_factor(user, code, method):
    """method: totp | backup | email. Επιστρέφει True αν ο κωδικός είναι σωστός.
    Όλοι οι έλεγχοι είναι «ατομικοί» στη βάση: δύο παράλληλα αιτήματα με τον ίδιο κωδικό δεν περνάνε και τα δύο."""
    if not user.totp_enabled:
        return False
    if method == 'backup':
        old = user.backup_codes or '[]'
        new = use_backup_code(user, code)
        if new is None:
            return False
        if not _atomic_update(A.User, 'id = :id AND backup_codes = :old', {'id': user.id, 'old': old, 'new': new},
                              'backup_codes = :new'):
            return False
        A.db.session.refresh(user)
        record('backup_code_used', user=user, commit=False, detail={'left': backup_codes_left(user)})
        return True
    if method == 'email':
        # Κωδικός μέσω email: μόνο αν ο χρήστης διάλεξε email ως δεύτερο βήμα. Αν έχει εφαρμογή
        # authenticator, το email ΔΕΝ είναι εναλλακτική (αλλιώς όποιος έχει το mailbox παρακάμπτει το 2FA).
        if (user.twofa_method or 'totp') != 'email':
            return False
        return check_email_code(user, code, 'login')
    if (user.twofa_method or 'totp') != 'totp' or not user.totp_secret_enc:
        return False
    try:
        secret = decrypt_secret(user.totp_secret_enc)
    except Exception:
        A.logger.error('Cannot decrypt TOTP secret for user %s (SECRET_KEY/TOTP_ENCRYPTION_KEY changed?)', user.id)
        return False
    step = totp_match(secret, code, user.totp_last_step)
    if step is None:
        return False
    if not _atomic_update(A.User, 'id = :id AND (totp_last_step IS NULL OR totp_last_step < :step)',
                          {'id': user.id, 'step': step}, 'totp_last_step = :step'):
        return False
    user.totp_last_step = step
    return True


def check_email_code(user, code, purpose):
    code = re.sub(r'\s', '', str(code or ''))
    otp = A.EmailOtp.query.filter_by(user_id=user.id, purpose=purpose, used=False) \
        .order_by(A.EmailOtp.id.desc()).first()
    if otp is None or otp.expires_at < utcnow() or otp.attempts >= 5:
        return False
    otp.attempts += 1
    A.db.session.commit()
    if not hmac.compare_digest(otp.code_hash, keyed_hash(f'{user.id}:{code}')):
        return False
    return _atomic_update(A.EmailOtp, 'id = :id AND used = 0', {'id': otp.id}, 'used = 1')


def issue_email_code(user, purpose, title, intro):
    """Στέλνει κωδικό 6 ψηφίων στο email του χρήστη (ισχύει 10 λεπτά). Επιστρέφει True αν στάλθηκε."""
    throttle(f'otpmail:{purpose}:{user.id}', EMAIL_OTP_SEND_LIMIT, timedelta(minutes=15),
             'Στάλθηκαν ήδη αρκετοί κωδικοί. Περίμενε λίγα λεπτά.')
    code = f'{secrets.randbelow(1_000_000):06d}'
    A.EmailOtp.query.filter_by(user_id=user.id, purpose=purpose, used=False).update({'used': True})
    A.db.session.add(A.EmailOtp(user_id=user.id, purpose=purpose, code_hash=keyed_hash(f'{user.id}:{code}'),
                                created_at=utcnow(), expires_at=utcnow() + EMAIL_OTP_TTL))
    A.db.session.commit()
    html = _email_layout(title, (
        f'<p>{escape(intro)}</p>'
        f'<p style="font-family:monospace;font-size:30px;letter-spacing:.3em;color:#d8ecf8">{code}</p>'
        '<p>Ισχύει για 10 λεπτά.</p>'))
    # Ο κωδικός ΔΕΝ μπαίνει στο θέμα (φαίνεται σε ειδοποιήσεις και logs).
    return send_email(user.email, title + ' · LASCA', html, dev_hint=f'{purpose} code {code}')


# ---------------------------------------------------------------------------
# Email (Resend) με όρια κόστους
# ---------------------------------------------------------------------------
def email_enabled():
    return bool(A.resend is not None and os.getenv('RESEND_API_KEY', '').strip())


def send_email(to, subject, html, dev_hint=None):
    """Όρια κόστους (ανά ημέρα / ανά παραλήπτη) και αποστολή στο παρασκήνιο (ίδιος χρόνος απάντησης
    είτε υπάρχει λογαριασμός είτε όχι). Στα logs δεν γράφεται ποτέ θέμα, κωδικός ή σύνδεσμος."""
    if db_hit('email:global', A.max_emails_day, timedelta(days=1)):
        A.logger.error('Daily email cap (%s) reached: email not sent', A.max_emails_day)
        return False
    if db_hit(f'email:to:{keyed_hash(to.lower())}', 6, timedelta(hours=1)):
        A.logger.warning('Per-recipient email cap reached for %s', mask_email(to))
        return False
    if not email_enabled():
        if A.dev and dev_hint:
            # ΜΟΝΟ τοπικά (LASCA_ENV=development): για δοκιμή χωρίς Resend.
            A.logger.info('[dev] email to %s: %s', to, dev_hint)
        else:
            A.logger.error('Email not configured (RESEND_API_KEY): email not sent')
        return False

    def _deliver():
        try:
            A.resend.api_key = os.getenv('RESEND_API_KEY', '').strip()
            A.resend.Emails.send({'from': A.email_from, 'to': [to], 'subject': subject, 'html': html})
        except Exception as exc:
            A.logger.error('Resend email failed: %s', type(exc).__name__)

    import threading
    threading.Thread(target=_deliver, daemon=True).start()
    return True


def _email_layout(title, body_html):
    return (
        '<div style="font-family:Inter,Arial,sans-serif;background:#05060f;padding:32px;color:#d1e4fa">'
        '<div style="max-width:480px;margin:0 auto;background:#0b0e1c;border:1px solid #1d2338;'
        'border-radius:16px;padding:28px">'
        f'<p style="font-family:monospace;letter-spacing:.1em;color:#9da7ba;font-size:12px;margin:0 0 12px">LASCA</p>'
        f'<h1 style="font-size:20px;color:#d8ecf8;margin:0 0 16px">{escape(title)}</h1>{body_html}'
        '<p style="color:#6f7890;font-size:12px;margin-top:28px">Αν δεν το ζήτησες εσύ, αγνόησε αυτό το μήνυμα. '
        'Η ομάδα της LASCA δεν θα σου ζητήσει ποτέ τον κωδικό σου.</p></div></div>'
    )


def public_base():
    return (A.PUBLIC_URL or request.host_url).rstrip('/')


# ---------------------------------------------------------------------------
# Ολοκλήρωση σύνδεσης (με ή χωρίς 2FA)
# ---------------------------------------------------------------------------
def start_session(user, remember, via):
    session.pop('pending_2fa', None)
    login_user(user, remember=bool(remember))
    session.permanent = False
    session['login_at'] = utcnow().timestamp()
    record('login_success', user=user, detail={'via': via})
    return jsonify({'status': 'success', 'user': user.to_me_dict()})


def begin_login(user, remember, via):
    """Μετά από σωστό κωδικό/Google: αν έχει 2FA ζητάμε και δεύτερο βήμα."""
    if user.totp_enabled:
        session['pending_2fa'] = {'uid': user.id, 'sv': user.session_version or 0, 'remember': bool(remember),
                                  'via': via, 'exp': (utcnow() + TWOFA_PENDING_TTL).timestamp()}
        record('2fa_challenge', user=user, detail={'via': via})
        method = user.twofa_method or 'totp'
        if method == 'email':
            issue_email_code(user, 'login', 'Κωδικός σύνδεσης', 'Ο κωδικός για να ολοκληρώσεις τη σύνδεση στη LASCA:')
        return jsonify({'status': '2fa_required', 'requires_2fa': True, 'method': method,
                        'methods': [method, 'backup'], 'email_hint': mask_email(user.email)}), 200
    return start_session(user, remember, via)


def pending_user():
    pending = session.get('pending_2fa')
    if not isinstance(pending, dict) or pending.get('exp', 0) < utcnow().timestamp():
        session.pop('pending_2fa', None)
        raise AuthError('Η σύνδεση έληξε. Βάλε ξανά email και κωδικό.', 401, code='2fa_expired')
    user = A.db.session.get(A.User, int(pending.get('uid') or 0))
    if user is None or (user.session_version or 0) != pending.get('sv'):
        session.pop('pending_2fa', None)
        raise AuthError('Η σύνδεση έληξε. Βάλε ξανά email και κωδικό.', 401, code='2fa_expired')
    return user, pending


# ---------------------------------------------------------------------------
# Routes: ρυθμίσεις, εγγραφή, σύνδεση
# ---------------------------------------------------------------------------
@bp.get('/api/auth/config')
def auth_config():
    return jsonify({
        'google_client_id': A.GOOGLE_CLIENT_ID or None,
        'captcha_site_key': A.turnstile_site if captcha_enabled() else None,
        'email_enabled': email_enabled(),
        'password_min': PASSWORD_MIN,
        'password_recommended': PASSWORD_RECOMMENDED,
        'min_age': A.MIN_AGE,
    })


@bp.post('/api/auth/password-check')
def password_check():
    """Έλεγχος κωδικού από τη φόρμα (συνηθισμένος / διαρρευμένος), χωρίς να δημιουργηθεί τίποτα."""
    throttle(f'pwcheck:{client_ip()}', 30, timedelta(minutes=5))
    data = body()
    try:
        validate_new_password(text_field(data, 'password', PASSWORD_MAX + 1), text_field(data, 'email'),
                              text_field(data, 'display_name', 200))
    except AuthError as err:
        return jsonify({'ok': False, 'error': err.message, 'code': err.code})
    return jsonify({'ok': True})


@bp.post('/api/register')
def register_user():
    data = body()
    if text_field(data, 'website'):
        # Κρυφό πεδίο που συμπληρώνουν μόνο τα bots.
        record('signup_blocked', detail={'reason': 'honeypot'})
        raise AuthError('Η εγγραφή απέτυχε.', 400, code='spam')
    email = A.normalize_email(text_field(data, 'email'))
    password = text_field(data, 'password', PASSWORD_MAX + 1)
    display_name = clean_display_name(text_field(data, 'display_name', 200))
    if not email or len(email) > 254 or not A.EMAIL_RE.fullmatch(email):
        raise AuthError('Το email δεν είναι έγκυρο.', 400, code='invalid_email')
    if data.get('accept_terms') is not True:
        raise AuthError('Πρέπει να αποδεχτείς τους Όρους Χρήσης και την Πολιτική Απορρήτου.', 400,
                        code='terms_required')
    if data.get('age_confirmed') is not True:
        raise AuthError(f'Η LASCA είναι μόνο για άτομα {A.MIN_AGE} ετών και άνω.', 400, code='age_required')
    require_captcha(data)
    throttle(f'signup:{client_ip()}', SIGNUP_IP_LIMIT, timedelta(hours=1),
             'Πάρα πολλές εγγραφές από αυτό το δίκτυο. Δοκίμασε ξανά αργότερα.')
    validate_new_password(password, email, display_name)
    if find_user(email):
        record('signup_failed', email=email, detail={'reason': 'exists'})
        raise AuthError('Υπάρχει ήδη λογαριασμός με αυτό το email. Σύνδεση ή «Ξέχασα τον κωδικό».', 409,
                        code='email_taken')
    user = A.User(email=email, display_name=display_name or email.split('@', 1)[0][:DISPLAY_NAME_MAX],
                  terms_accepted_at=utcnow(), age_confirmed=True, password_changed_at=utcnow())
    user.set_password(password)
    A.db.session.add(user)
    A.db.session.commit()
    record('signup', user=user)
    send_verification(user)
    return start_session(user, data.get('remember'), 'signup')


@bp.post('/api/login')
def login_route():
    data = body()
    email = A.normalize_email(text_field(data, 'email'))
    password = text_field(data, 'password', 1024)
    if not email or not password:
        raise AuthError('Το email και ο κωδικός είναι υποχρεωτικά.', 400)
    guard_login_attempt(email, data)
    user = find_user(email)
    if user is None:
        burn_password_check(password)
        login_failed(email, reason='unknown_email')
    if not user.check_password(password):
        login_failed(email, user=user)
    return begin_login(user, data.get('remember'), 'password')


@bp.post('/api/auth/google')
def google_login_route():
    if not A.GOOGLE_CLIENT_ID:
        raise AuthError('Η σύνδεση με Google δεν είναι ενεργή σε αυτόν τον server.', 503)
    data = body()
    credential = text_field(data, 'credential', 8192)
    if not credential:
        raise AuthError('Λείπει το token του Google.')
    throttle(f'google:{client_ip()}', 20, timedelta(minutes=15))
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
        info = google_id_token.verify_oauth2_token(credential, google_requests.Request(), A.GOOGLE_CLIENT_ID)
    except ImportError:
        A.logger.error('google-auth is not installed')
        raise AuthError('Η σύνδεση με Google δεν είναι διαθέσιμη.', 503)
    except ValueError:
        record('login_failed', detail={'reason': 'google_invalid'})
        raise AuthError('Μη έγκυρη σύνδεση Google. Δοκίμασε ξανά.', 401)
    email = A.normalize_email(info.get('email'))
    if not email or not info.get('email_verified'):
        raise AuthError('Ο λογαριασμός Google δεν έχει επιβεβαιωμένο email.', 401)

    user = find_user(email)
    if user is None:
        if data.get('accept_terms') is not True or data.get('age_confirmed') is not True:
            # Νέος λογαριασμός: πρώτα αποδοχή όρων/ηλικίας στη σελίδα εγγραφής.
            raise AuthError('Για νέο λογαριασμό αποδέξου πρώτα τους όρους στη σελίδα εγγραφής.', 403,
                            code='terms_required')
        user = A.User(email=email, display_name=clean_display_name(info.get('name') or email.split('@', 1)[0]),
                      terms_accepted_at=utcnow(), age_confirmed=True, email_verified=True)
        user.set_password(secrets.token_hex(32))   # κανείς δεν τον ξέρει: μπαίνει μόνο με Google
        user.has_password = False
        A.db.session.add(user)
        A.db.session.commit()
        record('signup', user=user, detail={'via': 'google'})
    elif not user.email_verified:
        # Κάποιος έφτιαξε λογαριασμό με αυτό το email χωρίς να το επιβεβαιώσει (πιθανή «κατάληψη»
        # λογαριασμού). Το Google αποδεικνύει ότι ο κάτοχος του email είναι αυτός: σβήνουμε κάθε
        # διαπιστευτήριο που έβαλε ο άλλος (κωδικό, 2FA, συσκευές, συνδέσεις).
        user.set_password(secrets.token_hex(32))
        user.has_password = False
        user.totp_enabled, user.totp_secret_enc, user.totp_pending_enc = False, None, None
        user.backup_codes, user.totp_last_step, user.twofa_method = None, None, 'totp'
        user.session_version = (user.session_version or 0) + 1
        user.email_verified = True
        A.DeviceToken.query.filter_by(user_id=user.id).delete()
        A.DesktopLogin.query.filter_by(user_id=user.id).delete()
        A.db.session.commit()
        record('unverified_account_reclaimed', user=user)
    # Οι λάθος κωδικοί δεν μπλοκάρουν τη σύνδεση με Google (το Google είναι ήδη ισχυρή ταυτοποίηση).
    return begin_login(user, data.get('remember', True), 'google')


@bp.post('/api/auth/2fa/verify')
def verify_2fa():
    data = body()
    user, pending = pending_user()
    method = text_field(data, 'method', 10) or (user.twofa_method or 'totp')
    if method not in {'totp', 'backup', 'email'}:
        raise AuthError('Μη έγκυρη μέθοδος.', 400)
    Ev = A.AuthEvent
    recent = Ev.query.filter(Ev.user_id == user.id, Ev.event == '2fa_failed',
                             Ev.created_at > utcnow() - IP_FAIL_WINDOW).count()
    if recent >= TWOFA_FAIL_LIMIT:
        session.pop('pending_2fa', None)
        raise AuthError('Πάρα πολλοί λάθος κωδικοί. Δοκίμασε ξανά σε 15 λεπτά.', 429, code='rate_limited',
                        retry_after=900)
    throttle(f'2fa:{client_ip()}', 20, IP_FAIL_WINDOW)
    if not check_second_factor(user, text_field(data, 'code', 64), method):
        A.db.session.commit()
        record('2fa_failed', user=user, detail={'method': method})
        raise AuthError('Λάθος ή ληγμένος κωδικός.', 401, code='bad_code',
                        attempts_left=max(0, TWOFA_FAIL_LIMIT - recent - 1))
    A.db.session.commit()
    return start_session(user, pending.get('remember'), f"{pending.get('via')}+{method}")


@bp.post('/api/auth/2fa/email')
def send_2fa_email():
    """Νέος κωδικός στο email (μόνο για όσους έχουν διαλέξει email ως δεύτερο βήμα)."""
    user, _ = pending_user()
    if (user.twofa_method or 'totp') != 'email':
        raise AuthError('Ο λογαριασμός σου χρησιμοποιεί εφαρμογή authenticator.', 400, code='wrong_method')
    sent = issue_email_code(user, 'login', 'Κωδικός σύνδεσης', 'Ο κωδικός για να ολοκληρώσεις τη σύνδεση στη LASCA:')
    record('2fa_email_sent', user=user, detail={'sent': sent})
    if not sent and not A.dev:
        raise AuthError('Δεν ήταν δυνατή η αποστολή email. Χρησιμοποίησε έναν εφεδρικό κωδικό.', 503,
                        code='email_unavailable')
    return jsonify({'status': 'sent', 'email_hint': mask_email(user.email)})


# ---------------------------------------------------------------------------
# Ξέχασα τον κωδικό / επαναφορά
# ---------------------------------------------------------------------------
@bp.post('/api/auth/forgot')
def forgot_password():
    data = body()
    email = A.normalize_email(text_field(data, 'email'))
    if not email or not A.EMAIL_RE.fullmatch(email):
        raise AuthError('Το email δεν είναι έγκυρο.', 400, code='invalid_email')
    require_captcha(data)
    throttle(f'forgot:ip:{client_ip()}', 5, timedelta(hours=1))
    generic = jsonify({'status': 'sent'})   # ίδια απάντηση είτε υπάρχει λογαριασμός είτε όχι
    if db_hit(f'forgot:email:{keyed_hash(email)}', 3, timedelta(hours=1)):
        return generic
    user = find_user(email)
    record('reset_requested', user=user, email=email)
    if user is None:
        return generic
    token = secrets.token_urlsafe(32)
    A.PasswordReset.query.filter_by(user_id=user.id, used_at=None).update({'used_at': utcnow()})
    A.db.session.add(A.PasswordReset(user_id=user.id, token_hash=hashlib.sha256(token.encode()).hexdigest(),
                                     created_at=utcnow(), expires_at=utcnow() + RESET_TTL, ip=client_ip()))
    A.db.session.commit()
    # Το token στο #: δεν στέλνεται ποτέ στον server ούτε σε τρίτους μέσω Referer/logs.
    link = f'{public_base()}/reset-password#token={token}'
    html = _email_layout('Επαναφορά κωδικού', (
        '<p>Ζήτησες να ορίσεις νέο κωδικό για τη LASCA. Ο σύνδεσμος ισχύει για 30 λεπτά και μία φορά.</p>'
        f'<p><a href="{escape(link)}" style="display:inline-block;background:#663af3;color:#fff;'
        'padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Ορισμός νέου κωδικού</a></p>'))
    send_email(user.email, 'Επαναφορά κωδικού LASCA', html, dev_hint=link)
    return generic


def _reset_record(token):
    token = str(token or '')
    if not token or len(token) > 200:
        return None
    row = A.PasswordReset.query.filter_by(token_hash=hashlib.sha256(token.encode()).hexdigest()).first()
    if row is None or row.used_at is not None or row.expires_at < utcnow():
        return None
    return row


@bp.post('/api/auth/reset/check')
def reset_check():
    throttle(f'resetcheck:{client_ip()}', 20, timedelta(minutes=15))
    row = _reset_record(body().get('token'))
    if row is None:
        raise AuthError('Ο σύνδεσμος δεν ισχύει ή έχει λήξει. Ζήτησε νέο.', 410, code='invalid_token')
    user = A.db.session.get(A.User, row.user_id)
    return jsonify({'valid': True, 'email_hint': mask_email(user.email) if user else None})


@bp.post('/api/auth/reset')
def reset_password():
    data = body()
    throttle(f'reset:{client_ip()}', 10, timedelta(hours=1))
    row = _reset_record(data.get('token'))
    if row is None:
        record('reset_failed', detail={'reason': 'bad_token'})
        raise AuthError('Ο σύνδεσμος δεν ισχύει ή έχει λήξει. Ζήτησε νέο.', 410, code='invalid_token')
    user = A.db.session.get(A.User, row.user_id)
    if user is None:
        raise AuthError('Ο σύνδεσμος δεν ισχύει.', 410, code='invalid_token')
    password = text_field(data, 'password', PASSWORD_MAX + 1)
    validate_new_password(password, user.email, user.display_name)
    user.set_password(password)
    user.has_password = True
    user.email_verified = True                                       # ο σύνδεσμος ήρθε στο email του
    user.password_changed_at = utcnow()
    user.session_version = (user.session_version or 0) + 1          # αποσύνδεση από παντού
    A.DeviceToken.query.filter_by(user_id=user.id).delete()
    A.DesktopLogin.query.filter_by(user_id=user.id).delete()
    row.used_at = utcnow()
    A.db.session.commit()
    record('password_reset', user=user)
    # Δεν συνδέουμε αυτόματα: αν έχει 2FA, πρέπει να περάσει από το κανονικό login.
    return jsonify({'status': 'success'})


# ---------------------------------------------------------------------------
# Πρόγραμμα των Windows (exe): κλειδί συσκευής με τους ίδιους ελέγχους
# ---------------------------------------------------------------------------
@bp.post('/api/auth/device-token')
def create_device_token():
    data = body()
    email = A.normalize_email(text_field(data, 'email'))
    password = text_field(data, 'password', 1024)
    if not email or not password:
        raise AuthError('Το email και ο κωδικός είναι υποχρεωτικά.')
    # Στο exe δεν υπάρχει CAPTCHA: αυστηρότερο όριο ανά IP, αναμονή και κλείδωμα.
    throttle(f'devtoken:{client_ip()}', 10, timedelta(minutes=15))
    guard_login_attempt(email, data, allow_captcha=False)
    user = find_user(email)
    if user is None:
        burn_password_check(password)
        login_failed(email, reason='unknown_email')
    if not user.check_password(password):
        login_failed(email, user=user)
    if not user.has_password:
        raise AuthError('Ο λογαριασμός σου μπαίνει με Google. Όρισε πρώτα κωδικό από το Προφίλ στη σελίδα.',
                        403, code='no_password')
    if user.totp_enabled:
        code = text_field(data, 'otp', 64)
        method = user.twofa_method or 'totp'
        if not code:
            if method == 'email':
                issue_email_code(user, 'login', 'Κωδικός σύνδεσης', 'Ο κωδικός για να συνδέσεις το πρόγραμμα των Windows:')
                msg = f'Στείλαμε κωδικό στο {mask_email(user.email)}. Γράψ\' τον εδώ (ή έναν εφεδρικό κωδικό).'
            else:
                msg = 'Γράψε τον κωδικό από την εφαρμογή authenticator (ή έναν εφεδρικό κωδικό).'
            raise AuthError(msg, 401, code='2fa_required', requires_2fa=True, method=method)
        recent = A.AuthEvent.query.filter(A.AuthEvent.user_id == user.id, A.AuthEvent.event == '2fa_failed',
                                          A.AuthEvent.created_at > utcnow() - IP_FAIL_WINDOW).count()
        if recent >= TWOFA_FAIL_LIMIT:
            raise AuthError('Πάρα πολλοί λάθος κωδικοί. Δοκίμασε ξανά σε 15 λεπτά.', 429, code='rate_limited',
                            retry_after=900)
        method = _method_for_code(user, code)
        if not check_second_factor(user, code, method):
            A.db.session.commit()
            record('2fa_failed', user=user, detail={'method': method, 'client': 'desktop'})
            raise AuthError('Λάθος κωδικός δύο βημάτων.', 401, code='bad_code', requires_2fa=True)
    token = issue_device_token(user, text_field(data, 'device_name', 200), via='desktop')
    return jsonify({'token': token, 'user': user.to_me_dict()}), 201


def issue_device_token(user, device_name, via):
    token = secrets.token_urlsafe(32)
    name = clean_display_name(device_name or 'LASCA για Windows')[:120] or 'LASCA για Windows'
    A.db.session.add(A.DeviceToken(user_id=user.id, token_hash=A.hash_device_token(token), name=name,
                                   created_at=utcnow(), last_used_at=utcnow()))
    A.db.session.commit()
    record('login_success', user=user, detail={'via': via})
    return token


# ---------------------------------------------------------------------------
# Σύνδεση του exe μέσω browser (για λογαριασμούς Google, και για όποιον το προτιμά)
#
#   1. Το exe φτιάχνει ένα μυστικό και στέλνει μόνο το SHA-256 του (challenge) → παίρνει request_id
#      και έναν σύντομο κωδικό (π.χ. K7QM-4DPA) που δείχνει στην οθόνη του.
#   2. Ανοίγει τον browser στο /desktop-login/<request_id>. Ο χρήστης συνδέεται κανονικά στη σελίδα
#      (Google, κωδικός, 2FA) και, αφού δει ότι ο κωδικός είναι ίδιος με του exe, πατάει «Έγκριση».
#   3. Το exe ρωτάει κάθε 2 δευτ. με request_id + μυστικό. Μετά την έγκριση παίρνει κλειδί συσκευής.
#      Όποιος δει μόνο τον σύνδεσμο (request_id) δεν μπορεί να πάρει το κλειδί.
# ---------------------------------------------------------------------------
DESKTOP_LOGIN_TTL = timedelta(minutes=10)
_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
_HEX64 = re.compile(r'[0-9a-f]{64}')


def _sha256(value):
    return hashlib.sha256(str(value).encode('utf-8')).hexdigest()


def _desktop_request(request_id):
    request_id = str(request_id or '')[:100]
    row = A.DesktopLogin.query.filter_by(request_hash=_sha256(request_id)).first() if request_id else None
    if row is None:
        raise AuthError('Το αίτημα σύνδεσης δεν βρέθηκε. Ξεκίνα ξανά από το πρόγραμμα.', 404, code='invalid_request')
    return row


def _desktop_status(row):
    if row.denied:
        return 'denied'
    if row.expires_at < utcnow():
        return 'expired'          # και τα εγκεκριμένα που δεν παραλήφθηκαν εγκαίρως
    if row.approved_at:
        return 'approved'
    return 'pending'


@bp.post('/api/auth/desktop/start')
def desktop_login_start():
    data = body()
    challenge = text_field(data, 'challenge', 64).lower()
    if not _HEX64.fullmatch(challenge):
        raise AuthError('Μη έγκυρο αίτημα.')
    throttle(f'desktop-start:{client_ip()}', 30, timedelta(minutes=15))
    now = utcnow()
    A.DesktopLogin.query.filter(A.DesktopLogin.expires_at < now - timedelta(days=1)).delete()
    request_id = secrets.token_urlsafe(24)
    raw = ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
    row = A.DesktopLogin(request_hash=_sha256(request_id), challenge=challenge, user_code=f'{raw[:4]}-{raw[4:]}',
                         device_name=clean_display_name(text_field(data, 'device_name', 200))[:120] or None,
                         ip=client_ip(), created_at=now, expires_at=now + DESKTOP_LOGIN_TTL)
    A.db.session.add(row)
    A.db.session.commit()
    return jsonify({'request_id': request_id, 'user_code': row.user_code,
                    'url': f'{public_base()}/desktop-login/{request_id}',
                    'expires_in': int(DESKTOP_LOGIN_TTL.total_seconds()), 'interval': 2}), 201


@bp.get('/api/auth/desktop/<request_id>')
@login_required
def desktop_login_info(request_id):
    row = _desktop_request(request_id)
    return jsonify({'user_code': row.user_code, 'device_name': row.device_name or 'LASCA για Windows',
                    'created_at': row.created_at.isoformat() + 'Z', 'status': _desktop_status(row),
                    'same_network': row.ip == client_ip()})


@bp.post('/api/auth/desktop/<request_id>/approve')
@login_required
def desktop_login_approve(request_id):
    row = _desktop_request(request_id)
    status = _desktop_status(row)
    if status == 'expired':
        raise AuthError('Το αίτημα έληξε. Ξεκίνα ξανά από το πρόγραμμα.', 410, code='expired')
    if status != 'pending':
        if row.user_id == current_user.id and status == 'approved':
            return jsonify({'status': 'approved'})
        raise AuthError('Το αίτημα έχει ήδη απαντηθεί.', 409, code='answered')
    row.user_id = current_user.id
    row.approved_at = utcnow()
    A.db.session.commit()
    record('desktop_login_approved', user=current_user._get_current_object(),
           detail={'device': row.device_name or 'LASCA για Windows'})
    return jsonify({'status': 'approved'})


@bp.post('/api/auth/desktop/<request_id>/deny')
@login_required
def desktop_login_deny(request_id):
    row = _desktop_request(request_id)
    if _desktop_status(row) == 'pending':
        row.denied = True
        A.db.session.commit()
        record('desktop_login_denied', user=current_user._get_current_object())
    return jsonify({'status': _desktop_status(row)})


@bp.post('/api/desktop-link/poll')
def desktop_login_poll():
    """Το exe ρωτάει αν εγκρίθηκε. Χρειάζεται το μυστικό (όχι μόνο το request_id του συνδέσμου)."""
    data = body()
    row = _desktop_request(text_field(data, 'request_id', 100))
    if not hmac.compare_digest(_sha256(text_field(data, 'secret', 200)), row.challenge):
        raise AuthError('Μη έγκυρο αίτημα.', 403, code='invalid_request')
    status = _desktop_status(row)
    if status == 'pending':
        return jsonify({'status': 'pending'})
    if status in ('denied', 'expired'):
        A.db.session.delete(row)
        A.db.session.commit()
        msg = 'Η σύνδεση απορρίφθηκε στον browser.' if status == 'denied' else 'Το αίτημα έληξε. Δοκίμασε ξανά.'
        raise AuthError(msg, 410, code=status)
    user, device_name = A.db.session.get(A.User, row.user_id), row.device_name
    A.db.session.delete(row)            # μία χρήση
    A.db.session.commit()
    if user is None:
        raise AuthError('Ο λογαριασμός δεν υπάρχει.', 410, code='expired')
    token = issue_device_token(user, device_name, via='desktop_browser')
    return jsonify({'status': 'approved', 'token': token, 'user': user.to_me_dict()})


# ---------------------------------------------------------------------------
# Ρυθμίσεις ασφαλείας του χρήστη (σελίδα Προφίλ)
# ---------------------------------------------------------------------------
FRESH_LOGIN = timedelta(minutes=10)


def reauthenticate(user, data):
    """Ευαίσθητες αλλαγές (2FA, κωδικός, διαγραφή): απόδειξη ότι είναι ο ίδιος ο χρήστης και όχι κάποιος
    με κλεμμένο cookie. Κωδικός· ή (λογαριασμοί Google) κωδικός 2FA· ή σύνδεση τα τελευταία 10 λεπτά."""
    throttle(f'reauth:{user.id}', 10, timedelta(minutes=15))
    if user.has_password:
        if not user.check_password(text_field(data, 'password', 1024)):
            record('reauth_failed', user=user)
            raise AuthError('Ο κωδικός δεν είναι σωστός.', 403, code='bad_password')
        return
    if user.totp_enabled:
        code = text_field(data, 'code', 64)
        if not check_second_factor(user, code, _method_for_code(user, code)):
            A.db.session.commit()
            record('reauth_failed', user=user)
            raise AuthError('Λάθος κωδικός δύο βημάτων.', 403, code='bad_code')
        return
    login_at = session.get('login_at') or 0
    if utcnow().timestamp() - float(login_at) > FRESH_LOGIN.total_seconds():
        raise AuthError('Για ασφάλεια, αποσυνδέσου και συνδέσου ξανά με Google και δοκίμασε μέσα σε 10 λεπτά.',
                        403, code='reauth_required')


def _method_for_code(user, code):
    code = str(code or '').strip()
    if len(_norm_backup(code)) == 10 and not code.isdigit():
        return 'backup'
    return user.twofa_method or 'totp'


def two_factor_status(user):
    return {'enabled': bool(user.totp_enabled), 'method': (user.twofa_method or 'totp') if user.totp_enabled else None,
            'backup_codes_left': backup_codes_left(user) if user.totp_enabled else 0,
            'email_available': email_enabled() or A.dev}


def _finish_enable(user, method, step=None):
    codes = new_backup_codes()
    user.totp_enabled, user.twofa_method = True, method
    if step is not None:
        user.totp_last_step = step
    store_backup_codes(user, codes)
    # Όλες οι άλλες συνδέσεις (browsers ΚΑΙ πρόγραμμα Windows) πρέπει να ξαναμπούν με 2FA.
    user.session_version = (user.session_version or 0) + 1
    A.DeviceToken.query.filter_by(user_id=user.id).delete()
    A.DesktopLogin.query.filter_by(user_id=user.id).delete()
    A.db.session.commit()
    login_user(user, remember=bool(request.cookies.get(current_app.config['REMEMBER_COOKIE_NAME'])))
    session['login_at'] = utcnow().timestamp()
    record('2fa_enabled', user=user, detail={'method': method})
    return jsonify({'status': 'enabled', 'backup_codes': codes, **two_factor_status(user)})


@bp.get('/api/me/2fa')
@login_required
def get_2fa():
    return jsonify(two_factor_status(current_user))


@bp.post('/api/me/2fa/setup')
@login_required
def setup_2fa():
    """Βήμα 1 (εφαρμογή authenticator): χρειάζεται τον κωδικό του λογαριασμού."""
    user = current_user._get_current_object()
    if user.totp_enabled:
        raise AuthError('Ο έλεγχος δύο βημάτων είναι ήδη ενεργός.', 409)
    throttle(f'2fasetup:{user.id}', 10, timedelta(hours=1))
    reauthenticate(user, body())
    secret = new_totp_secret()
    user.totp_pending_enc = encrypt_secret(secret)
    A.db.session.commit()
    uri = otpauth_uri(secret, user.email)
    return jsonify({'secret': secret, 'otpauth_uri': uri, 'qr': qr_svg_data_uri(uri)})


@bp.post('/api/me/2fa/enable')
@login_required
def enable_2fa():
    user = current_user._get_current_object()
    data = body()
    if not user.totp_pending_enc or user.totp_enabled:
        raise AuthError('Ξεκίνα πρώτα τη ρύθμιση.', 400)
    throttle(f'2faenable:{user.id}', 10, timedelta(minutes=15))
    try:
        secret = decrypt_secret(user.totp_pending_enc)
    except Exception:
        raise AuthError('Ξεκίνα ξανά τη ρύθμιση.', 400)
    step = totp_match(secret, text_field(data, 'code', 16))
    if step is None:
        raise AuthError('Λάθος κωδικός. Έλεγξε ότι η ώρα του κινητού είναι σωστή.', 400, code='bad_code')
    user.totp_secret_enc, user.totp_pending_enc = user.totp_pending_enc, None
    return _finish_enable(user, 'totp', step)


@bp.post('/api/me/2fa/email/setup')
@login_required
def setup_email_2fa():
    """Βήμα 1 (κωδικός στο email): χρειάζεται τον κωδικό του λογαριασμού και στέλνει κωδικό επιβεβαίωσης."""
    user = current_user._get_current_object()
    if user.totp_enabled:
        raise AuthError('Ο έλεγχος δύο βημάτων είναι ήδη ενεργός.', 409)
    if not user.email_verified:
        raise AuthError('Επιβεβαίωσε πρώτα το email σου.', 400, code='email_unverified')
    reauthenticate(user, body())
    sent = issue_email_code(user, 'enable2fa', 'Ενεργοποίηση ελέγχου δύο βημάτων',
                            'Ο κωδικός για να ενεργοποιήσεις τον έλεγχο δύο βημάτων με email:')
    if not sent and not A.dev:
        raise AuthError('Δεν ήταν δυνατή η αποστολή email. Χρησιμοποίησε εφαρμογή authenticator.', 503,
                        code='email_unavailable')
    return jsonify({'status': 'sent', 'email_hint': mask_email(user.email)})


@bp.post('/api/me/2fa/email/enable')
@login_required
def enable_email_2fa():
    user = current_user._get_current_object()
    if user.totp_enabled:
        raise AuthError('Ο έλεγχος δύο βημάτων είναι ήδη ενεργός.', 409)
    throttle(f'2faenable:{user.id}', 10, timedelta(minutes=15))
    if not check_email_code(user, text_field(body(), 'code', 16), 'enable2fa'):
        raise AuthError('Λάθος ή ληγμένος κωδικός.', 400, code='bad_code')
    user.totp_secret_enc = user.totp_pending_enc = None
    return _finish_enable(user, 'email')


@bp.post('/api/me/2fa/send-code')
@login_required
def send_manage_code():
    """Για χρήστες με 2FA μέσω email: κωδικός για απενεργοποίηση / νέους εφεδρικούς κωδικούς."""
    user = current_user._get_current_object()
    if not user.totp_enabled or user.twofa_method != 'email':
        raise AuthError('Δεν χρειάζεται.', 400)
    sent = issue_email_code(user, 'login', 'Κωδικός ασφαλείας', 'Ο κωδικός για να αλλάξεις τις ρυθμίσεις ασφαλείας:')
    return jsonify({'status': 'sent' if sent or A.dev else 'failed', 'email_hint': mask_email(user.email)})


def _require_current_2fa(user, data, context):
    code = text_field(data, 'code', 64)
    if not check_second_factor(user, code, _method_for_code(user, code)):
        A.db.session.commit()
        record('2fa_failed', user=user, detail={'context': context})
        raise AuthError('Λάθος κωδικός δύο βημάτων.', 403, code='bad_code')


@bp.post('/api/me/2fa/disable')
@login_required
def disable_2fa():
    user = current_user._get_current_object()
    data = body()
    if not user.totp_enabled:
        return jsonify(two_factor_status(user))
    throttle(f'2fadisable:{user.id}', 10, timedelta(minutes=15))
    if user.has_password:
        reauthenticate(user, data)          # κωδικός λογαριασμού ...
    _require_current_2fa(user, data, 'disable')   # ... ΚΑΙ κωδικός δύο βημάτων
    user.totp_enabled, user.totp_secret_enc, user.totp_pending_enc = False, None, None
    user.backup_codes, user.totp_last_step, user.twofa_method = None, None, 'totp'
    A.db.session.commit()
    record('2fa_disabled', user=user)
    return jsonify(two_factor_status(user))


@bp.post('/api/me/2fa/backup-codes')
@login_required
def regenerate_backup_codes():
    user = current_user._get_current_object()
    data = body()
    if not user.totp_enabled:
        raise AuthError('Ενεργοποίησε πρώτα τον έλεγχο δύο βημάτων.', 400)
    throttle(f'2fabackup:{user.id}', 10, timedelta(minutes=15))
    code = text_field(data, 'code', 64)
    if _method_for_code(user, code) == 'backup' or not check_second_factor(user, code, user.twofa_method or 'totp'):
        A.db.session.commit()
        record('2fa_failed', user=user, detail={'context': 'backup_codes'})
        raise AuthError('Λάθος κωδικός.', 403, code='bad_code')
    codes = new_backup_codes()
    store_backup_codes(user, codes)
    A.db.session.commit()
    record('backup_codes_regenerated', user=user)
    return jsonify({'backup_codes': codes, **two_factor_status(user)})


# ---------------------------------------------------------------------------
# Επιβεβαίωση email
# ---------------------------------------------------------------------------
VERIFY_TTL = timedelta(hours=48)


def send_verification(user):
    token = secrets.token_urlsafe(32)
    A.EmailOtp.query.filter_by(user_id=user.id, purpose='verify', used=False).update({'used': True})
    A.db.session.add(A.EmailOtp(user_id=user.id, purpose='verify', code_hash=keyed_hash(f'verify:{token}'),
                                created_at=utcnow(), expires_at=utcnow() + VERIFY_TTL))
    A.db.session.commit()
    link = f'{public_base()}/verify-email#token={token}'
    html = _email_layout('Επιβεβαίωσε το email σου', (
        '<p>Καλώς ήρθες στη LASCA! Πάτα το κουμπί για να επιβεβαιώσεις ότι αυτό το email είναι δικό σου.</p>'
        f'<p><a href="{escape(link)}" style="display:inline-block;background:#663af3;color:#fff;'
        'padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Επιβεβαίωση email</a></p>'
        '<p>Ο σύνδεσμος ισχύει 48 ώρες.</p>'))
    return send_email(user.email, 'Επιβεβαίωσε το email σου', html, dev_hint=link)


@bp.post('/api/auth/verify-email')
def verify_email():
    throttle(f'verify:{client_ip()}', 20, timedelta(minutes=15))
    token = text_field(body(), 'token', 200)
    row = A.EmailOtp.query.filter_by(purpose='verify', used=False, code_hash=keyed_hash(f'verify:{token}')).first() \
        if token else None
    if row is None or row.expires_at < utcnow():
        raise AuthError('Ο σύνδεσμος δεν ισχύει ή έληξε. Ζήτησε νέο από το Προφίλ.', 410, code='invalid_token')
    row.used = True
    user = A.db.session.get(A.User, row.user_id)
    if user is not None:
        user.email_verified = True
    A.db.session.commit()
    record('email_verified', user=user)
    return jsonify({'status': 'verified'})


@bp.post('/api/me/verify-email')
@login_required
def resend_verification():
    user = current_user._get_current_object()
    if user.email_verified:
        return jsonify({'status': 'verified'})
    throttle(f'verifyresend:{user.id}', 3, timedelta(hours=1), 'Στάλθηκαν ήδη αρκετά emails. Δοκίμασε σε λίγο.')
    send_verification(user)
    return jsonify({'status': 'sent'})


EVENT_LABELS = {
    'login_success': 'Σύνδεση', 'login_failed': 'Αποτυχημένη σύνδεση', 'login_blocked': 'Μπλοκαρίστηκε σύνδεση',
    '2fa_failed': 'Λάθος κωδικός 2 βημάτων', '2fa_enabled': 'Ενεργοποίηση 2 βημάτων',
    '2fa_disabled': 'Απενεργοποίηση 2 βημάτων', 'password_reset': 'Επαναφορά κωδικού',
    'password_changed': 'Αλλαγή κωδικού', 'backup_codes_regenerated': 'Νέοι εφεδρικοί κωδικοί',
    'backup_code_used': 'Χρήση εφεδρικού κωδικού', 'signup': 'Δημιουργία λογαριασμού',
    'logout_all': 'Αποσύνδεση από όλες τις συσκευές', 'reset_requested': 'Αίτημα επαναφοράς κωδικού',
    'email_verified': 'Επιβεβαίωση email', 'unverified_account_reclaimed': 'Ανάκτηση λογαριασμού μέσω Google',
    'desktop_login_approved': 'Έγκριση του προγράμματος των Windows',
    'desktop_login_denied': 'Απόρριψη σύνδεσης προγράμματος',
}


@bp.get('/api/me/security-events')
@login_required
def security_events():
    Ev = A.AuthEvent
    rows = Ev.query.filter(Ev.user_id == current_user.id, Ev.event.in_(tuple(EVENT_LABELS))) \
        .order_by(Ev.id.desc()).limit(20).all()
    out = []
    for r in rows:
        try:
            detail = json.loads(r.detail) if r.detail else {}
        except ValueError:
            detail = {}
        out.append({'event': r.event, 'label': EVENT_LABELS.get(r.event, r.event),
                    'at': r.created_at.isoformat() + 'Z', 'ip': mask_ip(r.ip),
                    'via': detail.get('via') or detail.get('method'),
                    'client': _short_agent(r.user_agent)})
    return jsonify({'events': out})


def _short_agent(ua):
    ua = ua or ''
    if 'python-requests' in ua or 'LASCA-Desktop' in ua:
        return 'LASCA για Windows'
    browser = next((b for b in ('Edg', 'Firefox', 'Chrome', 'Safari') if b in ua), None)
    os_name = next((o for o, k in (('Windows', 'Windows'), ('Android', 'Android'), ('iPhone', 'iPhone'),
                                   ('Mac', 'Mac OS'), ('Linux', 'Linux')) if k in ua), None)
    browser = {'Edg': 'Edge'}.get(browser, browser)
    return ' · '.join(x for x in (browser, os_name) if x) or None
