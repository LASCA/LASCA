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
    
    # 3. Σχεδιασμός των σημείων (κόκκινες κουκκίδες)
    plt.scatter(X, Y, color='magenta', zorder=5, s=50, marker='^')
    ax.ticklabel_format(useOffset=False, style='plain', axis='both')
    # Προσθήκη ονομάτων δίπλα στα σημεία
    for i, txt in enumerate(names):
        plt.annotate(
            txt, 
            (X[i], Y[i]), 
            xytext=(7, 7), 
            textcoords='offset points',
            fontsize=11,
            fontweight='bold',
            color="#FFFEFE"
        )

    n = len(valid_points)
    
    # 4. Σχεδιασμός των γραμμών (Σκοπεύσεις vs Οδεύσεις)
    # Βασιζόμαστε στη λογική της συνάρτησης σου: T1, T2, ..., T3, T4
    if n >= 4:
        # Προσανατολισμός Αρχής (T1 -> T2): Διακεκομμένη γραμμή
        plt.plot(X[0:2], Y[0:2], color='gray', linestyle='--', linewidth=1.5, label="Σκοπεύσεις Προσανατολισμού")
        
        # Κύρια Όδευση (T2 -> ... -> T3): Μπλε συνεχόμενη γραμμή
        plt.plot(X[1:n-1], Y[1:n-1], color='#2563eb', linestyle='-', linewidth=2.5, label="Πλευρές Όδευσης")
        
        # Προσανατολισμός Τέλους (T3 -> T4): Διακεκομμένη γραμμή
        plt.plot(X[n-2:n], Y[n-2:n], color='gray', linestyle='--', linewidth=1.5)
    else:
        # Αν για κάποιο λόγο τα σημεία είναι λιγότερα, ενώνουμε απλά με μια γραμμή
        plt.plot(X, Y, color='#2563eb', linestyle='-', linewidth=2)

    # 5. Αισθητικές παρεμβάσεις (Τίτλοι, πλέγμα, κλίμακα)
    plt.title("Διάγραμμα Όδευσης", fontsize=14, fontweight='bold', pad=15)
    plt.xlabel("Τετμημένη X (m)", fontsize=11, fontweight='bold', )
    plt.ylabel("Τεταγμένη Y (m)", fontsize=11, fontweight='bold')
    
    # Το grid βοηθάει στην αίσθηση του χώρου
    plt.grid(True, linestyle=':', alpha=0.7)
    legend = plt.legend(loc='best', prop={'weight': 'bold'})
    
    # ΕΞΑΙΡΕΤΙΚΑ ΣΗΜΑΝΤΙΚΟ για τοπογραφικά: Ίδια κλίμακα σε X και Y για να μην παραμορφώνονται οι γωνίες
    plt.gca().set_aspect('equal', adjustable='datalim')

    plt.show()