import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { FolderKanban } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Adjustment from './components/Adjustment';
import Traverse from './components/Traverse';
import Tachymetry from './components/Tachymetry'; 
import ProjectManager from './components/project_manager'; 
import Charaxi from './components/charaxi'; // 1. IMPORT ΤΟΥ ΝΕΟΥ COMPONENT

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- PROJECT MANAGEMENT STATES ---
  const [currentProject, setCurrentProject] = useState(() => {
    return localStorage.getItem('current_active_project') || null;
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});

  // --- DATA STATES ---
  const [observations, setObservations] = useState([]);
  const [adjMetrics, setAdjMetrics] = useState({}); 
  const [traverseData, setTraverseData] = useState([]); 
  const [traverseMetrics, setTraverseMetrics] = useState({}); 
  const [tachymetryData, setTachymetryData] = useState({ measurements: [], stations: [], results: [] }); 
  
  // 2. ΝΕΟ STATE ΓΙΑ ΤΗ ΧΑΡΑΞΗ (Κρατάει Station, Backsight και τον Πίνακα Σημείων)
  const [stakeoutData, setStakeoutData] = useState({
    station: { name: 'St1', x: '', y: '' },
    backsight: { name: 'BS1', x: '', y: '' },
    azimuthBs: '---',
    points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
  });

  // "Κλειδαριά" για το Auto-Save
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- 0. ΦΟΡΤΩΣΗ ΤΟΥ PROJECT ΑΠΟ ΤΟ .JSON ΤΟΥ ΣΚΛΗΡΟΥ ΔΙΣΚΟΥ ΣΤΗΝ ΕΚΚΙΝΗΣΗ ---
  useEffect(() => {
    if (currentProject) {
      console.log(`⏳ Φόρτωση του project "${currentProject}" από το αρχείο JSON του Backend...`);
      
      fetch('http://localhost:5000/api/projects/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: currentProject })
      })
      .then(res => res.json())
      .then(backendData => {
        if (backendData && !backendData.error) {
          // Γεμίζουμε την οθόνη με τα αυθεντικά δεδομένα από τον δίσκο!
          setGlobalSettings(backendData.settings || {});
          setObservations(backendData.observations || []);
          setAdjMetrics(backendData.adjMetrics || {});      
          setTraverseData(backendData.traverse_data || []);
          setTraverseMetrics(backendData.metrics || {});
          setTachymetryData(backendData.tachymetryData || { measurements: [], stations: [], results: [] });
          
          // Φόρτωση των δεδομένων χάραξης αν υπάρχουν ήδη αποθηκευμένα στο αρχείο
          setStakeoutData(backendData.stakeoutData || {
            station: { name: 'St1', x: '', y: '' },
            backsight: { name: 'BS1', x: '', y: '' },
            azimuthBs: '---',
            points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
          });

          console.log("✅ Τα δεδομένα φορτώθηκαν επιτυχώς από το Backend JSON!");
          
          // ΞΕΚΛΕΙΔΩΝΟΥΜΕ ΤΟ AUTO-SAVE
          setIsDataLoaded(true);
        }
      })
      .catch(err => {
        console.error("❌ Αποτυχία σύνδεσης με τον server κατά την εκκίνηση:", err);
        setIsDataLoaded(true); // Απεμπλοκή ακόμα και σε error
      });
    } else {
      setIsDataLoaded(true);
    }
  }, []);

  // --- 1. AUTO-SAVE ΜΗΧΑΝΙΣΜΟΣ (Προσθήκη του stakeoutData στα dependencies) ---
  useEffect(() => {
    if (!currentProject || !isDataLoaded) return; 

    const savedProjects = JSON.parse(localStorage.getItem('survey_projects') || '{}');
    const projectState = {
      project_name: currentProject,
      settings: globalSettings,
      observations: observations,
      adjMetrics: adjMetrics,       
      traverse_data: traverseData,
      metrics: traverseMetrics,
      tachymetryData: tachymetryData,
      stakeoutData: stakeoutData // Προσθήκη στο JSON structure
    };

    savedProjects[currentProject] = projectState;
    localStorage.setItem('survey_projects', JSON.stringify(savedProjects));
    localStorage.setItem('current_active_project', currentProject);

    // LIVE ΣΥΓΧΡΟΝΙΣΜΟΣ ΜΕ ΤΟ BACKEND
    fetch('http://localhost:5000/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: currentProject,
        state: projectState 
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        console.log(`💾 Auto-save: Το αρχείο .json στον φάκελο "${currentProject}" ενημερώθηκε και με τη Χάραξη!`);
      }
    })
    .catch(err => console.error("❌ Το Auto-save απέτυχε να γράψει στο Backend:", err));

  }, [currentProject, isDataLoaded, globalSettings, observations, adjMetrics, traverseData, traverseMetrics, tachymetryData, stakeoutData]);


  // --- 2. ΟΤΑΝ ΦΟΡΤΩΝΕΙ ΕΝΑ PROJECT ΑΠΟ ΤΟ MODAL ---
  const handleProjectLoaded = (projectData) => {
    const pName = projectData.project_name;
    setCurrentProject(pName);
    setGlobalSettings(projectData.settings || {});
    setObservations(projectData.observations || []);
    setAdjMetrics(projectData.adjMetrics || {});       
    setTraverseData(projectData.traverse_data || []);
    setTraverseMetrics(projectData.metrics || {});
    setTachymetryData(projectData.tachymetryData || { measurements: [], stations: [], results: [] });
    
    // Φόρτωση χάραξης κατά την αλλαγή project
    setStakeoutData(projectData.stakeoutData || {
      station: { name: 'St1', x: '', y: '' },
      backsight: { name: 'BS1', x: '', y: '' },
      azimuthBs: '---',
      points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
    });

    setIsDataLoaded(true);
    setIsProjectModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      <Toaster position="bottom-right" toastOptions={{
          style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #1e293b', fontSize: '12px' }
      }} />

      <ProjectManager 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onProjectLoaded={handleProjectLoaded}
        currentProject={currentProject}
      />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        
        <div className="absolute top-4 right-6 z-50 flex items-center gap-3">
          {currentProject && (
            <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 rounded-lg shadow-sm">
              Project: {currentProject}
            </span>
          )}
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg backdrop-blur-sm group"
          >
            <FolderKanban size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
            {currentProject ? "Αλλαγή Project" : "Επιλογή Project"}
          </button>
        </div>

        {activeTab !== 'dashboard' && <Header activeTab={activeTab} />}

        <main className={`flex-1 p-8 pl-12 overflow-y-auto ${activeTab === 'dashboard' ? 'pt-12' : ''}`}>
          <div className="max-w-[1800px] mx-auto h-full">
            
            {activeTab === 'dashboard' && (
              <Dashboard
                setObservations={setObservations}
                setTraverseData={setTraverseData}
                setTachymetryData={setTachymetryData}
                setStakeoutData={setStakeoutData}
                onOpenProjectManager={() => setIsProjectModalOpen(true)}
              />
            )}
            
            {activeTab === 'adjustment' && (
              <Adjustment 
                observations={observations} 
                setObservations={setObservations} 
                adjMetrics={adjMetrics}
                setAdjMetrics={setAdjMetrics}
              />
            )}
            
            {activeTab === 'traverse' && (
              <Traverse 
                data={traverseData} 
                setData={setTraverseData}        
                metrics={traverseMetrics} 
                setMetrics={setTraverseMetrics}   
                projectSettings={globalSettings}
              />
            )}
            
            {activeTab === 'mapping' && (
              <Tachymetry 
                tachymetryData={tachymetryData} 
                setTachymetryData={setTachymetryData} 
              />
            )}

            {/* 3. CONDITIONAL RENDERING ΓΙΑ ΤΗ ΧΑΡΑΞΗ */}
            {activeTab === 'stakeout' && (
              <Charaxi 
                stakeoutData={stakeoutData}
                setStakeoutData={setStakeoutData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;