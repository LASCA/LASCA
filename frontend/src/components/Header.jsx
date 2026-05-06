import React from 'react';

const Header = ({ activeTab }) => {
  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-10 sticky top-0 z-50">
      <div>
        <h2 className="text-2xl font-bold text-white capitalize tracking-tight">
          {activeTab === 'dashboard' ? 'Επισκόπηση' : 
           activeTab === 'adjustment' ? 'Συνόρθωση Σταθμού' : activeTab}
        </h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
          Project: Survey_2024_01
        </p>
      </div>
      
      {/* Τα κουμπιά αφαιρέθηκαν από εδώ για ένα πιο καθαρό UI */}
      <div className="flex items-center gap-4">
        {/* Εδώ μπορείς να προσθέσεις μελλοντικά ένα profile icon ή notifications αν χρειαστεί */}
      </div>
    </header>
  );
};

export default Header;