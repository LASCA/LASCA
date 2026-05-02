import pandas as pd
import configuration_settings as cs
import data_proccessing as dpr
import visualization as vis

def run_app_logic(excel_path):
    """
    Κεντρική συνάρτηση που διαχειρίζεται τη ροή του App.
    Διαβάζει το format.xlsx και εκτελεί τους υπολογισμούς modular.
    """
    xls = pd.ExcelFile(excel_path)
    results = {}

    # 1. Module: Συνόρθωση Σταθμού
    if 'synorthosi_stathmou' in xls.sheet_names:
        print("processing: Adjustment...")
        df_adj = pd.read_excel(xls, 'synorthosi_stathmou')
        df_adj[['From', 'To', 'Period']] = df_adj[['From', 'To', 'Period']].ffill()
        adj_df, adj_meta = dpr.process_network_data(df_adj)
        results['adjustment'] = adj_df

    # 2. Module: Όδευση
    if 'traverse' in xls.sheet_names:
        print("processing: Traverse...")
        df_trav = pd.read_excel(xls, 'traverse')
        # Εδώ θα καλέσουμε τη νέα έκδοση της συνάρτησης που θα φτιάξουμε
        # points = dpr.load_traverse_from_dataframe(df_trav)
        # trav_res, trav_meta = dpr.traverse(points)
        # results['traverse'] = trav_res

    # 3. Module: Ταχυμετρία
    if 'measurements_taxymetria' in xls.sheet_names:
        print("processing: Tachymetry...")
        # Η tachymetry μπορεί να διαμορφωθεί να παίρνει το xls object
        df_tax, st_name, coords = dpr.tachymetry(excel_path) 
        results['points'] = df_tax

    return results

if __name__ == "__main__":
    # Το μονοπάτι για το Master Excel
    master_file = cs.DATA_DIR / cs.INPUT
    
    print("--- TopoApp Backend (Main2) Started ---")
    final_data = run_app_logic(master_file)
    
    # Παράδειγμα εμφάνισης αποτελεσμάτων
    if 'adjustment' in final_data:
        print("\nResults from Adjustment:")
        print(final_data['adjustment'].head())