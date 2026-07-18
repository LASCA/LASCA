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
      <button onClick={onClear} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all" title="Επαναφορά (Διατήρηση δεδομένων)">
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
              <p className="text-[11px] font-bold text-emerald-500 tracking-widest">{resultLabels[idx]}</p>
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
// COMPONENT ΓΙΑ ΤΑ INPUTS
// ------------------------------------------------------------------
const InputField = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-[11px] text-slate-400 ml-1 font-bold">{label}</label>
    <input 
      type="text" 
      inputMode="decimal"
      value={value !== undefined ? value : ''}
      onChange={onChange}
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

  // ----------------------------------------------------------------
  // 1. STATE & ΣΥΝΑΡΤΗΣΕΙΣ ΓΙΑ ΤΟ 1ο ΘΕΜΕΛΙΩΔΕΣ
  // ----------------------------------------------------------------
  const [prob1Data, setProb1Data] = useState({ xa: '', ya: '', d: '', gab: '' });

  const handleProb1Calculation = async () => {
    if (!prob1Data.xa || !prob1Data.ya || !prob1Data.d || !prob1Data.gab) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }

    setLoadings(prev => ({ ...prev, prob1: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xa: parseFloat(prob1Data.xa),
          ya: parseFloat(prob1Data.ya),
          d: parseFloat(prob1Data.d),
          gab: parseFloat(prob1Data.gab)
        }),
      });

      if (!response.ok) throw new Error('Σφάλμα δικτύου');

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        prob1: [data.xb.toFixed(3), data.yb.toFixed(3)] 
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error('Αποτυχία επικοινωνίας με το server.');
    } finally {
      setLoadings(prev => ({ ...prev, prob1: false }));
    }
  };

  // ----------------------------------------------------------------
  // 2. STATE & ΣΥΝΑΡΤΗΣΕΙΣ ΓΙΑ ΤΟ 2ο ΘΕΜΕΛΙΩΔΕΣ
  // ----------------------------------------------------------------
  const [prob2Data, setProb2Data] = useState({ xa: '', ya: '', xb: '', yb: '' });

  const handleProb2Calculation = async () => {
    if (!prob2Data.xa || !prob2Data.ya || !prob2Data.xb || !prob2Data.yb) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }

    setLoadings(prev => ({ ...prev, prob2: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xa: parseFloat(prob2Data.xa),
          ya: parseFloat(prob2Data.ya),
          xb: parseFloat(prob2Data.xb),
          yb: parseFloat(prob2Data.yb)
        }),
      });

      if (!response.ok) throw new Error('Σφάλμα δικτύου ή ταυτιζόμενα σημεία');

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        prob2: [data.d.toFixed(3), data.gab.toFixed(4)] 
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error('Αποτυχία επικοινωνίας με το server ή λάθος δεδομένα.');
    } finally {
      setLoadings(prev => ({ ...prev, prob2: false }));
    }
  };

  // ----------------------------------------------------------------
  // 3. STATE & ΣΥΝΑΡΤΗΣΕΙΣ ΓΙΑ ΤΟ 3ο ΘΕΜΕΛΙΩΔΕΣ
  // ----------------------------------------------------------------
  const [prob3Data, setProb3Data] = useState({ gprev: '', b: '' });

  const handleProb3Calculation = async () => {
    if (!prob3Data.gprev || !prob3Data.b) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }

    setLoadings(prev => ({ ...prev, prob3: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gprev: parseFloat(prob3Data.gprev),
          b: parseFloat(prob3Data.b)
        }),
      });

      if (!response.ok) throw new Error('Σφάλμα δικτύου');

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        prob3: [data.gnext.toFixed(4)] 
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error('Αποτυχία επικοινωνίας με το server.');
    } finally {
      setLoadings(prev => ({ ...prev, prob3: false }));
    }
  };

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
          resultLabels={[<span>X<sub>B</sub> [m]</span>, <span>Y<sub>B</sub> [m]</span>]}
          onCalculate={handleProb1Calculation}
          onClear={() => clearResult('prob1')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField 
              label={<span>X<sub>A</sub> [m]</span>} 
              value={prob1Data.xa} 
              onChange={(e) => setProb1Data({...prob1Data, xa: e.target.value})} 
            />
            <InputField 
              label={<span>Y<sub>A</sub> [m]</span>} 
              value={prob1Data.ya} 
              onChange={(e) => setProb1Data({...prob1Data, ya: e.target.value})} 
            />
            <InputField 
              label={<span>D<sub>AB</sub> [m]</span>} 
              value={prob1Data.d} 
              onChange={(e) => setProb1Data({...prob1Data, d: e.target.value})} 
            />
            <InputField 
              label={<span>G<sub>A</sub> [grad]</span>} 
              value={prob1Data.gab} 
              onChange={(e) => setProb1Data({...prob1Data, gab: e.target.value})} 
            />
          </div>
        </CalcWidget>

        {/* --- 3. 2ο Θεμελιώδες --- */}
        <CalcWidget 
          title="2ο Θεμελιωδες" 
          icon={<MapPin size={18} />}
          loading={loadings.prob2}
          result={results.prob2}
          resultLabels={[<span>D<sub>AB</sub> [m]</span>, <span>G<sub>AB</sub> [grad]</span>]}
          onCalculate={handleProb2Calculation}
          onClear={() => clearResult('prob2')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField 
              label={<span>X<sub>A</sub> [m]</span>} 
              value={prob2Data.xa}
              onChange={(e) => setProb2Data({...prob2Data, xa: e.target.value})}
            />
            <InputField 
              label={<span>Y<sub>A</sub> [m]</span>} 
              value={prob2Data.ya}
              onChange={(e) => setProb2Data({...prob2Data, ya: e.target.value})}
            />
            <InputField 
              label={<span>X<sub>B</sub> [m]</span>} 
              value={prob2Data.xb}
              onChange={(e) => setProb2Data({...prob2Data, xb: e.target.value})}
            />
            <InputField 
              label={<span>Y<sub>B</sub> [m]</span>} 
              value={prob2Data.yb}
              onChange={(e) => setProb2Data({...prob2Data, yb: e.target.value})}
            />
          </div>
        </CalcWidget>

        {/* --- 4. 3ο Θεμελιώδες --- */}
        <CalcWidget 
          title="3ο Θεμελιωδες" 
          icon={<Calculator size={18} />}
          loading={loadings.prob3}
          result={results.prob3}
          resultLabels={[<span>G<sub>next</sub> [grad]</span>]}
          onCalculate={handleProb3Calculation}
          onClear={() => clearResult('prob3')}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField 
              label={<span>G<sub>prev</sub> [grad]</span>} 
              value={prob3Data.gprev}
              onChange={(e) => setProb3Data({...prob3Data, gprev: e.target.value})}
            />
            <InputField 
              label={<span>Γωνία β [grad]</span>} 
              value={prob3Data.b}
              onChange={(e) => setProb3Data({...prob3Data, b: e.target.value})}
            />
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