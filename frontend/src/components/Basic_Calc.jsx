import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

import { 
  Calculator, MapPin, Target, Navigation, Repeat, 
  Play, RotateCcw, Trash2, Plus, Minus,
  Compass, Crosshair, SlidersHorizontal, FileText
} from 'lucide-react';

import {
  Themeliodes1Icon,
  Themeliodes2Icon,
  Themeliodes3Icon,
  EmprosthotomiaIcon,
  OpisthotomiaIcon,
  SyntelestisKlimakasMIcon,
  ThemeliodiIcon,
  AllilotomiesIcon,
  SyntelestisKlimakasIcon
} from './icons';

import { toast } from 'react-hot-toast';
import InputField from './InputField';

// Helper για μετατροπή SVG element σε Base64 PNG Data URL
const convertSvgToBase64Png = (svgElement) => {
  return new Promise((resolve) => {
    try {
      if (!svgElement) return resolve(null);

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // Υψηλή ανάλυση 2x για το PDF
        const width = (svgElement.clientWidth || 280) * scale;
        const height = (svgElement.clientHeight || 150) * scale;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Σκούρο υπόβαθρο matching με το UI
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (err) => {
        console.warn('SVG to PNG error:', err);
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch (err) {
      console.warn('SVG conversion exception:', err);
      resolve(null);
    }
  });
};

// Helper για την ασφαλή αποθήκευση/κατέβασμα αρχείων PDF
const saveBlobFile = async (blob, defaultFileName) => {
  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('showSaveFilePicker failed, falling back to browser download:', error);
    } else {
      return;
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ------------------------------------------------------------------
// ΥΠΟ-COMPONENT: SVG Διάγραμμα Αλληλοτομιών
// ------------------------------------------------------------------
const IntersectionDiagram = ({ points, title, id }) => {
  if (!points || points.length === 0) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  let rangeX = maxX - minX || 1;
  let rangeY = maxY - minY || 1;
  
  const padX = rangeX * 0.18;
  const padY = rangeY * 0.18;
  minX -= padX; maxX += padX;
  minY -= padY; maxY += padY;
  rangeX = maxX - minX;
  rangeY = maxY - minY;

  const width = 280;
  const height = 150;
  const margin = 20;

  const mapCoord = (x, y) => {
    const cx = margin + ((x - minX) / rangeX) * (width - 2 * margin);
    const cy = height - (margin + ((y - minY) / rangeY) * (height - 2 * margin));
    return { x: cx, y: cy };
  };

  const mappedPoints = points.map(p => ({
    ...p,
    coord: mapCoord(p.x, p.y)
  }));

  const targetPt = mappedPoints.find(p => p.isTarget);
  const basePts = mappedPoints.filter(p => !p.isTarget);

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center shadow-inner">
      <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1">{title}</span>
      <svg id={id} width="100%" height="150" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {basePts.map((pt, idx) => {
          const nextPt = basePts[(idx + 1) % basePts.length];
          if (basePts.length === 2 && idx === 1) return null;
          return (
            <line
              key={`base-${idx}`}
              x1={pt.coord.x} y1={pt.coord.y}
              x2={nextPt.coord.x} y2={nextPt.coord.y}
              stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3"
            />
          );
        })}

        {targetPt && basePts.map((pt, idx) => (
          <line
            key={`ray-${idx}`}
            x1={pt.coord.x} y1={pt.coord.y}
            x2={targetPt.coord.x} y2={targetPt.coord.y}
            stroke="#818cf8" strokeWidth="1.5"
          />
        ))}

        {mappedPoints.map((pt) => (
          <g key={pt.id}>
            <circle
              cx={pt.coord.x} cy={pt.coord.y}
              r={pt.isTarget ? 5 : 4}
              fill={pt.isTarget ? '#10b981' : '#6366f1'}
              stroke="#0f172a" strokeWidth="2"
            />
            <text
              x={pt.coord.x} y={pt.coord.y - 8}
              textAnchor="middle"
              fill={pt.isTarget ? '#34d399' : '#a5b4fc'}
              fontSize="10" fontWeight="bold" fontFamily="monospace"
            >
              {pt.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------
// ΥΠΟ-COMPONENT: High-End Card Widget
// ------------------------------------------------------------------
const CalcWidget = ({ title, icon, children, onCalculate, onClear, onTrash, result, loading, resultLabels, hideActionArea, badge }) => (
  <div className="h-full group relative bg-slate-900/70 backdrop-blur-2xl rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-2xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all duration-300">
    <div>
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
        <div className="flex items-center gap-1">
          {onTrash && (
            <button 
              onClick={onTrash} 
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" 
              title="Καθαρισμός όλων των πεδίων"
            >
              <Trash2 size={14} />
            </button>
          )}
          {onClear && (
            <button 
              onClick={onClear} 
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-all" 
              title="Επαναφορά (Διατήρηση δεδομένων)"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>

    {!hideActionArea && (
      <div className="mt-5 pt-4 border-t border-slate-800/70 flex flex-col gap-3">
        {result ? (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
            {result.map((res, idx) => (
              <div key={idx} className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-center shadow-inner">
                <p className="text-[10px] font-bold text-emerald-400 tracking-wider mb-0.5">{resultLabels[idx]}</p>
                <p className="text-sm font-mono font-semibold text-emerald-300">{res}</p>
              </div>
            ))}
          </div>
        ) : (
          <button 
            onClick={onCalculate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] shadow-lg shadow-indigo-600/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
// ΥΠΟ-COMPONENT: 3D Flip Card Widget για τις Αλληλοτομίες
// ------------------------------------------------------------------
const FlipCalcWidget = ({ 
  title, icon, badge, isFlipped, onFlipBack, children, onCalculate, onTrash, onExportReport, loading, result, resultLabels, diagramPoints, diagramTitle, diagramId 
}) => (
  <div style={{ perspective: '1000px' }} className="w-full h-full">
    <div 
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className="relative w-full h-full"
    >
      <div style={{ backfaceVisibility: 'hidden' }} className="w-full h-full">
        <CalcWidget
          title={title}
          icon={icon}
          badge={badge}
          loading={loading}
          result={null}
          onCalculate={onCalculate}
          onClear={onFlipBack}
          onTrash={onTrash}
        >
          {children}
        </CalcWidget>
      </div>

      <div 
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }} 
        className="absolute inset-0 w-full h-full bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-2xl"
      >
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/70">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {icon}
              </div>
              <h3 className="text-xs font-bold text-slate-100 tracking-wide">{title} — Διάγραμμα</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {isFlipped && onExportReport && (
                <button
                  type="button"
                  onClick={onExportReport}
                  title="Εξαγωγή Report"
                  className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(236,72,153,0.05)] bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] active:scale-95 cursor-pointer"
                >
                  <FileText size={14} className="text-pink-500 group-hover:text-purple-400 transition-colors" />
                </button>
              )}
              {onTrash && (
                <button 
                  onClick={onTrash} 
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer" 
                  title="Καθαρισμός όλων των πεδίων"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button 
                onClick={onFlipBack} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-all cursor-pointer" 
                title="Επαναφορά (Επιστροφή εισαγωγής)"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          <IntersectionDiagram id={diagramId} points={diagramPoints} title={diagramTitle} />
        </div>

        {result && (
          <div className="mt-3 pt-3 border-t border-slate-800/70">
            <div className="grid grid-cols-2 gap-2">
              {result.map((res, idx) => (
                <div key={idx} className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-center shadow-inner">
                  <p className="text-[10px] font-bold text-emerald-400 tracking-wider mb-0.5">{resultLabels[idx]}</p>
                  <p className="text-sm font-mono font-semibold text-emerald-300">{res}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const BasicCalculations = ({ projectInfo }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const [intersectFlipped, setIntersectFlipped] = useState(false);
  const [resectFlipped, setResectFlipped] = useState(false);

  const [loadings, setLoadings] = useState({});
  const [results, setResults] = useState({
    prob1: null, prob2: null, prob3: null, scale: null, scaleSeg: null, intersect: null, resect: null
  });

  const clearResult = (key) => setResults(prev => ({ ...prev, [key]: null }));

  // 0. ΓΩΝΙΕΣ
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

  // 1. 1ο ΘΕΜΕΛΙΩΔΕΣ
  const [prob1Data, setProb1Data] = useState({ xa: '', ya: '', d: '', gab: '' });
  const handleProb1Calculation = async () => {
    if (!prob1Data.xa || !prob1Data.ya || !prob1Data.d || !prob1Data.gab) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, prob1: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/prob1`, {
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
  const handleClearProb1 = () => {
    setProb1Data({ xa: '', ya: '', d: '', gab: '' });
    clearResult('prob1');
  };

  // 2. 2ο ΘΕΜΕΛΙΩΔΕΣ
  const [prob2Data, setProb2Data] = useState({ xa: '', ya: '', xb: '', yb: '' });
  const handleProb2Calculation = async () => {
    if (!prob2Data.xa || !prob2Data.ya || !prob2Data.xb || !prob2Data.yb) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, prob2: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/prob2`, {
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
  const handleClearProb2 = () => {
    setProb2Data({ xa: '', ya: '', xb: '', yb: '' });
    clearResult('prob2');
  };

  // 3. 3ο ΘΕΜΕΛΙΩΔΕΣ
  const [prob3Data, setProb3Data] = useState({ gprev: '', b_angles: [''] });
  const handleProb3Calculation = async () => {
    const validAngles = prob3Data.b_angles.filter(b => b && b.trim() !== '');
    if (!prob3Data.gprev || validAngles.length === 0) { toast.error('Παρακαλώ συμπληρώστε την G_prev και τουλάχιστον μία γωνία!'); return; }
    setLoadings(prev => ({ ...prev, prob3: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/prob3`, {
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
  const handleClearProb3 = () => {
    setProb3Data({ gprev: '', b_angles: [''] });
    clearResult('prob3');
  };

  // 4. ΣΥΝΤΕΛΕΣΤΗΣ ΚΛΙΜΑΚΑΣ (ΣΗΜΕΙΑΚΟΣ)
  const [scaleData, setScaleData] = useState({ input1: '' });
  const handleScaleCalculation = async () => {
    if (!scaleData.input1) { toast.error('Παρακαλώ συμπληρώστε το πεδίο!'); return; }
    setLoadings(prev => ({ ...prev, scale: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/scale`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input1: parseFloat(scaleData.input1) }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        scale: [
          data.m.toFixed(9),
          data.inv_m.toFixed(9),
          data.ppm.toFixed(4)
        ]
      }));
      toast.success('Επιτυχής υπολογισμός!');
    } catch { toast.error('Αποτυχία επικοινωνίας με το server.'); }
    finally { setLoadings(prev => ({ ...prev, scale: false })); }
  };
  const handleClearScale = () => {
    setScaleData({ input1: '' });
    clearResult('scale');
  };

  // 4Β. ΣΥΝΤΕΛΕΣΤΗΣ ΚΛΙΜΑΚΑΣ (ΓΡΑΜΜΙΚΟΣ)
  const [scaleSegData, setScaleSegData] = useState({ Ei: '', Ej: '', L: '' });
  const handleScaleSegCalculation = async () => {
    setLoadings(prev => ({ ...prev, scaleSeg: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/scale_segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scaleSegData)
      });
      if (!response.ok) throw new Error();
      const data = await response.json();

      const out = [
        data.m_ij.toFixed(9),
        data.inv_m_ij.toFixed(9),
        data.ppm.toFixed(4)
      ];
      if (data.dL !== null && data.dL !== undefined) {
        out.push(data.dL.toFixed(4));
        out.push(data.L_corr.toFixed(4));
      }
      setResults(prev => ({ ...prev, scaleSeg: out }));
      toast.success('Ο υπολογισμός ολοκληρώθηκε!');
    } catch {
      toast.error('Αποτυχία επικοινωνίας με τον server.');
    } finally {
      setLoadings(prev => ({ ...prev, scaleSeg: false }));
    }
  };
  const handleClearScaleSeg = () => {
    setScaleSegData({ Ei: '', Ej: '', L: '' });
    clearResult('scaleSeg');
  };

  // 5. ΕΜΠΡΟΣΘΟΤΟΜΙΑ
  const [intersectData, setIntersectData] = useState({ xa: '', ya: '', xb: '', yb: '', a: '', b: '' });
  const handleIntersectCalculation = async () => {
    if (!intersectData.xa || !intersectData.ya || !intersectData.xb || !intersectData.yb || !intersectData.a || !intersectData.b) { toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία!'); return; }
    setLoadings(prev => ({ ...prev, intersect: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/intersect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xa: parseFloat(intersectData.xa), ya: parseFloat(intersectData.ya), xb: parseFloat(intersectData.xb), yb: parseFloat(intersectData.yb), a: parseFloat(intersectData.a), b: parseFloat(intersectData.b) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(prev => ({ ...prev, intersect: [data.xm.toFixed(3), data.ym.toFixed(3)] }));
      if (data.warnings?.length) {
        data.warnings.forEach(w => toast(w, { icon: '⚠️', duration: 7000 }));
      }
      setIntersectFlipped(true);
      toast.success('Επιτυχής υπολογισμός!');
    } catch (err) {
      toast.error(err.message || 'Αποτυχία επικοινωνίας.', { duration: 8000, style: { maxWidth: '520px', whiteSpace: 'pre-line' } });
    }
    finally { setLoadings(prev => ({ ...prev, intersect: false })); }
  };
  const handleClearIntersect = () => {
    setIntersectData({ xa: '', ya: '', xb: '', yb: '', a: '', b: '' });
    clearResult('intersect');
    setIntersectFlipped(false);
  };

  const handleExportIntersectReport = async () => {
    if (!results.intersect) return;
    try {
      const svgEl = document.getElementById('intersect-diagram-svg');
      const plotImage = await convertSvgToBase64Png(svgEl);

      const payload = {
        projectInfo: projectInfo,
        inputData: [
          { pointName: 'A', x: parseFloat(intersectData.xa), y: parseFloat(intersectData.ya), angle: parseFloat(intersectData.a) },
          { pointName: 'B', x: parseFloat(intersectData.xb), y: parseFloat(intersectData.yb), angle: parseFloat(intersectData.b) }
        ],
        resultData: [
          { pointName: 'E', x: parseFloat(results.intersect[0]), y: parseFloat(results.intersect[1]) }
        ],
        plotImage: plotImage
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/intersection/report`, payload, {
        responseType: 'blob'
      });

      const projectName = String(projectInfo?.projectName || projectInfo?.name || '').trim();
      const sanitizedProjectName = projectName ? projectName.replace(/\s+/g, '_').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '') : '';
      const fileName = sanitizedProjectName ? `${sanitizedProjectName}_Forward_Intersection_Report.pdf` : 'Forward_Intersection_Report.pdf';

      await saveBlobFile(response.data, fileName);
    } catch (error) {
      console.error('Σφάλμα κατά την εξαγωγή του Report Εμπροσθοτομίας:', error);
      toast.error('Αποτυχία δημιουργίας PDF Report.');
    }
  };

  // 6. ΟΠΙΣΘΟΤΟΜΙΑ
  const [resectData, setResectData] = useState({ xa: '', ya: '', xb: '', yb: '', xc: '', yc: '', a: '', b: '', c: '' });
  const handleResectCalculation = async () => {
    const { xa, ya, xb, yb, xc, yc, a, b, c } = resectData;
    if (!xa || !ya || !xb || !yb || !xc || !yc || !a || !b || !c) { 
      toast.error('Παρακαλώ συμπληρώστε όλα τα 9 πεδία!'); 
      return; 
    }
    setLoadings(prev => ({ ...prev, resect: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/basic_calc/resect`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          xa: parseFloat(xa), ya: parseFloat(ya), 
          xb: parseFloat(xb), yb: parseFloat(yb), 
          xc: parseFloat(xc), yc: parseFloat(yc), 
          a: parseFloat(a), b: parseFloat(b), c: parseFloat(c) 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setResults(prev => ({ ...prev, resect: [data.xm.toFixed(3), data.ym.toFixed(3)] }));
      if (data.warnings?.length) {
        data.warnings.forEach(w => toast(w, { icon: '⚠️', duration: 7000 }));
      }
      setResectFlipped(true);
      toast.success('Επιτυχής υπολογισμός!');
    } catch (err) { 
      toast.error(err.message || 'Αποτυχία επικοινωνίας.', { duration: 8000, style: { maxWidth: '520px', whiteSpace: 'pre-line' } }); 
    } finally { 
      setLoadings(prev => ({ ...prev, resect: false })); 
    }
  };
  const handleClearResect = () => {
    setResectData({ xa: '', ya: '', xb: '', yb: '', xc: '', yc: '', a: '', b: '', c: '' });
    clearResult('resect');
    setResectFlipped(false);
  };

  const handleExportResectReport = async () => {
    if (!results.resect) return;
    try {
      const svgEl = document.getElementById('resect-diagram-svg');
      const plotImage = await convertSvgToBase64Png(svgEl);

      const payload = {
        projectInfo: projectInfo,
        inputData: [
          { pointName: 'A', x: parseFloat(resectData.xa), y: parseFloat(resectData.ya), angle: parseFloat(resectData.a) },
          { pointName: 'B', x: parseFloat(resectData.xb), y: parseFloat(resectData.yb), angle: parseFloat(resectData.b) },
          { pointName: 'C', x: parseFloat(resectData.xc), y: parseFloat(resectData.yc), angle: parseFloat(resectData.c) }
        ],
        resultData: [
          { pointName: 'O', x: parseFloat(results.resect[0]), y: parseFloat(results.resect[1]) }
        ],
        plotImage: plotImage
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/resection/report`, payload, {
        responseType: 'blob'
      });

      const projectName = String(projectInfo?.projectName || projectInfo?.name || '').trim();
      const sanitizedProjectName = projectName ? projectName.replace(/\s+/g, '_').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '') : '';
      const fileName = sanitizedProjectName ? `${sanitizedProjectName}_Resection_Report.pdf` : 'Resection_Report.pdf';

      await saveBlobFile(response.data, fileName);
    } catch (error) {
      console.error('Σφάλμα κατά την εξαγωγή του Report Οπισθοτομίας:', error);
      toast.error('Αποτυχία δημιουργίας PDF Report.');
    }
  };

  // SLIDES META
  const slidesMeta = [
    { id: 0, title: 'Μετατροπές', sub: 'rad / grad / deg', icon: <Repeat size={16} /> },
    { id: 1, title: 'Θεμελιώδη', sub: '1ο, 2ο & 3ο Προβλήματα', icon: <ThemeliodiIcon size={16} color="currentColor" /> },
    { id: 2, title: 'Αλληλοτομίες', sub: 'Εμπροσθοτομία & Οπισθοτομία', icon: <AllilotomiesIcon size={16} color="currentColor" /> },
    { id: 3, title: 'Συντελεστής Κλίμακας', sub: <>Σημειακός & Γραμμικός m<sub>ij</sub></>, icon: <SyntelestisKlimakasIcon size={16} color="currentColor" /> },
  ];

  const getIntersectDiagramPoints = () => {
    if (!results.intersect) return [];
    return [
      { id: 'A', x: parseFloat(intersectData.xa), y: parseFloat(intersectData.ya) },
      { id: 'B', x: parseFloat(intersectData.xb), y: parseFloat(intersectData.yb) },
      { id: 'E', x: parseFloat(results.intersect[0]), y: parseFloat(results.intersect[1]), isTarget: true }
    ];
  };

  const getResectDiagramPoints = () => {
    if (!results.resect) return [];
    return [
      { id: 'A', x: parseFloat(resectData.xa), y: parseFloat(resectData.ya) },
      { id: 'B', x: parseFloat(resectData.xb), y: parseFloat(resectData.yb) },
      { id: 'C', x: parseFloat(resectData.xc), y: parseFloat(resectData.yc) },
      { id: 'O', x: parseFloat(results.resect[0]), y: parseFloat(results.resect[1]), isTarget: true }
    ];
  };

  return (
    <div className="relative h-full flex flex-col justify-between max-w-7xl mx-auto px-2 overflow-hidden pt-1 pb-3">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* CAROUSEL TRACK */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <div 
          className="flex h-full w-full transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          
          {/* SLIDE 0: ΜΕΤΑΤΡΟΠΕΣ ΓΩΝΙΩΝ */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-xl mx-auto pt-1 pb-16">
              <CalcWidget 
                title="Μετατροπές Μονάδων Γωνίας" 
                badge="Άμεση αυτόματη μετατροπή"
                icon={<Repeat size={20} />}
                hideActionArea={true} 
                onTrash={() => setAngles({ rad: '', grad: '', deg: '' })}
              >
                <div className="flex flex-col gap-4 py-2">
                  <InputField label="Ακτίνια [rad]" value={angles.rad} onChange={(e) => handleAngleChange('rad', e.target.value)} />
                  <InputField label="Βαθμοί [grad]" value={angles.grad} onChange={(e) => handleAngleChange('grad', e.target.value)} />
                  <InputField label="Μοίρες [deg]" value={angles.deg} onChange={(e) => handleAngleChange('deg', e.target.value)} />
                </div>
              </CalcWidget>
            </div>
          </div>

          {/* SLIDE 1: 3 ΘΕΜΕΛΙΩΔΗ */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 pb-16">
              
              {/* 1ο Θεμελιώδες */}
              <CalcWidget 
                title="1ο Θεμελιώδες" 
                badge="Υπολογισμός Συντεταγμένων"
                icon={<Themeliodes1Icon size={18} color="currentColor" />}
                loading={loadings.prob1}
                result={results.prob1}
                resultLabels={[<span>X<sub>B</sub> [m]</span>, <span>Y<sub>B</sub> [m]</span>]}
                onCalculate={handleProb1Calculation}
                onClear={() => clearResult('prob1')}
                onTrash={handleClearProb1}
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
                icon={<Themeliodes2Icon size={18} color="currentColor" />}
                loading={loadings.prob2}
                result={results.prob2}
                resultLabels={[<span>D<sub>AB</sub> [m]</span>, <span>G<sub>AB</sub> [grad]</span>]}
                onCalculate={handleProb2Calculation}
                onClear={() => clearResult('prob2')}
                onTrash={handleClearProb2}
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
                icon={<Themeliodes3Icon size={18} color="currentColor" />}
                loading={loadings.prob3}
                result={results.prob3}
                resultLabels={[<span>G<sub>τελική</sub> [grad]</span>]}
                onCalculate={handleProb3Calculation}
                onClear={() => clearResult('prob3')}
                onTrash={handleClearProb3}
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
                          <button type="button" onClick={() => { const newAngles = prob3Data.b_angles.filter((_, i) => i !== index); setProb3Data({...prob3Data, b_angles: newAngles}); }} className="h-8 w-8 flex items-center justify-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all cursor-pointer">
                            <Minus size={16} />
                          </button>
                        )}
                        {index === prob3Data.b_angles.length - 1 && (
                          <button type="button" onClick={() => setProb3Data({...prob3Data, b_angles: [...prob3Data.b_angles, '']})} className="h-8 w-8 flex items-center justify-center text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all cursor-pointer">
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

          {/* SLIDE 2: ΤΟΜΕΣ (3D FLIP CARDS) */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 pb-16 max-w-5xl mx-auto">
              
              {/* Εμπροσθοτομία */}
              <FlipCalcWidget 
                title="Εμπροσθοτομία" 
                badge="Υπολογισμός Σημείου E"
                icon={<EmprosthotomiaIcon size={18} color="currentColor" />}
                loading={loadings.intersect}
                result={results.intersect}
                resultLabels={[<span>X<sub>E</sub> [m]</span>, <span>Y<sub>E</sub> [m]</span>]}
                isFlipped={intersectFlipped}
                onFlipBack={() => { setIntersectFlipped(false); clearResult('intersect'); }}
                onCalculate={handleIntersectCalculation}
                onTrash={handleClearIntersect}
                onExportReport={handleExportIntersectReport}
                diagramPoints={getIntersectDiagramPoints()}
                diagramTitle="Εμπροσθοτομία A, B → E"
                diagramId="intersect-diagram-svg"
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
              </FlipCalcWidget>

              {/* Οπισθοτομία */}
              <FlipCalcWidget 
                title="Οπισθοτομία" 
                badge="Υπολογισμός Σημείου O"
                icon={<OpisthotomiaIcon size={18} color="currentColor" />}
                loading={loadings.resect}
                result={results.resect}
                resultLabels={[<span>X<sub>O</sub> [m]</span>, <span>Y<sub>O</sub> [m]</span>]}
                isFlipped={resectFlipped}
                onFlipBack={() => { setResectFlipped(false); clearResult('resect'); }}
                onCalculate={handleResectCalculation}
                onTrash={handleClearResect}
                onExportReport={handleExportResectReport}
                diagramPoints={getResectDiagramPoints()}
                diagramTitle="Οπισθοτομία A, B, C → O"
                diagramId="resect-diagram-svg"
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
                </div>
              </FlipCalcWidget>

            </div>
          </div>

          {/* SLIDE 3: ΚΛΙΜΑΚΑ */}
          <div className="w-full h-full flex-shrink-0 px-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto pt-1 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* Σημειακός Συντελεστής */}
              <CalcWidget
                title="Σημειακός Συντελεστής Κλίμακας"
                badge="Για μεμονωμένο σημείο ή αποστάσεις < 2 km"
                icon={<SyntelestisKlimakasMIcon size={20} color="currentColor" />}
                loading={loadings.scale}
                result={results.scale}
                resultLabels={[
                  <span>m</span>,
                  <span>1 / m</span>,
                  <span>ppm</span>
                ]}
                onCalculate={handleScaleCalculation}
                onClear={() => clearResult('scale')}
                onTrash={handleClearScale}
              >
                <div className="flex flex-col gap-4 py-2">
                  <InputField
                    label={<span>Συνιστώσα E [m]</span>}
                    value={scaleData.input1}
                    onChange={(e) => setScaleData({ ...scaleData, input1: e.target.value })}
                  />
                </div>
              </CalcWidget>

              {/* Γραμμικός Συντελεστής */}
              <CalcWidget
                title="Γραμμικός Συντελεστής Κλίμακας"
                badge="Συνδυαστικός τύπος (Simpson) — για αποστάσεις > 2 km"
                icon={<SyntelestisKlimakasMIcon size={20} color="currentColor" />}
                loading={loadings.scaleSeg}
                result={results.scaleSeg}
                resultLabels={[
                  <span>m<sub>ij</sub></span>,
                  <span>1 / m<sub>ij</sub></span>,
                  <span>ppm</span>,
                  <span>ΔL [m]</span>,
                  <span>L<sub>διορθ</sub> [m]</span>
                ]}
                onCalculate={handleScaleSegCalculation}
                onClear={() => clearResult('scaleSeg')}
                onTrash={handleClearScaleSeg}
              >
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 py-2">
                  <InputField
                    label={<span>Συνιστώσα E<sub>i</sub> [m]</span>}
                    value={scaleSegData.Ei}
                    onChange={(e) => setScaleSegData({ ...scaleSegData, Ei: e.target.value })}
                  />
                  <InputField
                    label={<span>Συνιστώσα E<sub>j</sub> [m]</span>}
                    value={scaleSegData.Ej}
                    onChange={(e) => setScaleSegData({ ...scaleSegData, Ej: e.target.value })}
                  />
                  <div className="col-span-2">
                    <InputField
                      label={<span>Μήκος L [m] — προαιρετικό</span>}
                      value={scaleSegData.L}
                      onChange={(e) => setScaleSegData({ ...scaleSegData, L: e.target.value })}
                    />
                  </div>
                </div>
              </CalcWidget>

            </div>
          </div>

        </div>
      </div>

      {/* NAVIGATION DOCK */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-2 mt-2 shadow-2xl flex justify-center max-w-fit mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 scrollbar-none">
          {slidesMeta.map((slide) => {
            const isActive = activeSlide === slide.id;
            return (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(slide.id)}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
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