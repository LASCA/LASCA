import { useState } from 'react';

// Εικόνα προφίλ ή αρχικά. Κοινό για σελίδα και exe.
export default function CollabAvatar({ user, src, size = 28, ring = false, className = '' }) {
  const [failedSource, setFailedSource] = useState(null);
  const failed = failedSource === src;
  const name = user?.display_name || user?.email || '?';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) };
  const ringClass = ring ? 'ring-2 ring-slate-950' : '';
  if (src && !failed) {
    return (
      <img src={src} alt="" style={style} onError={() => setFailedSource(src)}
        className={`shrink-0 rounded-full object-cover border border-slate-600 ${ringClass} ${className}`} />
    );
  }
  return (
    <div style={style}
      className={`shrink-0 rounded-full bg-gradient-to-br from-[#d93a44] to-[#3b5bdb] text-white font-bold flex items-center justify-center ${ringClass} ${className}`}>
      {initials}
    </div>
  );
}
