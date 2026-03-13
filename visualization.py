from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, sys

# Βοηθητική συνάρτηση που καλούμε όταν θέλουμε να δημιουργήσουμε το filepath.
# Νομίζω πρέπει να γίνει πιο γενικό ασ διαλέγει ο χρήστης που θέλει να το αποθηκεύσει και δεν χρειάζεται να το δίνουμε default 
def filepath(parent_window, title, default_filename):
    
    downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads')
    filepath, _ = QFileDialog.getSaveFileName(
        parent_window,
        title,
        os.path.join(downloads_path, default_filename),
        "PDF Documents (*.pdf)"
    )
    return filepath

# filepath = download_filepath
def style(filepath):
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
    return style_light_table, doc

def generate_pdf_report_tachymetry(results_data, station_info, parent_window, default_filename):
   # Δεν υπάρχει λογος να υπαρχει αυτο στο readme θα εχουμε οδηγιες για file structure και απαιτουμενες βιβλιοθηκες!
    if not REPORTLAB_AVAILABLE:
        QMessageBox.critical(parent_window, "Σφάλμα Βιβλιοθήκης", "Η βιβλιοθήκη 'reportlab' δεν είναι εγκατεστημένη.\nΗ εξαγωγή PDF δεν είναι δυνατή.")
        return 
    
    download_filepath = filepath(parent_window, title, default_filename) 
    
    if not download_filepath:
        print("ERROR Θα το φτιαξουμε τι θα βγαζει")
        return
        
    try:
        style_light_table, doc = style(download_filepath)

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

    download_filepath = filepath(parent_window, title, default_filename)

    if not download_filepath:
        return

    try:
        style_light_table, doc = style(download_filepath)
        
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
