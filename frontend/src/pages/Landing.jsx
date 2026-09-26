import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cloud, FileDown, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandMark, SurveyGrid } from '../components/auth/AuthLayout';
import {
  GoniometriseisIcon, SynorthosiStathmouIcon, TrigonometrikiYpsometriaIcon, GeometrikiChorostathmisiIcon,
  VasikoiYpologismoiIcon, OdefsiIcon, TachymetriaIcon, CharaxiIcon,
} from '../components/icons';

const MODULES = [
  { Icon: OdefsiIcon, title: 'Όδευση', text: 'Οριζοντιογραφία (X,Y) και υψομετρία (H), με κλείσιμο και διόρθωση σφαλμάτων.' },
  { Icon: GeometrikiChorostathmisiIcon, title: 'Γεωμετρική Χωροστάθμηση', text: 'Μετάβαση-επιστροφή, σφάλμα κλεισίματος και υψόμετρα σημείων.' },
  { Icon: TrigonometrikiYpsometriaIcon, title: 'Τριγωνομετρική Υψομετρία', text: 'Υψομετρικές διαφορές από ζενίθιες γωνίες και αποστάσεις.' },
  { Icon: TachymetriaIcon, title: 'Αποτύπωση', text: 'Ταχυμετρία από Excel, συντεταγμένες σημείων και σχέδιο.' },
  { Icon: CharaxiIcon, title: 'Χάραξη', text: 'Στοιχεία χάραξης γωνίας και απόστασης από στάση και προσανατολισμό.' },
  { Icon: SynorthosiStathmouIcon, title: 'Συνόρθωση Σταθμού', text: 'Συνόρθωση παρατηρήσεων σταθμού και ακρίβειες.' },
  { Icon: GoniometriseisIcon, title: 'Γωνιομετρήσεις', text: 'Μέσοι όροι κύκλων, διευθύνσεις και έλεγχοι.' },
  { Icon: VasikoiYpologismoiIcon, title: 'Βασικοί Υπολογισμοί', text: 'Θεμελιώδη προβλήματα, εμπροσθοτομία, οπισθοτομία, κλίμακα.' },
];

const FEATURES = [
  { Icon: Cloud, title: 'Αποθήκευση στο cloud', text: 'Τα projects σου σε περιμένουν από όποιον υπολογιστή κι αν συνδεθείς.' },
  { Icon: Users, title: 'Κοινά projects', text: 'Μοιράσου ένα project με την ομάδα της άσκησης και δουλέψτε στα ίδια δεδομένα.' },
  { Icon: FileDown, title: 'Εξαγωγή αποτελεσμάτων', text: 'Αναφορές PDF, σχέδια DXF, Excel, GeoJSON και KML με ένα κλικ.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-200 scroll-smooth">
      {/* --- Μπάρα πλοήγησης --- */}
      <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark size={32} />
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#modules" className="hidden sm:inline px-3 text-sm text-slate-400 hover:text-slate-100">Εργαλεία</a>
            {user ? (
              <Link to="/app" className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-900 hover:bg-white">
                Άνοιγμα εφαρμογής <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex h-9 items-center rounded-xl px-3 sm:px-4 text-sm font-bold text-slate-200 hover:bg-slate-800/70">
                  Σύνδεση
                </Link>
                <Link to="/signup" className="inline-flex h-9 items-center rounded-xl bg-slate-100 px-3 sm:px-4 text-sm font-bold text-slate-900 hover:bg-white">
                  <span className="sm:hidden">Εγγραφή</span>
                  <span className="hidden sm:inline">Δημιουργία λογαριασμού</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* --- Hero --- */}
      <section className="relative overflow-hidden">
        <SurveyGrid />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <p className="inline-block rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-[11px] font-mono tracking-[0.25em] text-slate-400">
            ΑΓΡΟΝΟΜΩΝ-ΤΟΠΟΓΡΑΦΩΝ ΜΗΧΑΝΙΚΩΝ ΑΠΘ
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-[1.1] text-slate-50 sm:text-6xl">
            Όλοι οι τοπογραφικοί υπολογισμοί,{' '}
            <span className="bg-gradient-to-r from-[#e0424a] to-[#4d6bef] bg-clip-text text-transparent">σε ένα εργαλείο.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
            Η LASCA κάνει οδεύσεις, χωροσταθμήσεις, αποτυπώσεις και χαράξεις από τον browser σου,
            κρατάει τα projects σου και σε αφήνει να τα μοιράζεσαι με την ομάδα σου.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Link to="/app" className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] px-7 text-sm font-bold text-white shadow-xl shadow-[#3b5bdb]/25 hover:brightness-110">
                Άνοιγμα εφαρμογής <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] px-7 text-sm font-bold text-white shadow-xl shadow-[#3b5bdb]/25 hover:brightness-110">
                  Δημιουργία λογαριασμού <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-7 text-sm font-bold text-slate-100 hover:bg-slate-800">
                  Έχω ήδη λογαριασμό
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">Δωρεάν. Σύνδεση με email ή λογαριασμό Google.</p>
        </div>
      </section>

      {/* --- Εργαλεία --- */}
      <section id="modules" className="border-t border-slate-800/70 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <h2 className="text-2xl font-black text-slate-50 sm:text-3xl">Τα εργαλεία</h2>
          <p className="mt-2 max-w-xl text-slate-400">Όσα χρειάζεσαι για τις ασκήσεις και τις εργασίες πεδίου.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/80">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950 text-slate-300 group-hover:text-white">
                  <Icon size={20} color="currentColor" />
                </div>
                <h3 className="mt-4 font-bold text-slate-100">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Χαρακτηριστικά --- */}
      <section className="border-t border-slate-800/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 py-20 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon size={22} className="text-[#6d85f0]" />
              <h3 className="mt-4 font-bold text-slate-100">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Τελικό CTA --- */}
      {!user && (
        <section className="border-t border-slate-800/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
            <h2 className="text-2xl font-black text-slate-50 sm:text-3xl">Έτοιμος για την επόμενη άσκηση;</h2>
            <Link to="/signup" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-slate-100 px-7 text-sm font-bold text-slate-900 hover:bg-white">
              Ξεκίνα δωρεάν <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-800/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 text-xs text-slate-500 sm:flex-row">
          <BrandMark size={22} />
          <p>© {new Date().getFullYear()} LASCA · Land Surveying Computations Application</p>
          <a href="/LASCA_Manual.pdf" target="_blank" rel="noreferrer" className="hover:text-slate-300">Εγχειρίδιο χρήσης</a>
        </div>
      </footer>
    </div>
  );
}
