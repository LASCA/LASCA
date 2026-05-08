import React from 'react';
import { 
  Map as MapIcon, 
  Info,
  Database
} from 'lucide-react';

const Traverse = ({ data = [], metrics = {} }) => {
  
  // Helper για μορφοποίηση αριθμών
  const formatVal = (val, decimals = 4) => {
    if (val === "" || val === undefined || val === null) return "-";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6">
      {/* Custom Scrollbar CSS */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #334155;
          }
        `}
      </style>

      {/* ΠΑΝΩ ΜΕΡΟΣ: ΠΙΝΑΚΑΣ (70%) ΚΑΙ ΧΑΡΤΗΣ (30%) */}
      <div className="flex flex-[3] gap-6 min-h-0">
        
        {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ - Κυρίαρχο πλάτος */}
        <div className="flex-[1.5] flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Database size={18} className="text-amber-500" />
              </div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200">Δεδομένα Όδευσης</span>
            </div>
            {data.length > 0 && (
              <span className="text-[9px] text-amber-500/80 font-black bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10 tracking-widest uppercase">
                {data.length} Records Loaded
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] sticky top-0 z-20">
                <tr className="border-b border-slate-800/50">
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest">Station</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Hz [grad]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Slope_D [m]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">X [m]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">Y [m]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {data.length > 0 ? (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="p-4 font-bold text-slate-300 flex items-center gap-3">
                        {/* Ένδειξη εξάρτησης "Σ" */}
                        {row.name?.toString().startsWith('Σ') ? (
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-20" />
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-slate-600 transition-colors" />
                        )}
                        <span className="tracking-tight text-sm">{row.name || "-"}</span>
                      </td>
                      <td className="p-4 font-mono text-amber-400/90 text-center text-sm">{formatVal(row.hz, 4)}</td>
                      <td className="p-4 font-mono text-slate-400 text-center text-sm">{formatVal(row.sd, 3)}</td>
                      <td className="p-4 font-mono text-cyan-400/80 text-right tabular-nums text-sm">{formatVal(row.x, 3)}</td>
                      <td className="p-4 font-mono text-cyan-400/80 text-right tabular-nums text-sm">{formatVal(row.y, 3)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-32 text-center">
                      <div className="bg-slate-900/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                        <Info size={30} className="text-slate-700" />
                      </div>
                      <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Αναμονή για εισαγωγή Excel...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ΠΕΡΙΟΧΗ ΔΙΑΓΡΑΜΜΑΤΟΣ - Πιο συμπαγής χώρος */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <MapIcon size={18} className="text-pink-500" />
            </div>
            <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200">Οπτικοποίηση</span>
          </div>

          <div className="flex-1 bg-[#030712] m-4 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden">
             {/* Grid background effect */}
             <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:30px_30px]"></div>
             <div className="text-center z-10">
                <MapIcon size={32} className="mx-auto mb-3 text-slate-800 group-hover:text-pink-500/40 transition-all duration-700" />
                <p className="text-[8px] tracking-[0.4em] text-slate-700 font-black uppercase">Visual Engine Ready</p>
             </div>
          </div>
        </div>

      </div>

      {/* ΚΑΤΩ ΜΕΡΟΣ: METRICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-24">
        <MetricCard label="Γωνιακό Σφάλμα (fβ)" value={metrics.fb} unit="g" color="text-amber-500" />
        <MetricCard label="Γραμμικό Σφάλμα (W)" value={metrics.w} unit="m" color="text-emerald-500" />
        <MetricCard label="Κλασματική Ακρίβεια" value={metrics.precision ? `1:${metrics.precision}` : null} color="text-cyan-500" />
        <MetricCard label="Μήκος Όδευσης" value={metrics.totalLength} unit="m" color="text-slate-400" />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, unit, color }) => (
  <div className="bg-[#0b1120] border border-slate-800/50 p-5 rounded-2xl shadow-lg hover:border-slate-700 transition-all group flex flex-col justify-center">
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-1 h-3 rounded-full ${color.replace('text', 'bg')} opacity-40`} />
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-mono font-black tracking-tighter ${color} tabular-nums`}>
        {value || "---"}
      </span>
      {value && unit && <span className="text-[10px] font-bold text-slate-600 uppercase">{unit}</span>}
    </div>
  </div>
);

export default Traverse;