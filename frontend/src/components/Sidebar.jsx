import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Compass, 
  Map as MapIcon, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Settings, 
  Layers, 
  Calculator, 
  Crosshair 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  // State για τον έλεγχο των dropdown μενού
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [isTraverseMenuOpen, setIsTraverseMenuOpen] = useState(false);

  // Δομή μενού
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    
    { 
      id: 'station_measurements', 
      label: 'Μετρήσεις Σταθμού', 
      icon: <Target size={20} />,
      subItems: [
        { id: 'goniometry', label: 'Γωνιομετρήσεις' },
        { id: 'adjustment', label: 'Συνόρθωση Σταθμού' },
        { id: 'trig_leveling', label: 'Τριγωνομετρική Υψομετρία' },
        { id: 'geom_leveling', label: 'Γεωμετρική Χωροστάθμηση' }
      ]
    },
    
    { id: 'basic_calc', label: 'Βασικοί Υπολογισμοί', icon: <Calculator size={20} /> },
    
    { 
      id: 'traverse_menu', 
      label: 'Όδευση', 
      icon: <Compass size={20} />,
      subItems: [
        { id: 'traverse', label: 'Οριζοντιογραφία (X,Y)' },
        { id: 'traverse_height', label: 'Υψομετρία (H)' }
      ]
    },
    
    { id: 'tachymetry', label: 'Ταχυμετρία', icon: <MapIcon size={20} /> },
    { id: 'stakeout', label: 'Χάραξη', icon: <Layers size={20} /> },
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
    <aside className={`${isOpen ? 'w-72' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl h-screen transition-all duration-300 relative`}>
      
      {/* Τοπογραφικό Toggle Button - Total Station Reticle Style */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-[22px] bg-[#090d16] hover:bg-slate-800 text-cyan-500 hover:text-cyan-400 rounded-lg w-7 h-7 border border-cyan-500/40 hover:border-cyan-400 z-[100] transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.45)] flex items-center justify-center group"
        title={isOpen ? "Σύμπτυξη Sidebar" : "Επέκταση Sidebar"}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Περιστρεφόμενο Σταυρόνημα στο background */}
          <Crosshair size={18} className="absolute opacity-60 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500 text-cyan-400" />
          
          {/* Βέλος Κατεύθυνσης */}
          {isOpen ? (
            <ChevronLeft size={11} className="relative z-10 text-slate-100 group-hover:-translate-x-0.5 transition-transform stroke-[3]" />
          ) : (
            <ChevronRight size={11} className="relative z-10 text-slate-100 group-hover:translate-x-0.5 transition-transform stroke-[3]" />
          )}
        </div>
      </button>

      {/* Header Sidebar - Ευθυγραμμισμένο ακριβώς στα 72px */}
      <div className={`h-[72px] px-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'} border-b border-slate-800 overflow-hidden shrink-0`}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
          <Compass size={24} />
        </div>
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

              {/* Dropdown Υπο-κατηγορίες */}
              {item.subItems && isThisMenuOpen && isOpen && (
                <div className="flex flex-col gap-1 pl-11 pr-2 py-1 mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveTab(subItem.id)}
                      className={`text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                        activeTab === subItem.id
                          ? 'bg-blue-600/20 text-blue-300 font-medium'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
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
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 overflow-hidden shrink-0">
        <button className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-3 text-slate-500 hover:text-white transition-colors`}>
          <Settings size={20} className="shrink-0" />
          {isOpen && <span className="font-medium text-sm whitespace-nowrap">Ρυθμίσεις</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;