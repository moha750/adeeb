"use client";

import { useEffect, useRef, useState } from "react";

/**
 * **ساعةُ الخادم كما تُقرأ في المتصفّح.**
 *
 * العدُّ التنازليّ يُحسَب من `started_at` وهو ختمُ الخادم، وساعةُ الجهاز قد تفارق ساعةَ
 * العالم بدقائق — فجولةٌ مدّتها دقيقةٌ تظهر منتهيةً قبل أن تبدأ، أو تُعَدّ إلى ما لا
 * نهاية. (درسُ محاكي الانتخابات ٢٠٢٦-٠٨: «ساعةُ العالم تفارق ساعةَ المتصفّح».)
 *
 * فالفارقُ **يُقاس مرّةً** من ختمِ خادمٍ يصل مع البيانات، ثمّ يُطبَّق على كلّ نبضة.
 * ولا يُعاد قياسُه مع كلّ قراءةٍ ولو وصل ختمٌ أحدث: القياسُ يحمل زمنَ الرحلة، فتذبذبُه
 * يجعل العدَّ يقفز ذهابًا وإيابًا أمام العين. مرّةً واحدةً تكفي.
 *
 * **و`Date.now` والمرجعُ كلاهما داخل المؤقّت** لا في جسم الرسم ولا مباشرةً في الأثر —
 * سابقةُ `useLiveNow` حرفًا بحرف: قراءةُ ساعةٍ أثناء الرسم تجعل الخادمَ والعميلَ
 * يرسمان رقمين مختلفين فيفشل الترطيب، وضبطُ حالةٍ في جسم الأثر يُطلق رسمًا متتاليًا.
 *
 * وتبدأ القيمة بـ0 (قبل التركيب وعلى الخادم)، فيرتدّ الحاسبُ حينها إلى المهلة كاملةً —
 * ربعُ ثانيةٍ لا تُرى، وأسلمُ من رقمٍ يقفز عند الترطيب.
 *
 * @param serverNow ختمُ الخادم كما وصل مع اللقطة (ISO).
 * @param ticking هل ثمّة ما يُعَدّ الآن؟ حين تكون `false` لا مؤقّتَ أصلًا.
 */
export function useServerClock(serverNow: string | null, ticking: boolean): number {
  const offsetRef = useRef<number | null>(null);
  const [now, setNow] = useState(0);

  // القياسُ الأوّلُ وحده، ومهلةُ الصفر تُخرجه من جسم الأثر إلى ما بعد الرسم.
  useEffect(() => {
    if (!serverNow || offsetRef.current !== null) return;
    const stamp = Date.parse(serverNow);
    if (!Number.isFinite(stamp)) return;

    const id = setTimeout(() => {
      const local = Date.now();
      offsetRef.current = stamp - local;
      setNow(local + offsetRef.current);
    }, 0);
    return () => clearTimeout(id);
  }, [serverNow]);

  useEffect(() => {
    if (!ticking) return;
    // ربعُ ثانيةٍ: أنعمُ من أن يُرى الرقمُ يقفز، وأرخصُ من أن يُثقل جوّالًا في قاعة.
    const id = setInterval(() => setNow(Date.now() + (offsetRef.current ?? 0)), 250);
    return () => clearInterval(id);
  }, [ticking]);

  return now;
}

/** «١:٠٥» — دقائقُ ونقطتان وثوانٍ بخانتين. لاتينيّةٌ محضةٌ تُلبَس `dir="ltr"` عند العرض. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
