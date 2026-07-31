import React, { useState } from 'react';
import { Calculator, MapPin, Target, Navigation, Repeat, Play, RotateCcw, Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ------------------------------------------------------------------
// ΥΠΟ-COMPONENT: Το γενικό "Πλαίσιο" (Card) για κάθε υπολογισμό
// ------------------------------------------------------------------
const CalcWidget = ({ title, icon, children, onCalculate, onClear, result, loading, resultLabels, hideActionArea }) => (
  <div className="bg-[#0b1220] rounded-2xl border border-slate-800/60 p-5 flex flex-col shadow-lg hover:border-slate-700/80 transition-colors duration-300">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
      <div className="flex items-center gap-2 text-indigo-400">
        {icon}
        <h3 className="text-xs font-bold text-slate-200 tracking-wider">{title}</h3>
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
    {!hideActionArea && (
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
    )}
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
    prob1: null, prob2: null, prob3: null, scale: null, intersect: null, resect: null
  });

  const clearResult = (key) => setResults(prev => ({ ...prev, [key]: null }));

  // ----------------------------------------------------------------
  // 0. STATE & ΣΥΝΑΡΤΗΣΕΙΣ ΓΙΑ ΜΕΤΑΤΡΟΠΕΣ ΓΩΝΙΩΝ
  // ----------------------------------------------------------------
  const [angles, setAngles] = useState({ rad: '', grad: '', deg: '' });

  const handleAngleChange = (type, value) => {
    if (value === '') {
      setAngles({ rad: '', grad: '', deg: '' });
      return;
    }

    const normalizedValue = value.replace(',', '.');
    const num = parseFloat(normalizedValue);

    if (isNaN(num)) {
      setAngles(prev => ({ ...prev, [type]: value }));
      return;
    }

    let rad, grad, deg;
    
    if (type === 'rad') {
      rad = value;
      grad = (num * 200 / Math.PI).toFixed(4);
      deg = (num * 180 / Math.PI).toFixed(4);
    } else if (type === 'grad') {
      grad = value;
      rad = (num * Math.PI / 200).toFixed(6);
      deg = (num * 180 / 200).toFixed(4);
    } else if (type === 'deg') {
      deg = value;
      rad = (num * Math.PI / 180).toFixed(6);
      grad = (num * 200 / 180).toFixed(4);
    }

    setAngles({ rad, grad, deg });
  };

  // ----------------------------------------------------------------
  // 1. 1ο ΘΕΜΕΛΙΩΔΕΣ
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
  // 2. 2ο ΘΕΜΕΛΙΩΔΕΣ
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
  // 3. 3ο ΘΕΜΕΛΙΩΔΕΣ (ΠΟΛΛΑΠΛΕΣ ΓΩΝΙΕΣ ΘΛΑΣΗΣ)
  // ----------------------------------------------------------------
  const [prob3Data, setProb3Data] = useState({ gprev: '', b_angles: [''] });

  const handleProb3Calculation = async () => {
    const validAngles = prob3Data.b_angles.filter(b => b && b.trim() !== '');

    if (!prob3Data.gprev || validAngles.length === 0) {
      toast.error('Παρακαλώ συμπληρώστε την G_prev και τουλάχιστον μία γωνία θλάσης!');
      return;
    }

    setLoadings(prev => ({ ...prev, prob3: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gprev: parseFloat(prob3Data.gprev),
          b_angles: validAngles.map(b => parseFloat(b))
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

  // ----------------------------------------------------------------
  // 4. ΣΥΝΤΕΛΕΣΤΗΣ ΚΛΙΜΑΚΑΣ
  // ----------------------------------------------------------------
  const [scaleData, setScaleData] = useState({ input1: '' });

  const handleScaleCalculation = async () => {
    if (!scaleData.input1) {
      toast.error('Παρακαλώ συμπληρώστε το πεδίο!');
      return;
    }

    setLoadings(prev => ({ ...prev, scale: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input1: parseFloat(scaleData.input1)
        }),
      });

      if (!response.ok) throw new Error('Σφάλμα δικτύου');

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        scale: [data.k.toFixed(6)]
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error('Αποτυχία επικοινωνίας με το server.');
    } finally {
      setLoadings(prev => ({ ...prev, scale: false }));
    }
  };

  // ----------------------------------------------------------------
  // 5. ΕΜΠΡΟΣΘΟΤΟΜΙΑ
  // ----------------------------------------------------------------
  const [intersectData, setIntersectData] = useState({ xa: '', ya: '', xb: '', yb: '', a: '', b: '' });

  const handleIntersectCalculation = async () => {
    if (!intersectData.xa || !intersectData.ya || !intersectData.xb || !intersectData.yb || !intersectData.a || !intersectData.b) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }

    setLoadings(prev => ({ ...prev, intersect: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/intersect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xa: parseFloat(intersectData.xa),
          ya: parseFloat(intersectData.ya),
          xb: parseFloat(intersectData.xb),
          yb: parseFloat(intersectData.yb),
          a: parseFloat(intersectData.a),
          b: parseFloat(intersectData.b)
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Σφάλμα δικτύου');
      }

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        intersect: [data.xm.toFixed(3), data.ym.toFixed(3)] 
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error(error.message || 'Αποτυχία επικοινωνίας με το server.');
    } finally {
      setLoadings(prev => ({ ...prev, intersect: false }));
    }
  };

  // ----------------------------------------------------------------
  // 6. ΟΠΙΣΘΟΤΟΜΙΑ
  // ----------------------------------------------------------------
  const [resectData, setResectData] = useState({ 
    xa: '', ya: '', xb: '', yb: '', xc: '', yc: '', 
    a: '', b: '', c: '', A: '', B: '', C: '' 
  });

  const handleResectCalculation = async () => {
    const { xa, ya, xb, yb, xc, yc, a, b, c, A, B, C } = resectData;
    
    if (!xa || !ya || !xb || !yb || !xc || !yc || !a || !b || !c || !A || !B || !C) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία της Οπισθοτομίας (12 σύνολο)!');
      return;
    }

    setLoadings(prev => ({ ...prev, resect: true }));

    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/resect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xa: parseFloat(xa), ya: parseFloat(ya),
          xb: parseFloat(xb), yb: parseFloat(yb),
          xc: parseFloat(xc), yc: parseFloat(yc),
          a: parseFloat(a), b: parseFloat(b), c: parseFloat(c),
          A: parseFloat(A), B: parseFloat(B), C: parseFloat(C)
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Σφάλμα δικτύου');
      }

      const data = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        resect: [data.xm.toFixed(3), data.ym.toFixed(3)] 
      }));
      toast.success('Επιτυχής υπολογισμός!');
      
    } catch (error) {
      console.error("Σφάλμα:", error);
      toast.error(error.message || 'Αποτυχία επικοινωνίας με το server.');
    } finally {
      setLoadings(prev => ({ ...prev, resect: false }));
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* --- 1. Μετατροπές Γωνιών --- */}
        <CalcWidget 
          title="Μετατροπές Μονάδων Γωνίας" 
          icon={<Repeat size={18} />}
          hideActionArea={true} 
          onClear={() => setAngles({ rad: '', grad: '', deg: '' })}
        >
          <div className="flex flex-col gap-3 h-full justify-center">
            <InputField 
              label="Ακτίνια [rad]" 
              value={angles.rad}
              onChange={(e) => handleAngleChange('rad', e.target.value)}
            />
            <InputField 
              label="Βαθμοί [grad]" 
              value={angles.grad}
              onChange={(e) => handleAngleChange('grad', e.target.value)}
            />
            <InputField 
              label="Μοίρες [deg]" 
              value={angles.deg}
              onChange={(e) => handleAngleChange('deg', e.target.value)}
            />
          </div>
        </CalcWidget>

        {/* --- 2. 1ο Θεμελιώδες --- */}
        <CalcWidget 
          title="1ο Θεμελιώδες" 
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
              label={<span>G<sub>AB</sub> [grad]</span>} 
              value={prob1Data.gab} 
              onChange={(e) => setProb1Data({...prob1Data, gab: e.target.value})} 
            />
          </div>
        </CalcWidget>

        {/* --- 3. 2ο Θεμελιώδες --- */}
        <CalcWidget 
          title="2ο Θεμελιώδες" 
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

        {/* --- 4. 3ο Θεμελιώδες (Πολλαπλές Γωνίες Θλάσης) --- */}
        <CalcWidget 
          title="3ο Θεμελιώδες" 
          icon={<Calculator size={18} />}
          loading={loadings.prob3}
          result={results.prob3}
          resultLabels={[<span>G<sub>τελική</sub> [grad]</span>]}
          onCalculate={handleProb3Calculation}
          onClear={() => { 
            clearResult('prob3'); 
            setProb3Data({ gprev: '', b_angles: [''] }); 
          }}
        >
          <div className="flex flex-col gap-3">
            <InputField 
              label={<span>G<sub>prev</sub> [grad]</span>} 
              value={prob3Data.gprev}
              onChange={(e) => setProb3Data({...prob3Data, gprev: e.target.value})}
            />
            
            <div className="border-t border-slate-800/50 my-1 relative">
              <span className="absolute -top-2 left-2 bg-[#0b1220] px-2 text-[10px] text-slate-500 font-bold tracking-widest">
                Γωνίες Θλάσης
              </span>
            </div>
            
            {prob3Data.b_angles.map((b, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <InputField 
                    label={<span>b&#770;<sub>{index + 1}</sub> [grad]</span>} 
                    value={b}
                    onChange={(e) => {
                      const newAngles = [...prob3Data.b_angles];
                      newAngles[index] = e.target.value;
                      setProb3Data({...prob3Data, b_angles: newAngles});
                    }}
                  />
                </div>
                
                {/* Action Buttons (Minus / Plus) */}
                <div className="flex gap-1 mb-[2px]">
                  {prob3Data.b_angles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newAngles = prob3Data.b_angles.filter((_, i) => i !== index);
                        setProb3Data({...prob3Data, b_angles: newAngles});
                      }}
                      className="h-[34px] w-[34px] flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all hover:scale-105"
                      title="Αφαίρεση"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                  
                  {index === prob3Data.b_angles.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setProb3Data({...prob3Data, b_angles: [...prob3Data.b_angles, '']})}
                      className="h-[34px] w-[34px] flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all hover:scale-105"
                      title="Προσθήκη"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CalcWidget>

        {/* --- 5. Εμπροσθοτομία --- */}
        <CalcWidget 
          title="Εμπροσθοτομία" 
          icon={<Target size={18} />}
          loading={loadings.intersect}
          result={results.intersect}
          resultLabels={[<span>X<sub>E</sub> [m]</span>, <span>Y<sub>E</sub> [m]</span>]}
          onCalculate={handleIntersectCalculation}
          onClear={() => clearResult('intersect')}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex gap-3">
              <InputField 
                label={<span>X<sub>A</sub> [m]</span>} 
                value={intersectData.xa}
                onChange={(e) => setIntersectData({...intersectData, xa: e.target.value})}
              />
              <InputField 
                label={<span>Y<sub>A</sub> [m]</span>} 
                value={intersectData.ya}
                onChange={(e) => setIntersectData({...intersectData, ya: e.target.value})}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <InputField 
                label={<span>X<sub>B</sub> [m]</span>} 
                value={intersectData.xb}
                onChange={(e) => setIntersectData({...intersectData, xb: e.target.value})}
              />
              <InputField 
                label={<span>Y<sub>B</sub> [m]</span>} 
                value={intersectData.yb}
                onChange={(e) => setIntersectData({...intersectData, yb: e.target.value})}
              />
            </div>
            
            <InputField 
              label={<span>a&#770; [grad]</span>} 
              value={intersectData.a} 
              onChange={(e) => setIntersectData({...intersectData, a: e.target.value})} 
            />
            <InputField 
              label={<span>b&#770; [grad]</span>} 
              value={intersectData.b} 
              onChange={(e) => setIntersectData({...intersectData, b: e.target.value})} 
            />
          </div>
        </CalcWidget>

        {/* --- 6. Οπισθοτομία --- */}
        <CalcWidget 
          title="Οπισθοτομία" 
          icon={<Target size={18} className="rotate-180" />}
          loading={loadings.resect}
          result={results.resect}
          resultLabels={[<span>X<sub>O</sub> [m]</span>, <span>Y<sub>O</sub> [m]</span>]}
          onCalculate={handleResectCalculation}
          onClear={() => clearResult('resect')}
        >
          <div className="grid grid-cols-3 gap-2">
            <InputField label={<span>X<sub>A</sub> [m]</span>} value={resectData.xa} onChange={(e) => setResectData({...resectData, xa: e.target.value})} />
            <InputField label={<span>X<sub>B</sub> [m]</span>} value={resectData.xb} onChange={(e) => setResectData({...resectData, xb: e.target.value})} />
            <InputField label={<span>X<sub>C</sub> [m]</span>} value={resectData.xc} onChange={(e) => setResectData({...resectData, xc: e.target.value})} />

            <InputField label={<span>Y<sub>A</sub> [m]</span>} value={resectData.ya} onChange={(e) => setResectData({...resectData, ya: e.target.value})} />
            <InputField label={<span>Y<sub>B</sub> [m]</span>} value={resectData.yb} onChange={(e) => setResectData({...resectData, yb: e.target.value})} />
            <InputField label={<span>Y<sub>C</sub> [m]</span>} value={resectData.yc} onChange={(e) => setResectData({...resectData, yc: e.target.value})} />
                        
            <div className="col-span-3 border-t border-slate-800/50 my-1"></div>
            
            <InputField label={<span>a&#770; [grad]</span>} value={resectData.a} onChange={(e) => setResectData({...resectData, a: e.target.value})} />
            <InputField label={<span>b&#770; [grad]</span>} value={resectData.b} onChange={(e) => setResectData({...resectData, b: e.target.value})} />
            <InputField label={<span>c&#770; [grad]</span>} value={resectData.c} onChange={(e) => setResectData({...resectData, c: e.target.value})} />

            <InputField label={<span>A&#770; [grad]</span>} value={resectData.A} onChange={(e) => setResectData({...resectData, A: e.target.value})} />
            <InputField label={<span>B&#770; [grad]</span>} value={resectData.B} onChange={(e) => setResectData({...resectData, B: e.target.value})} />
            <InputField label={<span>C&#770; [grad]</span>} value={resectData.C} onChange={(e) => setResectData({...resectData, C: e.target.value})} />
          </div>
        </CalcWidget>

        {/* --- 7. Συντελεστής Κλίμακας --- */}
        <CalcWidget 
          title="Συντελεστής Κλίμακας m" 
          icon={<MapPin size={18} />}
          loading={loadings.scale}
          result={results.scale}
          resultLabels={[<span>m<sub>ij</sub></span>]}
          onCalculate={handleScaleCalculation}
          onClear={() => clearResult('scale')}
        >
          <div className="grid grid-cols-1 gap-3">
            <InputField 
              label={<span>Συνιστώσα E [m]</span>} 
              value={scaleData.input1}
              onChange={(e) => setScaleData({...scaleData, input1: e.target.value})}
            />
          </div>
        </CalcWidget>

      </div>
    </div>
  );
};

export default BasicCalculations;