"use client";

import { useEffect, useRef } from "react";
import { PlayerControls } from "./PlayerControls";
import { ChapterList } from "./ChapterList";
import type { Chapter } from "@/lib/radio/chapters";
import { INLINE_PLAYER, useRadioPlayer, type Track } from "./PlayerProvider";

/**
 * المشغّلُ **داخل صفحة الحلقة** — حيث يقع الفعل.
 *
 * وسببُه أنّ الفعلَ وأثرَه كانا يفترقان: تُضغط «استمع» في صدر الصفحة فتظهر
 * الأدواتُ في أسفل الشاشة بعيدةً عمّا ضُغط. وههنا يجتمعان.
 *
 * ويُخبر المشغّلَ إن كان **في النظر**، فيكفّ الشريطُ الملازم ما دام حاضرًا
 * ويعود إن غاب (تمريرٌ إلى التفريغ أو مغادرةُ الصفحة). فالشريطُ خلَفٌ لا أصل:
 * لا يظهر إلّا حين يغيب أصلُه فعلًا، ولا يزاحم الصفحةَ إلّا حين يلزم.
 */
export function InlinePlayer({ track, rest = [], startAt = 0, chapters = null }: {
  track: Track; rest?: Track[]; startAt?: number;
  /** المحاورُ تسكن اللوحةَ نفسَها: يُقرأ الحاليُّ مضيئًا وأنت تسمع، لا في قسمٍ أسفلَ الصفحة. */
  chapters?: Chapter[] | null;
} ) {
  const { setInlineVisible } = useRadioPlayer();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!INLINE_PLAYER) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.isIntersecting),
      // عتبةٌ صغيرة: يكفي أن يظهر بعضُه ليُعَدّ حاضرًا، فلا يقفز الشريطُ عند حافّة التمرير.
      { threshold: 0.35 },
    );
    io.observe(el);
    // ومغادرةُ الصفحة تُعيد الشريطَ، فالسطحُ الداخليّ لم يعد قائمًا.
    return () => { io.disconnect(); setInlineVisible(false); };
  }, [setInlineVisible]);

  if (!INLINE_PLAYER) return null;

  return (
    <div ref={ref} className="stn-player">
      <PlayerControls compact={false} track={track} rest={rest} startAt={startAt}
        marks={chapters?.map((c) => c.at)} />
      {chapters ? <ChapterList chapters={chapters} track={track} rest={rest} /> : null}
    </div>
  );
}
