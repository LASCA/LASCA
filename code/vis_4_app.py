import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
import matplotlib
import numpy as np
from matplotlib.ticker import MultipleLocator
import matplotlib.ticker as ticker
from adjustText import adjust_text
from matplotlib.lines import Line2D 
from matplotlib.patches import Arc
matplotlib.use('Agg') # ΚΡΙΣΙΜΟ: Λέει στη matplotlib να μην προσπαθήσει να ανοίξει GUI

try:
    from adjustText import adjust_text
    HAS_ADJUST_TEXT = True
except ImportError:
    HAS_ADJUST_TEXT = False

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
    fig.patch.set_facecolor('#030712') # Ταιριάζει με το background
    ax.set_facecolor('#030712')

    # 3. LOLLIPOP CHART LOGIC
    ax.vlines(x=names, ymin=0, ymax=stds, color='#00FFFF', linewidth=2.5, alpha=0.8)
    ax.scatter(names, stds, color='#00FFFF', s=150, alpha=0.3, zorder=4)
    ax.scatter(names, stds, color='#00FFFF', edgecolors='white', linewidths=1.5, s=60, zorder=5)

    # ΠΡΟΣΘΗΚΗ LABELS ΜΕ ΤΙΣ ΤΙΜΕΣ
    for name, std in zip(names, stds):
        ax.annotate(
            f'{std:.2f}',                  # Η τιμή με 2 δεκαδικά ψηφία
            xy=(name, std),                # Το ακριβές σημείο (x, y)
            xytext=(0, 12),                # Μετατόπιση κειμένου 12 pixels πιο πάνω 
            textcoords='offset points',
            ha='center',                   # Οριζόντιο κεντράρισμα
            va='bottom',                   # Το κάτω μέρος του κειμένου ακουμπάει την απόσταση xytext
            color='white',                 # Χρώμα κειμένου
            fontsize=10,
            fontweight='bold'
        )

    # 4. Αισθητικές παρεμβάσεις
    ax.set_title("Τυπικές Αποκλίσεις Στάσεων", loc='left', fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel("Στάση Οργάνου", fontsize=11, fontweight='bold')
    ax.set_ylabel("Τυπική Απόκλιση σ (cc)", fontsize=11, fontweight='bold')
    
    # Προσθήκη δυναμικού ορίου στον άξονα Y, δίνοντας 15% περισσότερο χώρο στο πάνω μέρος
    if stds:
        ax.set_ylim(bottom=0, top=max(stds) * 1.15)
    else:
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

def plot_traverse_base64(results: list, measurements: list = None, scale: str = '1:1000') -> str:
    def get_val(obj, *keys):
        for k in keys:
            if isinstance(obj, dict):
                if k in obj and obj[k] is not None:
                    return obj[k]
            else:
                val = getattr(obj, k, None)
                if val is None and hasattr(obj, 'get') and callable(getattr(obj, 'get')):
                    val = obj.get(k, None)
                if val is not None:
                    return val
        return None

    valid_points = [p for p in results if get_val(p, 'X', 'Xi', 'x') is not None and get_val(p, 'Y', 'Yi', 'y') is not None]
    
    if not valid_points: 
        return ""

    X = [float(get_val(p, 'X', 'Xi', 'x')) for p in valid_points]
    Y = [float(get_val(p, 'Y', 'Yi', 'y')) for p in valid_points]
    names = [str(get_val(p, 'name', 'Name') or f"P{i}").strip() for i, p in enumerate(valid_points)]

    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.patch.set_facecolor('#121212')
    ax.set_facecolor('#121212')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    n = len(valid_points)
    
    orient_indices = []
    fixed_indices = [0, 1, n-2, n-1] if n >= 4 else [0, n-1]

    for i in range(n):
        is_fixed = i in fixed_indices
        if is_fixed or "Σ" in names[i].upper():
            orient_indices.append(i)

    station_indices = [i for i in range(n) if i not in orient_indices]

    # --- 1. ΑΝΑΓΡΑΦΗ ΑΠΟΣΤΑΣΕΩΝ ΠΑΝΩ ΣΤΙΣ ΠΛΕΥΡΕΣ ---
    for i in range(n - 1):
        p1_name = names[i]
        p2_name = names[i+1]
        dist_str = None
        
        if measurements:
            if i + 1 < len(measurements) and measurements[i+1].get('sd'):
                dist_str = str(measurements[i+1].get('sd')).strip()
            elif i < len(measurements) and measurements[i].get('sd'):
                dist_str = str(measurements[i].get('sd')).strip()
            else:
                for row in measurements:
                    if str(row.get('name', '')).strip() == p2_name and row.get('sd'):
                        dist_str = str(row.get('sd')).strip()
                        break

        if not dist_str or dist_str == "" or dist_str == "-":
            geom_dist = np.sqrt((X[i+1]-X[i])**2 + (Y[i+1]-Y[i])**2)
            dist_str = f"{geom_dist:.3f}"
        else:
            try:
                dist_str = f"{float(dist_str):.3f}"
            except ValueError:
                pass 

        mid_x, mid_y = (X[i] + X[i+1]) / 2, (Y[i] + Y[i+1]) / 2
        angle = np.degrees(np.arctan2(Y[i+1]-Y[i], X[i+1]-X[i]))
        if angle > 90: angle -= 180
        if angle < -90: angle += 180
        
        txt_color = 'gray' if (i == 0 or i == n-2) else "#FFFFFF"
        
        # Μικρότερο fontsize για αποφυγή επικάλυψης (6.0)
        ax.annotate(dist_str, (mid_x, mid_y), 
                    xytext=(0, 5), textcoords='offset points',
                    color=txt_color, fontsize=6.0, fontweight='bold',
                    ha='center', va='bottom', rotation=angle, 
                    rotation_mode='anchor')

    # --- 2. ΣΧΕΔΙΑΣΗ ΓΩΝΙΩΝ ΘΛΑΣΗΣ ---
    ANGLE_COLOR = '#90A4AE'

    for i in range(1, n - 1):
        if i in orient_indices:
            continue

        hz_str = None
        
        if measurements and i < len(measurements):
            m_row = measurements[i]
            if str(m_row.get('name', '')).strip() == names[i] and m_row.get('hz'):
                hz_str = str(m_row.get('hz')).strip()

        if not hz_str and measurements:
            for row in measurements:
                if str(row.get('name', '')).strip() == names[i] and row.get('hz'):
                    hz_str = str(row.get('hz')).strip()
                    break
                    
        if hz_str and hz_str != "" and hz_str != "-":
            try:
                hz_text = f"{float(hz_str):.4f}g"
            except ValueError:
                hz_text = hz_str

            dx1, dy1 = X[i-1] - X[i], Y[i-1] - Y[i]
            dx2, dy2 = X[i+1] - X[i], Y[i+1] - Y[i]
            
            d1 = np.hypot(dx1, dy1)
            d2 = np.hypot(dx2, dy2)
            if d1 == 0 or d2 == 0: continue
            
            angle1 = np.degrees(np.arctan2(dy1, dx1)) % 360
            angle2 = np.degrees(np.arctan2(dy2, dx2)) % 360
            
            diff = (angle2 - angle1) % 360
            if diff > 180:
                theta1, theta2 = angle2, angle1
                bisector = angle2 - (360 - diff) / 2
            else:
                theta1, theta2 = angle1, angle2
                bisector = angle1 + diff / 2
                
            bisector_rad = np.radians(bisector)
            r = min(d1, d2) * 0.14
            
            arc = Arc((X[i], Y[i]), r*2, r*2, angle=0, theta1=theta1, theta2=theta2, 
                      color=ANGLE_COLOR, linestyle='--', linewidth=0.9, zorder=4)
            ax.add_patch(arc)
            
            txt_x = X[i] + (r * 1.8) * np.cos(bisector_rad)
            txt_y = Y[i] + (r * 1.8) * np.sin(bisector_rad)
            
            ax.text(txt_x, txt_y, hz_text, color=ANGLE_COLOR, fontsize=5.5, 
                    fontweight='normal', ha='center', va='center',
                    bbox=dict(facecolor='#121212', edgecolor='none', pad=0.2, alpha=0.5))

    # --- 3. Σχεδίαση Σημείων (Κόμβοι) ---
    if orient_indices:
        ax.scatter([X[i] for i in orient_indices], [Y[i] for i in orient_indices], 
                   marker='^', s=80, facecolors='none', edgecolors='#00FFFF', linewidths=1.5, zorder=7)
    
    if station_indices:
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='+', s=40, color='#00FFFF', linewidths=1.2, zorder=5)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='o', s=80, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    for i, txt in enumerate(names):
        ax.annotate(str(txt), (X[i], Y[i]), xytext=(6, 6), textcoords='offset points',
                    fontsize=9.5, fontweight='bold', color="#FFFEFE")

    # --- 4. Σχεδίαση γραμμών ---
    if n >= 4:
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.2)
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5)
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--')
    else:
        ax.plot(X, Y, color="#FF00BB", linestyle='-', linewidth=1.5)
    
    grid_interval = 50 
    ax.xaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.yaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.grid(True, linestyle=':', alpha=0.3, color='#555555')
    
    ax.margins(0.12)
    ax.set_title("ΔΙΑΓΡΑΜΜΑ ΟΔΕΥΣΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20, color="white")
    ax.set_aspect('equal', adjustable='datalim')

    # --- 5. ΠΡΟΣΘΗΚΗ ΒΕΛΟΥΣ ΒΟΡΡΑ ---
    ax.annotate('N', xy=(0.95, 0.95), xytext=(0.95, 0.86),
                xycoords='axes fraction', textcoords='axes fraction',
                arrowprops=dict(facecolor='#FF00BB', edgecolor='#FF00BB', width=3, headwidth=10, headlength=12),
                ha='center', va='center', fontsize=16, fontweight='bold', color='white', zorder=10)

    # --- 6. ΔΥΝΑΜΙΚΗ ΓΡΑΦΙΚΗ ΚΛΙΜΑΚΑ & ΥΠΟΜΝΗΜΑ (ΚΑΤΩ ΑΡΙΣΤΕΡΑ) ---
    try:
        scale_num = int(scale.split(':')[-1])
    except (ValueError, AttributeError):
        scale_num = 1000

    if scale_num <= 200:
        bar_len = 10
    elif scale_num <= 500:
        bar_len = 25
    elif scale_num <= 1000:
        bar_len = 50
    else:
        bar_len = 100

    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()
    x_range = xmax - xmin
    y_range = ymax - ymin

    # ΑΛΛΑΓΗ: Τοποθέτηση στο κάτω ΑΡΙΣΤΕΡΟ μέρος (5% margin)
    bar_x = xmin + (x_range * 0.05)
    bar_y = ymin + (y_range * 0.05)
    tick_h = y_range * 0.012  

    # Κύρια οριζόντια γραμμή (Scale bar)
    ax.plot([bar_x, bar_x + bar_len], [bar_y, bar_y], color='white', linewidth=2, zorder=10)
    
    # "Δοντάκια" που δείχνουν προς τα πάνω
    ax.plot([bar_x, bar_x], [bar_y, bar_y + tick_h], color='white', linewidth=1.5, zorder=10)
    ax.plot([bar_x + bar_len/2, bar_x + bar_len/2], [bar_y, bar_y + tick_h], color='white', linewidth=1, zorder=10)
    ax.plot([bar_x + bar_len, bar_x + bar_len], [bar_y, bar_y + tick_h], color='white', linewidth=1.5, zorder=10)

    # Κείμενο αποστάσεων (πάνω από τη γραμμή)
    txt_y = bar_y + tick_h * 1.5
    ax.text(bar_x, txt_y, "0", color='white', fontsize=7, ha='center', va='bottom', zorder=10)
    ax.text(bar_x + bar_len/2, txt_y, f"{bar_len/2:g}", color='white', fontsize=7, ha='center', va='bottom', zorder=10)
    ax.text(bar_x + bar_len, txt_y, f"{bar_len}m", color='white', fontsize=7, ha='center', va='bottom', zorder=10)

    # Υπόμνημα Κλίμακας & Συστήματος Αναφοράς (Ακριβώς κάτω από τη γραμμή με αριστερή στοίχιση)
    legend_y = bar_y - tick_h * 1.5
    line_spacing = y_range * 0.025
    ax.text(bar_x, legend_y, f"ΚΛΙΜΑΚΑ: 1:{scale_num}", color='#00FFFF', fontsize=8, ha='left', va='top', fontweight='bold', zorder=10)
    ax.text(bar_x, legend_y - line_spacing, "Σ.Α.: ΕΓΣΑ '87", color='#00FFFF', fontsize=8, ha='left', va='top', fontweight='bold', zorder=10)

    plt.tight_layout(pad=3.0)
    
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=150)
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    plt.close(fig)
    
    return f"data:image/png;base64,{plot_url}"

def plot_tachymetry_base64(calculated_points: list, st_lookup: dict) -> str:
    """
    Δημιουργεί το τοπογραφικό σκαρίφημα της ταχυμετρίας σε Matplotlib (dark mode)
    και το επιστρέφει σε μορφή Base64 string για το React Frontend.
    """
    if not calculated_points:
        return ""

    # Μετατροπή των αποτελεσμάτων σε DataFrame για εύκολο χειρισμό
    df = pd.DataFrame(calculated_points)
    
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(12, 9))
    
    # Χρώμα ίδιο με το bg-[#030712] του React Tailwind
    fig.patch.set_facecolor('#030712')
    ax.set_facecolor('#030712')
    
    # Plain style για να μην έχουμε εκθέτες (scientific notation) στους άξονες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')

    # 1. Σχεδίαση Σημείων Λεπτομερείας (Σταυρός + Κύκλος)
    ax.scatter(df['X'], df['Y'], marker='+', s=40, color='#C0C0C0', linewidths=1.2, zorder=5)
    ax.scatter(df['X'], df['Y'], marker='o', s=80, facecolors='none', edgecolors='#C0C0C0', linewidths=1.2, zorder=6)

    # 2. Σχεδίαση όλων των Στάσεων και Προσανατολισμών (Όλα σε Cyan #00FFFF)
    unique_stations = df['Στάση'].unique()
    drawn_orientations = set()  # Για να μην ξανασχεδιάζουμε το ίδιο σημείο αν συμπίπτει

    for st_name in unique_stations:
        if st_name in st_lookup:
            st_x = st_lookup[st_name]['x']
            st_y = st_lookup[st_name]['y']
            
            # Σχεδίαση κυανού τριγώνου κύριας στάσης
            ax.scatter(st_x, st_y, marker='^', s=200, facecolors='none', edgecolors='#00FFFF', linewidths=2, zorder=10)
            ax.text(st_x, st_y, f"  {st_name}", color='#00FFFF', fontsize=12, fontweight='bold', va='bottom', zorder=11)

            # Εύρεση των προσανατολισμών που ανήκουν σε αυτή τη στάση
            station_df = df[df['Στάση'] == st_name]
            if 'Προσανατολισμός' in station_df.columns:
                unique_bs = station_df['Προσανατολισμός'].unique()
                
                for bs_name in unique_bs:
                    if bs_name in st_lookup:
                        bs_x = st_lookup[bs_name]['x']
                        bs_y = st_lookup[bs_name]['y']
                        
                        # Σχεδίαση του Σημείου Προσανατολισμού με Cyan (χωρίς τη γραμμή σύνδεσης)
                        if bs_name not in unique_stations and bs_name not in drawn_orientations:
                            ax.scatter(bs_x, bs_y, marker='^', s=160, facecolors='none', edgecolors='#00FFFF', linewidths=1.8, zorder=9)
                            ax.text(bs_x, bs_y, f"  {bs_name}", color='#00FFFF', fontsize=11, fontweight='bold', va='top', zorder=11)
                            drawn_orientations.add(bs_name)

    # 3. Δυναμικά Labels Σημείων χωρίς δεκαδικά
    texts = []
    for i, row in df.iterrows():
        try:
            # Μετατροπή σε ακέραιο αν είναι καθαρός αριθμός (π.χ. '1.0' -> '1')
            point_id = str(int(float(row['Σημείο'])))
        except Exception:
            point_id = str(row['Σημείο'])
            
        # Αρχικό μικρό offset 0.3μ για να μην πέφτει πάνω στο κέντρο
        texts.append(ax.text(row['X'] + 0.3, row['Y'] + 0.3, point_id, color="#FFFEFE", fontsize=9, fontweight='bold'))

    # Εφαρμογή adjust_text για την αυτόματη αποφυγή επικαλύψεων στα labels
    if 'HAS_ADJUST_TEXT' in globals() and HAS_ADJUST_TEXT and texts:
        try:
            from adjustText import adjust_text
            adjust_text(texts, 
                        x=df['X'].values,
                        y=df['Y'].values,
                        ax=ax,
                        expand_points=(1.5, 1.5))
        except Exception as e:
            print(f"Σφάλμα κατά την εκτέλεση του adjust_text: {e}")

    # 4. Αισθητική & Άξονες
    title_suffix = unique_stations[0] if len(unique_stations) == 1 else "ΔΙΚΤΥΟ"
    ax.set_title(f"ΤΟΠΟΓΡΑΦΙΚΟ ΣΚΑΡΙΦΗΜΑ - {title_suffix}", loc='left', fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel("X (m)", fontweight='bold', color='#888888')
    ax.set_ylabel("Y (m)", fontweight='bold', color='#888888')
    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, linestyle=':', alpha=0.15)
    
    ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))

    # 5. Δημιουργία Προσαρμοσμένου Υπομνήματος (σε βέλτιστη θέση - loc='best')
    detail_proxy = Line2D([], [], color='none', marker='o', markerfacecolor='none', 
                          markeredgecolor='#C0C0C0', markersize=8, markeredgewidth=1.2)
    cross_proxy = Line2D([], [], color='#C0C0C0', marker='+', linestyle='None', 
                          markersize=6, markeredgewidth=1.2)
    station_proxy = Line2D([], [], color='none', marker='^', markerfacecolor='none',
                           markeredgecolor='#00FFFF', markersize=12, markeredgewidth=2)
    
    handles = [(detail_proxy, cross_proxy), station_proxy]
    labels = ['Σημεία Λεπτομερείας', 'Στάσεις & Σημεία Εξάρτησης']

    legend = ax.legend(handles, labels, loc='best', frameon=True, facecolor='#0b1120', edgecolor='#1e293b')
    for text in legend.get_texts(): 
        text.set_color("white")

    plt.tight_layout()
    
    # 6. Μετατροπή του γραφήματος σε Base64 string
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', transparent=True, dpi=120)
    
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    plt.close(fig)
    
    return f"data:image/png;base64,{plot_url}"

def plot_stakeout_base64(station: dict, backsight: dict, calculated_points: list) -> str:
    """
    Δημιουργεί το τοπογραφικό σκαρίφημα της χάραξης σε Matplotlib (dark mode)
    και το επιστρέφει σε μορφή Base64 string για το React Frontend.
    """
    if not station or not calculated_points:
        return ""
        
    try:
        # Ανάγνωση συντεταγμένων Στάσης
        st_x = float(station.get('x', 0))
        st_y = float(station.get('y', 0))
        st_name = str(station.get('id', station.get('name', 'Στάση')))
    except (ValueError, TypeError):
        return ""

    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(11, 8))
    
    # 1. Απόλυτη ευθυγράμμιση με το React Dashboard theme (Tailwind bg-[#030712])
    fig.patch.set_facecolor('#030712')
    ax.set_facecolor('#030712')
    
    # Αλλαγή χρώματος στα περιγράμματα του γραφήματος (slate-800)
    for spine in ax.spines.values():
        spine.set_color('#1e293b')
        
    # Αλλαγή χρώματος στα νούμερα των αξόνων (slate-500)
    ax.tick_params(axis='x', colors='#64748b')
    ax.tick_params(axis='y', colors='#64748b')
    
    # Απενεργοποίηση επιστημονικής σημειογραφίας στους άξονες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    # 2. Σχεδίαση μόνο του Συμβόλου της Στάσης
    ax.scatter(st_x, st_y, marker='^', s=220, facecolors='none', edgecolors='#00FFFF', linewidths=2.5, zorder=10)
    ax.text(st_x, st_y, f"  {st_name}", color='#00FFFF', fontsize=12, fontweight='bold', va='bottom', zorder=11)
    
    # 3. Σχεδίαση Σημείων προς Χάραξη
    X_p, Y_p, labels_p = [], [], []
    
    for pt in calculated_points:
        if not pt.get('x') or not pt.get('y'):
            continue
        try:
            xp = float(pt['x'])
            yp = float(pt['y'])
            
            raw_id = str(pt.get('name', pt.get('Point', ''))).strip()
            
            if not raw_id:
                raw_id = "P"
                
            if raw_id.endswith('.0'):
                raw_id = raw_id[:-2]
                
        except (ValueError, TypeError):
            continue
            
        X_p.append(xp)
        Y_p.append(yp)
        labels_p.append(raw_id)
        
        # Σχεδίαση Ακτίνας Χάραξης
        ax.plot([st_x, xp], [st_y, yp], color='#10B981', linestyle=':', linewidth=1.2, alpha=0.5, zorder=2)
        
    if X_p:
        # Σχεδίαση "Στόχων" για τα σημεία χάραξης
        ax.scatter(X_p, Y_p, marker='o', s=110, facecolors='none', edgecolors='#10B981', linewidths=1.5, zorder=6)
        ax.scatter(X_p, Y_p, marker='+', s=55, color='#10B981', linewidths=1.5, zorder=7)
        
        # Δημιουργία καθαρών κειμένων
        texts = []
        for xi, yi, lbl in zip(X_p, Y_p, labels_p):
            texts.append(ax.text(xi, yi, lbl, color="#FFFEFE", fontsize=11, fontweight='bold'))
            
        if HAS_ADJUST_TEXT and texts:
            try:
                adjust_text(texts, x=np.array(X_p), y=np.array(Y_p), ax=ax, 
                            expand_points=(1.5, 1.5),
                            arrowprops=dict(arrowstyle="-", color='#10B981', lw=0.5, alpha=0.6))
            except Exception:
                pass

    # ΠΡΟΣΘΗΚΗ ΠΕΡΙΘΩΡΙΩΝ (15% κενό γύρω-γύρω)
    ax.margins(0.15)

    # 4. Μορφοποίηση, Άξονες & Κάνναβος
    # Το pad μειώθηκε ελαφρώς και προστέθηκε y=1.02 για να αποφευχθεί το κόψιμο
    ax.set_title("ΣΚΑΡΙΦΗΜΑ ΧΑΡΑΞΗΣ", loc='left', fontsize=14, fontweight='bold', pad=12, y=1.02, color='#cbd5e1')
    ax.set_xlabel("X (m)", fontweight='bold', color='#64748b')
    ax.set_ylabel("Y (m)", fontweight='bold', color='#64748b')
    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, linestyle=':', alpha=0.5, color='#1e293b')
    
    ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    
    # 5. Custom Υπόμνημα προσαρμοσμένο στα χρώματα του UI
    st_proxy = Line2D([], [], color='none', marker='^', markerfacecolor='none', markeredgecolor='#00FFFF', markersize=12, markeredgewidth=2)
    pt_outer = Line2D([], [], color='none', marker='o', markerfacecolor='none', markeredgecolor='#10B981', markersize=9, markeredgewidth=1.2)
    pt_inner = Line2D([], [], color='#10B981', marker='+', linestyle='None', markersize=7, markeredgewidth=1.2)
    pt_line = Line2D([], [], color='#10B981', linestyle=':', linewidth=1.2)
    
    handles = [st_proxy, (pt_outer, pt_inner), pt_line]
    labels = ['Στάση Οργάνου', 'Σημεία προς Χάραξη', 'Ακτίνες Χάραξης']
    
    # Legend με χρώματα που ταιριάζουν στο dark theme (slate-900 bg, slate-800 border)
    legend = ax.legend(handles, labels, loc='upper right', frameon=True, facecolor='#0f172a', edgecolor='#1e293b')
    for text in legend.get_texts():
        text.set_color("#cbd5e1")
        
    # Προσθήκη γενικού padding γύρω από όλο το figure για να μην κόβεται τίποτα στα όρια
    plt.tight_layout(pad=2.0)
    
    # 6. Μετατροπή σε Base64 String
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=120)
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    plt.close(fig)
    
    return f"data:image/png;base64,{plot_url}"