import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './styles/fonts.js'
import './index.css'
import { AuthProvider } from './auth/AuthContext.jsx'
import { FullScreenLoader, GoogleProviderGate, GuestOnly, RequireAuth } from './auth/guards.jsx'
import Landing from './pages/Landing.jsx'
import CookieNotice from './components/marketing/CookieNotice.jsx'
import { loadAnalytics } from './utils/analytics.js'

// Οι βαριές σελίδες (η εφαρμογή με χάρτες, γραφήματα, Excel) φορτώνονται μόνο όταν χρειαστούν:
// η αρχική σελίδα ανοίγει γρήγορα χωρίς να κατεβάζει όλο το πρόγραμμα.
const App = lazy(() => import('./App.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Invite = lazy(() => import('./pages/Invite.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const ForgotPassword = lazy(() => import('./pages/PasswordReset.jsx').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/PasswordReset.jsx').then((m) => ({ default: m.ResetPassword })))
const Privacy = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Terms })))
const Cookies = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Cookies })))

loadAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GoogleProviderGate>
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: 'rgb(8 10 22 / 0.97)', color: '#d1e4fa', fontSize: '13px', borderRadius: '12px',
              boxShadow: 'inset 0 0 0 1px rgb(186 215 247 / 0.14), 0 16px 32px rgb(0 0 0 / 0.35)',
            },
          }} />
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
              <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/app" element={<RequireAuth><App /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/invite/:token" element={<Invite />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieNotice />
        </GoogleProviderGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
