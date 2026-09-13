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
import webview
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
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import data_proccessing as dpr
import vis_4_app as vis

try:
    import resend
except ImportError:
    resend = None

from datetime import datetime
from project_manager import TopoProject, get_safe_workspace_dir
from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename
from pathlib import Path
from ezdxf.enums import TextEntityAlignment
from io import BytesIO
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

try:
    pdfmetrics.registerFont(TTFont('ArialGreek', 'arial.ttf'))
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
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('FEEDBACK_MAX_SIZE_MB', '5')) * 1024 * 1024

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


logger.info('Startup RESEND_API_KEY=%s NOTIFICATION_EMAIL=%s', _mask_secret(os.getenv('RESEND_API_KEY')), os.getenv('NOTIFICATION_EMAIL') or '<missing>')
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

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(e):
    return jsonify({"error": "Feedback upload exceeds the maximum size limit"}), 413


def _feedback_error(message: str, status_code: int):
    return jsonify({'status': 'error', 'message': message}), status_code


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
        email_data = {
            'from': 'LASCA App <onboarding@resend.dev>',
            'to': [receiver_email],
            'subject': subject,
            'html': html_body,
        }
        if screenshot_content is not None:
            email_data['attachments'] = [{
                'filename': screenshot_filename,
                'content': base64.b64encode(screenshot_content).decode('ascii'),
            }]
        resend.Emails.send(email_data)
    except Exception:
        logger.exception('Failed to send feedback email notification through Resend')
        print('Feedback email exception:\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json(silent=True) or {}
        is_json_request = bool(data)
        feedback_type = str(data.get('type', 'general') if is_json_request else request.form.get('type', 'general')).strip().lower() or 'general'
        email = str(data.get('user_email', '') if is_json_request else request.form.get('email', '')).strip()
        message = str(data.get('details', '') if is_json_request else request.form.get('message', '')).strip()

        if feedback_type not in FEEDBACK_TYPES:
            return _feedback_error('Invalid feedback type', 400)
        if not message:
            return _feedback_error('Message is required', 400)
        if email and not EMAIL_RE.fullmatch(email):
            return _feedback_error('Invalid email address', 400)

        screenshot_content = None
        screenshot_filename = 'screenshot'
        screenshot = request.files.get('screenshot')
        screenshot_path = ''
        if is_json_request and data.get('screenshot'):
            screenshot_value = data['screenshot']
            if isinstance(screenshot_value, str) and ',' in screenshot_value:
                screenshot_value = screenshot_value.split(',', 1)[1]
            screenshot_content = base64.b64decode(screenshot_value, validate=True)
            screenshot_filename = str(data.get('screenshot_filename', 'screenshot.png'))
        elif screenshot and screenshot.filename:
            safe_name = secure_filename(screenshot.filename)
            extension = Path(safe_name).suffix.lower()
            if not safe_name or extension not in ALLOWED_FEEDBACK_EXTENSIONS:
                return _feedback_error('Unsupported screenshot format', 400)

            FEEDBACK_UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            unique_name = f'{Path(safe_name).stem}-{uuid.uuid4().hex}{extension}'
            destination = FEEDBACK_UPLOAD_FOLDER / unique_name
            screenshot.save(destination)
            screenshot_path = str(destination)
            with destination.open('rb') as screenshot_file:
                screenshot_content = screenshot_file.read()
            screenshot_filename = destination.name

        feedback = {
            'type': feedback_type,
            'email': email,
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
        return _feedback_error('Unable to submit feedback. Check lasca_app.log for details.', 500)

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
WORKSPACE_DIR = get_safe_workspace_dir("LASCA")

# Helper functions για την Ταχυμετρία
def g2r(gon):
    return float(gon) * math.pi / 200.0

def normalize_400(angle):
    while angle < 0: angle += 400.0
    while angle >= 400.0: angle -= 400.0
    return angle


@app.route('/api/projects/list', methods=['GET'])
def list_projects():
    try:
        if not WORKSPACE_DIR.exists():
            WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
            return jsonify([])
        projects = [d.name for d in WORKSPACE_DIR.iterdir() if d.is_dir()]
        return jsonify(projects)
    except Exception as e:
        print(f"ERROR: Σφάλμα κατά τη λίστα των projects: {str(e)}")
        return jsonify({"error": "Αποτυχία ανάγνωσης φακέλων εργασίας"}), 500

@app.route('/api/projects/<project_name>', methods=['DELETE'])
def delete_project(project_name):
    project_dir = (WORKSPACE_DIR / project_name).resolve()

    try:
        project_dir.relative_to(WORKSPACE_DIR.resolve())
    except ValueError:
        return jsonify({"error": "Μη έγκυρο όνομα project"}), 400

    if not project_dir.is_dir():
        return jsonify({"error": "Το project δεν βρέθηκε"}), 404

    try:
        shutil.rmtree(project_dir)
        return jsonify({"status": "success", "message": f"Το project '{project_name}' διαγράφηκε."})
    except OSError as e:
        print(f"ERROR: Σφάλμα διαγραφής project: {str(e)}")
        return jsonify({"error": "Αποτυχία διαγραφής project"}), 500

@app.route('/api/projects/load', methods=['POST'])
def load_project():
    try:
        req = request.json
        project_name = req.get("project_name")
        settings = req.get("settings", {})

        if not project_name:
            return jsonify({"error": "Το όνομα του project είναι υποχρεωτικό"}), 400

        project = TopoProject(workspace_dir=str(WORKSPACE_DIR), project_name=project_name)
        project_state = project.setup_project_structure(initial_settings=settings)
        
        return jsonify(project_state)
    except Exception as e:
        print(f"ERROR: Σφάλμα κατά τη φόρτωση του project: {str(e)}")
        return jsonify({"error": "Αποτυχία αρχικοποίησης/φόρτωσης project"}), 500

@app.route('/api/projects/save', methods=['POST'])
def save_project():
    try:
        req = request.json
        project_name = req.get("project_name")
        current_state = req.get("state")

        if not project_name or not current_state:
            return jsonify({"error": "Λείπουν απαραίτητα δεδομένα"}), 400

        project = TopoProject(workspace_dir=str(WORKSPACE_DIR), project_name=project_name)
        project.save_state(current_state)
        
        return jsonify({"status": "success", "message": f"Το project '{project_name}' αποθηκεύτηκε!"})
    except Exception as e:
        print(f"ERROR: Σφάλμα κατά την αποθήκευση του project: {str(e)}")
        return jsonify({"error": "Αποτυχία αποθήκευσης δεδομένων"}), 500

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
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
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
            download_name='Goniometry_Report.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Goniometry Report:\n{traceback.format_exc()}")
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
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
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
        
        project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
        project_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(project_dir / "latest_traverse.json", "w", encoding="utf-8") as f:
                json.dump(calculated_stations_export, f, ensure_ascii=False, indent=4)
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
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_bold_path = "C:/Windows/Fonts/arialbd.ttf"

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

        updated_json, tolerance_report = dpr.traverse_level_calc2(
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
            project_dir = WORKSPACE_DIR / project_name if (project_name and 'WORKSPACE_DIR' in globals()) else None
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
                        with open(json_path, 'w', encoding='utf-8') as f:
                            json.dump(traverse_data, f, ensure_ascii=False, indent=4)
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
            project_dir = WORKSPACE_DIR / project_name if (project_name and 'WORKSPACE_DIR' in globals()) else None

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
                        with open(json_path, 'w', encoding='utf-8') as f:
                            json.dump(traverse_data, f, ensure_ascii=False, indent=4)
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
    project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
    traverse_file = project_dir / "latest_traverse.json"
    project_state_file = project_dir / "project_state.json"
    
    traverse_stations = []
    
    # 1η Προσπάθεια: Ανάγνωση από το latest_traverse.json
    if traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    # 2η Προσπάθεια (Fallback): Ανάγνωση από το project_state.json
    elif project_state_file.exists():
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
    project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
    traverse_file = project_dir / "latest_traverse.json"
    project_state_file = project_dir / "project_state.json"
    
    traverse_stations = []
    
    if traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    elif project_state_file.exists():
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
    project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
    traverse_file = project_dir / "latest_traverse.json"
    project_state_file = project_dir / "project_state.json"
    
    traverse_stations = []
    
    if traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
        except Exception as e:
            print(f"WARNING: Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
    elif project_state_file.exists():
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

        if not station.get('x') or not station.get('y') or not backsight.get('x') or not backsight.get('y'):
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
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
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
        project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # 3. Αποθήκευση Δεδομένων ΚΑΙ Αποτελεσμάτων στο Project
        save_path = project_dir / "latest_leveling.json"
        
        response_data = {
            "forward": forward_data,
            "backward": backward_data,
            "metrics": {
                "forward": forward_metrics,
                "backward": backward_metrics,
                "error_dh": error_dh
            }
        }
        
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(response_data, f, ensure_ascii=False, indent=4)
            
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
            pdfmetrics.registerFont(TTFont('TrigGreekFont', 'C:/Windows/Fonts/arial.ttf'))
            pdfmetrics.registerFont(TTFont('TrigGreekFont-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
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
    port = find_free_port()

    def run_server():
        app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    webview.create_window('LASCA', f'http://127.0.0.1:{port}', maximized=True)
    webview.start(debug=False)