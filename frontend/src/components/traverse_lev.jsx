import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { Ruler, PlusCircle, Trash2, Play, Cpu, Activity, Info, ArrowLeft } from 'lucide-react';

// Εικονικά Δεδομένα Μετάβασης (Forward Path)
const mockForwardData = [
  { point: "Σ7", backsight: "1.500", bs_upper: "1.625", bs_lower: "1.375", bs_s: "25.00", foresight: "", fs_upper: "", fs_lower: "", fs_s: "" },
  { point: "Σ6", backsight: "1.450", bs_upper: "1.560", bs_lower: "1.340", bs_s: "22.00", foresight: "2.503", fs_upper: "2.628", fs_lower: "2.378", fs_s: "25.00" },
  { point: "S1", backsight: "1.600", bs_upper: "1.710", bs_lower: "1.490", bs_s: "22.00", foresight: "1.510", fs_upper: "1.620", fs_lower: "1.400", fs_s: "22.00" },
  { point: "S2", backsight: "1.350", bs_upper: "1.470", bs_lower: "1.230", bs_s: "24.00", foresight: "2.930", fs_upper: "3.040", fs_lower: "2.820", fs_s: "22.00" },
  { point: "S3", backsight: "1.720", bs_upper: "1.840", bs_lower: "1.600", bs_s: "24.00", foresight: "0.559", fs_upper: "0.679", fs_lower: "0.439", fs_s: "24.00" },
  { point: "S4", backsight: "1.800", bs_upper: "1.920", bs_lower: "1.680", bs_s: "24.00", foresight: "0.478", fs_upper: "0.598", fs_lower: "0.358", fs_s: "24.00" },
  { point: "S5", backsight: "1.250", bs_upper: "1.350", bs_lower: "1.150", bs_s: "20.00", foresight: "1.091", fs_upper: "1.211", fs_lower: "0.971", fs_s: "24.00" },
  { point: "S6", backsight: "3.800", bs_upper: "3.900", bs_lower: "3.700", bs_s: "20.00", foresight: "1.656", fs_upper: "1.756", fs_lower: "1.556", fs_s: "20.00" },
  { point: "S7", backsight: "1.100", bs_upper: "1.200", bs_lower: "1.000", bs_s: "20.00", foresight: "6.598", fs_upper: "6.698", fs_lower: "6.498", fs_s: "20.00" },
  { point: "S8", backsight: "1.550", bs_upper: "1.650", bs_lower: "1.450", bs_s: "20.00", foresight: "0.851", fs_upper: "0.951", fs_lower: "0.751", fs_s: "20.00" },
  { point: "5",  backsight: "1.700", bs_upper: "1.800", bs_lower: "1.600", bs_s: "20.00", foresight: "0.675", fs_upper: "0.775", fs_lower: "0.575", fs_s: "20.00" },
  { point: "S9", backsight: "1.600", bs_upper: "1.700", bs_lower: "1.500", bs_s: "20.00", foresight: "1.094", fs_upper: "1.194", fs_lower: "0.994", fs_s: "20.00" },
  { point: "Σ6", backsight: "1.800", bs_upper: "1.900", bs_lower: "1.700", bs_s: "20.00", foresight: "1.558", fs_upper: "1.658", fs_lower: "1.458", fs_s: "20.00" },
  { point: "Σ7", backsight: "",      bs_upper: "",      bs_lower: "",      bs_s: "",      foresight: "0.797", fs_upper: "0.897", fs_lower: "0.697", fs_s: "20.00" }
];

// Εικονικά Δεδομένα Επιστροφής (Backward Path)
const mockBackwardData = [
  { point: "Σ7", backsight: "2.503", bs_upper: "2.603", bs_lower: "2.403", bs_s: "20.00", foresight: "", fs_upper: "", fs_lower: "", fs_s: "" },
  { point: "Σ6", backsight: "1.510", bs_upper: "1.610", bs_lower: "1.410", bs_s: "20.00", foresight: "1.500", fs_upper: "1.600", fs_lower: "1.400", fs_s: "20.00" },
  { point: "S9", backsight: "1.842", bs_upper: "1.942", bs_lower: "1.742", bs_s: "20.00", foresight: "1.800", fs_upper: "1.900", fs_lower: "1.700", fs_s: "20.00" },
  { point: "5",  backsight: "2.206", bs_upper: "2.306", bs_lower: "2.106", bs_s: "20.00", foresight: "1.600", fs_upper: "1.700", fs_lower: "1.500", fs_s: "20.00" },
  { point: "S8", backsight: "2.575", bs_upper: "2.675", bs_lower: "2.475", bs_s: "20.00", foresight: "1.700", fs_upper: "1.800", fs_lower: "1.600", fs_s: "20.00" },
  { point: "S7", backsight: "1.301", bs_upper: "1.401", bs_lower: "1.201", bs_s: "20.00", foresight: "1.550", fs_upper: "1.650", fs_lower: "1.450", fs_s: "20.00" },
  { point: "S6", backsight: "1.002", bs_upper: "1.102", bs_lower: "0.902", bs_s: "20.00", foresight: "3.800", fs_upper: "3.900", fs_lower: "3.700", fs_s: "20.00" },
  { point: "S5", backsight: "0.844", bs_upper: "0.944", bs_lower: "0.744", bs_s: "20.00", foresight: "1.250", fs_upper: "1.350", fs_lower: "1.150", fs_s: "20.00" },
  { point: "S4", backsight: "2.509", bs_upper: "2.609", bs_lower: "2.409", bs_s: "20.00", foresight: "1.800", fs_upper: "1.900", fs_lower: "1.700", fs_s: "20.00" },
  { point: "S3", backsight: "3.042", bs_upper: "3.142", bs_lower: "2.942", bs_s: "20.00", foresight: "1.720", fs_upper: "1.820", fs_lower: "1.620", fs_s: "20.00" },
  { point: "S2", backsight: "0.559", bs_upper: "0.659", bs_lower: "0.459", bs_s: "20.00", foresight: "1.350", fs_upper: "1.450", fs_lower: "1.250", fs_s: "20.00" },
  { point: "S1", backsight: "2.930", bs_upper: "3.030", bs_lower: "2.830", bs_s: "20.00", foresight: "1.600", fs_upper: "1.700", fs_lower: "1.500", fs_s: "20.00" },
  { point: "Σ6", backsight: "1.510", bs_upper: "1.610", bs_lower: "1.410", bs_s: "20.00", foresight: "1.450", fs_upper: "1.550", fs_lower: "1.350", fs_s: "20.00" },
  { point: "Σ7", backsight: "",      bs_upper: "",      bs_lower: "",      bs_s: "",      foresight: "1.500", fs_upper: "1.600", fs_lower: "1.400", fs_s: "20.00" }
];

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

const TraverseLeveling = ({
  forwardData = [], setForwardData,
  backwardData = [], setBackwardData,
  metrics = {}, setMetrics,
  projectSettings,
  onLevelingComplete // <-- 1. ΠΡΟΣΘΗΚΗ ΤΟΥ ΝΕΟΥ PROP ΕΔΩ
}) => {
  const projectName = typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || 'default');
  const storageKey = `traverse_leveling_${projectName}`;

  const getStoredState = (key, fallback) => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) { console.error("Σφάλμα ανάγνωσης LocalStorage", e); }
    return fallback;
  };

  const [geoActiveTab, setGeoActiveTab] = useState(() => getStoredState('geoActiveTab', 'forward'));
  const [localForward, setLocalForward] = useState(() => forwardData.length > 0 ? forwardData : mockForwardData);
  const [localBackward, setLocalBackward] = useState(() => backwardData.length > 0 ? backwardData : mockBackwardData);
  const [localMetrics, setLocalMetrics] = useState(() => Object.keys(metrics).length > 0 ? metrics : getStoredState('localMetrics', {}));
  const [viewMode, setViewMode] = useState(() => getStoredState('viewMode', 'data')); 
  const [legsData, setLegsData] = useState(() => getStoredState('legsData', []));

  const [isLoading, setIsLoading] = useState(false);
  const statsSectionRef = useRef(null);

  useEffect(() => {
    const stateToSave = { geoActiveTab, localForward, localBackward, localMetrics, viewMode, legsData };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [geoActiveTab, localForward, localBackward, localMetrics, viewMode, legsData, storageKey]);

  useEffect(() => {
    if (localForward.length > 0 && setForwardData && (!forwardData || forwardData.length === 0)) setForwardData(localForward);
    if (localBackward.length > 0 && setBackwardData && (!backwardData || backwardData.length === 0)) setBackwardData(localBackward);
    if (Object.keys(localMetrics).length > 0 && setMetrics && (!metrics || Object.keys(metrics).length === 0)) setMetrics(localMetrics);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forwardData && forwardData.length > 0) setLocalForward(forwardData);
    if (backwardData && backwardData.length > 0) setLocalBackward(backwardData);
    if (metrics && Object.keys(metrics).length > 0) setLocalMetrics(metrics);
  }, [forwardData, backwardData, metrics]);

  const formatVal = (val, decimals = 3) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

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
    const newRow = { point: "", backsight: "", bs_upper: "", bs_lower: "", bs_s: "", foresight: "", fs_upper: "", fs_lower: "", fs_s: "" };
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
      const response = await axios.post(`${API_BASE_URL}/api/traverse_spirit_leveling`, {
        forward: localForward,
        backward: localBackward,
        known_point: "Σ6",
        start_elevation: 59.706
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
        if (response.data.legs) {
          setLegsData(response.data.legs);
        }
        setViewMode('results');

        // 2. ΚΛΗΣΗ ΤΟΥ CALLBACK ΕΦΟΣΟΝ ΥΠΑΡΧΕΙ 
        if (onLevelingComplete) {
          onLevelingComplete();
        }

        setTimeout(() => {
          statsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    } catch (error) {
      console.error("Σφάλμα κατά τη χωροστάθμιση:", error);
      alert("Αποτυχία υπολογισμού χωροστάθμισης.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div className="flex-none flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Ruler size={18} className="text-amber-500" />
              </div>
              {viewMode === 'data' ? (
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
              ) : (
                <span className="text-xs font-black text-cyan-400 tracking-widest border-l border-slate-800 pl-4">
                  Πίνακας Αποτελεσμάτων
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'results' && (
              <button
                onClick={() => setViewMode('data')}
                title="Επιστροφή στα Δεδομένα"
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <button
              onClick={handleRunLeveling}
              disabled={isLoading}
              title="Υπολογισμός Χωροστάθμισης"
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all border active:scale-95 cursor-pointer shadow-md ${
                isLoading
                  ? 'bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed'
                  : 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/40 hover:border-emerald-400/70 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              {isLoading ? (
                <Cpu size={18} className="animate-spin text-emerald-400" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          {viewMode === 'data' ? (
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  <th className={`p-2 text-[10px] font-black text-slate-500 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[4%]' : 'w-[5%]'}`}>#</th>
                  <th className={`p-2 text-[10px] font-black text-slate-400 tracking-widest border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[14%]' : 'w-[17%]'}`}>Σημείο Σκόπευσης</th>
                  
                  <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[9%]' : 'w-[13%]'}`}>οπισθο-<br/>σκόπευση</th>
                  <th className={`p-0 text-[9px] font-bold text-blue-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                    <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                    <div className="py-1.5">κάτω</div>
                  </th>
                  <th className={`p-2 text-[10px] font-black text-blue-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                  
                  <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[9%]' : 'w-[13%]'}`}>εμπροσθο-<br/>σκόπευση</th>
                  <th className={`p-0 text-[9px] font-bold text-orange-400/60 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[6%]' : 'w-[9%]'}`}>
                    <div className="border-b border-slate-800/50 py-1.5">άνω</div>
                    <div className="py-1.5">κάτω</div>
                  </th>
                  <th className={`p-2 text-[10px] font-black text-orange-500/80 tracking-widest text-center border-r border-slate-800/30 align-middle ${geoHasResults ? 'w-[7%]' : 'w-[10%]'}`}>S</th>
                  
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
                        <p className="text-slate-400 text-[10px] font-black tracking-widest mb-4">Αναμονή Δεδομένων Χωροστάθμισης</p>
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
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#0f172a] sticky top-0 z-20">
                <tr className="border-b border-slate-800/60 bg-slate-900/80">
                  <th className="p-3 text-[11px] font-black text-slate-400 tracking-widest text-center border-r border-slate-800/30 w-[15%]">Πλευρά (Από - Προς)</th>
                  <th className="p-3 text-[11px] font-black text-blue-400 tracking-widest text-right border-r border-slate-800/30">ΔH Μετάβασης (m)</th>
                  <th className="p-3 text-[11px] font-black text-orange-400 tracking-widest text-right border-r border-slate-800/30">ΔH Επιστροφής (m)</th>
                  <th className="p-3 text-[11px] font-black text-emerald-400 tracking-widest text-right">Τελικό ΔH (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-[#070c19]/20">
                {legsData.length > 0 ? (
                  legsData.map((leg, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-sm text-slate-300 font-bold border-r border-slate-800/30">
                        {leg.point_from} <span className="text-slate-600 mx-1">→</span> {leg.point_to}
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-blue-300 border-r border-slate-800/30">{formatVal(leg.dh_forward, 4)}</td>
                      <td className="p-3 text-right font-mono text-sm text-orange-300 border-r border-slate-800/30">{formatVal(leg.dh_backward, 4)}</td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-400 font-bold bg-emerald-900/10">{formatVal(leg.dh_final, 4)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-slate-500 font-bold">
                      Δεν βρέθηκαν δεδομένα πλευρών!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div ref={statsSectionRef} className="flex-none bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col gap-4">
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
  );
};

export default TraverseLeveling;