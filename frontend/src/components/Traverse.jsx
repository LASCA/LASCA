import React, { useState } from 'react';
import { Trash2, PlusCircle, Map, Activity, Calculator } from 'lucide-react';

const Traverse = () => {
  const [data, setData] = useState([
    { id: 1, point: "Σ7", hz: "", sd: "", x: "412384.2", y: "4491788", type: "fixed" },
    { id: 2, point: "Σ6", hz: "330.9927", sd: "42.198", x: "412358.3", y: "4491843", type: "fixed" },
    { id: 3, point: "S1", hz: "137.9477", sd: "26.938", x: "", y: "", type: "calculated" },
    { id: 4, point: "S2", hz: "144.3772", sd: "38.76", x: "", y: "", type: "calculated" },
  ]);

  const [isCalculated, setIsCalculated] = useState(false);

  const handleInputChange = (id, field, value) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    const newId = Date.now();
    setData([...data, { id: newId, point: "", hz: "", sd: "", x: "", y: "", type: "calculated" }]);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      
      {/* ACTION BAR */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={() => setIsCalculated(true)}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            isCalculated 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
          }`}
        >
          <Calculator size={16} />
          {isCalculated ? "ΕΠΙΛΥΣΗ ΟΔΕΥΣΗΣ ΟΛΟΚΛΗΡΩΘΗΚΕ" : "ΕΠΙΛΥΣΗ ΟΔΕΥΣΗΣ"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* ΠΙΝΑΚΑΣ ΟΔΕΥΣΗΣ (8/12) */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-[12px] tracking-wider border-b border-slate-800/60 text-slate-400 uppercase">
                <tr>
                  <th className="p-4 font-bold text-cyan-400">Point / Station</th>
                  <th className="p-4 font-bold text-fuchsia-500">Hz [grad]</th>
                  <th className="p-4 font-bold text-slate-300">Slope_D [m]</th>
                  <th className="p-4 font-bold text-emerald-400">X [m]</th>
                  <th className="p-4 font-bold text-emerald-400">Y [m]</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {data.map((row, index) => (
                  <tr key={row.id} className="group hover:bg-blue-600/[0.03] transition-all">
                    {/* Point Name */}
                    <td className="p-2">
                      <input 
                        className="w-full bg-transparent p-2 text-sm font-bold text-cyan-400 outline-none focus:bg-slate-800/50 rounded-lg transition-all"
                        value={row.point}
                        onChange={(e) => handleInputChange(row.id, 'point', e.target.value)}
                      />
                    </td>
                    {/* Horizontal Angle */}
                    <td className="p-2">
                      <input 
                        className="w-full bg-transparent p-2 text-sm font-mono text-fuchsia-400 outline-none focus:bg-slate-800/50 rounded-lg transition-all"
                        value={row.hz}
                        placeholder="0.0000"
                        onChange={(e) => handleInputChange(row.id, 'hz', e.target.value)}
                      />
                    </td>
                    {/* Distance */}
                    <td className="p-2">
                      <input 
                        className="w-full bg-transparent p-2 text-sm font-mono text-slate-300 outline-none focus:bg-slate-800/50 rounded-lg transition-all"
                        value={row.sd}
                        placeholder="0.000"
                        onChange={(e) => handleInputChange(row.id, 'sd', e.target.value)}
                      />
                    </td>
                    {/* X Coordinate */}
                    <td className="p-2">
                      <input 
                        className={`w-full p-2 text-sm font-mono outline-none rounded-lg transition-all ${
                          row.type === 'fixed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-transparent text-slate-400'
                        }`}
                        value={row.x}
                        onChange={(e) => handleInputChange(row.id, 'x', e.target.value)}
                      />
                    </td>
                    {/* Y Coordinate */}
                    <td className="p-2">
                      <input 
                        className={`w-full p-2 text-sm font-mono outline-none rounded-lg transition-all ${
                          row.type === 'fixed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-transparent text-slate-400'
                        }`}
                        value={row.y}
                        onChange={(e) => handleInputChange(row.id, 'y', e.target.value)}
                      />
                    </td>
                    {/* Delete Icon */}
                    <td className="p-4">
                      <button 
                        onClick={() => setData(data.filter(d => d.id !== row.id))}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button 
              onClick={addRow}
              className="w-full p-5 text-[10px] text-slate-500 hover:text-blue-400 hover:bg-blue-600/[0.02] transition-all flex justify-center items-center gap-3 font-black uppercase tracking-[0.3em] border-t border-slate-800/60"
            >
              <PlusCircle size={16} /> ΠΡΟΣΘΉΚΗ ΝΈΑΣ ΣΤΆΣΗΣ / ΣΗΜΕΊΟΥ
            </button>
          </div>
        </div>

        {/* ΔΕΞΙΟ PANEL - ΠΡΟΕΠΙΣΚΟΠΗΣΗ ΟΔΕΥΣΗΣ (4/12) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/20">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <Map size={14} className="text-blue-500" /> ΠΡΟΕΠΙΣΚΌΠΗΣΗ ΌΔΕΥΣΗΣ
              </span>
              <Activity size={14} className="text-emerald-500 animate-pulse" />
            </div>
            
            <div className="flex-1 flex items-center justify-center relative">
              {/* Background Grid */}
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]"></div>
              
              <div className="text-center z-10">
                <div className="relative mb-6 inline-block">
                   <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                   <Map className="text-slate-800 relative" size={80} strokeWidth={0.5} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Traverse Geometry
                </p>
                <p className="text-[9px] text-slate-700 mt-2 uppercase tracking-widest px-10">
                  Εδώ θα απεικονίζεται η πολυγωνική όδευση σε πραγματικό χρόνο
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Traverse;