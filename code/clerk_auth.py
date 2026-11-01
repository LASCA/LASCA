"""Επαλήθευση Clerk session tokens (RS256) με τα δημόσια κλειδιά JWKS του Clerk."""
import base64
import os
import re
from functools import lru_cache

import jwt
from jwt import PyJWKClient


def _frontend_api_host():
    key = (os.getenv('CLERK_PUBLISHABLE_KEY') or os.getenv('VITE_CLERK_PUBLISHABLE_KEY') or '').strip()
    parts = key.split('_', 2)
    if len(parts) != 3:
        return ''
    payload = parts[2] + '=' * (-len(parts[2]) % 4)
    try:
        return base64.b64decode(payload).decode('utf-8').rstrip('$')
    except Exception:
        return ''


def _jwks_url():
    explicit = os.getenv('CLERK_JWKS_URL', '').strip()
    if explicit:
        return explicit
    host = _frontend_api_host()
    return f'https://{host}/.well-known/jwks.json' if host else ''


# Μορφή των ids του Clerk (user_..., sess_...). Ελέγχεται πριν μπει σε URL του Backend API.
CLERK_USER_ID_RE = re.compile(r'user_[A-Za-z0-9]{8,64}')
CLERK_SESSION_ID_RE = re.compile(r'sess_[A-Za-z0-9]{8,64}')


def valid_clerk_user_id(value):
    return isinstance(value, str) and bool(CLERK_USER_ID_RE.fullmatch(value))


@lru_cache(maxsize=1)
def _jwk_client(url):
    # Το PyJWKClient κρατάει cache των κλειδιών.
    return PyJWKClient(url, cache_keys=True, lifespan=3600, timeout=5)


def verify_clerk_token(token, allowed_origins=None):
    """Επιστρέφει (claims, error). allowed_origins: set από 'https://domain' από όπου επιτρέπεται να
    προέρχεται το token (claim azp του Clerk). Έτσι ένα token που εκδόθηκε για άλλη σελίδα του ίδιου
    Clerk instance (π.χ. δοκιμαστικό site) δεν γίνεται δεκτό εδώ."""
    if not token:
        return None, 'No token provided'
    if len(token) > 8192 or token.count('.') != 2:
        return None, 'Invalid token'
    url = _jwks_url()
    if not url:
        return None, 'Clerk is not configured (set CLERK_PUBLISHABLE_KEY or CLERK_JWKS_URL)'
    try:
        signing_key = _jwk_client(url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            options={'require': ['exp', 'iat', 'sub']},
            # Το session token του Clerk ζει ~60″· ένα αίτημα μπορεί να περιμένει πίσω από αργό υπολογισμό
            # (1 worker στον server). Μικρή ανοχή στη λήξη, ώστε να μη βγαίνει ο χρήστης έξω.
            leeway=60,
        )
    except jwt.ExpiredSignatureError:
        return None, 'Token has expired'
    except Exception:
        return None, 'Invalid token'
    issuer = f'https://{_frontend_api_host()}'  # iss = Frontend API URL
    expected_issuer = os.getenv('CLERK_ISSUER', '').strip() or (issuer if not os.getenv('CLERK_JWKS_URL', '').strip() else '')
    if expected_issuer and claims.get('iss') != expected_issuer:
        return None, 'Invalid token issuer'
    if not valid_clerk_user_id(claims.get('sub')):
        return None, 'Invalid token subject'
    azp = claims.get('azp')
    if allowed_origins is not None and azp and str(azp).rstrip('/').lower() not in allowed_origins:
        return None, 'Invalid token origin'
    return claims, None



def profile_from_user_payload(data):
    """Τα στοιχεία που χρειάζεται η lasca.db από έναν χρήστη του Clerk (Backend API ή webhook).
    Επιστρέφει dict ή None αν δεν έχει κύριο email."""
    if not isinstance(data, dict):
        return None
    primary_id = data.get('primary_email_address_id')
    emails = data.get('email_addresses') or []
    item = next((e for e in emails if e.get('id') == primary_id), None) or (emails[0] if emails else None)
    if not item:
        return None
    verified = (item.get('verification') or {}).get('status') == 'verified'
    name = ' '.join(filter(None, [(data.get('first_name') or '').strip(), (data.get('last_name') or '').strip()]))
    # Προαιρετικά πεδία της εγγραφής (σχολή, εταιρεία): η σελίδα τα στέλνει στο Clerk ως unsafe_metadata.
    extra = data.get('unsafe_metadata') if isinstance(data.get('unsafe_metadata'), dict) else {}
    # Το όνομα που έγραψε ο χρήστης στο LASCA (εγγραφή ή Προφίλ) προηγείται του ονόματος του Clerk/Google.
    return {'email': (item.get('email_address') or '').strip().lower(), 'email_verified': verified,
            'display_name': str(extra.get('name') or '').strip() or name or (data.get('username') or '').strip(),
            # Αποδοχή Όρων στη φόρμα εγγραφής (έκδοση των Όρων, βλ. TERMS_VERSION)
            'terms_version': str(extra.get('terms_version') or '').strip()[:20],
            'external_id': str(data.get('external_id') or '').strip(),
            'school': str(extra.get('school') or ''), 'company': str(extra.get('company') or '')}


def fetch_clerk_profile(clerk_user_id):
    """Τα session tokens δεν έχουν email· το παίρνουμε από το Clerk Backend API. Επιστρέφει dict ή None."""
    import requests
    secret = os.getenv('CLERK_SECRET_KEY', '').strip()
    if not secret or not valid_clerk_user_id(clerk_user_id):
        return None
    try:
        resp = requests.get(f'https://api.clerk.com/v1/users/{clerk_user_id}',
                            headers={'Authorization': f'Bearer {secret}'}, timeout=8)
        if resp.status_code != 200:
            return None
        return profile_from_user_payload(resp.json())
    except Exception:
        return None
