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

def traverse_plot(results: list) -> str:

    # 1. Φιλτράρουμε τα σημεία που έχουν συντεταγμένες (X, Y)
    valid_points = [p for p in results if p.X is not None and p.Y is not None]
    
    if not valid_points:
        return ""

    # Εξαγωγή δεδομένων
    X = [p.X for p in valid_points]
    Y = [p.Y for p in valid_points]
    names = [p.name for p in valid_points]

    plt.style.use('dark_background')
    plt.rcParams['font.family'] = 'Segoe UI'
    
    # 2. Στήσιμο του καμβά
    fig, ax = plt.subplots(figsize=(7, 10))
    fig.patch.set_facecolor('#121212') 
    ax.set_facecolor('#121212')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    
    n = len(valid_points)

    # Βρίσκουμε το πρώτο και το τελευταίο σημείο (προσανατολισμός)
    orient_indices = [0, n - 1] if n >= 2 else [0]
    # Όλα τα υπόλοιπα είναι οι κύριες στάσεις
    station_indices = [i for i in range(n) if i not in orient_indices]

    # Διαχωρίζουμε τα X και Y
    X_orient = [X[i] for i in orient_indices]
    Y_orient = [Y[i] for i in orient_indices]

    X_stations = [X[i] for i in station_indices]
    Y_stations = [Y[i] for i in station_indices]

    # 3. Σχεδιασμός των σημείων
    # Σημεία Προσανατολισμού (Τρίγωνα - Κενά εσωτερικά)
    if X_orient:
        ax.scatter(X_orient, Y_orient, marker='^', s=90, facecolors='none', edgecolors='#00FFFF', linewidths=1.5, zorder=7)

    # Κύριες Στάσεις Όδευσης (CAD Style: Σταυρός + Ανοιχτός Κύκλος)
    if X_stations:
        # Layer 1: Το σταυρόνημα (+)
        ax.scatter(X_stations, Y_stations, marker='+', s=40, color='#00FFFF', linewidths=1.2, zorder=5)
        # Layer 2: Ο εξωτερικός κύκλος (o) κενός εσωτερικά
        ax.scatter(X_stations, Y_stations, marker='o', s=80, facecolors='none', edgecolors='#00FFFF', linewidths=1.2, zorder=6)

    # Προσθήκη ονομάτων δίπλα στα σημεία
    for i, txt in enumerate(names):
        ax.annotate(
            txt, 
            (X[i], Y[i]), 
            xytext=(7, 7), 
            textcoords='offset points',
            fontsize=11,
            fontweight='bold',
            color="#FFFEFE"
        )
    
    # 4. Σχεδιασμός των γραμμών (Σκοπεύσεις vs Οδεύσεις)
    if n >= 4:
        # Προσανατολισμός Αρχής (T1 -> T2): Διακεκομμένη γραμμή
        ax.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.5, label="Σκοπεύσεις Προσανατολισμού")
        
        # Κύρια Όδευση (T2 -> ... -> T3): 
        ax.plot(X[1:n-1], Y[1:n-1], color="#FF00BB", linestyle='-', linewidth=1.5, label="Πλευρές Όδευσης")
        
        # Προσανατολισμός Τέλους (T3 -> T4): Διακεκομμένη γραμμή
        ax.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--', linewidth=1.5)
    else:
        # Αν για κάποιο λόγο τα σημεία είναι λιγότερα, ενώνουμε απλά με μια γραμμή
        ax.plot(X, Y, color='#FF00BB', linestyle='-', linewidth=2)

    # 5. Αισθητικές παρεμβάσεις (Τίτλοι, πλέγμα, κλίμακα)
    ax.set_title("Διάγραμμα Όδευσης", fontsize=14, fontweight='bold', pad=15, loc='left')
    ax.set_xlabel("X (m)", fontsize=11, fontweight='bold')
    ax.set_ylabel("Y (m)", fontsize=11, fontweight='bold')
    
    # Το grid βοηθάει στην αίσθηση του χώρου
    ax.grid(True, linestyle=':', alpha=0.7)
    
    # Ρύθμιση του υπομνήματος (Legend)
    legend = ax.legend(loc='best', prop={'weight': 'bold'})
    legend.get_frame().set_facecolor('#1e1e1e')
    legend.get_frame().set_edgecolor('#333333')
    for text in legend.get_texts():
        text.set_color("white")
    
    # ΕΞΑΙΡΕΤΙΚΑ ΣΗΜΑΝΤΙΚΟ: Ίδια κλίμακα σε X και Y
    ax.set_aspect('equal', adjustable='datalim')

    plt.show()
    return "" # Κρατάω το return επειδή η συνάρτησή σου δηλώνει -> str



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