import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Οι ίδιοι κανόνες με τον server (code/auth_security.py). Ο server ελέγχει ξανά: εδώ είναι μόνο
// για να βλέπει ο χρήστης αμέσως τι λείπει.
// Μήκος: κάτω από min απορρίπτεται· από min έως recommended γίνεται δεκτός με πορτοκαλί προειδοποίηση.
export function passwordRules(pw, min = 8, recommended = 12) {
  const short = pw.length >= min && pw.length < recommended;
  return [
    {
      id: 'len', ok: pw.length >= min, warn: short,
      label: pw.length < min ? `Τουλάχιστον ${min} χαρακτήρες` : `${recommended}+ χαρακτήρες (προτείνεται)`,
    },
    { id: 'lower', label: 'Ένα πεζό γράμμα', ok: /[a-zα-ωά-ώ]/.test(pw) },
    { id: 'upper', label: 'Ένα κεφαλαίο γράμμα', ok: /[A-ZΑ-ΩΆ-Ώ]/.test(pw) },
    { id: 'digit', label: 'Έναν αριθμό', ok: /\d/.test(pw) },
    { id: 'symbol', label: 'Ένα σύμβολο (! ? # @ …)', ok: /[^\p{L}\p{N}\s]|_/u.test(pw) },
  ];
}

const LEVELS = [
  { label: 'Πολύ αδύναμος', color: '#e46d4c' },
  { label: 'Αδύναμος', color: '#e46d4c' },
  { label: 'Μέτριος', color: '#e0b04c' },
  { label: 'Καλός', color: '#4cb39f' },
  { label: 'Πολύ ισχυρός', color: '#5fd3bd' },
];

const WARNINGS_EL = {
  'This is a top-10 common password': 'Είναι από τους 10 πιο συνηθισμένους κωδικούς.',
  'This is a top-100 common password': 'Είναι από τους 100 πιο συνηθισμένους κωδικούς.',
  'This is a very common password': 'Είναι πολύ συνηθισμένος κωδικός.',
  'This is similar to a commonly used password': 'Μοιάζει με συνηθισμένο κωδικό.',
  'A word by itself is easy to guess': 'Μια λέξη μόνη της μαντεύεται εύκολα.',
  'Names and surnames by themselves are easy to guess': 'Ονόματα και επώνυμα μαντεύονται εύκολα.',
  'Common names and surnames are easy to guess': 'Συνηθισμένα ονόματα μαντεύονται εύκολα.',
  'Straight rows of keys are easy to guess': 'Σειρές πλήκτρων (π.χ. qwerty) μαντεύονται εύκολα.',
  'Short keyboard patterns are easy to guess': 'Μοτίβα του πληκτρολογίου μαντεύονται εύκολα.',
  'Repeats like "aaa" are easy to guess': 'Επαναλήψεις όπως «aaa» μαντεύονται εύκολα.',
  'Repeats like "abcabcabc" are only slightly harder to guess than "abc"': 'Επαναλήψεις όπως «abcabc» δεν βοηθούν.',
  'Sequences like abc or 6543 are easy to guess': 'Ακολουθίες όπως abc ή 6543 μαντεύονται εύκολα.',
  'Recent years are easy to guess': 'Πρόσφατες χρονιές μαντεύονται εύκολα.',
  'Dates are often easy to guess': 'Ημερομηνίες μαντεύονται συχνά εύκολα.',
};

let zxcvbnPromise = null;
const loadZxcvbn = () => {
  // Φορτώνεται μόνο όταν ο χρήστης πληκτρολογεί κωδικό (~800KB, δεν βαραίνει την αρχική σελίδα).
  if (!zxcvbnPromise) zxcvbnPromise = import('zxcvbn').then((m) => m.default || m).catch(() => null);
  return zxcvbnPromise;
};

/**
 * Μετρητής ισχύος κωδικού σε πραγματικό χρόνο: κανόνες + zxcvbn + έλεγχος server
 * (συνηθισμένος / διαρρευμένος κωδικός). onValidity(true|false) όταν αλλάζει.
 */
export default function PasswordStrength({ password, email = '', name = '', min = 8, recommended = 12, onValidity, id }) {
  const [score, setScore] = useState(null);
  const [warning, setWarning] = useState('');
  const [server, setServer] = useState({ state: 'idle', error: '' });
  const rules = useMemo(() => passwordRules(password, min, recommended), [password, min, recommended]);
  const tooShortWarn = rules.some((r) => r.warn);
  const rulesOk = rules.every((r) => r.ok);
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!password) { setScore(null); setWarning(''); return undefined; }
    loadZxcvbn().then((zxcvbn) => {
      if (!alive || !zxcvbn) return;
      const res = zxcvbn(password.slice(0, 100), [email, email.split('@')[0], name, 'lasca', 'topografia'].filter(Boolean));
      setScore(res.score);
      const w = res.feedback?.warning;
      setWarning(w ? (WARNINGS_EL[w] || '') : '');
    });
    return () => { alive = false; };
  }, [password, email, name]);

  // Έλεγχος στον server όταν ο χρήστης σταματήσει να πληκτρολογεί (συνηθισμένος / σε διαρροές).
  useEffect(() => {
    clearTimeout(timer.current);
    if (!password || !rulesOk) { setServer({ state: 'idle', error: '' }); return undefined; }
    setServer({ state: 'checking', error: '' });
    timer.current = setTimeout(async () => {
      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/password-check`, { password, email, display_name: name });
        setServer(data.ok ? { state: 'ok', error: '' } : { state: 'bad', error: data.error });
      } catch {
        setServer({ state: 'idle', error: '' }); // ο server θα ελέγξει ξανά στην υποβολή
      }
    }, 650);
    return () => clearTimeout(timer.current);
  }, [password, email, name, rulesOk]);

  const valid = rulesOk && server.state !== 'bad' && (score === null || score >= 2);
  const cbRef = useRef(onValidity);
  cbRef.current = onValidity;
  useEffect(() => { cbRef.current?.(valid); }, [valid]);

  if (!password) {
    return <p id={id} className="text-[13px] text-fog">Προτείνονται {recommended}+ χαρακτήρες (τουλάχιστον {min}), με κεφαλαία, πεζά, αριθμό και σύμβολο. Μια φράση από 3–4 λέξεις είναι ιδανική.</p>;
  }
  // Αν λείπει κάποιος κανόνας, ο κωδικός δεν γίνεται δεκτός: δεν τον δείχνουμε ως «καλό».
  const shown = score === null ? null : (rulesOk ? score : Math.min(score, 1));
  const level = shown === null ? null : LEVELS[shown];
  return (
    <div id={id} className="space-y-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ background: shown !== null && shown > i ? level.color : 'rgb(186 215 247 / 0.12)' }} />
          ))}
        </div>
        <span className="min-w-[88px] text-right text-[12px] font-medium" style={{ color: level?.color || '#9da7ba' }}>
          {level ? level.label : '…'}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {rules.map((r) => (
          <li key={r.id} className={`flex items-center gap-1.5 text-[12.5px] ${r.warn ? 'text-[#f0b35f]' : r.ok ? 'text-[#7fdcc9]' : 'text-fog'}`}>
            {r.warn ? <AlertTriangle size={13} aria-hidden="true" /> : r.ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
            <span>{r.label}<span className="sr-only">{r.warn ? ': προειδοποίηση' : r.ok ? ': εντάξει' : ': λείπει'}</span></span>
          </li>
        ))}
      </ul>
      {tooShortWarn && (
        <p className="flex items-start gap-1.5 rounded-lg border border-[#f0b35f]/30 bg-[#f0b35f]/[0.08] px-2.5 py-1.5 text-[12.5px] text-[#f0b35f]">
          <AlertTriangle size={13} className="mt-[3px] shrink-0" aria-hidden="true" />
          <span>Ο κωδικός έχει λιγότερους από {recommended} χαρακτήρες. Γίνεται δεκτός, αλλά ένας μεγαλύτερος είναι πιο ασφαλής.</span>
        </p>
      )}
      {warning && <p className="text-[12.5px] text-[#f0c38a]">{warning}</p>}
      {server.state === 'checking' && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-fog"><Loader2 size={12} className="animate-spin" /> Έλεγχος σε λίστες διαρρευμένων κωδικών…</p>
      )}
      {server.state === 'bad' && <p className="text-[12.5px] text-[#ffb8a3]">{server.error}</p>}
      {server.state === 'ok' && score !== null && score < 2 && (
        <p className="text-[12.5px] text-[#f0c38a]">Μαντεύεται εύκολα. Πρόσθεσε μια ακόμα λέξη.</p>
      )}
    </div>
  );
}
