import { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import { Toaster } from 'react-hot-toast';
import { FolderKanban } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import Adjustment from './components/calculations/general/Adjustment';
import Traverse from './components/calculations/traverse/Traverse';
import TraverseHeight from './components/calculations/traverse/traverse_height';
import Tachymetry from './components/calculations/general/Tachymetry'; 
import ProjectManager from './components/project_manager'; 
import Charaxi from './components/calculations/general/charaxi'; 
import Goniometry from './components/calculations/general/gwniometriseis'; 
import Leveling from './components/calculations/Levelings/leveling';
import BasicCalculations from './components/calculations/general/Basic_Calc';
import TrigonometricHeight from './components/calculations/Levelings/trig_leveling';
import LascaLoader from './components/animations/LascaLoader';
import LascaIntro from './components/animations/LascaIntro';
import useUpdateChecker from './utils/useUpdateChecker';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const updateInfo = useUpdateChecker();

  // --- APP BOOT STATES (ΓΙΑ ΤΟ LASCA INTRO) ---
  const [isAppBooting, setIsAppBooting] = useState(true);
  const [showIntroElement, setShowIntroElement] = useState(true);

  // --- PROJECT MANAGEMENT STATES ---
  const [currentProject, setCurrentProject] = useState(() => {
    return localStorage.getItem('current_active_project') || null;
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});

  // --- LOADER STATE (ΜΟΝΟ ΓΙΑ ΑΛΛΑΓΗ/ΔΗΜΙΟΥΡΓΙΑ PROJECT) ---
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);

  // --- DATA STATES ---
  const [observations, setObservations] = useState([]);
  const [adjMetrics, setAdjMetrics] = useState({}); 
  const [traverseData, setTraverseData] = useState([]); 
  const [traverseMetrics, setTraverseMetrics] = useState({}); 
  const [tachymetryData, setTachymetryData] = useState({ measurements: [], stations: [], results: [] }); 
  
  // ΧΑΡΑΞΗ
  const [stakeoutData, setStakeoutData] = useState({
    station: { name: 'St1', x: '', y: '' },
    backsight: { name: 'BS1', x: '', y: '' },
    azimuthBs: '---',
    points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
  });

  // ΓΩΝΙΟΜΕΤΡΗΣΕΙΣ
  const [goniometryData, setGoniometryData] = useState([]);

  // ΥΨΟΜΕΤΡΙΚΗ ΟΔΕΥΣΗ (Traverse Height)
  const [levelingObservations, setLevelingObservations] = useState([]);
  const [levelingStations, setLevelingStations] = useState([]);

  // ΓΕΩΜΕΤΡΙΚΗ ΧΩΡΟΣΤΑΘΜΙΣΗ
  const [levelingForward, setLevelingForward] = useState([
    { id: 1, point: 'BM1', backsight: '', foresight: '', dh: '', elevation: '' },
  ]);
  const [levelingBackward, setLevelingBackward] = useState([
    { id: 1, point: 'BM2', backsight: '', foresight: '', dh: '', elevation: '' },
  ]);
  const [levelingMetrics, setLevelingMetrics] = useState({});

  // ΤΡΙΓΩΝΟΜΕΤΡΙΚΗ ΥΨΟΜΕΤΡΙΑ
  const [trigHeightData, setTrigHeightData] = useState([]);

  // "Κλειδαριά" για το Auto-Save
  const [isDataLoaded, setIsDataLoaded] = useState(false);


  // --- 00. ΕΛΕΓΧΟΣ ΤΟΥ APP BOOT INTRO ---
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsAppBooting(false);
    }, 4200);

    const removeTimer = setTimeout(() => {
      setShowIntroElement(false);
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  /*
  useEffect(() => {
    const blockDevToolsShortcuts = (event) => {
      if (event.key === 'F12' || (event.shiftKey && event.ctrlKey && event.key.toLowerCase() === 'i') || (event.shiftKey && event.metaKey && event.key.toLowerCase() === 'i')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', blockDevToolsShortcuts, true);
    return () => document.removeEventListener('keydown', blockDevToolsShortcuts, true);
  }, []);
*/

  // --- ΚΑΘΑΡΙΣΜΟΣ STATE (RESET ALL DATA) ---
  const resetAllData = () => {
    setGlobalSettings({});
    setObservations([]);
    setAdjMetrics({});
    setTraverseData([]);
    setTraverseMetrics({});
    setTachymetryData({ measurements: [], stations: [], results: [] });
    setStakeoutData({
      station: { name: 'St1', x: '', y: '' },
      backsight: { name: 'BS1', x: '', y: '' },
      azimuthBs: '---',
      points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
    });
    setGoniometryData([]);
    setLevelingObservations([]);
    setLevelingStations([]);
    setLevelingForward([{ id: 1, point: 'BM1', backsight: '', foresight: '', dh: '', elevation: '' }]);
    setLevelingBackward([{ id: 1, point: 'BM2', backsight: '', foresight: '', dh: '', elevation: '' }]);
    setLevelingMetrics({});
    setTrigHeightData([]);
  };

  // --- 0. ΑΡΧΙΚΗ ΦΟΡΤΩΣΗ ΤΟΥ PROJECT (ΣΤΟ ΠΑΡΑΣΚΗΝΙΟ) ---
  useEffect(() => {
    if (currentProject) {
      console.log(`⏳ Αρχική φόρτωση του project "${currentProject}"...`);
      
      setIsDataLoaded(false);
      resetAllData();
      
      fetch(`${API_BASE_URL}/api/projects/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: currentProject })
      })
      .then(res => res.json())
      .then(backendData => {
        if (backendData && !backendData.error) {
          setGlobalSettings(backendData.settings || {});
          setObservations(backendData.observations || []);
          setAdjMetrics(backendData.adjMetrics || {});      
          setTraverseData(backendData.traverse_data || []);
          setTraverseMetrics(backendData.metrics || {});
          setTachymetryData(backendData.tachymetryData || { measurements: [], stations: [], results: [] });
          
          setStakeoutData(backendData.stakeoutData || {
            station: { name: 'St1', x: '', y: '' },
            backsight: { name: 'BS1', x: '', y: '' },
            azimuthBs: '---',
            points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
          });

          setGoniometryData(backendData.goniometryData || []);
          setLevelingObservations(backendData.levelingObservations || []);
          setLevelingStations(backendData.levelingStations || []);
          setLevelingForward(backendData.levelingForward || []);
          setLevelingBackward(backendData.levelingBackward || []);
          setLevelingMetrics(backendData.levelingMetrics || {});
          setTrigHeightData(backendData.trigHeightData || []);

          console.log("✅ Τα δεδομένα φορτώθηκαν επιτυχώς!");
        }
        setIsDataLoaded(true);
      })
      .catch(err => {
        console.error("❌ Αποτυχία σύνδεσης με τον server:", err);
        setIsDataLoaded(true);
      });
    } else {
      resetAllData();
      setIsDataLoaded(true);
    }
  }, [currentProject]);

  // --- 1. AUTO-SAVE ΜΗΧΑΝΙΣΜΟΣ ---
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
      stakeoutData: stakeoutData,
      goniometryData: goniometryData,
      levelingObservations: levelingObservations,
      levelingStations: levelingStations,
      levelingForward: levelingForward,
      levelingBackward: levelingBackward,
      levelingMetrics: levelingMetrics,
      trigHeightData: trigHeightData
    };

    savedProjects[currentProject] = projectState;
    localStorage.setItem('survey_projects', JSON.stringify(savedProjects));
    localStorage.setItem('current_active_project', currentProject);

    fetch(`${API_BASE_URL}/api/projects/save`, {
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
        console.log(`💾 Auto-save: Το αρχείο .json ενημερώθηκε!`);
      }
    })
    .catch(err => console.error("❌ Το Auto-save απέτυχε στο Backend:", err));

  }, [
    currentProject, 
    isDataLoaded, 
    globalSettings, 
    observations, 
    adjMetrics, 
    traverseData, 
    traverseMetrics, 
    tachymetryData, 
    stakeoutData, 
    goniometryData,
    levelingObservations, 
    levelingStations,     
    levelingForward,  
    levelingBackward, 
    levelingMetrics,
    trigHeightData
  ]);

  // --- 2. GLOBAL TOOLTIP LOGIC ---
  useEffect(() => {
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'global-custom-tooltip';
    document.body.appendChild(tooltipEl);

    const handleMouseOver = (e) => {
      const target = e.target.closest('[title], [data-tooltip]'); 
      if (!target) return;
      
      const text = target.getAttribute('title') || target.getAttribute('data-tooltip');
      if (!text) return;

      target.setAttribute('data-tooltip', text);
      target.removeAttribute('title'); 

      const rect = target.getBoundingClientRect();
      tooltipEl.textContent = text;
      
      const x = rect.left + (rect.width / 2);
      const y = rect.bottom + 8;

      tooltipEl.style.left = `${x}px`;
      tooltipEl.style.top = `${y}px`;
      tooltipEl.style.opacity = '1';
      tooltipEl.style.visibility = 'visible';
    };

    const handleMouseOut = (e) => {
      const target = e.target.closest('[data-tooltip]'); 
      if (target) {
        tooltipEl.style.opacity = '0';
        tooltipEl.style.visibility = 'hidden';
      }
    };

    const handleClick = () => {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.visibility = 'hidden';
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      
      if (document.body.contains(tooltipEl)) {
        document.body.removeChild(tooltipEl);
      }
    };
  }, []);
  
  // --- 3. ΔΗΜΙΟΥΡΓΙΑ / ΕΝΑΛΛΑΓΗ PROJECT (ΕΔΩ ΕΜΦΑΝΙΖΕΤΑΙ ΤΟ LASCA LOADER) ---
  const handleProjectLoaded = (projectData) => {
    setIsProjectSwitching(true);
    setIsDataLoaded(false); 
    resetAllData();

    const pName = projectData.project_name;
    setCurrentProject(pName);
    setGlobalSettings(projectData.settings || {});
    setObservations(projectData.observations || []);
    setAdjMetrics(projectData.adjMetrics || {});       
    setTraverseData(projectData.traverse_data || []);
    setTraverseMetrics(projectData.metrics || {});
    setTachymetryData(projectData.tachymetryData || { measurements: [], stations: [], results: [] });
    
    setStakeoutData(projectData.stakeoutData || {
      station: { name: 'St1', x: '', y: '' },
      backsight: { name: 'BS1', x: '', y: '' },
      azimuthBs: '---',
      points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
    });

    setGoniometryData(projectData.goniometryData || []);
    setLevelingObservations(projectData.levelingObservations || []);
    setLevelingStations(projectData.levelingStations || []);
    setLevelingForward(projectData.levelingForward || []);
    setLevelingBackward(projectData.levelingBackward || []);
    setLevelingMetrics(projectData.levelingMetrics || {});
    setTrigHeightData(projectData.trigHeightData || []);

    setIsProjectModalOpen(false);

    setTimeout(() => {
      setIsDataLoaded(true);
      setIsProjectSwitching(false);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      <Toaster position="bottom-right" toastOptions={{
          style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #1e293b', fontSize: '12px' }
      }} />
      <UpdateNotification updateInfo={updateInfo} />

      {/* --- 🎬 INITIAL APP BOOT (LASCA INTRO) --- */}
      {showIntroElement && (
        <div 
          className={`absolute inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${
            isAppBooting ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <LascaIntro size={240} speed={1.1} />
        </div>
      )}

      {/* --- LascaLoader Overlay --- */}
      {isProjectSwitching && (
        <div className="absolute inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
          <LascaLoader variant="cycle" size={160} glow={true} breathe={true} />
          <p className="mt-6 text-emerald-400 font-mono text-sm tracking-widest animate-pulse">
            ΦΟΡΤΩΣΗ PROJECT...
          </p>
        </div>
      )}

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
                setGoniometryData={setGoniometryData}
                setLevelingObservations={setLevelingObservations}
                setLevelingStations={setLevelingStations}
                setTrigLevelingData={setTrigHeightData}
                onOpenProjectManager={() => setIsProjectModalOpen(true)}
                
                projectSettings={{ 
                  name: currentProject,
                  settings: globalSettings
                }}
                traverseData={traverseData}
                traverseMetrics={traverseMetrics}
                tachymetryData={tachymetryData}
                stakeoutData={stakeoutData}
                levelingMetrics={levelingMetrics}
              />
            )}

            {activeTab === 'basic_calc' && (
              <BasicCalculations 
                projectInfo={{
                  projectName: currentProject,
                  designer: globalSettings.designer,
                  employer: globalSettings.employer,
                  location: globalSettings.location
                }}
              />
            )}
            
            {activeTab === 'adjustment' && (
              <Adjustment 
                observations={observations} 
                setObservations={setObservations} 
                adjMetrics={adjMetrics}
                setAdjMetrics={setAdjMetrics}
                projectInfo={{
                  projectName: currentProject,
                  designer: globalSettings.designer,
                  employer: globalSettings.employer,
                  location: globalSettings.location
                }}
              />
            )}
            
            {activeTab === 'traverse' && (
              <Traverse 
                data={traverseData} 
                setData={setTraverseData}        
                metrics={traverseMetrics} 
                setMetrics={setTraverseMetrics}   
                projectSettings={{
                  name: currentProject,
                  settings: globalSettings
                }}
              />
            )}

            {activeTab === 'traverse_height' && (
              <TraverseHeight 
                observations={levelingObservations} 
                setObservations={setLevelingObservations}
                stations={levelingStations}
                setStations={setLevelingStations}
                projectSettings={currentProject}
              />
            )}

            {activeTab === 'trig_leveling' && (
            <TrigonometricHeight 
              data={trigHeightData}
              setData={setTrigHeightData}
              projectSettings={{
                name: currentProject,
                designer: globalSettings.designer,
                employer: globalSettings.employer,
                location: globalSettings.location
              }}
            />
          )}
            
            {activeTab === 'tachymetry' && (
              <Tachymetry 
                tachymetryData={tachymetryData} 
                setTachymetryData={setTachymetryData} 
                projectSettings={currentProject}
                traverseData={traverseData}
              />
            )}

            {activeTab === 'stakeout' && (
              <Charaxi 
                stakeoutData={stakeoutData}
                setStakeoutData={setStakeoutData}
                projectInfo={{
                  projectName: currentProject,
                  designer: globalSettings.designer,
                  employer: globalSettings.employer,
                  location: globalSettings.location
                }}
              />
            )}

            {activeTab === 'goniometry' && (
              <Goniometry 
                rows={goniometryData}      
                setRows={setGoniometryData} 
                projectInfo={{
                  projectName: currentProject,
                  designer: globalSettings.designer,
                  employer: globalSettings.employer,
                  location: globalSettings.location
                }}
              />
            )}

            {activeTab === 'geom_leveling' && (
              <Leveling 
                forwardData={levelingForward}
                setForwardData={setLevelingForward}
                backwardData={levelingBackward}
                setBackwardData={setLevelingBackward}
                metrics={levelingMetrics}
                setMetrics={setLevelingMetrics}
                projectSettings={currentProject}
              />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;