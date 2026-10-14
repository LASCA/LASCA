import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import LascaLogo from '../brand/LascaLogo';
import SurveyNetwork from '../marketing/SurveyNetwork';

// Κοινό πλαίσιο για Σύνδεση / Εγγραφή / Επαναφορά κωδικού / Επιβεβαίωση email, στο ύφος της αρχικής:
// αριστερά (σε μεγάλες οθόνες) η LASCA σε λειτουργία πάνω στο «ζωντανό» δίκτυο, δεξιά η φόρμα.
export default function AuthLayout({ title, subtitle, eyebrow, children, footer, wide = false, dense = false }) {
  return (
    // Το χρώμα δράσης του παλιού θέματος (violet) γίνεται εδώ το μπλε της αρχικής, ώστε και οι σελίδες που
    // χρησιμοποιούν ακόμα τα l-btn / l-link (επαναφορά κωδικού, πρόσκληση, σύνδεση προγράμματος) να ταιριάζουν.
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-[#020617] text-slate-200"
      style={{ '--color-violet': '#2563eb', '--color-violet-hover': '#3b82f6' }}>
      <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden border-r border-slate-800/70 bg-[#030817] lg:flex lg:flex-col" aria-hidden="true">
          <SurveyNetwork className="absolute inset-0 h-full w-full" maxPoints={46} />
          <div className="pointer-events-none absolute -right-24 -top-32 h-[460px] w-[460px] rounded-full bg-blue-700/40 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-violet-700/25 blur-[110px]" />
          <div className="relative z-10 flex flex-1 flex-col px-10 py-8 xl:px-14">
            <LascaLogo height={30} textClass="text-xl" />
            <div className="my-auto max-w-[560px] py-10">
              <p className="font-[Manrope] text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-white xl:text-[40px]">
                Όλοι οι τοπογραφικοί υπολογισμοί,{' '}
                <span className="bg-[linear-gradient(100deg,#e0424a,#a04a9a_45%,#4d6bef)] bg-clip-text text-transparent">σε μια εφαρμογή</span>
              </p>
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0B1221] shadow-[0_40px_100px_-30px_rgba(37,99,235,.55)]">
                <div className="flex h-8 items-center gap-1.5 border-b border-slate-800 bg-[#0b1120] px-3">
                  <i className="h-2.5 w-2.5 rounded-full bg-red-500/70" /><i className="h-2.5 w-2.5 rounded-full bg-amber-500/70" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 rounded-md border border-slate-800 bg-[#020617] px-2.5 font-mono text-[10px] leading-[18px] text-slate-500">lasca.gr/app</span>
                </div>
                <video className="block aspect-[1600/824] w-full bg-[#020617] object-cover" autoPlay muted loop playsInline preload="metadata">
                  <source src="/landing/traverse.webm" type='video/webm; codecs="vp9"' />
                  <source src="/landing/traverse.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
              <ShieldCheck size={13} /> Κρυπτογραφημένη σύνδεση · μόνο απαραίτητα cookies
            </p>
          </div>
        </aside>

        <div className={`relative flex min-h-full flex-col px-4 sm:px-8 ${dense ? 'py-4' : 'py-6'}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_400px_at_80%_0%,rgba(37,99,235,.12),transparent_70%)] lg:hidden" />
          <div className="relative lg:hidden"><LascaLogo height={28} textClass="text-lg" /></div>
          <main id="main" className={`relative mx-auto my-auto w-full ${wide ? 'max-w-[560px]' : 'max-w-[420px]'} ${dense ? 'py-3' : 'py-6'} animate-rise`}>
            {eyebrow && !dense && <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>}
            <h1 className={`${dense ? '' : 'mt-2'} font-[Manrope] text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white`}>{title}</h1>
            {subtitle && <p className="mt-1.5 text-[14.5px] text-slate-400">{subtitle}</p>}
            <div className={dense ? 'mt-4' : 'mt-6'}>{children}</div>
            {footer && <div className={`${dense ? 'mt-3' : 'mt-5'} text-center text-[14px] text-slate-400`}>{footer}</div>}
          </main>
          <p className="relative space-x-4 text-center text-[12px] text-slate-500">
            <Link to="/privacy" className="hover:text-white">Απόρρητο</Link>
            <Link to="/terms" className="hover:text-white">Όροι</Link>
            <Link to="/cookies" className="hover:text-white">Cookies</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
