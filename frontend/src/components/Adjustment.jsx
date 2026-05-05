import React, { useState } from 'react';
import { Trash2, PlusCircle, Activity, Target } from 'lucide-react';

const Adjustment = () => {
  const [observations, setObservations] = useState([
    { id: 1, station: "ST1", target: "P1", hz: "120.4500", v: "100.1200", sd: "45.231", hr: "1.50" },
    { id: 2, station: "ST1", target: "P2", hz: "235.1200", v: "98.4500", sd: "12.890", hr: "1.50" },
  ]);

  const handleInputChange = (id, field, value) => {
    setObservations(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: value } : obs));
  };

  const addRowAt = (index) => {
    const newId = Date.now();
    const newRow = { id: newId, station: "", target: "", hz: "", v: "", sd: "", hr: "" };
    const updated = [...observations];
    updated.splice(index + 1, 0, newRow);
    setObservations(updated);
  };

  return (
    <div className="grid grid-cols-12 gap-8">
      
      {/* ΠΙΝΑΚΑΣ - ΑΡΙΣΤΕΡΑ (7/12) */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-0">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/40 text-[10px] uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/60">
              <tr>
                <th className="p-5 w-12 text-center font-black">#</th>
                <th className="p-5">ΣΤΆΣΗ</th>
                <th className="p-5">ΣΚΌΠΕΥΣΗ</th>
                <th className="p-5">HZ</th>
                <th className="p-5">V</th>
                <th className="p-5">SD</th>
                <th className="p-5">HR</th>
                <th className="p-5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {observations.map((obs, index) => (
                <React.Fragment key={obs.id}>
                  <tr className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm outline-none text-slate-300 focus:text-blue-400" value={obs.station} onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)} /></td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm outline-none text-slate-300 focus:text-blue-400" value={obs.target} onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)} /></td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm font-mono text-blue-400 outline-none" value={obs.hz} onChange={(e) => handleInputChange(obs.id, 'hz', e.target.value)} /></td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm font-mono text-blue-400 outline-none" value={obs.v} onChange={(e) => handleInputChange(obs.id, 'v', e.target.value)} /></td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm font-mono text-emerald-400 outline-none" value={obs.sd} onChange={(e) => handleInputChange(obs.id, 'sd', e.target.value)} /></td>
                    <td className="p-2"><input className="w-full bg-transparent p-2 text-sm font-mono text-slate-500 outline-none" value={obs.hr} onChange={(e) => handleInputChange(obs.id, 'hr', e.target.value)} /></td>
                    <td className="p-4">
                      <button onClick={() => setObservations(observations.filter(o => o.id !== obs.id))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all active:scale-90">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                  {/* WORD-STYLE ADD BUTTON */}
                  <tr className="h-0 p-0">
                    <td colSpan="8" className="p-0 h-0 relative">
                      <button 
                        onClick={() => addRowAt(index)}
                        className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 shadow-2xl scale-75 hover:scale-100 active:bg-blue-600 active:text-white"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <button onClick={() => addRowAt(observations.length - 1)} className="w-full p-5 text-[10px] text-slate-500 hover:text-blue-400 hover:bg-blue-600/[0.02] transition-all flex justify-center items-center gap-3 font-black uppercase tracking-[0.3em] border-t border-slate-800/60">
            <PlusCircle size={16} /> ΠΡΟΣΘΉΚΗ ΝΈΑΣ ΕΓΓΡΑΦΉΣ
          </button>
        </div>
      </div>

      {/* ΓΡΑΦΗΜΑ - ΔΕΞΙΑ (5/12) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
        <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-6 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/20">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
              <Activity size={14} className="text-blue-500" /> ΠΡΟΕΠΙΣΚΌΠΗΣΗ ΔΙΚΤΎΟΥ
            </span>
            <div className="flex gap-2">
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
               <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative">
             <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]"></div>
             <div className="text-center group cursor-default">
                <div className="relative mb-6">
                  <Target className="mx-auto text-slate-800 group-hover:text-blue-900/30 transition-colors duration-700" size={80} strokeWidth={0.5} />
                  <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800 opacity-20" size={30} />
                </div>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">Interactive Map View</p>
                <p className="text-[9px] text-slate-700 mt-2 uppercase tracking-widest leading-relaxed">
                  Συνδέστε δεδομένα στον πίνακα<br/>για αυτόματη σχεδίαση
                </p>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Adjustment;