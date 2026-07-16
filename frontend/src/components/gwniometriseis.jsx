import React, { useState, useEffect } from 'react';
import { Trash2, PlusCircle, Play, Cpu } from 'lucide-react';

const Goniometry = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Τοπικό state για τις γραμμές (αυτόνομο)
  const [rows, setRows] = useState([
    { id: 1, from: "", to: "", period: "1", faceI: "", faceII: "" },
    { id: 2, from: "", to: "", period: "1", faceI: "", faceII: "" },
    { id: 3, from: "", to: "", period: "1", faceI: "", faceII: "" }
  ]);

  // Helper για τα 4 δεκαδικά
  const to4 = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? val : num.toFixed(4);
  };

  // ΕΞΥΠΝΟ FORMATTING: 4 δεκαδικά όταν χάνεται το focus
  useEffect(() => {
    if (rows.length === 0) return;
    let hasChanges = false;
    const activeId = typeof document !== 'undefined' ? document.activeElement?.id : null;

    const formattedRows = rows.map((row, index) => {
      let updated = { ...row };
      const isFaceIFocused = activeId === `input-${index}-faceI`;
      const isFaceIIFocused = activeId === `input-${index}-faceII`;

      if (!isFaceIFocused && row.faceI !== "") {
        const formattedVal = to4(row.faceI);
        if (formattedVal !== String(row.faceI)) {
          updated.faceI = formattedVal;
          hasChanges = true;
        }
      }
      if (!isFaceIIFocused && row.faceII !== "") {
        const formattedVal = to4(row.faceII);
        if (formattedVal !== String(row.faceII)) {
          updated.faceII = formattedVal;
          hasChanges = true;
        }
      }
      return updated;
    });

    if (hasChanges) {
      setRows(formattedRows);
    }
  }, [rows]);

  const handleInputChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleBlur = (id, field, value) => {
    if (field === 'faceI' || field === 'faceII') {
      handleInputChange(id, field, to4(value));
    }
  };

  // Έξυπνη πλοήγηση με τα βελάκια (χωρίς να μαρκάρει το κείμενο)
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
    const newRow = { id: Date.now(), from: "", to: "", period: "1", faceI: "", faceII: "" };
    const updated = [...rows];
    updated.splice(index + 1, 0, newRow);
    setRows(updated);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const handleCalculate = () => {
    setIsLoading(true);
    // Εδώ θα μπει το API σου αργότερα
    setTimeout(() => {
      setIsLoading(false);
      console.log("Δεδομένα προς αποστολή:", rows);
    }, 1000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#030712] p-6 font-sans">
      <style>
        {`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}
      </style>

      {/* Αφαιρέθηκε το flex-1 και h-full για να προσαρμόζεται στο ύψος των γραμμών */}
      <div className="bg-[#0b1120] border border-slate-800/50 rounded-2xl shadow-2xl relative w-full">
        <div className="overflow-y-auto overflow-x-auto custom-scrollbar max-h-[calc(100vh-120px)] rounded-2xl">
          <table className="w-full text-left border-collapse table-auto relative">
            <thead className="bg-[#0f172a] text-[14px] shadow-sm sticky top-0 z-30">
              <tr className="border-b border-slate-800/50">
                <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 tracking-widest uppercase">#</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">From</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">To</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Period</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face I</th>
                <th className="p-4 text-[10px] font-black text-slate-500 tracking-widest">Face II</th>
                <th className="p-3 w-16 text-right">
                  <button 
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className={`group inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                      isLoading ? 'opacity-50 bg-slate-800' : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30'
                    }`}
                  >
                    {isLoading ? <Cpu size={14} className="animate-spin text-emerald-500" /> : <Play size={14} fill="currentColor" className="text-emerald-500 ml-0.5" />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="p-4 text-center text-[10px] text-slate-600 font-mono font-bold">
                      {index + 1}
                    </td>
                    <td className="p-2">
                      <input 
                        id={`input-${index}-from`}
                        className="w-full bg-transparent p-2 text-sm outline-none rounded text-amber-300/80 focus:bg-slate-800/50" 
                        value={row.from} 
                        onChange={(e) => handleInputChange(row.id, 'from', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'from')}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        id={`input-${index}-to`}
                        className="w-full bg-transparent p-2 text-sm outline-none rounded text-amber-300/80 focus:bg-slate-800/50" 
                        value={row.to} 
                        onChange={(e) => handleInputChange(row.id, 'to', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'to')}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        id={`input-${index}-period`} 
                        className="w-full bg-transparent p-2 text-sm font-mono text-slate-400 outline-none rounded focus:bg-slate-800/50" 
                        value={row.period} 
                        onChange={(e) => handleInputChange(row.id, 'period', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'period')}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        id={`input-${index}-faceI`} 
                        className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none rounded focus:bg-slate-800/50" 
                        value={row.faceI} 
                        onBlur={(e) => handleBlur(row.id, 'faceI', e.target.value)} 
                        onChange={(e) => handleInputChange(row.id, 'faceI', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'faceI')}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        id={`input-${index}-faceII`} 
                        className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none rounded focus:bg-slate-800/50" 
                        value={row.faceII} 
                        onBlur={(e) => handleBlur(row.id, 'faceII', e.target.value)} 
                        onChange={(e) => handleInputChange(row.id, 'faceII', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, index, 'faceII')}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => deleteRow(row.id)} 
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Η αόρατη γραμμή που έχει το αιωρούμενο "συν" (+) ανάμεσα στις γραμμές */}
                  <tr className="h-0 p-0">
                    <td colSpan={7} className="p-0 h-0 relative">
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