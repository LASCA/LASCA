import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.gridspec import GridSpec
import matplotlib.ticker as ticker
from adjustText import adjust_text 
from matplotlib.lines import Line2D
import matplotlib.ticker as ticker
from matplotlib.lines import Line2D  
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
import numpy as np
import matplotlib.patheffects as path_effects
from matplotlib.ticker import MultipleLocator

def traverse_plot(results: list) -> str:
    valid_points = [p for p in results if p.X is not None and p.Y is not None]
    if not valid_points: return ""

    X = [p.X for p in valid_points]
    Y = [p.Y for p in valid_points]
    names = [p.name for p in valid_points]

    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    # 1. Δημιουργία Canvas με δύο περιοχές (Αναλογία 3:1)
    fig = plt.figure(figsize=(15, 8))
    fig.patch.set_facecolor('#121212')
    gs = GridSpec(1, 2, width_ratios=[3, 1], figure=fig)
    
    ax = fig.add_subplot(gs[0])      # Το Διάγραμμα
    ax_table = fig.add_subplot(gs[1]) # Ο Πίνακας
    
    ax.set_facecolor('#121212')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    # 2. Σχεδιασμός Σημείων & Γραμμών (Όπως πριν)
    n = len(valid_points)
    orient_indices = [0, n - 1] if n >= 2 else [0]
    station_indices = [i for i in range(n) if i not in orient_indices]

    ax.scatter([X[i] for i in orient_indices], [Y[i] for i in orient_indices], 
               marker='^', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.5, zorder=7)
    
    if station_indices:
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='+', s=50, color='#00FFFF', linewidths=1.2, zorder=5)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='o', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    for i, txt in enumerate(names):
        ax.annotate(txt, (X[i], Y[i]), xytext=(7, 7), textcoords='offset points', 
                    fontsize=10, fontweight='bold', color="#FFFEFE")
    
    if n >= 4:
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.2, label="Προσανατολισμός")
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5, label="Όδευση")
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--')
    
    ax.set_title("ΔΙΑΓΡΑΜΜΑ ΟΔΕΥΣΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20)
    ax.grid(True, linestyle=':', alpha=0.4)
    ax.set_aspect('equal', adjustable='datalim')

    # 3. Δημιουργία του Μεγάλου Πίνακα
    ax_table.axis('off') # Κρύβουμε τους άξονες της περιοχής του πίνακα
    
    table_data = [[names[i], f"{X[i]:.3f}", f"{Y[i]:.3f}"] for i in range(n)]
    col_labels = ["Στάση", "X (m)", "Y (m)"]
    
    table = ax_table.table(
        cellText=table_data,
        colLabels=col_labels,
        loc='center',
        cellLoc='center'
    )
    
    # Styling του Πίνακα για να είναι ευανάγνωστος
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1.1, 1.8) # Μεγαλώνουμε το ύψος των κελιών
    
    for (row, col), cell in table.get_celld().items():
        cell.set_facecolor('#1e1e1e')
        cell.set_edgecolor('#444444')
        cell.get_text().set_color('white')
        if row == 0: # Κεφαλίδα
            cell.set_facecolor('#00FFFF')
            cell.get_text().set_color('black')
            cell.get_text().set_weight('bold')

    plt.tight_layout()
    plt.show()
    return ""


def traverse_plot2(results: list) -> str:
    valid_points = [p for p in results if p.X is not None and p.Y is not None]
    if not valid_points: return ""

    X = [p.X for p in valid_points]
    Y = [p.Y for p in valid_points]
    names = [p.name for p in valid_points]

    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    fig = plt.figure(figsize=(15, 8))
    fig.patch.set_facecolor('#121212')
    gs = GridSpec(1, 2, width_ratios=[3, 1], figure=fig)
    
    ax = fig.add_subplot(gs[0])
    ax_table = fig.add_subplot(gs[1])
    
    ax.set_facecolor('#121212')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    n = len(valid_points)
    
    # Ανίχνευση σημείων εξάρτησης
    orient_indices = [i for i, p in enumerate(valid_points) if i == 0 or i == n-1 or "Σ" in p.name]
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
    ax.scatter([X[i] for i in orient_indices], [Y[i] for i in orient_indices], 
               marker='^', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.5, zorder=7)
    
    # Σχεδίαση Στάσεων
    if station_indices:
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='+', s=50, color='#00FFFF', linewidths=1.2, zorder=5)
        ax.scatter([X[i] for i in station_indices], [Y[i] for i in station_indices], 
                   marker='o', s=100, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    for i, txt in enumerate(names):
        ax.annotate(txt, (X[i], Y[i]), xytext=(7, 7), textcoords='offset points', 
                    fontsize=10, fontweight='bold', color="#FFFEFE")

    if n >= 4:
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.2)
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5)
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--')
    
    # --- ΡΥΘΜΙΣΗ ΚΑΝΝΑΒΟΥ ΜΕ ΙΔΙΟ ΒΗΜΑ ---
    # Μπορείς να αλλάξεις το 25 σε 50 ή 100 ανάλογα με την έκταση της όδευσης
    grid_interval = 50 
    ax.xaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.yaxis.set_major_locator(MultipleLocator(grid_interval))
    ax.grid(True, linestyle=':', alpha=0.3, color='#555555')
    
    ax.set_title("ΔΙΑΓΡΑΜΜΑ ΟΔΕΥΣΗΣ", loc='left', fontsize=14, fontweight='bold', pad=20)
    ax.set_aspect('equal', adjustable='datalim')

    # Πίνακας
    ax_table.axis('off')
    table_data = [[names[i], f"{X[i]:.3f}", f"{Y[i]:.3f}"] for i in range(n)]
    table = ax_table.table(cellText=table_data, colLabels=["Στάση", "X (m)", "Y (m)"], loc='center', cellLoc='center')
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1.1, 1.8)
    
    for (row, col), cell in table.get_celld().items():
        cell.set_facecolor('#1e1e1e')
        cell.set_edgecolor('#444444')
        cell.get_text().set_color('white')
        if row == 0:
            cell.set_facecolor('#00FFFF')
            cell.get_text().set_color('black')
            cell.get_text().set_weight('bold')
    
    plt.tight_layout()
    plt.show()
    return ""

def plot_survey_points(results_df, xs, ys, station_name="Στάση"):
    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    fig, ax = plt.subplots(figsize=(12, 9))
    fig.patch.set_facecolor('#121212')
    ax.set_facecolor('#121212')
    
    # Plain style για να μην έχουμε εκθέτες
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')

    # 1. Σημεία Λεπτομερείας
    ax.scatter(results_df['X'], results_df['Y'], marker='+', s=40, color='#C0C0C0', linewidths=1.2, zorder=5)
    ax.scatter(results_df['X'], results_df['Y'], marker='o', s=80, facecolors='none', edgecolors='#C0C0C0', linewidths=1.2, zorder=6)

    # 2. Στάση
    ax.scatter(xs, ys, marker='^', s=200, facecolors='none', edgecolors='#00FFFF', linewidths=2, label=f'Στάση: {station_name}', zorder=10)

    # 3. Δυναμικά Labels χωρίς δεκαδικά (Με βελτιωμένη τοποθέτηση)
    texts = []
    for i, row in results_df.iterrows():
        point_id = str(int(row['Σημείο']))
        # Δίνουμε ένα μικρό αρχικό offset (π.χ. 0.3 μέτρα) για να μην πέφτει στο κέντρο του σταυρού
        texts.append(ax.text(row['X'] + 0.3, row['Y'] + 0.3, point_id, color="#FFFEFE", fontsize=9, fontweight='bold'))

    # Αφήνουμε την adjust_text να κινηθεί ελεύθερα (χωρίς το only_move)
    # Της περνάμε τα x, y των σημείων για να ξέρει τι να αποφύγει
    adjust_text(texts, 
                x=results_df['X'].values,
                y=results_df['Y'].values,
                ax=ax,
                expand_points=(1.5, 1.5)) # Της δίνουμε "χώρο" να σπρώξει τα labels

    # 4. Label Στάσης
    ax.text(xs, ys, f"  {station_name}", color='#00FFFF', fontsize=12, fontweight='bold', va='bottom', zorder=11)

    # 5. Αισθητική & Άξονες
    ax.set_title(f"ΤΟΠΟΓΡΑΦΙΚΟ ΣΚΑΡΙΦΗΜΑ - {station_name}", loc='left', fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel("X (m)", fontweight='bold', color='#888888')
    ax.set_ylabel("Y (m)", fontweight='bold', color='#888888')
    ax.set_aspect('equal', adjustable='datalim')
    ax.grid(True, linestyle=':', alpha=0.3)
    
    ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))
    ax.yaxis.set_major_formatter(ticker.FormatStrFormatter('%d'))

    # 6. Διόρθωση Υπομνήματος με Line2D (Όπως το είχες)
    detail_proxy = Line2D([], [], color='none', marker='o', markerfacecolor='none', 
                          markeredgecolor='#C0C0C0', markersize=8, markeredgewidth=1.2)
    cross_proxy = Line2D([], [], color='#C0C0C0', marker='+', linestyle='None', 
                         markersize=6, markeredgewidth=1.2)
    
    handles, labels = ax.get_legend_handles_labels()
    # Εδώ βάζουμε τα δύο σύμβολα μαζί στο υπόμνημα
    handles.insert(0, (detail_proxy, cross_proxy))
    labels.insert(0, 'Σημεία Λεπτομερείας')

    legend = ax.legend(handles, labels, loc='upper right', frameon=True, facecolor='#1e1e1e', edgecolor='none')
    for text in legend.get_texts(): text.set_color("white")

    plt.tight_layout()
    plt.show()

def plot_std_dev_lollipop_df(results_df: pd.DataFrame) -> str:
    # 1. Επεξεργασία του DataFrame
    
    # --- Η ΛΥΣΗ ΕΙΝΑΙ ΕΔΩ ---
    # Μετατρέπουμε υποχρεωτικά τη στήλη σε αριθμούς (floats) για να μην μπερδεύεται το Matplotlib
    results_df['σ (cc)'] = results_df['σ (cc)'].astype(float)
    
    # Ομαδοποιούμε ανά 'Στάση' και κρατάμε την πρώτη τιμή του 'σ (cc)' 
    df_unique = results_df.groupby('Στάση')['σ (cc)'].first().reset_index()
    
    # Προαιρετικά: Ταξινόμηση ανά Στάση για να εμφανίζονται με τη σωστή σειρά
    df_unique = df_unique.sort_values(by='Στάση')

    # Εξαγωγή σε λίστες για το γράφημα (Μετατρέπουμε τη Στάση σε string για τον άξονα Χ)
    names = df_unique['Στάση'].astype(str).tolist()
    stds = df_unique['σ (cc)'].tolist()

    if not names:
        return ""

    # 2. Στήσιμο του καμβά (Dark / Sci-Fi Theme)
    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor('#121212') 
    ax.set_facecolor('#121212')

    # 3. --- LOLLIPOP CHART LOGIC ---
    # Το "ξυλάκι"
    ax.vlines(x=names, ymin=0, ymax=stds, color='#00FFFF', linewidth=2.5, alpha=0.8)
    
    # Η "καραμέλα" (Layering: Λάμψη + Πυρήνας)
    ax.scatter(names, stds, color='#00FFFF', s=150, alpha=0.3, zorder=4)
    ax.scatter(names, stds, color='#00FFFF', edgecolors='white', linewidths=1.5, s=60, zorder=5)

    # 5. Αισθητικές παρεμβάσεις (Τίτλοι, πλέγμα)
    ax.set_title("Τυπικές Αποκλίσεις Στάσεων", loc='left', fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel("Στάση Οργάνου", fontsize=11, fontweight='bold')
    ax.set_ylabel("Τυπική Απόκλιση σ (cc)", fontsize=11, fontweight='bold')
    
    # --- ΝΕΟ: Εξαναγκασμός του άξονα Y να ξεκινάει πάντα από το 0 ---
    ax.set_ylim(bottom=0)
    
    # Οριζόντιο πλέγμα για εύκολη ανάγνωση των τιμών
    ax.grid(True, linestyle=':', alpha=0.3, axis='y')
    
    # Έντονη γραμμή βάσης (y=0)
    ax.axhline(0, color='#333333', linewidth=2)

    # Ρύθμιση του υπομνήματος (Legend) - Χωρίς πλαίσιο
    legend = ax.legend(loc='upper right', prop={'weight': 'bold'}, frameon=False)
    for text in legend.get_texts():
        text.set_color("white")

    plt.show()
    return ""