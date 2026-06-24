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

    # 2. Απομόνωση δεδομένων πρώτου πίνακα (Υψόμετρα)
    df_stations = pd.DataFrame({
        'Stations': df_raw.iloc[:, 0],
        'H_m': df_raw.iloc[:, 5]
    })
    df_stations = df_stations.dropna(subset=['Stations']).copy()
    df_stations['Stations'] = df_stations['Stations'].astype(str).str.strip()
    df_stations['H_m'] = pd.to_numeric(df_stations['H_m'], errors='coerce')

    # 3. Απομονώνουμε τις στήλες του δεξιού πίνακα (Μετρήσεις)
    leveling_cols = ['From', 'To', 'Slope_D', 'Z[grad]', 'H_station', 'H_target']
    df_measurements = df_raw[leveling_cols].dropna(subset=['From', 'To']).copy()
    
    df_measurements['From'] = df_measurements['From'].astype(str).str.strip()
    df_measurements['To'] = df_measurements['To'].astype(str).str.strip()
    
    for col in ['Slope_D', 'Z[grad]', 'H_station', 'H_target']:
        df_measurements[col] = pd.to_numeric(df_measurements[col], errors='coerce').fillna(0.0)

    # 4. Αρχικός υπολογισμός του dh ανά σειρά από τη συνάρτησή σου
    df_results = dpr.trig_leveling(df_measurements)

    # 5. ΔΥΝΑΜΙΚΗ ΕΝΟΠΟΙΗΣΗ ΠΟΛΛΑΠΛΩΝ ΠΕΡΙΟΔΩΝ
    df_results['pair_key'] = df_results.apply(
        lambda row: "_".join(sorted([str(row['From']), str(row['To'])])), axis=1
    )
    
    df_results['dh_for_mean'] = df_results['dh']
    df_results.iloc[1::2, df_results.columns.get_loc('dh_for_mean')] = -df_results.iloc[1::2]['dh']
    
    global_mean = df_results.groupby('pair_key')['dh_for_mean'].transform('mean')
    
    df_results['dh_mean'] = global_mean
    df_results.iloc[1::2, df_results.columns.get_loc('dh_mean')] = -df_results.iloc[1::2]['dh_mean']
    
    # 6. ΦΙΛΤΡΑΡΙΣΜΑ ΓΙΑ ΤΟ ΤΕΛΙΚΟ DATAFRAME ΜΕΤΑΒΑΣΕΩΝ (Κρατάμε float για τις πράξεις)
    df_forward_only = df_results.iloc[0::2].copy()
    df_final_vectors = df_forward_only[['From', 'To', 'dh_mean']].reset_index(drop=True)

    # =========================================================================
    # 7. ΝΕΟ: ΑΛΥΣΙΔΩΤΟΣ ΥΠΟΛΟΓΙΣΜΟΣ ΥΨΟΜΕΤΡΩΝ (ΣΥΝΔΕΣΗ ΤΩΝ ΔΥΟ DF)
    # =========================================================================
    
    # Δημιουργούμε ένα λεξικό (dictionary) για να αποθηκεύουμε δυναμικά τα υψόμετρα των σταθμών
    # Ξεκινάμε βάζοντας τις ήδη γνωστές τιμές από τον αριστερό πίνακα (π.χ. Σ7=60.709, Σ6=59.706)
    known_heights = df_stations.dropna(subset=['H_m']).set_index('Stations')['H_m'].to_dict()
    
    # Θέλουμε να ξεκινήσουμε την αλυσίδα από το υψόμετρο του Σ6 που ξεκινάει η όδευση στον δεξιό πίνακα
    current_station = df_final_vectors.iloc[0]['From']  # Αυτό είναι το 'Σ6'
    
    # Διατρέχουμε τα διανύσματα ένα-ένα για να υπολογίσουμε τις στάσεις
    for _, vector in df_final_vectors.iterrows():
        start_node = vector['From']
        end_node = vector['To']
        dh = vector['dh_mean']
        
        # Αν έχουμε το υψόμετρο του σταθμού εκκίνησης, υπολογίζουμε τον επόμενο
        if start_node in known_heights:
            calculated_height = known_heights[start_node] + dh
            # Αποθηκεύουμε το νέο υψόμετρο (αν δεν είναι ήδη κλειδωμένο εξαρτημένο υψόμετρο στο τέλος)
            if end_node not in known_heights or end_node.startswith('S') or end_node.isdigit():
                known_heights[end_node] = round(calculated_height, 3)

    # Ενημερώνουμε τη στήλη H_m του df_stations χρησιμοποιώντας το λεξικό μας
    # Επειδή ο αριστερός πίνακας έχει διπλότυπα (π.χ. Σ6 στην αρχή και στο τέλος), 
    # ανιχνεύουμε τις ενδιάμεσες στάσεις για να μην πειράξουμε τα γνωστά υψόμετρα ελέγχου στο τέλος.
    for idx, row in df_stations.iterrows():
        st_name = row['Stations']
        # Αν η τιμή είναι NaN ή αν πρόκειται για ενδιάμεση στάση (S1, S2...), τη συμπληρώνουμε
        if pd.isna(row['H_m']) and st_name in known_heights:
            df_stations.at[idx, 'H_m'] = known_heights[st_name]
            
    # Μετατροπή της dh_mean σε string για την τελική εμφάνιση
    df_final_vectors['dh_mean'] = df_final_vectors['dh_mean'].apply(lambda x: f"{x:.3f}")
    # =========================================================================

    # 8. Εμφάνιση του ΠΡΩΤΟΥ πίνακα (Τώρα ΠΛΗΡΗΣ, χωρίς NaN!)
    print("\n" + "="*50)
    print("      ΕΝΗΜΕΡΩΜΕΝΑ ΥΨΟΜΕΤΡΑ ΣΤΑΘΜΩΝ (ΑΡΙΣΤΕΡΟΣ ΠΙΝΑΚΑΣ)")
    print("="*50)
    print(df_stations.to_string(index=False))
    print("="*50)

    # 9. Εμφάνιση του ΤΕΛΙΚΟΥ καθαρού πίνακα διανυσμάτων
    print("\n" + "="*50)
    print("      ΤΕΛΙΚΟ DATAFRAME: ΜΟΝΟ ΜΕΤΑΒΑΣΕΙΣ & DH_MEAN")
    print("="*50)
    print(df_final_vectors.to_string(index=False))
    print("="*50 + "\n")
    
    return df_stations, df_final_vectors

if __name__ == "__main__":
    target_file = r"C:\Users\akara\OneDrive\Desktop\survey_project\data\test.xlsx"
    
    if os.path.exists(target_file):
        df_stat, df_final = run_survey_calculations(target_file)
    else:
        print(f"❌ Το αρχείο δεν βρέθηκε στη διαδρομή: {target_file}")