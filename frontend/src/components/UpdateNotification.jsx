import { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';

const DISMISSED_VERSION_KEY = 'lasca-dismissed-update-version';

export default function UpdateNotification({ updateInfo }) {
  const { hasUpdate, latestVersion, downloadUrl, changelog, loading } = updateInfo || {};
  const [dismissedVersion, setDismissedVersion] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISSED_VERSION_KEY) || '';
    } catch {
      return '';
    }
  });

  if (!hasUpdate || loading || dismissedVersion === latestVersion) {
    return null;
  }

  const canDownload = typeof downloadUrl === 'string' && downloadUrl.startsWith('https://');
  const actionClassName = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

  const dismissUpdate = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_VERSION_KEY, latestVersion);
    } catch {
      // Keep the notification dismissible when session storage is unavailable.
    }
    setDismissedVersion(latestVersion);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[80] w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-xl border border-purple-500/20 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/60 backdrop-blur-md"
    >
      {/* 🌈 Signature LASCA Gradient Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-rose-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400">
              Διαθέσιμη Ενημέρωση
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              LASCA {latestVersion}
            </h2>
          </div>
        </div>

        <div className="mt-4 max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm leading-relaxed text-slate-300">
          <p className="whitespace-pre-wrap break-words">
            {changelog || 'Δεν παρέχονται σημειώσεις έκδοσης.'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {canDownload ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionClassName} bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-950/40 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98]`}
            >
              <Download size={16} aria-hidden="true" />
              Λήψη Ενημέρωσης
            </a>
          ) : (
            <button
              type="button"
              disabled
              className={`${actionClassName} cursor-not-allowed bg-slate-800 text-slate-500`}
            >
              <Download size={16} aria-hidden="true" />
              Λήψη Ενημέρωσης
            </button>
          )}
          <button
            type="button"
            onClick={dismissUpdate}
            className={`${actionClassName} border border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white`}
          >
            Αναβολή
          </button>
        </div>
      </div>
    </aside>
  );
}