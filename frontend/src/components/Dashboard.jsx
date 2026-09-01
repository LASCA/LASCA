import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { 
  Plus, FolderOpen, Upload, 
  FileSpreadsheet, LayoutGrid,
  Database, MapPin, Target, CheckCircle2, AlertCircle, Map, User,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

import { downloadSurveyTemplate } from '../utils/excel_template';

// Custom Tooltip για τον Χάρτη
const MapTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isStation = data.type === 'station';
    return (
      <div className="bg-[#0B1221]/95 backdrop-blur-sm border border-slate-700/80 p-3 rounded-xl shadow-2xl">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-700/50 pb-2">
          {isStation ? <Target size={14} className="text-blue-400" /> : <MapPin size={14} className="text-emerald-400" />}
          <p className="text-white font-bold text-[12px] tracking-wide">{data.name}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-slate-400 text-[10px] font-mono flex justify-between gap-4">
            <span>E (X):</span> <span className="text-slate-200 font-bold">{Number(data.x).toFixed(3)}</span>
          </p>
          <p className="text-slate-400 text-[10px] font-mono flex justify-between gap-4">
            <span>N (Y):</span> <span className="text-slate-200 font-bold">{Number(data.y).toFixed(3)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard = ({ 
  setObservations, 
  setTraverseData, 
  setTachymetryData, 
  setStakeoutData, 
  setGoniometryData,
  setLevelingObservations, 
  setLevelingStations,     
  setTrigLevelingData,
  onOpenProjectManager,
  
  projectSettings,
  traverseData = [],
  traverseMetrics,
  tachymetryData = { measurements: [], stations: [] },
  stakeoutData = { points: [] },
  levelingMetrics = null
}) => {

  const stationCount = traverseMetrics?.n || traverseData?.length || 0;
  const measurementCount = tachymetryData?.measurements?.length || 0;
  const stakeoutCount = stakeoutData?.points?.length || 0;
  
  const projectName = projectSettings?.name || 'My_Survey_Project.lasca';
  // Λήψη του ονόματος μηχανικού
  const engineerName = projectSettings?.designer || projectSettings?.settings?.designer || 'ΜΗ ΟΡΙΣΜΕΝΟΣ ΜΗΧΑΝΙΚΟΣ';
  
  const hasData = stationCount > 0 || measurementCount > 0 || stakeoutCount > 0;

  // Επεξεργασία δεδομένων για τον χάρτη
  const mapData = useMemo(() => {
    const stations = traverseData
      .filter(pt => pt.x && pt.y && !isNaN(pt.x) && !isNaN(pt.y))
      .map(pt => ({
        name: pt.name || 'Στάση',
        x: Number(pt.x),
        y: Number(pt.y),
        type: 'station'
      }));

    const details = (tachymetryData?.measurements || [])
      .filter(pt => (pt['E[m]'] || pt.x) && (pt['N[m]'] || pt.y))
      .map(pt => ({
        name: pt['Point'] || pt.name || 'Σημείο',
        x: Number(pt['E[m]'] || pt.x),
        y: Number(pt['N[m]'] || pt.y),
        type: 'detail'
      })).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));

    return { stations, details, hasPoints: stations.length > 0 || details.length > 0 };
  }, [traverseData, tachymetryData]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Παρακαλώ επιλέξτε αρχείο μορφής .xlsx ή .xls');
      return;
    }

    const reader = new FileReader();
    const loadingToast = toast.loading('Ανάγνωση δεδομένων Excel...');

    reader.onload = (event) => {
      try {
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const adjSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('synorthosi_stathmou'));
        if (adjSheetName && setObservations) {
          const wsAdjustment = wb.Sheets[adjSheetName];
          const dataAdj = XLSX.utils.sheet_to_json(wsAdjustment);
          
          if (dataAdj.length > 0) {
            const formattedAdj = dataAdj.map((row, index) => ({
              id: Date.now() + index,
              station: row['Stations'] || row['Station'] || row['From'] || "",
              target: row['Target'] || row['To'] || "",
              Period: row['Period'] || "1",
              Face_I: row['Hz [grad]'] || row['Face I'] || "0.0000",
              Face_II: row['Face II'] || "200.0000",
              adj_hz: "",
              std_dev: ""
            }));
            setObservations(formattedAdj);
          }
        }

        const traverseSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'traverse');
        if (traverseSheetName) {
          const wsTraverse = wb.Sheets[traverseSheetName];
          const dataTraverse = XLSX.utils.sheet_to_json(wsTraverse);

          const formattedTraverse = dataTraverse.map((row, index) => ({
            id: Date.now() + index,
            name: row['Stations'] || row['Station'] || "",
            hz: row['Hz [grad]'] || "",
            sd: row['D [m]'] || "", 
            x: row['X [m]'] || "",
            y: row['Y [m]'] || "",
            h: row['H [m]'] || ""
          }));
          
          if (setTraverseData) setTraverseData(formattedTraverse);

          if (setLevelingStations) {
            const extractedStations = [];
            formattedTraverse.forEach((row, index) => {
              if (row.name) {
                const currentH = (row.h !== undefined && row.h !== null) ? row.h : "";
                extractedStations.push({
                  id: Date.now() + 1000 + index,
                  name: String(row.name),
                  h: String(currentH)
                });
              }
            });
            setLevelingStations(extractedStations);
          }
        }

        const traverseLevelingSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'traverse_leveling');
        if (traverseLevelingSheetName && setLevelingObservations) {
          const wsLeveling = wb.Sheets[traverseLevelingSheetName];
          const dataLeveling = XLSX.utils.sheet_to_json(wsLeveling);

          if (dataLeveling.length > 0) {
            const formattedLevelingObs = dataLeveling.map((row, index) => ({
              id: Date.now() + 2000 + index,
              from: row['From'] !== undefined ? String(row['From']) : "",
              to: row['To'] !== undefined ? String(row['To']) : "",
              s: row['D [m]'] !== undefined ? String(row['D [m]']) : "",
              z: row['Z[grad]'] !== undefined ? String(row['Z[grad]']) : "",
              hi: row['H_station'] !== undefined ? String(row['H_station']) : "",
              ht: row['H_target'] !== undefined ? String(row['H_target']) : ""
            }));
            setLevelingObservations(formattedLevelingObs);
          }
        }

        const measSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('measurements_taxymetria'));
        const stationsSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('stations_taxymetria'));

        if (setTachymetryData) {
          let cleanMeasurements = [];
          
          if (measSheetName) {
            const rawMeas = XLSX.utils.sheet_to_json(wb.Sheets[measSheetName]);
            
            cleanMeasurements = rawMeas
              .filter(row => row['From'] !== undefined && row['Point_ID'] !== undefined)
              .map(row => ({
                From: String(row['From']).trim(),
                O: row['O'],
                Point_ID: row['Point_ID'],
                Hz: row['Hz'],
                Z: row['Z'],
                SD: row['SD'],
                TargetHeight: row['TargetHeight']
              }));
          }

          setTachymetryData({
            measurements: cleanMeasurements,
            stations: stationsSheetName ? XLSX.utils.sheet_to_json(wb.Sheets[stationsSheetName]) : [],
            results: [] 
          });
        }

        const charaxiSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('charaxi'));
        if (charaxiSheetName && setStakeoutData) {
          const wsCharaxi = wb.Sheets[charaxiSheetName];
          const dataCharaxi = XLSX.utils.sheet_to_json(wsCharaxi);

          if (dataCharaxi.length > 0) {
            const formattedCharaxi = dataCharaxi.map((row, index) => ({
              id: Date.now() + index,
              name: row['Point'],
              x: row['E[m]'] ,
              y: row['N[m]'],
              hz_stake: "",
              dist_stake: ""
            }));
            setStakeoutData(prev => ({ ...prev, points: formattedCharaxi }));
          }
        }

        const goniometrySheetName = wb.SheetNames.find(n => n.toLowerCase().includes('gwniometriseis'));
        if (goniometrySheetName && setGoniometryData) {
          const wsGoniometry = wb.Sheets[goniometrySheetName];
          const dataGoniometry = XLSX.utils.sheet_to_json(wsGoniometry);

          if (dataGoniometry.length > 0) {
            const formattedGoniometry = dataGoniometry.map((row, index) => ({
              id: Date.now() + index,
              from: row['From'] !== undefined ? String(row['From']) : "",
              to: row['To'] !== undefined ? String(row['To']) : "",
              period: row['Period'] !== undefined ? String(row['Period']) : "1",
              faceI: row['Face I'] !== undefined ? String(row['Face I']) : "",
              faceII: row['Face II'] !== undefined ? String(row['Face II']) : "",
              ZfaceI: row['Z_Face I'] !== undefined ? String(row['Z_Face I']) : "",
              ZfaceII: row['Z_Face II'] !== undefined ? String(row['Z_Face II']) : ""
            }));
            setGoniometryData(formattedGoniometry);
          }
        }

        const trigLevelingSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('trig_leveling'));
        if (trigLevelingSheetName && setTrigLevelingData) {
          const wsTrig = wb.Sheets[trigLevelingSheetName];
          const dataTrig = XLSX.utils.sheet_to_json(wsTrig);

          if (dataTrig.length > 0) {
            const formattedTrig = dataTrig.map((row, index) => ({
              id: Date.now() + 3000 + index,
              from: row['From'] !== undefined ? String(row['From']) : "",
              to: row['To'] !== undefined ? String(row['To']) : "",
              s: row['Slope_D'] !== undefined ? String(row['Slope_D']) : "",
              z: row['Z[grad]'] !== undefined ? String(row['Z[grad]']) : "",
              hi: row['H_station'] !== undefined ? String(row['H_station']) : "",
              ht: row['H_target'] !== undefined ? String(row['H_target']) : "",
              dh: "",      
              dh_avg: "" 
            }));
            setTrigLevelingData(formattedTrig);
          }
        }

        toast.success('Επιτυχής εισαγωγή δεδομένων!', { id: loadingToast });
      } catch (err) {
        console.error(err);
        toast.error('Σφάλμα κατά την επεξεργασία του αρχείου.', { id: loadingToast });
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-200 flex flex-col font-sans h-screen overflow-y-auto custom-scrollbar">
      <style>
        {`
          /* Καθολικό Scrollbar (πιάνει το window/body) */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #334155; }

          /* Custom Scrollbar για συγκεκριμένα divs αν χρειαστεί */
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        `}
      </style>

      {/* MAIN CONTAINER */}
      <main className="flex-1 py-6 px-10 overflow-hidden flex flex-col">
        <div className="grid grid-cols-[1fr_320px] gap-8 max-w-[1400px] w-full mx-auto h-full overflow-hidden">
          
          {/* ----- ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ ----- */}
          <div className="flex flex-col gap-6 h-full overflow-hidden">
            
            {/* Πάνω Μέρος */}
            <div className="grid grid-cols-2 gap-6 shrink-0">
              {/* FILE OPERATIONS */}
              <div className="flex flex-col gap-3">
                <SectionTitle title="ΔΙΑΧΕΙΡΙΣΗ ΑΡΧΕΙΩΝ" />
                <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-center gap-3 shadow-sm h-full">
                  <ActionButton 
                    icon={<Plus size={18} />} 
                    title="Δημιουργία Νέου" 
                    subtitle="Νέο αρχείο" 
                    theme="primary" 
                    onClick={onOpenProjectManager}
                  />
                  <ActionButton 
                    icon={<FolderOpen size={18} />} 
                    title="Άνοιγμα Έργου" 
                    subtitle="Ανάκτηση από δίσκο" 
                    theme="default"
                    onClick={onOpenProjectManager}
                  />
                </div>
              </div>

              {/* DATA INGESTION */}
              <div className="flex flex-col gap-3">
                <SectionTitle title="ΕΙΣΑΓΩΓΗ ΔΕΔΟΜΕΝΩΝ" />
                <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-center gap-3 shadow-sm h-full">
                  <ActionButton 
                    icon={<FileSpreadsheet size={18} />} 
                    title="Πρότυπο Excel" 
                    subtitle="Λήψη πρότυπου αρχείου" 
                    theme="emerald"
                    onClick={downloadSurveyTemplate}
                  />
                  <ImportButton onChange={handleFileUpload} />
                </div>
              </div>
            </div>

            {/* Κάτω Μέρος: Χάρτης (Recharts) - Compact Version */}
            <div className="flex flex-col flex-none h-[340px] overflow-hidden">
              <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-lg h-full relative overflow-hidden group">
                
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Map size={16} className="text-cyan-500" />
                    <span className="text-[11px] font-bold text-slate-300 tracking-wider">Τοπογραφικό Δίκτυο & Αποτύπωση</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono font-bold">
                    {mapData.hasPoints ? `${mapData.stations.length + mapData.details.length} ΣΗΜΕΙΑ ΣΤΟΝ ΧΑΡΤΗ` : 'ΑΝΑΜΟΝΗ ΣΥΝΤΕΤΑΓΜΕΝΩΝ'}
                  </div>
                </div>
                
                {/* ΧΩΡΟΣ ΧΑΡΤΗ */}
                <div className="flex-1 bg-[#080E1A] rounded-xl border border-slate-800/50 relative flex items-center justify-center overflow-hidden [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]">
                  
                  {mapData.hasPoints ? (
                    <div className="w-full h-full p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                          <XAxis 
                            type="number" 
                            dataKey="x" 
                            name="Easting" 
                            domain={['auto', 'auto']} 
                            tickFormatter={(val) => val.toFixed(0)} 
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name="Northing" 
                            domain={['auto', 'auto']} 
                            tickFormatter={(val) => val.toFixed(0)} 
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                          />
                          <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} content={<MapTooltip />} />
                          
                          <Scatter 
                            name="Αποτύπωση" 
                            data={mapData.details} 
                            fill="#10b981" 
                            shape="circle"
                          />
                          
                          <Scatter 
                            name="Στάσεις" 
                            data={mapData.stations} 
                            fill="#3b82f6" 
                            shape="triangle"
                            line={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeOpacity: 0.6 }}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Map size={32} className="text-slate-600" />
                      <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                        Αδεια Σκηνη
                      </span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-slate-700/50 pointer-events-none" />
                  <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-slate-700/50 pointer-events-none" />
                  <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-slate-700/50 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-slate-700/50 pointer-events-none" />
                </div>
              </div>
            </div>

          </div>

          {/* ----- ΔΕΞΙΑ ΣΤΗΛΗ (Compact Version) ----- */}
          <div className="flex flex-col gap-3">
            <SectionTitle title="ΕΠΙΣΚΟΠΗΣΗ ΕΝΕΡΓΟΥ ΕΡΓΟΥ" />
            
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 shadow-lg h-fit">
              
              {/* Header Project Name, Engineer & Status */}
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-4 mb-2 shrink-0">
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {/* Icon Box με glow effect */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-xl" />
                    <div className="relative p-2.5 bg-gradient-to-br from-[#0B1221] to-[#111A2E] border border-blue-500/30 rounded-xl text-blue-400 shadow-sm">
                      <Database size={18} />
                    </div>
                  </div>
                  
                  {/* Τίτλος & Όνομα Μηχανικού */}
                  <div className="flex flex-col overflow-hidden pr-2">
                    <h4 
                      className="font-extrabold text-[16px] text-white truncate leading-tight tracking-wide" 
                      title={projectName}
                    >
                      {projectName || "Νέο Έργο"}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400" title={engineerName}>
                      <User size={10} className="text-slate-500" />
                      <p className="text-[11px] font-bold tracking-widest truncate">
                        {engineerName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex-shrink-0 ml-1 px-2.5 py-1.5 border rounded-lg text-[9px] font-bold tracking-wider flex items-center gap-1.5 shadow-sm ${
                  hasData 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    hasData 
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' 
                      : 'bg-slate-500'
                  }`} />
                  {hasData ? 'ΕΝΕΡΓΟ' : 'ΑΝΑΜΟΝΗ'}
                </div>
              </div>

              {/* Vertical Stats */}
              <div className="flex flex-col gap-2">
                 
                 {/* Στασεις / Οδευσεις (Blue) */}
                 <div className="group bg-[#080E1A]/60 border border-slate-800/80 hover:border-blue-500/30 hover:bg-[#0a1222] transition-all duration-300 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${stationCount > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800/50 text-slate-600 group-hover:text-blue-400/50'}`}>
                        <Target size={15} />
                      </div>
                      <span className="text-slate-300 text-[12px] font-bold tracking-wider group-hover:text-white transition-colors">
                        Στάσεις Όδευσης
                      </span>
                    </div>
                    <span className={`text-xl font-mono font-black transition-all ${stationCount > 0 ? 'text-blue-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
                      {stationCount}
                    </span>
                 </div>
                 
                 {/* Σημ. Αποτυπωσης (Emerald) */}
                 <div className="group bg-[#080E1A]/60 border border-slate-800/80 hover:border-emerald-500/30 hover:bg-[#0a1222] transition-all duration-300 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${measurementCount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800/50 text-slate-600 group-hover:text-emerald-400/50'}`}>
                        <MapPin size={15} />
                      </div>
                      <span className="text-slate-300 text-[12px] font-bold tracking-wider group-hover:text-white transition-colors">
                        Σημεία Αποτύπωσης
                      </span>
                    </div>
                    <span className={`text-xl font-mono font-black transition-all ${measurementCount > 0 ? 'text-emerald-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
                      {measurementCount}
                    </span>
                 </div>
                 
                 {/* Σημεια Χαραξης (Amber) */}
                 <div className="group bg-[#080E1A]/60 border border-slate-800/80 hover:border-amber-500/30 hover:bg-[#0a1222] transition-all duration-300 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${stakeoutCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/50 text-slate-600 group-hover:text-amber-400/50'}`}>
                        <MapPin size={15} />
                      </div>
                      <span className="text-slate-300 text-[12px] font-bold tracking-wider group-hover:text-white transition-colors">
                        Σημεία Χάραξης
                      </span>
                    </div>
                    <span className={`text-xl font-mono font-black transition-all ${stakeoutCount > 0 ? 'text-amber-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
                      {stakeoutCount}
                    </span>
                 </div>
              </div>

              {/* Status Indicators at the bottom */}
              <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-800/50">
                  <div className={`flex items-center gap-2 border px-3 py-2 rounded-xl transition-colors ${hasData ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                     <RefreshCw size={13} />
                     <span className="text-[10px] font-bold tracking-wide">
                       {hasData ? 'Συγχρονισμός: OK' : 'Απαιτείται Εισαγωγή'}
                     </span>
                  </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const SectionTitle = ({ title }) => (
  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">
    {title}
  </h3>
);

const ActionButton = ({ icon, title, subtitle, theme = 'default', onClick }) => {
  const isPrimary = theme === 'primary';

  const getContainerClasses = () => {
    if (isPrimary) return 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]';
    if (theme === 'emerald') return 'bg-transparent border-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50';
    return 'bg-transparent border-slate-800/50 hover:bg-slate-800 hover:border-slate-700';
  };

  const getIconBoxClasses = () => {
    if (isPrimary) return 'text-white flex items-center justify-center shrink-0 w-8 h-8';
    if (theme === 'emerald') return 'w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all text-emerald-500';
    return 'text-slate-400 flex items-center justify-center shrink-0 w-8 h-8';
  };

  return (
    <button 
      onClick={onClick} 
      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border text-left group ${getContainerClasses()}`}
    >
      <div className={getIconBoxClasses()}>
        {icon}
      </div>
      <div className="overflow-hidden">
        <h4 className={`text-[12px] font-bold tracking-wide truncate transition-colors group-hover:text-white ${isPrimary ? 'text-white' : 'text-slate-200'}`}>
          {title}
        </h4>
        <p className={`text-[10px] mt-0.5 truncate ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      </div>
    </button>
  );
};

const ImportButton = ({ onChange }) => (
  <label className="relative cursor-pointer w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border border-slate-800/50 hover:bg-slate-800 hover:border-blue-500/50 group text-left bg-transparent">
    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all text-blue-500">
      <Upload size={16} />
    </div>
    <div className="overflow-hidden">
      <h4 className="text-[12px] font-bold tracking-wide truncate group-hover:text-white transition-colors text-slate-200">
        Εισαγωγή Δεδομένων
      </h4>
      <p className="text-[10px] mt-0.5 truncate text-slate-500">
        Εισαγωγή δεδομένων μορφής .xlsx
      </p>
    </div>
    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onChange} />
  </label>
);

export default Dashboard;