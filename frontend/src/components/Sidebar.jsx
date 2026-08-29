import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Telescope, 
  DraftingCompass, 
  GitBranch, 
  TriangleRight, 
  Ruler, 
  Calculator, 
  Route, 
  Axis3d, 
  TrendingUp, 
  Spline, 
  Flag, 
  Crosshair,
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Settings,
  Info // <--- 1. Νέο Import
} from 'lucide-react';

import About from './about'; 

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [isTraverseMenuOpen, setIsTraverseMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false); // <--- 3. State για το About Modal

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    
    { 
      id: 'station_measurements', 
      label: 'Μετρήσεις Σταθμού', 
      icon: <Telescope size={20} />,
      subItems: [
        { id: 'goniometry', label: 'Γωνιομετρήσεις', icon: <DraftingCompass size={16} /> },
        { id: 'adjustment', label: 'Συνόρθωση Σταθμού', icon: <GitBranch size={16} /> },
        { id: 'trig_leveling', label: 'Τριγωνομετρική Υψομετρία', icon: <TriangleRight size={16} /> },
        { id: 'geom_leveling', label: 'Γεωμετρική Χωροστάθμηση', icon: <Ruler size={16} /> }
      ]
    },
    
    { id: 'basic_calc', label: 'Βασικοί Υπολογισμοί', icon: <Calculator size={20} /> },
    
    { 
      id: 'traverse_menu', 
      label: 'Όδευση', 
      icon: <Route size={20} />,
      subItems: [
        { id: 'traverse', label: 'Οριζοντιογραφία (X,Y)', icon: <Axis3d size={16} /> },
        { id: 'traverse_height', label: 'Υψομετρία (H)', icon: <TrendingUp size={16} /> }
      ]
    },
    
    { id: 'tachymetry', label: 'Ταχυμετρία', icon: <Spline size={20} /> },
    { id: 'stakeout', label: 'Χάραξη', icon: <Flag size={20} /> },
  ];

  const handleItemClick = (item) => {
    if (item.subItems) {
      if (!isOpen) setIsOpen(true);
      
      if (item.id === 'station_measurements') {
        setIsStationMenuOpen(!isStationMenuOpen);
      } else if (item.id === 'traverse_menu') {
        setIsTraverseMenuOpen(!isTraverseMenuOpen);
      }
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <>
      <aside className={`${isOpen ? 'w-72' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl h-screen transition-all duration-300 relative`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3.5 top-[22px] bg-slate-900 hover:bg-slate-800 rounded-lg w-7 h-7 border border-slate-700 hover:border-blue-500/50 z-[100] transition-all duration-300 shadow-sm hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] flex items-center justify-center group"
          title={isOpen ? "Σύμπτυξη Sidebar" : "Επέκταση Sidebar"}
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <Crosshair size={18} className="absolute opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500 text-slate-400 group-hover:text-blue-400" />
            
            {isOpen ? (
              <ChevronLeft size={11} className="relative z-10 text-slate-300 group-hover:text-white group-hover:-translate-x-0.5 transition-all stroke-[3]" />
            ) : (
              <ChevronRight size={11} className="relative z-10 text-slate-300 group-hover:text-white group-hover:translate-x-0.5 transition-all stroke-[3]" />
            )}
          </div>
        </button>

        {/* Header Sidebar */}
        <div className={`h-[72px] flex items-center ${isOpen ? 'px-6 gap-3' : 'px-0 justify-center'} border-b border-slate-800 overflow-hidden shrink-0`}>
          <img 
            src="/LASCA-logo-red-blue-1024.png" 
            alt="" 
            className="w-14 h-14 shrink-0 object-contain transition-all duration-300"
          />

          {isOpen && (
            <div className="transition-opacity duration-300">
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">LASCA</h1>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const hasActiveSubItem = item.subItems?.some(sub => sub.id === activeTab);
            const isParentActive = activeTab === item.id || hasActiveSubItem;

            const isThisMenuOpen = 
              (item.id === 'station_measurements' && isStationMenuOpen) || 
              (item.id === 'traverse_menu' && isTraverseMenuOpen);

            return (
              <div key={item.id} className="flex flex-col gap-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center ${isOpen ? 'px-4 justify-between' : 'justify-center'} py-3 rounded-xl transition-all ${
                    isParentActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    {item.icon}
                    {isOpen && <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>}
                  </div>
                  
                  {isOpen && item.subItems && (
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform duration-300 ${isThisMenuOpen ? 'rotate-180 text-blue-400' : 'opacity-50'}`} 
                    />
                  )}
                  {isOpen && !item.subItems && activeTab === item.id && <ChevronRight size={16} className="opacity-50" />}
                </button>

                {item.subItems && isThisMenuOpen && isOpen && (
                  <div className="flex flex-col gap-1 pl-10 pr-2 py-1 mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveTab(subItem.id)}
                        className={`w-full flex items-center gap-2.5 text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                          activeTab === subItem.id
                            ? 'bg-blue-600/20 text-blue-300 font-medium'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className={`${activeTab === subItem.id ? 'text-blue-400' : 'opacity-60'}`}>
                          {subItem.icon}
                        </span>
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 overflow-hidden shrink-0 space-y-1">
          
          {/* 4. Κουμπί About (Σχετικά) */}
          <button 
            onClick={() => setIsAboutOpen(true)}
            className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors group`}
            title={!isOpen ? "Σχετικά" : undefined}
          >
            <Info size={20} className="shrink-0 text-slate-400 group-hover:text-blue-400 transition-colors" />
            {isOpen && <span className="font-medium text-sm whitespace-nowrap">Σχετικά</span>}
          </button>

          {/* Κουμπί Ρυθμίσεων */}
          <button 
            className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors`}
            title={!isOpen ? "Ρυθμίσεις" : undefined}
          >
            <Settings size={20} className="shrink-0" />
            {isOpen && <span className="font-medium text-sm whitespace-nowrap">Ρυθμίσεις</span>}
          </button>
        </div>
      </aside>

      {/* 5. Το Modal Παράθυρο */}
      <About isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

export default Sidebar;