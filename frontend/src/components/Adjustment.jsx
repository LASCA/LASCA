import React, { useState, useEffect } from 'react';
import { Trash2, PlusCircle, Activity, Target, Cpu, Play } from 'lucide-react';
import axios from 'axios';

const Adjustment = ({ observations, setObservations }) => {
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Αρχικοποίηση με 3 κενές γραμμές αν ο πίνακας είναι άδειος κατά τη φόρτωση
  useEffect(() => {
    if (observations && observations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + index, 
        station: "", 
        target: "", 
        Period: "1", 
        Face_I: "0.0000", 
        Face_II: "0.0000", 
        adj_hz: "0.0000", 
        std_dev: "0.0000"
      }));
      setObservations(initialRows);
    }
  }, []); // Τρέχει μόνο μία φορά όταν φορτώνει το component

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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6 overflow-hidden">
      {/* Scrollbar styling */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `}
      </style>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ: ΠΙΝΑΚΑΣ (Ανεξάρτητο Scroll) */}
        <div className="flex-[1.6] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col min-h-0">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse table-auto relative">
                {/* Καρφιτσωμένη κεφαλίδα (Sticky Head) */}
                <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
                  <tr className="border-b border-slate-800/50">
                    <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">From</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">To</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Period</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face I</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face II</th>
                    {isAdjusted && (
                      <>
                        <th className="p-4 text-[10px] font-black text-emerald-500 tracking-widest">Adj. Hz</th>
                        <th className="p-4 text-[10px] font-black text-emerald-500 tracking-widest">σ (St)</th>
                      </>
                    )}
                    {/* ΝΕΟ ΚΟΥΜΠΙ PLAY ΣΤΟ ΑΚΡΟ */}
                    <th className="p-3 w-16">
                      <div className="flex justify-end pr-2">
                        <button 
                          onClick={runAdjustment}
                          disabled={isLoading}
                          title="Εκτέλεση Συνορθώσης"
                          className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer ${
                            isLoading 
                              ? 'opacity-50 cursor-not-allowed bg-slate-800 border border-slate-700' 
                              : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 hover:border-cyan-400/50'
                          }`}
                        >
                          {isLoading ? (
                            <Cpu size={14} className="animate-spin text-emerald-500" />
                          ) : (
                            <Play size={14} fill="currentColor" className="text-emerald-500 group-hover:text-cyan-400 transition-colors ml-0.5" />
                          )}
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {observations.map((obs, index) => (
                    <React.Fragment key={obs.id}>
                      <tr className="group hover:bg-blue-600/[0.03] transition-all">
                        <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                        <td className="p-2">
                          <input className="w-full bg-transparent p-2 text-sm text-amber-300/80 outline-none focus:text-amber-300 focus:bg-slate-800/50 rounded" value={obs.station} onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input className="w-full bg-transparent p-2 text-sm text-amber-300/80 outline-none focus:text-amber-300 focus:bg-slate-800/50 rounded" value={obs.target} onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-400 outline-none focus:text-blue-400 focus:bg-slate-800/50 rounded" value={obs.Period} onChange={(e) => handleInputChange(obs.id, 'Period', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:text-blue-400 focus:bg-slate-800/50 rounded" 
                                 value={Number(obs.Face_I || 0).toFixed(4)} 
                                 onChange={(e) => handleInputChange(obs.id, 'Face_I', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:text-blue-400 focus:bg-slate-800/50 rounded" 
                                 value={Number(obs.Face_II || 0).toFixed(4)} 
                                 onChange={(e) => handleInputChange(obs.id, 'Face_II', e.target.value)} />
                        </td>

                        {isAdjusted && (
                          <>
                            <td className="p-2 animate-in fade-in slide-in-from-left-2 duration-500">
                              <div className="w-full p-2 text-sm font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                                {Number(obs.adj_hz || 0).toFixed(4)}
                              </div>
                            </td>
                            <td className="p-2 animate-in fade-in slide-in-from-left-4 duration-700">
                              <div className="w-full p-2 text-[11px] font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                                {Number(obs.std_dev || 0).toFixed(4)}
                              </div>
                            </td>
                          </>
                        )}

                        <td className="p-4 text-right">
                          <button onClick={() => setObservations(observations.filter(o => o.id !== obs.id))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                      <tr className="h-0 p-0">
                        <td colSpan={isAdjusted ? 9 : 7} className="p-0 h-0 relative">
                          <button onClick={() => addRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg">
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
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: ΟΠΤΙΚΟΠΟΙΗΣΗ (Σταθερή/Sticky) */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity size={18} className="text-blue-500" />
              </div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200 ">Προεπισκόπηση Δικτύου</span>
            </div>
          </div>
          
          <div className="flex-1 bg-[#030712] m-4 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]"></div>
             <div className="text-center z-10">
                <Target className={`mx-auto transition-all duration-1000 ${isAdjusted ? 'text-emerald-500 scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-800 group-hover:text-blue-500/40'}`} size={60} strokeWidth={1} />
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-6 transition-colors duration-700 ${isAdjusted ? 'text-emerald-400' : 'text-slate-700'}`}>
                  {isAdjusted ? "Solution Computed" : "Interactive Map View"}
                </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Adjustment;