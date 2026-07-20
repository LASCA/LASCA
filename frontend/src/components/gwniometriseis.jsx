import React, { useState, useEffect } from 'react';
import { Trash2, PlusCircle, Play, Cpu, ArrowLeft } from 'lucide-react';

const Goniometry = ({ rows = [], setRows }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const formatDecimals = (val, decimals = 4) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    let hasChanges = false;
    const activeId = typeof document !== 'undefined' ? document.activeElement?.id : null;

    const formattedRows = rows.map((row, index) => {
      let updated = { ...row };
      const isFaceIFocused = activeId === `input-${index}-faceI`;
      const isFaceIIFocused = activeId === `input-${index}-faceII`;

      if (!isFaceIFocused && row.faceI !== "") {
        const formattedVal = formatDecimals(row.faceI, 4);
        if (formattedVal !== String(row.faceI)) {
          updated.faceI = formattedVal;
          hasChanges = true;
        }
      }
      if (!isFaceIIFocused && row.faceII !== "") {
        const formattedVal = formatDecimals(row.faceII, 4);
        if (formattedVal !== String(row.faceII)) {
          updated.faceII = formattedVal;
          hasChanges = true;
        }
      }
      return updated;
    });

    if (hasChanges && setRows) {
      setRows(formattedRows);
    }
  }, [rows, setRows]);

  const handleInputChange = (id, field, value) => {
    if(setRows) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    }
  };

  const handleBlur = (id, field, value) => {
    if (field === 'faceI' || field === 'faceII') {
      handleInputChange(id, field, formatDecimals(value, 4));
    }
  };

  const handleKeyDown = (e, index, colName) => {
    const columns = ['from', 'to', 'period', 'faceI', 'faceII'];
    const colIndex = columns.indexOf(colName);
    let nextRow = index;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = index + 1; shouldMove = true; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = index - 1; shouldMove = true; }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { e.preventDefault(); nextCol = colIndex - 1; shouldMove = true; }
    else if (e.key === 'ArrowRight' && e.target.selectionEnd === e.target.value.length) { e.preventDefault(); nextCol = colIndex + 1; shouldMove = true; }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < rows.length && nextCol >= 0 && nextCol < columns.length) {
        const nextInput = document.getElementById(`input-${nextRow}-${columns[nextCol]}`);
        if (nextInput) { 
          nextInput.focus(); 
          const valLength = nextInput.value.length;
          nextInput.setSelectionRange(valLength, valLength);
        }
      }
    }
  };

  const addRowAt = (index) => {
    if(!setRows) return;
    const newRow = { id: Date.now(), from: "", to: "", period: "1", faceI: "", faceII: "" };
    const updated = [...rows];
    updated.splice(index + 1, 0, newRow);
    setRows(updated);
  };

  const deleteRow = (id) => {
    if(setRows) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/goniometry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rows })
      });
      const data = await response.json();
      
      if (data.error) {
        alert(`Σφάλμα Υπολογισμού: ${data.error}`);
      } else if (data.results && setRows) {
        const updatedRows = data.results.map((backendRow, index) => ({
          ...rows[index],
          mesos_oros: backendRow.mesos_oros,
          anigmeni_timi: backendRow.anigmeni_timi,
          genikos_mesos: backendRow.genikos_mesos,
          v_m: backendRow.v_m,
          v_prime: backendRow.v_prime,
          v_ji: backendRow.v_ji,
          vv: backendRow.vv
        }));
        setRows(updatedRows);
        setShowResults(true); 
      }
    } catch (error) {
      console.error("Σφάλμα σύνδεσης:", error);
      alert("Αποτυχία σύνδεσης με τον Server. Βεβαιώσου ότι τρέχει το Python Backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalColumns = showResults ? 14 : 7;

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#030712] p-4 sm:p-6 font-sans">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl relative w-full overflow-hidden">
        <div className="overflow-y-auto overflow-x-auto custom-scrollbar max-h-[calc(100vh-120px)] rounded-2xl">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
              <tr className="border-b border-slate-800/50">
                <th className="px-2 py-3 w-8 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                <th className="px-2 py-3 w-16 text-[10px] font-black text-slate-500 tracking-widest">From</th>
                <th className="px-2 py-3 w-16 text-[10px] font-black text-slate-500 tracking-widest">To</th>
                <th className="px-2 py-3 w-16 text-[10px] font-black text-slate-500 tracking-widest">Period</th>
                <th className="px-2 py-3 w-24 text-[10px] font-black text-slate-500 tracking-widest">Face I</th>
                <th className="px-2 py-3 w-24 text-[10px] font-black text-slate-500 tracking-widest">Face II</th>
                
                {showResults && (
                  <>
                    <th className="px-2 py-3 text-[10px] font-black text-blue-400 tracking-widest whitespace-nowrap">Μέσος Όρος</th>
                    <th className="px-2 py-3 text-[10px] font-black text-blue-400 tracking-widest whitespace-nowrap">Ανηγμένη</th>
                    <th className="px-2 py-3 text-[10px] font-black text-emerald-400 tracking-widest whitespace-nowrap">Γεν. Μέσος</th>
                    <th className="px-2 py-3 text-[10px] font-black text-purple-400 tracking-widest whitespace-nowrap">v_m (cc)</th>
                    <th className="px-2 py-3 text-[10px] font-black text-purple-400 tracking-widest whitespace-nowrap">v'_j (cc)</th>
                    <th className="px-2 py-3 text-[10px] font-black text-purple-400 tracking-widest whitespace-nowrap">v_ji (cc)</th>
                    <th className="px-2 py-3 text-[10px] font-black text-purple-400 tracking-widest whitespace-nowrap">vv</th>
                  </>
                )}

                <th className="px-2 py-3 w-20 text-right sticky right-0 bg-[#0f172a]">
                  <div className="flex justify-end gap-2 pr-1">
                    {showResults && (
                      <button 
                        onClick={() => setShowResults(false)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Επιστροφή στην επεξεργασία"
                      >
                        <ArrowLeft size={14} />
                      </button>
                    )}
                    <button 
                      onClick={handleCalculate}
                      disabled={isLoading || !rows || rows.length === 0}
                      className={`group inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                        isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
                      }`}
                      title="Εκτέλεση Υπολογισμού"
                    >
                      {isLoading ? <Cpu size={14} className="animate-spin text-emerald-500" /> : <Play size={14} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {(!rows || rows.length === 0) ? (
                <tr>
                  <td colSpan={totalColumns} className="p-8 text-center text-slate-500 font-mono text-sm">
                    Δεν βρέθηκαν δεδομένα. Παρακαλώ εισάγετε το Excel από το Project Setup.
                  </td>
                </tr>
              ) : rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="px-2 py-2 text-center text-[10px] text-slate-600 font-mono font-bold">
                      {index + 1}
                    </td>
                    <td className="px-1 py-2">
                      <input 
                        id={`input-${index}-from`}
                        className={`w-full bg-transparent p-1.5 text-[13px] tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-400/80 transition-all ${showResults ? 'text-slate-500 font-medium' : 'text-slate-200 font-bold'}`}
                        value={row.from || ""} 
                        onChange={(e) => handleInputChange(row.id, 'from', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'from')}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input 
                        id={`input-${index}-to`}
                        className={`w-full bg-transparent p-1.5 text-[13px] tracking-tight outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-400/80 transition-all ${showResults ? 'text-slate-500 font-medium' : 'text-slate-200 font-bold'}`}
                        value={row.to || ""} 
                        onChange={(e) => handleInputChange(row.id, 'to', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'to')}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input 
                        id={`input-${index}-period`} 
                        className={`w-full bg-transparent p-1.5 text-left font-mono text-[13px] outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-slate-500/80 transition-all ${showResults ? 'text-slate-600 font-medium' : 'text-slate-400 font-bold'}`}
                        value={row.period || ""} 
                        onChange={(e) => handleInputChange(row.id, 'period', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'period')}
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input 
                        id={`input-${index}-faceI`} 
                        className={`w-full bg-transparent p-1.5 font-mono text-[13px] tracking-wide outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 transition-all ${showResults ? 'text-cyan-600/70 font-medium' : 'text-cyan-400 font-bold'}`}
                        value={row.faceI || ""} 
                        onBlur={(e) => handleBlur(row.id, 'faceI', e.target.value)} 
                        onChange={(e) => {
                          handleInputChange(row.id, 'faceI', e.target.value);
                          setShowResults(false);
                        }} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'faceI')}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input 
                        id={`input-${index}-faceII`} 
                        className={`w-full bg-transparent p-1.5 font-mono text-[13px] tracking-wide outline-none rounded focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 transition-all ${showResults ? 'text-cyan-600/70 font-medium' : 'text-cyan-400 font-bold'}`}
                        value={row.faceII || ""} 
                        onBlur={(e) => handleBlur(row.id, 'faceII', e.target.value)} 
                        onChange={(e) => {
                          handleInputChange(row.id, 'faceII', e.target.value);
                          setShowResults(false);
                        }} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'faceII')}
                        placeholder="-"
                      />
                    </td>
                    
                    {showResults && (
                      <>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-blue-400 whitespace-nowrap">{formatDecimals(row.mesos_oros, 4)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-blue-400 whitespace-nowrap">{formatDecimals(row.anigmeni_timi, 4)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-emerald-400 whitespace-nowrap">{formatDecimals(row.genikos_mesos, 4)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-purple-400 whitespace-nowrap">{formatDecimals(row.v_m, 0)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-purple-400 whitespace-nowrap">{formatDecimals(row.v_prime, 1)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-purple-400 whitespace-nowrap">{formatDecimals(row.v_ji, 1)}</td>
                        <td className="px-2 py-2 text-[13px] font-mono font-bold text-purple-400 whitespace-nowrap">{formatDecimals(row.vv, 2)}</td>
                      </>
                    )}

                    <td className="px-2 py-2 text-right sticky right-0 bg-[#0b1120] group-hover:bg-[#101827]">
                      <button 
                        onClick={() => deleteRow(row.id)} 
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer flex justify-end w-full"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                  
                  <tr className="h-0 p-0">
                    <td colSpan={totalColumns} className="p-0 h-0 relative">
                      <button 
                        onClick={() => addRowAt(index)} 
                        className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 opacity-0 hover:opacity-100 transition-all bg-slate-800 text-blue-500 rounded-full p-1.5 border border-slate-700 scale-75 hover:scale-100 cursor-pointer shadow-lg"
                        title="Προσθήκη γραμμής εδώ"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Goniometry;