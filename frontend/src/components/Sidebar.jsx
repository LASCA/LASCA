import React, { useState } from 'react';
import { LayoutDashboard, Target, Compass, Map as MapIcon, ChevronRight, ChevronLeft, Settings, Layers, ChevronDown, Calculator } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  // State για να ελέγχουμε ποια dropdown είναι ανοιχτά
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [isTraverseMenuOpen, setIsTraverseMenuOpen] = useState(false);

  // Ανανεωμένη δομή μενού
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
    
    // Νέα μορφή της Όδευσης με υποκαρτέλες
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
      // Αν το sidebar είναι κλειστό, το ανοίγουμε αυτόματα
      if (!isOpen) setIsOpen(true);
      
      // Ανοιγοκλείνουμε το αντίστοιχο dropdown
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
      
      {/* Κουμπί Toggle για άνοιγμα/κλείσιμο */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute -right-3 top-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1 border-2 border-slate-950 z-[100] transition-transform duration-300 shadow-lg ${!isOpen ? 'rotate-0' : ''}`}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Header Sidebar */}
      <div className={`h-20 px-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'} border-b border-slate-800/80 overflow-hidden`}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
          <Compass size={24} />
        </div>
        {isOpen && (
          <div className="transition-opacity duration-300">
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">LASCA</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-1">Land Surveying Computations App</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {menuItems.map((item) => {
          // Ελέγχουμε αν κάποιο από τα subItems είναι το activeTab για να κρατήσουμε το parent "αναμμένο"
          const hasActiveSubItem = item.subItems?.some(sub => sub.id === activeTab);
          const isParentActive = activeTab === item.id || hasActiveSubItem;

          // Ελέγχουμε αν το συγκεκριμένο dropdown είναι ανοιχτό
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
                
                {/* Εικονίδιο για Dropdown ή απλό βέλος */}
                {isOpen && item.subItems && (
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-300 ${isThisMenuOpen ? 'rotate-180 text-blue-400' : 'opacity-50'}`} 
                  />
                )}
                {isOpen && !item.subItems && activeTab === item.id && <ChevronRight size={16} className="opacity-50" />}
              </button>

              {/* Sub-Items (Dropdown) */}
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
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 overflow-hidden">
        <button className={`w-full flex items-center ${isOpen ? 'px-4 gap-3' : 'justify-center'} py-3 text-slate-500 hover:text-white transition-colors`}>
          <Settings size={20} className="shrink-0" />
          {isOpen && <span className="font-medium text-sm whitespace-nowrap">Ρυθμίσεις</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;