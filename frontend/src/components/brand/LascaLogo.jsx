import React from 'react';
import { Link } from 'react-router-dom';
// Γραμματοσειρά Archivo για τη λέξη LASCA (τοπικά, χωρίς κλήση στους servers της Google).
import '@fontsource/archivo/800.css';

// Το λογότυπο του LASCA με τη λέξη LASCA σε Archivo. Ένα σημείο για όλες τις σελίδες.
// Η εικόνα είναι συμπιεσμένη (WEBP, ~1.5KB αντί για 48KB PNG).
export default function LascaLogo({ height = 30, withText = true, textClass = 'text-xl', to = '/' }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-2.5 rounded-md" aria-label="LASCA — αρχική σελίδα">
      <img src="/LASCA-logo-mark-96.webp" alt="" width={Math.round(height * 0.617)} height={height}
        style={{ height, width: 'auto' }} draggable="false" decoding="async" />
      {withText && (
        <span
          className={`${textClass} font-extrabold tracking-[0.12em] text-ice leading-none`}
          style={{ fontFamily: "'Archivo', sans-serif" }}
        >
          LASCA
        </span>
      )}
    </Link>
  );
}

// Κοινό hover για κάρτες/widgets μέσα στην εφαρμογή: μικρό ανασήκωμα (μόνο με ποντίκι).
// Το motion-reduce το απενεργοποιεί για όσους έχουν ζητήσει λιγότερη κίνηση στο λειτουργικό τους.
export const WIDGET_HOVER =
  'transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-slate-600 ' +
  'hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/40 active:scale-[0.99] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b6d9fc]/50 ' +
  'motion-reduce:transition-none motion-reduce:hover:transform-none';
