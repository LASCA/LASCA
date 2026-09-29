import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, CloudOff, Eye, Loader2 } from 'lucide-react';
import CollabAvatar from './CollabAvatar';
import { TOOL_LABEL, describeActivity, timeAgo } from './collabApi';

/**
 * Μικρή μπάρα δίπλα στο «Project»: ποιοι άλλοι είναι μέσα τώρα, ιστορικό αλλαγών,
 * ένδειξη «μόνο ανάγνωση» και «offline». Ίδιο component στη σελίδα και στο exe.
 */
export function LiveBar({ presence = [], activity = [], readOnly, online = true, pending = false, asset = (u) => u, itemClass = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const others = presence.filter((p) => !p.self);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!online && (
        <span className={`${itemClass} px-3 border-amber-500/30 bg-amber-500/10 text-amber-300`}
          title={pending ? 'Χωρίς σύνδεση: οι αλλαγές σου θα ανέβουν μόλις επανέλθει το internet' : 'Χωρίς σύνδεση με τον server'}>
          <CloudOff size={14} /> <span className="hidden xl:inline">Offline{pending ? ' · εκκρεμούν αλλαγές' : ''}</span>
        </span>
      )}
      {readOnly && (
        <span className={`${itemClass} px-3 border-slate-600 bg-slate-800/70 text-slate-300`}
          title="Είσαι αναγνώστης: βλέπεις το project, αλλά οι αλλαγές σου δεν αποθηκεύονται">
          <Eye size={14} /> <span className="hidden xl:inline">Μόνο ανάγνωση</span>
        </span>
      )}
      {others.length > 0 && (
        <div className="hidden md:flex -space-x-2" aria-label="Συνεργάτες online">
          {others.slice(0, 4).map((p) => (
            <span key={p.id} className="relative" title={`${p.display_name} · ${TOOL_LABEL[p.tool] || p.tool || 'online'}${p.client === 'desktop' ? ' · πρόγραμμα Windows' : ''}`}>
              <CollabAvatar user={p} src={asset(p.avatar_url)} size={30} ring />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </span>
          ))}
          {others.length > 4 && (
            <span className="h-[30px] w-[30px] rounded-full bg-slate-800 ring-2 ring-slate-950 text-[10px] font-bold text-slate-200 flex items-center justify-center">
              +{others.length - 4}
            </span>
          )}
        </div>
      )}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} title="Ιστορικό αλλαγών"
          className={`${itemClass} px-2.5 border-slate-700/50 bg-slate-900/80 text-slate-300 hover:bg-slate-800`}>
          <Clock size={15} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/95 shadow-2xl backdrop-blur-sm z-[80]">
            <p className="sticky top-0 bg-slate-950/95 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
              Ιστορικό project
            </p>
            {activity.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">Τίποτα ακόμα.</p>
            ) : activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 px-3 py-2 border-b border-slate-900 last:border-0">
                <CollabAvatar user={a.user} src={asset(a.user?.avatar_url)} size={22} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-200">{describeActivity(a)}</p>
                  <p className="text-[10px] text-slate-500">{timeAgo(a.at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Όταν κάποιος άλλος άλλαξε το project την ίδια ώρα με εσένα. */
export function ConflictBanner({ conflict, onLoadTheirs, onKeepMine, busy }) {
  if (!conflict) return null;
  const who = conflict.updated_by?.display_name || 'Κάποιος άλλος';
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[140] w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100">Ο/Η {who} άλλαξε το project ενώ δούλευες</p>
          <p className="mt-1 text-xs text-slate-400">
            Οι τελευταίες αλλαγές σου δεν αποθηκεύτηκαν για να μη σβηστούν οι δικές του/της. Διάλεξε ποια έκδοση θα κρατήσεις.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onLoadTheirs} disabled={busy}
              className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-900 hover:bg-white">
              Φόρτωση των αλλαγών του/της
            </button>
            <button type="button" onClick={onKeepMine} disabled={busy}
              className="h-9 inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800">
              {busy && <Loader2 size={13} className="animate-spin" />} Κράτα τις δικές μου
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
