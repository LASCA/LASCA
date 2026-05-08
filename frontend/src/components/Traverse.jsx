import React from 'react';
import { 
  Map as MapIcon, 
  Info, 
  Database, 
  Activity, 
  Target, 
  Ruler,
  Settings2
} from 'lucide-react';

const Traverse = ({ data = [], metrics = {} }) => {
  
  const formatVal = (val, decimals = 4) => {
    if (val === "" || val === undefined || val === null) return "-";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6 overflow-hidden">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
          select { appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 0.8em; }
        `}
      </style>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ */}
        <div className="flex-[1.6] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          
          {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ */}
          <div className="flex-none min-h-[550px] flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Database size={18} className="text-amber-500" />
                  </div>
                  <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200 uppercase">Δεδομένα Όδευσης</span>
                </div>

                {/* --- ΝΕΕΣ ΕΠΙΛΟΓΕΣ ΠΑΡΑΜΕΤΡΩΝ --- */}
                <div className="flex items-center gap-6 border-l border-slate-800 pl-8">
                   <div className="flex flex-col gap-1">
                     <label className="text-[7px] font-black text-slate-500 tracking-widest">Τάξη</label>
                     <select className="bg-slate-900/50 border border-slate-800 text-[10px] text-slate-300 rounded px-2 pr-6 py-1 outline-none focus:border-amber-500/30 transition-all cursor-pointer font-mono">
                       <option>Ι</option>
                       <option>ΙΙ</option>
                     </select>
                   </div>

                   <div className="flex flex-col gap-1">
                     <label className="text-[7px] font-black text-slate-500 tracking-widest">Έδαφος</label>
                     <select className="bg-slate-900/50 border border-slate-800 text-[10px] text-slate-300 rounded px-2 pr-6 py-1 outline-none focus:border-amber-500/30 transition-all cursor-pointer font-mono">
                       <option>Ομαλό</option>
                       <option>Κεκλιμένο</option>
                     </select>
                   </div>

                   <div className="flex flex-col gap-1">
                     <label className="text-[7px] font-black text-slate-500 tracking-widest">Κλίμακα</label>
                     <select className="bg-slate-900/50 border border-slate-800 text-[10px] text-slate-300 rounded px-2 pr-6 py-1 outline-none focus:border-amber-500/30 transition-all cursor-pointer font-mono">
                       <option>1:200</option>
                       <option>1:500</option>
                       <option>1:1000</option>
                       <option>1:2000</option>
                     </select>
                   </div>
                </div>
              </div>

              <span className="text-[9px] text-amber-500/80 font-black bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10 tracking-widest uppercase">
                {data.length} Στάσεις
              </span>
            </div>

            <div className="flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                  <tr className="border-b border-slate-800/50">
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest uppercase">Station</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center uppercase">Hz [grad]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center uppercase">Slope_D [m]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right uppercase">X [m]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right uppercase">Y [m]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {data.length > 0 ? (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="p-4 font-bold text-slate-300 flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${row.name?.toString().startsWith('Σ') ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse' : 'bg-slate-800 group-hover:bg-slate-600'}`} />
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
                      <td colSpan="5" className="p-24 text-center">
                        <Info size={30} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Αναμονή Δεδομένων</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ΓΕΩΔΑΙΤΙΚΟΙ ΕΛΕΓΧΟΙ */}
          <div className="flex-none bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-800/50 pb-3">
              <Activity size={16} className="text-cyan-500" />
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Γεωδαιτικοί Έλεγχοι & Σφάλματα</span>
            </div>
            
            <div className="flex flex-row gap-4 items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <CompactStat label="Κορυφές (n)" value={data.length} icon={<Target size={12}/>} color="text-slate-200" />
                  <CompactStat label="Μήκος (L)" value={metrics.totalLength} unit="m" icon={<Ruler size={12}/>} color="text-slate-200" />
                </div>
                <DetailedAngleGroup 
                  title="Γωνιακό Σφάλμα (Wβ)"
                  target={metrics.gTarget} actual={metrics.gActual} error={metrics.fb} wbi={metrics.wbi}
                  labels={["G (πρέπει)", "G (είναι)", "Wβ", "Wβi"]}
                />
              </div>

              <div className="flex-1">
                <DetailedLinearGroup 
                  title="Γραμμική ανάλυση"
                  xTarget={metrics.dxTarget} xActual={metrics.dxActual} xError={metrics.dx}
                  yTarget={metrics.dyTarget} yActual={metrics.dyActual} yError={metrics.dy}
                  ds={metrics.w}
                  labels={["ΔX (πρέπει)", "ΔX (είναι)", "δx", "ΔY (πρέπει)", "ΔY (είναι)", "δy", "δs (W)"]}
                />
              </div>
            </div>

            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
               <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-1">
                   <span className="text-[8px] text-slate-500 font-black tracking-tighter uppercase">Μέγιστο Γωνιακό (Wβ Max)</span>
                   <span className="text-xs font-mono font-bold text-amber-500">{metrics.Wb_max || "---"} grad</span>
                 </div>
                 <div className="flex flex-col gap-1 border-l border-slate-800/50 px-6">
                   <span className="text-[8px] text-slate-500 font-black tracking-tighter uppercase">Μέγιστο Γραμμικό (δs Max)</span>
                   <span className="text-xs font-mono font-bold text-emerald-500">{metrics.ds_max || "---"} m</span>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="h-4 flex-none" />
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: ΟΠΤΙΚΟΠΟΙΗΣΗ */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <MapIcon size={18} className="text-pink-500" />
              </div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200 uppercase">Οπτικοποίηση</span>
            </div>
          </div>
          
          <div className="flex-1 bg-[#030712] m-4 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:30px_30px]"></div>
              <div className="text-center z-10">
                 <MapIcon size={32} className="mx-auto mb-3 text-slate-800 group-hover:text-pink-500/40 transition-all duration-700" />
                 <p className="text-[8px] tracking-[0.4em] text-slate-700 font-black uppercase">Visual Engine Ready</p>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Sub-Components ---
const CompactStat = ({ label, value, unit, icon, color }) => (
  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
    <div className="text-slate-500">{icon}</div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">{label}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>{value || "0"}{unit}</span>
    </div>
  </div>
);

const DetailedAngleGroup = ({ title, target, actual, error, wbi, labels }) => (
  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2">
    <span className="text-[9px] font-bold text-slate-500 italic border-b border-slate-800 pb-1 uppercase">{title}</span>
    <div className="grid grid-cols-2 gap-2 text-center border-b border-slate-800/30 pb-2">
      <div className="flex flex-col"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[0]}</span><span className="text-[10px] font-mono text-slate-300">{target || "---"}</span></div>
      <div className="flex flex-col border-l border-slate-800/50"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[1]}</span><span className="text-[10px] font-mono text-slate-300">{actual || "---"}</span></div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-center pt-1">
      <div className="flex justify-between items-center px-4"><span className="text-[7px] text-amber-500/70 font-black uppercase">{labels[2]}</span><span className="text-[10px] font-mono text-amber-500 font-bold">{error || "---"}</span></div>
      <div className="flex justify-between items-center px-4 border-l border-slate-800/50"><span className="text-[7px] text-amber-500/70 font-black uppercase">{labels[3]}</span><span className="text-[10px] font-mono text-amber-500/90">{wbi || "---"}</span></div>
    </div>
  </div>
);

const DetailedLinearGroup = ({ title, xTarget, xActual, xError, yTarget, yActual, yError, ds, labels }) => (
  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2 h-full">
    <span className="text-[9px] font-bold text-slate-500 italic border-b border-slate-800 pb-1 uppercase">{title}</span>
    <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-800/30 pb-2">
      <div className="flex flex-col"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[0]}</span><span className="text-[10px] font-mono text-slate-300">{xTarget || "---"}</span></div>
      <div className="flex flex-col border-x border-slate-800/50"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[1]}</span><span className="text-[10px] font-mono text-slate-300">{xActual || "---"}</span></div>
      <div className="flex flex-col"><span className="text-[7px] text-amber-500/70 font-black uppercase">{labels[2]}</span><span className="text-[10px] font-mono text-amber-500 font-bold">{xError || "---"}</span></div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-800/30 pb-2">
      <div className="flex flex-col"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[3]}</span><span className="text-[10px] font-mono text-slate-300">{yTarget || "---"}</span></div>
      <div className="flex flex-col border-x border-slate-800/50"><span className="text-[7px] text-slate-600 font-black uppercase">{labels[4]}</span><span className="text-[10px] font-mono text-slate-300">{yActual || "---"}</span></div>
      <div className="flex flex-col"><span className="text-[7px] text-amber-500/70 font-black uppercase">{labels[5]}</span><span className="text-[10px] font-mono text-amber-500 font-bold">{yError || "---"}</span></div>
    </div>
    <div className="flex justify-between items-center px-4 mt-auto">
      <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">{labels[6]}</span>
      <span className="text-[11px] font-mono font-black text-emerald-400">{ds || "---"} m</span>
    </div>
  </div>
);

export default Traverse;