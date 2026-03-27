# traverse_core.py
# Core traverse computation module

import math
import csv
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict

# Import constants and helpers
from traverse_constants import SCALES, WB_COEFF, DS_COEFF
from traverse_helpers import (
    g2r, r2g, atan_g, norm400, small_diff,
    azimuth_from_xy, tri_them, dx_dy
)

# ------------------------------------------------------------------
# DATA CLASSES
# ------------------------------------------------------------------
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

# ------------------------------------------------------------------
# MAIN COMPUTATION FUNCTION
# ------------------------------------------------------------------
def compute_traverse(
    points: List[TraversePoint],
    ori_start: bool = True,
    ori_end: bool = True,
    scale: str = "1:1000",
    terrain: str = "Ομαλό",
    klass: str = "Πρωτεύουσα"
) -> Tuple[List[RR], Dict]:
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
    G_start_m = azimuth_from_xy(points[i_T1].X, points[i_T1].Y, points[i_T2].X, points[i_T2].Y) if ori_start else 0.0
    G_end_m = azimuth_from_xy(points[i_T3].X, points[i_T3].Y, points[i_T4].X, points[i_T4].Y) if ori_end else None

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
        "is_closed": is_closed,          # NEW
    }

    return results, {"metrics": metrics}

# ------------------------------------------------------------------
# OPTIONAL: CSV LOADER
# ------------------------------------------------------------------
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

# ------------------------------------------------------------------
# OPTIONAL: CSV EXPORTER
# ------------------------------------------------------------------
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

# ------------------------------------------------------------------
# MAIN (FOR TESTING)
# ------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python traverse_core.py input.csv [scale] [terrain] [class]")
        sys.exit(1)

    csv_file = sys.argv[1]
    scale = sys.argv[2] if len(sys.argv) > 2 else "1:200"
    terrain = sys.argv[3] if len(sys.argv) > 3 else "Ομαλό"
    klass = sys.argv[4] if len(sys.argv) > 4 else "Πρωτεύουσα"

    try:
        points = load_traverse_from_csv(csv_file)
        results, meta = compute_traverse(points, ori_start=True, ori_end=True,
                                         scale=scale, terrain=terrain, klass=klass)

        # Print results
        print("=== TRAVERSE RESULTS ===")
        for r in results:
            angle_str = f"{r.theta:.4f}" if r.theta is not None else "None"
            g_str = f"{r.G:.4f}" if r.G is not None else "None"
            s_str = f"{r.S:.3f}" if r.S is not None else "None"
            x_str = f"{r.X:.3f}" if r.X is not None else "None"
            y_str = f"{r.Y:.3f}" if r.Y is not None else "None"
            print(f"{r.name:6} θ={angle_str:>8} G={g_str:>8} S={s_str:>8} X={x_str:>12} Y={y_str:>12}")
        print("\n=== METRICS ===")
        for k, v in meta["metrics"].items():
            if k == "is_closed":
                print(f"{k:12} = {'ΚΛΕΙΝΕΙ' if v else 'ΔΕΝ ΚΛΕΙΝΕΙ'}")
            else:
                print(f"{k:12} = {v}")

        # Optionally export to CSV
        out_file = csv_file.replace(".csv", "_results.csv")
        export_traverse_results_to_csv(results, out_file)
        print(f"\nResults exported to {out_file}")

    except Exception as e:
        print(f"Error: {e}")