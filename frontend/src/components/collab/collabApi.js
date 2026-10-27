// Κλήσεις για κοινοποίηση / μέλη / προσκλήσεις / ζωντανή συνεργασία.
// Το ίδιο αρχείο υπάρχει και στο πρόγραμμα των Windows: εκεί το prefix είναι '/api/cloud'
// (ο τοπικός server τα προωθεί στον online server του LASCA), εδώ είναι '/api'.
import axios from 'axios';

const TIMEOUT_MESSAGE = 'Η σύνδεση έληξε. Παρακαλώ ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';

export const ROLE_LABEL = { owner: 'Ιδιοκτήτης', editor: 'Επεξεργαστής', viewer: 'Αναγνώστης' };
export const ROLE_HINT = {
  editor: 'Βλέπει και αλλάζει δεδομένα',
  viewer: 'Μόνο βλέπει, δεν αλλάζει τίποτα',
};

export function apiError(error, fallback = 'Κάτι πήγε στραβά. Δοκίμασε ξανά.') {
  if (error?.code === 'ECONNABORTED') return TIMEOUT_MESSAGE;
  if (!error?.response) return 'Δεν υπάρχει σύνδεση με τον server.';
  return error.response.data?.error || error.response.data?.message || fallback;
}

export function createCollabApi(prefix = '/api') {
  const u = (path) => `${prefix}${path}`;
  const enc = encodeURIComponent;
  const data = (promise) => promise.then((r) => r.data);
  // Το κοινό axios (όχι axios.create): στη σελίδα έχει τον interceptor που βάζει το token του Clerk.
  const withTimeout = (config) => ({ timeout: 15000, ...config });
  const client = {
    get: (url, config) => axios.get(url, withTimeout(config)),
    post: (url, body, config) => axios.post(url, body, withTimeout(config)),
    patch: (url, body, config) => axios.patch(url, body, withTimeout(config)),
    delete: (url, config) => axios.delete(url, withTimeout(config)),
  };

  return {
    prefix,
    // Οι εικόνες προφίλ έρχονται ως '/api/users/..': στο exe περνάνε από τον τοπικό server.
    asset: (url) => (url && prefix !== '/api' ? url.replace(/^\/api/, prefix) : url),
    members: (pid) => data(client.get(u(`/projects/${enc(pid)}/members`))),
    addMember: (pid, email, role) => data(client.post(u(`/projects/${enc(pid)}/members`), { email, role })),
    changeRole: (pid, uid, role) => data(client.patch(u(`/projects/${enc(pid)}/members/${uid}`), { role })),
    removeMember: (pid, uid) => data(client.delete(u(`/projects/${enc(pid)}/members/${uid}`))),
    leave: (pid) => data(client.post(u(`/projects/${enc(pid)}/leave`))),
    transfer: (pid, userId) => data(client.post(u(`/projects/${enc(pid)}/transfer`), { user_id: userId })),
    invites: (pid) => data(client.get(u(`/projects/${enc(pid)}/invites`))),
    createInvite: (pid, body) => data(client.post(u(`/projects/${enc(pid)}/invites`), body)),
    revokeInvite: (pid, iid) => data(client.delete(u(`/projects/${enc(pid)}/invites/${iid}`))),
    activity: (pid) => data(client.get(u(`/projects/${enc(pid)}/activity`))),
    markSeen: (pid, lastId) => data(client.post(u(`/projects/${enc(pid)}/activity/seen`), { last_id: lastId })),
    lookup: (q) => data(client.get(u('/users/lookup'), { params: { q } })),
    sync: (pid, body) => data(client.post(u(`/projects/${enc(pid)}/sync`), body)),
  };
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 45) return 'μόλις τώρα';
  if (diff < 3600) return `πριν ${Math.round(diff / 60)} λεπ.`;
  if (diff < 86400) return `πριν ${Math.round(diff / 3600)} ώρ.`;
  if (diff < 86400 * 7) return `πριν ${Math.round(diff / 86400)} μέρ.`;
  return new Date(iso).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
}

export const TOOL_LABEL = {
  dashboard: 'Dashboard', goniometry: 'Γωνιομετρήσεις', adjustment: 'Συνόρθωση Σταθμού',
  trig_leveling: 'Τριγωνομετρική Υψομετρία', geom_leveling: 'Γεωμετρική Χωροστάθμηση',
  basic_calc: 'Βασικοί Υπολογισμοί', traverse: 'Όδευση (X,Y)', traverse_height: 'Υψομετρία Όδευσης',
  tachymetry: 'Αποτύπωση', stakeout: 'Χάραξη',
};

export function describeActivity(a) {
  const who = a.user?.display_name || 'Κάποιος';
  const target = a.detail?.user?.display_name || 'έναν χρήστη';
  const role = ROLE_LABEL[a.detail?.role] || '';
  switch (a.action) {
    case 'created': return `${who} δημιούργησε το project`;
    case 'saved': return a.detail?.summary ? `${who} άλλαξε: ${a.detail.summary}` : `${who} άλλαξε δεδομένα`;
    case 'member_added': return `${who} πρόσθεσε ${target} ως ${role.toLowerCase()}`;
    case 'role_changed': return `${who} έκανε ${target} ${role.toLowerCase()}`;
    case 'member_removed': return `${who} αφαίρεσε ${target}`;
    case 'left': return `${who} αποχώρησε από το project`;
    case 'ownership_transferred':
      return a.detail?.reason === 'account_deleted'
        ? `Το project πέρασε στον/στην ${target} (ο ιδιοκτήτης διέγραψε τον λογαριασμό του)`
        : `${who} μεταβίβασε την ιδιοκτησία στον/στην ${target}`;
    case 'invite_created': return `${who} δημιούργησε σύνδεσμο πρόσκλησης`;
    case 'joined_via_link': return `${who} μπήκε με σύνδεσμο πρόσκλησης`;
    default: return `${who}: ${a.action}`;
  }
}

/** Μία γραμμή για μια συγκεκριμένη αλλαγή του ιστορικού, π.χ. «Σ3 · X: 1000.00 → 1000.50». */
export function describeChange(c) {
  if (c.kind === 'added') return { sign: '+', text: c.row || 'νέα γραμμή' };
  if (c.kind === 'removed') return { sign: '−', text: c.row || 'γραμμή' };
  const fields = (c.fields || []).map((f) => (f.from == null && f.to == null ? f.field : `${f.field}: ${f.from} → ${f.to}`));
  const more = c.more_fields ? ` (+${c.more_fields})` : '';
  return { sign: '~', text: [c.row, fields.join(', ')].filter(Boolean).join(' · ') + more };
}

/** Μετρητές ενότητας, π.χ. «+2 · −1 · 3 αλλαγές». */
export function sectionCounts(s) {
  const parts = [];
  if (s.added) parts.push(`+${s.added} ${s.added === 1 ? 'νέα γραμμή' : 'νέες γραμμές'}`);
  if (s.removed) parts.push(`−${s.removed} ${s.removed === 1 ? 'διαγραφή' : 'διαγραφές'}`);
  if (s.modified) parts.push(`${s.modified} ${s.modified === 1 ? 'αλλαγή' : 'αλλαγές'}`);
  if (!parts.length && s.recalculated) parts.push('νέα αποτελέσματα');
  return parts.join(' · ');
}

/** Νέες εγγραφές ιστορικού + παλιές, χωρίς διπλές. Οι συνεχόμενες αποθηκεύσεις του ίδιου χρήστη
 * έρχονται ως νέα εγγραφή της ίδιας «συνεδρίας» (detail.session): κρατάμε μόνο την πιο πρόσφατη. */
export function mergeActivity(incoming, previous, limit = 60) {
  const sessions = new Set(incoming.map((a) => a.detail?.session).filter(Boolean));
  const ids = new Set(incoming.map((a) => a.id));
  const kept = previous.filter((a) => !ids.has(a.id) && !(a.detail?.session && sessions.has(a.detail.session)));
  return [...incoming, ...kept].sort((x, y) => y.id - x.id).slice(0, limit);
}
