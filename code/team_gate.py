"""
«Πόρτα» για δοκιμές: όσο υπάρχει TEAM_GATE_PASSWORD στο .env, ΟΛΗ η σελίδα (ακόμα και η αρχική)
ζητάει πρώτα έναν κοινό κωδικό ομάδας. Για το δημόσιο άνοιγμα σβήνεις τη γραμμή και κάνεις restart.

  * Ο κωδικός δεν αποθηκεύεται πουθενά εκτός από το .env του server.
  * Μετά τον σωστό κωδικό ο browser παίρνει cookie 30 ημερών (HttpOnly, Secure). Αν αλλάξει ο κωδικός,
    τα παλιά cookies παύουν να ισχύουν.
  * Όριο 10 λάθος προσπαθειών ανά 15 λεπτά ανά IP.
  * Το πρόγραμμα των Windows δεν μπορεί να δείξει αυτή τη σελίδα, οπότε περνάνε: αιτήματα με κλειδί
    συσκευής (Bearer) και τα λίγα endpoints σύνδεσης του προγράμματος. Χωρίς λογαριασμό δεν κάνουν τίποτα.
  * Ο κωδικός ομάδας ΔΕΝ αντικαθιστά τους λογαριασμούς: μετά την πόρτα, ο καθένας συνδέεται κανονικά.
"""
import hashlib
import hmac
import os
import time
from html import escape

from flask import make_response, redirect, request

from security import client_ip, json_error, origin_of

COOKIE = 'lasca_team'
MAX_AGE = 30 * 24 * 3600
# Το πρόγραμμα των Windows (χωρίς browser): σύνδεση και έλεγχος σύνδεσης.
DESKTOP_PATHS = {'/api/auth/device-token', '/api/auth/desktop/start', '/api/desktop-link/poll', '/api/auth/config'}
_fails = {}


def _token(secret, password):
    return hmac.new(secret.encode(), b'team-gate:' + hashlib.sha256(password.encode()).digest(), 'sha256').hexdigest()


def _too_many(ip):
    now = time.time()
    hits = [t for t in _fails.get(ip, []) if now - t < 900]
    _fails[ip] = hits
    return len(hits) >= 10


PAGE = """<!doctype html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>LASCA</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05060f;color:#d1e4fa;
font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}
main{width:100%;max-width:380px;border:1px solid rgb(186 215 247/.12);background:rgb(186 214 247/.03);
border-radius:18px;padding:28px}
p.e{margin:0;font:600 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#9da7ba}
h1{margin:6px 0 4px;font-size:24px;color:#fff}p.s{margin:0 0 20px;color:#c7d3ea}
input{width:100%;height:46px;border-radius:12px;border:1px solid rgb(186 215 247/.16);background:rgb(199 211 234/.06);
color:#fff;padding:0 14px;font:inherit}input:focus{outline:2px solid #663af3;outline-offset:1px}
button{margin-top:12px;width:100%;height:46px;border:0;border-radius:999px;background:#663af3;color:#fff;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#7650f5}.err{margin:12px 0 0;color:#ffb8a3;font-size:14px}
</style></head><body><main>
<p class="e">LASCA Team</p><h1>Δοκιμαστική έκδοση</h1>
<p class="s">Η σελίδα είναι ακόμα σε δοκιμές. Γράψε τον κωδικό της ομάδας.</p>
<form method="post" action="/team-gate">
<input type="hidden" name="next" value="{next}">
<input type="password" name="password" aria-label="Κωδικός ομάδας" placeholder="Κωδικός ομάδας" autocomplete="current-password" autofocus required>
<button type="submit">Είσοδος</button>{error}
</form></main></body></html>"""


def _page(next_path='/', error='', status=401):
    html = PAGE.replace('{next}', escape(next_path, quote=True)).replace(
        '{error}', f'<p class="err" role="alert">{escape(error)}</p>' if error else '')
    resp = make_response(html, status)
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    resp.headers['Cache-Control'] = 'no-store'
    resp.headers['X-Robots-Tag'] = 'noindex, nofollow'
    return resp


def _safe_next(value):
    value = str(value or '/')
    return value if value.startswith('/') and not value.startswith('//') and '\\' not in value else '/'


def init_team_gate(app, allowed_origins, public_api_paths=()):
    password = os.getenv('TEAM_GATE_PASSWORD', '').strip()
    if not password:
        return False
    secret = app.config['SECRET_KEY']
    expected = _token(secret, password)
    secure = app.config.get('SESSION_COOKIE_SECURE', True)

    @app.post('/team-gate')
    def team_gate_submit():
        origin = origin_of(request.headers.get('Origin')) or origin_of(request.headers.get('Referer'))
        if origin is not None and origin not in allowed_origins():
            return _page(error='Το αίτημα απορρίφθηκε.', status=403)
        ip = client_ip()
        next_path = _safe_next(request.form.get('next'))
        if _too_many(ip):
            return _page(next_path, 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά.', 429)
        given = str(request.form.get('password') or '')[:200]
        if not hmac.compare_digest(given.encode(), password.encode()):
            _fails.setdefault(ip, []).append(time.time())
            return _page(next_path, 'Λάθος κωδικός.')
        resp = redirect(next_path, code=303)
        resp.set_cookie(COOKIE, expected, max_age=MAX_AGE, httponly=True, secure=secure, samesite='Lax', path='/')
        return resp

    @app.before_request
    def team_gate_check():
        if request.path == '/team-gate' or request.method == 'OPTIONS':
            return None
        if hmac.compare_digest(request.cookies.get(COOKIE, ''), expected):
            return None
        if request.path in DESKTOP_PATHS:
            return None
        # Κλειδί συσκευής (exe): μόνο για endpoints που θέλουν σύνδεση — ένα ψεύτικο «Bearer» δεν
        # ανοίγει ούτε τις σελίδες ούτε τα δημόσια endpoints (π.χ. εγγραφή).
        if request.headers.get('Authorization', '').startswith('Bearer ') and request.path.startswith('/api/'):
            if request.path not in public_api_paths():
                return None
            # Δημόσια endpoints (π.χ. /api/me που ζητάει το exe για όνομα/εικόνα): μόνο με ΠΡΑΓΜΑΤΙΚΟ
            # κλειδί συσκευής. Αλλιώς το exe έπαιρνε 401 και νόμιζε ότι αποσυνδέθηκε.
            from flask_login import current_user
            if current_user.is_authenticated:
                return None
            # Άκυρο/ακυρωμένο κλειδί: το exe πρέπει να καταλάβει ότι αποσυνδέθηκε (όχι «πόρτα»).
            return json_error('Η σύνδεση έληξε. Συνδέσου ξανά.', 401, code='invalid_token')
        if request.path.startswith('/api/'):
            return json_error('Η σελίδα είναι σε δοκιμές: χρειάζεται ο κωδικός της ομάδας.', 401, code='team_gate')
        if request.method != 'GET':
            return _page()
        full = request.full_path if request.query_string else request.path
        return _page(_safe_next(full))

    @app.after_request
    def team_gate_noindex(resp):
        resp.headers.setdefault('X-Robots-Tag', 'noindex, nofollow')
        return resp

    return True
