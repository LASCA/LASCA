import React, { useState, useMemo } from 'react';
import { 
  Crosshair, 
  Compass, 
  Table as TableIcon, 
  Map as MapIcon, 
  Zap,
  Download,
  Info,
  ChevronRight
} from 'lucide-react';

const Tacheometry = ({ data = [] }) => {
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedBacksight, setSelectedBacksight] = useState("");

  // 1. Εξαγωγή μοναδικών στάσεων από τα δεδομένα
  const stations = useMemo(() => {
    const uniqueStations = [...new Set(data.map(p => p.station))];
    return uniqueStations.filter(Boolean).sort();
  }, [data]);

  // 2. Εξαγωγή μοναδικών προσανατολισμών για την επιλεγμένη στάση
  const backsights = useMemo(() => {
    if (!selectedStation) return [];
    const stationData = data.filter(p => p.station === selectedStation);
    const uniqueBS = [...new Set(stationData.map(p => p.backsight))];
    return uniqueBS.filter(Boolean).sort();
  }, [data, selectedStation]);

  // 3. Φιλτράρισμα σημείων λεπτομέρειας
  const filteredPoints = useMemo(() => {
    return data.filter(p => 
      p.station === selectedStation && 
      p.backsight === selectedBacksight
    );
  }, [data, selectedStation, selectedBacksight]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 overflow-hidden">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          
          select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 0.7rem center;
            background-size: 0.8em;
          }
        `}
      </style>

      {/* TOP CONTROL BAR */}
      <div className="bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Zap size={18} className="text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-200">Ταχυμετρία</h2>
              <span className="text-[9px] text-slate-500 font-bold tracking-widest">Επίλυση Σημείων Λεπτομέρειας</span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800/60" />

          {/* Select Station */}
          <div className="flex flex-col gap-1.5 group">
            <label className="text-[8.5px] font-black text-slate-500 tracking-widest ml-1 group-hover:text-emerald-500 transition-colors">Στάση (Instrument)</label>
            <div className="relative">
              <select 
                value={selectedStation}
                onChange={(e) => {
                  setSelectedStation(e.target.value);
                  setSelectedBacksight(""); // Reset BS when station changes
                }}
                className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-xl px-4 py-2 pr-10 outline-none focus:border-emerald-500/50 transition-all min-w-[160px] font-mono cursor-pointer hover:bg-slate-900"
              >
                <option value="">Επιλέξτε Στάση</option>
                {stations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Crosshair size={12} className="absolute right-3.5 top-3 text-slate-600 pointer-events-none" />
            </div>
          </div>

          <ChevronRight size={14} className="text-slate-700 mt-4" />

          {/* Select Backsight */}
          <div className="flex flex-col gap-1.5 group">
            <label className="text-[8.5px] font-black text-slate-500 tracking-widest ml-1 group-hover:text-cyan-500 transition-colors">Προσανατολισμός (B.S.)</label>
            <div className="relative">
              <select 
                value={selectedBacksight}
                disabled={!selectedStation}
                onChange={(e) => setSelectedBacksight(e.target.value)}
                className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-xl px-4 py-2 pr-10 outline-none focus:border-cyan-500/50 transition-all min-w-[160px] font-mono cursor-pointer hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <option value="">Επιλέξτε B.S.</option>
                {backsights.map(bs => <option key={bs} value={bs}>{bs}</option>)}
              </select>
              <Compass size={12} className="absolute right-3.5 top-3 text-slate-600 pointer-events-none" />
            </div>
          </div>

          {selectedStation && selectedBacksight && (
            <div className="ml-4 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-full flex items-center justify-center animate-in fade-in slide-in-from-left-4">
              <span className="text-[9px] font-black tracking-widest text-emerald-500 ">
                {filteredPoints.length} ΣΗΜΕΙΑ ΦΟΡΤΩΘΗΚΑΝ
              </span>
            </div>
          )}
        </div>

        <button className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-all text-[10px] font-black tracking-widest border border-slate-800 shadow-lg active:scale-95 group">
          <Download size={14} className="group-hover:text-emerald-500 transition-colors" /> Export Results
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* TABLE SECTION */}
        <div className="flex-[1.4] bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TableIcon size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">Πίνακας Συντεταγμένων</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/50">
                  <th className="w-[15%] p-4 text-[10px] font-black text-slate-500 tracking-widest">ID</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">X [m]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Y [m]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Z [m]</th>
                  <th className="w-[25%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">Κωδικός</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredPoints.length > 0 ? (
                  filteredPoints.map((p, i) => (
                    <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="p-3 pl-5">
                        <span className="text-[12px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors tracking-tighter">#{p.pointId}</span>
                      </td>
                      <td className="p-3 font-mono text-[13px] text-slate-300 text-center">{p.x?.toFixed(3) || "0.000"}</td>
                      <td className="p-3 font-mono text-[13px] text-slate-300 text-center">{p.y?.toFixed(3) || "0.000"}</td>
                      <td className="p-3 font-mono text-[13px] text-cyan-500 text-center font-bold">{p.z?.toFixed(3) || "0.000"}</td>
                      <td className="p-3 pr-6 text-right">
                        <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-[9px] font-black text-slate-500 tracking-tighter group-hover:text-slate-300 transition-colors">
                          {p.code || "DETAIL"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                         <Info size={40} className="mb-4" />
                         <p className="text-[10px] font-black uppercase tracking-[0.3em]">Αναμονή Επιλογής Στάσης</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VISUALIZATION SECTION */}
        <div className="flex-1 bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapIcon size={16} className="text-pink-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">Διάγραμμα Στάσης</span>
            </div>
          </div>
          
          <div className="flex-1 bg-[#030712] m-5 rounded-xl border border-slate-800/50 relative overflow-hidden flex items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_center,#4f46e5_1px,transparent_1px)] bg-[size:20px_20px]"></div>

            {selectedStation ? (
              <div className="relative z-10 flex flex-col items-center">
                {/* Το εικονίδιο της στάσης στο κέντρο */}
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/5 opacity-50"></div>
                  <Crosshair size={24} className="text-emerald-500" />
                </div>
                <div className="mt-4 text-center">
                  <span className="text-[14px] font-mono font-black text-slate-200">{selectedStation}</span>
                  <p className="text-[8px] font-black text-slate-500 tracking-widest mt-1">Center Point</p>
                </div>

                {/* Εικονικά σημεία (placeholder for actual SVG plot) */}
                <div className="absolute -inset-24 pointer-events-none opacity-40">
                   {filteredPoints.slice(0, 12).map((_, i) => (
                     <div 
                      key={i}
                      className="absolute w-1 h-1 bg-pink-500 rounded-full"
                      style={{
                        top: `${50 + 40 * Math.sin(i)}%`,
                        left: `${50 + 40 * Math.cos(i)}%`
                      }}
                     />
                   ))}
                </div>
              </div>
            ) : (
              <div className="text-center z-10 opacity-30">
                 <MapIcon size={32} className="mx-auto mb-3 text-slate-700" />
                 <p className="text-[8px] tracking-[0.4em] text-slate-600 font-black uppercase">Polar Engine Ready</p>
              </div>
            )}

            {/* Float Info Label */}
            {selectedStation && (
              <div className="absolute bottom-6 left-6 right-6 bg-slate-950/80 border border-slate-800 p-4 rounded-xl backdrop-blur-md flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-slate-500 font-black tracking-widest">Στάση</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">{selectedStation}</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[8px] text-slate-500 font-black tracking-widest">Προσανατολισμός</span>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">{selectedBacksight || "None"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tacheometry;