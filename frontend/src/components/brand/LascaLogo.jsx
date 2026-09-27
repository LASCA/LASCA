import React from 'react';
import { Link } from 'react-router-dom';
// Γραμματοσειρά Archivo για τη λέξη LASCA (τοπικά, χωρίς κλήση στους servers της Google).
import '@fontsource/archivo/800.css';

// Το λογότυπο της LASCA με τη λέξη LASCA σε Archivo. Ένα σημείο για όλες τις σελίδες.
// Το αρχείο είναι στο frontend/public/, οπότε η διαδρομή ξεκινάει με "/" (όχι "../public/"),
// αλλιώς η εικόνα δεν βρίσκεται όταν γίνει build για τον server.
export default function LascaLogo({ height = 30, withText = true, textClass = 'text-xl', to = '/' }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-2.5" aria-label="LASCA αρχική">
      <img src="/LASCA-logo-mark.png" alt="" style={{ height, width: 'auto' }} draggable="false" />
      {withText && (
        <span
          className={`${textClass} font-extrabold tracking-[0.12em] text-slate-100 leading-none`}
          style={{ fontFamily: "'Archivo', sans-serif" }}
        >
          LASCA
        </span>
      )}
    </Link>
  );
}

// Κοινό hover για κάρτες/widgets: μικρό μεγάλωμα και ανασήκωμα (και στο focus με πληκτρολόγιο).
// Το motion-reduce το απενεργοποιεί για όσους έχουν ζητήσει λιγότερη κίνηση στο λειτουργικό τους.
export const WIDGET_HOVER =
  'transition duration-200 ease-out hover:scale-[1.03] hover:-translate-y-0.5 hover:border-slate-600 ' +
  'hover:bg-slate-900/80 hover:shadow-xl hover:shadow-black/40 ' +
  'focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b5bdb]/50 ' +
  'motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:focus-visible:transform-none';
