import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import data_proccessing as dpr  # Το αρχείο σου (dpr.py ή data_proccessing.py)

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
        
        # 2. Μετονομασία στηλών για να ταιριάζουν με αυτές που ζητάει το dpr.py
        df = df.rename(columns={
            'station': 'From',
            'target': 'To',
            'Period': 'Period',
            'Face_I': 'Face I',
            'Face_II': 'Face II'
        })
        
        # 3. Μετατροπή σε αριθμητικές τιμές (για να μην περάσουν ως κείμενο)
        for col in ['From', 'To', 'Period', 'Face I', 'Face II']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # Γέμισμα (forward fill) αν λείπουν From/To/Period
        df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()

        # 4. ΚΛΗΣΗ ΤΟΥ ΔΙΚΟΥ ΣΟΥ ΑΛΓΟΡΙΘΜΟΥ
        # Επιστρέφει το DataFrame με τις συνορθωμένες τιμές
        adj_df, adj_meta = dpr.process_network_data(df)
        
        # 5. Μετατροπή του adj_df σε JSON-friendly λίστα για το React
        results = []
        for _, row in adj_df.iterrows():
            # Ασφαλής μορφοποίηση για τη Διεύθυνση
            try:
                # Δοκιμάζουμε να το κάνουμε float για να δώσουμε 4 δεκαδικά
                adj_hz_val = f"{float(row['Διεύθυνση']):.4f}"
            except (ValueError, TypeError):
                # Αν είναι ήδη string (π.χ. "---"), το αφήνουμε ως έχει
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
            
        return jsonify({"results": results})
        
    except Exception as e:
        import traceback
        print(f"Σφάλμα κατά την εκτέλεση της συνόρθωσης:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)