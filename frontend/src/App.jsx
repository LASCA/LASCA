import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Adjustment from './components/Adjustment';
import Traverse from './components/Traverse'; // 1. Κάνε import το νέο component

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        
        {/* Κρύβουμε το Header μόνο όταν είμαστε στο Dashboard */}
        {activeTab !== 'dashboard' && <Header activeTab={activeTab} />}

        <main className={`flex-1 p-8 pl-12 overflow-y-auto ${activeTab === 'dashboard' ? 'pt-12' : ''}`}>
          <div className="max-w-[1800px] mx-auto h-full">
            
            {/* 2. Rendering των Tabs */}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'adjustment' && <Adjustment />}
            {activeTab === 'traverse' && <Traverse />} {/* Εμφάνιση της Όδευσης */}
            
            {/* 3. Υπόλοιπα tabs (Αφαιρέσαμε το 'traverse' από εδώ) */}
            {activeTab === 'mapping' && (
              <div className="h-full border-2 border-dashed border-slate-800 rounded-[3rem] flex items-center justify-center">
                 <p className="uppercase tracking-[0.3em] text-slate-700 font-black">Module Under Construction</p>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;