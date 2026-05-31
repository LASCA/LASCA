import React, { useState, useEffect, useRef } from 'react';
import { Trash2, PlusCircle, Activity, Target, Cpu, Play, Maximize2, Download, X, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const Adjustment = ({ observations, setObservations }) => {
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [plotImage, setPlotImage] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false); 
  
  const isFormattingRef = useRef(false);

  // Helper functions για δεκαδικά
  const to4 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(4);
  };

  const to2 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(2);
  };

  // Logic για το ποια δεδομένα θα εμφανίζονται
  // Αν έχει γίνει η συνόρθωση, κρατάμε μόνο μοναδικούς συνδυασμούς From-To
  const displayObservations = isAdjusted 
    ? observations.reduce((acc, current) => {
        const x = acc.find(item => item.station === current.station && item.target === current.target);
        if (!x && current.station && current.target) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [])
    : observations;

  useEffect(() => {
    if (isFormattingRef.current) {
      isFormattingRef.current = false;
      return;
    }
    const needsFormatting = observations.some(obs => {
      const f1 = String(obs.Face_I || "");
      const f2 = String(obs.Face_II || "");
      return (f1 !== "" && (!f1.includes('.') || f1.split('.')[1].length !== 4)) ||
             (f2 !== "" && (!f2.includes('.') || f2.split('.')[1].length !== 4));
    });

    if (needsFormatting) {
      isFormattingRef.current = true;
      const formatted = observations.map(obs => ({
        ...obs,
        Face_I: to4(obs.Face_I),
        Face_II: to4(obs.Face_II)
      }));
      setObservations(formatted);
    }
  }, [observations, setObservations]);

  useEffect(() => {
    if (observations && observations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + index, 
        station: "", target: "", Period: "1", Face_I: "", Face_II: "", adj_hz: "", std_dev: ""
      }));
      setObservations(initialRows);
    }
  }, []);

  const handleInputChange = (id, field, value) => {
    setObservations(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: value } : obs));
  };

  const handleBlur = (id, field, value) => {
    if (field === 'Face_I' || field === 'Face_II') handleInputChange(id, field, to4(value));
  };

  const handleKeyDown = (e, index, colName) => {
    const columns = ['station', 'target', 'Period', 'Face_I', 'Face_II'];
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = index + 1; shouldMove = true; e.target.blur(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = index - 1; shouldMove = true; e.target.blur(); }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { e.preventDefault(); nextCol = colIndex - 1; shouldMove = true; e.target.blur(); }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { e.preventDefault(); nextCol = colIndex + 1; shouldMove = true; e.target.blur(); }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < observations.length && nextCol >= 0 && nextCol < columns.length) {
        const nextInput = document.getElementById(`input-${nextRow}-${columns[nextCol]}`);
        if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 0); }
      }
    }
  };

  const addRowAt = (index) => {
    const newRow = { id: Date.now(), station: "", target: "", Period: "1", Face_I: "", Face_II: "", adj_hz: "", std_dev: "" };
    const updated = [...observations];
    updated.splice(index + 1, 0, newRow);
    setObservations(updated);
  };

  const runAdjustment = async () => {
    setIsLoading(true);
    setPlotImage(null);
    try {
      const validObservations = observations.filter(obs => String(obs.station || "").trim() !== "" && String(obs.target || "").trim() !== "");
      if (validObservations.length === 0) { alert("Συμπληρώστε τουλάχιστον μία έγκυρη μέτρηση."); setIsLoading(false); return; }

      const response = await axios.post('http://127.0.0.1:5000/api/adjustment', { measurements: observations });

      if (response.data && response.data.results) {
        const resultsFromPython = response.data.results;
        const updatedObservations = observations.map(obs => {
          const match = resultsFromPython.find(res => String(res.station) === String(obs.station) && String(res.target) === String(obs.target));
          return match ? { ...obs, adj_hz: to4(match.adj_hz), std_dev: to2(match.std_dev) } : obs;
        });

        setObservations(updatedObservations);
        setIsAdjusted(true); 
        if (response.data.plot) setPlotImage(response.data.plot);
      }
    } catch (error) {
      console.error("Σφάλμα στη συνόρθωση:", error);
      alert("Αποτυχία σύνδεσης με το backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!plotImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${plotImage}`;
    link.download = 'Network_Preview_Plot.png';
    link.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6 overflow-hidden relative">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      <div className="flex flex-1 gap-6 min-h-0">
        <div className="flex-[1.6] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col min-h-0">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse table-auto relative">
                <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
                  <tr className="border-b border-slate-800/50">
                    <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">From</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">To</th>
                    
                    {!isAdjusted ? (
                      <>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Period</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face I</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face II</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 text-[10px] font-black text-emerald-500 tracking-widest">Adj. Hz (gon)</th>
                        <th className="p-4 text-[10px] font-black text-emerald-500 tracking-widest">σ (cc)</th>
                      </>
                    )}

                    <th className="p-3 w-16">
                      <div className="flex justify-end pr-2 gap-2">
                        {isAdjusted && (
                          <button 
                            onClick={() => setIsAdjusted(false)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
                            title="Επιστροφή στην επεξεργασία"
                          >
                            <ArrowLeft size={14} />
                          </button>
                        )}
                        <button 
                          onClick={runAdjustment}
                          disabled={isLoading}
                          className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                            isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
                          }`}
                        >
                          {isLoading ? <Cpu size={14} className="animate-spin text-emerald-500" /> : <Play size={14} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {displayObservations.map((obs, index) => (
                    <React.Fragment key={obs.id}>
                      <tr className="group hover:bg-blue-600/[0.03] transition-all">
                        <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                        
                        {/* FROM / TO */}
                        <td className="p-2">
                          <input 
                            disabled={isAdjusted}
                            id={`input-${index}-station`}
                            className={`w-full bg-transparent p-2 text-sm outline-none rounded ${isAdjusted ? 'text-slate-400' : 'text-amber-300/80 focus:bg-slate-800/50'}`} 
                            value={obs.station} 
                            onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            disabled={isAdjusted}
                            id={`input-${index}-target`}
                            className={`w-full bg-transparent p-2 text-sm outline-none rounded ${isAdjusted ? 'text-slate-400' : 'text-amber-300/80 focus:bg-slate-800/50'}`} 
                            value={obs.target} 
                            onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)}
                          />
                        </td>

                        {/* CONDITIONAL COLUMNS */}
                        {!isAdjusted ? (
                          <>
                            <td className="p-2"><input id={`input-${index}-Period`} className="w-full bg-transparent p-2 text-sm font-mono text-slate-400 outline-none focus:bg-slate-800/50 rounded" value={obs.Period} onChange={(e) => handleInputChange(obs.id, 'Period', e.target.value)} /></td>
                            <td className="p-2"><input id={`input-${index}-Face_I`} className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:bg-slate-800/50 rounded" value={obs.Face_I} onBlur={(e) => handleBlur(obs.id, 'Face_I', e.target.value)} onChange={(e) => handleInputChange(obs.id, 'Face_I', e.target.value)} /></td>
                            <td className="p-2"><input id={`input-${index}-Face_II`} className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:bg-slate-800/50 rounded" value={obs.Face_II} onBlur={(e) => handleBlur(obs.id, 'Face_II', e.target.value)} onChange={(e) => handleInputChange(obs.id, 'Face_II', e.target.value)} /></td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 animate-in fade-in slide-in-from-left-2 duration-500">
                              <div className="w-full p-2 text-sm font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
                                {obs.adj_hz || "-"}
                              </div>
                            </td>
                            <td className="p-2 animate-in fade-in slide-in-from-left-4 duration-700">
                              <div className="w-full p-2 text-[11px] font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
                                {obs.std_dev || "-"}
                              </div>
                            </td>
                          </>
                        )}

                        <td className="p-4 text-right">
                          {!isAdjusted && (
                            <button onClick={() => setObservations(observations.filter(o => o.id !== obs.id))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {!isAdjusted && (
                        <tr className="h-0 p-0">
                          <td colSpan={7} className="p-0 h-0 relative">
                            <button onClick={() => addRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg">
                              <PlusCircle size={16} />
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Visualizer - Παραμένει το ίδιο */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Activity size={18} className="text-blue-500" /></div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200">Προεπισκόπηση Δικτύου</span>
            </div>
          </div>
          <div className="flex-1 bg-[#030712] m-4 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]"></div>
            <div className="w-full h-full flex items-center justify-center p-2 z-10 relative">
              {isAdjusted && plotImage ? (
                <>
                  <img src={`data:image/png;base64,${plotImage}`} alt="Plot" className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-700" />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button onClick={handleDownload} className="bg-slate-900/80 hover:bg-emerald-500/20 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-all"><Download size={16} /></button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-slate-900/80 hover:bg-cyan-500/20 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-all"><Maximize2 size={16} /></button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Target className={`mx-auto transition-all duration-1000 ${isAdjusted ? 'text-emerald-500 scale-110' : 'text-slate-800'}`} size={60} strokeWidth={1} />
                  <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-6 ${isAdjusted ? 'text-emerald-400' : 'text-slate-700'}`}>
                    {isAdjusted ? "Solution Computed" : "Interactive Map View"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay - Παραμένει το ίδιο */}
      {isFullscreen && plotImage && (
        <div className="fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
          <button onClick={() => setIsFullscreen(false)} className="absolute top-8 right-8 bg-slate-900/80 text-slate-400 p-3 rounded-xl border border-slate-800 hover:text-red-400 transition-all"><X size={24} /></button>
          <img src={`data:image/png;base64,${plotImage}`} alt="Fullscreen Plot" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default Adjustment;