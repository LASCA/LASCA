import json
import os
from pathlib import Path
from datetime import datetime

def get_safe_workspace_dir(app_folder="Topo_Workspace", *, base_dir=None):
    """
    Επιστρέφει τον φάκελο του χρήστη για αποθήκευση δεδομένων.
    """
    workspace_path = (Path(base_dir) if base_dir else Path.home()) / app_folder
    workspace_path.mkdir(parents=True, exist_ok=True)
    return workspace_path


def resolve_project_dir(workspace_dir, project_name: str) -> Path:
    """Return a project directory that is strictly contained in the workspace."""
    if not isinstance(project_name, str) or not project_name.strip():
        raise ValueError("Το όνομα του project είναι υποχρεωτικό")
    if ".." in project_name or "/" in project_name or "\\" in project_name:
        raise ValueError("Μη έγκυρο όνομα project")

    workspace_path = Path(workspace_dir).resolve()
    project_path = (workspace_path / project_name.strip()).resolve()
    try:
        project_path.relative_to(workspace_path)
    except ValueError as exc:
        raise ValueError("Μη έγκυρο όνομα project") from exc
    return project_path


def atomic_write_json(target_path: Path, data: dict) -> None:
    """Persist JSON without exposing a partially written target file."""
    target_path = Path(target_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = Path(f"{target_path}.tmp")
    try:
        with temp_path.open('w', encoding='utf-8') as file_handle:
            json.dump(data, file_handle, indent=4, ensure_ascii=False)
            file_handle.flush()
            os.fsync(file_handle.fileno())
        os.replace(temp_path, target_path)
    finally:
        if temp_path.exists():
            temp_path.unlink()

class TopoProject:
    def __init__(self, workspace_dir, project_name: str):
        self.project_name = str(project_name).strip()
        
        # Αν δεν δοθεί φάκελος ή δοθεί κενός, παίρνει τον ασφαλή φάκελο
        if not workspace_dir:
            self.workspace_dir = get_safe_workspace_dir()
        else:
            self.workspace_dir = Path(workspace_dir).resolve()
            
        self.project_dir = resolve_project_dir(self.workspace_dir, self.project_name)
        
        # Κεντρικοί Φάκελοι δομής
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

    def setup_project_structure(self, initial_settings=None):
        """Δημιουργεί τη δομή φακέλων και το JSON αν δεν υπάρχουν"""
        directories = [
            self.data_dir, self.results_dir, self.reports_dir,
            self.res_charaxi_dir, self.res_odeysi_dir, self.res_taxymetria_dir,
            self.rep_charaxi_dir, self.rep_odeysi_dir, self.rep_taxymetria_dir
        ]
        
        for d in directories:
            d.mkdir(parents=True, exist_ok=True)
            
        if not self.json_file.exists():
            self._create_initial_json(initial_settings or {})
        elif initial_settings:
            state = self.load_state()
            saved_settings = state.setdefault("settings", {})
            for key in ("scale", "terrain", "klass", "designer", "employer", "location"):
                if key in initial_settings:
                    saved_settings[key] = initial_settings[key]
            self.save_state(state)
            
        return self.load_state()

    def _create_initial_json(self, settings: dict):
        """Εσωτερική συνάρτηση που φτιάχνει το αρχικό άδειο state"""
        initial_data = {
            "project_name": self.project_name,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "settings": {
                "scale": settings.get("scale", "1:1000"),
                "terrain": settings.get("terrain", "Ομαλό"),
                "klass": settings.get("klass", "Πρωτεύουσα"),
                "designer": settings.get("designer", ""),
                "employer": settings.get("employer", ""),
                "location": settings.get("location", "")
            },
            "traverse_data": [],
            "metrics": {},
            "plot_image": None
        }
        self.save_state(initial_data)

    def save_state(self, data: dict):
        """Αποθηκεύει τα δεδομένα στο JSON, ενημερώνοντας την ημερομηνία τροποποίησης"""
        data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        atomic_write_json(self.json_file, data)

    def load_state(self) -> dict:
        """Διαβάζει και επιστρέφει τα δεδομένα από το JSON"""
        if self.json_file.exists():
            with open(self.json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

if __name__ == "__main__":
    print("Starting Project Manager test...\n")

    # Αντί για os.getcwd(), παίρνουμε τον σωστό φάκελο του συστήματος
    workspace = get_safe_workspace_dir("Test_Workspace")
    
    test_proj = TopoProject(workspace_dir=str(workspace), project_name="Odos_Ermou")
    
    test_proj.setup_project_structure({
        "scale": "1:1000",
        "terrain": "Ομαλό",
        "klass": "Πρωτεύουσα",
        "designer": "Άκης"
    })
    print(f"Project created successfully at: {test_proj.project_dir}\n")
    
    state = test_proj.load_state()
    print("📄 Αρχική κατάσταση JSON:")
    print(json.dumps(state, indent=4, ensure_ascii=False))
    
    print("\n✍️ Ενημερώνουμε τις ρυθμίσεις του Project...")
    state["settings"]["scale"] = "1:500"
    state["traverse_data"] = [{"name": "Σ1", "hz": "100.0000", "sd": "50.123"}]
    
    test_proj.save_state(state)
    print("JSON updated successfully with the new changes!")