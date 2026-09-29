// Κλήσεις για κοινοποίηση / μέλη / προσκλήσεις / ζωντανή συνεργασία.
// Το ίδιο αρχείο υπάρχει και στο πρόγραμμα των Windows: εκεί το prefix είναι '/api/cloud'
// (ο τοπικός server τα προωθεί στον online server της LASCA), εδώ είναι '/api'.
import axios from 'axios';

export const ROLE_LABEL = { owner: 'Ιδιοκτήτης', editor: 'Επεξεργαστής', viewer: 'Αναγνώστης' };
export const ROLE_HINT = {
  editor: 'Βλέπει και αλλάζει δεδομένα',
  viewer: 'Μόνο βλέπει, δεν αλλάζει τίποτα',
};

export function apiError(error, fallback = 'Κάτι πήγε στραβά. Δοκίμασε ξανά.') {
  if (!error?.response) return 'Δεν υπάρχει σύνδεση με τον server.';
  return error.response.data?.error || error.response.data?.message || fallback;
}

export function createCollabApi(prefix = '/api') {
  const u = (path) => `${prefix}${path}`;
  const enc = encodeURIComponent;
  const data = (promise) => promise.then((r) => r.data);
  return {
    prefix,
    // Οι εικόνες προφίλ έρχονται ως '/api/users/..': στο exe περνάνε από τον τοπικό server.
    asset: (url) => (url && prefix !== '/api' ? url.replace(/^\/api/, prefix) : url),
    members: (pid) => data(axios.get(u(`/projects/${enc(pid)}/members`))),
    addMember: (pid, email, role) => data(axios.post(u(`/projects/${enc(pid)}/members`), { email, role })),
    changeRole: (pid, uid, role) => data(axios.patch(u(`/projects/${enc(pid)}/members/${uid}`), { role })),
    removeMember: (pid, uid) => data(axios.delete(u(`/projects/${enc(pid)}/members/${uid}`))),
    leave: (pid) => data(axios.post(u(`/projects/${enc(pid)}/leave`))),
    transfer: (pid, userId) => data(axios.post(u(`/projects/${enc(pid)}/transfer`), { user_id: userId })),
    invites: (pid) => data(axios.get(u(`/projects/${enc(pid)}/invites`))),
    createInvite: (pid, body) => data(axios.post(u(`/projects/${enc(pid)}/invites`), body)),
    revokeInvite: (pid, iid) => data(axios.delete(u(`/projects/${enc(pid)}/invites/${iid}`))),
    activity: (pid) => data(axios.get(u(`/projects/${enc(pid)}/activity`))),
    lookup: (q) => data(axios.get(u('/users/lookup'), { params: { q } })),
    sync: (pid, body) => data(axios.post(u(`/projects/${enc(pid)}/sync`), body)),
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
    case 'saved': return `${who} άλλαξε δεδομένα`;
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
