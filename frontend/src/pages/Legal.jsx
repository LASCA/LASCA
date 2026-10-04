import React from 'react';
import { Link } from 'react-router-dom';
import { PublicPage } from '../components/marketing/PublicChrome';
import usePageMeta from '../hooks/usePageMeta';
import { SITE } from '../site';

/*
 * Πολιτική απορρήτου, Όροι χρήσης και Cookies.
 * Περιγράφουν ΑΚΡΙΒΩΣ τι κάνει ο κώδικας (code/auth_security.py, code/collab.py, code/main_4_app.py).
 * Αν αλλάξει κάτι στη συλλογή δεδομένων, άλλαξε και αυτό το αρχείο (και την ημερομηνία στο src/site.js).
 * Σημείωση: δεν αποτελεί νομική συμβουλή· για ευρεία δημόσια χρήση καλό είναι να το δει νομικός.
 */

const analyticsOn = Boolean(import.meta.env.VITE_ANALYTICS_SRC);

function Contact() {
  return SITE.contactEmail
    ? <a href={`mailto:${SITE.contactEmail}`} className="l-link">{SITE.contactEmail}</a>
    : <>τη φόρμα «Επικοινωνία» μέσα στην εφαρμογή</>;
}

function LegalPage({ eyebrow, title, intro, children }) {
  return (
    <PublicPage spotlight={false}>
      <article className="mx-auto max-w-[760px] px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <p className="l-eyebrow text-fog">{eyebrow}</p>
        <h1 className="l-display mt-4 text-[36px] leading-[1.12] sm:text-[44px]">{title}</h1>
        <p className="mt-4 text-[14px] text-fog">Τελευταία ενημέρωση: {SITE.legalUpdated}</p>
        {intro && <p className="mt-8 text-[17px] leading-relaxed text-mist">{intro}</p>}
        <div className="legal mt-10 space-y-10 text-[15.5px] leading-[1.75] text-mist">{children}</div>
      </article>
    </PublicPage>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="l-heading text-[21px]">{title}</h2>
      <div className="mt-3 space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-frost [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}

export function Privacy() {
  usePageMeta({ title: 'Πολιτική απορρήτου', description: 'Ποια δεδομένα κρατά η LASCA, γιατί, για πόσο και ποια είναι τα δικαιώματά σου (GDPR).' });
  return (
    <LegalPage eyebrow="Απόρρητο" title="Πολιτική απορρήτου"
      intro="Κρατάμε μόνο όσα χρειάζονται για να λειτουργεί η εφαρμογή και να είναι ασφαλής. Δεν πουλάμε δεδομένα, δεν έχουμε διαφημίσεις και δεν σε παρακολουθούμε.">
      <Section title="1. Ποιος είναι υπεύθυνος">
        <p>Υπεύθυνη επεξεργασίας είναι η ομάδα ανάπτυξης της LASCA. Για οτιδήποτε αφορά τα δεδομένα σου επικοινώνησε μέσω <Contact />.</p>
      </Section>
      <Section title="2. Τι δεδομένα κρατάμε">
        <ul>
          <li><strong>Λογαριασμός:</strong> email, όνομα χρήστη, προαιρετική εικόνα προφίλ, ο κωδικός σου μόνο ως κρυπτογραφικό hash (δεν τον γνωρίζουμε), η ημερομηνία αποδοχής των όρων και η επιβεβαίωση ηλικίας.</li>
          <li><strong>Έλεγχος δύο βημάτων (αν τον ενεργοποιήσεις):</strong> το μυστικό της εφαρμογής authenticator κρυπτογραφημένο, και οι εφεδρικοί κωδικοί μόνο ως hash.</li>
          <li><strong>Projects:</strong> οι μετρήσεις και τα αποτελέσματα που αποθηκεύεις, τα μέλη κάθε project, οι σύνδεσμοι πρόσκλησης και ένα ιστορικό ενεργειών (ποιος αποθήκευσε, ποιος μπήκε).</li>
          <li><strong>Ασφάλεια:</strong> συνδέσεις, αποτυχημένες προσπάθειες, αλλαγές κωδικού/2FA, με διεύθυνση IP, τύπο browser και ώρα. Χρησιμοποιούνται μόνο για προστασία από επιθέσεις και για να βλέπεις εσύ τις πρόσφατες συνδέσεις σου.</li>
          <li><strong>Πρόγραμμα για Windows:</strong> ένα κλειδί σύνδεσης ανά υπολογιστή (στον server κρατάμε μόνο το hash του).</li>
          <li><strong>Επικοινωνία:</strong> όταν μας στέλνεις μήνυμα ή αναφορά σφάλματος, το μήνυμα, το email σου και τυχόν στιγμιότυπο οθόνης.</li>
        </ul>
        <p>Δεν συλλέγουμε τοποθεσία, επαφές, δεδομένα πληρωμών ή ειδικές κατηγορίες δεδομένων. Δεν καταγράφουμε κινήσεις ποντικιού ή πληκτρολόγησης (καμία «καταγραφή συνεδρίας»).</p>
      </Section>
      <Section title="3. Γιατί (νομική βάση)">
        <ul>
          <li><strong>Για να σου παρέχουμε την υπηρεσία</strong> (λογαριασμός, projects, κοινοποίηση) — εκτέλεση σύμβασης, άρθρο 6(1)(β) GDPR.</li>
          <li><strong>Για την ασφάλεια</strong> (αρχεία συνδέσεων, όρια προσπαθειών, CAPTCHA) — έννομο συμφέρον, άρθρο 6(1)(στ) GDPR.</li>
          <li><strong>Για να απαντήσουμε στα μηνύματά σου</strong> — έννομο συμφέρον.</li>
        </ul>
      </Section>
      <Section title="4. Πού βρίσκονται και ποιοι τα επεξεργάζονται">
        <ul>
          <li><strong>Φιλοξενία:</strong> {SITE.hosting}. Η σύνδεση είναι πάντα κρυπτογραφημένη (HTTPS).</li>
          <li><strong>Resend</strong> (αποστολή email επαναφοράς κωδικού, κωδικών σύνδεσης και μηνυμάτων επικοινωνίας): λαμβάνει το email σου και το περιεχόμενο του μηνύματος.</li>
          <li><strong>Google</strong>, μόνο αν επιλέξεις «Σύνδεση με Google»: επιβεβαιώνει την ταυτότητά σου και μας δίνει email και όνομα.</li>
          <li><strong>Cloudflare Turnstile</strong>, μόνο σε εγγραφή, επαναφορά κωδικού ή μετά από πολλές λάθος προσπάθειες: ελέγχει ότι δεν είσαι bot, χωρίς cookies διαφήμισης.</li>
          <li><strong>Have I Been Pwned</strong>: όταν ορίζεις κωδικό, στέλνουμε μόνο τους 5 πρώτους χαρακτήρες του hash του για να ελέγξουμε αν έχει διαρρεύσει. Ούτε ο κωδικός ούτε το email σου φεύγουν ποτέ.</li>
          {analyticsOn && <li><strong>Στατιστικά επισκεψιμότητας χωρίς cookies:</strong> μετράμε συνολικές επισκέψεις σελίδων, χωρίς αναγνωριστικά και χωρίς να σε ακολουθούμε σε άλλες σελίδες.</li>}
        </ul>
        <p>Όπου πάροχος βρίσκεται εκτός ΕΕ, η διαβίβαση γίνεται με τις Τυποποιημένες Συμβατικές Ρήτρες της Ευρωπαϊκής Επιτροπής.</p>
      </Section>
      <Section title="5. Για πόσο τα κρατάμε">
        <ul>
          <li>Λογαριασμός και projects: μέχρι να διαγράψεις τον λογαριασμό σου.</li>
          <li>Αρχεία ασφαλείας: 90 ημέρες, μετά σβήνονται αυτόματα.</li>
          <li>Σύνδεσμοι επαναφοράς κωδικού: ισχύουν 30 λεπτά και σβήνονται μέσα σε μία ημέρα.</li>
          <li>Κλειδιά σύνδεσης του προγράμματος Windows: λήγουν μετά από 90 ημέρες χωρίς χρήση.</li>
        </ul>
      </Section>
      <Section title="6. Τα δικαιώματά σου">
        <p>Έχεις δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, φορητότητας και εναντίωσης. Τα περισσότερα τα κάνεις μόνος σου από το <Link to="/profile" className="l-link">Προφίλ</Link>: αλλάζεις τα στοιχεία σου, βλέπεις τις πρόσφατες συνδέσεις, και <strong>διαγράφεις τον λογαριασμό με ένα κουμπί</strong> (τα κοινά projects περνούν στους συνεργάτες σου, τα υπόλοιπα σβήνονται). Για οτιδήποτε άλλο γράψε μας μέσω <Contact />.</p>
        <p>Αν θεωρείς ότι παραβιάζονται τα δικαιώματά σου, μπορείς να υποβάλεις καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (<a href="https://www.dpa.gr" target="_blank" rel="noopener noreferrer" className="l-link">www.dpa.gr</a>).</p>
      </Section>
      <Section title="7. Ηλικία">
        <p>Η LASCA απευθύνεται σε άτομα από {SITE.minAge} ετών και πάνω (άρθρο 21 ν. 4624/2019). Αν μάθουμε ότι λογαριασμός ανήκει σε μικρότερο άτομο, τον διαγράφουμε.</p>
      </Section>
      <Section title="8. Αλλαγές">
        <p>Αν αλλάξει κάτι ουσιαστικό, θα το δεις εδώ με νέα ημερομηνία και θα ενημερωθείς μέσα στην εφαρμογή.</p>
      </Section>
    </LegalPage>
  );
}

export function Terms() {
  usePageMeta({ title: 'Όροι χρήσης', description: 'Οι όροι χρήσης της LASCA, της δωρεάν εφαρμογής τοπογραφικών υπολογισμών.' });
  return (
    <LegalPage eyebrow="Όροι" title="Όροι χρήσης"
      intro="Με τη δημιουργία λογαριασμού αποδέχεσαι τους παρακάτω όρους. Τους κρατήσαμε σύντομους και κατανοητούς.">
      <Section title="1. Η υπηρεσία">
        <p>Η LASCA είναι δωρεάν εφαρμογή τοπογραφικών υπολογισμών για εκπαιδευτική χρήση. <strong>Δεν υπάρχουν συνδρομές, χρεώσεις ή αυτόματες ανανεώσεις.</strong> Αν ποτέ προστεθεί πληρωμένη λειτουργία, θα χρειαστεί ξεχωριστή, ρητή αποδοχή σου πριν από οποιαδήποτε χρέωση.</p>
      </Section>
      <Section title="2. Ακρίβεια αποτελεσμάτων">
        <p>Οι υπολογισμοί γίνονται με προσοχή, αλλά <strong>η υπηρεσία παρέχεται «ως έχει»</strong>. Είσαι υπεύθυνος να ελέγχεις τα αποτελέσματα πριν τα χρησιμοποιήσεις σε εργασία, μελέτη ή εφαρμογή στο πεδίο. Η LASCA δεν ευθύνεται για ζημιές από λανθασμένα δεδομένα εισόδου ή από χρήση των αποτελεσμάτων χωρίς έλεγχο.</p>
      </Section>
      <Section title="3. Ο λογαριασμός σου">
        <ul>
          <li>Πρέπει να είσαι τουλάχιστον {SITE.minAge} ετών.</li>
          <li>Κράτα τον κωδικό σου μυστικό. Σου προτείνουμε να ενεργοποιήσεις τον έλεγχο δύο βημάτων.</li>
          <li>Ένας λογαριασμός ανά άτομο· μη μοιράζεσαι τα στοιχεία σύνδεσης.</li>
        </ul>
      </Section>
      <Section title="4. Επιτρεπτή χρήση">
        <p>Δεν επιτρέπεται: απόπειρα παραβίασης της ασφάλειας ή πρόσβασης σε δεδομένα άλλων, αυτοματοποιημένα αιτήματα που επιβαρύνουν τον server, παράκαμψη των ορίων χρήσης, ανέβασμα κακόβουλων αρχείων, ή χρήση της υπηρεσίας για παράνομο σκοπό. Ισχύουν όρια χρήσης (π.χ. πλήθος projects και αιτημάτων) για να είναι η υπηρεσία δίκαιη για όλους.</p>
      </Section>
      <Section title="5. Τα δεδομένα σου">
        <p>Τα projects και οι μετρήσεις σου ανήκουν σε εσένα. Μας δίνεις μόνο την άδεια να τα αποθηκεύουμε και να τα επεξεργαζόμαστε για να σου δείξουμε τα αποτελέσματα και να τα μοιραστείς με όσους επιλέξεις. Όταν κοινοποιείς ένα project, οι συνεργάτες σου βλέπουν (ή επεξεργάζονται) τα δεδομένα του ανάλογα με τον ρόλο που τους δίνεις.</p>
      </Section>
      <Section title="6. Διαθεσιμότητα και τερματισμός">
        <p>Προσπαθούμε να είναι η υπηρεσία διαθέσιμη, χωρίς όμως εγγύηση. Μπορείς να διαγράψεις τον λογαριασμό σου όποτε θέλεις από το Προφίλ. Μπορούμε να αναστείλουμε λογαριασμό που παραβιάζει αυτούς τους όρους.</p>
      </Section>
      <Section title="7. Εφαρμοστέο δίκαιο και επικοινωνία">
        <p>Ισχύει το ελληνικό δίκαιο. Για ερωτήσεις: <Contact />. Δες επίσης την <Link to="/privacy" className="l-link">Πολιτική απορρήτου</Link>.</p>
      </Section>
    </LegalPage>
  );
}

const COOKIES = [
  ['__Host-lasca_session', 'Απαραίτητο', 'Σε κρατάει συνδεδεμένο όσο είναι ανοιχτός ο browser.', 'Μέχρι να κλείσεις τον browser'],
  ['__Host-lasca_remember', 'Απαραίτητο', 'Μόνο αν τσεκάρεις «Να με θυμάσαι»: σε κρατάει συνδεδεμένο.', '30 ημέρες'],
];
const STORAGE = [
  ['lasca_cookie_notice_v1', 'Θυμάται ότι είδες αυτή την ενημέρωση.'],
  ['current_active_project_…', 'Το project που είχες ανοιχτό, για να συνεχίσεις από εκεί.'],
];

export function Cookies() {
  usePageMeta({ title: 'Cookies', description: 'Η LASCA χρησιμοποιεί μόνο απαραίτητα cookies σύνδεσης.' });
  return (
    <LegalPage eyebrow="Cookies" title="Cookies"
      intro="Η LASCA χρησιμοποιεί μόνο τα απολύτως απαραίτητα cookies για να μπορείς να συνδεθείς. Δεν υπάρχουν cookies διαφήμισης, στατιστικών ή παρακολούθησης, γι’ αυτό δεν σου ζητάμε συγκατάθεση.">
      <Section title="Cookies της LASCA">
        <div className="overflow-x-auto rounded-[12px] shadow-[var(--shadow-hairline)]">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <caption className="sr-only">Cookies που χρησιμοποιεί η LASCA</caption>
            <thead className="bg-glass-wash text-frost">
              <tr><th className="p-3 font-medium">Όνομα</th><th className="p-3 font-medium">Τύπος</th><th className="p-3 font-medium">Σκοπός</th><th className="p-3 font-medium">Διάρκεια</th></tr>
            </thead>
            <tbody>
              {COOKIES.map(([n, t, p, d]) => (
                <tr key={n} className="border-t border-glass-edge"><td className="p-3 font-mono text-[13px] text-frost">{n}</td><td className="p-3">{t}</td><td className="p-3">{p}</td><td className="p-3">{d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Και τα δύο είναι <strong>HttpOnly</strong> (δεν τα διαβάζει κανένα script), <strong>Secure</strong> (μόνο μέσω HTTPS) και <strong>SameSite=Strict</strong> (δεν στέλνονται από άλλες ιστοσελίδες).</p>
      </Section>
      <Section title="Τοπική αποθήκευση του browser">
        <ul>{STORAGE.map(([k, v]) => <li key={k}><span className="font-mono text-[13px] text-frost">{k}</span>: {v}</li>)}</ul>
      </Section>
      <Section title="Τρίτοι, μόνο όταν τους χρησιμοποιείς">
        <ul>
          <li><strong>Google</strong>: αν πατήσεις «Σύνδεση με Google», η Google μπορεί να χρησιμοποιήσει τα δικά της cookies στο παράθυρο σύνδεσης.</li>
          <li><strong>Cloudflare Turnstile</strong>: στον έλεγχο «δεν είμαι ρομπότ» η Cloudflare επεξεργάζεται τεχνικά στοιχεία του browser, χωρίς cookies διαφήμισης.</li>
        </ul>
        <p>Μπορείς να σβήσεις τα cookies από τις ρυθμίσεις του browser σου· απλώς θα χρειαστεί να συνδεθείς ξανά.</p>
      </Section>
    </LegalPage>
  );
}
