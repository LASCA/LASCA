import React from 'react';
import { Share2 } from 'lucide-react';
import CollabAvatar from './CollabAvatar';

/**
 * Κουμπί «Κοινοποίηση» δίπλα στο «Επιλογή Project». Δείχνει και ποιοι έχουν ήδη πρόσβαση.
 * members: [{ id, display_name, avatar_url, role }] (χωρίς τον εαυτό μου)
 */
export default function ShareButton({ onClick, members = [], disabled = false, hint, itemClass = '', asset = (u) => u }) {
  const names = members.map((m) => m.display_name).join(', ');
  const title = hint || (members.length ? `Κοινοποίηση · έχουν πρόσβαση: ${names}` : 'Κοινοποίηση project σε συνεργάτες');
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      aria-label={members.length ? `Κοινοποίηση, ${members.length} συνεργάτες` : 'Κοινοποίηση'}
      className={`${itemClass} px-2.5 md:px-3 border-[#663af3]/40 bg-[#663af3]/15 text-white hover:bg-[#663af3]/30 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`}>
      <Share2 size={15} aria-hidden="true" />
      <span className="hidden md:inline">Κοινοποίηση</span>
      {members.length > 0 && (
        <span className="hidden sm:flex -space-x-1.5 -mr-0.5" aria-hidden="true">
          {members.slice(0, 3).map((m) => <CollabAvatar key={m.id} user={m} src={asset(m.avatar_url)} size={20} ring />)}
          {members.length > 3 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold ring-2 ring-slate-950">+{members.length - 3}</span>
          )}
        </span>
      )}
    </button>
  );
}
