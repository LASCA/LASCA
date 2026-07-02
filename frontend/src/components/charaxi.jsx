import React, { useState } from 'react';
import { Target, Navigation, Calculator, Trash2, Map, Maximize, Download, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Charaxi = ({ stakeoutData, setStakeoutData }) => {
  const { station, backsight, points } = stakeoutData;
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setStation = (field, val) => {
    setStakeoutData(prev => ({ ...prev, station: { ...prev.station, [field]: val } }));
  };

  const setBacksight = (field, val) => {
    setStakeoutData(prev => ({ ...prev, backsight: { ...prev.backsight, [field]: val } }));
  };

  const handlePointChange = (index, field, val) => {
    setStakeoutData(prev => {
      const newPoints = [...prev.points];
      newPoints[index] = { ...newPoints[index], [field]: val };
      return { ...prev, points: newPoints };
    });
  };

  const deleteRow = (idx) => {
    setStakeoutData(prev => {
      if (prev.points.length === 1) return prev;
      const newPoints = prev.points.filter((_, i) => i !== idx);
      return { ...prev, points: newPoints };
    });
  };

  const handleCalculate = async () => {
    if (!station.x || !station.y || !backsight.x || !backsight.y) {
      toast.error("Συμπληρώστε πρώτα τα δεδομένα Στάσης και Προσανατολισμού!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/projects/stakeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, backsight, points })
      });
      
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        setStakeoutData(prev => ({
          ...prev,
          azimuthBs: result.azimuth_bs,
          points: result.points,
          plot: result.plot
        }));
        toast.success("Τα στοιχεία χάραξης υπολογίστηκαν επιτυχώς!");
      }
    } catch (err) {
      toast.error("Αποτυχία σύνδεσης με το backend.");
    } finally {
      setLoading(false);
    }
  };

  const addPointRow = () => {
    setStakeoutData(prev => ({
      ...prev,
      points: [...prev.points, { id: Date.now().toString(), name: '', x: '', y: '', hz_stake: '', dist_stake: '' }]
    }));
  };

  const handleDownload = () => {
    if (!stakeoutData.plot) return;
    const link = document.createElement('a');
    link.href = stakeoutData.plot;
    link.download = `Skarifima_Charaxis_${station.name || 'Station'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Το σκαρίφημα κατέβηκε επιτυχώς!");
  };

  const noSpinnersClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-[1920px] mx-auto h-full min-h-0 animate-fade-in relative">
      
      {/* ========================================================= */}
      {/* ΑΡΙΣΤΕΡΟ ΜΕΡΟΣ: ΔΕΔΟΜΕΝΑ & ΠΙΝΑΚΑΣ                        */}
      {/* ========================================================= */}
      <div className="lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
        
        {/* ΣΤΑΣΗ & ΠΡΟΣΑΝΑΤΟΛΙΣΜΟΣ */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          {/* Στάση */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Target size={14} className="text-blue-500" /> Στάση (St)
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">ID</span>
                <input type="text" value={station.name} onChange={(e) => setStation('name', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">X</span>
                <input type="number" value={station.x} onChange={(e) => setStation('x', e.target.value)} className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500 font-mono ${noSpinnersClass}`} placeholder="0.000" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">Y</span>
                <input type="number" value={station.y} onChange={(e) => setStation('y', e.target.value)} className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500 font-mono ${noSpinnersClass}`} placeholder="0.000" />
              </div>
            </div>
          </div>

          {/* Προσανατολισμός */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Navigation size={14} className="text-amber-500" /> Προσαν/σμος (Bs)
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">ID</span>
                <input type="text" value={backsight.name} onChange={(e) => setBacksight('name', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">X</span>
                <input type="number" value={backsight.x} onChange={(e) => setBacksight('x', e.target.value)} className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500 font-mono ${noSpinnersClass}`} placeholder="0.000" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-8">Y</span>
                <input type="number" value={backsight.y} onChange={(e) => setBacksight('y', e.target.value)} className={`w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500 font-mono ${noSpinnersClass}`} placeholder="0.000" />
              </div>
            </div>
          </div>
        </div>

        {/* ΠΙΝΑΚΑΣ & ΚΟΥΜΠΙ ΕΚΤΕΛΕΣΗΣ */}
        <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl min-h-0">
          <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0 flex-wrap gap-2 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Σημεία προς Χάραξη</span>
              <button
                onClick={addPointRow}
                className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-3 py-1 rounded transition-colors"
              >
                + Προσθήκη Σημείου
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-1.5 rounded transition-all shadow-[0_0_15px_rgba(37,99,235,0.15)] disabled:opacity-50"
              >
                <Calculator size={14} />
                {loading ? "Υπολογισμός..." : "Εκτέλεση"}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 transition-colors">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-slate-950 z-10 shadow-md">
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] tracking-wider font-mono">
                  <th className="p-2 w-12 text-center">#</th>
                  <th className="p-2 w-3/12">Σημείο</th>
                  <th className="p-2 w-2/12">X [m]</th>
                  <th className="p-2 w-2/12 border-r border-slate-800">Y [m]</th>
                  <th className="p-2 w-2.5/12 text-blue-400 bg-blue-500/5 text-center font-bold">Hz [g]</th>
                  <th className="p-2 w-2.5/12 text-emerald-400 bg-emerald-500/5 text-center font-bold">Dist [m]</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {points.map((pt, idx) => (
                  <tr key={pt.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-1.5 text-center text-slate-600 font-mono">{idx + 1}</td>
                    <td className="p-1.5">
                      <input type="text" value={pt.name} onChange={(e) => handlePointChange(idx, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none placeholder:text-slate-700" placeholder={`P${idx+1}`}/>
                    </td>
                    <td className="p-1.5">
                      <input type="number" value={pt.x} onChange={(e) => handlePointChange(idx, 'x', e.target.value)} className={`w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none font-mono ${noSpinnersClass}`} placeholder="0.000" />
                    </td>
                    <td className="p-1.5 border-r border-slate-800/50">
                      <input type="number" value={pt.y} onChange={(e) => handlePointChange(idx, 'y', e.target.value)} className={`w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none font-mono ${noSpinnersClass}`} placeholder="0.000" />
                    </td>
                    
                    <td className="p-1.5 bg-blue-500/5 text-blue-400 font-mono font-bold text-center border-r border-slate-800/20 text-xs">
                      {typeof pt.hz_stake === 'number' ? pt.hz_stake.toFixed(4) : pt.hz_stake || '-'}
                    </td>
                    <td className="p-1.5 bg-emerald-500/5 text-emerald-400 font-mono font-bold text-center text-xs">
                      {typeof pt.dist_stake === 'number' ? pt.dist_stake.toFixed(3) : pt.dist_stake || '-'}
                    </td>
                    
                    <td className="p-1.5 text-center relative">
                      <button onClick={() => deleteRow(idx)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ΔΕΞΙ ΜΕΡΟΣ: ΧΩΡΟΣ ΠΛΟΤΑΡΙΣΜΑΤΟΣ ΣΤΥΛ ΟΜΟΙΟΜΟΡΦΟ           */}
      {/* ========================================================= */}
      <div className="lg:col-span-2 flex flex-col h-full min-h-[300px] lg:min-h-0">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl shadow-lg flex flex-col flex-1 overflow-hidden">
          
          {/* Header Πλοτ */}
          <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Map size={14} className="text-emerald-500" /> Γραφική Απεικόνιση
            </div>
            
            {stakeoutData.plot && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsFullscreen(true)}
                  className="text-slate-400 hover:text-blue-400 transition-colors bg-slate-900 p-1.5 rounded border border-slate-700 hover:border-blue-500/50"
                  title="Πλήρης Οθόνη"
                >
                  <Maximize size={14} />
                </button>
                <button 
                  onClick={handleDownload}
                  className="text-slate-400 hover:text-emerald-400 transition-colors bg-slate-900 p-1.5 rounded border border-slate-700 hover:border-emerald-500/50" 
                  title="Λήψη Σκαριφήματος"
                >
                  <Download size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Κυρίως Χώρος Πλοτ */}
          <div className="flex-1 relative w-full h-full flex items-center justify-center p-4 bg-slate-950/20 overflow-hidden">
            {stakeoutData.plot ? (
              <img 
                src={stakeoutData.plot} 
                alt="Διάγραμμα Χάραξης" 
                className="relative z-10 w-full h-full object-contain animate-fade-in drop-shadow-2xl"
              />
            ) : (
              <div className="text-center space-y-3 z-10 p-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 max-w-[280px]">
                <div className="w-12 h-12 rounded-full border border-slate-700 mx-auto flex items-center justify-center text-slate-500 bg-slate-800/50">
                  <Map size={20} />
                </div>
                <div>
                  <p className="text-slate-300 font-bold text-xs">Διάγραμμα Χάραξης</p>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Εισάγετε δεδομένα και πατήστε "Εκτέλεση" για να παραχθεί το σκαρίφημα.
                  </p>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/50 z-10">
              System: EGSA'87
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* FULLSCREEN MODAL ΓΙΑ ΤΟ ΔΙΑΓΡΑΜΜΑ                         */}
      {/* ========================================================= */}
      {isFullscreen && stakeoutData.plot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-semibold shadow-lg"
            >
              <Download size={16} /> Λήψη Σκαριφήματος
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
          <div className="w-full h-full flex items-center justify-center p-12">
            <img
              src={stakeoutData.plot}
              alt="Διάγραμμα Χάραξης Fullscreen"
              className="max-w-full max-h-full object-contain drop-shadow-2xl select-none"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Charaxi;