import React from 'react';
import { Share2 } from 'lucide-react';

/**
 * Κουμπί «Κοινοποίηση» (μόνο εικονίδιο), δεξιά από το «Ιστορικό αλλαγών».
 * Στο hover γράφει ποιοι έχουν ήδη πρόσβαση.
 * members: [{ id, display_name, avatar_url, role }] (χωρίς τον εαυτό μου)
 */
export default function ShareButton({ onClick, members = [], disabled = false, hint, itemClass = '' }) {
  const names = members.map((m) => m.display_name).join(', ');
  const title = hint || (members.length ? `Κοινοποίηση · έχουν πρόσβαση: ${names}` : 'Κοινοποίηση project σε συνεργάτες');
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      aria-label={members.length ? `Κοινοποίηση, έχουν πρόσβαση: ${names}` : 'Κοινοποίηση'}
      className={`${itemClass} px-2.5 border-slate-700/50 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`}>
      <Share2 size={15} aria-hidden="true" />
    </button>
  );
}
