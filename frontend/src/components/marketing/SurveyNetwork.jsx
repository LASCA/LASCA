import React, { useEffect, useRef } from 'react';

/**
 * «Ζωντανό» τοπογραφικό δίκτυο για φόντο (αρχική σελίδα, σύνδεση, εγγραφή): σημεία που κινούνται αργά,
 * γραμμές ανάμεσα στα κοντινά, μια όδευση που σχεδιάζεται ξανά και ξανά και σκοπεύσεις προς τον κέρσορα.
 * Σταματάει όταν δεν φαίνεται και όταν ο χρήστης έχει ζητήσει λιγότερη κίνηση.
 */
export default function SurveyNetwork({ className = '', maxPoints = 70, density = 22000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const cv = canvasRef.current;
    const ctx = cv.getContext('2d');
    const host = cv.parentElement;
    let W = 0; let H = 0; let pts = []; let path = []; let pathT = 0; let running = true; let raf = 0;
    const mouse = { x: -999, y: -999 };

    const newPath = () => {
      if (!pts.length) return;
      let cur = pts[Math.floor(Math.random() * pts.length)]; path = [cur]; const used = new Set([cur]);
      for (let k = 0; k < 6; k += 1) {
        let best = null; let bd = 1e9;
        pts.forEach((p) => { if (used.has(p)) return; const d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2; if (d < bd && d > 3000) { bd = d; best = p; } });
        if (!best) break; used.add(best); path.push(best); cur = best;
      }
      pathT = 0;
    };
    const resize = () => {
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(Math.min(maxPoints, (W * H) / density));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, r: Math.random() * 1.4 + 0.8 }));
      newPath();
    };
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        const dx = p.x - mouse.x; const dy = p.y - mouse.y; if (dx * dx + dy * dy < 16000) { p.x += dx * 0.012; p.y += dy * 0.012; }
      });
      for (let a = 0; a < pts.length; a += 1) {
        for (let b = a + 1; b < pts.length; b += 1) {
          const p = pts[a]; const q = pts[b]; const d2 = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
          if (d2 < 17000) { ctx.strokeStyle = `rgba(99,102,241,${(1 - d2 / 17000) * 0.18})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
      }
      pts.forEach((p) => {
        const d2 = (p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2;
        if (d2 < 40000) { ctx.strokeStyle = `rgba(34,211,238,${(1 - d2 / 40000) * 0.35})`; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); }
      });
      ctx.fillStyle = 'rgba(148,163,184,.55)';
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); });
      pathT += 0.006;
      const segs = path.length - 1; const prog = Math.min(pathT, 1) * segs;
      if (segs > 0) {
        const g = ctx.createLinearGradient(path[0].x, path[0].y, path[segs].x, path[segs].y);
        g.addColorStop(0, 'rgba(224,66,74,.9)'); g.addColorStop(1, 'rgba(77,107,239,.9)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.globalAlpha = pathT > 1.6 ? Math.max(0, 1 - (pathT - 1.6) / 0.4) : 1;
        ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
        for (let k = 1; k <= Math.ceil(prog); k += 1) { const a = path[k - 1]; const b = path[k]; const f = Math.min(1, prog - (k - 1)); ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); }
        ctx.stroke();
        for (let k = 0; k <= Math.floor(prog); k += 1) {
          const p = path[k];
          ctx.fillStyle = '#0b1221'; ctx.strokeStyle = 'rgba(165,180,252,.95)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x + 5.5, p.y + 4); ctx.lineTo(p.x - 5.5, p.y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (pathT > 2) newPath();
      }
      raf = requestAnimationFrame(frame);
    };
    const onMove = (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -999; mouse.y = -999; };
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
    resize(); window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver(([e]) => {
      const was = running; running = e.isIntersecting;
      if (running && !was) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    return () => {
      running = false; cancelAnimationFrame(raf); io.disconnect();
      window.removeEventListener('resize', resize); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
    };
  }, [maxPoints, density]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
