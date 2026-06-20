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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- PROJECT MANAGEMENT STATES ---
  const [currentProject, setCurrentProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});

  // --- DATA STATES ---
  const [observations, setObservations] = useState([]);
  const [adjMetrics, setAdjMetrics] = useState({}); 
  const [traverseData, setTraverseData] = useState([]); 
  const [traverseMetrics, setTraverseMetrics] = useState({}); 
  const [tachymetryData, setTachymetryData] = useState({ measurements: [], stations: [], results: [] }); 

  // --- 1. AUTO-SAVE ΜΗΧΑΝΙΣΜΟΣ ---
  useEffect(() => {
    if (!currentProject) return; 

    const savedProjects = JSON.parse(localStorage.getItem('survey_projects') || '{}');

    savedProjects[currentProject] = {
      ...savedProjects[currentProject], 
      project_name: currentProject,
      settings: globalSettings,
      observations: observations,
      adjMetrics: adjMetrics,       
      traverse_data: traverseData,
      metrics: traverseMetrics,
      tachymetryData: tachymetryData
    };

    localStorage.setItem('survey_projects', JSON.stringify(savedProjects));
  }, [currentProject, globalSettings, observations, adjMetrics, traverseData, traverseMetrics, tachymetryData]);


  // --- 2. ΟΤΑΝ ΦΟΡΤΩΝΕΙ ΕΝΑ PROJECT ΑΠΟ ΤΟ MODAL ---
  const handleProjectLoaded = (projectData) => {
    const pName = projectData.project_name;
    setCurrentProject(pName);
    setGlobalSettings(projectData.settings || {});
    
    const savedProjects = JSON.parse(localStorage.getItem('survey_projects') || '{}');
    const localProject = savedProjects[pName];

    if (localProject) {
      setObservations(localProject.observations || []);
      setAdjMetrics(localProject.adjMetrics || {});      
      setTraverseData(localProject.traverse_data || []);
      setTraverseMetrics(localProject.metrics || {});
      setTachymetryData(localProject.tachymetryData || { measurements: [], stations: [], results: [] });
    } else {
      setObservations(projectData.observations || []);
      setAdjMetrics(projectData.adjMetrics || {});       
      setTraverseData(projectData.traverse_data || []);
      setTraverseMetrics(projectData.metrics || {});
      setTachymetryData(projectData.tachymetryData || { measurements: [], stations: [], results: [] });
    }

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
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;