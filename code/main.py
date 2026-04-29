import configuration_settings as cs
import data_proccessing as dpr
import visualization as vis
import sys
import pandas as pd


if __name__ == "__main__":
    
    cs.setup_project_structure() 

    #ταχυμετρια
    input_file = cs.DATA_DIR / cs.TAXYMETRIA_INPUT

    try:
        # Κλήση της συνάρτησης - Όλα τα δεδομένα (Στάση & Μετρήσεις) είναι μέσα στο Excel
        df_results, st_name, st_coords = dpr.tachymetry(input_file, apply_scale=True, scale_factor=1)
        
        xs_val = st_coords[0]
        ys_val = st_coords[1]

        vis.plot_survey_points(df_results, xs_val, ys_val, station_name= st_name)
        
        # Έλεγχος αν το DataFrame είναι άδειο
        if df_results.empty:
            print("Προσοχή: Δεν βρέθηκαν έγκυρα δεδομένα προς υπολογισμό.")
        else:
            print("\nΥπολογισμένες Συντεταγμένες:")
            print(df_results.to_string(index=False))
            
    except FileNotFoundError:
        print(f"Σφάλμα: Το αρχείο '{input_file}' δεν βρέθηκε.")
    except Exception as e:
        print(f"Παρουσιάστηκε σφάλμα κατά την εκτέλεση: {e}")

    # #συνορθωση σταθμου
    # input_file = cs.DATA_DIR / cs.SYN_STATHMOY_INPUT

    # try:
    #     # 2. Διαβάζουμε τα δεδομένα (όπως το έκανες στο UI)
    #     print(f"📖 Διαβάζω το αρχείο: {input_file}...")
    #     df = pd.read_csv(input_file, sep=';')
    #     df.columns = ['From', 'To', 'Period', 'Face_I', 'Face_II']
    #     df[['From', 'To', 'Period']] = df[['From', 'To', 'Period']].ffill()

    #     # 3. Τρέχουμε τη συνόρθωση
    #     print("⚙️ Εκτέλεση συνόρθωσης...")
    #     results_df, detailed_analysis = dpr.process_network_data(df)

    #     # 4. Τυπώνουμε τα αποτελέσματα στο τερματικό
    #     print("\n📊 --- ΑΠΟΤΕΛΕΣΜΑΤΑ ---")
    #     print(results_df.to_string(index=False))

    #     vis.plot_std_dev_lollipop_df(results_df)

    # except FileNotFoundError:
    #     print(f"❌ Σφάλμα: Δεν βρέθηκε το αρχείο {input_file}. Φτιάξε ένα δοκιμαστικό CSV!")
    

    # #odeysi     

    # csv_file = cs.DATA_DIR / cs.ODEUSI_INPUT
    # scale = "1:200"       # Κλίμακα
    # terrain = "Ομαλό"     # Έδαφος
    # klass = "Πρωτεύουσα"  # Τάξη


    # print("===" * 15)
    # print(" 🚀 TopoStation - Traverse Calculator")
    # print("===" * 15)
    # print(f"📖 Ανάγνωση αρχείου: {csv_file}")
    # print(f"⚙️ Παράμετροι: Κλίμακα={scale}, Έδαφος={terrain}, Τάξη={klass}\n")

    # try:
    #     # 1. Φόρτωση δεδομένων
    #     points = dpr.load_traverse_from_csv(csv_file)
        
    #     # 2. Εκτέλεση όδευσης
    #     results, meta = dpr.traverse(points, ori_start=True, ori_end=True,
    #                                  scale=scale, terrain=terrain, klass=klass)

    #     # 3. Εμφάνιση Αποτελεσμάτων
    #     print("📊 --- ΑΠΟΤΕΛΕΣΜΑΤΑ ΟΔΕΥΣΗΣ ---")
    #     for r in results:
    #         angle_str = f"{r.theta:.4f}" if r.theta is not None else "None"
    #         g_str = f"{r.G:.4f}" if r.G is not None else "None"
    #         s_str = f"{r.S:.3f}" if r.S is not None else "None"
    #         x_str = f"{r.X:.3f}" if r.X is not None else "None"
    #         y_str = f"{r.Y:.3f}" if r.Y is not None else "None"
            
    #         print(f"{r.name:6} θ={angle_str:>8} G={g_str:>8} S={s_str:>8} X={x_str:>12} Y={y_str:>12}")
        
    #     # 4. Εμφάνιση Μετρικών
    #     print("\n📈 --- ΜΕΤΡΙΚΑ & ΣΦΑΛΜΑΤΑ ---")
    #     for k, v in meta["metrics"].items():
    #         if k == "is_closed":
    #             print(f"{k:12} = {' ΚΛΕΙΝΕΙ' if v else ' ΔΕΝ ΚΛΕΙΝΕΙ'}")
    #         elif isinstance(v, float):
    #             print(f"{k:12} = {v:.5f}")
    #         else:
    #             print(f"{k:12} = {v}")

    #     vis.traverse_plot(results)
        

    #     # # 5. Εξαγωγή αποτελεσμάτων
    #     # out_file = csv_file.replace(".csv", "_results.csv")
    #     # dpr.export_traverse_results_to_csv(results, out_file)
    #     # print(f"\n💾 Αποθηκεύτηκαν στο: {out_file}")

    # except Exception as e:
    #     print(f"\n❌ Σφάλμα κατά την εκτέλεση: {e}")
   

    # #trigonometriki ypsometria
    # input = cs.DATA_DIR / cs.TRIG_LEVEL_INPUT

    # try:
    #     # 1. Διαβάζουμε το αρχείο
    #     df = pd.read_excel(input)

    #     # 2. Περνάμε το dataframe στη συνάρτησή σου για να υπολογίσει το dh
    #     df_results = dpr.trig_leveling(df)

    #     # 3. Απλό print για να δούμε το τελικό dataframe!
    #     print(f"\nΑποτελέσματα Τριγωνομετρικής Υψομετρίας\n{df_results}")

    # except FileNotFoundError:
    #     print(f"Σφάλμα: Το αρχείο '{input}' δεν βρέθηκε.")
    # except Exception as e:
    #     print(f"Προέκυψε σφάλμα: {e}")

    