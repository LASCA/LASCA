// Προαιρετικά στατιστικά επισκεψιμότητας ΧΩΡΙΣ cookies (π.χ. Plausible ή Umami, self-hosted ή cloud).
// Ενεργοποιούνται μόνο αν οριστούν στο frontend/.env.production:
//   VITE_ANALYTICS_SRC=https://plausible.io/js/script.js
//   VITE_ANALYTICS_DOMAIN=το-domain-σου
// και στον server ANALYTICS_ORIGIN=https://plausible.io (για να το επιτρέψει το Content-Security-Policy).
// Δεν χρησιμοποιούμε ποτέ «session replay» (καταγραφή κινήσεων/πληκτρολόγησης).
export function loadAnalytics() {
  const src = import.meta.env.VITE_ANALYTICS_SRC;
  const domain = import.meta.env.VITE_ANALYTICS_DOMAIN;
  if (!src || typeof document === 'undefined' || document.getElementById('lasca-analytics')) return;
  if (navigator.doNotTrack === '1' || window.globalPrivacyControl) return; // σεβόμαστε το «Do Not Track» / GPC
  const s = document.createElement('script');
  s.id = 'lasca-analytics';
  s.defer = true;
  s.src = src;
  if (domain) {
    s.dataset.domain = domain;          // Plausible
    s.dataset.websiteId = domain;       // Umami (website id)
  }
  document.head.appendChild(s);
}
