import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../../auth/AuthContext';

export function TextField({
  id, label, type = 'text', value, onChange, autoComplete, placeholder, required = true, hint, error,
  inputMode, maxLength, autoFocus, describedBy, className = '', disabled,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const hintId = hint || describedBy ? `${id}-hint` : undefined;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="l-label">{label}{!required && <span className="font-normal text-fog"> (προαιρετικό)</span>}</label>
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
          className={`l-input ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-fog hover:text-frost"
            aria-label={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
            aria-pressed={show}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && <p className="text-[13px] text-[#ffb8a3]">{error}</p>}
      {hint && !describedBy && <p id={hintId} className="text-[13px] text-fog">{hint}</p>}
    </div>
  );
}

export function Checkbox({ id, checked, onChange, children, required }) {
  return (
    <label htmlFor={id} className="flex select-none items-start gap-3 text-[14px] leading-snug text-mist">
      <input id={id} type="checkbox" className="l-checkbox" checked={checked} required={required}
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
    <button type="submit" disabled={loading || disabled} className="l-btn l-btn-primary l-btn-lg w-full">
      {loading && <Loader2 size={17} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <div role="alert" className="l-alert l-alert-error animate-rise">{message}</div>;
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
export function GoogleSection({ remember, onResult, onError, text = 'continue_with', terms }) {
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
          width="340"
        />
        {blocked && (
          <button type="button" className="absolute inset-0 cursor-not-allowed" aria-label="Αποδέξου πρώτα τους όρους"
            onClick={() => onError?.('Τσέκαρε πρώτα την αποδοχή των όρων και της ηλικίας παρακάτω.')} />
        )}
      </div>
      <div className="l-divider my-6">ή με email</div>
    </>
  );
}
