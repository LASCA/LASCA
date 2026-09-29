import { useEffect, useRef, useState } from 'react';

/**
 * Ζωντανή συνεργασία: κάθε λίγα δευτερόλεπτα λέει στον server «είμαι εδώ, σε αυτό το εργαλείο»
 * και παίρνει πίσω: ποιος άλλος είναι online, το ιστορικό, και τα δεδομένα αν τα άλλαξε κάποιος άλλος.
 *
 *  sync(body)        → Promise με την απάντηση του /sync (web: server, exe: τοπικός server)
 *  getVersion()      → η τελευταία έκδοση που ξέρουμε (την κρατάει το App μαζί με την αποθήκευση)
 *  onRemoteState(state, project) → κάποιος άλλος άλλαξε τα δεδομένα
 *  onProject(project)            → νέα στοιχεία project (π.χ. άλλαξε ο ρόλος μου)
 *  onLostAccess()                → δεν έχω πια πρόσβαση (με αφαίρεσαν / διαγράφηκε)
 */
export default function useProjectLive({
  enabled, sync, tool, client = 'web', getVersion, onRemoteState, onProject, onLostAccess, onStatus,
  interval = 4000,
}) {
  const [presence, setPresence] = useState([]);
  const [activity, setActivity] = useState([]);
  const [online, setOnline] = useState(true);
  const lastActivityRef = useRef(0);
  const cbRef = useRef({});
  cbRef.current = { sync, getVersion, onRemoteState, onProject, onLostAccess, onStatus, tool, client };

  useEffect(() => {
    setPresence([]); setActivity([]); lastActivityRef.current = 0;
    if (!enabled) return undefined;
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
          setActivity((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            return [...res.activity.filter((a) => !seen.has(a.id)), ...prev].slice(0, 60);
          });
        }
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
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, interval]);

  return { presence, activity, online };
}
