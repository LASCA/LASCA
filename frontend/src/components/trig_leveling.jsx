import React, { useState, useEffect } from 'react';
import { Calculator, Database, PlusCircle, Trash2, Play, Cpu, Table } from 'lucide-react';
import axios from 'axios';

const TrigonometricHeight = ({ 
  data = [], 
  setData, 
  projectSettings 
}) => {
  const [localData, setLocalData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- HELPERS ΣΤΡΟΓΓΥΛΟΠΟΙΗΣΗΣ ---
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

  // --- ΑΡΧΙΚΟΠΟΙΗΣΗ ΔΕΔΟΜΕΝΩΝ ---
  useEffect(() => {
    if (data && data.length > 0) {
      const formatted = data.map(row => ({
        ...row,
        s: to3(row.s),
        z: to4(row.z),
        hi: to3(row.hi),
        ht: to3(row.ht),
        dh: to3(row.dh),
        dh_avg: to3(row.dh_avg)
      }));
      setLocalData(formatted);
    } else if (localData.length === 0) {
      const initialRows = Array.from({ length: 5 }).map((_, index) => ({
        id: Date.now() + index, 
        from: "", to: "", s: "", z: "", hi: "", ht: "", dh: "", dh_avg: ""
      }));
      setLocalData(initialRows);
      if (setData) setData(initialRows);
    }
  }, [data]);

  // --- ΕΝΗΜΕΡΩΣΗ STATE ---
  const updateData = (newData) => {
    const finalData = typeof newData === 'function' ? newData(localData) : newData;
    setLocalData(finalData);
    if (setData) setData(finalData);
  };

  // --- HANDLERS ΕΙΣΑΓΩΓΗΣ ---
  const handleInputChange = (id, field, value) => {
    updateData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleBlur = (id, field, value) => {
    if (['s', 'hi', 'ht', 'dh', 'dh_avg'].includes(field)) {
      handleInputChange(id, field, to3(value));
    } else if (field === 'z') {
      handleInputChange(id, field, to4(value));
    }
  };

  // --- ΕΞΥΠΝΗ ΠΛΟΗΓΗΣΗ ΜΕ ΠΛΗΚΤΡΟΛΟΓΙΟ ---
  const columns = ['from', 'to', 's', 'z', 'hi', 'ht', 'dh', 'dh_avg'];

  const handleKeyDown = (e, index, colName) => {
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { 
      e.preventDefault(); 
      nextRow = index + 1; 
      shouldMove = true; 
    } else if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      nextRow = index - 1; 
      shouldMove = true; 
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { 
      e.preventDefault(); 
      nextCol = colIndex - 1; 
      shouldMove = true; 
    } else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { 
      e.preventDefault(); 
      nextCol = colIndex + 1; 
      shouldMove = true; 
    }

    if (shouldMove && nextRow >= 0 && nextRow < localData.length && nextCol >= 0 && nextCol < columns.length) {
      const nextInput = document.getElementById(`input-trig-${nextRow}-${columns[nextCol]}`);
      if (nextInput) { 
        nextInput.focus(); 
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); 
      }
    }
  };

  // --- ΠΡΟΣΘΗΚΗ / ΔΙΑΓΡΑΦΗ ΓΡΑΜΜΩΝ ---
  const addRowAt = (index) => {
    const newRow = { id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "", dh: "", dh_avg: "" };
    const updated = [...localData];
    updated.splice(index + 1, 0, newRow);
    updateData(updated);
  };

  const removeRow = (id) => {
    updateData(localData.filter(row => row.id !== id));
  };

  // --- ΕΠΙΛΥΣΗ ΤΡΙΓΩΝΟΜΕΤΡΙΚΗΣ ΥΨΟΜΕΤΡΙΑΣ (API) ---
  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const projectNamePayload = typeof projectSettings === 'string' 
        ? projectSettings 
        : (projectSettings?.name || '');

      const payload = {
        data: localData,
        project_name: projectNamePayload
      };

      const response = await axios.post('http://127.0.0.1:5000/api/trigonometric_height', payload);

      if (response.data && response.data.status === "success") {
        updateData(response.data.results || response.data.data);
      } else {
        alert(response.data?.error || "Προέκυψε σφάλμα κατά τον υπολογισμό.");
      }
    } catch (error) {
      console.error("Σφάλμα στην Τριγωνομετρική Υψομετρία:", error);
      alert("Αποτυχία σύνδεσης με το backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative font-sans">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden pb-4">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between shrink-0 px-1">
          <h3 className="text-[11px] font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2">
            <Calculator size={15} className="text-cyan-400" />
            Τριγωνομετρική Υψομετρία
          </h3>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-[#0b1120] border border-slate-800/60 rounded-2xl shadow-2xl h-fit max-h-full flex flex-col relative overflow-hidden">
          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse table-auto relative">
              <thead className="bg-[#0f172a] text-[11px] shadow-md sticky top-0 z-30">
                <tr className="border-b border-slate-800/80">
                  <th className="p-3.5 w-10 text-center text-[10px] font-black text-slate-500 tracking-widest">#</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center w-24">From</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center w-24">To</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center">Slope D [m]</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center">Z [grad]</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center">H station [m]</th>
                  <th className="p-3.5 text-[10px] font-black text-slate-400 tracking-widest text-center">H target [m]</th>
                  <th className="p-3.5 text-[10px] font-black text-cyan-400/90 tracking-widest text-center bg-cyan-950/20">ΔH [m]</th>
                  <th className="p-3.5 text-[10px] font-black text-emerald-400/90 tracking-widest text-center bg-emerald-950/20">ΔH Μ.Ο. [m]</th>
                  
                  {/* Κουμπί Play ενσωματωμένο στο Thead */}
                  <th className="p-3 w-16">
                    <div className="flex justify-end pr-2 gap-2">
                      <button 
                        onClick={handleCalculate}
                        disabled={isLoading}
                        className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                          isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
                        }`}
                        title="Υπολογισμός Υψομετρίας"
                      >
                        {isLoading ? <Cpu size={14} className="animate-spin text-emerald-500" /> : <Play size={14} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {localData.length > 0 ? (
                  localData.map((row, index) => (
                    <React.Fragment key={row.id || index}>
                      <tr className="group hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center text-[10px] text-slate-600 font-mono font-bold">{index + 1}</td>
                        
                        {/* FROM */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-from`}
                            className="w-full bg-transparent p-2 text-xs text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500 transition-all text-slate-200" 
                            value={row.from || ""} 
                            onChange={(e) => handleInputChange(row.id, 'from', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'from')}
                            placeholder="-"
                          />
                        </td>

                        {/* TO */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-to`}
                            className="w-full bg-transparent p-2 text-xs text-center font-bold tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500 transition-all text-slate-200" 
                            value={row.to || ""} 
                            onChange={(e) => handleInputChange(row.id, 'to', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'to')}
                            placeholder="-"
                          />
                        </td>

                        {/* SLOPE DISTANCE */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-s`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 transition-all text-cyan-300" 
                            value={row.s || ""} 
                            onBlur={(e) => handleBlur(row.id, 's', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 's', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 's')}
                            placeholder="-"
                          />
                        </td>

                        {/* ZENITH ANGLE */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-z`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 transition-all text-cyan-300" 
                            value={row.z || ""} 
                            onBlur={(e) => handleBlur(row.id, 'z', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 'z', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'z')}
                            placeholder="-"
                          />
                        </td>

                        {/* HI */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-hi`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 transition-all text-cyan-300" 
                            value={row.hi || ""} 
                            onBlur={(e) => handleBlur(row.id, 'hi', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 'hi', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'hi')}
                            placeholder="-"
                          />
                        </td>

                        {/* HT */}
                        <td className="p-1.5">
                          <input 
                            id={`input-trig-${index}-ht`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500 transition-all text-cyan-300" 
                            value={row.ht || ""} 
                            onBlur={(e) => handleBlur(row.id, 'ht', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 'ht', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'ht')}
                            placeholder="-"
                          />
                        </td>

                        {/* ΔH */}
                        <td className="p-1.5 bg-cyan-950/10">
                          <input 
                            id={`input-trig-${index}-dh`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400 transition-all text-cyan-400" 
                            value={row.dh || ""} 
                            onBlur={(e) => handleBlur(row.id, 'dh', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 'dh', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'dh')}
                            placeholder="-"
                          />
                        </td>

                        {/* ΔH Avg */}
                        <td className="p-1.5 bg-emerald-950/10">
                          <input 
                            id={`input-trig-${index}-dh_avg`}
                            className="w-full bg-transparent p-2 text-xs text-center font-mono font-bold outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-emerald-400 transition-all text-emerald-400" 
                            value={row.dh_avg || ""} 
                            onBlur={(e) => handleBlur(row.id, 'dh_avg', e.target.value)}
                            onChange={(e) => handleInputChange(row.id, 'dh_avg', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'dh_avg')}
                            placeholder="-"
                          />
                        </td>

                        {/* ACTIONS */}
                        <td className="p-2 text-center">
                          <button 
                            onClick={() => removeRow(row.id)} 
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all cursor-pointer p-1"
                            title="Διαγραφή Γραμμής"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>

                      {/* INLINE ADD BUTTON */}
                      <tr className="h-0 p-0">
                        <td colSpan={10} className="p-0 h-0 relative">
                          <button 
                            onClick={() => addRowAt(index)} 
                            className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-cyan-400 hover:text-white rounded-full p-1 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"
                            title="Προσθήκη Γραμμής"
                          >
                            <PlusCircle size={15} />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-4 py-20 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <Table size={32} className="opacity-40 text-slate-600" />
                        <span className="text-xs font-semibold">Δεν υπάρχουν εγγραφές στον πίνακα</span>
                        <button 
                          onClick={() => updateData([{ id: Date.now(), from: "", to: "", s: "", z: "", hi: "", ht: "", dh: "", dh_avg: "" }])} 
                          className="flex items-center gap-2 px-4 py-2 mt-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all text-xs font-bold cursor-pointer"
                        >
                          <PlusCircle size={15} /> Προσθήκη Πρώτης Γραμμής
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
  );
};

export default TrigonometricHeight;