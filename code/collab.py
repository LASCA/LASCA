"""
Λογαριασμοί, κοινά projects και ζωντανή συνεργασία του LASCA (web server).

Περιέχει:
  * Προφίλ: στοιχεία, εικόνα, αλλαγή/ορισμός κωδικού, αποσύνδεση από όλες τις συσκευές,
    διαγραφή λογαριασμού, στατιστικά.
  * Κλειδιά συσκευής (device tokens) για το πρόγραμμα των Windows (exe).
  * Projects: φόρτωση/αποθήκευση με έλεγχο έκδοσης, δημιουργία, διαγραφή.
  * Ρόλοι: ιδιοκτήτης (owner) / επεξεργαστής (editor) / αναγνώστης (viewer),
    αλλαγή ρόλου, αφαίρεση, αποχώρηση, μεταβίβαση ιδιοκτησίας.
  * Σύνδεσμοι πρόσκλησης με λήξη και όριο χρήσεων.
  * Ζωντανή συνεργασία: ποιος είναι online, ιστορικό, ενημέρωση όταν άλλος αλλάζει δεδομένα.

Τα μοντέλα της βάσης ορίζονται στο main_4_app.py και περνάνε εδώ με την init_collab().
"""
import hmac
import io
import json
import os
import re
import secrets
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

from flask import Blueprint, g, jsonify, request, send_file
from sqlalchemy.exc import IntegrityError
from flask_login import current_user, login_required, login_user, logout_user

from auth_security import clean_display_name, reauthenticate, record as record_auth_event, validate_new_password
from history_diff import RESULT_SECTIONS, SECTIONS, diff_states, summarize

bp = Blueprint('collab', __name__)
C = SimpleNamespace()  # τα μοντέλα/βοηθητικά του main_4_app (γεμίζει στην init_collab)

ROLES = ('editor', 'viewer')
ROLE_LABEL = {'owner': 'Ιδιοκτήτης', 'editor': 'Επεξεργαστής', 'viewer': 'Αναγνώστης'}
PRESENCE_WINDOW = timedelta(seconds=40)
# Συνεχόμενες αποθηκεύσεις του ίδιου χρήστη μέσα σε αυτό το διάστημα γίνονται μία εγγραφή στο ιστορικό.
SAVE_SESSION = timedelta(minutes=10)
UNREAD_CAP = 99
MAX_AVATAR_BYTES = 5 * 1024 * 1024
DEFAULT_AVATAR_SVG = b'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="32" fill="#334155"/>
<circle cx="32" cy="24" r="12" fill="#94a3b8"/>
<path d="M10 58c2-12 10-18 22-18s20 6 22 18" fill="#94a3b8"/>
</svg>'''
# Όρια χρήσης (quotas): προστατεύουν τον server από κατάχρηση και κόστος.
MAX_PROJECTS_PER_USER = int(os.getenv('MAX_PROJECTS_PER_USER', '100'))
MAX_MEMBERS_PER_PROJECT = int(os.getenv('MAX_MEMBERS_PER_PROJECT', '50'))
MAX_ACTIVE_INVITES = int(os.getenv('MAX_ACTIVE_INVITES', '20'))
PROJECT_NAME_MAX = 80
_BAD_NAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f\x7f]')


def init_collab(app, **refs):
    C.__dict__.update(refs)
    app.register_blueprint(bp)


# ---------------------------------------------------------------------------
# Σφάλματα
# ---------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, message, status=400, code=None, **extra):
        super().__init__(message)
        self.message, self.status, self.code, self.extra = message, status, code, extra


@bp.app_errorhandler(ApiError)
def _handle_api_error(err):
    payload = {'error': err.message}
    if err.code:
        payload['code'] = err.code
    payload.update(err.extra)
    return jsonify(payload), err.status


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def iso(dt):
    return dt.isoformat() + 'Z' if dt else None


def utcnow():
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Χρήστες
# ---------------------------------------------------------------------------
def user_public(user, include_email=True):
    if user is None:
        return None
    data = user.to_public_dict()
    if not include_email:
        data.pop('email', None)
    return data


def users_share_project(a_id, b_id):
    if a_id == b_id:
        return True
    Project, ProjectMember = C.Project, C.ProjectMember

    def project_ids(uid):
        owned = {p.id for p in Project.query.filter_by(owner_id=uid).all()}
        member = {m.project_id for m in ProjectMember.query.filter_by(user_id=uid).all()}
        return owned | member

    return bool(project_ids(a_id) & project_ids(b_id))


def _touch_last_seen():
    now = utcnow()
    if current_user.last_seen_at is None or (now - current_user.last_seen_at).total_seconds() > 60:
        current_user.last_seen_at = now
        C.db.session.commit()


def _relogin_current(user):
    """Μετά από αλλαγή session_version, ξανασυνδέει την τρέχουσα συσκευή."""
    from flask import current_app
    remember = bool(request.cookies.get(current_app.config.get('REMEMBER_COOKIE_NAME', 'remember_token')))
    login_user(user, remember=remember)


def clean_project_name(name):
    """Όνομα project = όνομα φακέλου στον server: χωρίς / \\ : * ? " < > | και χαρακτήρες ελέγχου."""
    if not isinstance(name, str):
        raise ApiError('Μη έγκυρο όνομα project.')
    name = ' '.join(name.split())
    if not name:
        raise ApiError('Το όνομα του project είναι υποχρεωτικό.')
    if len(name) > PROJECT_NAME_MAX:
        raise ApiError(f'Το όνομα του project πρέπει να έχει έως {PROJECT_NAME_MAX} χαρακτήρες.')
    if _BAD_NAME_CHARS.search(name) or name.strip('. ') == '' or '..' in name or name.endswith('.'):
        raise ApiError('Το όνομα του project δεν μπορεί να περιέχει τους χαρακτήρες / \\ : * ? " < > |')
    return name


def check_project_quota(user):
    if C.Project.query.filter_by(owner_id=user.id).count() >= MAX_PROJECTS_PER_USER:
        raise ApiError(f'Έφτασες το όριο των {MAX_PROJECTS_PER_USER} projects. Διέγραψε κάποιο παλιό.', 403,
                       code='quota_projects')


# ---------------------------------------------------------------------------
# Projects: βοηθητικά
# ---------------------------------------------------------------------------
def role_of(project, user):
    if project is None or user is None or not getattr(user, 'is_authenticated', False):
        return None
    if project.owner_id == user.id:
        return 'owner'
    member = C.ProjectMember.query.filter_by(project_id=project.id, user_id=user.id).first()
    return member.role if member else None


def get_project(ref, need='view', by='pid'):
    """Βρίσκει project με public_id (by='pid') ή όνομα (by='name') και ελέγχει δικαιώματα.
    need: view | edit | owner. Επιστρέφει (project, role)."""
    if by == 'pid':
        project = C.Project.query.filter_by(public_id=str(ref or '')).first()
    else:
        project = C.project_record_by_name(ref)
    role = role_of(project, current_user)
    if project is None or role is None:
        raise ApiError('Το project δεν βρέθηκε ή δεν έχεις πρόσβαση.', 404, code='no_access')
    if need == 'edit' and role == 'viewer':
        raise ApiError('Έχεις δικαίωμα μόνο ανάγνωσης σε αυτό το project.', 403, code='read_only')
    if need == 'owner' and role != 'owner':
        raise ApiError('Μόνο ο ιδιοκτήτης του project μπορεί να το κάνει αυτό.', 403, code='owner_only')
    return project, role


def topo(project):
    return C.TopoProject(workspace_dir=str(C.WORKSPACE_DIR), project_name=project.name)


def read_state(project, settings=None):
    C.resolve_project_dir(C.WORKSPACE_DIR, project.name).mkdir(parents=True, exist_ok=True)
    return topo(project).setup_project_structure(initial_settings=settings or None)


# Τα δεδομένα που αλλάζει ο χρήστης. Η σύγκριση γίνεται μόνο σε αυτά, ώστε να μη θεωρείται
# «αλλαγή» π.χ. μια νέα ημερομηνία αποθήκευσης ή ένα κενό [] αντί για «δεν υπάρχει».
DATA_KEYS = ('settings', 'observations', 'adjMetrics', 'traverse_data', 'metrics', 'tachymetryData',
             'stakeoutData', 'goniometryData', 'levelingObservations', 'levelingStations', 'levelingForward',
             'levelingBackward', 'levelingMetrics', 'trigHeightData')


def _comparable(state):
    data = {k: (state or {}).get(k) for k in DATA_KEYS}
    data = {k: v for k, v in data.items() if v not in (None, [], {}, '')}
    return json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)


def project_meta(project, role):
    return {
        'public_id': project.public_id,
        'name': project.name,
        'role': role,
        'role_label': ROLE_LABEL.get(role, role),
        'version': project.version or 0,
        'updated_at': iso(project.updated_at),
        'updated_by': user_public(project.updated_by, include_email=False),
        'owner': user_public(project.owner, include_email=False),
    }


def log_activity(project, action, detail=None, coalesce_minutes=0, user_id=None):
    Activity = C.ProjectActivity
    uid = user_id if user_id is not None else (current_user.id if current_user.is_authenticated else None)
    detail_text = json.dumps(detail or {}, ensure_ascii=False)
    now = utcnow()
    if coalesce_minutes:
        last = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).first()
        if last and last.action == action and last.user_id == uid and last.detail == detail_text \
                and (now - last.created_at) < timedelta(minutes=coalesce_minutes):
            last.created_at = now
            return
    C.db.session.add(Activity(project_id=project.id, user_id=uid, action=action, detail=detail_text, created_at=now))


def _snapshot(state):
    keys = tuple(SECTIONS) + tuple(RESULT_SECTIONS)
    return json.dumps({k: (state or {}).get(k) for k in keys}, ensure_ascii=False, default=str)


def log_saved(project, before, after, client=None):
    """Εγγραφή «άλλαξε δεδομένα» με λεπτομέρειες (τι ακριβώς άλλαξε).

    Η εφαρμογή αποθηκεύει σε κάθε πληκτρολόγηση, οπότε οι συνεχόμενες αποθηκεύσεις του ίδιου χρήστη
    ενώνονται σε μία «συνεδρία»: κρατάμε τα δεδομένα πριν ξεκινήσει (snapshot) και κάθε φορά
    ξαναϋπολογίζουμε τη διαφορά από εκεί. Η εγγραφή παίρνει νέο id σε κάθε ενημέρωση, ώστε οι
    συνεργάτες να ειδοποιούνται ξανά· το detail.session δείχνει ότι αντικαθιστά την προηγούμενη."""
    Activity = C.ProjectActivity
    uid = current_user.id
    now = utcnow()
    last = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).first()
    session_id, base = None, before
    if last is not None and last.action == 'saved' and last.user_id == uid and last.snapshot \
            and now - last.created_at < SAVE_SESSION:
        try:
            base = json.loads(last.snapshot)
            session_id = (json.loads(last.detail or '{}') or {}).get('session') or last.id
        except ValueError:
            base, last = before, None
    else:
        last = None
    sections = diff_states(base, after)
    if last is not None:
        C.db.session.delete(last)
    if not sections:
        return   # π.χ. ο χρήστης έσβησε ό,τι είχε μόλις γράψει
    if last is None:
        # Μόνο η τελευταία συνεδρία χρειάζεται snapshot· τα παλιά σβήνονται για να μη μεγαλώνει η βάση.
        Activity.query.filter(Activity.project_id == project.id, Activity.snapshot.isnot(None)) \
            .update({'snapshot': None}, synchronize_session=False)
        snapshot = _snapshot(before)
    else:
        snapshot = last.snapshot
    row = Activity(project_id=project.id, user_id=uid, action='saved', created_at=now, snapshot=snapshot)
    C.db.session.add(row)
    C.db.session.flush()
    row.detail = json.dumps({'session': session_id or row.id, 'summary': summarize(sections), 'sections': sections,
                             'client': client or None}, ensure_ascii=False)


def _read_row(project, user_id):
    """Μέχρι ποια εγγραφή του ιστορικού έχει δει ο χρήστης. Νέο μέλος: ξεκινάει από «τώρα»."""
    Read, Activity = C.ProjectRead, C.ProjectActivity
    row = Read.query.filter_by(project_id=project.id, user_id=user_id).first()
    if row is None:
        last = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).first()
        try:
            with C.db.session.begin_nested():
                row = Read(project_id=project.id, user_id=user_id, last_seen_id=last.id if last else 0)
                C.db.session.add(row)
        except IntegrityError:   # δύο αιτήματα ταυτόχρονα (π.χ. συγχρονισμός + λίστα projects)
            row = Read.query.filter_by(project_id=project.id, user_id=user_id).first()
    return row


def unread_count(project, user_id, read_row=None):
    Activity = C.ProjectActivity
    read_row = read_row or _read_row(project, user_id)
    q = Activity.query.filter(Activity.project_id == project.id, Activity.id > (read_row.last_seen_id or 0),
                              C.db.or_(Activity.user_id.is_(None), Activity.user_id != user_id))
    return min(q.count(), UNREAD_CAP)


def members_preview(project, limit=5):
    """Ιδιοκτήτης + μέλη (λίγα, για τη λίστα projects) με εικόνα και ρόλο."""
    out = []
    if project.owner is not None:
        out.append({**user_public(project.owner, include_email=False), 'role': 'owner'})
    for m in C.ProjectMember.query.filter_by(project_id=project.id).order_by(C.ProjectMember.id).limit(limit).all():
        if m.user is not None and m.user_id != project.owner_id:
            out.append({**user_public(m.user, include_email=False), 'role': m.role})
    return out[:limit]


def activity_payload(rows):
    users = {u.id: u for u in C.User.query.filter(C.User.id.in_({r.user_id for r in rows if r.user_id})).all()} if rows else {}
    out = []
    for r in rows:
        try:
            detail = json.loads(r.detail or '{}')
        except ValueError:
            detail = {}
        out.append({'id': r.id, 'action': r.action, 'detail': detail, 'at': iso(r.created_at),
                    'user': user_public(users.get(r.user_id), include_email=False)})
    return out


def members_of(project):
    owner = project.owner
    out = []
    if owner is not None:
        out.append({**user_public(owner), 'role': 'owner', 'role_label': ROLE_LABEL['owner'],
                    'added_at': iso(project.created_at), 'last_seen_at': iso(owner.last_seen_at)})
    rows = C.ProjectMember.query.filter_by(project_id=project.id).order_by(C.ProjectMember.id).all()
    for m in rows:
        if m.user is None or m.user_id == project.owner_id:
            continue
        out.append({**user_public(m.user), 'role': m.role, 'role_label': ROLE_LABEL.get(m.role, m.role),
                    'added_at': iso(m.added_at), 'last_seen_at': iso(m.user.last_seen_at)})
    return out


def save_state_checked(project, role, state, base_version=None, force=False, client=None):
    """Αποθήκευση με έλεγχο έκδοσης. Αν κάποιος ΑΛΛΟΣ αποθήκευσε στο μεταξύ → 409."""
    if role == 'viewer':
        raise ApiError('Έχεις δικαίωμα μόνο ανάγνωσης σε αυτό το project.', 403, code='read_only')
    if not isinstance(state, dict):
        raise ApiError('Λείπουν τα δεδομένα του project.')
    project_topo = topo(project)
    current_version = project.version or 0
    if base_version is not None and not force:
        try:
            base_version = int(base_version)
        except (TypeError, ValueError):
            base_version = None
    if (base_version is not None and not force and base_version != current_version
            and project.updated_by_id not in (None, current_user.id)):
        raise ApiError('Κάποιος άλλος άλλαξε το project ενώ δούλευες.', 409, code='conflict',
                       current={'state': project_topo.load_state(), 'version': current_version,
                                'updated_at': iso(project.updated_at),
                                'updated_by': user_public(project.updated_by, include_email=False)})
    try:
        existing = project_topo.load_state()
    except Exception:
        existing = None
    if existing is not None and _comparable(existing) == _comparable(state):
        return current_version, False
    state = dict(state)
    state['project_name'] = project.name
    project_topo.save_state(state)
    project.version = current_version + 1
    project.updated_at = utcnow()
    project.updated_by_id = current_user.id
    try:
        with C.db.session.begin_nested():
            log_saved(project, existing, state, client)
    except Exception:   # το ιστορικό δεν πρέπει ποτέ να χαλάσει την αποθήκευση
        C.logger.exception('Could not record history for project %s', project.id)
    C.db.session.commit()
    return project.version, True


def unique_project_name(name):
    base = ' '.join(str(name or '').split())[:PROJECT_NAME_MAX - 6] or 'Νέο project'
    candidate, k = base, 2
    while C.project_record_by_name(candidate) is not None:
        candidate = f'{base} ({k})'
        k += 1
    return candidate


def delete_project_completely(project):
    project_dir = (C.WORKSPACE_DIR / project.name).resolve()
    try:
        project_dir.relative_to(C.WORKSPACE_DIR.resolve())
        if project_dir.is_dir():
            shutil.rmtree(project_dir)
    except (ValueError, OSError) as exc:
        C.logger.warning('Could not remove project folder %s: %s', project_dir, exc)
    for model in (C.ProjectMember, C.ProjectInvite, C.ProjectActivity, C.ProjectPresence, C.ProjectRead):
        model.query.filter_by(project_id=project.id).delete()
    C.db.session.delete(project)


# ---------------------------------------------------------------------------
# Λογαριασμός / προφίλ
# ---------------------------------------------------------------------------
@bp.get('/api/me')
def get_me():
    if not current_user.is_authenticated:
        return jsonify({'error': 'Δεν είστε συνδεδεμένος'}), 401
    _touch_last_seen()
    return jsonify(current_user.to_me_dict())


def _process_avatar(raw):
    try:
        from PIL import Image, ImageOps
    except ImportError:
        if len(raw) > 2 * 1024 * 1024:
            raise ApiError('Η εικόνα πρέπει να είναι μικρότερη από 2MB.')
        if raw[:8] == b'\x89PNG\r\n\x1a\n':
            return raw, 'png'
        if raw[:3] == b'\xff\xd8\xff':
            return raw, 'jpg'
        if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
            return raw, 'webp'
        raise ApiError('Επιτρέπονται μόνο εικόνες PNG, JPG ή WEBP.')
    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
        img = img.convert('RGBA') if img.mode in ('P', 'LA', 'RGBA') else img.convert('RGB')
    except Exception:
        raise ApiError('Το αρχείο δεν είναι έγκυρη εικόνα.')
    side = min(img.size)
    left, top = (img.width - side) // 2, (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((256, 256), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, 'WEBP', quality=86, method=5)
    return out.getvalue(), 'webp'


def _remove_avatar(user):
    if user.avatar_path:
        try:
            Path(user.avatar_path).unlink(missing_ok=True)
        except OSError:
            pass
        user.avatar_path = None


@bp.put('/api/me')
@login_required
def update_me():
    """Όνομα και/ή εικόνα προφίλ (multipart ή JSON)."""
    data = request.form if request.form else body()
    if 'display_name' in data:
        name = clean_display_name(data.get('display_name'))
        if not name:
            raise ApiError('Το όνομα χρήστη δεν μπορεί να είναι κενό.')
        current_user.display_name = name
    for field in ('school', 'company'):          # προαιρετικά· κενό = σβήνεται
        if field in data:
            setattr(current_user, field, clean_display_name(data.get(field))[:120] or None)
    avatar = request.files.get('avatar')
    if avatar is not None and avatar.filename:
        raw = avatar.read(MAX_AVATAR_BYTES + 1)
        if len(raw) > MAX_AVATAR_BYTES:
            raise ApiError('Η εικόνα πρέπει να είναι μικρότερη από 5MB.')
        content, ext = _process_avatar(raw)
        C.USER_AVATAR_DIR.mkdir(parents=True, exist_ok=True)
        target = C.USER_AVATAR_DIR / f'{current_user.id}-{secrets.token_hex(6)}.{ext}'
        target.write_bytes(content)
        _remove_avatar(current_user)
        current_user.avatar_path = str(target)
    C.db.session.commit()
    return jsonify(current_user.to_me_dict())


@bp.delete('/api/me/avatar')
@login_required
def delete_avatar():
    _remove_avatar(current_user)
    C.db.session.commit()
    return jsonify(current_user.to_me_dict())


@bp.get('/api/users/<int:user_id>/avatar')
def get_avatar(user_id):
    user = C.db.session.get(C.User, user_id)
    if user is not None and user.avatar_path:
        path = Path(user.avatar_path)
        # Μόνο με την υπογεγραμμένη διεύθυνση της τρέχουσας εικόνας (βλ. User.avatar_url).
        expected = (user.avatar_url or '').partition('?')[2]
        given = f"v={request.args.get('v', '')}&s={request.args.get('s', '')}"
        if expected and hmac.compare_digest(given, expected) and path.is_file():
            mime = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}.get(
                path.suffix.lower(), 'application/octet-stream')
            return send_file(path, mimetype=mime, max_age=3600)
    return send_file(io.BytesIO(DEFAULT_AVATAR_SVG), mimetype='image/svg+xml', max_age=3600)


@bp.post('/api/me/password')
@login_required
def change_password():
    data = body()
    new_password = str(data.get('new_password') or '')[:200]
    user = current_user._get_current_object()
    if user.has_password and not user.check_password(str(data.get('current_password') or '')[:1024]):
        record_auth_event('password_change_failed', user=user)
        raise ApiError('Ο τρέχων κωδικός δεν είναι σωστός.', 403)
    if not user.has_password:
        # Λογαριασμός Google που ορίζει πρώτο κωδικό: κωδικός 2FA ή πρόσφατη σύνδεση (όχι μόνο ένα cookie).
        reauthenticate(user, data)
    if user.has_password and user.check_password(new_password):
        raise ApiError('Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τωρινό.')
    validate_new_password(new_password, user.email, user.display_name)
    user.set_password(new_password)
    user.has_password = True
    user.password_changed_at = utcnow()
    user.session_version = (user.session_version or 0) + 1   # αποσυνδέει τις άλλες συσκευές
    C.DeviceToken.query.filter_by(user_id=user.id).delete()
    C.DesktopLogin.query.filter_by(user_id=user.id).delete()
    C.db.session.commit()
    _relogin_current(user)
    record_auth_event('password_changed', user=user)
    return jsonify(user.to_me_dict())


@bp.post('/api/me/logout-all')
@login_required
def logout_everywhere():
    user = current_user._get_current_object()
    user.session_version = (user.session_version or 0) + 1
    C.DeviceToken.query.filter_by(user_id=user.id).delete()
    C.DesktopLogin.query.filter_by(user_id=user.id).delete()
    C.db.session.commit()
    _relogin_current(user)
    # Οι συνδέσεις της σελίδας ζουν στο Clerk: ακυρώνονται κι εκεί (εκτός από αυτόν τον browser).
    revoked = None
    if getattr(user, 'clerk_id', None):
        from clerk_sync import revoke_clerk_sessions
        claims = getattr(g, 'clerk_claims', None) or {}
        revoked = revoke_clerk_sessions(user.clerk_id, keep_session_id=claims.get('sid'))
    record_auth_event('logout_all', user=user, detail={'clerk_sessions_revoked': revoked})
    if getattr(user, 'clerk_id', None) and revoked is None:
        return jsonify({'status': 'partial', 'error': 'Αποσυνδέθηκαν οι συσκευές του προγράμματος, αλλά όχι οι '
                        'browsers. Δοκίμασε ξανά σε λίγο.'}), 502
    return jsonify({'status': 'success', 'revoked': revoked})


@bp.delete('/api/me')
@login_required
def delete_account():
    data = body()
    user = current_user._get_current_object()
    via_clerk = bool(getattr(user, 'clerk_id', None)) and bool(getattr(g, 'clerk_claims', None))
    if via_clerk or not user.has_password:
        reauthenticate(user, data)      # Clerk: πρόσφατη είσοδος· Google: 2FA ή πρόσφατη είσοδος
    elif not user.check_password(str(data.get('password') or '')[:1024]):
        record_auth_event('delete_account_failed', user=user)
        raise ApiError('Ο κωδικός δεν είναι σωστός.', 403)
    if str(data.get('confirm') or '').strip().upper() != 'ΔΙΑΓΡΑΦΗ':
        raise ApiError('Γράψε ΔΙΑΓΡΑΦΗ για επιβεβαίωση.')
    clerk_id = getattr(user, 'clerk_id', None)
    result = purge_account(user)
    logout_user()
    if clerk_id:
        # Ο λογαριασμός σβήνεται και στο Clerk, αλλιώς με την επόμενη σύνδεση θα ξαναδημιουργούνταν κενός.
        from clerk_sync import delete_clerk_user
        delete_clerk_user(clerk_id)
    return jsonify({'status': 'success', **result})


def purge_account(user):
    """Διαγραφή χρήστη από τη lasca.db (Προφίλ ή webhook user.deleted του Clerk): τα κοινά projects περνούν
    στον πρώτο συνεργάτη, τα υπόλοιπα σβήνονται μαζί με όλα τα στοιχεία του."""
    transferred, deleted = [], []
    for project in C.Project.query.filter_by(owner_id=user.id).all():
        members = C.ProjectMember.query.filter_by(project_id=project.id).order_by(C.ProjectMember.id).all()
        heir = next((m for m in members if m.role == 'editor'), None) or (members[0] if members else None)
        if heir is not None:
            # Κοινό project: δεν χάνεται για τους υπόλοιπους, περνάει στον πρώτο συνεργάτη.
            project.owner_id = heir.user_id
            C.db.session.delete(heir)
            log_activity(project, 'ownership_transferred', {'user': user_public(heir.user, include_email=False),
                                                            'reason': 'account_deleted'}, user_id=None)
            transferred.append(project.name)
        else:
            delete_project_completely(project)
            deleted.append(project.name)
    for model in (C.ProjectMember, C.ProjectPresence, C.ProjectRead, C.DeviceToken, C.PasswordReset, C.EmailOtp,
                  C.AuthEvent, C.DesktopLogin):
        model.query.filter_by(user_id=user.id).delete()
    _remove_avatar(user)
    C.db.session.delete(user)
    C.db.session.commit()
    return {'transferred': transferred, 'deleted': deleted}


@bp.get('/api/me/projects')
@login_required
def my_projects():
    """Projects για τη σελίδα Προφίλ και για το exe: δικά μου και κοινά, με ρόλο."""
    def describe(project, role):
        return {**project_meta(project, role),
                'owner_name': (project.owner.display_name or project.owner.email.split('@', 1)[0]) if project.owner else None,
                'members_count': C.ProjectMember.query.filter_by(project_id=project.id).count() + 1,
                'members': members_preview(project),
                'unread': unread_count(project, current_user.id),
                'created_at': iso(project.created_at)}

    owned = C.Project.query.filter_by(owner_id=current_user.id).all()
    shared = []
    for m in C.ProjectMember.query.filter_by(user_id=current_user.id).all():
        if m.project is not None and m.project.owner_id != current_user.id:
            shared.append((m.project, m.role))
    owned_out = sorted((describe(p, 'owner') for p in owned),
                       key=lambda d: d['updated_at'] or d['created_at'] or '', reverse=True)
    shared_out = sorted((describe(p, r) for p, r in shared),
                        key=lambda d: d['updated_at'] or d['created_at'] or '', reverse=True)
    collaborators = set()
    for p in owned:
        collaborators |= {m.user_id for m in C.ProjectMember.query.filter_by(project_id=p.id).all()}
    for p, _ in shared:
        collaborators.add(p.owner_id)
        collaborators |= {m.user_id for m in C.ProjectMember.query.filter_by(project_id=p.id).all()}
    collaborators.discard(current_user.id)
    C.db.session.commit()   # νέες εγγραφές «διαβάστηκε έως» (ProjectRead)
    return jsonify({'owned': owned_out, 'shared': shared_out,
                    'stats': {'owned': len(owned_out), 'shared': len(shared_out), 'collaborators': len(collaborators)}})


@bp.get('/api/users/lookup')
@login_required
def lookup_users():
    """Προτάσεις για κοινοποίηση: άτομα που ήδη συνεργάζεσαι + ακριβές email (όχι λίστα όλων)."""
    q = C.normalize_email(request.args.get('q'))
    known_ids = set()
    for p in C.Project.query.filter_by(owner_id=current_user.id).all():
        known_ids |= {m.user_id for m in C.ProjectMember.query.filter_by(project_id=p.id).all()}
    for m in C.ProjectMember.query.filter_by(user_id=current_user.id).all():
        if m.project is not None:
            known_ids.add(m.project.owner_id)
            known_ids |= {x.user_id for x in C.ProjectMember.query.filter_by(project_id=m.project_id).all()}
    known_ids.discard(current_user.id)
    out = []
    for u in C.User.query.filter(C.User.id.in_(known_ids)).all() if known_ids else []:
        pub = user_public(u)
        if not q or q in u.email or q in pub['display_name'].casefold():
            out.append({**pub, 'known': True})
    if q and C.EMAIL_RE.fullmatch(q) and not any(u['email'] == q for u in out):
        exact = C.User.query.filter(C.db.func.lower(C.User.email) == q).first()
        if exact is not None and exact.id != current_user.id:
            out.insert(0, {**user_public(exact), 'avatar_url': None, 'known': False})
    return jsonify({'users': out[:8]})


# ---------------------------------------------------------------------------
# Κλειδιά συσκευής (exe)
# ---------------------------------------------------------------------------
@bp.delete('/api/auth/device-token')
def revoke_device_token():
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        C.DeviceToken.query.filter_by(token_hash=C.hash_device_token(header[7:].strip())).delete()
        C.db.session.commit()
    return jsonify({'status': 'success'})


# ---------------------------------------------------------------------------
# Projects με όνομα (αυτά χρησιμοποιεί η εφαρμογή στη σελίδα)
# ---------------------------------------------------------------------------
@bp.get('/api/projects/list')
@login_required
def list_projects():
    names = {p.name for p in C.Project.query.filter_by(owner_id=current_user.id).all()}
    names |= {m.project.name for m in C.ProjectMember.query.filter_by(user_id=current_user.id).all() if m.project}
    return jsonify(sorted(names, key=str.casefold))


@bp.post('/api/projects/load')
@login_required
def load_project():
    data = body()
    name = clean_project_name(data.get('project_name'))
    project = C.project_record_by_name(name)
    created = False
    if project is None:
        check_project_quota(current_user)
        project = C.Project(name=name, owner_id=current_user.id, version=0)
        C.db.session.add(project)
        C.db.session.flush()
        log_activity(project, 'created', {'name': name})
        C.db.session.commit()
        created = True
    project, role = get_project(project.name, by='name')
    settings = data.get('settings') if isinstance(data.get('settings'), dict) else None
    if settings and role == 'viewer':
        settings = None
    try:
        state = read_state(project, settings)
    except ValueError as exc:
        raise ApiError(str(exc))
    state['_meta'] = {**project_meta(project, role), 'created': created}
    return jsonify(state)


@bp.post('/api/projects/save')
@login_required
def save_project():
    data = body()
    project, role = get_project(data.get('project_name'), by='name')
    state = data.get('state')
    if isinstance(state, dict):
        state = {k: v for k, v in state.items() if k != '_meta'}
    version, changed = save_state_checked(project, role, state, data.get('base_version'), bool(data.get('force')),
                                          client='web')
    return jsonify({'status': 'success', 'version': version, 'changed': changed})


@bp.delete('/api/projects/<project_name>')
@login_required
def delete_project(project_name):
    project, _ = get_project(project_name, need='owner', by='name')
    delete_project_completely(project)
    C.db.session.commit()
    return jsonify({'status': 'success', 'message': f"Το project '{project_name}' διαγράφηκε."})


# ---------------------------------------------------------------------------
# Projects με public_id (κοινοποίηση, ζωντανή συνεργασία, exe)
# ---------------------------------------------------------------------------
@bp.post('/api/projects')
@login_required
def create_project():
    """Νέο project (χρησιμοποιείται από το exe για «Ανέβασμα στο cloud»)."""
    data = body()
    client_ref = str(data.get('client_ref') or '')[:40] or None
    if client_ref:
        existing = C.Project.query.filter_by(owner_id=current_user.id, client_ref=client_ref).first()
        if existing is not None:
            return jsonify({'project': project_meta(existing, 'owner'), 'existing': True}), 200
    check_project_quota(current_user)
    name = unique_project_name(clean_project_name(data.get('name') or 'Νέο project'))
    project = C.Project(name=name, owner_id=current_user.id, version=0, client_ref=client_ref)
    C.db.session.add(project)
    C.db.session.flush()
    log_activity(project, 'created', {'name': name, 'client': str(data.get('client') or 'web')[:20]})
    C.db.session.commit()
    read_state(project)
    if isinstance(data.get('state'), dict):
        save_state_checked(project, 'owner', data['state'], client=str(data.get('client') or 'web')[:20])
    return jsonify({'project': project_meta(project, 'owner')}), 201


@bp.post('/api/projects/<pid>/delete')
@login_required
def delete_project_by_id(pid):
    """Διαγραφή με public_id (το exe: το όνομα στο cloud μπορεί να διαφέρει από τον τοπικό φάκελο)."""
    project, _ = get_project(pid, need='owner')
    name = project.name
    delete_project_completely(project)
    C.db.session.commit()
    return jsonify({'status': 'success', 'message': f"Το project '{name}' διαγράφηκε."})


@bp.get('/api/projects/<pid>/state')
@login_required
def get_state(pid):
    project, role = get_project(pid)
    return jsonify({'project': project_meta(project, role), 'state': read_state(project)})


@bp.put('/api/projects/<pid>/state')
@login_required
def put_state(pid):
    project, role = get_project(pid)
    data = body()
    version, changed = save_state_checked(project, role, data.get('state'), data.get('base_version'),
                                          bool(data.get('force')), client=str(data.get('client') or 'desktop')[:20])
    return jsonify({'version': version, 'changed': changed, 'project': project_meta(project, role)})


@bp.post('/api/projects/<pid>/sync')
@login_required
def sync_project(pid):
    """Καλείται κάθε λίγα δευτερόλεπτα όσο είναι ανοιχτό το project:
    δηλώνει ότι είμαι online και επιστρέφει αλλαγές άλλων, ποιος είναι online και το ιστορικό."""
    project, role = get_project(pid)
    data = body()
    now = utcnow()
    tool = str(data.get('tool') or '')[:40] or None
    client = str(data.get('client') or 'web')[:20]
    presence = C.ProjectPresence.query.filter_by(project_id=project.id, user_id=current_user.id).first()
    if presence is None:
        C.db.session.add(C.ProjectPresence(project_id=project.id, user_id=current_user.id, tool=tool,
                                           client=client, seen_at=now))
    else:
        presence.tool, presence.client, presence.seen_at = tool, client, now
    _touch_last_seen()
    C.db.session.commit()

    try:
        since_version = int(data.get('since_version') or 0)
    except (TypeError, ValueError):
        since_version = 0
    try:
        since_activity = int(data.get('since_activity') or 0)
    except (TypeError, ValueError):
        since_activity = 0

    online = []
    for p in C.ProjectPresence.query.filter(C.ProjectPresence.project_id == project.id,
                                            C.ProjectPresence.seen_at > now - PRESENCE_WINDOW).all():
        user = C.db.session.get(C.User, p.user_id)
        if user is not None:
            online.append({**user_public(user, include_email=False), 'tool': p.tool, 'client': p.client,
                           'self': user.id == current_user.id})

    Activity = C.ProjectActivity
    acts = Activity.query.filter(Activity.project_id == project.id, Activity.id > since_activity) \
        .order_by(Activity.id.desc()).limit(30).all()
    last_activity = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).first()

    read_row = _read_row(project, current_user.id)
    out = {'project': project_meta(project, role), 'presence': online,
           'activity': activity_payload(acts), 'last_activity': last_activity.id if last_activity else 0,
           'unread': unread_count(project, current_user.id, read_row), 'last_seen': read_row.last_seen_id or 0}
    C.db.session.commit()
    # Η σελίδα αγνοεί τις δικές της αποθηκεύσεις (τις έχει ήδη). Το exe ζητάει include_own,
    # ώστε να πάρει και αλλαγές που έκανε ο ίδιος χρήστης από τη σελίδα ή άλλον υπολογιστή.
    include_own = bool(data.get('include_own'))
    if (project.version or 0) > since_version and (include_own or project.updated_by_id not in (None, current_user.id)):
        out['state'] = read_state(project)
    return jsonify(out)


@bp.get('/api/projects/<pid>/activity')
@login_required
def get_activity(pid):
    project, _ = get_project(pid)
    Activity = C.ProjectActivity
    rows = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).limit(60).all()
    return jsonify({'activity': activity_payload(rows)})


@bp.post('/api/projects/<pid>/activity/seen')
@login_required
def mark_activity_seen(pid):
    """Ο χρήστης άνοιξε το ιστορικό: οι αλλαγές μέχρι το last_id δεν μετράνε πια ως νέες."""
    project, _ = get_project(pid)
    Activity = C.ProjectActivity
    try:
        last_id = int(body().get('last_id') or 0)
    except (TypeError, ValueError):
        last_id = 0
    newest = Activity.query.filter_by(project_id=project.id).order_by(Activity.id.desc()).first()
    row = _read_row(project, current_user.id)
    row.last_seen_id = max(row.last_seen_id or 0, min(last_id, newest.id if newest else 0))
    C.db.session.commit()
    return jsonify({'unread': unread_count(project, current_user.id, row), 'last_seen': row.last_seen_id})


# --- Μέλη -------------------------------------------------------------------
@bp.get('/api/projects/<pid>/members')
@login_required
def list_members(pid):
    project, role = get_project(pid)
    return jsonify({'project': project_meta(project, role), 'members': members_of(project)})


@bp.post('/api/projects/<pid>/members')
@login_required
def add_member(pid):
    project, _ = get_project(pid, 'owner')
    data = body()
    email = C.normalize_email(data.get('email'))
    role = data.get('role') if data.get('role') in ROLES else 'editor'
    if not email:
        raise ApiError('Δώσε το email του συνεργάτη.')
    target = C.User.query.filter(C.db.func.lower(C.User.email) == email).first()
    if target is None:
        raise ApiError('Δεν υπάρχει λογαριασμός με αυτό το email. Στείλε του σύνδεσμο πρόσκλησης!', 404,
                       code='no_user')
    if target.id == project.owner_id:
        raise ApiError('Ο χρήστης είναι ήδη ο ιδιοκτήτης του project.')
    if C.ProjectMember.query.filter_by(project_id=project.id, user_id=target.id).first():
        raise ApiError('Ο χρήστης έχει ήδη πρόσβαση στο project.', 409)
    if C.ProjectMember.query.filter_by(project_id=project.id).count() >= MAX_MEMBERS_PER_PROJECT:
        raise ApiError(f'Ένα project μπορεί να έχει έως {MAX_MEMBERS_PER_PROJECT} συνεργάτες.', 403,
                       code='quota_members')
    C.db.session.add(C.ProjectMember(project_id=project.id, user_id=target.id, role=role,
                                     added_by_id=current_user.id, added_at=utcnow()))
    log_activity(project, 'member_added', {'user': user_public(target, include_email=False), 'role': role})
    C.db.session.commit()
    return jsonify({'members': members_of(project)}), 201


@bp.patch('/api/projects/<pid>/members/<int:uid>')
@login_required
def change_member_role(pid, uid):
    project, _ = get_project(pid, 'owner')
    role = body().get('role')
    if role not in ROLES:
        raise ApiError('Μη έγκυρος ρόλος.')
    member = C.ProjectMember.query.filter_by(project_id=project.id, user_id=uid).first()
    if member is None:
        raise ApiError('Ο χρήστης δεν είναι μέλος του project.', 404)
    member.role = role
    log_activity(project, 'role_changed', {'user': user_public(member.user, include_email=False), 'role': role})
    C.db.session.commit()
    return jsonify({'members': members_of(project)})


@bp.delete('/api/projects/<pid>/members/<int:uid>')
@login_required
def remove_member(pid, uid):
    project, role = get_project(pid)
    if uid != current_user.id and role != 'owner':
        raise ApiError('Μόνο ο ιδιοκτήτης μπορεί να αφαιρέσει μέλη.', 403)
    if uid == project.owner_id:
        raise ApiError('Ο ιδιοκτήτης δεν μπορεί να αφαιρεθεί. Μεταβίβασε πρώτα την ιδιοκτησία.')
    member = C.ProjectMember.query.filter_by(project_id=project.id, user_id=uid).first()
    if member is None:
        raise ApiError('Ο χρήστης δεν είναι μέλος του project.', 404)
    target = member.user
    C.db.session.delete(member)
    C.ProjectPresence.query.filter_by(project_id=project.id, user_id=uid).delete()
    log_activity(project, 'left' if uid == current_user.id else 'member_removed',
                 {'user': user_public(target, include_email=False)})
    C.db.session.commit()
    return jsonify({'members': members_of(project)})


@bp.post('/api/projects/<pid>/leave')
@login_required
def leave_project(pid):
    project, role = get_project(pid)
    if role == 'owner':
        raise ApiError('Είσαι ο ιδιοκτήτης: μεταβίβασε πρώτα την ιδιοκτησία ή διέγραψε το project.')
    return remove_member(pid, current_user.id)


@bp.post('/api/projects/<pid>/transfer')
@login_required
def transfer_ownership(pid):
    project, _ = get_project(pid, 'owner')
    try:
        uid = int(body().get('user_id') or 0)
    except (TypeError, ValueError):
        uid = 0
    member = C.ProjectMember.query.filter_by(project_id=project.id, user_id=uid).first()
    if member is None:
        raise ApiError('Ο νέος ιδιοκτήτης πρέπει να είναι ήδη μέλος του project.')
    target = member.user
    previous_owner = project.owner_id
    C.db.session.delete(member)
    C.db.session.flush()
    project.owner_id = uid
    C.db.session.add(C.ProjectMember(project_id=project.id, user_id=previous_owner, role='editor',
                                     added_by_id=uid, added_at=utcnow()))
    log_activity(project, 'ownership_transferred', {'user': user_public(target, include_email=False)})
    C.db.session.commit()
    project, role = get_project(pid)
    return jsonify({'project': project_meta(project, role), 'members': members_of(project)})


# --- Σύνδεσμοι πρόσκλησης -----------------------------------------------------
def _public_base():
    return (C.PUBLIC_URL or request.host_url).rstrip('/')


def _invite_payload(invite):
    return {'id': invite.id, 'token': invite.token, 'url': f'{_public_base()}/invite/{invite.token}',
            'role': invite.role, 'role_label': ROLE_LABEL.get(invite.role), 'created_at': iso(invite.created_at),
            'expires_at': iso(invite.expires_at), 'max_uses': invite.max_uses, 'uses': invite.uses}


def _invite_problem(invite):
    if invite is None or invite.revoked:
        return 'Ο σύνδεσμος πρόσκλησης δεν ισχύει πια.'
    if invite.expires_at and invite.expires_at < utcnow():
        return 'Ο σύνδεσμος πρόσκλησης έχει λήξει.'
    if invite.max_uses and invite.uses >= invite.max_uses:
        return 'Ο σύνδεσμος πρόσκλησης έχει χρησιμοποιηθεί ήδη το μέγιστο πλήθος φορών.'
    return None


@bp.get('/api/projects/<pid>/invites')
@login_required
def list_invites(pid):
    project, _ = get_project(pid, 'owner')
    rows = C.ProjectInvite.query.filter_by(project_id=project.id, revoked=False) \
        .order_by(C.ProjectInvite.id.desc()).all()
    return jsonify({'invites': [_invite_payload(r) for r in rows if _invite_problem(r) is None]})


@bp.post('/api/projects/<pid>/invites')
@login_required
def create_invite(pid):
    project, _ = get_project(pid, 'owner')
    data = body()
    role = data.get('role') if data.get('role') in ROLES else 'editor'

    def bounded(value, low, high):
        try:
            value = int(value)
        except (TypeError, ValueError):
            return None
        return max(low, min(value, high)) if value > 0 else None

    active = [r for r in C.ProjectInvite.query.filter_by(project_id=project.id, revoked=False).all()
              if _invite_problem(r) is None]
    if len(active) >= MAX_ACTIVE_INVITES:
        raise ApiError(f'Υπάρχουν ήδη {MAX_ACTIVE_INVITES} ενεργοί σύνδεσμοι. Ακύρωσε κάποιον πρώτα.', 403,
                       code='quota_invites')
    days = bounded(data.get('days'), 1, 90)
    max_uses = bounded(data.get('max_uses'), 1, 500)
    invite = C.ProjectInvite(token=secrets.token_urlsafe(18), project_id=project.id, role=role,
                             created_by_id=current_user.id, created_at=utcnow(),
                             expires_at=utcnow() + timedelta(days=days) if days else None, max_uses=max_uses)
    C.db.session.add(invite)
    log_activity(project, 'invite_created', {'role': role})
    C.db.session.commit()
    return jsonify({'invite': _invite_payload(invite)}), 201


@bp.delete('/api/projects/<pid>/invites/<int:iid>')
@login_required
def revoke_invite(pid, iid):
    project, _ = get_project(pid, 'owner')
    invite = C.ProjectInvite.query.filter_by(id=iid, project_id=project.id).first()
    if invite is not None:
        invite.revoked = True
        C.db.session.commit()
    return jsonify({'status': 'success'})


@bp.get('/api/invites/<token>')
def invite_preview(token):
    invite = C.ProjectInvite.query.filter_by(token=token).first()
    problem = _invite_problem(invite)
    if problem:
        raise ApiError(problem, 410, code='invalid_invite')
    project = C.db.session.get(C.Project, invite.project_id)
    if project is None:
        raise ApiError('Το project δεν υπάρχει πια.', 410, code='invalid_invite')
    count = C.ProjectMember.query.filter_by(project_id=project.id).count() + 1
    already = role_of(project, current_user) if current_user.is_authenticated else None
    owner = project.owner
    return jsonify({'project': {'name': project.name, 'public_id': project.public_id, 'members_count': count},
                    'owner': {'display_name': user_public(owner)['display_name']} if owner else None,
                    'role': invite.role, 'role_label': ROLE_LABEL.get(invite.role),
                    'already_member': bool(already)})


@bp.post('/api/invites/<token>/accept')
@login_required
def accept_invite(token):
    invite = C.ProjectInvite.query.filter_by(token=token).first()
    problem = _invite_problem(invite)
    if problem:
        raise ApiError(problem, 410, code='invalid_invite')
    project = C.db.session.get(C.Project, invite.project_id)
    if project is None:
        raise ApiError('Το project δεν υπάρχει πια.', 410, code='invalid_invite')
    joined = False
    if role_of(project, current_user) is None:
        C.db.session.add(C.ProjectMember(project_id=project.id, user_id=current_user.id, role=invite.role,
                                         added_by_id=invite.created_by_id, added_at=utcnow()))
        invite.uses = (invite.uses or 0) + 1
        log_activity(project, 'joined_via_link', {'role': invite.role})
        C.db.session.commit()
        joined = True
    project, role = get_project(project.public_id)
    return jsonify({'joined': joined, 'project': project_meta(project, role)})
