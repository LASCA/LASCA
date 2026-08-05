import React, { useState } from 'react';
import { 
  Calculator, MapPin, Target, Navigation, Repeat, 
  Play, RotateCcw, Plus, Minus,
  Compass, Crosshair, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ------------------------------------------------------------------
// ΥΠΟ-COMPONENT: High-End Card Widget
// ------------------------------------------------------------------
const CalcWidget = ({ title, icon, children, onCalculate, onClear, result, loading, resultLabels, hideActionArea, badge }) => (
  <div className="group relative bg-slate-900/70 backdrop-blur-2xl rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-2xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all duration-300">
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">{title}</h3>
            {badge && <span className="text-[10px] text-slate-400 font-medium">{badge}</span>}
          </div>
        </div>
        <button 
          onClick={onClear} 
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-all" 
          title="Επαναφορά (Διατήρηση δεδομένων)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Body Inputs */}
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>

    {/* Footer / Results */}
    {!hideActionArea && (
      <div className="mt-5 pt-4 border-t border-slate-800/70 flex flex-col gap-3">
        {result ? (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
            {result.map((res, idx) => (
              <div key={idx} className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-center shadow-inner">
                <p className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase mb-0.5">{resultLabels[idx]}</p>
                <p className="text-sm font-mono font-semibold text-emerald-300">{res}</p>
              </div>
            ))}
          </div>
        ) : (
          <button 
            onClick={onCalculate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] shadow-lg shadow-indigo-600/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Play size={14} fill="currentColor"/> Υπολογισμός</>
            )}
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
    <label className="text-[11px] text-slate-400 ml-1 font-semibold">{label}</label>
    <input 
      type="text" 
      inputMode="decimal"
      value={value !== undefined ? value : ''}
      onChange={onChange}
      className="bg-slate-950/80 border border-slate-800 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-all w-full font-mono placeholder-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  </div>
);

const BasicCalculations = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  // --- STATES & API CALCULATIONS (100% ΠΛΗΡΕΣ ΚΑΙ ΔΙΑΤΗΡΗΜΕΝΟ) ---
  const [loadings, setLoadings] = useState({});
  const [results, setResults] = useState({
    prob1: null, prob2: null, prob3: null, scale: null, intersect: null, resect: null
  });

  const clearResult = (key) => setResults(prev => ({ ...prev, [key]: null }));

  const [angles, setAngles] = useState({ rad: '', grad: '', deg: '' });
  const handleAngleChange = (type, value) => {
    if (value === '') { setAngles({ rad: '', grad: '', deg: '' }); return; }
    const normalizedValue = value.replace(',', '.');
    const num = parseFloat(normalizedValue);
    if (isNaN(num)) { setAngles(prev => ({ ...prev, [type]: value })); return; }
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

  const [prob1Data, setProb1Data] = useState({ xa: '', ya: '', d: '', gab: '' });
  const handleProb1Calculation = async () => {
    if (!prob1Data.xa || !prob1Data.ya || !prob1Data.d || !prob1Data.gab) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, prob1: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xa: parseFloat(prob1Data.xa), ya: parseFloat(prob1Data.ya), d: parseFloat(prob1Data.d), gab: parseFloat(prob1Data.gab) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setResults(prev => ({ ...prev, prob1: [data.xb.toFixed(3), data.yb.toFixed(3)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch { toast.error('Αποτυχία επικοινωνίας με το server.'); } 
    finally { setLoadings(prev => ({ ...prev, prob1: false })); }
  };

  const [prob2Data, setProb2Data] = useState({ xa: '', ya: '', xb: '', yb: '' });
  const handleProb2Calculation = async () => {
    if (!prob2Data.xa || !prob2Data.ya || !prob2Data.xb || !prob2Data.yb) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, prob2: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xa: parseFloat(prob2Data.xa), ya: parseFloat(prob2Data.ya), xb: parseFloat(prob2Data.xb), yb: parseFloat(prob2Data.yb) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setResults(prev => ({ ...prev, prob2: [data.d.toFixed(3), data.gab.toFixed(4)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch { toast.error('Αποτυχία επικοινωνίας με το server.'); }
    finally { setLoadings(prev => ({ ...prev, prob2: false })); }
  };

  const [prob3Data, setProb3Data] = useState({ gprev: '', b_angles: [''] });
  const handleProb3Calculation = async () => {
    const validAngles = prob3Data.b_angles.filter(b => b && b.trim() !== '');
    if (!prob3Data.gprev || validAngles.length === 0) { toast.error('Παρακαλώ συμπληρώστε την G_prev και τουλάχιστον μία γωνία!'); return; }
    setLoadings(prev => ({ ...prev, prob3: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/prob3', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gprev: parseFloat(prob3Data.gprev), b_angles: validAngles.map(b => parseFloat(b)) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setResults(prev => ({ ...prev, prob3: [data.gnext.toFixed(4)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch { toast.error('Αποτυχία επικοινωνίας με το server.'); }
    finally { setLoadings(prev => ({ ...prev, prob3: false })); }
  };

  const [scaleData, setScaleData] = useState({ input1: '' });
  const handleScaleCalculation = async () => {
    if (!scaleData.input1) { toast.error('Παρακαλώ συμπληρώστε το πεδίο!'); return; }
    setLoadings(prev => ({ ...prev, scale: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/scale', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input1: parseFloat(scaleData.input1) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setResults(prev => ({ ...prev, scale: [data.k.toFixed(6)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch { toast.error('Αποτυχία επικοινωνίας με το server.'); }
    finally { setLoadings(prev => ({ ...prev, scale: false })); }
  };

  const [intersectData, setIntersectData] = useState({ xa: '', ya: '', xb: '', yb: '', a: '', b: '' });
  const handleIntersectCalculation = async () => {
    if (!intersectData.xa || !intersectData.ya || !intersectData.xb || !intersectData.yb || !intersectData.a || !intersectData.b) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, intersect: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/intersect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xa: parseFloat(intersectData.xa), ya: parseFloat(intersectData.ya), xb: parseFloat(intersectData.xb), yb: parseFloat(intersectData.yb), a: parseFloat(intersectData.a), b: parseFloat(intersectData.b) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(prev => ({ ...prev, intersect: [data.xm.toFixed(3), data.ym.toFixed(3)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch (err) { toast.error(err.message || 'Αποτυχία επικοινωνίας.'); }
    finally { setLoadings(prev => ({ ...prev, intersect: false })); }
  };

  const [resectData, setResectData] = useState({ xa: '', ya: '', xb: '', yb: '', xc: '', yc: '', a: '', b: '', c: '', A: '', B: '', C: '' });
  const handleResectCalculation = async () => {
    const { xa, ya, xb, yb, xc, yc, a, b, c, A, B, C } = resectData;
    if (!xa || !ya || !xb || !yb || !xc || !yc || !a || !b || !c || !A || !B || !C) { toast.error('Παρακαλώ συμπληρώστε όλα τα 12 πεδία!'); return; }
    setLoadings(prev => ({ ...prev, resect: true }));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/basic_calc/resect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xa: parseFloat(xa), ya: parseFloat(ya), xb: parseFloat(xb), yb: parseFloat(yb), xc: parseFloat(xc), yc: parseFloat(yc), a: parseFloat(a), b: parseFloat(b), c: parseFloat(c), A: parseFloat(A), B: parseFloat(B), C: parseFloat(C) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(prev => ({ ...prev, resect: [data.xm.toFixed(3), data.ym.toFixed(3)] }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch (err) { toast.error(err.message || 'Αποτυχία επικοινωνίας.'); }
    finally { setLoadings(prev => ({ ...prev, resect: false })); }
  };

  // 4 ΟΡΙΣΜΕΝΕΣ ΚΑΤΗΓΟΡΙΕΣ (SLIDES)
  const slidesMeta = [
    { id: 0, title: 'Μετατροπές', sub: 'rad / grad / deg', icon: <Repeat size={16} /> },
    { id: 1, title: 'Θεμελιώδη', sub: '1ο, 2ο & 3ο Προβλήματα', icon: <Compass size={16} /> },
    { id: 2, title: 'Αλληλοτομίες', sub: 'Εμπροσθοτομία & Οπισθοτομία', icon: <Crosshair size={16} /> },
    { id: 3, title: 'Συντελεστής Κλίμακας', sub: 'Συντελεστής m_ij', icon: <SlidersHorizontal size={16} /> },
  ];

  return (
    // ΑΛΛΑΓΗ: Μειώθηκε το πάνω padding (pt-1) για να ανέβουν όλα ένα κλικ πάνω
    <div className="relative h-full flex flex-col justify-between max-w-7xl mx-auto px-2 overflow-hidden pt-1 pb-3">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ------------------------------------------------------------------ */}
      {/* CAROUSEL TRACK */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <div 
          className="flex h-full w-full transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          
          {/* --- SLIDE 0: ΜΕΤΑΤΡΟΠΕΣ ΓΩΝΙΩΝ --- */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            {/* ΑΛΛΑΓΗ: pt-1 pb-16 για να μην κόβεται στο κάτω μέρος */}
            <div className="max-w-xl mx-auto pt-1 pb-16">
              <CalcWidget 
                title="Μετατροπές Μονάδων Γωνίας" 
                badge="Άμεση αυτόματη μετατροπή"
                icon={<Repeat size={20} />}
                hideActionArea={true} 
                onClear={() => setAngles({ rad: '', grad: '', deg: '' })}
              >
                <div className="flex flex-col gap-4 py-2">
                  <InputField label="Ακτίνια [rad]" value={angles.rad} onChange={(e) => handleAngleChange('rad', e.target.value)} />
                  <InputField label="Βαθμοί [grad]" value={angles.grad} onChange={(e) => handleAngleChange('grad', e.target.value)} />
                  <InputField label="Μοίρες [deg]" value={angles.deg} onChange={(e) => handleAngleChange('deg', e.target.value)} />
                </div>
              </CalcWidget>
            </div>
          </div>

          {/* --- SLIDE 1: 3 ΘΕΜΕΛΙΩΔΗ --- */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            {/* ΑΛΛΑΓΗ: pt-1 pb-16 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 pb-16">
              
              {/* 1ο Θεμελιώδες */}
              <CalcWidget 
                title="1ο Θεμελιώδες" 
                badge="Υπολογισμός Συντεταγμένων"
                icon={<Navigation size={18} />}
                loading={loadings.prob1}
                result={results.prob1}
                resultLabels={[<span>X<sub>B</sub> [m]</span>, <span>Y<sub>B</sub> [m]</span>]}
                onCalculate={handleProb1Calculation}
                onClear={() => clearResult('prob1')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <InputField label={<span>X<sub>A</sub> [m]</span>} value={prob1Data.xa} onChange={(e) => setProb1Data({...prob1Data, xa: e.target.value})} />
                  <InputField label={<span>Y<sub>A</sub> [m]</span>} value={prob1Data.ya} onChange={(e) => setProb1Data({...prob1Data, ya: e.target.value})} />
                  <InputField label={<span>D<sub>AB</sub> [m]</span>} value={prob1Data.d} onChange={(e) => setProb1Data({...prob1Data, d: e.target.value})} />
                  <InputField label={<span>G<sub>AB</sub> [grad]</span>} value={prob1Data.gab} onChange={(e) => setProb1Data({...prob1Data, gab: e.target.value})} />
                </div>
              </CalcWidget>

              {/* 2ο Θεμελιώδες */}
              <CalcWidget 
                title="2ο Θεμελιώδες" 
                badge="Απόσταση & Γωνία Διεύθυνσης"
                icon={<MapPin size={18} />}
                loading={loadings.prob2}
                result={results.prob2}
                resultLabels={[<span>D<sub>AB</sub> [m]</span>, <span>G<sub>AB</sub> [grad]</span>]}
                onCalculate={handleProb2Calculation}
                onClear={() => clearResult('prob2')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <InputField label={<span>X<sub>A</sub> [m]</span>} value={prob2Data.xa} onChange={(e) => setProb2Data({...prob2Data, xa: e.target.value})} />
                  <InputField label={<span>Y<sub>A</sub> [m]</span>} value={prob2Data.ya} onChange={(e) => setProb2Data({...prob2Data, ya: e.target.value})} />
                  <InputField label={<span>X<sub>B</sub> [m]</span>} value={prob2Data.xb} onChange={(e) => setProb2Data({...prob2Data, xb: e.target.value})} />
                  <InputField label={<span>Y<sub>B</sub> [m]</span>} value={prob2Data.yb} onChange={(e) => setProb2Data({...prob2Data, yb: e.target.value})} />
                </div>
              </CalcWidget>

              {/* 3ο Θεμελιώδες */}
              <CalcWidget 
                title="3ο Θεμελιώδες" 
                badge="Πολλαπλές Γωνίες Θλάσης"
                icon={<Calculator size={18} />}
                loading={loadings.prob3}
                result={results.prob3}
                resultLabels={[<span>G<sub>τελική</sub> [grad]</span>]}
                onCalculate={handleProb3Calculation}
                onClear={() => { clearResult('prob3'); setProb3Data({ gprev: '', b_angles: [''] }); }}
              >
                <div className="flex flex-col gap-3">
                  <InputField label={<span>G<sub>prev</sub> [grad]</span>} value={prob3Data.gprev} onChange={(e) => setProb3Data({...prob3Data, gprev: e.target.value})} />
                  <div className="border-t border-slate-800/60 my-1 relative">
                    <span className="absolute -top-2 left-2 bg-[#0b1220] px-2 text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                      Γωνίες Θλάσης
                    </span>
                  </div>
                  {prob3Data.b_angles.map((b, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <InputField label={<span>b&#770;<sub>{index + 1}</sub> [grad]</span>} value={b} onChange={(e) => { const newAngles = [...prob3Data.b_angles]; newAngles[index] = e.target.value; setProb3Data({...prob3Data, b_angles: newAngles}); }} />
                      </div>
                      <div className="flex gap-1 mb-[1px]">
                        {prob3Data.b_angles.length > 1 && (
                          <button type="button" onClick={() => { const newAngles = prob3Data.b_angles.filter((_, i) => i !== index); setProb3Data({...prob3Data, b_angles: newAngles}); }} className="h-8 w-8 flex items-center justify-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all">
                            <Minus size={16} />
                          </button>
                        )}
                        {index === prob3Data.b_angles.length - 1 && (
                          <button type="button" onClick={() => setProb3Data({...prob3Data, b_angles: [...prob3Data.b_angles, '']})} className="h-8 w-8 flex items-center justify-center text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CalcWidget>

            </div>
          </div>

          {/* --- SLIDE 2: ΤΟΜΕΣ --- */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            {/* ΑΛΛΑΓΗ: pt-1 pb-16 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 pb-16 max-w-5xl mx-auto">
              
              {/* Εμπροσθοτομία */}
              <CalcWidget 
                title="Εμπροσθοτομία" 
                badge="Υπολογισμός Σημείου M"
                icon={<Target size={18} />}
                loading={loadings.intersect}
                result={results.intersect}
                resultLabels={[<span>X<sub>E</sub> [m]</span>, <span>Y<sub>E</sub> [m]</span>]}
                onCalculate={handleIntersectCalculation}
                onClear={() => clearResult('intersect')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex gap-3">
                    <InputField label={<span>X<sub>A</sub> [m]</span>} value={intersectData.xa} onChange={(e) => setIntersectData({...intersectData, xa: e.target.value})} />
                    <InputField label={<span>Y<sub>A</sub> [m]</span>} value={intersectData.ya} onChange={(e) => setIntersectData({...intersectData, ya: e.target.value})} />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <InputField label={<span>X<sub>B</sub> [m]</span>} value={intersectData.xb} onChange={(e) => setIntersectData({...intersectData, xb: e.target.value})} />
                    <InputField label={<span>Y<sub>B</sub> [m]</span>} value={intersectData.yb} onChange={(e) => setIntersectData({...intersectData, yb: e.target.value})} />
                  </div>
                  <InputField label={<span>a&#770; [grad]</span>} value={intersectData.a} onChange={(e) => setIntersectData({...intersectData, a: e.target.value})} />
                  <InputField label={<span>b&#770; [grad]</span>} value={intersectData.b} onChange={(e) => setIntersectData({...intersectData, b: e.target.value})} />
                </div>
              </CalcWidget>

              {/* Οπισθοτομία */}
              <CalcWidget 
                title="Οπισθοτομία" 
                badge="Υπολογισμός Σημείου O"
                icon={<Target size={18} className="rotate-180" />}
                loading={loadings.resect}
                result={results.resect}
                resultLabels={[<span>X<sub>O</sub> [m]</span>, <span>Y<sub>O</sub> [m]</span>]}
                onCalculate={handleResectCalculation}
                onClear={() => clearResult('resect')}
              >
                <div className="grid grid-cols-3 gap-2">
                  <InputField label={<span>X<sub>A</sub></span>} value={resectData.xa} onChange={(e) => setResectData({...resectData, xa: e.target.value})} />
                  <InputField label={<span>X<sub>B</sub></span>} value={resectData.xb} onChange={(e) => setResectData({...resectData, xb: e.target.value})} />
                  <InputField label={<span>X<sub>C</sub></span>} value={resectData.xc} onChange={(e) => setResectData({...resectData, xc: e.target.value})} />
                  <InputField label={<span>Y<sub>A</sub></span>} value={resectData.ya} onChange={(e) => setResectData({...resectData, ya: e.target.value})} />
                  <InputField label={<span>Y<sub>B</sub></span>} value={resectData.yb} onChange={(e) => setResectData({...resectData, yb: e.target.value})} />
                  <InputField label={<span>Y<sub>C</sub></span>} value={resectData.yc} onChange={(e) => setResectData({...resectData, yc: e.target.value})} />
                  <div className="col-span-3 border-t border-slate-800/60 my-1"></div>
                  <InputField label={<span>a&#770;</span>} value={resectData.a} onChange={(e) => setResectData({...resectData, a: e.target.value})} />
                  <InputField label={<span>b&#770;</span>} value={resectData.b} onChange={(e) => setResectData({...resectData, b: e.target.value})} />
                  <InputField label={<span>c&#770;</span>} value={resectData.c} onChange={(e) => setResectData({...resectData, c: e.target.value})} />
                  <InputField label={<span>A&#770;</span>} value={resectData.A} onChange={(e) => setResectData({...resectData, A: e.target.value})} />
                  <InputField label={<span>B&#770;</span>} value={resectData.B} onChange={(e) => setResectData({...resectData, B: e.target.value})} />
                  <InputField label={<span>C&#770;</span>} value={resectData.C} onChange={(e) => setResectData({...resectData, C: e.target.value})} />
                </div>
              </CalcWidget>

            </div>
          </div>

          {/* --- SLIDE 3: ΚΛΙΜΑΚΑ --- */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            {/* ΑΛΛΑΓΗ: pt-1 pb-16 */}
            <div className="max-w-xl mx-auto pt-1 pb-16">
              <CalcWidget 
                title="Συντελεστής Κλίμακας m" 
                badge="Υπολογισμός Κλίμακας Προβολής m_ij"
                icon={<SlidersHorizontal size={20} />}
                loading={loadings.scale}
                result={results.scale}
                resultLabels={[<span>m<sub>ij</sub></span>]}
                onCalculate={handleScaleCalculation}
                onClear={() => clearResult('scale')}
              >
                <div className="flex flex-col gap-4 py-2">
                  <InputField 
                    label={<span>Συνιστώσα E [m]</span>} 
                    value={scaleData.input1} 
                    onChange={(e) => setScaleData({...scaleData, input1: e.target.value})} 
                  />
                </div>
              </CalcWidget>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* NAVIGATION DOCK (ΚΑΤΩ & ΚΕΝΤΡΑΡΙΣΜΕΝΟ) */}
      {/* ------------------------------------------------------------------ */}
      {/* ΑΛΛΑΓΗ: mt-2 αντί για mt-4 για να κερδίσουμε χώρο */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-2 mt-2 shadow-2xl flex justify-center max-w-fit mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 scrollbar-none">
          {slidesMeta.map((slide) => {
            const isActive = activeSlide === slide.id;
            return (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(slide.id)}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive 
                    ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/35 border border-indigo-400/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110 group-hover:text-indigo-400'}`}>
                  {slide.icon}
                </div>
                <div className="text-left flex flex-col justify-center">
                  <span className="leading-tight">{slide.title}</span>
                  <div className={`text-[10px] leading-tight transition-all duration-300 overflow-hidden ${
                    isActive 
                      ? 'max-h-4 opacity-100 text-indigo-200 mt-0.5' 
                      : 'max-h-0 opacity-0 group-hover:max-h-4 group-hover:opacity-100 group-hover:mt-0.5 text-slate-500'
                  }`}>
                    {slide.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default BasicCalculations;