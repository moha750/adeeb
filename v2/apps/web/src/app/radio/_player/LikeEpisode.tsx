"use client";

import { useEffect, useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { createAdeebClient } from "@adeeb/core";

/**
 * إعجابُ الحلقة — **بلا حساب**، والذاكرةُ في متصفّح الزائر.
 *
 * ولمَ لا يُشترَط الحساب؟ لأنّ جمهورَ الإذاعة أكثرُه غيرُ أعضاء، واشتراطُه على
 * زرِّ إعجابٍ يعني صفرَ إعجابات. والثمنُ أنّ الرقمَ **تقريبيّ**: من مسح متصفّحَه
 * أعجب ثانيةً. وهو مقبولٌ لرقمٍ يُسترشَد به.
 *
 * والعددُ يأتي **من القاعدة بعد التغيير** لا من حسابٍ عندنا، فلا يعرض الزرُّ
 * تخمينًا يخالف الحقيقة إن أعجب غيرُك في اللحظة نفسها.
 */
const KEY = "adeeb.radio.liked";

function likedSet(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? "[]")); }
  catch { return new Set(); }
}

export function LikeEpisode({ episodeId, initial }: { episodeId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  // تُقرأ بعد التركيب لا في أوّله: `localStorage` لا وجودَ له على الخادم،
  // ولو قرأناها في الرندر لاختلف ما يُرسَل عمّا يُرسَم فتصرخ الترطيب.
  useEffect(() => { setLiked(likedSet().has(episodeId)); }, [episodeId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const up = !liked;

    // الواجهةُ تسبق الشبكة فلا ينتظر الضاغطُ، وتُردّ إن فشل النداء.
    setLiked(up);
    setCount((c) => Math.max(0, c + (up ? 1 : -1)));

    try {
      const sb = createAdeebClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await sb.rpc("bump_episode_like", { p_episode: episodeId, p_up: up });
      if (error) throw error;
      if (typeof data === "number") setCount(data);

      const set = likedSet();
      if (up) set.add(episodeId); else set.delete(episodeId);
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch {
      setLiked(!up);
      setCount((c) => Math.max(0, c + (up ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="rad-chip" aria-pressed={liked}
      onClick={() => void toggle()}
      aria-label={liked ? "إلغاء الإعجاب" : "أعجبتني الحلقة"}>
      <Heart size={16} weight={liked ? "fill" : "regular"} aria-hidden />
      {count > 0 ? <bdi dir="ltr">{count}</bdi> : "أعجبتني"}
    </button>
  );
}
