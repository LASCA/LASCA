import React, { useState, useEffect } from 'react';
import { Target, Navigation, Trash2, Map, Download, X, PlusCircle, Maximize2, Cpu, Play, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const Charaxi = ({ stakeoutData, setStakeoutData }) => {
  const { station, backsight, points, mij } = stakeoutData;
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Το state που καθορίζει αν είμαστε σε Edit Mode ή αν προβάλλουμε αποτελέσματα
  const [isCalculated, setIsCalculated] = useState(!!stakeoutData.plot);

  useEffect(() => {
    setIsCalculated(!!stakeoutData.plot);
  }, [stakeoutData.plot]);

  const setStation = (field, val) => {
    setStakeoutData(prev => ({ ...prev, station: { ...prev.station, [field]: val } }));
  };

  const setBacksight = (field, val) => {
    setStakeoutData(prev => ({ ...prev, backsight: { ...prev.backsight, [field]: val } }));
  };

  const handlePointChange = (index, field, val) => {
    setStakeoutData(prev => {
      const newPoints = [...prev.points];
      newPoints[index] = { ...newPoints[index], [field]: val };
      return { ...prev, points: newPoints };
    });
  };

  const deleteRow = (idx) => {
    setStakeoutData(prev => {
      if (prev.points.length === 1) return prev;
      const newPoints = prev.points.filter((_, i) => i !== idx);
      return { ...prev, points: newPoints };
    });
  };

  const addRowAt = (index) => {
    setStakeoutData(prev => {
      const newRow = { id: Date.now().toString(), name: '', x: '', y: '', hz_stake: '', dist_stake: '' };
      const updated = [...prev.points];
      updated.splice(index + 1, 0, newRow);
      return { ...prev, points: updated };
    });
  };

  const handleCalculate = async () => {
    if (!station.x || !station.y || !backsight.x || !backsight.y) {
      toast.error("Συμπληρώστε πρώτα τα δεδομένα Στάσης και Προσανατολισμού!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/projects/stakeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, backsight, points })
      });
      
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        setStakeoutData(prev => ({
          ...prev,
          azimuthBs: result.azimuth_bs,
          mij: result.mij,
          points: result.points,
          plot: result.plot
        }));
        setIsCalculated(true);
        toast.success("Τα στοιχεία χάραξης υπολογίστηκαν επιτυχώς!");
      }
    } catch (err) {
      toast.error("Αποτυχία σύνδεσης με το backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEdit = () => {
    setIsCalculated(false);
    setStakeoutData(prev => ({
      ...prev,
      azimuthBs: undefined,
      mij: undefined,
      plot: null,
      points: prev.points.map(pt => ({ ...pt, hz_stake: '', dist_stake: '' }))
    }));
  };

  const handleDownload = () => {
    if (!stakeoutData.plot) return;
    const link = document.createElement('a');
    link.href = stakeoutData.plot;
    link.download = `Skarifima_Charaxis_${station.name || 'Station'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Το σκαρίφημα κατέβηκε επιτυχώς!");
  };

  const noSpinnersClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-[1920px] mx-auto h-full min-h-0 animate-fade-in relative">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      {/* ========================================================= */}
      {/* ΑΡΙΣΤΕΡΟ ΜΕΡΟΣ: ΔΕΔΟΜΕΝΑ & ΠΙΝΑΚΑΣ                        */}
      {/* ========================================================= */}
      <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
        
        {/* ΣΤΑΣΗ & ΠΡΟΣΑΝΑΤΟΛΙΣΜΟΣ */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          {/* Στάση */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-wider">
                <Target size={14} className="text-blue-500" /> Στάση (St)
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">ID</span>
                <input 
                  disabled={isCalculated}
                  type="text" 
                  value={station.name || ''} 
                  onChange={(e) => setStation('name', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 transition-all ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'}`} 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">X [m]</span>
                <input 
                  disabled={isCalculated}
                  type="number" 
                  value={station.x || ''} 
                  onChange={(e) => setStation('x', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'} ${noSpinnersClass}`} 
                  placeholder="0.000" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">Y [m]</span>
                <input 
                  disabled={isCalculated}
                  type="number" 
                  value={station.y || ''} 
                  onChange={(e) => setStation('y', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'} ${noSpinnersClass}`} 
                  placeholder="0.000" 
                />
              </div>
            </div>
          </div>

          {/* Προσανατολισμός */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-wider">
                <Navigation size={14} className="text-amber-500" /> Προσανατολισμός (Bs)
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">ID</span>
                <input 
                  disabled={isCalculated}
                  type="text" 
                  value={backsight.name || ''} 
                  onChange={(e) => setBacksight('name', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-amber-500 transition-all ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'}`} 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">X [m]</span>
                <input 
                  disabled={isCalculated}
                  type="number" 
                  value={backsight.x || ''} 
                  onChange={(e) => setBacksight('x', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-amber-500 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'} ${noSpinnersClass}`} 
                  placeholder="0.000" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">Y [m]</span>
                <input 
                  disabled={isCalculated}
                  type="number" 
                  value={backsight.y || ''} 
                  onChange={(e) => setBacksight('y', e.target.value)} 
                  className={`w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-amber-500 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium bg-transparent border-transparent' : 'text-slate-200 font-bold'} ${noSpinnersClass}`} 
                  placeholder="0.000" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* ΠΙΝΑΚΑΣ */}
        <div className="flex-1 bg-[#0b1120] border border-slate-800/50 rounded-xl flex flex-col overflow-hidden shadow-2xl min-h-0 relative">
          
          {/* Header Πίνακα με τα results (G0, mij) */}
          {isCalculated && (
            <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0 flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-bold text-slate-300 tracking-wider">Αποτελέσματα</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-700/80 shadow-inner">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">G₀ =</span>
                    <span className="text-amber-400 text-xs text-center outline-none font-mono font-bold">
                      {stakeoutData.azimuthBs !== undefined ? `${Number(stakeoutData.azimuthBs).toFixed(4)} g` : '---'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-700/80 shadow-inner">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">mij =</span>
                    <span className="text-emerald-400 text-xs text-center outline-none font-mono font-bold">
                      {stakeoutData.mij !== undefined && stakeoutData.mij !== null ? Number(stakeoutData.mij).toFixed(5) : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-auto relative">
              <thead className="bg-slate-950 text-[12px] shadow-sm sticky top-0 z-30 font-mono tracking-wider">
                <tr className="border-b border-slate-800/50 text-slate-400">
                  <th className="p-2 w-10 text-center">#</th>
                  <th className="p-2">Σημείο</th>
                  <th className="p-2">X [m]</th>
                  <th className="p-2">Y [m]</th>
                  
                  {isCalculated && (
                    <>
                      <th className="p-2 text-blue-400 text-center w-32 min-w-[130px]">Hz [grad]</th>
                      <th className="p-2 text-emerald-500 text-center w-32 min-w-[130px]">Dist [m]</th>
                    </>
                  )}
                  
                  <th className="p-2 w-16">
                    <div className="flex justify-end gap-2">
                      {isCalculated && (
                        <button 
                          onClick={handleBackToEdit}
                          className="flex items-center justify-center w-7 h-7 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
                          title="Επιστροφή στην επεξεργασία"
                        >
                          <ArrowLeft size={12} />
                        </button>
                      )}
                      <button 
                        onClick={handleCalculate}
                        disabled={loading}
                        title="Εκτέλεση Χάραξης"
                        className={`group flex items-center justify-center w-7 h-7 rounded transition-all duration-300 ${
                          loading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
                        }`}
                      >
                        {loading ? <Cpu size={12} className="animate-spin text-emerald-500" /> : <Play size={12} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {points.map((pt, idx) => (
                  <React.Fragment key={pt.id}>
                    <tr className="group hover:bg-blue-600/[0.03] transition-all">
                      <td className="p-1.5 text-center text-[10px] text-slate-600 font-mono font-bold">{idx + 1}</td>
                      
                      <td className="p-1.5">
                        <input 
                          disabled={isCalculated}
                          type="text" 
                          value={pt.name || ''} 
                          onChange={(e) => handlePointChange(idx, 'name', e.target.value)} 
                          className={`w-full bg-transparent px-1.5 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'}`} 
                          placeholder={`P${idx+1}`}
                        />
                      </td>
                      <td className="p-1.5">
                        <input 
                          disabled={isCalculated}
                          type="number" 
                          value={pt.x !== undefined ? pt.x : ''} 
                          onChange={(e) => handlePointChange(idx, 'x', e.target.value)} 
                          className={`w-full bg-transparent px-1.5 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'} ${noSpinnersClass}`} 
                          placeholder="0.000" 
                        />
                      </td>
                      <td className="p-1.5">
                        <input 
                          disabled={isCalculated}
                          type="number" 
                          value={pt.y !== undefined ? pt.y : ''} 
                          onChange={(e) => handlePointChange(idx, 'y', e.target.value)} 
                          className={`w-full bg-transparent px-1.5 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'} ${noSpinnersClass}`} 
                          placeholder="0.000" 
                        />
                      </td>
                      
                      {/* Στήλες Αποτελεσμάτων: Εμφανίζονται μόνο αν isCalculated */}
                      {isCalculated && (
                        <>
                          <td className="p-1.5 animate-in fade-in slide-in-from-left-2 duration-500">
                            <div className="w-full py-1 text-xs font-bold font-mono text-blue-400 bg-blue-500/5 rounded border border-blue-500/20 text-center">
                              {typeof pt.hz_stake === 'number' ? pt.hz_stake.toFixed(4) : pt.hz_stake || '-'}
                            </div>
                          </td>
                          <td className="p-1.5 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="w-full py-1 text-xs font-bold font-mono text-emerald-400 bg-emerald-500/5 rounded border border-emerald-500/20 text-center">
                              {typeof pt.dist_stake === 'number' ? pt.dist_stake.toFixed(3) : pt.dist_stake || '-'}
                            </div>
                          </td>
                        </>
                      )}
                      
                      <td className="p-1.5 text-center relative">
                        {!isCalculated && (
                          <button onClick={() => deleteRow(idx)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {!isCalculated && (
                      <tr className="h-0 p-0">
                        <td colSpan={isCalculated ? 7 : 5} className="p-0 h-0 relative">
                          <button 
                            onClick={() => addRowAt(idx)} 
                            className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"
                          >
                            <PlusCircle size={14} />
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

      {/* ========================================================= */}
      {/* ΔΕΞΙ ΜΕΡΟΣ: ΧΩΡΟΣ ΠΛΟΤΑΡΙΣΜΑΤΟΣ                            */}
      {/* ========================================================= */}
      <div className="lg:col-span-2 flex flex-col h-full min-h-[300px] lg:min-h-0">
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-xl border border-slate-800/50 shadow-2xl overflow-hidden relative">
          
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Map size={16} className="text-emerald-500" />
              </div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200">Σκαρίφημα Χάραξης</span>
            </div>
          </div>

          <div className="flex-1 bg-[#030712] m-3 rounded-lg border border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]"></div>
            
            <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
              {isCalculated && stakeoutData.plot ? (
                <>
                  <div className="w-full h-full absolute inset-0 z-10">
                    <TransformWrapper
                      initialScale={1}
                      minScale={1}
                      maxScale={10}
                      centerOnInit={true}
                      wheel={{ step: 0.03 }}
                      pinch={{ step: 1 }}
                    >
                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: "move" }}>
                        <img 
                          src={stakeoutData.plot} 
                          alt="Διάγραμμα Χάραξης" 
                          className="max-w-full max-h-full object-contain p-2 animate-in fade-in zoom-in duration-700 pointer-events-none"
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                    <button onClick={handleDownload} className="bg-slate-900/80 hover:bg-emerald-500/20 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-all shadow-lg" title="Λήψη">
                      <Download size={14} />
                    </button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-slate-900/80 hover:bg-cyan-500/20 text-slate-300 p-2 rounded-lg border border-slate-700/50 transition-all shadow-lg" title="Πλήρης Οθόνη">
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center z-10">
                  <Map className={`mx-auto transition-all duration-1000 ${isCalculated ? 'text-emerald-500 scale-110' : 'text-slate-800'}`} size={48} strokeWidth={1} />
                  <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-4 ${isCalculated ? 'text-emerald-400' : 'text-slate-700'}`}>
                    {isCalculated ? "Calculated Layout" : "Interactive Map View"}
                  </p>
                </div>
              )}
              
              <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/50 z-20 backdrop-blur-sm shadow-sm">
                System: EGSA'87
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* FULLSCREEN MODAL ΓΙΑ ΤΟ ΔΙΑΓΡΑΜΜΑ                         */}
      {/* ========================================================= */}
      {isFullscreen && stakeoutData.plot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/95 backdrop-blur-md animate-in fade-in duration-300">
          
          <button 
            onClick={() => setIsFullscreen(false)} 
            className="absolute top-8 right-8 bg-slate-900/80 text-slate-400 p-3 rounded-full border border-slate-800 hover:text-red-400 transition-all z-[60] shadow-2xl"
          >
            <X size={24} />
          </button>
          
          <button
            onClick={handleDownload}
            className="absolute top-8 right-24 bg-slate-900/80 text-slate-400 p-3 rounded-full border border-slate-800 hover:text-emerald-400 transition-all z-[60] shadow-2xl"
            title="Λήψη"
          >
            <Download size={24} />
          </button>

          <div className="w-full h-full flex items-center justify-center cursor-move">
            <TransformWrapper
              initialScale={1}
              minScale={1} 
              maxScale={8}
              centerOnInit={true}
              wheel={{ step: 0.02 }}
              pinch={{ step: 1 }}
            >
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <img
                  src={stakeoutData.plot}
                  alt="Fullscreen Plot"
                  className="max-w-[95vw] max-h-[95vh] object-contain p-4 rounded-lg pointer-events-none"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-xs tracking-widest uppercase bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50 backdrop-blur-sm pointer-events-none z-[60]">
            Scroll για Zoom • Drag για Περιήγηση
          </div>
        </div>
      )}

    </div>
  );
};

export default Charaxi;