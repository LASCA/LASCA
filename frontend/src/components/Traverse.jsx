import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { 
  Map as MapIcon, Info, Database, Activity, Target, Ruler,
  Play, Cpu, Image as ImageIcon, Maximize2, Download, X, ChevronDown
} from 'lucide-react';

// --- CUSTOM DROPDOWN COMPONENT ΓΙΑ ΤΕΛΕΙΟ UI ---
const CustomDropdown = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Κλείσιμο του μενού αν ο χρήστης κάνει κλικ εκτός
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1 group relative" ref={dropdownRef}>
      <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-3 py-1.5 outline-none focus:border-amber-500/50 transition-all cursor-pointer font-mono hover:border-slate-700 flex items-center justify-between gap-3 min-w-[120px]"
      >
        <span>{options.find(opt => opt.value === value)?.label || value}</span>
        <ChevronDown size={12} className={`text-amber-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-[#0b1120] border border-slate-800/80 rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-[10px] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 transition-colors text-xs ${
                  value === opt.value 
                    ? 'text-amber-400 font-bold bg-amber-500/5 border-l-2 border-amber-500' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Traverse = ({ data = [], setData, metrics = {}, setMetrics, projectSettings }) => {
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [klass, setKlass] = useState(metrics.klass || "Πρωτεύουσα");
  const [terrain, setTerrain] = useState(metrics.terrain || "Ομαλό");
  const [scale, setScale] = useState(metrics.scale || "1:1000");

  useEffect(() => {
    if (metrics.klass) setKlass(metrics.klass);
    if (metrics.terrain) setTerrain(metrics.terrain);
    if (metrics.scale) setScale(metrics.scale);
  }, [metrics]);

  const plotImage = metrics.plotImage || null;

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    if (setData) setData(newData); 
  };

  const handleKeyDown = (e, rowIndex, colName) => {
    const columns = ['name', 'hz', 'sd', 'x', 'y', 'h'];
    const colIndex = columns.indexOf(colName);
    
    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = rowIndex + 1;
      shouldMove = true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = rowIndex - 1;
      shouldMove = true;
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        nextCol = colIndex - 1;
        shouldMove = true;
      }
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionEnd === e.target.value.length) {
        e.preventDefault();
        nextCol = colIndex + 1;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < data.length && nextCol >= 0 && nextCol < columns.length) {
        const nextColName = columns[nextCol];
        const nextInput = document.getElementById(`input-${nextRow}-${nextColName}`);
        if (nextInput) {
          nextInput.focus();
          setTimeout(() => nextInput.select(), 0); 
        }
      }
    }
  };

  const formatVal = (val, decimals = 4) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  const handleRunTraverse = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/traverse', {
        measurements: data,
        scale: scale,
        terrain: terrain,
        klass: klass
      },{
        headers: {
          'Active-Project': typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || '')
        }
      });

      if (response.data) {
        if (response.data.results && setData) {
          setData(response.data.results);
        }
        if (setMetrics) {
          setMetrics({
            ...(response.data.metrics || {}),
            plotImage: response.data.plot || null,
            klass: klass,
            terrain: terrain,
            scale: scale
          });
        }
      }
    } catch (error) {
      console.error("Σφάλμα κατά την Όδευση:", error);
      alert("Αποτυχία υπολογισμού όδευσης.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!plotImage) return;
    const a = document.createElement('a');
    a.href = plotImage;
    a.download = 'traverse_plot.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `
      }} />

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ */}
        <div className="flex-[1.6] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          
          {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ */}
          <div className="flex-none min-h-[550px] flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Database size={18} className="text-amber-500" />
                  </div>
                  <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200 uppercase">Δεδομένα Όδευσης</span>
                </div>

                {/* ΝΕΑ CUSTOM DROPDOWNS ΠΟΥ ΑΝΤΙΚΑΘΙΣΤΟΥΝ ΤΑ SELECT */}
                <div className="flex items-center gap-5 border-l border-slate-800/60 pl-6">
                  <CustomDropdown 
                    label="Τάξη" 
                    value={klass} 
                    onChange={setKlass} 
                    options={[
                      { value: "Πρωτεύουσα", label: "Ι (Πρωτεύουσα)" },
                      { value: "Δευτερεύουσα", label: "ΙΙ (Δευτερεύουσα)" }
                    ]} 
                  />
                  <CustomDropdown 
                    label="Έδαφος" 
                    value={terrain} 
                    onChange={setTerrain} 
                    options={[
                      { value: "Ομαλό", label: "Ομαλό" },
                      { value: "Κεκλιμένο", label: "Κεκλιμένο" },
                      { value: "Ανώμαλο", label: "Ανώμαλο" }
                    ]} 
                  />
                  <CustomDropdown 
                    label="Κλίμακα" 
                    value={scale} 
                    onChange={setScale} 
                    options={[
                      { value: "1:200", label: "1:200" },
                      { value: "1:500", label: "1:500" },
                      { value: "1:1000", label: "1:1000" },
                      { value: "1:2000", label: "1:2000" }
                    ]} 
                  />
                </div>
              </div>

              {/* ΚΟΥΜΠΙ όδευσης */}
              <button 
                type="button"
                onClick={handleRunTraverse}
                disabled={isLoading}
                title="Εκτέλεση Όδευσης"
                className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] ${
                  isLoading 
                    ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer'
                }`}
              >
                {isLoading ? (
                   <Cpu size={14} className="animate-spin text-emerald-500" />
                ) : (
                   <Play size={14} fill="currentColor" className="text-emerald-500 group-hover:text-cyan-400 transition-colors ml-0.5" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                  <tr className="border-b border-slate-800/60">
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest">Station</th>
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest text-center">Hz [grad]</th>
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest text-center">Slope_D [m]</th>
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest text-right">X [m]</th>
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest text-right">Y [m]</th>
                    <th className="w-[16.6%] p-4 text-[10px] font-black text-slate-400 tracking-widest text-right">H [m]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 bg-[#070c19]/20">
                  {data && data.length > 0 ? (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-emerald-500/[0.04] active:bg-emerald-500/[0.08] transition-all duration-150 group">
                        <td className="p-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-none ${row.name?.toString().startsWith('Σ') ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse' : 'bg-slate-600 group-hover:bg-slate-400 transition-colors'}`} />
                          <input 
                            id={`input-${idx}-name`}
                            type="text"
                            value={row.name ?? ""}
                            onChange={(e) => handleInputChange(idx, 'name', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'name')}
                            className="bg-transparent w-full font-bold text-slate-200 group-hover:text-white text-sm tracking-tight outline-none focus:bg-slate-800 focus:ring-1 focus:ring-slate-400/80 rounded px-2 py-2 transition-all"
                            placeholder="Name"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-${idx}-hz`}
                          type="text"
                          value={
                            document.activeElement?.id === `input-${idx}-hz`
                              ? (row.hz ?? "")
                              : formatVal(row.hz, 4)
                          }
                          onChange={(e) => handleInputChange(idx, 'hz', e.target.value)}
                          onBlur={(e) => handleInputChange(idx, 'hz', formatVal(e.target.value, 4))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'hz')}
                          className="bg-transparent w-full font-mono text-cyan-400 font-bold text-center text-sm tracking-wide outline-none focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-${idx}-sd`}
                          type="text"
                          value={
                          document.activeElement?.id === `input-${idx}-sd`
                            ? (row.sd ?? "")
                            : formatVal(row.sd, 3)
                          }
                          onChange={(e) => handleInputChange(idx, 'sd', e.target.value)}
                          onBlur={(e) => handleInputChange(idx, 'sd', formatVal(e.target.value, 3))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'sd')}
                          className="bg-transparent w-full font-mono text-cyan-400 font-bold text-center text-sm tracking-wide outline-none focus:bg-slate-800 focus:ring-1 focus:ring-cyan-400/80 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-${idx}-x`}
                          type="text"
                          value={row.x ?? ""}
                          onChange={(e) => handleInputChange(idx, 'x', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'x')}
                          className="bg-transparent w-full font-mono text-emerald-400 font-bold text-right tabular-nums text-sm tracking-wide outline-none focus:bg-slate-800 focus:ring-1 focus:ring-emerald-400/80 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-${idx}-y`}
                          type="text"
                          value={row.y ?? ""}
                          onChange={(e) => handleInputChange(idx, 'y', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'y')}
                          className="bg-transparent w-full font-mono text-emerald-400 font-bold text-right tabular-nums text-sm tracking-wide outline-none focus:bg-slate-800 focus:ring-1 focus:ring-emerald-400/80 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-${idx}-h`}
                          type="text"
                          value={
                            document.activeElement?.id === `input-${idx}-h`
                              ? (row.h ?? "")
                              : formatVal(row.h, 3)
                          }
                          onChange={(e) => handleInputChange(idx, 'h', e.target.value)}
                          onBlur={(e) => handleInputChange(idx, 'h', formatVal(e.target.value, 3))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'h')}
                          className="bg-transparent w-full font-mono text-emerald-400 font-bold text-right tabular-nums text-sm tracking-wide outline-none focus:bg-slate-800 focus:ring-1 focus:ring-emerald-400/80 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-24 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <Info size={30} className="text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Αναμονή Δεδομένων</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ΓΕΩΔΑΙΤΙΚΟΙ ΕΛΕΓΧΟΙ */}
          <div className="flex-none bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-800/50 pb-3">
              <Activity size={16} className="text-cyan-500" />
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">Γεωδαιτικοί Έλεγχοι & Σφάλματα</span>
            </div>
            
            <div className="flex flex-row gap-4 items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <CompactStat label="Κορυφές (n)" value={metrics.n} icon={<Target size={12}/>} color="text-slate-200" />
                  <CompactStat label="Μήκος (L)" value={metrics.totalLength} unit="m" icon={<Ruler size={12}/>} color="text-slate-200" />
                </div>
                <DetailedAngleGroup 
                  title="Γωνιακό Σφάλμα (Wβ)"
                  target={metrics.gTarget} actual={metrics.gActual} error={metrics.fb} wbi={metrics.wbi}
                  labels={["G (πρέπει)", "G (είναι)", "Wβ", "Wβi"]}
                />
              </div>

              <div className="flex-1">
                <DetailedLinearGroup 
                  title="Γραμμική ανάλυση"
                  xTarget={metrics.dxTarget} xActual={metrics.dxActual} xError={metrics.dx}
                  yTarget={metrics.dyTarget} yActual={metrics.dyActual} yError={metrics.dy}
                  ds={metrics.w}
                  labels={["ΔX (πρέπει)", "ΔX (είναι)", "δx", "ΔY (πρέπει)", "ΔY (είναι)", "δy", "δs (W)"]}
                />
              </div>
            </div>

            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
               <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-1">
                   <span className="text-[10px] text-slate-500 font-black tracking-tighter">Μέγιστο Γωνιακό (Wβ Max)</span>
                   <span className="text-xs font-mono font-bold text-amber-500">{metrics.Wb_max || "---"} grad</span>
                 </div>
                 <div className="flex flex-col gap-1 border-l border-slate-800/50 px-6">
                   <span className="text-[10px] text-slate-500 font-black tracking-tighter">Μέγιστο Γραμμικό (δs Max)</span>
                   <span className="text-xs font-mono font-bold text-emerald-500">{metrics.ds_max || "---"} m</span>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="h-4 flex-none" />
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: ΟΠΤΙΚΟΠΟΙΗΣΗ */}
        <div className="flex-1 flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <MapIcon size={18} className="text-pink-500" />
              </div>
              <span className="font-bold text-[11px] tracking-[0.2em] text-slate-200">Οπτικοποίηση</span>
            </div>
          </div>
          
          {plotImage ? (
             <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[#121212] relative overflow-hidden group">
               <TransformWrapper
                 initialScale={1}
                 minScale={1}
                 maxScale={10}
                 centerOnInit={true}
                 wheel={{ step: 0.03 }}
                 pinch={{ step: 1 }}
               >
                 <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: "move" }}>
                   <img 
                     src={plotImage} 
                     alt="Διάγραμμα Όδευσης" 
                     className="max-w-full max-h-full object-contain p-4 pointer-events-none"
                   />
                 </TransformComponent>
               </TransformWrapper>
               
               <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                 <button
                   onClick={() => setIsFullscreen(true)}
                   className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600/50 shadow-lg"
                   title="Πλήρης Οθόνη"
                 >
                   <Maximize2 size={16} />
                 </button>
                 <button
                   onClick={handleDownload}
                   className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600/50 shadow-lg"
                   title="Λήψη"
                 >
                   <Download size={16} />
                 </button>
               </div>
             </div>
          ) : (
             <div className="flex-1 bg-[#030712] m-4 rounded-xl border border-slate-800/50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                <div className="text-center z-10">
                   <ImageIcon size={32} className="mx-auto mb-3 text-slate-800 group-hover:text-pink-500/40 transition-all duration-700" />
                   <p className="text-[8px] tracking-[0.4em] text-slate-700 font-black uppercase">Visual Engine Ready</p>
                </div>
             </div>
          )}
        </div>

      </div>

      {/* FULLSCREEN OVERLAY MODAL */}
      {isFullscreen && plotImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-600/50 group z-50 shadow-2xl"
            title="Κλείσιμο"
          >
            <X size={24} className="group-hover:text-pink-500 transition-colors" />
          </button>

          <button
            onClick={handleDownload}
            className="absolute top-6 right-24 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-600/50 group z-50 shadow-2xl"
            title="Λήψη"
          >
            <Download size={24} className="group-hover:text-emerald-500 transition-colors" />
          </button>

          <div className="w-full h-full flex items-center justify-center cursor-move">
            <TransformWrapper
              initialScale={1}
              minScale={1} 
              maxScale={8}
              centerOnInit={true}
              wheel={{ step: 0.02 }}
              pinch={{ step: 1 }}
            >
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <img
                  src={plotImage}
                  alt="Διάγραμμα Όδευσης Fullscreen"
                  className="max-w-[95vw] max-h-[95vh] object-contain p-4 rounded-lg pointer-events-none"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-xs tracking-widest uppercase bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50 backdrop-blur-sm pointer-events-none">
            Scroll για Zoom • Drag για Περιήγηση
          </div>
        </div>
      )}
    </div>
  );
};

const CompactStat = ({ label, value, unit, icon, color }) => (
  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
    <div className="text-slate-500">{icon}</div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-500 tracking-widest">{label}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>
        {value !== undefined && value !== null ? value : "0"}{unit || ""}
      </span>
    </div>
  </div>
);

const DetailedAngleGroup = ({ title, target, actual, error, wbi, labels }) => (
  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3">
    <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
    
    <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-800/30 pb-3">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 font-bold">{labels[0]}</span>
        <span className="text-[12px] font-mono text-slate-200">{target || "---"}</span>
      </div>
      <div className="flex flex-col gap-1 border-l border-slate-800/50">
        <span className="text-[9px] text-slate-500 font-bold">{labels[1]}</span>
        <span className="text-[12px] font-mono text-slate-200">{actual || "---"}</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-1">
      <div className="flex justify-between items-center px-2">
        <span className="text-[9px] text-amber-500/70 font-bold">{labels[2]}</span>
        <span className="text-[13px] font-mono text-amber-500 font-bold">{error || "---"}</span>
      </div>
      <div className="flex justify-between items-center px-2 border-l border-slate-800/50">
        <span className="text-[9px] text-amber-500/70 font-bold">{labels[3]}</span>
        <span className="text-[13px] font-mono text-amber-500/90">{wbi || "---"}</span>
      </div>
    </div>
  </div>
);

const DetailedLinearGroup = ({ title, xTarget, xActual, xError, yTarget, yActual, yError, ds, labels }) => (
  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3 h-full">
    <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
    
    {[0, 3].map((startIndex) => {
      const targetVal = startIndex === 0 ? xTarget : yTarget;
      const actualVal = startIndex === 0 ? xActual : yActual;
      const errorVal = startIndex === 0 ? xError : yError;

      return (
        <div 
          key={startIndex} 
          className={`grid grid-cols-3 gap-2 text-center ${startIndex === 0 ? 'border-b border-slate-800/30 pb-3' : ''}`}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 font-bold">{labels[startIndex]}</span>
            <span className="text-[12px] font-mono text-slate-200">{targetVal || "---"}</span>
          </div>
          <div className="flex flex-col gap-1 border-x border-slate-800/50">
            <span className="text-[9px] text-slate-500 font-bold">{labels[startIndex+1]}</span>
            <span className="text-[12px] font-mono text-slate-200">{actualVal || "---"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-amber-500/70 font-bold">{labels[startIndex+2]}</span>
            <span className="text-[12px] font-mono text-amber-500 font-bold">{errorVal || "---"}</span>
          </div>
        </div>
      );
    })}

    <div className="flex justify-between items-center px-2 mt-auto pt-4 border-t border-slate-800/50">
      <span className="text-[10px] font-bold text-slate-500 tracking-wider">{labels[6]}</span>
      <span className="text-[14px] font-mono font-black text-emerald-400">{ds || "---"} m</span>
    </div>
  </div>
);

export default Traverse;