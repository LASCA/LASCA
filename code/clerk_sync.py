"""Σύνδεση των λογαριασμών του Clerk με τη lasca.db.

Το Clerk κρατάει ΜΟΝΟ την ταυτότητα (email, κωδικό, όνομα, Google). Όλα τα υπόλοιπα (projects, μέλη,
ιστορικό, προφίλ, Όροι) μένουν στη lasca.db. Κάθε χρήστης της lasca.db δείχνει στον λογαριασμό του Clerk
με το users.clerk_user_id. Η σύνδεση γίνεται:

  1. στην πρώτη είσοδο με Clerk (link_or_create): με το clerk_user_id, αλλιώς με το external_id που έβαλε
     το deploy/clerk_import.py, αλλιώς με το ίδιο ΕΠΙΒΕΒΑΙΩΜΕΝΟ email (ο παλιός λογαριασμός με τα projects του·
     όποιος αποδεικνύει ότι έχει το email θα μπορούσε ούτως ή άλλως να κάνει «Ξέχασα τον κωδικό»).
  2. με webhook (POST /api/clerk/webhook, υπογραφή Svix): αλλαγή ονόματος/email στο Clerk ενημερώνει τη
     lasca.db, διαγραφή στο Clerk διαγράφει και τον χρήστη εδώ (τα κοινά projects περνούν στους συνεργάτες).
  3. αντίστροφα: «Διαγραφή λογαριασμού» από το Προφίλ του LASCA σβήνει και τον χρήστη στο Clerk.

Ρυθμίσεις (code/.env): CLERK_SECRET_KEY (Backend API), CLERK_WEBHOOK_SECRET (whsec_..., από το Clerk Dashboard
→ Webhooks → Endpoint https://lasca.gr/api/clerk/webhook με τα events user.created, user.updated, user.deleted).
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime
from types import SimpleNamespace

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from auth_security import clean_display_name
from clerk_auth import profile_from_user_payload

bp = Blueprint('clerk_sync', __name__)
S = SimpleNamespace()   # μοντέλα/βοηθητικά του main_4_app (γεμίζει στην init_clerk_sync)

CLERK_API = 'https://api.clerk.com/v1'
WEBHOOK_PATH = '/api/clerk/webhook'
WEBHOOK_TOLERANCE = 5 * 60          # δευτερόλεπτα (όπως το Svix)


def init_clerk_sync(app, **refs):
    S.__dict__.update(refs)
    app.register_blueprint(bp)


class ClerkApiError(Exception):
    pass


def clerk_api(method, path, **kwargs):
    """Κλήση στο Clerk Backend API. Επιστρέφει το requests.Response (ο καλών ελέγχει το status)."""
    import requests
    secret = os.getenv('CLERK_SECRET_KEY', '').strip()
    if not secret:
        raise ClerkApiError('CLERK_SECRET_KEY is not set')
    headers = {'Authorization': f'Bearer {secret}'}
    return requests.request(method, CLERK_API + path, headers=headers, timeout=15, **kwargs)


# ---------------------------------------------------------------------------
# Κοινό: βρες ή φτιάξε τον χρήστη της lasca.db για έναν λογαριασμό Clerk
# ---------------------------------------------------------------------------
def _clean_name(name, email):
    name = ' '.join(str(name or '').split())[:150]
    return name or email.split('@', 1)[0][:150]


def link_or_create(clerk_id, profile):
    """Επιστρέφει (user, error, status). Δεν κάνει commit όταν δεν αλλάζει τίποτα."""
    User, db = S.User, S.db
    user = User.query.filter_by(clerk_id=clerk_id).first()
    if user is not None:
        return user, None, None
    email = S.normalize_email((profile or {}).get('email'))
    if not email or not S.EMAIL_RE.fullmatch(email):
        return None, 'Could not read email from Clerk', 502
    if not profile.get('email_verified'):
        return None, 'Email not verified', 403

    # 1) external_id = το id της lasca.db (το βάζει το deploy/clerk_import.py)
    user = None
    external = str(profile.get('external_id') or '')
    if external.isdigit():
        candidate = db.session.get(User, int(external))
        if candidate is not None and candidate.clerk_id in (None, clerk_id):
            user = candidate
    # 2) ίδιο email: ο παλιός λογαριασμός (projects, συνεργάτες) συνεχίζει με το Clerk
    if user is None:
        user = User.query.filter_by(email=email).first()
    if user is not None:
        if user.clerk_id and user.clerk_id != clerk_id:
            S.logger.warning('Clerk link refused: local user %s is linked to another Clerk account', user.id)
            return None, 'Email already linked to another account', 409
        user.clerk_id = clerk_id
        user.email_verified = True
        if user.email != email and not User.query.filter(User.email == email, User.id != user.id).first():
            user.email = email
        db.session.commit()
        S.logger.info('Clerk account linked to existing local user %s', user.id)
        return user, None, None

    # 3) νέος χρήστης
    user = User(email=email, clerk_id=clerk_id, display_name=_clean_name(profile.get('display_name'), email),
                email_verified=True, has_password=False,
                password_hash=S.generate_password_hash(secrets.token_urlsafe(32)))
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        user = User.query.filter_by(clerk_id=clerk_id).first()
        if user is None:
            return None, 'Could not create the local account', 409
    return user, None, None


def _fill_optional(user, profile):
    """Σχολή/εταιρεία από την εγγραφή: μόνο αν είναι κενά στη lasca.db (μετά αλλάζουν από το Προφίλ του LASCA)."""
    changed = False
    for field in ('school', 'company'):
        value = clean_display_name((profile or {}).get(field))[:120]
        if value and not getattr(user, field, None):
            setattr(user, field, value)
            changed = True
    # Υποχρεωτικό checkbox Όρων στη φόρμα εγγραφής: καταγράφεται εδώ, ώστε να μη ζητηθεί ξανά αποδοχή.
    current = getattr(S, 'TERMS_VERSION', None)
    if current and (profile or {}).get('terms_version') == current and user.terms_version != current:
        user.terms_version, user.terms_accepted_at = current, datetime.utcnow()
        changed = True
    return changed


def sync_profile(user, profile):
    """Όνομα και email από το Clerk → lasca.db (το Clerk είναι η πηγή για την ταυτότητα)."""
    if not profile:
        return False
    changed = _fill_optional(user, profile)
    name = ' '.join(str(profile.get('display_name') or '').split())[:150]
    if name and name != user.display_name:
        user.display_name, changed = name, True
    email = S.normalize_email(profile.get('email'))
    if profile.get('email_verified') and email and email != user.email and S.EMAIL_RE.fullmatch(email):
        if S.User.query.filter(S.User.email == email, S.User.id != user.id).first() is None:
            user.email, changed = email, True
        else:
            S.logger.warning('Clerk email change for user %s not applied: email used by another account', user.id)
    if profile.get('email_verified') and not user.email_verified:
        user.email_verified, changed = True, True
    if changed:
        S.db.session.commit()
    return changed


def delete_clerk_user(clerk_id):
    """«Διαγραφή λογαριασμού» από το LASCA: σβήνει και τον λογαριασμό στο Clerk (best effort)."""
    if not clerk_id or not os.getenv('CLERK_SECRET_KEY', '').strip():
        return False
    try:
        resp = clerk_api('DELETE', f'/users/{clerk_id}')
        if resp.status_code in (200, 404):
            return True
        S.logger.error('Clerk user delete failed: HTTP %s', resp.status_code)
    except Exception as exc:  # noqa: BLE001
        S.logger.error('Clerk user delete failed: %s', type(exc).__name__)
    return False


# ---------------------------------------------------------------------------
# Webhook (Svix)
# ---------------------------------------------------------------------------
def verify_svix(secret, headers, body, now=None):
    """Έλεγχος υπογραφής Svix (αυτή που χρησιμοποιεί το Clerk): HMAC-SHA256 του «id.timestamp.body»."""
    msg_id, timestamp, signatures = (headers.get('svix-id'), headers.get('svix-timestamp'),
                                     headers.get('svix-signature'))
    if not (secret and msg_id and timestamp and signatures):
        return False
    try:
        ts = int(timestamp)
        key = base64.b64decode(secret.split('_', 1)[1] if secret.startswith('whsec_') else secret)
    except (ValueError, TypeError):
        return False
    if abs((now or time.time()) - ts) > WEBHOOK_TOLERANCE:
        return False
    signed = f'{msg_id}.{timestamp}.'.encode() + body
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    for part in signatures.split():
        version, _, value = part.partition(',')
        if version == 'v1' and hmac.compare_digest(value, expected):
            return True
    return False


@bp.post(WEBHOOK_PATH)
def clerk_webhook():
    secret = os.getenv('CLERK_WEBHOOK_SECRET', '').strip()
    if not secret:
        S.logger.error('Clerk webhook received but CLERK_WEBHOOK_SECRET is not set')
        return jsonify({'error': 'Webhook is not configured'}), 503
    raw = request.get_data(cache=True)
    if len(raw) > 512 * 1024 or not verify_svix(secret, request.headers, raw):
        S.logger.warning('Clerk webhook with invalid signature rejected')
        return jsonify({'error': 'Invalid signature'}), 401
    try:
        event = json.loads(raw)
    except ValueError:
        return jsonify({'error': 'Invalid JSON'}), 400
    kind, data = event.get('type'), event.get('data') or {}
    clerk_id = str(data.get('id') or '')
    if not clerk_id:
        return jsonify({'status': 'ignored'})

    if kind in ('user.created', 'user.updated'):
        profile = profile_from_user_payload(data)
        user = S.User.query.filter_by(clerk_id=clerk_id).first()
        if user is not None:
            sync_profile(user, profile)
            return jsonify({'status': 'updated'})
        if profile and profile.get('email_verified'):
            user, error, _ = link_or_create(clerk_id, profile)
            if user is not None:
                sync_profile(user, profile)
                return jsonify({'status': 'linked'})
            S.logger.warning('Clerk webhook %s not applied: %s', kind, error)
        return jsonify({'status': 'ignored'})

    if kind == 'user.deleted':
        user = S.User.query.filter_by(clerk_id=clerk_id).first()
        if user is None:
            return jsonify({'status': 'ignored'})
        result = S.purge_account(user)
        S.logger.info('Local user %s deleted after Clerk user.deleted (%s shared projects transferred)',
                      clerk_id, len(result['transferred']))
        return jsonify({'status': 'deleted'})

    return jsonify({'status': 'ignored'})
