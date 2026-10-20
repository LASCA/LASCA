// Εμφάνιση των παραθύρων του Clerk στο ύφος της LASCA (ίδιο με τις φόρμες του web-pages:
// σκούρα πεδία, κεφαλαίες ετικέτες, μπλε κουμπί) και ελληνικά κείμενα.
import { GHOST_BUTTON, INPUT_CLASS, PRIMARY_BUTTON } from '../components/auth/FormParts';
import { elGR } from './clerk-el-GR';

// Για όλο το Clerk (και το παράθυρο «Λογαριασμός» του Προφίλ).
// cssLayerName: τα στυλ του Clerk μπαίνουν σε δικό τους CSS layer, πριν από τα utilities του Tailwind
// (βλ. την πρώτη γραμμή του index.css), ώστε να ισχύουν οι κλάσεις που δίνουμε παρακάτω.
export const clerkAppearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: '#2563eb',
    colorPrimaryForeground: '#ffffff',
    colorBackground: '#0b1221',
    colorForeground: '#e2e8f0',
    colorMutedForeground: '#94a3b8',
    colorMuted: '#0f172a',
    colorInput: '#0f172a',
    colorInputForeground: '#f1f5f9',
    colorBorder: '#1e293b',
    colorNeutral: '#cbd5e1',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    colorRing: 'rgba(59,130,246,.35)',
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
  },
};

const LINK = 'text-blue-300 hover:text-blue-200 font-medium';

// Μόνο για Σύνδεση / Εγγραφή: χωρίς «κάρτα», τον τίτλο τον δείχνει το AuthLayout.
export const clerkAuthAppearance = {
  options: {
    elevation: 'flush',
    logoPlacement: 'none',
    socialButtonsVariant: 'blockButton',
    socialButtonsPlacement: 'top',
    termsPageUrl: '/terms',
    privacyPageUrl: '/privacy',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full max-w-none rounded-none border-0 bg-transparent shadow-none',
    card: 'gap-5 rounded-none border-0 bg-transparent p-0 shadow-none',
    header: 'hidden',
    main: 'gap-4',
    socialButtons: 'gap-2',
    socialButtonsBlockButton: GHOST_BUTTON,
    socialButtonsBlockButtonText: 'text-[14px] font-semibold text-slate-200',
    dividerRow: 'my-0',
    dividerLine: 'bg-slate-800',
    dividerText: 'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500',
    form: 'gap-4',
    formFieldRow: 'gap-3',
    formFieldLabel: 'text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400',
    formFieldInput: INPUT_CLASS,
    formFieldInputShowPasswordButton: 'text-slate-500 hover:bg-transparent hover:text-slate-200',
    formFieldAction: 'text-[13px] font-normal text-slate-400 hover:text-white',
    formFieldHintText: 'text-[12px] text-slate-500',
    formFieldErrorText: 'text-[12.5px] text-red-300',
    formFieldWarningText: 'text-[12.5px] text-orange-300',
    formFieldSuccessText: 'text-[12.5px] text-emerald-300',
    formButtonPrimary: `${PRIMARY_BUTTON} normal-case`,
    alert: 'rounded-xl border border-red-500/30 bg-red-500/10',
    alertText: 'text-[13px] leading-snug text-red-200',
    identityPreview: 'rounded-xl border border-slate-800 bg-slate-900/70',
    identityPreviewText: 'text-slate-200',
    identityPreviewEditButton: LINK,
    otpCodeFieldInput: 'rounded-xl border border-slate-700 bg-slate-900/70 text-white',
    formResendCodeLink: LINK,
    backLink: LINK,
    alternativeMethodsBlockButton: GHOST_BUTTON,
    // Το «Δεν έχεις λογαριασμό;» το δείχνει το AuthLayout (όπως στο web-pages).
    footer: 'bg-none bg-transparent',
    footerAction: 'hidden',
  },
};

const OVERRIDES = {
  formFieldLabel__emailAddress: 'Email',
  formFieldLabel__emailAddress_username: 'Email',
  formFieldLabel__password: 'Κωδικός',
  formFieldLabel__confirmPassword: 'Επιβεβαίωση κωδικού',
  formFieldLabel__firstName: 'Όνομα',
  formFieldLabel__lastName: 'Επώνυμο',
  formFieldInputPlaceholder__firstName: 'π.χ. Κώστας',
  formFieldInputPlaceholder__lastName: 'π.χ. Τ.',
  formFieldInputPlaceholder__emailAddress: 'onoma@auth.gr',
  formFieldInputPlaceholder__emailAddress_username: 'onoma@auth.gr',
  formFieldInputPlaceholder__password: '',
  formFieldAction__forgotPassword: 'Ξέχασες τον κωδικό;',
  formButtonPrimary: 'Συνέχεια',
  dividerText: 'ή με email',
};

function merge(base, extra) {
  const out = { ...base };
  Object.entries(extra).forEach(([key, value]) => {
    out[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] || {}, value) : value;
  });
  return out;
}

export const clerkLocalization = merge(elGR, OVERRIDES);
