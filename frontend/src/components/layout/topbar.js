// Κοινό στυλ για τα widgets της μπάρας πάνω δεξιά (Project, Αλλαγή Project, Χρήστης):
// ίδιο ύψος (h-9), ίδιες γωνίες, ίδιο περίγραμμα και μέγεθος γραμμάτων.
export const TOPBAR_ITEM =
  'h-9 inline-flex items-center gap-2 rounded-xl border text-xs font-bold ' +
  'shadow-lg backdrop-blur-sm transition-all shrink-0 whitespace-nowrap';

export const TOPBAR_NEUTRAL =
  'border-slate-700/50 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600';

// Αρχική σελίδα (dashboard): χωρίς πλαίσιο, μόνο κείμενο/εικονίδιο. Το πλαίσιο εμφανίζεται στο hover.
export const TOPBAR_BARE =
  'border-transparent bg-transparent shadow-none backdrop-blur-none text-slate-200 ' +
  'hover:bg-slate-800/60 hover:border-slate-700/50';
