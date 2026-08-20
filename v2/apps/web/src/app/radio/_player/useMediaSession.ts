"use client";

import { useEffect, useRef } from "react";
import { SKIP_SECONDS } from "../../dashboard/radio/vocab";
import type { Track } from "./PlayerProvider";

/**
 * **جلسةُ الوسائط — لسانُ المشغّل إلى النظام.**
 *
 * ما يظهر في شاشة قفل الجوّال وفي مركز التحكّم وفي سمّاعةٍ لها أزرار ليس شيئًا
 * يخترعه المتصفّح من الصفحة، بل ما نُمليه عليه هنا. وحين لا نقول شيئًا يخترعه
 * هو: عنوانٌ فارغٌ وأيقونةُ الموقع ممطوطةً غلافًا، وأزرارَ قفزٍ عشرَ ثوانٍ لا
 * خمسَ عشرة. رآها المالك في شاشة قفله يوم ٢٠٢٦-٠٨-١٨، وهذا علاجُها.
 *
 * ══ ولمَ كان الغيابُ يظهر بهذا القبح خاصّةً عندنا ═══════════════════
 *
 * لأنّ الحلقةَ تُذاع بعنصرَي صوتٍ يعملان معًا (الكلامُ والموسيقى)، والنظامُ
 * يجعل «ما يُذاع الآن» آخرَ عنصرٍ بدأ — وهو مسارُ الموسيقى، تابعٌ لا يملك زمنًا
 * ولا اسمًا. فبإعلاننا الموضعَ والحالَ من القائد وحدَه (`setPositionState`)
 * يعود الشريطُ يقول زمنَ الحلقة لا زمنَ سريرِها.
 *
 * ══ وزرُّ «التالية» يُسجَّل حين يكون له معنًى ═══════════════════════
 *
 * النظامُ يعرض إمّا زرّي القفز وإمّا زرّي المسار، فتسجيلُ `nexttrack` قد يزيح
 * القفزَ من شاشة القفل. ولذلك يُسجَّل **حين يكون في الطابور تاليةٌ فعلًا**
 * ويُرفَع حين لا تكون، فلا يجد المستمعُ زرًّا يُضغَط ولا يفعل شيئًا. و«السابقة»
 * لا تُسجَّل أصلًا: المشغّلُ لا يحفظ ما مضى، وزرٌّ لا رجعةَ له كذبٌ في شاشة.
 */

type Reins = {
  toggle: () => void;
  seek: (t: number) => void;
  skip: (by: number) => void;
  /** الانتقالُ إلى تالية الطابور. */
  next: () => void;
};

const ACTIONS = ["play", "pause", "seekbackward", "seekforward", "seekto", "nexttrack", "previoustrack"] as const;

export function useMediaSession({
  current,
  playing,
  time,
  duration,
  rate,
  hasNext,
  stationName,
  stationLogoUrl,
  reins,
}: {
  current: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  /** أفي الطابور تاليةٌ؟ عليه يتوقّف ظهورُ زرّ «التالية». */
  hasNext: boolean;
  stationName: string;
  stationLogoUrl: string | null;
  reins: Reins;
}) {
  /**
   * الزمامُ في مرجعٍ لا في اعتماديّة: مقابضُ النظام تُسجَّل **مرّةً** ثمّ تقرأ
   * أحدثَ ما عندنا. ولو عُلِّقت على الدوالّ لأُعيد تسجيلُها مع كلّ رسمة، وبعضُ
   * المتصفّحات يومض شريطَ الإشعار عند إعادة التسجيل.
   */
  const latest = useRef({ reins, playing });
  // بلا قائمةِ اعتماديّات عمدًا: الزمامُ كائنٌ جديدٌ في كلّ رسمة، فقائمتُه لا
  // تمنع شيئًا وتوهم أنّها تمنع. والتحديثُ سطرٌ لا ثمنَ له.
  useEffect(() => { latest.current = { reins, playing }; });

  /* ── البطاقة: ما يُقرأ في شاشة القفل ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    if (!current) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }

    // الغلافُ: شعارُ البرنامج، فإن غاب فشعارُ المحطّة. والحلقةُ نفسُها لا صورةَ
    // لها في القاعدة، فلا ثالثَ يُنتظَر.
    const art = current.coverUrl ?? stationLogoUrl;
    if (typeof MediaMetadata === "undefined") return;
    ms.metadata = new MediaMetadata({
      title: current.title,
      artist: current.showTitle,
      album: stationName,
      // بلا `sizes`: نحن لا نعرف مقاسَ الشعار المرفوع، والكذبُ فيه يجعل المتصفّحَ
      // يختار خطأً أو يهمل الصورة. وواحدةٌ بلا مقاسٍ تُقبَل عند الجميع.
      artwork: art ? [{ src: art }] : [],
    });
  }, [current, stationName, stationLogoUrl]);

  /* ── الحالُ والموضع: يُعادان مع كلّ خطوةِ شريط ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!current) return;

    // يُعاد التأكيدُ في كلّ خطوة لا عند التبدّل وحدَه: وقوفُ مسار الموسيقى
    // (حين يُنزَل المقبضُ إلى الصفر) قد يجعل المتصفّحَ يظنّ الإذاعةَ متوقّفة.
    ms.playbackState = playing ? "playing" : "paused";

    if (typeof ms.setPositionState !== "function") return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      ms.setPositionState({
        duration,
        playbackRate: rate > 0 ? rate : 1,
        // الموضعُ لا يتجاوز المدّة، وإلّا رمى المتصفّحُ ووقف كلُّ ما بعده.
        position: Math.max(0, Math.min(time, duration)),
      });
    } catch { /* مدّةٌ لم تستقرّ بعد: تُصحَّح في الخطوة التالية */ }
  }, [current, playing, time, duration, rate]);

  /* ── المقابض: تُسجَّل مرّةً وتُرفَع عند الخروج ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    // متصفّحٌ لا يعرف فعلًا يرمي عند تسجيله، فلا يُسقِط ما بعده.
    const set = (action: (typeof ACTIONS)[number], handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler); } catch { /* فعلٌ لا يعرفه هذا المتصفّح */ }
    };

    // `toggle` يقلب الحال، والنظامُ قد يرسل «شغّل» وهي تعمل — فيُفحَص قبل القلب.
    set("play", () => { if (!latest.current.playing) latest.current.reins.toggle(); });
    set("pause", () => { if (latest.current.playing) latest.current.reins.toggle(); });
    set("seekbackward", (d) => latest.current.reins.skip(-(d.seekOffset ?? SKIP_SECONDS)));
    set("seekforward", (d) => latest.current.reins.skip(d.seekOffset ?? SKIP_SECONDS));
    set("seekto", (d) => { if (typeof d.seekTime === "number") latest.current.reins.seek(d.seekTime); });
    // صريحًا لا سهوًا: المشغّلُ لا يحفظ ما مضى، فلا رجعةَ إلى سابقة.
    set("previoustrack", null);

    return () => {
      for (const a of ACTIONS) set(a, null);
      ms.metadata = null;
      ms.playbackState = "none";
    };
  }, []);

  /* ── «التالية»: أثرٌ على حِدَة لأنّه وحدَه يتبدّل بالطابور ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler(
        "nexttrack",
        hasNext ? () => latest.current.reins.next() : null,
      );
    } catch { /* فعلٌ لا يعرفه هذا المتصفّح */ }
  }, [hasNext]);
}
