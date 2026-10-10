"""
Λεπτομερές ιστορικό αλλαγών ενός project: τι άλλαξε ανάμεσα σε δύο εκδόσεις των δεδομένων.

Το αποτέλεσμα αποθηκεύεται στο ιστορικό του project (ProjectActivity.detail) και δείχνεται στη σελίδα
και στο exe, π.χ. «Όδευση (X,Y): +2 γραμμές · Σ3: X 1000.00 → 1000.50».

Δουλεύει γενικά σε λίστες γραμμών (πίνακες μετρήσεων), λεξικά (π.χ. ρυθμίσεις, σταθμός χάραξης)
και απλές τιμές, χωρίς να χρειάζεται να ξέρει από πριν τη μορφή κάθε εργαλείου.
"""
import json

# Ενότητες του project με τη σειρά που εμφανίζονται και το εργαλείο (tab) στο οποίο ανήκουν.
SECTIONS = {
    'settings': ('Στοιχεία project', 'dashboard'),
    'observations': ('Συνόρθωση Σταθμού', 'adjustment'),
    'traverse_data': ('Όδευση (X,Y)', 'traverse'),
    'tachymetryData': ('Αποτύπωση', 'tachymetry'),
    'stakeoutData': ('Χάραξη', 'stakeout'),
    'goniometryData': ('Γωνιομετρήσεις', 'goniometry'),
    'levelingObservations': ('Υψομετρία Όδευσης · παρατηρήσεις', 'traverse_height'),
    'levelingStations': ('Υψομετρία Όδευσης · σταθμοί', 'traverse_height'),
    'levelingForward': ('Γεωμετρική Χωροστάθμηση · μετάβαση', 'geom_leveling'),
    'levelingBackward': ('Γεωμετρική Χωροστάθμηση · επιστροφή', 'geom_leveling'),
    'trigHeightData': ('Τριγωνομετρική Υψομετρία', 'trig_leveling'),
}
# Αποτελέσματα υπολογισμών: δεν τα αναλύουμε, λέμε μόνο ότι ξαναϋπολογίστηκαν.
RESULT_SECTIONS = {
    'adjMetrics': ('Συνόρθωση Σταθμού', 'adjustment'),
    'metrics': ('Όδευση (X,Y)', 'traverse'),
    'levelingMetrics': ('Γεωμετρική Χωροστάθμηση', 'geom_leveling'),
}

FIELD_LABELS = {
    'name': 'Όνομα', 'point': 'Σημείο', 'station': 'Στάση', 'target': 'Στόχος', 'from': 'Από', 'to': 'Προς',
    'x': 'X', 'y': 'Y', 'h': 'H', 'hz': 'Hz', 'v': 'V', 'z': 'z', 'sd': 'S', 's': 'S', 'dist': 'S',
    'hi': 'hi', 'ht': 'ht', 'period': 'Περίοδος', 'Period': 'Περίοδος',
    'faceI': 'Θέση I', 'faceII': 'Θέση II', 'Face_I': 'Θέση I', 'Face_II': 'Θέση II',
    'ZfaceI': 'Z Θέση I', 'ZfaceII': 'Z Θέση II',
    'backsight': 'Πίσω', 'foresight': 'Εμπρός', 'bs_upper': 'Πίσω άνω', 'bs_lower': 'Πίσω κάτω', 'bs_s': 'Πίσω S',
    'fs_upper': 'Εμπρός άνω', 'fs_lower': 'Εμπρός κάτω', 'fs_s': 'Εμπρός S',
    'designer': 'Μελετητής', 'employer': 'Εργοδότης', 'location': 'Τοποθεσία', 'scale': 'Κλίμακα',
    'azimuthBs': 'Αζιμούθιο', 'backsight_name': 'Πίσω στόχος',
    'measurements': 'μετρήσεις', 'stations': 'στάσεις', 'points': 'σημεία',
}
# Τιμές που υπολογίζει η εφαρμογή (όχι ο χρήστης): δεν τις αναφέρουμε ως «αλλαγή».
COMPUTED_FIELDS = {
    'dh', 'dh_avg', 'adj_hz', 'std_dev', 'hz_stake', 'dist_stake', 'elevation', 'results', 'result',
    'azimuth', 'distance', 'dx', 'dy', 'corrected', 'residual', 'v_corr', 'error', 'azimuthBs',
}
# Ονόματα/ετικέτες: μια γραμμή που έχει ΜΟΝΟ αυτά (π.χ. η κενή γραμμή «P1» που βάζει η εφαρμογή
# όταν ανοίγει ένα εργαλείο) δεν θεωρείται δεδομένο.
LABEL_KEYS = {'id', 'name', 'point', 'station', 'target', 'from', 'to'}
ROW_LABEL_KEYS = ('name', 'point', 'station', 'target', 'id')
MAX_CHANGES = 8          # πόσες συγκεκριμένες αλλαγές κρατάμε ανά ενότητα
VALUE_MAX = 40


def _short(value):
    if value is None or value == '':
        return '—'
    if isinstance(value, float):
        text = f'{value:.6f}'.rstrip('0').rstrip('.')
    elif isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, default=str)
    else:
        text = str(value)
    text = ' '.join(text.split())
    return text if len(text) <= VALUE_MAX else text[:VALUE_MAX - 1] + '…'


def _blank(value):
    return value in (None, '', [], {}, '---')


def _ignored(key, value):
    """Πεδία που δεν μετράνε για το «είναι κενό»: υπολογισμένα, και ετικέτες με απλή τιμή (όχι π.χ. ο σταθμός της χάραξης)."""
    return key in COMPUTED_FIELDS or (key in LABEL_KEYS and not isinstance(value, (dict, list)))


def _blankish(value):
    """Κενό ή μόνο προεπιλογές της εφαρμογής (ονόματα χωρίς τιμές)."""
    if _blank(value):
        return True
    if isinstance(value, dict):
        return all(_blankish(v) for k, v in value.items() if not _ignored(k, v))
    if isinstance(value, list):
        return all(_row_is_empty(r) for r in value)
    return False


def _same(a, b):
    if _blank(a) and _blank(b):
        return True
    if isinstance(a, (int, float, str)) and isinstance(b, (int, float, str)):
        try:
            return float(a) == float(b)
        except (TypeError, ValueError):
            return str(a).strip() == str(b).strip()
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(b, sort_keys=True, default=str)


def _row_label(row, index):
    if isinstance(row, dict):
        if row.get('from') not in (None, '') or row.get('to') not in (None, ''):
            return f"{row.get('from') or '?'}→{row.get('to') or '?'}"
        for key in ROW_LABEL_KEYS[:-1]:
            if row.get(key) not in (None, ''):
                return _short(row[key])
    return f'γραμμή {index + 1}'


def _row_is_empty(row):
    if not isinstance(row, dict):
        return _blank(row)
    return all(_blankish(v) for k, v in row.items() if not _ignored(k, v))


def _field_changes(old, new):
    """Αλλαγές πεδίων ανάμεσα σε δύο γραμμές (λεξικά)."""
    out = []
    for key in list(old.keys()) + [k for k in new.keys() if k not in old]:
        if key == 'id' or key in COMPUTED_FIELDS:
            continue
        a, b = old.get(key), new.get(key)
        if isinstance(a, (dict, list)) or isinstance(b, (dict, list)):
            if not _same(a, b):
                out.append({'field': FIELD_LABELS.get(key, key), 'from': None, 'to': None})
            continue
        if not _same(a, b):
            out.append({'field': FIELD_LABELS.get(key, key), 'from': _short(a), 'to': _short(b)})
    return out


class _Section:
    def __init__(self):
        self.added = self.removed = self.modified = 0
        self.changes = []

    def note(self, change):
        if len(self.changes) < MAX_CHANGES:
            self.changes.append(change)

    @property
    def empty(self):
        return not (self.added or self.removed or self.modified)


def _diff_rows(old_rows, new_rows, sec, prefix=''):
    old_rows = [r for r in (old_rows or []) if not _row_is_empty(r)]
    new_rows = [r for r in (new_rows or []) if not _row_is_empty(r)]
    keyed = all(isinstance(r, dict) and r.get('id') not in (None, '') for r in old_rows + new_rows)
    if keyed:
        old_by = {str(r['id']): (i, r) for i, r in enumerate(old_rows)}
        new_by = {str(r['id']): (i, r) for i, r in enumerate(new_rows)}
        pairs = [(old_by.get(k), new_by.get(k)) for k in list(old_by) + [k for k in new_by if k not in old_by]]
    else:
        n = max(len(old_rows), len(new_rows))
        pairs = [((i, old_rows[i]) if i < len(old_rows) else None, (i, new_rows[i]) if i < len(new_rows) else None)
                 for i in range(n)]
    for old, new in pairs:
        if old is None:
            sec.added += 1
            sec.note({'kind': 'added', 'row': prefix + _row_label(new[1], new[0])})
        elif new is None:
            sec.removed += 1
            sec.note({'kind': 'removed', 'row': prefix + _row_label(old[1], old[0])})
        elif isinstance(old[1], dict) and isinstance(new[1], dict):
            fields = _field_changes(old[1], new[1])
            if fields:
                sec.modified += 1
                sec.note({'kind': 'modified', 'row': prefix + _row_label(new[1], new[0]), 'fields': fields[:4],
                          'more_fields': max(0, len(fields) - 4)})
        elif not _same(old[1], new[1]):
            sec.modified += 1
            sec.note({'kind': 'modified', 'row': prefix + f'γραμμή {new[0] + 1}',
                      'fields': [{'field': 'τιμή', 'from': _short(old[1]), 'to': _short(new[1])}]})


def _diff_value(old, new, sec, path=''):
    if _blankish(old) and _blankish(new):
        return
    if isinstance(old, list) or isinstance(new, list):
        if isinstance(old, (list, type(None))) and isinstance(new, (list, type(None))):
            _diff_rows(old, new, sec, prefix=f'{path}: ' if path else '')
            return
    if isinstance(old, dict) or isinstance(new, dict):
        old, new = old if isinstance(old, dict) else {}, new if isinstance(new, dict) else {}
        for key in list(old.keys()) + [k for k in new.keys() if k not in old]:
            if key in COMPUTED_FIELDS or key == 'id':
                continue
            label = FIELD_LABELS.get(key, key)
            a, b = old.get(key), new.get(key)
            if isinstance(a, (dict, list)) or isinstance(b, (dict, list)):
                _diff_value(a, b, sec, path=f'{path} · {label}' if path else label)
            elif not _same(a, b):
                sec.modified += 1
                sec.note({'kind': 'modified', 'row': path or None, 'fields': [{'field': label, 'from': _short(a),
                                                                               'to': _short(b)}]})
        return
    if not _same(old, new):
        sec.modified += 1
        sec.note({'kind': 'modified', 'row': path or None,
                  'fields': [{'field': path or 'τιμή', 'from': _short(old), 'to': _short(new)}]})


def diff_states(old, new):
    """Λίστα με τις ενότητες που άλλαξαν: [{key, label, tool, added, removed, modified, changes, more}]."""
    old, new = old or {}, new or {}
    out = []
    for key, (label, tool) in SECTIONS.items():
        a, b = old.get(key), new.get(key)
        if _same(a, b) or (key != 'settings' and _blankish(a) and _blankish(b)):
            continue
        sec = _Section()
        if key == 'settings':
            a = {k: v for k, v in (a or {}).items() if k not in ('created_at', 'last_modified', 'updated_at')}
            b = {k: v for k, v in (b or {}).items() if k not in ('created_at', 'last_modified', 'updated_at')}
        _diff_value(a, b, sec)
        if sec.empty:
            continue
        total = sec.added + sec.removed + sec.modified
        out.append({'key': key, 'label': label, 'tool': tool, 'added': sec.added, 'removed': sec.removed,
                    'modified': sec.modified, 'changes': sec.changes, 'more': max(0, total - len(sec.changes))})
    recalculated = [(label, tool) for key, (label, tool) in RESULT_SECTIONS.items()
                    if not _same(old.get(key), new.get(key))]
    for label, tool in recalculated:
        if not any(s['tool'] == tool for s in out):
            out.append({'key': 'results', 'label': label, 'tool': tool, 'added': 0, 'removed': 0, 'modified': 0,
                        'changes': [], 'more': 0, 'recalculated': True})
        else:
            next(s for s in out if s['tool'] == tool)['recalculated'] = True
    return out


def summarize(sections):
    """Σύντομη περιγραφή μιας γραμμής, π.χ. «Όδευση (X,Y), Χάραξη»."""
    labels = []
    for s in sections:
        if s['label'] not in labels:
            labels.append(s['label'])
    return ', '.join(labels[:3]) + (f' και {len(labels) - 3} ακόμα' if len(labels) > 3 else '')
