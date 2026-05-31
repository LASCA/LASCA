import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import data_proccessing as dpr  # Το αρχείο σου (dpr.py ή data_proccessing.py)
import vis_4_app as vis         # ΝΕΟ: Το αρχείο για τα γραφήματα

app = Flask(__name__)
CORS(app) 

@app.route('/api/adjustment', methods=['POST'])
def run_adjustment():
    data = request.json
    observations = data.get('measurements', [])
    
    print(f"Received {len(observations)} observations from React.")
    
    if not observations:
        return jsonify({"results": []})
        
    try:
        # 1. Μετατροπή της λίστας JSON σε Pandas DataFrame
        df = pd.DataFrame(observations)
        
        # 2. Μετονομασία στηλών
        df = df.rename(columns={
            'station': 'From',
            'target': 'To',
            'Period': 'Period',
            'Face_I': 'Face I',
            'Face_II': 'Face II'
        })
        
        # 3. Μετατροπή σε αριθμητικές τιμές
        for col in ['From', 'To', 'Period', 'Face I', 'Face II']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # Γέμισμα (forward fill) αν λείπουν From/To/Period
        df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()

        # 4. ΚΛΗΣΗ ΤΟΥ ΔΙΚΟΥ ΣΟΥ ΑΛΓΟΡΙΘΜΟΥ
        adj_df, adj_meta = dpr.process_network_data(df)
        
        # --- ΝΕΟ: Δημιουργία του Γραφήματος ---
        # Καλούμε τη συνάρτηση που επιστρέφει το Base64 string
        plot_base64 = vis.plot_std_dev_lollipop_df(adj_df)
        
        # 5. Μετατροπή του adj_df σε JSON-friendly λίστα για το React
        results = []
        for _, row in adj_df.iterrows():
            # Ασφαλής μορφοποίηση για τη Διεύθυνση
            try:
                adj_hz_val = f"{float(row['Διεύθυνση']):.4f}"
            except (ValueError, TypeError):
                adj_hz_val = str(row['Διεύθυνση'])
                
            # Ασφαλής μορφοποίηση για το σ (cc)
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
            
        # --- ΝΕΟ: Επιστροφή και των αποτελεσμάτων και της εικόνας ---
        return jsonify({
            "results": results,
            "plot": plot_base64
        })
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της συνόρθωσης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)