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
export const downloadSurveyTemplate = async () => {
  try {
    const wb = XLSX.utils.book_new();
    // γωνιομετρησεις
    const wsgwn = XLSX.utils.aoa_to_sheet([
      ["From", "To", "Period", "Face I", "Face II", "Z_Face I", "Z_Face II"]
    ]);
    applyProfessionalStyles(wsgwn);
    XLSX.utils.book_append_sheet(wb, wsgwn, "gwniometriseis");

    // 1. Συνόρθωση (synorthosi_stathmou)
    const wsAdj = XLSX.utils.aoa_to_sheet([
      ["From", "To", "Period", "Face I", "Face II"]
    ]);
    applyProfessionalStyles(wsAdj);
    XLSX.utils.book_append_sheet(wb, wsAdj, "synorthosi_stathmou");

    // 2. Όδευση (traverse)
    const wsTrav = XLSX.utils.aoa_to_sheet([
      ["Stations", "Hz [grad]", "D [m]", "X [m]", "Y [m]", "H [m]"]]);
    applyProfessionalStyles(wsTrav);
    XLSX.utils.book_append_sheet(wb, wsTrav, "traverse");

    //  Υψομετρία Όδευσης (traverse_height)
    const wsTrav_h = XLSX.utils.aoa_to_sheet([
      ["From", "To", "D [m]", "Z[grad]", "H_station", "H_target"]]);
    applyProfessionalStyles(wsTrav_h);
    XLSX.utils.book_append_sheet(wb, wsTrav_h, "traverse_leveling");

    // 3. Στάσεις Ταχυμετρίας (stations_taxymetria)
    const wsStat = XLSX.utils.aoa_to_sheet([
      ["Station_Name", "XS", "YS", "ZS"]]);
    applyProfessionalStyles(wsStat);
    XLSX.utils.book_append_sheet(wb, wsStat, "stations_taxymetria");

    // 4. Μετρήσεις Ταχυμετρίας (measurements_taxymetria)
    const wsMeas = XLSX.utils.aoa_to_sheet([
      ["Station", "Orientation", "HZ_O", "Station_Height", "", "From", "O", "Point_ID", "Hz", "Z", "SD", "TargetHeight"]]);
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

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const defaultFileName = 'Surveying_Data_Template.xlsx';

    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Excel Workbook',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success('Το πρότυπο αρχείο αποθηκεύτηκε επιτυχώς!');
        return;
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('showSaveFilePicker failed, falling back to browser download:', error);
      } else {
        console.info('Save dialog canceled by user, using fallback download flow.');
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Το πρότυπο αρχείο κατέβηκε επιτυχώς!');
  } catch (error) {
    console.error('Template Download Error:', error);
    toast.error('Σφάλμα κατά τη δημιουργία του αρχείου προτύπου.');
  }
};