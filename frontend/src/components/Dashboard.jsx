import React from 'react';
import { Activity, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Συνολικά Σημεία" value="142" icon={<Database size={20} />} color="bg-blue-500/10 text-blue-500" />
        <StatCard title="Σφάλμα Κλεισίματος" value="0.012m" icon={<Activity size={20} />} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard title="Εκκρεμή Σφάλματα" value="2" icon={<AlertCircle size={20} />} color="bg-amber-500/10 text-amber-500" />
        <StatCard title="Status" value="Έτοιμο" icon={<CheckCircle2 size={20} />} color="bg-purple-500/10 text-purple-500" />
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 h-64 flex items-center justify-center">
        <p className="text-slate-600 italic">Εδώ θα μπει το γράφημα των συντεταγμένων...</p>
      </div>
    </div>
  );
};

export default Dashboard;