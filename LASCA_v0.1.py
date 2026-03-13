# LASCA v0.1 (Land Surveying Computations App) DEMO
# Tsigkoutzidis Savvas
# Ilias Saoulias
# THIS IS A DEMO
# Feel free to use, expand and share! -The LASCA Team


import sys
import math
import os
import csv 
from functools import partial



# --- THEMES DEFINITION ---
THEMES = {
    "Big Topo": {
        "sketch_bg":       "#0b1220",
        "grid_color":      "#3a4050",
        "text_color":      "#e6e6e6",
        "point_color":     "#f1fa8c",
        "triangle_color":  "#ff7b72",
        "double_line_color":"#00b7c3",
        "single_line_color":"#9aa0a6",
        "label_color":     "#e6e6e6",
        "ok_color":        "#00a36c",
        "warning_color":   "#cc0000",
        "marker_size_circle":   30,
        "marker_size_triangle": 70,
        "line_width_single":    1.6,
        "line_width_double":    2.4,
        "main_bg":         "#2D2D2D",
        "widget_bg":       "#2d2d2d",
        "text_primary":    "#F0F0F0",
        "accent":          "#FF841B",
        "header_bg":       "#242424",
        "table_header_bg": "#FF841B",
        "table_header_text": "#2D2D2D",
        "menu_bg":         "#2D2D2D",
        "menu_text":       "#F0F0F0",
        "menu_hover_bg":   "#FF841B",
        "menu_hover_text": "#FFFFFF",
        "tab_bg":          "#3a3a3a",
        "tab_text":        "#F0F0F0",
        "tab_active_bg":   "#FF841B",
        "tab_active_text": "#2D2D2D",
        "button_bg":       "#FF841B",
        "button_text":     "#FFFFFF",
        "button_hover_bg": "#005A9C",
        "input_bg":        "#3C3C3C",
        "input_text":      "#F0F0F0",
        "border_color":    "#555555",
    },
    "Nature": {
        "sketch_bg":       "#1a2f1a",
        "grid_color":      "#3a5c3a",
        "text_color":      "#e8f5e8",
        "point_color":     "#a8e6a8",
        "triangle_color":  "#ff8a80",
        "double_line_color":"#4caf50",
        "single_line_color":"#81c784",
        "label_color":     "#e8f5e8",
        "ok_color":        "#66bb6a",
        "warning_color":   "#f44336",
        "marker_size_circle":   30,
        "marker_size_triangle": 70,
        "line_width_single":    1.6,
        "line_width_double":    2.4,
        "main_bg":         "#2e3d2e",
        "widget_bg":       "#3a4a3a",
        "text_primary":    "#e8f5e8",
        "accent":          "#4caf50",
        "header_bg":       "#1b5e20",
        "table_header_bg": "#4caf50",
        "table_header_text": "#2e3d2e",
        "menu_bg":         "#1b5e20",
        "menu_text":       "#e8f5e8",
        "menu_hover_bg":   "#4caf50",
        "menu_hover_text": "#2e3d2e",
        "tab_bg":          "#3a4a3a",
        "tab_text":        "#e8f5e8",
        "tab_active_bg":   "#4caf50",
        "tab_active_text": "#2e3d2e",
        "button_bg":       "#4caf50",
        "button_text":     "#2e3d2e",
        "button_hover_bg": "#388e3c",
        "input_bg":        "#3a4a3a",
        "input_text":      "#e8f5e8",
        "border_color":    "#4a5a4a",
    },

    "Ludovisi": {
        "sketch_bg":       "#000000",
        "grid_color":      "#F9CE11",
        "text_color":      "#F9CE11",
        "point_color":     "#F9CE11",
        "triangle_color":  "#F9CE11",
        "double_line_color":"#F9CE11",
        "single_line_color":"#F9CE11",
        "label_color":     "#F9CE11",
        "ok_color":        "#2da123",
        "warning_color":   "#cc0000",
        "marker_size_circle":   30,
        "marker_size_triangle": 70,
        "line_width_single":    1.6,
        "line_width_double":    2.4,
        "main_bg":         "#25201F",
        "widget_bg":       "#25201F",
        "text_primary":    "#F9CE11",
        "accent":          "#F9CE11",
        "header_bg":       "#141414",
        "table_header_bg": "#F9CE11",
        "table_header_text": "#25201F",
        "menu_bg":         "#141414",
        "menu_text":       "#F9CE11",
        "menu_hover_bg":   "#F9CE11",
        "menu_hover_text": "#25201F",
        "tab_bg":          "#25201F",
        "tab_text":        "#F9CE11",
        "tab_active_bg":   "#F9CE11",
        "tab_active_text": "#25201F",
        "button_bg":       "#F9CE11",
        "button_text":     "#25201F",
        "button_hover_bg": "#967E0F",
        "input_bg":        "#25201F",
        "input_text":      "#F9CE11",
        "border_color":    "#F9CE11",
    },
    "Aqua": {
        "sketch_bg":       "#072a4d",
        "grid_color":      "#c0d0e0",
        "text_color":      "#072a4d",
        "point_color":     "#3498db",
        "triangle_color":  "#e74c3c",
        "double_line_color":"#2980b9",
        "single_line_color":"#7f8c8d",
        "label_color":     "#2c3e50",
        "ok_color":        "#27ae60",
        "warning_color":   "#c0392b",
        "marker_size_circle":   30,
        "marker_size_triangle": 70,
        "line_width_single":    1.6,
        "line_width_double":    2.4,
        "main_bg":         "#709bcc",
        "widget_bg":       "#709bcc",
        "text_primary":    "#020E1D",
        "accent":          "#072a4d",
        "header_bg":       "#709bcc",
        "table_header_bg": "#072a4d",
        "table_header_text": "#78b7ff",
        "menu_bg":         "#709bcc",
        "menu_text":       "#072a4d",
        "menu_hover_bg":   "#e3edf3",
        "menu_hover_text": "#072a4d",
        "tab_bg":          "#709bcc",
        "tab_text":        "#072a4d",
        "tab_active_bg":   "#3498db",
        "tab_active_text": "#78b7ff",
        "button_bg":       "#072a4d",
        "button_text":     "#78b7ff",
        "button_hover_bg": "#405969",
        "input_bg":        "#072a4d",
        "input_text":      "#78b7ff",
        "border_color":    "#78b7ff",
    },
    
    "Stark": {
        "sketch_bg": "#0a0a0a",
        "grid_color": "#2cdae1",
        "text_color": "#2cdae1",
        "point_color": "#2cdae1",
        "triangle_color": "#2cdae1",
        "double_line_color": "#2cdae1",
        "single_line_color": "#006688",
        "label_color": "#2cdae1",
        "ok_color": "#00ff88",
        "warning_color": "#ff4444",
        "marker_size_circle": 30,
        "marker_size_triangle": 70,
        "line_width_single": 1.6,
        "line_width_double": 2.4,
        "main_bg": "#1a1a1a",
        "widget_bg": "#1a1a1a",
        "text_primary": "#2cdae1",
        "accent": "#2cdae1",
        "header_bg": "#1a1a1a",
        "table_header_bg": "#0A0A0A",
        "table_header_text": "#2cdae1",
        "menu_bg": "#0a0a0a",
        "menu_text": "#2cdae1",
        "menu_hover_bg": "#2cdae1",
        "menu_hover_text": "#0a0a0a",
        "tab_bg": "#1a1a1a",
        "tab_text": "#2cdae1",
        "tab_active_bg": "#004466",
        "tab_active_text": "#2cdae1",
        "button_bg": "#2cdae1",
        "button_text": "#0a0a0a",
        "button_hover_bg": "#333333",
        "input_bg": "#1a1a1a",
        "input_text": "#2cdae1",
        "border_color": "#2cdae1",
    },
    #"Fuji": {
    #    "sketch_bg": "#f5f5f7",
    #    "grid_color": "#d1d1d6",
    #    "text_color": "#1d1d1f",
    #    "point_color": "#007aff",
    #    "triangle_color": "#ff3b30",
    #    "double_line_color": "#007aff",
    #    "single_line_color": "#8e8e93",
    #    "label_color": "#1d1d1f",
    #    "ok_color": "#34c759",
    #    "warning_color": "#ff3b30",
    #    "marker_size_circle": 30,
    #    "marker_size_triangle": 70,
    #    "line_width_single": 1.6,
    #    "line_width_double": 2.4,
    #    "main_bg": "#ffffff",
    #    "widget_bg": "#f5f5f7",
    #    "text_primary": "#1d1d1f",
    #    "accent": "#007aff",
    #    "header_bg": "#f5f5f7",
    #    "table_header_bg": "#007aff",
    #    "table_header_text": "#ffffff",
    #    "menu_bg": "#f5f5f7",
    #    "menu_text": "#1d1d1f",
    #    "menu_hover_bg": "#007aff",
    #    "menu_hover_text": "#ffffff",
    #    "tab_bg": "#e5e5ea",
    #    "tab_text": "#1d1d1f",
    #    "tab_active_bg": "#007aff",
    #    "tab_active_text": "#ffffff",
    #    "button_bg": "#007aff",
    #    "button_text": "#ffffff",
    #    "button_hover_bg": "#0056b3",
    #    "input_bg": "#ffffff",
    #    "input_text": "#1d1d1f",
    #    "border_color": "#c6c6c8",
    #},
#
    #"Apollo": {
    #    "sketch_bg": "#f0f0f0",
    #    "grid_color": "#c0c0c0",
    #    "text_color": "#000000",
    #    "point_color": "#000080",
    #    "triangle_color": "#800000",
    #    "double_line_color": "#000080",
    #    "single_line_color": "#808080",
    #    "label_color": "#000000",
    #    "ok_color": "#008000",
    #    "warning_color": "#ff0000",
    #    "marker_size_circle": 30,
    #    "marker_size_triangle": 70,
    #    "line_width_single": 1.6,
    #    "line_width_double": 2.4,
    #    "main_bg": "#ece9d8",
    #    "widget_bg": "#ffffff",
    #    "text_primary": "#000000",
    #    "accent": "#000080",
    #    "header_bg": "#004e98",
    #    "table_header_bg": "#000080",
    #    "table_header_text": "#ffffff",
    #    "menu_bg": "#ece9d8",
    #    "menu_text": "#000000",
    #    "menu_hover_bg": "#000080",
    #    "menu_hover_text": "#ffffff",
    #    "tab_bg": "#d4d0c8",
    #    "tab_text": "#000000",
    #    "tab_active_bg": "#000080",
    #    "tab_active_text": "#ffffff",
    #    "button_bg": "#d4d0c8",
    #    "button_text": "#000000",
    #    "button_hover_bg": "#c0c0c0",
    #    "input_bg": "#ffffff",
    #    "input_text": "#000000",
    #    "border_color": "#808080",
    #}
}#



# Ορισμός του τρέχοντος theme
CURRENT_THEME = "Big Topo"
THEME_TRAVERSE = THEMES[CURRENT_THEME]

# --- PyQt6 Imports ---
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QTabWidget, QStackedWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QLineEdit, QPushButton, QMessageBox, QTextEdit,
    QTableWidget, QTableWidgetItem, QHeaderView, QGroupBox, QCheckBox, QFileDialog
)
from PyQt6.QtGui import QAction, QFont
from PyQt6.QtCore import Qt

# --- ReportLab Imports ---
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_AVAILABLE = True
    try:
        pdfmetrics.registerFont(TTFont('GreekFont', 'Tahoma.ttf'))
        GREEK_FONT_NAME = 'GreekFont'
    except Exception as e:
        print(f"Προειδοποίηση: Δεν βρέθηκε η γραμματοσειρά Tahoma.ttf (Σφάλμα: {e}).")
        GREEK_FONT_NAME = 'Helvetica'
except ImportError:
    REPORTLAB_AVAILABLE = False
    GREEK_FONT_NAME = 'Helvetica'
    print("Προειδοποίηση: 'reportlab' δεν βρέθηκε. Η εξαγωγή PDF δεν θα είναι διαθέσιμη.")


# ------------------------------------------------------------------
# ΣΥΝΑΡΤΗΣΕΙΣ ΥΠΟΛΟΓΙΣΜΩΝ
# ------------------------------------------------------------------
def grad2rad(g):
    return g * math.pi / 200.0

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

def proto_themeliodes(xa, ya, d, gab):
    gab_rad = grad2rad(gab)
    xb = xa + d * math.sin(gab_rad)
    yb = ya + d * math.cos(gab_rad)
    return xb, yb

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

def calculate_tachymetry(xs, ys, zs, i, xo, yo, zo, hz_o, measurements, apply_scale, scale_factor):
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

# --- ΣΥΝΑΡΤΗΣΕΙΣ PDF (Με το "Light" στυλ) ---

def generate_pdf_report_tachymetry(results_data, station_info, parent_window=None):
    if not REPORTLAB_AVAILABLE:
        QMessageBox.critical(parent_window, "Σφάλμα Βιβλιοθήκης", "Η βιβλιοθήκη 'reportlab' δεν είναι εγκατεστημένη.\nΗ εξαγωγή PDF δεν είναι δυνατή.")
        return
    
    downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
    filepath, _ = QFileDialog.getSaveFileName(
        parent_window,
        "Αποθήκευση Αναφοράς Ταχυμετρίας",
        os.path.join(downloads_path, "Anaphora_Tachymetry_Light.pdf"),
        "PDF Documents (*.pdf)"
    )

    if not filepath:
        return

    try:
        # --- "Light" Στυλ PDF ---
        style_light_table = TableStyle([
            ('FONTNAME', (0,0), (-1,0), GREEK_FONT_NAME), 
            ('ALIGN',(0,0),(-1,0),'CENTER'), 
            ('ALIGN',(0,1),(-1,-1),'LEFT'), 
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.black), 
            ('LINEABOVE', (0,0), (-1,0), 1, colors.black), 
            ('BOX', (0,0), (-1,-1), 1, colors.black), 
            ('GRID', (0,1), (-1,-1), 0.5, colors.lightgrey), 
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ])
        
        doc = SimpleDocTemplate(filepath, pagesize=A4, 
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2*cm, rightMargin=2*cm)
        
        styles = getSampleStyleSheet()
        style_h1_gr = styles['h1']; style_h1_gr.fontName = GREEK_FONT_NAME
        style_h3_gr = styles['h3']; style_h3_gr.fontName = GREEK_FONT_NAME
        style_normal_gr = styles['Normal']; style_normal_gr.fontName = GREEK_FONT_NAME
        style_normal_gr.fontSize = 9; 
        style_normal_gr.leading = 11

        story = []
        
        title = Paragraph("ΑΝΑΦΟΡΑ ΤΑΧΥΜΕΤΡΙΑΣ", style_h1_gr)
        story.append(title)
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph("<u>Στοιχεία Εγκατάστασης</u>", style_h3_gr))
        story.append(Spacer(1, 0.2*cm))
        
        scale_text = f"{station_info['scale_factor']:.6f}" if station_info['apply_scale'] else "1.0 (Μη ενεργός)"
        station_table_data = [
            [Paragraph("<b>Στάση:</b>", style_normal_gr), Paragraph(f"{station_info['id_s']} (X={station_info['xs']:.3f}, Y={station_info['ys']:.3f}, Z={station_info['zs']:.3f})", style_normal_gr)],
            [Paragraph("<b>Προσανατολισμός:</b>", style_normal_gr), Paragraph(f"{station_info['id_o']} (X={station_info['xo']:.3f}, Y={station_info['yo']:.3f}, Z={station_info['zo']:.3f})", style_normal_gr)],
            [Paragraph("<b>Ύψος Οργάνου (i):</b>", style_normal_gr), Paragraph(f"{station_info['i_val']:.3f} m", style_normal_gr)],
            [Paragraph("<b>Συντελεστής Κλίμακας:</b>", style_normal_gr), Paragraph(scale_text, style_normal_gr)],
            [Paragraph("<b>Hz προς Προστ/σμό (Hz₀):</b>", style_normal_gr), Paragraph(f"{station_info['hz_o']:.4f} g", style_normal_gr)],
            [Paragraph("<b>Υπολογισμένη G(SO):</b>", style_normal_gr), Paragraph(f"{station_info['g_so']:.4f} g", style_normal_gr)],
        ]
        station_table = Table(station_table_data, colWidths=[6*cm, 11*cm])
        station_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(station_table)
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph("<u>Υπολογισμένες Συντεταγμένες Σημείων</u>", style_h3_gr))
        story.append(Spacer(1, 0.2*cm))
        
        table_data = [
            [Paragraph("<b>ID Σημείου</b>", style_normal_gr), Paragraph("<b>X (m)</b>", style_normal_gr),
             Paragraph("<b>Y (m)</b>", style_normal_gr), Paragraph("<b>Z (m)</b>", style_normal_gr)]
        ]
        valid_results = [row for row in results_data if row[1] != "SD <= 0"]
        # Μετατροπή των raw data (αριθμών) σε κείμενο για το PDF
        for row in valid_results:
             table_data.append([
                 Paragraph(str(row[0]), style_normal_gr), Paragraph(f"{row[1]:.3f}", style_normal_gr),
                 Paragraph(f"{row[2]:.3f}", style_normal_gr), Paragraph(f"{row[3]:.3f}", style_normal_gr)
             ])
        table = Table(table_data, colWidths=[3*cm, 4.5*cm, 4.5*cm, 4.5*cm])
        
        table.setStyle(style_light_table)
        
        story.append(table)
        doc.build(story)
        QMessageBox.information(parent_window, "Επιτυχής Εξαγωγή", f"Η αναφορά αποθηκεύτηκε ως:\n{filepath}")
    except Exception as e:
        QMessageBox.critical(parent_window, "Σφάλμα Δημιουργίας PDF", f"Προέκυψε σφάλμα κατά τη δημιουργία του PDF:\n{e}")

def generate_pdf_report_charaxi(results_list, station_info, parent_window=None):
    if not REPORTLAB_AVAILABLE:
        QMessageBox.critical(parent_window, "Σφάλμα Βιβλιοθήκης", "Η βιβλιοθήκη 'reportlab' δεν είναι εγκατεστημένη.\nΗ εξαγωγή PDF δεν είναι δυνατή.")
        return

    downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
    filepath, _ = QFileDialog.getSaveFileName(
        parent_window,
        "Αποθήκευση Αναφοράς Χάραξης",
        os.path.join(downloads_path, "Anaphora_Charaxis_Light.pdf"),
        "PDF Documents (*.pdf)"
    )

    if not filepath:
        return

    try:
        # --- "Light" Στυλ PDF ---
        style_light_table = TableStyle([
            ('FONTNAME', (0,0), (-1,0), GREEK_FONT_NAME),
            ('ALIGN',(0,0),(-1,0),'CENTER'), 
            ('ALIGN',(0,1),(-1,-1),'LEFT'), 
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.black), 
            ('LINEABOVE', (0,0), (-1,0), 1, colors.black), 
            ('BOX', (0,0), (-1,-1), 1, colors.black),
            ('GRID', (0,1), (-1,-1), 0.5, colors.lightgrey), 
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ])
        
        doc = SimpleDocTemplate(filepath, pagesize=A4, 
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2*cm, rightMargin=2*cm)
        
        styles = getSampleStyleSheet()
        style_h1_gr = styles['h1']; style_h1_gr.fontName = GREEK_FONT_NAME
        style_h3_gr = styles['h3']; style_h3_gr.fontName = GREEK_FONT_NAME
        style_normal_gr = styles['Normal']; style_normal_gr.fontName = GREEK_FONT_NAME
        style_normal_gr.fontSize = 9; 
        style_normal_gr.leading = 11

        story = []

        title = Paragraph("ΑΝΑΦΟΡΑ ΣΤΟΙΧΕΙΩΝ ΧΑΡΑΞΗΣ", style_h1_gr)
        story.append(title)
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph("<u>Στοιχεία Εγκατάστασης</u>", style_h3_gr))
        story.append(Spacer(1, 0.2*cm))
        
        scale_text = f"{station_info['scale_factor']:.6f}" if station_info['apply_scale'] else "1.0 (Μη ενεργός)"
        station_table_data = [
            [Paragraph("<b>Στάση (S):</b>", style_normal_gr), Paragraph(f"{station_info['id_s']} (X={station_info['xs']:.3f}, Y={station_info['ys']:.3f})", style_normal_gr)],
            [Paragraph("<b>Προσανατολισμός (O):</b>", style_normal_gr), Paragraph(f"{station_info['id_o']} (X={station_info['xo']:.3f}, Y={station_info['yo']:.3f})", style_normal_gr)],
            [Paragraph("<b>Συντελεστής Κλίμακας:</b>", style_normal_gr), Paragraph(scale_text, style_normal_gr)],
            [Paragraph("<b>Υπολογισμένη G(SO):</b>", style_normal_gr), Paragraph(f"{station_info['g_so']:.4f} g", style_normal_gr)],
        ]
        station_table = Table(station_table_data, colWidths=[6*cm, 11*cm])
        station_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(station_table)
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph("<u>Στοιχεία Χάραξης Σημείων</u>", style_h3_gr))
        story.append(Spacer(1, 0.2*cm))
        
        table_data = [
            [Paragraph("<b>ID</b>", style_normal_gr), Paragraph("<b>Xp (m)</b>", style_normal_gr),
             Paragraph("<b>Yp (m)</b>", style_normal_gr), Paragraph("<b>Γωνία β (g)</b>", style_normal_gr),
             Paragraph("<b>Απόσταση S (m)</b>", style_normal_gr)]
        ]
        # Μετατροπή των raw data (αριθμών) σε κείμενο για το PDF
        for row in results_list:
            (point_id_p, xp, yp, beta, dist_ground) = row
            beta_str = f"{beta:.4f}" if isinstance(beta, (int, float)) else "---"
            dist_str = f"{dist_ground:.3f}" if isinstance(dist_ground, (int, float)) else "---"
            
            table_data.append([
                 Paragraph(str(point_id_p), style_normal_gr), Paragraph(f"{xp:.3f}", style_normal_gr),
                 Paragraph(f"{yp:.3f}", style_normal_gr), Paragraph(beta_str, style_normal_gr),
                 Paragraph(dist_str, style_normal_gr)
            ])
        table = Table(table_data, colWidths=[2.5*cm, 3.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
        
        table.setStyle(style_light_table)
        
        story.append(table)
        doc.build(story)
        QMessageBox.information(parent_window, "Επιτυχής Εξαγωγή", f"Η αναφορά αποθηκεύτηκε ως:\n{filepath}")
    except Exception as e:
        QMessageBox.critical(parent_window, "Σφάλμα Δημιουργίας PDF", f"Προέκυψε σφάλμα κατά τη δημιουργία του PDF:\n{e}")

# ------------------------------------------------------------------
# ΚΥΡΙΑ ΕΦΑΡΜΟΓΗ PyQt6
# ------------------------------------------------------------------


# ========================= ΟΔΕΥΣΗ TAB =========================
from dataclasses import dataclass
from typing import Optional, List, Tuple, Dict
import math, csv

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QGroupBox, QLabel, QPushButton,
    QComboBox, QSpinBox, QFileDialog, QMessageBox, QTableWidget, QTableWidgetItem, QHeaderView
)
from PyQt6.QtCore import Qt

from matplotlib.figure import Figure
from matplotlib.backends.backend_qt5agg import (
    FigureCanvasQTAgg as FigureCanvas,
    NavigationToolbar2QT as NavigationToolbar,
)


SCALES = ["1:200","1:500","1:1000","1:2000","1:5000","1:10000"]
WB_COEFF = {
    ("Ομαλό","Πρωτεύουσα"):      [1,1,2,2,3,3],
    ("Ομαλό","Δευτερεύουσα"):    [1.5,3,5,5,5,5],
    ("Έντονα κεκλιμένο","Πρωτεύουσα"):   [2,3,5,5,5,5],
    ("Έντονα κεκλιμένο","Δευτερεύουσα"): [3,5,8,8,8,8],
}
DS_COEFF = {
    ("Ομαλό","Πρωτεύουσα"): [
        (0.005,0.05),(0.005,0.05),(0.01,0.10),(0.02,0.10),(0.04,0.20),(0.10,0.30)
    ],
    ("Ομαλό","Δευτερεύουσα"): [
        (0.01,0.05),(0.01,0.05),(0.02,0.10),(0.04,0.10),(0.06,0.20),(0.15,0.30)
    ],
    ("Έντονα κεκλιμένο","Πρωτεύουσα"): [
        (0.01,0.10),(0.01,0.10),(0.02,0.20),(0.04,0.20),(0.06,0.40),(0.15,0.30)
    ],
    ("Έντονα κεκλιμένο","Δευτερεύουσα"): [
        (0.02,0.10),(0.02,0.10),(0.04,0.20),(0.08,0.20),(0.08,0.40),(0.20,0.30)
    ],
}

def g2r(g: float) -> float: return g * (math.pi / 200.0)
def r2g(r: float) -> float: return r * (200.0 / math.pi)
def atan_g(x: float) -> float: return r2g(math.atan(x))
def norm400(g: Optional[float]) -> Optional[float]:
    if g is None: return None
    g = g % 400.0
    if g < 0: g += 400.0
    return g
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
    return norm400(G)
def tri_them(Gprev: float, b: float) -> float: return norm400((Gprev + b + 200.0))
def dx_dy(S: float, G: float) -> Tuple[float,float]: return S * math.sin(g2r(G)), S * math.cos(g2r(G))

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

def compute_traverse(points: List[TraversePoint], ori_start=True, ori_end=True,
                     scale="1:1000", terrain="Ομαλό", klass="Πρωτεύουσα"):
    n = len(points)
    if n < 4: raise ValueError("Αναμένονται τουλάχιστον 4 σημεία (T1,T2,…,T3,T4).")
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


class TraverseTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.points: List[TraversePoint] = []
        self.results: List[RR] = []
        self.meta: Dict = {}
        self.current_theme = "Big Topo"
        self._build_ui()
        self.update_style()

    def _build_ui(self):
        root = QHBoxLayout(self)

        # ========== LEFT AREA (Table + Metrics) ==========
        left = QVBoxLayout()

        # Table (fills the left area)
        self.table = QTableWidget(0, 11)
        self.table.setHorizontalHeaderLabels(["Point","θ(g)","θcorr(g)","G(g)","S(m)","ΔX(m)","ΔY(m)","corr ΔX","corr ΔY","X","Y"])
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        
        left.addWidget(self.table, stretch=1)
        
        # Limits box (Wβmax, δsmax and actual Wβ, δs)
        limits_group = QGroupBox("")
        limits_layout = QGridLayout(limits_group)
        self.lbl_Wbmax = QLabel("—"); self._addMetric(limits_layout, 0,0,"Wβmax [g]", self.lbl_Wbmax, angle=True)
        self.lbl_dsmax = QLabel("—"); self._addMetric(limits_layout, 0,2,"δsmax [m]", self.lbl_dsmax)
        self.lbl_Wb    = QLabel("—"); self._addMetric(limits_layout, 1,0,"Wβ [g]", self.lbl_Wb, angle=True)
        self.lbl_ds    = QLabel("—"); self._addMetric(limits_layout, 1,2,"δs [m]", self.lbl_ds)
        left.addWidget(limits_group)

        # Metrics area: three compact rows
        metrics_box = QGroupBox("")
        ml = QGridLayout(metrics_box)
        # Row 1: n, S(ολικό)
        self.lbl_n = QLabel("—"); self._addMetric(ml, 0,0, "n", self.lbl_n)
        self.lbl_S_total = QLabel("—"); self._addMetric(ml, 0,2, "S(ολικό) [m]", self.lbl_S_total)
        # Row 2: Wβi, Gπρέπει, Gείναι, δx, δy
        self.lbl_Wbi = QLabel("—"); self._addMetric(ml, 1,0, "Wβi [g]", self.lbl_Wbi, angle=True)
        self.lbl_G_prepei = QLabel("—"); self._addMetric(ml, 1,2, "G(πρέπει) [g]", self.lbl_G_prepei, angle=True)
        self.lbl_G_einai = QLabel("—"); self._addMetric(ml, 1,4, "G(είναι) [g]", self.lbl_G_einai, angle=True)
        self.lbl_dx = QLabel("—"); self._addMetric(ml, 1,6, "δx [m]", self.lbl_dx)
        self.lbl_dy = QLabel("—"); self._addMetric(ml, 1,8, "δy [m]", self.lbl_dy)
        # Row 3: ΔX/ΔY πρέπει-είναι
        self.lbl_dX_p = QLabel("—"); self._addMetric(ml, 2,0, "ΔX(πρέπει) [m]", self.lbl_dX_p)
        self.lbl_dX_e = QLabel("—"); self._addMetric(ml, 2,2, "ΔX(είναι) [m]", self.lbl_dX_e)
        self.lbl_dY_p = QLabel("—"); self._addMetric(ml, 2,4, "ΔY(πρέπει) [m]", self.lbl_dY_p)
        self.lbl_dY_e = QLabel("—"); self._addMetric(ml, 2,6, "ΔY(είναι) [m]", self.lbl_dY_e)
        left.addWidget(metrics_box)

        # Status
        self.status_label = QLabel("—")
        left.addWidget(self.status_label)

        # ========== RIGHT SIDE PANEL (Buttons + Options + Sketch) ==========
        right = QVBoxLayout()

        # Controls group (buttons + options in same frame)
        controls_group = QGroupBox("")
        controls_layout = QVBoxLayout(controls_group)
        # Buttons row
        btn_row = QHBoxLayout()
        self.btn_load = QPushButton("Φόρτωση CSV"); self.btn_load.clicked.connect(self.load_csv)
        self.btn_compute = QPushButton("Υπολογισμός"); self.btn_compute.clicked.connect(self.run_compute)
        self.btn_load.setMinimumHeight(36); self.btn_compute.setMinimumHeight(36)
        btn_row.addWidget(self.btn_load)
        btn_row.addWidget(self.btn_compute)
        controls_layout.addLayout(btn_row)
        # Options grid
        opts_layout = QGridLayout()
        self.cmb_scale   = QComboBox(); self.cmb_scale.addItems(SCALES); self.cmb_scale.setCurrentText("1:200")
        self.cmb_terrain = QComboBox(); self.cmb_terrain.addItems(["Ομαλό","Έντονα κεκλιμένο"])
        self.cmb_class   = QComboBox(); self.cmb_class.addItems(["Πρωτεύουσα","Δευτερεύουσα"])
        self.spin_angle_dec = QSpinBox(); self.spin_angle_dec.setRange(2,6); self.spin_angle_dec.setValue(4)
        self.spin_lin_dec   = QSpinBox(); self.spin_lin_dec.setRange(2,6); self.spin_lin_dec.setValue(3)
        opts_layout.addWidget(QLabel("Κλίμακα"), 0,0); opts_layout.addWidget(self.cmb_scale, 0,1)
        opts_layout.addWidget(QLabel("Έδαφος"), 0,2); opts_layout.addWidget(self.cmb_terrain, 0,3)
        opts_layout.addWidget(QLabel("Τάξη"), 1,0); opts_layout.addWidget(self.cmb_class, 1,1)
        opts_layout.addWidget(QLabel("Ακρ. Γωνιών"), 1,2); opts_layout.addWidget(self.spin_angle_dec, 1,3)
        opts_layout.addWidget(QLabel("Ακρ. Γραμμικών"), 1,4); opts_layout.addWidget(self.spin_lin_dec, 1,5)
        controls_layout.addLayout(opts_layout)
        right.addWidget(controls_group)

        # Sketch
        from PyQt6.QtWidgets import QFrame
        sk_frame = QFrame()
        sk_frame.setFrameShape(QFrame.Shape.StyledPanel)
        sk_l = QVBoxLayout(sk_frame)

        self.fig = Figure(figsize=(6, 6), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self._style_axes()

        self.canvas = FigureCanvas(self.fig)

        try:
            self.toolbar = NavigationToolbar(self.canvas, sk_frame)
            sk_l.addWidget(self.toolbar)
        except NameError:
            pass

        sk_l.addWidget(self.canvas)
        right.addWidget(sk_frame, stretch=1)

        # Final layout proportions (left big table, right panel)
        root.addLayout(left, 3)
        root.addLayout(right, 2)

        self.update_style()

    def update_style(self):
        """Ενημέρωση styling βάσει theme"""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        
        # Apply styling to all child widgets
        self.setStyleSheet(f"""
            QGroupBox {{
                background-color: {theme['widget_bg']};
                border-radius: 6px;
                border: 1px solid {theme['border_color']};
                margin-top: 8px;
                color: {theme['text_primary']};
            }}
            QGroupBox::title {{ 
                subcontrol-origin: margin; 
                left: 10px; 
                top: -6px; 
                color: {theme['accent']};
            }}
            QTableWidget {{ 
                border: 1px solid {theme['border_color']}; 
                background-color: {theme['widget_bg']};
                color: {theme['text_primary']};
            }}
            QLabel {{
                color: {theme['text_primary']};
            }}
            QPushButton {{
                background-color: {theme['button_bg']};
                color: {theme['button_text']};
            }}
            QPushButton::hover {{
                background-color: {theme['button_hover_bg']};
            }}
            QComboBox, QSpinBox {{
                background-color: {theme['input_bg']};
                color: {theme['input_text']};
                border: 1px solid {theme['border_color']};
            }}
        """)

    def set_theme(self, theme_name):
        """Ορισμός νέου theme"""
        self.current_theme = theme_name
        self.update_style()
        self.update_plot()  # Ενημέρωση του διαγράμματος

    def _style_axes(self):
        """Βασικό styling για το Διάγραμμα όδευσης (grid + τίτλος + labels)."""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        bg = theme["sketch_bg"]
        grid_col = theme["grid_color"]
        text_col = theme["text_color"]

        # Χρώματα φόντου
        self.fig.patch.set_facecolor(bg)
        self.ax.set_facecolor(bg)

        # Πλαίσιο
        for spine in self.ax.spines.values():
            spine.set_color(grid_col)

        # Grid
        self.ax.grid(True, color=grid_col, linewidth=0.6, alpha=0.6)

        # Ticks
        self.ax.tick_params(axis='both', colors=text_col, labelsize=8)

        # Labels + τίτλος, ώστε να φαίνεται κάτι ακόμη κι αν δεν υπάρχουν σημεία
        self.ax.set_xlabel("X", color=text_col)
        self.ax.set_ylabel("Y", color=text_col)
        self.ax.set_title("Διάγραμμα Όδευσης",
                          color=text_col,
                          fontweight="bold")

    # ... οι υπόλοιπες μέθοδοι παραμένουν ίδιες ...

    def _addMetric(self, grid: QGridLayout, r:int, c:int, title:str, value_lbl: QLabel, angle:bool=False):
        grid.addWidget(QLabel(title), r, c)
        value_lbl.setObjectName("resultLabel")
        grid.addWidget(value_lbl, r, c+1)

    def load_csv(self):
        path, _ = QFileDialog.getOpenFileName(self, "Φόρτωση CSV", "", "CSV files (*.csv);;All files (*)")
        if not path:
            return
        try:
            pts: List[TraversePoint] = []
            with open(path, "r", encoding="utf-8") as f:
                import csv as _csv
                rd = _csv.reader(f, delimiter=';')
                for row in rd:
                    if len(row) < 5: 
                        continue
                    pf = lambda s: None if str(s).strip() == "" else float(str(s).strip().replace(',', '.'))
                    pts.append(TraversePoint(str(row[0]).strip(), pf(row[1]), pf(row[2]), pf(row[3]), pf(row[4])))

            if len(pts) < 4: 
                raise ValueError("Απαιτούνται τουλάχιστον 4 σημεία (T1,T2,…,T3,T4).")

            # ΠΛΗΡΗΣ ΕΚΚΑΘΑΡΙΣΜΟΣ ΠΑΛΙΩΝ ΔΕΔΟΜΕΝΩΝ
            self.points = pts  # Αντικατάσταση με τα νέα σημεία
            self.results = []  # Καθαρισμός προηγούμενων αποτελεσμάτων
            self.meta = {}     # Καθαρισμός προηγούμενων μεταδεδομένων

            print(f"DEBUG: Φορτώθηκαν {len(pts)} νέα σημεία από CSV")

            # ΕΜΦΑΝΙΣΗ ΤΩΝ ΝΕΩΝ ΣΗΜΕΙΩΝ ΣΤΟΝ ΠΙΝΑΚΑ (ΜΟΝΟ ΤΑ ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ)
            self.table.setRowCount(0)
            for p in pts:
                row = self.table.rowCount()
                self.table.insertRow(row)

                # Στήλη 0: Point
                self.table.setItem(row, 0, QTableWidgetItem(p.name))

                # Στήλη 1: θ(g) - ΜΟΝΟ αν υπάρχει στο CSV
                angle_text = f"{p.angle:.4f}" if p.angle is not None else ""
                self.table.setItem(row, 1, QTableWidgetItem(angle_text))

                # Στήλη 4: S(m) - ΜΟΝΟ αν υπάρχει στο CSV
                dist_text = f"{p.dist:.3f}" if p.dist is not None else ""
                self.table.setItem(row, 4, QTableWidgetItem(dist_text))

                # Στήλη 9: X - ΜΟΝΟ αν υπάρχει στο CSV
                x_text = f"{p.X:.3f}" if p.X is not None else ""
                self.table.setItem(row, 9, QTableWidgetItem(x_text))

                # Στήλη 10: Y - ΜΟΝΟ αν υπάρχει στο CSV
                y_text = f"{p.Y:.3f}" if p.Y is not None else ""
                self.table.setItem(row, 10, QTableWidgetItem(y_text))

                print(f"DEBUG: Προστέθηκε σημείο {p.name} - X:{p.X}, Y:{p.Y}, θ:{p.angle}, S:{p.dist}")

            # ΚΑΘΑΡΙΣΜΟΣ ΜΕΤΡΙΚΩΝ ΚΑΙ ΔΙΑΓΡΑΜΜΑΤΟΣ
            self.update_metrics()  # Αυτό θα εμφανίσει "—" σε όλα τα πεδία
            self.update_plot()     # Αυτό θα εμφανίσει κενό διάγραμμα

            QMessageBox.information(self, "OK", f"Φορτώθηκαν {len(pts)} σημεία.")

        except Exception as e:
            QMessageBox.critical(self, "Σφάλμα CSV", str(e))

    def export_results(self):
        if not self.results:
            QMessageBox.warning(self, "Προσοχή","Δεν υπάρχουν αποτελέσματα.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Αποθήκευση Αποτελεσμάτων Όδευσης", "traverse_results.csv", "CSV (*.csv)")
        if not path: return
        try:
            with open(path,"w",encoding="utf-8",newline="") as f:
                w=csv.writer(f,delimiter=';')
                w.writerow(["Point","θ(g)","θcorr(g)","G(g)","S(m)","ΔX","ΔY","corr ΔX","corr ΔY","X","Y"])
                for r in self.results:
                    w.writerow([
                        r.name, self._fmt_angle(r.theta), self._fmt_angle(r.theta_corr),
                        self._fmt_angle(r.G), self._fmt_linear(r.S),
                        self._fmt_linear(r.dX), self._fmt_linear(r.dY),
                        self._fmt_linear(r.corr_dX), self._fmt_linear(r.corr_dY),
                        self._fmt_linear(r.X), self._fmt_linear(r.Y),
                    ])
            QMessageBox.information(self, "OK","Αποθήκευση CSV ολοκληρώθηκε.")
        except Exception as e:
            QMessageBox.critical(self, "Σφάλμα Αποθήκευσης", str(e))

    def export_png(self):
        if not self.results:
            QMessageBox.warning(self, "Προσοχή","Δεν υπάρχει Διάγραμμα για αποθήκευση.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Αποθήκευση Σκαριφήματος Όδευσης", "traverse_sketch.png", "PNG Image (*.png)")
        if not path: return
        try:
            self.fig.savefig(path, dpi=220, bbox_inches="tight", facecolor=THEME_TRAVERSE["sketch_bg"])
            QMessageBox.information(self, "OK","Αποθήκευση PNG ολοκληρώθηκε.")
        except Exception as e:
            QMessageBox.critical(self, "Σφάλμα PNG", str(e))


    def export_pdf_report(self):

        from PyQt6.QtWidgets import QInputDialog

        """Δημιουργεί PDF αναφορά (Light Style) με ID, πλήρη δεδομένα και διάγραμμα."""
        if not self.results:
            QMessageBox.warning(self, "Προσοχή", "Δεν υπάρχουν αποτελέσματα για εξαγωγή.")
            return
        
        if not REPORTLAB_AVAILABLE:
            QMessageBox.critical(self, "Σφάλμα", "Η βιβλιοθήκη 'reportlab' δεν βρέθηκε.")
            return

        # 1. Ζητάμε το ID της Όδευσης
        traverse_id, ok = QInputDialog.getText(self, "Εξαγωγή Αναφοράς", "Δώστε το ID / Όνομα της Όδευσης:")
        if not ok:
            return # Ο χρήστης πάτησε Ακύρωση
        if not traverse_id:
            traverse_id = "Άνευ Ονόματος"

        # 2. Επιλογή αρχείου αποθήκευσης
        downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
        default_filename = f"Traverse_Report_{traverse_id}.pdf"
        # Καθαρισμός filename από ειδικούς χαρακτήρες
        keepcharacters = (' ','.','_','-')
        default_filename = "".join(c for c in default_filename if c.isalnum() or c in keepcharacters).strip()
        
        filepath, _ = QFileDialog.getSaveFileName(
            self,
            "Αποθήκευση Αναφοράς Όδευσης",
            os.path.join(downloads_path, default_filename),
            "PDF Documents (*.pdf)"
        )
        if not filepath:
            return

        import tempfile
        try:
            # ---------------------------------------------------------
            # Α. ΠΡΟΕΤΟΙΜΑΣΙΑ ΔΙΑΓΡΑΜΜΑΤΟΣ
            # ---------------------------------------------------------
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
                temp_img_path = tmp_file.name
            
            original_facecolor = self.fig.get_facecolor()
            self.fig.set_facecolor("white")
            self.ax.tick_params(colors='black', labelcolor='black')
            # Σώσιμο εικόνας
            self.fig.savefig(temp_img_path, dpi=150, bbox_inches='tight')
            # Επαναφορά
            self.fig.set_facecolor(original_facecolor)
            self._style_axes()
            self.canvas.draw()

            # ---------------------------------------------------------
            # Β. ΣΤΗΣΙΜΟ PDF (ReportLab)
            # ---------------------------------------------------------
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import cm
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet

            # Δημιουργία εγγράφου
            doc = SimpleDocTemplate(filepath, pagesize=A4,
                                    topMargin=1.5*cm, bottomMargin=1.5*cm,
                                    leftMargin=1.0*cm, rightMargin=1.0*cm) # Μικρά περιθώρια για να χωρέσει ο πίνακας
            
            story = []
            styles = getSampleStyleSheet()
            
            # Στυλ Κειμένου
            style_h1 = styles['h1']; style_h1.fontName = GREEK_FONT_NAME; style_h1.alignment = 1 # Center
            style_h3 = styles['h3']; style_h3.fontName = GREEK_FONT_NAME
            style_norm = styles['Normal']; style_norm.fontName = GREEK_FONT_NAME; style_norm.fontSize = 9

            # --- ΤΙΤΛΟΣ & ID ---
            story.append(Paragraph("ΑΝΑΦΟΡΑ ΥΠΟΛΟΓΙΣΜΟΥ ΟΔΕΥΣΗΣ", style_h1))
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph(f"<b>ID Όδευσης: {traverse_id}</b>", style_h3))
            story.append(Spacer(1, 0.5*cm))

            # --- ΣΤΑΤΙΣΤΙΚΑ (Ιεράρχηση: n, S -> W, ds -> dx, dy) ---
            metrics = self.meta.get("metrics", {})
            fmt = lambda k: f"{metrics.get(k):.4f}" if metrics.get(k) is not None else "—"
            
            # Πίνακας στατιστικών (2 στήλες)
            stat_data = [
                # Σειρά 1: Πλήθος, Μήκος
                [f"Πλήθος Στάσεων (n): {metrics.get('n', '-')}", f"Συνολικό Μήκος (S): {metrics.get('S_total', 0):.3f} m"],
                # Σειρά 2: Γωνιακά Σφάλματα
                [f"Wβ μετρημένο: {fmt('Wb')} g", f"Wβ επιτρεπτό: {fmt('Wb_max')} g"],
                # Σειρά 3: Γραμμικά Σφάλματα
                [f"δs μετρημένο: {fmt('ds')} m", f"δs επιτρεπτό: {fmt('ds_max')} m"],
                # Σειρά 4: Σφάλματα Κλεισίματος
                [f"Σφάλμα δx: {fmt('dx')} m", f"Σφάλμα δy: {fmt('dy')} m"],
                # Σειρά 5: Wbi (Extra)
                [f"Διόρθωση ανά κορυφή (Wβi): {fmt('Wbi')} g", ""]
            ]
            
            t_stats = Table(stat_data, colWidths=[9.5*cm, 9.5*cm])
            # Στυλ "Light" για τα στατιστικά
            t_stats.setStyle(TableStyle([
                ('FONTNAME', (0,0), (-1,-1), GREEK_FONT_NAME),
                ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
                ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke), # Πολύ απαλό γκρι φόντο
                ('PADDING', (0,0), (-1,-1), 4),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ]))
            story.append(t_stats)
            story.append(Spacer(1, 0.5*cm))

            # --- ΔΙΑΓΡΑΜΜΑ ---
            story.append(Paragraph("<u>Διάγραμμα Όδευσης</u>", style_h3))
            story.append(Spacer(1, 0.2*cm))
            
            img = Image(temp_img_path)
            # Προσαρμογή μεγέθους εικόνας
            avail_width = 17 * cm
            aspect = img.imageHeight / float(img.imageWidth)
            img.drawHeight = avail_width * aspect
            img.drawWidth = avail_width
            story.append(img)
            story.append(Spacer(1, 0.8*cm))

            # --- ΚΥΡΙΟΣ ΠΙΝΑΚΑΣ (Όλα τα δεδομένα) ---
            story.append(Paragraph("<u>Αναλυτικός Πίνακας Υπολογισμών</u>", style_h3))
            story.append(Spacer(1, 0.2*cm))

            # Επικεφαλίδες (11 Στήλες)
            # Χρησιμοποιούμε σύντμηση στα ονόματα για να χωρέσουν
            headers = ["Σημείο", "θ(g)", "θ_corr", "G(g)", "S(m)", "ΔX", "ΔY", "c_ΔX", "c_ΔY", "X", "Y"]
            
            table_data = [headers]
            
            for r in self.results:
                f_val = lambda v, p=3: f"{v:.{p}f}" if v is not None else ""
                row = [
                    str(r.name),
                    f_val(r.theta, 4),
                    f_val(r.theta_corr, 4),
                    f_val(r.G, 4),
                    f_val(r.S, 3),
                    f_val(r.dX, 3),
                    f_val(r.dY, 3),
                    f_val(r.corr_dX, 4), # Νέα στήλη
                    f_val(r.corr_dY, 4), # Νέα στήλη
                    f_val(r.X, 3),
                    f_val(r.Y, 3)
                ]
                table_data.append(row)

            # Υπολογισμός πλατών στηλών (Σύνολο ~19cm)
            # Μικραίνουμε τις στήλες των διορθώσεων και του ονόματος
            cw = [1.5*cm] + [1.75*cm]*10 
            # Προσαρμογή: Κάνουμε τις στήλες S, dX, dY, c_x, c_y λίγο πιο στενές αν χρειαστεί
            # Αλλάζουμε λίγο τα πλάτη για καλύτερη εμφάνιση:
            # Name: 1.5, Angles(3): 1.8, S: 1.5, Deltas(4): 1.6, Coords(2): 1.8
            col_widths = [1.3*cm, 1.8*cm, 1.8*cm, 1.8*cm, 1.4*cm, 1.6*cm, 1.6*cm, 1.5*cm, 1.5*cm, 1.9*cm, 1.9*cm]
            
            t_res = Table(table_data, colWidths=col_widths, repeatRows=1)
            
            # --- STYLE LIGHT (ΟΜΟΙΟ ΜΕ ΤΑ ΑΛΛΑ PDF) ---
            style_light = TableStyle([
                ('FONTNAME', (0,0), (-1,-1), GREEK_FONT_NAME),
                ('FONTSIZE', (0,0), (-1,-1), 7), # Μικρή γραμματοσειρά για να χωρέσουν όλα
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                # Επικεφαλίδα
                ('LINEBELOW', (0,0), (-1,0), 1, colors.black),
                ('LINEABOVE', (0,0), (-1,0), 1, colors.black),
                ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                ('FONT-WEIGHT', (0,0), (-1,0), 'BOLD'),
                # Grid
                ('BOX', (0,0), (-1,-1), 1, colors.black),
                ('GRID', (0,1), (-1,-1), 0.5, colors.lightgrey),
                ('LEFTPADDING', (0,0), (-1,-1), 1), # Ελάχιστο padding
                ('RIGHTPADDING', (0,0), (-1,-1), 1),
            ])
            t_res.setStyle(style_light)
            
            story.append(t_res)

            # Build
            doc.build(story)
            
            # Cleanup
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)

            QMessageBox.information(self, "Επιτυχία", f"Η αναφορά αποθηκεύτηκε:\n{filepath}")

        except Exception as e:
            QMessageBox.critical(self, "Σφάλμα PDF", f"Απέτυχε η δημιουργία PDF:\n{e}")


    ###############################################################################

    def _get_float_from_item(self, item: QTableWidgetItem) -> Optional[float]:
        """
        Βοηθητική συνάρτηση για ασφαλή ανάγνωση float από QTableWidgetItem.
        Επιστρέφει None αν το κελί είναι κενό ή η τιμή δεν είναι έγκυρος αριθμός.
        """
        if item is None:
            return None
        # Διαβάζουμε το κείμενο και αφαιρούμε κενά
        text = item.text().strip()
        # Ελέγχουμε για κενές ή ειδικές τιμές (όπως το "—" που χρησιμοποιείται)
        if not text or text == "—":
            return None
        try:
            return float(text)
        except ValueError:
            # Αγνοούμε μη έγκυρες καταχωρήσεις
            return None

    def _read_points_from_table(self):
        """
        Διαβάζει ΟΛΕΣ τις τιμές εισόδου από τον πίνακα και ενημερώνει τη λίστα self.points
        Χρησιμοποιείται όταν ο χρήστης επεξεργάζεται απευθείας τα κελιά του πίνακα
        """
        if not self.points or self.table.rowCount() == 0:
            return
    
        # Οι στήλες του πίνακα:
        # 0: Point, 1: θ(g), 2: θcorr(g), 3: G(g), 4: S(m), 5: ΔX(m), 6: ΔY(m), 
        # 7: corr ΔX, 8: corr ΔY, 9: X, 10: Y
        
        COL_POINT = 0
        COL_ANGLE = 1
        COL_DIST = 4
        COL_X = 9
        COL_Y = 10
    
        print(f"DEBUG: Ενημέρωση {len(self.points)} σημείων από πίνακα")
    
        for i in range(min(len(self.points), self.table.rowCount())):
            # 0. POINT ID (Column 0) - ΕΑΝ ΕΙΝΑΙ ΣΥΜΠΛΗΡΩΜΕΝΟ ΣΤΟΝ ΠΙΝΑΚΑ
            point_item = self.table.item(i, COL_POINT)
            if point_item and point_item.text().strip() and point_item.text().strip() not in ["—", ""]:
                new_name = point_item.text().strip()
                old_name = self.points[i].name
                if new_name != old_name:
                    self.points[i].name = new_name
                    print(f"DEBUG: Σημείο {i} - Νέα ονομασία: '{old_name}' -> '{new_name}'")
    
            # 1. Γωνία (Column 1) - ΕΑΝ ΕΙΝΑΙ ΣΥΜΠΛΗΡΩΜΕΝΗ ΣΤΟΝ ΠΙΝΑΚΑ
            angle_item = self.table.item(i, COL_ANGLE)
            if angle_item and angle_item.text().strip() and angle_item.text().strip() not in ["—", ""]:
                try:
                    new_angle = float(angle_item.text().replace(',', '.'))
                    self.points[i].angle = new_angle
                    print(f"DEBUG: Σημείο {self.points[i].name} - Νέα γωνία: {new_angle}")
                except ValueError:
                    # Διατήρηση παλιάς τιμής αν η νέα δεν είναι έγκυρη
                    pass
                
            # 2. Απόσταση (Column 4) - ΕΑΝ ΕΙΝΑΙ ΣΥΜΠΛΗΡΩΜΕΝΗ ΣΤΟΝ ΠΙΝΑΚΑ
            dist_item = self.table.item(i, COL_DIST)
            if dist_item and dist_item.text().strip() and dist_item.text().strip() not in ["—", ""]:
                try:
                    new_dist = float(dist_item.text().replace(',', '.'))
                    self.points[i].dist = new_dist
                    print(f"DEBUG: Σημείο {self.points[i].name} - Νέα απόσταση: {new_dist}")
                except ValueError:
                    # Διατήρηση παλιάς τιμής αν η νέα δεν είναι έγκυρη
                    pass
                
            # 3. Συντεταγμένη X (Column 9) - ΕΑΝ ΕΙΝΑΙ ΣΥΜΠΛΗΡΩΜΕΝΗ ΣΤΟΝ ΠΙΝΑΚΑ
            x_item = self.table.item(i, COL_X)
            if x_item and x_item.text().strip() and x_item.text().strip() not in ["—", ""]:
                try:
                    new_x = float(x_item.text().replace(',', '.'))
                    self.points[i].X = new_x
                    print(f"DEBUG: Σημείο {self.points[i].name} - Νέα X: {new_x}")
                except ValueError:
                    # Διατήρηση παλιάς τιμής αν η νέα δεν είναι έγκυρη
                    pass
                
            # 4. Συντεταγμένη Y (Column 10) - ΕΑΝ ΕΙΝΑΙ ΣΥΜΠΛΗΡΩΜΕΝΗ ΣΤΟΝ ΠΙΝΑΚΑ
            y_item = self.table.item(i, COL_Y)
            if y_item and y_item.text().strip() and y_item.text().strip() not in ["—", ""]:
                try:
                    new_y = float(y_item.text().replace(',', '.'))
                    self.points[i].Y = new_y
                    print(f"DEBUG: Σημείο {self.points[i].name} - Νέα Y: {new_y}")
                except ValueError:
                    # Διατήρηση παλιάς τιμής αν η νέα δεν είναι έγκυρη
                    pass
    ##########################################################################


    def run_compute(self):
        if not self.points:
            QMessageBox.warning(self, "Προσοχή","Πρώτα φόρτωσε CSV.")
            return
        try:
            # ΒΗΜΑ 1: ΔΙΑΒΑΣΜΑ ΔΕΔΟΜΕΝΩΝ ΑΠΟ ΤΟΝ ΠΙΝΑΚΑ
            print("DEBUG: Διαβάζουμε δεδομένα από πίνακα...")
            self._read_points_from_table()
    
            # ΒΗΜΑ 2: ΕΚΤΥΠΩΣΗ ΤΩΝ ΔΕΔΟΜΕΝΩΝ ΠΟΥ ΘΑ ΧΡΗΣΙΜΟΠΟΙΗΘΟΥΝ
            print("DEBUG: Δεδομένα που θα χρησιμοποιηθούν για υπολογισμό:")
            for i, p in enumerate(self.points):
                print(f"  {p.name}: X={p.X}, Y={p.Y}, θ={p.angle}, S={p.dist}")
    
            # ΒΗΜΑ 3: ΥΠΟΛΟΓΙΣΜΟΣ ΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΑΠΟ ΤΟΝ ΠΙΝΑΚΑ
            print("DEBUG: Εκτέλεση υπολογισμού...")
            self.results, self.meta = compute_traverse(
                self.points, 
                ori_start=True, ori_end=True,
                scale=self.cmb_scale.currentText(),
                terrain=self.cmb_terrain.currentText(),
                klass=self.cmb_class.currentText()
            )
            
            print("DEBUG: Υπολογισμός ολοκληρώθηκε επιτυχώς")
            
            # ΒΗΜΑ 4: ΕΜΦΑΝΙΣΗ ΝΕΩΝ ΑΠΟΤΕΛΕΣΜΑΤΩΝ
            self.populate_table()   # Γεμίζει τον πίνακα με τα νέα αποτελέσματα
            self.update_metrics()   # Ενημερώνει τα metrics
            self.update_plot()      # Σχεδιάζει νέο διάγραμμα
            
            print("DEBUG: Εμφάνιση αποτελεσμάτων ολοκληρώθηκε")
            
        except Exception as e:
            QMessageBox.critical(self, "Σφάλμα Υπολογισμού", str(e))
            print(f"DEBUG: Σφάλμα: {e}")

    def populate_table(self):
        self.table.setRowCount(0)
        for r in self.results:
            row = self.table.rowCount(); self.table.insertRow(row)
            vals = [
                r.name,
                self._fmt_angle(r.theta),
                self._fmt_angle(r.theta_corr),
                self._fmt_angle(r.G),
                self._fmt_linear(r.S),
                self._fmt_linear(r.dX),
                self._fmt_linear(r.dY),
                self._fmt_linear(r.corr_dX),
                self._fmt_linear(r.corr_dY),
                self._fmt_linear(r.X),
                self._fmt_linear(r.Y),
            ]
            for c, v in enumerate(vals):
                self.table.setItem(row, c, QTableWidgetItem("" if v is None else str(v)))

    def update_metrics(self):
        m = (self.meta or {}).get("metrics", {})
        def fmt_ang(v):
            if v is None: return "—"
            return f"{float(v):.{self.spin_angle_dec.value()}f}"
        def fmt_lin(v):
            if v is None: return "—"
            return f"{float(v):.{self.spin_lin_dec.value()}f}"

        self.lbl_G_einai.setText(fmt_ang(m.get("G_einai")))
        self.lbl_G_prepei.setText(fmt_ang(m.get("G_prepei")))
        self.lbl_Wb.setText(fmt_ang(m.get("Wb")))
        self.lbl_Wbi.setText(fmt_ang(m.get("Wbi")))
        self.lbl_n.setText("—" if m.get("n") is None else f"{int(m['n'])}")
        self.lbl_S_total.setText(fmt_lin(m.get("S_total")))
        self.lbl_dX_p.setText(fmt_lin(m.get("dX_prepei"))); self.lbl_dX_e.setText(fmt_lin(m.get("dX_einai")))
        self.lbl_dY_p.setText(fmt_lin(m.get("dY_prepei"))); self.lbl_dY_e.setText(fmt_lin(m.get("dY_einai")))
        self.lbl_dx.setText(fmt_lin(m.get("dx"))); self.lbl_dy.setText(fmt_lin(m.get("dy"))); self.lbl_ds.setText(fmt_lin(m.get("ds")))
        self.lbl_Wbmax.setText(fmt_ang(m.get("Wb_max"))); self.lbl_dsmax.setText(fmt_lin(m.get("ds_max")))

        try:
            Wb, Wb_max = abs(float(m["Wb"])), float(m["Wb_max"])
            ds, ds_max = float(m["ds"]), float(m["ds_max"])
            if (Wb <= Wb_max) and (ds <= ds_max):
                self.status_label.setText("🟢 Η όδευση ΚΛΕΙΝΕΙ")
                self.status_label.setStyleSheet(f"color: {THEME_TRAVERSE['ok_color']}; font-weight: bold;")
            else:
                self.status_label.setText("🔴 Η όδευση ΔΕΝ κλείνει")
                self.status_label.setStyleSheet(f"color: {THEME_TRAVERSE['warning_color']}; font-weight: bold;")
        except Exception:
            self.status_label.setText("—")
            self.status_label.setStyleSheet("")

    def _style_axes(self):
        """Βασικό styling για το Διάγραμμα όδευσης (grid + τίτλος + labels)."""
        bg = THEME_TRAVERSE["sketch_bg"]
        grid_col = THEME_TRAVERSE["grid_color"]
        text_col = THEME_TRAVERSE["text_color"]

        # Χρώματα φόντου
        self.fig.patch.set_facecolor(bg)
        self.ax.set_facecolor(bg)

        # Πλαίσιο
        for spine in self.ax.spines.values():
            spine.set_color(grid_col)

        # Grid
        self.ax.grid(True, color=grid_col, linewidth=0.6, alpha=0.6)

        # Ticks
        self.ax.tick_params(axis='both', colors=text_col, labelsize=8)

        # Labels + τίτλος, ώστε να φαίνεται κάτι ακόμη κι αν δεν υπάρχουν σημεία
        self.ax.set_xlabel("X", color=text_col)
        self.ax.set_ylabel("Y", color=text_col)
        self.ax.set_title("Διάγραμμα Όδευσης",
                          color=text_col,
                          fontweight="bold")


    def update_plot(self):
        self.ax.clear()
        self._style_axes()

        if not hasattr(self, 'results') or not self.results:
            self.canvas.draw_idle()
            return
        
        n=len(self.results)
        if n<2:
            self.canvas.draw_idle(); return
        
        current_results = self.results  # Αναφορά στα τρέχοντα αποτελέσματα

        if n>=4:
            for i in range(1, n-2):
                a,b=self.results[i], self.results[i+1]
                if None in (a.X,a.Y,b.X,b.Y): continue
                self.ax.plot([a.X,b.X],[a.Y,b.Y], linewidth=THEME_TRAVERSE["line_width_single"], color=THEME_TRAVERSE["single_line_color"])
            self._plot_double(self.results[0], self.results[1])
            self._plot_double(self.results[-2], self.results[-1])

        tri_idx={0,1,n-2,n-1} if n>=4 else set()
        for i,r in enumerate(self.results):
            if r.X is None or r.Y is None: continue
            if i in tri_idx:
                self.ax.scatter([r.X],[r.Y], marker="^", s=THEME_TRAVERSE["marker_size_triangle"],
                                color=THEME_TRAVERSE["triangle_color"], zorder=3, edgecolors="black", linewidths=0.6)
            else:
                self.ax.scatter([r.X],[r.Y], marker="o", s=THEME_TRAVERSE["marker_size_circle"],
                                color=THEME_TRAVERSE["point_color"], zorder=3, edgecolors="black", linewidths=0.4)
            self.ax.text(r.X, r.Y, f" {r.name}", color=THEME_TRAVERSE["label_color"],
                         fontsize=9, ha="left", va="bottom")
        
        valid_points = []
        for i, r in enumerate(self.results):
            if r.X is None or r.Y is None: 
                continue
            
            valid_points.append((r.X, r.Y))

        # 6. AUTO-ZOOM ΜΟΝΟ ΑΝ ΥΠΑΡΧΟΥΝ ΕΓΚΥΡΑ ΣΗΜΕΙΑ
        if valid_points:
            xs, ys = zip(*valid_points)
            xmin, xmax = min(xs), max(xs)
            ymin, ymax = min(ys), max(ys)
            dx = xmax - xmin
            dy = ymax - ymin

            # Προσθήκη padding (10% και στις δύο κατευθύνσεις)
            pad_x = 0.1 * dx if dx > 0 else 1.0
            pad_y = 0.1 * dy if dy > 0 else 1.0

            self.ax.set_xlim(xmin - pad_x, xmax + pad_x)
            self.ax.set_ylim(ymin - pad_y, ymax + pad_y)

        # 7. ΑΝΑΛΟΓΙΑ ΑΞΟΝΩΝ (χωρίς να προκαλεί προειδοποιήσεις)
        self.ax.set_aspect('equal', adjustable='box')

        self.ax.set_xlabel("X", color=THEME_TRAVERSE["text_color"])
        self.ax.set_ylabel("Y", color=THEME_TRAVERSE["text_color"])
        self.ax.set_title("Διάγραμμα Όδευσης", color=THEME_TRAVERSE["text_color"], fontweight="bold")

        for lbl in self.ax.get_xticklabels():
            lbl.set_rotation(90)
            lbl.set_ha("right")

        self.canvas.draw_idle()

    def _plot_double(self, R1: RR, R2: RR):
        if None in (R1.X,R1.Y,R2.X,R2.Y): return
        x1,y1,x2,y2=R1.X,R1.Y,R2.X,R2.Y
        dx,dy=x2-x1,y2-y1; L=math.hypot(dx,dy)
        if L==0: return
        nx,ny=-dy/L, dx/L
        offset=0.3
        for sgn in (-1,+1):
            ox,oy=nx*(sgn*offset), ny*(sgn*offset)
            self.ax.plot([x1+ox,x2+ox],[y1+oy,y2+oy], linewidth=THEME_TRAVERSE["line_width_double"],
                         color=THEME_TRAVERSE["double_line_color"], zorder=2)

    def _fmt_angle(self, v: Optional[float]):
        return None if v is None else f"{float(v):.{self.spin_angle_dec.value()}f}"
    def _fmt_linear(self, v: Optional[float]):
        return None if v is None else f"{float(v):.{self.spin_lin_dec.value()}f}"


# ========================= ΚΑΡΤΕΛΑ "Home" (PyQt6) =========================
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QGridLayout, QLabel, QPushButton, QFrame
)
from PyQt6.QtGui import QPixmap, QFont
from PyQt6.QtCore import Qt

from PyQt6.QtSvgWidgets import QSvgWidget
from PyQt6.QtCore import QSize, Qt


from PyQt6.QtSvgWidgets import QSvgWidget
from PyQt6.QtCore import QPropertyAnimation, QEasingCurve, QPoint
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import QGraphicsDropShadowEffect

from PyQt6.QtWidgets import QHBoxLayout
from PyQt6.QtCore import QRect


class HomeTile(QFrame):
    def __init__(self, title: str, target_tab_text: str, click_callback, parent=None):
        super().__init__(parent)

        self.target_tab_text = target_tab_text
        self.click_callback = click_callback
        self.current_theme = "Big Topo"  # Default theme

        self.setObjectName("homeTile")
        self.setCursor(Qt.CursorShape.PointingHandCursor)

        # Αρχικό styling
        self.update_style()

        # ---- LAYOUT ----
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        # ---- ICON CONTAINER (for SVG with glow) ----
        self.icon_container = QWidget()
        self.icon_container.setFixedSize(188, 188)
        self.icon_container.setStyleSheet("background: transparent;")
        
        icon_layout = QVBoxLayout(self.icon_container)
        icon_layout.setContentsMargins(0, 0, 0, 0)
        icon_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # ---- ICON (SVG!) ----
        svg_path = f"./assets/icons/{title}.svg"
        self.icon_widget = QSvgWidget(svg_path)
        self.icon_widget.setFixedSize(188, 188)
        
        # Apply shadow effect ONLY to the icon
        self.shadow = QGraphicsDropShadowEffect(self.icon_widget)
        self.shadow.setBlurRadius(0)
        self.shadow.setOffset(0, 0)
        self.update_glow_color()  # Αρχικοποίηση χρώματος glow
        
        self.icon_widget.setGraphicsEffect(self.shadow)

        icon_layout.addWidget(self.icon_widget)
        layout.addWidget(self.icon_container, alignment=Qt.AlignmentFlag.AlignHCenter)

        # ---- TEXT ----
        self.label = QLabel(title)
        self.label.setAlignment(Qt.AlignmentFlag.AlignHCenter)
        self.label.setStyleSheet("background: transparent;")  # Ensure text has no background
        layout.addWidget(self.label)

        # ---- HOVER ANIMATION (glow blurRadius) ----
        self.glow_anim = QPropertyAnimation(self.shadow, b"blurRadius", self)
        self.glow_anim.setDuration(220)
        self.glow_anim.setEasingCurve(QEasingCurve.Type.OutQuad)

        # ---- PRESS EFFECT ANIMATION (geometry shrink/restore) ----
        self.press_anim = QPropertyAnimation(self.icon_container, b"geometry", self)
        self.press_anim.setDuration(100)
        self.press_anim.setEasingCurve(QEasingCurve.Type.OutQuad)

    def update_style(self):
        """Ενημέρωση styling βάσει του τρέχοντος theme"""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        
        self.setStyleSheet(f"""
            QFrame#homeTile {{
                background-color: transparent;
                border-radius: 18px;
            }}
            QFrame#homeTile:hover {{
                background-color: transparent;
            }}
            QLabel {{
                color: {theme['text_primary']};
                font-size: 15px;
                font-weight: 600;
                background-color: transparent;
            }}
        """)
        
        if hasattr(self, 'label'):
            self.label.setStyleSheet(f"""
                color: {theme['text_primary']};
                font-size: 15px;
                font-weight: 600;
                background-color: transparent;
            """)

    def update_glow_color(self):
        """Ενημέρωση χρώματος glow βάσει theme"""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        self.shadow.setColor(QColor(theme['accent']))

    def set_theme(self, theme_name):
        """Ορισμός νέου theme"""
        self.current_theme = theme_name
        self.update_style()
        self.update_glow_color()

    # ---------- HOVER ENTER ----------
    def enterEvent(self, event):
        try:
            self.glow_anim.stop()
            start = float(self.shadow.blurRadius())
            self.glow_anim.setStartValue(start)
            self.glow_anim.setEndValue(30.0)   # intensity of glow
            self.glow_anim.start()
        except Exception:
            pass
        super().enterEvent(event)

    # ---------- HOVER LEAVE ----------
    def leaveEvent(self, event):
        try:
            self.glow_anim.stop()
            start = float(self.shadow.blurRadius())
            self.glow_anim.setStartValue(start)
            self.glow_anim.setEndValue(0.0)
            self.glow_anim.start()
        except Exception:
            pass
        super().leaveEvent(event)

    # ---------- PRESS EFFECT (shrink) ----------
    def mousePressEvent(self, event):
        # animate only the icon container geometry
        try:
            geo = self.icon_container.geometry()
            shrink = QRect(geo.x() + 4, geo.y() + 4, max(10, geo.width() - 8), max(10, geo.height() - 8))

            self.press_anim.stop()
            self.press_anim.setStartValue(geo)
            self.press_anim.setEndValue(shrink)
            self.press_anim.start()
        except Exception:
            pass

        event.accept()
        super().mousePressEvent(event)

    # ---------- RELEASE: restore + callback ----------
    def mouseReleaseEvent(self, event):
        try:
            current_geo = self.icon_container.geometry()
            # compute an approximate original rect by expanding back
            restore = QRect(current_geo.x() - 4, current_geo.y() - 4,
                            current_geo.width() + 8, current_geo.height() + 8)

            self.press_anim.stop()
            self.press_anim.setStartValue(current_geo)
            self.press_anim.setEndValue(restore)
            self.press_anim.start()
        except Exception:
            pass

        # Trigger callback after visual feedback
        if callable(self.click_callback):
            try:
                self.click_callback(self.target_tab_text)
            except Exception:
                pass

        event.accept()
        super().mouseReleaseEvent(event)


class HomeTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_theme = "Big Topo"
        self._build_ui()
        self.update_style()

    def _build_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ---------- ΚΕΝΤΡΙΚΗ ΠΕΡΙΟΧΗ ----------
        center = QWidget()
        center_l = QVBoxLayout(center)
        center_l.setContentsMargins(18, 160, 18, 120)
        center_l.setSpacing(10)

        # --- Gradient Banner κάτω από το Menu Bar ---
        self.banner = QWidget()
        self.banner.setFixedHeight(22)
        self.update_banner_style()

        root.addWidget(self.banner, 0)

        # ΚΟΥΜΠΙΑ ΣΕ ΟΡΙΖΟΝΤΙΑ ΣΤΟΙΧΙΣΗ (6)
        self.tiles_row = QHBoxLayout()
        self.tiles_row.setSpacing(56)
        self.tiles_row.setContentsMargins(24, 24, 24, 24)
        self.tiles_row.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        tiles = [
            ("ΟΔΕΥΣΗ", "Όδευση"),
            ("ΑΛΛΗΛΟΤΟΜΙΕΣ", "Αλληλοτομίες"),
            ("ΘΕΜΕΛΙΩΔΗ", "Θεμελιώδη"),
            ("ΤΑΧΥΜΕΤΡΙΑ", "Ταχυμετρία"),
            ("ΧΑΡΑΞΗ", "Χάραξη"),
            ("ΥΠΟΛΟΓΙΣΜΟΙ", "Βασικοί Υπολογισμοί")
        ]

        self.tiles = []
        for label, target in tiles:
            tile = HomeTile(label, target, self._go_to_tab)
            self.tiles_row.addWidget(tile)
            self.tiles.append(tile)

        center_l.addLayout(self.tiles_row)
        center_l.addStretch(1)

        # ---------- ΚΑΤΩ ΑΡΙΣΤΕΡΑ ΛΟΓΟΤΥΠΟ + ΟΝΟΜΑ ----------
        footer = QWidget()
        footer.setFixedHeight(100)
        foot_l = QHBoxLayout(footer)
        foot_l.setContentsMargins(40, 0, 0, 30)

        logo = QLabel()
        pm = QPixmap("./assets/icons/LASCA_Icon.png")
        if not pm.isNull():
            pm = pm.scaled(72, 72, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            logo.setPixmap(pm)
        logo.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignBottom)
        foot_l.addWidget(logo)

        foot_l.addSpacing(20)
        self.appname = QLabel("LAND SURVEYING COMPUTATIONS APP")
        self.appname.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        foot_l.addWidget(self.appname)
        foot_l.addStretch(1)

        # ---------- ΤΕΛΙΚΗ ΔΙΑΤΑΞΗ ----------
        root.addWidget(center, 1)
        root.addWidget(footer, 0)

    def update_style(self):
        """Ενημέρωση styling βάσει theme"""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        
        # Background
        self.setStyleSheet(f"background-color: {theme['main_bg']};")
        
        # App name styling
        if hasattr(self, 'appname'):
            self.appname.setStyleSheet(f"color: {theme['text_primary']}; font-size: 16px; font-weight: 500;")
        
        # Banner styling
        self.update_banner_style()

    def update_banner_style(self):
        """Ενημέρωση banner styling βάσει theme"""
        theme = THEMES.get(self.current_theme, THEMES["Big Topo"])
        
        if self.current_theme == "Big Topo":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #d98b00,
                    stop:1 #ffb300
                );
            """)
        elif self.current_theme == "Aqua":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #072a4d,
                    stop:1 #709bcc
                );
            """)
        elif self.current_theme == "Nature":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2e7d32,
                    stop:1 #4caf50
                );
            """)
        elif self.current_theme == "Ludovisi":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #f9ce11,
                    stop:1 #f9ce11
                );
            """)
        elif self.current_theme == "Stark":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #111111,
                    stop:1 #2cdae1
                );
            """)
        elif self.current_theme == "Fuji":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2e7d32,
                    stop:1 #4caf50
                );
            """)
        elif self.current_theme == "Apollo":
            self.banner.setStyleSheet("""
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2e7d32,
                    stop:1 #4caf50
                );
            """)

    def set_theme(self, theme_name):
        """Ορισμός νέου theme"""
        self.current_theme = theme_name
        self.update_style()
        
        # Ενημέρωση όλων των tiles
        for tile in self.tiles:
            tile.set_theme(theme_name)

    def _go_to_tab(self, tab_text: str):
        win = self.window()
        if hasattr(win, 'go_to'):
            win.go_to(tab_text)
    



class LascaApp(QMainWindow):
    def __init__(self):
        super().__init__()
        
        # Αρχικοποίηση theme
        self.current_theme = "Big Topo"
        self.apply_theme(self.current_theme)
        
        # Αποθήκευση μεταβλητών
        self.last_tachymetry_results = None
        self.last_station_info = None
        self.last_charaxi_results = None
        self.last_charaxi_station_info = None
        
        self.proto_entries = {}
        self.deutero_entries = {}
        self.trito_entries = {}
        self.empro_entries = {}
        self.opistho_entries = {}
        self.charaxi_entries = {}
        self.tachy_entries = {}

        self.title_font = QFont("Segoe UI", 10, QFont.Weight.Bold)
        self.default_font = QFont("Segoe UI", 10)

        self.initUI()

    def apply_theme(self, theme_name):
        """Εφαρμογή theme σε ολόκληρη την εφαρμογή"""
        global CURRENT_THEME, THEME_TRAVERSE
        CURRENT_THEME = theme_name
        THEME_TRAVERSE = THEMES[theme_name]
        self.current_theme = theme_name

    def get_theme_stylesheet(self):
        """Δημιουργία stylesheet βάσει του τρέχοντος theme"""
        theme = THEME_TRAVERSE
        return f"""
            QMainWindow, QWidget {{ background-color: {theme['main_bg']}; color: {theme['text_primary']}; }}
            QGroupBox {{ 
                font-family: 'Segoe UI'; 
                font-size: 11pt; 
                font-weight: bold; 
                border: 1px solid {theme['border_color']}; 
                border-radius: 5px; 
                margin-top: 10px; 
                background-color: {theme['widget_bg']};
                color: {theme['text_primary']};
            }}
            QGroupBox::title {{ 
                subcontrol-origin: margin; 
                subcontrol-position: top left; 
                padding: 0 5px 0 5px; 
                left: 10px; 
                background-color: {theme['widget_bg']}; 
                color: {theme['accent']}; 
            }}
            QGroupBox#resultsGroup {{ background-color: transparent; border: 1px solid {theme['border_color']}; }}
            QLabel {{ color: {theme['text_primary']}; background-color: transparent; font-size: 9pt; }}
            QLabel#resultLabel {{ color: {theme['accent']}; font-weight: bold; font-size: 9pt; }}
            QPushButton {{ 
                background-color: {theme['button_bg']}; 
                color: {theme['button_text']}; 
                font-weight: bold; 
                font-size: 9pt; 
                padding: 8px 12px; 
                border-radius: 4px; 
                border: 1px solid {theme['button_bg']}; 
                min-width: 120px; 
            }}
            QPushButton::hover {{ 
                background-color: {theme['button_hover_bg']}; 
                border: 1px solid {theme['button_hover_bg']};
            }}
            QPushButton::pressed {{ background-color: {theme['accent']}; }}
            QPushButton#clearButton {{ 
                background-color: #5A5A5A; 
                border: 1px solid #5A5A5A; 
                min-width: 120px; 
            }}
            QPushButton#clearButton::hover {{ background-color: #6A6A6A; }}
            QPushButton#clearButton::pressed {{ background-color: #4A4A4A; }}
            QLineEdit, QTextEdit {{ 
                border: 1px solid {theme['border_color']}; 
                border-radius: 4px; 
                padding: 4px; 
                background-color: {theme['input_bg']}; 
                color: {theme['input_text']}; 
            }}
            QLineEdit::focus, QTextEdit::focus {{ border: 1px solid {theme['accent']}; }}
            QLineEdit#resultField {{ 
                background-color: #4A4A4A; 
                color: {theme['input_text']}; 
                border: 1px solid {theme['border_color']}; 
            }}
            QCheckBox {{ font-size: 9pt; color: {theme['text_primary']}; }}
            QCheckBox::indicator {{ 
                border: 1px solid {theme['border_color']}; 
                border-radius: 3px; 
                background-color: {theme['input_bg']}; 
                width: 15px; 
                height: 15px; 
            }}
            QCheckBox::indicator:checked {{ 
                background-color: {theme['accent']}; 
                border: 1px solid {theme['accent']}; 
            }}
            /* Header */
            #headerBar {{ background-color: {theme['header_bg']}; border-bottom: 1px solid {theme['border_color']}; }}
            #appTitle {{ color: {theme['accent']}; font-size: 18pt; font-weight: 600; }}
            #backBtn {{ min-width: 110px; }}
            /* Table */
            QTableWidget::header {{ background-color: {theme['table_header_bg']}; color: {theme['table_header_text']}; }}
            QHeaderView::section {{ 
                background-color: {theme['table_header_bg']}; 
                color: {theme['table_header_text']}; 
                padding: 2px; 
                border: 1px solid {theme['border_color']}; 
                font-weight: bold; 
            }}
            /* Menu */
            QMenuBar {{ 
                background-color: {theme['menu_bg']}; 
                color: {theme['menu_text']};
                border: none;
            }}
            QMenuBar::item {{ 
                background-color: transparent;
                color: {theme['menu_text']};
                padding: 4px 8px;
            }}
            QMenuBar::item:selected {{ 
                background-color: {theme['menu_hover_bg']};
                color: {theme['menu_hover_text']};
            }}
            QMenu {{
                background-color: {theme['menu_bg']};
                color: {theme['menu_text']};
                border: 1px solid {theme['border_color']};
            }}
            QMenu::item {{
                background-color: transparent;
                color: {theme['menu_text']};
                padding: 4px 16px;
            }}
            QMenu::item:selected {{
                background-color: {theme['menu_hover_bg']};
                color: {theme['menu_hover_text']};
            }}
            /* Tab Widget */
            QTabWidget::pane {{
                border: 1px solid {theme['border_color']};
                background-color: {theme['main_bg']};
            }}
            QTabBar::tab {{
                background-color: {theme['tab_bg']};
                color: {theme['tab_text']};
                padding: 8px 16px;
                margin-right: 2px;
                border: 1px solid {theme['border_color']};
                border-bottom: none;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
            }}
            QTabBar::tab:selected {{
                background-color: {theme['tab_active_bg']};
                color: {theme['tab_active_text']};
            }}
            QTabBar::tab:hover {{
                background-color: {theme['menu_hover_bg']};
                color: {theme['menu_hover_text']};
            }}
        """

    def initUI(self):
        from PyQt6.QtGui import QIcon
        self.setWindowIcon(QIcon("./assets/icons/LASCA_Icon.ico"))

        self.setWindowTitle("LASCA (Land Surveying Computations App)")
        self.setGeometry(100, 100, 1080, 720) 
        self.setFont(self.default_font)

        self.setWindowState(Qt.WindowState.WindowMaximized)

        # Εφαρμογή του theme
        self.setStyleSheet(self.get_theme_stylesheet())

        self.create_menu_bar()

        central = QWidget()
        root = QVBoxLayout(central); root.setContentsMargins(0,0,0,0); root.setSpacing(0)

        # Header with Back button + title
        header = QWidget(); header.setObjectName("headerBar")
        hb = QHBoxLayout(header); hb.setContentsMargins(12,8,12,8)
        self.back_btn = QPushButton("← Home"); self.back_btn.setObjectName("backBtn")
        self.back_btn.clicked.connect(self.go_home)
        self.header_title = QLabel("Home"); self.header_title.setObjectName("appTitle")
        hb.addWidget(self.back_btn, 0); hb.addStretch(1); hb.addWidget(self.header_title, 0, Qt.AlignmentFlag.AlignRight)
        root.addWidget(header, 0)

        # Stacked pages
        self.stack = QStackedWidget()
        root.addWidget(self.stack, 1)
        self.setCentralWidget(central)

        # Build pages
        self.pages = {}
        # Home
        home = HomeTab(self); self.pages["Home"] = home; self.stack.addWidget(home)
        # Θεμελιώδη / Όδευση (old tab 1)
        self.pages["Θεμελιώδη"] = self.create_theodolite_tab(); self.stack.addWidget(self.pages["Θεμελιώδη"])
        # Αλληλοτομίες (old tab 2)
        self.pages["Αλληλοτομίες"] = self.create_allilotomies_tab(); self.stack.addWidget(self.pages["Αλληλοτομίες"])
        # Χάραξη (old tab 3)
        self.pages["Χάραξη"] = self.create_charaxi_tab(); self.stack.addWidget(self.pages["Χάραξη"])
        # Ταχυμετρία (old tab 4)
        self.pages["Ταχυμετρία"] = self.create_tacheometry_tab(); self.stack.addWidget(self.pages["Ταχυμετρία"])
        # Νέα Όδευση (PyQt6)
        self.pages["Όδευση"] = TraverseTab(self); self.stack.addWidget(self.pages["Όδευση"])
        # Βασικού Υπολογισμοί
        self.pages["Βασικοί Υπολογισμοί"] = self.create_basic_calcs_tab(); self.stack.addWidget(self.pages["Βασικοί Υπολογισμοί"])

        # Start on Home
        self.stack.setCurrentWidget(home)
        self._update_header()

    def go_home(self):
        """Μετάβαση στην αρχική σελίδα"""
        self.stack.setCurrentWidget(self.pages["Home"])
        self._update_header()

    def go_to(self, page_label: str):
        """Μετάβαση σε συγκεκριμένη σελίδα"""
        key = page_label.strip()
        if key in self.pages:
            self.stack.setCurrentWidget(self.pages[key])
            self._update_header()
        else:
            # Fallback: try to match by lowercase
            for k in self.pages.keys():
                if k.strip().lower() == key.lower():
                    self.stack.setCurrentWidget(self.pages[k]); self._update_header(); return

    def _update_header(self):
        """Ενημέρωση τίτλου header"""
        current = self.stack.currentWidget()
        # Determine title based on mapping
        for name, widget in self.pages.items():
            if widget is current:
                self.header_title.setText(name if name != "Home" else "LASCA")
                break
        # Back button is hidden on Home
        self.back_btn.setVisible(current is not self.pages["Home"])

    def create_menu_bar(self):
        menu_bar = self.menuBar()

        file_menu = menu_bar.addMenu("&Αρχείο")
        exit_action = QAction("Έξοδος", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        

        export_pdf_menu = menu_bar.addMenu("&Εξαγωγή PDF")

        # Προσθήκη της νέας ενέργειας για όδευση
        export_traverse_pdf_action = QAction("PDF Όδευσης", self)
        export_traverse_pdf_action.triggered.connect(self.handle_export_traverse_pdf)
        export_pdf_menu.addAction(export_traverse_pdf_action)
        
        export_tachy_pdf_action = QAction("PDF Ταχυμετρίας", self)
        export_tachy_pdf_action.triggered.connect(self.handle_export_tachy_pdf)
        export_pdf_menu.addAction(export_tachy_pdf_action)
        
        export_charaxi_pdf_action = QAction("PDF Χάραξης", self)
        export_charaxi_pdf_action.triggered.connect(self.handle_export_charaxi_pdf)
        export_pdf_menu.addAction(export_charaxi_pdf_action)

        # --- ΝΕΟ ΜΕΝΟΥ ΕΞΑΓΩΓΗΣ TXT/CSV ---
        export_data_menu = menu_bar.addMenu("&Εξαγωγή TXT/CSV")
        export_traverse_csv_action = QAction("CSV Όδευσης", self)
        export_traverse_csv_action.triggered.connect(self.handle_export_traverse_txt_csv)
        export_data_menu.addAction(export_traverse_csv_action)
        
        export_tachy_data_action = QAction("CSV Ταχυμετρίας", self)
        export_tachy_data_action.triggered.connect(self.handle_export_tachy_txt_csv)
        export_data_menu.addAction(export_tachy_data_action)
        
        export_charaxi_data_action = QAction("CSV Χάραξης", self)
        export_charaxi_data_action.triggered.connect(self.handle_export_charaxi_txt_csv)
        export_data_menu.addAction(export_charaxi_data_action)

        # ---------------- ΕΞΑΓΩΓΗ ΕΙΚΟΝΑΣ (PNG) ----------------
        image_menu = menu_bar.addMenu("&Εξαγωγή Εικόνας")

        export_traverse_png_action = QAction("Διάγραμμα Όδευσης", self)
        export_traverse_png_action.triggered.connect(self.handle_export_traverse_png)
        image_menu.addAction(export_traverse_png_action)

        export_fundamental_png_action = QAction("Διάγραμμα Θεμελιωδών", self)
        export_fundamental_png_action.triggered.connect(self.handle_export_fundamental_png)
        image_menu.addAction(export_fundamental_png_action)

        export_allilo_png_action = QAction("Διάγραμμα Αλληλοτομιών", self)
        export_allilo_png_action.triggered.connect(self.handle_export_allilo_png)
        image_menu.addAction(export_allilo_png_action)

        export_charaxi_png_action = QAction("Διάγραμμα Χάραξης", self)
        export_charaxi_png_action.triggered.connect(self.handle_export_charaxi_png)
        image_menu.addAction(export_charaxi_png_action)

        export_tachy_png_action = QAction("Διάγραμμα Ταχυμετρίας", self)
        export_tachy_png_action.triggered.connect(self.handle_export_tachy_png)
        image_menu.addAction(export_tachy_png_action)


        # --- ΝΕΟ MENU PREFERENCES ---
        preferences_menu = menu_bar.addMenu("&Preferences")
        
        # Theme submenu
        theme_menu = preferences_menu.addMenu("&Theme")
        
        # Δημιουργία actions για κάθε theme
        theme_actions = {}
        for theme_name in THEMES.keys():
            action = QAction(theme_name, self)
            action.setCheckable(True)
            action.setChecked(theme_name == self.current_theme)
            action.triggered.connect(lambda checked, name=theme_name: self.change_theme(name))
            theme_menu.addAction(action)
            theme_actions[theme_name] = action
        
        self.theme_actions = theme_actions


        help_menu = menu_bar.addMenu("&Help")
        about_action = QAction("About", self)
        about_action.triggered.connect(self.handle_about)
        help_menu.addAction(about_action)

    def change_theme(self, theme_name):
        """Αλλαγή theme και ανανέωση της εμφάνισης"""
        self.apply_theme(theme_name)
        
        # Ενημέρωση των radio buttons
        for name, action in self.theme_actions.items():
            action.setChecked(name == theme_name)
        
        # Εφαρμογή νέου stylesheet
        self.setStyleSheet(self.get_theme_stylesheet())
        
        # Ανανέωση όλων των γραφικών στοιχείων
        self.refresh_all_displays()
        
        # Ενημέρωση όλων των tabs
        for tab_name, tab_widget in self.pages.items():
            if hasattr(tab_widget, 'set_theme'):
                tab_widget.set_theme(theme_name)
        
        QMessageBox.information(self, "Θέμα", f"Το θέμα άλλαξε σε: {theme_name}")

    def refresh_all_displays(self):
        """Ανανέωση όλων των γραφικών στοιχείων για να εφαρμοστεί το νέο theme"""
        # Ενημέρωση των διαγραμμάτων
        if hasattr(self, 'ax_fundamental'):
            self._style_simple_axes(self.ax_fundamental, None)
            self.canvas_fundamental.draw_idle()
        if hasattr(self, 'ax_allilo'):
            self._style_simple_axes(self.ax_allilo, None)
            self.canvas_allilo.draw_idle()
        if hasattr(self, 'ax_charaxi'):
            self._style_simple_axes(self.ax_charaxi, None)
            self.canvas_charaxi.draw_idle()
        if hasattr(self, 'ax_tachy'):
            self._style_simple_axes(self.ax_tachy, None)
            self.canvas_tachy.draw_idle()
        
        # Ενημέρωση TraverseTab αν υπάρχει
        traverse_tab = self.pages.get("Όδευση")
        if traverse_tab and hasattr(traverse_tab, 'update_plot'):
            traverse_tab.update_plot()

    # --- ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ GUI ---
    
    def show_message(self, title, text, icon_type=QMessageBox.Icon.Information):
        msg_box = QMessageBox(self)
        msg_box.setIcon(icon_type)
        msg_box.setWindowTitle(title)
        msg_box.setText(text)
        msg_box.exec()

    def get_float(self, line_edit):
        try:
            return float(line_edit.text().replace(',', '.')) 
        except ValueError:
            label_text = "Άγνωστο Πεδίο"
            parent_layout = line_edit.parentWidget().layout()
            if isinstance(parent_layout, QGridLayout):
                idx = parent_layout.indexOf(line_edit)
                if idx != -1:
                    row, col, _, _ = parent_layout.getItemPosition(idx)
                    label_widget = parent_layout.itemAtPosition(row, col - 1)
                    if label_widget and isinstance(label_widget.widget(), QLabel):
                        label_text = label_widget.widget().text().replace(':', '')
            raise ValueError(f"Το πεδίο '{label_text}' δεν είναι έγκυρος αριθμός.")

    def set_readonly_entry(self, line_edit, text):
        line_edit.setText(text)
        line_edit.setReadOnly(True)


    # --- Σκαριφήματα: κοινές βοηθητικές συναρτήσεις με matplotlib ---

    # --- Σκαριφήματα: κοινό styling (ίδιο με Όδευση) ---
    def _style_simple_axes(self, ax, title: str | None = None):
        """
        Styling για όλα τα σκαριφήματα (Θεμελιώδη, Αλληλοτομίες,
        Χάραξη, Ταχυμετρία), ώστε να έχουν εμφάνιση ίδια με της Όδευσης.
        """

        fig = ax.figure

        # === BACKGROUND ===
        bg = THEME_TRAVERSE.get("sketch_bg", "#1e1e1e")
        grid_col = THEME_TRAVERSE.get("grid_color", "#555555")
        text_col = THEME_TRAVERSE.get("text_color", "#ffffff")

        # Στο Figure (εξωτερικό background)
        fig.patch.set_facecolor(bg)

        # Στο Axes (εσωτερικό background)
        ax.set_facecolor(bg)

        # === ΣΤΥΛ ΠΛΑΙΣΙΟΥ ===
        for spine in ax.spines.values():
            spine.set_color(grid_col)

        # === GRID ===
        ax.grid(True,
                color=grid_col,
                linewidth=0.6,
                alpha=0.6)

        # === AXIS TICKS ===
        ax.tick_params(axis='both',
                       colors=text_col,
                       labelsize=8)

        # === LABELS ===
        ax.set_xlabel("X", color=text_col)
        ax.set_ylabel("Y", color=text_col)

        # === TITLE ===
        # ΜΟΝΟ αν δοθεί ρητά τίτλος.  
        # Σε Χάραξη/Ταχυμετρία/Αλληλοτομίες/Θεμελιώδη αφήνουμε title=None.
        if title:
            ax.set_title(title,
                         color=text_col,
                         fontsize=9,
                         fontweight="bold")

        # === ΑΝΑΛΟΓΙΑ ===
        ax.set_aspect("equal", "box")


    def _clear_axes(self, ax, canvas, title: str = ""):
        """Καθαρισμός αξόνων και επαναφορά στυλ."""
        ax.clear()
        self._style_simple_axes(ax, title)
        if canvas is not None:
            canvas.draw_idle()

    def _update_diagram_generic(self, ax, canvas, pts, segments=None, title: str = ""):
        """
        Γενική συνάρτηση για απλά σκαριφήματα στο επίπεδο XY.

        pts: λίστα από (label, x, y[, kind])
             όπου kind ∈ {"fixed", "detail"} (προαιρετικό, default = "detail")

        segments: λίστα από (label1, label2[, kind])
             όπου kind ∈ {"baseline", "ray", "single"} (προαιρετικό, default = "single")
        """
        if ax is None or canvas is None:
            return
        if segments is None:
            segments = []

        # --- Φιλτράρισμα σημείων με έγκυρες συντεταγμένες ---
        clean_pts = []
        for p in pts:
            # Δεκτά και 3-πλά (label, x, y) και 4-πλά (label, x, y, kind)
            if len(p) >= 3:
                lbl, x, y = p[0], p[1], p[2]
                kind = p[3] if len(p) >= 4 else "detail"
            else:
                continue
            try:
                xf = float(x)
                yf = float(y)
                clean_pts.append((str(lbl), xf, yf, kind))
            except Exception:
                continue

        self._clear_axes(ax, canvas, title)

        if not clean_pts:
            return

        name2coord = {lbl: (x, y) for lbl, x, y, _ in clean_pts}
        name2kind  = {lbl: kind for lbl, _, _, kind in clean_pts}
        xs = [x for _, x, _, _ in clean_pts]
        ys = [y for _, _, y, _ in clean_pts]

        # --- Polyline σε φυσική σειρά αν δεν δοθούν segments ---
        if not segments and len(clean_pts) >= 2:
            for i in range(len(clean_pts) - 1):
                x1, y1 = clean_pts[i][1], clean_pts[i][2]
                x2, y2 = clean_pts[i+1][1], clean_pts[i+1][2]
                ax.plot(
                    [x1, x2], [y1, y2],
                    color=THEME_TRAVERSE.get("single_line_color", "#9aa0a6"),
                    linewidth=THEME_TRAVERSE.get("line_width_single", 1.6),
                    zorder=1
                )

        # --- Segments ρητά (baseline / ray / single) ---
        for seg in segments:
            if len(seg) == 2:
                a, b = seg
                skind = "single"
            else:
                a, b, skind = seg[0], seg[1], seg[2]

            if a not in name2coord or b not in name2coord:
                continue

            x1, y1 = name2coord[a]
            x2, y2 = name2coord[b]

            if skind in ("baseline", "orient"):
                color = THEME_TRAVERSE.get("double_line_color", "#00b7c3")
                lw = THEME_TRAVERSE.get("line_width_double", 2.4)
                ax.plot([x1, x2], [y1, y2],
                        color=color, linewidth=lw, zorder=1)
            elif skind == "ray":
                color = THEME_TRAVERSE.get("single_line_color", "#9aa0a6")
                lw = THEME_TRAVERSE.get("line_width_single", 1.6)
                # Βελάκι από a -> b
                ax.annotate(
                    "",
                    xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(
                        arrowstyle="->",
                        color=color,
                        linewidth=lw,
                        shrinkA=0, shrinkB=0,
                        mutation_scale=10,
                    ),
                    zorder=1
                )
            else:  # "single"
                color = THEME_TRAVERSE.get("single_line_color", "#9aa0a6")
                lw = THEME_TRAVERSE.get("line_width_single", 1.6)
                ax.plot([x1, x2], [y1, y2],
                        color=color, linewidth=lw, zorder=1)

        # --- Σημεία & labels (τρίγωνα για "fixed") ---
        overrides = getattr(self, "diagram_label_overrides", {}).get(ax, {})

        for lbl, x, y, kind in clean_pts:
            is_fixed = (kind == "fixed")
            marker = "^" if is_fixed else "o"
            color = (THEME_TRAVERSE.get("triangle_color", "#ff7b72")
                     if is_fixed else THEME_TRAVERSE.get("point_color", "#f1fa8c"))
            size = (THEME_TRAVERSE.get("marker_size_triangle", 70)
                    if is_fixed else THEME_TRAVERSE.get("marker_size_circle", 30))

            ax.scatter(
                [x], [y],
                s=size,
                marker=marker,
                color=color,
                edgecolors="black",
                linewidths=0.6 if is_fixed else 0.4,
                zorder=3
            )

            orig_lbl = str(lbl)
            disp_lbl = overrides.get(orig_lbl, orig_lbl)

            txt = ax.text(
                x, y, f" {disp_lbl}",
                color=THEME_TRAVERSE.get("label_color", "#e6e6e6"),
                fontsize=9,
                ha="left", va="bottom",
                zorder=4
            )
            # αποθηκεύουμε το αρχικό label για editing
            setattr(txt, "_lasca_orig_label", orig_lbl)

    def _enable_label_editing(self, canvas, ax):
        ...
        overrides = ...

                # --- Auto zoom-fit ---
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        dx = xmax - xmin or 1.0
        dy = ymax - ymin or 1.0
        pad = 0.1 * max(dx, dy)
        ax.set_xlim(xmin - pad, xmax + pad)
        ax.set_ylim(ymin - pad, ymax + pad)

        canvas.draw_idle()

    def _enable_label_editing(self, canvas, ax):
        """
        Επιτρέπει αλλαγή των labels με κλικ πάνω στο κείμενο.
        Κάνει χρήση του self.diagram_label_overrides.
        """
        from PyQt6.QtWidgets import QInputDialog

        if not hasattr(self, "diagram_label_overrides"):
            self.diagram_label_overrides = {}
        overrides = self.diagram_label_overrides.setdefault(ax, {})

        def on_click(event):
            if event.inaxes is not ax:
                return
            for txt in ax.texts:
                contains, _ = txt.contains(event)
                if contains:
                    orig = getattr(txt, "_lasca_orig_label", txt.get_text().strip())
                    new_text, ok = QInputDialog.getText(
                        self,
                        "Επεξεργασία ετικέτας",
                        "Νέα ετικέτα:",
                        text=orig
                    )
                    if ok and new_text.strip():
                        overrides[orig] = new_text.strip()
                        txt.setText(" " + new_text.strip())
                        canvas.draw_idle()
                    break

        # συνδέουμε μόνο μία φορά ανά canvas
        if not hasattr(canvas, "_label_edit_connected"):
            canvas.mpl_connect('button_press_event', on_click)
            canvas._label_edit_connected = True

     
    def _axes_has_content(self, ax):
        """
        Επιστρέφει True αν ο άξονας έχει κάποια γραμμή ή σύνολο σημείων.
        Χρησιμοποιείται για να μην αποθηκεύουμε άδειο Διάγραμμα.
        """
        if ax is None:
            return False
        # Γραμμές και collections (scatter κλπ.)
        if ax.lines or ax.collections:
            return True
        return False

    def _update_charaxi_diagram(self):
        """Διάγραμμα Χάραξης: στάση S, προσανατολισμός O και σημεία προς χάραξη."""
        if not hasattr(self, "ax_charaxi"):
            return
        if not self.last_charaxi_station_info:
            self._clear_axes(self.ax_charaxi, self.canvas_charaxi, "Διάγραμμα Χάραξης")
            return

        xs = self.last_charaxi_station_info['xs']
        ys = self.last_charaxi_station_info['ys']
        xo = self.last_charaxi_station_info['xo']
        yo = self.last_charaxi_station_info['yo']

        id_s = self.last_charaxi_station_info.get('id_s', 'S')
        id_o = self.last_charaxi_station_info.get('id_o', 'O')

        # S, O = σταθερά σημεία (τρίγωνα)
        pts = [(id_s, xs, ys, "fixed"),
               (id_o, xo, yo, "fixed")]

        # Γραμμή βάσης S–O πιο «δυνατή»
        segments = [(id_s, id_o, "baseline")]

        # Προσθήκη σημείων προς χάραξη (λεπτομέρειας) με ακτίνες από S με βέλη
        if self.last_charaxi_results:
            for (pid, xp, yp, beta, dist_ground) in self.last_charaxi_results:
                pts.append((str(pid), xp, yp, "detail"))
                segments.append((id_s, str(pid), "ray"))

        self._update_diagram_generic(
            self.ax_charaxi, self.canvas_charaxi,
            pts, segments, "Χάραξη από στάση S" + id_s
        )


    def _update_tachy_diagram(self):
        """Διάγραμμα Ταχυμετρίας: στάση S, προσανατολισμός O και σημεία ταχυμετρίας."""
        if not hasattr(self, "ax_tachy"):
            return
        if not self.last_station_info:
            self._clear_axes(self.ax_tachy, self.canvas_tachy, "Διάγραμμα Ταχυμετρίας")
            return

        xs = self.last_station_info['xs']
        ys = self.last_station_info['ys']
        xo = self.last_station_info['xo']
        yo = self.last_station_info['yo']

        id_s = self.last_station_info.get('id_s', 'S')
        id_o = self.last_station_info.get('id_o', 'O')

        pts = [("id_s", xs, ys, "fixed"),
               ("id_o", xo, yo, "fixed")]
        segments = [("S", "O", "baseline")]

        if self.last_tachymetry_results:
            for (pid, xp, yp, zp) in self.last_tachymetry_results:
                if isinstance(xp, (int, float)) and isinstance(yp, (int, float)):
                    pid_str = str(pid)
                    pts.append((pid_str, xp, yp, "detail"))
                    segments.append((id_s, pid_str, "ray"))

        self._update_diagram_generic(
            self.ax_tachy, self.canvas_tachy,
            pts, segments, "Ταχυμετρία από στάση S" + id_s
        )


    # --- HANDLERS ΓΙΑ ΕΝΕΡΓΟΠΟΙΗΣΗ ΠΕΔΙΩΝ ΚΛΙΜΑΚΑΣ ---

    def toggle_charaxi_scale_entry(self, state):
        """Ενεργοποίηση/απενεργοποίηση πεδίου συντελεστή κλίμακας στη Χάραξη."""
        self.charaxi_entries['scale_factor'].setEnabled(
            state == Qt.CheckState.Checked.value
        )

    def toggle_tachy_scale_entry(self, state):
        """Ενεργοποίηση/απενεργοποίηση πεδίου συντελεστή κλίμακας στην Ταχυμετρία."""
        self.tachy_entries['scale_factor'].setEnabled(
            state == Qt.CheckState.Checked.value
        )

    

        # --- ΚΑΡΤΕΛΑ 1: ΘΕΜΕΛΙΩΔΗ / ΟΔΕΥΣΗ ---
    def create_theodolite_tab(self):
        tab_widget = QWidget()
        main_layout = QVBoxLayout(tab_widget)
        
        # 1. ΠΡΩΤΟ ΘΕΜΕΛΙΩΔΕΣ
        proto_group = QGroupBox("1ο Θεμελιώδες (Υπολογισμός Σημείου)")
        proto_group.setFont(self.title_font)
        proto_layout = QGridLayout()
        
        proto_layout.addWidget(QLabel("X(A):"), 0, 0); self.proto_entries['XA'] = QLineEdit(); proto_layout.addWidget(self.proto_entries['XA'], 0, 1)
        proto_layout.addWidget(QLabel("Y(A):"), 1, 0); self.proto_entries['YA'] = QLineEdit(); proto_layout.addWidget(self.proto_entries['YA'], 1, 1)
        proto_layout.addWidget(QLabel("G(AB) (grads):"), 0, 2); self.proto_entries['GAB'] = QLineEdit(); proto_layout.addWidget(self.proto_entries['GAB'], 0, 3)
        proto_layout.addWidget(QLabel("S(AB) (m):"), 1, 2); self.proto_entries['S'] = QLineEdit(); proto_layout.addWidget(self.proto_entries['S'], 1, 3)
        
        self.proto_result_xb_entry = QLineEdit(); self.proto_result_xb_entry.setObjectName("resultField"); self.set_readonly_entry(self.proto_result_xb_entry, "")
        self.proto_result_yb_entry = QLineEdit(); self.proto_result_yb_entry.setObjectName("resultField"); self.set_readonly_entry(self.proto_result_yb_entry, "")
        
        result_label_xb = QLabel("X(B) (Αποτ.):"); result_label_xb.setObjectName("resultLabel")
        result_label_yb = QLabel("Y(B) (Αποτ.):"); result_label_yb.setObjectName("resultLabel")
        proto_layout.addWidget(result_label_xb, 0, 4); proto_layout.addWidget(self.proto_result_xb_entry, 0, 5)
        proto_layout.addWidget(result_label_yb, 1, 4); proto_layout.addWidget(self.proto_result_yb_entry, 1, 5)
        
        proto_calc_btn = QPushButton("Υπολογισμός"); proto_calc_btn.clicked.connect(self.handle_calculate_proto)
        proto_clear_btn = QPushButton("Καθαρισμός"); proto_clear_btn.clicked.connect(self.handle_clear_proto); proto_clear_btn.setObjectName("clearButton")
        
        proto_layout.addWidget(proto_calc_btn, 2, 0); proto_layout.addWidget(proto_clear_btn, 2, 1)
        
        proto_group.setLayout(proto_layout)

        # 2. ΔΕΥΤΕΡΟ ΘΕΜΕΛΙΩΔΕΣ
        deutero_group = QGroupBox("2ο Θεμελιώδες (Υπολογισμός Γωνίας & Απόστασης)")
        deutero_group.setFont(self.title_font)
        deutero_layout = QGridLayout()

        deutero_layout.addWidget(QLabel("X(A):"), 0, 0); self.deutero_entries['XA'] = QLineEdit(); deutero_layout.addWidget(self.deutero_entries['XA'], 0, 1)
        deutero_layout.addWidget(QLabel("Y(A):"), 1, 0); self.deutero_entries['YA'] = QLineEdit(); deutero_layout.addWidget(self.deutero_entries['YA'], 1, 1)
        deutero_layout.addWidget(QLabel("X(B):"), 0, 2); self.deutero_entries['XB'] = QLineEdit(); deutero_layout.addWidget(self.deutero_entries['XB'], 0, 3)
        deutero_layout.addWidget(QLabel("Y(B):"), 1, 2); self.deutero_entries['YB'] = QLineEdit(); deutero_layout.addWidget(self.deutero_entries['YB'], 1, 3)
        
        self.deutero_result_gab_entry = QLineEdit(); self.deutero_result_gab_entry.setObjectName("resultField"); self.set_readonly_entry(self.deutero_result_gab_entry, "")
        self.deutero_result_s_entry = QLineEdit(); self.deutero_result_s_entry.setObjectName("resultField"); self.set_readonly_entry(self.deutero_result_s_entry, "")
        
        result_label_gab = QLabel("G(AB) (Αποτ.):"); result_label_gab.setObjectName("resultLabel")
        result_label_s = QLabel("S(AB) (Αποτ.):"); result_label_s.setObjectName("resultLabel")
        deutero_layout.addWidget(result_label_gab, 0, 4); deutero_layout.addWidget(self.deutero_result_gab_entry, 0, 5)
        deutero_layout.addWidget(result_label_s, 1, 4); deutero_layout.addWidget(self.deutero_result_s_entry, 1, 5)

        deutero_calc_btn = QPushButton("Υπολογισμός"); deutero_calc_btn.clicked.connect(self.handle_calculate_deutero)
        deutero_clear_btn = QPushButton("Καθαρισμός"); deutero_clear_btn.clicked.connect(self.handle_clear_deutero); deutero_clear_btn.setObjectName("clearButton")
        
        deutero_layout.addWidget(deutero_calc_btn, 2, 0); deutero_layout.addWidget(deutero_clear_btn, 2, 1)

        deutero_group.setLayout(deutero_layout)

        # 3. 3ο ΘΕΜΕΛΙΩΔΕΣ / ΟΔΕΥΣΗ
        trito_group = QGroupBox("3ο Θεμελιώδες (Μεταφορά Γωνιών Διεύθυνσης)")
        trito_group.setFont(self.title_font)
        trito_layout = QHBoxLayout() 
        
        trito_left_layout = QGridLayout()
        trito_left_layout.addWidget(QLabel("Αρχική G(0->1) (grads):"), 0, 0)
        self.trito_entries['G_initial'] = QLineEdit(); trito_left_layout.addWidget(self.trito_entries['G_initial'], 0, 1)
        
        trito_left_layout.addWidget(QLabel("Γωνίες Στάσης β (grads) - μία ανά γραμμή:"), 1, 0, 1, 2)
        self.trito_text_input = QTextEdit()
        self.trito_text_input.setFont(QFont("Courier New", 10))
        self.trito_text_input.setPlaceholderText("210.1234\n198.4567\n.")
        trito_left_layout.addWidget(self.trito_text_input, 2, 0, 1, 2)
        
        trito_calc_btn = QPushButton("Υπολογισμός"); trito_calc_btn.clicked.connect(self.handle_calculate_trito)
        trito_clear_btn = QPushButton("Καθαρισμός"); trito_clear_btn.clicked.connect(self.handle_clear_trito); trito_clear_btn.setObjectName("clearButton")
        trito_left_layout.addWidget(trito_calc_btn, 3, 0); trito_left_layout.addWidget(trito_clear_btn, 3, 1)
        
        trito_right_layout = QVBoxLayout()
        trito_right_layout.addWidget(QLabel("Αναλυτικός Υπολογισμός (Log):"))
        self.trito_result_text = QTextEdit()
        self.trito_result_text.setReadOnly(True)
        self.trito_result_text.setFont(QFont("Courier New", 9))
        trito_right_layout.addWidget(self.trito_result_text)
        
        trito_layout.addLayout(trito_left_layout, 1) 
        trito_layout.addLayout(trito_right_layout, 2) 
        trito_group.setLayout(trito_layout)

        # ========== ΝΕΑ ΔΙΑΤΑΞΗ: ΑΡΙΣΤΕΡΑ ΟΛΑ ΤΑ ΠΕΔΙΑ, ΔΕΞΙΑ ΤΟ ΣΚΑΡΙΦΗΜΑ ==========
        middle_layout = QHBoxLayout()

        # Αριστερή στήλη: 1ο, 2ο, 3ο Θεμελιώδες
        left_col = QVBoxLayout()
        left_col.addWidget(proto_group)
        left_col.addWidget(deutero_group)
        left_col.addWidget(trito_group)
        middle_layout.addLayout(left_col, 1)   # ~50%

        # --- Διάγραμμα Θεμελιωδών (Α–Β) ---
        diagram_group = QGroupBox("Διάγραμμα Θεμελιωδών")
        diagram_group.setFont(self.title_font)
        diag_layout = QVBoxLayout()

        self.fig_fundamental = Figure(figsize=(4, 4), dpi=100)
        self.ax_fundamental = self.fig_fundamental.add_subplot(111)
        # Χωρίς τίτλο επάνω στο γράφημα – τίτλος είναι του group
        self._style_simple_axes(self.ax_fundamental, title=None)

        self.canvas_fundamental = FigureCanvas(self.fig_fundamental)
        self._enable_label_editing(self.canvas_fundamental, self.ax_fundamental)

        # Toolbar zoom/pan/save
        self.toolbar_fundamental = NavigationToolbar(self.canvas_fundamental, diagram_group)
        diag_layout.addWidget(self.toolbar_fundamental)
        diag_layout.addWidget(self.canvas_fundamental)

        diagram_group.setLayout(diag_layout)
        main_layout.addWidget(diagram_group)


        middle_layout.addWidget(diagram_group, 1)  # ~50%

        main_layout.addLayout(middle_layout)
        main_layout.addStretch() 
        return tab_widget


        # --- ΚΑΡΤΕΛΑ 2: ΑΛΛΗΛΟΤΟΜΙΕΣ ---
    def create_allilotomies_tab(self):
        tab_widget = QWidget()
        main_layout = QVBoxLayout(tab_widget)

        # ========== ΚΕΝΤΡΙΚΗ ΖΩΝΗ: ΑΡΙΣΤΕΡΑ ΥΠΟΛΟΓΙΣΜΟΙ, ΔΕΞΙΑ ΣΚΑΡΙΦΗΜΑ ==========
        middle_layout = QHBoxLayout()

        # ---------- ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ: ΕΜΠΡΟΣΘΟΤΟΜΙΑ + ΟΠΙΣΘΟΤΟΜΙΑ ----------
        left_col = QVBoxLayout()

        # 1. ΕΜΠΡΟΣΘΟΤΟΜΙΑ
        empro_group = QGroupBox("Εμπροσθοτομία ( από 2 γνωστά σημεία Α, Β )")
        empro_group.setFont(self.title_font)
        empro_layout = QGridLayout()

        empro_layout.addWidget(QLabel("X(A):"), 0, 0)
        self.empro_entries['XA'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['XA'], 0, 1)

        empro_layout.addWidget(QLabel("Y(A):"), 1, 0)
        self.empro_entries['YA'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['YA'], 1, 1)

        empro_layout.addWidget(QLabel("X(B):"), 0, 2)
        self.empro_entries['XB'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['XB'], 0, 3)

        empro_layout.addWidget(QLabel("Y(B):"), 1, 2)
        self.empro_entries['YB'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['YB'], 1, 3)

        empro_layout.addWidget(QLabel("Γωνία α (PAB) (grads):"), 2, 0)
        self.empro_entries['a'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['a'], 2, 1)

        empro_layout.addWidget(QLabel("Γωνία β (PBA) (grads):"), 2, 2)
        self.empro_entries['b'] = QLineEdit()
        empro_layout.addWidget(self.empro_entries['b'], 2, 3)

        self.empro_result_xp_entry = QLineEdit()
        self.empro_result_xp_entry.setObjectName("resultField")
        self.set_readonly_entry(self.empro_result_xp_entry, "")

        self.empro_result_yp_entry = QLineEdit()
        self.empro_result_yp_entry.setObjectName("resultField")
        self.set_readonly_entry(self.empro_result_yp_entry, "")

        result_label_xp = QLabel("X(P) (Αποτ.):")
        result_label_xp.setObjectName("resultLabel")
        result_label_yp = QLabel("Y(P) (Αποτ.):")
        result_label_yp.setObjectName("resultLabel")

        empro_layout.addWidget(result_label_xp, 0, 4)
        empro_layout.addWidget(self.empro_result_xp_entry, 0, 5)
        empro_layout.addWidget(result_label_yp, 1, 4)
        empro_layout.addWidget(self.empro_result_yp_entry, 1, 5)

        empro_calc_btn = QPushButton("Υπολογισμός")
        empro_calc_btn.clicked.connect(self.handle_calculate_emprosthotomia)
        empro_clear_btn = QPushButton("Καθαρισμός")
        empro_clear_btn.clicked.connect(self.handle_clear_empro)
        empro_clear_btn.setObjectName("clearButton")

        empro_layout.addWidget(empro_calc_btn, 3, 0)
        empro_layout.addWidget(empro_clear_btn, 3, 1)

        empro_group.setLayout(empro_layout)
        left_col.addWidget(empro_group)

        # 2. ΟΠΙΣΘΟΤΟΜΙΑ (TIENSTRA)
        opistho_group = QGroupBox("Οπισθοτομία - 3 Σημείων (Tienstra)")
        opistho_group.setFont(self.title_font)
        opistho_layout = QGridLayout()

        opistho_layout.addWidget(QLabel("X(A):"), 0, 0)
        self.opistho_entries['XA'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['XA'], 0, 1)

        opistho_layout.addWidget(QLabel("Y(A):"), 1, 0)
        self.opistho_entries['YA'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['YA'], 1, 1)

        opistho_layout.addWidget(QLabel("X(B):"), 0, 2)
        self.opistho_entries['XB'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['XB'], 0, 3)

        opistho_layout.addWidget(QLabel("Y(B):"), 1, 2)
        self.opistho_entries['YB'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['YB'], 1, 3)

        opistho_layout.addWidget(QLabel("X(C):"), 0, 4)
        self.opistho_entries['XC'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['XC'], 0, 5)

        opistho_layout.addWidget(QLabel("Y(C):"), 1, 4)
        self.opistho_entries['YC'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['YC'], 1, 5)

        opistho_layout.addWidget(QLabel("Γωνία α (BPC) (grads):"), 2, 0)
        self.opistho_entries['a'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['a'], 2, 1)

        opistho_layout.addWidget(QLabel("Γωνία β (CPA) (grads):"), 2, 2)
        self.opistho_entries['b'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['b'], 2, 3)

        opistho_layout.addWidget(QLabel("Γωνία γ (APB) (grads):"), 2, 4)
        self.opistho_entries['c'] = QLineEdit()
        opistho_layout.addWidget(self.opistho_entries['c'], 2, 5)

        self.opistho_result_xp_entry = QLineEdit()
        self.opistho_result_xp_entry.setObjectName("resultField")
        self.set_readonly_entry(self.opistho_result_xp_entry, "")

        self.opistho_result_yp_entry = QLineEdit()
        self.opistho_result_yp_entry.setObjectName("resultField")
        self.set_readonly_entry(self.opistho_result_yp_entry, "")

        result_opistho_xp = QLabel("X(P) (Αποτ.):")
        result_opistho_xp.setObjectName("resultLabel")
        result_opistho_yp = QLabel("Y(P) (Αποτ.):")
        result_opistho_yp.setObjectName("resultLabel")

        opistho_layout.addWidget(result_opistho_xp, 3, 4)
        opistho_layout.addWidget(self.opistho_result_xp_entry, 3, 5)
        opistho_layout.addWidget(result_opistho_yp, 4, 4)
        opistho_layout.addWidget(self.opistho_result_yp_entry, 4, 5)

        opistho_calc_btn = QPushButton("Υπολογισμός")
        opistho_calc_btn.clicked.connect(self.handle_calculate_opisthotomia)
        opistho_clear_btn = QPushButton("Καθαρισμός")
        opistho_clear_btn.clicked.connect(self.handle_clear_opistho)
        opistho_clear_btn.setObjectName("clearButton")

        opistho_layout.addWidget(opistho_calc_btn, 5, 0)
        opistho_layout.addWidget(opistho_clear_btn, 5, 1)

        opistho_group.setLayout(opistho_layout)
        left_col.addWidget(opistho_group)

        left_col.addStretch(1)

        # ---------- ΔΕΞΙΑ ΣΤΗΛΗ: ΣΚΑΡΙΦΗΜΑ ΑΛΛΗΛΟΤΟΜΙΩΝ ----------
        allilo_diagram_group = QGroupBox("Διάγραμμα Αλληλοτομιών")
        allilo_diagram_group.setFont(self.title_font)
        allilo_diag_layout = QVBoxLayout(allilo_diagram_group)

        self.fig_allilo = Figure(figsize=(6, 6), dpi=100)
        self.ax_allilo = self.fig_allilo.add_subplot(111)
        # ίδιο στυλ με τις υπόλοιπες καρτέλες
        self._style_simple_axes(self.ax_allilo)
        self.canvas_allilo = FigureCanvas(self.fig_allilo)
        self._enable_label_editing(self.canvas_allilo, self.ax_allilo)


        # Αν θες toolbar και εδώ:
        try:
            self.toolbar_allilo = NavigationToolbar(self.canvas_allilo, allilo_diagram_group)
            allilo_diag_layout.addWidget(self.toolbar_allilo)
        except NameError:
            pass

        allilo_diag_layout.addWidget(self.canvas_allilo)

        # ---------- ΣΥΝΘΕΣΗ 50% / 50% ----------
        middle_layout.addLayout(left_col, 1)              # αριστερό μισό
        middle_layout.addWidget(allilo_diagram_group, 1)  # δεξί μισό

        main_layout.addLayout(middle_layout)
        main_layout.addStretch(1)

        return tab_widget



    # --- ΚΑΡΤΕΛΑ 3: ΧΑΡΑΞΗ ---
    def create_charaxi_tab(self):
        tab_widget = QWidget()
        main_layout = QVBoxLayout(tab_widget)

        # ==== ΕΠΑΝΩ: ΣΤΟΙΧΕΙΑ ΕΓΚΑΤΑΣΤΑΣΗΣ ====
        top_group = QGroupBox("Στοιχεία Εγκατάστασης (S) και Προσανατολισμού (O)")
        top_group.setFont(self.title_font)
        top_layout = QGridLayout()

        top_layout.addWidget(QLabel("ID Στάσης (S):"), 0, 0)
        self.charaxi_entries['ID_S'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['ID_S'], 0, 1)

        top_layout.addWidget(QLabel("X(S):"), 1, 0)
        self.charaxi_entries['XS'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['XS'], 1, 1)

        top_layout.addWidget(QLabel("Y(S):"), 2, 0)
        self.charaxi_entries['YS'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['YS'], 2, 1)

        top_layout.addWidget(QLabel("ID Προστ/σμού (O):"), 0, 2)
        self.charaxi_entries['ID_O'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['ID_O'], 0, 3)

        top_layout.addWidget(QLabel("X(O):"), 1, 2)
        self.charaxi_entries['XO'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['XO'], 1, 3)

        top_layout.addWidget(QLabel("Y(O):"), 2, 2)
        self.charaxi_entries['YO'] = QLineEdit()
        top_layout.addWidget(self.charaxi_entries['YO'], 2, 3)

        self.scale_var_charaxi = QCheckBox("Εφαρμογή Συντ. Κλίμακας")
        self.scale_var_charaxi.stateChanged.connect(self.toggle_charaxi_scale_entry)
        top_layout.addWidget(self.scale_var_charaxi, 0, 4)

        self.charaxi_entries['scale_factor'] = QLineEdit("1.000000")
        self.charaxi_entries['scale_factor'].setEnabled(False)
        top_layout.addWidget(self.charaxi_entries['scale_factor'], 1, 4)

        top_group.setLayout(top_layout)
        main_layout.addWidget(top_group)

        # ==== ΜΕΣΗ ΖΩΝΗ: ΑΡΙΣΤΕΡΑ ΕΙΣΑΓΩΓΕΣ + ΑΠΟΤΕΛΕΣΜΑΤΑ, ΔΕΞΙΑ ΣΚΑΡΙΦΗΜΑ ====
        middle_layout = QHBoxLayout()

        # --- ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ (εισαγωγές + αποτελέσματα, κάθετα) ---
        left_col = QVBoxLayout()

        # Εισαγωγή σημείων προς χάραξη
        input_group = QGroupBox("Σημεία προς Χάραξη (P)")
        input_group.setFont(self.title_font)
        input_layout = QVBoxLayout()
        input_layout.addWidget(QLabel("Εισαγωγή (ID, X, Y) - ένα ανά γραμμή:"))
        self.charaxi_text_input = QTextEdit()
        self.charaxi_text_input.setFont(QFont("Courier New", 10))
        self.charaxi_text_input.setPlaceholderText(
            "P1, 150.123, 300.456\n"
            "P2, 180.789, 310.111\n."
        )
        input_layout.addWidget(self.charaxi_text_input)
        input_group.setLayout(input_layout)
        left_col.addWidget(input_group)

        # Πίνακας αποτελεσμάτων
        results_group = QGroupBox("Στοιχεία Χάραξης (από Στάση S)")
        results_group.setFont(self.title_font)
        results_group.setObjectName("resultsGroup")
        results_layout = QVBoxLayout()
        self.charaxi_table = QTableWidget()
        self.charaxi_table.setColumnCount(5)
        self.charaxi_table.setHorizontalHeaderLabels(
            ["ID", "Xp (m)", "Yp (m)", "Γωνία β (g)", "Απόσταση S (m)"]
        )
        self.charaxi_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.charaxi_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        results_layout.addWidget(self.charaxi_table)
        results_group.setLayout(results_layout)
        left_col.addWidget(results_group)

        # Αριστερή στήλη = περίπου μισό πλάτος
        middle_layout.addLayout(left_col, 1)

        # --- ΔΕΞΙΑ: ΣΚΑΡΙΦΗΜΑ ΧΑΡΑΞΗΣ ---
        sketch_group = QGroupBox("Διάγραμμα Χάραξης")
        sketch_group.setFont(self.title_font)
        sketch_vbox = QVBoxLayout(sketch_group)

        from PyQt6.QtWidgets import QFrame
        sketch_frame = QFrame()
        sketch_frame.setFrameShape(QFrame.Shape.StyledPanel)
        frame_layout = QVBoxLayout(sketch_frame)

        # matplotlib figure/canvas
        self.fig_charaxi = Figure(figsize=(6, 6), dpi=100)
        self.ax_charaxi = self.fig_charaxi.add_subplot(111)
        # Χωρίς τίτλο πάνω στο γράφημα, μόνο άξονες / grid
        self._style_simple_axes(self.ax_charaxi, title=None)

        self.canvas_charaxi = FigureCanvas(self.fig_charaxi)
        # Toolbar για zoom/pan/save
        self.toolbar_charaxi = NavigationToolbar(self.canvas_charaxi, sketch_frame)
        frame_layout.addWidget(self.toolbar_charaxi)
        frame_layout.addWidget(self.canvas_charaxi)
        self._enable_label_editing(self.canvas_charaxi, self.ax_charaxi)



        sketch_vbox.addWidget(sketch_frame)

        # Δεξιά στήλη = υπόλοιπο μισό
        middle_layout.addWidget(sketch_group, 1)

        main_layout.addLayout(middle_layout)

        # ==== ΚΟΥΜΠΙΑ ====
        button_layout = QHBoxLayout()
        char_calc_btn = QPushButton("Υπολογισμός Χάραξης")
        char_calc_btn.clicked.connect(self.handle_calculate_charaxi)

        char_clear_btn = QPushButton("Καθαρισμός Όλων")
        char_clear_btn.setObjectName("clearButton")
        char_clear_btn.clicked.connect(self.handle_clear_charaxi)

        button_layout.addWidget(char_calc_btn)
        button_layout.addWidget(char_clear_btn)
        button_layout.addStretch()
        main_layout.addLayout(button_layout)

        main_layout.addStretch()
        return tab_widget



        # --- ΚΑΡΤΕΛΑ 4: ΤΑΧΥΜΕΤΡΙΑ ---
    def create_tacheometry_tab(self):
        tab_widget = QWidget()
        main_layout = QVBoxLayout(tab_widget)

        # ==== ΕΠΑΝΩ: Συστάση Στάσης / Προσανατολισμού ====
        top_group = QGroupBox("Στοιχεία Εγκατάστασης Στάσης Ταχυμετρίας")
        top_group.setFont(self.title_font)
        top_layout = QGridLayout()

        top_layout.addWidget(QLabel("ID Στάσης (S):"), 0, 0)
        self.tachy_entries['ID_S'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['ID_S'], 0, 1)

        top_layout.addWidget(QLabel("X(S):"), 1, 0)
        self.tachy_entries['XS'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['XS'], 1, 1)

        top_layout.addWidget(QLabel("Y(S):"), 2, 0)
        self.tachy_entries['YS'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['YS'], 2, 1)

        top_layout.addWidget(QLabel("Z(S):"), 3, 0)
        self.tachy_entries['ZS'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['ZS'], 3, 1)

        top_layout.addWidget(QLabel("ID Προστ/σμού (O):"), 0, 2)
        self.tachy_entries['ID_O'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['ID_O'], 0, 3)

        top_layout.addWidget(QLabel("X(O):"), 1, 2)
        self.tachy_entries['XO'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['XO'], 1, 3)

        top_layout.addWidget(QLabel("Y(O):"), 2, 2)
        self.tachy_entries['YO'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['YO'], 2, 3)

        top_layout.addWidget(QLabel("Z(O):"), 3, 2)
        self.tachy_entries['ZO'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['ZO'], 3, 3)

        top_layout.addWidget(QLabel("Ύψος Οργάνου (i):"), 0, 4)
        self.tachy_entries['i'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['i'], 0, 5)

        top_layout.addWidget(QLabel("Hz προς Προσανατολισμό (Hz₀) [g]:"), 1, 4)
        self.tachy_entries['Hz_O'] = QLineEdit()
        top_layout.addWidget(self.tachy_entries['Hz_O'], 1, 5)

        self.scale_var_tachy = QCheckBox("Εφαρμογή Συντ. Κλίμακας")
        self.scale_var_tachy.stateChanged.connect(self.toggle_tachy_scale_entry)
        top_layout.addWidget(self.scale_var_tachy, 2, 4)

        self.tachy_entries['scale_factor'] = QLineEdit("1.000000")
        self.tachy_entries['scale_factor'].setEnabled(False)
        top_layout.addWidget(self.tachy_entries['scale_factor'], 2, 5)

        top_group.setLayout(top_layout)
        main_layout.addWidget(top_group)

        # ==== ΜΕΣΗ ΖΩΝΗ: ΑΡΙΣΤΕΡΑ ΕΙΣΑΓΩΓΕΣ + ΑΠΟΤΕΛΕΣΜΑΤΑ, ΔΕΞΙΑ ΣΚΑΡΙΦΗΜΑ ====
        middle_layout = QHBoxLayout()

        # --- ΑΡΙΣΤΕΡΑ: Εισαγωγή & Αποτελέσματα ---
        left_col = QVBoxLayout()

        # Εισαγωγή μετρήσεων
        input_group = QGroupBox("Μετρήσεις Ταχυμετρίας")
        input_group.setFont(self.title_font)
        input_layout = QVBoxLayout()
        input_layout.addWidget(QLabel("Εισαγωγή (ID, Hz, Z, SD, t) - μία ανά γραμμή:"))
        self.tachy_text_input = QTextEdit()
        self.tachy_text_input.setFont(QFont("Courier New", 10))
        self.tachy_text_input.setPlaceholderText(
            "P1, 10.1234, 100.5678, 50.123, 1.65\n"
            "P2, 25.4321, 99.8765, 80.456, 1.80\n."
        )
        input_layout.addWidget(self.tachy_text_input)
        input_group.setLayout(input_layout)
        left_col.addWidget(input_group)

        # Πίνακας αποτελεσμάτων
        results_group = QGroupBox("Υπολογισμένες Συντεταγμένες")
        results_group.setFont(self.title_font)
        results_group.setObjectName("resultsGroup")
        results_layout = QVBoxLayout()
        self.tachy_table = QTableWidget()
        self.tachy_table.setColumnCount(4)
        self.tachy_table.setHorizontalHeaderLabels(["ID", "X (m)", "Y (m)", "Z (m)"])
        self.tachy_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.tachy_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        results_layout.addWidget(self.tachy_table)
        results_group.setLayout(results_layout)
        left_col.addWidget(results_group)

        # Αριστερή στήλη = 50%
        middle_layout.addLayout(left_col, 1)

        # --- ΔΕΞΙΑ: Διάγραμμα Ταχυμετρίας ---
        sketch_group = QGroupBox("Διάγραμμα Ταχυμετρίας")
        sketch_group.setFont(self.title_font)
        sketch_vbox = QVBoxLayout(sketch_group)

        from PyQt6.QtWidgets import QFrame
        sketch_frame = QFrame()
        sketch_frame.setFrameShape(QFrame.Shape.StyledPanel)
        frame_layout = QVBoxLayout(sketch_frame)

        from matplotlib.figure import Figure
        from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas

        self.fig_tachy = Figure(figsize=(6, 6), dpi=100)
        self.ax_tachy = self.fig_tachy.add_subplot(111)
        # Πάλι χωρίς τίτλο στο γράφημα, μόνο άξονες/grid
        self._style_simple_axes(self.ax_tachy, title=None)

        self.canvas_tachy = FigureCanvas(self.fig_tachy)
        self.toolbar_tachy = NavigationToolbar(self.canvas_tachy, sketch_frame)
        frame_layout.addWidget(self.toolbar_tachy)
        frame_layout.addWidget(self.canvas_tachy)

        sketch_vbox.addWidget(sketch_frame)

        # Δεξιά στήλη = 50%
        middle_layout.addWidget(sketch_group, 1)

        main_layout.addLayout(middle_layout)

        # ==== ΚΟΥΜΠΙΑ ====
        button_layout = QHBoxLayout()
        tachy_calc_btn = QPushButton("Υπολογισμός Ταχυμετρίας")
        tachy_calc_btn.clicked.connect(self.handle_calculate_tacheometry)

        tachy_clear_btn = QPushButton("Καθαρισμός Όλων")
        tachy_clear_btn.setObjectName("clearButton")
        tachy_clear_btn.clicked.connect(self.handle_clear_tacheometry)

        button_layout.addWidget(tachy_calc_btn)
        button_layout.addWidget(tachy_clear_btn)
        button_layout.addStretch()
        main_layout.addLayout(button_layout)

        main_layout.addStretch()
        return tab_widget
    
    # --- ΚΑΡΤΕΛΑ 5: ΒΑΣΙΚΟΙ ΥΠΟΛΟΓΙΣΜΟΙ ---

    def create_basic_calcs_tab(self):
        tab = QWidget()
        main_layout = QVBoxLayout(tab)

        title = QLabel("Βασικοί Υπολογισμοί")
        title.setFont(self.title_font)
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        #main_layout.addWidget(title)

        # Οριζόντιος διάταξη για τα δύο μέρη
        columns = QHBoxLayout()

        # Αριστερή πλευρά - TM87
        left_col = QVBoxLayout()

        tm87_title = QLabel("Υπολογισμός Συντελεστή Γραμμικής Παραμόρφωσης TM87")
        tm87_title.setFont(self.title_font)
        #left_col.addWidget(tm87_title)

        # Σημειακός k(X)
        point_group = QGroupBox("Σημειακός Συντελεστής k(X)")
        point_group.setFont(self.title_font)
        point_layout = QGridLayout()

        point_layout.addWidget(QLabel("X (TM87, σε m):"), 0, 0)
        self.tm87_X = QLineEdit()
        point_layout.addWidget(self.tm87_X, 0, 1)

        info_lbl = QLabel(
            "Χρησιμοποιείται X_Mm = X / 1 000 000 στον τύπο:\n"
            "k = 0,012311 · (X_Mm − 0,5)² + 0,9996"
        )
        info_lbl.setWordWrap(True)
        point_layout.addWidget(info_lbl, 1, 0, 1, 2)

        point_layout.addWidget(QLabel("k:"), 2, 0)
        self.tm87_point_m = QLineEdit()
        self.tm87_point_m.setReadOnly(True)
        self.tm87_point_m.setMaximumWidth(190)
        point_layout.addWidget(self.tm87_point_m, 2, 1)

        point_layout.addWidget(QLabel("1/k:"), 3, 0)
        self.tm87_point_inv = QLineEdit()
        self.tm87_point_inv.setReadOnly(True)
        self.tm87_point_inv.setMaximumWidth(190)
        point_layout.addWidget(self.tm87_point_inv, 3, 1)

        point_layout.addWidget(QLabel("ppm:"), 4, 0)
        self.tm87_point_ppm = QLineEdit()
        self.tm87_point_ppm.setReadOnly(True)
        self.tm87_point_ppm.setMaximumWidth(190)
        point_layout.addWidget(self.tm87_point_ppm, 4, 1)

        btn_point = QPushButton("Υπολογισμός k(X)")
        btn_point.clicked.connect(self.handle_calc_tm87_point)
        point_layout.addWidget(btn_point, 5, 0, 1, 2)

        point_group.setLayout(point_layout)
        left_col.addWidget(point_group)

        # Γραμμικός m(i,j)
        seg_group = QGroupBox("Γραμμικός Συντελεστής m(i,j)")
        seg_group.setFont(self.title_font)
        seg_layout = QGridLayout()

        seg_layout.addWidget(QLabel("Xᵢ (m):"), 0, 0)
        self.tm87_Ei = QLineEdit()
        seg_layout.addWidget(self.tm87_Ei, 0, 1)

        seg_layout.addWidget(QLabel("Xⱼ (m):"), 1, 0)
        self.tm87_Ej = QLineEdit()
        seg_layout.addWidget(self.tm87_Ej, 1, 1)

        seg_layout.addWidget(QLabel("L (m, προαιρετικό):"), 2, 0)
        self.tm87_L = QLineEdit()
        seg_layout.addWidget(self.tm87_L, 2, 1)

        seg_layout.addWidget(QLabel("mᵢⱼ:"), 3, 0)
        self.tm87_seg_m = QLineEdit()
        self.tm87_seg_m.setReadOnly(True)
        self.tm87_seg_m.setMaximumWidth(190)
        seg_layout.addWidget(self.tm87_seg_m, 3, 1)

        seg_layout.addWidget(QLabel("1/mᵢⱼ:"), 4, 0)
        self.tm87_seg_inv = QLineEdit()
        self.tm87_seg_inv.setReadOnly(True)
        self.tm87_seg_inv.setMaximumWidth(190)
        seg_layout.addWidget(self.tm87_seg_inv, 4, 1)

        seg_layout.addWidget(QLabel("ppm:"), 5, 0)
        self.tm87_seg_ppm = QLineEdit()
        self.tm87_seg_ppm.setReadOnly(True)
        self.tm87_seg_ppm.setMaximumWidth(190)
        seg_layout.addWidget(self.tm87_seg_ppm, 5, 1)

        seg_layout.addWidget(QLabel("ΔL (m):"), 6, 0)
        self.tm87_seg_dL = QLineEdit()
        self.tm87_seg_dL.setReadOnly(True)
        self.tm87_seg_dL.setMaximumWidth(190)
        seg_layout.addWidget(self.tm87_seg_dL, 6, 1)

        seg_layout.addWidget(QLabel("d = m·L (m):"), 7, 0)
        self.tm87_seg_Lcorr = QLineEdit()
        self.tm87_seg_Lcorr.setReadOnly(True)
        self.tm87_seg_Lcorr.setMaximumWidth(190)
        seg_layout.addWidget(self.tm87_seg_Lcorr, 7, 1)

        btn_seg = QPushButton("Υπολογισμός m(i,j)")
        btn_seg.clicked.connect(self.handle_calc_tm87_segment)
        seg_layout.addWidget(btn_seg, 8, 0, 1, 2)

        seg_group.setLayout(seg_layout)
        left_col.addWidget(seg_group)

        btn_clear_tm87 = QPushButton("Καθαρισμός TM87")
        btn_clear_tm87.clicked.connect(self.handle_clear_tm87_calcs)
        left_col.addWidget(btn_clear_tm87)

        columns.addLayout(left_col)

        # Δεξιά πλευρά - Μετατροπή Γωνιών
        right_col = QVBoxLayout()

        angle_title = QLabel("Μετατροπή Γωνιών")
        angle_title.setFont(self.title_font)
        #right_col.addWidget(angle_title)

        # Πεδία μετατροπής γωνιών
        angle_group = QGroupBox("Μετατροπή Γωνιών")
        angle_layout = QGridLayout()

        angle_layout.addWidget(QLabel("Grads (g):"), 0, 0)
        self.angle_grads = QLineEdit()
        self.angle_grads.setPlaceholderText("100.0000")
        self.angle_grads.returnPressed.connect(lambda: self.handle_angle_conversion('grads'))
        angle_layout.addWidget(self.angle_grads, 0, 1)

        angle_layout.addWidget(QLabel("Radians (rad):"), 1, 0)
        self.angle_rads = QLineEdit()
        self.angle_rads.setPlaceholderText("1.570796")
        self.angle_rads.returnPressed.connect(lambda: self.handle_angle_conversion('rads'))
        angle_layout.addWidget(self.angle_rads, 1, 1)

        angle_layout.addWidget(QLabel("Degrees (°):"), 2, 0)
        self.angle_degs = QLineEdit()
        self.angle_degs.setPlaceholderText("90.0000")
        self.angle_degs.returnPressed.connect(lambda: self.handle_angle_conversion('degs'))
        angle_layout.addWidget(self.angle_degs, 2, 1)

        angle_layout.addWidget(QLabel("DMS:"), 3, 0)
        self.angle_dms = QLineEdit()
        self.angle_dms.setPlaceholderText("90° 00' 00\"")
        self.angle_dms.returnPressed.connect(lambda: self.handle_angle_conversion('dms'))
        angle_layout.addWidget(self.angle_dms, 3, 1)

        angle_group.setLayout(angle_layout)
        right_col.addWidget(angle_group)

        # Πληροφορίες
        info_label = QLabel(
            "Εισαγάγετε μια γωνία σε οποιαδήποτε μορφή και πατήστε Enter.\n"
            "Για DMS μορφή: 90° 30' 15\" ή 90 30 15"
        )
        info_label.setWordWrap(True)
        info_label.setStyleSheet("color: #888; font-size: 9pt;")
        right_col.addWidget(info_label)

        # Κουμπί καθαρισμού
        btn_clear_angles = QPushButton("Καθαρισμός Γωνιών")
        btn_clear_angles.clicked.connect(self.handle_clear_angle_conversion)
        right_col.addWidget(btn_clear_angles)

        right_col.addStretch()
        columns.addLayout(right_col)

        main_layout.addLayout(columns)
        return tab

    def handle_angle_conversion(self, input_type):
        """Μετατροπή γωνιών όταν πατιέται Enter"""
        try:
            if input_type == 'grads':
                value = self.angle_grads.text().strip()
                if not value:
                    return
                grads = float(value.replace(',', '.'))
                rads = grads * math.pi / 200.0
                degs = grads * 0.9
                dms_str = self._degs_to_dms(degs)

                self.angle_rads.setText(f"{rads:.8f}")
                self.angle_degs.setText(f"{degs:.6f}")
                self.angle_dms.setText(dms_str)

            elif input_type == 'rads':
                value = self.angle_rads.text().strip()
                if not value:
                    return
                rads = float(value.replace(',', '.'))
                grads = rads * 200.0 / math.pi
                degs = rads * 180.0 / math.pi
                dms_str = self._degs_to_dms(degs)

                self.angle_grads.setText(f"{grads:.6f}")
                self.angle_degs.setText(f"{degs:.6f}")
                self.angle_dms.setText(dms_str)

            elif input_type == 'degs':
                value = self.angle_degs.text().strip()
                if not value:
                    return
                degs = float(value.replace(',', '.'))
                grads = degs / 0.9
                rads = degs * math.pi / 180.0
                dms_str = self._degs_to_dms(degs)

                self.angle_grads.setText(f"{grads:.6f}")
                self.angle_rads.setText(f"{rads:.8f}")
                self.angle_dms.setText(dms_str)

            elif input_type == 'dms':
                value = self.angle_dms.text().strip()
                if not value:
                    return
                degs = self._dms_to_degs(value)
                if degs is not None:
                    grads = degs / 0.9
                    rads = degs * math.pi / 180.0

                    self.angle_grads.setText(f"{grads:.6f}")
                    self.angle_rads.setText(f"{rads:.8f}")
                    self.angle_degs.setText(f"{degs:.6f}")

        except ValueError:
            self.show_message("Σφάλμα", "Μη έγκυρη τιμή γωνίας", QMessageBox.Icon.Warning)

    def _dms_to_degs(self, dms_str):
        """Μετατροπή DMS string σε decimal degrees"""
        try:
            # Καθαρισμός string
            clean_str = dms_str.replace('°', ' ').replace("'", ' ').replace('"', ' ').replace(',', '.')
            parts = clean_str.split()

            if len(parts) >= 1:
                degrees = float(parts[0])
                minutes = float(parts[1]) if len(parts) > 1 else 0.0
                seconds = float(parts[2]) if len(parts) > 2 else 0.0

                # Υπολογισμός decimal degrees
                decimal_degrees = degrees + minutes/60.0 + seconds/3600.0

                # Έλεγχος για αρνητικές τιμές
                if degrees < 0:
                    decimal_degrees = - (abs(degrees) + minutes/60.0 + seconds/3600.0)

                return decimal_degrees
        except:
            return None

    def _degs_to_dms(self, decimal_degrees):
        """Μετατροπή decimal degrees σε DMS string"""
        try:
            sign = -1 if decimal_degrees < 0 else 1
            decimal_degrees = abs(decimal_degrees)

            degrees = int(decimal_degrees)
            minutes_decimal = (decimal_degrees - degrees) * 60.0
            minutes = int(minutes_decimal)
            seconds = (minutes_decimal - minutes) * 60.0

            if sign == -1:
                return f"-{degrees}° {minutes:02d}' {seconds:05.2f}\""
            else:
                return f"{degrees}° {minutes:02d}' {seconds:05.2f}\""
        except:
            return ""

    def handle_clear_angle_conversion(self):
        """Καθαρισμός όλων των πεδίων μετατροπής γωνιών"""
        self.angle_grads.clear()
        self.angle_rads.clear()
        self.angle_degs.clear()
        self.angle_dms.clear()

        
    # ------------------------------------------------------------------
    # 4. HANDLERS (Η "ΛΟΓΙΚΗ" ΤΟΥ GUI)
    # ------------------------------------------------------------------

    # --- Handlers Καρτέλας 1 ---
    def handle_calculate_proto(self):
        try:
            xa = self.get_float(self.proto_entries['XA'])
            ya = self.get_float(self.proto_entries['YA'])
            d = self.get_float(self.proto_entries['S'])
            gab = self.get_float(self.proto_entries['GAB'])
            
            if gab < 0 or gab >= 400.0:
                self.show_message("Εκτός Ορίων", "Η Γωνία GAB πρέπει να είναι μεταξύ 0 (inclusive) και 400 (exclusive).", QMessageBox.Icon.Warning)
                return
            if d <= 0.0:
                self.show_message("Εκτός Ορίων", "Η Απόσταση S πρέπει να είναι θετικός αριθμός.", QMessageBox.Icon.Warning)
                return
            
            xb, yb = proto_themeliodes(xa, ya, d, gab)
            self.set_readonly_entry(self.proto_result_xb_entry, f"{xb:.3f}")
            self.set_readonly_entry(self.proto_result_yb_entry, f"{yb:.3f}")
            # Ενημέρωση σκαριφήματος Θεμελιωδών (1ο Θεμελιώδες)
            if hasattr(self, "ax_fundamental"):
                pts = [("A", xa, ya, "fixed"), ("B", xb, yb, "fixed")]
                self._update_diagram_generic(
                    self.ax_fundamental, self.canvas_fundamental,
                    pts, [("A", "B", "baseline")], "1ο Θεμελιώδες: A-B"
                    )

        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_proto(self):
        for entry in self.proto_entries.values():
            entry.clear()
        self.set_readonly_entry(self.proto_result_xb_entry, "")
        self.set_readonly_entry(self.proto_result_yb_entry, "")
        # Καθαρισμός σκαριφήματος Θεμελιωδών
        if hasattr(self, "ax_fundamental"):
            self._clear_axes(self.ax_fundamental, self.canvas_fundamental, "Διάγραμμα Α–Β")

    def handle_calculate_deutero(self):
        try:
            xa = self.get_float(self.deutero_entries['XA'])
            ya = self.get_float(self.deutero_entries['YA'])
            xb = self.get_float(self.deutero_entries['XB'])
            yb = self.get_float(self.deutero_entries['YB'])
            
            gab, s = deutero_themeliodes(xa, ya, xb, yb)
            self.set_readonly_entry(self.deutero_result_gab_entry, f"{gab:.4f} grads")
            self.set_readonly_entry(self.deutero_result_s_entry, f"{s:.3f} m")
            if hasattr(self, "ax_fundamental"):
                pts = [("A", xa, ya), ("B", xb, yb)]
                self._update_diagram_generic(
                    self.ax_fundamental, self.canvas_fundamental,
                    pts, [("A", "B")], "2ο Θεμελιώδες: A-B"
                )
        except ValueError as e:
            if "Απροσδιόριστο" in str(e):
                self.show_message("Σφάλμα Υπολογισμού", str(e), QMessageBox.Icon.Critical)
            else:
                self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_deutero(self):
        for entry in self.deutero_entries.values():
            entry.clear()
        self.set_readonly_entry(self.deutero_result_gab_entry, "")
        self.set_readonly_entry(self.deutero_result_s_entry, "")
         # Καθαρισμός σκαριφήματος Θεμελιωδών
        if hasattr(self, "ax_fundamental"):
            self._clear_axes(self.ax_fundamental, self.canvas_fundamental, "Διάγραμμα Α–Β")

    def handle_calculate_trito(self):
        try:
            g_initial = self.get_float(self.trito_entries['G_initial'])
            measured_angles = []
            raw_text = self.trito_text_input.toPlainText().strip()
            if not raw_text:
                self.show_message("Ελλιπή Δεδομένα", "Δεν δώσατε γωνίες στάσης.", QMessageBox.Icon.Warning)
                return
            
            lines = raw_text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip().replace(',', '.') 
                if not line: continue
                try:
                    angle = float(line)
                    measured_angles.append(angle)
                except ValueError:
                    raise ValueError(f"Λάθος μορφοποίηση στη γραμμή {i+1}:\n'{line}'\n\nΠρέπει να είναι μόνο ένας αριθμός (π.χ. '210.1234')")
            
            all_G, final_G, log_output = calculate_azimuths_from_station_angles(g_initial, measured_angles)
            
            result_text = "\n".join(log_output)
            result_text += "\n=== ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ ==="
            result_text += f"\nΤελική G({len(all_G)-1}->{len(all_G)}): {final_G:.4f}g"
            result_text += "\n\nΑναλυτικά οι Γωνίες Διεύθυνσης:"
            for i, g in enumerate(all_G):
                 result_text += f"\n  G({i}->{i+1}): {g:.4f}g"
            
            self.trito_result_text.setText(result_text)
        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_trito(self):
        self.trito_entries['G_initial'].clear()
        self.trito_text_input.clear()
        self.trito_result_text.clear()

    # --- Handlers Καρτέλας 2 ---
    def handle_calculate_emprosthotomia(self):
        try:
            xa = self.get_float(self.empro_entries['XA']); ya = self.get_float(self.empro_entries['YA'])
            xb = self.get_float(self.empro_entries['XB']); yb = self.get_float(self.empro_entries['YB'])
            a = self.get_float(self.empro_entries['a']); b = self.get_float(self.empro_entries['b'])
            
            xp, yp = empros(xa, ya, xb, yb, a, b)
            self.set_readonly_entry(self.empro_result_xp_entry, f"{xp:.3f}")
            self.set_readonly_entry(self.empro_result_yp_entry, f"{yp:.3f}")
            # Ενημέρωση σκαριφήματος Αλληλοτομίας (Εμπροσθοτομία)
            if hasattr(self, "ax_allilo"):
                pts = [
                    ("A", xa, ya, "fixed"),
                    ("P", xp, yp, "detail"),
                    ("B", xb, yb, "fixed"),
                    ]
                segments = [("A", "P", "single"), ("P", "B", "single")]
                self._update_diagram_generic(
                     self.ax_allilo, self.canvas_allilo,
                     pts, segments, "Εμπροσθοτομία A, B -> P"
                     )

        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except ZeroDivisionError as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε διαίρεση με το μηδέν.\n{e}\nΕλέγξτε τις γωνίες σας.", QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_empro(self):
        for entry in self.empro_entries.values():
            entry.clear()
        self.set_readonly_entry(self.empro_result_xp_entry, "")
        self.set_readonly_entry(self.empro_result_yp_entry, "")
        # Καθαρισμός σκαριφήματος Αλληλοτομίας
        if hasattr(self, "ax_allilo"):
            self._clear_axes(self.ax_allilo, self.canvas_allilo, "Εμπροσθοτομία / Οπισθοτομία")

    def handle_calculate_opisthotomia(self):
        try:
            xa = self.get_float(self.opistho_entries['XA']); ya = self.get_float(self.opistho_entries['YA'])
            xb = self.get_float(self.opistho_entries['XB']); yb = self.get_float(self.opistho_entries['YB'])
            xc = self.get_float(self.opistho_entries['XC']); yc = self.get_float(self.opistho_entries['YC'])
            
            a = self.get_float(self.opistho_entries['a']) 
            b = self.get_float(self.opistho_entries['b']) 
            c = self.get_float(self.opistho_entries['c']) 

            measured_angle_sum = a + b + c
            tolerance = 0.001 
            
            if abs(measured_angle_sum - 400.0) > tolerance:
                self.show_message(
                    "Σφάλμα Μετρήσεων",
                    f"Το άθροισμα των τριών μετρημένων γωνιών (a, b, c) δεν είναι 400 grads!\n\n"
                    f"Άθροισμα: {measured_angle_sum:.4f}g\n"
                    f"Απόκλιση: {measured_angle_sum - 400.0:.4f}g",
                    QMessageBox.Icon.Critical
                )
                self.set_readonly_entry(self.opistho_result_xp_entry, "ΣΦΑΛΜΑ")
                self.set_readonly_entry(self.opistho_result_yp_entry, "ΣΦΑΛΜΑ")
                return

            try:
                G_AB, S_AB = deutero_themeliodes(xa, ya, xb, yb)
                G_AC, S_AC = deutero_themeliodes(xa, ya, xc, yc)
                G_BC, S_BC = deutero_themeliodes(xb, yb, xc, yc)
                G_BA = normalize_grads(G_AB + 200)
                G_CA = normalize_grads(G_AC + 200)
                G_CB = normalize_grads(G_BC + 200)
                
                A = normalize_grads(G_AC - G_AB) 
                B = normalize_grads(G_BA - G_BC) 
                C = normalize_grads(G_CB - G_CA) 
                
                angle_sum = A + B + C
                if abs(angle_sum - 200.0) > 0.001:
                    C = normalize_grads(200.0 - A - B)
                    print(f"Προειδοποίηση: Άθροισμα γωνιών τριγώνου ABC != 200g ({angle_sum:.4f}g). Χρησιμοποιήθηκε C={C:.4f}g")
            
            except ValueError as e:
                self.show_message("Σφάλμα Υπολογισμού Γωνιών", f"Δεν μπορούν να υπολογιστούν οι γωνίες A, B, C. Πιθανή ταύτιση σημείων.\n{e}", QMessageBox.Icon.Critical)
                return
            
            xp, yp = tienstra(xa, ya, xb, yb, xc, yc, a, b, c, A, B, C)
            self.set_readonly_entry(self.opistho_result_xp_entry, f"{xp:.3f}")
            self.set_readonly_entry(self.opistho_result_yp_entry, f"{yp:.3f}")
            if hasattr(self, "ax_allilo"):
                pts = [
                    ("A", xa, ya, "fixed"),
                    ("B", xb, yb, "fixed"),
                    ("C", xc, yc, "fixed"),
                    ("P", xp, yp, "detail"),
                    ]
                segments = [("A", "P", "single"), ("B", "P", "single"), ("C", "P", "single")]

                self._update_diagram_generic(
                    self.ax_allilo, self.canvas_allilo,
                    pts, segments, "Οπισθοτομία A, B, C -> P"
                )
        
        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except ZeroDivisionError as e:
            self.show_message("Σφάλμα Υπολογισμού (Απροσδιοριστία)", 
                              f"Προέκυψε διαίρεση με το μηδέν.\n{e}\n\n"
                              "ΠΙΘΑΝΗ ΑΙΤΙΑ: Η στάση P βρίσκεται πάνω στον 'Κύκλο Κινδύνου' "
                              "(τον περιγεγραμμένο κύκλο των σημείων A, B, C).", 
                              QMessageBox.Icon.Critical)
            self.set_readonly_entry(self.opistho_result_xp_entry, "ΑΠΡΟΣΔΙΟΡΙΣΤΙΑ")
            self.set_readonly_entry(self.opistho_result_yp_entry, "ΑΠΡΟΣΔΙΟΡΙΣΤΙΑ")
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_opistho(self):
        for entry in self.opistho_entries.values():
            entry.clear()
        self.set_readonly_entry(self.opistho_result_xp_entry, "")
        self.set_readonly_entry(self.opistho_result_yp_entry, "")
        # Καθαρισμός σκαριφήματος Αλληλοτομίας
        if hasattr(self, "ax_allilo"):
            self._clear_axes(self.ax_allilo, self.canvas_allilo, "Εμπροσθοτομία / Οπισθοτομία")

    # --- Handlers Καρτέλας 3 ---
    #
    # <<< ΝΕΑ ΔΙΟΡΘΩΜΕΝΗ ΣΥΝΑΡΤΗΣΗ ΓΙΑ ΤΟ BUG ΤΗΣ ΧΑΡΑΞΗΣ >>>
    #
    def handle_calculate_charaxi(self):
        self.last_charaxi_results = None
        self.last_charaxi_station_info = None
        
        try:
            # 1. Λήψη στοιχείων στάσης
            id_s_charaxi = self.charaxi_entries['ID_S'].text().strip()
            xs = self.get_float(self.charaxi_entries['XS'])
            ys = self.get_float(self.charaxi_entries['YS'])
            id_o_charaxi = self.charaxi_entries['ID_O'].text().strip()
            xo = self.get_float(self.charaxi_entries['XO'])
            yo = self.get_float(self.charaxi_entries['YO'])
            
            # 2. Λήψη στοιχείων κλίμακας
            apply_scale_charaxi = self.scale_var_charaxi.isChecked()
            scale_factor_val_charaxi = 1.0
            if apply_scale_charaxi:
                try:
                    scale_factor_val_charaxi = self.get_float(self.charaxi_entries['scale_factor'])
                    if scale_factor_val_charaxi <= 1e-9:
                        raise ValueError("Ο συντελεστής κλίμακας πρέπει να είναι θετικός και μη μηδενικός.")
                except ValueError as e_scale:
                    self.show_message("Σφάλμα Συντελεστή Κλίμακας", f"Μη έγκυρη τιμή συντελεστή κλίμακας.\n{e_scale}", QMessageBox.Icon.Critical)
                    return
            
            # 3. Υπολογισμός G(SO)
            g_so = 0.0
            try:
                g_so, d_so = deutero_themeliodes(xs, ys, xo, yo)
            except ValueError as e:
                self.show_message("Σφάλμα Προσανατολισμού", f"Η Στάση και ο Προσανατολισμός ταυτίζονται!\n{e}", QMessageBox.Icon.Critical)
                return

            # Αποθήκευση στοιχείων στάσης
            current_station_info_charaxi = {
                'id_s': id_s_charaxi, 'xs': xs, 'ys': ys,
                'id_o': id_o_charaxi, 'xo': xo, 'yo': yo,
                'apply_scale': apply_scale_charaxi, 'scale_factor': scale_factor_val_charaxi, 'g_so': g_so
            }
            
            # 4. Επεξεργασία σημείων
            raw_results_for_export = [] # Λίστα για τα raw data (αριθμούς)
            self.charaxi_table.setRowCount(0) 
            
            raw_text = self.charaxi_text_input.toPlainText().strip()
            if not raw_text:
                self.last_charaxi_station_info = current_station_info_charaxi
                self.last_charaxi_results = []
                # Ενημέρωση σκαριφήματος Χάραξης (χωρίς σημεία P)
                if hasattr(self, "ax_charaxi"):
                    self._update_charaxi_diagram()
                self.show_message("Ενημέρωση", "Δεν δόθηκαν σημεία προς χάραξη.", QMessageBox.Icon.Warning)
                return


            # Επεξεργασία γραμμή-γραμμή
            lines = raw_text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip().replace(" ","").replace("\t","")
                if not line: continue
                
                parts = line.split(',')
                if len(parts) != 3:
                    raise ValueError(f"Λάθος μορφοποίηση στη γραμμή {i+1}:\n'{line}'\n\nΠρέπει να είναι: ID, X, Y (π.χ. 'P1, 150.5, 300.2')")
                
                try:
                    # 5. Parsing δεδομένων
                    point_id_p = parts[0].strip()
                    xp = float(parts[1].strip().replace(',', '.'))
                    yp = float(parts[2].strip().replace(',', '.'))
                    
                    # 6. Υπολογισμός χάραξης
                    beta_str, dist_ground_str = "---", "---"
                    beta_raw, dist_ground_raw = "---", "---"
                    
                    try:
                        g_sp, dist_grid = deutero_themeliodes(xs, ys, xp, yp)
                        beta = normalize_grads(g_sp - g_so) 
                        dist_ground = dist_grid / scale_factor_val_charaxi if apply_scale_charaxi else dist_grid
                        
                        beta_raw = beta
                        dist_ground_raw = dist_ground
                        beta_str = f"{beta:.4f}"
                        dist_ground_str = f"{dist_ground:.3f}"
                        
                    except ValueError as e_deut:
                        print(f"Σφάλμα στο 2ο Θεμελιώδες για σημείο {point_id_p}: {e_deut}")
                    
                    xp_str = f"{xp:.3f}"
                    yp_str = f"{yp:.3f}"
                    
                    # 7. Αποθήκευση raw data για εξαγωγή
                    raw_results_for_export.append((point_id_p, xp, yp, beta_raw, dist_ground_raw))
                    
                    # 8. Γέμισμα πίνακα GUI
                    display_data_tuple = (point_id_p, xp_str, yp_str, beta_str, dist_ground_str)
                    row_idx = self.charaxi_table.rowCount()
                    self.charaxi_table.insertRow(row_idx)
                    for col_idx, item_data in enumerate(display_data_tuple):
                        self.charaxi_table.setItem(row_idx, col_idx, QTableWidgetItem(str(item_data)))
                        
                except ValueError:
                    raise ValueError(f"Λάθος συντεταγμένες στη γραμμή {i+1}:\n'{line}'")

            # 9. Αποθήκευση τελικών raw data
            self.last_charaxi_results = raw_results_for_export
            self.last_charaxi_station_info = current_station_info_charaxi
            # Ενημέρωση σκαριφήματος Χάραξης
            if hasattr(self, "ax_charaxi"):
                self._update_charaxi_diagram()

        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)

    def handle_clear_charaxi(self):
        # Καθαρισμός όλων των πεδίων εισόδου
        for entry in self.charaxi_entries.values():
            entry.clear()

        # Καθαρισμός κειμένου σημείων
        self.charaxi_text_input.clear()

        # Καθαρισμός πίνακα αποτελεσμάτων
        self.charaxi_table.setRowCount(0)

        # Επαναφορά checkbox κλίμακας
        self.scale_var_charaxi.setChecked(False)
        self.charaxi_entries['scale_factor'].setText("1.000000")
        self.charaxi_entries['scale_factor'].setEnabled(False)

        # Καθαρισμός αποθηκευμένων δεδομένων
        self.last_charaxi_results = None
        self.last_charaxi_station_info = None

        # Καθαρισμός σκαριφήματος
        if hasattr(self, "ax_charaxi"):
            self._clear_axes(self.ax_charaxi, self.canvas_charaxi, "Διάγραμμα Χάραξης")

    # --- Handlers Καρτέλας 4 ---
    def handle_calculate_tacheometry(self):
        self.last_tachymetry_results = None
        self.last_station_info = None
        # Καθαρισμός σκαριφήματος Χάραξης
        if hasattr(self, "ax_charaxi"):
            self._clear_axes(self.ax_charaxi, self.canvas_charaxi, "Διάγραμμα Χάραξης")
        
        try:
            id_s = self.tachy_entries['ID_S'].text().strip()
            xs = self.get_float(self.tachy_entries['XS'])
            ys = self.get_float(self.tachy_entries['YS'])
            zs = self.get_float(self.tachy_entries['ZS'])
            
            id_o = self.tachy_entries['ID_O'].text().strip()
            xo = self.get_float(self.tachy_entries['XO'])
            yo = self.get_float(self.tachy_entries['YO'])
            zo = self.get_float(self.tachy_entries['ZO'])
            
            i_val = self.get_float(self.tachy_entries['i'])
            hz_o = self.get_float(self.tachy_entries['Hz_O'])
            
            apply_scale = self.scale_var_tachy.isChecked()
            scale_factor_val = 1.0
            if apply_scale:
                try:
                    scale_factor_val = self.get_float(self.tachy_entries['scale_factor'])
                    if scale_factor_val <= 1e-9:
                        raise ValueError("Ο συντελεστής κλίμακας πρέπει να είναι θετικός και μη μηδενικός.")
                except ValueError as e_scale:
                    self.show_message("Σφάλμα Συντελεστή Κλίμακας", f"Μη έγκυρη τιμή συντελεστή κλίμακας.\n{e_scale}", QMessageBox.Icon.Critical)
                    return
            
            measurements = []
            raw_text = self.tachy_text_input.toPlainText().strip()
            self.tachy_table.setRowCount(0) 
            
            if not raw_text:
                self.show_message("Ελλιπή Δεδομένα", "Δεν δώσατε μετρήσεις.", QMessageBox.Icon.Warning)
                return
            
            lines = raw_text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip().replace(" ","").replace("\t","")
                if not line: continue
                parts = line.split(',')
                if len(parts) != 5:
                    raise ValueError(f"Λάθος μορφοποίηση στη γραμμή {i+1}:\n'{line}'\n\nΠρέπει να είναι: ID, Hz, Z, SD, t")
                try:
                    point_id = parts[0].strip()
                    hz_m = float(parts[1].strip().replace(',', '.'))
                    z_m = float(parts[2].strip().replace(',', '.'))
                    sd_m = float(parts[3].strip().replace(',', '.'))
                    t_m = float(parts[4].strip().replace(',', '.'))
                    measurements.append((point_id, hz_m, z_m, sd_m, t_m))
                except ValueError:
                    raise ValueError(f"Λάθος αριθμητικά δεδομένα στη γραμμή {i+1}:\n'{line}'")
            
            # Υπολογισμός (επιστρέφει raw data)
            results, g_so, final_scale = calculate_tachymetry(
                xs, ys, zs, i_val, xo, yo, zo, hz_o, measurements, apply_scale, scale_factor_val
            )
            
            # Γέμισμα QTableWidget
            self.tachy_table.setRowCount(len(results))
            for row_idx, row_data in enumerate(results):
                # row_data είναι (ID, xp, yp, zp) ή (ID, "SD <= 0", "", "")
                for col_idx, item_data in enumerate(row_data):
                    # Μετατροπή σε string για τον πίνακα
                    self.tachy_table.setItem(row_idx, col_idx, QTableWidgetItem(str(item_data)))
            
            # Αποθήκευση για PDF/CSV
            self.last_station_info = {
                'id_s': id_s, 'xs': xs, 'ys': ys, 'zs': zs,
                'id_o': id_o, 'xo': xo, 'yo': yo, 'zo': zo,
                'i_val': i_val, 'hz_o': hz_o, 'g_so': g_so,
                'apply_scale': apply_scale, 'scale_factor': final_scale
            }
            self.last_tachymetry_results = results # Αποθήκευση των raw data
            # Ενημέρωση σκαριφήματος Ταχυμετρίας
            if hasattr(self, "ax_tachy"):
                self._update_tachy_diagram()
            
        except ValueError as e:
            self.show_message("Σφάλμα Εισόδου", str(e), QMessageBox.Icon.Critical)
        except ZeroDivisionError as e_zero:
            self.show_message("Σφάλμα Προσανατολισμού", f"Η Στάση και ο Προσανατολισμός ταυτίζονται!\n{e_zero}", QMessageBox.Icon.Critical)
        except Exception as e:
            self.show_message("Σφάλμα Υπολογισμού", f"Προέκυψε σφάλμα: {e}", QMessageBox.Icon.Critical)


    def handle_clear_tacheometry(self):
        # Καθαρισμός όλων των πεδίων εισόδου
        for entry in self.tachy_entries.values():
            entry.clear()

        # Καθαρισμός κειμένου μετρήσεων
        self.tachy_text_input.clear()

        # Καθαρισμός πίνακα αποτελεσμάτων
        self.tachy_table.setRowCount(0)

        # Επαναφορά checkbox κλίμακας
        self.scale_var_tachy.setChecked(False)
        self.tachy_entries['scale_factor'].setText("1.000000")
        self.tachy_entries['scale_factor'].setEnabled(False)

        # Καθαρισμός αποθηκευμένων δεδομένων
        self.last_tachymetry_results = None
        self.last_station_info = None

        # Καθαρισμός σκαριφήματος
        if hasattr(self, "ax_tachy"):
            self._clear_axes(self.ax_tachy, self.canvas_tachy, "Διάγραμμα Ταχυμετρίας")



    def handle_calculate_tm87_scale(self):
        "Υπολογισμός συντελεστή γραμμικής παραμόρφωσης (κλίμακας) k για την προβολή TM87 (ΕΓΣΑ '87) με βάση το X σε μέτρα. Απλός τύπος (για σημείο ή μικρές αποστάσεις): k = 0.012311 * (X_Mm - 0.5)^2 + 0.9996 με X_Mm = X / 1 000 000"
        try:
            x = self.get_float(self.tm87_x_entry)  # X σε μέτρα
            x_mm = x / 1_000_000.0                # σε εκατομμύρια μέτρα

            k = 0.012311 * (x_mm - 0.5) ** 2 + 0.9996
            ppm = (k - 1.0) * 1_000_000.0

            # περισσότερα δεκαδικά: 12 για k, 6 για ppm
            self.set_readonly_entry(self.tm87_k_entry, f"{k:.12f}")
            self.set_readonly_entry(self.tm87_ppm_entry, f"{ppm:.6f}")

        except ValueError as e:
            self.show_message(
                "Σφάλμα Εισόδου",
                str(e),
                QMessageBox.Icon.Critical
            )
        except Exception as e:
            self.show_message(
                "Άγνωστο Σφάλμα",
                f"Προέκυψε σφάλμα κατά τον υπολογισμό του k:\n{e}",
                QMessageBox.Icon.Critical
            )
    # ================= TM87 HELPERS & HANDLERS =================

    def tm87_format(self, value, decimals=16):
        """Μορφοποίηση αριθμού με πολλά δεκαδικά."""
        try:
            return f"{float(value):.{decimals}f}"
        except Exception:
            return ""

    def handle_calc_tm87_point(self):
        """
        Σημειακός συντελεστής κλίμακας TM87:
        k = 0.012311 * (X_Mm - 0.5)^2 + 0.9996,  με X_Mm = X / 1 000 000
        """
        try:
            X = self.get_float(self.tm87_X)   # σε μέτρα
            X_mm = X / 1_000_000.0

            k = 0.012311 * (X_mm - 0.5) ** 2 + 0.9996
            invk = 1.0 / k
            ppm = (k - 1.0) * 1e6

            self.tm87_point_m.setText(self.tm87_format(k))
            self.tm87_point_inv.setText(self.tm87_format(invk))
            self.tm87_point_ppm.setText(f"{ppm:.8f}")

        except Exception as e:
            self.show_message("Σφάλμα TM87 (Σημειακός)", str(e), QMessageBox.Icon.Critical)


    def handle_calc_tm87_segment(self):
        """
        Γραμμικός συντελεστής κλίμακας m(i,j) με συνδυαστικό τύπο:

        1/m_ij = (1/6) * ( 1/m_i + 4/m_m + 1/m_j )

        όπου m_i, m_m, m_j υπολογίζονται από τον σημειακό τύπο:
        k(X) = 0.012311 * (X_Mm - 0.5)^2 + 0.9996,  X_Mm = X / 1 000 000
        """
        try:
            Xi = self.get_float(self.tm87_Ei)
            Xj = self.get_float(self.tm87_Ej)

            L = None
            if self.tm87_L.text().strip():
                L = self.get_float(self.tm87_L)

            def k_from_X(x_val: float) -> float:
                x_mm = x_val / 1_000_000.0
                return 0.012311 * (x_mm - 0.5) ** 2 + 0.9996

            Xm = 0.5 * (Xi + Xj)

            mi = k_from_X(Xi)
            mm = k_from_X(Xm)
            mj = k_from_X(Xj)

            inv_mij = (1.0 / 6.0) * ((1.0 / mi) + 4.0 * (1.0 / mm) + (1.0 / mj))
            m = 1.0 / inv_mij

            invm = 1.0 / m
            ppm = (m - 1.0) * 1e6

            self.tm87_seg_m.setText(self.tm87_format(m))
            self.tm87_seg_inv.setText(self.tm87_format(invm))
            self.tm87_seg_ppm.setText(f"{ppm:.8f}")

            if L is not None:
                dL = (m - 1.0) * L
                Lcorr = m * L
                self.tm87_seg_dL.setText(f"{dL:.6f}")
                self.tm87_seg_Lcorr.setText(f"{Lcorr:.6f}")
            else:
                self.tm87_seg_dL.setText("")
                self.tm87_seg_Lcorr.setText("")

        except Exception as e:
            self.show_message("Σφάλμα TM87 (Γραμμικός)", str(e), QMessageBox.Icon.Critical)


    def handle_clear_tm87_calcs(self):
        """Καθαρισμός όλων των πεδίων TM87 στην καρτέλα Βασικοί Υπολογισμοί."""
        fields = [
            getattr(self, "tm87_X", None),
            getattr(self, "tm87_Ei", None),
            getattr(self, "tm87_Ej", None),
            getattr(self, "tm87_L", None),
            getattr(self, "tm87_point_m", None),
            getattr(self, "tm87_point_inv", None),
            getattr(self, "tm87_point_ppm", None),
            getattr(self, "tm87_seg_m", None),
            getattr(self, "tm87_seg_inv", None),
            getattr(self, "tm87_seg_ppm", None),
            getattr(self, "tm87_seg_dL", None),
            getattr(self, "tm87_seg_Lcorr", None),
            ]
        for f in fields:
            if f is not None:
                f.clear()



    def handle_calculate_tm87_scale_segment(self):
        """
        Σύνθετος τύπος TM87 για αποστάσεις > ~2 km:
        Ο χρήστης δίνει δύο τιμές X (X₁, X₂) σε μέτρα.
        Υπολογίζουμε την μέση τιμή X_mean = (X₁ + X₂) / 2,
        X_Mm_mean = X_mean / 1 000 000
        και εφαρμόζουμε τον ίδιο τύπο για k.
        """
        try:
            x1 = self.get_float(self.tm87_x1_entry)
            x2 = self.get_float(self.tm87_x2_entry)

            x_mean = (x1 + x2) / 2.0
            x_mm_mean = x_mean / 1_000_000.0

            k_mean = 0.012311 * (x_mm_mean - 0.5) ** 2 + 0.9996
            ppm_mean = (k_mean - 1.0) * 1_000_000.0

            self.set_readonly_entry(self.tm87_k_comp_entry, f"{k_mean:.12f}")
            self.set_readonly_entry(self.tm87_ppm_comp_entry, f"{ppm_mean:.6f}")

        except ValueError as e:
            self.show_message(
                "Σφάλμα Εισόδου",
                str(e),
                QMessageBox.Icon.Critical
            )
        except Exception as e:
            self.show_message(
                "Άγνωστο Σφάλμα",
                f"Προέκυψε σφάλμα στον σύνθετο υπολογισμό k:\n{e}",
                QMessageBox.Icon.Critical
            )


    def handle_clear_tm87_scale(self):
        """Καθαρισμός πεδίων στην καρτέλα Βασικοί Υπολογισμοί (TM87)."""
        # Απλός τύπος
        self.tm87_x_entry.clear()
        self.tm87_k_entry.clear()
        self.tm87_ppm_entry.clear()

        # Σύνθετος τύπος
        if hasattr(self, "tm87_x1_entry"):
            self.tm87_x1_entry.clear()
        if hasattr(self, "tm87_x2_entry"):
            self.tm87_x2_entry.clear()
        if hasattr(self, "tm87_k_comp_entry"):
            self.tm87_k_comp_entry.clear()
        if hasattr(self, "tm87_ppm_comp_entry"):
            self.tm87_ppm_comp_entry.clear()


  #########################################################
    # --- Handlers Μενού ---

    def handle_export_traverse_txt_csv(self):
        trav: TraverseTab = self.pages.get("Όδευση")  # type: ignore
        if not trav or not trav.results:
            self.show_message("Δεν υπάρχουν δεδομένα", "Πρέπει πρώτα να εκτελέσετε υπολογισμό όδευσης.", QMessageBox.Icon.Warning)
            return
        trav.export_results()

    def handle_export_traverse_png(self):
        trav: TraverseTab = self.pages.get("Όδευση")  # type: ignore
        if not trav or not trav.results:
            self.show_message("Δεν υπάρχει Διάγραμμα", "Πρέπει πρώτα να εκτελέσετε υπολογισμό όδευσης.", QMessageBox.Icon.Warning)
            return
        trav.export_png()

    
    def handle_export_traverse_pdf(self):
        """Handler για εξαγωγή PDF όδευσης από το menu."""
        traverse_tab = self.pages.get("Όδευση")
        if not traverse_tab or not traverse_tab.results:
            self.show_message(
                "Δεν υπάρχουν δεδομένα", 
                "Πρέπει πρώτα να εκτελέσετε υπολογισμό όδευσης.", 
                QMessageBox.Icon.Warning
            )
            return
        
        # Καλείτε την υπάρχουσα μέθοδο export_pdf_report της TraverseTab
        traverse_tab.export_pdf_report()

    def _export_axes_png(self, fig, ax, default_filename, title):
        """
        Κοινή ρουτίνα εξαγωγής σκαριφήματος σε PNG για όλες τις καρτέλες.
        """
        if fig is None or ax is None:
            self.show_message(
                "Αδυναμία Εξαγωγής",
                f"Δεν βρέθηκε διαθέσιμο Διάγραμμα για εξαγωγή ({title}).",
                QMessageBox.Icon.Warning
            )
            return

        # Επιλογή αρχείου
        path, _ = QFileDialog.getSaveFileName(
            self,
            f"Αποθήκευση {title}",
            default_filename,
            "PNG Image (*.png)"
        )
        if not path:
            return  # ακύρωση από τον χρήστη

        try:
            fig.savefig(path, dpi=200, facecolor=fig.get_facecolor())
            self.show_message(
                "Επιτυχής Αποθήκευση",
                f"Το Διάγραμμα αποθηκεύτηκε επιτυχώς:\n{path}",
                QMessageBox.Icon.Information
            )
        except Exception as e:
            self.show_message(
                "Σφάλμα Αποθήκευσης",
                f"Απέτυχε η αποθήκευση εικόνας:\n{str(e)}",
                QMessageBox.Icon.Critical
            )


    def handle_export_fundamental_png(self):
        self._export_axes_png(
            getattr(self, "fig_fundamental", None),
            getattr(self, "ax_fundamental", None),
            "Fundamental_Sketch.png",
            "Διάγραμμα Θεμελιωδών"
        )

    def handle_export_allilo_png(self):
        self._export_axes_png(
            getattr(self, "fig_allilo", None),
            getattr(self, "ax_allilo", None),
            "Allilotomies_Sketch.png",
            "Διάγραμμα Αλληλοτομιών"
        )

    def handle_export_charaxi_png(self):
        self._export_axes_png(
            getattr(self, "fig_charaxi", None),
            getattr(self, "ax_charaxi", None),
            "Charaxi_Sketch.png",
            "Διάγραμμα Χάραξης"
        )

    def handle_export_tachy_png(self):
        self._export_axes_png(
            getattr(self, "fig_tachy", None),
            getattr(self, "ax_tachy", None),
            "Tachymetry_Sketch.png",
            "Διάγραμμα Ταχυμετρίας"
        )

    def handle_export_tachy_pdf(self):
        if not self.last_tachymetry_results:
            self.show_message("Δεν υπάρχουν δεδομένα", "Πρέπει πρώτα να εκτελέσετε έναν υπολογισμό ταχυμετρίας.", QMessageBox.Icon.Warning)
            return
        generate_pdf_report_tachymetry(self.last_tachymetry_results, self.last_station_info, parent_window=self)

    def handle_export_charaxi_pdf(self):
        if not self.last_charaxi_results:
            self.show_message("Δεν υπάρχουν δεδομένα", "Πρέπει πρώτα να εκτελέσετε έναν υπολογισμό χάραξης.", QMessageBox.Icon.Warning)
            return
        generate_pdf_report_charaxi(self.last_charaxi_results, self.last_charaxi_station_info, parent_window=self)

    def handle_about(self):
        self.show_message("Σχετικά με το LASCA", 
                          "LASCA (Land Surveying Computations App)\n\n"
                          "Πρόγραμμα για βασικούς τοπογραφικούς υπολογισμούς.\n"
                          "Ηλίας Σαούλιας\n"
                          "Σάββας Τσιγκουτζίδης")

    # --- ΝΕΕΣ ΣΥΝΑΡΤΗΣΕΙΣ ΕΞΑΓΩΓΗΣ TXT/CSV ---

    def _save_data_to_file(self, data_rows, header, file_path):
        """Βοηθητική συνάρτηση για εγγραφή σε αρχείο."""
        try:
            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                # 
                # <<< ΔΙΟΡΘΩΣΗ CSV: ΑΛΛΑΓΗ DELIMITER ΣΕ ΕΡΩΤΗΜΑΤΙΚΟ >>>
                #
                if file_path.endswith('.csv'):
                    writer = csv.writer(f, delimiter=';') # ΑΛΛΑΓΗ ΕΔΩ
                    writer.writerow(header)
                    writer.writerows(data_rows)
                
                # Αν είναι TXT (Space Delimited)
                elif file_path.endswith('.txt'):
                    # Βρίσκουμε το μέγιστο πλάτος για κάθε στήλη
                    col_widths = [len(h) for h in header]
                    for row in data_rows:
                        for i, item in enumerate(row):
                            col_widths[i] = max(col_widths[i], len(str(item)))
                    
                    # Δημιουργία format string (π.χ. "%-10s %-15s")
                    format_str = " ".join([f"%-{w}s" for w in col_widths]) + "\n"
                    
                    f.write(format_str % tuple(header))
                    f.write("-" * (sum(col_widths) + len(col_widths) - 1) + "\n")
                    for row in data_rows:
                        f.write(format_str % tuple(row))
            
            self.show_message("Επιτυχής Εξαγωγή", f"Τα δεδομένα αποθηκεύτηκαν ως:\n{file_path}")
        except Exception as e:
            self.show_message("Σφάλμα Εξαγωγής", f"Δεν ήταν δυνατή η αποθήκευση του αρχείου:\n{e}", QMessageBox.Icon.Critical)

    def handle_export_tachy_txt_csv(self):
        if not self.last_tachymetry_results:
            self.show_message("Δεν υπάρχουν δεδομένα", "Πρέπει πρώτα να εκτελέσετε έναν υπολογισμό ταχυμετρίας.", QMessageBox.Icon.Warning)
            return

        downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
        # <<< ΔΙΟΡΘΩΣΗ CSV: ΑΛΛΑΓΗ ΠΕΡΙΓΡΑΦΗΣ FILTER >>>
        filepath, file_filter = QFileDialog.getSaveFileName(
            self,
            "Αποθήκευση Δεδομένων Ταχυμετρίας",
            os.path.join(downloads_path, "Tachymetry_Results.csv"),
            "CSV (Semicolon delimited) (*.csv);;TXT (Space delimited) (*.txt)"
        )

        if not filepath:
            return

        header = ["ID", "X", "Y", "Z"]
        # Τα δεδομένα είναι ήδη στη σωστή μορφή (ID, X, Y, Z)
        data_rows = [row for row in self.last_tachymetry_results if row[1] != "SD <= 0"]
        
        self._save_data_to_file(data_rows, header, filepath)


    def handle_export_charaxi_txt_csv(self):
        if not self.last_charaxi_results:
            self.show_message("Δεν υπάρχουν δεδομένα", "Πρέπει πρώτα να εκτελέσετε έναν υπολογισμό χάραξης.", QMessageBox.Icon.Warning)
            return
            
        downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
        # <<< ΔΙΟΡΘΩΣΗ CSV: ΑΛΛΑΓΗ ΠΕΡΙΓΡΑΦΗΣ FILTER >>>
        filepath, file_filter = QFileDialog.getSaveFileName(
            self,
            "Αποθήκευση Δεδομένων Χάραξης",
            os.path.join(downloads_path, "Charaxi_Results.csv"),
            "CSV (Semicolon delimited) (*.csv);;TXT (Space delimited) (*.txt)"
        )
        
        if not filepath:
            return
            
        header = ["ID", "Xp", "Yp", "Gonia_beta_g", "Apostasi_S_m"]
        
        # Μορφοποίηση των raw data (που είναι αριθμοί) σε κείμενο για εξαγωγή
        data_rows = []
        for row in self.last_charaxi_results:
            (point_id_p, xp, yp, beta, dist_ground) = row
            data_rows.append((
                point_id_p,
                f"{xp:.3f}",
                f"{yp:.3f}",
                f"{beta:.4f}" if isinstance(beta, (int, float)) else "---",
                f"{dist_ground:.3f}" if isinstance(dist_ground, (int, float)) else "---"
            ))

        self._save_data_to_file(data_rows, header, filepath)


# --- Εκκίνηση Εφαρμογής ---
if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_window = LascaApp()
    main_window.show()
    sys.exit(app.exec())
