import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../../auth/AuthContext';

// Ίδιο ύφος με την αρχική σελίδα και την εφαρμογή: σκούρα πεδία, μπλε κουμπί.
export const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 text-[14px] text-slate-100 '
  + 'placeholder:text-slate-500 outline-none transition focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 '
  + 'aria-[invalid=true]:border-red-500/60 disabled:opacity-60';
export const LABEL_CLASS = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400';
export const PRIMARY_BUTTON =
  'relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-5 '
  + 'text-[14.5px] font-semibold text-white shadow-[0_0_0_1px_rgba(59,130,246,.6)_inset,0_10px_30px_-10px_rgba(37,99,235,.7)] '
  + 'transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60';
export const GHOST_BUTTON =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-4 '
  + 'text-[14px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-60';

export function TextField({
  id, label, type = 'text', value, onChange, autoComplete, placeholder, required = true, hint, error,
  inputMode, maxLength, autoFocus, describedBy, className = '', disabled,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const hintId = hint || describedBy ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>{label}{!required && <span className="font-normal normal-case tracking-normal text-slate-500"> (προαιρετικό)</span>}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || hintId}
          className={`${INPUT_CLASS} ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-200"
            aria-label={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
            aria-pressed={show}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[12.5px] text-red-300">{error}</p>}
      {hint && !describedBy && <p id={hintId} className="mt-1 text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function Checkbox({ id, checked, onChange, children, required }) {
  return (
    <label htmlFor={id} className="flex select-none items-start gap-2.5 text-[13px] leading-snug text-slate-400">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-600" checked={checked} required={required}
        onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function RememberMe({ checked, onChange }) {
  return <Checkbox id="remember" checked={checked} onChange={onChange}>Να με θυμάσαι σε αυτή τη συσκευή</Checkbox>;
}

export function SubmitButton({ loading, children, disabled }) {
  return (
    <button type="submit" disabled={loading || disabled} className={PRIMARY_BUTTON}>
      {loading && <Loader2 size={17} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <div role="alert" className="animate-rise rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] leading-snug text-red-200">{message}</div>;
}

// Κρυφό πεδίο: οι άνθρωποι δεν το βλέπουν, τα bots το συμπληρώνουν (και η εγγραφή απορρίπτεται).
export function Honeypot({ value, onChange }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="website">Ιστοσελίδα</label>
      <input id="website" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Αντίστροφη μέτρηση όταν ο server λέει «περίμενε Χ δευτερόλεπτα». */
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [until]);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return { left, start: (seconds) => { setUntil(Date.now() + seconds * 1000); setNow(Date.now()); } };
}

export function formatWait(seconds) {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)} ώρ.`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} λεπτά`;
  return `${seconds} δευτ.`;
}

// «Συνέχεια με Google». Εμφανίζεται μόνο αν ο server έχει GOOGLE_CLIENT_ID.
// terms: στην εγγραφή, το κουμπί ενεργοποιείται μόνο αφού τσεκαριστεί η αποδοχή όρων/ηλικίας.
export function GoogleSection({ remember, onResult, onError, text = 'continue_with', terms, dense = false }) {
  const { googleClientId, loginWithGoogle } = useAuth();
  if (!googleClientId) return null;
  const blocked = terms && !terms.accepted;

  return (
    <>
      <div className={`relative flex justify-center transition-opacity ${blocked ? 'opacity-40' : ''}`}>
        <GoogleLogin
          onSuccess={async ({ credential }) => {
            try {
              const result = await loginWithGoogle(credential, {
                remember, acceptTerms: terms?.accepted, ageConfirmed: terms?.accepted,
              });
              onResult?.(result);
            } catch (error) {
              onError?.(apiErrorMessage(error, 'Αποτυχία σύνδεσης με Google'), apiErrorInfo(error));
            }
          }}
          onError={() => onError?.('Η σύνδεση με Google ακυρώθηκε ή απέτυχε.')}
          theme="filled_black"
          shape="pill"
          size="large"
          text={text}
          locale="el"
          width="360"
        />
        {blocked && (
          <button type="button" className="absolute inset-0 cursor-not-allowed" aria-label="Αποδέξου πρώτα τους όρους"
            onClick={() => onError?.('Τσέκαρε πρώτα την αποδοχή των όρων και της ηλικίας παρακάτω.')} />
        )}
      </div>
      <div className={`${dense ? 'my-3' : 'my-4'} flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500`} aria-hidden="true">
        <span className="h-px flex-1 bg-slate-800" />ή με email<span className="h-px flex-1 bg-slate-800" />
      </div>
    </>
  );
}
