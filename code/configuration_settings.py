from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Ρυθμίσεις φακέλων (σχετικά με τη βάση του project)
DATA_DIR = BASE_DIR / "data"
RESULTS_DIR = BASE_DIR / "results"
REPORTS_DIR = BASE_DIR / "reports"

#Υποφάκελοι μέσα στουσ βασικούς
    # Μέσα στον βασικό φάκελο Results δημιουργω 3 φακέλους που θα αποθηκευτούν αντίστοιχα τα εξαγόμενα 
RES_CHARAXI_DIR = RESULTS_DIR / "charaxi"
RES_ODEYSI_DIR = RESULTS_DIR / "odeusi"
RES_TAXYMETRIA_DIR =RESULTS_DIR / "taxymetria"
    # Μέσα στον βασικό φάκελο Reports δημιουργω 3 φακέλους που θα αποθηκευτούν αντίστοιχα τα διαγράμματα 
REP_CHARAXI_DIR = REPORTS_DIR / "charaxi"
REP_ODEYSI_DIR = REPORTS_DIR / "odeusi"
REP_TAXYMETRIA_DIR =REPORTS_DIR / "taxymetria"

#Δημιουργώ λίστα με όλα τα directories 
directories = [
    DATA_DIR, RESULTS_DIR, REPORTS_DIR,
    RES_CHARAXI_DIR, RES_ODEYSI_DIR, RES_TAXYMETRIA_DIR,
    REP_CHARAXI_DIR, REP_ODEYSI_DIR, REP_TAXYMETRIA_DIR
]

ODEUSI_INPUT = "RYM.csv"
#ODEUSI_INPUT = "od1.csv"
#ODEUSI_INPUT = "od2.csv"
SYN_STATHMOY_INPUT = "SAMPLEINPUTFILE_HZ.csv"
TRIG_LEVEL_INPUT = "sample_trig_level.xlsx"
TAXYMETRIA_INPUT = "sample_taxymetria.xlsx"

INPUT = "format_new.xlsx"

def setup_project_structure():
    # Ελέγχω αν υπάρχουν τα directories αν οχι τα δημιουργω στην θέση που πρέπει 
    for d in directories:
        d.mkdir(parents=True, exist_ok=True)
    print("Project structure is ready!")
