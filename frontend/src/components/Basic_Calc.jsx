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

const InputField = ({ label }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-[11px] text-slate-400 ml-1 font-bold">{label}</label>
    <input 
      type="text" 
      inputMode="decimal"
      className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

const BasicCalculations = () => {
  const [loadings, setLoadings] = useState({});
  const [results, setResults] = useState({
    convert: null, prob1: null, prob2: null, prob3: null, intersect: null, resect: null
  });

  const clearResult = (key) => setResults(prev => ({ ...prev, [key]: null }));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* --- 1. Μετατροπές Γωνιών --- */}
        <CalcWidget 
          title="Μετατροπες Μοναδων Γωνιας" 
          icon={<Repeat size={18} />}
          loading={loadings.convert}
          result={results.convert}
          resultLabels={["GRADIANS", "DEGREES"]}
          onCalculate={() => console.log('Εκτέλεση: Μετατροπές')}
          onClear={() => clearResult('convert')}
        >
          <div className="flex flex-col gap-3 h-full justify-center">
            <InputField label="Εισαγωγή Τιμής" />
            <div className="flex gap-2">
              <select className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none w-full">
                <option>Από Radians</option>
                <option>Από Gradians (g)</option>
                <option>Από Degrees (°)</option>
              </select>
            </div>
          </div>
        </CalcWidget>

        {/* --- 2. 1ο Θεμελιώδες --- */}
        <CalcWidget 
          title="1ο Θεμελιωδες" 
          icon={<Navigation size={18} />}
          loading={loadings.prob1}
          result={results.prob1}
          resultLabels={["X_B (m)", "Y_B (m)"]}
          onCalculate={() => console.log('Εκτέλεση: 1ο Θεμελιώδες')}
          onClear={() => clearResult('prob1')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField label={<span>X<sub>A</sub> [m]</span>} />
            <InputField label={<span>Y<sub>A</sub> [m]</span>} />
            <InputField label={<span>D<sub>AB</sub> [m]</span>} />
            <InputField label={<span>G<sub>A</sub> [grad]</span>} />
          </div>
        </CalcWidget>

        {/* --- 3. 2ο Θεμελιώδες --- */}
        <CalcWidget 
          title="2ο Θεμελιωδες" 
          icon={<MapPin size={18} />}
          loading={loadings.prob2}
          result={results.prob2}
          resultLabels={["D_AB (m)", "ΓΩΝΙΑ a_AB (grad)"]}
          onCalculate={() => console.log('Εκτέλεση: 2ο Θεμελιώδες')}
          onClear={() => clearResult('prob2')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField label={<span>X<sub>A</sub> [m]</span>} />
            <InputField label={<span>Y<sub>A</sub> [m]</span>} />
            <InputField label={<span>X<sub>B</sub> [m]</span>} />
            <InputField label={<span>Y<sub>B</sub> [m]</span>} />
          </div>
        </CalcWidget>

        {/* --- 4. 3ο Θεμελιώδες --- */}
        <CalcWidget 
          title="3ο Θεμελιωδες" 
          icon={<Calculator size={18} />}
          loading={loadings.prob3}
          result={results.prob3}
          resultLabels={["ΓΩΝΙΑ β (grad)"]}
          onCalculate={() => console.log('Εκτέλεση: 3ο Θεμελιώδες')}
          onClear={() => clearResult('prob3')}
        >
          <div className="grid grid-cols-3 gap-3">
            <InputField label={<span>X<sub>A</sub></span>} />
            <InputField label={<span>X<sub>B</sub> (Κέντρο)</span>} />
            <InputField label={<span>X<sub>C</sub></span>} />
            <InputField label={<span>Y<sub>A</sub></span>} />
            <InputField label={<span>Y<sub>B</sub> (Κέντρο)</span>} />
            <InputField label={<span>Y<sub>C</sub></span>} />
          </div>
        </CalcWidget>

        {/* --- 5. Εμπροσθοτομία --- */}
        <CalcWidget 
          title="Εμπροσθοτομια" 
          icon={<Target size={18} />}
          loading={loadings.intersect}
          result={results.intersect}
          resultLabels={["X_P (m)", "Y_P (m)"]}
          onCalculate={() => console.log('Εκτέλεση: Εμπροσθοτομία')}
          onClear={() => clearResult('intersect')}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex gap-3"><InputField label={<span>X<sub>A</sub></span>} /><InputField label={<span>Y<sub>A</sub></span>} /></div>
            <div className="col-span-2 flex gap-3"><InputField label={<span>X<sub>B</sub></span>} /><InputField label={<span>Y<sub>B</sub></span>} /></div>
            <InputField label="ΓΩΝΙΑ a (A->P)" />
            <InputField label="ΓΩΝΙΑ b (B->P)" />
          </div>
        </CalcWidget>

        {/* --- 6. Οπισθοτομία --- */}
        <CalcWidget 
          title="Οπισθοτομια" 
          icon={<Target size={18} className="rotate-180" />}
          loading={loadings.resect}
          result={results.resect}
          resultLabels={["X_P (m)", "Y_P (m)"]}
          onCalculate={() => console.log('Εκτέλεση: Οπισθοτομία')}
          onClear={() => clearResult('resect')}
        >
           <div className="grid grid-cols-3 gap-2">
            <InputField label={<span>X<sub>A</sub></span>} /><InputField label={<span>X<sub>B</sub></span>} /><InputField label={<span>X<sub>C</sub></span>} />
            <InputField label={<span>Y<sub>A</sub></span>} /><InputField label={<span>Y<sub>B</sub></span>} /><InputField label={<span>Y<sub>C</sub></span>} />
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