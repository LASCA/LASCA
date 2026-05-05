import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Adjustment from './components/Adjustment';

// Στο App.jsx
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

        {/* Προσθέτουμε λίγο παραπάνω padding top αν δεν υπάρχει το Header */}
        <main className={`flex-1 p-8 pl-12 overflow-y-auto ${activeTab === 'dashboard' ? 'pt-12' : ''}`}>
          <div className="max-w-[1800px] mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'adjustment' && <Adjustment />}
            
            {/* Υπόλοιπα tabs */}
            {(activeTab === 'traverse' || activeTab === 'mapping') && (
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