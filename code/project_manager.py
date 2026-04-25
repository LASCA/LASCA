import json
from pathlib import Path
from datetime import datetime

class TopoProject:
    def __init__(self, workspace_dir: str, project_name: str):
        """
        Αρχικοποιεί ένα νέο ή υπάρχον Project.
        workspace_dir: Ο κεντρικός φάκελος που σώζονται όλα τα projects του χρήστη
        project_name: Το όνομα του συγκεκριμένου project
        """
        self.project_name = project_name
        # Το κεντρικό folder ΑΥΤΟΥ του project (π.χ. C:/TopoWorkspace/Odos_Ermou)
        self.project_dir = Path(workspace_dir) / project_name
        
        # --- Δυναμικές Ρυθμίσεις Φακέλων ---
        self.data_dir = self.project_dir / "data"
        self.results_dir = self.project_dir / "results"
        self.reports_dir = self.project_dir / "reports"

        # Υποφάκελοι μέσα στο results
        self.res_charaxi_dir = self.results_dir / "charaxi"
        self.res_odeysi_dir = self.results_dir / "odeusi"
        self.res_taxymetria_dir = self.results_dir / "taxymetria"
        
        # Υποφάκελοι μέσα στο reports
        self.rep_charaxi_dir = self.reports_dir / "charaxi"
        self.rep_odeysi_dir = self.reports_dir / "odeusi"
        self.rep_taxymetria_dir = self.reports_dir / "taxymetria"

        # Το αρχείο-"εγκέφαλος" του project
        self.json_file = self.project_dir / "project_data.json"

    def setup_project_structure(self):
        """Δημιουργεί τη δομή φακέλων και το αρχικό JSON αν δεν υπάρχουν"""
        directories = [
            self.data_dir, self.results_dir, self.reports_dir,
            self.res_charaxi_dir, self.res_odeysi_dir, self.res_taxymetria_dir,
            self.rep_charaxi_dir, self.rep_odeysi_dir, self.rep_taxymetria_dir
        ]
        
        for d in directories:
            d.mkdir(parents=True, exist_ok=True)
            
        # Δημιουργία του JSON αν είναι νέο project
        if not self.json_file.exists():
            self._create_initial_json()
            
        print(f"✅ Φορτώθηκε το Project: {self.project_name}")

    def _create_initial_json(self):
        """Εσωτερική συνάρτηση που φτιάχνει το αρχικό άδειο state"""
        initial_data = {
            "project_name": self.project_name,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "settings": {},
            "files": {}
        }
        self.save_state(initial_data)

    def save_state(self, data: dict):
        """Αποθηκεύει τα δεδομένα στο JSON"""
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def load_state(self) -> dict:
        """Διαβάζει τα δεδομένα από το JSON"""
        if self.json_file.exists():
            with open(self.json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

if __name__ == "__main__":
    print("🚀 Ξεκινάει το Test του Project Manager...\n")

    # 1. Ορίζουμε πού θα σώζονται τα projects (ας βάλουμε έναν φάκελο "Test_Workspace" δίπλα στον κώδικά σου)
    import os
    current_folder = os.getcwd() # Παίρνει το φάκελο που βρίσκεσαι τώρα
    workspace = Path(current_folder) / "Test_Workspace"
    
    # 2. Φτιάχνουμε ένα εικονικό project
    test_proj = TopoProject(workspace_dir=str(workspace), project_name="Odos_Ermou")
    
    # 3. Τρέχουμε τη δημιουργία φακέλων
    test_proj.setup_project_structure()
    print(f"📁 Το project δημιουργήθηκε στο: {test_proj.project_dir}\n")
    
    # 4. Ας δούμε τι έχει το JSON αρχικά!
    state = test_proj.load_state()
    print("📄 Αρχική κατάσταση JSON:")
    print(json.dumps(state, indent=4, ensure_ascii=False))
    
    # 5. Ας προσθέσουμε κάτι στο JSON για να δούμε αν σώζει σωστά (π.χ. μια κλίμακα)
    print("\n✍️ Ενημερώνουμε τις ρυθμίσεις του Project...")
    state["settings"]["scale"] = "1:500"
    state["settings"]["designer"] = "Άκης"
    state["files"]["traverse_input"] = "inputs/rym.csv"
    
    # 6. Το αποθηκεύουμε
    test_proj.save_state(state)
    print("✅ Το JSON ενημερώθηκε επιτυχώς!")
    print("👉 Δες τώρα στο αριστερό μενού του VS Code! Θα δεις τον νέο φάκελο 'Test_Workspace'.")