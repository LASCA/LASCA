import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeActivity } from './collabApi';

/**
 * Ζωντανή συνεργασία: κάθε λίγα δευτερόλεπτα λέει στον server «είμαι εδώ, σε αυτό το εργαλείο»
 * και παίρνει πίσω: ποιος άλλος είναι online, το ιστορικό, πόσες αλλαγές δεν έχω δει ακόμα,
 * και τα δεδομένα αν τα άλλαξε κάποιος άλλος.
 *
 *  sync(body)        → Promise με την απάντηση του /sync (web: server, exe: τοπικός server)
 *  markSeen(lastId)  → «τα είδα» (μηδενίζει τον μετρητή νέων αλλαγών, σε όλες τις συσκευές)
 *  getVersion()      → η τελευταία έκδοση που ξέρουμε (την κρατάει το App μαζί με την αποθήκευση)
 *  onRemoteState(state, project) → κάποιος άλλος άλλαξε τα δεδομένα
 *  onProject(project)            → νέα στοιχεία project (π.χ. άλλαξε ο ρόλος μου)
 *  onLostAccess()                → δεν έχω πια πρόσβαση (με αφαίρεσαν / διαγράφηκε)
 */
export default function useProjectLive({
  enabled, sync, markSeen, tool, client = 'web', getVersion, onRemoteState, onProject, onLostAccess, onStatus,
  interval = 4000,
}) {
  const [presence, setPresence] = useState([]);
  const [activity, setActivity] = useState([]);
  const [online, setOnline] = useState(true);
  const [unread, setUnread] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);
  const lastActivityRef = useRef(0);
  const cbRef = useRef({});
  useEffect(() => {
    cbRef.current = { sync, markSeen, getVersion, onRemoteState, onProject, onLostAccess, onStatus, tool, client };
  }, [sync, markSeen, getVersion, onRemoteState, onProject, onLostAccess, onStatus, tool, client]);

  useEffect(() => {
    let resetCancelled = false;
    queueMicrotask(() => {
      if (resetCancelled) return;
      setPresence([]);
      setActivity([]);
      setUnread(0);
      setLastSeen(0);
    });
    lastActivityRef.current = 0;
    if (!enabled) return () => { resetCancelled = true; };
    let stopped = false;
    let timer = null;

    const tick = async () => {
      const cb = cbRef.current;
      if (document.visibilityState === 'hidden') { schedule(); return; }
      try {
        const res = await cb.sync({
          since_version: cb.getVersion?.() ?? 0,
          since_activity: lastActivityRef.current,
          tool: cb.tool,
          client: cb.client,
        });
        if (stopped) return;
        setOnline(res?.offline ? false : true);
        cb.onStatus?.(res);
        if (res?.project) cb.onProject?.(res.project);
        if (Array.isArray(res?.presence)) setPresence(res.presence);
        if (Array.isArray(res?.activity) && res.activity.length) {
          setActivity((prev) => mergeActivity(res.activity, prev));
        }
        if (typeof res?.unread === 'number') setUnread(res.unread);
        if (typeof res?.last_seen === 'number') setLastSeen((v) => Math.max(v, res.last_seen));
        if (typeof res?.last_activity === 'number') lastActivityRef.current = res.last_activity;
        if (res?.state) cb.onRemoteState?.(res.state, res.project);
      } catch (error) {
        if (stopped) return;
        const code = error?.response?.data?.code;
        if (error?.response?.status === 404 && code === 'no_access') {
          cb.onLostAccess?.();
          return;
        }
        setOnline(false);
      }
      schedule();
    };
    const schedule = () => { if (!stopped) timer = setTimeout(tick, interval); };
    tick();
    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      resetCancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, interval]);

  // Ο χρήστης άνοιξε το ιστορικό: ό,τι υπάρχει ως τώρα μετράει ως «διαβασμένο».
  const markAllSeen = useCallback(() => {
    const last = lastActivityRef.current;
    if (!last) return;
    setUnread(0);
    setLastSeen((v) => Math.max(v, last));
    Promise.resolve(cbRef.current.markSeen?.(last)).catch(() => {});
  }, []);

  return { presence, activity, online, unread, lastSeen, markAllSeen };
}
