import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, BookOpen, CodeXml, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import LascaLogo from '../brand/LascaLogo';
import LicenseDialog from './LicenseDialog';
import { SITE } from '../../site';

/** Φόντο των δημόσιων σελίδων: κάνναβος + προβολέας (DESIGN.md «Background Grid Layer»). */
export function Backdrop({ spotlight = true }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
      <div className="l-grid-bg absolute inset-0" />
      {spotlight && <div className="l-spotlight absolute left-1/2 top-0 h-[700px] w-[1400px] -translate-x-1/2" />}
    </div>
  );
}

const NAV = [
  { href: '/#tools', label: 'Εργαλεία' },
  { href: '/#workflow', label: 'Πώς δουλεύει' },
];

export function PublicHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.getElementById('public-scroll');
    if (!root) return undefined;
    const onScroll = () => setScrolled(root.scrollTop > 8);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-300 ${scrolled || open ? 'bg-canvas/80 backdrop-blur-xl shadow-[inset_0_-1px_0_rgb(186_215_247/0.1)]' : ''}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 l-btn l-btn-ghost">Μετάβαση στο περιεχόμενο</a>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <LascaLogo height={30} />
        <nav aria-label="Κύρια" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[14px] text-mist transition-colors hover:text-white">{n.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/app" className="l-btn l-btn-primary l-btn-sm">Άνοιγμα εφαρμογής <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="l-btn l-btn-outline l-btn-sm hidden sm:inline-flex">Σύνδεση</Link>
              <Link to="/signup" className="l-btn l-btn-primary l-btn-sm">Ξεκίνα Τώρα!</Link>
            </>
          )}
          <button type="button" className="l-btn l-btn-outline l-btn-sm !px-2.5 md:hidden" onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}>
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Κύρια (κινητό)" className="animate-rise border-t border-glass-edge px-4 pb-4 pt-2 md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-[15px] text-frost hover:bg-glass-wash">{n.label}</a>
          ))}
          {!user && <Link to="/login" className="block rounded-lg px-3 py-3 text-[15px] text-frost hover:bg-glass-wash">Σύνδεση</Link>}
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  const [licenseOpen, setLicenseOpen] = useState(false);
  return (
    <footer className="relative border-t border-glass-edge">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <LascaLogo height={26} textClass="text-lg" />
        </div>
        <nav aria-label="Νομικά">
          <p className="l-eyebrow !text-[11px] text-fog">Νομικά</p>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            <li><NavLink to="/privacy" className="text-mist hover:text-white">Πολιτική απορρήτου</NavLink></li>
            <li><NavLink to="/terms" className="text-mist hover:text-white">Όροι χρήσης</NavLink></li>
            <li><NavLink to="/cookies" className="text-mist hover:text-white">Cookies</NavLink></li>
            <li><button type="button" onClick={() => setLicenseOpen(true)} className="text-mist hover:text-white">Άδεια χρήσης</button></li>
          </ul>
        </nav>
        <nav aria-label="Σύνδεσμοι">
          <p className="l-eyebrow !text-[11px] text-fog">LASCA</p>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            <li><Link to="/signup" className="text-mist hover:text-white">Δημιουργία λογαριασμού</Link></li>
            <li><Link to="/login" className="text-mist hover:text-white">Σύνδεση</Link></li>
            <li>
              <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-mist hover:text-white">
                <CodeXml size={14} aria-hidden="true" /> Κώδικας στο GitHub<span className="sr-only"> (ανοίγει σε νέα καρτέλα)</span>
              </a>
            </li>
            <li>
              <a href={SITE.manual} download="LASCA_Manual_v1.0.pdf" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-mist hover:text-white">
                <BookOpen size={14} aria-hidden="true" /> Εγχειρίδιο χρήσης (PDF)
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2.5 px-4 pb-10 text-[13px] text-fog sm:px-6">
        <span>© {new Date().getFullYear()} {SITE.fullName}</span>
        <span>Copyright (c) 2026 LASCA Team ·{' '}
          <button type="button" onClick={() => setLicenseOpen(true)} className="text-mist underline decoration-white/30 underline-offset-2 hover:text-white">LASCA Source-Available License</button>
        </span>
      </div>
      <LicenseDialog open={licenseOpen} onClose={() => setLicenseOpen(false)} />
    </footer>
  );
}

/** Σκελετός δημόσιας σελίδας (αρχική, νομικά, 404). Η σελίδα κάνει scroll μέσα στο #public-scroll. */
export function PublicPage({ children, spotlight = true }) {
  return (
    <div id="public-scroll" className="relative h-full overflow-y-auto overflow-x-hidden bg-canvas text-frost scroll-smooth">
      <Backdrop spotlight={spotlight} />
      <PublicHeader />
      <main id="main" className="relative">{children}</main>
      <PublicFooter />
    </div>
  );
}
