import pandas as pd
import configuration_settings as cs
import data_proccessing as dpr
import visualization as vis
import matplotlib.pyplot as plt # Προσθήκη για το plt.show() αν χρειαστεί

def run_app_logic(excel_path):
    xls = pd.ExcelFile(excel_path)
    results = {}

    # # 1. Module: Συνόρθωση Σταθμού
    # if 'synorthosi_stathmou' in xls.sheet_names:
    #     print("processing: Adjustment...")
    #     df_adj = pd.read_excel(xls, 'synorthosi_stathmou')
    #     df_adj[['From', 'To', 'Period']] = df_adj[['From', 'To', 'Period']].ffill()
        
    #     # Εκτέλεση υπολογισμών
    #     adj_df, adj_meta = dpr.process_network_data(df_adj)
    #     results['adjustment'] = adj_df
    #     print(results)
    #     # --- ΕΜΦΑΝΙΣΗ ΓΡΑΦΗΜΑΤΟΣ ΣΥΝΟΡΘΩΣΗΣ ---
    #     print("Display Lollipop Chart for alignment errors...")
    #     vis.plot_std_dev_lollipop_df(adj_df)
    #     plt.show() # Αναγκάζει το παράθυρο να εμφανιστεί

    #2. Module: Όδευση
    if 'traverse' in xls.sheet_names:
        print("processing: Traverse...")
        df_trav = pd.read_excel(xls, 'traverse')
        
        # 1. Φόρτωση δεδομένων από το DataFrame (αντί για CSV)
        points = dpr.load_traverse_from_dataframe(df_trav)
        
        # 2. Εκτέλεση όδευσης (Με τις παραμέτρους σου)
        scale = "1:200"       # Κλίμακα
        terrain = "Ομαλό"     # Έδαφος
        klass = "Πρωτεύουσα"  # Τάξη
        
        trav_res, trav_meta = dpr.traverse(
            points, 
            ori_start=True, 
            ori_end=True,
            scale=scale, 
            terrain=terrain, 
            klass=klass
        )
        
        results['traverse'] = trav_res
        
        # 3. Εμφάνιση Μετρικών στο Τερματικό (όπως τα είχες)
        print("\n--- TRAVERSE METRICS & ERRORS ---")
        for k, v in trav_meta["metrics"].items():
            if k == "is_closed":
                print(f"{k:12} = {' CLOSED' if v else ' OPEN'}")
            elif isinstance(v, float):
                print(f"{k:12} = {v:.5f}")
            else:
                print(f"{k:12} = {v}")

        # 4. Εμφάνιση Γραφήματος Όδευσης
        print("Displaying traverse plot...")
        vis.traverse_plot(trav_res)

# #3. Module: Ταχυμετρία
#     # Βάζουμε ένα print για να βλέπεις ποια φύλλα διαβάζει πραγματικά το Python
#     print("Φύλλα που βρέθηκαν στο Excel:", xls.sheet_names) 

#     if 'stations_taxymetria' in xls.sheet_names and 'measurements_taxymetria' in xls.sheet_names:
#         print("processing: Tachymetry (2-sheet mode)...")
        
#         # Καλούμε τη συνάρτηση (υποθέτοντας ότι στο data_proccessing.py είναι όπως την κάναμε πριν)
#         df_tax, st_name, coords = dpr.tachymetry(excel_path) 
#         results['points'] = df_tax

#         print("\n" + "="*75)
#         print(f"📍 ΑΠΟΤΕΛΕΣΜΑΤΑ ΤΑΧΥΜΕΤΡΙΑΣ - ΣΤΑΣΗ: {st_name}")
#         print(f"   Συντεταγμένες Στάσης: X={coords[0]:.3f}, Y={coords[1]:.3f}, Z={coords[2]:.3f}")
#         print("-" * 75)
        
#         if not df_tax.empty:
#             # Χρησιμοποιούμε ΤΑ ΑΚΡΙΒΗ ΟΝΟΜΑΤΑ που δίνει η tachymetry σου:
#             # 'Σημείο', 'X', 'Y', 'Z'
#             cols_to_print = ['Σημείο', 'X', 'Y', 'Z']
            
#             # Εκτύπωση όλων των σημείων με στοίχιση
#             print(df_tax[cols_to_print].to_string(index=False, justify='center'))
#         else:
#         print("WARNING: The DataFrame is empty!")
            
#         print("-" * 75)
#         print(f"Total detail points: {len(df_tax)}")
#         print("="*75 + "\n")
    
#         # --- ΕΜΦΑΝΙΣΗ ΓΡΑΦΗΜΑΤΟΣ ΤΑΧΥΜΕΤΡΙΑΣ ---
#         print(f"Displaying survey map for station {st_name}...")
#         vis.plot_survey_points(df_tax, coords[0], coords[1], station_name=st_name)
#     else:
#         print("WARNING: Missing 'Station' and 'Measurements' sheets for tachymetry!")

# 4. Module: Τριγωνομετρική Υψομετρία
    if 'trig_leveling' in xls.sheet_names:
        print("processing: Trigonometric Leveling...")
        
        # 1. Διαβάζουμε το φύλλο trig_leveling
        df_trig = pd.read_excel(xls, 'trig_leveling')
        
        # 2. Κάνουμε τους υπολογισμούς
        df_trig_res = dpr.trig_leveling(df_trig)
        
        # 3. Αποθηκεύουμε τα αποτελέσματα στο γενικό λεξικό
        results['trig_leveling'] = df_trig_res
        
        # 4. Εμφάνιση του DataFrame στο τερματικό για έλεγχο
        print("\n--- TRIGONOMETRIC LEVELING RESULTS ---")
        # Εμφανίζουμε τις σημαντικές στήλες για να μην γεμίσει η οθόνη
        print(df_trig_res[['From', 'To', 'dh', 'dh_mean']])
    return results
    
if __name__ == "__main__":
    # 1. Αρχικοποίηση φακέλων αν δεν υπάρχουν
    cs.setup_project_structure()
    
    # 2. Ορισμός του Master Excel (π.χ. data/format.xlsx)
    # Χρησιμοποιούμε το όνομα που έχεις ορίσει στο configuration_settings
    master_file = cs.DATA_DIR / "test.xlsx" 
    
    if not master_file.exists():
        print(f"ERROR: Το αρχείο {master_file} δεν βρέθηκε!")
    else:
        print("--- TopoApp Backend (Master Routine) Started ---")
        final_data = run_app_logic(master_file)
        print("\nAll processes completed.")