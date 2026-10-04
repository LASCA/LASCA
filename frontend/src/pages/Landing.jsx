import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Calculator, Cloud, CookieIcon, FileDown, KeyRound, Laptop, LockKeyhole, MonitorSmartphone,
  ServerCog, ShieldCheck, Upload, Users,
} from '../components/marketing/landingIcons';
import { useAuth } from '../auth/AuthContext';
import { PublicPage } from '../components/marketing/PublicChrome';
import { CollaborateIllustration, TraverseIllustration } from '../components/marketing/Illustrations';
import usePageMeta from '../hooks/usePageMeta';
import { SITE } from '../site';
import {
  GoniometriseisIcon, SynorthosiStathmouIcon, TrigonometrikiYpsometriaIcon, GeometrikiChorostathmisiIcon,
  VasikoiYpologismoiIcon, OdefsiIcon, TachymetriaIcon, CharaxiIcon,
} from '../components/icons';

const MODULES = [
  { Icon: OdefsiIcon, title: 'Όδευση', text: 'Οριζοντιογραφία (X,Y) και υψομετρία (H), με διαγράμματα σε κλίμακα.' },
  { Icon: GeometrikiChorostathmisiIcon, title: 'Γεωμετρική Χωροστάθμηση', text: 'Μετάβαση-επιστροφή, σφάλμα κλεισίματος και υψόμετρα σημείων.' },
  { Icon: TrigonometrikiYpsometriaIcon, title: 'Τριγωνομετρική Υψομετρία', text: 'Υψομετρικές διαφορές από ζενίθιες γωνίες και αποστάσεις.' },
  { Icon: TachymetriaIcon, title: 'Αποτύπωση', text: 'Συντεταγμένες από μετρήσεις πεδίου και εξαγωγή σημείων σε σχέδιο.' },
  { Icon: CharaxiIcon, title: 'Χάραξη', text: 'Χάραξη σημείων από συντεταγμένες, με διάγραμμα.' },
  { Icon: SynorthosiStathmouIcon, title: 'Συνόρθωση Σταθμού', text: 'Συνόρθωση παρατηρήσεων σταθμού και ακρίβειες.' },
  { Icon: GoniometriseisIcon, title: 'Γωνιομετρήσεις', text: 'Μέσοι όροι, αναγωγές και στατιστικοί έλεγχοι.' },
  { Icon: VasikoiYpologismoiIcon, title: 'Βασικοί Υπολογισμοί', text: 'Θεμελιώδη προβλήματα, εμπροσθοτομία, οπισθοτομία, συντελεστής κλίμακας.' },
];

const STEPS = [
  { Icon: Upload, title: 'Εισαγωγή', text: 'Πληκτρολόγησε τις μετρήσεις ή φόρτωσε το Excel του πεδίου.' },
  { Icon: Calculator, title: 'Υπολογισμός', text: 'Γωνίες, αποστάσεις, συντεταγμένες και υψόμετρα σε δευτερόλεπτα.' },
  { Icon: BadgeCheck, title: 'Έλεγχος', text: 'Σφάλματα κλεισίματος και όρια ανοχής, με σαφή ένδειξη.' },
  { Icon: FileDown, title: 'Εξαγωγή', text: 'Αναφορά PDF, σχέδιο DXF, Excel, GeoJSON και KML.' },
];

const SECURITY = [
  { Icon: KeyRound, title: 'Έλεγχος δύο βημάτων', text: 'Εφαρμογή authenticator ή κωδικός στο email, με εφεδρικούς κωδικούς.' },
  { Icon: LockKeyhole, title: 'Ισχυροί κωδικοί', text: 'Αποθηκεύονται μόνο ως hash. Έλεγχος σε λίστες διαρρευμένων κωδικών.' },
  { Icon: ShieldCheck, title: 'Προστασία από επιθέσεις', text: 'Όρια προσπαθειών, προσωρινό κλείδωμα και CAPTCHA σε ύποπτη δραστηριότητα.' },
  { Icon: ServerCog, title: 'Servers στην Ευρώπη', text: 'Τα δεδομένα μένουν σε data center της ΕΕ, με κρυπτογράφηση HTTPS.' },
  { Icon: CookieIcon, title: 'Χωρίς παρακολούθηση', text: 'Μόνο τα απαραίτητα cookies. Καμία διαφήμιση, καμία πώληση δεδομένων.' },
  { Icon: MonitorSmartphone, title: 'Έλεγχος συσκευών', text: 'Δες τις πρόσφατες συνδέσεις και αποσύνδεσε όλες τις συσκευές με ένα κλικ.' },
];

function Eyebrow({ children }) {
  return <p className="l-eyebrow l-eyebrow-lines">{children}</p>;
}

function SectionHead({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-[680px] text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="l-display mt-5 text-[32px] leading-[1.15] sm:text-[44px]">{title}</h2>
      {text && <p className="mt-4 text-[16px] leading-relaxed text-mist sm:text-[17px]">{text}</p>}
    </div>
  );
}

export default function Landing() {
  usePageMeta({ description: SITE.description, path: '/' });
  const { user } = useAuth();
  const primary = user
    ? { to: '/app', label: 'Άνοιγμα εφαρμογής' }
    : { to: '/signup', label: 'Ξεκίνα δωρεάν' };

  return (
    <PublicPage>
      {/* --- Hero --- */}
      <section className="relative mx-auto max-w-[1200px] px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="animate-rise">
          <Eyebrow>Land Surveying Computations</Eyebrow>
          <h1 className="l-display mx-auto mt-6 max-w-[880px] text-[40px] leading-[1.08] sm:text-[60px] lg:text-[68px]">
            Όλοι οι τοπογραφικοί υπολογισμοί, σε μια εφαρμογή
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-relaxed text-mist sm:text-[18px]">
            Λύσε οδεύσεις, χωροσταθμήσεις, αποτυπώσεις και χαράξεις από τον browser σου, μοιράσου τα projects
            με την ομάδα σου και εξήγαγε έτοιμες αναφορές.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={primary.to} className="l-btn l-btn-primary l-btn-lg w-full sm:w-auto">
              {primary.label} <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {!user && <Link to="/login" className="l-btn l-btn-outline l-btn-lg w-full sm:w-auto">Έχω ήδη λογαριασμό</Link>}
          </div>
          {!user && <p className="mt-4 text-[13px] text-fog">Δωρεάν · με email ή Google · και για Windows, και offline</p>}
        </div>

        {/* Γυάλινες κάρτες με το προϊόν (όπως στο DESIGN.md: «floating glass cards») */}
        <div className="relative mx-auto mt-16 max-w-[1100px] sm:mt-20" aria-label="Παράδειγμα αποτελεσμάτων">
          <div className="pointer-events-none absolute -inset-x-20 -top-10 bottom-0 l-glow opacity-70" aria-hidden="true" />
          <div className="relative grid items-center gap-4 lg:grid-cols-[0.9fr_1.8fr_0.9fr]">
            <div className="l-card hidden p-5 text-left lg:block lg:-rotate-[3deg] lg:translate-y-6">
              <p className="l-eyebrow !text-[11px] text-fog">Συντεταγμένες</p>
              <table className="mt-3 w-full font-mono text-[12.5px] text-mist">
                <caption className="sr-only">Παράδειγμα συντεταγμένων στάσεων όδευσης</caption>
                <thead><tr className="text-fog"><th className="pb-1.5 text-left font-normal">Σ</th><th className="pb-1.5 text-right font-normal">X</th><th className="pb-1.5 text-right font-normal">Y</th></tr></thead>
                <tbody>
                  {[['Σ1', '412 305.21', '4 497 118.40'], ['Σ2', '412 431.77', '4 497 182.05'], ['Σ3', '412 569.30', '4 497 146.93'], ['Σ4', '412 688.12', '4 497 251.66']].map(([s, x, y]) => (
                    <tr key={s} className="border-t border-glass-edge"><td className="py-1.5 text-frost">{s}</td><td className="py-1.5 text-right">{x}</td><td className="py-1.5 text-right">{y}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="l-modal relative z-10 p-3 sm:p-5">
              <TraverseIllustration className="h-auto w-full" />
            </div>
            <div className="l-card hidden p-5 text-left lg:block lg:rotate-[3deg] lg:translate-y-6">
              <p className="l-eyebrow !text-[11px] text-fog">Εξαγωγή</p>
              <ul className="mt-3 space-y-2.5 text-[13.5px] text-mist">
                {['Αναφορά PDF', 'Σχέδιο DXF', 'Excel', 'GeoJSON / KML'].map((x) => (
                  <li key={x} className="flex items-center gap-2"><BadgeCheck size={15} className="text-blueprint" aria-hidden="true" /> {x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Εργαλεία --- */}
      <section id="tools" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6 sm:py-[120px]">
        <SectionHead eyebrow="Εργαλεία" title="Ό,τι χρειάζεσαι για το εξάμηνο"
          text="Οκτώ εργαλεία για τις ασκήσεις και τις εργασίες πεδίου, με τους ίδιους συμβολισμούς που βλέπεις στο αμφιθέατρο." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ Icon, title, text }) => (
            <li key={title} className="l-card l-lift p-6">
              <span className="l-icon-tile h-12 w-12"><Icon size={22} color="currentColor" aria-hidden="true" /></span>
              <h3 className="mt-5 text-[16px] font-semibold text-ice">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-fog">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Πώς δουλεύει --- */}
      <section id="workflow" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6 sm:py-[120px]">
        <SectionHead eyebrow="Πώς δουλεύει" title="Από το πεδίο στην αναφορά" text="Τέσσερα βήματα, χωρίς χαμένα αρχεία και χωρίς λάθη αντιγραφής." />
        <ol className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-transparent via-[rgb(186_215_247/0.18)] to-transparent lg:block" />
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="relative text-center">
              <span className="l-icon-tile relative mx-auto h-14 w-14 bg-canvas"><Icon size={22} aria-hidden="true" /></span>
              <p className="mt-5 font-mono text-[12px] tracking-[0.1em] text-fog">0{i + 1}</p>
              <h3 className="mt-1 text-[17px] font-semibold text-ice">{title}</h3>
              <p className="mx-auto mt-2 max-w-[240px] text-[14px] leading-relaxed text-fog">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Συνεργασία --- */}
      <section className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 sm:py-[120px]">
        <div className="l-card grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Ομαδική δουλειά</Eyebrow>
            <h2 className="l-display mt-5 text-[30px] leading-[1.15] sm:text-[40px]">Ένα project, όλη η ομάδα</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-mist">
              Κάλεσε τους συμφοιτητές σου με σύνδεσμο, όρισε ποιος επεξεργάζεται και ποιος μόνο βλέπει,
              και δες ποιος δουλεύει τώρα. Οι αλλαγές συγχρονίζονται αυτόματα.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-mist">
              <li className="flex gap-3"><Cloud size={18} className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" /> Αποθήκευση στο cloud, από όποιον υπολογιστή κι αν συνδεθείς.</li>
              <li className="flex gap-3"><Users size={18} className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" /> Ρόλοι ιδιοκτήτη, επεξεργαστή και αναγνώστη.</li>
              <li className="flex gap-3"><Laptop size={18} className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" /> Το πρόγραμμα για Windows συνδέεται στον ίδιο λογαριασμό και δουλεύει και χωρίς internet.</li>
            </ul>
          </div>
          <CollaborateIllustration className="mx-auto h-auto w-full max-w-[460px]" />
        </div>
      </section>

      {/* --- Ασφάλεια --- */}
      <section id="security" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6 sm:py-[120px]">
        <SectionHead eyebrow="Ασφάλεια" title="Τα δεδομένα σου, κλειδωμένα"
          text="Οι εργασίες σου είναι δικές σου. Τις βλέπουν μόνο όσοι προσκαλέσεις." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.map(({ Icon, title, text }) => (
            <li key={title} className="l-card flex gap-4 p-6">
              <span className="l-icon-tile h-11 w-11 shrink-0"><Icon size={19} aria-hidden="true" /></span>
              <div>
                <h3 className="text-[15.5px] font-semibold text-ice">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-fog">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-[14px] text-fog">
          Διάβασε την <Link to="/privacy" className="l-link">Πολιτική απορρήτου</Link>.
        </p>
      </section>

      {/* --- Τελικό CTA (ένα, σαφές) --- */}
      {!user && (
        <section className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 text-center sm:px-6">
          <h2 className="l-display mx-auto max-w-[640px] text-[32px] leading-[1.15] sm:text-[44px]">Αυτοματοποίησε τη δουλειά σου</h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[16px] text-mist">Δημιούργησε λογαριασμό και λύσε την πρώτη σου όδευση σε λιγότερο από πέντε λεπτά.</p>
          <Link to="/signup" className="l-btn l-btn-primary l-btn-lg mt-9">Ξεκίνα δωρεάν <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      )}
    </PublicPage>
  );
}
