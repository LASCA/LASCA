import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Target, MapPin, Database, PlusCircle, Trash2, Play, Cpu, Ruler, Activity, Info 
} from 'lucide-react';

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

const TraverseHeight = ({ 
  observations = [], 
  setObservations,   
  stations = [],
  setStations,
  projectSettings,
  forwardData = [], setForwardData,
  backwardData = [], setBackwardData,
  metrics = {}, setMetrics
}) => {
  // --- ΕΣΩΤΕΡΙΚΑ STATES ---
  const [calcMethod, setCalcMethod] = useState('trigonometric'); // 'trigonometric' | 'geometric'
  const [isLoading, setIsLoading] = useState(false);

  // --- STATES ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ --- 
  const [localObs, setLocalObs] = useState([]);
  const [localStations, setLocalStations] = useState([]);

  // --- STATES ΓΕΩΜΕΤΡΙΚΗΣ ΧΩΡΟΣΤΑΘΜΙΣΗΣ ---
  const [geoActiveTab, setGeoActiveTab] = useState('forward');
  const [localForward, setLocalForward] = useState([]);
  const [localBackward, setLocalBackward] = useState([]);
  const [localMetrics, setLocalMetrics] = useState({});

  // --- FORMATTING HELPERS ---
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

  // --- SYNC ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ ---
  useEffect(() => {
    if (observations && observations.length > 0) {
      setLocalObs(observations.map(obs => ({
        ...obs,
        s: to3(obs.s),
        z: to4(obs.z),
        hi: to3(obs.hi),
        ht: to3(obs.ht)
      })));
    } else if (localObs.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + index, 
        from: "", to: "", s: "", z: "", hi: "", ht: ""
      }));
      setLocalObs(initialRows);
      if (setObservations) setObservations(initialRows);
    }
  }, [observations]);

  useEffect(() => {
    if (stations && stations.length > 0) {
      setLocalStations(stations.map(st => ({ ...st, h: to3(st.h) })));
    } else if (localStations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + 1000 + index, 
        name: "", h: ""
      }));
      setLocalStations(initialRows);
      if (setStations) setStations(initialRows);
    }
  }, [stations]);

  // --- SYNC ΓΕΩΜΕΤΡΙΚΗΣ ---
  useEffect(() => {
    if (forwardData && forwardData.length > 0) setLocalForward(forwardData);
    if (backwardData && backwardData.length > 0) setLocalBackward(backwardData);
    if (metrics && Object.keys(metrics).length > 0) setLocalMetrics(metrics);
  }, [forwardData, backwardData, metrics]);

  // --- HANDLERS ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ ---
  const updateObsData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localObs) : newData;
    setLocalObs(finalData);
    if (setObservations) setObservations(finalData);
  };

  const updateStationsData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localStations) : newData;
    setLocalStations(finalData);
    if (setStations) setStations(finalData);
  };

  const handleTrigCalc = async () => {
    setIsLoading(true);
    try {
      const payload = {
        observations: localObs, 
        stations: localStations,
        project_name: typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || '')
      };

      const response = await axios.post('http://127.0.0.1:5000/api/traverse_height', payload);

      if (response.data && response.data.status === "success") {
        updateStationsData(response.data.stations);
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

  const handleObsInputChange = (id, field, value) => updateObsData(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: value } : obs));
  const handleObsBlur = (id, field, value) => {
    if (field === 's' || field === 'hi' || field === 'ht') handleObsInputChange(id, field, to3(value));
    else if (field === 'z') handleObsInputChange(id, field, to4(value));
  };
  const addObsRowAt = (index) => {
    const newRow = { id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "" };
    const updated = [...localObs];
    updated.splice(index + 1, 0, newRow);
    updateObsData(updated);
  };
  const removeObsRow = (id) => updateObsData(localObs.filter(o => o.id !== id));

  // --- HANDLERS ΣΤΑΘΜΩΝ ---
  const handleStationChange = (id, field, value) => updateStationsData(prev => prev.map(st => st.id === id ? { ...st, [field]: value } : st));
  const handleStationBlur = (id, field, value) => { if (field === 'h') handleStationChange(id, field, to3(value)); };
  const addStationRowAt = (index) => {
    const newRow = { id: Date.now(), name: "", h: "" };
    const updated = [...localStations];
    updated.splice(index + 1, 0, newRow);
    updateStationsData(updated);
  };
  const removeStationRow = (id) => updateStationsData(localStations.filter(o => o.id !== id));

  // --- HANDLERS ΓΕΩΜΕΤΡΙΚΗΣ ΧΩΡΟΣΤΑΘΜΙΣΗΣ ---
  const currentGeoData = geoActiveTab === 'forward' ? localForward : localBackward;
  const setGeoCurrentData = (newData) => {
    if (geoActiveTab === 'forward') {
      setLocalForward(newData);
      if (setForwardData) setForwardData(newData);
    } else {
      setLocalBackward(newData);
      if (setBackwardData) setBackwardData(newData);
    }
  };

  const geoHasResults = currentGeoData && currentGeoData.some(row => row.dh !== undefined && row.dh !== null && row.dh !== "");

  const handleGeoInputChange = (index, field, value) => {
    const newData = [...currentGeoData];
    newData[index] = { ...newData[index], [field]: value };
    setGeoCurrentData(newData);
  };

  const deleteGeoRow = (idx) => {
    const newData = [...currentGeoData];
    newData.splice(idx, 1);
    setGeoCurrentData(newData);
  };

  const addGeoRowAt = (index) => {
    const newRow = {
      point: "", backsight: "", bs_upper: "", bs_lower: "", bs_s: "",
      foresight: "", fs_upper: "", fs_lower: "", fs_s: ""
    };
    const newData = [...currentGeoData];
    newData.splice(index + 1, 0, newRow);
    setGeoCurrentData(newData);
  };

  const handleGeoKeyDown = (e, rowIndex, colName) => {
    const columns = geoHasResults 
      ? ['point', 'backsight', 'bs_upper', 'bs_lower', 'bs_s', 'foresight', 'fs_upper', 'fs_lower', 'fs_s', 'dh', 'elev_backward', 'elevation']
      : ['point', 'backsight', 'bs_upper', 'bs_lower', 'bs_s', 'foresight', 'fs_upper', 'fs_lower', 'fs_s'];
      
    const colIndex = columns.indexOf(colName);
    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = rowIndex + 1; shouldMove = true; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = rowIndex - 1; shouldMove = true; }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { e.preventDefault(); nextCol = colIndex - 1; shouldMove = true; }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { e.preventDefault(); nextCol = colIndex + 1; shouldMove = true; }

    if (shouldMove && nextRow >= 0 && nextRow < currentGeoData.length && nextCol >= 0 && nextCol < columns.length) {
      const nextInput = document.getElementById(`input-leveling-${nextRow}-${columns[nextCol]}`);
      if (nextInput) { nextInput.focus(); setTimeout(() => nextInput.select(), 0); }
    }
  };

  const handleRunLeveling = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/leveling', {
        forward: localForward,
        backward: localBackward
      }, {
        headers: {
          'Active-Project': typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || '')
        }
      });

      if (response.data) {
        if (response.data.forward_results) {
          setLocalForward(response.data.forward_results);
          if (setForwardData) setForwardData(response.data.forward_results);
        }
        if (response.data.backward_results) {
          setLocalBackward(response.data.backward_results);
          if (setBackwardData) setBackwardData(response.data.backward_results);
        }
        if (response.data.metrics) {
          setLocalMetrics(response.data.metrics);
          if (setMetrics) setMetrics(response.data.metrics);
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
    <div className="flex flex-col h-full relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `
      }} />

      {/* ΔΙΑΚΟΠΤΗΣ ΕΠΙΛΟΓΗΣ ΜΕΘΟΔΟΥ */}
      <div className="flex justify-start mb-4">
        <div className="flex bg-[#030712] border border-slate-800/80 p-1 rounded-lg">
          <button
            onClick={() => setCalcMethod('trigonometric')}
            className={`px-6 py-2 rounded-md text-xs font-black tracking-wider transition-all cursor-pointer ${
              calcMethod === 'trigonometric'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            1. Τριγωνομετρική Υψομετρία
          </button>
          <button
            onClick={() => setCalcMethod('geometric')}
            className={`px-6 py-2 rounded-md text-xs font-black tracking-wider transition-all cursor-pointer ${
              calcMethod === 'geometric'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            2. Γεωμετρική Χωροστάθμιση
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[2.5fr_1fr] gap-6 flex-1 min-h-0 overflow-hidden pb-4">
        
        {/* ==================================================== */}
        {/* === ΑΡΙΣΤΕΡΟ ΜΕΡΟΣ (ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ Η ΓΕΩΜΕΤΡΙΚΗ) === */}
        {/* ==================================================== */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full overflow-y-auto custom-scrollbar pr-1">
          
          {calcMethod === 'trigonometric' ? (
            /* --- ΠΙΝΑΚΑΣ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ --- */
            <>
              <h3 className="text-[11px] font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0">
                <Target size={14} className="text-blue-400" />
                1. Πίνακας Παρατηρήσεων (Τριγωνομετρική)
              </h3>
              <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl h-fit max-h-full flex flex-col relative overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse table-auto relative">
                    <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
                      <tr className="border-b border-slate-800/50">
                        <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center w-20">From</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center w-20">To</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Slope D [m]</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Z [grad]</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">H station [m]</th>
                        <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">H target [m]</th>
                        <th className="p-3 w-16">
                          <div className="flex justify-end pr-2 gap-2">
                            <button 
                              onClick={handleTrigCalc}
                              disabled={isLoading}
                              className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                                isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 cursor-pointer'
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
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" value={obs.from} onChange={(e) => handleObsInputChange(obs.id, 'from', e.target.value)} placeholder="-" /></td>
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" value={obs.to} onChange={(e) => handleObsInputChange(obs.id, 'to', e.target.value)} placeholder="-" /></td>
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.s} onBlur={(e) => handleObsBlur(obs.id, 's', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 's', e.target.value)} placeholder="-" /></td>
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.z} onBlur={(e) => handleObsBlur(obs.id, 'z', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'z', e.target.value)} placeholder="-" /></td>
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.hi} onBlur={(e) => handleObsBlur(obs.id, 'hi', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'hi', e.target.value)} placeholder="-" /></td>
                              <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={obs.ht} onBlur={(e) => handleObsBlur(obs.id, 'ht', e.target.value)} onChange={(e) => handleObsInputChange(obs.id, 'ht', e.target.value)} placeholder="-" /></td>
                              <td className="p-4 text-right">
                                <button onClick={() => removeObsRow(obs.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={15} /></button>
                              </td>
                            </tr>
                            <tr className="h-0 p-0"><td colSpan={8} className="p-0 h-0 relative"><button onClick={() => addObsRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"><PlusCircle size={16} /></button></td></tr>
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-16 text-center text-slate-500">
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
            </>
          ) : (
            /* --- ΠΛΗΡΕΣ UI ΓΕΩΜΕΤΡΙΚΗΣ ΧΩΡΟΣΤΑΘΜΙΣΗΣ (ΟΠΩΣ ΤΟ LEVELING.JSX) --- */
            <div className="flex flex-col gap-6 min-h-0 flex-1">
              
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
                          onClick={() => setGeoActiveTab('forward')}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                            geoActiveTab === 'forward'
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          1. Μετάβαση
                        </button>
                        <button
                          onClick={() => setGeoActiveTab('backward')}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                            geoActiveTab === 'backward'
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
                        <th className={`p-2 text-[10px] font-black text-slate-500 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[4%]' : 'w-[5%]'}`}>#</th>
                        <th className={`p-2 text-[10px] font-black text-slate-400 tracking-widest border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[14%]' : 'w-[17%]'}`}>Σημείο Σκόπευσης</th>
                        
                        {/* Οπισθοσκόπευση Group */}
                        <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[9%]' : 'w-[13%]'}`}>οπισθο-<br/>σκόπευση</th>
                        <th className={`p-0 text-[9px] font-bold text-blue-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                          <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                          <div className="py-1.5">κάτω</div>
                        </th>
                        <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                        
                        {/* Εμπροσθοσκόπευση Group */}
                        <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[9%]' : 'w-[13%]'}`}>εμπροσθο-<br/>σκόπευση</th>
                        <th className={`p-0 text-[9px] font-bold text-orange-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                          <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                          <div className="py-1.5">κάτω</div>
                        </th>
                        <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                        
                        {/* Results Headers */}
                        {geoHasResults && (
                          <>
                            <th className="w-[12%] p-2 text-[10px] font-black text-purple-500/80 tracking-widest text-right align-middle">Υψομετρική<br/>Διαφορά</th>
                            <th className="w-[12%] p-2 text-[10px] font-black text-rose-400/80 tracking-widest text-right align-middle">Υψόμετρα από<br/>Επιστροφή</th>
                            <th className="w-[12%] p-2 text-[10px] font-black text-amber-500/80 tracking-widest text-right align-middle">Τελικά<br/>Υψόμετρα</th>
                          </>
                        )}
                        <th className="w-[30px] p-0 border-l border-slate-800/30"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 bg-[#070c19]/20 relative">
                      {currentGeoData && currentGeoData.length > 0 ? (
                        currentGeoData.map((row, idx) => (
                          <React.Fragment key={idx}>
                            <tr className="hover:bg-slate-800/30 active:bg-slate-800/50 transition-all duration-150 group relative">
                              <td className="p-2 text-center text-[10px] text-slate-600 font-mono font-bold border-r border-slate-800/30">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-800/30">
                                <input 
                                  id={`input-leveling-${idx}-point`}
                                  type="text"
                                  value={row.point ?? ""}
                                  onChange={(e) => handleGeoInputChange(idx, 'point', e.target.value)}
                                  onKeyDown={(e) => handleGeoKeyDown(e, idx, 'point')}
                                  className="bg-transparent w-full font-bold text-slate-400 group-hover:text-cyan-400 text-sm tracking-tight outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-slate-500 rounded px-1 py-2 transition-all"
                                />
                              </td>
                              
                              <td className="p-2 border-r border-slate-800/30">
                                <input 
                                  id={`input-leveling-${idx}-backsight`}
                                  type="text"
                                  value={row.backsight ?? ""}
                                  onChange={(e) => handleGeoInputChange(idx, 'backsight', e.target.value)}
                                  onBlur={(e) => handleGeoInputChange(idx, 'backsight', formatVal(e.target.value, 3))}
                                  onKeyDown={(e) => handleGeoKeyDown(e, idx, 'backsight')}
                                  className="bg-transparent w-full font-mono text-blue-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 rounded px-1 py-2 transition-all"
                                />
                              </td>
                              <td className="p-0 border-r border-slate-800/30">
                                <div className="flex flex-col h-full">
                                  <input 
                                    id={`input-leveling-${idx}-bs_upper`}
                                    type="text"
                                    value={row.bs_upper ?? ""}
                                    onChange={(e) => handleGeoInputChange(idx, 'bs_upper', e.target.value)}
                                    onBlur={(e) => handleGeoInputChange(idx, 'bs_upper', formatVal(e.target.value, 3))}
                                    onKeyDown={(e) => handleGeoKeyDown(e, idx, 'bs_upper')}
                                    className="bg-transparent w-full font-mono text-blue-300/60 text-center text-[11px] outline-none px-1 py-1.5 border-b border-slate-800/50 border-dashed focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                  />
                                  <input 
                                    id={`input-leveling-${idx}-bs_lower`}
                                    type="text"
                                    value={row.bs_lower ?? ""}
                                    onChange={(e) => handleGeoInputChange(idx, 'bs_lower', e.target.value)}
                                    onBlur={(e) => handleGeoInputChange(idx, 'bs_lower', formatVal(e.target.value, 3))}
                                    onKeyDown={(e) => handleGeoKeyDown(e, idx, 'bs_lower')}
                                    className="bg-transparent w-full font-mono text-blue-300/60 text-center text-[11px] outline-none px-1 py-1.5 focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                  />
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-800/30">
                                <input 
                                  id={`input-leveling-${idx}-bs_s`}
                                  type="text"
                                  value={row.bs_s ?? ""}
                                  onChange={(e) => handleGeoInputChange(idx, 'bs_s', e.target.value)}
                                  onKeyDown={(e) => handleGeoKeyDown(e, idx, 'bs_s')}
                                  className="bg-transparent w-full font-mono text-blue-300/80 text-center text-[12px] font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 rounded px-1 py-2 transition-all"
                                />
                              </td>

                              {/* ΕΜΠΡΟΣΘΟΣΚΟΠΕΥΣΗ (ΓΚΡΙΖΑΡΙΣΜΕΝΗ ΣΤΗΝ 1Η ΓΡΑΜΜΗ) */}
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
                                      onChange={(e) => handleGeoInputChange(idx, 'foresight', e.target.value)}
                                      onBlur={(e) => handleGeoInputChange(idx, 'foresight', formatVal(e.target.value, 3))}
                                      onKeyDown={(e) => handleGeoKeyDown(e, idx, 'foresight')}
                                      className="bg-transparent w-full font-mono text-orange-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 rounded px-1 py-2 transition-all"
                                    />
                                  </td>
                                  <td className="p-0 border-r border-slate-800/30">
                                    <div className="flex flex-col h-full">
                                      <input 
                                        id={`input-leveling-${idx}-fs_upper`}
                                        type="text"
                                        value={row.fs_upper ?? ""}
                                        onChange={(e) => handleGeoInputChange(idx, 'fs_upper', e.target.value)}
                                        onBlur={(e) => handleGeoInputChange(idx, 'fs_upper', formatVal(e.target.value, 3))}
                                        onKeyDown={(e) => handleGeoKeyDown(e, idx, 'fs_upper')}
                                        className="bg-transparent w-full font-mono text-orange-300/60 text-center text-[11px] outline-none px-1 py-1.5 border-b border-slate-800/50 border-dashed focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                      />
                                      <input 
                                        id={`input-leveling-${idx}-fs_lower`}
                                        type="text"
                                        value={row.fs_lower ?? ""}
                                        onChange={(e) => handleGeoInputChange(idx, 'fs_lower', e.target.value)}
                                        onBlur={(e) => handleGeoInputChange(idx, 'fs_lower', formatVal(e.target.value, 3))}
                                        onKeyDown={(e) => handleGeoKeyDown(e, idx, 'fs_lower')}
                                        className="bg-transparent w-full font-mono text-orange-300/60 text-center text-[11px] outline-none px-1 py-1.5 focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2 border-r border-slate-800/30">
                                    <input 
                                      id={`input-leveling-${idx}-fs_s`}
                                      type="text"
                                      value={row.fs_s ?? ""}
                                      onChange={(e) => handleGeoInputChange(idx, 'fs_s', e.target.value)}
                                      onKeyDown={(e) => handleGeoKeyDown(e, idx, 'fs_s')}
                                      className="bg-transparent w-full font-mono text-orange-300/80 text-center text-[12px] font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-orange-500/50 rounded px-1 py-2 transition-all"
                                    />
                                  </td>
                                </>
                              )}

                              {geoHasResults && (
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
                                  onClick={() => deleteGeoRow(idx)} 
                                  className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                  title="Διαγραφή Σημείου"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>

                            <tr className="h-0 p-0">
                              <td colSpan={geoHasResults ? 12 : 9} className="p-0 h-0 relative">
                                <button 
                                  onClick={() => addGeoRowAt(idx)} 
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
                          <td colSpan={geoHasResults ? 12 : 9} className="p-24 text-center">
                            <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
                              <Info size={30} className="text-slate-500 mx-auto mb-3" />
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Αναμονή Δεδομένων Χωροστάθμισης</p>
                              <button 
                                onClick={() => addGeoRowAt(-1)} 
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
                      sumBS={localMetrics?.forward?.sum_backsights} sumBS_S={localMetrics?.forward?.sum_bs_s}
                      sumFS={localMetrics?.forward?.sum_foresights} sumFS_S={localMetrics?.forward?.sum_fs_s}
                      dh={localMetrics?.forward?.dh} totalS={localMetrics?.forward?.total_s}
                      themeColor="blue"
                    />
                  </div>

                  <div className="flex-1">
                    <DirectionStatsGroup 
                      title="2. Επιστροφή"
                      sumBS={localMetrics?.backward?.sum_backsights} sumBS_S={localMetrics?.backward?.sum_bs_s}
                      sumFS={localMetrics?.backward?.sum_foresights} sumFS_S={localMetrics?.backward?.sum_fs_s}
                      dh={localMetrics?.backward?.dh} totalS={localMetrics?.backward?.total_s}
                      themeColor="orange"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between w-full">
                  <div className="flex flex-1 divide-x divide-slate-800/50">
                    <div className="flex-1 flex flex-col gap-1 pr-4">
                      <span className="text-[12px] text-slate-500 font-black tracking-tighter">S ολικο (Sμετ.+Sεπιστρ)/2</span>
                      <span className="text-sm font-mono font-bold text-slate-200">
                        {localMetrics?.forward && localMetrics?.backward 
                          ? ((localMetrics.forward.total_s + localMetrics.backward.total_s) / 2).toFixed(2) 
                          : "---"}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 px-4">
                      <span className="text-[12px] text-slate-500 font-black tracking-tighter">w = δh μεταβασης - δh επιστροφης</span>
                      {(() => {
                        const hasMetrics = localMetrics?.forward && localMetrics?.backward && localMetrics?.error_dh !== undefined;
                        let isOk = false;
                        if (hasMetrics) {
                          const totalMeanS = (localMetrics.forward.total_s + localMetrics.backward.total_s) / 2;
                          const errorLimit = 12 * Math.sqrt(totalMeanS / 1000);
                          const dhDiffMm = Math.abs(localMetrics.error_dh * 1000);
                          isOk = dhDiffMm <= errorLimit;
                        }
                        return (
                          <span className={`text-sm font-mono font-bold ${!hasMetrics ? 'text-slate-500' : isOk ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {hasMetrics ? localMetrics.error_dh : "---"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 px-4">
                      <span className="text-[12px] text-slate-500 font-black tracking-tighter">
                        Όριο σφάλματος w<sub>max</sub> (mm)
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-300">
                        {localMetrics?.forward && localMetrics?.backward 
                          ? (6 * 1.96 * Math.sqrt(((localMetrics.forward.total_s + localMetrics.backward.total_s) / 2) / 1000)).toFixed(2)
                          : "---"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* === ΔΕΞΙ ΜΕΡΟΣ (ΣΤΑΘΕΡΟ: ΠΙΝΑΚΑΣ ΣΤΑΣΕΩΝ) === */}
        {/* ========================================= */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full">
          <h3 className="text-[11px] font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0">
            <MapPin size={14} className="text-emerald-400" />
            2. Πίνακας Στάσεων
          </h3>
          <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl h-fit max-h-full flex flex-col relative overflow-hidden">
            <div className="overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-auto relative">
                <thead className="sticky top-0 bg-[#0F172A] border-b border-slate-800/50 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Στάση</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Υψόμετρο H (m)</th>
                    <th className="px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {localStations.length > 0 ? (
                    localStations.map((st, index) => (
                      <React.Fragment key={st.id || index}>
                        <tr className="group hover:bg-slate-800/20 transition-colors">
                          <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" value={st.name} onChange={(e) => handleStationChange(st.id, 'name', e.target.value)} placeholder="-" /></td>
                          <td className="p-2"><input className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" value={st.h} onBlur={(e) => handleStationBlur(st.id, 'h', e.target.value)} onChange={(e) => handleStationChange(st.id, 'h', e.target.value)} placeholder="-" /></td>
                          <td className="p-4 text-right"><button onClick={() => removeStationRow(st.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={15} /></button></td>
                        </tr>
                        <tr className="h-0 p-0"><td colSpan={3} className="p-0 h-0 relative"><button onClick={() => addStationRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-emerald-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"><PlusCircle size={16} /></button></td></tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-4">
                          <MapPin size={28} className="opacity-50" />
                          <span className="text-sm">Δεν υπάρχουν σταθμοί</span>
                          <button onClick={() => updateStationsData([{ id: Date.now(), name: "", h: "" }])} className="flex items-center gap-2 px-4 py-2 mt-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all text-xs font-bold cursor-pointer"><PlusCircle size={16} /> Προσθήκη</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TraverseHeight;