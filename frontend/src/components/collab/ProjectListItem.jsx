import React from 'react';
import {
  ChevronRight, CloudAlert, CloudCheck, CloudDownload, CloudOff, CloudUpload, HardDrive, Loader2, Trash2,
} from 'lucide-react';
import CollabAvatar from './CollabAvatar';
import { ROLE_LABEL, timeAgo } from './collabApi';

// Ένδειξη «πού είναι» το project. Ίδιο component στη σελίδα και στο exe.
export const SYNC_STATUS = {
  synced: { icon: CloudCheck, label: 'Στο cloud', hint: 'Έχει ανέβει στο cloud και είναι συγχρονισμένο', cls: 'text-[#5fd3bf] border-[#269684]/40 bg-[#269684]/10' },
  pending: { icon: CloudUpload, label: 'Αναμονή ανεβάσματος', hint: 'Οι αλλαγές θα ανέβουν αυτόματα μόλις υπάρξει σύνδεση στο internet', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  uploading: { icon: Loader2, spin: true, label: 'Ανεβαίνει…', hint: 'Ανεβαίνει τώρα στο cloud', cls: 'text-blueprint border-[#b6d9fc]/30 bg-[#b6d9fc]/10' },
  conflict: { icon: CloudAlert, label: 'Θέλει επιλογή', hint: 'Άλλαξε και εδώ και στο cloud: άνοιξέ το για να διαλέξεις ποια έκδοση κρατάς', cls: 'text-[#ff9b80] border-[#e46d4c]/40 bg-[#e46d4c]/10' },
  error: { icon: CloudAlert, label: 'Δεν ανέβηκε', hint: 'Το ανέβασμα απέτυχε· θα ξαναδοκιμάσει αργότερα', cls: 'text-[#ff9b80] border-[#e46d4c]/40 bg-[#e46d4c]/10' },
  cloud_only: { icon: CloudDownload, label: 'Μόνο στο cloud', hint: 'Δεν υπάρχει ακόμα σε αυτόν τον υπολογιστή· κατεβαίνει όταν το ανοίξεις', cls: 'text-blueprint border-[#b6d9fc]/30 bg-[#b6d9fc]/10' },
  local: { icon: HardDrive, label: 'Μόνο τοπικά', hint: 'Συνδέσου για να ανέβει αυτόματα στο cloud', cls: 'text-fog border-slate-600/60 bg-slate-800/40' },
  other_account: { icon: HardDrive, label: 'Άλλος λογαριασμός', hint: 'Ανήκει σε άλλον λογαριασμό LASCA που συνδέθηκε σε αυτόν τον υπολογιστή', cls: 'text-fog border-slate-600/60 bg-slate-800/40' },
  detached: { icon: CloudOff, label: 'Εκτός cloud', hint: 'Δεν έχεις πια πρόσβαση στο cloud project· κρατήθηκε τοπικό αντίγραφο', cls: 'text-fog border-slate-600/60 bg-slate-800/40' },
};

export function SyncBadge({ status, title }) {
  const s = SYNC_STATUS[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span title={title || s.hint} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      <Icon size={11} className={s.spin ? 'animate-spin' : ''} aria-hidden="true" /> {s.label}
    </span>
  );
}

function MemberStack({ members = [], count = 0, asset }) {
  if (!members.length) return null;
  const extra = Math.max(0, count - members.length);
  const names = members.map((m) => `${m.display_name} (${ROLE_LABEL[m.role] || m.role})`).join(', ');
  if (count <= 1) return <span className="text-[10.5px] text-fog" title={names}>Μόνο εσύ</span>;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Κοινοποιημένο σε: ${names}${extra ? ` και ${extra} ακόμα` : ''}`}>
      <span className="flex -space-x-1.5">
        {members.slice(0, 4).map((m) => <CollabAvatar key={m.id} user={m} src={asset(m.avatar_url)} size={20} ring />)}
      </span>
      <span className="text-[10.5px] text-fog">{count} {count === 1 ? 'άτομο' : 'άτομα'}</span>
    </span>
  );
}

/**
 * Γραμμή στη λίστα «Άνοιγμα υπάρχοντος»: όνομα, ένδειξη cloud, ρόλος, μέλη, νέες αλλαγές.
 * item: { key, name, status, statusTitle, role, members, members_count, unread, updated_at, active, canDelete }
 */
export default function ProjectListItem({ item, onOpen, onDelete, busy, asset = (u) => u }) {
  const shared = item.role && item.role !== 'owner';
  return (
    <div role="button" tabIndex={busy ? -1 : 0}
      onClick={() => !busy && onOpen(item)}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); onOpen(item); } }}
      className={`group w-full bg-slate-950/30 hover:bg-amber-500/[0.03] border ${item.active ? 'border-emerald-500/30' : 'border-slate-800/80'} hover:border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99] ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-mono font-bold text-slate-300 group-hover:text-amber-400 transition-colors truncate">{item.name}</span>
          {item.unread > 0 && (
            <span className="shrink-0 rounded-full bg-[#663af3]/25 px-1.5 py-px text-[9.5px] font-bold text-[#cbbcff]"
              title="Αλλαγές συνεργατών που δεν έχεις δει">
              {item.unread > 99 ? '99+' : item.unread} {item.unread === 1 ? 'νέα αλλαγή' : 'νέες αλλαγές'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <SyncBadge status={item.status} title={item.statusTitle} />
          {shared && <span className="text-[10.5px] text-fog">Κοινό · {ROLE_LABEL[item.role]}</span>}
          <MemberStack members={item.members} count={item.members_count || 0} asset={asset} />
          {item.updated_at && <span className="text-[10.5px] text-slate-500">αλλαγή {timeAgo(item.updated_at)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.canDelete && onDelete && (
          <button type="button" aria-label={`Διαγραφή του project ${item.name}`} title="Διαγραφή project"
            onClick={(e) => { e.stopPropagation(); onDelete(item); }} disabled={busy}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed">
            <Trash2 size={15} />
          </button>
        )}
        <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
