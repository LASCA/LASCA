import React from 'react';
import { LayoutDashboard, Target, Compass, Map as MapIcon, ChevronRight, Settings } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'adjustment', label: 'Συνόρθωση', icon: <Target size={20} /> },
    { id: 'traverse', label: 'Όδευση', icon: <Compass size={20} /> },
    { id: 'mapping', label: 'Ταχυμετρία', icon: <MapIcon size={20} /> },
  ];

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Compass size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">LASCA</h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">v2.0 PRO</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight size={16} />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white transition-colors">
          <Settings size={20} />
          <span className="font-medium text-sm">Ρυθμίσεις</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;