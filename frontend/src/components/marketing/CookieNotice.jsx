import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const KEY = 'lasca_cookie_notice_v1';

/**
 * Ενημέρωση για cookies. Η LASCA χρησιμοποιεί ΜΟΝΟ απαραίτητα cookies (σύνδεση, «να με θυμάσαι»),
 * οπότε δεν χρειάζεται συγκατάθεση (ePrivacy άρθρο 5(3)) — μόνο ενημέρωση. Δεν υπάρχουν cookies
 * διαφήμισης ή παρακολούθησης, ούτε καταγραφή συνεδρίας (session replay).
 */
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!window.localStorage.getItem(KEY)); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  const close = () => {
    try { window.localStorage.setItem(KEY, new Date().toISOString()); } catch { /* ιδιωτική περιήγηση */ }
    setShow(false);
  };
  return (
    <div role="region" aria-label="Ενημέρωση για cookies"
      className="fixed inset-x-3 bottom-3 z-[200] mx-auto max-w-[560px] animate-rise sm:bottom-5">
      <div className="l-modal flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <span className="l-icon-tile hidden h-10 w-10 shrink-0 sm:inline-flex"><Cookie size={18} aria-hidden="true" /></span>
        <p className="text-[13.5px] leading-relaxed text-mist">
          Χρησιμοποιούμε μόνο τα απαραίτητα cookies για τη σύνδεσή σου. Καμία διαφήμιση, καμία παρακολούθηση.{' '}
          <Link to="/cookies" className="l-link">Μάθε περισσότερα</Link>
        </p>
        <button type="button" onClick={close} className="l-btn l-btn-ghost l-btn-sm shrink-0 self-end sm:self-auto">Εντάξει</button>
      </div>
    </div>
  );
}
