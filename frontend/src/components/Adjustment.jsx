import React, { useState } from 'react';
import { Trash2, PlusCircle, Activity, Target, Cpu } from 'lucide-react';

const Adjustment = () => {
  // State για τα δεδομένα - Με τα νέα πεδία από τις εικόνες σου
  const [observations, setObservations] = useState([
    { id: 1, station: "8", target: "15", Period: "1", Face_I: "0.0000", Face_II: "200.0006", adj_hz: "200.0003", std_dev: "0.0012" },
    { id: 2, station: "8", target: "20", Period: "1", Face_I: "45.0010", Face_II: "245.0012", adj_hz: "45.0011", std_dev: "0.0015" },
  ]);

  const [isAdjusted, setIsAdjusted] = useState(false);

  const handleInputChange = (id, field, value) => {
    setObservations(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: value } : obs));
  };

  const addRowAt = (index) => {
    const newId = Date.now();
    const newRow = { id: newId, station: "", target: "", Period: "", Face_I: "", Face_II: "", adj_hz: "", std_dev: "" };
    const updated = [...observations];
    updated.splice(index + 1, 0, newRow);
    setObservations(updated);
  };

  const runAdjustment = () => setIsAdjusted(true);

  return (
    <div className="flex flex-col gap-6 p-4">
      
      {/* ACTION BAR - Μόνο το κουμπί εσωτερικά πλέον */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={runAdjustment}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            isAdjusted 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
          }`}
        >
          <Cpu size={16} className={isAdjusted ? "animate-spin" : ""} />
          {isAdjusted ? "ΣΥΝΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ" : "ΕΚΤΕΛΕΣΗ ΣΥΝΟΡΘΩΣΗΣ"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* ΠΙΝΑΚΑΣ */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-0">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-[13px] tracking-wide border-b border-slate-800/60">
                <tr>
                  <th className="p-5 w-12 text-center font-bold text-slate-600">#</th>
                  <th className="p-4 font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">From</th>
                  <th className="p-4 font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">To</th>
                  <th className="p-4 font-bold font-mono text-fuchsia-500 drop-shadow-[0_0_5px_rgba(217,70,239,0.3)]">Period</th>
                  <th className="p-4 font-bold font-mono text-slate-400">Face I</th>
                  <th className="p-4 font-bold font-mono text-slate-400">Face II</th>

                  {/* ΠΡΑΣΙΝΑ ΑΠΟΤΕΛΕΣΜΑΤΑ ΣΤΟ ΤΕΛΟΣ */}
                  {isAdjusted && (
                    <>
                      <th className="p-4 font-bold font-mono text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] animate-in fade-in zoom-in duration-500">
                        Adj. Hz
                      </th>
                      <th className="p-4 font-bold font-mono text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] animate-in fade-in zoom-in duration-700">
                        σ (St)
                      </th>
                    </>
                  )}
                  <th className="p-5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {observations.map((obs, index) => (
                  <React.Fragment key={obs.id}>
                    <tr className="group hover:bg-blue-600/[0.03] transition-all">
                      <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm outline-none text-slate-300 focus:text-blue-400" value={obs.station} onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm outline-none text-slate-300 focus:text-blue-400" value={obs.target} onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:text-blue-400" value={obs.Period} onChange={(e) => handleInputChange(obs.id, 'Period', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:text-blue-400" value={obs.Face_I} onChange={(e) => handleInputChange(obs.id, 'Face_I', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:text-blue-400" value={obs.Face_II} onChange={(e) => handleInputChange(obs.id, 'Face_II', e.target.value)} />
                      </td>

                      {/* ΤΑ ΑΠΟΤΕΛΕΣΜΑΤΑ ΕΔΩ */}
                      {isAdjusted && (
                        <>
                          <td className="p-2 animate-in slide-in-from-left-2 duration-500">
                            <div className="w-full p-2 text-sm font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                              {obs.adj_hz}
                            </div>
                          </td>
                          <td className="p-2 animate-in slide-in-from-left-4 duration-700">
                            <div className="w-full p-2 text-[11px] font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                              {obs.std_dev}
                            </div>
                          </td>
                        </>
                      )}

                      <td className="p-4 text-right">
                        <button onClick={() => setObservations(observations.filter(o => o.id !== obs.id))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                    
                    <tr className="h-0 p-0">
                      <td colSpan={isAdjusted ? "9" : "7"} className="p-0 h-0 relative">
                        <button onClick={() => addRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 shadow-2xl scale-75 hover:scale-100">
                          <PlusCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            
            <button onClick={() => addRowAt(observations.length - 1)} className="w-full p-5 text-[10px] text-slate-500 hover:text-blue-400 transition-all flex justify-center items-center gap-3 font-black uppercase tracking-[0.3em] border-t border-slate-800/60">
              <PlusCircle size={16} /> ΠΡΟΣΘΉΚΗ ΝΈΑΣ ΕΓΓΡΑΦΉΣ
            </button>
          </div>
        </div>

        {/* ΧΑΡΤΗΣ */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
          <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-slate-800/60 bg-slate-950/20">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <Activity size={14} className="text-blue-500" /> ΠΡΟΕΠΙΣΚΌΠΗΣΗ ΔΙΚΤΎΟΥ
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
               <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]"></div>
               <div className="text-center">
                  <Target className={`mx-auto transition-all duration-1000 ${isAdjusted ? 'text-emerald-500 scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-800'}`} size={80} strokeWidth={0.5} />
                  <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mt-6 ${isAdjusted ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isAdjusted ? "Solution Computed" : "Interactive Map View"}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adjustment;