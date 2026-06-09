import React, { useState, useMemo } from 'react';
import { 
  Crosshair, Compass, Table as TableIcon, Map as MapIcon, Info, ChevronRight 
} from 'lucide-react';

const Tachymetry = ({ data = [] }) => {
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedOrientation, setSelectedOrientation] = useState("");

  // Εξασφάλιση εγκυρότητας των δεδομένων εισόδου
  const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  // 1. Διάβασμα των διαθέσιμων Στάσεων από τη στήλη "Station"
  const stations = useMemo(() => {
    const uniqueStations = safeData
      .map(p => String(p.Station || p.From || p.station || "").trim())
      .filter(Boolean);
    return [...new Set(uniqueStations)].sort();
  }, [safeData]);

  // Ενεργή στάση (αν δεν έχει επιλεγεί χειροκίνητα, παίρνει την πρώτη διαθέσιμη)
  const activeStation = selectedStation || (stations.length > 0 ? stations[0] : "");

  // 2. Διάβασμα των διαθέσιμων Προσανατολισμών για την επιλεγμένη Στάση από τη στήλη "Orientation" ή "O"
  const orientations = useMemo(() => {
    if (!activeStation) return [];
    
    // Φιλτράρουμε τις γραμμές που ανήκουν στην ενεργή στάση
    const stationRows = safeData.filter(p => 
      String(p.Station || p.From || p.station || "").toUpperCase() === activeStation.toUpperCase()
    );
    
    const uniqueOrientations = stationRows
      .map(p => String(p.Orientation || p.O || p.backsight || "").trim())
      .filter(Boolean);
      
    return [...new Set(uniqueOrientations)].sort();
  }, [safeData, activeStation]);

  // Ενεργός προσανατολισμός (αν δεν έχει επιλεγεί χειροκίνητα, παίρνει τον πρώτο διαθέσιμο της στάσης)
  const activeOrientation = selectedOrientation || (orientations.length > 0 ? orientations[0] : "");

  // 3. Φιλτράρισμα των σημείων λεπτομέρειας για τον συγκεκριμένο συνδυασμό Στάσης + Προσανατολισμού
  const filteredPoints = useMemo(() => {
    if (!activeStation || !activeOrientation) return [];

    return safeData.filter(p => {
      const rowStation = String(p.Station || p.From || p.station || "").toUpperCase().trim();
      const rowOrientation = String(p.Orientation || p.O || p.backsight || "").toUpperCase().trim();
      
      return rowStation === activeStation.toUpperCase() && rowOrientation === activeOrientation.toUpperCase();
    });
  }, [safeData, activeStation, activeOrientation]);

  // Αυτόματο scale για το σχεδιαστικό διάγραμμα (SVG)
  const svgBounds = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    
    // Διάβασμα των τιμών (είτε έχουν υπολογιστεί ως X/Y είτε χρησιμοποιούμε τις πολικές Hz/SD για το γράφημα)
    const xs = filteredPoints.map(p => Number(p.X || p.x || p.Hz || 0)).filter(v => !isNaN(v) && v !== 0);
    const ys = filteredPoints.map(p => Number(p.Y || p.y || p.SD || 0)).filter(v => !isNaN(v) && v !== 0);
    
    if (xs.length === 0 || ys.length === 0) return null;

    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const padX = (maxX - minX) * 0.15 || 15; const padY = (maxY - minY) * 0.15 || 15;

    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
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
        {/* ΑΡΙΣΤΕΡΟ PANEL: ΠΙΝΑΚΑΣ ΜΕΤΡΗΣΕΩΝ / ΑΠΟΤΕΛΕΣΜΑΤΩΝ */}
        <div className="flex-[1.4] bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-max">
              <TableIcon size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">Δεδομένα Ταχυμετρίας</span>
            </div>

            <div className="flex items-center gap-3">
              {/* 1ος Ελεγκτής: Επιλογή Στάσης */}
              <div className="relative">
                <select 
                  value={activeStation}
                  onChange={(e) => { 
                    setSelectedStation(e.target.value); 
                    setSelectedOrientation(""); // Reset του προσανατολισμού όταν αλλάζει η στάση
                  }}
                  className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-3 py-1.5 pr-8 outline-none focus:border-emerald-500/50 transition-all min-w-[145px] font-mono cursor-pointer hover:bg-slate-900"
                >
                  {stations.length === 0 && <option value="">Χωρίς Στάσεις</option>}
                  {stations.map(s => <option key={s} value={s}>Στάση: {s}</option>)}
                </select>
                <Crosshair size={12} className="absolute right-2.5 top-2.5 text-slate-600 pointer-events-none" />
              </div>

              <ChevronRight size={12} className="text-slate-700" />

              {/* 2ος Ελεγκτής: Επιλογή Προσανατολισμού */}
              <div className="relative">
                <select 
                  value={activeOrientation} 
                  disabled={!activeStation}
                  onChange={(e) => setSelectedOrientation(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-3 py-1.5 pr-8 outline-none focus:border-cyan-500/50 transition-all min-w-[145px] font-mono cursor-pointer hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {orientations.length === 0 && <option value="">Χωρίς Προσ.</option>}
                  {orientations.map(o => <option key={o} value={o}>Προσ.: {o}</option>)}
                </select>
                <Compass size={12} className="absolute right-2.5 top-2.5 text-slate-600 pointer-events-none" />
              </div>

              {filteredPoints.length > 0 && (
                <div className="ml-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-black tracking-widest text-emerald-500">{filteredPoints.length} ΣΗΜΕΙΑ</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/50">
                  <th className="w-[15%] p-4 text-[10px] font-black text-slate-500 tracking-widest">Point ID</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">Hz [gon]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">V / Z [gon]</th>
                  <th className="w-[20%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-center">SD [m]</th>
                  <th className="w-[25%] p-4 text-[10px] font-black text-slate-500 tracking-widest text-right">Υψ. Στόχου</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredPoints.length > 0 ? (
                  filteredPoints.map((p, i) => {
                    // Ανάγνωση των τιμών από το Excel αρχείο σου
                    const ptId = p.Point_ID || p.pointId || p.PointID || (i + 1);
                    const hzVal = p.Hz || p.HZ || p.hz || 0;
                    const zVal = p.Z || p.z || p.V || 0;
                    const sdVal = p.SD || p.sd || p.Sd || 0;
                    const tgHeight = p.TargetHeight || p.Target_Height || p.targetHeight || "-";

                    return (
                      <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                        <td className="p-3 pl-5"><span className="text-[12px] font-bold text-slate-400">#{ptId}</span></td>
                        <td className="p-3 font-mono text-[13px] text-slate-300 text-center">{Number(hzVal).toFixed(4)}</td>
                        <td className="p-3 font-mono text-[13px] text-slate-300 text-center">{Number(zVal).toFixed(4)}</td>
                        <td className="p-3 font-mono text-[13px] text-cyan-500 text-center font-bold">{Number(sdVal).toFixed(3)}</td>
                        <td className="p-3 pr-6 text-right"><span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-slate-400">{tgHeight} m</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="p-24 text-center">
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

        {/* ΔΕΞΙ PANEL: ΔΙΑΓΡΑΜΜΑ ΣΤΑΘΜΟΥ (SVG CANVAS) */}
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
                  
                  // Μετατροπή gon σε ακτίνια (rad) για τη σχεδίαση στο SVG
                  const angleRad = (hzVal * Math.PI) / 200;
                  
                  // Κανονικοποίηση της απόστασης για να χωράει όμορφα στο γράφημα
                  const maxDistance = Math.max(...filteredPoints.map(pt => Number(pt.SD || 1)));
                  const scaledRadius = (sdVal / maxDistance) * 130;
                  
                  // Υπολογισμός τοπικών X, Y θέσεων γύρω από το κέντρο (200, 200)
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
                
                {/* Κέντρο (Θέση Οργάνου / Στάση) */}
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