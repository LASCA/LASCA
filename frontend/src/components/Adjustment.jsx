import React, { useState } from 'react';
import { Trash2, PlusCircle, Activity, Target, Cpu } from 'lucide-react';
import axios from 'axios';

const Adjustment = ({ observations, setObservations }) => {
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (id, field, value) => {
    setObservations(prev => prev.map(obs => 
      obs.id === id ? { ...obs, [field]: value } : obs
    ));
  };

  const addRowAt = (index) => {
    const newId = Date.now();
    const newRow = { 
        id: newId, station: "", target: "", Period: "1", 
        Face_I: "0.0000", Face_II: "0.0000", 
        adj_hz: "0.0000", std_dev: "0.0000" 
    };
    const updated = [...observations];
    updated.splice(index + 1, 0, newRow);
    setObservations(updated);
  };

  const runAdjustment = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/adjustment', {
        measurements: observations
      });

      if (response.data) {
        setObservations(response.data.results);
        setIsAdjusted(true);
      }
    } catch (error) {
      console.error("Σφάλμα στη συνόρθωση:", error);
      alert("Αποτυχία σύνδεσης με το backend. Ελέγξτε αν ο server είναι ανοιχτός.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      
      {/* ACTION BAR */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={runAdjustment}
          disabled={isLoading}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            isAdjusted 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Cpu size={16} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "ΥΠΟΛΟΓΙΣΜΟΣ..." : isAdjusted ? "ΣΥΝΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ" : "ΕΚΤΕΛΕΣΗ ΣΥΝΟΡΘΩΣΗΣ"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* ΠΙΝΑΚΑΣ (ΑΡΙΣΤΕΡΑ) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-0 text-slate-400">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-[14px] border-b border-slate-800/60">
                <tr>
                  <th className="p-5 w-12 text-center text-slate-600">#</th>
                  <th className="p-4 text-amber-300">From</th>
                  <th className="p-4 text-amber-300">To</th>
                  <th className="p-4 text-amber-300">Period</th>
                  <th className="p-4 text-amber-300">Face I</th>
                  <th className="p-4 text-amber-300">Face II</th>
                  {isAdjusted && (
                    <>
                      <th className="p-4 text-emerald-400">Adj. Hz</th>
                      <th className="p-4 text-emerald-400">σ (St)</th>
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
                        <input className="w-full bg-transparent p-2 text-sm outline-none focus:text-blue-400" value={obs.station} onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm outline-none focus:text-blue-400" value={obs.target} onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono outline-none focus:text-blue-400" value={obs.Period} onChange={(e) => handleInputChange(obs.id, 'Period', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono outline-none focus:text-blue-400" 
                               value={Number(obs.Face_I || 0).toFixed(4)} 
                               onChange={(e) => handleInputChange(obs.id, 'Face_I', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-transparent p-2 text-sm font-mono outline-none focus:text-blue-400" 
                               value={Number(obs.Face_II || 0).toFixed(4)} 
                               onChange={(e) => handleInputChange(obs.id, 'Face_II', e.target.value)} />
                      </td>

                      {isAdjusted && (
                        <>
                          <td className="p-2 animate-in fade-in slide-in-from-left-2 duration-500">
                            <div className="w-full p-2 text-sm font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
                              {Number(obs.adj_hz || 0).toFixed(4)}
                            </div>
                          </td>
                          <td className="p-2 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="w-full p-2 text-[11px] font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
                              {Number(obs.std_dev || 0).toFixed(4)}
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
                      <td colSpan={isAdjusted ? 9 : 7} className="p-0 h-0 relative">
                        <button onClick={() => addRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100">
                          <PlusCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: ΠΡΟΕΠΙΣΚΟΠΗΣΗ (STICKY) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-4 bg-slate-900/40 border border-slate-800/60 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-slate-800/60 bg-slate-950/20">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <Activity size={14} className="text-blue-500" /> ΠΡΟΕΠΙΣΚΌΠΗΣΗ ΔΙΚΤΎΟΥ
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
               <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]"></div>
               <div className="text-center z-10">
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