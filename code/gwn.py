import pandas as pd
import os

def load_specific_sheet(file_path, sheet_name):
    if not os.path.exists(file_path):
        print(f"ERROR: Το αρχείο '{file_path}' δεν βρέθηκε!")
        return None

    try:
        print(f"Loading sheet '{sheet_name}' from file '{file_path}'...")
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        print(f"SUCCESS: Το φύλλο '{sheet_name}' φορτώθηκε με επιτυχία!")
        print("-" * 50)
        return df
    except Exception as e:
        print(f"ERROR: Προέκυψε σφάλμα κατά την ανάγνωση: {e}")
        return None
    
def calc_gwn(dataframe):
    # Αντίγραφο για ασφάλεια
    df = dataframe.copy()
    
    # 1. Μέσος Όρος [ I + (II - 200) ] / 2
    face_I = df['Face I']
    face_II = df['Face II']
    df['mesos_oros'] = (face_I + (face_II - 200)) / 2
    
    # 2. Ανηγμένη Τιμή (αφαίρεση της 1ης μέτρησης κάθε περιόδου)
    df['anigmeni_timi'] = df['mesos_oros'] - df.groupby('Period')['mesos_oros'].transform('first')
    df['anigmeni_timi'] = df['anigmeni_timi'].apply(lambda x: x + 400 if x < 0 else x)
    
    # 3. Γενικός Μέσος Όρος ανά σημείο σκόπευσης ("To")
    # Υπολογίζουμε τον μέσο όρο των ανηγμένων τιμών για κάθε στόχο ("To") σε όλο το dataframe
    genikos_mesos_map = df.groupby('To')['anigmeni_timi'].mean().to_dict()
    df['genikos_mesos'] = df['To'].map(genikos_mesos_map)
    
    # 4. Υπολογισμός v_ji = (Γενικός Μέσος - Ανηγμένη Τιμή) σε cc
    # Πολλαπλασιάζουμε με 10000 για να μετατρέψουμε τα grad σε cc (1 grad = 10000 cc)
    df['v_m'] = (df['genikos_mesos'] - df['anigmeni_timi']) * 10000
    
    # 5. Υπολογισμός v'_j (Διόρθωση σταθμού ανά περίοδο)
    # Βρίσκουμε το μέσο όρο των v_ji για κάθε περίοδο 'Period'
    v_prime_map = df.groupby('Period')['v_m'].mean().to_dict()
    df['v_prime'] = df['Period'].map(v_prime_map)
    
    # 6. Υπολογισμός v_ji'' = v_ji - v'_j
    df['v_ji'] = df['v_m'] - df['v_prime']
    
    # 7. Υπολογισμός vv = (v_ji'')^2
    df['vv'] = df['v_ji'] ** 2
    
    return df

if __name__ == "__main__":
    EXCEL_FILE = "../data/test.xlsx"  # Το όνομα του Excel αρχείου σου
    SHEET_TO_LOAD = "gwniometriseis"  # Το όνομα του φύλλου
    
    # 1. Φόρτωση
    df_goniometry = load_specific_sheet(EXCEL_FILE, SHEET_TO_LOAD)
    
    if df_goniometry is not None:
        # 2. Υπολογισμός
        df_results = calc_gwn(df_goniometry)
        
        # Εμφάνιση των αποτελεσμάτων για έλεγχο
        print("\nRESULTS: Αποτελέσματα Υπολογισμών:")
        print(df_results[['Period', 'From', 'To', 'Face I', 'Face II', 'mesos_oros', 'anigmeni_timi','genikos_mesos', 'v_m', 'v_prime', 'v_ji', 'vv'  ]].to_string(index=False))