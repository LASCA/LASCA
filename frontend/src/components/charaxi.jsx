import React, { useState } from 'react';
import { Target, Navigation, Calculator, Trash2, Map, Maximize } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Charaxi = ({ stakeoutData, setStakeoutData }) => {
  const { station, backsight, points } = stakeoutData;
  const [loading, setLoading] = useState(false);

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

  const noSpinnersClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-[1920px] mx-auto h-full min-h-0 animate-fade-in">
      
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
          <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0 flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Σημεία προς Χάραξη</span>
            
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-1.5 rounded transition-all shadow-[0_0_15px_rgba(37,99,235,0.15)] disabled:opacity-50"
            >
              <Calculator size={14} />
              {loading ? "Υπολογισμός..." : "Εκτέλεση"}
            </button>
          </div>
          
          {/* Μορφοποίηση Custom Scrollbar μέσω Tailwind Variants */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 transition-colors">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-950 z-10 shadow-md">
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] tracking-wider font-mono">
                  <th className="p-2 w-8 text-center">#</th>
                  <th className="p-2">Σημείο</th>
                  <th className="p-2">X [m]</th>
                  <th className="p-2 border-r border-slate-800">Y [m]</th>
                  <th className="p-2 text-blue-400 bg-blue-500/5 text-center">Hz [g]</th>
                  <th className="p-2 text-emerald-400 bg-emerald-500/5 text-center">Dist [m]</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {points.map((pt, idx) => (
                  <tr key={pt.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-1.5 text-center text-slate-600 font-mono">{idx + 1}</td>
                    <td className="p-1.5">
                      <input type="text" value={pt.name} onChange={(e) => handlePointChange(idx, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none" />
                    </td>
                    <td className="p-1.5">
                      <input type="number" value={pt.x} onChange={(e) => handlePointChange(idx, 'x', e.target.value)} className={`w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none font-mono ${noSpinnersClass}`} placeholder="0.000" />
                    </td>
                    <td className="p-1.5 border-r border-slate-800/50">
                      <input type="number" value={pt.y} onChange={(e) => handlePointChange(idx, 'y', e.target.value)} className={`w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-slate-200 outline-none font-mono ${noSpinnersClass}`} placeholder="0.000" />
                    </td>
                    
                    <td className="p-1.5 bg-blue-500/5 text-blue-400 font-mono font-bold text-center border-r border-slate-800/20">
                      {typeof pt.hz_stake === 'number' ? pt.hz_stake.toFixed(4) : pt.hz_stake || '-'}
                    </td>
                    <td className="p-1.5 bg-emerald-500/5 text-emerald-400 font-mono font-bold text-center">
                      {typeof pt.dist_stake === 'number' ? pt.dist_stake.toFixed(3) : pt.dist_stake || '-'}
                    </td>
                    
                    <td className="p-1.5 text-center">
                      <button onClick={() => deleteRow(idx)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
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
      {/* ΔΕΞΙ ΜΕΡΟΣ: ΧΩΡΟΣ ΠΛΟΤΑΡΙΣΜΑΤΟΣ                           */}
      {/* ========================================================= */}
      <div className="lg:col-span-2 bg-[#0b1220] border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl relative h-full min-h-[300px] lg:min-h-0">
        <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-[#0b1220] to-transparent z-10 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-widest">
            <Map size={16} /> Γραφική Απεικόνιση
          </div>
          <button className="text-slate-500 hover:text-white transition-colors bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
            <Maximize size={14} />
          </button>
        </div>

        <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden"
             style={{
               backgroundImage: `
                 linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)
               `,
               backgroundSize: '30px 30px'
             }}>
          
          <div className="absolute w-full h-[1px] bg-blue-500/10 top-1/2 left-0 pointer-events-none"></div>
          <div className="absolute h-full w-[1px] bg-blue-500/10 top-0 left-1/2 pointer-events-none"></div>

          {/* DYNAMIC RENDERING: Αν υπάρχει εικόνα, δείξε την, αλλιώς δείξε το placeholder */}
          {stakeoutData.plot ? (
            <img 
              src={stakeoutData.plot} 
              alt="Διάγραμμα Χάραξης" 
              className="relative z-10 w-full h-full object-contain p-2 animate-fade-in drop-shadow-2xl"
            />
          ) : (
            <div className="text-center space-y-3 z-10 backdrop-blur-md bg-[#0b1220]/60 p-5 rounded-xl border border-slate-800/40 max-w-[280px]">
              <div className="w-12 h-12 rounded-full border border-dashed border-slate-700 mx-auto flex items-center justify-center text-slate-600">
                <Map size={20} />
              </div>
              <div>
                <p className="text-slate-300 font-bold text-xs">Διάγραμμα Χάραξης</p>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Εισάγετε δεδομένα και πατήστε "Εκτέλεση" για να παραχθεί το σκαρίφημα της χάραξης.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-3 right-4 text-[9px] font-mono text-slate-600 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/50 backdrop-blur-sm">
          System: EGSA'87
        </div>
      </div>

    </div>
  );
};

export default Charaxi;