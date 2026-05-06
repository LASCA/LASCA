import React from 'react';
import { 
  PlusCircle, FolderOpen, Save, Upload, 
  Settings2, Globe2, Ruler, Beaker,
  ChevronRight, HardDrive, FileSpreadsheet,
  Activity
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="flex flex-col h-full gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Project Setup</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm uppercase tracking-widest">Διαχείριση και Παραμετροποίηση Μελέτης</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <HardDrive size={16} className="text-blue-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Local Workspace: Active</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1">
        
        {/* PANEL 1: FILE OPERATIONS */}
        <div className="col-span-3 flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">File Operations</h3>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-6 space-y-3 shadow-2xl">
            <ProjectButton icon={<PlusCircle size={20}/>} title="Create New" desc="Νέο αρχείο .lasca" primary />
            <ProjectButton icon={<FolderOpen size={20}/>} title="Open Project" desc="Ανάκτηση από δίσκο" />
            <ProjectButton icon={<Save size={20}/>} title="Save Current" desc="Αποθήκευση αλλαγών" />
          </div>
          <div className="mt-auto p-6 bg-blue-600/5 border border-blue-600/10 rounded-[2rem]">
            <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Auto-Save</p>
            <p className="text-xs text-slate-400 leading-relaxed">Η τελευταία αποθήκευση έγινε πριν από 2 λεπτά.</p>
          </div>
        </div>

        {/* PANEL 2: DATA INGESTION (MODIFIED SECTION) */}
        <div className="col-span-5 flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Data Ingestion</h3>
          
          <div className="flex-1 flex flex-col gap-4">
            {/* TOP HALF: TWO COLUMNS FOR IMPORT & CREATE */}
            <div className="grid grid-cols-2 gap-4 h-3/5">
              
              {/* IMPORT DATA */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-6 flex flex-col items-center justify-center border-dashed group hover:border-blue-500/40 transition-all bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent text-center">
                <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-blue-500 group-hover:animate-bounce" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Import Data</h4>
                <p className="text-slate-500 text-[10px] leading-tight mb-4 px-2"> Εισαγωγή δεδομένων μορφής .xlsx </p>
                <button className="w-full py-2.5 bg-white text-slate-950 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all">
                  Select Files
                </button>
              </div>

              {/* CREATE TEMPLATE */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-6 flex flex-col items-center justify-center border-dashed group hover:border-emerald-500/40 transition-all bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-600/10 via-transparent to-transparent text-center">
                <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Excel Template</h4>
                <p className="text-slate-500 text-[10px] leading-tight mb-4 px-2">Λήψη κενού αρχείου με την προκαθορισμένη δομή.</p>
                <button className="w-full py-2.5 bg-slate-950 text-emerald-500 border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all">
                  Download
                </button>
              </div>

            </div>

            {/* BOTTOM HALF: LOGS / STATUS (EMPTY FOR NOW) */}
            <div className="flex-1 bg-slate-900/20 border border-slate-800/40 rounded-[2rem] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <Activity size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recent Activity Log</span>
              </div>
              <div className="flex-1 flex flex-col justify-center items-center">
                 <p className="text-slate-600 text-[10px] font-medium italic">No ingestion events recorded yet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 3: GLOBAL SETTINGS */}
        <div className="col-span-4 flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Global Settings</h3>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <ConfigItem icon={<Globe2 size={18}/>} label="Coordinate System" value="ΕΓΣΑ '87 / EPSG:2100" />
            <ConfigItem icon={<Ruler size={18}/>} label="Measurement Units" value="Meters / Grads" />
            <ConfigItem icon={<Beaker size={18}/>} label="Adjustment Method" value="Least Squares (Rigorous)" />
            <hr className="border-slate-800 my-4 opacity-50" />
            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/40 group cursor-pointer hover:border-slate-600 transition-all">
              <div className="flex items-center gap-3">
                <Settings2 size={18} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">Advanced Params</span>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectButton = ({ icon, title, desc, primary }) => (
  <button className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all text-left group ${
    primary ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-950/40 text-slate-300 hover:bg-slate-900 border border-slate-800/50 hover:border-slate-700'
  }`}>
    <div className={`${primary ? 'text-white' : 'text-blue-500'} group-hover:scale-110 transition-transform`}>{icon}</div>
    <div>
      <p className="text-sm font-bold uppercase tracking-tight">{title}</p>
      <p className={`text-[10px] font-medium ${primary ? 'text-blue-100' : 'text-slate-500'}`}>{desc}</p>
    </div>
  </button>
);

const ConfigItem = ({ icon, label, value }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
      {icon} {label}
    </label>
    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 shadow-inner">
      {value}
    </div>
  </div>
);

export default Dashboard;