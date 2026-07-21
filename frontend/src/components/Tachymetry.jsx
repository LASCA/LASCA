import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { 
  Crosshair, Compass, LayoutGrid, Map as MapIcon, Info, ChevronRight, 
  Play, Cpu, CheckCircle, Maximize2, Download, X, Image as ImageIcon, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- CUSTOM DROPDOWN COMPONENT ΓΙΑ ΤΕΛΕΙΟ UI ---
// --- CUSTOM DROPDOWN COMPONENT ΓΙΑ ΤΕΛΕΙΟ UI ---
const CustomDropdown = ({ value, onChange, options, disabled, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-[#0f172a] border ${isOpen ? 'border-emerald-500' : 'border-slate-800'} text-[11px] text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/50 transition-all font-mono hover:border-emerald-500/50 flex items-center justify-between gap-3 min-w-[130px] w-full ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2">
          <span>{options.find(opt => opt.value === value)?.label || value || "Επιλογή..."}</span>
        </div>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-slate-500 group-hover:text-emerald-500/70 transition-colors" />}
          <ChevronDown size={14} className={`text-emerald-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-[#0f172a] border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-[11px] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col py-1">
            {options.map((opt) => {
              const isActive = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 transition-colors text-xs border-l-[3px] ${
                    isActive
                      ? 'border-emerald-500 bg-slate-800/60 text-emerald-500 font-bold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Tachymetry = ({ 
  tachymetryData = {}, 
  setTachymetryData, 
  projectSettings,
  traverseData = [] 
}) => {
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedOrientation, setSelectedOrientation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('local'); 
  const [isFullscreen, setIsFullscreen] = useState(false); 

  const measurements = tachymetryData.measurements || [];
  const stationsData = tachymetryData.stations || [];
  const computedResults = tachymetryData.results || [];

  // 1. ΓΕΜΙΣΜΑ ΜΕΤΡΗΣΕΩΝ (FILL DOWN)
  const filledMeasurements = useMemo(() => {
    let lastSt = "";
    let lastOr = "";
    return measurements.map(row => {
      const st = row.Station || row.From || row.station || row.Station_Name;
      const or = row.Orientation || row.O || row.backsight;
      if (st) lastSt = String(st).trim();
      if (or) lastOr = String(or).trim();
      return { ...row, _filledStation: lastSt, _filledOrientation: lastOr };
    });
  }, [measurements]);

  // Λίστα μοναδικών σταθμών για το 1ο Dropdown
  const stations = useMemo(() => {
    const unique = filledMeasurements.map(p => p._filledStation).filter(Boolean);
    return [...new Set(unique)].sort();
  }, [filledMeasurements]);

  const activeStation = selectedStation || (stations.length > 0 ? stations[0] : "");

  // Λίστα προσανατολισμών για το 2ο Dropdown (φιλτραρισμένα με βάση τον σταθμό)
  const orientations = useMemo(() => {
    if (!activeStation) return [];
    const unique = filledMeasurements
      .filter(p => p._filledStation.toUpperCase() === activeStation.toUpperCase())
      .map(p => p._filledOrientation)
      .filter(Boolean);
    return [...new Set(unique)].sort();
  }, [filledMeasurements, activeStation]);

  const activeOrientation = selectedOrientation || (orientations.length > 0 ? orientations[0] : "");

  // Προετοιμασία Options για τα Dropdowns
  const stationOpts = stations.length === 0 
    ? [{ value: "", label: "Χωρίς Στάσεις" }] 
    : stations.map(s => ({ value: s, label: `Στάση: ${s}` }));

  const orientationOpts = orientations.length === 0 
    ? [{ value: "", label: "Χωρίς Προσ." }] 
    : orientations.map(o => ({ value: o, label: `Στάση: ${o}` }));

  // Φιλτραρισμένα σημεία για τον πίνακα βασισμένα στα Dropdowns
  const filteredPoints = useMemo(() => {
    if (!activeStation || !activeOrientation) return [];
    return filledMeasurements.filter(p => 
      p._filledStation.toUpperCase() === activeStation.toUpperCase() && 
      p._filledOrientation.toUpperCase() === activeOrientation.toUpperCase()
    );
  }, [filledMeasurements, activeStation, activeOrientation]);

  // Δυναμικό διάβασμα του Matplotlib plot με βάση τον τρέχοντα συνδυασμό
  const plotImage = useMemo(() => {
    if (!activeStation || !activeOrientation) return null;
    const key = `${activeStation}_${activeOrientation}`;
    return tachymetryData.plots?.[key] || tachymetryData.plot || null;
  }, [tachymetryData.plots, tachymetryData.plot, activeStation, activeOrientation]);

  // 2. ΕΠΙΛΥΣΗ & ΥΠΟΛΟΓΙΣΜΟΣ (API CALL)
  const handleCalculate = async () => {
    if (!measurements.length) {
      toast.error("Λείπουν δεδομένα μετρήσεων.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/tachymetry', {
        project_name: projectSettings, 
        measurements: filledMeasurements,    
        stations: stationsData,
        station_name: activeStation,        
        orientation_name: activeOrientation   
      });

      if (response.data && response.data.results) {
        const comboKey = `${activeStation}_${activeOrientation}`;
        
        const incomingResults = response.data.results;
        const existingResults = tachymetryData.results || [];
        
        const filteredExisting = existingResults.filter(r => 
          !(String(r['Στάση']).toUpperCase() === activeStation.toUpperCase() && 
            String(r['Προσανατολισμός']).toUpperCase() === activeOrientation.toUpperCase())
        );
        
        const mergedResults = [...filteredExisting, ...incomingResults];
        
        setTachymetryData({
          ...tachymetryData,
          results: mergedResults,
          plots: {
            ...(tachymetryData.plots || {}),
            [comboKey]: response.data.plot 
          },
          plot: response.data.plot 
        });
        
        toast.success(`Επίλυση & σχεδίαση για τη Στάση ${activeStation} επιτυχής!`);
        setViewMode('global'); 
      }
    } catch (error) {
      console.error("Σφάλμα κατά την επίλυση ταχυμετρίας:", error);
      toast.error("Αποτυχία υπολογισμού. Ελέγξτε το Backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!plotImage) return;
    const a = document.createElement('a');
    a.href = plotImage;
    a.download = `tachymetry_plot_${activeStation}_${activeOrientation}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const svgBounds = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const xs = filteredPoints.map(p => Number(p.Hz || 0)).filter(v => !isNaN(v) && v !== 0);
    const ys = filteredPoints.map(p => Number(p.SD || 0)).filter(v => !isNaN(v) && v !== 0);
    if (xs.length === 0 || ys.length === 0) return null;
    return true; 
  }, [filteredPoints]);

  const renderLocalSVG = (isFull = false) => (
    <svg viewBox="0 0 400 400" className={`w-full h-full z-10 select-none ${isFull ? 'max-w-[95vw] max-h-[95vh]' : 'max-h-[380px]'}`}>
      <circle cx="200" cy="200" r="140" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
      
      {filteredPoints.map((p, i) => {
        const hzVal = Number(p.Hz || p.HZ || 0);
        const sdVal = Number(p.SD || p.sd || 0);
        const angleRad = (hzVal * Math.PI) / 200;
        const maxDistance = Math.max(...filteredPoints.map(pt => Number(pt.SD || 1)));
        const scaledRadius = (sdVal / maxDistance) * 130;
        
        const cx = 200 + scaledRadius * Math.sin(angleRad);
        const cy = 200 - scaledRadius * Math.cos(angleRad);
        const ptId = p.Point_ID || p.pointId || (i + 1);

        return (
          <g key={i}>
            <line x1="200" y1="200" x2={cx} y2={cy} stroke="#ec4899" strokeWidth="0.5" strokeOpacity="0.2" />
            <circle cx={cx} cy={cy} r="3.5" className="fill-pink-500 stroke-slate-950 stroke-1" />
            <text x={cx + 6} y={cy + 3} className="fill-slate-500 font-mono text-[9px] font-bold">{ptId}</text>
          </g>
        );
      })}
      
      <circle cx="200" cy="200" r="8" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="2" fill="#10b981" />
    </svg>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>

      <div className="flex flex-1 gap-6 min-h-0 pt-2">
        {/* ΑΡΙΣΤΕΡΟ ΠΑΝΕΛ */}
        <div className="flex-[1.6] bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between flex-wrap gap-4">
            
            {/* ΝΕΟ ΕΙΚΟΝΙΔΙΟ GRID */}
            <div className="flex items-center gap-3 min-w-max">
              <LayoutGrid size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">Ταχυμετρία</span>
            </div>

            <div className="flex items-center gap-3">
              {/* CUSTOM DROPDOWN ΣΤΑΣΗΣ */}
              <CustomDropdown 
                value={activeStation} 
                onChange={(val) => { setSelectedStation(val); setSelectedOrientation(""); }} 
                options={stationOpts} 
                icon={Crosshair} 
              />

              <ChevronRight size={12} className="text-slate-700" />

              {/* CUSTOM DROPDOWN ΠΡΟΣΑΝΑΤΟΛΙΣΜΟΥ */}
              <CustomDropdown 
                value={activeOrientation} 
                onChange={(val) => setSelectedOrientation(val)} 
                options={orientationOpts} 
                disabled={!activeStation}
                icon={Compass} 
              />

              <div className="border-l border-slate-800 pl-3 ml-1 flex items-center gap-2">
                {computedResults.length > 0 && <CheckCircle size={14} className="text-emerald-500" title="Έχει Υπολογιστεί" />}
                <button 
                  onClick={handleCalculate}
                  disabled={isLoading || measurements.length === 0}
                  className={`group flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-300 shadow-sm text-[10px] font-bold tracking-widest uppercase ${
                    isLoading 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  {isLoading ? <Cpu size={12} className="animate-spin" /> : <Play size={12} className="group-hover:text-emerald-300" />}
                  Επιλυση
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/50">
                  <th className="w-[10%] p-3 text-[9px] font-black text-slate-500 tracking-widest">P.ID</th>
                  <th className="w-[12%] p-3 text-[9px] font-black text-slate-500 tracking-widest text-center">Hz [gon]</th>
                  <th className="w-[12%] p-3 text-[9px] font-black text-slate-500 tracking-widest text-center">V [gon]</th>
                  <th className="w-[12%] p-3 text-[9px] font-black text-slate-500 tracking-widest text-center">SD [m]</th>
                  <th className="w-[15%] p-3 text-[9px] font-black text-emerald-500/70 tracking-widest text-right">X [m]</th>
                  <th className="w-[15%] p-3 text-[9px] font-black text-emerald-500/70 tracking-widest text-right">Y [m]</th>
                  <th className="w-[15%] p-3 text-[9px] font-black text-emerald-500/70 tracking-widest text-right">Z [m]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredPoints.length > 0 ? (
                  filteredPoints.map((p, i) => {
                    const ptId = p.Point_ID || p.pointId || p.PointID || (i + 1);
                    const hzVal = p.Hz || p.HZ || p.hz || 0;
                    const zVal = p.Z || p.z || p.V || 0;
                    const sdVal = p.SD || p.sd || p.Sd || 0;

                    const resPoint = computedResults.find(r => String(r['Σημείο']) === String(ptId) && String(r['Στάση']).toUpperCase() === String(p._filledStation).toUpperCase());

                    return (
                      <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                        <td className="p-2 pl-4"><span className="text-[11px] font-bold text-slate-400">#{ptId}</span></td>
                        <td className="p-2 font-mono text-[12px] text-slate-400 text-center">{Number(hzVal).toFixed(4)}</td>
                        <td className="p-2 font-mono text-[12px] text-slate-400 text-center">{Number(zVal).toFixed(4)}</td>
                        <td className="p-2 font-mono text-[12px] text-cyan-500/70 text-center">{Number(sdVal).toFixed(3)}</td>
                        <td className="p-2 font-mono text-[12px] text-emerald-400 font-bold text-right tracking-wide">{resPoint ? Number(resPoint.X).toFixed(3) : "-"}</td>
                        <td className="p-2 font-mono text-[12px] text-emerald-400 font-bold text-right tracking-wide">{resPoint ? Number(resPoint.Y).toFixed(3) : "-"}</td>
                        <td className="p-2 font-mono text-[12px] text-emerald-400 font-bold text-right tracking-wide pr-4">{resPoint ? Number(resPoint.Z).toFixed(3) : "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                         <Info size={40} className="mb-4" />
                         <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                           {stations.length > 0 ? "Δεν βρέθηκαν μετρήσεις λεπτομέρειας" : "Αναμονή εισαγωγής αρχείου Excel"}
                         </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ΔΕΞΙ ΠΑΝΕΛ */}
        <div className="flex-1 bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <MapIcon size={16} className="text-pink-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">
                {viewMode === 'local' ? "Σκαρίφημα Στάσης" : "Σκαρίφημα Στάσης"}
              </span>
            </div>

            {plotImage && (
              <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('local')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
                    viewMode === 'local' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Πολικό
                </button>
                <button
                  onClick={() => setViewMode('global')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all ${
                    viewMode === 'global' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Σκαρίφημα
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 bg-[#030712] m-5 rounded-xl border border-slate-800/50 relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            {viewMode === 'local' ? (
              filteredPoints.length > 0 && svgBounds ? (
                <TransformWrapper initialScale={1} minScale={1} maxScale={10} centerOnInit={true} wheel={{ step: 0.03 }} pinch={{ step: 1 }}>
                  {() => (
                    <>
                      <TransformComponent 
                        wrapperStyle={{ width: "100%", height: "100%", cursor: "move" }}
                        contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        {renderLocalSVG(false)}
                      </TransformComponent>
                      
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button onClick={() => setIsFullscreen(true)} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600/50 shadow-lg cursor-pointer">
                          <Maximize2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </TransformWrapper>
              ) : (
                <div className="text-center z-10 opacity-30">
                   <MapIcon size={32} className="mx-auto mb-3 text-slate-700" />
                   <p className="text-[8px] tracking-[0.4em] text-slate-600 font-black uppercase">Polar Engine Ready</p>
                </div>
              )
            ) : (
              plotImage ? (
                <TransformWrapper initialScale={1} minScale={1} maxScale={10} centerOnInit={true} wheel={{ step: 0.03 }} pinch={{ step: 1 }}>
                  {() => (
                    <>
                      <TransformComponent 
                        wrapperStyle={{ width: "100%", height: "100%", cursor: "move" }}
                        contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <img 
                          src={plotImage} 
                          alt="Τοπογραφικό Σκαρίφημα Δικτύου" 
                          className="max-w-full max-h-full object-contain pointer-events-none rounded-lg"
                        />
                      </TransformComponent>
                      
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button onClick={() => setIsFullscreen(true)} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600/50 shadow-lg cursor-pointer">
                          <Maximize2 size={16} />
                        </button>
                        <button onClick={handleDownload} className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600/50 shadow-lg cursor-pointer">
                          <Download size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </TransformWrapper>
              ) : (
                <div className="text-center z-10 opacity-30">
                   <ImageIcon size={32} className="mx-auto mb-3 text-slate-700" />
                   <p className="text-[8px] tracking-[0.4em] text-slate-600 font-black uppercase">Δεν έχει παραχθεί γράφημα δικτύου</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <TransformWrapper initialScale={1} minScale={1} maxScale={8} centerOnInit={true} wheel={{ step: 0.02 }} pinch={{ step: 1 }}>
            {() => (
              <>
                <button onClick={() => setIsFullscreen(false)} className="absolute top-6 right-6 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-600/50 group z-50 shadow-2xl cursor-pointer">
                  <X size={24} className="group-hover:text-pink-500" />
                </button>

                {viewMode === 'global' && (
                  <button onClick={handleDownload} className="absolute top-6 right-24 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-600/50 group z-50 shadow-2xl cursor-pointer">
                    <Download size={24} className="group-hover:text-emerald-500" />
                  </button>
                )}

                <div className="w-full h-full flex items-center justify-center cursor-move">
                  <TransformComponent 
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {viewMode === 'local' ? renderLocalSVG(true) : (
                      <img src={plotImage} alt="Διάγραμμα Ταχυμετρίας Fullscreen" className="max-w-[95vw] max-h-[95vh] object-contain p-4 rounded-lg pointer-events-none" />
                    )}
                  </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-xs tracking-widest uppercase bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50 backdrop-blur-sm pointer-events-none">
            Scroll για Zoom • Drag για Περιήγηση
          </div>
        </div>
      )}
    </div>
  );
};

export default Tachymetry;