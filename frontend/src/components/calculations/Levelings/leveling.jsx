import React, { useState } from 'react';
import { API_BASE_URL } from '../../../config';
import axios from 'axios';
import { 
  Activity, Ruler, Play, Cpu, Info, Trash2, PlusCircle
} from 'lucide-react';

const Leveling = ({ 
  forwardData = [], 
  setForwardData, 
  backwardData = [], 
  setBackwardData, 
  metrics = {}, 
  setMetrics, 
  projectSettings 
}) => {
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('forward');
  
  const currentData = activeTab === 'forward' ? forwardData : backwardData;
  const setCurrentData = activeTab === 'forward' ? setForwardData : setBackwardData;

  const hasResults = currentData && currentData.some(row => row.dh !== undefined && row.dh !== null && row.dh !== "");

  const handleInputChange = (index, field, value) => {
    const newData = [...currentData];
    const normalizedValue = field !== 'point' ? value.replace(/,/g, '.') : value;
    newData[index] = { ...newData[index], [field]: normalizedValue };
    if (setCurrentData) setCurrentData(newData);
  };

  const deleteRow = (idx) => {
    const newData = [...currentData];
    newData.splice(idx, 1);
    if (setCurrentData) setCurrentData(newData);
  };

  const addRowAt = (index) => {
    const newRow = {
      point: "", backsight: "", bs_upper: "", bs_lower: "", bs_s: "",
      foresight: "", fs_upper: "", fs_lower: "", fs_s: ""
    };
    const newData = [...currentData];
    newData.splice(index + 1, 0, newRow);
    if (setCurrentData) setCurrentData(newData);
  };

  const handleKeyDown = (e, rowIndex, colName) => {
    const columns = hasResults 
      ? ['point', 'backsight', 'bs_upper', 'bs_lower', 'bs_s', 'foresight', 'fs_upper', 'fs_lower', 'fs_s', 'dh', 'elev_backward', 'elevation']
      : ['point', 'backsight', 'bs_upper', 'bs_lower', 'bs_s', 'foresight', 'fs_upper', 'fs_lower', 'fs_s'];
      
    const colIndex = columns.indexOf(colName);
    
    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = rowIndex + 1;
      shouldMove = true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = rowIndex - 1;
      shouldMove = true;
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        nextCol = colIndex - 1;
        shouldMove = true;
      }
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionEnd === e.target.value.length) {
        e.preventDefault();
        nextCol = colIndex + 1;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < currentData.length && nextCol >= 0 && nextCol < columns.length) {
        const nextColName = columns[nextCol];
        const nextInput = document.getElementById(`input-leveling-${nextRow}-${nextColName}`);
        if (nextInput) {
          nextInput.focus();
          setTimeout(() => nextInput.select(), 0); 
        }
      }
    }
  };

  const formatVal = (val, decimals = 3) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  const handleRunLeveling = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/leveling`, {
        forward: forwardData,
        backward: backwardData
      }, {
        headers: {
          'Active-Project': typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || '')
        }
      });

      if (response.data) {
        if (response.data.forward_results && setForwardData) setForwardData(response.data.forward_results);
        if (response.data.backward_results && setBackwardData) setBackwardData(response.data.backward_results);
        if (setMetrics) {
          setMetrics(response.data.metrics || {});
        }
      }
    } catch (error) {
      console.error("Σφάλμα κατά τη χωροστάθμιση:", error);
      alert("Αποτυχία υπολογισμού χωροστάθμισης.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-6 gap-6 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `
      }} />

      <div className="flex flex-1 flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        
        {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ ΧΩΡΟΣΤΑΘΜΙΣΗΣ */}
        <div className="flex-none flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Ruler size={18} className="text-amber-500" />
                </div>
                <div className="flex bg-[#030712] border border-slate-800/80 p-0.5 rounded-lg">
                  <button
                    onClick={() => setActiveTab('forward')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                      activeTab === 'forward'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    1. Μετάβαση
                  </button>
                  <button
                    onClick={() => setActiveTab('backward')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                      activeTab === 'backward'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    2. Επιστροφή
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleRunLeveling}
              disabled={isLoading}
              title="Υπολογισμός Χωροστάθμισης"
              className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.05)] ${
                isLoading 
                  ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 hover:from-indigo-500/20 hover:to-cyan-500/20 border border-indigo-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer'
              }`}
            >
              {isLoading ? (
                 <Cpu size={14} className="animate-spin text-indigo-400" />
              ) : (
                 <Play size={14} fill="currentColor" className="text-indigo-400 group-hover:text-cyan-400 transition-colors ml-0.5" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  <th className={`p-2 text-[10px] font-black text-slate-500 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[4%]' : 'w-[5%]'}`}>#</th>
                  <th className={`p-2 text-[10px] font-black text-slate-400 tracking-widest border-r border-slate-800/30 align-middle ${hasResults ? 'w-[14%]' : 'w-[17%]'}`}>Σημείο Σκόπευσης</th>
                  
                  {/* Οπισθοσκόπευση Group (Μπλε) */}
                  <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[9%]' : 'w-[13%]'}`}>οπισθο-<br/>σκόπευση</th>
                  <th className={`p-0 text-[9px] font-bold text-blue-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                    <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                    <div className="py-1.5">κάτω</div>
                  </th>
                  <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                  
                  {/* Εμπροσθοσκόπευση Group (Πορτοκαλί) */}
                  <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[9%]' : 'w-[13%]'}`}>εμπροσθο-<br/>σκόπευση</th>
                  <th className={`p-0 text-[9px] font-bold text-orange-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                    <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                    <div className="py-1.5">κάτω</div>
                  </th>
                  <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${hasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                  
                  {/* Results Headers */}
                  {hasResults && (
                    <>
                      <th className="w-[12%] p-2 text-[10px] font-black text-purple-500/80 tracking-widest text-right align-middle">Υψομετρική<br/>Διαφορά</th>
                      <th className="w-[12%] p-2 text-[10px] font-black text-rose-400/80 tracking-widest text-right align-middle">Υψόμετρα από<br/>Επιστροφή</th>
                      <th className="w-[12%] p-2 text-[10px] font-black text-amber-500/80 tracking-widest text-right align-middle">Τελικά<br/>Υψόμετρα</th>
                    </>
                  )}
                  {/* Στήλη Διαγραφής */}
                  <th className="w-[30px] p-0 border-l border-slate-800/30"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 bg-[#070c19]/20 relative">
                {currentData && currentData.length > 0 ? (
                  currentData.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-slate-800/30 active:bg-slate-800/50 transition-all duration-150 group relative">
                        <td className="p-2 text-center text-[10px] text-slate-600 font-mono font-bold border-r border-slate-800/30">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-800/30">
                          <input 
                            id={`input-leveling-${idx}-point`}
                            type="text"
                            value={row.point ?? ""}
                            onChange={(e) => handleInputChange(idx, 'point', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'point')}
                            className="bg-transparent w-full font-bold text-slate-400 group-hover:text-cyan-400 text-sm tracking-tight outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-slate-500 rounded px-1 py-2 transition-all"
                            placeholder=""
                          />
                        </td>
                        
                        <td className="p-2 border-r border-slate-800/30">
                          <input 
                            id={`input-leveling-${idx}-backsight`}
                            type="text"
                            value={row.backsight ?? ""}
                            onChange={(e) => handleInputChange(idx, 'backsight', e.target.value)}
                            onBlur={(e) => handleInputChange(idx, 'backsight', formatVal(e.target.value, 3))}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'backsight')}
                            className="bg-transparent w-full font-mono text-blue-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 rounded px-1 py-2 transition-all"
                          />
                        </td>
                        <td className="p-0 border-r border-slate-800/30">
                          <div className="flex flex-col h-full">
                            <input 
                              id={`input-leveling-${idx}-bs_upper`}
                              type="text"
                              value={row.bs_upper ?? ""}
                              onChange={(e) => handleInputChange(idx, 'bs_upper', e.target.value)}
                              onBlur={(e) => handleInputChange(idx, 'bs_upper', formatVal(e.target.value, 3))}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'bs_upper')}
                              className="bg-transparent w-full font-mono text-blue-300/60 text-center text-[11px] outline-none px-1 py-1.5 border-b border-slate-800/50 border-dashed focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                            <input 
                              id={`input-leveling-${idx}-bs_lower`}
                              type="text"
                              value={row.bs_lower ?? ""}
                              onChange={(e) => handleInputChange(idx, 'bs_lower', e.target.value)}
                              onBlur={(e) => handleInputChange(idx, 'bs_lower', formatVal(e.target.value, 3))}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'bs_lower')}
                              className="bg-transparent w-full font-mono text-blue-300/60 text-center text-[11px] outline-none px-1 py-1.5 focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-800/30">
                          <input 
                            id={`input-leveling-${idx}-bs_s`}
                            type="text"
                            value={row.bs_s ?? ""}
                            onChange={(e) => handleInputChange(idx, 'bs_s', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'bs_s')}
                            className="bg-transparent w-full font-mono text-blue-300/80 text-center text-[12px] font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 rounded px-1 py-2 transition-all"
                          />
                        </td>

                        {/* ================= ΕΜΠΡΟΣΘΟΣΚΟΠΕΥΣΗ (ΓΚΡΙΖΑΡΙΣΜΕΝΗ ΣΤΗΝ 1Η ΓΡΑΜΜΗ) ================= */}
                        {idx === 0 ? (
                          <>
                            <td className="p-2 border-r border-slate-800/30 bg-[#0f172a]/60 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.02)_6px,rgba(255,255,255,0.02)_12px)]" title="Δεν υφίσταται εμπροσθοσκόπευση στο 1ο σημείο"></td>
                            <td className="p-0 border-r border-slate-800/30 bg-[#0f172a]/60 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.02)_6px,rgba(255,255,255,0.02)_12px)]"></td>
                            <td className="p-2 border-r border-slate-800/30 bg-[#0f172a]/60 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.02)_6px,rgba(255,255,255,0.02)_12px)]"></td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-slate-800/30">
                              <input 
                                id={`input-leveling-${idx}-foresight`}
                                type="text"
                                value={row.foresight ?? ""}
                                onChange={(e) => handleInputChange(idx, 'foresight', e.target.value)}
                                onBlur={(e) => handleInputChange(idx, 'foresight', formatVal(e.target.value, 3))}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'foresight')}
                                className="bg-transparent w-full font-mono text-orange-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 rounded px-1 py-2 transition-all"
                              />
                            </td>
                            <td className="p-0 border-r border-slate-800/30">
                              <div className="flex flex-col h-full">
                                <input 
                                  id={`input-leveling-${idx}-fs_upper`}
                                  type="text"
                                  value={row.fs_upper ?? ""}
                                  onChange={(e) => handleInputChange(idx, 'fs_upper', e.target.value)}
                                  onBlur={(e) => handleInputChange(idx, 'fs_upper', formatVal(e.target.value, 3))}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 'fs_upper')}
                                  className="bg-transparent w-full font-mono text-orange-300/60 text-center text-[11px] outline-none px-1 py-1.5 border-b border-slate-800/50 border-dashed focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                />
                                <input 
                                  id={`input-leveling-${idx}-fs_lower`}
                                  type="text"
                                  value={row.fs_lower ?? ""}
                                  onChange={(e) => handleInputChange(idx, 'fs_lower', e.target.value)}
                                  onBlur={(e) => handleInputChange(idx, 'fs_lower', formatVal(e.target.value, 3))}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 'fs_lower')}
                                  className="bg-transparent w-full font-mono text-orange-300/60 text-center text-[11px] outline-none px-1 py-1.5 focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                />
                              </div>
                            </td>
                            <td className="p-2 border-r border-slate-800/30">
                              <input 
                                id={`input-leveling-${idx}-fs_s`}
                                type="text"
                                value={row.fs_s ?? ""}
                                onChange={(e) => handleInputChange(idx, 'fs_s', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'fs_s')}
                                className="bg-transparent w-full font-mono text-orange-300/80 text-center text-[12px] font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 rounded px-1 py-2 transition-all"
                              />
                            </td>
                          </>
                        )}

                        {hasResults && (
                          <>
                            <td className="p-2 border-r border-slate-800/30">
                              <input 
                                id={`input-leveling-${idx}-dh`}
                                type="text"
                                value={formatVal(row.dh, 4)}
                                disabled
                                className="bg-transparent w-full font-mono text-purple-400 text-right tabular-nums text-sm font-medium tracking-wide outline-none cursor-default"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-800/30">
                              <input 
                                id={`input-leveling-${idx}-elev_backward`}
                                type="text"
                                value={formatVal(row.elev_backward, 3)}
                                disabled
                                className="bg-transparent w-full font-mono text-rose-400 text-right tabular-nums text-sm font-medium tracking-wide outline-none cursor-default"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-800/30">
                              <input 
                                id={`input-leveling-${idx}-elevation`}
                                type="text"
                                value={formatVal(row.elevation, 3)}
                                disabled
                                className="bg-transparent w-full font-mono text-amber-400 text-right tabular-nums text-sm font-bold tracking-wide outline-none cursor-default"
                              />
                            </td>
                          </>
                        )}

                        <td className="w-[30px] p-0 text-center relative border-l border-slate-800/30">
                          <button 
                            onClick={() => deleteRow(idx)} 
                            className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                            title="Διαγραφή Σημείου"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      <tr className="h-0 p-0">
                        <td colSpan={hasResults ? 12 : 9} className="p-0 h-0 relative">
                          <button 
                            onClick={() => addRowAt(idx)} 
                            className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            title="Εισαγωγή Νέας Γραμμής"
                          >
                            <PlusCircle size={16} />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasResults ? 12 : 9} className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
                        <Info size={30} className="text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Αναμονή Δεδομένων Χωροστάθμισης</p>
                        <button 
                          onClick={() => addRowAt(-1)} 
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-4 py-2 rounded-lg text-xs font-bold border border-slate-700/50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <PlusCircle size={14} /> Προσθήκη Πρώτης Εγγραφής
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📊 ΓΕΩΔΑΙΤΙΚΟΙ ΕΛΕΓΧΟΙ */}
        <div className="flex-none bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800/50 pb-3">
            <Activity size={16} className="text-cyan-500" />
            <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">Συγκριτικός Έλεγχος Μετάβασης / Επιστροφής</span>
          </div>
          
          <div className="flex flex-row gap-4 items-stretch">
            <div className="flex-1">
              <DirectionStatsGroup 
                title="1. Μετάβαση"
                sumBS={metrics?.forward?.sum_backsights} sumBS_S={metrics?.forward?.sum_bs_s}
                sumFS={metrics?.forward?.sum_foresights} sumFS_S={metrics?.forward?.sum_fs_s}
                dh={metrics?.forward?.dh} totalS={metrics?.forward?.total_s}
                themeColor="blue"
              />
            </div>

            <div className="flex-1">
              <DirectionStatsGroup 
                title="2. Επιστροφή"
                sumBS={metrics?.backward?.sum_backsights} sumBS_S={metrics?.backward?.sum_bs_s}
                sumFS={metrics?.backward?.sum_foresights} sumFS_S={metrics?.backward?.sum_fs_s}
                dh={metrics?.backward?.dh} totalS={metrics?.backward?.total_s}
                themeColor="orange"
              />
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between w-full">
             <div className="flex flex-1 divide-x divide-slate-800/50">
               <div className="flex-1 flex flex-col gap-1 pr-4">
                 <span className="text-[12px] text-slate-500 font-black tracking-tighter">S ολικο (Sμετ.+Sεπιστρ)/2</span>
                 <span className="text-sm font-mono font-bold text-slate-200">
                   {metrics?.forward && metrics?.backward 
                     ? ((metrics.forward.total_s + metrics.backward.total_s) / 2).toFixed(2) 
                     : "---"}
                 </span>
               </div>
               <div className="flex-1 flex flex-col gap-1 px-4">
                 <span className="text-[12px] text-slate-500 font-black tracking-tighter">w = δh μεταβασης - δh επιστροφης</span>
                 {(() => {
                   const hasMetrics = metrics?.forward && metrics?.backward && metrics?.error_dh !== undefined;
                   let isOk = false;
                   if (hasMetrics) {
                     const totalMeanS = (metrics.forward.total_s + metrics.backward.total_s) / 2;
                     const errorLimit = 12 * Math.sqrt(totalMeanS / 1000);
                     const dhDiffMm = Math.abs(metrics.error_dh * 1000); // Μετατροπή δh σε mm
                     isOk = dhDiffMm <= errorLimit;
                   }
                   return (
                     <span className={`text-sm font-mono font-bold ${!hasMetrics ? 'text-slate-500' : isOk ? 'text-emerald-400' : 'text-rose-500'}`}>
                       {hasMetrics ? metrics.error_dh : "---"}
                     </span>
                   );
                 })()}
               </div>
               <div className="flex-1 flex flex-col gap-1 px-4">
               <span className="text-[12px] text-slate-500 font-black tracking-tighter">
                Όριο σφάλματος w<sub>max</sub> (mm) </span>
                 <span className="text-sm font-mono font-bold text-slate-300">
                   {metrics?.forward && metrics?.backward 
                     ? (6 * 1.96 * Math.sqrt(((metrics.forward.total_s + metrics.backward.total_s) / 2) / 1000)).toFixed(2)
                     : "---"}
                 </span>
               </div>
             </div>
          </div>
        </div>

        <div className="h-4 flex-none" />
      </div>
    </div>
  );
};

const DirectionStatsGroup = ({ title, sumBS, sumBS_S, sumFS, sumFS_S, dh, totalS, themeColor }) => {
  const colorClass = themeColor === 'blue' ? 'text-blue-400' : 'text-orange-400';
  const borderColorClass = themeColor === 'blue' ? 'border-blue-500/20' : 'border-orange-500/20';

  return (
    <div className={`bg-slate-900/60 p-4 rounded-xl border ${borderColorClass} flex flex-col gap-3 h-full`}>
      <span className={`text-[11px] font-black ${colorClass} tracking-widest border-b border-slate-800 pb-2`}>
        {title}
      </span>
      
      <div className="grid grid-cols-2 gap-4 text-center pb-3 border-b border-slate-800/30">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold">Άθροισμα Ο</span>
          <span className="text-[13px] font-mono text-slate-200 font-bold">{sumBS !== undefined ? sumBS : "---"}</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-slate-800/50">
          <span className="text-[10px] text-slate-500 font-bold">Άθροισμα Απόστασης S (Ο)</span>
          <span className="text-[13px] font-mono text-slate-200 font-bold">{sumBS_S !== undefined ? sumBS_S : "---"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center pb-3 border-b border-slate-800/30">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold">Άθροισμα Ε</span>
          <span className="text-[13px] font-mono text-slate-200 font-bold">{sumFS !== undefined ? sumFS : "---"}</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-slate-800/50">
          <span className="text-[10px] text-slate-500 font-bold">Άθροισμα Απόστασης S (Ε)</span>
          <span className="text-[13px] font-mono text-slate-200 font-bold">{sumFS_S !== undefined ? sumFS_S : "---"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1 mt-auto">
        <div className="flex justify-between items-center px-2">
          <span className={`text-[11px] ${colorClass}/70 font-bold`}>δh</span>
          <span className={`text-[14px] font-mono font-black ${colorClass}`}>{dh !== undefined ? dh : "---"}</span>
        </div>
        <div className="flex justify-between items-center px-2 border-l border-slate-800/50">
          <span className={`text-[11px] ${colorClass}/70 font-bold`}>S Ολικό</span>
          <span className={`text-[14px] font-mono font-black ${colorClass}`}>{totalS !== undefined ? totalS : "---"}</span>
        </div>
      </div>
    </div>
  );
};

export default Leveling;