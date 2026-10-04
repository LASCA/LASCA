import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PublicPage } from '../components/marketing/PublicChrome';
import { LostPointIllustration } from '../components/marketing/Illustrations';
import usePageMeta from '../hooks/usePageMeta';
import { useAuth } from '../auth/AuthContext';

export default function NotFound() {
  usePageMeta({ title: 'Η σελίδα δεν βρέθηκε', noindex: true });
  const { user } = useAuth();
  return (
    <PublicPage>
      <section className="mx-auto flex max-w-[760px] flex-col items-center px-4 pb-24 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="l-eyebrow l-eyebrow-lines">Σφάλμα 404</p>
        <LostPointIllustration className="mt-8 h-auto w-full max-w-[460px]" />
        <h1 className="l-display mt-6 text-[34px] leading-[1.15] sm:text-[44px]">Αυτό το σημείο δεν υπάρχει</h1>
        <p className="mt-4 max-w-[480px] text-[16px] text-mist">
          Ψάξαμε σε όλο τον κάνναβο, αλλά η σελίδα που ζήτησες δεν βρέθηκε. Ίσως ο σύνδεσμος είναι παλιός ή γράφτηκε λάθος.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to={user ? '/app' : '/'} className="l-btn l-btn-primary l-btn-lg">
            <ArrowLeft size={17} aria-hidden="true" /> {user ? 'Πίσω στην εφαρμογή' : 'Στην αρχική σελίδα'}
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
