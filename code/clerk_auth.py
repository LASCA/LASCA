"""Επαλήθευση Clerk session tokens (RS256) με τα δημόσια κλειδιά JWKS του Clerk."""
import base64
import os
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


@lru_cache(maxsize=1)
def _jwk_client(url):
    # Το PyJWKClient κρατάει cache των κλειδιών.
    return PyJWKClient(url, cache_keys=True, lifespan=3600, timeout=5)


def verify_clerk_token(token):
    """Επιστρέφει (claims, error)."""
    if not token:
        return None, 'No token provided'
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
            leeway=10,
        )
    except jwt.ExpiredSignatureError:
        return None, 'Token has expired'
    except Exception:
        return None, 'Invalid token'
    issuer = f'https://{_frontend_api_host()}'  # iss = Frontend API URL
    if os.getenv('CLERK_JWKS_URL', '').strip() == '' and claims.get('iss') != issuer:
        return None, 'Invalid token issuer'
    return claims, None


def fetch_clerk_profile(clerk_user_id):
    """Τα session tokens δεν έχουν email· το παίρνουμε από το Clerk Backend API. Επιστρέφει dict ή None."""
    import requests
    secret = os.getenv('CLERK_SECRET_KEY', '').strip()
    if not secret:
        return None
    try:
        resp = requests.get(f'https://api.clerk.com/v1/users/{clerk_user_id}',
                            headers={'Authorization': f'Bearer {secret}'}, timeout=8)
        if resp.status_code != 200:
            return None
        data = resp.json()
    except Exception:
        return None
    primary_id = data.get('primary_email_address_id')
    for item in data.get('email_addresses') or []:
        if item.get('id') == primary_id:
            verified = (item.get('verification') or {}).get('status') == 'verified'
            name = ' '.join(filter(None, [data.get('first_name'), data.get('last_name')])) or data.get('username') or ''
            return {'email': (item.get('email_address') or '').strip().lower(), 'email_verified': verified,
                    'display_name': name}
    return None
