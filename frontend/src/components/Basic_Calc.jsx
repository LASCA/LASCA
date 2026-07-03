import React, { useState } from 'react';
import { Calculator, MapPin, Target, Navigation, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BasicCalculations = () => {
  // 1. Καθορισμός των διαθέσιμων υπολογισμών
  const calcTools = [
    { id: 'prob1', name: '1ο Θεμελιώδες', icon: <Navigation size={16} /> },
    { id: 'prob2', name: '2ο Θεμελιώδες', icon: <MapPin size={16} /> },
    { id: 'prob3', name: '3ο Θεμελιώδες', icon: <Calculator size={16} /> },
    { id: 'intersection', name: 'Εμπροσθοτομία', icon: <Target size={16} /> },
    { id: 'resection', name: 'Οπισθοτομία', icon: <Target size={16} /> }
  ];

  // 2. State για το ποιο εργαλείο είναι ενεργό
  const [activeTab, setActiveTab] = useState('prob1');

  // 3. State για τα δεδομένα εισόδου και τα αποτελέσματα (γενικό)
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Δυναμική αλλαγή των inputs
  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // Ενδεικτική συνάρτηση εκτέλεσης (που θα καλεί το Python backend)
  const handleCalculate = async () => {
    setLoading(true);
    try {
      // Εδώ θα μπει το fetch προς το αντίστοιχο endpoint της Python π.χ. /api/calc/prob1
      // Προς το παρόν, κάνουμε simulate μια καθυστέρηση
      await new Promise(r => setTimeout(r, 600)); 
      
      // Dummy αποτέλεσμα για το 1ο Θεμελιώδες
      setResults({ x: 450123.456, y: 4409876.123 });
      toast.success('Ο υπολογισμός ολοκληρώθηκε!');
    } catch (error) {
      toast.error('Σφάλμα κατά τον υπολογισμό.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* --- HEADER & SUB-NAVIGATION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0b1220] p-4 rounded-2xl border border-slate-800/60 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">Βασικοί Υπολογισμοί</h2>
            <p className="text-xs text-slate-500">Επίλυση θεμελιωδών τοπογραφικών προβλημάτων</p>
          </div>
        </div>

        {/* Εσωτερικά Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/40">
          {calcTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTab(tool.id);
                setInputs({}); // Καθαρισμός inputs στην αλλαγή tab
                setResults(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                activeTab === tool.id
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {tool.icon} {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN CONTENT AREA (Δυναμικό περιεχόμενο) --- */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ΑΡΙΣΤΕΡΗ ΣΤΗΛΗ: Δεδομένα Εισόδου */}
        <div className="lg:col-span-2 bg-[#0b1220] rounded-2xl border border-slate-800/60 p-6 flex flex-col shadow-lg">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/50">
            <Target className="text-indigo-400" size={18} />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Δεδομενα Εισοδου
            </h3>
          </div>

          {/* Εδώ γίνεται conditional rendering ανάλογα με το activeTab */}
          <div className="flex-1">
            {activeTab === 'prob1' && (
              <div className="grid grid-cols-2 gap-6">
                {/* Παράδειγμα για 1ο Θεμελιώδες: Xa, Ya, D, α */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 mb-2">ΣΥΝΤΕΤΑΓΜΕΝΕΣ ΑΦΕΤΗΡΙΑΣ (A)</h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-400 ml-1">X_A [m]</label>
                    <input 
                      type="number" 
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      placeholder="π.χ. 450000.000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-400 ml-1">Y_A [m]</label>
                    <input 
                      type="number" 
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 mb-2">ΜΕΤΡΗΣΕΙΣ</h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-400 ml-1">Απόσταση D_AB [m]</label>
                    <input type="number" className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-400 ml-1">Γωνία Διεύθυνσης α_AB [grad]</label>
                    <input type="number" className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all"/>
                  </div>
                </div>
              </div>
            )}
            
            {/* Αντίστοιχα προσθέτεις το UI για τα υπόλοιπα tabs... */}
            {activeTab === 'prob2' && <p className="text-slate-500 text-sm">UI για 2ο Θεμελιώδες...</p>}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-800/50">
            <button className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-2">
              <RotateCcw size={14} /> Καθαρισμός
            </button>
            <button 
              onClick={handleCalculate}
              disabled={loading}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {loading ? 'Υπολογισμός...' : 'Εκτέλεση'} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* ΔΕΞΙΑ ΣΤΗΛΗ: Αποτελέσματα */}
        <div className="bg-[#0b1220] rounded-2xl border border-slate-800/60 p-6 flex flex-col shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/50">
            <Calculator className="text-emerald-400" size={18} />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Αποτελεσματα
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            {results ? (
              <div className="w-full space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">X_B</p>
                  <p className="text-2xl font-mono text-emerald-400">{results.x.toFixed(3)} m</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Y_B</p>
                  <p className="text-2xl font-mono text-emerald-400">{results.y.toFixed(3)} m</p>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-50">
                <Target size={48} className="mx-auto text-slate-700 mb-4" strokeWidth={1} />
                <p className="text-xs font-medium text-slate-400">Εισάγετε δεδομένα και πατήστε εκτέλεση</p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default BasicCalculations;