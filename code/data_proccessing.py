import math, csv 
from typing import Optional, List, Tuple, Dict
from dataclasses import dataclass
import pandas as pd
import numpy as np

# computation functions 
    #BASICS
def g2r(g: float) -> float: return g * (math.pi / 200.0)

def r2g(r: float) -> float: return r * (200.0 / math.pi)

def atan_g(x: float) -> float: return r2g(math.atan(x))

def ctg(a):
    tan_a = math.tan(a)
    if abs(tan_a) < 1e-15:
        raise ZeroDivisionError("Η συνεφαπτομένη δεν ορίζεται (tan(a)=0)")
    return 1 / tan_a

def norm400(g: Optional[float]) -> Optional[float]:
    if g is None: return None
    g = g % 400.0
    if g < 0: g += 400.0
    return g

#THEM
#1o
def proto_themeliodes(xa, ya, d, gab):
    gab_rad = g2r(gab)
    xb = xa + d * math.sin(gab_rad)
    yb = ya + d * math.cos(gab_rad)
    return xb, yb

#2o
    # Helper function
    #mpoylo
def deutero_aux_gwnia(dx, dy):
    if abs(dy) < 1e-15:
        return 100.0 if dx > 0 else 300.0
    arad = math.atan(abs(dx / dy))
    agrad = arad * 200 / math.pi
    return agrad

#azimuth_from_xy
def deutero_them(xa: float, ya: float, xb: float, yb: float) -> Optional[float]:
    """Compute azimuth (grads) from point A to point B."""
    Dx = xb - xa 
    Dy = yb - ya
    s = math.sqrt(Dx**2 + Dy**2)

    if Dx == 0.0 and Dy == 0.0:
        return None
    if Dx == 0.0:
        return 0.0 if Dy > 0.0 else 200.0, s
    if Dy == 0.0:
        return 100.0 if Dx > 0.0 else 300.0, s
    a = atan_g(abs(Dx / Dy))

    if Dx > 0.0 and Dy > 0.0:
        G = a
    elif Dx > 0.0 and Dy < 0.0:
        G = 200.0 - a
    elif Dx < 0.0 and Dy < 0.0:
        G = 200.0 + a
    else:
        G = 400.0 - a
    return norm400(G), s

#3o
def tri_them(Gprev: float, b: float) -> float: 
    return norm400((Gprev + b + 200.0))

def calculate_azimuths_from_station_angles(start_azimuth_g, station_angles_g):
    log_output = []
    current_azimuth_g = norm400(start_azimuth_g)
    all_azimuths = [current_azimuth_g]
    log_output.append(f"Ξεκινώντας όδευση με αρχική G(0->1) = {current_azimuth_g:.4f}g")
    log_output.append("-" * 45)
    station_index = 1
    for beta in station_angles_g:
        previous_azimuth_g = current_azimuth_g
        current_azimuth_g = previous_azimuth_g + beta - 200.0
        current_azimuth_g_normalized = norm400(current_azimuth_g)
        log_output.append(f"Στάση {station_index}:")
        log_output.append(f"  G(προηγ) G({station_index-1}->{station_index}) = {previous_azimuth_g:.4f}g")
        log_output.append(f"  Γωνία στάσης β({station_index}) = {beta:.4f}g (εκ δεξιών)")
        log_output.append(f"  G(νέα) G({station_index}->{station_index+1})    = {previous_azimuth_g:.4f} + {beta:.4f} - 200.0")
        log_output.append(f"  {' ' * 19} = {current_azimuth_g_normalized:.4f}g")
        log_output.append("-" * 45)
        all_azimuths.append(current_azimuth_g_normalized)
        current_azimuth_g = current_azimuth_g_normalized
        station_index += 1
    final_azimuth_g = all_azimuths[-1]
    return all_azimuths, final_azimuth_g, log_output

def empros(xa, ya, xb, yb, a, b):
    gwna = g2r(a)
    gwnb = g2r(b)
    ct_gwna = ctg(gwna)
    ct_gwnb = ctg(gwnb)
    denom = ct_gwna + ct_gwnb
    if abs(denom) < 1e-15:
        raise ZeroDivisionError("Απροσδιοριστία (ctg(a) + ctg(b) = 0)")
    nom1 = yb - ya + xa * ct_gwnb + xb * ct_gwna
    nom2 = xa - xb + ya * ct_gwnb + yb * ct_gwna
    xm = nom1 / denom
    ym = nom2 / denom
    return xm, ym


def tienstra(xa, ya, xb, yb, xc, yc, a, b, c):
    """
    Υπολογισμός Οπισθοτομίας Tienstra.
    xa, ya, xb, yb, xc, yc : Συντεταγμένες A, B, C (σε m)
    a, b, c                : Σκοπευθείσες γωνίες a=BMC, b=CMA, c=AMB (σε grads/gons)
    """
    # 1. Υπολογισμός ctg(A), ctg(B), ctg(C) των εσωτερικών γωνιών του τριγώνου ABC
    # Κορυφή A (Διανύσματα AB, AC)
    uAx, uAy = xb - xa, yb - ya
    vAx, vAy = xc - xa, yc - ya
    dot_A = uAx * vAx + uAy * vAy
    cross_A = abs(uAx * vAy - uAy * vAx)
    if cross_A < 1e-15:
        raise ValueError("Τα σημεία A, B, C είναι συνευθειακά.")
    cot_A = dot_A / cross_A

    # Κορυφή B (Διανύσματα BC, BA)
    uBx, uBy = xc - xb, yc - yb
    vBx, vBy = xa - xb, ya - yb
    dot_B = uBx * vBx + uBy * vBy
    cross_B = abs(uBx * vBy - uBy * vBx)
    if cross_B < 1e-15:
        raise ValueError("Τα σημεία A, B, C είναι συνευθειακά.")
    cot_B = dot_B / cross_B

    # Κορυφή C (Διανύσματα CA, CB)
    uCx, uCy = xa - xc, ya - yc
    vCx, vCy = xb - xc, yb - yc
    dot_C = uCx * vCx + uCy * vCy
    cross_C = abs(uCx * vCy - uCy * vCx)
    if cross_C < 1e-15:
        raise ValueError("Τα σημεία A, B, C είναι συνευθειακά.")
    cot_C = dot_C / cross_C

    # 2. Μετατροπή σκοπευθεισών γωνιών α, β, γ από grads σε radians
    rad_a = a * math.pi / 200.0
    rad_b = b * math.pi / 200.0
    rad_c = c * math.pi / 200.0

    # Υπολογισμός ctg = cos / sin (διατηρεί τα πρόσημα σε όλους τους τομείς)
    cot_a = math.cos(rad_a) / math.sin(rad_a)
    cot_b = math.cos(rad_b) / math.sin(rad_b)
    cot_c = math.cos(rad_c) / math.sin(rad_c)

    # 3. Συντελεστές βαρύτητας Tienstra k1, k2, k3
    d1 = cot_A - cot_a
    d2 = cot_B - cot_b
    d3 = cot_C - cot_c

    if abs(d1) < 1e-15 or abs(d2) < 1e-15 or abs(d3) < 1e-15:
        raise ZeroDivisionError("Απροσδιοριστία (cot_vertex = cot_angle).")

    k1 = 1.0 / d1
    k2 = 1.0 / d2
    k3 = 1.0 / d3

    sk = k1 + k2 + k3
    if abs(sk) < 1e-15:
        raise ZeroDivisionError("Απροσδιοριστία: Το σημείο βρίσκεται στον επικίνδυνο κύκλο.")

    # 4. Υπολογισμός τελικών συντεταγμένων
    xm = (k1 * xa + k2 * xb + k3 * xc) / sk
    ym = (k1 * ya + k2 * yb + k3 * yc) / sk

    return xm, ym

def tachymetry(data_meas, data_st=None, target_station=None, target_orientation=None, apply_scale=False, scale_factor=1.0):
    # 1. Φόρτωση: Αν περάσουμε path διαβάζει Excel (παλιός τρόπος). Αν περάσουμε DataFrame, τα παίρνει κατευθείαν (νέος τρόπος API).
    if isinstance(data_meas, str):
        df_st = pd.read_excel(data_meas, sheet_name='stations_taxymetria')
        df_meas = pd.read_excel(data_meas, sheet_name='measurements_taxymetria')
    else:
        df_st = data_st.copy()
        df_meas = data_meas.copy()

    # 2. Προσαρμογή Ονομάτων Στηλών (Δυναμική Αναζήτηση)
    col_st = 'From' if 'From' in df_meas.columns else 'Station'
    col_or = 'O' if 'O' in df_meas.columns else 'Orientation'

    # 3. Αυτόματη συμπλήρωση κενών κελιών (Forward Fill)
    cols_to_fill = [col_st, col_or, 'HZ_O', 'Station_Height']
    for col in cols_to_fill:
        if col in df_meas.columns:
            df_meas[col] = df_meas[col].ffill()

    st_lookup = df_st.set_index('Station_Name').to_dict('index')

    results = []
    first_station = None
    first_coords = None

    # Σταθερές Διάθλασης/Καμπυλότητας για απόλυτη ακρίβεια στο Z
    R = 6371000.0
    k = 0.13

    # 5. Επεξεργασία των μετρήσεων γραμμή-γραμμή
    for index, row in df_meas.iterrows():
        st_id = row.get(col_st)
        bs_id = row.get(col_or)

        if pd.isna(st_id) or pd.isna(bs_id):
            continue

        # --- ΦΙΛΤΡΟ ΓΙΑ ΤΟ UI (Υπολογίζει μόνο ό,τι επιλέξαμε στην οθόνη) ---
        if target_station and str(st_id).lower() != str(target_station).lower():
            continue
        if target_orientation and str(bs_id).lower() != str(target_orientation).lower():
            continue

        # Έλεγχος ύπαρξης στο φύλλο Σταθμών
        if st_id not in st_lookup or bs_id not in st_lookup:
            print(f"⚠️ Προειδοποίηση: Η στάση '{st_id}' ή ο προσανατολισμός '{bs_id}' δεν βρέθηκε. Αγνόηση.")
            continue

        # Ανάκτηση των συντεταγμένων
        xs, ys, zs = st_lookup[st_id]['XS'], st_lookup[st_id]['YS'], st_lookup[st_id]['ZS']
        xo, yo = st_lookup[bs_id]['XS'], st_lookup[bs_id]['YS']

        if first_station is None:
            first_station = st_id
            first_coords = (xs, ys, zs)

        # Ανάκτηση μετρήσεων γραμμής (με ασφάλεια για None)
        hz_o = float(row.get('HZ_O', 0) or 0)
        i = float(row.get('Station_Height', 0) or 0)
        p_id = row.get('Point_ID')
        hz = float(row.get('Hz', 0) or 0)
        z = float(row.get('Z', 100) or 100)
        sd = float(row.get('SD', 0) or 0)
        t = float(row.get('TargetHeight', 0) or 0)

        if pd.isna(sd) or sd <= 0: 
            continue

        # --- ΤΟΠΟΓΡΑΦΙΚΟΙ ΥΠΟΛΟΓΙΣΜΟΙ ---
        g_so, _ = deutero_them(xs, ys, xo, yo)

        z_rad = g2r(z)
        hd = sd * math.sin(z_rad)
        vd = sd * math.cos(z_rad)
        
        if apply_scale: 
            hd *= scale_factor

        hz_diff = norm400(hz - hz_o)
        g_sp = norm400(g_so + hz_diff)

        xp, yp = proto_themeliodes(xs, ys, hd, g_sp)
        
        # Προσθήκη διόρθωσης καμπυλότητας & διάθλασης (έτσι δεν χάνεις στο Ζ)
        dz_curvature = ((1 - k) / (2 * R)) * (hd ** 2)
        zp = zs + i + vd - t + dz_curvature

        # Καθαρισμός Point_ID
        point_name = int(p_id) if not pd.isna(p_id) and isinstance(p_id, (int, float)) else p_id

        results.append({
            'Στάση': st_id,
            'Προσανατολισμός': bs_id, # Απαραίτητο για το γράφημα στο React
            'Σημείο': point_name, 
            'X': round(xp, 3), 
            'Y': round(yp, 3), 
            'Z': round(zp, 3)
        })

    results_df = pd.DataFrame(results)
    
    if first_station is None:
        first_station = "Άγνωστη"
        first_coords = (0.0, 0.0, 0.0)

    return results_df, first_station, first_coords

#ODEUSI
    #metatropes
def small_diff(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None: return None
    d = a - b
    while d > 200.0: d -= 400.0
    while d <= -200.0: d += 400.0
    return d

def dx_dy(S: float, G: float) -> Tuple[float,float]: 
    return S * math.sin(g2r(G)), S * math.cos(g2r(G))

    # Constants for traverse error limits

SCALES = ["1:200", "1:500", "1:1000", "1:2000", "1:5000", "1:10000"]

# Angular error coefficients (Wβmax)
WB_COEFF = {
    ("Ομαλό", "Πρωτεύουσα"):      [1, 1, 2, 2, 3, 3],
    ("Ομαλό", "Δευτερεύουσα"):    [1.5, 3, 5, 5, 5, 5],
    ("Έντονα κεκλιμένο", "Πρωτεύουσα"):   [2, 3, 5, 5, 5, 5],
    ("Έντονα κεκλιμένο", "Δευτερεύουσα"): [3, 5, 8, 8, 8, 8],
}

# Linear error coefficients (δsmax)
DS_COEFF = {
    ("Ομαλό", "Πρωτεύουσα"): [
        (0.005, 0.05), (0.005, 0.05), (0.01, 0.10), (0.02, 0.10), (0.04, 0.20), (0.10, 0.30)
    ],
    ("Ομαλό", "Δευτερεύουσα"): [
        (0.01, 0.05), (0.01, 0.05), (0.02, 0.10), (0.04, 0.10), (0.06, 0.20), (0.15, 0.30)
    ],
    ("Έντονα κεκλιμένο", "Πρωτεύουσα"): [
        (0.01, 0.10), (0.01, 0.10), (0.02, 0.20), (0.04, 0.20), (0.06, 0.40), (0.15, 0.30)
    ],
    ("Έντονα κεκλιμένο", "Δευτερεύουσα"): [
        (0.02, 0.10), (0.02, 0.10), (0.04, 0.20), (0.08, 0.20), (0.08, 0.40), (0.20, 0.30)
    ],
}

# DATA CLASSES
@dataclass
class TraversePoint:
    name: str
    angle: Optional[float]
    dist: Optional[float]
    X: Optional[float]
    Y: Optional[float]

@dataclass
class RR:
    name: str
    theta: Optional[float]
    theta_corr: Optional[float]
    G: Optional[float]
    S: Optional[float]
    dX: Optional[float]
    dY: Optional[float]
    corr_dX: Optional[float]
    corr_dY: Optional[float]
    X: Optional[float]
    Y: Optional[float]

# Αν δεν έχεις ορίσει ήδη την κλάση TraversePoint, βάλε και αυτό:
from dataclasses import dataclass
@dataclass
class TraversePoint:
    name: str
    angle: float = None
    dist: float = None
    X: float = None
    Y: float = None

def load_traverse_from_dataframe(df) -> list:
    """
    Φορτώνει και καθαρίζει τα δεδομένα της όδευσης από ένα pandas DataFrame,
    προστατεύοντας την εφαρμογή από κρυφούς χαρακτήρες όπως tabs (\\t) ή spaces.
    """
   
    def safe_float(val):
        """Βοηθητική συνάρτηση για ασφαλή μετατροπή σε float."""
        if val is None or pd.isna(val):
            return None
        # Καθαρισμός από tabs, αλλαγές γραμμής και ακραία κενά
        clean_val = str(val).strip().replace('\t', '')
        if clean_val == "":
            return None
        try:
            # Αντικατάσταση του κόμματος με τελεία για δεκαδικά
            clean_val = clean_val.replace(',', '.')
            return float(clean_val)
        except ValueError:
            return None

    points = []
    
    # Υποθέτουμε ότι το DataFrame έχει στήλες: 'Stations', 'Hz [grad]', 'Slope_D [m]', 'X [m]', 'Y [m]'
    # Αν οι στήλες σου έχουν ελαφρώς διαφορετικά ονόματα, προσάρμοσε τα keys στο df[...]
    for idx, row in df.iterrows():
        # Ανάγνωση ονόματος στάσης (αν είναι κενό, το προσπερνάμε)
        name_val = row.get('Stations') or row.get('Stations ')
        if pd.isna(name_val) or str(name_val).strip() == "":
            continue
        name = str(name_val).strip()

        # Ασφαλής ανάγνωση και καθαρισμός των αριθμητικών τιμών
        ang_val  = row.get('Hz [grad]') or row.get('Hz')
        dist_val = row.get('Slope_D [m]') or row.get('Slope_D')
        x_val    = row.get('X [m]') or row.get('X')
        y_val    = row.get('Y [m]') or row.get('Y')

        angle = safe_float(ang_val)
        dist  = safe_float(dist_val)
        X     = safe_float(x_val)
        Y     = safe_float(y_val)

        # Δημιουργία του αντικειμένου TraversePoint
        # Σημείωση: Αν η κλάση TraversePoint δέχεται τα ορίσματα με διαφορετικά ονόματα,
        # προσάρμοσε τα (π.χ. name=name, angle=angle, dist=dist, X=X, Y=Y)
        point = TraversePoint(
            name=name,
            angle=angle,
            dist=dist,
            X=X,
            Y=Y
        )
        points.append(point)

    return points

def traverse(points: List[TraversePoint], ori_start: bool = True, ori_end: bool = True, scale: str = "1:1000",
    terrain: str = "Ομαλό", klass: str = "Πρωτεύουσα") -> Tuple[List[RR], Dict]:
    """
    Compute a closed traverse with known start and end orientations.
    Returns:
        results: List of RR objects for each point (ordered as input)
        meta: Dictionary with metrics (including limits and errors)
    """
    n = len(points)
    if n < 4:
        raise ValueError("Αναμένονται τουλάχιστον 4 σημεία (T1,T2,…,T3,T4).")

    i_T1, i_T2, i_T3, i_T4 = 0, 1, n-2, n-1
    leg_idxs = list(range(1, n-2))
    vertex_idxs = list(range(1, n-1))
    m_int = sum(1 for i in vertex_idxs if points[i].angle is not None)

    # Start and end azimuths from coordinates
    G_start_m = deutero_them(points[i_T1].X, points[i_T1].Y, points[i_T2].X, points[i_T2].Y)[0] if ori_start else 0.0
    G_end_m = deutero_them(points[i_T3].X, points[i_T3].Y, points[i_T4].X, points[i_T4].Y)[0] if ori_end else None

    # Sum of measured angles
    sum_theta = sum(float(points[i].angle) for i in vertex_idxs if points[i].angle is not None)
    G_end_a_raw = norm400((G_start_m or 0.0) + sum_theta + m_int * 200.0)
    Wbeta = small_diff(G_end_m, G_end_a_raw) if (G_end_m is not None) else None
    Wbeta_i = (Wbeta / m_int) if (Wbeta is not None and m_int > 0) else None

    # Corrected angles
    b_corr = {}
    for i in vertex_idxs:
        if points[i].angle is not None:
            b_corr[i] = points[i].angle + (Wbeta_i if Wbeta_i is not None else 0.0)

    # Azimuths for each leg
    Glegs = [None] * len(leg_idxs)
    first_beta = b_corr.get(i_T2, 0.0)
    Glegs[0] = tri_them(float(G_start_m) if G_start_m is not None else 0.0, first_beta)
    for k in range(1, len(leg_idxs)):
        Glegs[k] = tri_them(Glegs[k-1], b_corr.get(leg_idxs[k], 0.0))

    # Distances S
    S = [0.0] * len(leg_idxs)
    for idx, i in enumerate(leg_idxs):
        sel = points[i].dist
        if sel is None:
            alt = points[i+1].dist
            if alt is None and points[i].X is not None and points[i+1].X is not None:
                xa, ya = points[i].X, points[i].Y
                xb, yb = points[i+1].X, points[i+1].Y
                alt = ((xb - xa) ** 2 + (yb - ya) ** 2) ** 0.5
            sel = alt if alt is not None else 0.0
        S[idx] = float(sel)

    # Uncorrected coordinate differences
    dX_i = []
    dY_i = []
    for j in range(len(leg_idxs)):
        dx, dy = dx_dy(S[j], Glegs[j])
        dX_i.append(dx)
        dY_i.append(dy)

    dX_a = sum(dX_i)
    sum_dY = sum(dY_i)

    # Target differences from fixed endpoints
    #new
    dX_m = (points[i_T3].X - points[i_T2].X) if (points[i_T3].X is not None and points[i_T2].X is not None) else None
    dY_m = (points[i_T3].Y - points[i_T2].Y) if (points[i_T3].Y is not None and points[i_T2].Y is not None) else None

    dx_err = (dX_m - dX_a) if (dX_m is not None) else None
    dy_err = (dY_m - sum_dY) if (dY_m is not None) else None
    ds_err = (math.sqrt(dx_err ** 2 + dy_err ** 2) if (dx_err is not None and dy_err is not None) else None)

    S_total = sum(S)
    # Corrections proportional to segment length
    if S_total > 0 and dx_err is not None and dy_err is not None:
        corr_dx = [(s / S_total) * dx_err for s in S]
        corr_dy = [(s / S_total) * dy_err for s in S]
    else:
        corr_dx = [0.0] * len(S)
        corr_dy = [0.0] * len(S)

    # Build coordinates
    coords = [(None, None)] * n
    coords[i_T1] = (points[i_T1].X, points[i_T1].Y)
    coords[i_T2] = (points[i_T2].X, points[i_T2].Y)
    coords[i_T4] = (points[i_T4].X, points[i_T4].Y)
    xk, yk = coords[i_T2]
    for j, i in enumerate(leg_idxs):
        xk += dX_i[j] + corr_dx[j]
        yk += dY_i[j] + corr_dy[j]
        coords[i+1] = (xk, yk)

    # Maximum allowed errors based on scale, terrain, class
    idx_scale = SCALES.index(scale)
    c = WB_COEFF[(terrain, klass)][idx_scale]
    a, b = DS_COEFF[(terrain, klass)][idx_scale]
    Wb_max = c * math.sqrt(max(m_int, 1)) / 100
    ds_max = a * math.sqrt(max(S_total, 0.0)) + b

    # Determine if the traverse closes
    is_closed = False
    if Wbeta is not None and ds_err is not None:
        if abs(Wbeta) <= Wb_max and abs(ds_err) <= ds_max:
            is_closed = True

    # Build results list
    results = []
    for i in range(n):
        theta = points[i].angle
        theta_corr = (theta + Wbeta_i) if (theta is not None and Wbeta_i is not None) else None
        Xi, Yi = coords[i]
        results.append(RR(points[i].name, theta, theta_corr, None, None, None, None, None, None, Xi, Yi))

    if G_start_m is not None:
        results[i_T1].G = G_start_m
    if G_end_m is not None:
        results[i_T3].G = G_end_m

    for j, i in enumerate(leg_idxs):
        results[i].G = Glegs[j]
        results[i].S = S[j]
        results[i].dX = dX_i[j]
        results[i].dY = dY_i[j]
        results[i].corr_dX = corr_dx[j]
        results[i].corr_dY = corr_dy[j]

    metrics = {
        "G_einai": norm400(G_end_m),
        "G_prepei": norm400(G_end_a_raw),
        "Wb": small_diff(G_end_m, G_end_a_raw) if (G_end_m is not None and G_end_a_raw is not None) else None,
        "Wbi": Wbeta_i,
        "n": m_int,
        "S_total": S_total,
        "dX_prepei": dX_m,
        "dX_einai": dX_a,
        "dY_prepei": dY_m,
        "dY_einai": sum_dY,
        "dx": dx_err,
        "dy": dy_err,
        "ds": ds_err,
        "Wb_max": Wb_max,
        "ds_max": ds_max,
        "is_closed": is_closed,         
    }

    return results, {"metrics": metrics}

# OPTIONAL: CSV LOADER
def load_traverse_from_csv(filepath: str) -> List[TraversePoint]:
    """
    Load points from a semicolon-separated CSV with columns:
    Point;θ(g);S(m);X;Y
    Missing values allowed.
    """
    points = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter=';')
        for row in reader:
            if len(row) < 5:
                continue
            def parse_float(s):
                s = s.strip()
                return None if s == "" else float(s.replace(',', '.'))
            name = row[0].strip()
            angle = parse_float(row[1])
            dist = parse_float(row[2])
            X = parse_float(row[3])
            Y = parse_float(row[4])
            points.append(TraversePoint(name, angle, dist, X, Y))
    if len(points) < 4:
        raise ValueError("Το αρχείο πρέπει να περιέχει τουλάχιστον 4 σημεία (T1,T2,T3,T4).")
    return points

# OPTIONAL: CSV EXPORTER
def export_traverse_results_to_csv(results: List[RR], filepath: str, angle_decimals: int = 4, linear_decimals: int = 3):
    """
    Export results to CSV (semicolon separated).
    """
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(["Point", "θ(g)", "θcorr(g)", "G(g)", "S(m)", "ΔX", "ΔY", "corr ΔX", "corr ΔY", "X", "Y"])
        for r in results:
            def fmt_angle(v):
                if v is None:
                    return ""
                return f"{v:.{angle_decimals}f}"
            def fmt_linear(v):
                if v is None:
                    return ""
                return f"{v:.{linear_decimals}f}"
            writer.writerow([
                r.name,
                fmt_angle(r.theta),
                fmt_angle(r.theta_corr),
                fmt_angle(r.G),
                fmt_linear(r.S),
                fmt_linear(r.dX),
                fmt_linear(r.dY),
                fmt_linear(r.corr_dX),
                fmt_linear(r.corr_dY),
                fmt_linear(r.X),
                fmt_linear(r.Y)
            ])

#Gwniometriseis
def gwn(dataframe):
    # Αντίγραφο για ασφάλεια
    df = dataframe.copy()
    
    face_I = df['Face I']
    face_II = df['Face II']
    
    # 1. Προβολή της Θέσης ΙΙ στο ίδιο "επίπεδο" με τη Θέση Ι
    face_II_proj = (face_II + 200) % 400
    
    # 2. Εύρεση της μικρής διαφοράς (σφάλμα στόχευσης / collimation)
    diff = face_II_proj - face_I
    
    # 3. Κανονικοποίηση της διαφοράς στο διάστημα [-200, 200]
    # Αυτό λύνει ΜΟΝΙΜΑ το πρόβλημα όταν περνάμε το φράγμα του 0 ή 400
    diff_norm = (diff + 200) % 400 - 200
    
    # 4. Τελικός Μέσος Όρος
    df['mesos_oros'] = (face_I + diff_norm / 2) % 400
    
    # 5. Ανηγμένη Τιμή (αφαίρεση της 1ης μέτρησης κάθε περιόδου)
    # Χρησιμοποιούμε % 400 αντί για .apply(lambda...) για απόλυτη ασφάλεια και ταχύτητα
    first_vals = df.groupby('Period')['mesos_oros'].transform('first')
    df['anigmeni_timi'] = (df['mesos_oros'] - first_vals) % 400
    
    # 6. Γενικός Μέσος Όρος ανά σημείο σκόπευσης ("To")
    genikos_mesos_map = df.groupby('To')['anigmeni_timi'].mean().to_dict()
    df['genikos_mesos'] = df['To'].map(genikos_mesos_map)
    
    # 7. Υπολογισμός v_ji = (Γενικός Μέσος - Ανηγμένη Τιμή) σε cc
    # Υπολογίζουμε ξανά με % 400 (στα [-200, 200]) για να αποφύγουμε wrap-around
    v_m_diff = (df['genikos_mesos'] - df['anigmeni_timi'])
    v_m_diff_norm = (v_m_diff + 200) % 400 - 200
    df['v_m'] = v_m_diff_norm * 10000
    
    # 8. Υπολογισμός v'_j (Διόρθωση σταθμού ανά περίοδο)
    v_prime_map = df.groupby('Period')['v_m'].mean().to_dict()
    df['v_prime'] = df['Period'].map(v_prime_map)
    
    # 9. Υπολογισμός v_ji'' = v_ji - v'_j
    df['v_ji'] = df['v_m'] - df['v_prime']
    
    # 10. Υπολογισμός vv = (v_ji'')^2
    df['vv'] = df['v_ji'] ** 2
    
    return df

# SYNORTHOSI STATHMOY
import pandas as pd
import numpy as np

# 1. Η ΔΙΟΡΘΩΜΕΝΗ solve_lsa_detailed
# Πρόσθεσα το st_name="Unknown" ως δεύτερη παράμετρο!
def solve_lsa_detailed(observations, st_name="Unknown"):
    """
    Εκτελεί τη συνόρθωση ελαχίστων τετραγώνων (LSA) για μία στάση.
    Διατηρεί τον πραγματικό προσανατολισμό του 1ου σημείου χωρίς να αλλοιώνει τα σφάλματα.
    """
    df = pd.DataFrame(observations)
    points = df['to'].unique().tolist()
    periods = df['per'].unique().tolist()
    m, r_count = len(points), len(periods)
    
    # 1. Μέσοι όροι (πάντα υπολογίζονται γύρω από το 0 για ασφάλεια πινάκων)
    reduced_matrix = np.zeros((m, r_count))
    for k, per in enumerate(periods):
        p_obs = df[df['per'] == per].groupby('to')['val'].mean()
        base_val = p_obs.loc[points[0]]
        for i, pt in enumerate(points):
            diff = p_obs.loc[pt] - base_val
            reduced_matrix[i, k] = (diff + 200) % 400 - 200

    # Αυτό παραμένει κεντραρισμένο στο 0, ώστε να δουλέψουν σωστά τα theta_k και v_val
    final_means_array = np.mean(reduced_matrix, axis=1)

    # ---- Η ΛΥΣΗ: ΣΤΡΟΦΗ ΣΤΟ ΤΕΛΟΣ ----
    # Βρίσκουμε τον αρχικό προσανατολισμό (π.χ. 50 gon) του 1ου σημείου από την 1η περίοδο.
    ref_angle = df[df['per'] == periods[0]].groupby('to')['val'].mean().loc[points[0]]
    
    # Μεταφέρουμε τα τελικά αποτελέσματα στο σωστό σύστημα (αναγωγή στο ref_angle αντί για 0).
    final_means = [(val + ref_angle) % 400.0 for val in final_means_array]
    # ----------------------------------

    # 2. Έλεγχος Βαθμών Ελευθερίας
    # Από εδώ και κάτω δεν αλλάζει ΤΙΠΟΤΑ. Όλη η LSA χρησιμοποιεί το 0-centered final_means_array.
    f = (m - 1) * (r_count - 1)
    
    v_matrix = np.zeros((m, r_count))
    total_vv = 0.0
    sigma_0 = 0.0
    sv_calculated = 0.0
    
    # Υπολογισμός σφαλμάτων ΜΟΝΟ αν f > 0
    if f > 0:
        for k in range(r_count):
            theta_k = np.mean(reduced_matrix[:, k] - final_means_array)
            for i in range(m):
                v_val = reduced_matrix[i, k] - final_means_array[i] - theta_k
                v_matrix[i, k] = v_val
                total_vv += (v_val * 10000.0)**2
        
        sigma_sq = total_vv / f
        sigma_0 = np.sqrt(sigma_sq)
        q_vv_ii = ((m * r_count) - m - r_count + 5) / (m * r_count)
        sv_calculated = sigma_0 * np.sqrt(q_vv_ii)

    # 3. Δημιουργία γραμμών αποτελεσμάτων (Αναλυτικά στοιχεία)
    section_3_rows = []
    for k, per in enumerate(periods):
        p_orig = df[df['per'] == per].groupby('to').first()
        for i, pt in enumerate(points):
            v_cc = v_matrix[i, k] * 10000.0
            
            # tik υπολογισμός μόνο αν sv > 0
            t_ik = 0.0
            if sv_calculated > 0:
                r_ik = v_cc / sv_calculated
                if f > 1 and (f - r_ik**2) > 0:
                    t_ik = r_ik * np.sqrt((f - 1) / (f - r_ik**2))
                else:
                    t_ik = r_ik

            section_3_rows.append({
                'to': pt, 'f1': p_orig.loc[pt, 'f1'], 'f2': p_orig.loc[pt, 'f2'],
                'val': p_orig.loc[pt, 'val'], 'v': v_cc, 
                'sv': sv_calculated, 'ext_v': t_ik
            })
            
    # Τυπική απόκλιση μέσου όρου
    std_mean = (sigma_0 / np.sqrt(r_count)) if r_count > 1 else 0.0
    std_display = f"{std_mean:.2f}" if r_count > 1 else "--"
    
    # Εδώ τροφοδοτείται ο πίνακας του frontend με τα σωστά στραμμένα final_means!
    results = [[pt, f"{final_means[i]:.5f}", std_display] for i, pt in enumerate(points)]
    
    # ΤΟ ΣΦΑΛΜΑ ΛΥΘΗΚΕ: Το st_name έρχεται πλέον από την αρχή της συνάρτησης!
    stats = {
        'station': st_name, 
        'var': total_vv/f if f > 0 else 0, 
        'std': sigma_0, 
        'f': f, 
        'vv': total_vv
    }
    
    return results, stats, section_3_rows

def process_network_data(raw_data):
    """
    Δέχεται το αρχικό DataFrame, ομαδοποιεί ανά Στάση, υπολογίζει τους μέσους όρους I/II 
    και τρέχει τη συνόρθωση για όλο το δίκτυο.
    """
    all_results = []
    detailed_analysis_data = {}
    
    # Ομαδοποίηση ανά σταθμό
    for st_name, group in raw_data.groupby('From'):
        st_name_str = str(st_name).replace('.0', '')
        observations = []
        
        # Υπολογισμός (Face I + Face II) / 2
        for _, row in group.iterrows():
            l2_corr = row['Face II'] - 200.0 if row['Face II'] >= 200.0 else row['Face II'] + 200.0
            l_avg = (row['Face I'] + l2_corr) / 2.0
            observations.append({
                'to': str(row['To']), 
                'per': str(row['Period']), 
                'val': l_avg, 
                'f1': row['Face I'], 
                'f2': row['Face II']
            })
        
        # Κλήση του πυρήνα συνόρθωσης
        res, stats, s3 = solve_lsa_detailed(observations)
        
        # Προσθήκη του ονόματος της στάσης στα τελικά αποτελέσματα
        all_results.extend([[st_name_str] + r for r in res])
        
        # Αποθήκευση των αναλυτικών στατιστικών για μελλοντικό Report
        detailed_analysis_data[st_name_str] = {'stats': stats, 'rows': s3}
        
    results_df = pd.DataFrame(all_results, columns=["Στάση", "Στόχος", "Διεύθυνση", "σ (cc)"])
    
    return results_df, detailed_analysis_data

#trigonometriki ypsometria
def trig_leveling(dataframe):
    # Ορίζω τις μεταβλητές που συμμετέχουν (με τα ακριβή ονόματα από το Excel)
    h_station = dataframe['H_station']
    h_target = dataframe['H_target']
    z_grad = dataframe['Z[grad]']  # Διορθώθηκε εδώ βάσει της εικόνας σου!
    slope = dataframe['Slope_D']

    # Μετατρέπω ζενίθια απο grad σε rad
    z_rad = g2r(z_grad)
    
    # Υπολογίζω ΔΗ
    dataframe['dh'] = (slope * np.cos(z_rad)) + h_station - h_target
    dataframe['dh'] = dataframe['dh'].round(3)
    
    # Ομαδοποίηση ανά From/To και υπολογισμός μέσου όρου στο dh
    mean_values = dataframe.groupby(['From', 'To'])['dh'].transform('mean')
    
    # Το μετατρέπουμε σε κείμενο "κλειδώνοντας" 3 δεκαδικά
    dataframe['dh_mean'] = mean_values.apply(lambda x: f"{x:.3f}")
    
    # Βρίσκουμε τις γραμμές που ΔΕΝ είναι οι τελευταίες
    duplicates = dataframe.duplicated(subset=['From', 'To'], keep='last')
    
    # Βάζουμε κενό στις διπλότυπες
    dataframe.loc[duplicates, 'dh_mean'] = ""
    
    return dataframe

# μαλλον θ αβγει εκτος
def traverse_level_calc(measurements_json):
    """
    Δέχεται τα δεδομένα (JSON) απευθείας από το UI, 
    εκτελεί τον αλυσιδωτό υπολογισμό της τριγωνομετρικής υψομετρίας
    και επιστρέφει την ίδια λίστα, αλλά με τα 'h' (Υψόμετρα) συμπληρωμένα!
    """
    if not measurements_json:
        return []
        
    # Μετατρέπουμε το JSON σε DataFrame
    df_raw = pd.DataFrame(measurements_json)
    
    # Το UI στέλνει τους Σταθμούς ως 'name' και το Υψόμετρο ως 'h'
    df_stations = pd.DataFrame({
        'Stations': df_raw.get('name', pd.Series(dtype=str)),
        'H_m': df_raw.get('h', pd.Series(dtype=float))
    })
    df_stations['Stations'] = df_stations['Stations'].astype(str).str.strip()
    df_stations['H_m'] = pd.to_numeric(df_stations['H_m'], errors='coerce')

    # Απομονώνουμε τα κρυφά πεδία των μετρήσεων που ήρθαν από το UI
    # Προνοούμε μήπως το κλειδί λέγεται Z_grad ή Z[grad]
    z_col = 'Z[grad]' if 'Z[grad]' in df_raw.columns else ('Z_grad' if 'Z_grad' in df_raw.columns else None)
    slope_col = 'Slope_D [m]' if 'Slope_D [m]' in df_raw.columns else ('Slope_D' if 'Slope_D' in df_raw.columns else None)
    
    if not z_col or not slope_col or 'From' not in df_raw.columns:
        return measurements_json # Αν λείπουν τα πεδία επιστρέφει τα δεδομένα ως έχουν

    df_measurements = df_raw[['From', 'To', slope_col, z_col, 'H_station', 'H_target']].copy()
    
    # Μετονομασία για ευκολία
    df_measurements.rename(columns={slope_col: 'Slope_D', z_col: 'Z_grad'}, inplace=True)
    df_measurements['From'] = df_measurements['From'].astype(str).str.strip().replace('nan', '')
    df_measurements['To'] = df_measurements['To'].astype(str).str.strip().replace('nan', '')

    # Φιλτράρισμα: κρατάμε μόνο τις γραμμές που έχουν τιμές 'From' και 'To'
    mask = (df_measurements['From'] != '') & (df_measurements['To'] != '')
    df_meas_clean = df_measurements[mask].copy()

    if not df_meas_clean.empty:
        for col in ['Slope_D', 'Z_grad', 'H_station', 'H_target']:
            df_meas_clean[col] = pd.to_numeric(df_meas_clean[col], errors='coerce').fillna(0.0)

        # 4. Υπολογισμός dh ανά γραμμή
        z_rad = df_meas_clean['Z_grad'] * np.pi / 200.0
        df_meas_clean['dh'] = (df_meas_clean['Slope_D'] * np.cos(z_rad)) + df_meas_clean['H_station'] - df_meas_clean['H_target']
        df_meas_clean['dh'] = df_meas_clean['dh'].round(3)

        # 5 & 6. Δυναμική ενοποίηση περιόδων (Mean dh) με απόλυτη ασφάλεια
        pair_dict = {}
        for _, row in df_meas_clean.iterrows():
            start = row['From']
            end = row['To']
            dh = row['dh']
            
            pair = (start, end)
            rev_pair = (end, start)
            
            # Αν υπάρχει ήδη το ζευγάρι, προσθέτουμε το dh.
            if pair in pair_dict:
                pair_dict[pair].append(dh)
            # Αν υπάρχει το ανάποδο (backward), προσθέτουμε το dh με ΑΝΤΙΘΕΤΟ πρόσημο
            elif rev_pair in pair_dict:
                pair_dict[rev_pair].append(-dh) 
            # Διαφορετικά, είναι η πρώτη φορά που βλέπουμε αυτή τη μετάβαση
            else:
                pair_dict[pair] = [dh]
                
        # Φτιάχνουμε τα τελικά vectors με τους μέσους όρους
        final_vectors = []
        for (start, end), dh_list in pair_dict.items():
            dh_mean = sum(dh_list) / len(dh_list)
            final_vectors.append({'From': start, 'To': end, 'dh_mean': dh_mean})
            
        df_final_vectors = pd.DataFrame(final_vectors)

        # 7. Αλυσιδωτός (Δυναμικός) υπολογισμός των υψομέτρων
        known_heights = df_stations.dropna(subset=['H_m']).set_index('Stations')['H_m'].to_dict()
        
        # Επαναλαμβάνουμε μέχρι να μην προστεθεί καμία νέα στάση (κλασικός network solver)
        added_new = True
        while added_new:
            added_new = False
            for _, vector in df_final_vectors.iterrows():
                start_node = vector['From']
                end_node = vector['To']
                dh = vector['dh_mean']
                
                # Συνθήκη 1: Ξέρουμε την αρχή, ψάχνουμε το τέλος
                if start_node in known_heights and end_node not in known_heights:
                    if end_node.startswith('S') or end_node.isdigit():
                        known_heights[end_node] = round(known_heights[start_node] + dh, 3)
                        added_new = True
                
                # Συνθήκη 2 (Έξτρα ασφάλεια): Ξέρουμε το τέλος, ψάχνουμε την αρχή
                elif end_node in known_heights and start_node not in known_heights:
                    if start_node.startswith('S') or start_node.isdigit():
                        known_heights[start_node] = round(known_heights[end_node] - dh, 3)
                        added_new = True
                        
        # 8. Περνάμε τα συμπληρωμένα H πίσω στο αρχικό JSON που ήρθε από το UI
        for row in measurements_json:
            st_name = str(row.get('name', '')).strip()
            h_val = row.get('h')
            # Αν η στάση έχει υπολογισμένο υψόμετρο και στο UI είναι κενό, το συμπληρώνουμε
            if st_name in known_heights and (pd.isna(h_val) or h_val == "" or h_val is None):
                row['h'] = known_heights[st_name]

    return measurements_json

# Ορίζουμε default τιμές για ΕΓΣΑ'87 (m0 = 0.9996, R0 ≈ 6371000m για τη μέση ακτίνα της γης)
def sintelestis_klimakas(xs: float, m_0 = 0.9996, R_0 = 6371000.0) -> float:
    E = xs
    Em_tonos = E - 500000.0
    
    # ΠΡΟΣΟΧΗ: Χρησιμοποιούμε **2 για το τετράγωνο στην Python
    mij = m_0 * (1.0 + (Em_tonos**2) / (2.0 * (R_0**2) * (m_0**2)))
    
    return mij

def calculate_stakeout(station: dict, backsight: dict, points_to_stake: list) -> dict:
    """ 
    Παράμετροι:
      station: {'name': str, 'x': str/float, 'y': str/float}
      backsight: {'name': str, 'x': str/float, 'y': str/float}
      points_to_stake: [{'id': int/str, 'name': str, 'x': str/float, 'y': str/float}, ...]
    """
    try:
        # 1. Μετατροπή και απομόνωση συντεταγμένων Στάσης (St) και Προσανατολισμού (Bs)
        xs = float(station.get('x', 0))
        ys = float(station.get('y', 0))
        xo = float(backsight.get('x', 0))
        yo = float(backsight.get('y', 0))

        # 2. Υπολογισμός Azimuth προσανατολισμού G(S->O) με τη δική σου deutero_themeliodes
        g_so, S_test = deutero_them(xs, ys, xo, yo)

        # Υπολογισμός συντελεστή κλίμακας (Δεν χρειάζεται να περάσουμε m_0, R_0, παίρνει τα defaults)
        mij = sintelestis_klimakas(xs)
        
        updated_points = []

        # 3. Υπολογισμός για κάθε σημείο προς χάραξη
        for pt in points_to_stake:
            # Αν το σημείο είναι άδειο, το προσπερνάμε χωρίς να κρασάρει το app
            if not pt.get('x') or not pt.get('y'):
                updated_pt = pt.copy()
                updated_pt['hz_stake'] = '---'
                updated_pt['dist_stake'] = '---'
                updated_points.append(updated_pt)
                continue

            xp = float(pt['x'])
            yp = float(pt['y'])

            # Υπολογισμός Azimuth G(S->P) και απόστασης από τη Στάση στο Σημείο P (στο επίπεδο προβολής)
            g_sp, dist_grid = deutero_them(xs, ys, xp, yp)

            # Η γωνία χάραξης β είναι η διαφορά των δύο Azimuth, διορθωμένη με τη norm400
            beta = g_sp - g_so
            beta_normalized = norm400(beta)

            # Αντιγραφή του σημείου και προσθήκη των υπολογισμένων στοιχείων
            updated_pt = pt.copy()
            updated_pt['hz_stake'] = beta_normalized    # Hz γωνία στροφής σε grad
            
            # ΔΙΑΙΡΕΣΗ με τον συντελεστή κλίμακας για να βρούμε την πραγματική απόσταση εδάφους
            updated_pt['dist_stake'] = dist_grid / mij  
            
            updated_points.append(updated_pt)

        return {
            "azimuth_bs": g_so,
            "points": updated_points,
            "mij": mij
        }

    except Exception as e:
        raise RuntimeError(f"Σφάλμα κατά τον υπολογισμό της χάραξης: {str(e)}")
    
def calculate_leveling(forward_data, backward_data):
    """
    Υπολογίζει τα αθροίσματα και τις διαφορές για τη χωροστάθμιση (Μετάβαση & Επιστροφή).
    Βασίζεται στη μαθηματική σχέση: dh = Σ(Οπισθοσκοπεύσεων) - Σ(Εμπροσθοσκοπεύσεων)
    """
    
    def calc_leg(data):
        sum_bs = sum_fs = sum_bs_s = sum_fs_s = 0.0
        
        for row in data:
            # Βοηθητική συνάρτηση για ασφαλή μετατροπή σε αριθμό
            def to_float(val):
                if val in [None, "", "---"]: return 0.0
                try: return float(val)
                except ValueError: return 0.0
            
            sum_bs += to_float(row.get('backsight'))
            sum_fs += to_float(row.get('foresight'))
            sum_bs_s += to_float(row.get('bs_s'))
            sum_fs_s += to_float(row.get('fs_s'))
            
        # Υπολογισμός Υψομετρικής Διαφοράς (dh) και Συνολικής Απόστασης (S)
        dh = sum_bs - sum_fs
        total_s = sum_bs_s + sum_fs_s
        
        return {
            "sum_backsights": round(sum_bs, 4),
            "sum_foresights": round(sum_fs, 4),
            "sum_bs_s": round(sum_bs_s, 2),
            "sum_fs_s": round(sum_fs_s, 2),
            "dh": round(dh, 4),
            "total_s": round(total_s, 2)
        }

    # Εφαρμογή της λογικής για Μετάβαση και Επιστροφή
    forward_metrics = calc_leg(forward_data) if forward_data else {}
    backward_metrics = calc_leg(backward_data) if backward_data else {}
    
    # Σφάλμα κλεισίματος
    error_dh = 0.0
    if forward_metrics and backward_metrics:
        # Θεωρητικά το dh μετάβασης + dh επιστροφής πρέπει να είναι 0
        error_dh = round(forward_metrics.get('dh', 0.0) + backward_metrics.get('dh', 0.0), 4)

    return forward_metrics, backward_metrics, error_dh