import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import LascaLogo from '../brand/LascaLogo';
import { Backdrop } from '../marketing/PublicChrome';

// Κοινό πλαίσιο για Σύνδεση / Εγγραφή / Επαναφορά κωδικού / Πρόσκληση:
// μία «γυάλινη» κάρτα στο κέντρο, πάνω στον κάνναβο συντεταγμένων.
export default function AuthLayout({ title, subtitle, eyebrow, children, footer, wide = false }) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-canvas text-frost">
      <Backdrop />
      <div className="relative flex min-h-full flex-col items-center px-4 py-8 sm:py-12">
        <LascaLogo height={32} />
        <main id="main" className={`mt-8 w-full ${wide ? 'max-w-[520px]' : 'max-w-[440px]'} animate-rise`}>
          <div className="l-modal p-6 sm:p-8">
            {eyebrow && <p className="l-eyebrow !text-[11.5px] text-fog">{eyebrow}</p>}
            <h1 className="l-heading mt-1 text-[26px] leading-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-mist">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-[14px] text-mist">{footer}</div>}
        </main>
        <div className="mt-auto pt-10 text-center text-[12.5px] text-fog">
          <p className="inline-flex items-center gap-1.5"><ShieldCheck size={13} aria-hidden="true" /> Κρυπτογραφημένη σύνδεση · μόνο απαραίτητα cookies</p>
          <p className="mt-2 space-x-3">
            <Link to="/privacy" className="hover:text-white">Απόρρητο</Link>
            <Link to="/terms" className="hover:text-white">Όροι</Link>
            <Link to="/cookies" className="hover:text-white">Cookies</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
