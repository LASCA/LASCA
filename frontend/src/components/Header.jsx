import React from 'react';
import { Upload, Play } from 'lucide-react';

const Header = ({ activeTab }) => {
  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-10 sticky top-0 z-50">
      <div>
        <h2 className="text-2xl font-bold text-white capitalize tracking-tight">
          {activeTab === 'dashboard' ? 'Επισκόπηση' : 
           activeTab === 'adjustment' ? 'Συνόρθωση Δικτύου' : activeTab}
        </h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Project: Survey_2024_01</p>
      </div>
      
      <div className="flex items-center gap-4">
        {activeTab === 'adjustment' && (
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold text-[11px] transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95">
            <Play size={14} fill="currentColor" /> ΕΚΤΕΛΕΣΗ
          </button>
        )}
        <button className="bg-white text-slate-950 px-5 py-2 rounded-xl font-bold text-[11px] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-lg active:scale-95">
          <Upload size={14} /> IMPORT EXCEL
        </button>
      </div>
    </header>
  );
};

export default Header;