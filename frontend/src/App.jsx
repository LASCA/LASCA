import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './config';
import { useAuth } from './auth/AuthContext';
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
import UserMenu from './components/layout/UserMenu';
import { TOPBAR_BARE, TOPBAR_ITEM, TOPBAR_NEUTRAL } from './components/layout/topbar';
import ShareDialog from './components/collab/ShareDialog';
import ShareButton from './components/collab/ShareButton';
import { LiveBar, ConflictBanner } from './components/collab/LiveBar';
import useProjectLive from './components/collab/useProjectLive';
import { createCollabApi } from './components/collab/collabApi';

const MEMBERSHIP_ACTIONS = new Set(['member_added', 'member_removed', 'role_changed', 'left', 'joined_via_link', 'ownership_transferred']);

function App() {
  // Ο συνδεδεμένος χρήστης έρχεται από το AuthProvider (main.jsx).
  const { user: currentUser } = useAuth();
  // Το ενεργό project αποθηκεύεται ανά χρήστη, ώστε σε κοινό browser
  // ο επόμενος χρήστης να μην προσπαθεί να ανοίξει το project του προηγούμενου.
  const projectStorageKey = `current_active_project_${currentUser?.id ?? 'anon'}`;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- APP BOOT STATES (ΓΙΑ ΤΟ LASCA INTRO) ---
  // Το intro παίζει μία φορά ανά καρτέλα browser, όχι κάθε φορά που γυρνάς από το Προφίλ.
  const introAlreadySeen = sessionStorage.getItem('lasca_intro_seen') === '1';
  const [isAppBooting, setIsAppBooting] = useState(!introAlreadySeen);
  const [showIntroElement, setShowIntroElement] = useState(!introAlreadySeen);

  // --- PROJECT MANAGEMENT STATES ---
  const [currentProject, setCurrentProject] = useState(() => {
    return localStorage.getItem(projectStorageKey) || null;
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isShareProjectOpen, setIsShareProjectOpen] = useState(false);
  const [shareMembers, setShareMembers] = useState([]);   // ποιοι άλλοι έχουν πρόσβαση στο ανοιχτό project
  const [globalSettings, setGlobalSettings] = useState({});
  const [projectLoadError, setProjectLoadError] = useState('');
  const [projectLoadAttempt, setProjectLoadAttempt] = useState(0);
  const projectLoadGenerationRef = useRef(0);

  // --- ΚΟΙΝΑ PROJECTS / ΖΩΝΤΑΝΗ ΣΥΝΕΡΓΑΣΙΑ ---
  // projectMeta: { public_id, role: owner|editor|viewer, version, ... } από τον server
  const [projectMeta, setProjectMeta] = useState(null);
  const [conflict, setConflict] = useState(null);      // κάποιος άλλος άλλαξε το project ταυτόχρονα
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const versionRef = useRef(0);        // η τελευταία έκδοση του project που ξέρουμε
  const skipSaveRef = useRef(false);   // μην ξαναστείλεις πίσω δεδομένα που μόλις ήρθαν από άλλον
  const conflictRef = useRef(null);
  conflictRef.current = conflict;
  const collabApi = useMemo(() => createCollabApi(`${API_BASE_URL}/api`), []);
  const isReadOnly = projectMeta?.role === 'viewer';

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
    if (introAlreadySeen) return undefined;
    sessionStorage.setItem('lasca_intro_seen', '1');
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

  // Περνάει στην οθόνη ολόκληρη την κατάσταση ενός project (όπως τη στέλνει ο server).
  const applyProjectState = (data) => {
    setGlobalSettings(data.settings || {});
    setObservations(data.observations || []);
    setAdjMetrics(data.adjMetrics || {});
    setTraverseData(data.traverse_data || []);
    setTraverseMetrics(data.metrics || {});
    setTachymetryData(data.tachymetryData || { measurements: [], stations: [], results: [] });
    setStakeoutData(data.stakeoutData || {
      station: { name: 'St1', x: '', y: '' },
      backsight: { name: 'BS1', x: '', y: '' },
      azimuthBs: '---',
      points: [{ id: 1, name: 'P1', x: '', y: '', hz_stake: '', dist_stake: '' }]
    });
    setGoniometryData(data.goniometryData || []);
    setLevelingObservations(data.levelingObservations || []);
    setLevelingStations(data.levelingStations || []);
    setLevelingForward(data.levelingForward || []);
    setLevelingBackward(data.levelingBackward || []);
    setLevelingMetrics(data.levelingMetrics || {});
    setTrigHeightData(data.trigHeightData || []);
  };

  const applyMeta = (meta) => {
    setProjectMeta(meta || null);
    versionRef.current = meta?.version || 0;
    setConflict(null);
  };

  const closeProject = () => {
    localStorage.removeItem(projectStorageKey);
    setCurrentProject(null);
    applyMeta(null);
    resetAllData();
  };


  // --- 0. ΑΡΧΙΚΗ ΦΟΡΤΩΣΗ ΤΟΥ PROJECT (ΣΤΟ ΠΑΡΑΣΚΗΝΙΟ) ---
  useEffect(() => {
    if (currentProject) {
      setIsDataLoaded(false);
      resetAllData();
      setProjectLoadError('');
      // Αγνοούμε απαντήσεις που έρχονται αφού άλλαξε το project (π.χ. γρήγορη εναλλαγή).
      const loadGeneration = ++projectLoadGenerationRef.current;

      fetch(`${API_BASE_URL}/api/projects/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: currentProject })
      })
      .then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json().catch(() => null) }))
      .then(({ ok, status, data: backendData }) => {
        if (loadGeneration !== projectLoadGenerationRef.current) return;
        if (!ok || !backendData || backendData.error) {
          if (status === 403 || status === 404) {
            // π.χ. σε αφαίρεσαν από το project ή διαγράφηκε
            toast.error(backendData?.error || 'Το project δεν είναι πια διαθέσιμο.');
            closeProject();
            setIsDataLoaded(true);
            return;
          }
          throw new Error(backendData?.error || `HTTP ${status}`);
        }
        applyMeta(backendData._meta);
        applyProjectState(backendData);
        setIsDataLoaded(true);
      })
      .catch(err => {
        if (loadGeneration !== projectLoadGenerationRef.current) return;
        console.error("❌ Αποτυχία φόρτωσης project:", err);
        // Η αυτόματη αποθήκευση μένει κλειστή: δεν γράφουμε ποτέ κενά δεδομένα πάνω στο project.
        setProjectLoadError('Δεν φορτώθηκε το project. Τα δεδομένα του δεν άλλαξαν.');
      });
      return () => {
        if (loadGeneration === projectLoadGenerationRef.current) projectLoadGenerationRef.current += 1;
      };
    }
    resetAllData();
    setIsDataLoaded(true);
    return undefined;
  }, [currentProject, projectLoadAttempt]);

  // --- 1. AUTO-SAVE ΜΗΧΑΝΙΣΜΟΣ ---
  useEffect(() => {
    if (!currentProject || !isDataLoaded) return; 
    // Δεδομένα που μόλις ήρθαν από συνεργάτη: δεν τα ξαναστέλνουμε πίσω.
    if (skipSaveRef.current) { skipSaveRef.current = false; return; }
    // Αναγνώστης: βλέπει αλλά δεν αποθηκεύει. Σε σύγκρουση περιμένουμε την απόφαση του χρήστη.
    if (isReadOnly || conflictRef.current) return;

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
    localStorage.setItem(projectStorageKey, currentProject);

    // ΑΛΛΑΓΗ: Χρησιμοποιούμε το API_BASE_URL αντί για hardcoded localhost
    fetch(`${API_BASE_URL}/api/projects/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: currentProject,
        state: projectState,
        base_version: versionRef.current
      })
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === 'conflict') {
        setConflict(data.current);
      } else if (res.ok && data.status === "success") {
        if (typeof data.version === 'number') versionRef.current = Math.max(versionRef.current, data.version);
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

  // Μέλη του ανοιχτού project για το κουμπί «Κοινοποίηση».
  const [membersVersion, setMembersVersion] = useState(0);
  useEffect(() => {
    setShareMembers([]);
    const pid = projectMeta?.public_id;
    if (!pid) return undefined;
    let cancelled = false;
    collabApi.members(pid)
      .then((d) => { if (!cancelled) setShareMembers((d.members || []).filter((m) => m.id !== currentUser?.id)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectMeta?.public_id, collabApi, currentUser?.id, membersVersion]);

  // --- 1Β. ΖΩΝΤΑΝΗ ΣΥΝΕΡΓΑΣΙΑ (ποιος είναι online, αλλαγές άλλων, ιστορικό) ---
  const lastRemoteToastRef = useRef(0);
  const live = useProjectLive({
    enabled: Boolean(currentProject && projectMeta?.public_id && isDataLoaded),
    sync: (body) => collabApi.sync(projectMeta.public_id, body),
    markSeen: (lastId) => collabApi.markSeen(projectMeta.public_id, lastId),
    tool: activeTab,
    client: 'web',
    getVersion: () => versionRef.current,
    onProject: (project) => {
      setProjectMeta((prev) => (prev && prev.public_id === project.public_id && prev.role !== project.role
        ? { ...prev, role: project.role, role_label: project.role_label, owner: project.owner } : prev));
    },
    onRemoteState: (state, project) => {
      if (conflictRef.current) return;
      skipSaveRef.current = true;
      applyProjectState(state);
      versionRef.current = project?.version || versionRef.current;
      const now = Date.now();
      if (now - lastRemoteToastRef.current > 8000) {
        lastRemoteToastRef.current = now;
        toast(`${project?.updated_by?.display_name || 'Ένας συνεργάτης'} ενημέρωσε το project`, { icon: '🔄' });
      }
    },
    onLostAccess: () => {
      toast.error('Δεν έχεις πια πρόσβαση σε αυτό το project.');
      closeProject();
    },
  });

  // Κάποιος μπήκε/βγήκε από το project (φαίνεται στο ιστορικό): ανανέωση του κουμπιού «Κοινοποίηση».
  const membershipEvents = live.activity.filter((a) => MEMBERSHIP_ACTIONS.has(a.action)).length;
  useEffect(() => { if (membershipEvents) setMembersVersion((v) => v + 1); }, [membershipEvents]);

  const buildProjectState = () => ({
    project_name: currentProject,
    settings: globalSettings, observations, adjMetrics, traverse_data: traverseData, metrics: traverseMetrics,
    tachymetryData, stakeoutData, goniometryData, levelingObservations, levelingStations,
    levelingForward, levelingBackward, levelingMetrics, trigHeightData,
  });

  const loadTheirChanges = () => {
    if (!conflict) return;
    skipSaveRef.current = true;
    applyProjectState(conflict.state || {});
    versionRef.current = conflict.version || versionRef.current;
    setConflict(null);
  };

  const keepMyChanges = async () => {
    setResolvingConflict(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: currentProject, state: buildProjectState(), force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Αποτυχία αποθήκευσης');
      versionRef.current = data.version;
      setConflict(null);
      toast.success('Κρατήθηκαν οι δικές σου αλλαγές');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResolvingConflict(false);
    }
  };

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

      const tooltipWidth = tooltipEl.offsetWidth;
      const centeredX = rect.left + (rect.width / 2);
      const alignRight = centeredX + (tooltipWidth / 2) > window.innerWidth - 8;
      const x = alignRight ? Math.min(rect.right, window.innerWidth - 8) : centeredX;
      const y = rect.bottom + 8;

      tooltipEl.classList.toggle('align-right', alignRight);
      tooltipEl.style.left = `${x}px`;
      if (alignRight) {
        tooltipEl.style.setProperty('--tooltip-arrow-left', `${tooltipWidth - (rect.right - rect.left) / 2}px`);
      } else {
        tooltipEl.style.removeProperty('--tooltip-arrow-left');
      }
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
    if (!projectData || projectData.error) return false;   // το παράθυρο δείχνει το σφάλμα
    setProjectLoadError('');
    setIsProjectSwitching(true);
    setIsDataLoaded(false); 
    resetAllData();

    const pName = projectData._meta?.name || projectData.project_name;
    applyMeta(projectData._meta);
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

      {projectLoadError && (
        <div role="alert" className="absolute top-4 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-4 rounded-xl border border-red-500/40 bg-slate-900 px-4 py-3 text-sm text-red-200 shadow-xl">
          <span>{projectLoadError}</span>
          <button type="button" className="rounded-lg bg-red-500/20 px-3 py-1 font-semibold text-red-100 hover:bg-red-500/30"
            onClick={() => setProjectLoadAttempt((attempt) => attempt + 1)}>
            Επανάληψη
          </button>
        </div>
      )}

      <ProjectManager 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onProjectLoaded={handleProjectLoaded}
        currentProject={currentProject}
      />
      <ShareDialog
        isOpen={isShareProjectOpen}
        onClose={() => setIsShareProjectOpen(false)}
        api={collabApi}
        projectId={projectMeta?.public_id}
        projectName={currentProject}
        currentUserId={currentUser?.id}
        onRoleChanged={(role) => role && setProjectMeta((prev) => (prev && prev.role !== role ? { ...prev, role } : prev))}
        onMembersChanged={(list) => setShareMembers(list.filter((m) => m.id !== currentUser?.id))}
        onLeft={closeProject}
      />
      <ConflictBanner conflict={conflict} onLoadTheirs={loadTheirChanges} onKeepMine={keepMyChanges} busy={resolvingConflict} />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        
        {/* Μπάρα πάνω δεξιά: είναι κανονική γραμμή (όχι absolute), οπότε το περιεχόμενο
            περνάει από κάτω της στο scroll και δεν πέφτει ποτέ πάνω της. */}
        {(() => {
          const bare = activeTab === 'dashboard';
          const topActions = (
            <div className="flex items-center gap-2 sm:gap-3 flex-nowrap min-w-0">
              {currentProject && (
                <div className="flex items-center gap-2 shrink-0">
                  {projectMeta && (
                    <LiveBar presence={live.presence} activity={live.activity} online={live.online}
                      readOnly={isReadOnly} asset={collabApi.asset} itemClass={TOPBAR_ITEM}
                      unread={live.unread} lastSeen={live.lastSeen} onOpenHistory={live.markAllSeen}
                      onOpenTool={setActiveTab} currentUserId={currentUser?.id} />
                  )}
                  <ShareButton itemClass={TOPBAR_ITEM} members={shareMembers}
                    disabled={!projectMeta?.public_id} onClick={() => setIsShareProjectOpen(true)}
                    hint={!projectMeta?.public_id ? 'Το project δεν είναι ακόμα στο cloud' : undefined} />
                </div>
              )}
              {currentProject && (
                <div className="hidden lg:block min-w-0">
                  <span
                    aria-label={`Project: ${currentProject}`}
                    className={`${TOPBAR_ITEM} px-3.5 max-w-[260px] text-emerald-300 ${bare
                      ? 'border-transparent bg-transparent shadow-none backdrop-blur-none'
                      : 'border-emerald-500/25 bg-emerald-500/10'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-medium text-emerald-500/80">Project</span>
                    <span className="truncate">{currentProject}</span>
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(true)}
                aria-label={currentProject ? 'Αλλαγή Project' : 'Επιλογή Project'}
                className={`${TOPBAR_ITEM} ${bare ? TOPBAR_BARE : TOPBAR_NEUTRAL} px-2.5 md:px-3.5 group`}
              >
                <FolderKanban size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline">{currentProject ? 'Αλλαγή Project' : 'Επιλογή Project'}</span>
              </button>
              <UserMenu bare={bare} />
            </div>
          );
          return activeTab === 'dashboard' ? (
            // Χωρίς πλαίσιο: διάφανη γραμμή, ίδιο φόντο με τη σελίδα. Επειδή είναι έξω από το
            // κομμάτι που κάνει scroll, το περιεχόμενο δεν περνάει ποτέ πάνω από τα widgets.
            <div className="shrink-0 px-6 pt-4 flex items-center justify-end relative z-20">
              {topActions}
            </div>
          ) : (
            <Header activeTab={activeTab}>{topActions}</Header>
          );
        })()}

        <main className={`flex-1 p-8 pl-12 overflow-y-auto ${activeTab === 'dashboard' ? 'pt-2' : ''}`}>
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