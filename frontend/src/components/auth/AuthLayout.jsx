import React from 'react';
import LascaLogo from '../brand/LascaLogo';

// Κοινό πλαίσιο για Σύνδεση / Εγγραφή: αριστερά η ταυτότητα, δεξιά η φόρμα.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-200">
      <div className="min-h-full grid lg:grid-cols-[1.05fr_1fr]">
        {/* Αριστερό πάνελ: μόνο σε μεγάλες οθόνες */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-slate-800/80 p-12">
          <SurveyGrid />
          <div className="relative"><LascaLogo height={36} textClass="text-2xl" /></div>
          <div className="relative max-w-md">
            <p className="text-[11px] font-mono tracking-[0.3em] text-slate-500 mb-4">LAND SURVEYING COMPUTATIONS</p>
            <h2 className="text-4xl font-black leading-tight text-slate-50">
              Όλοι οι τοπογραφικοί υπολογισμοί,{' '}
              <span className="bg-gradient-to-r from-[#e0424a] to-[#4d6bef] bg-clip-text text-transparent">σε μια εφαρμογή</span>
            </h2>
            <p className="mt-5 text-slate-400 leading-relaxed">
              Λύσε οδεύσεις, χωροσταθμήσεις, αποτυπώσεις και χαράξεις από τον browser σου,
              μοιράσου τα project με την ομάδα σου, και εξήγαγε τα αποτελέσματά σου.
            </p>
          </div>
          <p className="relative text-xs text-slate-600">© {new Date().getFullYear()} LASCA · Land Surveying Computations Application</p>
        </aside>

        {/* Φόρμα */}
        <main className="flex flex-col px-5 py-8 sm:px-10">
          <div className="lg:hidden mb-10"><LascaLogo height={28} /></div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <h1 className="text-2xl font-black text-slate-50">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
              <div className="mt-8">{children}</div>
              {footer && <div className="mt-8 text-center text-sm text-slate-400">{footer}</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Διακοσμητικό φόντο: κάνναβος συντεταγμένων με μια όδευση.
export function SurveyGrid({ className = '' }) {
  return (
    <svg className={`absolute inset-0 h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <pattern id="lasca-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="rgb(51 65 85 / 0.35)" strokeWidth="1" />
        </pattern>
        <linearGradient id="lasca-trav" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0424a" />
          <stop offset="1" stopColor="#3b5bdb" />
        </linearGradient>
        <radialGradient id="lasca-fade" cx="50%" cy="45%" r="70%">
          <stop offset="0" stopColor="#020617" stopOpacity="0" />
          <stop offset="1" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#lasca-grid)" />
      <g opacity="0.55">
        <polyline
          points="70,520 190,410 330,450 450,300 600,330 700,190"
          fill="none" stroke="url(#lasca-trav)" strokeWidth="2" strokeDasharray="6 6"
        />
        {[[70, 520], [190, 410], [330, 450], [450, 300], [600, 330], [700, 190]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#020617" stroke="url(#lasca-trav)" strokeWidth="2" />
            <text x={x + 10} y={y - 10} fill="rgb(148 163 184 / 0.6)" fontSize="11" fontFamily="monospace">Σ{i + 1}</text>
          </g>
        ))}
      </g>
      <rect width="100%" height="100%" fill="url(#lasca-fade)" />
    </svg>
  );
}
