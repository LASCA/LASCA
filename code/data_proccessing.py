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
        return 0.0 if Dy > 0.0 else 200.0
    if Dy == 0.0:
        return 100.0 if Dx > 0.0 else 300.0
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

def tienstra(xa, ya, xb, yb, xc, yc, a, b, c, A, B, C):
    gwna, gwnb, gwnc = g2r(a), g2r(b), g2r(c)
    gwnA, gwnB, gwnC = g2r(A), g2r(B), g2r(C)
    denom1_val = (ctg(gwnA) - ctg(gwna))
    denom2_val = (ctg(gwnB) - ctg(gwnb))
    denom3_val = (ctg(gwnC) - ctg(gwnc))
    if abs(denom1_val) < 1e-15 or abs(denom2_val) < 1e-15 or abs(denom3_val) < 1e-15:
        raise ZeroDivisionError("Απροσδιοριστία (π.χ. A=a ή B=b ή C=c)")
    k1 = 1 / denom1_val
    k2 = 1 / denom2_val
    k3 = 1 / denom3_val
    sk = k1 + k2 + k3
    if abs(sk) < 1e-15:
        raise ZeroDivisionError("Απροσδιοριστία (k1 + k2 + k3 = 0)")
    xm = (k1 * xa + k2 * xb + k3 * xc) / sk
    ym = (k1 * ya + k2 * yb + k3 * yc) / sk
    return xm, ym

def tachymetry(xs, ys, zs, i, xo, yo, zo, hz_o, measurements, apply_scale, scale_factor):
    results = []
    g_so, s_so = deutero_them(xs, ys, xo, yo)
    final_scale_factor = 1.0
    for point_id, hz, z, sd, t in measurements:
        if sd <= 0:
             results.append((point_id, "SD <= 0", "", ""))
             continue
        z_rad = g2r(z)
        hd_measured = sd * math.sin(z_rad)
        vd = sd * math.cos(z_rad)
        hd_final = hd_measured
        if apply_scale:
            hd_final = hd_measured * scale_factor
            final_scale_factor = scale_factor
        hz_diff = norm400(hz - hz_o)
        g_sp = norm400(g_so + hz_diff)
        xp, yp = proto_themeliodes(xs, ys, hd_final, g_sp)
        zp = zs + i + vd - t
        # Επιστρέφει τα raw δεδομένα (στρογγυλοποιημένα)
        results.append((point_id, round(xp, 3), round(yp, 3), round(zp, 3)))
    return results, g_so, final_scale_factor


def tachymetry2(excel_path, apply_scale=False, scale_factor=1.0):
    # 1. Διάβασμα των Sheets
    df_st = pd.read_excel(excel_path, sheet_name='Station')
    df_meas = pd.read_excel(excel_path, sheet_name='Measurements')

    # 2. Τράβηγμα των δεδομένων της στάσης
    st = df_st.iloc[0]
    # --- ΝΕΟ: Διαβάζουμε και το όνομα της στάσης ---
    st_name = st['Station_Name'] 
    
    xs, ys, zs, i = st['XS'], st['YS'], st['ZS'], st['I']
    xo, yo, zo, hz_o = st['XO'], st['YO'], st['ZO'], st['HZ_O']

    # Υπολογισμός Γωνίας Διεύθυνσης Προσανατολισμού
    g_so, _ = deutero_them(xs, ys, xo, yo)
    
    results = []
    for _, row in df_meas.iterrows():
        p_id, hz, z, sd, t = row['PointID'], row['Hz'], row['Z'], row['SD'], row['TargetHeight']
        if sd <= 0: continue

        z_rad = g2r(z)
        hd = sd * math.sin(z_rad)
        vd = sd * math.cos(z_rad)
        if apply_scale: hd *= scale_factor

        hz_diff = norm400(hz - hz_o)
        g_sp = norm400(g_so + hz_diff)

        xp, yp = proto_themeliodes(xs, ys, hd, g_sp)
        zp = zs + i + vd - t

        results.append({'Σημείο': p_id, 'X': round(xp, 3), 'Y': round(yp, 3), 'Z': round(zp, 3)})

    # --- ΕΠΙΣΤΡΕΦΟΥΜΕ: Το df, το όνομα ΚΑΙ τις συντεταγμένες ---
    return pd.DataFrame(results), st_name, (xs, ys, zs)

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

# SYNORTHOSI STATHMOY


def solve_lsa_detailed(observations):
    """
    Εκτελεί τη συνόρθωση ελαχίστων τετραγώνων (LSA) για μία στάση.
    """
    df = pd.DataFrame(observations)
    points = df['to'].unique().tolist()
    periods = df['per'].unique().tolist()
    m, r_count = len(points), len(periods)
    
    # 1. Μέσοι όροι (πάντα υπολογίζονται)
    reduced_matrix = np.zeros((m, r_count))
    for k, per in enumerate(periods):
        p_obs = df[df['per'] == per].groupby('to')['val'].mean()
        base_val = p_obs.loc[points[0]]
        for i, pt in enumerate(points):
            diff = p_obs.loc[pt] - base_val
            reduced_matrix[i, k] = (diff + 200) % 400 - 200

    final_means_array = np.mean(reduced_matrix, axis=1)
    final_means = [(val % 400.0) for val in final_means_array]

    # 2. Έλεγχος Βαθμών Ελευθερίας
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
            
    # Τυπική απόκλιση μέσου όρου (αν r=1, βάζουμε 0 ή μια τυπική τιμή οργάνου)
    std_mean = (sigma_0 / np.sqrt(r_count)) if r_count > 1 else 0.0
    std_display = f"{std_mean:.2f}" if r_count > 1 else "--"
    
    results = [[pt, f"{final_means[i]:.5f}", std_display] for i, pt in enumerate(points)]
    
    stats = {'var': total_vv/f if f>0 else 0, 'std': sigma_0, 'f': f, 'vv': total_vv}
    
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
            l2_corr = row['Face_II'] - 200.0 if row['Face_II'] >= 200.0 else row['Face_II'] + 200.0
            l_avg = (row['Face_I'] + l2_corr) / 2.0
            observations.append({
                'to': str(row['To']), 
                'per': str(row['Period']), 
                'val': l_avg, 
                'f1': row['Face_I'], 
                'f2': row['Face_II']
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
    #Διαβάζω το αρχείο excel 
    #Ορίζω τις μεταβλητές που συμμετέχουν 
    h_station = dataframe['H_station']
    h_target = dataframe['H_target']
    z_grad = dataframe['Z_grad']
    slope = dataframe['Slope_D']

    #Μετατρέπω ζενίθια απο grad σε rad
    z_rad = g2r(z_grad)
    #Υπολογίζω ΔΗ
    dataframe['dh'] = (slope * np.cos(z_rad)) + h_station - h_target
    dataframe['dh'] = dataframe['dh'].round(3)
    # Ομαδοποίηση ανά From/To και υπολογισμός μέσου όρου στο dh
    # 1. Υπολογίζουμε το μέσο όρο (χωρίς το .round)
    mean_values = dataframe.groupby(['From', 'To'])['dh'].transform('mean')
    
    # 2. Το μετατρέπουμε σε κείμενο (string) "κλειδώνοντας" αυστηρά 3 δεκαδικά!
    # Το 'f"{x:.3f}"' σημαίνει "πάρε τον αριθμό x και δείξε τον με 3 (3f) δεκαδικά".
    dataframe['dh_mean'] = mean_values.apply(lambda x: f"{x:.3f}")
    
    # 3. Βρίσκουμε τις γραμμές που ΔΕΝ είναι οι τελευταίες
    duplicates = dataframe.duplicated(subset=['From', 'To'], keep='last')
    
    # 4. Βάζουμε κενό στις διπλότυπες
    dataframe.loc[duplicates, 'dh_mean'] = ""
    return dataframe
