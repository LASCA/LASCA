import pandas as pd
import math
import base64
import ezdxf
import os, json, io
import traceback
import data_proccessing as dpr  
import vis_4_app as vis     

from project_manager import TopoProject  
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pathlib import Path
from ezdxf.enums import TextEntityAlignment
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

app = Flask(__name__)
CORS(app) 

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

# Ορίζουμε τον κεντρικό φάκελο όπου θα αποθηκεύονται όλα τα projects
WORKSPACE_DIR = Path(os.getcwd()) / "Topo_Workspace"

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
        print(f"❌ Σφάλμα κατά τη λίστα των projects: {str(e)}")
        return jsonify({"error": "Αποτυχία ανάγνωσης φακέλων εργασίας"}), 500

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
        print(f"❌ Σφάλμα κατά τη φόρτωση του project: {str(e)}")
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
        print(f"❌ Σφάλμα κατά την αποθήκευση του project: {str(e)}")
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

        # ΠΡΟΣΘΗΚΗ: Εκτυπώνουμε τη λίστα που θα σταλεί στο React για έλεγχο
        print("====== DEBUGGING ΤΕΛΙΚΩΝ ΣΤΑΤΙΣΤΙΚΩΝ ΠΡΟΣ REACT ======")
        print(f"Τελική Λίστα (stats_list): {stats_list}")
        print("======================================================")
            
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

import os
from io import BytesIO
from flask import request, send_file, jsonify
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ==========================================
# 1B. ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (ADJUSTMENT)
# ==========================================
@app.route('/api/adjustment/report', methods=['POST'])
def export_adjustment_report():
    try:
        data = request.json
        observations = data.get('measurements', [])
        stats = data.get('stats', [])
        
        # --- ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΑΣ (Διορθώνει τα κουτάκια ■ σε ελληνικά & σύμβολα σ) ---
        font_path = "C:/Windows/Fonts/arial.ttf"
        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            my_font = 'GreekFont'
        except Exception:
            my_font = 'Helvetica'

        # Βοηθητική συνάρτηση για στρογγυλοποίηση σε 4 δεκαδικά ψηφία
        def format_to_4(val):
            if val is None or val == "":
                return "-"
            try:
                return f"{float(val):.4f}"
            except (ValueError, TypeError):
                return str(val)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=30, leftMargin=30, 
            topMargin=30, bottomMargin=30
        )
        elements = []
        
        # --- Dark Palette (Ομοιομορφία με το Traverse Report) ---
        BG_CANVAS = colors.HexColor('#0b1120')
        HEADER_BG = colors.HexColor('#1e293b')
        ROW_BG_1 = colors.HexColor('#0f172a')
        ROW_BG_2 = colors.HexColor('#182234')
        GRID_COLOR = colors.HexColor('#334155')
        
        TEXT_MAIN = colors.HexColor('#f8fafc')
        ACCENT_CYAN = colors.HexColor('#38bdf8')
        ACCENT_BLUE = colors.HexColor('#60a5fa')
        ACCENT_GREEN = colors.HexColor('#34d399')

        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'DarkTitle', parent=styles['Title'], fontName=my_font,
            fontSize=18, textColor=ACCENT_CYAN, alignment=1
        )
        h2_style = ParagraphStyle(
            'DarkH2', parent=styles['Heading2'], fontName=my_font,
            fontSize=11, textColor=ACCENT_BLUE, spaceBefore=10, spaceAfter=8
        )
        header_style = ParagraphStyle(
            'TableHead', parent=styles['Normal'], fontName=my_font,
            fontSize=8.5, textColor=TEXT_MAIN, alignment=1
        )

        # --- Τίτλος ---
        elements.append(Paragraph("Adjustment Network Report", title_style))
        elements.append(Spacer(1, 15))
        
        # --- Πίνακας 1: Μετρήσεις & Αποτελέσματα ---
        elements.append(Paragraph("1. Network Observations & Adjusted Values", h2_style))
        elements.append(Spacer(1, 5))
        
        t1_headers = [
            Paragraph("<b>From</b>", header_style),
            Paragraph("<b>To</b>", header_style),
            Paragraph("<b>Period</b>", header_style),
            Paragraph("<b>Face I</b>", header_style),
            Paragraph("<b>Face II</b>", header_style),
            Paragraph("<b>Adj. Hz (grad)</b>", header_style),
            Paragraph("<b>σ (cc)</b>", header_style) # Καθαρό 'σ' χωρίς Symbol font tag
        ]
        
        table_data = [t1_headers]
        for obs in observations:
            table_data.append([
                str(obs.get('station', '')),
                str(obs.get('target', '')),
                str(obs.get('Period', '')),
                format_to_4(obs.get('Face_I')),
                format_to_4(obs.get('Face_II')),
                format_to_4(obs.get('adj_hz')),
                format_to_4(obs.get('std_dev'))
            ])
            
        # Καθορισμός σταθερού πλάτους στηλών (Σύνολο = 535pt - πλήρες πλάτος A4)
        t1 = Table(table_data, colWidths=[55, 55, 50, 90, 90, 100, 95])
        t1_cmds = [
            ('FONTNAME', (0,0), (-1,-1), my_font),
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
            ('TEXTCOLOR', (5,1), (5,-1), ACCENT_CYAN),   # Έμφαση στο Adj Hz
            ('TEXTCOLOR', (6,1), (6,-1), ACCENT_GREEN),  # Έμφαση στο σ (cc)
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t1_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
            
        t1.setStyle(TableStyle(t1_cmds))
        elements.append(t1)
        elements.append(Spacer(1, 20))
        
        # --- Πίνακας 2: Στατιστικά Στάσεων ---
        elements.append(Paragraph("2. Station Statistics (Log)", h2_style))
        elements.append(Spacer(1, 5))
        
        t2_headers = [
            Paragraph("<b>Station</b>", header_style),
            Paragraph("<b>Degrees of Freedom (f)</b>", header_style),
            Paragraph("<b>Optimization Criterion [vv]</b>", header_style),
            Paragraph("<b>A-posteriori Variance (σ<sub>0</sub><sup>2</sup>)</b>", header_style),
            Paragraph("<b>A-posteriori Std. Dev. σ<sub>0</sub> (cc)</b>", header_style)
        ]
        
        stats_data = [t2_headers]
        for st in stats:
            stats_data.append([
                str(st.get('station', st.get('stationName', ''))),
                str(st.get('f', '')),
                format_to_4(st.get('vv')),
                format_to_4(st.get('var')),
                format_to_4(st.get('std'))
            ])
            
        t2 = Table(stats_data, colWidths=[75, 110, 115, 115, 120])
        t2_cmds = [
            ('FONTNAME', (0,0), (-1,-1), my_font),
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MAIN),
            ('TEXTCOLOR', (3,1), (4,-1), ACCENT_GREEN), # Έμφαση στα σ0
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        for i in range(1, len(stats_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t2_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t2.setStyle(TableStyle(t2_cmds))
        elements.append(t2)
        
        # --- Εφαρμογή Dark Background στο PDF ---
        def draw_dark_background(canvas, doc_obj):
            canvas.saveState()
            canvas.setFillColor(BG_CANVAS)
            canvas.rect(0, 0, doc_obj.pagesize[0], doc_obj.pagesize[1], fill=True, stroke=False)
            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_dark_background, onLaterPages=draw_dark_background)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name='Adjustment_Report.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τη δημιουργία Report:\n{traceback.format_exc()}")
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
        print(f"🔍 [DEBUG TRAVERSE] Το backend διάβασε project_name = '{project_name}'")
        
        project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
        project_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(project_dir / "latest_traverse.json", "w", encoding="utf-8") as f:
                json.dump(calculated_stations_export, f, ensure_ascii=False, indent=4)
            print(f"✅ ΓΕΦΥΡΑ: Οι στάσεις αποθηκεύτηκαν στο: '{project_dir / 'latest_traverse.json'}'")
        except Exception as e:
            print(f"⚠️ Δεν ήταν δυνατή η αποθήκευση των στάσεων όδευσης: {e}")

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
# ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (TRAVERSE)
# ==========================================
@app.route('/api/traverse/report', methods=['POST'])
def export_traverse_report():
    try:
        data = request.json
        points = data.get('points', [])
        metrics = data.get('metrics', {})
        plot_base64 = data.get('plot') 

        # --- ΕΠΙΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ ΜΕ ΤΑ ΕΛΛΗΝΙΚΑ ("ΚΟΥΤΑΚΙΑ") ---
        # Φορτώνουμε την Arial από τα Windows. Αν το ανεβάσεις σε Linux server αργότερα, 
        # απλά βάλε το αρχείο arial.ttf στον φάκελο του project σου και άλλαξε το path.
        font_path = "C:/Windows/Fonts/arial.ttf"
        try:
            pdfmetrics.registerFont(TTFont('GreekFont', font_path))
            my_font = 'GreekFont'
        except Exception:
            # Fallback αν δεν βρει τη γραμματοσειρά
            print("Δεν βρέθηκε η γραμματοσειρά Arial. Ενδέχεται να μην εμφανίζονται τα Ελληνικά.")
            my_font = 'Helvetica'

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=30, leftMargin=30, 
            topMargin=30, bottomMargin=30
        )
        elements = []
        
        # --- Dark Palette ---
        BG_CANVAS = colors.HexColor('#0b1120')
        HEADER_BG = colors.HexColor('#1e293b')
        ROW_BG_1 = colors.HexColor('#0f172a')
        ROW_BG_2 = colors.HexColor('#182234')
        GRID_COLOR = colors.HexColor('#334155')
        
        TEXT_MAIN = colors.HexColor('#f8fafc')
        ACCENT_CYAN = colors.HexColor('#38bdf8')
        ACCENT_BLUE = colors.HexColor('#60a5fa')
        ACCENT_GREEN = colors.HexColor('#34d399')
        ACCENT_RED = colors.HexColor('#ef4444')
        ACCENT_PINK = colors.HexColor('#ec4899')

        styles = getSampleStyleSheet()

        # Χρησιμοποιούμε τη νέα γραμματοσειρά (my_font) στα styles
        title_style = ParagraphStyle(
            'DarkTitle', parent=styles['Title'], fontName=my_font,
            fontSize=18, textColor=ACCENT_CYAN, alignment=1
        )
        text_style = ParagraphStyle(
            'DarkText', parent=styles['Normal'], fontName=my_font,
            fontSize=10, textColor=TEXT_MAIN, leading=14
        )
        th_style = ParagraphStyle(
            'DarkTH', parent=styles['Normal'], fontName=my_font,
            fontSize=9, textColor=TEXT_MAIN, alignment=1
        )

        # --- Τίτλος ---
        elements.append(Paragraph("Αναφορά Όδευσης (Traverse Report)", title_style))
        elements.append(Spacer(1, 15))

        # --- ΝΕΟΣ ΠΙΝΑΚΑΣ ΣΤΑΤΙΣΤΙΚΩΝ ΚΑΙ ΣΦΑΛΜΑΤΩΝ ---
        metrics_table_data = [
            # Κεφαλίδες ενοτήτων
            [Paragraph("<b>Γενικά & Μέγιστα</b>", th_style), '', Paragraph("<b>Γωνιακή Ανάλυση</b>", th_style), '', Paragraph("<b>Γραμμική Ανάλυση</b>", th_style), ''],
            # Γραμμή 1
            ["Κορυφές (n):", str(metrics.get('n', '-')), "G (πρέπει):", str(metrics.get('gTarget', '-')), "ΔX (πρέπει):", str(metrics.get('dxTarget', '-'))],
            # Γραμμή 2
            ["Μήκος (L):", f"{metrics.get('totalLength', '-')} m", "G (είναι):", str(metrics.get('gActual', '-')), "ΔX (είναι):", str(metrics.get('dxActual', '-'))],
            # Γραμμή 3
            ["Wβ Max:", f"{metrics.get('Wb_max', '-')} g", "Wβ:", f"{metrics.get('fb', '-')} g", "δx:", str(metrics.get('dx', '-'))],
            # Γραμμή 4
            ["δs Max:", f"{metrics.get('ds_max', '-')} m", "wβi:", str(metrics.get('wbi', '-')), "ΔY (πρέπει):", str(metrics.get('dyTarget', '-'))],
            # Γραμμή 5
            ["", "", "", "", "ΔY (είναι):", str(metrics.get('dyActual', '-'))],
            # Γραμμή 6
            ["", "", "", "", "δy:", str(metrics.get('dy', '-'))],
            # Γραμμή 7
            ["", "", "", "", "δs (W):", f"{metrics.get('w', '-')} m"]
        ]

        # Στυλ για τον πίνακα στατιστικών
        metrics_table = Table(metrics_table_data, colWidths=[65, 75, 65, 80, 85, 70])
        metrics_style = TableStyle([
            ('FONTNAME', (0,0), (-1,-1), my_font),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('TEXTCOLOR', (0,0), (-1,-1), TEXT_MAIN),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            
            # Κεφαλίδες Ενοτήτων (Span)
            ('SPAN', (0,0), (1,0)),
            ('SPAN', (2,0), (3,0)),
            ('SPAN', (4,0), (5,0)),
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            
            # Χρώματα στις τιμές για έμφαση
            ('TEXTCOLOR', (1,1), (1,2), ACCENT_BLUE),  # n, L
            ('TEXTCOLOR', (1,3), (1,4), ACCENT_PINK),  # Max Wb, Max ds
            ('TEXTCOLOR', (3,3), (3,3), ACCENT_GREEN), # Wb
            ('TEXTCOLOR', (5,7), (5,7), ACCENT_GREEN), # ds (W)
            
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('BACKGROUND', (0,1), (-1,-1), ROW_BG_1),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ])
        metrics_table.setStyle(metrics_style)
        elements.append(metrics_table)
        elements.append(Spacer(1, 25))

        # --- Πίνακας Στάσεων ---
        t_headers = [
            Paragraph("<b>Στάση</b>", th_style),
            Paragraph("<b>Γωνία [grad]</b>", th_style),
            Paragraph("<b>Απόσταση [m]</b>", th_style),
            Paragraph("<b>X [m]</b>", th_style),
            Paragraph("<b>Y [m]</b>", th_style)
        ]
        
        table_data = [t_headers]
        for pt in points:
            table_data.append([
                str(pt.get('name', '-')),
                f"{float(pt.get('hz', 0)):.4f}" if pt.get('hz') not in [None, '', '-'] else "-",
                f"{float(pt.get('sd', 0)):.3f}" if pt.get('sd') not in [None, '', '-'] else "-",
                f"{float(pt.get('x', 0)):.3f}" if pt.get('x') not in [None, '', '-'] else "-",
                f"{float(pt.get('y', 0)):.3f}" if pt.get('y') not in [None, '', '-'] else "-"
            ])
            
        t = Table(table_data, colWidths=[80, 80, 80, 100, 100])
        t_style_cmds = [
            ('FONTNAME', (0,0), (-1,-1), my_font), # Εφαρμογή γραμματοσειράς και εδώ
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('TEXTCOLOR', (0,1), (0,-1), TEXT_MAIN),
            ('TEXTCOLOR', (1,1), (1,-1), ACCENT_BLUE),
            ('TEXTCOLOR', (2,1), (2,-1), ACCENT_GREEN),
            ('TEXTCOLOR', (3,1), (4,-1), ACCENT_CYAN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]

        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t.setStyle(TableStyle(t_style_cmds))
        elements.append(t)
        elements.append(Spacer(1, 20))

        # --- Εισαγωγή Σκαριφήματος (Διάγραμμα) ---
        if plot_base64 and "," in plot_base64:
            try:
                encoded_image = plot_base64.split(",")[1]
                img_data = base64.b64decode(encoded_image)
                img_stream = BytesIO(img_data)
                
                img = Image(img_stream, width=480, height=350, kind='proportional')
                img.hAlign = 'CENTER'
                elements.append(img)
            except Exception as img_err:
                print(f"Σφάλμα κατά την επεξεργασία του διαγράμματος: {img_err}")

        # --- Εφαρμογή Dark Background στο PDF ---
        def draw_dark_background(canvas, doc_obj):
            canvas.saveState()
            canvas.setFillColor(BG_CANVAS)
            canvas.rect(0, 0, doc_obj.pagesize[0], doc_obj.pagesize[1], fill=True, stroke=False)
            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_dark_background, onLaterPages=draw_dark_background)
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

# ==========================================
# 3. ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ ΠΛΗΡΟΥΣ DXF (TRAVERSE)
# ==========================================
@app.route('/api/traverse/export-dxf', methods=['POST'])
def export_traverse_dxf():
    try:
        data = request.json
        points = data.get('points', [])
        scale = data.get('scale', '1:1000')  # Λήψη της κλίμακας από το frontend
        
        # --- ΥΠΟΛΟΓΙΣΜΟΣ ΚΛΙΜΑΚΑΣ (Νέα Λογική) ---
        try:
            scale_num = int(scale.split(':')[-1])
        except (ValueError, AttributeError):
            scale_num = 1000

        if scale_num <= 200:
            grid_step = 20.0
        elif scale_num <= 500:
            grid_step = 50.0
        elif scale_num <= 1000:
            grid_step = 100.0
        else:
            grid_step = max(100.0, float(scale_num // 10))

        # Φιλτράρισμα και μετατροπή έγκυρων σημείων
        valid_points = []
        for pt in points:
            try:
                x = float(pt.get('x'))
                y = float(pt.get('y'))
                valid_points.append({
                    'name': pt.get('name', 'Unknown'),
                    'x': x,
                    'y': y,
                    'hz': pt.get('hz'),
                    'sd': pt.get('sd')
                })
            except (ValueError, TypeError):
                continue
                
        if not valid_points:
            return jsonify({"error": "No valid points to export."}), 400

        # Υπολογισμός Bounding Box (Όρια σχεδίου)
        x_coords = [p['x'] for p in valid_points]
        y_coords = [p['y'] for p in valid_points]
        min_x, max_x = min(x_coords), max(x_coords)
        min_y, max_y = min(y_coords), max(y_coords)
        x_range = max_x - min_x
        y_range = max_y - min_y

        # Δημιουργία νέου εγγράφου DXF
        doc = ezdxf.new('R2010')
        
        # Δημιουργία τύπου γραμμής DASHED
        if 'DASHED' not in doc.linetypes:
            doc.linetypes.new('DASHED', dxfattribs={'description': 'Dashed', 'pattern': [1.5, 1.0, -0.5]})
            
        # --- ΠΡΟΣΘΗΚΗ TRUE TYPE FONT (ARIAL) ---
        if 'ARIAL' not in doc.styles:
            doc.styles.new('ARIAL', dxfattribs={'font': 'arial.ttf'})
            
        msp = doc.modelspace()
        
        # --- ΔΗΜΙΟΥΡΓΙΑ LAYERS ---
        doc.layers.new('GRID', dxfattribs={'color': 8})            # Γκρι για σταυρουδάκια
        doc.layers.new('GRID_TEXT', dxfattribs={'color': 7})       # Λευκό/Μαύρο για κείμενο αξόνων
        doc.layers.new('TRAVERSE_LINES', dxfattribs={'color': 6})  # Ματζέντα
        doc.layers.new('CONTROL_LINES', dxfattribs={'color': 8, 'linetype': 'DASHED'}) # Γκρι διακεκομμένη
        doc.layers.new('POINTS', dxfattribs={'color': 4})          # Κυανό (Κύκλοι/Τρίγωνα)
        doc.layers.new('POINT_NAMES', dxfattribs={'color': 7})     # Λευκό
        doc.layers.new('DISTANCES', dxfattribs={'color': 7})       # Λευκό
        doc.layers.new('ANGLES', dxfattribs={'color': 8})          # Γκρι
        doc.layers.new('DECORATIONS', dxfattribs={'color': 4})     # Κυανό/Ματζέντα για Βορρά/Κλίμακα
        
        # ==========================================
        # 1. ΣΧΕΔΙΑΣΗ ΚΑΝΑΒΟΥ (GRID)
        # ==========================================
        margin = grid_step * 1.5  # Περιθώριο γύρω από τα σημεία
        
        # Στρογγυλοποίηση στα πλησιέστερα πολλαπλάσια του grid_step
        start_x = math.floor((min_x - margin) / grid_step) * grid_step
        end_x = math.ceil((max_x + margin) / grid_step) * grid_step
        start_y = math.floor((min_y - margin) / grid_step) * grid_step
        end_y = math.ceil((max_y + margin) / grid_step) * grid_step
        
        cross_size = grid_step * 0.025  # Δυναμικό μέγεθος σταυρού βάσει κλίμακας
        text_height = grid_step * 0.12  # Δυναμικό ύψος κειμένου αξόνων
        
        curr_x = start_x
        while curr_x <= end_x + 0.1:
            curr_y = start_y
            
            # Κείμενο Άξονα X (κάτω)
            txt = msp.add_text(f"{curr_x:.0f}", dxfattribs={'height': text_height, 'layer': 'GRID_TEXT', 'style': 'ARIAL'})
            txt.set_placement((curr_x, start_y - text_height*1.5), align=TextEntityAlignment.MIDDLE_RIGHT)
            txt.dxf.rotation = 45
            
            while curr_y <= end_y + 0.1:
                # Σταυρουδάκι
                msp.add_line((curr_x - cross_size, curr_y), (curr_x + cross_size, curr_y), dxfattribs={'layer': 'GRID'})
                msp.add_line((curr_x, curr_y - cross_size), (curr_x, curr_y + cross_size), dxfattribs={'layer': 'GRID'})
                
                # Κείμενο Άξονα Y (αριστερά)
                if abs(curr_x - start_x) < 0.1:
                    txt = msp.add_text(f"{curr_y:.0f}", dxfattribs={'height': text_height, 'layer': 'GRID_TEXT', 'style': 'ARIAL'})
                    txt.set_placement((start_x - text_height*1.5, curr_y), align=TextEntityAlignment.MIDDLE_RIGHT)
                
                curr_y += grid_step
            curr_x += grid_step

        # ==========================================
        # 2. ΣΧΕΔΙΑΣΗ ΣΗΜΕΙΩΝ & ΓΡΑΜΜΩΝ
        # ==========================================
        prev_coord = None
        prev_is_control = False
        r = grid_step * 0.05 # Δυναμικό μέγεθος συμβόλου
        
        for pt in valid_points:
            name = str(pt['name'])
            x_float = pt['x']
            y_float = pt['y']
            current_coord = (x_float, y_float)
            
            is_control = name.startswith('Σ')
            
            # --- Σύμβολο Σημείου ---
            if is_control:
                p1 = (x_float, y_float + r)
                p2 = (x_float - r*0.866, y_float - r*0.5)
                p3 = (x_float + r*0.866, y_float - r*0.5)
                msp.add_lwpolyline([p1, p2, p3, p1], dxfattribs={'layer': 'POINTS'})
            else:
                msp.add_circle(current_coord, radius=r, dxfattribs={'layer': 'POINTS'})
                msp.add_line((x_float - r, y_float), (x_float + r, y_float), dxfattribs={'layer': 'POINTS'})
                msp.add_line((x_float, y_float - r), (x_float, y_float + r), dxfattribs={'layer': 'POINTS'})
            
            # --- Ονόματα & Γωνίες ---
            msp.add_text(name, dxfattribs={'height': r*3.0, 'layer': 'POINT_NAMES', 'style': 'ARIAL'}).set_placement((x_float + r*1.5, y_float + r*1.5))
            
            hz = pt['hz']
            if hz and str(hz).strip() != '---':
                msp.add_text(f"{hz}g", dxfattribs={'height': r*1.8, 'layer': 'ANGLES', 'style': 'ARIAL'}).set_placement((x_float - r*2.5, y_float - r*2.0))
            
            # --- Γραμμές & Αποστάσεις ---
            if prev_coord:
                prev_x, prev_y = prev_coord
                
                if is_control and prev_is_control:
                    line_layer = 'CONTROL_LINES'
                else:
                    line_layer = 'TRAVERSE_LINES'
                    
                msp.add_line(prev_coord, current_coord, dxfattribs={'layer': line_layer})
                
                dx = x_float - prev_x
                dy = y_float - prev_y
                dist = math.hypot(dx, dy)
                mid_x = (prev_x + x_float) / 2.0
                mid_y = (prev_y + y_float) / 2.0
                
                angle_rad = math.atan2(dy, dx)
                angle_deg = math.degrees(angle_rad)
                
                if 90 < angle_deg <= 270:
                    angle_deg -= 180
                elif -180 <= angle_deg < -90:
                    angle_deg += 180
                    
                offset = r * 1.5 
                text_x = mid_x - offset * math.sin(math.radians(angle_deg))
                text_y = mid_y + offset * math.cos(math.radians(angle_deg))
                
                sd = pt['sd']
                dist_str = str(sd) if (sd and str(sd).strip() != '---') else f"{dist:.3f}"
                
                txt = msp.add_text(dist_str, dxfattribs={'height': r*2.0, 'layer': 'DISTANCES', 'style': 'ARIAL'})
                txt.set_placement((text_x, text_y), align=TextEntityAlignment.MIDDLE_CENTER)
                txt.dxf.rotation = angle_deg
                
            prev_coord = current_coord
            prev_is_control = is_control

        # ==========================================
        # 3. ΔΙΑΚΟΣΜΗΤΙΚΑ (ΒΟΡΡΑΣ & ΚΛΙΜΑΚΑ)
        # ==========================================
        # --- ΒΕΛΟΣ ΒΟΡΡΑ ---
        nx = end_x - (grid_step * 0.5)
        ny = end_y - (grid_step * 0.5)
        s_n = grid_step * 0.2  # Συντελεστής μεγέθους βέλους
        msp.add_lwpolyline([(nx, ny), (nx, ny + s_n), (nx - s_n*0.25, ny + s_n*0.66), (nx, ny + s_n*1.33), (nx + s_n*0.25, ny + s_n*0.66), (nx, ny + s_n)], dxfattribs={'layer': 'TRAVERSE_LINES'})
        txt_n = msp.add_text("N", dxfattribs={'height': s_n * 0.6, 'layer': 'POINT_NAMES', 'style': 'ARIAL'})
        txt_n.set_placement((nx, ny - s_n*0.2), align=TextEntityAlignment.TOP_CENTER)
        
        # --- ΔΥΝΑΜΙΚΗ ΓΡΑΦΙΚΗ ΚΛΙΜΑΚΑ (Όπως στο Plot) ---
        target_len = x_range * 0.20
        
        if target_len <= 15:
            bar_len, step = 10, 2.5
        elif target_len <= 35:
            bar_len, step = 20, 5
        elif target_len <= 75:
            bar_len, step = 50, 10
        elif target_len <= 150:
            bar_len, step = 100, 25
        elif target_len <= 350:
            bar_len, step = 200, 50
        elif target_len <= 750:
            bar_len, step = 500, 100
        else:
            bar_len = round(target_len / 100) * 100
            step = bar_len / 4

        sx = start_x + (grid_step * 0.5)
        sy = start_y + (grid_step * 0.5)
        tick_h = grid_step * 0.1

        # Κύρια γραμμή
        msp.add_line((sx, sy), (sx + bar_len, sy), dxfattribs={'layer': 'POINT_NAMES'})

        val = 0
        current_x = sx
        while val <= bar_len + (step * 0.1):
            # Υποδιαιρέσεις
            msp.add_line((current_x, sy), (current_x, sy + tick_h), dxfattribs={'layer': 'POINT_NAMES'})
            
            label_val = int(val) if float(val).is_integer() else val
            label = f"{label_val}" if val < bar_len else f"{label_val}m"
            
            # Νούμερα κλίμακας
            msp.add_text(label, dxfattribs={'height': tick_h*1.2, 'layer': 'POINT_NAMES', 'style': 'ARIAL'}).set_placement((current_x, sy + tick_h*1.5), align=TextEntityAlignment.BOTTOM_CENTER)
            
            current_x += step
            val += step
            
        # Υπόμνημα κλίμακας
        msp.add_text(f"ΚΛΙΜΑΚΑ: 1:{scale_num}", dxfattribs={'height': tick_h*1.5, 'layer': 'DECORATIONS', 'style': 'ARIAL'}).set_placement((sx, sy - tick_h*1.5), align=TextEntityAlignment.TOP_LEFT)

        # ==========================================
        # 4. ΕΞΑΓΩΓΗ
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
    
import json
import traceback

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
            print(f"⚠️ [DEBUG] Σφάλμα αποθήκευσης ZS: {e}")

        return jsonify({
            "status": "success",
            "stations": updated_stations,
            "observations": updated_observations,
            "toleranceReport": tolerance_report
        })

    except Exception as e:
        print(f"💥 [DEBUG ERROR] {traceback.format_exc()}")
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
            print(f"⚠️ Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
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
            print(f"⚠️ Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

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
            
            print(f"✅ ΓΕΦΥΡΑ ΤΑΧΥΜΕΤΡΙΑΣ: Φορτώθηκαν στάσεις από το project '{project_name}'! Σύνολο: {len(df_st)}")
        except Exception as e:
            print(f"⚠️ Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

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
            print(f"❌ Σφάλμα κατά τη δημιουργία του σκαριφήματος ταχυμετρίας: {plot_err}")

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
            print(f"⚠️ Σφάλμα κατά την ανάγνωση του latest_traverse.json: {e}")
            
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
            print(f"⚠️ Σφάλμα κατά την ανάγνωση του project_state.json: {e}")

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
            print(f"⚠️ Σφάλμα κατά τη συγχώνευση των στάσεων: {e}")

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
                print(f"⚠️ Σφάλμα υπολογισμού για στάση {target_st} - {target_or}: {err}")

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

# CHARAXI

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

import base64
import os
from io import BytesIO
from flask import request, jsonify, send_file
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ==========================================
# ΕΓΓΡΑΦΗ ΓΡΑΜΜΑΤΟΣΕΙΡΑΣ ΓΙΑ ΕΛΛΗΝΙΚΑ
# ==========================================
# Βεβαιώσου ότι έχεις το αρχείο arial.ttf (ή dejavu) στον φάκελο του project σου.
# Αν είσαι σε Windows, συνήθως υπάρχει στο 'C:\Windows\Fonts\arial.ttf'
try:
    pdfmetrics.registerFont(TTFont('ArialGreek', 'arial.ttf')) # Βάλε το σωστό path εδώ
    font_name = 'ArialGreek'
except:
    print("Προσοχή: Δεν βρέθηκε η γραμματοσειρά Arial. Τα Ελληνικά μπορεί να μην εμφανίζονται σωστά.")
    font_name = 'Helvetica' # Fallback αν δεν βρει το αρχείο

# ==========================================
# ENDPOINT ΓΙΑ ΕΞΑΓΩΓΗ PDF REPORT (GREEK & LIGHT)
# ==========================================
@app.route('/api/projects/stakeout/report', methods=['POST'])
def export_stakeout_report():
    try:
        data = request.json
        station = data.get('station', {})
        backsight = data.get('backsight', {})
        points = data.get('points', [])
        azimuth_bs = data.get('azimuthBs')
        mij = data.get('mij')
        plot_base64 = data.get('plot')

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=30, 
            leftMargin=30, 
            topMargin=30, 
            bottomMargin=30
        )
        elements = []
        
        # --- Light Palette (Καθαρή & Επαγγελματική) ---
        HEADER_BG = colors.HexColor('#1e293b')     # Σκούρο μπλε/γκρι για το Header
        ROW_BG_1 = colors.HexColor('#ffffff')      # Γραμμή 1 (Λευκό)
        ROW_BG_2 = colors.HexColor('#f8fafc')      # Γραμμή 2 (Απαλό γκρι)
        GRID_COLOR = colors.HexColor('#cbd5e1')    # Διακριτικά περιγράμματα
        
        TEXT_MAIN = colors.HexColor('#0f172a')     # Βασικό κείμενο
        ACCENT_TITLE = colors.HexColor('#0284c7')  # Μπλε ρουά για τίτλο
        ACCENT_BLUE = colors.HexColor('#2563eb')   # Μπλε για Hz
        ACCENT_GREEN = colors.HexColor('#059669')  # Πράσινο για Dist
        ACCENT_AMBER = colors.HexColor('#d97706')  # Πορτοκαλί/Amber για G0

        styles = getSampleStyleSheet()

        # Styles Κειμένου με τη νέα Ελληνική Γραμματοσειρά
        title_style = ParagraphStyle(
            'LightTitle', parent=styles['Title'], fontName=font_name,
            fontSize=16, textColor=ACCENT_TITLE, alignment=1, spaceAfter=15
        )
        text_style = ParagraphStyle(
            'LightText', parent=styles['Normal'], fontName=font_name,
            fontSize=10, textColor=TEXT_MAIN, leading=16
        )
        th_style = ParagraphStyle(
            'LightTH', parent=styles['Normal'], fontName=font_name,
            fontSize=9, textColor=colors.white, alignment=1
        )
        caption_style = ParagraphStyle(
            'Caption', parent=styles['Normal'], fontName=font_name,
            fontSize=9, textColor=colors.HexColor('#64748b'), alignment=1, spaceBefore=5
        )

        # --- Τίτλος ---
        elements.append(Paragraph("Αναφορά Στοιχείων Χάραξης", title_style))
        elements.append(Spacer(1, 10))

        # --- Στοιχεία Στάσης & Προσανατολισμού ---
        st_info = f"<font color='#64748b'>Στάση (St):</font> <b>{station.get('name', '-')}</b> | <font color='#64748b'>X:</font> {station.get('x', '-')} | <font color='#64748b'>Y:</font> {station.get('y', '-')}"
        bs_info = f"<font color='#64748b'>Προσανατολισμός (Bs):</font> <b>{backsight.get('name', '-')}</b> | <font color='#64748b'>X:</font> {backsight.get('x', '-')} | <font color='#64748b'>Y:</font> {backsight.get('y', '-')}"
        
        elements.append(Paragraph(st_info, text_style))
        elements.append(Spacer(1, 3))
        elements.append(Paragraph(bs_info, text_style))
        elements.append(Spacer(1, 15))

        # --- Αποτελέσματα G0 & mij ---
        g0_str = f"{float(azimuth_bs):.4f} g" if azimuth_bs else "---"
        mij_str = f"{float(mij):.5f}" if mij else "---"
        res_info = f"<font color='#64748b'>G:</font> <font color='#d97706'><b>{g0_str}</b></font> &nbsp;|&nbsp; <font color='#64748b'>mᵢⱼ:</font> <font color='#059669'><b>{mij_str}</b></font>"
        elements.append(Paragraph(res_info, text_style))
        elements.append(Spacer(1, 15))

        # --- Πίνακας Χάραξης ---
        t_headers = [
            Paragraph("<b>α/α</b>", th_style),
            Paragraph("<b>Σημείο</b>", th_style),
            Paragraph("<b>X [m]</b>", th_style),
            Paragraph("<b>Y [m]</b>", th_style),
            Paragraph("<b>Hz [grad]</b>", th_style),
            Paragraph("<b>D [m]</b>", th_style)
        ]
        
        table_data = [t_headers]
        for idx, pt in enumerate(points):
            table_data.append([
                str(idx + 1),
                str(pt.get('name', '')),
                f"{float(pt.get('x', 0)):.3f}" if pt.get('x') else "-",
                f"{float(pt.get('y', 0)):.3f}" if pt.get('y') else "-",
                f"{float(pt.get('hz_stake', 0)):.4f}" if pt.get('hz_stake') else "-",
                f"{float(pt.get('dist_stake', 0)):.3f}" if pt.get('dist_stake') else "-"
            ])
            
        t = Table(table_data, colWidths=[35, 80, 85, 85, 85, 85])
        t_style_cmds = [
            ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTNAME', (0,0), (-1,-1), font_name), # Εφαρμογή γραμματοσειράς
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('TEXTCOLOR', (0,1), (3,-1), TEXT_MAIN),
            ('TEXTCOLOR', (4,1), (4,-1), ACCENT_BLUE),
            ('TEXTCOLOR', (5,1), (5,-1), ACCENT_GREEN),
            ('GRID', (0,0), (-1,-1), 0.5, GRID_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]

        for i in range(1, len(table_data)):
            bg = ROW_BG_1 if i % 2 == 1 else ROW_BG_2
            t_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

        t.setStyle(TableStyle(t_style_cmds))
        elements.append(t)
        elements.append(Spacer(1, 25))

# --- Σκαρίφημα με Επαγγελματικό Πλαίσιο ---
        if plot_base64 and "," in plot_base64:
            try:
                encoded_image = plot_base64.split(",")[1]
                img_data = base64.b64decode(encoded_image)
                img_stream = BytesIO(img_data)
                
                # Κάνουμε την εικόνα ελαφρώς μεγαλύτερη για να γεμίζει ωραία τη σελίδα
                img = Image(img_stream, width=480, height=335, kind='proportional')
                
                # Μινιμαλιστικός πίνακας: ΚΑΘΟΛΟΥ padding, ΚΑΘΟΛΟΥ background χρώμα. 
                # Μόνο ένα πολύ λεπτό σκούρο border που εφαρμόζει ακριβώς πάνω στην εικόνα.
                plot_table = Table([[img]], colWidths=[480])
                plot_table.setStyle(TableStyle([
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#0f172a')), # Σούπερ λεπτό, αυστηρό σκούρο περίγραμμα
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ]))
                
                caption = Paragraph("<b>Σχήμα 1:</b> Σκαρίφημα σημείων χάραξης", caption_style)
                
                # KeepTogether: Εξασφαλίζει ότι η εικόνα και η λεζάντα δεν θα κοπούν σε διαφορετικές σελίδες
                elements.append(Spacer(1, 10))
                elements.append(KeepTogether([plot_table, caption]))
                
            except Exception as img_err:
                print(f"Σφάλμα εικόνας: {img_err}")

        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"Stakeout_Report_{station.get('name', 'St')}.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        import traceback
        print(f"Σφάλμα:\n{traceback.format_exc()}")
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
        data = request.json
        
        # Λήψη δεδομένων από το React
        xa = float(data.get('xa', 0))
        ya = float(data.get('ya', 0))
        xb = float(data.get('xb', 0))
        yb = float(data.get('yb', 0))
        a = float(data.get('a', 0))
        b = float(data.get('b', 0))

        # Κλήση της έτοιμης συνάρτησης από το data_proccessing (dpr)
        xm, ym = dpr.empros(xa, ya, xb, yb, a, b)

        # Επιστροφή των αποτελεσμάτων
        return jsonify({"xm": xm, "ym": ym})
        
    except ZeroDivisionError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback
        print(f"Σφάλμα στην Εμπροσθοτομία:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/basic_calc/resect', methods=['POST'])
def calc_resect():
    try:
        data = request.json
        
        # Λήψη των 9 δεδομένων από το React (χωρίς τις εσωτερικές γωνίες A, B, C)
        xa, ya = float(data.get('xa', 0)), float(data.get('ya', 0))
        xb, yb = float(data.get('xb', 0)), float(data.get('yb', 0))
        xc, yc = float(data.get('xc', 0)), float(data.get('yc', 0))
        
        # Οι σκοπευθείσες γωνίες από το άγνωστο σημείο
        a, b, c = float(data.get('a', 0)), float(data.get('b', 0)), float(data.get('c', 0))

        # Κλήση της ενημερωμένης συνάρτησης tienstra (με 9 παραμέτρους)
        xm, ym = dpr.tienstra(xa, ya, xb, yb, xc, yc, a, b, c)

        return jsonify({"xm": xm, "ym": ym})
        
    except ZeroDivisionError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback
        print(f"Σφάλμα στην Οπισθοτομία:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/basic_calc/scale', methods=['POST'])
def calc_scale():
    try:
        data = request.json
        
        # Το input1 από το React αντιστοιχεί στη συντεταγμένη X (Easting)
        xs = float(data.get('input1', 0))
        
        # Το input2 μπορούμε να το αγνοήσουμε ή να το χρησιμοποιήσουμε μελλοντικά
        # (π.χ. για να δέχεται το m_0 ή το R_0 αν χρειαστεί)

        # Κλήση της συνάρτησης υπολογισμού συντελεστή κλίμακας
        k = dpr.sintelestis_klimakas(xs)

        # Επιστροφή του αποτελέσματος στο React (το JSON κλειδί πρέπει να είναι "k")
        return jsonify({"k": k})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα στον Συντελεστή Κλίμακας:\n{traceback.format_exc()}")
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
            
        print(f"✅ ΓΕΦΥΡΑ: Τα δεδομένα χωροστάθμισης αποθηκεύτηκαν στο: '{save_path}'")

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
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)