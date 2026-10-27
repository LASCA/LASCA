// Μετά τη δημιουργία λογαριασμού (και την επιβεβαίωση με τον κωδικό του email): σελίδα καλωσορίσματος
// (/welcome) και μετά εκεί που πήγαινε ο χρήστης (π.χ. ένα link πρόσκλησης), αλλιώς στην εφαρμογή.
export function welcomeUrl(from) {
  return from && from !== '/app' ? `/welcome?next=${encodeURIComponent(from)}` : '/welcome';
}

// Μόνο εσωτερικές διαδρομές (όχι «//άλλο-site»).
export function safeNext(value) {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/app';
}
