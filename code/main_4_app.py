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
            plot_base64 = vis.plot_traverse_base64(results_rr, measurements, scale)
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
#  ENDPOINT ΓΙΑ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ ΥΨΟΜΕΤΡΙΑ (TRAVERSE HEIGHT)
# ==========================================
@app.route('/api/traverse_height', methods=['POST'])
def run_traverse_height():
    try:
        data = request.json
        observations = data.get('observations', [])
        stations = data.get('stations', [])
        
        # Προσπαθούμε να πιάσουμε το όνομα του project απευθείας από το JSON
        explicit_project_name = data.get('project_name') or data.get('activeProject')

        if not observations or not stations:
             return jsonify({"error": "Λείπουν δεδομένα παρατηρήσεων ή στάσεων."}), 400

        measurements_json = []

        # 1. Προσθήκη των Στάσεων στο JSON
        for st in stations:
            measurements_json.append({
                "name": st.get("name", ""),
                "h": st.get("h", "")
            })

        # 2. Προσθήκη των Παρατηρήσεων στο JSON
        for obs in observations:
            measurements_json.append({
                "From": obs.get("from", ""),
                "To": obs.get("to", ""),
                "Slope_D [m]": obs.get("s", ""),
                "Z[grad]": obs.get("z", ""),
                "H_station": obs.get("hi", ""),
                "H_target": obs.get("ht", "")
            })

        # 3. Κλήση της συνάρτησης υπολογισμού από το dpr
        calculated_data = dpr.traverse_level_calc(measurements_json)

        # 4. Εξαγωγή ΜΟΝΟ των στάσεων με τα νέα υψόμετρα για το UI
        updated_stations = []
        height_lookup = {} # Ευρετήριο για γρήγορη αναζήτηση των νέων υψομέτρων

        for idx, row in enumerate(calculated_data):
            if 'name' in row and row['name'] != "":
                st_name = str(row.get("name", "")).strip()
                st_h = row.get("h", "")
                
                updated_stations.append({
                    "id": 1000 + idx,  
                    "name": st_name,
                    "h": st_h
                })
                
                # Γεμίζουμε το ευρετήριο μόνο με έγκυρα υψόμετρα
                if st_h != "" and st_h is not None:
                    height_lookup[st_name] = st_h

        # 5. --- ΓΕΦΥΡΑ: ΑΣΦΑΛΗΣ ΕΝΗΜΕΡΩΣΗ ΤΟΥ latest_traverse.json ---
        # Χρησιμοποιούμε είτε το explicit όνομα, είτε τη γενική συνάρτηση του app.py
        project_name = explicit_project_name or get_active_project_name()
        print(f"🔍 [DEBUG TRAVERSE HEIGHT] Το backend διάβασε project_name = '{project_name}'")
        
        project_dir = WORKSPACE_DIR / project_name if project_name else WORKSPACE_DIR
        traverse_file = project_dir / "latest_traverse.json"
        
        if traverse_file.exists():
            try:
                # Βήμα Α: Ανάγνωση υπάρχοντος αρχείου
                with open(traverse_file, 'r', encoding='utf-8') as f:
                    traverse_data = json.load(f)
                
                # Βήμα Β: Στοχευμένη ενημέρωση ΜΟΝΟ του ZS
                updated_count = 0
                for pt in traverse_data:
                    t_name = str(pt.get("Station_Name", "")).strip()
                    
                    if t_name in height_lookup:
                        try:
                            # Αλλάζουμε ΜΟΝΟ το ZS, το XS/YS μένει ανέπαφο!
                            pt["ZS"] = round(float(height_lookup[t_name]), 3)
                            updated_count += 1
                        except ValueError:
                            pass
                
                # Βήμα Γ: Εγγραφή πίσω στο αρχείο
                with open(traverse_file, "w", encoding="utf-8") as f:
                    json.dump(traverse_data, f, ensure_ascii=False, indent=4)
                    
                print(f"✅ Ενημερώθηκαν τα υψόμετρα (ZS) σε {updated_count} στάσεις στο: '{traverse_file}'")
                
            except Exception as e:
                print(f"⚠️ Σφάλμα κατά την ενημέρωση του latest_traverse.json: {e}")
        else:
             print(f"ℹ️ Το latest_traverse.json δεν βρέθηκε στον φάκελο '{project_dir}', τα υψόμετρα δεν αποθηκεύτηκαν στο project.")
        # -------------------------------------------------------------

        return jsonify({
            "status": "success",
            "stations": updated_stations
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά τον υπολογισμό Τριγωνομετρικής Υψομετρίας:\n{traceback.format_exc()}")
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
        
        # Λήψη και των 12 δεδομένων από το React
        xa, ya = float(data.get('xa', 0)), float(data.get('ya', 0))
        xb, yb = float(data.get('xb', 0)), float(data.get('yb', 0))
        xc, yc = float(data.get('xc', 0)), float(data.get('yc', 0))
        
        a, b, c = float(data.get('a', 0)), float(data.get('b', 0)), float(data.get('c', 0))
        A, B, C = float(data.get('A', 0)), float(data.get('B', 0)), float(data.get('C', 0))

        # Κλήση της συνάρτησης tienstra
        xm, ym = dpr.tienstra(xa, ya, xb, yb, xc, yc, a, b, c, A, B, C)

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