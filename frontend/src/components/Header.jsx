import React from 'react';

const Header = ({ activeTab }) => {
  // Δυναμικές ρυθμίσεις για κάθε καρτέλα (χρώματα, τίτλοι, κεντρικά δεδομένα και status)
  const getHeaderConfig = () => {
    switch(activeTab) {
      case 'dashboard':
        return { 
          code: "SYS-DRV-01", 
          label: "PROJECT_SETUP",
          color: "blue",
          accentLine: "border-blue-500",
          textAccent: "text-blue-500",
          bgAccent: "bg-blue-500",
          bgAccentSubtle: "bg-blue-500/5 border-blue-500/20",
          stats: [
            { label: "WORKSPACE", value: "LOCAL_DRIVE", valColor: "text-slate-300" },
            { label: "COORD_SYS", value: "EPSG:2100", valColor: "text-blue-400" },
            { label: "DATA_NODES", value: "STANDBY", valColor: "text-emerald-500" }
          ],
          statusText: "SYSTEM_ONLINE"
        };
      case 'adjustment':
        return { 
          code: "CALC-ENG-04", 
          label: "STATION_ADJUSTMENT",
          color: "emerald",
          accentLine: "border-emerald-500",
          textAccent: "text-emerald-500",
          bgAccent: "bg-emerald-500",
          bgAccentSubtle: "bg-emerald-500/5 border-emerald-500/20",
          stats: [
            { label: "ALGORITHM", value: "LEAST_SQ", valColor: "text-emerald-400" },
            { label: "TOLERANCE", value: "0.1mm", valColor: "text-slate-300" },
            { label: "ITERATIONS", value: "MAX_10", valColor: "text-amber-500" }
          ],
          statusText: "ENGINE_READY"
        };
      case 'traverse':
        return { 
          code: "GEO-TRV-07", 
          label: "TRAVERSE_NETWORK",
          color: "amber",
          accentLine: "border-amber-500",
          textAccent: "text-amber-500",
          bgAccent: "bg-amber-500",
          bgAccentSubtle: "bg-amber-500/5 border-amber-500/20",
          stats: [
            { label: "NET_TYPE", value: "CLOSED", valColor: "text-amber-400" },
            { label: "STATIONS", value: "AWAITING", valColor: "text-slate-300" },
            { label: "CLOSURE_ERR", value: "N/A", valColor: "text-slate-500" }
          ],
          statusText: "AWAITING_NODES"
        };
      default:
        return { 
          code: "CORE-V2", 
          label: activeTab.toUpperCase(),
          color: "blue",
          accentLine: "border-blue-500",
          textAccent: "text-blue-500",
          bgAccent: "bg-blue-500",
          bgAccentSubtle: "bg-blue-500/5 border-blue-500/20",
          stats: [
            { label: "MODULE", value: "ACTIVE", valColor: "text-slate-300" },
            { label: "STATE", value: "NOMINAL", valColor: "text-blue-400" }
          ],
          statusText: "STABLE_CONNECTION"
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
      <div className="flex items-center gap-6 z-10">
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

      {/* CENTER: CONTEXTUAL DATA (Αντικατέστησε τα περιττά στατιστικά) */}
      <div className="hidden md:flex items-center gap-12 font-mono text-[10px] text-slate-500 font-bold tracking-widest">
        {config.stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-slate-600 mb-1">{stat.label}</span>
            <span className={stat.valColor}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* RIGHT SECTION: SYSTEM STATUS */}
      <div className="flex items-center gap-4 z-10">
        <div className="flex flex-col items-end mr-4">
          <span className="text-[9px] font-mono font-black text-slate-500 tracking-widest uppercase">
            Instance ID
          </span>
          <span className={`text-[11px] font-bold italic transition-colors duration-300 ${config.textAccent}`}>
            SURVEY_2024_01
          </span>
        </div>
        
        {/* Terminal-style status block */}
        <div className={`flex items-center gap-3 border px-4 py-2 rounded-sm skew-x-[-10deg] transition-all duration-300 ${config.bgAccentSubtle}`}>
          <div className="flex gap-1 skew-x-[10deg]">
             <div className={`w-1 h-3 animate-pulse opacity-40 ${config.bgAccent}`} />
             <div className={`w-1 h-3 ${config.bgAccent}`} />
          </div>
          <span className="text-[10px] font-black text-slate-200 tracking-widest skew-x-[10deg]">
            {config.statusText}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;