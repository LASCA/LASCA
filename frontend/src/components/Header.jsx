import React from 'react';
import { Upload } from 'lucide-react';

const Header = ({ activeTab }) => {
  return (
    <header className="h-20 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-10">
      <div>
        <h2 className="text-2xl font-bold text-white capitalize">
          {activeTab === 'dashboard' ? 'Επισκόπηση' : activeTab}
        </h2>
        <p className="text-xs text-slate-500">Project: Survey_2024_01</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right mr-4 border-r border-slate-800 pr-4">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status</p>
           <p className="text-xs text-emerald-500 font-medium flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
             Connected
           </p>
        </div>
        <button className="bg-white text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-lg">
          <Upload size={18} /> Import Master Excel
        </button>
      </div>
    </header>
  );
};

export default Header;