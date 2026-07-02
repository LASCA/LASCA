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
    """
    Δημιουργεί το διάγραμμα της όδευσης σε Matplotlib (dark mode)
    και το επιστρέφει σε μορφή Base64 string για το React Frontend.
    """
    # Βοηθητική συνάρτηση για ΑΣΦΑΛΗ ανάγνωση των ιδιοτήτων χωρίς να κρασάρει η Python
    def get_val(obj, key1, key2):
        val = getattr(obj, key1, None)
        if val is None:
            val = getattr(obj, key2, None)
        return val

    # Φιλτράρισμα για να κρατήσουμε μόνο τα έγκυρα σημεία με συντεταγμένες
    valid_points = [p for p in results if get_val(p, 'X', 'Xi') is not None and get_val(p, 'Y', 'Yi') is not None]
    
    if not valid_points: 
        return ""

    X = [get_val(p, 'X', 'Xi') for p in valid_points]
    Y = [get_val(p, 'Y', 'Yi') for p in valid_points]
    names = [p.name for p in valid_points]

    plt.style.use('dark_background')
    
    fig, ax = plt.subplots(figsize=(10, 8))
    # Corrected colors to match the specific dashboard theme
    fig.patch.set_facecolor('#121212') # Dark grey background
    ax.set_facecolor('#121212')
    
    # Απενεργοποίηση επιστημονικής σημειογραφίας στους άξονες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    n = len(valid_points)
    
    # --- ΝΕΑ, ΑΚΡΙΒΗΣ ΑΝΙΧΝΕΥΣΗ ΣΗΜΕΙΩΝ ΕΞΑΡΤΗΣΗΣ (ΤΡΙΓΩΝΑ) ---
    orient_indices = []
    # Use standard 4-point traverse indices as primary fixed points
    fixed_indices = [0, 1, n-2, n-1] if n >= 4 else [0, n-1]

    for i, p in enumerate(valid_points):
        name_str = str(p.name).upper().strip()
        
        # Determine if point 'i' is a control point
        # Primary check: index position
        is_fixed = i in fixed_indices
        
        # Secondary check: specific name patterns for fallback or non-standard configurations
        # We explicitly skip 'T' prefix pattern if we are sure of the index structure for t47.
        # However, to maintain safety against other control points, we keep 'Σ' and refine 'T' for true fixed points only.
        
        # A safer version might exclude specific indices or names we know to be temporary stations.
        # But for robust general use, stick to the explicit fixed indices as primary truth.
        
        # For a standard closed loop, only the endpoints (n >= 4) are triangles.
        # For an ' εξαρτημένη' type, we must check coordinates explicitly in the backend for true fixity,
        # but the standard approach is index based if coordinates are provided correctly.
        
        # Robust Logic: Only endpoints or true ' Σ' named are fixed. ' T' prefix is not a reliable differentiator alone.
        # If the points at 1 and n-2 are TRULY fixed (coordinates provided and fixed), then they must be fixed.
        # The frontend's job is just to plot what it receives. Backend handles true ' fixity'.
        
        if is_fixed or "Σ" in name_str:
            orient_indices.append(i)

    # Οι ενδιάμεσες στάσεις είναι όσα σημεία ΔΕΝ αναγνωρίστηκαν ως εξάρτησης (Κύκλος με +)
    station_indices = [i for i in range(n) if i not in orient_indices]
    # -------------------------------------------------------

    # Αναγραφή αποστάσεων πάνω στις πλευρές
    for i in range(n - 1):
        dist = np.sqrt((X[i+1]-X[i])**2 + (Y[i+1]-Y[i])**2)
        mid_x, mid_y = (X[i] + X[i+1]) / 2, (Y[i] + Y[i+1]) / 2
        angle = np.degrees(np.arctan2(Y[i+1]-Y[i], X[i+1]-X[i]))
        if angle > 90: angle -= 180
        if angle < -90: angle += 180
        
        # Χρωματισμός: Γκρι για διακεκομμένες, Magenta για κύρια όδευση
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
    
    # Σχεδίαση Κύκλων με Σταυρό (Ενδιάμεσες Στάσεις)
    if station_indices:
        # Drawing the cross part (+)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='+', s=50, color='#00FFFF', linewidths=1.2, zorder=5)
        # Drawing the circle part (o)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='o', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    # Προσθήκη Ονομάτων Σταθμών (Labels)
    for i, txt in enumerate(names):
        ax.annotate(str(txt), (X[i], Y[i]), xytext=(7, 7), textcoords='offset points', 
                    fontsize=10, fontweight='bold', color="#FFFEFE")

    # Σχεδίαση των γραμμών (Συνδέσεις πλευρών)
    if n >= 4:
        # Διακεκομμένη γκρι γραμμή για τους προσανατολισμούς αφετηρίας/λήξης
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.2)
        # Έντονη magenta γραμμή για τον κύριο κορμό (1 -> n-2)
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5)
        # Διακεκομμένη γκρι γραμμή για τον προσανατολισμό λήξης (n-2 -> n)
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--')
    else:
        # Απλή magenta γραμμή αν τα σημεία δεν επαρκούν για πλήρη εξάρτηση
        ax.plot(X, Y, color="#FF00BB", linestyle='-', linewidth=1.5)
    
    # Ρύθμιση Κάνναβου (Grid) ανά 50 μέτρα
    grid_interval = 50 
    ax.xaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.yaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.grid(True, linestyle=':', alpha=0.3, color='#555555')
    
    # Τίτλος και Aspect Ratio (1:1)
    ax.set_title("ΔΙΑΓΡΑΜΜΑ ΟΔΕΥΣΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20, color="white")
    ax.set_aspect('equal', adjustable='datalim')

    # Add interaction hint
    plt.annotate('SCROLL ΓΙΑ ZOOM • DRAG ΓΙΑ ΠΕΡΙΉΓΗΣΗ', xy=(0.5, 0), xycoords='axes fraction', xytext=(0, -25), textcoords='offset points', ha='center', va='top', fontsize=10, color='gray')

    plt.tight_layout(pad=3.0)
    
    # Μετατροπή σε Base64 string
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=120)
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
    
    # Χρώματα που ταιριάζουν με το dashboard theme σου
    fig.patch.set_facecolor('#121212')
    ax.set_facecolor('#121212')
    
    # Plain style για να μην έχουμε εκθέτες (scientific notation) στους άξονες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')

    # 1. Σχεδίαση Σημείων Λεπτομερείας (Σταυρός + Κύκλος)
    ax.scatter(df['X'], df['Y'], marker='+', s=40, color='#C0C0C0', linewidths=1.2, zorder=5)
    ax.scatter(df['X'], df['Y'], marker='o', s=80, facecolors='none', edgecolors='#C0C0C0', linewidths=1.2, zorder=6)

    # 2. Σχεδίαση όλων των Στάσεων, των Προσανατολισμών και των Γραμμών Εξάρτησης
    unique_stations = df['Στάση'].unique()
    drawn_orientations = set()  # Για να μην ξανασχεδιάζουμε το ίδιο σημείο αν συμπίπτει

    for st_name in unique_stations:
        if st_name in st_lookup:
            st_x = st_lookup[st_name]['x']
            st_y = st_lookup[st_name]['y']
            
            # Σχεδίαση κυανού τριγώνου στάσης
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
                        
                        # α) Σχεδίαση Διακεκομμένης Γραμμής Εξάρτησης (Στάση -> Προσανατολισμός)
                        ax.plot([st_x, bs_x], [st_y, bs_y], color='#FFA500', linestyle='--', linewidth=1.5, alpha=0.8, zorder=3)
                        
                        # β) Σχεδίαση του Σημείου Προσανατολισμού (αν δεν είναι ήδη κύρια στάση)
                        if bs_name not in unique_stations and bs_name not in drawn_orientations:
                            ax.scatter(bs_x, bs_y, marker='^', s=160, facecolors='none', edgecolors='#FFA500', linewidths=1.8, zorder=9)
                            ax.text(bs_x, bs_y, f"  {bs_name}", color='#FFA500', fontsize=11, fontweight='bold', va='top', zorder=11)
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
    if HAS_ADJUST_TEXT and texts:
        try:
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
    ax.grid(True, linestyle=':', alpha=0.3)
    
    ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))

    # 5. Δημιουργία Custom Υπομνήματος με Line2D (Ενημερωμένο)
    detail_proxy = Line2D([], [], color='none', marker='o', markerfacecolor='none', 
                          markeredgecolor='#C0C0C0', markersize=8, markeredgewidth=1.2)
    cross_proxy = Line2D([], [], color='#C0C0C0', marker='+', linestyle='None', 
                         markersize=6, markeredgewidth=1.2)
    station_proxy = Line2D([], [], color='none', marker='^', markerfacecolor='none',
                           markeredgecolor='#00FFFF', markersize=12, markeredgewidth=2)
    
    # Νέοι proxies για το Υπόμνημα (Προσανατολισμός και Γραμμή)
    bs_proxy = Line2D([], [], color='none', marker='^', markerfacecolor='none',
                        markeredgecolor='#FFA500', markersize=10, markeredgewidth=1.8)
    line_proxy = Line2D([], [], color='#FFA500', linestyle='--', linewidth=1.5)
    
    handles = [(detail_proxy, cross_proxy), station_proxy, bs_proxy, line_proxy]
    labels = ['Σημεία Λεπτομερείας', 'Στάσεις (Σταθμοί)', 'Σημεία Εξάρτησης', 'Γραμμή Εξάρτησης']

    legend = ax.legend(handles, labels, loc='upper right', frameon=True, facecolor='#1e1e1e', edgecolor='none')
    for text in legend.get_texts(): 
        text.set_color("white")

    plt.tight_layout()
    
    # 6. Μετατροπή του γραφήματος σε Base64 string
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=120)
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
    
    # Ευθυγράμμιση με το Dashboard theme
    fig.patch.set_facecolor('#121212')
    ax.set_facecolor('#121212')
    
    # Απενεργοποίηση επιστημονικής σημειογραφίας στους άξονες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    # 1. Σχεδίαση μόνο του Συμβόλου της Στάσης
    ax.scatter(st_x, st_y, marker='^', s=220, facecolors='none', edgecolors='#00FFFF', linewidths=2.5, zorder=10)
    ax.text(st_x, st_y, f"  {st_name}", color='#00FFFF', fontsize=12, fontweight='bold', va='bottom', zorder=11)
    
    # 2. Σχεδίαση Σημείων προς Χάραξη
    X_p, Y_p, labels_p = [], [], []
    
    for pt in calculated_points:
        if not pt.get('x') or not pt.get('y'):
            continue
        try:
            xp = float(pt['x'])
            yp = float(pt['y'])
            
            # ΚΑΘΑΡΙΣΜΟΣ ID:
            # 1. Πρώτα το 'name' (Αυτό που πληκτρολογείς εσύ στο UI του React)
            # 2. Μετά το 'Point' (Αν ανέβασες αρχείο Excel)
            # ΑΓΝΟΟΥΜΕ το 'id' γιατί το React στέλνει τεράστια timestamps (π.χ. 178218493242)
            raw_id = str(pt.get('name', pt.get('Point', ''))).strip()
            
            # Αν για κάποιο λόγο είναι κενό, ας βάλουμε ένα default
            if not raw_id:
                raw_id = "P"
                
            # Αν τραβήξει δεκαδικό από Excel (π.χ. "1.0"), το κάνουμε "1"
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
            
        # adjust_text με μικρές γραμμές αν χρειαστεί να μετακινηθούν πολύ για να μη πέφτουν το ένα πάνω στο άλλο
        if HAS_ADJUST_TEXT and texts:
            try:
                adjust_text(texts, x=np.array(X_p), y=np.array(Y_p), ax=ax, 
                            expand_points=(1.5, 1.5),
                            arrowprops=dict(arrowstyle="-", color='#10B981', lw=0.5, alpha=0.6))
            except Exception:
                pass

    # ΠΡΟΣΘΗΚΗ ΠΕΡΙΘΩΡΙΩΝ (15% κενό γύρω-γύρω για να μη κόβονται τα σημεία/ονόματα)
    ax.margins(0.15)

    # 3. Μορφοποίηση, Άξονες & Κάνναβος
    ax.set_title("ΤΟΠΟΓΡΑΦΙΚΟ ΣΚΑΡΙΦΗΜΑ ΧΑΡΑΞΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel("X (m)", fontweight='bold', color='#888888')
    ax.set_ylabel("Y (m)", fontweight='bold', color='#888888')
    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, linestyle=':', alpha=0.3, color='#555555')
    
    ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    
    # 4. Custom Υπόμνημα
    st_proxy = Line2D([], [], color='none', marker='^', markerfacecolor='none', markeredgecolor='#00FFFF', markersize=12, markeredgewidth=2)
    pt_outer = Line2D([], [], color='none', marker='o', markerfacecolor='none', markeredgecolor='#10B981', markersize=9, markeredgewidth=1.2)
    pt_inner = Line2D([], [], color='#10B981', marker='+', linestyle='None', markersize=7, markeredgewidth=1.2)
    pt_line = Line2D([], [], color='#10B981', linestyle=':', linewidth=1.2)
    
    handles = [st_proxy, (pt_outer, pt_inner), pt_line]
    labels = ['Στάση Οργάνου', 'Σημεία προς Χάραξη', 'Ακτίνες Χάραξης']
    
    legend = ax.legend(handles, labels, loc='upper right', frameon=True, facecolor='#1e1e1e', edgecolor='none')
    for text in legend.get_texts():
        text.set_color("white")
        
    plt.tight_layout()
    
    # 5. Μετατροπή σε Base64 String
    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none', dpi=120)
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode('utf8')
    plt.close(fig)
    
    return f"data:image/png;base64,{plot_url}"