import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../config';
import axios from 'axios';
import { Target, Database, PlusCircle, Trash2, Play, Cpu, ArrowLeft, Settings2, AlertTriangle, CheckCircle } from 'lucide-react';

const TraverseTrigLevel = ({
  observations = [],
  setObservations,
  stations = [],
  setStations,
  projectSettings
}) => {
  const [localObs, setLocalObs] = useState([]);
  const [showTrigResults, setShowTrigResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE ΓΙΑ ΧΩΡΙΣ ΔΙΟΡΘΩΣΗ & ΑΝΟΧΕΣ ---
  const [noCorrection, setNoCorrection] = useState(false);
  const [tolD, setTolD] = useState("0.050");
  const [tolDH, setTolDH] = useState("0.020");
  const [toleranceReport, setToleranceReport] = useState(null);
  const reportRef = useRef(null);

  const to3 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(3);
  };

  const to4 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(4);
  };

  const formatVal = (val, decimals = 3) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  useEffect(() => {
    let cancelled = false;
    if (!observations || observations.length === 0) {
      if (localObs.length === 0) {
        const initialRows = Array.from({ length: 3 }).map((_, index) => ({
          id: Date.now() + index, 
          from: "", to: "", s: "", z: "", hi: "", ht: ""
        }));
        const initialize = window.setTimeout(() => {
          if (cancelled) return;
          setLocalObs(initialRows);
          if (setObservations) setObservations(initialRows);
        }, 0);
        return () => {
          cancelled = true;
          window.clearTimeout(initialize);
        };
      }
      return;
    }

    let hasChanges = false;
    const activeId = typeof document !== 'undefined' ? document.activeElement?.id : null;

    const formattedObservations = observations.map((obs, index) => {
      let updatedObs = { ...obs };
      
      const isSFocused = activeId === `input-${index}-s`;
      const isZFocused = activeId === `input-${index}-z`;
      const isHiFocused = activeId === `input-${index}-hi`;
      const isHtFocused = activeId === `input-${index}-ht`;

      if (!isSFocused && obs.s !== "" && obs.s != null) {
        const formattedVal = to3(obs.s);
        if (formattedVal !== String(obs.s)) { updatedObs.s = formattedVal; hasChanges = true; }
      }
      if (!isZFocused && obs.z !== "" && obs.z != null) {
        const formattedVal = to4(obs.z);
        if (formattedVal !== String(obs.z)) { updatedObs.z = formattedVal; hasChanges = true; }
      }
      if (!isHiFocused && obs.hi !== "" && obs.hi != null) {
        const formattedVal = to3(obs.hi);
        if (formattedVal !== String(obs.hi)) { updatedObs.hi = formattedVal; hasChanges = true; }
      }
      if (!isHtFocused && obs.ht !== "" && obs.ht != null) {
        const formattedVal = to3(obs.ht);
        if (formattedVal !== String(obs.ht)) { updatedObs.ht = formattedVal; hasChanges = true; }
      }

      return updatedObs;
    });

    const synchronizedObservations = hasChanges ? formattedObservations : observations;
    const synchronize = window.setTimeout(() => {
      if (cancelled) return;
      setLocalObs(synchronizedObservations);
      if (hasChanges && setObservations) setObservations(synchronizedObservations);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(synchronize);
    };
  }, [observations, setObservations, localObs.length]);

  const updateObsData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localObs) : newData;
    setLocalObs(finalData);
    if (setObservations) setObservations(finalData);
  };

  const handleTrigCalc = async () => {
    setIsLoading(true);
    try {
      const endpoint = noCorrection 
        ? `${API_BASE_URL}/api/traverse_height_no_correction`
        : `${API_BASE_URL}/api/traverse_height`;

      const payload = {
        observations: localObs, 
        stations: stations,
        project_name: typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || ''),
        tolD: parseFloat(tolD) || 0.050,
        tolDH: parseFloat(tolDH) || 0.020,
        no_correction: noCorrection
      };

      const response = await axios.post(endpoint, payload);

      if (response.data && response.data.status === "success") {
        if (response.data.stations && setStations) {
          setStations(response.data.stations);
        }
        if (response.data.observations) {
          updateObsData(response.data.observations);
        }
        setShowTrigResults(true);

        if (response.data.toleranceReport) {
          setToleranceReport(response.data.toleranceReport);
        }

        setTimeout(() => {
          reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);

      } else {
        alert(response.data.error || "Προέκυψε σφάλμα.");
      }
    } catch (error) {
      console.error("Σφάλμα στην Τριγωνομετρική Υψομετρία:", error);
      alert("Αποτυχία σύνδεσης με το backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleObsInputChange = (id, field, value) => updateObsData(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: ['s', 'z', 'hi', 'ht'].includes(field) ? value.replace(/,/g, '.') : value } : obs));
  
  const handleObsBlur = (id, field, value) => {
    if (field === 's' || field === 'hi' || field === 'ht') handleObsInputChange(id, field, to3(value));
    else if (field === 'z') handleObsInputChange(id, field, to4(value));
  };

  const handleKeyDown = (e, index, colName) => {
    const columns = ['from', 'to', 's', 'z', 'hi', 'ht'];
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
      if (nextRow >= 0 && nextRow < localObs.length && nextCol >= 0 && nextCol < columns.length) {
        const nextInput = document.getElementById(`input-${nextRow}-${columns[nextCol]}`);
        if (nextInput) { 
          nextInput.focus(); 
          const valLength = nextInput.value.length;
          nextInput.setSelectionRange(valLength, valLength);
        }
      }
    }
  };

  const addObsRowAt = (index) => {
    const newRow = { id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "" };
    const updated = [...localObs];
    updated.splice(index + 1, 0, newRow);
    updateObsData(updated);
  };

  const removeObsRow = (id) => updateObsData(localObs.filter(o => o.id !== id));

  const getColSpan = () => {
    if (!showTrigResults) return 8;
    return noCorrection ? 6 : 7;
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* === ΕΝΙΑΙΟ ΠΛΑΙΣΙΟ (HEADER & ΠΙΝΑΚΑΣ ΜΑΖΙ) === */}
      <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* HEADER: ΤΙΤΛΟΣ, CHECKBOX & ΡΥΘΜΙΣΕΙΣ ΑΝΟΧΩΝ */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-[#0b1120] z-40 relative flex-wrap gap-3">
          <h3 className="text-[11px] font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0 uppercase">
            <Target size={14} className="text-blue-400" />
            1. Πίνακας Παρατηρήσεων
          </h3>
          
          <div className="flex items-center gap-4 border-l border-slate-800/60 pl-4">
            
            {/* ΕΠΙΛΟΓΗ 2: GLASSMORPHIC PILL BUTTON */}
            <button
              type="button"
              onClick={() => setNoCorrection(!noCorrection)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer select-none ${
                noCorrection 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-colors ${noCorrection ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>Χωρίς διόρθωση</span>
            </button>

            <div className="flex items-center gap-2 border-l border-slate-800/60 pl-4">
              <Settings2 size={14} className="text-slate-500" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ορια Ανοχης:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-mono">D [m]</label>
              <input 
                type="text" 
                value={tolD} 
                onChange={(e) => setTolD(e.target.value.replace(/,/g, '.'))}
                className="bg-slate-900 border border-slate-700 text-amber-400 text-xs text-center rounded-md w-14 h-7 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 font-mono">ΔH [m]</label>
              <input 
                type="text" 
                value={tolDH} 
                onChange={(e) => setTolDH(e.target.value.replace(/,/g, '.'))}
                className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs text-center rounded-md w-14 h-7 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* ΠΙΝΑΚΑΣ */}
        <div className="overflow-y-auto custom-scrollbar h-fit max-h-[600px]">
          <table className="w-full text-left border-collapse table-auto relative">
            <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
              <tr className="border-b border-slate-800/50">
                <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center w-20">From</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center w-20">To</th>
                
                {!showTrigResults && (
                  <>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">D [m]</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Z [grad]</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">H station [m]</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">H target [m]</th>
                  </>
                )}
                
                {showTrigResults && (
                  <>
                    <th className="p-4 text-[10px] font-black text-purple-400/80 tracking-widest text-center">ΔΗ (αρχικό) [m]</th>
                    
                    {!noCorrection && (
                      <th className="p-4 text-[10px] font-black text-rose-400/80 tracking-widest text-center">Διόρθωση [m]</th>
                    )}

                    <th className="p-4 text-[10px] font-black text-amber-400/80 tracking-widest text-center">ΔΗ (τελικό) [m]</th>
                  </>
                )}
                
                <th className="p-3 w-24">
                  <div className="flex justify-end pr-2 gap-2">
                    {showTrigResults && (
                      <button 
                        onClick={() => setShowTrigResults(false)}
                        className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 bg-gradient-to-r from-slate-500/10 to-slate-400/10 border border-slate-500/30 cursor-pointer hover:bg-slate-700"
                        title="Επιστροφή στην επεξεργασία (Εμφάνιση Αρχικών)"
                      >
                        <ArrowLeft size={14} className="text-slate-400" />
                      </button>
                    )}
                    <button 
                      onClick={handleTrigCalc}
                      disabled={isLoading}
                      className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                        isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      }`}
                      title="Υπολογισμός Υψομέτρων"
                    >
                      {isLoading ? <Cpu size={14} className="animate-spin text-emerald-500" /> : <Play size={14} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {localObs.length > 0 ? (
                localObs.map((obs, index) => (
                  <React.Fragment key={obs.id || index}>
                    <tr className="group hover:bg-slate-800/20 transition-all">
                      <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                      <td className="p-2"><input id={`input-${index}-from`} className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" value={obs.from} onChange={(e) => handleObsInputChange(obs.id, 'from', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'from')} placeholder="-" disabled={showTrigResults} /></td>
                      <td className="p-2"><input id={`input-${index}-to`} className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" value={obs.to} onChange={(e) => handleObsInputChange(obs.id, 'to', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'to')} placeholder="-" disabled={showTrigResults} /></td>
                      
                      {!showTrigResults && (
                        <>
                          <td className="p-2"><input id={`input-${index}-s`} className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.s} onBlur={(e) => handleObsBlur(obs.id, 's', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 's', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 's')} placeholder="-" /></td>
                          <td className="p-2"><input id={`input-${index}-z`} className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.z} onBlur={(e) => handleObsBlur(obs.id, 'z', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'z', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'z')} placeholder="-" /></td>
                          <td className="p-2"><input id={`input-${index}-hi`} className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.hi} onBlur={(e) => handleObsBlur(obs.id, 'hi', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'hi', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'hi')} placeholder="-" /></td>
                          <td className="p-2"><input id={`input-${index}-ht`} className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.ht} onBlur={(e) => handleObsBlur(obs.id, 'ht', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'ht', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'ht')} placeholder="-" /></td>
                        </>
                      )}

                      {showTrigResults && (
                        <>
                          <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none text-purple-400 cursor-default" value={formatVal(obs.dh_mean ?? obs.dh, 3)} disabled placeholder="-" /></td>
                          
                          {!noCorrection && (
                            <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none text-rose-400 cursor-default" value={formatVal(obs.corr, 3)} disabled placeholder="-" /></td>
                          )}

                          <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none text-amber-400 cursor-default" value={formatVal(obs.dh_final ?? obs.dh_mean ?? obs.dh, 3)} disabled placeholder="-" /></td>
                        </>
                      )}

                      <td className="p-4 text-right">
                        <button onClick={() => removeObsRow(obs.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                    <tr className="h-0 p-0">
                      <td colSpan={getColSpan()} className="p-0 h-0 relative">
                        <button onClick={() => addObsRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"><PlusCircle size={16} /></button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={getColSpan()} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-4">
                      <Database size={28} className="opacity-50" />
                      <span className="text-sm">Δεν βρέθηκαν δεδομένα</span>
                      <button onClick={() => updateObsData([{ id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "" }])} className="flex items-center gap-2 px-4 py-2 mt-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all text-xs font-bold cursor-pointer"><PlusCircle size={16} /> Προσθήκη</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ΣΤΑΤΙΣΤΙΚΑ / ΕΛΕΓΧΟΣ ΑΝΟΧΩΝ */}
      {showTrigResults && toleranceReport && (
        <div 
          ref={reportRef}
          className={`mt-2 p-5 rounded-xl border flex flex-col gap-4 shadow-2xl transition-all duration-500 ${
            toleranceReport.hasErrors 
              ? "bg-rose-950/20 border-rose-900/50" 
              : "bg-emerald-950/20 border-emerald-900/50"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-slate-800/50 pb-3">
            {toleranceReport.hasErrors ? (
              <AlertTriangle size={18} className="text-rose-500" />
            ) : (
              <CheckCircle size={18} className="text-emerald-500" />
            )}
            <span className="text-[11px] font-black text-slate-300 tracking-[0.2em] uppercase">
              Ελεγχος Ανοχων Μεταβασης - Επιστροφης
            </span>
          </div>

          {toleranceReport.hasErrors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {toleranceReport.errors.map((err, idx) => (
                <div key={idx} className="bg-[#0b1120]/80 p-3 rounded-lg border border-rose-500/20 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-black tracking-wider">ΠΛΕΥΡΑ: <span className="text-slate-200">{err.edge}</span></span>
                    <span className="text-[10px] text-slate-500">Σφάλμα {err.type === 'ΔH' ? 'Υψομετρικής (ΔH)' : 'Απόστασης (D)'}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right border-l border-slate-800/50 pl-4">
                    <span className="text-xs font-mono font-bold text-rose-400">{err.diff} m</span>
                    <span className="text-[9px] font-mono text-slate-500">Όριο: {err.limit} m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <span className="text-sm font-bold text-emerald-400/90 tracking-wide">
                Όλες οι μετρήσεις βρίσκονται εντός των επιτρεπτών ορίων ανοχής.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TraverseTrigLevel;