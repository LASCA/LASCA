import configuration_settings as cs
import data_proccessing as dpr
import visualization as vis
import sys


if __name__ == "__main__":
    cs.setup_project_structure() 

    if len(sys.argv) < 2:
            print("Usage: python traverse_core.py input.csv [scale] [terrain] [class]")
            sys.exit(1)

    csv_file = sys.argv[1]
    scale = sys.argv[2] if len(sys.argv) > 2 else "1:200"
    terrain = sys.argv[3] if len(sys.argv) > 3 else "Ομαλό"
    klass = sys.argv[4] if len(sys.argv) > 4 else "Πρωτεύουσα"

    try:
        points = dpr.load_traverse_from_csv(csv_file)
        results, meta = dpr.compute_traverse(points, ori_start=True, ori_end=True,
                                        scale=scale, terrain=terrain, klass=klass)

        # Print results
        print("=== TRAVERSE RESULTS ===")
        for r in results:
            angle_str = f"{r.theta:.4f}" if r.theta is not None else "None"
            g_str = f"{r.G:.4f}" if r.G is not None else "None"
            s_str = f"{r.S:.3f}" if r.S is not None else "None"
            x_str = f"{r.X:.3f}" if r.X is not None else "None"
            y_str = f"{r.Y:.3f}" if r.Y is not None else "None"
            print(f"{r.name:6} θ={angle_str:>8} G={g_str:>8} S={s_str:>8} X={x_str:>12} Y={y_str:>12}")
        print("\n=== METRICS ===")
        for k, v in meta["metrics"].items():
            if k == "is_closed":
                print(f"{k:12} = {'ΚΛΕΙΝΕΙ' if v else 'ΔΕΝ ΚΛΕΙΝΕΙ'}")
            else:
                print(f"{k:12} = {v}")

        # Optionally export to CSV
        out_file = csv_file.replace(".csv", "_results.csv")
        dpr.export_traverse_results_to_csv(results, out_file)
        print(f"\nResults exported to {out_file}")

    except Exception as e:
        print(f"Error: {e}")