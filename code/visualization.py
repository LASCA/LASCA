from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, sys, csv
from typing import Optional, List, Tuple, Dict
import matplotlib.pyplot as plt
import io
import base64
from typing import List
import pandas as pd
from matplotlib.gridspec import GridSpec

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


def plot_survey_points(results_df, xs, ys, station_name="Στάση"):
    """
    Δημιουργεί ένα τοπογραφικό διάγραμμα με τη στάση και τα σημεία λεπτομερείας.
    """
    # 1. Ρύθμιση στυλ (Dark Theme για επαγγελματικό look)
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.patch.set_facecolor('#121212')
    ax.set_facecolor('#121212')

    # 2. Πλοτάρισμα των Σημείων Λεπτομερείας (Cyan κύκλοι)
    ax.scatter(results_df['X'], results_df['Y'], 
               color='#00FFFF', s=40, label='Σημεία Λεπτομερείας', 
               zorder=3, alpha=0.6, edgecolors='white', linewidths=0.5)

    # 3. Πλοτάρισμα της Στάσης (Κόκκινο τρίγωνο)
    ax.scatter(xs, ys, color='#00FFFF', marker='^', s=200, 
               label=f'Στάση: {station_name}', edgecolors='white', zorder=5)

    # 4. Προσθήκη Labels (Ονόματα σημείων)
    # Χρησιμοποιούμε ένα μικρό offset (0.2m) για να μην πέφτει το κείμενο πάνω στο σύμβολο
    for i, row in results_df.iterrows():
        ax.text(row['X'] + 0.15, row['Y'] + 0.15, str(row['Σημείο']), 
                color='white', fontsize=9, alpha=0.9, zorder=6)

    # Προσθήκη label ειδικά για τη στάση
    ax.text(xs + 0.2, ys + 0.2, station_name, 
            color='#00FFFF', fontsize=11, fontweight='bold', zorder=6)

    # 5. Αισθητικές παρεμβάσεις και Τίτλοι
    ax.set_title(f"Τοπογραφικό Σκαρίφημα - {station_name}", loc='left', 
                 fontsize=14, fontweight='bold', pad=20, color='white')
    
    ax.set_xlabel("X (m)", fontweight='bold', color='#888888')
    ax.set_ylabel("Y (m)", fontweight='bold', color='#888888')
    
    # --- ΚΡΙΣΙΜΟ: Ίση κλίμακα αξόνων ---
    # Χωρίς αυτό, οι γωνίες και οι αποστάσεις θα φαίνονται παραμορφωμένες
    ax.set_aspect('equal', adjustable='box') 
    
    # Πλέγμα (Grid)
    ax.grid(True, linestyle='--', alpha=0.15, color='white')
    
    # Υπόμνημα
    legend = ax.legend(loc='best', frameon=True, facecolor='#1e1e1e', edgecolor='none')
    for text in legend.get_texts():
        text.set_color("white")

    # Αυτόματη ρύθμιση περιθωρίων
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