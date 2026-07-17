import React from 'react';

const Header = ({ activeTab }) => {
  // Δυναμικές ρυθμίσεις για κάθε καρτέλα (χρώματα, τίτλοι και κεντρικά δεδομένα)
  const getHeaderConfig = () => {
    switch(activeTab) {
      case 'dashboard':
        return { 
          code: "SYS-DRV-01", 
          label: "PROJECT_SETUP",
          accentLine: "border-blue-500",
          textAccent: "text-blue-500",
          bgAccent: "bg-blue-500",
          stats: [
            { label: "WORKSPACE", value: "LOCAL_DRIVE", valColor: "text-slate-300" },
            { label: "COORD_SYS", value: "EPSG:2100", valColor: "text-blue-400" },
            { label: "DATA_NODES", value: "STANDBY", valColor: "text-emerald-500" }
          ]
        };

      case 'goniometry': 
        return { 
          label: "Angle Measurements",
          accentLine: "border-cyan-500",
          textAccent: "text-cyan-500",
          bgAccent: "bg-cyan-500",
          stats: [
            { label: "SUBJECT", value: "TOPO I/ΙΙ, RYMOTOMIKA, ASKISEIS YPAITHROU ", valColor: "text-cyan-400" }
          ]
        };

      case 'adjustment':
        return { 
          code: "", 
          label: "Station Adjustment",
          accentLine: "border-emerald-500",
          textAccent: "text-emerald-500",
          bgAccent: "bg-emerald-500",
          stats: [
            { label: "SUBJECT", value: "ASKISEIS YPAITHROU", valColor: "text-cyan-400" },
            { label: "ALGORITHM", value: "LEAST_SQ", valColor: "text-emerald-400" },
          ]
        };

      case 'trig_leveling': 
        return { 
          label: "Trigonometric Leveling",
          accentLine: "border-cyan-500",
          textAccent: "text-cyan-500",
          bgAccent: "bg-cyan-500",
          stats: [
            { label: "SUBJECT", value: "TOPO ΙΙ, RYMOTOMIKA, ASKISEIS YPAITHROU ", valColor: "text-cyan-400" }
          ]
        };

      case 'geom_leveling': 
        return { 
          label: "Spirit Leveling",
          accentLine: "border-cyan-500",
          textAccent: "text-cyan-500",
          bgAccent: "bg-cyan-500",
          stats: [
            { label: "SUBJECT", value: "TOPO I/ΙΙ, RYMOTOMIKA, ASKISEIS YPAITHROU ", valColor: "text-cyan-400" },
          ]
        };

      case 'traverse':
        return { 
          code: "", 
          label: "Traverse",
          accentLine: "border-amber-500",
          textAccent: "text-amber-500",
          bgAccent: "bg-amber-500",
          stats: [
            { label: "SUBJECT", value: "TOPO ΙΙ, RYMOTOMIKA, ASKISEIS YPAITHROU ", valColor: "text-cyan-400" }
          ] 
        };

      case 'tachymetry':
        return { 
          code: "", 
          label: "Tachymetry",
          accentLine: "border-pink-500",
          textAccent: "text-pink-500",
          bgAccent: "bg-pink-500",
          stats: [
            { label: "SUBJECT", value: "TOPO ΙΙ, RYMOTOMIKA, ASKISEIS YPAITHROU ", valColor: "text-cyan-400" }
          ] 
        };

      case 'stakeout':
        return { 
          code: "", 
          label: "Stakeout",
          accentLine: "border-emerald-500",
          textAccent: "text-emerald-500",
          bgAccent: "bg-emerald-500",
          stats: [
            { label: "SUBJECT", value: "ASKISEIS YPAITHROU", valColor: "text-cyan-400" }
          ]
        };

        case 'basic_calc':
        return { 
          code: "", 
          label: "Basic Calculations",
          accentLine: "border-emerald-500",
          textAccent: "text-emerald-500",
          bgAccent: "bg-emerald-500",
          stats: [
            { label: "SUBJECT", value: "TOPO I/II", valColor: "text-cyan-400" }
          ]
        };
      
      default:
        return { 
          code: "CORE-V2", 
          label: activeTab.toUpperCase(),
          accentLine: "border-blue-500",
          textAccent: "text-blue-500",
          bgAccent: "bg-blue-500",
          stats: [
            { label: "MODULE", value: "ACTIVE", valColor: "text-slate-300" },
            { label: "STATE", value: "NOMINAL", valColor: "text-blue-400" }
          ]
        };
    }
  };

  const config = getHeaderConfig();

  return (
    <header className="relative h-20 bg-[#020617] border-b border-slate-800/80 flex items-center justify-between px-8 overflow-hidden transition-colors duration-500">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity duration-500" 
           style={{ backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`, size: '20px 20px' }} />

      {/* LEFT SECTION: BRANDING & IDENTIFIER */}
      <div className="flex items-center gap-6 z-10 w-1/4">
        <div className={`flex flex-col border-l-2 pl-4 transition-colors duration-300 ${config.accentLine}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-mono font-bold tracking-[0.3em] transition-colors duration-300 ${config.textAccent} opacity-70`}>
              {config.code}
            </span>
            <div className={`h-[1px] w-8 opacity-30 transition-colors duration-300 ${config.bgAccent}`} />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tighter font-mono italic">
            {config.label}<span className={`animate-pulse ${config.textAccent}`}>_</span>
          </h1>
        </div>
      </div>

      {/* CENTER: CONTEXTUAL DATA */}
      <div className="hidden md:flex items-center justify-center gap-12 font-mono text-[10px] text-slate-500 font-bold tracking-widest z-10">
        {config.stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-slate-600 mb-1">{stat.label}</span>
            <span className={stat.valColor}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* RIGHT PLACEHOLDER: Κρατάει τα κεντρικά δεδομένα απόλυτα ευθυγραμμισμένα στη μέση */}
      <div className="w-1/4 hidden md:block z-10" />
    </header>
  );
};

export default Header;