"""
Κοινά μέτρα ασφαλείας της LASCA (ίδιο αρχείο στη web έκδοση και στο πρόγραμμα των Windows).

  * Κεφαλίδες ασφαλείας (CSP, HSTS, nosniff, frame-ancestors, Referrer/Permissions-Policy).
  * Έλεγχος προέλευσης (Origin) σε κάθε αίτημα που αλλάζει δεδομένα: μια ξένη σελίδα δεν
    μπορεί να κάνει ενέργειες με το cookie σύνδεσης του χρήστη (CSRF).
  * Desktop: ο τοπικός server δέχεται αιτήματα ΜΟΝΟ από το παράθυρο της εφαρμογής
    (έλεγχος Host/Origin: προστασία από ιστοσελίδες που στοχεύουν το 127.0.0.1 και DNS rebinding).
  * Γρήγορο όριο αιτημάτων στη μνήμη (throttling) ανά IP / χρήστη για όλα τα /api/*.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque
from urllib.parse import urlsplit

from flask import jsonify, request

logger = logging.getLogger('lasca.security')

UNSAFE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}


# ---------------------------------------------------------------------------
# Βοηθητικά
# ---------------------------------------------------------------------------
def client_ip() -> str:
    # Πίσω από nginx το ProxyFix έχει ήδη βάλει τη σωστή IP στο remote_addr.
    return (request.remote_addr or 'unknown')[:64]


def origin_of(url: str | None) -> str | None:
    if not url:
        return None
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if not parts.scheme or not parts.netloc:
        return None
    return f'{parts.scheme}://{parts.netloc}'.lower()


def json_error(message: str, status: int, code: str | None = None, **extra):
    payload = {'error': message}
    if code:
        payload['code'] = code
    payload.update(extra)
    resp = jsonify(payload)
    resp.status_code = status
    return resp


# ---------------------------------------------------------------------------
# Όριο αιτημάτων στη μνήμη (sliding window)
# ---------------------------------------------------------------------------
class MemoryLimiter:
    """Μετράει αιτήματα ανά κλειδί σε κυλιόμενο παράθυρο. Ανά διεργασία (worker):
    για τα ευαίσθητα (login κ.λπ.) χρησιμοποιείται επιπλέον μετρητής στη βάση."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_prune = time.monotonic()

    def hit(self, key: str, limit: int, window: float) -> float:
        """Καταγράφει ένα αίτημα. Επιστρέφει 0 αν επιτρέπεται, αλλιώς σε πόσα δευτερόλεπτα."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= limit:
                return max(1.0, q[0] + window - now)
            q.append(now)
            if now - self._last_prune > 300:
                self._prune(now)
            return 0.0

    def _prune(self, now: float, horizon: float = 3600):
        for key in [k for k, q in self._hits.items() if not q or q[-1] < now - horizon]:
            del self._hits[key]
        self._last_prune = now

    def reset(self):
        with self._lock:
            self._hits.clear()


limiter = MemoryLimiter()


def init_api_throttle(app, rules, *, user_key=None, enabled=True):
    """rules: λίστα από (όνομα, συνάρτηση(path, method) -> bool, όριο, παράθυρο_δευτ., ανά 'ip'|'user').
    Το πρώτο κανόνα που ταιριάζει δεν σταματά τους υπόλοιπους: ισχύουν όλοι όσοι ταιριάζουν."""

    @app.before_request
    def _throttle():
        if not enabled or app.config.get('TESTING_DISABLE_THROTTLE'):
            return None
        if request.method == 'OPTIONS' or not request.path.startswith('/api/'):
            return None
        for name, match, limit, window, scope in rules:
            if not match(request.path, request.method):
                continue
            ident = client_ip()
            if scope == 'user' and user_key is not None:
                ident = user_key() or ident
            retry = limiter.hit(f'{name}:{ident}', limit, window)
            if retry:
                logger.warning('Throttled %s for %s on %s %s', name, ident, request.method, request.path)
                resp = json_error('Πάρα πολλά αιτήματα. Δοκίμασε ξανά σε λίγο.', 429, code='rate_limited',
                                  retry_after=int(retry) + 1)
                resp.headers['Retry-After'] = str(int(retry) + 1)
                return resp
        return None


# ---------------------------------------------------------------------------
# Κεφαλίδες ασφαλείας
# ---------------------------------------------------------------------------
BASE_CSP = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    # 'unsafe-inline' μόνο για styles: το React/Leaflet βάζουν style="" στα στοιχεία.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
}


def build_csp(extra: dict | None = None, upgrade_insecure=False) -> str:
    policy = {k: list(v) for k, v in BASE_CSP.items()}
    for key, values in (extra or {}).items():
        current = policy.setdefault(key, [])
        if current == ["'none'"]:
            current.clear()
        for value in values:
            if value and value not in current:
                current.append(value)
    parts = [f"{k} {' '.join(v)}" for k, v in policy.items()]
    if upgrade_insecure:
        parts.append('upgrade-insecure-requests')
    return '; '.join(parts)


def init_security_headers(app, *, csp: str, hsts: bool = False, coop: str = 'same-origin'):
    @app.after_request
    def _headers(resp):
        h = resp.headers
        h.setdefault('X-Content-Type-Options', 'nosniff')
        h.setdefault('X-Frame-Options', 'DENY')
        h.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        h.setdefault('Permissions-Policy',
                     'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()')
        h.setdefault('Cross-Origin-Opener-Policy', coop)
        h.setdefault('Cross-Origin-Resource-Policy', 'same-origin')
        if resp.mimetype == 'text/html' or request.path.startswith('/api/'):
            h.setdefault('Content-Security-Policy', csp)
        if hsts:
            h.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        if request.path.startswith('/api/'):
            # Τα δεδομένα χρηστών δεν μένουν σε cache (proxies, κοινόχρηστοι υπολογιστές).
            h['Cache-Control'] = 'no-store'
            h.setdefault('Pragma', 'no-cache')
        elif request.path.startswith('/assets/') and resp.status_code == 200:
            h['Cache-Control'] = 'public, max-age=31536000, immutable'
        h.pop('Server', None)
        return resp


# ---------------------------------------------------------------------------
# Έλεγχος προέλευσης (CSRF)
# ---------------------------------------------------------------------------
def init_origin_guard(app, allowed_origins, *, exempt_bearer=True):
    """allowed_origins: συνάρτηση που επιστρέφει set από 'https://domain' που επιτρέπονται.
    Αιτήματα με «Authorization: Bearer» (exe) δεν χρησιμοποιούν cookies, οπότε εξαιρούνται."""

    @app.before_request
    def _origin_guard():
        if request.method not in UNSAFE_METHODS or not request.path.startswith('/api/'):
            return None
        # Μια ξένη σελίδα δεν μπορεί να στείλει κεφαλίδα Authorization χωρίς CORS (που δεν δίνουμε).
        if exempt_bearer and request.headers.get('Authorization', '').startswith('Bearer '):
            return None
        origin = origin_of(request.headers.get('Origin')) or origin_of(request.headers.get('Referer'))
        allowed = allowed_origins()
        if origin is None or origin not in allowed:
            logger.warning('Blocked cross-site %s %s from origin=%s ip=%s',
                           request.method, request.path, origin, client_ip())
            return json_error('Το αίτημα απορρίφθηκε (μη επιτρεπτή προέλευση).', 403, code='bad_origin')
        return None


def init_local_only_guard(app, get_port):
    """Desktop: ο server ακούει στο 127.0.0.1 και δέχεται μόνο το δικό του παράθυρο."""

    def allowed_hosts():
        port = get_port()
        return {f'127.0.0.1:{port}', f'localhost:{port}'}

    @app.before_request
    def _local_only():
        host = (request.host or '').lower()
        if host not in allowed_hosts():
            # Άλλο Host = κάποια σελίδα έκανε DNS rebinding προς τον υπολογιστή.
            return json_error('Forbidden', 403, code='bad_host')
        origin = request.headers.get('Origin')
        if origin is not None and origin != 'null':
            if origin_of(origin) not in {f'http://{h}' for h in allowed_hosts()}:
                return json_error('Forbidden', 403, code='bad_origin')
        elif origin == 'null' and request.method in UNSAFE_METHODS:
            return json_error('Forbidden', 403, code='bad_origin')
        if request.method in UNSAFE_METHODS and request.path.startswith('/api/'):
            # Χωρίς Origin: δεχόμαστε μόνο αν δεν έρχεται από φόρμα άλλης σελίδας (Sec-Fetch-Site).
            site = request.headers.get('Sec-Fetch-Site')
            if site and site not in {'same-origin', 'none'}:
                return json_error('Forbidden', 403, code='bad_origin')
        return None
