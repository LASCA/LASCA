import React, { useState, useEffect } from 'react';
import { Target, MapPin, Database, PlusCircle, Trash2, Play, Cpu } from 'lucide-react';
import axios from 'axios';

const TraverseHeight = ({ 
  observations = [], 
  setObservations,   
  stations = [],
  setStations
}) => {
  // --- ΕΣΩΤΕΡΙΚΑ STATES --- 
  const [localObs, setLocalObs] = useState([]);
  const [localStations, setLocalStations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- HELPERS ΓΙΑ ΔΕΚΑΔΙΚΑ ---
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

  // --- ΑΡΧΙΚΟΠΟΙΗΣΗ ΠΑΡΑΤΗΡΗΣΕΩΝ ---
  useEffect(() => {
    if (observations && observations.length > 0) {
      const formattedObs = observations.map(obs => ({
        ...obs,
        s: to3(obs.s),
        z: to4(obs.z),
        hi: to3(obs.hi),
        ht: to3(obs.ht)
      }));
      setLocalObs(formattedObs);
    } else if (localObs.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + index, 
        from: "", to: "", s: "", z: "", hi: "", ht: ""
      }));
      setLocalObs(initialRows);
      if (setObservations) setObservations(initialRows);
    }
  }, [observations]);

  // --- ΑΡΧΙΚΟΠΟΙΗΣΗ ΣΤΑΣΕΩΝ ---
  useEffect(() => {
    if (stations && stations.length > 0) {
      const formattedStations = stations.map(st => ({
        ...st,
        h: to3(st.h)
      }));
      setLocalStations(formattedStations);
    } else if (localStations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + 1000 + index, 
        name: "", h: ""
      }));
      setLocalStations(initialRows);
      if (setStations) setStations(initialRows);
    }
  }, [stations]);

  // --- UPDATERS ---
  const updateData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localObs) : newData;
    setLocalObs(finalData);
    if (setObservations) setObservations(finalData);
  };

  const updateStationsData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localStations) : newData;
    setLocalStations(finalData);
    if (setStations) setStations(finalData);
  };

  // --- ΕΠΙΛΥΣΗ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ ΥΨΟΜΕΤΡΙΑΣ (API CALL) ---
  const handleTraverseHeightCalc = async () => {
    setIsLoading(true);
    try {
      const payload = {
        observations: localObs, 
        stations: localStations 
      };

      const response = await axios.post('http://127.0.0.1:5000/api/traverse_height', payload);

      if (response.data && response.data.status === "success") {
        // Ενημερώνουμε ΑΠΕΥΘΕΙΑΣ τον 2ο Πίνακα με τα νέα υψόμετρα
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

  // --- HANDLERS ΓΙΑ ΠΑΡΑΤΗΡΗΣΕΙΣ ---
  const handleInputChange = (id, field, value) => {
    updateData(prev => prev.map(obs => obs.id === id ? { ...obs, [field]: value } : obs));
  };

  const handleBlur = (id, field, value) => {
    if (field === 's' || field === 'hi' || field === 'ht') {
      handleInputChange(id, field, to3(value));
    } else if (field === 'z') {
      handleInputChange(id, field, to4(value));
    }
  };

  // --- HANDLERS ΓΙΑ ΣΤΑΣΕΙΣ ---
  const handleStationChange = (id, field, value) => {
    updateStationsData(prev => prev.map(st => st.id === id ? { ...st, [field]: value } : st));
  };

  const handleStationBlur = (id, field, value) => {
    if (field === 'h') {
      handleStationChange(id, field, to3(value));
    }
  };

  // --- ΕΞΥΠΝΗ ΠΛΟΗΓΗΣΗ (ΠΑΡΑΤΗΡΗΣΕΙΣ) ---
  const handleKeyDown = (e, index, colName) => {
    const columns = ['from', 'to', 's', 'z', 'hi', 'ht'];
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = index + 1; shouldMove = true; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = index - 1; shouldMove = true; }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { e.preventDefault(); nextCol = colIndex - 1; shouldMove = true; }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { e.preventDefault(); nextCol = colIndex + 1; shouldMove = true; }

    if (shouldMove && nextRow >= 0 && nextRow < localObs.length && nextCol >= 0 && nextCol < columns.length) {
      const nextInput = document.getElementById(`input-th-${nextRow}-${columns[nextCol]}`);
      if (nextInput) { nextInput.focus(); nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); }
    }
  };

  // --- ΕΞΥΠΝΗ ΠΛΟΗΓΗΣΗ (ΣΤΑΣΕΙΣ) ---
  const handleStationKeyDown = (e, index, colName) => {
    const columns = ['name', 'h'];
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = index + 1; shouldMove = true; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = index - 1; shouldMove = true; }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { e.preventDefault(); nextCol = colIndex - 1; shouldMove = true; }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { e.preventDefault(); nextCol = colIndex + 1; shouldMove = true; }

    if (shouldMove && nextRow >= 0 && nextRow < localStations.length && nextCol >= 0 && nextCol < columns.length) {
      const nextInput = document.getElementById(`input-st-${nextRow}-${columns[nextCol]}`);
      if (nextInput) { nextInput.focus(); nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); }
    }
  };

  // --- ΠΡΟΣΘΗΚΗ / ΔΙΑΓΡΑΦΗ (ΠΑΡΑΤΗΡΗΣΕΙΣ) ---
  const addRowAt = (index) => {
    const newRow = { id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "" };
    const updated = [...localObs];
    updated.splice(index + 1, 0, newRow);
    updateData(updated);
  };
  const removeRow = (id) => updateData(localObs.filter(o => o.id !== id));

  // --- ΠΡΟΣΘΗΚΗ / ΔΙΑΓΡΑΦΗ (ΣΤΑΣΕΙΣ) ---
  const addStationRowAt = (index) => {
    const newRow = { id: Date.now(), name: "", h: "" };
    const updated = [...localStations];
    updated.splice(index + 1, 0, newRow);
    updateStationsData(updated);
  };
  const removeStationRow = (id) => updateStationsData(localStations.filter(o => o.id !== id));

  return (
    <div className="flex flex-col h-full relative">
      
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      <div className="grid grid-cols-[2.5fr_1fr] gap-6 flex-1 min-h-0 overflow-hidden pb-4">
        
        {/* === ΠΙΝΑΚΑΣ 1: ΠΑΡΑΤΗΡΗΣΕΙΣ === */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0">
            <Target size={14} className="text-blue-400" />
            1. Πινακας Παρατηρησεων
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
                    {/* Κουμπί Επίλυσης όπως στο Adjustment */}
                    <th className="p-3 w-16">
                      <div className="flex justify-end pr-2 gap-2">
                        <button 
                          onClick={handleTraverseHeightCalc}
                          disabled={isLoading}
                          className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                            isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
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
                          
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-from`}
                              className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" 
                              value={obs.from} 
                              onChange={(e) => handleInputChange(obs.id, 'from', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'from')}
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-to`}
                              className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" 
                              value={obs.to} 
                              onChange={(e) => handleInputChange(obs.id, 'to', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'to')}
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-s`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={obs.s} 
                              onBlur={(e) => handleBlur(obs.id, 's', e.target.value)}
                              onChange={(e) => handleInputChange(obs.id, 's', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 's')}
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-z`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={obs.z} 
                              onBlur={(e) => handleBlur(obs.id, 'z', e.target.value)}
                              onChange={(e) => handleInputChange(obs.id, 'z', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'z')}
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-hi`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={obs.hi} 
                              onBlur={(e) => handleBlur(obs.id, 'hi', e.target.value)}
                              onChange={(e) => handleInputChange(obs.id, 'hi', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'hi')}
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-th-${index}-ht`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={obs.ht} 
                              onBlur={(e) => handleBlur(obs.id, 'ht', e.target.value)}
                              onChange={(e) => handleInputChange(obs.id, 'ht', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'ht')}
                              placeholder="-"
                            />
                          </td>

                          <td className="p-4 text-right">
                            <button onClick={() => removeRow(obs.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>

                        <tr className="h-0 p-0">
                          <td colSpan={8} className="p-0 h-0 relative">
                            <button onClick={() => addRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg">
                              <PlusCircle size={16} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-4">
                          <Database size={28} className="opacity-50" />
                          <span className="text-sm">Δεν βρέθηκαν δεδομένα</span>
                          <button onClick={() => updateData([{ id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "" }])} className="flex items-center gap-2 px-4 py-2 mt-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all text-xs font-bold cursor-pointer">
                            <PlusCircle size={16} /> Προσθήκη
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* === ΠΙΝΑΚΑΣ 2: ΣΤΑΣΕΙΣ (EDITABLE) === */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0">
            <MapPin size={14} className="text-emerald-400" />
            2. Πινακας Στασεων
          </h3>
          <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl h-fit max-h-full flex flex-col relative overflow-hidden">
            <div className="overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-auto relative">
                <thead className="sticky top-0 bg-[#0F172A] border-b border-slate-800/50 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 tracking-widest uppercase text-center">Σταση</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 tracking-widest uppercase text-center">Υψομετρο H (m)</th>
                    <th className="px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {localStations.length > 0 ? (
                    localStations.map((st, index) => (
                      <React.Fragment key={st.id || index}>
                        <tr className="group hover:bg-slate-800/20 transition-colors">
                          
                          <td className="p-2">
                            <input 
                              id={`input-st-${index}-name`}
                              className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" 
                              value={st.name} 
                              onChange={(e) => handleStationChange(st.id, 'name', e.target.value)}
                              onKeyDown={(e) => handleStationKeyDown(e, index, 'name')}
                              placeholder="-"
                            />
                          </td>

                          <td className="p-2">
                            <input 
                              id={`input-st-${index}-h`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={st.h} 
                              onBlur={(e) => handleStationBlur(st.id, 'h', e.target.value)}
                              onChange={(e) => handleStationChange(st.id, 'h', e.target.value)}
                              onKeyDown={(e) => handleStationKeyDown(e, index, 'h')}
                              placeholder="-"
                            />
                          </td>

                          <td className="p-4 text-right">
                            <button onClick={() => removeStationRow(st.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>

                        <tr className="h-0 p-0">
                          <td colSpan={3} className="p-0 h-0 relative">
                            <button onClick={() => addStationRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-emerald-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg">
                              <PlusCircle size={16} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-4">
                          <MapPin size={28} className="opacity-50" />
                          <span className="text-sm">Δεν υπάρχουν σταθμοί</span>
                          <button onClick={() => updateStationsData([{ id: Date.now(), name: "", h: "" }])} className="flex items-center gap-2 px-4 py-2 mt-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all text-xs font-bold cursor-pointer">
                            <PlusCircle size={16} /> Προσθήκη
                          </button>
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