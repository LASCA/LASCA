import React from 'react';
import { 
  Table as TableIcon, 
  Map as MapIcon, 
  Info,
  Database
} from 'lucide-react';

const Traverse = ({ data = [], metrics = {} }) => {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6">
      
      {/* METRICS DASHBOARD - Στο ίδιο στυλ με την κεφαλίδα της συνορθώσης */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Γωνιακό Σφάλμα (fβ)" value={metrics.fb || "---"} unit="g" color="text-amber-500" />
        <MetricCard label="Γραμμικό Σφάλμα (W)" value={metrics.w || "---"} unit="m" color="text-emerald-500" />
        <MetricCard label="Κλασματική Ακρίβεια" value={metrics.precision ? `1:${metrics.precision}` : "---"} color="text-cyan-500" />
        <MetricCard label="Μήκος Όδευσης" value={metrics.totalLength || "---"} unit="m" color="text-slate-300" />
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ - Με την οριοθέτηση και τα ονόματα στηλών της συνορθώσης */}
        <div className="w-[48%] flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Database size={18} className="text-amber-500" />
            </div>
            <span className="font-bold text-sm tracking-widest text-slate-200 uppercase">Πρωτογενή Δεδομένα Όδευσης</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              {/* HEADER ΣΤΗΛΩΝ - Ίδιο στυλ με τη συνορθώση */}
              <thead className="bg-[#0f172a] sticky top-0 z-20">
                <tr className="border-b border-slate-800/50">
                  <th className="p-4 text-xs font-bold text-amber-500 uppercase tracking-tighter">Station</th>
                  <th className="p-4 text-xs font-bold text-amber-500 uppercase tracking-tighter text-center">Hz [grad]</th>
                  <th className="p-4 text-xs font-bold text-amber-500 uppercase tracking-tighter text-center">Slope_D [m]</th>
                  <th className="p-4 text-xs font-bold text-amber-500 uppercase tracking-tighter text-right">X [m]</th>
                  <th className="p-4 text-xs font-bold text-amber-500 uppercase tracking-tighter text-right">Y [m]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {data.length > 0 ? (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-all group">
                      <td className="p-4 font-bold text-slate-300 flex items-center gap-2">
                        {row.name?.startsWith('Σ') && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />}
                        {row.name || "-"}
                      </td>
                      <td className="p-4 font-mono text-amber-400/80 text-center">{row.hz || "-"}</td>
                      <td className="p-4 font-mono text-slate-400 text-center">{row.sd || "-"}</td>
                      <td className="p-4 font-mono text-cyan-400/70 text-right tabular-nums">{row.x || "-"}</td>
                      <td className="p-4 font-mono text-cyan-400/70 text-right tabular-nums">{row.y || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <Info size={40} className="mx-auto mb-4 text-slate-700" />
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em]">Αναμονή για εισαγωγή Excel...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ΠΕΡΙΟΧΗ ΔΙΑΓΡΑΜΜΑΤΟΣ */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <MapIcon size={18} className="text-pink-500" />
              </div>
              <span className="font-bold text-sm tracking-widest text-slate-200 uppercase">Οπτικοποίηση Όδευσης</span>
            </div>
          </div>

          <div className="flex-1 bg-[#030712] m-6 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden">
             {/* Εδώ θα εμφανίζεται το διάγραμμα */}
             <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
             <div className="text-center z-10">
                <MapIcon size={48} className="mx-auto mb-4 text-slate-800 group-hover:text-pink-500/50 transition-all duration-700" />
                <p className="text-[10px] tracking-[0.4em] text-slate-600 font-black uppercase">Visual Engine Ready</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper component για τα Metrics
const MetricCard = ({ label, value, unit, color }) => (
  <div className="bg-[#0b1120] border border-slate-800/50 p-5 rounded-2xl shadow-lg hover:border-slate-700 transition-all group">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-1 h-3 rounded-full ${color.replace('text', 'bg')} opacity-50`} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-2xl font-mono font-black tracking-tighter ${color} tabular-nums`}>{value}</span>
      {unit && <span className="text-xs font-bold text-slate-600 uppercase">{unit}</span>}
    </div>
  </div>
);

export default Traverse;