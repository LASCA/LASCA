import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { 
  FolderPlus, 
  FolderOpen, 
  User, 
  Layers, 
  Loader2,
  X,
  Settings,
  Briefcase,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import ProjectListItem from './collab/ProjectListItem';

const ProjectModal = ({ isOpen, onClose, onProjectLoaded, currentProject }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [projectName, setProjectName] = useState('');
  const [designer, setDesigner] = useState('');
  
  const [employer, setEmployer] = useState('');
  const [location, setLocation] = useState('');
  
  const [existingProjects, setExistingProjects] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Κατάσταση για το project προς διαγραφή
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    if (activeTab === 'open' && isOpen) {
      fetchExistingProjects();
    }
  }, [activeTab, isOpen]);

  const fetchExistingProjects = async () => {
    setIsLoadingList(true);
    setError('');
    try {
      // Στη σελίδα όλα τα projects είναι ήδη στο cloud: δείχνουμε ρόλο, μέλη και νέες αλλαγές.
      const { data } = await axios.get(`${API_BASE_URL}/api/me/projects`);
      const toItem = (p) => ({
        key: p.public_id, name: p.name, status: 'synced', role: p.role, members: p.members || [],
        members_count: p.members_count, unread: p.unread, updated_at: p.updated_at || p.created_at,
        active: p.name === currentProject,
        // Το ανοιχτό project δεν διαγράφεται από εδώ (η αυτόματη αποθήκευση θα το χρειαζόταν).
        canDelete: p.role === 'owner' && p.name !== currentProject,
      });
      setExistingProjects([...(data.owned || []), ...(data.shared || [])].map(toItem)
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))));
    } catch (err) {
      console.error("Σφάλμα φόρτωσης λίστας projects:", err);
      setError("Αποτυχία ανάκτησης των υπαρχόντων projects.");
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Παρακαλώ εισάγετε ένα έγκυρο όνομα project.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    const sanitizedName = projectName.trim().replace(/[^a-zA-Z0-9_α-ωΑ-Ωά-ώΉΉίϊΐόόύϋΰώώ\s-]/g, '');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/projects/load`, {
        project_name: sanitizedName,
        settings: {
          designer: designer.trim(),
          employer: employer.trim(),
          location: location.trim()
        }
      });

      onProjectLoaded(response.data);
      onClose();
    } catch (err) {
      console.error("Σφάλμα κατά τη δημιουργία του project:", err);
      setError("Αποτυχία δημιουργίας project. Ίσως ο φάκελος χρησιμοποιείται.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProject = async (name) => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/projects/load`, {
        project_name: name
      });
      onProjectLoaded(response.data);
      onClose();
    } catch (err) {
      console.error("Σφάλμα κατά το άνοιγμα του project:", err);
      setError("Αποτυχία ανοίγματος του επιλεγμένου project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (item) => setProjectToDelete(item);

  const executeDelete = async () => {
    if (!projectToDelete) return;

    setIsSubmitting(true);
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectToDelete.name)}`);
      setProjectToDelete(null);
      await fetchExistingProjects();
    } catch (err) {
      console.error("Σφάλμα διαγραφής project:", err);
      setError("Αποτυχία διαγραφής του project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">

        {/* ΔΙΑΦΑΝΕΣ & ΚΟΜΨΟ CONFIRMATION OVERLAY */}
        {projectToDelete && (
          <div className="absolute inset-0 z-[160] bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-5 w-full max-w-[320px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
              
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 mb-3 shadow-inner">
                <AlertTriangle size={20} />
              </div>

              <h3 className="text-sm font-bold text-slate-100 tracking-wide mb-1">
                Διαγραφή Έργου
              </h3>
              
              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                Είστε σίγουροι ότι θέλετε να διαγράψετε το <span className="font-mono font-semibold text-slate-200 bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-md">{projectToDelete.name}</span>;
                {projectToDelete.members_count > 1 && <span className="block mt-1.5 text-amber-300/90">Θα χαθεί και για τους {projectToDelete.members_count - 1} συνεργάτες.</span>}
              </p>

              <div className="flex items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs rounded-xl shadow-md shadow-red-900/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Διαγραφή"
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        <div className="bg-[#0f172a]/80 p-4 border-b border-slate-800 flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="text-amber-500" size={16} />
              <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
                Διαχείριση Εργασιών
              </span>
            </div>

            <button 
              onClick={onClose}
              type="button"
              aria-label="Κλείσιμο"
              className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 rounded-xl transition-all duration-200 active:scale-95 group shadow-sm"
            >
              <X size={15} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
            <button
              onClick={() => { setActiveTab('create'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderPlus size={14} />
              Νέο Έργο
            </button>
            <button
              onClick={() => { setActiveTab('open'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'open'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen size={14} />
              Άνοιγμα Υπάρχοντος
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[450px] custom-scrollbar flex-1">
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-slate-500 flex items-center gap-1">
                  Έργο <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="π.χ. Campus ΑΠΘ"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-sm text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-slate-500 flex items-center gap-1">
                  <User size={10} /> Μελετητής
                </label>
                <input
                  type="text"
                  placeholder="π.χ. LASCA Developers"
                  value={designer}
                  onChange={(e) => setDesigner(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-sm text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-slate-500 flex items-center gap-1">
                  <MapPin size={10} /> Τοποθεσία
                </label>
                <input
                  type="text"
                  placeholder="π.χ. Κέντρο, Θεσσαλονίκη"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-sm text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-slate-500 flex items-center gap-1">
                  <Briefcase size={10} /> Εργοδότης
                </label>
                <input
                  type="text"
                  placeholder="π.χ. ΤΑΤΜ"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 text-sm text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Δημιουργια Φακελων...
                  </>
                ) : (
                  "Αρχικοποιηση & Εναρξη Έργου"
                )}
              </button>
            </form>
          )}

          {activeTab === 'open' && (
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Layers size={10} /> Τα projects σου
              </label>

              {isLoadingList ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                  <span className="text-xs tracking-wide">Φόρτωση projects...</span>
                </div>
              ) : existingProjects.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {existingProjects.map((item) => (
                    <ProjectListItem key={item.key} item={item} busy={isSubmitting}
                      onOpen={() => handleOpenProject(item.name)} onDelete={handleDeleteClick} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-800/60 rounded-xl">
                  <p className="text-slate-600 text-xs font-medium">Δεν βρέθηκαν υπάρχοντα projects.</p>
                  <p className="text-slate-700 text-[10px] uppercase font-black tracking-wider mt-1">Δημιουργηστε ενα νεο έργο</p>
                </div>
              )}
            </div>
          )}

        </div>
        
        <div className="bg-[#0f172a]/30 px-6 py-3 border-t border-slate-800/50 flex justify-between items-center">
          <span className="text-[8.5px] text-slate-600 font-bold uppercase tracking-widest"></span>
          {currentProject && (
            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
              Ενεργό: {currentProject}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProjectModal;