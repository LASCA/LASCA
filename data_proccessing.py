import math

# computation functions 
    #BASICS
def grad2rad(g):
    g_rad = g * math.pi / 200.0
    return g_rad


def ctg(a):
    tan_a = math.tan(a)
    if abs(tan_a) < 1e-15:
        raise ZeroDivisionError("Η συνεφαπτομένη δεν ορίζεται (tan(a)=0)")
    return 1 / tan_a

def normalize_grads(angle_g):
    normalized = angle_g % 400.0
    if normalized < 0:
        normalized += 400.0
    return normalized

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
    return normalize_grads(gab), s

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