import React from 'react'
import { SignUp } from '@clerk/react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import usePageMeta from '../hooks/usePageMeta.js'

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' })

  return (
    <AuthLayout eyebrow="Δωρεάν για φοιτητές" title="" subtitle="">
      <SignUp 
        forceRedirectUrl="/app"
        fallbackRedirectUrl="/app"
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'bg-slate-900 border border-slate-700 rounded-lg shadow-xl',
            headerTitle: 'text-white text-2xl font-bold',
            headerSubtitle: 'text-slate-400',
            formFieldLabel: 'text-slate-300 font-medium',
            formFieldInput: 'bg-slate-800 border border-slate-700 text-white rounded-md placeholder-slate-500',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md',
            footerActionLink: 'text-blue-400 hover:text-blue-300',
            dividerLine: 'bg-slate-700',
            dividerText: 'text-slate-400',
            socialButtonsBlockButton: 'border border-slate-600 text-slate-300 hover:bg-slate-800',
            alertText: 'text-red-400',
          },
        }}
      />
    </AuthLayout>
  )
}
