import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Calculator, ChevronLeft, ChevronRight, Clock, Cloud, CodeXml, FileDown, Laptop, Monitor,
  Share2, Upload, Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import LascaLogo from '../components/brand/LascaLogo';
import LicenseDialog from '../components/marketing/LicenseDialog';
import usePageMeta from '../hooks/usePageMeta';
import { SITE } from '../site';
import {
  GoniometriseisIcon, SynorthosiStathmouIcon, TrigonometrikiYpsometriaIcon, GeometrikiChorostathmisiIcon,
  VasikoiYpologismoiIcon, OdefsiIcon, TachymetriaIcon, CharaxiIcon,
} from '../components/icons';
import './landing.css';

// Τα εργαλεία, με το βίντεο από τα demo του README (τα GIF μετατράπηκαν σε WebM/MP4: ~6x μικρότερα και
// πολύ πιο ελαφριά στην αναπαραγωγή από τα GIF).
const TOOLS = [
  { Icon: OdefsiIcon, title: 'Όδευση', text: 'Οριζοντιογραφία (X,Y) και υψομετρία (H), με διαγράμματα σε κλίμακα.', video: 'traverse' },
  { Icon: GeometrikiChorostathmisiIcon, title: 'Γεωμετρική Χωροστάθμηση', text: 'Μετάβαση-επιστροφή, σφάλμα κλεισίματος και υψόμετρα σημείων.', video: 'leveling' },
  { Icon: TrigonometrikiYpsometriaIcon, title: 'Τριγωνομετρική Υψομετρία', text: 'Υψομετρικές διαφορές από ζενίθιες γωνίες και αποστάσεις.', video: 'trig_leveling' },
  { Icon: TachymetriaIcon, title: 'Αποτύπωση', text: 'Συντεταγμένες από μετρήσεις πεδίου και εξαγωγή σημείων σε σχέδιο.', video: 'apotiposi' },
  { Icon: CharaxiIcon, title: 'Χάραξη', text: 'Χάραξη σημείων από συντεταγμένες, με διάγραμμα.', video: 'charaxi' },
  { Icon: SynorthosiStathmouIcon, title: 'Συνόρθωση Σταθμού', text: 'Συνόρθωση παρατηρήσεων σταθμού και ακρίβειες.', video: 'synorthosi_stathmoy' },
  { Icon: GoniometriseisIcon, title: 'Γωνιομετρήσεις', text: 'Μέσοι όροι, αναγωγές και στατιστικοί έλεγχοι.', video: 'gwniometriseis' },
  { Icon: VasikoiYpologismoiIcon, title: 'Βασικοί Υπολογισμοί', text: 'Θεμελιώδη προβλήματα, εμπροσθοτομία, οπισθοτομία, συντελεστής κλίμακας.', video: 'tomes' },
];
const N = TOOLS.length;
// WebM (VP9, το πιο ελαφρύ) όπου υποστηρίζεται, αλλιώς MP4 (π.χ. παλιότερα Safari).
let videoExt = null;
const videoSrc = (name) => {
  if (!videoExt) {
    const v = document.createElement('video');
    videoExt = v.canPlayType?.('video/webm; codecs="vp9"') ? 'webm' : 'mp4';
  }
  return `/landing/${name}.${videoExt}`;
};

const STEPS = [
  { Icon: Upload, title: 'Εισαγωγή', text: 'Πληκτρολόγησε τις μετρήσεις ή φόρτωσε το Excel του πεδίου.' },
  { Icon: Calculator, title: 'Υπολογισμός', text: 'Γωνίες, αποστάσεις, συντεταγμένες και υψόμετρα σε δευτερόλεπτα.' },
  { Icon: BadgeCheck, title: 'Έλεγχος', text: 'Σφάλματα κλεισίματος και όρια ανοχής, με σαφή ένδειξη.' },
  { Icon: FileDown, title: 'Εξαγωγή', text: 'Αναφορά PDF, σχέδιο DXF, Excel, GeoJSON και KML.' },
];

const COORDS = [['Σ1', '412 305.21', '4 497 118.40'], ['Σ2', '412 431.77', '4 497 182.05'], ['Σ3', '412 569.30', '4 497 146.93'], ['Σ4', '412 688.12', '4 497 251.66']];
const EXPORTS = ['Αναφορά PDF', 'Σχέδιο DXF', 'Excel', 'GeoJSON / KML'];

// Σκηνή εργαλείων: πόσο scroll (σε % του ύψους) κρατάει το grid και πόσο κάθε εργαλείο στο carousel.
const HOLD_VH = 40;
const BACK_VH = 30;   // υστέρηση: δεν «τρεμοπαίζει» grid/carousel κοντά στο όριο
const STEP_VH = 34;
const MOBILE_Q = '(max-width:960px), (max-height:640px)';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function HeroTitle() {
  // Λέξη-λέξη (για το animation). Το «σε μια εφαρμογή» με gradient σε κάθε λέξη.
  let i = 0;
  const words = (text, grad) => text.split(' ').map((w) => {
    const k = i;
    i += 1;
    return (
      <React.Fragment key={k}>
        <span className="w"><span className={grad ? 'grad' : undefined} style={{ '--i': k }}>{w}</span></span>{' '}
      </React.Fragment>
    );
  });
  return (
    <h1 className="display" aria-label="Όλοι οι τοπογραφικοί υπολογισμοί, σε μια εφαρμογή">
      {words('Όλοι οι τοπογραφικοί υπολογισμοί,', false)}
      {words('σε μια εφαρμογή', true)}
    </h1>
  );
}

export default function Landing() {
  usePageMeta({ description: SITE.description, path: '/' });
  const { user } = useAuth();
  const primary = user ? { to: '/app', label: 'Άνοιγμα εφαρμογής' } : { to: '/signup', label: 'Ξεκίνα Τώρα!' };

  const rootRef = useRef(null);
  const toolsRef = useRef(null);
  const bodyRef = useRef(null);
  const cardRefs = useRef([]);
  const chipRefs = useRef([]);
  const videoA = useRef(null);
  const videoB = useRef(null);
  const mediaRef = useRef(null);
  const iconRef = useRef(null);
  const stepsRef = useRef(null);

  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_Q).matches);
  const [carousel, setCarousel] = useState(false);
  const [entered, setEntered] = useState(false);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState(0);
  const [litSteps, setLitSteps] = useState(0);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const carouselRef = useRef(false);
  carouselRef.current = carousel;

  /* ---------- Θέσεις για το «πέταγμα» των καρτών στη μπάρα ---------- */
  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body || window.matchMedia(MOBILE_Q).matches) return;
    const rel = (el) => {
      let x = 0; let y = 0; let n = el;
      while (n && n !== body) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };
    cardRefs.current.forEach((c, k) => {
      const chip = chipRefs.current[k];
      if (!c || !chip) return;
      const a = rel(c); const b = rel(chip);
      c.style.setProperty('--tx', `${b.x - a.x}px`);
      c.style.setProperty('--ty', `${b.y - a.y}px`);
      c.style.setProperty('--sx', (b.w / a.w).toFixed(4));
      c.style.setProperty('--sy', (b.h / a.h).toFixed(4));
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_Q);
    const onChange = () => { setMobile(mq.matches); if (mq.matches) setCarousel(false); };
    mq.addEventListener?.('change', onChange);
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(measure);
    measure();
    return () => { mq.removeEventListener?.('change', onChange); window.removeEventListener('resize', onResize); };
  }, [measure]);

  /* ---------- Scroll: μπάρα προόδου, grid/carousel, «Πώς δουλεύει» ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const tools = toolsRef.current;
    let ticking = false;
    const progress = root.querySelector('.progress');
    const update = () => {
      ticking = false;
      const vh = root.clientHeight;
      const max = root.scrollHeight - vh;
      progress.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
      setScrolled(root.scrollTop > 12);

      if (!window.matchMedia(MOBILE_Q).matches) {
        const scrolledIn = root.getBoundingClientRect().top - tools.getBoundingClientRect().top;
        const hold = (HOLD_VH / 100) * vh;
        if (!carouselRef.current && scrolledIn > hold) { measure(); setEntered(true); setCarousel(true); }
        else if (carouselRef.current && scrolledIn < (BACK_VH / 100) * vh) setCarousel(false);
        if (scrolledIn > hold) {
          const pos = Math.max(0, (scrolledIn - hold) / ((STEP_VH / 100) * vh));
          const i = Math.min(N - 1, Math.floor(pos));
          setActive(i);
          chipRefs.current[i]?.style.setProperty('--p', Math.max(0, Math.min(1, pos - i)).toFixed(3));
        }
      }

      const steps = stepsRef.current;
      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (r.height + vh * 0.25)));
        steps.style.setProperty('--p', p.toFixed(3));
        setLitSteps(STEPS.filter((_, k) => p >= k / 3 - 0.02).length);
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    root.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => root.removeEventListener('scroll', onScroll);
  }, [measure]);

  const goTo = useCallback((i) => {
    const k = (i + N) % N;
    const root = rootRef.current;
    if (window.matchMedia(MOBILE_Q).matches) {
      setActive(k);
      mediaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const vh = root.clientHeight;
    const toolsTop = toolsRef.current.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top: toolsTop + (HOLD_VH / 100) * vh + (k + 0.08) * (STEP_VH / 100) * vh + 2, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!carousel) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('input,textarea,dialog')) return;
      if (e.key === 'ArrowRight') goTo(active + 1);
      if (e.key === 'ArrowLeft') goTo(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [carousel, active, goTo]);

  /* ---------- Βίντεο: δύο <video> που εναλλάσσονται (μόνο το ορατό παίζει) ---------- */
  const front = useRef(null);
  useEffect(() => {
    const a = videoA.current; const b = videoB.current;
    if (!a || !b) return undefined;
    if (!front.current) front.current = a;
    const cur = front.current; const next = cur === a ? b : a;
    const box = mediaRef.current;
    const src = videoSrc(TOOLS[active].video);
    if (cur.getAttribute('src') === src && cur.classList.contains('on')) return undefined;
    let done = false;
    box?.classList.add('loading');
    const swap = () => {
      if (done) return;
      done = true;
      box?.classList.remove('loading');
      next.classList.add('on'); cur.classList.remove('on');
      next.play?.()?.catch?.(() => {});
      front.current = next;
      setTimeout(() => { if (!cur.classList.contains('on')) { cur.pause(); cur.removeAttribute('src'); cur.load(); } }, 600);
    };
    next.addEventListener('loadeddata', swap, { once: true });
    next.src = src;
    next.load();
    return () => { next.removeEventListener('loadeddata', swap); };
  }, [active]);

  // Το εικονίδιο του ενεργού εργαλείου «σχεδιάζεται»
  useLayoutEffect(() => {
    iconRef.current?.querySelectorAll('svg *').forEach((el) => {
      try { el.style.setProperty('--len', `${Math.ceil(el.getTotalLength?.() || 80) + 1}`); } catch { /* ignore */ }
    });
  }, [active]);

  /* ---------- Εμφάνιση στο scroll ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    const toolsIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold: 0.1 });
    toolsIo.observe(toolsRef.current);
    return () => { io.disconnect(); toolsIo.disconnect(); };
  }, []);

  /* ---------- Φωτισμός που ακολουθεί το ποντίκι + «μαγνητικά» κουμπιά ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const onMove = (e) => {
      const el = e.target.closest?.('.tool, .collab');
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--x', `${e.clientX - r.left}px`);
        el.style.setProperty('--y', `${e.clientY - r.top}px`);
      }
      const mag = e.target.closest?.('.magnetic');
      if (mag && !reduceMotion()) {
        const r = mag.getBoundingClientRect();
        mag.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      }
    };
    const onOut = (e) => { const mag = e.target.closest?.('.magnetic'); if (mag && !mag.contains(e.relatedTarget)) mag.style.transform = ''; };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerout', onOut);
    return () => { root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerout', onOut); };
  }, []);

  /* ---------- Hero: 3D κλίση, αριθμοί που «κλειδώνουν», ζωντανό δίκτυο στο φόντο ---------- */
  const stageRef = useRef(null);
  const tiltRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const stage = stageRef.current; const tilt = tiltRef.current; const refl = stage.querySelector('.reflect');
    const onMove = (e) => {
      const r = stage.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
      tilt.style.setProperty('--ry', `${(px - 0.5) * 14 - 4}deg`); tilt.style.setProperty('--rx', `${(0.5 - py) * 10 + 2}deg`);
      refl.style.setProperty('--mx', `${px * 100}%`); refl.style.setProperty('--my', `${py * 100}%`);
    };
    const onLeave = () => { tilt.style.removeProperty('--ry'); tilt.style.removeProperty('--rx'); };
    stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', onLeave);

    const timers = [];
    stage.querySelectorAll('[data-num]').forEach((td, k) => {
      const final = td.textContent; let n = 0;
      timers.push(setTimeout(() => {
        const id = setInterval(() => {
          n += 1;
          td.textContent = final.replace(/\d/g, (d, idx) => (n > 14 + idx * 0.6 ? d : Math.floor(Math.random() * 10)));
          if (n > 30) { clearInterval(id); td.textContent = final; }
        }, 32);
        timers.push(id);
      }, 1700 + Math.floor(k / 2) * 220));
    });
    return () => {
      stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave);
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    };
  }, []);

  useEffect(() => {
    if (reduceMotion()) return undefined;
    const cv = canvasRef.current; const ctx = cv.getContext('2d'); const host = cv.parentElement;
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
      const n = Math.round(Math.min(70, (W * H) / 22000));
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
  }, []);

  /* ---------- Ομαδική δουλειά: το «Ιστορικό αλλαγών» της εφαρμογής σε κίνηση ---------- */
  const appRef = useRef(null);
  useEffect(() => {
    const app = appRef.current;
    const q = (s) => app.querySelector(s);
    const canvasEl = q('.app-canvas'); const badge = q('.badge'); const hist = q('.hist'); const panel = q('.panel');
    const cursor = q('.cursor'); const avNew = q('[data-joins]'); const newCount = q('.panel-head span'); const st3 = q('[data-moves]');
    const act1 = q('[data-act="1"]'); const act2 = q('[data-act="2"]'); const lines = [...app.querySelectorAll('[data-act="1"] li')];
    let timers = []; let playing = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const moveCursor = (el, dx = 0.5, dy = 0.6) => {
      const a = app.getBoundingClientRect(); const r = el.getBoundingClientRect();
      cursor.style.left = `${r.left - a.left + r.width * dx}px`; cursor.style.top = `${r.top - a.top + r.height * dy}px`;
    };
    const reset = () => {
      timers.forEach(clearTimeout); timers = [];
      canvasEl.classList.remove('drawn'); panel.classList.remove('open'); hist.classList.remove('unread', 'pressed');
      badge.classList.remove('show', 'bump'); avNew.classList.add('hide'); newCount.classList.remove('show');
      [act1, act2].forEach((x) => x.classList.remove('in')); lines.forEach((l) => l.classList.remove('in'));
      cursor.classList.remove('show', 'click'); cursor.style.left = '62%'; cursor.style.top = '78%';
    };
    const play = () => {
      reset();
      at(200, () => canvasEl.classList.add('drawn'));
      at(2400, () => { st3.classList.remove('moved'); st3.getBBox(); st3.classList.add('moved'); });
      at(2900, () => { badge.textContent = '1'; badge.classList.add('show'); hist.classList.add('unread'); });
      at(3900, () => avNew.classList.remove('hide'));
      at(4400, () => { badge.textContent = '2'; badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); });
      at(5000, () => { cursor.classList.add('show'); moveCursor(hist); });
      at(6200, () => { cursor.classList.add('click'); hist.classList.add('pressed'); });
      at(6400, () => { hist.classList.remove('pressed'); panel.classList.add('open'); newCount.classList.add('show'); badge.classList.remove('show'); hist.classList.remove('unread'); });
      at(6700, () => act2.classList.add('in'));
      at(7000, () => act1.classList.add('in'));
      lines.forEach((l, k) => at(7500 + k * 350, () => l.classList.add('in')));
      at(7600, () => { cursor.classList.remove('click'); moveCursor(act1, 0.8, 0.9); });
      at(13500, () => { panel.classList.remove('open'); cursor.classList.remove('show'); });
      at(14600, play);
    };
    if (reduceMotion()) {
      canvasEl.classList.add('drawn'); panel.classList.add('open'); [act1, act2].forEach((x) => x.classList.add('in')); lines.forEach((l) => l.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !playing) { playing = true; play(); } else if (!e.isIntersecting && playing) { playing = false; reset(); }
    }, { threshold: 0.35 });
    io.observe(app);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  const toolsClass = [seen && 'seen', entered && 'entered', carousel && !mobile && 'carousel'].filter(Boolean).join(' ');
  const cur = TOOLS[active];
  const CurIcon = cur.Icon;

  return (
    <div className="lp" ref={rootRef} id="public-scroll">
      <div className="progress" aria-hidden="true" />

      {/* ======================= ΠΛΟΗΓΗΣΗ ======================= */}
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap">
          <LascaLogo height={28} textClass="text-lg" />
          <nav className="nav-links" aria-label="Κύρια">
            <a href="#tools">Εργαλεία</a>
            <a href="#workflow">Πώς δουλεύει</a>
          </nav>
          <div className="nav-cta">
            {!user && <Link className="btn btn-ghost btn-sm" to="/login">Σύνδεση</Link>}
            <Link className="btn btn-primary btn-sm magnetic" to={primary.to}>{primary.label}</Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ======================= HERO ======================= */}
        <section className="hero">
          <canvas ref={canvasRef} aria-hidden="true" />
          <div className="orb a" /><div className="orb b" /><div className="orb c" />
          <div className="wrap">
            <div className="hero-copy">
              <HeroTitle />
              <p className="lead">Λύσε οδεύσεις, χωροσταθμήσεις, αποτυπώσεις και χαράξεις από τον browser σου, μοιράσου τα projects με την ομάδα σου και εξήγαγε έτοιμες αναφορές.</p>
              <div className="ctas">
                <Link className="btn btn-primary btn-lg magnetic" to={primary.to}>{primary.label} <ArrowRight className="i arrow" aria-hidden="true" /></Link>
                {!user && <Link className="btn btn-ghost btn-lg" to="/login">Έχω ήδη λογαριασμό</Link>}
              </div>
            </div>

            <div className="stage3d" ref={stageRef}>
              <div className="tilt" ref={tiltRef}>
                <div className="window">
                  <div className="window-inner">
                    <div className="chrome"><i /><i /><i /><span className="url">lasca.gr/app</span></div>
                    <video className="shot" autoPlay muted loop playsInline preload="auto"
                      aria-label="Η LASCA σε λειτουργία: όδευση με πίνακα στάσεων και διάγραμμα">
                      <source src="/landing/traverse.webm" type='video/webm; codecs="vp9"' />
                      <source src="/landing/traverse.mp4" type="video/mp4" />
                    </video>
                  </div>
                  <div className="scan" />
                  <div className="reflect" />
                </div>
                <div className="float coords" aria-label="Παράδειγμα αποτελεσμάτων">
                  <h4>Συντεταγμένες</h4>
                  <table>
                    <thead><tr><th>Σ</th><th>X</th><th>Y</th></tr></thead>
                    <tbody>
                      {COORDS.map(([s, x, y], i) => (
                        <tr key={s} className="row" style={{ '--i': i }}><td>{s}</td><td data-num="">{x}</td><td data-num="">{y}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="float export">
                  <h4>Εξαγωγή</h4>
                  <ul>{EXPORTS.map((x, i) => <li key={x} style={{ '--i': i }}><BadgeCheck className="i" aria-hidden="true" />{x}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-hint" aria-hidden="true" />
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((r) => TOOLS.map(({ Icon, title }) => (
              <span key={`${r}-${title}`}><Icon className="i" />{title}<em>/</em></span>
            )))}
          </div>
        </div>

        {/* ======================= ΕΡΓΑΛΕΙΑ: grid → carousel ======================= */}
        <section id="tools" ref={toolsRef} className={toolsClass} aria-labelledby="tools-title"
          style={mobile ? undefined : { '--tools-h': `${100 + HOLD_VH + STEP_VH * N + 10}vh` }}>
          <div className="tools-stage">
            <div className="wrap">
              <div className="tools-head">
                <p className="eyebrow lines">Εργαλεία</p>
                <h2 className="display" id="tools-title">Ό,τι χρειάζεσαι για την εργασία σου</h2>
                <p>Εργαλεία που καλύπτουν τις εργασίες γραφείου μέσα από μία ενιαία ροή.</p>
              </div>
              <div className="tools-body" ref={bodyRef}>
                <ul className="grid-layer">
                  {TOOLS.map(({ Icon, title, text }, i) => (
                    <li key={title} ref={(el) => { cardRefs.current[i] = el; }} className="tool" style={{ '--i': i }}
                      tabIndex={0} role="button" aria-label={title} onClick={() => goTo(i)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } }}
                      onAnimationEnd={i === N - 1 ? () => setEntered(true) : undefined}>
                      <span className="ic"><Icon className="i" /></span><h3>{title}</h3><p>{text}</p>
                    </li>
                  ))}
                </ul>
                <div className="car-layer">
                  <div className="tools-show">
                    <div className="show-info">
                      <div className="anim" key={active}>
                        <div className="show-icon" ref={iconRef}><CurIcon className="i" strokeWidth={1.6} /></div>
                        <p className="show-count"><b>{String(active + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}</p>
                        <h3>{cur.title}</h3>
                        <p className="txt">{cur.text}</p>
                      </div>
                      <div className="show-nav">
                        <button type="button" className="round" onClick={() => goTo(active - 1)} aria-label="Προηγούμενο εργαλείο"><ChevronLeft className="i" /></button>
                        <button type="button" className="round" onClick={() => goTo(active + 1)} aria-label="Επόμενο εργαλείο"><ChevronRight className="i" /></button>
                      </div>
                    </div>
                    <div className="show-media">
                      <div className="window">
                        <div className="window-inner">
                          <div className="chrome"><i /><i /><i /><span className="url">lasca.gr/app · {cur.title}</span></div>
                          <div className="media-box" ref={mediaRef}>
                            <video ref={videoA} muted loop playsInline autoPlay preload="auto" aria-label={`${cur.title}: η LASCA σε λειτουργία`} />
                            <video ref={videoB} muted loop playsInline autoPlay preload="auto" aria-hidden="true" />
                            <span className="media-spin" aria-hidden="true" />
                            <span className="media-tag">{cur.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul className="dock" aria-label="Εργαλεία">
                    {TOOLS.map(({ Icon, title }, i) => (
                      <li key={title} ref={(el) => { chipRefs.current[i] = el; }} className={`chip ${i === active ? 'active' : ''}`}
                        style={{ '--i': i }} tabIndex={0} role="button" aria-label={title} aria-current={i === active ? 'true' : undefined}
                        onClick={() => goTo(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } }}>
                        <span className="ic"><Icon className="i" /></span><h3>{title}</h3><span className="bar" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= ΠΩΣ ΔΟΥΛΕΥΕΙ ======================= */}
        <section className="section" id="workflow">
          <div className="wrap">
            <div className="head">
              <p className="eyebrow lines" data-reveal="">Πώς δουλεύει</p>
              <h2 className="display" data-reveal="" style={{ '--d': '.08s' }}>Από το πεδίο στην αναφορά</h2>
              <p data-reveal="" style={{ '--d': '.16s' }}>Τέσσερα βήματα, χωρίς χαμένα αρχεία και χωρίς λάθη αντιγραφής.</p>
            </div>
            <ol className="steps" ref={stepsRef}>
              <span className="rail" aria-hidden="true"><i /><b /></span>
              {STEPS.map(({ Icon, title, text }, k) => (
                <li key={title} className={`step ${k < litSteps ? 'lit' : ''}`} data-reveal="" style={{ '--d': `${k * 0.1}s` }}>
                  <div className="ic"><Icon className="i" aria-hidden="true" /></div>
                  <p className="n">0{k + 1}</p><h3>{title}</h3><p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ======================= ΣΥΝΕΡΓΑΣΙΑ ======================= */}
        <section className="section" style={{ paddingTop: 40 }}>
          <div className="wrap">
            <div className="collab" data-reveal="scale">
              <div>
                <p className="eyebrow">Ομαδική δουλειά</p>
                <h2 className="display">Ένα project, όλη η ομάδα</h2>
                <p className="txt">Κάλεσε τους συμφοιτητές σου με σύνδεσμο, όρισε ποιος επεξεργάζεται και ποιος μόνο βλέπει, και δες ποιος δουλεύει τώρα. Οι αλλαγές συγχρονίζονται αυτόματα.</p>
                <ul className="points">
                  <li data-reveal="left" style={{ '--d': '.2s' }}><Cloud className="i" aria-hidden="true" />Αποθήκευση στο cloud, από όποιον υπολογιστή κι αν συνδεθείς.</li>
                  <li data-reveal="left" style={{ '--d': '.3s' }}><Users className="i" aria-hidden="true" />Ρόλοι ιδιοκτήτη, επεξεργαστή και αναγνώστη.</li>
                  <li data-reveal="left" style={{ '--d': '.4s' }}><Laptop className="i" aria-hidden="true" />Το πρόγραμμα για Windows συνδέεται στον ίδιο λογαριασμό και δουλεύει και χωρίς internet.</li>
                </ul>
              </div>

              {/* Το πραγματικό «Ιστορικό αλλαγών» της εφαρμογής, σε κίνηση */}
              <div className="window" aria-hidden="true">
                <div className="window-inner">
                  <div className="chrome"><i /><i /><i /><span className="url">lasca.gr/app · Οριζοντιογραφία (X,Y)</span></div>
                  <div className="app" ref={appRef}>
                    <div className="app-bar">
                      <div className="presence">
                        <span className="av on" style={{ background: '#6366f1' }}>ΗΣ</span>
                        <span className="av on hide" data-joins="" style={{ background: '#0ea5e9' }}>ΑΚ</span>
                      </div>
                      <span className="tb hist"><Clock className="i" /><span className="badge">1</span></span>
                      <span className="tb"><Share2 className="i" /></span>
                      <span className="tb chip-proj"><b /><span>Project</span>Campus ΑΠΘ - Όδευση</span>
                      <span className="tb"><span className="av" style={{ margin: 0, width: 22, height: 22, fontSize: 9, border: 0, background: '#334155' }}>ΣΤ</span></span>
                    </div>
                    <div className="app-canvas">
                      <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid meet">
                        <defs><linearGradient id="lpTravGrad" x1="0" x2="1"><stop offset="0" stopColor="#e0424a" /><stop offset=".5" stopColor="#8b5cf6" /><stop offset="1" stopColor="#4d6bef" /></linearGradient></defs>
                        <g stroke="rgb(148 163 184 / .07)"><path d="M0 50H480M0 100H480M0 150H480M0 200H480M0 250H480M60 0V300M120 0V300M180 0V300M240 0V300M300 0V300M360 0V300M420 0V300" /></g>
                        <polyline className="trav" stroke="url(#lpTravGrad)" points="60,240 140,140 230,190 300,90 385,130 420,60" />
                        <g>
                          <circle className="st" cx="60" cy="240" r="6" /><circle className="st" cx="140" cy="140" r="6" /><circle className="st" data-moves="" cx="230" cy="190" r="6" />
                          <circle className="st" cx="300" cy="90" r="6" /><circle className="st" cx="385" cy="130" r="6" /><circle className="st" cx="420" cy="60" r="6" />
                        </g>
                        <text x="48" y="262">Σ1</text><text x="128" y="128">Σ2</text><text x="236" y="210">Σ3</text><text x="288" y="78">Σ4</text><text x="392" y="150">Σ5</text><text x="426" y="52">Σ6</text>
                      </svg>
                    </div>
                    <div className="panel">
                      <div className="panel-head"><p>Ιστορικό αλλαγών</p><span>2 νέες</span></div>
                      <div className="act new" data-act="1">
                        <span className="av" style={{ background: '#6366f1' }}>ΗΣ</span>
                        <div className="body">
                          <p className="t"><b>Ηλίας Σ.</b> άλλαξε: Οριζοντιογραφία (X,Y)<span className="tag">νέο</span></p>
                          <p className="meta">μόλις τώρα</p>
                          <div className="details">
                            <div className="sec">Οριζοντιογραφία (X,Y)<span className="open">Άνοιγμα ›</span></div>
                            <p className="cnt">+1 νέα γραμμή · 1 αλλαγή</p>
                            <ul><li><b className="s-mod">~</b>Σ3 · X: 1030.00 → 1030.55</li><li><b className="s-add">+</b>Σ6</li></ul>
                          </div>
                        </div>
                      </div>
                      <div className="act new" data-act="2">
                        <span className="av" style={{ background: '#0ea5e9' }}>ΑΚ</span>
                        <div className="body">
                          <p className="t"><b>Αλέξανδρος Κ.</b> μπήκε με σύνδεσμο πρόσκλησης<span className="tag">νέο</span></p>
                          <p className="meta">πριν 2 λεπ. · <Monitor className="i" /> πρόγραμμα Windows</p>
                        </div>
                      </div>
                      <div className="act in">
                        <span className="av" style={{ background: '#e0424a' }}>ΣΤ</span>
                        <div className="body">
                          <p className="t"><b>Σάββας Τ.</b> πρόσθεσε Ηλίας Σ. ως επεξεργαστής</p>
                          <p className="meta">πριν 1 ώρ.</p>
                        </div>
                      </div>
                    </div>
                    <svg className="cursor" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#fff" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= ΤΕΛΙΚΟ CTA ======================= */}
        {!user && (
          <section className="final">
            <div className="beams" aria-hidden="true" />
            <div className="wrap">
              <h2 className="display" data-reveal="">Αυτοματοποίησε <span className="grad">τη δουλειά σου</span></h2>
              <p data-reveal="" style={{ '--d': '.1s' }}>Δημιούργησε λογαριασμό και λύσε την πρώτη σου όδευση σε λιγότερο από πέντε λεπτά.</p>
              <Link className="btn btn-primary btn-lg magnetic" to="/signup" data-reveal="scale" style={{ '--d': '.2s' }}>Ξεκίνα Τώρα! <ArrowRight className="i arrow" aria-hidden="true" /></Link>
            </div>
          </section>
        )}
      </main>

      {/* ======================= FOOTER ======================= */}
      <footer>
        <div className="wrap">
          <div className="cols">
            <div><LascaLogo height={28} textClass="text-lg" /></div>
            <nav aria-label="Νομικά"><h4>Νομικά</h4><ul>
              <li><Link to="/privacy">Πολιτική απορρήτου</Link></li><li><Link to="/terms">Όροι χρήσης</Link></li><li><Link to="/cookies">Cookies</Link></li>
              <li><button type="button" onClick={() => setLicenseOpen(true)}>Άδεια χρήσης</button></li>
            </ul></nav>
            <nav aria-label="Σύνδεσμοι"><h4>LASCA</h4><ul>
              <li><Link to="/signup">Δημιουργία λογαριασμού</Link></li><li><Link to="/login">Σύνδεση</Link></li>
              <li><a href={SITE.github} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CodeXml className="i" aria-hidden="true" />Κώδικας στο GitHub<span className="sr-only"> (ανοίγει σε νέα καρτέλα)</span></a></li>
            </ul></nav>
          </div>
          <div className="copy">
            <span>© {new Date().getFullYear()} {SITE.fullName}</span>
            <span>Copyright (c) 2026 LASCA Team · <button type="button" onClick={() => setLicenseOpen(true)}>LASCA Source-Available License</button></span>
          </div>
        </div>
      </footer>
      <LicenseDialog open={licenseOpen} onClose={() => setLicenseOpen(false)} />
    </div>
  );
}
