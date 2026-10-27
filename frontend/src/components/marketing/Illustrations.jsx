import React, { useId } from 'react';

/*
 * Εικονογραφήσεις «με το χέρι» για το LASCA (εμπνευσμένες από το στυλ ian-xiaohei-illustrations):
 * λεπτές γραμμές με ελαφρύ τρέμουλο, πολύς κενός χώρος, ένας μικρός ήρωας που ΚΑΝΕΙ την ενέργεια,
 * και χρώμα με νόημα: κόκκινο = πρόβλημα, πορτοκαλί = διαδικασία, μπλε = απόδειξη / σωστό αποτέλεσμα.
 * Ο ήρωας είναι ο «Σταθμός»: ένα μικρό γεωδαιτικό όργανο πάνω σε τρίποδο, με δύο τελείες για μάτια.
 */
const INK = '#d1e4fa';
const RED = '#e46d4c';
const ORANGE = '#f0a35e';
const BLUE = '#b6d9fc';

function Wobble({ id }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

/** Ο «Σταθμός» (x,y = βάση τρίποδου). look: γωνία που κοιτάζει το τηλεσκόπιο (μοίρες). */
function Station({ x, y, scale = 1, look = -12, mood = 'calm' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* τρίποδο */}
      <path d="M0 -38 L-22 0 M0 -38 L22 0 M0 -38 L1 2" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* σώμα */}
      <rect x="-15" y="-66" width="30" height="28" rx="9" fill="#05060f" stroke={INK} strokeWidth="2" />
      {/* μάτια */}
      <circle cx="-5" cy="-53" r="2.3" fill={INK} />
      <circle cx="6" cy="-53" r="2.3" fill={INK} />
      {mood === 'worried' && <path d="M-6 -45 q6 -3 12 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      {mood === 'happy' && <path d="M-6 -46 q6 4 12 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      {/* τηλεσκόπιο */}
      <g transform={`rotate(${look} 0 -70)`}>
        <rect x="-4" y="-76" width="30" height="10" rx="4" fill="#05060f" stroke={INK} strokeWidth="2" />
      </g>
    </g>
  );
}

/** Αρχική σελίδα: μια όδευση που «κλείνει» σωστά. */
export function TraverseIllustration({ className = '' }) {
  const f = useId().replace(/:/g, '');
  const pts = [[70, 250], [190, 190], [330, 225], [450, 120], [560, 160]];
  return (
    <svg viewBox="40 95 600 220" className={className} role="img"
      aria-label="Σκίτσο: ένα τοπογραφικό όργανο μετράει γωνίες και αποστάσεις μιας όδευσης με πέντε στάσεις· το σφάλμα κλεισίματος είναι μέσα στα όρια.">
      <defs><Wobble id={f} /></defs>
      <g filter={`url(#${f})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={pts.map((p) => p.join(',')).join(' ')} stroke={INK} strokeWidth="1.8" strokeDasharray="7 7" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x - 6} ${y} h12 M${x} ${y - 6} v12`} stroke={BLUE} strokeWidth="1.8" />
            <text x={x + 9} y={y - 10} fill={INK} fontSize="15" fontFamily="JetBrains Mono, monospace" stroke="none">Σ{i + 1}</text>
          </g>
        ))}
        {/* γωνία που μετριέται */}
        <path d="M206 182 A26 26 0 0 1 214 204" stroke={ORANGE} strokeWidth="2" />
        <text x="222" y="174" fill={ORANGE} fontSize="15" fontFamily="JetBrains Mono, monospace" stroke="none">β = 187.4321ᵍ</text>
        {/* μέτρηση απόστασης */}
        <path d="M335 240 L445 135" stroke={ORANGE} strokeWidth="1.4" strokeDasharray="2 6" />
        <text x="395" y="205" fill={ORANGE} fontSize="15" fontFamily="JetBrains Mono, monospace" stroke="none">S = 154.27 m</text>
        {/* αποτέλεσμα: κλείσιμο εντός ορίων */}
        <g transform="translate(462 236)">
          <rect x="-20" y="-6" width="172" height="62" rx="10" stroke={BLUE} strokeWidth="1.6" fill="rgba(182,217,252,0.04)" />
          <text x="14" y="23" fill={BLUE} fontSize="14" fontFamily="JetBrains Mono, monospace" stroke="none">fs = 0.012 m</text>
          <text x="14" y="42" fill={BLUE} fontSize="14" fontFamily="JetBrains Mono, monospace" stroke="none">✓ εντός ορίων</text>
        </g>
      </g>
      <g filter={`url(#${f})`}><Station x={190} y={296} scale={1.1} look={-28} mood="happy" /></g>
      <path d="M216 228 L196 212" stroke={ORANGE} strokeWidth="1.4" strokeDasharray="2 5" fill="none" />
    </svg>
  );
}

/** Σελίδα 404: το σημείο δεν βρέθηκε. */
export function LostPointIllustration({ className = '' }) {
  const f = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 520 300" className={className} role="img"
      aria-label="Σκίτσο: το τοπογραφικό όργανο σκοπεύει προς ένα σημείο που λείπει· στη θέση του υπάρχει ένα κόκκινο ερωτηματικό.">
      <defs><Wobble id={f} /></defs>
      <g filter={`url(#${f})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[[70, 90], [120, 210], [460, 230]].map(([x, y], i) => (
          <path key={i} d={`M${x - 6} ${y} h12 M${x} ${y - 6} v12`} stroke={BLUE} strokeWidth="1.8" />
        ))}
        <path d="M230 150 L400 92" stroke={ORANGE} strokeWidth="1.6" strokeDasharray="3 7" />
        <circle cx="420" cy="86" r="22" stroke={RED} strokeWidth="2" strokeDasharray="5 5" />
        <text x="411" y="96" fill={RED} fontSize="28" fontFamily="Manrope, sans-serif" stroke="none">?</text>
        <text x="352" y="44" fill={RED} fontSize="13" fontFamily="JetBrains Mono, monospace" stroke="none">X = ?   Y = ?</text>
        <text x="260" y="180" fill={ORANGE} fontSize="12" fontFamily="JetBrains Mono, monospace" stroke="none">σκόπευση…</text>
      </g>
      <g filter={`url(#${f})`}><Station x={210} y={268} scale={1.25} look={-18} mood="worried" /></g>
    </svg>
  );
}

/** Κοινά projects: δύο όργανα στα ίδια δεδομένα. */
export function CollaborateIllustration({ className = '' }) {
  const f = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 420 220" className={className} role="img"
      aria-label="Σκίτσο: δύο τοπογραφικά όργανα δουλεύουν πάνω στο ίδιο κοινό project και βλέπουν τις αλλαγές το ένα του άλλου.">
      <defs><Wobble id={f} /></defs>
      <g filter={`url(#${f})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="150" y="40" width="120" height="80" rx="12" stroke={BLUE} strokeWidth="1.8" fill="rgba(182,217,252,0.04)" />
        <path d="M168 66 h84 M168 82 h60 M168 98 h72" stroke={BLUE} strokeWidth="1.6" />
        <text x="160" y="32" fill={BLUE} fontSize="12" fontFamily="JetBrains Mono, monospace" stroke="none">κοινό project</text>
        <path d="M110 150 C120 120 135 108 150 100" stroke={ORANGE} strokeWidth="1.6" strokeDasharray="3 6" />
        <path d="M310 150 C300 120 285 108 270 100" stroke={ORANGE} strokeWidth="1.6" strokeDasharray="3 6" />
        <text x="22" y="120" fill={ORANGE} fontSize="12" fontFamily="JetBrains Mono, monospace" stroke="none">αποθήκευση</text>
        <text x="320" y="120" fill={ORANGE} fontSize="12" fontFamily="JetBrains Mono, monospace" stroke="none">ενημέρωση</text>
      </g>
      <g filter={`url(#${f})`}>
        <Station x={95} y={214} look={-30} mood="happy" />
        <g transform="translate(325 0) scale(-1 1) translate(-325 0)"><Station x={325} y={214} look={-30} mood="happy" /></g>
      </g>
    </svg>
  );
}
