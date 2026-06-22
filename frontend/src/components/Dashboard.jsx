import React from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { 
  Plus, FolderOpen, Upload, 
  FileSpreadsheet, LayoutGrid
} from 'lucide-react';

// Εισαγωγή της αυτόνομης συνάρτησης δημιουργίας template
import { downloadSurveyTemplate } from '../utils/excel_template';

const Dashboard = ({ 
  setObservations, 
  setTraverseData, 
  setTachymetryData, 
  onOpenProjectManager
}) => {

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

        // 1. ΔΙΑΒΑΣΜΑ ADJUSTMENT
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

        // 2. ΔΙΑΒΑΣΜΑ TRAVERSE
        const traverseSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('traverse'));
        if (traverseSheetName) {
          const wsTraverse = wb.Sheets[traverseSheetName];
          const dataTraverse = XLSX.utils.sheet_to_json(wsTraverse);

          const formattedTraverse = dataTraverse.map(row => ({
            name: row['Stations'] || row['Station'] || "",
            hz: row['Hz [grad]'] || "",
            sd: row['Slope_D [m]'] || "",
            x: row['X [m]'] || "",
            y: row['Y [m]'] || "",
            h: row['H [m]'] || ""
          }));

          setTraverseData(formattedTraverse);
        }

        // 3. ΔΙΑΒΑΣΜΑ ΤΑΧΥΜΕΤΡΙΑΣ (measurements & stations)
        const measSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('measurements_taxymetria'));
        const stationsSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('stations_taxymetria'));

        let rawMeasurements = [];
        let rawStations = [];

        if (measSheetName) {
          rawMeasurements = XLSX.utils.sheet_to_json(wb.Sheets[measSheetName]);
        }
        if (stationsSheetName) {
          rawStations = XLSX.utils.sheet_to_json(wb.Sheets[stationsSheetName]);
        }

        setTachymetryData({
          measurements: rawMeasurements,
          stations: rawStations,
          results: [] 
        });

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
      </header>

      <main className="flex-1 p-10">
        <div className="grid grid-cols-2 gap-8 max-w-[800px]">
          
          {/* FILE OPERATIONS */}
          <div className="flex flex-col gap-4">
            <SectionTitle title="FILE OPERATIONS" />
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-[2rem] p-4 flex flex-col gap-3">
              <ActionButton 
                icon={<Plus size={20} />} 
                title="CREATE NEW" 
                subtitle="Νέο αρχείο .lasca" 
                theme="primary" 
                onClick={onOpenProjectManager}
              />
              <ActionButton 
                icon={<FolderOpen size={20} />} 
                title="OPEN PROJECT" 
                subtitle="Ανάκτηση από δίσκο" 
                theme="default"
                onClick={onOpenProjectManager}
              />
            </div>
          </div>

          {/* DATA INGESTION */}
          <div className="flex flex-col gap-4">
            <SectionTitle title="DATA INGESTION" />
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-[2rem] p-4 flex flex-col gap-3">
              
              <ActionButton 
                icon={<FileSpreadsheet size={18} />} 
                title="EXCEL TEMPLATE" 
                subtitle="Λήψη κενού αρχείου με τη δομή" 
                theme="emerald"
                onClick={downloadSurveyTemplate}
              />
              
              <ImportButton onChange={handleFileUpload} />

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const SectionTitle = ({ title }) => (
  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">
    {title}
  </h3>
);

// Το κοινό κουμπί προσαρμόζεται ανάλογα με το "theme"
const ActionButton = ({ icon, title, subtitle, theme = 'default', onClick }) => {
  const isPrimary = theme === 'primary';

  const getContainerClasses = () => {
    if (isPrimary) return 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]';
    if (theme === 'emerald') return 'bg-transparent border-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50';
    return 'bg-transparent border-slate-800/50 hover:bg-slate-800 hover:border-slate-700';
  };

  const getIconBoxClasses = () => {
    if (isPrimary) return 'text-white flex items-center justify-center shrink-0 w-10 h-10';
    if (theme === 'emerald') return 'w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all text-emerald-500';
    return 'text-slate-400 flex items-center justify-center shrink-0 w-10 h-10';
  };

  return (
    <button 
      onClick={onClick} 
      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border text-left group ${getContainerClasses()}`}
    >
      <div className={getIconBoxClasses()}>
        {icon}
      </div>
      <div className="overflow-hidden">
        <h4 className={`text-[13px] font-bold uppercase tracking-wide truncate transition-colors group-hover:text-white ${isPrimary ? 'text-white' : 'text-slate-200'}`}>
          {title}
        </h4>
        <p className={`text-[11px] mt-0.5 truncate ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      </div>
    </button>
  );
};

// Ειδικό label component για το input file, με το μπλε θέμα ακριβώς όπως το ζήτησες
const ImportButton = ({ onChange }) => (
  <label className="relative cursor-pointer w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border border-slate-800/50 hover:bg-slate-800 hover:border-blue-500/50 group text-left bg-transparent">
    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all text-blue-500">
      <Upload size={18} />
    </div>
    <div className="overflow-hidden">
      <h4 className="text-[13px] font-bold uppercase tracking-wide truncate group-hover:text-white transition-colors text-slate-200">
        IMPORT DATA
      </h4>
      <p className="text-[11px] mt-0.5 truncate text-slate-500">
        Εισαγωγή δεδομένων μορφής .xlsx
      </p>
    </div>
    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onChange} />
  </label>
);

export default Dashboard;