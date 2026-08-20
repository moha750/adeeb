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
    <ol className="rad-chaps">
      {chapters.map((c, i) => (
        <li key={c.at}>
          <button type="button"
            className={"rad-chap" + (i === active ? " is-playing" : "")}
            aria-current={i === active ? "true" : undefined}
            onClick={() => p.play(track, rest, c.at)}>
            <span className="rad-chap-at font-latin"><bdi dir="ltr">{formatDuration(c.at)}</bdi></span>
            <span className="rad-chap-t">{c.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
