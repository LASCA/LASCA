import pandas as pd
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import os, json
import traceback
import data_proccessing as dpr  # Το αρχείο σου με τις συναρτήσεις
import vis_4_app as vis         # Το αρχείο για τα γραφήματα
from project_manager import TopoProject  # Η κλάση των Projects

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
        # 1. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟΝ ΒΟΗΘΗΤΙΚΟ ΠΙΝΑΚΑ 2 (ΥΨΟΜΕΤΡΙΑ)
        leveling_network = None
        if measurements and 'levelingNetwork' in measurements[0]:
            leveling_network = measurements[0]['levelingNetwork']

        # 2. ΑΝ ΥΠΑΡΧΕΙ ΤΟ LEVELING NETWORK, ΚΑΝΟΥΜΕ ΕΞΥΠΝΗ ΑΝΑΣΥΝΘΕΣΗ
        if leveling_network is not None:
            # Κρατάμε ένα καθαρό αντίγραφο των γραμμών του Πίνακα 1 (Όδευση)
            clean_traverse_rows = [m.copy() for m in measurements]
            if 'levelingNetwork' in clean_traverse_rows[0]:
                del clean_traverse_rows[0]['levelingNetwork']

            # Ανασυνθέτουμε τη flat δομή που περιμένει η traverse_level_calc για να μην σπάσει
            flat_data_for_calc = []
            max_len = max(len(clean_traverse_rows), len(leveling_network))
            
            for i in range(max_len):
                row_dict = {}
                
                # Αν είμαστε εντός των ορίων του Πίνακα 1 (Όδευση)
                if i < len(clean_traverse_rows):
                    m = clean_traverse_rows[i]
                    row_dict.update(m)
                    # Δικλίδα ασφαλείας: Διασφαλίζουμε ότι υπάρχουν και τα αυθεντικά Excel keys 
                    # σε περίπτωση που η dpr.traverse_level_calc τα ζητάει έτσι
                    if 'name' in m and 'Stations' not in row_dict: row_dict['Stations'] = m['name']
                    if 'hz' in m and 'Hz [grad]' not in row_dict: row_dict['Hz [grad]'] = m['hz']
                    if 'sd' in m and 'Slope_D [m]' not in row_dict: row_dict['Slope_D [m]'] = m['sd']
                    if 'x' in m and 'X [m]' not in row_dict: row_dict['X [m]'] = m['x']
                    if 'y' in m and 'Y [m]' not in row_dict: row_dict['Y [m]'] = m['y']
                    if 'h' in m and 'H [m]' not in row_dict: row_dict['H [m]'] = m['h']

                # Αν είμαστε εντός των ορίων του Πίνακα 2 (Υψομετρία)
                if i < len(leveling_network):
                    lev_row = leveling_network[i]
                    row_dict['From'] = lev_row.get('From', '')
                    row_dict['To'] = lev_row.get('To', '')
                    row_dict['Slope_D'] = lev_row.get('Slope_D', '')
                    row_dict['Z[grad]'] = lev_row.get('Z[grad]', lev_row.get('Z_grad', ''))
                    row_dict['H_station'] = lev_row.get('H_station', '')
                    row_dict['H_target'] = lev_row.get('H_target', '')

                flat_data_for_calc.append(row_dict)

            # Εκτελούμε τον υψομετρικό υπολογισμό πάνω σε ΟΛΟ το δίκτυο (π.χ. 30 σειρές)
            calculated_flat = dpr.traverse_level_calc(flat_data_for_calc)
            
            # Κρατάμε ΜΟΝΟ τις πρώτες σειρές που αντιστοιχούν στον Πίνακα 1 (Όδευση)
            measurements = calculated_flat[:len(clean_traverse_rows)]
            
            # Συγχρονίζουμε τα αποτελέσματα της Python με τα πεδία που περιμένει το Frontend
            for m in measurements:
                if 'H [m]' in m and m['H [m]'] not in [None, '', '---']:
                    m['h'] = m['H [m]']
                elif 'H[m]' in m and m['H[m]'] not in [None, '', '---']:
                    m['h'] = m['H[m]']
                if 'Stations' in m and m['Stations'] not in [None, '']:
                    m['name'] = m['Stations']
        else:
            # Fallback σε περίπτωση που τα δεδομένα έρθουν με τον παλιό τρόπο
            measurements = dpr.traverse_level_calc(measurements)

        # 3. ΣΥΝΕΧΕΙΑ ΜΕ ΤΗΝ ΟΡΙΖΟΝΤΙΟΓΡΑΦΙΚΗ ΕΠΙΛΥΣΗ (TRAVERSE)
        # Τώρα το measurements έχει ΑΚΡΙΒΩΣ το μέγεθος του Πίνακα 1, με συμπληρωμένα τα Η!
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
                calc_H = getattr(results_rr[idx], 'H', None)
                
                updated_row = m.copy() 
                if calc_X is not None: updated_row['x'] = fmt(calc_X, 3)
                if calc_Y is not None: updated_row['y'] = fmt(calc_Y, 3)
                if calc_H is not None: updated_row['h'] = fmt(calc_H, 3)
                
                updated_measurements.append(updated_row)
            else:
                updated_measurements.append(m)
# --- ΓΕΦΥΡΑ: Αποθήκευση στάσεων ΜΕΣΑ στο ενεργό Project ---
        calculated_stations_export = []
        for pt in results_rr:
            name = getattr(pt, 'name', None)
            calc_X = getattr(pt, 'X', getattr(pt, 'Xi', None))
            calc_Y = getattr(pt, 'Y', getattr(pt, 'Yi', None))
            calc_H = getattr(pt, 'H', None)
            
            if name and calc_X is not None and calc_Y is not None:
                calculated_stations_export.append({
                    "Station_Name": str(name),
                    "XS": float(calc_X),
                    "YS": float(calc_Y),
                    "ZS": float(calc_H) if calc_H is not None else 0.0
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
# 3. ENDPOINT ΓΙΑ ΤΑΧΥΜΕΤΡΙΑ (TACHYMETRY) 
# Πλέον καλεί απευθείας την dpr.tachymetry()!
# ==========================================
@app.route('/api/tachymetry', methods=['POST'])
def run_tachymetry():
    data = request.json
    measurements = data.get('measurements', [])
    stations = data.get('stations', [])
    
    target_station = data.get('station_name')
    target_orientation = data.get('orientation_name')

    if not measurements:
        return jsonify({"results": []})

    # 1. Μετατροπή των λιστών JSON σε Pandas DataFrames
    df_meas = pd.DataFrame(measurements)
    df_st = pd.DataFrame(stations)
    
    # 2. Εξασφάλιση ότι τα ονόματα στηλών στους σταθμούς ταιριάζουν με αυτά που περιμένει η dpr
    rename_st = {}
    for col in df_st.columns:
        if col.lower() in ['station_name', 'station']: rename_st[col] = 'Station_Name'
        if col.lower() in ['xs', 'x']: rename_st[col] = 'XS'
        if col.lower() in ['ys', 'y']: rename_st[col] = 'YS'
        if col.lower() in ['zs', 'z']: rename_st[col] = 'ZS'
    df_st.rename(columns=rename_st, inplace=True)

    project_name = request.headers.get('Active-Project') or request.args.get('project') or request.headers.get('active-project')
    project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
    traverse_file = project_dir / "latest_traverse.json"
    
    if traverse_file.exists():
        try:
            with open(traverse_file, 'r', encoding='utf-8') as f:
                traverse_stations = json.load(f)
            
            if traverse_stations:
                df_trav = pd.DataFrame(traverse_stations)
                
                # 1. Καθαρισμός ονομάτων
                df_st['Station_Name'] = df_st['Station_Name'].astype(str).str.strip()
                df_trav['Station_Name'] = df_trav['Station_Name'].astype(str).str.strip()
                
                # 2. Ένωση
                df_st = pd.concat([df_st, df_trav], ignore_index=True)
                
                # 3. Διαγραφή διπλοτύπων (κρατάμε την Όδευση)
                df_st = df_st.drop_duplicates(subset=['Station_Name'], keep='last')
                
                print(f"✅ ΓΕΦΥΡΑ: Συγχωνεύτηκαν στάσεις από το project '{project_name}'! Συνολικές μοναδικές: {len(df_st)}")
        except Exception as e:
            print(f"⚠️ Σφάλμα κατά τη συγχώνευση των στάσεων από το project: {e}")
    # --------------------------------------------------------------

    try:
        # 3. ΚΑΛΟΥΜΕ ΤΗ ΔΙΚΗ ΣΟΥ ΕΛΕΓΜΕΝΗ ΣΥΝΑΡΤΗΣΗ!
        results_df, _, _ = dpr.tachymetry(
            data_meas=df_meas, 
            data_st=df_st, 
            target_station=target_station,
            target_orientation=target_orientation
        )
        
        calculated_points = results_df.to_dict('records') if not results_df.empty else []

        # 4. Φτιάχνουμε το st_lookup για το γράφημα (Matplotlib)
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


# CHARAXI

@app.route('/api/projects/stakeout', methods=['POST'])
def run_stakeout():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Δεν ελήφθησαν δεδομένα"}), 400

        # Απομόνωση των δεδομένων που στέλνει το React
        station = data.get('station', {})
        backsight = data.get('backsight', {})
        points_to_stake = data.get('points', [])

        # Βασικός έλεγχος εγκυρότητας πριν τον υπολογισμό
        if not station.get('x') or not station.get('y') or not backsight.get('x') or not backsight.get('y'):
            return jsonify({"error": "Συμπληρώστε πρώτα τα δεδομένα Στάσης (X, Y) και Προσανατολισμού (X, Y)!"}), 400

        # Κλήση της συνάρτησης υπολογισμού από το data_proccessing.py
        result = dpr.calculate_stakeout(station, backsight, points_to_stake)

        # Δημιουργία του Τοπογραφικού Γραφήματος!
        try:
            plot_base64 = vis.plot_stakeout_base64(station, backsight, result['points'])
            result['plot'] = plot_base64  # Προσθέτουμε την εικόνα στο dictionary
        except Exception as plot_err:
            print(f"Σφάλμα κατά τη δημιουργία γραφήματος χάραξης: {plot_err}")
            result['plot'] = None

        # Επιστροφή των αποτελεσμάτων και του γραφήματος
        return jsonify(result)

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό χάραξης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)