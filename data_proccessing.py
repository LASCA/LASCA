import math, csv 
from typing import Optional, List, Tuple, Dict

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
    gab_rad = grad2rad(gab)
    xb = xa + d * math.sin(gab_rad)
    yb = ya + d * math.cos(gab_rad)
    return xb, yb

#2o
    # Helper function
def deutero_aux_gwnia(dx, dy):
    if abs(dy) < 1e-15:
        return 100.0 if dx > 0 else 300.0
    arad = math.atan(abs(dx / dy))
    agrad = arad * 200 / math.pi
    return agrad

def deutero_themeliodes(xa, ya, xb, yb):
    dx = xb - xa
    dy = yb - ya
    gab = 0.0
    if abs(dx) < 1e-10 and abs(dy) < 1e-10:
        raise ValueError("Απροσδιόριστο (Σημεία A και B ταυτίζονται)")
    if abs(dx) < 1e-10:
        gab = 0.0 if dy > 0 else 200.0
    elif abs(dy) < 1e-10:
        gab = 100.0 if dx > 0 else 300.0
    else:
        aux_angle = deutero_aux_gwnia(dx, dy)
        if dx > 0:
            gab = aux_angle if dy > 0 else 200.0 - aux_angle
        else:
            gab = 400.0 - aux_angle if dy > 0 else 200.0 + aux_angle
    s = math.sqrt(dx**2 + dy**2)
    return norm400(gab), s

#3o
def tri_them(Gprev: float, b: float) -> float: 
    return norm400((Gprev + b + 200.0))

def calculate_azimuths_from_station_angles(start_azimuth_g, station_angles_g):
    log_output = []
    current_azimuth_g = normalize_grads(start_azimuth_g)
    all_azimuths = [current_azimuth_g]
    log_output.append(f"Ξεκινώντας όδευση με αρχική G(0->1) = {current_azimuth_g:.4f}g")
    log_output.append("-" * 45)
    station_index = 1
    for beta in station_angles_g:
        previous_azimuth_g = current_azimuth_g
        current_azimuth_g = previous_azimuth_g + beta - 200.0
        current_azimuth_g_normalized = normalize_grads(current_azimuth_g)
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
    gwna = grad2rad(a)
    gwnb = grad2rad(b)
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
    gwna, gwnb, gwnc = grad2rad(a), grad2rad(b), grad2rad(c)
    gwnA, gwnB, gwnC = grad2rad(A), grad2rad(B), grad2rad(C)
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
    g_so, s_so = deutero_themeliodes(xs, ys, xo, yo)
    final_scale_factor = 1.0
    for point_id, hz, z, sd, t in measurements:
        if sd <= 0:
             results.append((point_id, "SD <= 0", "", ""))
             continue
        z_rad = grad2rad(z)
        hd_measured = sd * math.sin(z_rad)
        vd = sd * math.cos(z_rad)
        hd_final = hd_measured
        if apply_scale:
            hd_final = hd_measured * scale_factor
            final_scale_factor = scale_factor
        hz_diff = normalize_grads(hz - hz_o)
        g_sp = normalize_grads(g_so + hz_diff)
        xp, yp = proto_themeliodes(xs, ys, hd_final, g_sp)
        zp = zs + i + vd - t
        # Επιστρέφει τα raw δεδομένα (στρογγυλοποιημένα)
        results.append((point_id, round(xp, 3), round(yp, 3), round(zp, 3)))
    return results, g_so, final_scale_factor

#odeysi
    #metatropes

def small_diff(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None: return None
    d = a - b
    while d > 200.0: d -= 400.0
    while d <= -200.0: d += 400.0
    return d

def azimuth_from_xy(xa: float, ya: float, xb: float, yb: float) -> Optional[float]:
    Dx, Dy = xb - xa, yb - ya
    if Dx == 0.0 and Dy == 0.0: return None
    if Dx == 0.0: return 0.0 if Dy > 0.0 else 200.0
    if Dy == 0.0: return 100.0 if Dx > 0.0 else 300.0
    a = atan_g(abs(Dx / Dy))
    if   Dx > 0.0 and Dy > 0.0:  G = a
    elif Dx > 0.0 and Dy < 0.0:  G = 200.0 - a
    elif Dx < 0.0 and Dy < 0.0:  G = 200.0 + a
    else:                        G = 400.0 - a
    G = norm400(G)
    return G



def dx_dy(S: float, G: float) -> Tuple[float,float]: 
    return S * math.sin(g2r(G)), S * math.cos(g2r(G))

#Main synartisi odeysis
def compute_traverse(points: List[TraversePoint], ori_start=True, ori_end=True,
                     scale="1:1000", terrain="Ομαλό", klass="Πρωτεύουσα"):
    n = len(points)
    if n < 4:
        raise ValueError("Αναμένονται τουλάχιστον 4 σημεία (T1,T2,…,T3,T4).")
    i_T1, i_T2, i_T3, i_T4 = 0, 1, n-2, n-1
    leg_idxs    = list(range(1, n-2))
    vertex_idxs = list(range(1, n-1))
    m_int = sum(1 for i in vertex_idxs if points[i].angle is not None)

    G_start_m = azimuth_from_xy(points[i_T1].X, points[i_T1].Y, points[i_T2].X, points[i_T2].Y) if ori_start else 0.0
    G_end_m   = azimuth_from_xy(points[i_T3].X, points[i_T3].Y, points[i_T4].X, points[i_T4].Y) if ori_end else None

    sum_theta = sum(float(points[i].angle) for i in vertex_idxs if points[i].angle is not None)
    G_end_a_raw = norm400((G_start_m or 0.0) + sum_theta + m_int*200.0)
    Wbeta   = small_diff(G_end_m, G_end_a_raw) if (G_end_m is not None) else None
    Wbeta_i = (Wbeta/m_int) if (Wbeta is not None and m_int > 0) else None

    b_corr = {i: (points[i].angle + (Wbeta_i if Wbeta_i else 0.0))
              for i in vertex_idxs if points[i].angle is not None}

    Glegs=[None]*len(leg_idxs)
    first_beta=b_corr.get(i_T2,0.0)
    Glegs[0]=tri_them(float(G_start_m) if G_start_m is not None else 0.0, first_beta)
    for k in range(1,len(leg_idxs)):
        Glegs[k]=tri_them(Glegs[k-1], b_corr.get(leg_idxs[k], 0.0))

    S=[0.0]*len(leg_idxs)
    for idx,i in enumerate(leg_idxs):
        sel = points[i].dist
        if sel is None:
            alt=points[i+1].dist
            if alt is None and points[i].X is not None and points[i+1].X is not None:
                xa,ya=points[i].X,points[i].Y; xb,yb=points[i+1].X,points[i+1].Y
                alt=((xb-xa)**2+(yb-ya)**2)**0.5
            sel = alt if alt is not None else 0.0
        S[idx]=float(sel)

    dX_i=[]; dY_i=[]
    for j in range(len(leg_idxs)):
        dx,dy=dx_dy(S[j], Glegs[j]); dX_i.append(dx); dY_i.append(dy)

    dX_a,sum_dY = sum(dX_i), sum(dY_i)
    dX_m = (points[i_T3].X - points[i_T2].X) if (points[i_T3].X is not None and points[i_T2].X is not None) else None
    dY_m = (points[i_T3].Y - points[i_T2].Y) if (points[i_T3].Y is not None and points[i_T2].Y is not None) else None

    dx_err = (dX_m - dX_a) if (dX_m is not None) else None
    dy_err = (dY_m - sum_dY) if (dY_m is not None) else None
    ds_err = (math.sqrt(dx_err**2 + dy_err**2) if (dx_err is not None and dy_err is not None) else None)

    S_total=sum(S)
    if S_total>0 and dx_err is not None and dy_err is not None:
        corr_dx=[(s/S_total)*dx_err for s in S]
        corr_dy=[(s/S_total)*dy_err for s in S]
    else:
        corr_dx=[0.0]*len(S); corr_dy=[0.0]*len(S)

    coords=[(None,None)]*n
    coords[i_T1]=(points[i_T1].X,points[i_T1].Y)
    coords[i_T2]=(points[i_T2].X,points[i_T2].Y)
    coords[i_T4]=(points[i_T4].X,points[i_T4].Y)
    xk,yk=coords[i_T2]
    for j,i in enumerate(leg_idxs):
        xk += dX_i[j] + corr_dx[j]
        yk += dY_i[j] + corr_dy[j]
        coords[i+1]=(xk,yk)

    idx_scale=SCALES.index(scale)
    c=WB_COEFF[(terrain,klass)][idx_scale]
    a,b=DS_COEFF[(terrain,klass)][idx_scale]
    Wb_max = c * math.sqrt(max(m_int, 1)) / 100
    ds_max = a*math.sqrt(max(S_total,0.0))+b

    results: List[RR]=[]
    for i in range(n):
        theta=points[i].angle
        theta_corr=(theta+Wbeta_i) if (theta is not None and Wbeta_i is not None) else None
        Xi,Yi=coords[i]
        results.append(RR(points[i].name, theta, theta_corr, None,None,None,None,None,None, Xi,Yi))

    if G_start_m is not None: results[i_T1].G=G_start_m
    if G_end_m   is not None: results[i_T3].G=G_end_m
    for j,i in enumerate(leg_idxs):
        results[i].G=Glegs[j]; results[i].S=S[j]
        results[i].dX=dX_i[j]; results[i].dY=dY_i[j]
        results[i].corr_dX=corr_dx[j]; results[i].corr_dY=corr_dy[j]

    metrics={
        "G_einai": norm400(G_end_m),
        "G_prepei": norm400(G_end_a_raw),
        "Wb": small_diff(G_end_m, G_end_a_raw) if (G_end_m is not None and G_end_a_raw is not None) else None,
        "Wbi": Wbeta_i,
        "n": m_int,
        "S_total": S_total,
        "dX_prepei": dX_m, "dX_einai": dX_a,
        "dY_prepei": dY_m, "dY_einai": sum_dY,
        "dx": dx_err, "dy": dy_err, "ds": ds_err,
        "Wb_max": Wb_max, "ds_max": ds_max,
    }
    return results, {"metrics":metrics}