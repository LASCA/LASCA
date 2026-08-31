import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Target, Navigation, Trash2, Map, Download, X, PlusCircle, Maximize2, Cpu, Play, ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const Charaxi = ({ stakeoutData, setStakeoutData, projectInfo }) => {
  const { station, backsight, points, mij } = stakeoutData;
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [scaleMode, setScaleMode] = useState("Χωρίς");
  const [scaleFactor, setScaleFactor] = useState("1.000000");
  
  const [isCalculated, setIsCalculated] = useState(!!stakeoutData.plot);

  useEffect(() => {
    setIsCalculated(!!stakeoutData.plot);
  }, [stakeoutData.plot]);

  const calculateScaleFactor = (xValue) => {
    const E = parseFloat(xValue);
    if (isNaN(E)) return "1.000000";
    
    const m_0 = 0.9996;
    const R_0 = 6371000.0;
    const Em_tonos = E - 500000.0;
    
    const mij_val = m_0 * (1.0 + Math.pow(Em_tonos, 2) / (2.0 * Math.pow(R_0, 2) * Math.pow(m_0, 2)));
    return mij_val.toFixed(6);
  };

  useEffect(() => {
    if (scaleMode === "Υπολογισμός") {
      if (station?.x && !isNaN(parseFloat(station.x))) {
        setScaleFactor(calculateScaleFactor(station.x));
      } else {
        setScaleFactor("1.000000");
      }
    } else if (scaleMode === "Χωρίς") {
      setScaleFactor("1.000000");
    }
  }, [station?.x, scaleMode]);

  const formatVal = (val, decimals = 3) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

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
      const response = await fetch(`${API_BASE_URL}/api/projects/stakeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          station, 
          backsight, 
          points, 
          scale_mode: scaleMode, 
          scale_factor: parseFloat(scaleFactor) || 1.0 
        }) 
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

  const handleGenerateReport = async () => {
    if (!isCalculated || !stakeoutData.plot) {
      toast.error("Παρακαλώ υπολογίστε πρώτα τη χάραξη!");
      return;
    }

    setLoadingReport(true);
    const loadingToast = toast.loading("Δημιουργία Report (PDF)...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/stakeout/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stakeoutData,
          projectInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Αποτυχία δημιουργίας report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Stakeout_Report_${station.name || 'Station'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Το Report κατέβηκε επιτυχώς!", { id: loadingToast });
    } catch (err) {
      toast.error(err.message || "Αποτυχία λήψης του Report.", { id: loadingToast });
    } finally {
      setLoadingReport(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1920px] mx-auto h-full min-h-0 animate-fade-in relative">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      {/* ========================================================= */}
      {/* ΑΡΙΣΤΕΡΟ ΜΕΡΟΣ: ΔΕΔΟΜΕΝΑ & ΠΙΝΑΚΑΣ                         */}
      {/* ========================================================= */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
        
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
          
          {/* Top Bar Πίνακα (Εμφανίζεται ΜΟΝΟ όταν υπάρχουν αποτελέσματα) */}
          {isCalculated && (
            <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap min-h-[28px]">
                <span className="text-xs font-bold text-slate-300 tracking-wider">Αποτελέσματα</span>
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-700/80 shadow-inner">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">G₀ =</span>
                    <span className="text-amber-400 text-xs text-center outline-none font-mono font-bold">
                      {stakeoutData.azimuthBs !== undefined ? `${Number(stakeoutData.azimuthBs).toFixed(4)} g` : '---'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-700/80 shadow-inner">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">m<sub>ij</sub> =</span>
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
                  <th className="p-2 w-8 text-center">#</th>
                  <th className="p-2 min-w-[70px]">Σημείο</th>
                  <th className="p-2 min-w-[100px]">X [m]</th>
                  <th className="p-2 min-w-[110px]">Y [m]</th>
                  
                  {isCalculated && (
                    <>
                      <th className="p-2 text-blue-400 text-center min-w-[100px]">Hz [grad]</th>
                      <th className="p-2 text-emerald-500 text-center min-w-[100px]">Dist [m]</th>
                    </>
                  )}
                  
                  <th className="p-2 text-right">
                    <div className="flex justify-end items-center gap-3">
                      
                      {/* Widget Συντελεστή (ΜΟΝΟ ΠΡΙΝ ΤΟΝ ΥΠΟΛΟΓΙΣΜΟ, στο επίπεδο του thead) */}
                      {!isCalculated && (
                        <div className="flex items-center gap-1 bg-slate-900/50 p-0.5 rounded-md border border-slate-800 shadow-inner">
                          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800/80">
                            <button 
                              type="button" 
                              onClick={() => setScaleMode("Χωρίς")}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-colors ${
                                scaleMode === "Χωρίς" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"
                              }`}
                            >ΧΩΡΙΣ</button>
                            <button 
                              type="button" 
                              onClick={() => setScaleMode("Υπολογισμός")}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-colors ${
                                scaleMode === "Υπολογισμός" ? "bg-emerald-500/20 text-emerald-400 shadow" : "text-slate-500 hover:text-slate-300"
                              }`}
                            >ΥΠΟΛ.</button>
                            <button 
                              type="button" 
                              onClick={() => setScaleMode("Χειροκίνητα")}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-colors ${
                                scaleMode === "Χειροκίνητα" ? "bg-amber-500/20 text-amber-400 shadow" : "text-slate-500 hover:text-slate-300"
                              }`}
                            >ΧΕΙΡ.</button>
                          </div>
                          <input
                            type="text"
                            readOnly={scaleMode !== "Χειροκίνητα"}
                            value={scaleFactor}
                            onChange={(e) => setScaleFactor(e.target.value)}
                            className={`w-16 bg-transparent border-none text-[10px] rounded px-1 outline-none transition-all font-mono text-center ${
                              scaleMode === "Χειροκίνητα" ? "text-amber-300 focus:bg-slate-800" : 
                              scaleMode === "Υπολογισμός" ? "text-emerald-400 cursor-not-allowed" : "text-slate-500 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {isCalculated && (
                          <button 
                            onClick={handleBackToEdit}
                            className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all cursor-pointer active:scale-95"
                            title="Επιστροφή στην επεξεργασία"
                          >
                            <ArrowLeft size={12} />
                          </button>
                        )}
                        
                        {/* Βασικό Κουμπί Χάραξης (Play) */}
                        <button 
                          onClick={handleCalculate}
                          disabled={loading}
                          title="Εκτέλεση Χάραξης"
                          className={`group flex items-center justify-center w-7 h-7 rounded-md transition-all duration-300 border ${
                            loading 
                              ? 'opacity-50 bg-slate-800 border-slate-700' 
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.15)] cursor-pointer active:scale-95'
                          }`}
                        >
                          {loading ? <Cpu size={12} className="animate-spin text-emerald-500" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                        </button>

                        {isCalculated && (
                          <button
                            type="button"
                            onClick={handleGenerateReport}
                            disabled={loadingReport}
                            title="Εξαγωγή Report"
                            className={`group flex items-center justify-center w-7 h-7 rounded-md transition-all duration-300 border ${
                              loadingReport 
                                ? 'opacity-50 bg-slate-800 border-slate-700' 
                                : 'bg-pink-500/10 border-pink-500/30 text-pink-500 hover:bg-pink-500/20 hover:border-pink-400/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] cursor-pointer active:scale-95'
                            }`}
                          >
                            {loadingReport ? (
                              <Cpu size={12} className="animate-spin" />
                            ) : (
                              <FileText size={12} className="" />
                            )}
                          </button>
                        )}
                      </div>
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
                          className={`w-full min-w-[50px] bg-transparent px-1 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'}`} 
                          placeholder={`P${idx+1}`}
                        />
                      </td>

                      <td className="p-1.5">
                        <input 
                          id={`input-pt-x-${idx}`}
                          disabled={isCalculated}
                          type="text" 
                          value={
                            document.activeElement?.id === `input-pt-x-${idx}`
                              ? (pt.x ?? '')
                              : formatVal(pt.x, 3)
                          } 
                          onChange={(e) => handlePointChange(idx, 'x', e.target.value)} 
                          onBlur={(e) => handlePointChange(idx, 'x', formatVal(e.target.value, 3))}
                          className={`w-full min-w-[90px] bg-transparent px-1 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'} ${noSpinnersClass}`} 
                          placeholder="0.000" 
                        />
                      </td>

                      <td className="p-1.5">
                        <input 
                          id={`input-pt-y-${idx}`}
                          disabled={isCalculated}
                          type="text" 
                          value={
                            document.activeElement?.id === `input-pt-y-${idx}`
                              ? (pt.y ?? '')
                              : formatVal(pt.y, 3)
                          } 
                          onChange={(e) => handlePointChange(idx, 'y', e.target.value)} 
                          onBlur={(e) => handlePointChange(idx, 'y', formatVal(e.target.value, 3))}
                          className={`w-full min-w-[100px] bg-transparent px-1 py-1 outline-none rounded border border-transparent focus:border-blue-500 hover:border-slate-700 transition-all font-mono ${isCalculated ? 'text-slate-500 font-medium' : 'text-slate-200'} ${noSpinnersClass}`} 
                          placeholder="0.000" 
                        />
                      </td>
                      
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
                      
                      <td className="p-1.5 text-center relative w-8">
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
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-[300px] lg:min-h-0">
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
                    <button onClick={handleDownload} className="bg-slate-900/80 hover:bg-emerald-500/20 text-slate-300 p-2 rounded-md border border-slate-700/50 transition-all shadow-lg" title="Λήψη">
                      <Download size={14} />
                    </button>
                    <button onClick={() => setIsFullscreen(true)} className="bg-slate-900/80 hover:bg-cyan-500/20 text-slate-300 p-2 rounded-md border border-slate-700/50 transition-all shadow-lg" title="Πλήρης Οθόνη">
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
            </div>
          </div>

        </div>
      </div>

      {/* FULLSCREEN MODAL */}
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