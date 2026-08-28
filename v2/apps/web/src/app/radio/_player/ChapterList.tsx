"use client";

import { formatDuration } from "../../dashboard/radio/vocab";
import type { Chapter } from "@/lib/radio/chapters";
import { useRadioPlayer, type Track } from "./PlayerProvider";

/**
 * **محاورُ الحلقة أبوابٌ لا سطور.**
 *
 * كانت قائمةَ مواضيعَ تُقرأ ولا تُفعَل: يقرأ الزائرُ «صراع الاستمراريّة» فلا
 * يجد إليها سبيلًا إلّا أن يسحب الموجةَ يخمّن. وههنا يضغط السطرَ فيقع فيه.
 *
 * والوقتُ يُشتقّ من نصّ `notes` ولا عمودَ له (‏`lib/radio/chapters`)، فلا ترحيلَ
 * ولا حقلَ جديدٌ في اللوحة: المحرّرُ يكتب القائمةَ موقّتةً كما يكتبها لوصف
 * يوتيوب أصلًا، فينالها الموقعُ مجّانًا.
 *
 * **والضغطُ يبدأ ويثب معًا**: إن لم تكن هي العاملةَ بدأت **من المحور نفسِه** لا
 * من أوّلها ثمّ تقفز، فـ`play` تقبل موضعًا (وهو المنفذُ نفسُه الذي يخدم `?t=`
 * وتكملةَ ما سُمع). ولولاه لسُمع أوّلُ الحلقة لحظةً قبل الوثبة.
 *
 * والمحورُ العاملُ يُعلَّم: **آخرُ محورٍ بدأ ولمّا ينتهِ**، فيعرف القارئُ أين هو
 * ممّا يسمع كما تعرفه شارةُ «يُذاع الآن» في الصفوف.
 */
export function ChapterList({
  chapters, track, rest = [],
}: {
  chapters: Chapter[];
  track: Track;
  rest?: Track[];
}) {
  const p = useRadioPlayer();
  const isThis = p.current?.id === track.id;
  const at = isThis ? p.time : -1;
  /* المحورُ الحاليّ: آخرُ ما بدأ قبل الموضع. و`-1` حين لا تُذاع، فلا يُعلَّم شيء. */
  const active = at < 0 ? -1 : chapters.reduce((acc, c, i) => (at >= c.at ? i : acc), -1);

  return (
    <div className="stn-chaps">
      {chapters.map((c, i) => (
        <button key={c.at} type="button"
          className="stn-chap"
          aria-current={i === active ? "true" : undefined}
          aria-label={`المحور ${c.title}، من الدقيقة ${formatDuration(c.at)}`}
          onClick={() => p.play(track, rest, c.at)}>
          <span className="stn-chap-at" dir="ltr">{formatDuration(c.at)}</span>
          <span className="stn-chap-t">{c.title}</span>
        </button>
      ))}
    </div>
  );
}
