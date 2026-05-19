import React, { useState, useEffect } from 'react';
import { 
  Map as MapIcon, 
  Info, 
  Database, 
  Activity, 
  Target, 
  Ruler,
  Settings2,
  Play // Προσθέσαμε το εικονίδιο Zap
} from 'lucide-react';

const Traverse = ({ data = [], metrics = {}, onDataUpdate }) => {
  
  const [tableData, setTableData] = useState(data);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const handleInputChange = (index, field, value) => {
    const newData = [...tableData];
    newData[index] = { ...newData[index], [field]: value };
    setTableData(newData);
    
    if (onDataUpdate) {
      onDataUpdate(newData);
    }
  };

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

         select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 0.4rem center;
            background-size: 0.7em;
            color-scheme: dark; 
          }

          select option {
            background-color: #0b1120;
            color: #94a3b8;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            padding: 12px;
          }

          select:hover {
            border-color: rgba(251, 191, 36, 0.4);
            background-color: rgba(15, 23, 42, 0.8);
          }
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

                <div className="flex items-center gap-5 border-l border-slate-800/60 pl-6">
                  {/* Τάξη */}
                  <div className="flex flex-col gap-1 group">
                    <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
                      Τάξη
                    </label>
                    <select className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-2 pr-6 py-1 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer font-mono hover:border-slate-700">
                      <option value="1">Ι</option>
                      <option value="2">ΙΙ</option>
                    </select>
                  </div>

                  {/* Έδαφος */}
                  <div className="flex flex-col gap-1 group">
                    <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
                      Έδαφος
                    </label>
                    <select className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-2 pr-6 py-1 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer font-mono hover:border-slate-700">
                      <option>Ομαλό</option>
                      <option>Κεκλιμένο</option>
                    </select>
                  </div>

                  {/* Κλίμακα */}
                  <div className="flex flex-col gap-1 group">
                    <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
                      Κλίμακα
                    </label>
                    <select className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-2 pr-6 py-1 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer font-mono hover:border-slate-700">
                      <option>1:200</option>
                      <option>1:500</option>
                      <option>1:1000</option>
                      <option>1:2000</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ΚΟΥΜΠΙ όδευσης */}
              <button 
                onClick={() => console.log("Μελλοντική κλήση αλγορίθμου οδευσης...")}
                title="Εκτέλεση"
                className="group flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 hover:border-cyan-400/50 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer"
              >
                {/* Το ml-0.5 βοηθάει να φαίνεται οπτικά κεντραρισμένο το τρίγωνο */}
                <Play size={14} fill="currentColor" className="text-emerald-500 group-hover:text-cyan-400 transition-colors ml-0.5" />
              </button>
            </div>

            <div className="flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                  <tr className="border-b border-slate-800/50">
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest">Station</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Hz [grad]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Slope_D [m]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">X [m]</th>
                    <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">Y [m]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {tableData.length > 0 ? (
                    tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-none ${row.name?.toString().startsWith('Σ') ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse' : 'bg-slate-800 group-hover:bg-slate-600'}`} />
                            <input 
                              type="text"
                              value={row.name || ""}
                              onChange={(e) => handleInputChange(idx, 'name', e.target.value)}
                              className="bg-transparent w-full font-bold text-slate-300 text-sm tracking-tight outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-slate-500 rounded px-2 py-2 transition-all"
                              placeholder="Name"
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <input 
                            type="text"
                            value={row.hz || ""}
                            onChange={(e) => handleInputChange(idx, 'hz', e.target.value)}
                            className="bg-transparent w-full font-mono text-amber-400/90 text-center text-sm outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-amber-500/50 rounded px-2 py-2 transition-all"
                            placeholder="-"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text"
                            value={row.sd || ""}
                            onChange={(e) => handleInputChange(idx, 'sd', e.target.value)}
                            className="bg-transparent w-full font-mono text-slate-400 text-center text-sm outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-slate-500/50 rounded px-2 py-2 transition-all"
                            placeholder="-"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text"
                            value={row.x || ""}
                            onChange={(e) => handleInputChange(idx, 'x', e.target.value)}
                            className="bg-transparent w-full font-mono text-cyan-400/80 text-right tabular-nums text-sm outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-cyan-500/50 rounded px-2 py-2 transition-all"
                            placeholder="-"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text"
                            value={row.y || ""}
                            onChange={(e) => handleInputChange(idx, 'y', e.target.value)}
                            className="bg-transparent w-full font-mono text-cyan-400/80 text-right tabular-nums text-sm outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-cyan-500/50 rounded px-2 py-2 transition-all"
                            placeholder="-"
                          />
                        </td>
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
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">Γεωδαιτικοί Έλεγχοι & Σφάλματα</span>
            </div>
            
            <div className="flex flex-row gap-4 items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <CompactStat label="Κορυφές (n)" value={tableData.length} icon={<Target size={12}/>} color="text-slate-200" />
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
                   <span className="text-[10px] text-slate-500 font-black tracking-tighter">Μέγιστο Γωνιακό (Wβ Max)</span>
                   <span className="text-xs font-mono font-bold text-amber-500">{metrics.Wb_max || "---"} grad</span>
                 </div>
                 <div className="flex flex-col gap-1 border-l border-slate-800/50 px-6">
                   <span className="text-[10px] text-slate-500 font-black tracking-tighter">Μέγιστο Γραμμικό (δs Max)</span>
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
      <span className="text-[8px] font-black text-slate-500 tracking-widest">{label}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>{value || "0"}{unit}</span>
    </div>
  </div>
);

const DetailedAngleGroup = ({ title, target, actual, error, wbi, labels }) => (
  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3">
    <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
    
    <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-800/30 pb-3">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 font-bold">{labels[0]}</span>
        <span className="text-[12px] font-mono text-slate-200">{target || "---"}</span>
      </div>
      <div className="flex flex-col gap-1 border-l border-slate-800/50">
        <span className="text-[9px] text-slate-500 font-bold">{labels[1]}</span>
        <span className="text-[12px] font-mono text-slate-200">{actual || "---"}</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-1">
      <div className="flex justify-between items-center px-2">
        <span className="text-[9px] text-amber-500/70 font-bold">{labels[2]}</span>
        <span className="text-[13px] font-mono text-amber-500 font-bold">{error || "---"}</span>
      </div>
      <div className="flex justify-between items-center px-2 border-l border-slate-800/50">
        <span className="text-[9px] text-amber-500/70 font-bold">{labels[3]}</span>
        <span className="text-[13px] font-mono text-amber-500/90">{wbi || "---"}</span>
      </div>
    </div>
  </div>
);

const DetailedLinearGroup = ({ title, xTarget, xActual, xError, yTarget, yActual, yError, ds, labels }) => (
  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3 h-full">
    <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
    
    {[0, 3].map((startIndex) => {
      const targetVal = startIndex === 0 ? xTarget : yTarget;
      const actualVal = startIndex === 0 ? xActual : yActual;
      const errorVal = startIndex === 0 ? xError : yError;

      return (
        <div 
          key={startIndex} 
          className={`grid grid-cols-3 gap-2 text-center ${startIndex === 0 ? 'border-b border-slate-800/30 pb-3' : ''}`}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 font-bold">{labels[startIndex]}</span>
            <span className="text-[12px] font-mono text-slate-200">{targetVal || "---"}</span>
          </div>
          <div className="flex flex-col gap-1 border-x border-slate-800/50">
            <span className="text-[9px] text-slate-500 font-bold">{labels[startIndex+1]}</span>
            <span className="text-[12px] font-mono text-slate-200">{actualVal || "---"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-amber-500/70 font-bold">{labels[startIndex+2]}</span>
            <span className="text-[12px] font-mono text-amber-500 font-bold">{errorVal || "---"}</span>
          </div>
        </div>
      );
    })}

    <div className="flex justify-between items-center px-2 mt-auto pt-4 border-t border-slate-800/50">
      <span className="text-[10px] font-bold text-slate-500 tracking-wider">{labels[6]}</span>
      <span className="text-[14px] font-mono font-black text-emerald-400">{ds || "---"} m</span>
    </div>
  </div>
);

export default Traverse;