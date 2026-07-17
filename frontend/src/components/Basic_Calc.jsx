import React, { useState } from 'react';
import { Calculator, MapPin, Target, Navigation, Repeat, Play, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ------------------------------------------------------------------
// ΥΠΟ-COMPONENT: Το γενικό "Πλαίσιο" (Card) για κάθε υπολογισμό
// ------------------------------------------------------------------
const CalcWidget = ({ title, icon, children, onCalculate, onClear, result, loading, resultLabels }) => (
  <div className="bg-[#0b1220] rounded-2xl border border-slate-800/60 p-5 flex flex-col shadow-lg hover:border-slate-700/80 transition-colors duration-300">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
      <div className="flex items-center gap-2 text-indigo-400">
        {icon}
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      <button onClick={onClear} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all" title="Καθαρισμός">
        <RotateCcw size={14} />
      </button>
    </div>
    
    {/* Περιοχή Εισαγωγής Δεδομένων */}
    <div className="flex-1 flex flex-col gap-3">
      {children}
    </div>

    {/* Περιοχή Αποτελέσματος & Κουμπί Εκτέλεσης */}
    <div className="mt-5 pt-4 border-t border-slate-800/50 flex flex-col gap-3">
      {result ? (
        <div className="flex gap-2 animate-in fade-in zoom-in duration-200">
          {result.map((res, idx) => (
            <div key={idx} className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{resultLabels[idx]}</p>
              <p className="text-sm font-mono text-emerald-400">{res}</p>
            </div>
          ))}
        </div>
      ) : (
        <button 
          onClick={onCalculate}
          disabled={loading}
          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/10 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Υπολογισμός...' : <><Play size={14} fill="currentColor"/> Εκτέλεση</>}
        </button>
      )}
    </div>
  </div>
);

// ------------------------------------------------------------------
// COMPONENT ΓΙΑ ΤΑ INPUTS (Για ομοιομορφία & οικονομία κώδικα)
// ------------------------------------------------------------------
const InputField = ({ label, placeholder }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-[9px] uppercase text-slate-400 ml-1 font-semibold">{label}</label>
    <input 
      type="number" 
      className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 w-full"
      placeholder={placeholder || "0.000"}
    />
  </div>
);

const BasicCalculations = () => {
  // States φόρτωσης και αποτελεσμάτων για το καθένα από τα 6 πλαίσια
  const [loadings, setLoadings] = useState({});
  const [results, setResults] = useState({
    convert: null, prob1: null, prob2: null, prob3: null, intersect: null, resect: null
  });

  // Ενδεικτική (Dummy) συνάρτηση εκτέλεσης
  const handleSimulateCalculation = async (key, mockResultArray) => {
    setLoadings(prev => ({ ...prev, [key]: true }));
    try {
      await new Promise(r => setTimeout(r, 600)); // Delay για ρεαλισμό
      setResults(prev => ({ ...prev, [key]: mockResultArray }));
      toast.success('Υπολογισμός επιτυχής!');
    } catch (error) {
      toast.error('Σφάλμα κατά τον υπολογισμό.');
    } finally {
      setLoadings(prev => ({ ...prev, [key]: false }));
    }
  };

  const clearResult = (key) => setResults(prev => ({ ...prev, [key]: null }));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
      {/* GRID 3x2 ΜΕ ΤΑ 6 ΑΝΕΞΑΡΤΗΤΑ ΠΛΑΙΣΙΑ (Χωρίς το πάνω Header πλέον) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* --- 1. Μετατροπές Γωνιών (Ήρθε Πρώτο!) --- */}
        <CalcWidget 
          title="Μετατροπες Μοναδων Γωνιας" 
          icon={<Repeat size={18} />}
          loading={loadings.convert}
          result={results.convert}
          resultLabels={["GRADIANS", "DEGREES"]}
          onCalculate={() => handleSimulateCalculation('convert', ['100.0000g', '90.0000°'])}
          onClear={() => clearResult('convert')}
        >
          <div className="flex flex-col gap-3 h-full justify-center">
            <InputField label="Εισαγωγη Τιμης" placeholder="π.χ. 3.14159" />
            <div className="flex gap-2">
              <select className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none w-full">
                <option>Από Radians</option>
                <option>Από Gradians (g)</option>
                <option>Από Degrees (°)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic mt-2">Εισάγετε τιμή και πατήστε εκτέλεση για άμεση μετατροπή στα υπόλοιπα συστήματα.</p>
          </div>
        </CalcWidget>

        {/* --- 2. 1ο Θεμελιώδες --- */}
        <CalcWidget 
          title="1ο Θεμελιωδες (Πολικο -> Ορθ.)" 
          icon={<Navigation size={18} />}
          loading={loadings.prob1}
          result={results.prob1}
          resultLabels={["X_B (m)", "Y_B (m)"]}
          onCalculate={() => handleSimulateCalculation('prob1', ['450123.456', '4409876.123'])}
          onClear={() => clearResult('prob1')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField label="X_A [m]" />
            <InputField label="Y_A [m]" />
            <InputField label="D_AB [m]" />
            <InputField label="ΓΩΝΙΑ a_AB [grad]" />
          </div>
        </CalcWidget>

        {/* --- 3. 2ο Θεμελιώδες --- */}
        <CalcWidget 
          title="2ο Θεμελιωδες (Ορθ. -> Πολικο)" 
          icon={<MapPin size={18} />}
          loading={loadings.prob2}
          result={results.prob2}
          resultLabels={["D_AB (m)", "ΓΩΝΙΑ a_AB (grad)"]}
          onCalculate={() => handleSimulateCalculation('prob2', ['145.230', '120.4560'])}
          onClear={() => clearResult('prob2')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField label="X_A [m]" />
            <InputField label="Y_A [m]" />
            <InputField label="X_B [m]" />
            <InputField label="Y_B [m]" />
          </div>
        </CalcWidget>

        {/* --- 4. 3ο Θεμελιώδες --- */}
        <CalcWidget 
          title="3ο Θεμελιωδες (Γωνια απο Συντ.)" 
          icon={<Calculator size={18} />}
          loading={loadings.prob3}
          result={results.prob3}
          resultLabels={["ΓΩΝΙΑ β (grad)"]}
          onCalculate={() => handleSimulateCalculation('prob3', ['245.8912'])}
          onClear={() => clearResult('prob3')}
        >
          <div className="grid grid-cols-3 gap-3">
            <InputField label="X_A" />
            <InputField label="X_B (Κεντρο)" />
            <InputField label="X_C" />
            <InputField label="Y_A" />
            <InputField label="Y_B (Κεντρο)" />
            <InputField label="Y_C" />
          </div>
        </CalcWidget>

        {/* --- 5. Εμπροσθοτομία --- */}
        <CalcWidget 
          title="Εμπροσθοτομια" 
          icon={<Target size={18} />}
          loading={loadings.intersect}
          result={results.intersect}
          resultLabels={["X_P (m)", "Y_P (m)"]}
          onCalculate={() => handleSimulateCalculation('intersect', ['451200.100', '4410100.200'])}
          onClear={() => clearResult('intersect')}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex gap-3"><InputField label="X_A" /><InputField label="Y_A" /></div>
            <div className="col-span-2 flex gap-3"><InputField label="X_B" /><InputField label="Y_B" /></div>
            <InputField label="ΓΩΝΙΑ a (A->P)" />
            <InputField label="ΓΩΝΙΑ b (B->P)" />
          </div>
        </CalcWidget>

        {/* --- 6. Οπισθοτομία --- */}
        <CalcWidget 
          title="Οπισθοτομια (Snellius)" 
          icon={<Target size={18} className="rotate-180" />}
          loading={loadings.resect}
          result={results.resect}
          resultLabels={["X_P (m)", "Y_P (m)"]}
          onCalculate={() => handleSimulateCalculation('resect', ['452000.555', '4411222.333'])}
          onClear={() => clearResult('resect')}
        >
           <div className="grid grid-cols-3 gap-2">
            <InputField label="X_A" /><InputField label="X_B" /><InputField label="X_C" />
            <InputField label="Y_A" /><InputField label="Y_B" /><InputField label="Y_C" />
            <div className="col-span-3 flex gap-2 mt-1">
              <InputField label="ΜΕΤΡ. ΓΩΝΙΑ α" />
              <InputField label="ΜΕΤΡ. ΓΩΝΙΑ β" />
            </div>
          </div>
        </CalcWidget>

      </div>
    </div>
  );
};

export default BasicCalculations;