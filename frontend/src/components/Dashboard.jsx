import React from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { 
  Plus, FolderOpen, Save, Upload, 
  Settings2, Globe2, Ruler, Beaker,
  ChevronRight, HardDrive, FileSpreadsheet,
  Activity, LayoutGrid
} from 'lucide-react';

const Dashboard = ({ setObservations, setTraverseData, setTachymetryData }) => {

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

        // 1. ΔΙΑΒΑΣΜΑ ADJUSTMENT (1ο Tab)
        const wsAdjustment = wb.Sheets[wb.SheetNames[0]];
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

        // 2. ΔΙΑΒΑΣΜΑ TRAVERSE (Όδευση)
        const traverseSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'traverse');
        if (traverseSheetName) {
          const wsTraverse = wb.Sheets[traverseSheetName];
          const dataTraverse = XLSX.utils.sheet_to_json(wsTraverse);

          const formattedTraverse = dataTraverse.map(row => ({
            name: row['Stations'] || row['Station'] || "",
            hz: row['Hz [grad]'] || "",
            sd: row['Slope_D [m]'] || "",
            x: row['X [m]'] || "",
            y: row['Y [m]'] || ""
          }));

          setTraverseData(formattedTraverse);
        }

        // 3. ΔΙΑΒΑΣΜΑ ΤΑΧΥΜΕΤΡΙΑΣ (measurements_taxymetria & stations_taxymetria)
        const measSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'measurements_taxymetria');
        const stationsSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'stations_taxymetria');

        if (measSheetName) {
          const wsMeas = wb.Sheets[measSheetName];
          const dataMeas = XLSX.utils.sheet_to_json(wsMeas);

          const formattedTaxymetry = dataMeas.map(row => ({
            station: String(row['Station_Name'] || row['Station'] || row['Στάση'] || "").trim(),
            backsight: String(row['Backsight'] || row['BS'] || row['Target'] || row['Προσανατολισμός'] || "").trim(),
            pointId: String(row['Point_ID'] || row['Id'] || row['Name'] || row['Σημείο'] || ""),
            x: parseFloat(row['XS'] || row['X'] || row['X [m]'] || 0),
            y: parseFloat(row['YS'] || row['Y'] || row['Y [m]'] || 0),
            z: parseFloat(row['ZS'] || row['Z'] || row['Z [m]'] || 0),
            code: row['Code'] || row['Κωδικός'] || "DETAIL"
          }));

          // Ανίχνευση λίστας σταθμών από το stations_taxymetria tab
          let stationList = [];
          if (stationsSheetName) {
            const wsStations = wb.Sheets[stationsSheetName];
            const dataStations = XLSX.utils.sheet_to_json(wsStations);
            stationList = dataStations
              .map(row => String(row['Station_Name'] || row['Station'] || row['Στάση'] || "").trim())
              .filter(Boolean);
          }

          // Fallback αν το tab των σταθμών είναι άδειο, βγάλε τους μοναδικούς από τις μετρήσεις λεπτομέρειας
          if (stationList.length === 0) {
            stationList = [...new Set(formattedTaxymetry.map(p => String(p.station)))].filter(Boolean);
          }

          setTachymetryData({
            data: formattedTaxymetry,
            stationList: stationList
          });
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
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="h-20 flex items-center justify-between px-10 border-b border-slate-800/80 bg-[#030712]">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-blue-500" strokeWidth={2.5}/>
            <h1 className="text-[11px] font-bold uppercase text-blue-500 tracking-[0.2em]">
              SURVEYING CORE V2.0
            </h1>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight -mt-1 flex items-baseline gap-1">
            <span>Project</span>
            <span className="text-blue-500">Setup</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
            ΔΙΑΧΕΙΡΙΣΗ ΚΑΙ ΠΑΡΑΜΕΤΡΟΠΟΙΗΣΗ ΜΕΛΕΤΗΣ
          </span>
        </div>

        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-full">
          <HardDrive size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            LOCAL WORKSPACE: ACTIVE
          </span>
        </div>
      </header>

      {/* MAIN DASHBOARD GRID */}
      <main className="flex-1 p-10">
        <div className="grid grid-cols-12 gap-8 max-w-[1600px] mx-auto h-full">
          
          {/* LEFT PANEL: FILE OPERATIONS */}
          <div className="col-span-3 flex flex-col gap-4">
            <SectionTitle title="FILE OPERATIONS" />
            
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-[2rem] p-4 flex flex-col gap-3">
              <ActionButton 
                icon={<Plus size={20} />} 
                title="CREATE NEW" 
                subtitle="Νέο αρχείο .lasca" 
                variant="primary" 
              />
              <ActionButton 
                icon={<FolderOpen size={20} />} 
                title="OPEN PROJECT" 
                subtitle="Ανάκτηση από δίσκο" 
              />
              <ActionButton 
                icon={<Save size={20} />} 
                title="SAVE CURRENT" 
                subtitle="Αποθήκευση αλλαγών" 
              />
            </div>

            {/* Auto-save Widget */}
            <div className="mt-auto bg-[#0B1221] border border-slate-800/80 rounded-[1.5rem] p-6">
              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">AUTO-SAVE</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Η τελευταία αποθήκευση έγινε πριν από 2 λεπτά.
              </p>
            </div>
          </div>

          {/* CENTER PANEL: DATA INGESTION */}
          <div className="col-span-5 flex flex-col gap-4">
            <SectionTitle title="DATA INGESTION" />
            
            <div className="grid grid-cols-2 gap-4">
              {/* IMPORT DATA CARD */}
              <label className="relative cursor-pointer bg-[#0B1221] border border-slate-800/80 hover:border-blue-500/50 rounded-[2rem] p-8 flex flex-col items-center text-center transition-all group">
                <div className="w-12 h-12 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all">
                  <Upload size={20} className="text-blue-500" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Import Data</h3>
                <p className="text-[11px] text-slate-500 mb-8">Εισαγωγή δεδομένων μορφής .xlsx</p>
                <div className="px-8 py-2.5 bg-white text-black text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-slate-200 transition-colors w-full">
                  SELECT FILES
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>

              {/* EXCEL TEMPLATE CARD */}
              <button className="bg-[#0B1221] border border-slate-800/80 hover:border-emerald-500/50 rounded-[2rem] p-8 flex flex-col items-center text-center transition-all group">
                <div className="w-12 h-12 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Excel Template</h3>
                <p className="text-[11px] text-slate-500 mb-8">Λήψη κενού αρχείου με την προκαθορισμένη δομή.</p>
                <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mt-auto py-2.5">
                  DOWNLOAD
                </div>
              </button>
            </div>

            {/* ACTIVITY LOG */}
            <div className="flex-1 bg-[#0B1221] border border-slate-800/80 rounded-[2rem] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6 text-slate-500">
                <Activity size={14} />
                <h4 className="text-[10px] font-bold uppercase tracking-widest">RECENT ACTIVITY LOG</h4>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs text-slate-600 italic">No ingestion events recorded yet.</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: GLOBAL SETTINGS */}
          <div className="col-span-4 flex flex-col gap-4">
            <SectionTitle title="GLOBAL SETTINGS" />
            
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-[2rem] p-6 space-y-6">
              
              <SettingItem 
                icon={<Globe2 />} 
                label="COORDINATE SYSTEM" 
                value="ΕΓΣΑ '87 / EPSG:2100" 
              />
              
              <SettingItem 
                icon={<Ruler />} 
                label="MEASUREMENT UNITS" 
                value="Meters / Grads" 
              />
              
              <SettingItem 
                icon={<Beaker />} 
                label="ADJUSTMENT METHOD" 
                value="Least Squares (Rigorous)" 
              />

              <button className="w-full mt-4 flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <Settings2 size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">ADVANCED PARAMS</span>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
              </button>
              
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

/* --- ΕΠΙΜΕΡΟΥΣ COMPONENTS --- */

const SectionTitle = ({ title }) => (
  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">
    {title}
  </h3>
);

const ActionButton = ({ icon, title, subtitle, variant }) => {
  const isPrimary = variant === 'primary';
  return (
    <button className={`
      w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border text-left
      ${isPrimary 
        ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
        : 'bg-transparent border-slate-800/50 hover:bg-slate-800 hover:border-slate-700 text-slate-300'}
    `}>
      <div className={`flex items-center justify-center ${isPrimary ? 'text-white' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div>
        <h4 className={`text-[13px] font-bold uppercase tracking-wide ${isPrimary ? 'text-white' : 'text-slate-200'}`}>
          {title}
        </h4>
        <p className={`text-[11px] mt-0.5 ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      </div>
    </button>
  );
};

const SettingItem = ({ icon, label, value }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-slate-500">
      {React.cloneElement(icon, { size: 14 })}
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{label}</span>
    </div>
    <div className="w-full px-4 py-3.5 bg-[#030712] border border-slate-800 rounded-xl text-sm font-semibold text-slate-200">
      {value}
    </div>
  </div>
);

export default Dashboard;