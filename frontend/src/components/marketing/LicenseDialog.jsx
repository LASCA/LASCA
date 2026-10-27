import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

// Η άδεια χρήσης του LASCA: το αρχείο LICENSE του repo, αυτούσιο (ο server το δίνει στο /license.txt).
// Μικρός μετατροπέας Markdown μόνο για ό,τι χρησιμοποιεί το LICENSE (τίτλοι, λίστες, έντονα, παράθεμα).
function renderMarkdown(src) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  const inline = (text, key) => text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => (
    part.startsWith('**') ? <strong key={`${key}-${i}`} className="text-white">{part.slice(2, -2)}</strong> : part
  ));
  src.replace(/^﻿/, '').replace(/\r/g, '').split('\n').forEach((raw, n) => {
    const line = raw.trim();
    let m;
    if (!line) { flush(); return; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flush();
      const Tag = `h${m[1].length + 1}`;
      blocks.push(<Tag key={n} className={m[1].length === 1 ? 'mt-2 font-[Manrope] text-[22px] font-semibold text-white' : 'mt-6 text-[15px] font-semibold text-white'}>{inline(m[2], n)}</Tag>);
    } else if (/^---+$/.test(line)) {
      flush(); blocks.push(<hr key={n} className="my-5 border-slate-800" />);
    } else if ((m = line.match(/^(?:[*-]|\d+\.)\s+(.*)$/))) {
      const ordered = /^\d+\./.test(line);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [], key: n }; }
      list.items.push(<li key={n}>{inline(m[1], n)}</li>);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush(); blocks.push(<blockquote key={n} className="my-3 border-l-2 border-indigo-500 pl-3 text-slate-200">{inline(m[1], n)}</blockquote>);
    } else {
      flush(); blocks.push(<p key={n} className="my-2">{inline(line, n)}</p>);
    }
  });
  flush();
  return blocks.map((b) => (b && b.items
    ? (b.ordered
      ? <ol key={b.key} className="my-2 list-decimal space-y-1 pl-6">{b.items}</ol>
      : <ul key={b.key} className="my-2 list-disc space-y-1 pl-6">{b.items}</ul>)
    : b));
}

export default function LicenseDialog({ open, onClose }) {
  const ref = useRef(null);
  const [text, setText] = useState(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (!open || text !== null) return;
    fetch('/license.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setText)
      .catch(() => setText(''));
  }, [open, text]);

  return (
    <dialog ref={ref} onClose={onClose} onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="license-title"
      className="w-[min(760px,calc(100vw-32px))] max-h-[min(80vh,820px)] overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1221] p-0 text-slate-300 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0b1120] px-5 py-4">
        <h2 id="license-title" className="text-[16px] font-semibold text-white">Άδεια χρήσης</h2>
        <button type="button" onClick={onClose} aria-label="Κλείσιμο"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X size={15} />
        </button>
      </div>
      <div className="max-h-[calc(min(80vh,820px)-66px)] overflow-y-auto px-6 pb-6 pt-1 text-[14px] leading-relaxed">
        {text === null ? <Loader2 size={16} className="mt-5 animate-spin text-slate-500" />
          : text ? renderMarkdown(text)
            : <p className="mt-5 text-slate-400">Η άδεια δεν φορτώθηκε. Δοκίμασε ξανά αργότερα.</p>}
      </div>
    </dialog>
  );
}
