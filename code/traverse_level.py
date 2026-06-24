import os
import numpy as np
import pandas as pd
import data_proccessing as dpr

def run_survey_calculations(file_path):
    print(f"🔄 Φόρτωση αρχείου: {file_path}")
    
    # 1. Ανάγνωση του φύλλου 'traverse'
    try:
        df_raw = pd.read_excel(file_path, sheet_name='traverse')
    except Exception as e:
        print(f"❌ Σφάλμα κατά την ανάγνωση: {e}")
        return

    # 2. Απομονώνουμε τις στήλες του δεξιού πίνακα (Μετρήσεις)
    leveling_cols = ['From', 'To', 'Slope_D', 'Z[grad]', 'H_station', 'H_target']
    df_measurements = df_raw[leveling_cols].dropna(subset=['From', 'To']).copy()
    
    # Καθαρισμός string (κενά διαστήματα) στα ονόματα των σταθμών
    df_measurements['From'] = df_measurements['From'].astype(str).str.strip()
    df_measurements['To'] = df_measurements['To'].astype(str).str.strip()
    
    # Μετατροπή στηλών σε αριθμητικές τιμές
    for col in ['Slope_D', 'Z[grad]', 'H_station', 'H_target']:
        df_measurements[col] = pd.to_numeric(df_measurements[col], errors='coerce').fillna(0.0)

    # 3. Κλήση της δικής σου συνάρτησης
    df_results = dpr.trig_leveling(df_measurements)

    # 4. Εμφάνιση των αποτελεσμάτων στην οθόνη
    print("\n" + "="*90)
    print("      ΑΠΟΤΕΛΕΣΜΑΤΑ ΒΑΣΕΙ ΤΗΣ ΣΥΝΑΡΤΗΣΗΣ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ ΥΨΟΜΕΤΡΙΑΣ (trig_leveling)")
    print("="*90)
    print(df_results.to_string(index=False))
    print("="*90 + "\n")
    
    return df_results

if __name__ == "__main__":
    # Ορισμός του Path του αρχείου σου
    target_file = r"C:\Users\akara\OneDrive\Desktop\survey_project\data\test.xlsx"
    
    if os.path.exists(target_file):
        run_survey_calculations(target_file)
    else:
        print(f"❌ Το αρχείο δεν βρέθηκε στη διαδρομή: {target_file}")