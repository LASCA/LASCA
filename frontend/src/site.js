// Στοιχεία της σελίδας που εμφανίζονται στους Όρους, στην Πολιτική Απορρήτου και στα meta tags.
// Το email επικοινωνίας ορίζεται στο frontend/.env.production: VITE_CONTACT_EMAIL=...
export const SITE = {
  name: 'LASCA',
  fullName: 'LASCA',
  description:
    'Δωρεάν εφαρμογή τοπογραφικών υπολογισμών για φοιτητές Αγρονόμων Τοπογράφων Μηχανικών: όδευση, ' +
    'χωροστάθμηση, ταχυμετρία, χάραξη, συνόρθωση, με αναφορές PDF, DXF, Excel και κοινά projects.',
  url: import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  github: 'https://github.com/LASCA/LASCA',
  legalUpdated: '14 Οκτωβρίου 2026',
  // Ίδιο με το TERMS_VERSION στο code/main_4_app.py. Όταν αλλάζουν ουσιαστικά οι Όροι, αλλάζουν και τα δύο:
  // οι υπάρχοντες χρήστες τότε τους αποδέχονται ξανά πριν συνεχίσουν.
  termsVersion: '2026-10-14',
  minAge: 15,
  hosting: 'Oracle Cloud Infrastructure (περιοχή ΕΕ: Μιλάνο, Ιταλία)',
};
