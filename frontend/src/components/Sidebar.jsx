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
  Info 
} from 'lucide-react';

import About from './about'; 

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [isTraverseMenuOpen, setIsTraverseMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

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
      {/* Προσθήκη Gradient Background (from-slate-900 to-slate-950) */}
      <aside className={`${isOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 flex flex-col shadow-2xl h-screen transition-all duration-300 relative z-50`}>
        
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
        <div className={`h-[72px] flex items-center ${isOpen ? 'px-6 gap-3' : 'px-0 justify-center'} border-b border-slate-800/80 overflow-hidden shrink-0`}>
          <img 
            src="/LASCA-logo-red-blue-1024.png" 
            alt="LASCA Logo" 
            className="w-14 h-14 shrink-0 object-contain transition-transform duration-300 hover:scale-105"
          />
          {isOpen && (
            <div className="transition-opacity duration-300 animate-in fade-in">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight leading-none">LASCA</h1>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const hasActiveSubItem = item.subItems?.some(sub => sub.id === activeTab);
            const isParentActive = activeTab === item.id || hasActiveSubItem;

            const isThisMenuOpen = 
              (item.id === 'station_measurements' && isStationMenuOpen) || 
              (item.id === 'traverse_menu' && isTraverseMenuOpen);

            return (
              <div key={item.id} className="flex flex-col relative group/menuItem">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`relative w-full flex items-center ${isOpen ? 'px-4 justify-between' : 'justify-center'} py-3 rounded-xl transition-all duration-200 group ${
                    isParentActive 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  {/* "Pill" Active Indicator στα αριστερά */}
                  {isParentActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  )}

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Micro-animation στο εικονίδιο */}
                    <div className="transition-transform duration-200 group-hover:scale-110">
                      {item.icon}
                    </div>
                    {isOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                  </div>
                  
                  {isOpen && item.subItems && (
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform duration-300 ${isThisMenuOpen ? 'rotate-180 text-blue-400' : 'opacity-50 group-hover:opacity-100'}`} 
                    />
                  )}
                  {isOpen && !item.subItems && activeTab === item.id && <ChevronRight size={16} className="opacity-40" />}
                </button>

                {/* Custom Tooltip (Εμφανίζεται ΜΟΝΟ όταν το sidebar είναι κλειστό) */}
                {!isOpen && (
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg opacity-0 invisible group-hover/menuItem:opacity-100 group-hover/menuItem:visible transition-all duration-200 shadow-xl border border-slate-700 whitespace-nowrap z-50">
                    {item.label}
                    {/* Τριγωνάκι (arrow) του tooltip */}
                    <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-slate-800"></div>
                  </div>
                )}

                {item.subItems && isThisMenuOpen && isOpen && (
                  <div className="flex flex-col gap-0.5 pl-9 pr-2 py-2 mt-1 animate-in slide-in-from-top-2 fade-in duration-200 border-l border-slate-800/80 ml-5">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveTab(subItem.id)}
                        className={`w-full flex items-center gap-3 text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 group/sub ${
                          activeTab === subItem.id
                            ? 'bg-blue-500/15 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        }`}
                      >
                        <span className={`transition-transform duration-200 group-hover/sub:scale-110 ${activeTab === subItem.id ? 'text-blue-400' : 'opacity-60'}`}>
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
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-sm overflow-hidden shrink-0 space-y-1 relative">
          
          <button 
            onClick={() => setIsAboutOpen(true)}
            className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all duration-200 group relative`}
          >
            <Info size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-400" />
            {isOpen && <span className="font-medium text-sm whitespace-nowrap">Σχετικά</span>}
            
            {!isOpen && (
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl border border-slate-700 whitespace-nowrap z-50">
                Σχετικά
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-slate-800"></div>
              </div>
            )}
          </button>

          <button 
            className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all duration-200 group relative`}
          >
            <Settings size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-400" />
            {isOpen && <span className="font-medium text-sm whitespace-nowrap">Ρυθμίσεις</span>}

            {!isOpen && (
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl border border-slate-700 whitespace-nowrap z-50">
                Ρυθμίσεις
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-slate-800"></div>
              </div>
            )}
          </button>
        </div>
      </aside>

      <About isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

export default Sidebar;