import React, { useEffect, useRef } from 'react';

// Cloudflare Turnstile: CAPTCHA χωρίς γρίφους και χωρίς cookies παρακολούθησης.
// Φορτώνεται ΜΟΝΟ όταν χρειάζεται (εγγραφή, ξέχασα τον κωδικό, ή μετά από 3 λάθος κωδικούς).
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** onToken(token|null). resetKey: άλλαξέ το για νέο έλεγχο (π.χ. μετά από αποτυχημένη υποβολή). */
export default function Turnstile({ siteKey, onToken, resetKey = 0, action, compact = false }) {
  const box = useRef(null);
  const widget = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    loadScript().then((ts) => {
      if (cancelled || !box.current || !ts) return;
      widget.current = ts.render(box.current, {
        sitekey: siteKey,
        theme: 'dark',
        language: 'el',
        action,
        // compact: το widget εμφανίζεται μόνο αν η Cloudflare χρειαστεί αλληλεπίδραση (εξοικονομεί χώρο)
        ...(compact ? { appearance: 'interaction-only' } : {}),
        callback: (token) => cb.current?.(token),
        'expired-callback': () => cb.current?.(null),
        'error-callback': () => cb.current?.(null),
      });
    }).catch(() => cb.current?.(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) {
        try { window.turnstile.remove(widget.current); } catch { /* ήδη αφαιρέθηκε */ }
      }
      widget.current = null;
    };
  }, [siteKey, resetKey, action, compact]);

  if (!siteKey) return null;
  return <div ref={box} className={`${compact ? '' : 'min-h-[65px]'} flex justify-center`} aria-label="Έλεγχος ασφαλείας" />;
}
