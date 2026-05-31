import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
import matplotlib
import numpy as np
from matplotlib.ticker import MultipleLocator
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


def plot_traverse_base64(results: list) -> str:
    # Βοηθητική συνάρτηση για ΑΣΦΑΛΗ ανάγνωση των ιδιοτήτων χωρίς να κρασάρει η Python
    def get_val(obj, key1, key2):
        val = getattr(obj, key1, None)
        if val is None:
            val = getattr(obj, key2, None)
        return val

    # Χρήση της βοηθητικής συνάρτησης για να βρούμε τα έγκυρα σημεία
    valid_points = [p for p in results if get_val(p, 'X', 'Xi') is not None and get_val(p, 'Y', 'Yi') is not None]
    
    if not valid_points: 
        return ""

    # Τώρα είναι απολύτως ασφαλές!
    X = [get_val(p, 'X', 'Xi') for p in valid_points]
    Y = [get_val(p, 'Y', 'Yi') for p in valid_points]
    names = [p.name for p in valid_points]

    plt.style.use('dark_background')
    
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.patch.set_facecolor('#121212')
    
    ax.set_facecolor('#121212')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    n = len(valid_points)
    
    # Ανίχνευση σημείων εξάρτησης
    orient_indices = [i for i, p in enumerate(valid_points) if i == 0 or i == n-1 or "Σ" in str(p.name)]
    station_indices = [i for i in range(n) if i not in orient_indices]

    for i in range(n - 1):
        dist = np.sqrt((X[i+1]-X[i])**2 + (Y[i+1]-Y[i])**2)
        mid_x, mid_y = (X[i] + X[i+1]) / 2, (Y[i] + Y[i+1]) / 2
        angle = np.degrees(np.arctan2(Y[i+1]-Y[i], X[i+1]-X[i]))
        if angle > 90: angle -= 180
        if angle < -90: angle += 180
        
        txt_color = 'gray' if (i == 0 or i == n-2) else "#FFFFFF"
        
        ax.annotate(f"{dist:.3f}", (mid_x, mid_y), 
                    xytext=(0, 5), textcoords='offset points',
                    color=txt_color, fontsize=8, fontweight='bold', 
                    ha='center', va='bottom', rotation=angle, 
                    rotation_mode='anchor')
        
    # Σχεδίαση Τριγώνων (Σημεία Εξάρτησης)
    if orient_indices:
        ax.scatter([X[i] for i in orient_indices], [Y[i] for i in orient_indices], 
                   marker='^', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.5, zorder=7)
    
    # Σχεδίαση Στάσεων
    if station_indices:
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='+', s=50, color='#00FFFF', linewidths=1.2, zorder=5)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='o', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    for i, txt in enumerate(names):
        ax.annotate(str(txt), (X[i], Y[i]), xytext=(7, 7), textcoords='offset points', 
                    fontsize=10, fontweight='bold', color="#FFFEFE")

    if n >= 4:
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.2)
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5)
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--')
    
    # Ρύθμιση Κάνναβου
    grid_interval = 50 
    ax.xaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.yaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.grid(True, linestyle=':', alpha=0.3, color='#555555')
    
    ax.set_title("ΔΙΑΓΡΑΜΜΑ ΟΔΕΥΣΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20, color="white")
    ax.set_aspect('equal', adjustable='datalim')

    plt.tight_layout()
    
    # Μετατροπή σε Base64 για αποστολή στο React
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=120)
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    plt.close(fig)
    
    return f"data:image/png;base64,{plot_url}"