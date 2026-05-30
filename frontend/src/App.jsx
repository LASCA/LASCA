import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Adjustment from './components/Adjustment';
import Traverse from './components/Traverse';
import Tachymetry from './components/Tachymetry'; 

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // States για τη Συνορθώση Σταθμού
  const [observations, setObservations] = useState([]);

  // States για την Όδευση
  const [traverseData, setTraverseData] = useState([]); 
  const [traverseMetrics, setTraverseMetrics] = useState({}); 

  // States για την Ταχυμετρία
  const [tachymetryData, setTachymetryData] = useState([]); 

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Toaster position="bottom-right" toastOptions={{
          style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #1e293b', fontSize: '12px' }
      }} />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        {activeTab !== 'dashboard' && <Header activeTab={activeTab} />}

        <main className={`flex-1 p-8 pl-12 overflow-y-auto ${activeTab === 'dashboard' ? 'pt-12' : ''}`}>
          <div className="max-w-[1800px] mx-auto h-full">
            
            {activeTab === 'dashboard' && (
              <Dashboard 
                setObservations={setObservations} 
                setTraverseData={setTraverseData}
                setTachymetryData={setTachymetryData} 
              />
            )}
            
            {activeTab === 'adjustment' && (
              <Adjustment 
                observations={observations} 
                setObservations={setObservations} 
              />
            )}
            
            {activeTab === 'traverse' && (
              <Traverse 
                data={traverseData} 
                metrics={traverseMetrics} 
              />
            )}
            
            {/* Η σωστή κλήση του component */}
            {activeTab === 'mapping' && (
              <Tachymetry 
                data={tachymetryData} 
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;