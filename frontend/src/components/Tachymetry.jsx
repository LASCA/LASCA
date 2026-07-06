import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { 
  Crosshair, Compass, Table as TableIcon, Map as MapIcon, Info, ChevronRight, 
  Play, Cpu, CheckCircle, Maximize2, Download, X, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Tachymetry = ({ tachymetryData = {}, setTachymetryData }) => {
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
    if (!measurements.length || !stationsData.length) {
      toast.error("Λείπουν δεδομένα μετρήσεων ή στάσεων από το Excel.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/tachymetry', {
        measurements: filledMeasurements,    
        stations: stationsData,
        station_name: activeStation,        
        orientation_name: activeOrientation   
      }, {
        // ΠΡΟΣΘΗΚΗ: Στέλνουμε το όνομα του Project στα Headers!
        headers: {
          'Active-Project': typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || '')
        }
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
        select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 0.8em;
        }
      `}</style>

      <div className="flex flex-1 gap-6 min-h-0 pt-2">
        {/* ΑΡΙΣΤΕΡΟ ΠΑΝΕΛ */}
        <div className="flex-[1.6] bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-max">
              <TableIcon size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">Ταχυμετρια</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={activeStation}
                  onChange={(e) => { setSelectedStation(e.target.value); setSelectedOrientation(""); }}
                  className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-3 py-1.5 pr-8 outline-none focus:border-emerald-500/50 transition-all min-w-[120px] font-mono cursor-pointer hover:bg-slate-900"
                >
                  {stations.length === 0 && <option value="">Xωρίς Στάσεις</option>}
                  {stations.map(s => <option key={s} value={s}>Στάση: {s}</option>)}
                </select>
                <Crosshair size={12} className="absolute right-2.5 top-2.5 text-slate-600 pointer-events-none" />
              </div>

              <ChevronRight size={12} className="text-slate-700" />

              <div className="relative">
                <select 
                  value={activeOrientation} 
                  disabled={!activeStation}
                  onChange={(e) => setSelectedOrientation(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-3 py-1.5 pr-8 outline-none focus:border-cyan-500/50 transition-all min-w-[120px] font-mono cursor-pointer hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {orientations.length === 0 && <option value="">Χωρίς Προσ.</option>}
                  {orientations.map(o => <option key={o} value={o}>Προσ.: {o}</option>)}
                </select>
                <Compass size={12} className="absolute right-2.5 top-2.5 text-slate-600 pointer-events-none" />
              </div>

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
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">
                {viewMode === 'local' ? "Σκαρίφημα Στάσης" : "Συνολικό Δίκτυο"}
              </span>
            </div>

            {plotImage && (
              <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('local')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'local' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Πολικό
                </button>
                <button
                  onClick={() => setViewMode('global')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'global' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Δίκτυο (Matplotlib)
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