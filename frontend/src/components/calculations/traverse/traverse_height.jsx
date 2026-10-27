import React, { useState, useEffect } from 'react';
import { MapPin, PlusCircle, Trash2 } from 'lucide-react';
import TraverseTrigLevel from './traverse_trig_lev.jsx'; 

const TraverseHeight = ({ 
  observations = [], setObservations,   
  stations = [], setStations,
  projectSettings
}) => {
  const [localStations, setLocalStations] = useState([]);

  const to3 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(3);
  };

  // --- ΕΞΥΠΝΟ FORMATTING ---
  useEffect(() => {
    let cancelled = false;
    if (stations && stations.length > 0) {
      let hasChanges = false;
      const activeId = typeof document !== 'undefined' ? document.activeElement?.id : null;

      const formattedStations = stations.map((st) => {
        let updatedSt = { ...st };
        // Ελέγχουμε αν το συγκεκριμένο input έχει το focus του χρήστη
        const isHFocused = activeId === `station-h-${st.id}`;

        if (!isHFocused && st.h !== "" && st.h != null) {
          const formattedVal = to3(st.h);
          if (formattedVal !== String(st.h)) {
            updatedSt.h = formattedVal;
            hasChanges = true;
          }
        }
        return updatedSt;
      });

      if (hasChanges) {
        const synchronize = window.setTimeout(() => {
          if (cancelled) return;
          setLocalStations(formattedStations);
          if (setStations) setStations(formattedStations);
        }, 0);
        return () => {
          cancelled = true;
          window.clearTimeout(synchronize);
        };
      } else {
        // Διατηρούμε το state συγχρονισμένο χωρίς να ενοχλούμε την πληκτρολόγηση
        const synchronize = window.setTimeout(() => {
          if (!cancelled) setLocalStations(stations);
        }, 0);
        return () => {
          cancelled = true;
          window.clearTimeout(synchronize);
        };
      }
    } else if (localStations.length === 0) {
      const initialRows = Array.from({ length: 3 }).map((_, index) => ({
        id: Date.now() + 1000 + index, 
        name: "", h: ""
      }));
      const initialize = window.setTimeout(() => {
        if (cancelled) return;
        setLocalStations(initialRows);
        if (setStations) setStations(initialRows);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(initialize);
      };
    }
    return undefined;
  }, [stations, setStations, localStations.length]);

  const updateStationsData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localStations) : newData;
    setLocalStations(finalData);
    if (setStations) setStations(finalData);
  };

  const handleStationChange = (id, field, value) => updateStationsData(prev => prev.map(st => st.id === id ? { ...st, [field]: field === 'h' ? value.replace(/,/g, '.') : value } : st));
  const handleStationBlur = (id, field, value) => { if (field === 'h') handleStationChange(id, field, to3(value)); };
  
  const addStationRowAt = (index) => {
    const newRow = { id: Math.max(0, ...localStations.map((station) => Number(station.id) || 0)) + 1, name: "", h: "" };
    const updated = [...localStations];
    updated.splice(index + 1, 0, newRow);
    updateStationsData(updated);
  };
  
  const removeStationRow = (id) => updateStationsData(localStations.filter(o => o.id !== id));

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

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-[3.2fr_1fr] gap-6 flex-1 min-h-0 overflow-hidden pb-4 mt-2">
        
        {/* ΑΡΙΣΤΕΡΟ ΜΕΡΟΣ: ΜΟΝΟ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ ΥΨΟΜΕΤΡΙΑ */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full overflow-y-auto custom-scrollbar pr-1">
            <TraverseTrigLevel 
              observations={observations} 
              setObservations={setObservations}
              stations={localStations}
              setStations={updateStationsData}
              projectSettings={projectSettings}
            />
        </div>

        {/* ΔΕΞΙ ΜΕΡΟΣ: ΠΙΝΑΚΑΣ ΣΤΑΣΕΩΝ */}
        <div className="flex flex-col gap-3 min-h-0 max-h-full">
          <h3 className="text-[11px] font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2 ml-1 shrink-0">
            <MapPin size={14} className="text-emerald-400" />
            Πίνακας Στάσεων
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
                          <td className="p-2">
                            <input 
                              className="w-full bg-transparent p-2 text-sm text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all text-slate-200" 
                              value={st.name} 
                              onChange={(e) => handleStationChange(st.id, 'name', e.target.value)} 
                              placeholder="-" 
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`station-h-${st.id}`}
                              className="w-full bg-transparent p-2 text-sm text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/80 transition-all text-cyan-400" 
                              value={st.h} 
                              onBlur={(e) => handleStationBlur(st.id, 'h', e.target.value)} 
                              onChange={(e) => handleStationChange(st.id, 'h', e.target.value)} 
                              placeholder="-" 
                            />
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => removeStationRow(st.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={15} /></button>
                          </td>
                        </tr>
                        <tr className="h-0 p-0">
                          <td colSpan={3} className="p-0 h-0 relative">
                            <button onClick={() => addStationRowAt(index)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-emerald-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"><PlusCircle size={16} /></button>
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