import React, { useState } from 'react';
import axios from 'axios';
import { 
  Database, Activity, Target, Ruler, Play, Cpu, Info 
} from 'lucide-react';

const Leveling = ({ 
  forwardData = [], 
  setForwardData, 
  backwardData = [], 
  setBackwardData, 
  metrics = {}, 
  setMetrics, 
  projectSettings 
}) => {
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('forward'); // 'forward' ή 'backward'
  
  // Dropout states εναρμονισμένα με το Traverse
  const [klass, setKlass] = useState(metrics.klass || "III (Τριτεύουσα)");
  const [terrain, setTerrain] = useState(metrics.terrain || "Ομαλό");

  React.useEffect(() => {
    if (metrics.klass) setKlass(metrics.klass);
    if (metrics.terrain) setTerrain(metrics.terrain);
  }, [metrics]);

  // Επιλογή ποιου πίνακα επεξεργαζόμαστε
  const currentData = activeTab === 'forward' ? forwardData : backwardData;
  const setCurrentData = activeTab === 'forward' ? setForwardData : setBackwardData;

  // Έλεγχος για το αν έχουν υπολογιστεί αποτελέσματα (ώστε να εμφανιστούν οι 3 τελευταίες στήλες)
  const hasResults = currentData && currentData.some(row => row.dh !== undefined && row.dh !== null && row.dh !== "");

  const handleInputChange = (index, field, value) => {
    const newData = [...currentData];
    newData[index] = { ...newData[index], [field]: value };
    if (setCurrentData) setCurrentData(newData);
  };

  // Πλοήγηση με βελάκια & Enter μέσα στα κελιά
  const handleKeyDown = (e, rowIndex, colName) => {
    // Δυναμικές στήλες ανάλογα με το αν έχουμε αποτελέσματα
    const columns = hasResults 
      ? ['point', 'backsight', 'foresight', 'dh', 'elev_backward', 'elevation']
      : ['point', 'backsight', 'foresight'];
      
    const colIndex = columns.indexOf(colName);
    
    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = rowIndex + 1;
      shouldMove = true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = rowIndex - 1;
      shouldMove = true;
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        nextCol = colIndex - 1;
        shouldMove = true;
      }
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionEnd === e.target.value.length) {
        e.preventDefault();
        nextCol = colIndex + 1;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      if (nextRow >= 0 && nextRow < currentData.length && nextCol >= 0 && nextCol < columns.length) {
        const nextColName = columns[nextCol];
        const nextInput = document.getElementById(`input-leveling-${nextRow}-${nextColName}`);
        if (nextInput) {
          nextInput.focus();
          setTimeout(() => nextInput.select(), 0); 
        }
      }
    }
  };

  const formatVal = (val, decimals = 3) => {
    if (val === "" || val === undefined || val === null) return "";
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toFixed(decimals);
  };

  const handleRunLeveling = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/leveling', {
        forward: forwardData,
        backward: backwardData,
        terrain: terrain,
        klass: klass
      }, {
        headers: {
          'Active-Project': typeof projectSettings === 'string' ? projectSettings : (projectSettings?.name || projectSettings?.id || '')
        }
      });

      if (response.data) {
        if (response.data.forward_results && setForwardData) setForwardData(response.data.forward_results);
        if (response.data.backward_results && setBackwardData) setBackwardData(response.data.backward_results);
        if (setMetrics) {
          setMetrics({
            ...(response.data.metrics || {}),
            klass: klass,
            terrain: terrain
          });
        }
      }
    } catch (error) {
      console.error("Σφάλμα κατά τη χωροστάθμιση:", error);
      alert("Αποτυχία υπολογισμού χωροστάθμισης.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] p-6 gap-6 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }

         select {
           appearance: none;
           background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
           background-repeat: no-repeat;
           background-position: right 0.4rem center;
           background-size: 0.7em;
           color-scheme: dark; 
         }
        `
      }} />

      <div className="flex flex-1 flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        
        {/* ΠΙΝΑΚΑΣ ΔΕΔΟΜΕΝΩΝ ΧΩΡΟΣΤΑΘΜΙΣΗΣ */}
        <div className="flex-none min-h-[480px] flex flex-col bg-[#0b1120] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/50 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-8">
              
              {/* Τίτλος & Tabs */}
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Database size={18} className="text-amber-500" />
                </div>
                <div className="flex bg-[#030712] border border-slate-800/80 p-0.5 rounded-lg">
                  <button
                    onClick={() => setActiveTab('forward')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'forward'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    1. Μετάβαση
                  </button>
                  <button
                    onClick={() => setActiveTab('backward')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'backward'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    2. Επιστροφή
                  </button>
                </div>
              </div>

              {/* Φίλτρα / Dropdowns */}
              <div className="flex items-center gap-5 border-l border-slate-800/60 pl-6">
                <div className="flex flex-col gap-1 group">
                  <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
                    Τάξη
                  </label>
                  <select 
                    value={klass}
                    onChange={(e) => setKlass(e.target.value)}
                    className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-2 pr-6 py-1 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer font-mono hover:border-slate-700"
                  >
                    <option value="II (Δευτερεύουσα)">II (Δευτερεύουσα)</option>
                    <option value="III (Τριτεύουσα)">III (Τριτεύουσα)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 group">
                  <label className="text-[8.5px] font-black text-slate-500 tracking-[0.2em] group-hover:text-amber-500/70 transition-colors">
                    Έδαφος
                  </label>
                  <select 
                    value={terrain}
                    onChange={(e) => setTerrain(e.target.value)}
                    className="bg-slate-950/40 border border-slate-800 text-[10px] text-slate-300 rounded-md px-2 pr-6 py-1 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer font-mono hover:border-slate-700"
                  >
                    <option value="Ομαλό">Ομαλό</option>
                    <option value="Κεκλιμένο">Κεκλιμένο</option>
                    <option value="Ανώμαλο">Ανώμαλο</option> 
                  </select>
                </div>
              </div>
            </div>

            {/* Κουμπί Εκτέλεσης */}
            <button 
              onClick={handleRunLeveling}
              disabled={isLoading}
              title="Υπολογισμός Χωροστάθμισης"
              className={`group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] ${
                isLoading 
                  ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer'
              }`}
            >
              {isLoading ? (
                 <Cpu size={14} className="animate-spin text-emerald-500" />
              ) : (
                 <Play size={14} fill="currentColor" className="text-emerald-500 group-hover:text-cyan-400 transition-colors ml-0.5" />
              )}
            </button>
          </div>

          {/* Πίνακας */}
          <div className="flex-1">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-[#0f172a] sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-800/60">
                  <th className={`p-4 text-[10px] font-black text-slate-500 tracking-widest text-center ${hasResults ? 'w-[5%]' : 'w-[10%]'}`}>#</th>
                  <th className={`p-4 text-[10px] font-black text-slate-400 tracking-widest ${hasResults ? 'w-[15%]' : 'w-[30%]'}`}>Σημείο Σκόπευσης</th>
                  <th className={`p-4 text-[10px] font-black text-blue-500/80 tracking-widest text-center ${hasResults ? 'w-[16%]' : 'w-[30%]'}`}>Οπισθοσκόπευση</th>
                  <th className={`p-4 text-[10px] font-black text-emerald-500/80 tracking-widest text-center ${hasResults ? 'w-[16%]' : 'w-[30%]'}`}>Εμπροσθοσκόπευση</th>
                  
                  {/* Οι 3 στήλες που εμφανίζονται ΜΟΝΟ μετά τον υπολογισμό */}
                  {hasResults && (
                    <>
                      <th className="w-[16%] p-4 text-[10px] font-black text-purple-500/80 tracking-widest text-right">Υψομετρική Διαφορά</th>
                      <th className="w-[16%] p-4 text-[10px] font-black text-rose-400/80 tracking-widest text-right">Υψόμετρα από Επιστροφή</th>
                      <th className="w-[16%] p-4 text-[10px] font-black text-amber-500/80 tracking-widest text-right">Τελικά Υψόμετρα</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 bg-[#070c19]/20">
                {currentData && currentData.length > 0 ? (
                  currentData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-500/[0.02] active:bg-emerald-500/[0.04] transition-all duration-150 group">
                      <td className="p-2 text-center text-[10px] text-slate-600 font-mono font-bold">{idx + 1}</td>
                      <td className="p-2">
                        <input 
                          id={`input-leveling-${idx}-point`}
                          type="text"
                          value={row.point ?? ""}
                          onChange={(e) => handleInputChange(idx, 'point', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'point')}
                          className="bg-transparent w-full font-bold text-slate-400 group-hover:text-emerald-400 text-sm tracking-tight outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-slate-500 rounded px-2 py-2 transition-all"
                          placeholder="Όνομα Σημείου"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-leveling-${idx}-backsight`}
                          type="text"
                          value={row.backsight ?? ""}
                          onChange={(e) => handleInputChange(idx, 'backsight', e.target.value)}
                          onBlur={(e) => handleInputChange(idx, 'backsight', formatVal(e.target.value, 3))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'backsight')}
                          className="bg-transparent w-full font-mono text-blue-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/50 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          id={`input-leveling-${idx}-foresight`}
                          type="text"
                          value={row.foresight ?? ""}
                          onChange={(e) => handleInputChange(idx, 'foresight', e.target.value)}
                          onBlur={(e) => handleInputChange(idx, 'foresight', formatVal(e.target.value, 3))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'foresight')}
                          className="bg-transparent w-full font-mono text-emerald-400 text-center text-sm font-medium outline-none focus:bg-slate-800/80 focus:ring-1 focus:ring-emerald-500/50 rounded px-2 py-2 transition-all"
                          placeholder="-"
                        />
                      </td>

                      {/* Κελιά αποτελεσμάτων (Read-Only) - Εμφανίζονται δυναμικά */}
                      {hasResults && (
                        <>
                          <td className="p-2">
                            <input 
                              id={`input-leveling-${idx}-dh`}
                              type="text"
                              value={formatVal(row.dh, 4)}
                              disabled
                              className="bg-transparent w-full font-mono text-purple-400 text-right tabular-nums text-sm font-medium tracking-wide outline-none cursor-default"
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-leveling-${idx}-elev_backward`}
                              type="text"
                              value={formatVal(row.elev_backward, 3)}
                              disabled
                              className="bg-transparent w-full font-mono text-rose-400 text-right tabular-nums text-sm font-medium tracking-wide outline-none cursor-default"
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              id={`input-leveling-${idx}-elevation`}
                              type="text"
                              value={formatVal(row.elevation, 3)}
                              disabled
                              className="bg-transparent w-full font-mono text-amber-400 text-right tabular-nums text-sm font-bold tracking-wide outline-none cursor-default"
                              placeholder="-"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasResults ? "7" : "4"} className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Info size={30} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Αναμονή Δεδομένων Χωροστάθμισης</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📊 ΓΕΩΔΑΙΤΙΚΟΙ ΕΛΕΓΧΟΙ ΧΩΡΟΣΤΑΘΜΙΣΗΣ (Το κάτω πλαίσιο της εικόνας) */}
        <div className="flex-none bg-[#0b1120] p-5 rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800/50 pb-3">
            <Activity size={16} className="text-cyan-500" />
            <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Έλεγχοι Χωροστάθμισης & Σφάλματα</span>
          </div>
          
          <div className="flex flex-row gap-4 items-stretch">
            {/* Αριστερή Στήλη: Σταθμοί & Μήκος και το Group με το σφάλμα */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <CompactStat label="Σταθμοί (n)" value={metrics.n} icon={<Target size={12}/>} color="text-slate-200" />
                <CompactStat label="Μήκος Όδευσης (L)" value={metrics.totalLength} unit=" km" icon={<Ruler size={12}/>} color="text-slate-200" />
              </div>
              <DetailedGroup 
                title="Υψομετρικός Έλεγχος (ΣΔh)"
                target={metrics.dhTarget} actual={metrics.dhActual} error={metrics.fh} wbi={metrics.fh_mm}
                labels={["ΣΔh (Μετάβαση)", "ΣΔh (Επιστροφή)", "fh (Σφάλμα)", "fh (σε mm)"]}
                errorColor="text-rose-400"
              />
            </div>

            {/* Δεξιά Στήλη: Ανάλυση Ανοχών */}
            <div className="flex-1">
              <ToleranceAnalysisGroup 
                title="Ανάλυση Ανοχών"
                fh={metrics.fh_mm}
                limit={metrics.fh_limit}
                status={metrics.status}
                labels={["Σφάλμα fh (mm)", "Επιτρεπτό Th (mm)", "Κατάσταση Ελέγχου"]}
              />
            </div>
          </div>

          {/* Μέγιστες επιτρεπόμενες τιμές (Κάτω μπάρα) */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
             <div className="grid grid-cols-2 gap-6">
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-slate-500 font-black tracking-tighter uppercase">Μέγιστο Επιτρεπτό Σφάλμα (Th Max)</span>
                 <span className="text-xs font-mono font-bold text-rose-400">{metrics.fh_limit || "---"} mm</span>
               </div>
               <div className="flex flex-col gap-1 border-l border-slate-800/50 px-6">
                 <span className="text-[10px] text-slate-500 font-black tracking-tighter uppercase">Τελικό Υψόμετρο Κλεισίματος</span>
                 <span className="text-xs font-mono font-bold text-emerald-500">{metrics.finalElevation || "---"} m</span>
               </div>
             </div>
          </div>
        </div>

        <div className="h-4 flex-none" />
      </div>
    </div>
  );
};

// --- Sub-Components (Ακριβές Styling της Όδευσης) ---
const CompactStat = ({ label, value, unit, icon, color }) => (
  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50 flex items-center gap-3">
    <div className="text-slate-500">{icon}</div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">{label}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>
        {value !== undefined && value !== null ? value : "0"}{unit || ""}
      </span>
    </div>
  </div>
);

const DetailedGroup = ({ title, target, actual, error, wbi, labels, errorColor = "text-amber-500" }) => (
  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3">
    <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
    
    <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-800/30 pb-3">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 font-bold uppercase">{labels[0]}</span>
        <span className="text-[12px] font-mono text-slate-200">{target || "---"} m</span>
      </div>
      <div className="flex flex-col gap-1 border-l border-slate-800/50">
        <span className="text-[9px] text-slate-500 font-bold uppercase">{labels[1]}</span>
        <span className="text-[12px] font-mono text-slate-200">{actual || "---"} m</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-1">
      <div className="flex justify-between items-center px-2">
        <span className={`text-[9px] ${errorColor}/70 font-bold uppercase`}>{labels[2]}</span>
        <span className={`text-[13px] font-mono font-bold ${errorColor}`}>{error || "---"} m</span>
      </div>
      <div className="flex justify-between items-center px-2 border-l border-slate-800/50">
        <span className={`text-[9px] ${errorColor}/70 font-bold uppercase`}>{labels[3]}</span>
        <span className={`text-[13px] font-mono font-bold ${errorColor}`}>{wbi || "---"} mm</span>
      </div>
    </div>
  </div>
);

const ToleranceAnalysisGroup = ({ title, fh, limit, status, labels }) => {
  const isOk = status === "Εντός Ανοχής" || status === "OK" || status === true;
  
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3 h-full">
      <span className="text-[11px] font-bold text-slate-400 italic border-b border-slate-800 pb-2">{title}</span>
      
      <div className="grid grid-cols-2 gap-4 text-center pb-3 border-b border-slate-800/30">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 font-bold uppercase">{labels[0]}</span>
          <span className="text-[14px] font-mono text-rose-400 font-bold">{fh || "---"} mm</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-slate-800/50">
          <span className="text-[9px] text-slate-500 font-bold uppercase">{labels[1]}</span>
          <span className="text-[14px] font-mono text-slate-200 font-bold">{limit || "---"} mm</span>
        </div>
      </div>

      <div className="flex justify-between items-center px-2 mt-auto pt-4">
        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">{labels[2]}</span>
        {status ? (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className={`text-[12px] font-black uppercase tracking-wider ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOk ? 'Εντός Ανοχής' : 'Εκτός Ανοχής'}
            </span>
          </div>
        ) : (
          <span className="text-[12px] font-mono text-slate-500 font-bold">---</span>
        )}
      </div>
    </div>
  );
};

export default Leveling;