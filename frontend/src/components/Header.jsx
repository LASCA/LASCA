import React from 'react';
import { Activity } from 'lucide-react'; // Κρατάμε μόνο αυτό για το default case

// Κάνουμε import τα custom εικονίδια
import {
  DashboardIcon,
  GoniometriseisIcon,
  SynorthosiStathmouIcon,
  TrigonometrikiYpsometriaIcon,
  GeometrikiChorostathmisiIcon,
  OrizontiografiaXYIcon,
  YpsometriaHIcon,
  TachymetriaIcon,
  CharaxiIcon,
  VasikoiYpologismoiIcon
} from './icons';

const Header = ({ activeTab }) => {
  // Ενημερωμένο configuration με τα νέα custom εικονίδια
  const getHeaderConfig = () => {
    switch(activeTab) {
      case 'dashboard': 
        return { icon: DashboardIcon, label: "Project Setup", color: "blue" };
      case 'goniometry': 
        return { icon: GoniometriseisIcon, label: "Γωνιομετρήσεις", color: "cyan" };
      case 'adjustment': 
        return { icon: SynorthosiStathmouIcon, label: "Συνόρθωση Σταθμού", color: "emerald" };
      case 'trig_leveling': 
        return { icon: TrigonometrikiYpsometriaIcon, label: "Τριγωνομετρική Υψομετρία", color: "indigo" };
      case 'geom_leveling': 
        return { icon: GeometrikiChorostathmisiIcon, label: "Γεωμετρική Χωροστάθμηση", color: "purple" };
      case 'traverse': 
        return { icon: OrizontiografiaXYIcon, label: "Οριζοντιογραφία Όδευσης", color: "amber" };
      case 'traverse_height': 
        return { icon: YpsometriaHIcon, label: "Υψομετρία Όδευσης", color: "orange" };
      case 'tachymetry': 
        return { icon: TachymetriaIcon, label: "Ταχυμετρία", color: "pink" };
      case 'stakeout': 
        return { icon: CharaxiIcon, label: "Χάραξη", color: "emerald" };
      case 'basic_calc': 
        return { icon: VasikoiYpologismoiIcon, label: "Βασικοί Υπολογισμοί", color: "blue" };
      default: 
        return { icon: Activity, label: activeTab ? activeTab.replace('_', ' ').toUpperCase() : "MODULE", color: "slate" };
    }
  };

  const config = getHeaderConfig();
  const Icon = config.icon;

  // Λεξικό χρωμάτων για το premium styling
  const colorMaps = {
    blue: { bgActive: "bg-blue-500", iconBg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
    cyan: { bgActive: "bg-cyan-500", iconBg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]" },
    emerald: { bgActive: "bg-emerald-500", iconBg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]" },
    amber: { bgActive: "bg-amber-500", iconBg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]" },
    orange: { bgActive: "bg-orange-500", iconBg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]" },
    pink: { bgActive: "bg-pink-500", iconBg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", glow: "shadow-[0_0_20px_rgba(236,72,153,0.15)]" },
    indigo: { bgActive: "bg-indigo-500", iconBg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]" },
    purple: { bgActive: "bg-purple-500", iconBg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]" },
    slate: { bgActive: "bg-slate-500", iconBg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", glow: "shadow-[0_0_20px_rgba(100,116,139,0.15)]" },
  };

  const theme = colorMaps[config.color] || colorMaps.slate;

  return (
    <header className="h-[72px] bg-[#0b1120] border-b border-slate-800 px-6 flex items-center justify-between shrink-0 relative z-20">
      
      {/* Διακριτικό Background Pattern (CAD Style) */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`, backgroundSize: '16px 16px' }} 
      />

      {/* ΑΡΙΣΤΕΡΟ ΚΟΜΜΑΤΙ: Branding & Active Module (Premium Style) */}
      <div className="flex items-center gap-4 z-10">
        
        {/* Glassmorphism Icon Container - Προστέθηκε το ${theme.text} στο div */}
        <div className={`p-2.5 rounded-lg border backdrop-blur-sm transition-all duration-500 ${theme.iconBg} ${theme.border} ${theme.glow} ${theme.text}`}>
          {/* Προστέθηκε color="currentColor" για να παίρνει το χρώμα από το div */}
          <Icon className={theme.text} color="currentColor" size={20} strokeWidth={2} />
        </div>
        
        <div className="flex flex-col justify-center gap-1">
          {/* Top Row: Suite Name + Status Dot */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${theme.bgActive} shadow-[0_0_8px_currentColor] animate-pulse`} />
            <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold leading-none">
              LASCA Geodetic Suite
            </span>
          </div>
          
          {/* Bottom Row: Clean Module Title */}
          <h1 className="text-xl font-bold text-slate-100 tracking-tight leading-none drop-shadow-sm">
            {config.label}
          </h1>
        </div>

      </div>

    </header>
  );
};

export default Header;