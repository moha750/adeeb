"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEMO_EPISODES, PAGE_EPISODE_ID } from "./data";

const BY = new Map(DEMO_EPISODES.map((e) => [e.id, e]));
const RATES = [1, 1.25, 1.5, 2];

/**
 * زمامُ المعاينة — **الحالُ تعرف أيَّ حلقةٍ تُذاع، ولكلِّ حلقةٍ موضعُها.**
 *
 * وهذا هو العطبُ الذي أسقط الجولةَ الثالثة: كانت الحالُ موضعًا واحدًا بلا هويّة،
 * فيضغط الزائرُ «أسطورة الشغف» فيقول الشريطُ «من أنا فعلًا؟» وينتقل التقدّمُ إلى
 * صفٍّ آخر. فصار لكلّ حلقةٍ موضعُها، وصار كلُّ صفٍّ يقول حالَ حلقتِه هو.
 *
 * وفي الإنتاج يحلّ محلَّه `RadioPlayerProvider` وعنصرُ `<audio>` الحقيقيّ،
 * وهذه محاكاةٌ بمؤقّتٍ لا غير.
 */
export type PlayerApi = ReturnType<typeof usePlayerDemo>;

export function usePlayerDemo() {
  const [ep, setEp] = useState(PAGE_EPISODE_ID);
  const [pos, setPos] = useState<Record<number, number>>({ 1: 195, 2: 0, 3: 0 });
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(1);
  const [firstVisit, setFirstVisit] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spin = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* من طلب حركةً مخفَّضة لا تُرسَم له أربعُ رسماتٍ في الثانية: تلك حركةٌ أيضًا.
     ويُقرأ بـ`useSyncExternalStore` لا بحالةٍ في أثر (سابقةُ `LikeEpisode`):
     `matchMedia` لا وجودَ له على الخادم، ولقطتُه هناك «لا تخفيف». */
  const calm = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const durOf = useCallback((id: number) => BY.get(id)?.seconds ?? 0, []);
  const posOf = useCallback((id: number) => pos[id] ?? 0, [pos]);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  useEffect(() => {
    if (!playing) { stop(); return; }
    const step = calm ? 1 : 0.25;
    timer.current = setInterval(() => {
      setPos((prev) => {
        const d = durOf(ep);
        const next = Math.min(d, (prev[ep] ?? 0) + step * rate);
        if (next >= d) setPlaying(false);
        return { ...prev, [ep]: next };
      });
    }, calm ? 1000 : 250);
    return stop;
  }, [playing, ep, rate, calm, durOf, stop]);

  useEffect(() => () => { if (spin.current) clearTimeout(spin.current); }, []);

  const pause = useCallback(() => {
    if (spin.current) clearTimeout(spin.current);
    setBusy(false); setPlaying(false);
  }, []);

  /* تعثّرُ البدء يُقال ولا يُصمَت عليه: دوّامةٌ حتّى تصل أوّلُ عيّنةٍ صوتيّة. */
  const play = useCallback(() => {
    setFirstVisit(false);
    if (calm) { setPlaying(true); return; }
    setBusy(true);
    if (spin.current) clearTimeout(spin.current);
    spin.current = setTimeout(() => { setBusy(false); setPlaying(true); }, 520);
  }, [calm]);

  const seek = useCallback((id: number, at: number) => {
    setPos((prev) => ({ ...prev, [id]: Math.max(0, Math.min(durOf(id), at)) }));
  }, [durOf]);

  const switchTo = useCallback((id: number, at?: number) => {
    setEp(id);
    if (typeof at === "number") seek(id, at);
  }, [seek]);

  const toggleEpisode = useCallback((id: number) => {
    if (id === ep && (playing || busy)) { pause(); return; }
    switchTo(id); play();
  }, [ep, playing, busy, pause, switchTo, play]);

  const cycleRate = useCallback(() => {
    setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length]);
  }, []);

  const reset = useCallback((first: boolean) => {
    pause();
    setFirstVisit(first);
    setEp(PAGE_EPISODE_ID);
    setPos({ 1: first ? 0 : 195, 2: 0, 3: 0 });
  }, [pause]);

  const anyHeard = DEMO_EPISODES.some((e) => (pos[e.id] ?? 0) > 0);

  return {
    ep, playing, busy, rate, firstVisit,
    durOf, posOf, play, pause, seek, switchTo, toggleEpisode, cycleRate, reset,
    barVisible: (anyHeard || playing || busy) && !firstVisit,
    current: BY.get(ep)!,
  };
}
