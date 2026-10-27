import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';
import { Trash2, PlusCircle, Activity, Target, Cpu, Play, Maximize2, Download, X, ArrowLeft, FileText } from 'lucide-react';
import axios from 'axios';
import { saveImageFile } from '../../../utils/save_blob_file';
import { stripControlCharacters } from '../../../utils/strip_control_characters';

const Adjustment = ({ observations, setObservations, adjMetrics = {}, setAdjMetrics, projectInfo }) => {
  
  const [isAdjusted, setIsAdjusted] = useState(adjMetrics.isAdjusted || false);
  const [plotImage, setPlotImage] = useState(adjMetrics.plotImage || null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); 

  useEffect(() => {
    const refresh = window.setTimeout(() => {
      setIsAdjusted(adjMetrics.isAdjusted || false);
      setPlotImage(adjMetrics.plotImage || null);
    }, 0);
    return () => window.clearTimeout(refresh);
  }, [adjMetrics]);

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
    if (observations && observations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + index,
        station: "", target: "", Period: "", Face_I: "", Face_II: "", adj_hz: "", std_dev: ""
      }));
      const initialize = window.setTimeout(() => setObservations(initialRows), 0);
      return () => window.clearTimeout(initialize);
    }
    return undefined;
  }, [observations, setObservations]);

  // ΕΞΥΠΝΟ FORMATTING: Εφαρμόζει 4 δεκαδικά παντού, ΕΚΤΟΣ από το κελί που κάνουμε edit
  useEffect(() => {
    if (isAdjusted || !observations || observations.length === 0) return;

    let hasChanges = false;
    // Βρίσκουμε ποιο input έχει το focus αυτή τη στιγμή (αν υπάρχει)
    const activeId = typeof document !== 'undefined' ? document.activeElement?.id : null;

    const formattedObservations = observations.map((obs, index) => {
      let updatedObs = { ...obs };
      
      const isFaceIFocused = activeId === `input-${index}-Face_I`;
      const isFaceIIFocused = activeId === `input-${index}-Face_II`;

      // Αν το Face I έχει τιμή και ΔΕΝ είναι επιλεγμένο αυτή τη στιγμή -> format σε 4 δεκαδικά
      if (!isFaceIFocused && obs.Face_I !== "" && obs.Face_I != null) {
        const formattedVal = to4(obs.Face_I);
        if (formattedVal !== String(obs.Face_I)) {
          updatedObs.Face_I = formattedVal;
          hasChanges = true;
        }
      }

      // Αν το Face II έχει τιμή και ΔΕΝ είναι επιλεγμένο αυτή τη στιγμή -> format σε 4 δεκαδικά
      if (!isFaceIIFocused && obs.Face_II !== "" && obs.Face_II != null) {
        const formattedVal = to4(obs.Face_II);
        if (formattedVal !== String(obs.Face_II)) {
          updatedObs.Face_II = formattedVal;
          hasChanges = true;
        }
      }

      return updatedObs;
    });

    // Κάνουμε setObservations μόνο αν υπήρξε πραγματική αλλαγή (αποφυγή λούπας)
    if (hasChanges) {
      setObservations(formattedObservations);
    }
  }, [observations, isAdjusted, setObservations]);

  const handleInputChange = (id, field, value) => {
    const normalizedValue = ['Period', 'Face_I', 'Face_II'].includes(field) ? value.replace(/,/g, '.') : value;
    setObservations(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: normalizedValue } : obs));
  };

  const handleBlur = (id, field, value) => {
    if (field === 'Face_I' || field === 'Face_II') {
      handleInputChange(id, field, to4(value));
    }
  };

  // Έξυπνη πλοήγηση χωρίς μαρκάρισμα/επιλογή του κειμένου
  const handleKeyDown = (e, index, colName) => {
    const columns = ['station', 'target', 'Period', 'Face_I', 'Face_II'];
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { 
      e.preventDefault(); 
      nextRow = index + 1; 
      shouldMove = true; 
    }
    else if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      nextRow = index - 1; 
      shouldMove = true; 
    }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { 
      e.preventDefault(); 
      nextCol = colIndex - 1; 
      shouldMove = true; 
    }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { 
      e.preventDefault(); 
      nextCol = colIndex + 1; 
      shouldMove = true; 
    }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < observations.length && nextCol >= 0 && nextCol < columns.length) {
        const nextInput = document.getElementById(`input-${nextRow}-${columns[nextCol]}`);
        if (nextInput) { 
          nextInput.focus(); 
          // Αντί για select(), βάζουμε τον κέρσορα στο τέλος του κειμένου για να μην σβήνονται τα δεδομένα
          const valLength = nextInput.value.length;
          nextInput.setSelectionRange(valLength, valLength);
        }
      }
    }
  };

  const addRowAt = (index) => {
    const newRow = { id: Date.now(), station: "", target: "", Period: "", Face_I: "", Face_II: "", adj_hz: "", std_dev: "" };
    const updated = [...observations];
    updated.splice(index + 1, 0, newRow);
    setObservations(updated);
  };

  const saveBlobFile = async (blob, defaultFileName) => {
    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{ description: 'File', accept: { '*/*': ['.pdf', '.png'] } }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('showSaveFilePicker failed, falling back to browser download:', error);
      } else {
        console.info('Save dialog canceled by user, using fallback download flow.');
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const runAdjustment = async () => {
    setIsLoading(true);
    try {
      const validObservations = observations.filter(obs => String(obs.station || "").trim() !== "" && String(obs.target || "").trim() !== "");
      if (validObservations.length === 0) { alert("Συμπληρώστε τουλάχιστον μία έγκυρη μέτρηση."); setIsLoading(false); return; }

      const response = await axios.post(`${API_BASE_URL}/api/adjustment`, { measurements: observations });

      if (response.data && response.data.error) {
        throw new Error(response.data.error);
      }

      if (response.data && response.data.results) {
        const resultsFromPython = response.data.results;
        const updatedObservations = observations.map(obs => {
          const match = resultsFromPython.find(res => String(res.station) === String(obs.station) && String(res.target) === String(obs.target));
          return match ? { ...obs, adj_hz: to4(match.adj_hz), std_dev: to2(match.std_dev) } : obs;
        });

        setObservations(updatedObservations);
        
        if (setAdjMetrics) {
          setAdjMetrics({
            isAdjusted: true,
            plotImage: response.data.plot || null,
            stats: response.data.stats || response.data.station_stats || null
          });
        }
      }
    } catch (error) {
      const backendMessage = error?.response?.data?.error || error?.message || 'Αποτυχία σύνδεσης με το backend.';
      console.error("Σφάλμα στη συνόρθωση:", error);
      alert(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!plotImage) return;
    try {
      await saveImageFile(plotImage, 'Network_Preview_Plot.png');
    } catch (err) {
      console.error('Σφάλμα λήψης γραφήματος:', err);
      alert('Αποτυχία λήψης γραφήματος.');
    }
  };

  const handleBackToEdit = () => {
    if (setAdjMetrics) {
      setAdjMetrics({ ...adjMetrics, isAdjusted: false });
    }
  };

  const handleExportReport = async () => {
    if (!isAdjusted) return;
    setIsLoading(true);
    
    try {
      const payload = {
        measurements: observations,
        results: displayObservations,
        stats: adjMetrics.stats,
        plot: plotImage,
        projectInfo: projectInfo
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/adjustment/report`, payload, {
        responseType: 'blob'
      });

      if (response.data && response.data.type === 'application/json') {
        const errorJson = JSON.parse(await response.data.text());
        throw new Error(errorJson.error || 'Αποτυχία δημιουργίας PDF Report.');
      }

      const projectName = String(projectInfo?.projectName || projectInfo?.name || '').trim();
      const sanitizedProjectName = projectName
        .replace(/\s+/g, '_')
        .replace(/[<>:"/\\|?*]/g, '');
      const safeProjectName = stripControlCharacters(sanitizedProjectName);
      const fileName = sanitizedProjectName
        ? `${safeProjectName}_Adjustment_Report.pdf`
        : 'Adjustment_Report.pdf';

      await saveBlobFile(response.data, fileName);
    } catch (error) {
      const backendMessage = error?.response?.data?.error || error?.message || 'Αποτυχία δημιουργίας PDF Report.';
      console.error('Σφάλμα κατά την εξαγωγή του Report:', error);
      alert(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-6 gap-6 overflow-hidden relative">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      <div className="flex flex-1 gap-6 min-h-0">
        <div className="flex-[2] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col min-h-0">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse table-fixed relative">
                <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
                  <tr className="border-b border-slate-800/50">
                    <th className="p-4 w-10 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                    <th className="p-4 w-20 text-[10px] font-black text-slate-500 tracking-widest">From</th>
                    <th className="p-4 w-20 text-[10px] font-black text-slate-500 tracking-widest">To</th>
                    
                    {!isAdjusted ? (
                      <>
                        <th className="p-4 w-16 text-[10px] font-black text-slate-500 tracking-widest">Period</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face I</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face II</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 w-44 text-[10px] font-black text-emerald-500 tracking-widest text-center">Adj. Hz (grad)</th>
                        <th className="p-4 w-32 text-[10px] font-black text-emerald-500 tracking-widest text-center">σ (cc)</th>
                      </>
                    )}

                    <th className="p-3 w-28">
                      <div className="flex justify-end pr-2 gap-2">
                        {isAdjusted && (
                          <button 
                            onClick={handleBackToEdit}
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

                        {isAdjusted && (
                          <button
                            type="button"
                            onClick={handleExportReport}
                            title="Εξαγωγή Report"
                            className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(236,72,153,0.05)] bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] active:scale-95 cursor-pointer"
                          >
                            <FileText size={14} className="text-pink-500 group-hover:text-purple-400 transition-colors" />
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {displayObservations.map((obs, index) => (
                    <React.Fragment key={obs.id}>
                      <tr className="group hover:bg-blue-600/[0.03] transition-all">
                        <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                        
                        <td className="p-2">
                          <input 
                            disabled={isAdjusted}
                            id={`input-${index}-station`}
                            className={`w-full bg-transparent p-2 text-sm tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-400/80 transition-all ${isAdjusted ? 'text-slate-500 font-medium' : 'text-slate-200 font-bold'}`} 
                            value={obs.station} 
                            onChange={(e) => handleInputChange(obs.id, 'station', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'station')}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            disabled={isAdjusted}
                            id={`input-${index}-target`}
                            className={`w-full bg-transparent p-2 text-sm tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-400/80 transition-all ${isAdjusted ? 'text-slate-500 font-medium' : 'text-slate-200 font-bold'}`} 
                            value={obs.target} 
                            onChange={(e) => handleInputChange(obs.id, 'target', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'target')}
                          />
                        </td>

                        {!isAdjusted ? (
                          <>
                            <td className="p-2">
                              <input 
                                id={`input-${index}-Period`} 
                                className="w-full bg-transparent p-2 text-sm text-left font-mono outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-400 font-bold" 
                                value={obs.Period} 
                                onChange={(e) => handleInputChange(obs.id, 'Period', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, index, 'Period')}
                                placeholder="-"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                id={`input-${index}-Face_I`} 
                                className="w-full bg-transparent p-2 text-sm font-mono tracking-wide outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 transition-all text-cyan-400 font-bold" 
                                value={obs.Face_I} 
                                onBlur={(e) => handleBlur(obs.id, 'Face_I', e.target.value)} 
                                onChange={(e) => handleInputChange(obs.id, 'Face_I', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, index, 'Face_I')}
                                placeholder="-"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                id={`input-${index}-Face_II`} 
                                className="w-full bg-transparent p-2 text-sm font-mono tracking-wide outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 transition-all text-cyan-400 font-bold" 
                                value={obs.Face_II} 
                                onBlur={(e) => handleBlur(obs.id, 'Face_II', e.target.value)} 
                                onChange={(e) => handleInputChange(obs.id, 'Face_II', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, index, 'Face_II')}
                                placeholder="-"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 animate-in fade-in slide-in-from-left-2 duration-500">
                              <div className="w-full py-2 px-1 text-sm font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center tracking-tight">
                                {obs.adj_hz || "-"}
                              </div>
                            </td>
                            <td className="p-2 animate-in fade-in slide-in-from-left-4 duration-700">
                              <div className="w-full py-2 px-1 text-[11px] font-black font-mono text-emerald-400 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center tracking-tight">
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

          {isAdjusted && (
            <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">
                  Στατιστικα Συνορθωσης Στασεων (Log)
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-auto text-xs">
                  <thead className="bg-[#0f172a] text-slate-500 text-[10px] font-black tracking-widest">
                    <tr className="border-b border-slate-800/50">
                      <th className="p-3">Στάση</th>
                      <th className="p-3 text-center">Βαθμοί Ελευθερίας (f)</th>
                      <th className="p-3 text-center">Κριτήριο Βελτιστοποίησης [vv]</th>
                      <th className="p-3 text-center">a-posteriori μεταβλητότητα (σ₀²)</th>
                      <th className="p-3 text-center">a-posteriori τυπική απόκλιση σ₀ (cc)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 font-mono">
                    {Array.isArray(adjMetrics.stats) && adjMetrics.stats.length > 0 ? (
                      adjMetrics.stats.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="p-3 font-bold text-slate-200">{row.station || row.stationName || "-"}</td>
                          <td className="p-3 text-center text-cyan-400 font-bold">{row.f ?? "-"}</td>
                          <td className="p-3 text-center text-emerald-400">{row.vv !== undefined && row.vv !== null ? to4(row.vv) : "-"}</td>
                          <td className="p-3 text-center text-emerald-400">{row.var !== undefined && row.var !== null ? to4(row.var) : "-"}</td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{row.std !== undefined && row.std !== null ? to2(row.std) : "-"}</td>
                        </tr>
                      ))
                    ) : adjMetrics.stats ? (
                      <tr className="hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-slate-200">{adjMetrics.stats.station || adjMetrics.stats.stationName || "-"}</td>
                        <td className="p-3 text-center text-cyan-400 font-bold">{adjMetrics.stats.f ?? "-"}</td>
                        <td className="p-3 text-center text-emerald-400">{adjMetrics.stats.vv !== undefined && adjMetrics.stats.vv !== null ? to4(adjMetrics.stats.vv) : "-"}</td>
                        <td className="p-3 text-center text-emerald-400">{adjMetrics.stats.var !== undefined && adjMetrics.stats.var !== null ? to4(adjMetrics.stats.var) : "-"}</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">{adjMetrics.stats.std !== undefined && adjMetrics.stats.std !== null ? to2(adjMetrics.stats.std) : "-"}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">Δεν βρέθηκαν στατιστικά.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

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