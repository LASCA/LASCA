import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import data_proccessing as dpr  # Το αρχείο σου με τις συναρτήσεις
import vis_4_app as vis         # Το αρχείο για τα γραφήματα

app = Flask(__name__)
CORS(app) 

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
        # Μετατροπή της λίστας JSON σε Pandas DataFrame
        df = pd.DataFrame(observations)
        
        # Μετονομασία στηλών
        df = df.rename(columns={
            'station': 'From',
            'target': 'To',
            'Period': 'Period',
            'Face_I': 'Face I',
            'Face_II': 'Face II'
        })
        
        # Μετατροπή σε αριθμητικές τιμές
        for col in ['From', 'To', 'Period', 'Face I', 'Face II']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # Γέμισμα (forward fill) αν λείπουν From/To/Period
        df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()

        # ΚΛΗΣΗ ΤΟΥ ΑΛΓΟΡΙΘΜΟΥ ΣΥΝΟΡΘΩΣΗΣ
        adj_df, adj_meta = dpr.process_network_data(df)
        
        # Δημιουργία του Γραφήματος
        plot_base64 = vis.plot_std_dev_lollipop_df(adj_df)
        
        # Μετατροπή του adj_df σε JSON-friendly λίστα για το React
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
        # 1. Μετατροπή των λεξικών του React σε αντικείμενα TraversePoint
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
            # Αν η κλάση σου δέχεται και H (υψόμετρο), πρόσθεσέ το εδώ (πχ H=to_float(m.get('h')))
            points.append(pt)

        # 2. Εκτέλεση της Όδευσης
        results_rr, meta = dpr.traverse(
            points=points, 
            scale=scale, 
            terrain=terrain, 
            klass=klass
        )
        
        # 3. Αντιστοίχιση των metrics του Python στα metrics που περιμένει το React
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
        
        # 4. Ενημέρωση των γραμμών με τα υπολογισμένα X, Y
        updated_measurements = []
        for idx, m in enumerate(measurements):
            if idx < len(results_rr):
                # Υποστήριξη για X/Y ή Xi/Yi ανάλογα πώς τα λέει το dataclass σου
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

        return jsonify({
            "results": updated_measurements,
            "metrics": react_metrics
        })

    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της όδευσης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)