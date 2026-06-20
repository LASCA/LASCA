import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Crosshair, Compass, Table as TableIcon, Map as MapIcon, Info, ChevronRight, Play, Cpu, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Tachymetry = ({ tachymetryData = {}, setTachymetryData }) => {
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedOrientation, setSelectedOrientation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const measurements = tachymetryData.measurements || [];
  const stationsData = tachymetryData.stations || [];
  const computedResults = tachymetryData.results || [];

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

  const stations = useMemo(() => {
    const unique = filledMeasurements.map(p => p._filledStation).filter(Boolean);
    return [...new Set(unique)].sort();
  }, [filledMeasurements]);

  const activeStation = selectedStation || (stations.length > 0 ? stations[0] : "");

  const orientations = useMemo(() => {
    if (!activeStation) return [];
    const unique = filledMeasurements
      .filter(p => p._filledStation.toUpperCase() === activeStation.toUpperCase())
      .map(p => p._filledOrientation)
      .filter(Boolean);
    return [...new Set(unique)].sort();
  }, [filledMeasurements, activeStation]);

  const activeOrientation = selectedOrientation || (orientations.length > 0 ? orientations[0] : "");

  const filteredPoints = useMemo(() => {
    if (!activeStation || !activeOrientation) return [];
    return filledMeasurements.filter(p => 
      p._filledStation.toUpperCase() === activeStation.toUpperCase() && 
      p._filledOrientation.toUpperCase() === activeOrientation.toUpperCase()
    );
  }, [filledMeasurements, activeStation, activeOrientation]);

  const handleCalculate = async () => {
    if (!measurements.length || !stationsData.length) {
      toast.error("Λείπουν δεδομένα μετρήσεων ή στάσεων από το Excel.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/tachymetry', {
        measurements: measurements,
        stations: stationsData
      });

      if (response.data && response.data.results) {
        setTachymetryData({
          ...tachymetryData,
          results: response.data.results
        });
        toast.success("Οι συντεταγμένες υπολογίστηκαν επιτυχώς!");
      }
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error("Αποτυχία υπολογισμού. Ελέγξτε το Backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const svgBounds = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const xs = filteredPoints.map(p => Number(p.Hz || 0)).filter(v => !isNaN(v) && v !== 0);
    const ys = filteredPoints.map(p => Number(p.SD || 0)).filter(v => !isNaN(v) && v !== 0);
    if (xs.length === 0 || ys.length === 0) return null;
    return true; 
  }, [filteredPoints]);

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
                  {stations.length === 0 && <option value="">Χωρίς Στάσεις</option>}
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

                    const resPoint = computedResults.find(r => String(r['Σημείο']) === String(ptId) && String(r['Στάση']) === String(p._filledStation));

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

        <div className="flex-1 bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col relative group">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapIcon size={16} className="text-pink-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">Σκαρίφημα Στάσης</span>
            </div>
          </div>
          
          <div className="flex-1 bg-[#030712] m-5 rounded-xl border border-slate-800/50 relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            {filteredPoints.length > 0 && svgBounds ? (
              <svg viewBox="0 0 400 400" className="w-full h-full max-h-[380px] z-10 select-none">
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
            ) : (
              <div className="text-center z-10 opacity-30">
                 <MapIcon size={32} className="mx-auto mb-3 text-slate-700" />
                 <p className="text-[8px] tracking-[0.4em] text-slate-600 font-black uppercase">Polar Engine Ready</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tachymetry;