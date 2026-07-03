import XLSX from 'xlsx-js-style';
import { toast } from 'react-hot-toast';

/**
 * Βοηθητική συνάρτηση που μορφοποιεί αυτόματα τις επικεφαλίδες.
 * Βάζει προκαθορισμένη γραμματοσειρά, μέγεθος και στυλ στα headers (Γραμμή 1).
 */
const applyProfessionalStyles = (ws) => {
  if (!ws) return;

  for (let cellId in ws) {
    if (cellId[0] === '!') continue;

    const cell = ws[cellId];
    const rowNumber = cellId.replace(/^[A-Z]+/, '');

    // Επικεφαλίδες (Γραμμή 1)
    if (rowNumber === '1') {
      cell.s = {
        font: {
          name: "Segoe UI",
          sz: 11,
          bold: true,
          color: { rgb: "FFFFFF" }
        },
        fill: {
          fgColor: { rgb: "1E293B" } // Σκούρο μπλε/slate
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      };
    } 
    // Δεδομένα
    else {
      cell.s = {
        font: {
          name: "Segoe UI",
          sz: 10,
          bold: false
        },
        alignment: {
          horizontal: "left",
          vertical: "center"
        }
      };
    }
  }
};

/**
 * Δημιουργεί και κατεβάζει αυτόματα το πρότυπο αρχείο Excel 
 * με τη σωστή δομή φύλλων και στηλών για την εφαρμογή.
 */
export const downloadSurveyTemplate = () => {
  try {
    const wb = XLSX.utils.book_new();

    // 1. Συνόρθωση (synorthosi_stathmou)
    const wsAdj = XLSX.utils.aoa_to_sheet([
      ["From", "To", "Period", "Face I", "Face II"]
    ]);
    applyProfessionalStyles(wsAdj);
    XLSX.utils.book_append_sheet(wb, wsAdj, "synorthosi_stathmou");

    // 2. Όδευση (traverse)
    const wsTrav = XLSX.utils.aoa_to_sheet([
      ["Stations", "Hz [grad]", "Slope_D [m]", "X [m]", "Y [m]", "H[m]", "", "", "From", "To",  "Slope_D",  "Z[grad]",  "H_station",  "H_target"]
    ]);
    applyProfessionalStyles(wsTrav);
    XLSX.utils.book_append_sheet(wb, wsTrav, "traverse");

    // 3. Στάσεις Ταχυμετρίας (stations_taxymetria)
    const wsStat = XLSX.utils.aoa_to_sheet([
      ["Station_Name", "XS", "YS", "ZS"]
    ]);
    applyProfessionalStyles(wsStat);
    XLSX.utils.book_append_sheet(wb, wsStat, "stations_taxymetria");

    // 4. Μετρήσεις Ταχυμετρίας (measurements_taxymetria)
    const wsMeas = XLSX.utils.aoa_to_sheet([
      ["Station", "Orientation", "HZ_O", "Station_Height", "", "From", "O", "Point_ID", "Hz", "Z", "SD", "TargetHeight"]
    ]);
    applyProfessionalStyles(wsMeas);
    XLSX.utils.book_append_sheet(wb, wsMeas, "measurements_taxymetria");

    // 5. Χάραξη
    const wsChar = XLSX.utils.aoa_to_sheet([
      ["Point", "E[m]", "N[m]"]
    ]);
    applyProfessionalStyles(wsChar);
    XLSX.utils.book_append_sheet(wb, wsChar, "charaxi");
    
    // 6. Τριγωνομετρική Υψομετρία (trig_leveling)
    const wsTrig = XLSX.utils.aoa_to_sheet([
      ["From", "To", "Slope_D", "Z[grad]", "H_station", "H_target"]
    ]);
    applyProfessionalStyles(wsTrig);
    XLSX.utils.book_append_sheet(wb, wsTrig, "trig_leveling");

    // Αποθήκευση και λήψη του αρχείου Excel
    XLSX.writeFile(wb, 'Surveying_Data_Template.xlsx');
    toast.success('Το πρότυπο αρχείο κατέβηκε επιτυχώς!');
  } catch (error) {
    console.error('Template Download Error:', error);
    toast.error('Σφάλμα κατά τη δημιουργία του αρχείου προτύπου.');
  }
};