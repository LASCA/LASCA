import sys
import io

if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import shutil
import socket
import threading
try:
    import webview  # μόνο για την desktop έκδοση· στον web server δεν χρειάζεται
except ImportError:
    webview = None
import logging
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import math
import base64
import ezdxf
import json, io, traceback
import re
import uuid
import hashlib
import secrets
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import data_proccessing as dpr
import vis_4_app as vis

try:
    import resend
except ImportError:
    resend = None

from datetime import datetime, timedelta
import mimetypes
from project_manager import TopoProject, atomic_write_json, get_safe_workspace_dir, resolve_project_dir
from flask import Flask, Response, request, jsonify, send_file, send_from_directory, session, g
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import synonym
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from pathlib import Path
from ezdxf.enums import TextEntityAlignment
from io import BytesIO
from pyproj import CRS, Transformer
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether, PageBreak, BaseDocTemplate, PageTemplate, Frame, NextPageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from functools import partial 
from reportlab.platypus import  Image as RLImage
from reportlab.graphics.shapes import Drawing, Line, Polygon, Circle, Rect, String
from reportlab import rl_config
from reportlab.platypus import Paragraph as _RLParagraph

# Ασφάλεια αναφορών PDF: το Paragraph του reportlab διαβάζει markup (<img src=...>, <font>, <a>, <link>).
# Ονόματα σημείων, έργων κ.λπ. έρχονται από τον χρήστη: χωρίς escape, ένα «όνομα σημείου»
# <img src="/srv/..."> θα έκανε τον server να ανοίξει τοπικά αρχεία ή URLs (π.χ. 169.254.169.254).
# Επιτρέπονται μόνο οι ακίνδυνες ετικέτες μορφοποίησης που χρησιμοποιούν οι επικεφαλίδες (υ<sub>ji</sub> κ.λπ.).
rl_config.trustedSchemes = ['file', 'data']          # ποτέ http/https/ftp από μέσα σε PDF
_SAFE_PDF_TAG = re.compile(r'&lt;(/?)(b|i|u|sub|sup)&gt;|&lt;br\s*/?&gt;')


_PDF_TAG_PAIR = re.compile(r'<(/?)(b|i|u|sub|sup)>')


def _safe_pdf_markup(text):
    escaped = escape('' if text is None else str(text), quote=False)
    restored = _SAFE_PDF_TAG.sub(lambda m: f'<{m.group(1)}{m.group(2)}>' if m.group(2) else '<br/>', escaped)
    # Οι επιτρεπτές ετικέτες πρέπει να κλείνουν σωστά (αλλιώς το reportlab σκάει με «Parse error»):
    # αν όχι, το κείμενο τυπώνεται όπως γράφτηκε, χωρίς καμία μορφοποίηση.
    stack = []
    for m in _PDF_TAG_PAIR.finditer(restored):
        if not m.group(1):
            stack.append(m.group(2))
        elif not stack or stack.pop() != m.group(2):
            return escaped
    return escaped if stack else restored


def Paragraph(text, *args, **kwargs):  # noqa: N802 (ίδιο όνομα με του reportlab σε όλο το αρχείο)
    return _RLParagraph(_safe_pdf_markup(text), *args, **kwargs)


EGSA87_TO_WGS84 = Transformer.from_crs(
    CRS.from_proj4(
        "+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 "
        "+ellps=GRS80 +towgs84=-199.87,74.79,246.62,0,0,0,0 +units=m +no_defs"
    ),
    CRS.from_epsg(4326),
    always_xy=True
)


def create_survey_cad_drawing(
    input_rows: list[dict],
    result_rows: list[dict],
    width: float = 480,
    height: float = 260,
) -> Drawing:
    """Create a scale-preserving vector CAD sketch for survey reports."""
    known_points = []
    calculated_points = []

    def extract_point(row: dict, fallback_name: str):
        if not isinstance(row, dict):
            return None
        try:
            x_value = row.get('x', row.get('X'))
            y_value = row.get('y', row.get('Y'))
            x_value = float(x_value)
            y_value = float(y_value)
            if not (math.isfinite(x_value) and math.isfinite(y_value)):
                return None
        except (TypeError, ValueError):
            return None
        name = row.get('pointName') or row.get('name') or fallback_name
        return str(name), x_value, y_value

    for index, row in enumerate(input_rows or []):
        point = extract_point(row, f'K{index + 1}')
        if point is not None:
            known_points.append(point)
    for index, row in enumerate(result_rows or []):
        point = extract_point(row, f'P{index + 1}')
        if point is not None:
            calculated_points.append(point)

    drawing = Drawing(float(width), float(height))
    drawing.add(Rect(0, 0, float(width), float(height), fillColor=colors.white, strokeColor=colors.HexColor('#cbd5e1'), strokeWidth=0.5))

    all_points = known_points + calculated_points
    if all_points:
        x_values = [point[1] for point in all_points]
        y_values = [point[2] for point in all_points]
        min_x, max_x = min(x_values), max(x_values)
        min_y, max_y = min(y_values), max(y_values)
        padding = max(max_x - min_x, max_y - min_y, 1.0) * 0.15
        min_x -= padding
        max_x += padding
        min_y -= padding
        max_y += padding

        plot_left, plot_bottom = 28.0, 22.0
        plot_width = max(float(width) - 44.0, 1.0)
        plot_height = max(float(height) - 42.0, 1.0)
        scale = min(
            plot_width / max(max_x - min_x, 1e-12),
            plot_height / max(max_y - min_y, 1e-12),
        )
        used_width = (max_x - min_x) * scale
        used_height = (max_y - min_y) * scale
        offset_x = plot_left + (plot_width - used_width) / 2.0
        offset_y = plot_bottom + (plot_height - used_height) / 2.0

        def project(point):
            return (
                offset_x + (point[1] - min_x) * scale,
                offset_y + (point[2] - min_y) * scale,
            )

        known_screen = [project(point) for point in known_points]
        calculated_screen = [project(point) for point in calculated_points]
        slate = colors.HexColor('#475569')
        dark_slate = colors.HexColor('#1e293b')
        blue = colors.HexColor('#0284c7')

        for (first_x, first_y), (second_x, second_y) in zip(known_screen, known_screen[1:]):
            drawing.add(Line(
                first_x,
                first_y,
                second_x,
                second_y,
                strokeColor=colors.HexColor('#64748b'),
                strokeWidth=0.75,
                strokeDashArray=[4, 4],
            ))

        for known_x, known_y in known_screen:
            for calculated_x, calculated_y in calculated_screen:
                drawing.add(Line(known_x, known_y, calculated_x, calculated_y, strokeColor=slate, strokeWidth=0.75))

        for (name, _, _), (cx, cy) in zip(known_points, known_screen):
            radius = 5.5
            drawing.add(Polygon(
                [cx, cy + radius, cx - radius * 0.866, cy - radius / 2, cx + radius * 0.866, cy - radius / 2],
                fillColor=dark_slate,
                strokeColor=dark_slate,
                strokeWidth=0.75,
            ))
            drawing.add(String(cx, cy - 13, name, fontName='Helvetica-Bold', fontSize=9, textAnchor='middle', fillColor=dark_slate))

        for (name, _, _), (cx, cy) in zip(calculated_points, calculated_screen):
            drawing.add(Circle(cx, cy, 5.5, fillColor=colors.white, strokeColor=blue, strokeWidth=1.2))
            drawing.add(Circle(cx, cy, 2.5, fillColor=None, strokeColor=blue, strokeWidth=0.8))
            drawing.add(Line(cx - 8, cy, cx + 8, cy, strokeColor=blue, strokeWidth=0.75))
            drawing.add(Line(cx, cy - 8, cx, cy + 8, strokeColor=blue, strokeWidth=0.75))
            drawing.add(String(cx, cy - 13, name, fontName='Helvetica-Bold', fontSize=9, textAnchor='middle', fillColor=blue))

    drawing.add(Line(width - 25, height - 36, width - 25, height - 14, strokeColor=colors.HexColor('#475569'), strokeWidth=0.9))
    drawing.add(Polygon([width - 25, height - 10, width - 29, height - 17, width - 21, height - 17], fillColor=colors.HexColor('#475569'), strokeColor=colors.HexColor('#475569')))
    drawing.add(String(width - 25, height - 7, 'N', fontName='Helvetica-Bold', fontSize=9, textAnchor='middle', fillColor=colors.HexColor('#475569')))
    return drawing

def _find_pdf_fonts():
    """Βρίσκει γραμματοσειρά με ελληνικά για τα PDF, σε Windows και σε Linux.

    Στα Windows χρησιμοποιεί την Arial. Στον Linux server (Oracle) τη Liberation Sans,
    που έχει ακριβώς τις ίδιες διαστάσεις με την Arial, οπότε οι αναφορές βγαίνουν ίδιες.
    Εγκατάσταση στον server: sudo apt install fonts-liberation fonts-dejavu-core
    Μπορείς να ορίσεις δικά σου αρχεία με PDF_FONT και PDF_FONT_BOLD στο .env.
    """
    candidates = [
        (os.getenv('PDF_FONT', ''), os.getenv('PDF_FONT_BOLD', '')),
        ('C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf'),
        ('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
         '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
        ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    ]
    for regular, bold in candidates:
        if regular and bold and os.path.isfile(regular) and os.path.isfile(bold):
            return regular, bold
    print("Προσοχή: δεν βρέθηκε γραμματοσειρά με ελληνικά για τα PDF (π.χ. fonts-liberation).")
    return 'arial.ttf', 'arialbd.ttf'


PDF_FONT_PATH, PDF_FONT_BOLD_PATH = _find_pdf_fonts()

try:
    pdfmetrics.registerFont(TTFont('ArialGreek', PDF_FONT_PATH))
    font_name = 'ArialGreek'
except:
    print("Προσοχή: Δεν βρέθηκε η γραμματοσειρά Arial. Τα Ελληνικά μπορεί να μην εμφανίζονται σωστά.")
    font_name = 'Helvetica'

IS_FROZEN = bool(getattr(sys, 'frozen', False))
SCRIPT_DIR = Path(__file__).resolve().parent
if IS_FROZEN:
    MEIPASS_DIR = getattr(sys, '_MEIPASS', None)
    BASE_DIR = Path(MEIPASS_DIR) if MEIPASS_DIR else SCRIPT_DIR
    EXECUTABLE_DIR = Path(sys.executable).resolve().parent
    ENV_FILE_CANDIDATES = []
    if MEIPASS_DIR:
        ENV_FILE_CANDIDATES.append(BASE_DIR / '.env')
    ENV_FILE_CANDIDATES.extend([EXECUTABLE_DIR / '.env', SCRIPT_DIR / '.env'])
    STATIC_FOLDER = BASE_DIR / 'frontend' / 'dist'
else:
    BASE_DIR = SCRIPT_DIR
    EXECUTABLE_DIR = SCRIPT_DIR
    ENV_FILE_CANDIDATES = [SCRIPT_DIR / '.env']
    STATIC_FOLDER = BASE_DIR.parent / 'frontend' / 'dist'

ENV_FILE_PATH = None
for env_file in ENV_FILE_CANDIDATES:
    if env_file.is_file():
        load_dotenv(env_file)
        ENV_FILE_PATH = env_file
        break

STATIC_FOLDER = STATIC_FOLDER.resolve()

LOGO_PATH = BASE_DIR / "assets" / "LASCA-logo-red-blue-1024.png"

if not LOGO_PATH.exists():
    print(f"Warning: Logo not found at {LOGO_PATH}")

app = Flask(__name__, static_folder=str(STATIC_FOLDER), static_url_path='')
# Πίσω από το nginx: παίρνουμε το σωστό https/domain από τις κεφαλίδες X-Forwarded-*
from werkzeug.middleware.proxy_fix import ProxyFix  # noqa: E402
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
IS_DEVELOPMENT = os.getenv('LASCA_ENV', '').strip().lower() == 'development'
_secret_key = os.getenv('SECRET_KEY', '').strip()
if len(_secret_key) < 32 or _secret_key in {'lasca-web-secret-key', 'change-me'}:
    if not IS_DEVELOPMENT:
        # Χωρίς δικό του μυστικό ο καθένας θα μπορούσε να πλαστογραφήσει cookies σύνδεσης.
        raise RuntimeError('SECRET_KEY λείπει ή είναι πολύ μικρό (>= 32 χαρακτήρες). '
                           'Φτιάξε ένα με: python3 -c "import secrets; print(secrets.token_hex(32))"')
    _secret_key = _secret_key or 'dev-only-insecure-secret-key-do-not-use-in-production'
app.config['SECRET_KEY'] = _secret_key
# Μέγιστο μέγεθος αιτήματος (projects, Excel, εικόνες). Τα επιμέρους όρια (π.χ. εικόνα προφίλ) είναι μικρότερα.
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_REQUEST_MB', '8')) * 1024 * 1024

# --- Cookies σύνδεσης ---
# COOKIE_SECURE=1 στον server (HTTPS). Τοπικά (http://localhost) πρέπει να είναι 0.
_cookie_secure = os.getenv('COOKIE_SECURE', '0').strip().lower() in {'1', 'true', 'yes'}
# Το πρόθεμα __Host- εγγυάται ότι το cookie μπήκε από αυτό το domain μέσω HTTPS (μόνο με Secure).
_cookie_prefix = '__Host-' if _cookie_secure else ''
app.config.update(
    SESSION_COOKIE_NAME=f'{_cookie_prefix}lasca_session',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    SESSION_COOKIE_SECURE=_cookie_secure,
    REMEMBER_COOKIE_NAME=f'{_cookie_prefix}lasca_remember',
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SAMESITE='Strict',
    REMEMBER_COOKIE_SECURE=_cookie_secure,
    REMEMBER_COOKIE_REFRESH_EACH_REQUEST=False,
    REMEMBER_COOKIE_DURATION=timedelta(days=min(int(os.getenv('REMEMBER_ME_DAYS', '30')), 90)),
    PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip()

sqlite_db_value = os.getenv('LASCA_SQLITE_DB') or str((BASE_DIR / 'lasca_data' / 'lasca.db').resolve())
if sqlite_db_value.startswith('sqlite'):
    db_uri = sqlite_db_value
    db_path = None
else:
    db_path = Path(sqlite_db_value).expanduser().resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_uri = f'sqlite:///{db_path.as_posix()}'
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = None

# ==========================================
# Ασφάλεια: κεφαλίδες, έλεγχος προέλευσης (CSRF), όρια αιτημάτων — βλ. code/security.py
# ==========================================
from security import build_csp, init_api_throttle, init_origin_guard, init_security_headers, origin_of  # noqa: E402

_analytics_origin = origin_of(os.getenv('ANALYTICS_ORIGIN', '').strip())
# Clerk: το Frontend API του (από το CLERK_PUBLISHABLE_KEY, π.χ. clerk.lasca.gr) φορτώνει το script της σύνδεσης
# και μιλάει με τον browser· *.protect.clerk.com = προστασία από bots. Βλ. οδηγίες CSP του Clerk.
from clerk_auth import _frontend_api_host  # noqa: E402
_clerk_fapi = f'https://{_frontend_api_host()}' if _frontend_api_host() else None
# Με ρυθμισμένο Clerk, ΜΟΝΟ το Clerk συνδέει χρήστες στη σελίδα. Τα παλιά endpoints (κωδικός/Google/2FA της
# lasca.db) και τα παλιά cookies σύνδεσης κλείνουν: αλλιώς ένας παλιός κωδικός θα δούλευε ακόμα κι αφού ο
# χρήστης τον άλλαξε στο Clerk, και το «2FA» του Προφίλ δεν θα προστάτευε τη σύνδεση μέσω Clerk.
# Το exe συνεχίζει κανονικά (σύνδεση μέσω browser → κλειδί συσκευής). LEGACY_AUTH=1 μόνο για έκτακτη ανάγκη.
CLERK_ONLY = bool(_clerk_fapi or os.getenv('CLERK_JWKS_URL', '').strip()) \
    and os.getenv('LEGACY_AUTH', '').strip() != '1'
APP_CSP = build_csp({
    'script-src': ['https://accounts.google.com/gsi/client', 'https://challenges.cloudflare.com', _analytics_origin,
                   _clerk_fapi, 'https://*.protect.clerk.com'],
    'style-src': ['https://accounts.google.com/gsi/style'],
    'frame-src': ['https://accounts.google.com/gsi/', 'https://challenges.cloudflare.com', 'https://*.protect.clerk.com'],
    'connect-src': ['https://accounts.google.com/gsi/', _analytics_origin, _clerk_fapi,
                    'https://*.protect.clerk.com:*', 'https://clerk-telemetry.com'],
    'img-src': ['https://*.tile.openstreetmap.org', 'https://*.googleusercontent.com', 'https://img.clerk.com'],
}, upgrade_insecure=_cookie_secure)
# same-origin-allow-popups: χρειάζεται το παράθυρο σύνδεσης του Google
init_security_headers(app, csp=APP_CSP, hsts=_cookie_secure, coop='same-origin-allow-popups')


def _allowed_origins():
    allowed = {origin_of(request.host_url)}
    for value in [os.getenv('PUBLIC_URL', '')] + os.getenv('ALLOWED_ORIGINS', '').split(','):
        if origin_of(value.strip()):
            allowed.add(origin_of(value.strip()))
    if IS_DEVELOPMENT:
        allowed |= {'http://localhost:5173', 'http://127.0.0.1:5173'}
    return allowed


init_origin_guard(app, _allowed_origins)

# Δοκιμαστική περίοδος: με TEAM_GATE_PASSWORD στο .env όλη η σελίδα ζητάει πρώτα τον κωδικό της ομάδας.
from team_gate import init_team_gate  # noqa: E402
TEAM_GATE_ON = init_team_gate(app, _allowed_origins, lambda: PUBLIC_API_PATHS)

_AUTH_PREFIXES = ('/api/login', '/api/register', '/api/auth/')
_LIGHT_PREFIXES = ('/api/projects', '/api/me', '/api/users', '/api/invites', '/api/auth', '/api/login',
                   '/api/register', '/api/logout', '/api/feedback', '/api/desktop-link')
API_THROTTLE_RULES = [
    # (όνομα, ταίριασμα, όριο, παράθυρο σε δευτ., ανά)
    ('api', lambda p, m: True, 600, 60, 'ip'),
    ('auth', lambda p, m: m == 'POST' and p.startswith(_AUTH_PREFIXES), 40, 900, 'ip'),
    ('compute', lambda p, m: m == 'POST' and not p.startswith(_LIGHT_PREFIXES), 60, 60, 'user'),
    ('feedback', lambda p, m: p == '/api/feedback', 5, 3600, 'user'),
    ('profile', lambda p, m: p == '/api/me' and m in ('PUT', 'DELETE'), 20, 3600, 'user'),
    ('password', lambda p, m: p == '/api/me/password', 10, 900, 'user'),
    ('lookup', lambda p, m: p == '/api/users/lookup', 60, 600, 'user'),
    ('invites', lambda p, m: m == 'POST' and '/invite' in p, 30, 3600, 'user'),
    ('new_project', lambda p, m: m == 'POST' and p == '/api/projects', 30, 3600, 'user'),
    # Το exe ρωτάει κάθε 2″ αν εγκρίθηκε η σύνδεση (έως 10′): χωριστό, άνετο όριο ανά IP.
    ('desktop_poll', lambda p, m: p == '/api/desktop-link/poll', 240, 60, 'ip'),
]


def _throttle_user_key():
    try:
        return f'u{current_user.id}' if current_user.is_authenticated else None
    except Exception:
        return None


init_api_throttle(app, API_THROTTLE_RULES, user_key=_throttle_user_key,
                  enabled=os.getenv('API_THROTTLE', '1').strip() != '0')

logger = logging.getLogger(__name__)
logger.handlers.clear()
log_formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logger.addHandler(console_handler)
if IS_FROZEN:
    app_data_dir = os.environ.get('LOCALAPPDATA') or os.environ.get('APPDATA')
    log_dir = os.path.join(app_data_dir or str(Path.home()), 'LASCA')
else:
    log_dir = str(EXECUTABLE_DIR)
os.makedirs(log_dir, exist_ok=True)
file_handler = logging.FileHandler(os.path.join(log_dir, 'lasca_app.log'), encoding='utf-8')
file_handler.setFormatter(log_formatter)
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)
logger.propagate = False
logger.info('Environment file loaded: %s', ENV_FILE_PATH or 'none found')


def _mask_secret(value: str | None) -> str:
    if not value:
        return '<missing>'
    if len(value) <= 8:
        return '*' * len(value)
    return f'{value[:4]}...{value[-4:]}'


logger.info('Startup RESEND_API_KEY=%s NOTIFICATION_EMAIL=%s', 'set' if os.getenv('RESEND_API_KEY') else '<missing>', 'set' if os.getenv('NOTIFICATION_EMAIL') else '<missing>')
FEEDBACK_TYPES = {'bug', 'feature', 'general'}
ALLOWED_FEEDBACK_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
if IS_FROZEN:
    feedback_upload_default = Path(log_dir) / 'feedback_uploads'
    feedback_log_default = Path(log_dir) / 'feedback.jsonl'
    FEEDBACK_UPLOAD_FOLDER = feedback_upload_default
    FEEDBACK_LOG_FILE = feedback_log_default
else:
    FEEDBACK_UPLOAD_FOLDER = Path(
        os.getenv(
            'FEEDBACK_UPLOAD_FOLDER',
            os.getenv('UPLOAD_FOLDER', str(BASE_DIR / 'feedback_uploads')),
        )
    ).expanduser().resolve()
    FEEDBACK_LOG_FILE = Path(
        os.getenv('FEEDBACK_LOG_FILE', str(FEEDBACK_UPLOAD_FOLDER / 'feedback.jsonl'))
    ).expanduser().resolve()
logger.info('Feedback upload folder: %s', FEEDBACK_UPLOAD_FOLDER)
logger.info('Feedback log file: %s', FEEDBACK_LOG_FILE)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
if resend is not None:
    resend.api_key = os.environ.get('RESEND_API_KEY')

LASCA_DATA = Path(os.getenv('LASCA_DATA', str(Path.home() / 'LASCA_DATA'))).expanduser().resolve()
LASCA_DATA.mkdir(parents=True, exist_ok=True)
USER_AVATAR_DIR = LASCA_DATA / 'avatars'
USER_AVATAR_DIR.mkdir(parents=True, exist_ok=True)


# Έκδοση των Όρων χρήσης (ίδια με το TERMS_VERSION στο frontend/src/site.js). Όταν αλλάζουν ουσιαστικά οι Όροι,
# αλλάζει και αυτή: όσοι είχαν αποδεχτεί παλαιότερη βλέπουν τους νέους και τους αποδέχονται ξανά.
TERMS_VERSION = '2026-10-14'


def avatar_signature(user_id, version):
    import hmac as _hmac
    msg = f'avatar:{int(user_id)}:{int(version)}'.encode()
    return _hmac.new(app.config['SECRET_KEY'].encode(), msg, hashlib.sha256).hexdigest()[:32]


class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(150), nullable=False, default='')
    avatar_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Αυξάνεται σε «Αποσύνδεση από όλες τις συσκευές» / αλλαγή κωδικού: ακυρώνει όλα τα
    # παλιά cookies σύνδεσης (και τα «Να με θυμάσαι») χωρίς να ξέρουμε ποια είναι.
    session_version = db.Column(db.Integer, nullable=False, default=0)
    # False για λογαριασμούς που φτιάχτηκαν με Google (δεν ξέρουν κωδικό).
    has_password = db.Column(db.Boolean, nullable=False, default=True)
    last_seen_at = db.Column(db.DateTime, nullable=True)
    # Ασφάλεια λογαριασμού (βλ. auth_security.py)
    totp_enabled = db.Column(db.Boolean, nullable=False, default=False)
    totp_secret_enc = db.Column(db.Text, nullable=True)      # κρυπτογραφημένο (Fernet)
    totp_pending_enc = db.Column(db.Text, nullable=True)     # κατά τη ρύθμιση, πριν επιβεβαιωθεί
    totp_last_step = db.Column(db.Integer, nullable=True)    # ένας κωδικός TOTP δεν ξαναπερνάει
    backup_codes = db.Column(db.Text, nullable=True)         # JSON με hashes εφεδρικών κωδικών
    terms_accepted_at = db.Column(db.DateTime, nullable=True)
    age_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    password_changed_at = db.Column(db.DateTime, nullable=True)
    twofa_method = db.Column(db.String(10), nullable=False, default='totp')   # totp | email
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    # Ποια έκδοση των Όρων αποδέχτηκε (βλ. TERMS_VERSION). Παλαιότερη → ζητάμε ξανά αποδοχή.
    terms_version = db.Column(db.String(20), nullable=True)
    school = db.Column(db.String(120), nullable=True)      # προαιρετικό (εγγραφή / Προφίλ)
    company = db.Column(db.String(120), nullable=True)     # προαιρετικό
    # Clerk ID is the external identity; keep the legacy database column name for existing installs.
    clerk_id = db.Column('clerk_user_id', db.String(255), nullable=True, unique=True, index=True)
    clerk_user_id = synonym('clerk_id')

    def get_id(self):
        return f"{self.id}:{self.session_version or 0}"

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def avatar_url(self):
        if not self.avatar_path:
            return None
        try:
            # Σταθερό όσο δεν αλλάζει η εικόνα (ο browser/το exe την κρατάει στην cache), νέο μόλις αλλάξει.
            version = int(Path(self.avatar_path).stat().st_mtime_ns // 1000)
        except OSError:
            return None
        # Υπογραφή: τη διεύθυνση την παίρνουν μόνο όσοι βλέπουν τον χρήστη (ο ίδιος, συνεργάτες). Χωρίς αυτήν
        # ο καθένας θα κατέβαζε όλες τις φωτογραφίες προφίλ μετρώντας ids (/api/users/1/avatar, /2/avatar...).
        return f'/api/users/{self.id}/avatar?v={version}&s={avatar_signature(self.id, version)}'

    def to_public_dict(self):
        display_name = (self.display_name or '').strip() or self.email.split('@', 1)[0]
        return {
            'id': self.id,
            'email': self.email,
            'display_name': display_name,
            'avatar_url': self.avatar_url,
        }

    def to_me_dict(self):
        data = self.to_public_dict()
        data['has_password'] = bool(self.has_password)
        data['two_factor_enabled'] = bool(self.totp_enabled)
        data['email_verified'] = bool(self.email_verified)
        data['school'] = self.school or ''
        data['company'] = self.company or ''
        data['terms_version'] = self.terms_version
        data['terms_current'] = self.terms_version == TERMS_VERSION
        data['created_at'] = self.created_at.isoformat() + 'Z' if self.created_at else None
        return data


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Σταθερό αναγνωριστικό για links πρόσκλησης και για το exe (δεν αλλάζει με μετονομασία).
    public_id = db.Column(db.String(32), unique=True, index=True, default=lambda: secrets.token_urlsafe(9))
    # Αυξάνεται σε κάθε αποθήκευση: έτσι καταλαβαίνουμε αν κάποιος άλλος άλλαξε το project.
    version = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, nullable=True)
    updated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    # Αναγνωριστικό ανεβάσματος από το exe: αν το ίδιο ανέβασμα ξαναγίνει (π.χ. μετά από timeout),
    # επιστρέφεται το ίδιο project αντί για διπλό.
    client_ref = db.Column(db.String(40), nullable=True, index=True)
    owner = db.relationship('User', foreign_keys=[owner_id], backref=db.backref('owned_projects', lazy=True))
    updated_by = db.relationship('User', foreign_keys=[updated_by_id])


class ProjectMember(db.Model):
    __tablename__ = 'project_members'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='editor')
    added_at = db.Column(db.DateTime, nullable=True, default=datetime.utcnow)
    added_by_id = db.Column(db.Integer, nullable=True)
    project = db.relationship('Project', backref=db.backref('members', lazy=True))
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('project_memberships', lazy=True))

    __table_args__ = (db.UniqueConstraint('project_id', 'user_id', name='uq_project_user_member'),)


class ProjectInvite(db.Model):
    """Σύνδεσμος πρόσκλησης: όποιος τον ανοίξει (με λογαριασμό) μπαίνει στο project."""
    __tablename__ = 'project_invites'
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False, default='editor')
    created_by_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    max_uses = db.Column(db.Integer, nullable=True)
    uses = db.Column(db.Integer, nullable=False, default=0)
    revoked = db.Column(db.Boolean, nullable=False, default=False)


class ProjectActivity(db.Model):
    """Ιστορικό: ποιος έκανε τι σε ένα project."""
    __tablename__ = 'project_activity'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True)
    action = db.Column(db.String(40), nullable=False)
    detail = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    # Μόνο στην τελευταία «συνεδρία αλλαγών»: τα δεδομένα πριν ξεκινήσει (για το λεπτομερές ιστορικό).
    snapshot = db.Column(db.Text, nullable=True)


class ProjectRead(db.Model):
    """Μέχρι ποια εγγραφή του ιστορικού έχει δει κάθε χρήστης (για τις ειδοποιήσεις «νέες αλλαγές»)."""
    __tablename__ = 'project_reads'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    last_seen_id = db.Column(db.Integer, nullable=False, default=0)
    __table_args__ = (db.UniqueConstraint('project_id', 'user_id', name='uq_read_project_user'),)


class DesktopLogin(db.Model):
    """Σύνδεση του exe μέσω browser (Google, κωδικός, 2FA): αίτημα που εγκρίνει ο χρήστης στη σελίδα.

    Το exe κρατάει ένα μυστικό και στέλνει εδώ μόνο το hash του (challenge). Ο σύνδεσμος που ανοίγει
    στον browser (request_id) δεν αρκεί για να πάρει κανείς το κλειδί: χρειάζεται και το μυστικό."""
    __tablename__ = 'desktop_logins'
    id = db.Column(db.Integer, primary_key=True)
    request_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    challenge = db.Column(db.String(64), nullable=False)
    user_code = db.Column(db.String(9), nullable=False)
    device_name = db.Column(db.String(120), nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, nullable=True, index=True)       # ποιος ενέκρινε
    approved_at = db.Column(db.DateTime, nullable=True)
    denied = db.Column(db.Boolean, nullable=False, default=False)


class ProjectPresence(db.Model):
    """Ποιος έχει ανοιχτό το project αυτή τη στιγμή και σε ποιο εργαλείο."""
    __tablename__ = 'project_presence'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tool = db.Column(db.String(40), nullable=True)
    client = db.Column(db.String(20), nullable=True)
    seen_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('project_id', 'user_id', name='uq_presence_project_user'),)


class DeviceToken(db.Model):
    """Κλειδί σύνδεσης για το πρόγραμμα των Windows (exe). Αποθηκεύεται μόνο το hash του."""
    __tablename__ = 'device_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)


class AuthEvent(db.Model):
    """Γεγονότα ασφαλείας: συνδέσεις, αποτυχίες, 2FA, επαναφορές κωδικού (κρατιούνται 90 ημέρες)."""
    __tablename__ = 'auth_events'
    id = db.Column(db.Integer, primary_key=True)
    event = db.Column(db.String(40), nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    ip = db.Column(db.String(64), nullable=True, index=True)
    user_agent = db.Column(db.String(200), nullable=True)
    detail = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)


class RateHit(db.Model):
    """Μετρητής ορίων (κοινός για όλους τους workers του gunicorn)."""
    __tablename__ = 'rate_hits'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    __table_args__ = (db.Index('ix_rate_hits_key_time', 'key', 'created_at'),)


class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    ip = db.Column(db.String(64), nullable=True)


class EmailOtp(db.Model):
    __tablename__ = 'email_otps'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    purpose = db.Column(db.String(20), nullable=False, default='login')
    code_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    used = db.Column(db.Boolean, nullable=False, default=False)


DEVICE_TOKEN_IDLE_DAYS = int(os.getenv('DEVICE_TOKEN_IDLE_DAYS', '90'))


def hash_device_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


@login_manager.user_loader
def load_user(user_id):
    # Με Clerk τα cookies σύνδεσης της lasca.db (και τα «Να με θυμάσαι» έως 90 ημερών από πριν το Clerk)
    # δεν συνδέουν κανέναν: η ταυτότητα έρχεται μόνο από το token του Clerk ή από κλειδί συσκευής.
    if CLERK_ONLY:
        return None
    # Το id στο cookie είναι «id:έκδοση». Αν η έκδοση άλλαξε (αποσύνδεση από όλες τις
    # συσκευές ή αλλαγή κωδικού), το παλιό cookie δεν ισχύει πια.
    raw_id, _, raw_version = str(user_id).partition(':')
    try:
        user = db.session.get(User, int(raw_id))
    except (TypeError, ValueError):
        return None
    if user is None:
        return None
    # Χωρίς «:έκδοση» (παλιά cookies) ή με παλιά έκδοση: η σύνδεση δεν ισχύει.
    if str(user.session_version or 0) != raw_version:
        return None
    return user


@login_manager.request_loader
def load_user_from_bearer_token(req):
    """Load a user from a desktop device token or a Clerk bearer token."""
    header = req.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None
    token = header[7:].strip()
    if not token:
        return None
    resolution = getattr(g, 'clerk_user_resolution', None)
    if resolution is None:
        resolution = _resolve_clerk_user(token)
        g.clerk_user_resolution = resolution
    if resolution[0] is not None:
        return resolution[0]

    if len(token) <= 200:
        record = DeviceToken.query.filter_by(token_hash=hash_device_token(token)).first()
        if record is not None:
            now = datetime.utcnow()
            # Κλειδί που δεν χρησιμοποιήθηκε για DEVICE_TOKEN_IDLE_DAYS ημέρες λήγει.
            if (now - (record.last_used_at or record.created_at or now)).days > DEVICE_TOKEN_IDLE_DAYS:
                db.session.delete(record)
                db.session.commit()
            else:
                if record.last_used_at is None or (now - record.last_used_at).total_seconds() > 300:
                    record.last_used_at = now
                    db.session.commit()
                return db.session.get(User, record.user_id)

    return None


# Endpoints που επιτρέπονται χωρίς σύνδεση. Όλα τα υπόλοιπα /api/* (υπολογισμοί,
# αναφορές, projects) θέλουν συνδεδεμένο χρήστη, ώστε κανείς να μην μπορεί να
# χρησιμοποιεί τον server ή να γράφει σε φακέλους projects χωρίς λογαριασμό.
PUBLIC_API_PATHS = {
    '/api/login', '/api/register', '/api/logout', '/api/me',
    '/api/auth/config', '/api/auth/google', '/api/auth/device-token',
    '/api/auth/2fa/verify', '/api/auth/2fa/email', '/api/auth/forgot', '/api/auth/reset',
    '/api/auth/reset/check', '/api/auth/password-check', '/api/auth/verify-email',
    '/api/auth/desktop/start', '/api/desktop-link/poll', '/api/auth/resend-verification',
    '/api/clerk/webhook',   # υπογραφή Svix (code/clerk_sync.py)
}
UNVERIFIED_ALLOWED = {'/api/me/verify-email', '/api/me/accept-terms', '/api/me/security-events'}
# Η προεπισκόπηση ενός link πρόσκλησης (GET) φαίνεται και χωρίς σύνδεση.
PUBLIC_API_PREFIXES_GET = ('/api/invites/',)


def authenticate_bearer_request():
    """Resolve Bearer auth before API access checks using Flask-Login's request loader."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        session.pop('_user_id', None)
        session.pop('_fresh', None)
        remember_cookie_name = app.config.get('REMEMBER_COOKIE_NAME', 'remember_token')
        if remember_cookie_name in request.cookies:
            session['_remember'] = 'clear'
        token = auth_header[7:].strip()
        g.clerk_user_resolution = _resolve_clerk_user(token)
        # Accessing current_user invokes the request loader without creating a persistent session cookie.
        current_user.is_authenticated


# ΠΡΩΤΟ απ' όλους τους ελέγχους: το όριο αιτημάτων (init_api_throttle) και η «πόρτα» διαβάζουν το current_user.
# Αν το διάβαζαν πριν από εδώ, ένα παλιό cookie «να με θυμάσαι» (από τη σύνδεση πριν το Clerk) έκανε το
# Flask-Login να μην κοιτάξει καθόλου το token του Clerk· ο χρήστης έμενε «ανώνυμος» για όλο το αίτημα και οι
# υπολογισμοί (POST) έπαιρναν 401, οπότε η σελίδα τον έβγαζε έξω. Η ανώνυμη περιήγηση (χωρίς cookies) δούλευε.
app.before_request_funcs.setdefault(None, []).insert(0, authenticate_bearer_request)


@app.before_request
def require_login_for_api():
    if request.method == 'OPTIONS':
        return None
    if request.method == 'GET' and request.path.startswith(PUBLIC_API_PREFIXES_GET) \
            and not request.path.endswith('/accept'):
        return None
    is_public_avatar = request.method == 'GET' and re.fullmatch(r'/api/users/\d+/avatar', request.path)
    if request.path.startswith('/api/') and request.path not in PUBLIC_API_PATHS and not is_public_avatar \
            and not current_user.is_authenticated:
        return jsonify({"error": "Απαιτείται σύνδεση"}), 401
    # Λογαριασμός χωρίς επιβεβαιωμένο email (π.χ. φτιάχτηκε πριν γίνει υποχρεωτική η επιβεβαίωση):
    # μόνο τα απαραίτητα (ποιος είμαι, νέο email επιβεβαίωσης, αποσύνδεση, διαγραφή λογαριασμού).
    if request.path.startswith('/api/') and current_user.is_authenticated and not current_user.email_verified \
            and email_verification_required() and request.path not in PUBLIC_API_PATHS \
            and request.path not in UNVERIFIED_ALLOWED and not (request.path == '/api/me' and request.method == 'DELETE'):
        return jsonify({"error": "Επιβεβαίωσε πρώτα το email σου. Σου στείλαμε σύνδεσμο.", "code": "email_unverified"}), 403
    # Υπολογισμοί/εξαγωγές που αναφέρουν project (header, ?project=, form, JSON): έλεγχος πρόσβασης
    # ΠΡΙΝ τρέξει ο κώδικας, ώστε κανείς να μη διαβάζει/γράφει αρχεία project άλλου χρήστη (IDOR).
    if request.path.startswith('/api/') and not request.path.startswith(_PROJECT_API_PREFIXES):
        project_name = get_active_project_name()
        if project_name:
            try:
                get_request_project_dir(project_name)
            except PermissionError:
                return jsonify({"error": "Δεν έχετε πρόσβαση σε αυτό το project"}), 403
            except ValueError:
                return jsonify({"error": "Μη έγκυρο όνομα project"}), 400
    return None


# Παλιά σύνδεση της lasca.db (πριν το Clerk): εγγραφή/κωδικός/Google/2FA/επαναφορά κωδικού. Με Clerk κλείνουν
# (βλ. CLERK_ONLY). Η σελίδα δεν τα χρησιμοποιεί πια· το exe συνδέεται μέσω browser (/api/auth/desktop/*).
LEGACY_AUTH_PATHS = {
    '/api/register', '/api/login', '/api/auth/google', '/api/auth/2fa/verify', '/api/auth/2fa/email',
    '/api/auth/forgot', '/api/auth/reset', '/api/auth/reset/check', '/api/auth/password-check',
    '/api/auth/verify-email', '/api/auth/resend-verification', '/api/me/password', '/api/me/verify-email',
}
LEGACY_AUTH_PREFIXES = ('/api/me/2fa',)


@app.before_request
def block_legacy_auth():
    if not CLERK_ONLY or not request.path.startswith('/api/'):
        return None
    path = request.path.rstrip('/')
    legacy = path in LEGACY_AUTH_PATHS or path.startswith(LEGACY_AUTH_PREFIXES) \
        or (path == '/api/auth/device-token' and request.method == 'POST')
    if legacy:
        return jsonify({"error": "Η σύνδεση γίνεται πλέον μόνο μέσω του λογαριασμού LASCA (Clerk).",
                        "code": "legacy_auth_disabled"}), 410
    return None


# Αυτά τα routes ελέγχουν μόνα τους τα δικαιώματα (collab.py / auth_security.py).
_PROJECT_API_PREFIXES = ('/api/projects/list', '/api/projects/load', '/api/projects/save', '/api/me',
                         '/api/users', '/api/invites', '/api/auth', '/api/login', '/api/register', '/api/logout')


def _migrate_schema():
    """Προσθέτει στη βάση τις νέες στήλες (το create_all φτιάχνει μόνο νέους πίνακες)."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    wanted = {
        'users': [
            ('session_version', 'INTEGER NOT NULL DEFAULT 0'),
            ('has_password', 'BOOLEAN NOT NULL DEFAULT 1'),
            ('last_seen_at', 'DATETIME'),
            ('totp_enabled', 'BOOLEAN NOT NULL DEFAULT 0'),
            ('totp_secret_enc', 'TEXT'),
            ('totp_pending_enc', 'TEXT'),
            ('totp_last_step', 'INTEGER'),
            ('backup_codes', 'TEXT'),
            ('terms_accepted_at', 'DATETIME'),
            ('age_confirmed', 'BOOLEAN NOT NULL DEFAULT 0'),
            ('password_changed_at', 'DATETIME'),
            ('twofa_method', "VARCHAR(10) NOT NULL DEFAULT 'totp'"),
            ('email_verified', 'BOOLEAN NOT NULL DEFAULT 0'),
            ('terms_version', 'VARCHAR(20)'),
            ('school', 'VARCHAR(120)'),
            ('company', 'VARCHAR(120)'),
            ('clerk_user_id', 'VARCHAR(255)'),
        ],
        'projects': [
            ('public_id', 'VARCHAR(32)'),
            ('version', 'INTEGER NOT NULL DEFAULT 0'),
            ('updated_at', 'DATETIME'),
            ('updated_by_id', 'INTEGER'),
            ('client_ref', 'VARCHAR(40)'),
        ],
        'project_members': [
            ('added_at', 'DATETIME'),
            ('added_by_id', 'INTEGER'),
        ],
        'project_activity': [
            ('snapshot', 'TEXT'),
        ],
    }
    with db.engine.begin() as conn:
        for table, columns in wanted.items():
            existing = {c['name'] for c in inspector.get_columns(table)}
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
        conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_projects_public_id ON projects (public_id)'))
        conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_clerk_user_id ON users (clerk_user_id)'))
    # Projects από πριν την αλλαγή: παίρνουν public_id
    changed = False
    for project in Project.query.filter(Project.public_id.is_(None)).all():
        project.public_id = secrets.token_urlsafe(9)
        changed = True
    if changed:
        db.session.commit()


with app.app_context():
    db.create_all()
    _migrate_schema()


def normalize_email(value):
    return (value or '').strip().lower()


def user_project_role(user, project):
    """owner | editor | viewer | None"""
    if user is None or project is None:
        return None
    if project.owner_id == user.id:
        return 'owner'
    member = ProjectMember.query.filter_by(project_id=project.id, user_id=user.id).first()
    return member.role if member else None


def user_has_project_access(user, project):
    return user_project_role(user, project) is not None


def project_record_by_name(project_name):
    if not project_name:
        return None
    name = str(project_name).strip()
    project = Project.query.filter_by(name=name).first()
    if project is not None:
        return project
    # Αναζήτηση χωρίς διάκριση κεφαλαίων/πεζών. Γίνεται στην Python και όχι με το
    # lower() της SQLite, γιατί εκείνο δεν μετατρέπει ελληνικά (π.χ. «Άσκηση» ≠ «άσκηση»),
    # οπότε ένα project με ελληνικό όνομα δεν βρισκόταν ποτέ.
    target = name.casefold()
    for candidate in Project.query.all():
        if candidate.name.casefold() == target:
            return candidate
    return None


def project_access_error(project_name):
    return jsonify({"error": f"Δεν έχετε πρόσβαση στο project '{project_name}'"}), 403


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


from reportlab.pdfgen import canvas

class UniversalNumberedCanvas(canvas.Canvas):
    """
    Universal canvas για ReportLab με υποστήριξη 2 περασμάτων (Page X of Y),
    δυναμικό τίτλο αναφοράς, λογότυπο (εικονίδιο + κείμενο LASCA) και υποσέλιδο.
    """
    def __init__(self, *args, 
                 doc_title="Αυτοματοποιημένη Αναφορά LASCA", 
                 font_name='Helvetica', 
                 font_bold_name='Helvetica-Bold', 
                 timestamp_str='', 
                 logo_path=None, 
                 **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = doc_title
        self.font_name = font_name
        self.font_bold_name = font_bold_name
        self.timestamp_str = timestamp_str
        self.logo_path = logo_path

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        from reportlab.lib import colors
        from reportlab.lib.utils import ImageReader

        self.saveState()
        
        page_width, page_height = self._pagesize
        
        # ==========================================
        # ΕΥΚΟΛΕΣ ΡΥΘΜΙΣΕΙΣ (Άλλαξε αυτά τα νούμερα και δες το αποτέλεσμα live)
        # ==========================================
        ICON_HEIGHT = 34           # Ύψος του εικονιδίου (34 αντί για 40 για να είναι πιο κομψό)
        GAP_ICON_LASCA = -4        # Βάλε αρνητικό (π.χ. -5 ή -10) αν η εικόνα έχει διάφανο φόντο και θέλεις το LASCA πιο κοντά!
        GAP_LASCA_TITLE = 16       # Το (μεγαλύτερο) κενό ανάμεσα στο "LASCA" και τον τίτλο
        FONT_SIZE_LASCA = 18       # Μέγεθος γραμμάτων για το "LASCA"
        FONT_SIZE_TITLE = 10       # Μέγεθος γραμμάτων για τον τίτλο
        # ==========================================
        
        # Το κοινό Y (baseline) που πατάνε ΚΑΙ το "LASCA" ΚΑΙ ο Τίτλος για να είναι σε ΑΠΟΛΥΤΗ ευθεία κάτω
        header_y = page_height - 35 
        current_x = 30
        
        # --- 1. Σχεδίαση Λογότυπου ---
        if self.logo_path:
            try:
                img = ImageReader(self.logo_path)
                orig_w, orig_h = img.getSize()
                
                icon_width = ICON_HEIGHT * (orig_w / float(orig_h))
                
                # Το κατεβάζουμε λίγο (κατά 8) για να ευθυγραμμιστεί η "κοιλιά" του εικονιδίου με τα γράμματα
                icon_y = header_y - 8 
                
                self.drawImage(self.logo_path, current_x, icon_y, width=icon_width, height=ICON_HEIGHT, mask='auto')
                
                # Μετακινούμε τον "κέρσορα" δεξιά για να ξεκινήσει το LASCA (εδώ εφαρμόζεται το GAP_ICON_LASCA)
                current_x += icon_width + GAP_ICON_LASCA  
            except Exception as e:
                print(f"Δεν ήταν δυνατή η φόρτωση του λογότυπου: {e}")
        
        # --- 2. Σχεδίαση του "LASCA" ---
        self.setFont(self.font_bold_name, FONT_SIZE_LASCA) 
        self.setFillColor(colors.black)
        self.drawString(current_x, header_y, "LASCA")
        
        lasca_width = self.stringWidth("LASCA", self.font_bold_name, FONT_SIZE_LASCA) 
        
        # Προσθέτουμε το μεγάλο κενό που ζήτησες μετά το LASCA
        current_x += lasca_width + GAP_LASCA_TITLE 
        
        # --- 3. Σχεδίαση του Υπόλοιπου Τίτλου ---
        self.setFillColor(colors.HexColor('#475569')) 
        clean_title = self.doc_title.replace("LASCA", "").strip()
        
        if clean_title:
            self.setFont(self.font_name, FONT_SIZE_TITLE)
            # Τυπώνεται ΑΚΡΙΒΩΣ στο ίδιο header_y με το LASCA (τέλεια ευθυγράμμιση βάσης)
            self.drawString(current_x, header_y, clean_title)
        
        # --- 4. Αριθμός Σελίδας ---
        self.setFont(self.font_name, 10)
        self.setFillColor(colors.HexColor('#475569'))
        page_str = f"Σελίδα {self._pageNumber} από {page_count}"
        self.drawRightString(page_width - 30, header_y, page_str)
        
        # Διαχωριστική γραμμή κεφαλίδας
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(1)
        self.line(30, header_y - 12, page_width - 30, header_y - 12)
        
        # --- 5. Κάτω Υποσέλιδο (Footer) ---
        self.setFont(self.font_name, 8)
        self.setLineWidth(0.75)
        self.line(30, 35, page_width - 30, 35)
        
        if self.timestamp_str:
            self.drawString(30, 22, f"{self.timestamp_str}")
        
        self.restoreState()

SPA_ROUTES = {'/', '/login', '/signup', '/app', '/profile', '/forgot-password', '/reset-password',
              '/verify-email', '/privacy', '/terms', '/cookies'}
SPA_PREFIXES = ('/invite/', '/desktop-login/')
PUBLIC_PAGES = [('/', 'weekly', '1.0'), ('/signup', 'monthly', '0.8'), ('/login', 'monthly', '0.6'),
                ('/privacy', 'yearly', '0.3'), ('/terms', 'yearly', '0.3'), ('/cookies', 'yearly', '0.2')]


def _site_base():
    return (os.getenv('PUBLIC_URL', '').strip() or request.host_url).rstrip('/')


def _spa_index(status=200):
    index = Path(app.static_folder) / 'index.html'
    if index.is_file():
        resp = send_from_directory(app.static_folder, 'index.html')
        resp.headers['Cache-Control'] = 'no-cache'
    else:  # δεν έχει γίνει ακόμα «npm run build»
        resp = Response('<!doctype html><title>LASCA</title><div id="root"></div>', mimetype='text/html')
    resp.status_code = status
    return resp


@app.route('/')
def serve_index():
    return _spa_index()


@app.route('/license.txt')
def license_txt():
    # Η άδεια χρήσης (το LICENSE του repo), για το παράθυρο «Άδεια χρήσης» της σελίδας.
    path = Path(__file__).resolve().parent.parent / 'LICENSE'
    if not path.is_file():
        return Response('', status=404, mimetype='text/plain')
    return Response(path.read_text(encoding='utf-8-sig'), mimetype='text/plain',
                    headers={'Cache-Control': 'public, max-age=3600'})


@app.route('/robots.txt')
def robots_txt():
    body = ('User-agent: *\n'
            'Allow: /$\nAllow: /signup\nAllow: /login\nAllow: /privacy\nAllow: /terms\nAllow: /cookies\n'
            'Disallow: /app\nDisallow: /profile\nDisallow: /invite/\nDisallow: /desktop-login/\nDisallow: /reset-password\n'
            'Disallow: /forgot-password\nDisallow: /verify-email\nDisallow: /api/\n\n'
            f'Sitemap: {_site_base()}/sitemap.xml\n')
    return Response(body, mimetype='text/plain', headers={'Cache-Control': 'public, max-age=86400'})


@app.route('/sitemap.xml')
def sitemap_xml():
    base = escape(_site_base())
    urls = ''.join(f'<url><loc>{base}{path}</loc><changefreq>{freq}</changefreq><priority>{prio}</priority></url>'
                   for path, freq, prio in PUBLIC_PAGES)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    return Response(xml, mimetype='application/xml', headers={'Cache-Control': 'public, max-age=86400'})


@app.errorhandler(404)
def not_found(e):
    # Άγνωστο API route -> JSON 404. Γνωστές σελίδες (/login, /app, ...) τις χειρίζεται το React
    # Router (200). Οτιδήποτε άλλο: η σελίδα 404 της εφαρμογής, με πραγματικό status 404.
    if request.path.startswith('/api/'):
        return jsonify({"error": "Δεν βρέθηκε"}), 404
    path = request.path.rstrip('/') or '/'
    return _spa_index(200 if (path in SPA_ROUTES or path.startswith(SPA_PREFIXES)) else 404)


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(e):
    return jsonify({"error": "Το αρχείο ή τα δεδομένα είναι πολύ μεγάλα."}), 413


def _feedback_error(message: str, status_code: int):
    return jsonify({'status': 'error', 'message': message}), status_code


_PATH_RE = re.compile(r'(?:[A-Za-z]:\\|/(?:srv|home|root|usr|var|tmp|opt|Users)/)[^\s"\'<>]*')


_GREEK_RE = re.compile(r'[Ͱ-Ͽἀ-῿]')
_TECH_RE = re.compile(r'[A-Za-z]{4,}|[\\{}<>]|Traceback|line \d+')
GENERIC_SERVER_ERROR = 'Σφάλμα κατά τον υπολογισμό. Έλεγξε τα δεδομένα και δοκίμασε ξανά.'


_ALLOWED_WORDS_RE = re.compile(r'\b(project|projects|Excel|LASCA|DXF|KML|GeoJSON|PDF|email|EGSA|WGS84)\b', re.I)


def _user_facing(message):
    """Μήνυμα γραμμένο για τον χρήστη (ελληνικά, χωρίς τεχνικές λεπτομέρειες) ή εσωτερικό σφάλμα της Python;"""
    if not isinstance(message, str) or not _GREEK_RE.search(message):
        return False
    return not _TECH_RE.search(_ALLOWED_WORDS_RE.sub('', message))


@app.after_request
def _scrub_server_errors(resp):
    """Σφάλματα 5xx: πολλά endpoints επιστρέφουν str(e). Στον χρήστη φτάνει μόνο ελληνικό μήνυμα που γράψαμε
    εμείς· τα εσωτερικά σφάλματα (KeyError, μηνύματα βιβλιοθηκών, διαδρομές αρχείων) γίνονται γενικό μήνυμα.
    Η πλήρης αιτία μένει στα logs του server."""
    if resp.status_code >= 500 and request.path.startswith('/api/') and resp.mimetype == 'application/json':
        text = resp.get_data(as_text=True)
        try:
            payload = json.loads(text)
        except ValueError:
            payload = None
        if isinstance(payload, dict) and not IS_DEVELOPMENT:
            changed = False
            for key in ('error', 'message', 'details', 'detail', 'traceback'):
                if key in payload and not _user_facing(payload[key]):
                    if key in ('details', 'detail', 'traceback'):
                        payload.pop(key)
                    else:
                        payload[key] = GENERIC_SERVER_ERROR
                    changed = True
            if changed:
                resp.set_data(json.dumps(payload, ensure_ascii=False))
                return resp
        cleaned = _PATH_RE.sub('[…]', text)
        if cleaned != text:
            resp.set_data(cleaned)
    return resp


@app.errorhandler(500)
def internal_error(e):
    logger.exception('Unhandled server error on %s %s', request.method, request.path)
    if request.path.startswith('/api/'):
        return jsonify({"error": "Σφάλμα του server. Δοκίμασε ξανά."}), 500
    return _spa_index(500)


FEEDBACK_MESSAGE_MAX = 5000
FEEDBACK_DAILY_LIMIT = int(os.getenv('FEEDBACK_DAILY_LIMIT', '3'))   # μηνύματα ανά χρήστη ανά 24 ώρες
FEEDBACK_IMAGE_MAX = 5 * 1024 * 1024


def _sanitize_image(raw: bytes, max_side: int = 2400) -> bytes | None:
    """Επιστρέφει την εικόνα ξανακωδικοποιημένη σε WEBP, ή None αν δεν είναι έγκυρη PNG/JPG/WEBP."""
    try:
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = 40_000_000  # προστασία από «decompression bombs»
        img = Image.open(io.BytesIO(raw))
        if img.format not in {'PNG', 'JPEG', 'WEBP'}:
            return None
        img.load()
        img = img.convert('RGBA') if img.mode in ('P', 'LA', 'RGBA') else img.convert('RGB')
        img.thumbnail((max_side, max_side))
        out = io.BytesIO()
        img.save(out, 'WEBP', quality=85, method=4)
        return out.getvalue()
    except Exception:
        return None


def _send_feedback_webhook(feedback: dict[str, str]) -> None:
    webhook_url = os.getenv('FEEDBACK_WEBHOOK_URL', '').strip()
    if not webhook_url:
        return

    attachment = feedback.get('screenshot_path') or 'No screenshot attached'
    formatted_message = (
        f"**New LASCA feedback ({feedback['type']})**\n"
        f"**From:** {feedback.get('email') or 'Anonymous'}\n"
        f"**Message:** {feedback['message']}\n"
        f"**Screenshot:** {attachment}"
    )
    payload = {
        'content': formatted_message,
        'text': formatted_message,
        # Το μήνυμα το γράφει ο χρήστης: κανένα @everyone/@here/@ρόλος δεν ειδοποιεί κανέναν (Discord/Slack).
        'allowed_mentions': {'parse': []},
    }
    request_data = json.dumps(payload).encode('utf-8')
    webhook_request = Request(
        webhook_url,
        data=request_data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urlopen(webhook_request, timeout=10) as response:
            if response.status >= 400:
                raise RuntimeError(f'Webhook returned HTTP {response.status}')
    except (HTTPError, URLError, OSError, RuntimeError) as error:
        raise RuntimeError(f'Feedback webhook delivery failed: {error}') from error


def _write_feedback_log(feedback: dict[str, str]) -> None:
    FEEDBACK_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with FEEDBACK_LOG_FILE.open('a', encoding='utf-8') as log_file:
        log_file.write(json.dumps(feedback, ensure_ascii=False) + '\n')


RESEND_TEST_SENDER = 'LASCA <onboarding@resend.dev>'


def _resend_domain_unverified(exc):
    """Το Resend απέρριψε τον αποστολέα επειδή το domain του δεν είναι επιβεβαιωμένο (Resend → Domains)."""
    text = str(exc).lower()
    return 'domain' in text and ('not verified' in text or 'verify' in text)


def _send_feedback_email(
    feedback: dict[str, str],
    screenshot_content: bytes | None = None,
    screenshot_filename: str = 'screenshot',
) -> None:
    """Send feedback through Resend and fail clearly when email is unavailable."""
    try:
        api_key = os.environ.get('RESEND_API_KEY', '').strip()
        receiver_email = os.environ.get('NOTIFICATION_EMAIL', '').strip()
        if resend is None:
            logger.error('Feedback email unavailable: the resend package is not installed')
            raise RuntimeError('Feedback email service is unavailable')
        if not api_key or not receiver_email:
            logger.error(
                'Feedback email configuration is incomplete: RESEND_API_KEY=%s, NOTIFICATION_EMAIL=%s',
                _mask_secret(api_key),
                receiver_email or '<missing>',
            )
            raise RuntimeError('Feedback email configuration is incomplete')

        resend.api_key = api_key
        sender_email = feedback.get('email') or 'Anonymous'
        subject = f"[Feedback - {feedback['type']}] New message from {sender_email}"
        html_body = (
            '<h2>New LASCA feedback</h2>'
            f'<p><strong>Sender email:</strong> {escape(sender_email)}</p>'
            f'<p><strong>Subject:</strong> {escape(subject)}</p>'
            f'<p><strong>Feedback details:</strong></p>'
            f'<p>{escape(feedback["message"]).replace(chr(10), "<br>")}</p>'
            f'<p><strong>Timestamp:</strong> {escape(feedback["created_at"])}</p>'
        )
        # Ίδιος αποστολέας με τα email λογαριασμού (EMAIL_FROM, από επιβεβαιωμένο domain στο Resend).
        email_data = {
            'from': os.getenv('EMAIL_FROM', '').strip() or RESEND_TEST_SENDER,
            'to': [receiver_email],
            'subject': subject,
            'html': html_body,
        }
        reply_to = current_user.email if current_user.is_authenticated else feedback.get('email')
        if reply_to and EMAIL_RE.fullmatch(reply_to):
            email_data['reply_to'] = reply_to
        if screenshot_content is not None:
            email_data['attachments'] = [{
                'filename': screenshot_filename,
                'content': base64.b64encode(screenshot_content).decode('ascii'),
            }]
        try:
            resend.Emails.send(email_data)
        except Exception as exc:
            # Το domain του EMAIL_FROM δεν έχει επιβεβαιωθεί (ακόμα) στο Resend: το μήνυμα προς την ομάδα φεύγει με
            # τον αποστολέα δοκιμών του Resend, ώστε η «Επικοινωνία» να μη σταματά (φτάνει στον κάτοχο του λογαριασμού
            # Resend, που είναι το NOTIFICATION_EMAIL). Μόλις επιβεβαιωθεί το domain, χρησιμοποιείται κανονικά.
            if not _resend_domain_unverified(exc) or email_data['from'] == RESEND_TEST_SENDER:
                raise
            logger.warning('Feedback email: EMAIL_FROM domain is not verified in Resend, sending with %s instead',
                           RESEND_TEST_SENDER)
            resend.Emails.send({**email_data, 'from': RESEND_TEST_SENDER})
    except Exception as exc:
        # Το μήνυμα του Resend λέει την αιτία (π.χ. «domain is not verified», «API key is invalid»).
        logger.error('Feedback email failed: %s: %s', type(exc).__name__, str(exc)[:300].replace('\n', ' '))
        logger.exception('Failed to send feedback email notification through Resend')
        print('Feedback email exception:\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise


@app.route('/api/feedback', methods=['POST'])
@login_required
def submit_feedback():
    try:
        data = request.get_json(silent=True)
        data = data if isinstance(data, dict) else {}
        is_json_request = bool(data)
        feedback_type = str(data.get('type', 'general') if is_json_request else request.form.get('type', 'general')).strip().lower() or 'general'
        message = str(data.get('details', '') if is_json_request else request.form.get('message', '')).strip()

        if feedback_type not in FEEDBACK_TYPES:
            return _feedback_error('Invalid feedback type', 400)
        if not message:
            return _feedback_error('Message is required', 400)

        if len(message) > FEEDBACK_MESSAGE_MAX:
            return _feedback_error(f'Το μήνυμα πρέπει να έχει έως {FEEDBACK_MESSAGE_MAX} χαρακτήρες', 400)

        # Όριο ανά λογαριασμό (σελίδα και exe): προστατεύει τα δωρεάν email του Resend (100 την ημέρα).
        # Ελέγχεται πριν αποθηκευτεί οποιαδήποτε εικόνα, ώστε ο δίσκος να μη γεμίζει από επαναλήψεις.
        from auth_security import db_hit
        if db_hit(f'feedback:{current_user.id}', FEEDBACK_DAILY_LIMIT, timedelta(days=1)):
            return _feedback_error(f'Έχεις στείλει ήδη {FEEDBACK_DAILY_LIMIT} μηνύματα σήμερα. Δοκίμασε ξανά αύριο.', 429)



        screenshot_content = None
        screenshot_filename = 'screenshot.webp'
        screenshot_path = ''
        raw_image = None
        screenshot = request.files.get('screenshot')
        if is_json_request and data.get('screenshot'):
            screenshot_value = data['screenshot']
            if not isinstance(screenshot_value, str) or len(screenshot_value) > FEEDBACK_IMAGE_MAX * 4 // 3 + 200:
                return _feedback_error('Η εικόνα είναι πολύ μεγάλη', 400)
            if ',' in screenshot_value:
                screenshot_value = screenshot_value.split(',', 1)[1]
            try:
                raw_image = base64.b64decode(screenshot_value, validate=True)
            except (ValueError, TypeError):
                return _feedback_error('Μη έγκυρη εικόνα', 400)
        elif screenshot and screenshot.filename:
            extension = Path(secure_filename(screenshot.filename)).suffix.lower()
            if extension not in ALLOWED_FEEDBACK_EXTENSIONS:
                return _feedback_error('Unsupported screenshot format', 400)
            raw_image = screenshot.read(FEEDBACK_IMAGE_MAX + 1)
        if raw_image is not None:
            if len(raw_image) > FEEDBACK_IMAGE_MAX:
                return _feedback_error('Η εικόνα είναι πολύ μεγάλη (έως 5MB)', 400)
            # Ελέγχουμε ότι είναι πραγματικά εικόνα και την ξαναγράφουμε ως WEBP: φεύγουν μεταδεδομένα
            # (π.χ. τοποθεσία) και οτιδήποτε κρυμμένο μέσα στο αρχείο.
            screenshot_content = _sanitize_image(raw_image)
            if screenshot_content is None:
                return _feedback_error('Επιτρέπονται μόνο εικόνες PNG, JPG ή WEBP', 400)
            FEEDBACK_UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            destination = FEEDBACK_UPLOAD_FOLDER / f'{uuid.uuid4().hex}.webp'
            destination.write_bytes(screenshot_content)
            screenshot_path = str(destination)
            screenshot_filename = destination.name

        user_email = current_user.email
        feedback = {
            'type': feedback_type,
            'email': user_email,
            'message': message,
            'screenshot_path': screenshot_path,
            'created_at': datetime.utcnow().isoformat() + 'Z',
        }
        _write_feedback_log(feedback)
        _send_feedback_email(feedback, screenshot_content, screenshot_filename)
        _send_feedback_webhook(feedback)
        return jsonify({
            'status': 'success',
            'message': 'Feedback submitted successfully',
        }), 200
    except Exception:
        logger.exception('Failed to process feedback submission')
        print('Feedback submission exception:\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        return _feedback_error('Δεν ήταν δυνατή η αποστολή. Δοκίμασε ξανά αργότερα.', 500)

def get_active_project_name():
    """ Ψάχνει το όνομα του ενεργού project σε όλα τα πιθανά σημεία του request """
    # 1. Έλεγχος στα Headers (πεζά/κεφαλαία)
    for h in ['Active-Project', 'active-project', 'Project-Name', 'project-name']:
        val = request.headers.get(h)
        if val: return val
        
    # 2. Έλεγχος στα URL Parameters (π.χ. ?project=...)
    for p in ['project', 'projectName', 'project_name', 'activeProject']:
        val = request.args.get(p)
        if val: return val
        
    # 3. Έλεγχος στα Form Data (απαραίτητο για το Excel της Ταχυμετρίας που είναι multipart)
    if request.form:
        for f in ['project', 'projectName', 'project_name', 'activeProject']:
            val = request.form.get(f)
            if val: return val
            
    # 4. Έλεγχος στο JSON Body (απαραίτητο για την Όδευση)
    try:
        if request.is_json and request.json:
            for j in ['project', 'projectName', 'project_name', 'activeProject']:
                val = request.json.get(j)
                if val: return val
    except Exception:
        pass
        
    return None

# Ορίζουμε τον κεντρικό φάκελο όπου θα αποθηκεύονται όλα τα projects στον home φάκελο
# LASCA_PROJECTS_DIR στο .env: ξεχωριστός φάκελος για τα projects της web έκδοσης
# (τοπικά π.χ. ./local_data/projects, στον server π.χ. /srv/lasca/projects).
# Αν λείπει, κρατάμε τον παλιό φάκελο της desktop εφαρμογής (~/LASCA).
_projects_dir_env = os.getenv('LASCA_PROJECTS_DIR', '').strip()
if _projects_dir_env:
    WORKSPACE_DIR = Path(_projects_dir_env).expanduser().resolve()
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
else:
    WORKSPACE_DIR = get_safe_workspace_dir("LASCA")


def get_request_project_dir(project_name, need='view'):
    """Φάκελος του project του αιτήματος, μόνο αν ο χρήστης έχει πρόσβαση (need='view') ή δικαίωμα
    επεξεργασίας (need='edit': ιδιοκτήτης/επεξεργαστής — ποτέ αναγνώστης). Project χωρίς εγγραφή στη βάση
    δεν έχει φάκελο: για ανάγνωση επιστρέφει None, για εγγραφή PermissionError (αλλιώς κάποιος θα μπορούσε
    να «φυτέψει» αρχεία σε φάκελο που θα πάρει αργότερα άλλος χρήστης με το ίδιο όνομα project)."""
    if not project_name:
        return None
    project_name = str(project_name).strip()
    if not current_user.is_authenticated:
        raise PermissionError("Απαιτείται σύνδεση")
    project = project_record_by_name(project_name)
    if project is None:
        if need == 'edit':
            raise PermissionError(f"Δεν έχετε πρόσβαση στο project '{project_name}'")
        resolve_project_dir(WORKSPACE_DIR, project_name)   # ValueError για μη έγκυρα ονόματα
        return None
    role = user_project_role(current_user, project)
    if role is None or (need == 'edit' and role == 'viewer'):
        raise PermissionError(f"Δεν έχετε πρόσβαση στο project '{project_name}'")
    return resolve_project_dir(WORKSPACE_DIR, project.name)

# Helper functions για την Ταχυμετρία
def g2r(gon):
    return float(gon) * math.pi / 200.0

def normalize_400(angle):
    while angle < 0: angle += 400.0
    while angle >= 400.0: angle -= 400.0
    return angle

@app.route('/api/logout', methods=['POST'])
def logout_user_route():
    # Πρώτα καθαρίζουμε τη συνεδρία και ΜΕΤΑ logout_user(): αυτό αφήνει την εντολή να σβηστεί
    # και το cookie «Να με θυμάσαι» (αλλιώς ο χρήστης θα έμενε συνδεδεμένος).
    session.clear()
    logout_user()
    return jsonify({"status": "success", "message": "Αποσυνδεθήκατε επιτυχώς"})


# Clerk JWT authentication endpoints
from clerk_auth import fetch_clerk_profile, verify_clerk_token  # noqa: E402
from clerk_sync import init_clerk_sync, link_or_create, sync_profile  # noqa: E402


def _resolve_clerk_user(token, update_last_seen=False):
    """Verify a Clerk token and retrieve or create its matching local user (βλ. clerk_sync.link_or_create)."""
    claims, error = verify_clerk_token(token)
    if error:
        return None, error, 401

    clerk_user_id = claims.get('sub')
    if not clerk_user_id:
        return None, 'Invalid token: missing user ID', 401
    # azp = η σελίδα για την οποία εκδόθηκε το token. Δεχόμαστε μόνο τη δική μας (PUBLIC_URL/ALLOWED_ORIGINS).
    azp = claims.get('azp')
    if azp and str(azp).rstrip('/').lower() not in _allowed_origins():
        logger.warning('Clerk token rejected: unexpected azp')
        return None, 'Invalid token origin', 401
    g.clerk_claims = claims

    user = User.query.filter_by(clerk_id=clerk_user_id).first()
    if not user:
        profile = fetch_clerk_profile(clerk_user_id)
        user, error, status = link_or_create(clerk_user_id, profile)
        if error:
            return None, error, status
        sync_profile(user, profile)
    elif not user.email_verified:
        # Λογαριασμός που πέρασε στο Clerk με το deploy/clerk_import.py: το Clerk κρατά το email ως επιβεβαιωμένο
        # και δίνει session μόνο σε επιβεβαιωμένους, άρα δεν χρειάζεται δεύτερη επιβεβαίωση εδώ.
        user.email_verified = True
        db.session.commit()

    if update_last_seen:
        user.last_seen_at = datetime.utcnow()
        db.session.commit()
    return user, None, None


def get_or_create_user(clerk_id, email=None):
    """Return the local record for a Clerk identity, creating it on first use."""
    if not clerk_id:
        raise ValueError('A Clerk user ID is required')

    user = User.query.filter_by(clerk_id=clerk_id).first()
    if user is not None:
        return user

    if email is None:
        profile = fetch_clerk_profile(clerk_id)
        email = (profile or {}).get('email')
    email = normalize_email(email)
    if not email or not EMAIL_RE.fullmatch(email):
        raise ValueError('A valid email is required to create a Clerk user')
    if User.query.filter_by(email=email).first() is not None:
        raise ValueError('Email is already associated with another user')

    user = User(
        email=email,
        clerk_id=clerk_id,
        display_name=email.split('@', 1)[0][:150],
        has_password=False,
        password_hash=generate_password_hash(secrets.token_urlsafe(32)),
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        user = User.query.filter_by(clerk_id=clerk_id).first()
        if user is None:
            raise
    return user


@app.route('/api/me', methods=['GET'])
def get_current_user():
    """Get current user from Clerk JWT token."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        if current_user.is_authenticated:
            return jsonify(current_user.to_me_dict()), 200
        return jsonify({'error': 'Unauthorized'}), 401

    token_str = auth_header[7:].strip()
    user, error, status = _resolve_clerk_user(token_str, update_last_seen=True)
    if error:
        if current_user.is_authenticated:
            return jsonify(current_user.to_me_dict()), 200
        return jsonify({'error': error}), status

    return jsonify(user.to_me_dict()), 200


@app.route('/api/auth/config', methods=['GET'])
def get_auth_config():
    """Get authentication configuration."""
    return jsonify({
        'google_client_id': GOOGLE_CLIENT_ID,
        'captcha_site_key': os.getenv('TURNSTILE_SITE_KEY', '').strip(),
        'password_min': 8,
        'password_recommended': 12,
        'min_age': int(os.getenv('MIN_SIGNUP_AGE', '15')),
        'email_verification_required': False,
    }), 200


# ==========================================
# Λογαριασμοί, projects, κοινοποίηση και ζωντανή συνεργασία: code/collab.py
# ==========================================
from collab import init_collab  # noqa: E402
from auth_security import A as auth_namespace, email_verification_required, init_auth  # noqa: E402

auth_namespace._resolve_clerk_user = _resolve_clerk_user
init_auth(
    app, db=db, User=User, AuthEvent=AuthEvent, RateHit=RateHit, PasswordReset=PasswordReset, EmailOtp=EmailOtp,
    DeviceToken=DeviceToken, hash_device_token=hash_device_token, normalize_email=normalize_email,
    DesktopLogin=DesktopLogin,
    EMAIL_RE=EMAIL_RE, logger=logger, resend=resend, GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID,
    PUBLIC_URL=os.getenv('PUBLIC_URL', '').strip(), is_development=IS_DEVELOPMENT,
    MIN_AGE=int(os.getenv('MIN_SIGNUP_AGE', '15')), TERMS_VERSION=TERMS_VERSION,
)

init_collab(
    app, db=db, User=User, Project=Project, ProjectMember=ProjectMember, ProjectInvite=ProjectInvite,
    ProjectActivity=ProjectActivity, ProjectPresence=ProjectPresence, DeviceToken=DeviceToken,
    ProjectRead=ProjectRead, DesktopLogin=DesktopLogin,
    hash_device_token=hash_device_token, WORKSPACE_DIR=WORKSPACE_DIR, USER_AVATAR_DIR=USER_AVATAR_DIR,
    AuthEvent=AuthEvent, PasswordReset=PasswordReset, EmailOtp=EmailOtp,
    TopoProject=TopoProject, resolve_project_dir=resolve_project_dir, project_record_by_name=project_record_by_name,
    normalize_email=normalize_email, EMAIL_RE=EMAIL_RE, logger=logger,
    PUBLIC_URL=os.getenv('PUBLIC_URL', '').strip(),
)

from collab import purge_account  # noqa: E402
init_clerk_sync(app, db=db, User=User, normalize_email=normalize_email, EMAIL_RE=EMAIL_RE, logger=logger,
                generate_password_hash=generate_password_hash, purge_account=purge_account,
                TERMS_VERSION=TERMS_VERSION)


# ==========================================
# 4. ENDPOINT ΓΙΑ ΓΩΝΙΟΜΕΤΡΗΣΕΙΣ (GONIOMETRY)
# ==========================================
@app.route('/api/goniometry', methods=['POST'])
def run_goniometry():
    data = request.json
    rows = data.get('rows', [])
    
    if not rows:
        return jsonify({"results": []})
        
    try:
        # Μετατροπή σε DataFrame
        df = pd.DataFrame(rows)
        
        # Μετονομασία στηλών για να ταιριάζουν με τη συνάρτηση gwn
        df = df.rename(columns={
            'faceI': 'Face I',
            'faceII': 'Face II',
            'to': 'To',
            'from': 'From',
            'period': 'Period'
        })
        
        # ΕΔΩ Η ΔΙΟΡΘΩΣΗ: Μετατρέπουμε σε αριθμούς ΜΟΝΟ τις γωνιακές μετρήσεις
        for col in ['Face I', 'Face II']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
        # Κλήση της συνάρτησης υπολογισμού (dpr.gwn)
        res_df = dpr.gwn(df)
        
        # Μετατροπή πίσω σε λεξικό, αντικαθιστώντας τα NaN με κενά strings για να μην "σπάσει" το JSON
        results = res_df.fillna("").to_dict('records')
        
        return jsonify({"results": results})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό Γωνιομετρήσεων:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/goniometry/report', methods=['POST'])
def export_goniometry_report():
    try:
        data = request.json or {}
        rows = data.get('rows', [])
        
        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ (PROJECT INFO) ---
        raw_proj = data.get('projectInfo') or data.get('projectSettings') or data.get('project_info') or data.get('project') or {}
        
        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get('settings'), dict):
                sources_to_check.append(raw_proj.get('settings'))
        sources_to_check.append(data)

        def extract_field(keys):
            """Αναζητά το πρώτο μη κενό πεδίο σε όλες τις πιθανές πηγές δεδομένων"""
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if val is not None and str(val).strip() != '' and str(val).strip().lower() not in ['none', 'null', 'undefined']:
                            return str(val).strip()
            return 'Μη διαθέσιμο'

        proj_name = extract_field(['name', 'projectName', 'project_name', 'title'])
        proj_engineer = extract_field(['designer', 'engineer', 'designerName', 'engineerName', 'author'])
        proj_client = extract_field(['employer', 'client', 'employerName', 'clientName', 'owner'])
        proj_location = extract_field(['location', 'place', 'address'])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH
        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            pdfmetrics.registerFont(TTFont('GreekFont-Bold', font_bold_path))
            registerFontFamily('GreekFont', normal='GreekFont', bold='GreekFont-Bold')
            my_font = 'GreekFont'
            my_font_bold = 'GreekFont-Bold'
        except Exception:
            my_font = 'Helvetica'
            my_font_bold = 'Helvetica-Bold'

        # Δυναμική μορφοποίηση δεκαδικών ψηφίων
        def format_num(val, decimals=4):
            if val is None or val == "": return "-"
            try: return f"{float(val):.{decimals}f}"
            except (ValueError, TypeError): return str(val)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4, 
            leftMargin=30, rightMargin=30, topMargin=55, bottomMargin=45
        )
        elements = []
        
        HEADER_BG = colors.HexColor('#0f172a')     
        ROW_BG_1 = colors.HexColor('#ffffff')      
        ROW_BG_2 = colors.HexColor('#f8fafc')      
        GRID_COLOR = colors.HexColor('#cbd5e1')    
        TEXT_MAIN = colors.HexColor('#0f172a')     
        ACCENT_TITLE = colors.HexColor('#0284c7')  
        BRIGHT_GREEN = colors.HexColor('#15803d') 
        MATCHING_CYAN = colors.HexColor('#0369a1') 

        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'TopoTitle', parent=styles['Title'], fontName=my_font_bold,
            fontSize=24, leading=22, textColor=ACCENT_TITLE, alignment=0
        )
        h2_style = ParagraphStyle(
            'TopoSecH', fontName=my_font_bold, fontSize=14, leading=14, textColor=HEADER_BG
        )
        header_style = ParagraphStyle('TableHead', fontName=my_font_bold, fontSize=8, textColor=colors.white, alignment=1)
        
        modern_label_style = ParagraphStyle(
            'ModernLabel', 
            fontName=my_font_bold, 
            fontSize=7.5, 
            textColor=colors.HexColor('#64748b'),
            spaceAfter=2,
            textTransform='uppercase'
        )
        
        modern_value_style = ParagraphStyle(
            'ModernValue', 
            fontName=my_font_bold, 
            fontSize=11, 
            textColor=TEXT_MAIN,
            spaceAfter=8
        )

        # ========================================================
        # 1. ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ (MODERN DASHBOARD STYLE)
        # ========================================================
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style)
            ]

        project_data = [
            [make_info_cell("ΕΡΓΟ", proj_name), make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client)],
            [make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer), make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location)]
        ]
        
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBEFORE', (0,0), (0,-1), 4, ACCENT_TITLE),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 25))

        elements.append(Paragraph("Αναφορά Γωνιομετρήσεων", title_style))
        elements.append(Spacer(1, 20))
        
        # ========================================================
        # Πίνακας 1: Αποτελέσματα Οριζόντιων Γωνιών
        # ========================================================
        has_hz_results = any(r.get('mesos_oros') is not None and str(r.get('mesos_oros')).strip() != '' for r in rows)
        
        if has_hz_results:
            elements.append(Paragraph("1. Αποτελέσματα Υπολογισμού Οριζόντιων Γωνιών", h2_style))
            elements.append(Spacer(1, 10))
            
            t1_headers = [
                Paragraph("Από", header_style),
                Paragraph("Προς", header_style),
                Paragraph("Μέσος Όρος", header_style),
                Paragraph("Ανηγμένη Τιμή", header_style),
                Paragraph("Γενικός Μέσος Όρος", header_style),
                Paragraph("υ'<sub>ji</sub> (cc)", header_style),
                Paragraph("υ<sup>ο</sup><sub>j</sub> (cc)", header_style),
                Paragraph("υ<sub>ji</sub> (cc)", header_style),
                Paragraph("υυ", header_style)  
            ]
            
            t1_data = [t1_headers]
            for row in rows:
                if row.get('mesos_oros') is not None and str(row.get('mesos_oros')).strip() != '':
                    t1_data.append([
                        str(row.get('from', '')),
                        str(row.get('to', '')),
                        format_num(row.get('mesos_oros'), 4),
                        format_num(row.get('anigmeni_timi'), 4),
                        format_num(row.get('genikos_mesos'), 4),
                        format_num(row.get('v_m'), 0),
                        format_num(row.get('v_prime'), 1),
                        format_num(row.get('v_ji'), 1),
                        format_num(row.get('vv'), 2)
                    ])
                
            t1 = Table(t1_data, colWidths=[45, 45, 70, 70, 70, 60, 60, 60, 55]) # Σύνολο 535 pt (Πλήρες πλάτος A4)
            t1_cmds = [
                ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('FONTNAME', (0,1), (-1,-1), my_font),
                ('FONTNAME', (2,1), (4,-1), my_font_bold),
                ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
                ('TEXTCOLOR', (2,1), (3,-1), MATCHING_CYAN), 
                ('TEXTCOLOR', (4,1), (4,-1), BRIGHT_GREEN),
                ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ]
            for i in range(1, len(t1_data)):
                bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
                t1_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
                
            t1.setStyle(TableStyle(t1_cmds))
            elements.append(t1)
            elements.append(Spacer(1, 25))

        # ========================================================
        # Πίνακας 2: Πρωτογενείς Παρατηρήσεις (Μόνο Οριζόντιες)
        # ========================================================
        elements.append(Paragraph("2. Πρωτογενείς Παρατηρήσεις", h2_style))
        elements.append(Spacer(1, 10))
        
        t2_headers = [
            Paragraph("Από", header_style),
            Paragraph("Προς", header_style),
            Paragraph("Περίοδος", header_style),
            Paragraph("Οριζ. Θέση Ι", header_style),
            Paragraph("Οριζ. Θέση ΙΙ", header_style)
        ]
        
        t2_data = [t2_headers]
        for row in rows:
            # Προσθήκη γραμμής αν έχει οριζόντια παρατήρηση
            if (row.get('faceI') is not None and str(row.get('faceI')).strip() != '') or \
               (row.get('faceII') is not None and str(row.get('faceII')).strip() != ''):
                t2_data.append([
                    str(row.get('from', '')),
                    str(row.get('to', '')),
                    str(row.get('period', '')),
                    format_num(row.get('faceI'), 4),
                    format_num(row.get('faceII'), 4)
                ])
            
        t2 = Table(t2_data, colWidths=[70, 70, 75, 160, 160]) # Σύνολο 535 pt (Πλήρες πλάτος A4)
        t2_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,1), (-1,-1), my_font),
            ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(t2_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t2_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t2.setStyle(TableStyle(t2_cmds))
        elements.append(t2)

        # ========================================================
        # ΔΗΜΙΟΥΡΓΙΑ PDF
        # ========================================================
        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        doc.build(
            elements, 
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά",
                font_name=my_font, 
                font_bold_name=my_font_bold, 
                timestamp_str=current_timestamp, 
                logo_path=str(LOGO_PATH) if 'LOGO_PATH' in globals() else None
            )
        )
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name='Angle_Measurements_Report.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# 1. ENDPOINT ΓΙΑ ΣΥΝΟΡΘΩΣΗ (ADJUSTMENT)
# ==========================================
@app.route('/api/adjustment', methods=['POST'])
def run_adjustment():
    data = request.json
    observations = data.get('measurements', [])
    
    print(f"Received {len(observations)} observations from React.")
    
    if not observations:
        return jsonify({"results": []})
        
    try:
        df = pd.DataFrame(observations)
        df = df.rename(columns={
            'station': 'From',
            'target': 'To',
            'Period': 'Period',
            'Face_I': 'Face I',
            'Face_II': 'Face II'
        })
        
        for col in ['From', 'To', 'Period', 'Face I', 'Face II']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
        df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()

        # Εδώ η συνάρτηση επιστρέφει το adj_df και το adj_meta
        adj_df, adj_meta = dpr.process_network_data(df)
        
        plot_base64 = None
        try:
            plot_base64 = vis.plot_std_dev_lollipop_df(adj_df)
        except Exception as e:
            print(f"Σφάλμα γραφήματος συνόρθωσης: {e}")
        
        results = []
        for _, row in adj_df.iterrows():
            try:
                adj_hz_val = f"{float(row['Διεύθυνση']):.4f}"
            except (ValueError, TypeError):
                adj_hz_val = str(row['Διεύθυνση'])
                
            try:
                std_dev_val = f"{float(row['σ (cc)']):.4f}"
            except (ValueError, TypeError):
                std_dev_val = str(row['σ (cc)'])

            results.append({
                "station": str(row['Στάση']).replace('.0', ''),
                "target": str(row['Στόχος']).replace('.0', ''),
                "adj_hz": adj_hz_val,
                "std_dev": std_dev_val
            })
            
        # --- ΝΕΑ ΛΟΓΙΚΗ: Εξαγωγή και καθαρισμός Στατιστικών ---
        stats_list = []
        # Το adj_meta είναι λεξικό με κλειδιά τα IDs των σταθμών (π.χ. '8', '15', '61')
        for station_id, data_dict in adj_meta.items():
            station_stats = data_dict.get('stats', {})
            
            # Δημιουργούμε το καθαρό object με python native types (float, int)
            clean_stats = {
                'station': station_id if station_stats.get('station') == 'Unknown' else station_stats.get('station', station_id),
                'var': float(station_stats.get('var', 0.0)),
                'std': float(station_stats.get('std', 0.0)),
                'f': int(station_stats.get('f', 0)),
                'vv': float(station_stats.get('vv', 0.0))
            }
            stats_list.append(clean_stats)
            
        # Επιστρέφουμε τα αποτελέσματα στο Frontend
        return jsonify({
            "results": results,
            "plot": plot_base64,
            "stats": stats_list  # <--- Τώρα στέλνουμε την καθαρή λίστα 'stats_list' αντί για το raw adj_meta
        })
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της συνόρθωσης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 1B. ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (ADJUSTMENT - CUSTOM STYLING)
# ==========================================

@app.route('/api/adjustment/report', methods=['POST'])
def export_adjustment_report():
    try:
        data = request.json or {}
        observations = data.get('measurements', [])
        results_list = data.get('results', [])
        stats = data.get('stats', [])
        
        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ (PROJECT INFO) ---
        raw_proj = data.get('projectInfo') or data.get('projectSettings') or data.get('project_info') or data.get('project') or {}
        
        # Συγκέντρωση όλων των πιθανών πηγών δεδομένων για αναζήτηση
        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get('settings'), dict):
                sources_to_check.append(raw_proj.get('settings'))
        sources_to_check.append(data)

        def extract_field(keys):
            """Αναζητά το πρώτο μη κενό πεδίο σε όλες τις πιθανές πηγές δεδομένων"""
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if val is not None and str(val).strip() != '' and str(val).strip().lower() not in ['none', 'null', 'undefined']:
                            return str(val).strip()
            return 'Μη διαθέσιμο'

        proj_name = extract_field(['name', 'projectName', 'project_name', 'title'])
        proj_engineer = extract_field(['designer', 'engineer', 'designerName', 'engineerName', 'author'])
        proj_client = extract_field(['employer', 'client', 'employerName', 'clientName', 'owner'])
        proj_location = extract_field(['location', 'place', 'address'])
        
        # Εξαγωγή αποτελεσμάτων για τον 1ο Πίνακα (με φιλτράρισμα διπλοτυπιών)
        if not results_list:
            seen_pairs = set()
            filtered_results = []
            for obs in observations:
                if obs.get('adj_hz') is not None:
                    st = str(obs.get('station', obs.get('From', ''))).strip()
                    tg = str(obs.get('target', obs.get('To', ''))).strip()
                    pair = (st, tg)
                    if pair not in seen_pairs and st != '' and tg != '':
                        seen_pairs.add(pair)
                        filtered_results.append(obs)
            results_list = filtered_results

        # --- ΕΠΕΞΕΡΓΑΣΙΑ ΠΡΩΤΟΓΕΝΩΝ ΠΑΡΑΤΗΡΗΣΕΩΝ (Όλες οι Περίοδοι) ---
        raw_observations = []
        if observations:
            try:
                df = pd.DataFrame(observations)
                rename_map = {
                    'station': 'From', 'target': 'To', 'period': 'Period',
                    'Face_I': 'Face I', 'face_1': 'Face I', 'face_i': 'Face I',
                    'Face_II': 'Face II', 'face_2': 'Face II', 'face_ii': 'Face II'
                }
                df = df.rename(columns=rename_map)
                
                for c in ['From', 'To', 'Period', 'Face I', 'Face II']:
                    if c not in df.columns:
                        df[c] = np.nan
                        
                for col in ['From', 'To', 'Period', 'Face I', 'Face II']:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()
                df = df.fillna('')
                raw_observations = df.to_dict('records')
                
            except Exception as e:
                print(f"Σφάλμα κατά την επεξεργασία πρωτογενών δεδομένων (ffill): {e}")
                raw_observations = observations
        
        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH
        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            pdfmetrics.registerFont(TTFont('GreekFont-Bold', font_bold_path))
            registerFontFamily('GreekFont', normal='GreekFont', bold='GreekFont-Bold')
            my_font = 'GreekFont'
            my_font_bold = 'GreekFont-Bold'
        except Exception:
            my_font = 'Helvetica'
            my_font_bold = 'Helvetica-Bold'

        def format_to_4(val):
            if val is None or val == "": return "-"
            try: return f"{float(val):.4f}"
            except (ValueError, TypeError): return str(val)

        def format_to_2(val):
            if val is None or val == "": return "-"
            try: return f"{float(val):.2f}"
            except (ValueError, TypeError): return str(val)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4, 
            leftMargin=30, rightMargin=30, topMargin=55, bottomMargin=45
        )
        elements = []
        
        HEADER_BG = colors.HexColor('#0f172a')     
        ROW_BG_1 = colors.HexColor('#ffffff')      
        ROW_BG_2 = colors.HexColor('#f8fafc')      
        GRID_COLOR = colors.HexColor('#cbd5e1')    
        TEXT_MAIN = colors.HexColor('#0f172a')     
        ACCENT_TITLE = colors.HexColor('#0284c7')  
        BRIGHT_GREEN = colors.HexColor('#15803d') 
        MATCHING_CYAN = colors.HexColor('#0369a1') 

        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'TopoTitle', parent=styles['Title'], fontName=my_font_bold,
            fontSize=24, leading=22, textColor=ACCENT_TITLE, alignment=0
        )
        h2_style = ParagraphStyle(
            'TopoSecH', fontName=my_font_bold, fontSize=14, leading=14, textColor=HEADER_BG
        )
        header_style = ParagraphStyle('TableHead', fontName=my_font_bold, fontSize=8.5, textColor=colors.white, alignment=1)
        
        # Νέα Styles για το Modern Dashboard Box
        modern_label_style = ParagraphStyle(
            'ModernLabel', 
            fontName=my_font_bold, 
            fontSize=7.5, 
            textColor=colors.HexColor('#64748b'),
            spaceAfter=2,
            textTransform='uppercase'
        )
        
        modern_value_style = ParagraphStyle(
            'ModernValue', 
            fontName=my_font_bold, 
            fontSize=11, 
            textColor=TEXT_MAIN,
            spaceAfter=8
        )

        # ========================================================
        # ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ (MODERN DASHBOARD STYLE)
        # ========================================================
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style)
            ]

        project_data = [
            [make_info_cell("ΕΡΓΟ", proj_name), make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client)],
            [make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer), make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location)]
        ]
        
        # Πλάτος Στήλης (A4 = 595.27, Margin = 30+30 = 60, Σύνολο = 535.27 / 2)
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBEFORE', (0,0), (0,-1), 4, ACCENT_TITLE), # Ίδιο χρώμα με τον τίτλο για συνοχή
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 25))

        # ========================================================
        # ΤΙΤΛΟΣ ΕΓΓΡΑΦΟΥ (Μεταφέρθηκε κάτω από τις πληροφορίες)
        # ========================================================
        elements.append(Paragraph("Αναφορά Συνόρθωσης Σταθμού", title_style))
        elements.append(Spacer(1, 20))
        
        # ========================================================
        # Πίνακας 1: Συνορθωμένες Διευθύνσεις (Μοναδικά Ζεύγη)
        # ========================================================
        elements.append(Paragraph("1. Συνορθωμένες Διευθύνσεις", h2_style))
        elements.append(Spacer(1, 10))
        
        t1_headers = [
            Paragraph("Από", header_style),
            Paragraph("Προς", header_style),
            Paragraph("Συνορθωμένη Διεύθυνση [grad]", header_style),
            Paragraph("Τυπική απόκλιση σ [cc]", header_style)
        ]
        
        table_data = [t1_headers]
        for obs in results_list:
            table_data.append([
                str(obs.get('station', obs.get('From', ''))).replace('.0', ''),
                str(obs.get('target', obs.get('To', ''))).replace('.0', ''),
                format_to_4(obs.get('adj_hz')),
                format_to_2(obs.get('std_dev'))
            ])
            
        t1 = Table(table_data, colWidths=[80, 80, 190, 185])
        t1_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,1), (1,-1), my_font),
            ('FONTNAME', (2,1), (3,-1), my_font_bold),
            ('TEXTCOLOR', (0,1), (1,-1), TEXT_MAIN),
            ('TEXTCOLOR', (2,1), (2,-1), BRIGHT_GREEN),
            ('TEXTCOLOR', (3,1), (3,-1), MATCHING_CYAN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t1_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
            
        t1.setStyle(TableStyle(t1_cmds))
        elements.append(t1)
        elements.append(Spacer(1, 35))
        
        # ========================================================
        # Πίνακας 2: Στατιστική Ανάλυση
        # ========================================================
        elements.append(Paragraph("2. Στατιστική Ανάλυση", h2_style))
        elements.append(Spacer(1, 10))
        
        t2_headers = [
            Paragraph("Station", header_style),
            Paragraph("Βαθμοί Ελευθερίας (f)", header_style),
            Paragraph("Κριτήριο Βελτιστοποίησης [vv]", header_style),
            Paragraph("a-posteriori μεταβλητότητα (σ<sub>0</sub><sup>2</sup>)", header_style),
            Paragraph("a-posteriori τυπική απόκλιση σ<sub>0</sub> [cc]", header_style)
        ]
        
        stats_data = [t2_headers]
        for st in stats:
            stats_data.append([
                str(st.get('station', st.get('stationName', ''))).replace('.0', ''),
                str(st.get('f', '')),
                format_to_4(st.get('vv')),
                format_to_4(st.get('var')),
                format_to_4(st.get('std'))
            ])
            
        t2 = Table(stats_data, colWidths=[75, 115, 110, 115, 120])
        t2_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,1), (-1,-1), my_font_bold),
            ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(stats_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t2_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t2.setStyle(TableStyle(t2_cmds))
        elements.append(t2)
        elements.append(Spacer(1, 35))
        
        # ========================================================
        # Πίνακας 3: Πρωτογενείς Παρατηρήσεις (Όλες οι Περίοδοι)
        # ========================================================
        elements.append(Paragraph("3. Πρωτογενείς Παρατηρήσεις", h2_style))
        elements.append(Spacer(1, 10))
        
        t3_headers = [
            Paragraph("Από", header_style),
            Paragraph("Προς", header_style),
            Paragraph("Περίοδος", header_style),
            Paragraph("Θέση Ι [grad]", header_style),
            Paragraph("Θέση ΙΙ [grad]", header_style)
        ]
        
        t3_data = [t3_headers]
        for obs in raw_observations:
            st_val = str(obs.get('From', '')).replace('.0', '')
            tg_val = str(obs.get('To', '')).replace('.0', '')
            period_val = str(obs.get('Period', '')).replace('.0', '')
            
            face_i_val = obs.get('Face I', '')
            face_ii_val = obs.get('Face II', '')

            if face_i_val != '' or face_ii_val != '':
                t3_data.append([
                    st_val, tg_val, period_val,
                    format_to_4(face_i_val), format_to_4(face_ii_val)
                ])
            
        t3 = Table(t3_data, colWidths=[80, 80, 85, 145, 145])
        t3_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,1), (-1,-1), my_font),
            ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(t3_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t3_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t3.setStyle(TableStyle(t3_cmds))
        elements.append(t3)


        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        doc.build(
            elements, 
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά LASCA",
                font_name=my_font, 
                font_bold_name=my_font_bold, # ή 'Helvetica-Bold' αν δεν έχεις ξεχωριστό bold ελληνικό font
                timestamp_str=current_timestamp, 
                logo_path=str(LOGO_PATH)
            )
        )
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name='Adjustment_Report.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Adjustment Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
# ==========================================
# 2. ENDPOINT ΓΙΑ ΟΔΕΥΣΗ (TRAVERSE)
# ==========================================
@app.route('/api/traverse', methods=['POST'])
def run_traverse():
    data = request.json
    measurements = data.get('measurements', [])
    scale = data.get('scale', '1:1000')
    terrain = data.get('terrain', 'Ομαλό')
    klass = data.get('klass', 'Πρωτεύουσα')
    
    print(f"Received traverse request: Scale={scale}, Terrain={terrain}, Class={klass}")
    
    if not measurements:
        return jsonify({"results": [], "metrics": {}})
        
    try:
        # Αφαιρέθηκε η λογική σύνδεσης με το leveling_network καθώς δεν χρησιμοποιούμε το H στην όδευση
        
        # 3. ΣΥΝΕΧΕΙΑ ΜΕ ΤΗΝ ΟΡΙΖΟΝΤΙΟΓΡΑΦΙΚΗ ΕΠΙΛΥΣΗ (TRAVERSE)
        points = []
        for m in measurements:
            def to_float(val):
                if val is None or str(val).strip() == "" or str(val).strip() == "---":
                    return None
                try:
                    return float(val)
                except ValueError:
                    return None

            pt = dpr.TraversePoint(
                name=m.get('name'),
                angle=to_float(m.get('hz')),
                dist=to_float(m.get('sd')),
                X=to_float(m.get('x')),
                Y=to_float(m.get('y'))
            )
            points.append(pt)

        results_rr, meta = dpr.traverse(
            points=points, 
            scale=scale, 
            terrain=terrain, 
            klass=klass
        )
        
        py_metrics = meta.get("metrics", {})
        
        def fmt(val, decimals=4):
            return f"{float(val):.{decimals}f}" if val is not None else "---"

        react_metrics = {
            "n": py_metrics.get("n"),
            "totalLength": fmt(py_metrics.get("S_total"), 2),
            "gTarget": fmt(py_metrics.get("G_prepei"), 4),
            "gActual": fmt(py_metrics.get("G_einai"), 4),
            "fb": fmt(py_metrics.get("Wb"), 4),
            "wbi": fmt(py_metrics.get("Wbi"), 4),
            "dxTarget": fmt(py_metrics.get("dX_prepei"), 3),
            "dxActual": fmt(py_metrics.get("dX_einai"), 3),
            "dx": fmt(py_metrics.get("dx"), 4),
            "dyTarget": fmt(py_metrics.get("dY_prepei"), 3),
            "dyActual": fmt(py_metrics.get("dY_einai"), 3),
            "dy": fmt(py_metrics.get("dy"), 4),
            "w": fmt(py_metrics.get("ds"), 4),
            "Wb_max": fmt(py_metrics.get("Wb_max"), 4),
            "ds_max": fmt(py_metrics.get("ds_max"), 4),
            "is_closed": py_metrics.get("is_closed", False)
        }
        
        updated_measurements = []
        for idx, m in enumerate(measurements):
            if idx < len(results_rr):
                calc_X = getattr(results_rr[idx], 'X', getattr(results_rr[idx], 'Xi', None))
                calc_Y = getattr(results_rr[idx], 'Y', getattr(results_rr[idx], 'Yi', None))
                
                updated_row = m.copy() 
                if calc_X is not None: updated_row['x'] = fmt(calc_X, 3)
                if calc_Y is not None: updated_row['y'] = fmt(calc_Y, 3)
                
                updated_measurements.append(updated_row)
            else:
                updated_measurements.append(m)

        # --- ΓΕΦΥΡΑ: Αποθήκευση στάσεων ΜΕΣΑ στο ενεργό Project ---
        calculated_stations_export = []
        for pt in results_rr:
            name = getattr(pt, 'name', None)
            calc_X = getattr(pt, 'X', getattr(pt, 'Xi', None))
            calc_Y = getattr(pt, 'Y', getattr(pt, 'Yi', None))
            
            if name and calc_X is not None and calc_Y is not None:
                calculated_stations_export.append({
                    "Station_Name": str(name),
                    "XS": round(float(calc_X), 3),
                    "YS": round(float(calc_Y), 3),
                    "ZS": 0.0 # Αφού αφαιρέθηκε το H, θέτουμε πάντα 0.0 ως default Z για ασφάλεια της ταχυμετρίας
                })
        
        # Χρήση της έξυπνης συνάρτησης
        project_name = get_active_project_name()
        print(f"DEBUG TRAVERSE: Το backend διάβασε project_name = '{project_name}'")
        
        try:
            # Αποθήκευση μόνο από όσους μπορούν να αλλάξουν το project (όχι αναγνώστες).
            project_dir = get_request_project_dir(project_name, need='edit')
            if project_dir is None:
                raise ValueError("Δεν ορίστηκε έγκυρο ενεργό project")
            atomic_write_json(project_dir / "latest_traverse.json", calculated_stations_export)
            print(f"SUCCESS: Οι στάσεις αποθηκεύτηκαν στο: '{project_dir / 'latest_traverse.json'}'")
        except Exception as e:
            print(f"WARNING: Δεν ήταν δυνατή η αποθήκευση των στάσεων όδευσης: {e}")

        plot_base64 = None
        try:
            plot_base64 = vis.plot_traverse_base64_2(results_rr, measurements, scale)
        except Exception as e:
            print(f"Σφάλμα γραφήματος όδευσης: {e}")

        return jsonify({
            "results": updated_measurements,
            "metrics": react_metrics,
            "plot": plot_base64
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της όδευσης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 2B. ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (TRAVERSE - CUSTOM STYLING)
# ==========================================
@app.route('/api/traverse/report', methods=['POST'])
def export_traverse_report():
    try:
        data = request.json or {}
        points = data.get('points', [])
        metrics = data.get('metrics', {})
        plot_base64 = data.get('plot') 

        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ (PROJECT INFO) ---
        raw_proj = data.get('projectInfo') or data.get('projectSettings') or {}

        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get('settings'), dict):
                sources_to_check.append(raw_proj.get('settings'))
        sources_to_check.append(data)

        def extract_field(keys):
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if val is not None and str(val).strip() != '' and str(val).strip().lower() not in ['none', 'null', 'undefined']:
                            return str(val).strip()
            return 'Μη διαθέσιμο'

        proj_name = extract_field(['name', 'projectName', 'project_name', 'title'])
        proj_engineer = extract_field(['designer', 'engineer', 'designerName', 'engineerName', 'author'])
        proj_client = extract_field(['employer', 'client', 'employerName', 'clientName', 'owner'])
        proj_location = extract_field(['location', 'place', 'address'])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH

        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            pdfmetrics.registerFont(TTFont('GreekFont-Bold', font_bold_path))
            registerFontFamily('GreekFont', normal='GreekFont', bold='GreekFont-Bold')
            my_font = 'GreekFont'
            my_font_bold = 'GreekFont-Bold'
        except Exception:
            my_font = 'Helvetica'
            my_font_bold = 'Helvetica-Bold'

        buffer = BytesIO()
        a4_w, a4_h = A4

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=30,
            rightMargin=30,
            topMargin=55,
            bottomMargin=45
        )

        elements = []

        # --- Παλέτα Χρωμάτων ---
        HEADER_BG = colors.HexColor('#0f172a')     
        SUBHEADER_BG = colors.HexColor('#1e293b')  
        ROW_BG_1 = colors.HexColor('#ffffff')
        ROW_BG_2 = colors.HexColor('#f8fafc')     
        GRID_COLOR = colors.HexColor('#cbd5e1')
        TEXT_MAIN = colors.HexColor('#0f172a')
        ACCENT_TITLE = colors.HexColor('#0284c7')

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TopoTitle', parent=styles['Title'], fontName=my_font_bold,
            fontSize=24, leading=22, textColor=ACCENT_TITLE, alignment=0
        )
        h2_style = ParagraphStyle(
            'TopoSecH', fontName=my_font_bold, fontSize=14, leading=14, textColor=HEADER_BG
        )
        th_style = ParagraphStyle(
            'TopoTH', parent=styles['Normal'], fontName=my_font_bold,
            fontSize=8.5, leading=10, textColor=colors.white, alignment=1
        )

        td_norm_style = ParagraphStyle(
            'TopoTDNorm', parent=styles['Normal'], fontName=my_font,
            fontSize=8, leading=10, textColor=TEXT_MAIN, alignment=1
        )
        td_bold_style = ParagraphStyle(
            'TopoTDBold', parent=styles['Normal'], fontName=my_font_bold,
            fontSize=8, leading=10, textColor=TEXT_MAIN, alignment=1
        )

        modern_label_style = ParagraphStyle(
            'ModernLabel', 
            fontName=my_font_bold, 
            fontSize=7.5, 
            textColor=colors.HexColor('#64748b'),
            spaceAfter=2,
            textTransform='uppercase'
        )

        modern_value_style = ParagraphStyle(
            'ModernValue', 
            fontName=my_font_bold, 
            fontSize=11, 
            textColor=TEXT_MAIN,
            spaceAfter=8
        )

        # ========================================================
        # ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ (MODERN DASHBOARD STYLE)
        # ========================================================
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style)
            ]

        project_data = [
            [make_info_cell("ΕΡΓΟ", proj_name), make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client)],
            [make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer), make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location)]
        ]

        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])

        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBEFORE', (0,0), (0,-1), 4, ACCENT_TITLE),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 25))

        # ========================================================
        # ΤΙΤΛΟΣ ΕΓΓΡΑΦΟΥ
        # ========================================================
        elements.append(Paragraph("Αναφορά Πολυγωνικής Όδευσης", title_style))
        elements.append(Spacer(1, 20))

        # ========================================================
        # 1. ΠΙΝΑΚΑΣ ΣΤΑΣΕΩΝ & ΣΥΝΤΕΤΑΓΜΕΝΩΝ
        # ========================================================
        elements.append(Paragraph("1. Πίνακας Στάσεων & Συντεταγμένων", h2_style))
        elements.append(Spacer(1, 10))

        t_headers = [
            Paragraph("Στάση", th_style),
            Paragraph("Γωνία θλάσης [grad]", th_style),
            Paragraph("Απόσταση [m]", th_style),
            Paragraph("Τετμημένη X [m]", th_style),
            Paragraph("Τεταγμένη Y [m]", th_style)
        ]

        table_data = [t_headers]
        for pt in points:
            hz_val = f"{float(pt.get('hz')):.4f}" if pt.get('hz') not in [None, '', '-'] else "-"
            sd_val = f"{float(pt.get('sd')):.3f}" if pt.get('sd') not in [None, '', '-'] else "-"
            x_val  = f"{float(pt.get('x')):.3f}" if pt.get('x') not in [None, '', '-'] else "-"
            y_val  = f"{float(pt.get('y')):.3f}" if pt.get('y') not in [None, '', '-'] else "-"

            table_data.append([
                Paragraph(str(pt.get('name', '-')), td_norm_style),
                Paragraph(hz_val, td_norm_style),
                Paragraph(sd_val, td_norm_style),
                Paragraph(x_val, td_bold_style),
                Paragraph(y_val, td_bold_style)
            ])

        t = Table(table_data, colWidths=[65, 120, 100, 125, 125])
        t_style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]

        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t.setStyle(TableStyle(t_style_cmds))
        elements.append(t)
        elements.append(Spacer(1, 35))

        # ========================================================
        # 2. ΠΙΝΑΚΑΣ ΣΤΑΤΙΣΤΙΚΩΝ ΚΑΙ ΕΛΕΓΧΟΥ ΑΝΟΧΩΝ
        # ========================================================
        elements.append(Paragraph("2. Στοιχεία Επίλυσης & Έλεγχος Ανοχών", h2_style))
        elements.append(Spacer(1, 10))

        def safe_fmt(val, decimals=3, suffix=""):
            if val in [None, '', '-']: return "-"
            try: return f"{float(val):.{decimals}f}{suffix}"
            except: return str(val)

        wb_act = safe_fmt(metrics.get('fb'), 4, " g")
        wb_max = safe_fmt(metrics.get('Wb_max'), 4, " g")
        ds_act = safe_fmt(metrics.get('w'), 3, " m")
        ds_max = safe_fmt(metrics.get('ds_max'), 3, " m")

        # Ανάκτηση Συντελεστή Κλίμακας
        scale_factor_val = metrics.get('scaleFactor') or metrics.get('scale_factor') or metrics.get('k') or metrics.get('scale')
        scale_factor_fmt = safe_fmt(scale_factor_val, 6)

        try:
            pass_wb = abs(float(metrics.get('fb', 0))) <= float(metrics.get('Wb_max', 0))
            pass_ds = abs(float(metrics.get('w', 0))) <= float(metrics.get('ds_max', 0))
            status_text = "ΕΝΤΟΣ ΑΝΟΧΩΝ" if (pass_wb and pass_ds) else "ΕΚΤΟΣ ΑΝΟΧΩΝ"
            status_color = colors.HexColor('#15803d') if (pass_wb and pass_ds) else colors.HexColor('#b91c1c')
        except:
            status_text = "ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ"
            status_color = colors.HexColor('#0369a1')

        status_p = Paragraph(f"ΚΑΤΑΣΤΑΣΗ: {status_text}", ParagraphStyle('StatP', fontName=my_font_bold, fontSize=8.5, leading=10, textColor=status_color, alignment=1))

        def val_p(val):
            return Paragraph(str(val), td_bold_style)

        # ----------------- Ένθετος Πίνακας για τα Γενικά Στοιχεία (6 Στήλες) -----------------
        gen_data = [[
            Paragraph("Αριθμός Στάσεων (n):", td_norm_style), val_p(metrics.get('n', '-')),
            Paragraph("Συνολικό Μήκος (S):", td_norm_style), val_p(safe_fmt(metrics.get('totalLength'), 2, " m")),
            Paragraph("Συντελεστής Κλίμακας (m<sub>ij</sub>):", td_norm_style), val_p(scale_factor_fmt)
        ]]
        
        # Συνολικό διαθέσιμο πλάτος: 140 + 127 + 140 + 128 = 535
        # Δίνουμε στην κάθε στήλη ακριβώς τον χώρο που χρειάζεται
        gen_table = Table(gen_data, colWidths=[105, 40, 105, 65, 140, 80])
        gen_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, GRID_COLOR), # Μόνο εσωτερικές γραμμές για να μην διπλασιάσει το εξωτερικό περίγραμμα
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (3, 0), (3, 0), 'CENTER'),
            ('ALIGN', (5, 0), (5, 0), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        # -------------------------------------------------------------------------------------

        metrics_table_data = [
            [Paragraph("Γενικά Στοιχεία", th_style), '', '', ''],
            [gen_table, '', '', ''], # Εισαγωγή του nested table

            [Paragraph("Γωνιακός & Γραμμικός Έλεγχος", th_style), '', '', ''],
            ["G (πρέπει):", val_p(safe_fmt(metrics.get('gTarget'), 4, " g")), "G (είναι):", val_p(safe_fmt(metrics.get('gActual'), 4, " g"))],
            ["Μέγιστη Γωνιακή Ανοχή (Wβmax):", val_p(wb_max), "Γωνιακό Σφάλμα (Wβ):", val_p(wb_act)],

            ["ΔX (πρέπει):", val_p(safe_fmt(metrics.get('dxTarget'), 3, " m")), "ΔY (πρέπει):", val_p(safe_fmt(metrics.get('dyTarget'), 3, " m"))],
            ["ΔX (είναι):", val_p(safe_fmt(metrics.get('dxActual'), 3, " m")), "ΔY (είναι):", val_p(safe_fmt(metrics.get('dyActual'), 3, " m"))],
            ["Σφάλμα δX:", val_p(safe_fmt(metrics.get('dx'), 3, " m")), "Σφάλμα δY:", val_p(safe_fmt(metrics.get('dy'), 3, " m"))],
            ["Μέγιστη Γραμμική Ανοχή (δs_max):", val_p(ds_max),"δs:", val_p(ds_act)],

            [status_p, '', '', '']
        ]

        metrics_table = Table(metrics_table_data, colWidths=[140, 127, 140, 128])
        metrics_style = TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), my_font),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_MAIN),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Επικεφαλίδα Γενικών Στοιχείων
            ('SPAN', (0, 0), (3, 0)),
            ('BACKGROUND', (0, 0), (3, 0), SUBHEADER_BG),
            
            # --- Ρυθμίσεις για τον Nested Table ---
            ('SPAN', (0, 1), (3, 1)), # Η γραμμή 1 ενώνεται ώστε να χωρέσει ολόκληρος ο nested table
            ('LEFTPADDING', (0, 1), (3, 1), 0),
            ('RIGHTPADDING', (0, 1), (3, 1), 0),
            ('TOPPADDING', (0, 1), (3, 1), 0),
            ('BOTTOMPADDING', (0, 1), (3, 1), 0),
            # --------------------------------------

            # Επικεφαλίδα Ελέγχου
            ('SPAN', (0, 2), (3, 2)),
            ('BACKGROUND', (0, 2), (3, 2), SUBHEADER_BG),

            # Γραμμή Κατάστασης
            ('SPAN', (0, 9), (3, 9)),
            ('BACKGROUND', (0, 9), (3, 9), colors.HexColor('#f1f5f9')),

            ('GRID', (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ('ALIGN', (1, 3), (1, 8), 'CENTER'),
            ('ALIGN', (3, 3), (3, 8), 'CENTER'),

            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ])
        metrics_table.setStyle(metrics_style)
        elements.append(metrics_table)
        elements.append(Spacer(1, 35))
        # ========================================================
        # 3. ΣΚΑΡΙΦΗΜΑ / ΔΙΑΓΡΑΜΜΑ
        # ========================================================
        if plot_base64 and "," in plot_base64:
            try:
                encoded_image = plot_base64.split(",")[1]
                img_data = base64.b64decode(encoded_image)
                img_stream = BytesIO(img_data)

                img_reader = ImageReader(img_stream)
                orig_w, orig_h = img_reader.getSize()

                max_width = a4_w - 60
                max_height = 380

                aspect = orig_w / float(orig_h)
                if (max_width / max_height) < aspect:
                    final_w = max_width
                    final_h = max_width / aspect
                else:
                    final_h = max_height
                    final_w = max_height * aspect

                elements.append(Paragraph("3. Σκαρίφημα & Διάγραμμα Όδευσης", h2_style))
                elements.append(Spacer(1, 10))

                plot_img = Image(img_stream, width=final_w, height=final_h)
                plot_img.hAlign = 'CENTER'
                elements.append(plot_img)

            except Exception as img_err:
                print(f"Σφάλμα επεξεργασίας εικόνας διαγράμματος: {img_err}")

        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        doc.build(
            elements, 
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά LASCA",
                font_name=my_font, 
                font_bold_name=my_font_bold,
                timestamp_str=current_timestamp, 
                logo_path=str(LOGO_PATH)
            )
        )
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name="Traverse_Report.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Traverse Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

def _get_traverse_export_data(data):
    source_points = data.get('points') or data.get('results') or []
    points = []
    for point in source_points:
        if not isinstance(point, dict):
            continue
        try:
            x = float(point.get('x', point.get('X', point.get('XS'))))
            y = float(point.get('y', point.get('Y', point.get('YS'))))
            z = float(point.get('z', point.get('Z', point.get('ZS', 0.0))) or 0.0)
        except (TypeError, ValueError):
            continue
        if not all(math.isfinite(value) for value in (x, y, z)):
            continue
        station_id = str(point.get('name', point.get('Station_Name', point.get('station_id', '')))).strip()
        points.append({
            'station_id': station_id,
            'x': x,
            'y': y,
            'z': z,
            'source': point
        })

    if len(points) < 2:
        return None, None, (jsonify({"error": "Απαιτούνται τουλάχιστον δύο έγκυρες στάσεις."}), 400)

    fixed_indices = {0, 1, len(points) - 2, len(points) - 1} if len(points) >= 4 else {0, len(points) - 1}
    for index, point in enumerate(points):
        point['station_type'] = (
            'ΓΝΩΣΤΗ'
            if index in fixed_indices or 'Σ' in point['station_id'].upper()
            else 'ΥΠΟΛΟΓΙΣΜΕΝΗ'
        )

    metrics = data.get('metrics') or {}

    def metric_number(keys, fallback):
        for key in keys:
            value = metrics.get(key)
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            if math.isfinite(number):
                return number
        return fallback

    fx_mm = metric_number(('fx_mm',), metric_number(('dx',), 0.0) * 1000)
    fy_mm = metric_number(('fy_mm',), metric_number(('dy',), 0.0) * 1000)
    fz_mm = metric_number(('fz_mm',), metric_number(('fz',), 0.0) * 1000)
    fs_mm = metric_number(('fs_mm',), math.sqrt(fx_mm ** 2 + fy_mm ** 2 + fz_mm ** 2))

    computed_length = sum(
        math.hypot(points[index + 1]['x'] - points[index]['x'], points[index + 1]['y'] - points[index]['y'])
        for index in range(1, len(points) - 2)
    ) if len(points) >= 4 else sum(
        math.hypot(points[index + 1]['x'] - points[index]['x'], points[index + 1]['y'] - points[index]['y'])
        for index in range(len(points) - 1)
    )
    total_length_m = metric_number(('total_length_m', 'totalLength'), computed_length)
    relative_precision = str(metrics.get('relative_precision') or '').strip()
    if not relative_precision:
        relative_precision = f"1:{round(total_length_m / (fs_mm / 1000))}" if fs_mm > 0 else '1:∞'

    traverse_name = str(data.get('traverse_name') or 'ΟΔΕΥΣΗ-1')
    stats = {
        'traverse_name': traverse_name,
        'total_length_m': total_length_m,
        'stations_count': len(points),
        'fx_mm': fx_mm,
        'fy_mm': fy_mm,
        'fz_mm': fz_mm,
        'fs_mm': fs_mm,
        'relative_precision': relative_precision
    }
    return points, stats, None


@app.route('/api/export/traverse/geojson', methods=['POST'])
def export_traverse_geojson():
    data = request.get_json(silent=True) or {}
    points, stats, error = _get_traverse_export_data(data)
    if error:
        return error

    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point['x'], point['y'], point['z']]
            },
            "properties": {
                "station_id": point['station_id'],
                "x": point['x'],
                "y": point['y'],
                "z": point['z'],
                "station_type": point['station_type']
            }
        }
        for point in points
    ]
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[point['x'], point['y'], point['z']] for point in points]
        },
        "properties": {
            "traverse_name": stats['traverse_name'],
            "total_length_m": stats['total_length_m'],
            "stations_count": stats['stations_count'],
            "fx_mm": stats['fx_mm'],
            "fy_mm": stats['fy_mm'],
            "fz_mm": stats['fz_mm'],
            "fs_mm": stats['fs_mm'],
            "relative_precision": stats['relative_precision']
        }
    })
    feature_collection = {
        "type": "FeatureCollection",
        "name": stats['traverse_name'],
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::2100"}
        },
        "features": features
    }
    return Response(
        json.dumps(feature_collection, ensure_ascii=False, allow_nan=False),
        mimetype='application/json',
        headers={"Content-Disposition": "attachment; filename=traverse_network.geojson"}
    )


@app.route('/api/export/traverse/kml', methods=['POST'])
def export_traverse_kml():
    data = request.get_json(silent=True) or {}
    points, stats, error = _get_traverse_export_data(data)
    if error:
        return error

    transformed_points = []
    for point in points:
        longitude, latitude = EGSA87_TO_WGS84.transform(point['x'], point['y'])
        if not all(math.isfinite(value) for value in (longitude, latitude, point['z'])):
            continue
        transformed_points.append({**point, 'longitude': longitude, 'latitude': latitude})

    if len(transformed_points) < 2:
        return jsonify({"error": "Δεν υπάρχουν αρκετές έγκυρες στάσεις για εξαγωγή."}), 400

    placemarks = []
    for point in transformed_points:
        station_id = escape(point['station_id'])
        description = (
            '<div style="font-family:sans-serif;padding:5px">'
            f'<b>Station:</b> {station_id}<br/>'
            f'<b>Type:</b> {escape(point["station_type"])}<br/>'
            f'<b>X (EGSA):</b> {point["x"]:.3f}<br/>'
            f'<b>Y (EGSA):</b> {point["y"]:.3f}<br/>'
            f'<b>Z:</b> {point["z"]:.3f} m'
            '</div>'
        ).replace(']]>', ']]]]><![CDATA[>')
        placemarks.append(
            '<Placemark>'
            f'<name>{station_id}</name>'
            '<styleUrl>#stationStyle</styleUrl>'
            f'<description><![CDATA[{description}]]></description>'
            '<Point><coordinates>'
            f'{point["longitude"]:.10f},{point["latitude"]:.10f},{point["z"]:.3f}'
            '</coordinates></Point>'
            '</Placemark>'
        )

    line_coordinates = ' '.join(
        f'{point["longitude"]:.10f},{point["latitude"]:.10f},{point["z"]:.3f}'
        for point in transformed_points
    )
    line_description = (
        '<div style="font-family:sans-serif;padding:5px">'
        f'<b>Total length:</b> {stats["total_length_m"]:.3f} m<br/>'
        f'<b>f_x:</b> {stats["fx_mm"]:.3f} mm<br/>'
        f'<b>f_y:</b> {stats["fy_mm"]:.3f} mm<br/>'
        f'<b>f_z:</b> {stats["fz_mm"]:.3f} mm<br/>'
        f'<b>f_s:</b> {stats["fs_mm"]:.3f} mm<br/>'
        f'<b>Relative precision:</b> {escape(stats["relative_precision"])}'
        '</div>'
    ).replace(']]>', ']]]]><![CDATA[>')
    kml_content = '\n'.join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
        f'<name>{escape(stats["traverse_name"])}</name>',
        '<Style id="stationStyle"><IconStyle><scale>0.9</scale><Icon>'
        '<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>'
        '</Icon></IconStyle></Style>',
        '<Style id="traverseLineStyle"><LineStyle><color>ffff9900</color><width>3</width></LineStyle></Style>',
        *placemarks,
        '<Placemark><name>Traverse Line</name><styleUrl>#traverseLineStyle</styleUrl>',
        f'<description><![CDATA[{line_description}]]></description>',
        f'<LineString><tessellate>1</tessellate><coordinates>{line_coordinates}</coordinates></LineString>',
        '</Placemark></Document></kml>'
    ])
    return Response(
        kml_content,
        mimetype='application/vnd.google-earth.kml+xml',
        headers={"Content-Disposition": "attachment; filename=traverse_network.kml"}
    )


@app.route('/api/traverse/export-dxf', methods=['POST'])
def export_traverse_dxf():
    try:
        data = request.json or {}
        
        # Υποστήριξη είτε 'results' είτε 'points' για συμβατότητα
        results = data.get('results') or data.get('points', [])
        measurements = data.get('measurements', [])
        
        # 1. Λήψη κλίμακας από το request (αν δεν υπάρχει, default '1:1000')
        scale = data.get('scale', '1:1000')

        # Helper για ανάκτηση τιμών από dict ή object
        def get_val(obj, *keys):
            for k in keys:
                if isinstance(obj, dict):
                    if k in obj and obj[k] is not None:
                        return obj[k]
                else:
                    val = getattr(obj, k, None)
                    if val is None and hasattr(obj, 'get') and callable(getattr(obj, 'get')):
                        val = obj.get(k, None)
                    if val is not None:
                        return val
            return None

        # Φιλτράρισμα έγκυρων σημείων
        valid_points = [p for p in results if get_val(p, 'X', 'Xi', 'x') is not None and get_val(p, 'Y', 'Yi', 'y') is not None]

        if not valid_points:
            return jsonify({"error": "No valid points to export."}), 400

        X = [float(get_val(p, 'X', 'Xi', 'x')) for p in valid_points]
        Y = [float(get_val(p, 'Y', 'Yi', 'y')) for p in valid_points]
        names = [str(get_val(p, 'name', 'Name') or f"P{i}").strip() for i, p in enumerate(valid_points)]
        n = len(valid_points)

        # Ταυτοποίηση σημείων εξάρτησης/προσανατολισμού (orient_indices) vs στάσεων (station_indices)
        orient_indices = []
        fixed_indices = [0, 1, n-2, n-1] if n >= 4 else [0, n-1]

        for i in range(n):
            if i in fixed_indices or "Σ" in names[i].upper():
                orient_indices.append(i)

        # Δημιουργία νέου DXF εγγράφου
        doc = ezdxf.new('R2010')
        doc.styles.new('GreekStyle', dxfattribs={'font': 'arial.ttf'})

        if 'DASHED' not in doc.linetypes:
            doc.linetypes.new('DASHED', dxfattribs={'description': 'Dashed', 'pattern': [1.5, 1.0, -0.5]})

        msp = doc.modelspace()

        # Layers
        doc.layers.new('GRID', dxfattribs={'color': 8})
        doc.layers.new('GRID_TEXT', dxfattribs={'color': 7})
        doc.layers.new('TRAVERSE_LINES', dxfattribs={'color': 6})                  # Ματζέντα
        doc.layers.new('CONTROL_LINES', dxfattribs={'color': 8, 'linetype': 'DASHED'}) # Γκρι διακεκομμένη
        doc.layers.new('POINTS', dxfattribs={'color': 4})                          # Κυανό
        doc.layers.new('POINT_NAMES', dxfattribs={'color': 7})                     # Λευκό
        doc.layers.new('DISTANCES', dxfattribs={'color': 7})                       # Λευκό για μετρημένες
        doc.layers.new('DISTANCES_GRAY', dxfattribs={'color': 8})                  # Γκρι για εξάρτησης
        doc.layers.new('ANGLES', dxfattribs={'color': 8})                          # Γκρι
        doc.layers.new('DECORATIONS', dxfattribs={'color': 4})                     # Κυανό/Ματζέντα

        min_x, max_x = min(X), max(X)
        min_y, max_y = min(Y), max(Y)

        # ==========================================
        # 1. ΥΠΟΛΟΓΙΣΜΟΣ ΒΗΜΑΤΟΣ ΚΑΝΝΑΒΟΥ ΒΑΣΕΙ ΚΛΙΜΑΚΑΣ
        # ==========================================
        
        # 2. Εξαγωγή του αριθμού της κλίμακας (π.χ. '1:500' -> 500)
        try:
            scale_num = int(str(scale).split(':')[-1])
        except (ValueError, AttributeError):
            scale_num = 1000

        if scale_num <= 200:
            grid_step = 20.0
        elif scale_num <= 500:
            grid_step = 50.0
        elif scale_num <= 1000:
            grid_step = 100.0
        else:
            grid_step = float(max(100, scale_num // 10))

        margin = grid_step * 0.8
        start_x = math.floor((min_x - margin) / grid_step) * grid_step
        end_x = math.ceil((max_x + margin) / grid_step) * grid_step
        start_y = math.floor((min_y - margin) / grid_step) * grid_step
        end_y = math.ceil((max_y + margin) / grid_step) * grid_step

        cross_size = 0.5

        # Σχεδίαση καννάβου
        curr_x = start_x
        while curr_x <= end_x + 0.1:
            curr_y = start_y
            txt = msp.add_text(f"{curr_x:.0f}", dxfattribs={'style': 'GreekStyle', 'height': 1.2, 'layer': 'GRID_TEXT'})
            txt.set_placement((curr_x, start_y - 2), align=TextEntityAlignment.MIDDLE_RIGHT)
            txt.dxf.rotation = 45

            while curr_y <= end_y + 0.1:
                msp.add_line((curr_x - cross_size, curr_y), (curr_x + cross_size, curr_y), dxfattribs={'layer': 'GRID'})
                msp.add_line((curr_x, curr_y - cross_size), (curr_x, curr_y + cross_size), dxfattribs={'layer': 'GRID'})

                if abs(curr_x - start_x) < 0.1:
                    txt = msp.add_text(f"{curr_y:.0f}", dxfattribs={'style': 'GreekStyle', 'height': 1.2, 'layer': 'GRID_TEXT'})
                    txt.set_placement((start_x - 2, curr_y), align=TextEntityAlignment.MIDDLE_RIGHT)

                curr_y += grid_step
            curr_x += grid_step

        # ==========================================
        # 2. ΣΧΕΔΙΑΣΗ ΠΛΕΥΡΩΝ & ΑΠΟΣΤΑΣΕΩΝ
        # ==========================================
        annotated_segments = set()

        for i in range(n - 1):
            p1_name = names[i]
            p2_name = names[i+1]
            x1, y1 = X[i], Y[i]
            x2, y2 = X[i+1], Y[i+1]

            # Επιλογή Layer Γραμμής (Πρώτη & τελευταία πλευρά διακεκομμένη αν n >= 4)
            if n >= 4 and (i == 0 or i == n - 2):
                line_layer = 'CONTROL_LINES'
                dist_layer = 'DISTANCES_GRAY'
            else:
                line_layer = 'TRAVERSE_LINES'
                dist_layer = 'DISTANCES'

            msp.add_line((x1, y1), (x2, y2), dxfattribs={'layer': line_layer})

            # Αποφυγή διπλοεγγραφής
            segment_key = tuple(sorted([p1_name, p2_name]))
            if segment_key in annotated_segments:
                continue
            annotated_segments.add(segment_key)

            # Αναζήτηση απόστασης
            dist_str = None
            if measurements:
                if i < len(measurements) and str(get_val(measurements[i], 'name', 'Name', '')).strip() == p1_name:
                    val = get_val(measurements[i], 'sd')
                    if val and str(val).strip() != "-":
                        dist_str = str(val).strip()

                if not dist_str:
                    for row in measurements:
                        if str(get_val(row, 'name', 'Name', '')).strip() == p1_name:
                            val = get_val(row, 'sd')
                            if val and str(val).strip() != "-":
                                dist_str = str(val).strip()
                                break

            if not dist_str or dist_str == "" or dist_str == "-":
                geom_dist = math.hypot(x2 - x1, y2 - y1)
                dist_str = f"{geom_dist:.3f}"
            else:
                try:
                    dist_str = f"{float(dist_str):.3f}"
                except ValueError:
                    pass

            # Υπολογισμός θέσης & περιστροφής κειμένου
            mid_x, mid_y = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            dx, dy = x2 - x1, y2 - y1
            angle_deg = math.degrees(math.atan2(dy, dx))

            if 90 < angle_deg <= 270:
                angle_deg -= 180
            elif -180 <= angle_deg < -90:
                angle_deg += 180

            offset = 0.8
            text_x = mid_x - offset * math.sin(math.radians(angle_deg))
            text_y = mid_y + offset * math.cos(math.radians(angle_deg))

            txt = msp.add_text(dist_str, dxfattribs={'style': 'GreekStyle', 'height': 0.9, 'layer': dist_layer})
            txt.set_placement((text_x, text_y), align=TextEntityAlignment.MIDDLE_CENTER)
            txt.dxf.rotation = angle_deg

        # ==========================================
        # 3. ΣΧΕΔΙΑΣΗ ΓΩΝΙΩΝ ΘΛΑΣΗΣ (hz)
        # ==========================================
        for i in range(1, n - 1):
            if i in orient_indices:
                continue

            hz_str = None
            if measurements and i < len(measurements):
                m_row = measurements[i]
                if str(get_val(m_row, 'name', 'Name', '')).strip() == names[i] and get_val(m_row, 'hz'):
                    hz_str = str(get_val(m_row, 'hz')).strip()

            if not hz_str and measurements:
                for row in measurements:
                    if str(get_val(row, 'name', 'Name', '')).strip() == names[i] and get_val(row, 'hz'):
                        hz_str = str(get_val(row, 'hz')).strip()
                        break

            if hz_str and hz_str != "" and hz_str != "-":
                try:
                    hz_text = f"{float(hz_str):.4f}g"
                except ValueError:
                    hz_text = hz_str

                txt = msp.add_text(hz_text, dxfattribs={'style': 'GreekStyle', 'height': 0.8, 'layer': 'ANGLES'})
                txt.set_placement((X[i] - 2.5, Y[i] - 1.5))

        # ==========================================
        # 4. ΣΧΕΔΙΑΣΗ ΣΗΜΕΙΩΝ & ΟΝΟΜΑΤΩΝ
        # ==========================================
        for i in range(n):
            x_float, y_float = X[i], Y[i]
            name = names[i]
            is_orient = i in orient_indices
            r = 1.0

            if is_orient:
                # Τρίγωνο για σημεία προσανατολισμού/εξάρτησης
                p1 = (x_float, y_float + r)
                p2 = (x_float - r*0.866, y_float - r*0.5)
                p3 = (x_float + r*0.866, y_float - r*0.5)
                msp.add_lwpolyline([p1, p2, p3, p1], dxfattribs={'layer': 'POINTS'})
            else:
                # Κύκλος με σταυρό για ενδιάμεσες στάσεις
                msp.add_circle((x_float, y_float), radius=r, dxfattribs={'layer': 'POINTS'})
                msp.add_line((x_float - r, y_float), (x_float + r, y_float), dxfattribs={'layer': 'POINTS'})
                msp.add_line((x_float, y_float - r), (x_float, y_float + r), dxfattribs={'layer': 'POINTS'})

            txt = msp.add_text(name, dxfattribs={'style': 'GreekStyle', 'height': 1.5, 'layer': 'POINT_NAMES'})
            txt.set_placement((x_float + r*1.2, y_float + r*1.2))

        # ==========================================
        # 5. ΒΟΡΡΑΣ & ΔΥΝΑΜΙΚΗ ΚΛΙΜΑΚΑ
        # ==========================================
        nx = end_x - 10
        ny = end_y - 10
        msp.add_lwpolyline([(nx, ny), (nx, ny+6), (nx-1.5, ny+4), (nx, ny+8), (nx+1.5, ny+4), (nx, ny+6)], dxfattribs={'layer': 'TRAVERSE_LINES'})
        txt_n = msp.add_text("N", dxfattribs={'style': 'GreekStyle', 'height': 2.5, 'layer': 'POINT_NAMES'})
        txt_n.set_placement((nx, ny-1), align=TextEntityAlignment.TOP_CENTER)

        # Δυναμικός υπολογισμός μήκους μπάρας κλίμακας
        x_range = max_x - min_x
        target_len = x_range * 0.20

        if target_len <= 15: bar_len, step = 10, 2.5
        elif target_len <= 35: bar_len, step = 20, 5
        elif target_len <= 75: bar_len, step = 50, 10
        elif target_len <= 150: bar_len, step = 100, 25
        elif target_len <= 350: bar_len, step = 200, 50
        elif target_len <= 750: bar_len, step = 500, 100
        else:
            bar_len = round(target_len / 100) * 100
            step = bar_len / 4

        sx = start_x + 10
        sy = start_y + 10

        msp.add_line((sx, sy), (sx + bar_len, sy), dxfattribs={'layer': 'POINT_NAMES'})

        curr_bar_x = sx
        val = 0
        while val <= bar_len + (step * 0.1):
            msp.add_line((curr_bar_x, sy), (curr_bar_x, sy + 1), dxfattribs={'layer': 'POINT_NAMES'})
            lbl_val = int(val) if float(val).is_integer() else val
            lbl_str = f"{lbl_val}m" if val >= bar_len else f"{lbl_val}"
            
            txt_b = msp.add_text(lbl_str, dxfattribs={'style': 'GreekStyle', 'height': 0.8, 'layer': 'POINT_NAMES'})
            txt_b.set_placement((curr_bar_x, sy + 1.5), align=TextEntityAlignment.BOTTOM_CENTER)
            
            curr_bar_x += step
            val += step

        # Αφαιρέθηκε και η γραμμή της κλίμακας
        
        # ==========================================
        # 6. ΕΞΑΓΩΓΗ
        # ==========================================
        stream = io.StringIO()
        doc.write(stream)
        mem_bytes = io.BytesIO(stream.getvalue().encode('utf-8'))

        return send_file(
            mem_bytes,
            mimetype='application/dxf',
            as_attachment=True,
            download_name='traverse_diagram.dxf'
        )
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εξαγωγή DXF:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 3. ENDPOINT ΓΙΑ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ ΥΨΟΜΕΤΡΙΑ
# ==========================================
@app.route('/api/traverse_height', methods=['POST'])
def run_traverse_height():
    try:
        data = request.json or {}
        
        observations = data.get('observations', [])
        stations = data.get('stations', [])
        
        tol_s = float(data.get('tolD', 0.050))
        tol_dh = float(data.get('tolDH', 0.020))

        if not observations or not stations:
            return jsonify({"error": "Λείπουν δεδομένα παρατηρήσεων ή στάσεων."}), 400

        measurements_json = []

        for st in stations:
            measurements_json.append({
                "id": st.get("id"),
                "name": st.get("name", ""),
                "h": st.get("h", "")
            })

        for obs in observations:
            from_st = obs.get("From") or obs.get("from") or ""
            to_st = obs.get("To") or obs.get("to") or ""
            
            dist_val = obs.get("s") or obs.get("Slope_D") or obs.get("dist") or 0.0
            z_val = obs.get("z") or obs.get("Z[grad]") or 0.0
            hs_val = obs.get("hi") or obs.get("H_station") or 0.0
            ht_val = obs.get("ht") or obs.get("H_target") or 0.0

            measurements_json.append({
                "id": obs.get("id"),
                "From": from_st,
                "To": to_st,
                "Dist": float(dist_val) if dist_val else 0.0, 
                "Z_grad": float(z_val) if z_val else 0.0,
                "H_station": float(hs_val) if hs_val else 0.0,
                "H_target": float(ht_val) if ht_val else 0.0
            })

        updated_json, tolerance_report = dpr.traverse_level_calc(
            measurements_json, 
            tol_dh=tol_dh, 
            tol_s=tol_s
        )

        updated_stations = []
        updated_observations = []
        
        if updated_json:
            for row in updated_json:
                if "name" in row and row["name"] != "":
                    updated_stations.append({
                        "id": row.get("id"),
                        "name": row.get("name"),
                        "h": row.get("h")
                    })
                elif "From" in row and row["From"] != "":
                    updated_observations.append({
                        "id": row.get("id"),
                        "from": row.get("From"),
                        "to": row.get("To"),
                        "s": row.get("Dist"),
                        "z": row.get("Z_grad"),
                        "hi": row.get("H_station"),
                        "ht": row.get("H_target"),
                        "dh_mean": row.get("dh_mean"),
                        "corr": row.get("corr"),
                        "dh_final": row.get("dh_final")
                    })

        # Ενημέρωση latest_traverse.json
        try:
            project_name = get_active_project_name() if 'get_active_project_name' in globals() else None
            project_dir = get_request_project_dir(project_name) if 'WORKSPACE_DIR' in globals() else None
            if project_dir:
                json_path = project_dir / "latest_traverse.json"
                if json_path.exists():
                    with open(json_path, 'r', encoding='utf-8') as f:
                        traverse_data = json.load(f)

                    heights_map = {
                        str(st["name"]): st["h"] 
                        for st in updated_stations 
                        if st.get("name") and st.get("h") not in [None, "", "---"]
                    }

                    file_updated = False
                    for station in traverse_data:
                        st_name = station.get("Station_Name")
                        if st_name in heights_map:
                            station["ZS"] = float(heights_map[st_name])
                            file_updated = True

                    if file_updated:
                        atomic_write_json(json_path, traverse_data)
        except Exception as e:
            print(f"DEBUG WARNING: Σφάλμα αποθήκευσης ZS: {e}")

        return jsonify({
            "status": "success",
            "stations": updated_stations,
            "observations": updated_observations,
            "toleranceReport": tolerance_report
        })

    except Exception as e:
        print(f"DEBUG ERROR: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

#trigonometriki ypsometria odeusis no correction 
@app.route('/api/traverse_height_no_correction', methods=['POST'])
def run_traverse_height_no_correction():
    try:
        data = request.json or {}
        
        observations = data.get('observations', [])
        stations = data.get('stations', [])
        
        tol_s = float(data.get('tolD', 0.050))
        tol_dh = float(data.get('tolDH', 0.020))

        if not observations or not stations:
            return jsonify({"error": "Λείπουν δεδομένα παρατηρήσεων ή στάσεων."}), 400

        measurements_json = []

        for st in stations:
            measurements_json.append({
                "id": st.get("id"),
                "name": st.get("name", ""),
                "h": st.get("h", "")
            })

        for obs in observations:
            from_st = obs.get("From") or obs.get("from") or ""
            to_st = obs.get("To") or obs.get("to") or ""
            
            dist_val = obs.get("s") or obs.get("Slope_D") or obs.get("dist") or 0.0
            z_val = obs.get("z") or obs.get("Z[grad]") or 0.0
            hs_val = obs.get("hi") or obs.get("H_station") or 0.0
            ht_val = obs.get("ht") or obs.get("H_target") or 0.0

            measurements_json.append({
                "id": obs.get("id"),
                "From": from_st,
                "To": to_st,
                "Dist": float(dist_val) if dist_val else 0.0, 
                "Z_grad": float(z_val) if z_val else 0.0,
                "H_station": float(hs_val) if hs_val else 0.0,
                "H_target": float(ht_val) if ht_val else 0.0
            })

        # Κλήση της νέας συνάρτησης χωρίς υπολογισμό/κατανομή διορθώσεων
        updated_json, tolerance_report = dpr.traverse_level_calc_no_correction(
            measurements_json, 
            tol_dh=tol_dh, 
            tol_s=tol_s
        )

        updated_stations = []
        updated_observations = []
        
        if updated_json:
            for row in updated_json:
                if "name" in row and row["name"] != "":
                    updated_stations.append({
                        "id": row.get("id"),
                        "name": row.get("name"),
                        "h": row.get("h")
                    })
                elif "From" in row and row["From"] != "":
                    updated_observations.append({
                        "id": row.get("id"),
                        "from": row.get("From"),
                        "to": row.get("To"),
                        "s": row.get("Dist"),
                        "z": row.get("Z_grad"),
                        "hi": row.get("H_station"),
                        "ht": row.get("H_target"),
                        "dh_mean": row.get("dh_mean"),
                        "corr": row.get("corr"),
                        "dh_final": row.get("dh_final")
                    })

        # Ενημέρωση latest_traverse.json
        try:
            project_name = get_active_project_name() if 'get_active_project_name' in globals() else None
            project_dir = get_request_project_dir(project_name) if 'WORKSPACE_DIR' in globals() else None
            if project_dir:
                json_path = project_dir / "latest_traverse.json"
                if json_path.exists():
                    with open(json_path, 'r', encoding='utf-8') as f:
                        traverse_data = json.load(f)

                    heights_map = {
                        str(st["name"]): st["h"] 
                        for st in updated_stations 
                        if st.get("name") and st.get("h") not in [None, "", "---"]
                    }

                    file_updated = False
                    for station in traverse_data:
                        st_name = station.get("Station_Name")
                        if st_name in heights_map:
                            station["ZS"] = float(heights_map[st_name])
                            file_updated = True

                    if file_updated:
                        atomic_write_json(json_path, traverse_data)
        except Exception as e:
            print(f"DEBUG WARNING: Σφάλμα αποθήκευσης ZS: {e}")

        return jsonify({
            "status": "success",
            "stations": updated_stations,
            "observations": updated_observations,
            "toleranceReport": tolerance_report
        })

    except Exception as e:
        print(f"DEBUG ERROR: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

## ==========================================
# ENDPOINT ΓΙΑ ΧΩΡΟΣΤΑΘΜΗΣΗ (SPIRIT LEVELING)
# ==========================================
@app.route('/api/traverse_spirit_leveling', methods=['POST'])  # Alias για συμβατότητα με το axios request του UI
def run_traverse_spirit_level():
    try:
        data = request.json or {}
        
        # Λήψη δεδομένων (Υποστήριξη για 'forward'/'backward' του UI & 'forward_data'/'backward_data')
        forward_data = data.get('forward') or data.get('forward_data') or []
        backward_data = data.get('backward') or data.get('backward_data') or []
        start_elevation = float(data.get('start_elevation', 0.0))

        if not forward_data:
            return jsonify({"error": "Λείπουν δεδομένα μετάβασης."}), 400

        # 1. Κλήση της ενημερωμένης συνάρτησης υπολογισμού
        result = dpr.traverse_spirit_leveling(forward_data, backward_data, start_elevation)

        # ----------------------------------------------------------------------
        # 2. Ενημέρωση του latest_traverse.json με τα νέα υψόμετρα (ZS)
        # ----------------------------------------------------------------------
        try:
            # Ανάγνωση του Active-Project από τα headers της αίτησης (όπως τα στέλνει το UI)
            project_name = request.headers.get('Active-Project') or (
                get_active_project_name() if 'get_active_project_name' in globals() else None
            )
            project_dir = get_request_project_dir(project_name) if 'WORKSPACE_DIR' in globals() else None

            if project_dir:
                json_path = project_dir / "latest_traverse.json"
                if json_path.exists():
                    with open(json_path, 'r', encoding='utf-8') as f:
                        traverse_data = json.load(f)

                    # Χάρτης με τα νέα τελικά υψόμετρα των σημείων
                    heights_map = {}
                    for row in result.get('forward_results', []):
                        pt_name = row.get('point')
                        elev = row.get('elevation')
                        if pt_name and elev not in [None, "", "---"]:
                            heights_map[str(pt_name).strip()] = float(elev)

                    # Ενημέρωση των ZS πεδίων στο αρχείο της όδευσης
                    file_updated = False
                    for station in traverse_data:
                        st_name = str(station.get("Station_Name", "")).strip()
                        if st_name in heights_map:
                            station["ZS"] = heights_map[st_name]
                            file_updated = True

                    if file_updated:
                        atomic_write_json(json_path, traverse_data)
        except Exception as e:
            print(f"DEBUG WARNING: Σφάλμα αποθήκευσης ZS από Χωροστάθμιση: {e}")

        # 3. Προσθήκη status και επιστροφή της πλήρους δομής (forward_results, backward_results, metrics, legs)
   
        result["status"] = "success"
        
        # --- ΠΡΟΣΘΕΣΕ ΑΥΤΕΣ ΤΙΣ ΓΡΑΜΜΕΣ ΕΔΩ ---
        if "forward" in result and "forward_results" not in result:
            result["forward_results"] = result.pop("forward")
            
        if "backward" in result and "backward_results" not in result:
            result["backward_results"] = result.pop("backward")

        return jsonify(result)

    except Exception as e:
        print(f"DEBUG ERROR: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 3. ENDPOINT ΓΙΑ ΤΑΧΥΜΕΤΡΙΑ (TACHYMETRY) 
# ==========================================
@app.route('/api/tachymetry', methods=['POST'])
def run_tachymetry():
    data = request.json or {}
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])
    
    target_station = data.get('station_name')
    target_orientation = data.get('orientation_name')

    if not measurements:
        return jsonify({"results": []})

    # 1. Μετατροπή των λιστών JSON σε Pandas DataFrames
    df_meas = pd.DataFrame(measurements)
    df_st = pd.DataFrame(stations)
    
    # 2. Εξασφάλιση ότι τα ονόματα στηλών στους σταθμούς ταιριάζουν
    rename_st = {}
    for col in df_st.columns:
        if col.lower() in ['station_name', 'station']: rename_st[col] = 'Station_Name'
        if col.lower() in ['xs', 'x']: rename_st[col] = 'XS'
        if col.lower() in ['ys', 'y']: rename_st[col] = 'YS'
        if col.lower() in ['zs', 'z']: rename_st[col] = 'ZS'
    df_st.rename(columns=rename_st, inplace=True)

    # 3. ΕΥΡΕΣΗ ΦΑΚΕΛΟΥ PROJECT & ΑΝΑΓΝΩΣΗ ΔΕΔΟΜΕΝΩΝ ΑΠΟ .JSON
    project_name = get_active_project_name()
    project_dir = get_request_project_dir(project_name)
    traverse_file = project_dir / "latest_traverse.json" if project_dir else None
    project_state_file = project_dir / "project_state.json" if project_dir else None
    
    traverse_stations = []
    
    # 1η Προσπάθεια: Ανάγνωση από το latest_traverse.json
    if traverse_file and traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    # 2η Προσπάθεια (Fallback): Ανάγνωση από το project_state.json
    elif project_state_file and project_state_file.exists():
        try:
            with open(project_state_file, 'r', encoding='utf-8') as f:
                p_state = json.load(f)
                t_data = p_state.get('traverse_data', [])
                for pt in t_data:
                    if pt.get('name') and pt.get('x') and pt.get('y'):
                        traverse_stations.append({
                            "Station_Name": str(pt['name']),
                            "XS": float(pt['x']),
                            "YS": float(pt['y']),
                            "ZS": 0.0
                        })
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

    # Συγχώνευση των στάσεων στο df_st
    if traverse_stations:
        try:
            df_trav = pd.DataFrame(traverse_stations)
            
            if 'Station_Name' in df_st.columns:
                df_st['Station_Name'] = df_st['Station_Name'].astype(str).str.strip()
            if 'Station_Name' in df_trav.columns:
                df_trav['Station_Name'] = df_trav['Station_Name'].astype(str).str.strip()
            
            df_st = pd.concat([df_st, df_trav], ignore_index=True)
            df_st = df_st.drop_duplicates(subset=['Station_Name'], keep='last')
            
            print(f"SUCCESS: Φορτώθηκαν στάσεις από το project '{project_name}'! Σύνολο: {len(df_st)}")
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

    try:
        # 4. Εκτέλεση υπολογισμού Ταχυμετρίας
        results_df, _, _ = dpr.tachymetry(
            data_meas=df_meas, 
            data_st=df_st, 
            target_station=target_station,
            target_orientation=target_orientation
        )
        
        calculated_points = results_df.to_dict('records') if not results_df.empty else []

        st_lookup = df_st.set_index('Station_Name').to_dict('index')
        st_lookup_vis = {k: {'x': v['XS'], 'y': v['YS'], 'z': v['ZS']} for k, v in st_lookup.items()}

        plot_base64 = None
        try:
            plot_base64 = vis.plot_tachymetry_base64(calculated_points, st_lookup_vis)
        except Exception as plot_err:
            print(f"ERROR: Σφάλμα κατά τη δημιουργία του σκαριφήματος ταχυμετρίας: {plot_err}")

        return jsonify({
            "results": calculated_points,
            "plot": plot_base64
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό ταχυμετρίας:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# =========================================================
# 3b. ENDPOINT ΓΙΑ ΜΑΖΙΚΗ ΕΞΑΓΩΓΗ ΤΑΧΥΜΕΤΡΙΑΣ ΣΕ .TXT
# =========================================================
@app.route('/api/tachymetry/export', methods=['POST'])
def export_tachymetry_txt():
    data = request.json or {}
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])

    if not measurements:
        return jsonify({"error": "Δεν βρέθηκαν μετρήσεις"}), 400

    # 1. Μετατροπή σε DataFrames & renaming
    df_meas = pd.DataFrame(measurements)
    df_st = pd.DataFrame(stations)
    
    rename_st = {}
    for col in df_st.columns:
        if col.lower() in ['station_name', 'station']: rename_st[col] = 'Station_Name'
        if col.lower() in ['xs', 'x']: rename_st[col] = 'XS'
        if col.lower() in ['ys', 'y']: rename_st[col] = 'YS'
        if col.lower() in ['zs', 'z']: rename_st[col] = 'ZS'
    df_st.rename(columns=rename_st, inplace=True)

    # 2. Ανάγνωση στάσεων από τα αρχεία του project (latest_traverse / project_state)
    project_name = get_active_project_name()
    project_dir = get_request_project_dir(project_name)
    traverse_file = project_dir / "latest_traverse.json" if project_dir else None
    project_state_file = project_dir / "project_state.json" if project_dir else None
    
    traverse_stations = []
    
    if traverse_file and traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    elif project_state_file and project_state_file.exists():
        try:
            with open(project_state_file, 'r', encoding='utf-8') as f:
                p_state = json.load(f)
                t_data = p_state.get('traverse_data', [])
                for pt in t_data:
                    if pt.get('name') and pt.get('x') and pt.get('y'):
                        traverse_stations.append({
                            "Station_Name": str(pt['name']),
                            "XS": float(pt['x']),
                            "YS": float(pt['y']),
                            "ZS": 0.0
                        })
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

    # Συγχώνευση των στάσεων
    if traverse_stations:
        try:
            df_trav = pd.DataFrame(traverse_stations)
            if 'Station_Name' in df_st.columns:
                df_st['Station_Name'] = df_st['Station_Name'].astype(str).str.strip()
            if 'Station_Name' in df_trav.columns:
                df_trav['Station_Name'] = df_trav['Station_Name'].astype(str).str.strip()
            
            df_st = pd.concat([df_st, df_trav], ignore_index=True)
            df_st = df_st.drop_duplicates(subset=['Station_Name'], keep='last')
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

    # 3. Εντοπισμός στηλών Στάσης & Προσανατολισμού
    st_col = None
    or_col = None
    for c in df_meas.columns:
        if c.lower() in ['_filledstation', 'station', 'from']: st_col = c
        if c.lower() in ['_filledorientation', 'orientation', 'o', 'backsight']: or_col = c

    all_calculated_points = []
    seen_keys = set()

    if st_col and or_col:
        # Fill down για σιγουριά
        df_meas[st_col] = df_meas[st_col].replace('', None).ffill()
        df_meas[or_col] = df_meas[or_col].replace('', None).ffill()

        # Εύρεση μοναδικών συνδυασμών Στάσης - Προσανατολισμού
        unique_pairs = df_meas[[st_col, or_col]].dropna().drop_duplicates().to_dict('records')

        for pair in unique_pairs:
            target_st = str(pair[st_col]).strip()
            target_or = str(pair[or_col]).strip()

            try:
                res_df, _, _ = dpr.tachymetry(
                    data_meas=df_meas,
                    data_st=df_st,
                    target_station=target_st,
                    target_orientation=target_or
                )
                if res_df is not None and not res_df.empty:
                    for rec in res_df.to_dict('records'):
                        pt_name = str(rec.get('Σημείο', rec.get('Point_ID', '')))
                        st_name = str(rec.get('Στάση', target_st))
                        dedup_key = (st_name.upper(), pt_name.upper())

                        if dedup_key not in seen_keys:
                            seen_keys.add(dedup_key)
                            all_calculated_points.append({
                                'station': st_name,
                                'point': pt_name,
                                'x': float(rec.get('X', 0.0)),
                                'y': float(rec.get('Y', 0.0)),
                                'z': float(rec.get('Z', 0.0))
                            })
            except Exception as err:
                print(f"WARNING: Σφάλμα υπολογισμού για στάση {target_st} - {target_or}: {err}")

# 4. Δημιουργία δομημένου περιεχομένου .txt
    lines = []
    
    # Αλλαγή της κεφαλίδας για να έχει μόνο Point ID, X, Y, Z
    lines.append(f"{'Point ID':<15} {'X (m)':>14} {'Y (m)':>14} {'Z (m)':>12}")

    for p in all_calculated_points:
        # Αφαίρεση του st_str (Στάση)
        pt_str = f"{p['point']:<15}"
        x_str = f"{p['x']:>14.3f}"
        y_str = f"{p['y']:>14.3f}"
        z_str = f"{p['z']:>12.3f}"
        
        # Προσθήκη μόνο των επιθυμητών στηλών στη γραμμή
        lines.append(f"{pt_str} {x_str} {y_str} {z_str}")

    # Μείωση του μήκους της διαχωριστικής γραμμής ώστε να ταιριάζει με τις 4 στήλες
    lines.append("-" * 58)
    lines.append(f"Σύνολο Υπολογισμένων Σημείων: {len(all_calculated_points)}")

    txt_content = "\n".join(lines)
    filename = f"tachymetry_all_points_{project_name if project_name else 'export'}.txt"

    return jsonify({
        "txt_content": txt_content,
        "filename": filename,
        "total_points": len(all_calculated_points)
    })

@app.route('/api/tachymetry/export_dxf', methods=['POST'])
def export_tachymetry_dxf():
    data = request.json or {}
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])

    if not measurements:
        return jsonify({"error": "Δεν βρέθηκαν μετρήσεις"}), 400

    # 1. Μετατροπή σε DataFrames & renaming (ΟΛΟ ΙΔΙΟ ΜΕ TXT)
    df_meas = pd.DataFrame(measurements)
    df_st = pd.DataFrame(stations)
    
    rename_st = {}
    for col in df_st.columns:
        if col.lower() in ['station_name', 'station']: rename_st[col] = 'Station_Name'
        if col.lower() in ['xs', 'x']: rename_st[col] = 'XS'
        if col.lower() in ['ys', 'y']: rename_st[col] = 'YS'
        if col.lower() in ['zs', 'z']: rename_st[col] = 'ZS'
    df_st.rename(columns=rename_st, inplace=True)

    # 2. Ανάγνωση στάσεων από τα αρχεία του project (ΟΛΟ ΙΔΙΟ ΜΕ TXT)
    project_name = get_active_project_name()
    project_dir = get_request_project_dir(project_name)
    traverse_file = project_dir / "latest_traverse.json" if project_dir else None
    project_state_file = project_dir / "project_state.json" if project_dir else None
    
    traverse_stations = []
    
    if traverse_file and traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    elif project_state_file and project_state_file.exists():
        try:
            with open(project_state_file, 'r', encoding='utf-8') as f:
                p_state = json.load(f)
                t_data = p_state.get('traverse_data', [])
                for pt in t_data:
                    if pt.get('name') and pt.get('x') and pt.get('y'):
                        traverse_stations.append({
                            "Station_Name": str(pt['name']),
                            "XS": float(pt['x']),
                            "YS": float(pt['y']),
                            "ZS": 0.0
                        })
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

    # Συγχώνευση των στάσεων
    if traverse_stations:
        try:
            df_trav = pd.DataFrame(traverse_stations)
            if 'Station_Name' in df_st.columns:
                df_st['Station_Name'] = df_st['Station_Name'].astype(str).str.strip()
            if 'Station_Name' in df_trav.columns:
                df_trav['Station_Name'] = df_trav['Station_Name'].astype(str).str.strip()
            
            df_st = pd.concat([df_st, df_trav], ignore_index=True)
            df_st = df_st.drop_duplicates(subset=['Station_Name'], keep='last')
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

    # 3. Εντοπισμός στηλών Στάσης & Προσανατολισμού (ΟΛΟ ΙΔΙΟ ΜΕ TXT)
    st_col = None
    or_col = None
    for c in df_meas.columns:
        if c.lower() in ['_filledstation', 'station', 'from']: st_col = c
        if c.lower() in ['_filledorientation', 'orientation', 'o', 'backsight']: or_col = c

    all_calculated_points = []
    seen_keys = set()

    if st_col and or_col:
        # Fill down για σιγουριά
        df_meas[st_col] = df_meas[st_col].replace('', None).ffill()
        df_meas[or_col] = df_meas[or_col].replace('', None).ffill()

        # Εύρεση μοναδικών συνδυασμών Στάσης - Προσανατολισμού
        unique_pairs = df_meas[[st_col, or_col]].dropna().drop_duplicates().to_dict('records')

        for pair in unique_pairs:
            target_st = str(pair[st_col]).strip()
            target_or = str(pair[or_col]).strip()

            try:
                res_df, _, _ = dpr.tachymetry(
                    data_meas=df_meas,
                    data_st=df_st,
                    target_station=target_st,
                    target_orientation=target_or
                )
                if res_df is not None and not res_df.empty:
                    for rec in res_df.to_dict('records'):
                        pt_name = str(rec.get('Σημείο', rec.get('Point_ID', '')))
                        st_name = str(rec.get('Στάση', target_st))
                        dedup_key = (st_name.upper(), pt_name.upper())

                        if dedup_key not in seen_keys:
                            seen_keys.add(dedup_key)
                            all_calculated_points.append({
                                'station': st_name,
                                'point': pt_name,
                                'x': float(rec.get('X', 0.0)),
                                'y': float(rec.get('Y', 0.0)),
                                'z': float(rec.get('Z', 0.0))
                            })
            except Exception as err:
                print(f"WARNING: Σφάλμα υπολογισμού για στάση {target_st} - {target_or}: {err}")

    # 4. ΔΗΜΙΟΥΡΓΙΑ ΤΟΥ DXF (ΝΕΟΣ ΚΩΔΙΚΑΣ)
    try:
        # Δημιουργία ενός νέου εγγράφου DXF (R2010 είναι ασφαλής και ευρέως συμβατή έκδοση)
        doc = ezdxf.new('R2010')
        msp = doc.modelspace()
        
        # Προαιρετικά: Δημιουργία Layers για καλύτερη οργάνωση στο AutoCAD
        doc.layers.add("TACHYMETRY_POINTS", color=3) # Πράσινο
        doc.layers.add("TACHYMETRY_TEXTS", color=2)  # Κίτρινο

        for p in all_calculated_points:
            x, y, z = p['x'], p['y'], p['z']
            pt_id = p['point']
            
            # Προσθήκη του Σημείου (Point Entity)
            msp.add_point((x, y, z), dxfattribs={'layer': 'TACHYMETRY_POINTS'})
            
            # Προσθήκη του Κειμένου (Text Entity) λίγο πιο δίπλα (π.χ. +0.5m) για να μην πέφτει πάνω στο σημείο
            msp.add_text(pt_id, dxfattribs={
                'layer': 'TACHYMETRY_TEXTS', 
                'height': 0.5 # Ύψος κειμένου σε μέτρα
            }).set_placement((x + 0.3, y + 0.3, z))

        # Εγγραφή του DXF σε string/bytes μέσω io.StringIO
        stream = io.StringIO()
        doc.write(stream)
        dxf_content = stream.getvalue()

        filename = f"tachymetry_all_points_{project_name if project_name else 'export'}.dxf"

        return jsonify({
            "dxf_content": dxf_content,
            "filename": filename,
            "total_points": len(all_calculated_points)
        })

    except Exception as e:
        print(f"WARNING: Σφάλμα κατά τη δημιουργία του DXF: {e}")
        return jsonify({"error": "Αποτυχία δημιουργίας αρχείου DXF"}), 500

@app.route('/api/tachymetry/export_geojson', methods=['POST'])
def export_tachymetry_geojson():
    data = request.json or {}
    if not data.get('measurements'):
        return jsonify({"error": "Δεν βρέθηκαν μετρήσεις"}), 400

    project_name, all_calculated_points = _calculate_tachymetry_export_points(data)
    geojson = {
        "type": "FeatureCollection",
        "name": "Tachymetry_Detail_Points",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::2100"}
        },
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [point['x'], point['y'], point['z']]
                },
                "properties": {
                    "point_id": point['point_id'],
                    "x": point['x'],
                    "y": point['y'],
                    "z": point['z'],
                    "occupied_station": point['occupied_station']
                }
            }
            for point in all_calculated_points
        ]
    }
    filename_project = secure_filename(project_name) if project_name else 'export'
    filename = f"tachymetry_detail_points_{filename_project or 'export'}.geojson"
    geojson_bytes = json.dumps(geojson, ensure_ascii=False, allow_nan=False, indent=2).encode('utf-8')
    return send_file(
        BytesIO(geojson_bytes),
        mimetype='application/geo+json',
        as_attachment=True,
        download_name=filename
    )


def _calculate_tachymetry_export_points(data):
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])
    df_meas = pd.DataFrame(measurements)
    df_st = pd.DataFrame(stations)

    rename_st = {}
    for col in df_st.columns:
        if col.lower() in ['station_name', 'station']: rename_st[col] = 'Station_Name'
        if col.lower() in ['xs', 'x']: rename_st[col] = 'XS'
        if col.lower() in ['ys', 'y']: rename_st[col] = 'YS'
        if col.lower() in ['zs', 'z']: rename_st[col] = 'ZS'
    df_st.rename(columns=rename_st, inplace=True)

    project_name = get_active_project_name()
    project_dir = get_request_project_dir(project_name)
    traverse_file = project_dir / "latest_traverse.json" if project_dir else None
    project_state_file = project_dir / "project_state.json" if project_dir else None
    traverse_stations = []

    if traverse_file and traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
    elif project_state_file and project_state_file.exists():
        try:
            with open(project_state_file, 'r', encoding='utf-8') as f:
                p_state = json.load(f)
                for pt in p_state.get('traverse_data', []):
                    if pt.get('name') and pt.get('x') and pt.get('y'):
                        traverse_stations.append({
                            "Station_Name": str(pt['name']),
                            "XS": float(pt['x']),
                            "YS": float(pt['y']),
                            "ZS": 0.0
                        })
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

    if traverse_stations:
        try:
            df_trav = pd.DataFrame(traverse_stations)
            if 'Station_Name' in df_st.columns:
                df_st['Station_Name'] = df_st['Station_Name'].astype(str).str.strip()
            if 'Station_Name' in df_trav.columns:
                df_trav['Station_Name'] = df_trav['Station_Name'].astype(str).str.strip()
            df_st = pd.concat([df_st, df_trav], ignore_index=True)
            df_st = df_st.drop_duplicates(subset=['Station_Name'], keep='last')
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

    st_col = None
    or_col = None
    for col in df_meas.columns:
        if col.lower() in ['_filledstation', 'station', 'from']:
            st_col = col
        if col.lower() in ['_filledorientation', 'orientation', 'o', 'backsight']:
            or_col = col

    all_calculated_points = []
    seen_keys = set()
    if st_col and or_col:
        df_meas[st_col] = df_meas[st_col].replace('', None).ffill()
        df_meas[or_col] = df_meas[or_col].replace('', None).ffill()
        unique_pairs = df_meas[[st_col, or_col]].dropna().drop_duplicates().to_dict('records')

        for pair in unique_pairs:
            target_st = str(pair[st_col]).strip()
            target_or = str(pair[or_col]).strip()
            try:
                res_df, _, _ = dpr.tachymetry(
                    data_meas=df_meas,
                    data_st=df_st,
                    target_station=target_st,
                    target_orientation=target_or
                )
                if res_df is not None and not res_df.empty:
                    for rec in res_df.to_dict('records'):
                        point_id = str(rec.get('Σημείο', rec.get('Point_ID', '')))
                        occupied_station = str(rec.get('Στάση', target_st))
                        dedup_key = (occupied_station.upper(), point_id.upper())
                        if dedup_key not in seen_keys:
                            seen_keys.add(dedup_key)
                            x = float(rec.get('X', 0.0))
                            y = float(rec.get('Y', 0.0))
                            z = float(rec.get('Z', 0.0))
                            if all(math.isfinite(value) for value in (x, y, z)):
                                all_calculated_points.append({
                                    'point_id': point_id,
                                    'occupied_station': occupied_station,
                                    'x': x,
                                    'y': y,
                                    'z': z
                                })
            except Exception as err:
                print(f"WARNING: Σφάλμα υπολογισμού για στάση {target_st} - {target_or}: {err}")

    return project_name, all_calculated_points

@app.route('/api/export/tachymetry/kml', methods=['POST'])
def export_tachymetry_kml():
    data = request.get_json(silent=True) or {}
    points = data.get('points')
    if points is None:
        if not data.get('measurements'):
            return jsonify({"error": "Δεν βρέθηκαν μετρήσεις ή σημεία"}), 400
        project_name, points = _calculate_tachymetry_export_points(data)
    else:
        project_name = get_active_project_name()

    placemarks = []
    for point in points:
        if not isinstance(point, dict):
            continue
        try:
            x = float(point.get('x', point.get('X')))
            y = float(point.get('y', point.get('Y')))
            z = float(point.get('z', point.get('Z')))
        except (TypeError, ValueError):
            continue
        longitude, latitude = EGSA87_TO_WGS84.transform(x, y)
        if not all(math.isfinite(value) for value in (longitude, latitude, z)):
            continue

        point_id = str(point.get('point_id', point.get('point', '')))
        occupied_station = str(point.get('occupied_station', point.get('station', '')))
        description = (
            '<div style="font-family:sans-serif;padding:5px">'
            f'<b>Point ID:</b> {escape(point_id)}<br/>'
            f'<b>X (EGSA):</b> {x:.3f} | <b>Y (EGSA):</b> {y:.3f}<br/>'
            f'<b>Elevation Z:</b> {z:.3f} m<br/>'
            f'<b>Occupied Station:</b> {escape(occupied_station)}'
            '</div>'
        ).replace(']]>', ']]]]><![CDATA[>')
        placemarks.append(
            '<Placemark>'
            f'<name>{escape(point_id)}</name>'
            '<styleUrl>#pointStyle</styleUrl>'
            f'<description><![CDATA[{description}]]></description>'
            '<Point><coordinates>'
            f'{longitude:.10f},{latitude:.10f},{z:.3f}'
            '</coordinates></Point>'
            '</Placemark>'
        )

    kml_content = '\n'.join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        '<Document>',
        '<name>Tachymetry Points</name>',
        '<Style id="pointStyle"><IconStyle><scale>0.9</scale><Icon>'
        '<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>'
        '</Icon></IconStyle></Style>',
        *placemarks,
        '</Document>',
        '</kml>'
    ])
    return Response(
        kml_content,
        mimetype="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": "attachment; filename=tachymetry_points.kml"}
    )

# ==========================================
# CHARAXI
# ==========================================
@app.route('/api/projects/stakeout', methods=['POST'])
def run_stakeout():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Δεν ελήφθησαν δεδομένα"}), 400

        station = data.get('station', {})
        backsight = data.get('backsight', {})
        points_to_stake = data.get('points', [])
        
        # --- ΝΕΑ ΛΟΓΙΚΗ ΣΥΝΤΕΛΕΣΤΗ ΚΛΙΜΑΚΑΣ ---
        scale_mode = data.get('scale_mode', 'Χωρίς')
        scale_factor = float(data.get('scale_factor', 1.0))

        coordinate_values = (
            station.get('x'), station.get('y'),
            backsight.get('x'), backsight.get('y'),
        )
        if any(value is None or value == '' for value in coordinate_values):
            return jsonify({"error": "Συμπληρώστε πρώτα τα δεδομένα Στάσης (X, Y) και Προσανατολισμού (X, Y)!"}), 400

        # Πέρασμα των νέων παραμέτρων στη συνάρτηση
        result = dpr.calculate_stakeout(station, backsight, points_to_stake, scale_mode, scale_factor)

        try:
            plot_base64 = vis.plot_stakeout_base64(station, backsight, result['points'])
            result['plot'] = plot_base64
        except Exception as plot_err:
            print(f"Σφάλμα κατά τη δημιουργία γραφήματος χάραξης: {plot_err}")
            result['plot'] = None

        return jsonify(result)

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό χάραξης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 2C. ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (STAKEOUT - CUSTOM STYLING)
# ==========================================
@app.route('/api/projects/stakeout/report', methods=['POST'])
def export_stakeout_report():
    try:
        data = request.json or {}
        station = data.get('station', {})
        backsight = data.get('backsight', {})
        points = data.get('points', [])
        azimuth_bs = data.get('azimuthBs')
        mij = data.get('mij')
        plot_base64 = data.get('plot')

        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣТОΙΧΕΙΩΝ ΕΡΓΟΥ (PROJECT INFO) ---
        raw_proj = data.get('projectInfo') or data.get('projectSettings') or {}
        
        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get('settings'), dict):
                sources_to_check.append(raw_proj.get('settings'))
        sources_to_check.append(data)

        def extract_field(keys):
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if val is not None and str(val).strip() != '' and str(val).strip().lower() not in ['none', 'null', 'undefined']:
                            return str(val).strip()
            return 'Μη διαθέσιμο'

        proj_name = extract_field(['name', 'projectName', 'project_name', 'title'])
        proj_engineer = extract_field(['designer', 'engineer', 'designerName', 'engineerName', 'author'])
        proj_client = extract_field(['employer', 'client', 'employerName', 'clientName', 'owner'])
        proj_location = extract_field(['location', 'place', 'address'])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH
        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            pdfmetrics.registerFont(TTFont('GreekFont-Bold', font_bold_path))
            registerFontFamily('GreekFont', normal='GreekFont', bold='GreekFont-Bold')
            my_font = 'GreekFont'
            my_font_bold = 'GreekFont-Bold'
        except Exception:
            my_font = 'Helvetica'
            my_font_bold = 'Helvetica-Bold'

        buffer = BytesIO()
        a4_w, a4_h = A4

        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            leftMargin=30, 
            rightMargin=30, 
            topMargin=55, 
            bottomMargin=45
        )
        elements = []
        
        # --- Παλέτα Χρωμάτων ---
        HEADER_BG = colors.HexColor('#0f172a')     
        SUBHEADER_BG = colors.HexColor('#1e293b')  
        ROW_BG_1 = colors.HexColor('#ffffff')      
        ROW_BG_2 = colors.HexColor('#f8fafc')      
        GRID_COLOR = colors.HexColor('#cbd5e1')    
        TEXT_MAIN = colors.HexColor('#0f172a')     
        ACCENT_TITLE = colors.HexColor('#0284c7')  

        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'TopoTitle', parent=styles['Title'], fontName=my_font_bold,
            fontSize=24, leading=22, textColor=ACCENT_TITLE, alignment=0
        )
        h2_style = ParagraphStyle(
            'TopoSecH', fontName=my_font_bold, fontSize=14, leading=14, textColor=HEADER_BG
        )
        th_style = ParagraphStyle(
            'TableHead', parent=styles['Normal'], fontName=my_font_bold,
            fontSize=8.5, leading=10, textColor=colors.white, alignment=1 
        )

        td_norm_style = ParagraphStyle(
            'TdNorm', parent=styles['Normal'], fontName=my_font,
            fontSize=8, leading=10, textColor=TEXT_MAIN, alignment=1
        )
        td_bold_style = ParagraphStyle(
            'TdBold', parent=styles['Normal'], fontName=my_font_bold,
            fontSize=8, leading=10, textColor=TEXT_MAIN, alignment=1
        )

        # Νέα Styles για το Modern Dashboard Box
        modern_label_style = ParagraphStyle(
            'ModernLabel', 
            fontName=my_font_bold, 
            fontSize=7.5, 
            textColor=colors.HexColor('#64748b'),
            spaceAfter=2,
            textTransform='uppercase'
        )
        
        modern_value_style = ParagraphStyle(
            'ModernValue', 
            fontName=my_font_bold, 
            fontSize=11, 
            textColor=TEXT_MAIN,
            spaceAfter=8
        )

        # ========================================================
        # ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ (MODERN DASHBOARD STYLE)
        # ========================================================
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style)
            ]

        project_data = [
            [make_info_cell("ΕΡΓΟ", proj_name), make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client)],
            [make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer), make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location)]
        ]
        
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBEFORE', (0,0), (0,-1), 4, ACCENT_TITLE),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 25))

        # ========================================================
        # ΤΙΤΛΟΣ ΕΓΓΡΑΦΟΥ (Μεταφέρθηκε κάτω από τις πληροφορίες)
        # ========================================================
        elements.append(Paragraph("Αναφορά Χάραξης", title_style))
        elements.append(Spacer(1, 20))

        # ========================================================
        # 1. ΣΤΑΘΜΟΣ ΒΑΣΗΣ & ΠΡΟΣΑΝΑΤΟΛΙΣΜΟΣ
        # ========================================================
        elements.append(Paragraph("1. Στοιχεία Στάσης & Προσανατολισμού", h2_style))
        elements.append(Spacer(1, 10))

        def safe_fmt(val, decimals=3, suffix=""):
            if val in [None, '', '-']: return "-"
            try: return f"{float(val):.{decimals}f}{suffix}"
            except: return str(val)

        g0_str = safe_fmt(azimuth_bs, 4, " g")
        mij_str = safe_fmt(mij, 5)

        st_name = str(station.get('name', '-'))
        st_x = safe_fmt(station.get('x'), 3, " m")
        st_y = safe_fmt(station.get('y'), 3, " m")

        bs_name = str(backsight.get('name', '-'))
        bs_x = safe_fmt(backsight.get('x'), 3, " m")
        bs_y = safe_fmt(backsight.get('y'), 3, " m")

        def val_p(val, bold=True):
            s = td_bold_style if bold else td_norm_style
            return Paragraph(str(val), s)

        summary_table_data = [
            [Paragraph("Στοιχεία Στάσης & Προσανατολισμού", th_style), '', '', ''],
            ["Στάση (St):", val_p(st_name), "Προσανατολισμός (Bs):", val_p(bs_name)],
            ["X Στάσης:", val_p(st_x), "X Προσανατολισμού:", val_p(bs_x)],
            ["Y Στάσης:", val_p(st_y), "Y Προσανατολισμού:", val_p(bs_y)],
            ["Αζιμούθιο G:", val_p(g0_str), "Συντελεστής mᵢⱼ:", val_p(mij_str)]
        ]

        summary_table = Table(summary_table_data, colWidths=[130, 137, 130, 138])
        summary_style = TableStyle([
            ('FONTNAME', (0,0), (-1,-1), my_font),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('TEXTCOLOR', (0,0), (-1,-1), TEXT_MAIN),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            
            ('SPAN', (0,0), (3,0)),
            ('BACKGROUND', (0,0), (3,0), SUBHEADER_BG),

            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('ALIGN', (1,1), (1,-1), 'CENTER'),
            ('ALIGN', (3,1), (3,-1), 'CENTER'),

            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ])
        summary_table.setStyle(summary_style)
        elements.append(summary_table)
        elements.append(Spacer(1, 35))

        # ========================================================
        # 2. ΠΙΝΑΚΑΣ ΣΤΟΙΧΕΙΩΝ ΧΑΡΑΞΗΣ
        # ========================================================
        elements.append(Paragraph("2. Πίνακας Στοιχείων Χάραξης Σημείων", h2_style))
        elements.append(Spacer(1, 10))

        t_headers = [
            Paragraph("Σημείο", th_style),
            Paragraph("Τετμημένη X [m]", th_style),
            Paragraph("Τεταγμένη Y [m]", th_style),
            Paragraph("Γωνία Hz [grad]", th_style),
            Paragraph("Απόσταση D [m]", th_style)
        ]
        
        table_data = [t_headers]
        for pt in points:
            x_val = safe_fmt(pt.get('x'), 3)
            y_val = safe_fmt(pt.get('y'), 3)
            hz_val = safe_fmt(pt.get('hz_stake'), 4)
            dist_val = safe_fmt(pt.get('dist_stake'), 3)

            table_data.append([
                Paragraph(str(pt.get('name', '')), td_bold_style),
                Paragraph(x_val, td_norm_style),
                Paragraph(y_val, td_norm_style),
                Paragraph(hz_val, td_bold_style),
                Paragraph(dist_val, td_bold_style)
            ])
            
        t = Table(table_data, colWidths=[95, 110, 110, 110, 110]) 
        
        t_style_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 2),
            ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ]

        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t.setStyle(TableStyle(t_style_cmds))
        elements.append(t)
        elements.append(Spacer(1, 35))

        # ========================================================
        # 3. ΣΚΑΡΙΦΗΜΑ / ΔΙΑΓΡΑΜΜΑ ΧΑΡΑΞΗΣ
        # ========================================================
        if plot_base64 and "," in plot_base64:
            try:
                encoded_image = plot_base64.split(",")[1]
                img_data = base64.b64decode(encoded_image)
                img_stream = BytesIO(img_data)
                
                img_reader = ImageReader(img_stream)
                orig_w, orig_h = img_reader.getSize()
                
                max_width = a4_w - 60
                max_height = 380

                aspect = orig_w / float(orig_h)
                if (max_width / max_height) < aspect:
                    final_w = max_width
                    final_h = max_width / aspect
                else:
                    final_h = max_height
                    final_w = max_height * aspect

                plot_img = Image(img_stream, width=final_w, height=final_h)
                plot_img.hAlign = 'CENTER'

                sketch_block = [
                    Paragraph("3. Σκαρίφημα Χάραξης", h2_style),
                    Spacer(1, 10),
                    plot_img
                ]
                elements.append(KeepTogether(sketch_block))

            except Exception as img_err:
                print(f"Σφάλμα επεξεργασίας εικόνας διαγράμματος: {img_err}")

        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        doc.build(
            elements, 
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά LASCA",
                font_name=my_font, 
                font_bold_name=my_font_bold, # ή 'Helvetica-Bold' αν δεν έχεις ξεχωριστό bold ελληνικό font
                timestamp_str=current_timestamp, 
                logo_path=str(LOGO_PATH)
            )
        )
        buffer.seek(0)
        
        st_name_clean = station.get('name', 'St')
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"Stakeout_Report_{st_name_clean}.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Stakeout Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
# ==========================================
# 6. ENDPOINTS ΓΙΑ ΒΑΣΙΚΟΥΣ ΥΠΟΛΟΓΙΣΜΟΥΣ
# ==========================================
@app.route('/api/basic_calc/prob1', methods=['POST'])
def calc_prob1():
    try:
        # Παίρνουμε τα δεδομένα από το React
        data = request.json
        
        # Μετατροπή σε floats (με ασφάλεια αν κάτι πάει στραβά)
        xa = float(data.get('xa', 0))
        ya = float(data.get('ya', 0))
        d = float(data.get('d', 0))
        gab = float(data.get('gab', 0))

        # Καλούμε τη συνάρτησή σου από το dpr
        xb, yb = dpr.proto_themeliodes(xa, ya, d, gab)

        # Επιστρέφουμε τα αποτελέσματα
        return jsonify({"xb": xb, "yb": yb})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα στο 1ο Θεμελιώδες:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/basic_calc/prob2', methods=['POST'])
def calc_prob2():
    try:
        # Παίρνουμε τα δεδομένα από το React
        data = request.json
        
        # Μετατροπή σε floats
        xa = float(data.get('xa', 0))
        ya = float(data.get('ya', 0))
        xb = float(data.get('xb', 0))
        yb = float(data.get('yb', 0))

        # Καλούμε τη συνάρτησή σου από το dpr
        result = dpr.deutero_them(xa, ya, xb, yb)
        
        if result is None:
            return jsonify({"error": "Τα σημεία Α και Β ταυτίζονται."}), 400
            
        gab, d = result

        # Επιστρέφουμε τα αποτελέσματα (Γωνία Διεύθυνσης, Απόσταση)
        return jsonify({"gab": gab, "d": d})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα στο 2ο Θεμελιώδες:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/basic_calc/prob3', methods=['POST'])
def calc_prob3():
    try:
        data = request.json
        
        # Παίρνουμε την αρχική γωνία και τη λίστα με τις γωνίες θλάσης
        gprev = float(data.get('gprev', 0))
        b_angles = data.get('b_angles', [])
        
        # Αρχικοποίηση της τρέχουσας γωνίας
        current_g = gprev
        
        # Επαναληπτικός υπολογισμός 3ου Θεμελιώδους για κάθε γωνία θλάσης
        for b in b_angles:
            current_g = dpr.tri_them(current_g, float(b))

        # Επιστρέφουμε την τελική γωνία διεύθυνσης
        return jsonify({"gnext": current_g})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα στο 3ο Θεμελιώδες:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/basic_calc/intersect', methods=['POST'])
def calc_intersect():
    try:
        data = request.json or {}
        labels = {'xa': 'XA', 'ya': 'YA', 'xb': 'XB', 'yb': 'YB', 'a': 'a', 'b': 'b'}
        vals = {}
        for key, label in labels.items():
            raw = data.get(key)
            if raw is None or str(raw).strip() == '':
                return jsonify({"error": f"Το πεδίο '{label}' είναι κενό."}), 400
            try:
                vals[key] = float(str(raw).replace(',', '.'))
            except ValueError:
                return jsonify({"error": f"Το πεδίο '{label}' δεν είναι έγκυρος αριθμός."}), 400


        xm, ym, warnings = dpr.empros(
            vals['xa'], vals['ya'], vals['xb'], vals['yb'], vals['a'], vals['b']
        )
        return jsonify({"xm": xm, "ym": ym, "warnings": warnings})
        
    except dpr.GeodeticError as e:
        return jsonify({"error": str(e)}), 400
    except ZeroDivisionError as e:
        return jsonify({"error": f"Προέκυψε διαίρεση με το μηδέν.\n{e}\nΕλέγξτε τις γωνίες σας."}), 400
    except Exception as e:
        import traceback
        print(f"Σφάλμα στην Εμπροσθοτομία:\n{traceback.format_exc()}")
        return jsonify({"error": f"Προέκυψε σφάλμα: {str(e)}"}), 500

@app.route("/api/intersection/report", methods=["POST"])
def export_intersection_report():
    try:
        data = request.json or {}
        input_rows = data.get("inputData", [])
        result_rows = data.get("resultData", [])

        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ ---
        raw_proj = (
            data.get("projectInfo")
            or data.get("projectSettings")
            or data.get("project_info")
            or data.get("project")
            or {}
        )

        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get("settings"), dict):
                sources_to_check.append(raw_proj.get("settings"))
        sources_to_check.append(data)

        def extract_field(keys):
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if (
                            val is not None
                            and str(val).strip() != ""
                            and str(val).strip().lower()
                            not in ["none", "null", "undefined"]
                        ):
                            return str(val).strip()
            return "Μη διαθέσιμο"

        proj_name = extract_field(
            ["name", "projectName", "project_name", "title"]
        )
        proj_engineer = extract_field(
            [
                "designer",
                "engineer",
                "designerName",
                "engineerName",
                "author",
            ]
        )
        proj_client = extract_field(
            ["employer", "client", "employerName", "clientName", "owner"]
        )
        proj_location = extract_field(["location", "place", "address"])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH
        try:
            pdfmetrics.registerFont(TTFont("GreekFont", font_path))
            pdfmetrics.registerFont(TTFont("GreekFont-Bold", font_bold_path))
            registerFontFamily(
                "GreekFont", normal="GreekFont", bold="GreekFont-Bold"
            )
            my_font = "GreekFont"
            my_font_bold = "GreekFont-Bold"
        except Exception:
            my_font = "Helvetica"
            my_font_bold = "Helvetica-Bold"

        def format_num(val, decimals=4):
            if val is None or val == "":
                return "-"
            try:
                return f"{float(val):.{decimals}f}"
            except (ValueError, TypeError):
                return str(val)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=30,
            rightMargin=30,
            topMargin=55,
            bottomMargin=45,
        )
        elements = []

        # --- ΧΡΩΜΑΤΑ & ΣΤΥΛ ---
        HEADER_BG = colors.HexColor("#0f172a")
        ROW_BG_1 = colors.HexColor("#ffffff")
        ROW_BG_2 = colors.HexColor("#f8fafc")
        GRID_COLOR = colors.HexColor("#cbd5e1")
        TEXT_MAIN = colors.HexColor("#0f172a")
        ACCENT_TITLE = colors.HexColor("#0284c7")
        BRIGHT_GREEN = colors.HexColor("#15803d")

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TopoTitle",
            parent=styles["Title"],
            fontName=my_font_bold,
            fontSize=24,
            leading=22,
            textColor=ACCENT_TITLE,
            alignment=0,
        )
        h2_style = ParagraphStyle(
            "TopoSecH",
            fontName=my_font_bold,
            fontSize=14,
            leading=14,
            textColor=HEADER_BG,
            keepWithNext=True,
        )
        header_style = ParagraphStyle(
            "TableHead",
            fontName=my_font_bold,
            fontSize=10,
            textColor=colors.white,
            alignment=1,
        )
        modern_label_style = ParagraphStyle(
            "ModernLabel",
            fontName=my_font_bold,
            fontSize=7.5,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=2,
            textTransform="uppercase",
        )
        modern_value_style = ParagraphStyle(
            "ModernValue",
            fontName=my_font_bold,
            fontSize=11,
            textColor=TEXT_MAIN,
            spaceAfter=8,
        )

        # 1. ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style),
            ]

        project_data = [
            [
                make_info_cell("ΕΡΓΟ", proj_name),
                make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client),
            ],
            [
                make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer),
                make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location),
            ],
        ]
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        info_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, ACCENT_TITLE),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 15),
                ("RIGHTPADDING", (0, 0), (-1, -1), 15),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        elements.append(info_table)
        elements.append(Spacer(1, 25))

        elements.append(Paragraph("Αναφορά Εμπροσθοτομίας", title_style))
        elements.append(Spacer(1, 20))

        # 2. ΑΠΟΤΕΛΕΣΜΑΤΑ ΥΠΟΛΟΓΙΣΜΟΥ (Πρώτα στη σειρά)
        elements.append(Paragraph("1. Αποτελέσματα Υπολογισμού", h2_style))
        elements.append(Spacer(1, 10))
        t2_headers = [
            Paragraph("Υπολογισμένο Σημείο", header_style),
            Paragraph("X (m)", header_style),
            Paragraph("Y (m)", header_style),
        ]
        t2_data = [t2_headers]
        for row in result_rows:
            t2_data.append([
                str(row.get("pointName", "P")),
                format_num(row.get("x"), 3),
                format_num(row.get("y"), 3),
            ])
        t2 = Table(t2_data, colWidths=[150, 192.5, 192.5])
        t2_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font_bold),
            ("TEXTCOLOR", (1, 1), (2, -1), BRIGHT_GREEN),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
        for i in range(1, len(t2_data)):
            t2_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t2.setStyle(TableStyle(t2_cmds))
        elements.append(t2)
        elements.append(Spacer(1, 25))

        # 3. ΓΝΩΣΤΑ ΣΗΜΕΙΑ (Χωρίς τη στήλη γωνίας)
        elements.append(
            Paragraph("2. Γνωστά Σημεία", h2_style)
        )
        elements.append(Spacer(1, 10))
        t1_headers = [
            Paragraph("Στάση", header_style),
            Paragraph("X (m)", header_style),
            Paragraph("Y (m)", header_style),
        ]
        t1_data = [t1_headers]
        for row in input_rows:
            t1_data.append([
                str(row.get("pointName", "")),
                format_num(row.get("x"), 3),
                format_num(row.get("y"), 3),
            ])

        t1 = Table(t1_data, colWidths=[150, 192.5, 192.5])
        t1_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i in range(1, len(t1_data)):
            t1_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t1.setStyle(TableStyle(t1_cmds))
        elements.append(t1)
        elements.append(Spacer(1, 25))

        # 4. ΠΑΡΑΤΗΡΗΣΕΙΣ ΓΩΝΙΩΝ (Νέος Πίνακας)
        elements.append(Paragraph("3. Παρατηρήσεις Γωνιών", h2_style))
        elements.append(Spacer(1, 10))
        t_angles_headers = [
            Paragraph("#", header_style),
            Paragraph("Γωνία (grad)", header_style),
        ]
        t_angles_data = [t_angles_headers]
        for row in input_rows:
            t_angles_data.append([
                str(row.get("pointName", "")),
                format_num(row.get("angle"), 4),
            ])

        t_angles = Table(t_angles_data, colWidths=[250, 285])
        t_angles_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i in range(1, len(t_angles_data)):
            t_angles_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t_angles.setStyle(TableStyle(t_angles_cmds))
        elements.append(t_angles)
        elements.append(Spacer(1, 25))

        # 5. ΔΙΑΓΡΑΜΜΑ (ΕΝΩΜΕΝΟ ΜΕ ΤΟΝ ΤΙΤΛΟ)
        diagram_block = KeepTogether([
            Paragraph("4. Διάγραμμα Εμπροσθοτομίας", h2_style),
            Spacer(1, 10),
            create_survey_cad_drawing(input_rows, result_rows),
        ])
        elements.append(diagram_block)

        # ΔΗΜΙΟΥΡΓΙΑ PDF
        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        doc.build(
            elements,
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά",
                font_name=my_font,
                font_bold_name=my_font_bold,
                timestamp_str=current_timestamp,
                logo_path=str(LOGO_PATH) if "LOGO_PATH" in globals() else None,
            ),
        )
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name="Intersection_Report.pdf",
            mimetype="application/pdf",
        )

    except Exception as e:
        import traceback

        print(f"Σφάλμα κατά τη δημιουργία Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/basic_calc/resect', methods=['POST'])
def calc_resect():
    try:
        data = request.json or {}
        labels = {'xa': 'XA', 'ya': 'YA', 'xb': 'XB', 'yb': 'YB',
                  'xc': 'XC', 'yc': 'YC', 'a': 'a', 'b': 'b', 'c': 'c'}
        vals = {}
        for key, label in labels.items():
            raw = data.get(key)
            if raw is None or str(raw).strip() == '':
                return jsonify({"error": f"Το πεδίο '{label}' είναι κενό."}), 400
            try:
                vals[key] = float(str(raw).replace(',', '.'))
            except ValueError:
                return jsonify({"error": f"Το πεδίο '{label}' δεν είναι έγκυρος αριθμός."}), 400

        # Κλήση της ενημερωμένης συνάρτησης tienstra (με 9 παραμέτρους)
        xm, ym, warnings = dpr.tienstra(
            vals['xa'], vals['ya'], vals['xb'], vals['yb'], vals['xc'], vals['yc'],
            vals['a'], vals['b'], vals['c']
        )
        return jsonify({"xm": xm, "ym": ym, "warnings": warnings})
        
    except dpr.GeodeticError as e:
        return jsonify({"error": str(e)}), 400
    except ZeroDivisionError as e:
        return jsonify({
            "error": f"Προέκυψε διαίρεση με το μηδέν.\n{e}\n\n"
                     "ΠΙΘΑΝΗ ΑΙΤΙΑ: Η στάση P βρίσκεται πάνω στον 'Κύκλο Κινδύνου' "
                     "(τον περιγεγραμμένο κύκλο των σημείων A, B, C)."
        }), 400
    except Exception as e:
        import traceback
        print(f"Σφάλμα στην Οπισθοτομία:\n{traceback.format_exc()}")
        return jsonify({"error": f"Προέκυψε σφάλμα: {str(e)}"}), 500

@app.route("/api/resection/report", methods=["POST"])
def export_resection_report():
    try:
        data = request.json or {}
        input_rows = data.get("inputData", [])
        result_rows = data.get("resultData", [])

        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ ---
        raw_proj = (
            data.get("projectInfo")
            or data.get("projectSettings")
            or data.get("project_info")
            or data.get("project")
            or {}
        )

        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get("settings"), dict):
                sources_to_check.append(raw_proj.get("settings"))
        sources_to_check.append(data)

        def extract_field(keys):
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if (
                            val is not None
                            and str(val).strip() != ""
                            and str(val).strip().lower()
                            not in ["none", "null", "undefined"]
                        ):
                            return str(val).strip()
            return "Μη διαθέσιμο"

        proj_name = extract_field(
            ["name", "projectName", "project_name", "title"]
        )
        proj_engineer = extract_field(
            [
                "designer",
                "engineer",
                "designerName",
                "engineerName",
                "author",
            ]
        )
        proj_client = extract_field(
            ["employer", "client", "employerName", "clientName", "owner"]
        )
        proj_location = extract_field(["location", "place", "address"])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        font_path = PDF_FONT_PATH
        font_bold_path = PDF_FONT_BOLD_PATH
        try:
            pdfmetrics.registerFont(TTFont("GreekFont", font_path))
            pdfmetrics.registerFont(TTFont("GreekFont-Bold", font_bold_path))
            registerFontFamily(
                "GreekFont", normal="GreekFont", bold="GreekFont-Bold"
            )
            my_font = "GreekFont"
            my_font_bold = "GreekFont-Bold"
        except Exception:
            my_font = "Helvetica"
            my_font_bold = "Helvetica-Bold"

        def format_num(val, decimals=4):
            if val is None or val == "":
                return "-"
            try:
                return f"{float(val):.{decimals}f}"
            except (ValueError, TypeError):
                return str(val)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=30,
            rightMargin=30,
            topMargin=55,
            bottomMargin=45,
        )
        elements = []

        # --- ΧΡΩΜΑΤΑ & ΣΤΥΛ ---
        HEADER_BG = colors.HexColor("#0f172a")
        ROW_BG_1 = colors.HexColor("#ffffff")
        ROW_BG_2 = colors.HexColor("#f8fafc")
        GRID_COLOR = colors.HexColor("#cbd5e1")
        TEXT_MAIN = colors.HexColor("#0f172a")
        ACCENT_TITLE = colors.HexColor("#0284c7")
        BRIGHT_GREEN = colors.HexColor("#15803d")

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TopoTitle",
            parent=styles["Title"],
            fontName=my_font_bold,
            fontSize=24,
            leading=22,
            textColor=ACCENT_TITLE,
            alignment=0,
        )
        h2_style = ParagraphStyle(
            "TopoSecH",
            fontName=my_font_bold,
            fontSize=14,
            leading=14,
            textColor=HEADER_BG,
            keepWithNext=True,  # Επιπλέον προστασία για να μην ορφανεύει ο τίτλος
        )
        header_style = ParagraphStyle(
            "TableHead",
            fontName=my_font_bold,
            fontSize=10,
            textColor=colors.white,
            alignment=1,
        )
        modern_label_style = ParagraphStyle(
            "ModernLabel",
            fontName=my_font_bold,
            fontSize=7.5,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=2,
            textTransform="uppercase",
        )
        modern_value_style = ParagraphStyle(
            "ModernValue",
            fontName=my_font_bold,
            fontSize=11,
            textColor=TEXT_MAIN,
            spaceAfter=8,
        )

        # 1. ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ
        def make_info_cell(label, value):
            return [
                Paragraph(label, modern_label_style),
                Paragraph(value, modern_value_style),
            ]

        project_data = [
            [
                make_info_cell("ΕΡΓΟ", proj_name),
                make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client),
            ],
            [
                make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer),
                make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location),
            ],
        ]
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        info_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, ACCENT_TITLE),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 15),
                ("RIGHTPADDING", (0, 0), (-1, -1), 15),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        elements.append(info_table)
        elements.append(Spacer(1, 25))

        elements.append(Paragraph("Αναφορά Οπισθοτομίας", title_style))
        elements.append(Spacer(1, 20))

        # 2. ΑΠΟΤΕΛΕΣΜΑΤΑ ΥΠΟΛΟΓΙΣΜΟΥ
        elements.append(Paragraph("1. Αποτελέσματα Υπολογισμού", h2_style))
        elements.append(Spacer(1, 10))
        t2_headers = [
            Paragraph("Υπολογισμένο Σημείο", header_style),
            Paragraph("X (m)", header_style),
            Paragraph("Y (m)", header_style),
        ]
        t2_data = [t2_headers]
        for row in result_rows:
            t2_data.append([
                str(row.get("pointName", "P")),
                format_num(row.get("x"), 3),
                format_num(row.get("y"), 3),
            ])
        t2 = Table(t2_data, colWidths=[150, 192.5, 192.5])
        t2_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font_bold),
            ("TEXTCOLOR", (1, 1), (2, -1), BRIGHT_GREEN),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
        for i in range(1, len(t2_data)):
            t2_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t2.setStyle(TableStyle(t2_cmds))
        elements.append(t2)
        elements.append(Spacer(1, 25))

        # 3. ΓΝΩΣΤΑ ΣΗΜΕΙΑ
        elements.append(
            Paragraph("2. Γνωστά Σημεία (Συντεταγμένες)", h2_style)
        )
        elements.append(Spacer(1, 10))
        t1_headers = [
            Paragraph("Σημείο", header_style),
            Paragraph("X (m)", header_style),
            Paragraph("Y (m)", header_style),
        ]
        t1_data = [t1_headers]
        for row in input_rows:
            t1_data.append([
                str(row.get("pointName", "")),
                format_num(row.get("x"), 3),
                format_num(row.get("y"), 3),
            ])

        t1 = Table(t1_data, colWidths=[150, 192.5, 192.5])
        t1_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i in range(1, len(t1_data)):
            t1_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t1.setStyle(TableStyle(t1_cmds))
        elements.append(t1)
        elements.append(Spacer(1, 25))

        # 4. ΠΑΡΑΤΗΡΗΣΕΙΣ ΓΩΝΙΩΝ
        elements.append(Paragraph("3. Παρατηρήσεις Γωνιών", h2_style))
        elements.append(Spacer(1, 10))
        t_angles_headers = [
            Paragraph("#", header_style),
            Paragraph("Γωνία", header_style),
        ]
        t_angles_data = [t_angles_headers]
        for row in input_rows:
            t_angles_data.append([
                str(row.get("pointName", "")),
                format_num(row.get("angle"), 4),
            ])

        t_angles = Table(t_angles_data, colWidths=[250, 285])
        t_angles_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTNAME", (0, 1), (-1, -1), my_font),
            ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i in range(1, len(t_angles_data)):
            t_angles_cmds.append((
                "BACKGROUND",
                (0, i),
                (-1, i),
                ROW_BG_1 if i % 2 == 1 else ROW_BG_2,
            ))
        t_angles.setStyle(TableStyle(t_angles_cmds))
        elements.append(t_angles)
        elements.append(Spacer(1, 25))

        # 5. ΔΙΑΓΡΑΜΜΑ (ΕΝΩΜΕΝΟ ΜΕ ΤΟΝ ΤΙΤΛΟ)
        diagram_block = KeepTogether([
            Paragraph("4. Διάγραμμα Οπισθοτομίας", h2_style),
            Spacer(1, 10),
            create_survey_cad_drawing(input_rows, result_rows),
        ])
        elements.append(diagram_block)

        # ΔΗΜΙΟΥΡΓΙΑ PDF
        current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        doc.build(
            elements,
            canvasmaker=partial(
                UniversalNumberedCanvas,
                doc_title="Αυτοματοποιημένη Αναφορά",
                font_name=my_font,
                font_bold_name=my_font_bold,
                timestamp_str=current_timestamp,
                logo_path=str(LOGO_PATH) if "LOGO_PATH" in globals() else None,
            ),
        )
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name="Resection_Report.pdf",
            mimetype="application/pdf",
        )

    except Exception as e:
        import traceback

        print(f"Σφάλμα κατά τη δημιουργία Report:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/basic_calc/scale', methods=['POST'])
def calc_scale():
    try:
        data = request.json or {}
        
        raw = data.get('input1')
        if raw is None or str(raw).strip() == '':
            return jsonify({"error": "Το πεδίο 'E' είναι κενό."}), 400
        try:
            E = float(str(raw).replace(',', '.'))
        except ValueError:
            return jsonify({"error": "Το πεδίο 'E' δεν είναι έγκυρος αριθμός."}), 400

        m = dpr.sintelestis_klimakas(E)

        return jsonify({
            "k": m,
            "m": m,
            "inv_m": 1.0 / m,
            "ppm": (m - 1.0) * 1e6
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα στον Συντελεστή Κλίμακας:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/basic_calc/scale_segment', methods=['POST'])
def calc_scale_segment():
    """Γραμμικός συντελεστής κλίμακας m_ij για τμήμα i→j (τύπος Simpson)."""
    try:
        data = request.json or {}

        def parse_field(key, label, required=True):
            raw = data.get(key)
            if raw is None or str(raw).strip() == '':
                if required:
                    return None, jsonify({"error": f"Το πεδίο '{label}' είναι κενό."}), 400
                return None, None, None
            try:
                return float(str(raw).replace(',', '.')), None, None
            except ValueError:
                return None, jsonify({"error": f"Το πεδίο '{label}' δεν είναι έγκυρος αριθμός."}), 400

        Ei, err, code = parse_field('Ei', 'Ei')
        if err: return err, code
        Ej, err, code = parse_field('Ej', 'Ej')
        if err: return err, code
        L, err, code = parse_field('L', 'L', required=False)
        if err: return err, code

        res = dpr.sintelestis_klimakas_segment(Ei, Ej)

        if L is not None:
            res['dL'] = (res['m_ij'] - 1.0) * L
            res['L_corr'] = res['m_ij'] * L
        else:
            res['dL'] = None
            res['L_corr'] = None

        return jsonify(res)

    except Exception as e:
        import traceback
        print(f"Σφάλμα στον Γραμμικό Συντελεστή Κλίμακας:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
# ==========================================
# 7. ENDPOINT ΓΙΑ ΧΩΡΟΣΤΑΘΜΙΣΗ (LEVELING) 
# ==========================================
@app.route('/api/leveling', methods=['POST'])
def run_leveling():
    try:
        data = request.json
        forward_data = data.get('forward', [])
        backward_data = data.get('backward', [])
        
        # 1. Κλήση της νέας συνάρτησης υπολογισμών από το data_proccessing (dpr)
        forward_metrics, backward_metrics, error_dh = dpr.calculate_leveling(forward_data, backward_data)
        
        # 2. Εύρεση του ενεργού Project
        project_name = get_active_project_name()
        project_dir = get_request_project_dir(project_name)
        if project_dir is None:
            raise ValueError("Δεν ορίστηκε έγκυρο ενεργό project")
        try:
            # Αποθήκευση μόνο από όσους μπορούν να αλλάξουν το project· ο αναγνώστης βλέπει μόνο αποτελέσματα.
            writable_dir = get_request_project_dir(project_name, need='edit')
        except PermissionError:
            writable_dir = None

        # 3. Αποθήκευση Δεδομένων ΚΑΙ Αποτελεσμάτων στο Project
        save_path = (writable_dir / "latest_leveling.json") if writable_dir else None
        
        response_data = {
            "forward": forward_data,
            "backward": backward_data,
            "metrics": {
                "forward": forward_metrics,
                "backward": backward_metrics,
                "error_dh": error_dh
            }
        }
        
        if save_path is not None:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            atomic_write_json(save_path, response_data)
            print(f"SUCCESS: Τα δεδομένα χωροστάθμισης αποθηκεύτηκαν στο: '{save_path}'")

        # 4. Επιστροφή στο React
        return jsonify({
            "status": "success",
            "forward_results": forward_data,
            "backward_results": backward_data,
            "metrics": response_data["metrics"]
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την αποθήκευση/υπολογισμό Χωροστάθμισης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# ==========================================
# 8. ENDPOINT ΓΙΑ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ ΥΨΟΜΕΤΡΙΑ
# ==========================================
@app.route('/api/trig_leveling', methods=['POST'])
def run_trig_leveling():
    data = request.json
    rows = data.get('rows', [])
    
    if not rows:
        return jsonify({"results": []})
        
    try:
        # 1. Μετατροπή των δεδομένων από το React σε pandas DataFrame
        df = pd.DataFrame(rows)
        
        # 2. Εξασφάλιση ότι οι κρίσιμες στήλες είναι αριθμητικές
        numeric_cols = ['Slope_D', 'Z[grad]', 'H_station', 'H_target']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
        # 3. Κλήση της συνάρτησης υπολογισμού από το data_proccessing
        res_df = dpr.trig_leveling(df)
        
        # 4. Μετατροπή του DataFrame πίσω σε JSON (αντικαθιστούμε τα NaN με "")
        results = res_df.fillna("").to_dict('records')
        
        return jsonify({"results": results})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό Τριγωνομετρικής Υψομετρίας:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/trig-leveling', methods=['POST'])
def export_trig_leveling_report():
    try:
        data = request.json or {}
        initial_data = data.get('initialData', [])
        results = data.get('results', [])

        # --- ΠΛΗΡΗΣ ΚΑΙ ΑΣΦΑΛΗΣ ΑΝΤΙΣΤΟΙΧΙΣΗ ΣΤΟΙΧΕΙΩΝ ΕΡΓΟΥ (MODERN DASHBOARD INFO) ---
        raw_proj = data.get('projectInfo') or data.get('projectSettings') or {}
        
        sources_to_check = []
        if isinstance(raw_proj, dict) and raw_proj:
            sources_to_check.append(raw_proj)
            if isinstance(raw_proj.get('settings'), dict):
                sources_to_check.append(raw_proj.get('settings'))
        sources_to_check.append(data)

        def extract_field(keys):
            for src in sources_to_check:
                if isinstance(src, dict):
                    for key in keys:
                        val = src.get(key)
                        if val is not None and str(val).strip() != '' and str(val).strip().lower() not in ['none', 'null', 'undefined']:
                            return str(val).strip()
            return 'Μη διαθέσιμο'

        proj_name = extract_field(['name', 'projectName', 'project_name', 'title'])
        proj_engineer = extract_field(['designer', 'engineer', 'designerName', 'engineerName', 'author'])
        proj_client = extract_field(['employer', 'client', 'employerName', 'clientName', 'owner'])
        proj_location = extract_field(['location', 'place', 'address'])

        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΩΝ ---
        try:
            pdfmetrics.registerFont(TTFont('TrigGreekFont', PDF_FONT_PATH))
            pdfmetrics.registerFont(TTFont('TrigGreekFont-Bold', PDF_FONT_BOLD_PATH))
            registerFontFamily('TrigGreekFont', normal='TrigGreekFont', bold='TrigGreekFont-Bold')
            my_font, my_font_bold = 'TrigGreekFont', 'TrigGreekFont-Bold'
        except Exception:
            my_font, my_font_bold = 'Helvetica', 'Helvetica-Bold'

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=30, rightMargin=30, topMargin=55, bottomMargin=45)
        
        # --- Παλέτα Χρωμάτων ---
        HEADER_BG = colors.HexColor('#0f172a')
        ROW_BG_1 = colors.HexColor('#ffffff')
        ROW_BG_2 = colors.HexColor('#f8fafc')
        GRID_COLOR = colors.HexColor('#cbd5e1')
        TEXT_MAIN = colors.HexColor('#0f172a')
        ACCENT_TITLE = colors.HexColor('#0284c7')
        EMERALD_BG = colors.HexColor('#ecfdf5') # Απαλό πράσινο για την στήλη του Μ.Ο.

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('TrigTitle', parent=styles['Title'], fontName=my_font_bold, fontSize=22, leading=24, textColor=ACCENT_TITLE, alignment=0)
        section_style = ParagraphStyle('TrigSection', fontName=my_font_bold, fontSize=14, leading=16, textColor=HEADER_BG)
        th_style = ParagraphStyle('TrigTH', parent=styles['Normal'], fontName=my_font_bold, fontSize=8.5, leading=10, textColor=colors.white, alignment=1)
        td_style = ParagraphStyle('TrigTD', parent=styles['Normal'], fontName=my_font, fontSize=8, leading=10, textColor=TEXT_MAIN, alignment=1)
        td_bold_style = ParagraphStyle('TrigTDBold', parent=td_style, fontName=my_font_bold)

        # Νέα Styles για το Modern Dashboard Box
        modern_label_style = ParagraphStyle(
            'ModernLabel', fontName=my_font_bold, fontSize=7.5, textColor=colors.HexColor('#64748b'), spaceAfter=2, textTransform='uppercase'
        )
        modern_value_style = ParagraphStyle(
            'ModernValue', fontName=my_font_bold, fontSize=11, textColor=TEXT_MAIN, spaceAfter=8
        )

        def make_info_cell(label, value):
            return [Paragraph(label, modern_label_style), Paragraph(value, modern_value_style)]

        # --- 1. Dashboard Πληροφοριών ---
        project_data = [
            [make_info_cell("ΕΡΓΟ", proj_name), make_info_cell("ΕΡΓΟΔΟΤΗΣ", proj_client)],
            [make_info_cell("ΜΕΛΕΤΗΤΗΣ", proj_engineer), make_info_cell("ΤΟΠΟΘΕΣΙΑ", proj_location)]
        ]
        
        col_width = (A4[0] - 60) / 2
        info_table = Table(project_data, colWidths=[col_width, col_width])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('LINEBEFORE', (0,0), (0,-1), 4, ACCENT_TITLE),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))

        def cell(value, bold=False):
            if value in (None, '', '-'): return Paragraph('-', td_style)
            return Paragraph(str(value), td_bold_style if bold else td_style)

        # --- 2. Πίνακας Αρχικών Δεδομένων (Χωρίς Α/Α) ---
        def build_initial_table(rows):
            headers = ['Από', 'Προς', 'S [m]', 'Z [grad]', 'Ύψος Οργάνου [m]', 'Ύψος Στόχου [m]']
            table_rows = [[Paragraph(h, th_style) for h in headers]]
            
            for row in rows:
                values = [
                    row.get('from', row.get('From', '-')),
                    row.get('to', row.get('To', '-')),
                    row.get('s', row.get('Slope_D', '-')),
                    row.get('z', row.get('Z[grad]', '-')),
                    row.get('hi', row.get('H_station', '-')),
                    row.get('ht', row.get('H_target', '-'))
                ]
                table_rows.append([cell(v) for v in values])
                
            widths = [75, 75, 90, 90, 100, 100]
            table = Table(table_rows, colWidths=widths, repeatRows=1)
            
            commands = [
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG), 
                ('GRID', (0, 0), (-1, -1), 0.5, GRID_COLOR), 
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), 
                ('TOPPADDING', (0, 0), (-1, -1), 5), 
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
            ]
            for index in range(1, len(table_rows)):
                commands.append(('BACKGROUND', (0, index), (-1, index), ROW_BG_1 if index % 2 else ROW_BG_2))
                
            table.setStyle(TableStyle(commands))
            return table

        # --- 3. Πίνακας Τελικών Αποτελεσμάτων (Χωρίς Α/Α & Με RowSpan) ---
        def build_results_table(rows):
            headers = ['Από', 'Προς', 'S [m]', 'Z [grad]', 'Ύψος Οργάνου [m]', 'Ύψος Στόχου [m]', 'ΔH [m]', 'ΔH Μ.Ο. [m]']
            table_rows = [[Paragraph(h, th_style) for h in headers]]
            
            # Προετοιμασία δεδομένων για Merging (ακριβώς όπως στο JSX)
            processed_data = []
            current_group_start = 0
            
            for i, row in enumerate(rows):
                from_val = row.get('from', row.get('From', '-'))
                to_val = row.get('to', row.get('To', '-'))
                dh_avg_val = row.get('dh_avg', row.get('dh_mean', '-'))
                
                if i == 0:
                    processed_data.append({**row, 'isFirst': True, 'span': 1, 'groupDhAvg': dh_avg_val})
                else:
                    prev = rows[i - 1]
                    prev_from = prev.get('from', prev.get('From', '-'))
                    prev_to = prev.get('to', prev.get('To', '-'))
                    
                    if from_val == prev_from and to_val == prev_to and from_val not in ('-', '') and to_val not in ('-', ''):
                        processed_data[current_group_start]['span'] += 1
                        if dh_avg_val and str(dh_avg_val).strip() not in ('-', '') and not processed_data[current_group_start]['groupDhAvg']:
                            processed_data[current_group_start]['groupDhAvg'] = dh_avg_val
                        processed_data.append({**row, 'isFirst': False})
                    else:
                        current_group_start = i
                        processed_data.append({**row, 'isFirst': True, 'span': 1, 'groupDhAvg': dh_avg_val})

            spans = []
            row_idx = 1
            for item in processed_data:
                values = [
                    item.get('from', item.get('From', '-')),
                    item.get('to', item.get('To', '-')),
                    item.get('s', item.get('Slope_D', '-')),
                    item.get('z', item.get('Z[grad]', '-')),
                    item.get('hi', item.get('H_station', '-')),
                    item.get('ht', item.get('H_target', '-')),
                    item.get('dh', '-'),
                    item.get('groupDhAvg', '-') if item['isFirst'] else ""
                ]
                # Έντονα γράμματα στις τελευταίες 2 στήλες
                table_rows.append([cell(v, bold=(c >= 6)) for c, v in enumerate(values)])
                
                # Προσθήκη του Span command αν η ομάδα έχει παραπάνω από 1 γραμμές
                if item['isFirst'] and item['span'] > 1:
                    spans.append(('SPAN', (7, row_idx), (7, row_idx + item['span'] - 1)))
                
                row_idx += 1
                
            widths = [65, 65, 65, 65, 65, 65, 70, 75]
            table = Table(table_rows, colWidths=widths, repeatRows=1)
            
            commands = [
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG), 
                ('GRID', (0, 0), (-1, -1), 0.5, GRID_COLOR), 
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), 
                ('TOPPADDING', (0, 0), (-1, -1), 5), 
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5)
            ]
            
            # Εφαρμογή zebra-striping στις πρώτες 7 στήλες
            for index in range(1, len(table_rows)):
                commands.append(('BACKGROUND', (0, index), (6, index), ROW_BG_1 if index % 2 else ROW_BG_2))
                
            # Χρώμα φόντου για τη στήλη του Μ.Ο. (ταιριάζει με το UI)
            for index, item in enumerate(processed_data, 1):
                if item['isFirst']:
                    end_idx = index + item['span'] - 1
                    commands.append(('BACKGROUND', (7, index), (7, end_idx), EMERALD_BG))
            
            # Προσθήκη των spans
            for span in spans:
                commands.append(span)
                
            table.setStyle(TableStyle(commands))
            return table

        elements = [
            info_table, 
            Spacer(1, 25), 
            Paragraph('Αναφορά Τριγωνομετρικής Υψομετρίας', title_style), 
            Spacer(1, 20), 
            Paragraph('1. Αρχικά Δεδομένα', section_style), 
            Spacer(1, 10), 
            build_initial_table(initial_data), 
            Spacer(1, 30), 
            Paragraph('2. Τελικά Αποτελέσματα', section_style), 
            Spacer(1, 10), 
            build_results_table(results)
        ]
        
        current_timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        doc.build(elements, canvasmaker=partial(UniversalNumberedCanvas, doc_title='Αυτοματοποιημένη Αναφορά LASCA', font_name=my_font, font_bold_name=my_font_bold, timestamp_str=current_timestamp, logo_path=str(LOGO_PATH)))
        buffer.seek(0)
        
        return send_file(buffer, as_attachment=True, download_name='Trig_Leveling_Report.pdf', mimetype='application/pdf')
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Trig Leveling Report:\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    port = 5000
    print(f"\n🚀 LASCA backend τρέχει στο http://127.0.0.1:{port}")
    print(f"👉 Frontend: http://localhost:5173 (npm run dev)\n")
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)