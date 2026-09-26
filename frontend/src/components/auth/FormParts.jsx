import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { apiErrorMessage, useAuth } from '../../auth/AuthContext';

export function TextField({ id, label, type = 'text', value, onChange, autoComplete, placeholder, required = true, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-bold tracking-wider text-slate-400">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="w-full h-11 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[#5b74e6] focus:ring-2 focus:ring-[#3b5bdb]/30"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-300"
            aria-label={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function RememberMe({ checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-300 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-[#3b5bdb]"
      />
      Να με θυμάσαι
    </label>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] text-sm font-bold text-white shadow-lg shadow-[#3b5bdb]/20 transition hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
      {message}
    </div>
  );
}

// Κουμπί «Συνέχεια με Google». Εμφανίζεται μόνο αν ο server έχει GOOGLE_CLIENT_ID.
export function GoogleSection({ remember, onSuccess, text = 'continue_with' }) {
  const { googleClientId, loginWithGoogle } = useAuth();
  if (!googleClientId) return null;

  return (
    <>
      <div className="flex justify-center [&>div]:w-full">
        <GoogleLogin
          onSuccess={async ({ credential }) => {
            try {
              const user = await loginWithGoogle(credential, remember);
              onSuccess?.(user);
            } catch (error) {
              toast.error(apiErrorMessage(error, 'Αποτυχία σύνδεσης με Google'));
            }
          }}
          onError={() => toast.error('Η σύνδεση με Google ακυρώθηκε ή απέτυχε')}
          theme="filled_black"
          shape="pill"
          size="large"
          text={text}
          locale="el"
          width="360"
        />
      </div>
      <div className="my-6 flex items-center gap-3 text-[11px] font-bold tracking-widest text-slate-600">
        <span className="h-px flex-1 bg-slate-800" />
        Ή ΜΕ EMAIL
        <span className="h-px flex-1 bg-slate-800" />
      </div>
    </>
  );
}
