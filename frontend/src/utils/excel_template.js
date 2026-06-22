import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

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
    XLSX.utils.book_append_sheet(wb, wsAdj, "synorthosi_stathmou");

    // 2. Όδευση (traverse)
    const wsTrav = XLSX.utils.aoa_to_sheet([
      ["Stations", "Hz [grad]", "Slope_D [m]", "X [m]", "Y [m]"]
    ]);
    XLSX.utils.book_append_sheet(wb, wsTrav, "traverse");

    // 3. Στάσεις Ταχυμετρίας (stations_taxymetria)
    const wsStat = XLSX.utils.aoa_to_sheet([
      ["Station_Name", "XS", "YS", "ZS"]
    ]);
    XLSX.utils.book_append_sheet(wb, wsStat, "stations_taxymetria");

    // 4. Μετρήσεις Ταχυμετρίας (measurements_taxymetria)
    const wsMeas = XLSX.utils.aoa_to_sheet([
      ["Station", "Orientation", "HZ_O", "Station_Height", "", "From", "O", "Point_ID", "Hz", "Z", "SD", "TargetHeight"]
    ]);
    XLSX.utils.book_append_sheet(wb, wsMeas, "measurements_taxymetria");

    // 5. Τριγωνομετρική Υψομετρία (trig_leveling)
    const wsTrig = XLSX.utils.aoa_to_sheet([
      ["From", "To", "Slope_D", "Z[grad]", "H_station", "H_target"]
    ]);
    XLSX.utils.book_append_sheet(wb, wsTrig, "trig_leveling");

    // Αποθήκευση και λήψη του αρχείου Excel
    XLSX.writeFile(wb, 'Surveying_Data_Template.xlsx');
    toast.success('Το πρότυπο αρχείο κατέβηκε επιτυχώς!');
  } catch (error) {
    console.error('Template Download Error:', error);
    toast.error('Σφάλμα κατά τη δημιουργία του αρχείου προτύπου.');
  }
};