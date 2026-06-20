import pandas as pd
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import os

import data_proccessing as dpr  # Το αρχείο σου με τις συναρτήσεις
import vis_4_app as vis         # Το αρχείο για τα γραφήματα
from project_manager import TopoProject  # Η κλάση των Projects

app = Flask(__name__)
CORS(app) 

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
            
        return jsonify({
            "results": results,
            "plot": plot_base64
        })
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της συνόρθωσης:\n{traceback.format_exc()}")
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
        points = []
        for m in measurements:
            def to_float(val):
                if val is None or str(val).strip() == "":
                    return None
                return float(val)

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
                calc_H = getattr(results_rr[idx], 'H', None)
                
                updated_row = m.copy()
                if calc_X is not None: updated_row['x'] = fmt(calc_X, 3)
                if calc_Y is not None: updated_row['y'] = fmt(calc_Y, 3)
                if calc_H is not None: updated_row['h'] = fmt(calc_H, 3)
                
                updated_measurements.append(updated_row)
            else:
                updated_measurements.append(m)

        plot_base64 = None
        try:
            plot_base64 = vis.plot_traverse_base64(results_rr)
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
# 3. ENDPOINT ΓΙΑ ΤΑΧΥΜΕΤΡΙΑ (TACHYMETRY) - ΕΝΗΜΕΡΩΜΕΝΟ & ΔΙΟΡΘΩΜΕΝΟ
# ==========================================
@app.route('/api/tachymetry', methods=['POST'])
def run_tachymetry():
    data = request.json
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])

    if not measurements:
        return jsonify({"results": []})

    try:
        # 1. Χαρτογράφηση γνωστών συντεταγμένων στάσεων (υποστηρίζει κεφαλαία XS, YS, ZS από Excel)
        st_lookup = {}
        for st in stations:
            name = str(st.get('Station_Name', st.get('station_name', ''))).strip()
            if name:
                st_lookup[name] = {
                    'x': float(st.get('XS', st.get('x', 0.0)) or 0.0),
                    'y': float(st.get('YS', st.get('y', 0.0)) or 0.0),
                    'z': float(st.get('ZS', st.get('z', 0.0)) or 0.0)
                }

        # 2. Συλλογή των setups οργάνων (από τις στήλες Station, Orientation, HZ_O, Station_Height)
        setups = {}
        for m in measurements:
            st = m.get('Station')
            ori = m.get('Orientation')
            if st and ori:
                st_key = (str(st).strip(), str(ori).strip())
                setups[st_key] = {
                    'hz_o': float(m.get('HZ_O', m.get('hz_o', 0.0)) or 0.0),
                    'station_height': float(m.get('Station_Height', m.get('station_height', 0.0)) or 0.0)
                }

        calculated_points = []

        # 3. Επεξεργασία των πολικών μετρήσεων λεπτομέρειας
        for m in measurements:
            # Διαβάζουμε τις στήλες From και O που προσδιορίζουν τη γραμμή μέτρησης
            st_id = str(m.get('From', m.get('station', ''))).strip()
            bs_id = str(m.get('O', m.get('backsight', ''))).strip()
            point_id = m.get('Point_ID', m.get('pointId', ''))

            # Αν δεν είναι έγκυρη γραμμή μέτρησης σημείου, προσπέρνα την
            if not st_id or not bs_id or not point_id:
                continue

            # Έλεγχος αν υπάρχουν οι στάσεις στο lookup συντεταγμένων
            if st_id not in st_lookup or bs_id not in st_lookup:
                continue

            # Συντεταγμένες Στάσης (S) και Προσανατολισμού (O)
            xs, ys, zs = st_lookup[st_id]['x'], st_lookup[st_id]['y'], st_lookup[st_id]['z']
            xo, yo = st_lookup[bs_id]['x'], st_lookup[bs_id]['y']

            # Υπολογισμός γωνίας διεύθυνσης (αζιμούθιο) στάσης-προσανατολισμού (G_so)
            dx_so = xo - xs
            dy_so = yo - ys
            g_so = math.atan2(dx_so, dy_so) * 200.0 / math.pi
            g_so = normalize_400(g_so)

            # Ανάκτηση HZ_O και ύψους οργάνου από το setup
            setup_info = setups.get((st_id, bs_id), {'hz_o': 0.0, 'station_height': 0.0})
            hz_o = setup_info['hz_o']
            ih = setup_info['station_height']

            # Σταθερά προσανατολισμού (V0)
            v0 = g_so - hz_o

            # Δεδομένα μέτρησης σημείου (με υποστήριξη για κεφαλαία/μικρά κλειδιά)
            hz = float(m.get('Hz', m.get('hz', 0.0)) or 0.0)
            z_angle = float(m.get('Z', m.get('z', 100.0)) or 100.0)
            sd = float(m.get('SD', m.get('sd', 0.0)) or 0.0)
            th = float(m.get('TargetHeight', m.get('targetHeight', 0.0)) or 0.0)

            if sd <= 0:
                continue

            # Υπολογισμός τελικής γωνίας διεύθυνσης προς το σημείο (G_sp)
            g_sp = normalize_400(v0 + hz)

            # Μετατροπή σε ακτίνια και υπολογισμός αποστάσεων
            z_rad = g2r(z_angle)
            hd = sd * math.sin(z_rad)  # Οριζόντια απόσταση
            vd = sd * math.cos(z_rad)  # Υψομετρική διαφορά

            g_rad = g2r(g_sp)
            xp = xs + hd * math.sin(g_rad)
            yp = ys + hd * math.cos(g_rad)
            zp = zs + ih + vd - th

            # Προσθήκη στα αποτελέσματα με κλειδιά που ταιριάζουν ΑΚΡΙΒΩΣ με το React UI
            calculated_points.append({
                "Στάση": st_id,
                "Προσανατολισμός": bs_id,
                "Σημείο": str(point_id),
                "X": round(xp, 3),
                "Y": round(yp, 3),
                "Z": round(zp, 3)
            })

        print(f"Successfully calculated {len(calculated_points)} detail points.")
        return jsonify({"results": calculated_points})

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό ταχυμετρίας:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)