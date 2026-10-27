import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '@fontsource/archivo/800.css';
import SurveyNetwork from '../components/marketing/SurveyNetwork';
import { PRIMARY_BUTTON } from '../components/auth/FormParts';
import { safeNext } from '../auth/welcome';
import usePageMeta from '../hooks/usePageMeta.js';

// Μετά τη δημιουργία λογαριασμού και την επιβεβαίωση του email (βλ. pages/Signup.jsx).
export default function Welcome() {
  usePageMeta({ title: 'Καλώς ήρθες', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-[#020617] px-4 py-10 text-slate-200">
      <SurveyNetwork className="pointer-events-none absolute inset-0 h-full w-full opacity-70" maxPoints={40} />
      <div className="pointer-events-none absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-blue-700/35 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[440px] w-[440px] rounded-full bg-violet-700/25 blur-[120px]" />

      <main id="main" className="relative z-10 flex w-full max-w-[460px] flex-col items-center text-center animate-rise">
        <div className="flex items-center gap-3.5">
          <img src="/LASCA-logo-mark-96.webp" alt="" draggable="false" style={{ height: 64, width: 'auto' }} />
          <span className="text-[38px] font-extrabold leading-none tracking-[0.12em] text-white"
            style={{ fontFamily: "'Archivo', sans-serif" }}>LASCA</span>
        </div>

        <h1 className="mt-12 font-[Manrope] text-[40px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[46px]">
          Συγχαρητήρια!
        </h1>
        <p className="mt-3 text-[18px] text-slate-300 sm:text-[20px]">
          Ετοιμάσου να{' '}
          <span className="bg-[linear-gradient(100deg,#e0424a,#a04a9a_45%,#4d6bef)] bg-clip-text font-semibold text-transparent">lascάρεις</span>...
        </p>

        <button type="button" onClick={() => navigate(next, { replace: true })} autoFocus
          className={`${PRIMARY_BUTTON} mt-10 max-w-[320px]`}>
          Μετάβαση στην εφαρμογή <ArrowRight size={17} aria-hidden="true" />
        </button>
      </main>
    </div>
  );
}
