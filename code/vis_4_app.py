import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
import matplotlib
matplotlib.use('Agg') # ΚΡΙΣΙΜΟ: Λέει στη matplotlib να μην προσπαθήσει να ανοίξει GUI

def plot_std_dev_lollipop_df(results_df: pd.DataFrame) -> str:
    # 1. Επεξεργασία του DataFrame
    results_df['σ (cc)'] = results_df['σ (cc)'].astype(float)
    df_unique = results_df.groupby('Στάση')['σ (cc)'].first().reset_index()
    df_unique = df_unique.sort_values(by='Στάση')

    names = df_unique['Στάση'].astype(str).tolist()
    stds = df_unique['σ (cc)'].tolist()

    if not names:
        return ""

    # 2. Στήσιμο του καμβά
    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor('#030712') # Το άλλαξα ελαφρώς για να ταιριάζει ακριβώς με το bg του React σου
    ax.set_facecolor('#030712')

    # 3. LOLLIPOP CHART LOGIC
    ax.vlines(x=names, ymin=0, ymax=stds, color='#00FFFF', linewidth=2.5, alpha=0.8)
    ax.scatter(names, stds, color='#00FFFF', s=150, alpha=0.3, zorder=4)
    ax.scatter(names, stds, color='#00FFFF', edgecolors='white', linewidths=1.5, s=60, zorder=5)

    # 4. Αισθητικές παρεμβάσεις
    ax.set_title("Τυπικές Αποκλίσεις Στάσεων", loc='left', fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel("Στάση Οργάνου", fontsize=11, fontweight='bold')
    ax.set_ylabel("Τυπική Απόκλιση σ (cc)", fontsize=11, fontweight='bold')
    
    ax.set_ylim(bottom=0)
    ax.grid(True, linestyle=':', alpha=0.3, axis='y')
    ax.axhline(0, color='#333333', linewidth=2)

    # --- Η ΛΥΣΗ ΓΙΑ ΤΟ WEB ---
    # Αντί για plt.show(), το σώζουμε σε buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', transparent=True)
    buf.seek(0)
    
    # Μετατροπή σε Base64 string
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    # ΚΡΙΣΙΜΟ: Κλείνουμε το figure για να μην ξεμείνει ο server από RAM!
    plt.close(fig) 
    
    return image_base64