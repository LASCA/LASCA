import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { FileSpreadsheet } from 'lucide-react';

function App() {
  // Η μοναδική πηγή αλήθειας για το ποιο tab είναι ανοιχτό
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Καλούμε το Sidebar και του δίνουμε πρόσβαση στο State */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col relative">
        {/* Καλούμε το Header */}
        <Header activeTab={activeTab} />

        {/* ΚΥΡΙΩΣ ΧΩΡΟΣ ΕΡΓΑΣΙΑΣ */}
        <main className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full">
            
            {/* Εδώ αργότερα θα βάλουμε και άλλα Components όπως <Dashboard /> ή <Table /> */}
            <div className="border-2 border-dashed border-slate-800 rounded-3xl h-full flex flex-col items-center justify-center text-slate-700">
               <FileSpreadsheet size={48} className="mb-4 opacity-20" />
               <p className="font-medium uppercase tracking-widest text-xs opacity-40 italic">
                 {activeTab === 'dashboard' && <Dashboard />}
               </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;