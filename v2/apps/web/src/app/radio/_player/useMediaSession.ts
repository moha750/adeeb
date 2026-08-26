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

/**
 * **الغلافُ يمرّ بمُصغِّر Next قبل أن يبلغ شاشةَ القفل.**
 *
 * أُعلنت المقاساتُ أوّلًا فلم تكفِ: الشعارُ يُرفَع بمقاسه الأصليّ (قِيس على
 * المنشور: ٥٨٣٤×٥٨٣٤ و٤٨٤ كيلوبايت)، وآيفون يتجاهله مهما قلنا عنه. فيمرّ
 * بالمُصغِّر: **٤٨٤ كيلوبايت تصير ١١٫٥** (قِيس)، بلا رفعٍ جديدٍ ولا حقلٍ في القاعدة.
 *
 * والعروضُ من سلّم Next الافتراضيّ (`imageSizes`) لا من هوانا: ما خرج عنه يُردّ
 * بـ٤٠٠. و٥١٢ ليست منه، فأقصى المتاح ٣٨٤ — جُرِّبت الأربعةُ فثبت ذلك.
 *
 * ولا يُعلَن `type`: المُصغِّرُ يردّ WebP أو أصلَ الصورة بحسب ما يقبله الطالب،
 * فنوعٌ محفورٌ هنا قد يكذب.
 */
const ARTWORK_WIDTHS = [96, 256, 384] as const;

function artworkList(src: string): MediaImage[] {
  const origin = typeof location !== "undefined" ? location.origin : "";
  return ARTWORK_WIDTHS.map((w) => ({
    // مطلقٌ لا نسبيّ: الطالبُ هنا نظامُ التشغيل لا الصفحة.
    src: `${origin}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`,
    sizes: `${w}x${w}`,
  }));
}

export function useMediaSession({
  current,
  playing,
  time,
  duration,
  rate,
  stationName,
  stationLogoUrl,
  reins,
}: {
  current: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
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
      /**
       * **المقاسُ والنوعُ يُعلَنان** (رآه المالك في شاشة قفله ٢٠٢٦-٠٨-٢٦: النصُّ
       * يظهر والصورةُ لا).
       *
       * كانت تُرسَل بلا `sizes` بحجّة أنّنا لا نعرف مقاسَ المرفوع، وأنّ الكذبَ فيه
       * يُضلّل المتصفّح. والحجّةُ سقطت بالتجربة: **آيفون يتجاهل الغلافَ بلا مقاس.**
       * والإعلانُ ليس كذبًا: هو يقول «هذه الصورةُ تصلح لهذه المقاسات»، والنظامُ
       * يختار واحدًا ويحجّم بنفسه — وهو عُرفُ الويب لا استثناءَنا.
       *
       * ولا يُغني هذا عن **غلافٍ صغيرٍ مربّعٍ يُحفَظ عند الرفع**: الشعارُ اليوم
       * ٥٨٣٤×٥٨٣٤ و٤٨٤ كيلوبايت (قِيس)، وذلك ثقيلٌ على شاشةِ قفلٍ مهما أُعلن.
       */
      artwork: art ? artworkList(art) : [],
    });
  }, [current, stationName, stationLogoUrl]);

  /* ── الحال: تُعلَن حين تتبدّل، لا مع كلّ خطوةِ شريط ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!current) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [current, playing]);

  /**
   * ── الموضع: **مرّةً في الثانية لا أربعًا** ──
   *
   * `timeupdate` يقع نحوَ أربع مرّاتٍ في الثانية، وكان كلُّ وقوعٍ يُعيد
   * `setPositionState`. وذاك حِملٌ على جسرِ الوسائط في iOS: **تختفي بطاقةُ «ما
   * يُذاع الآن»** ويتوقّف الصوتُ عند الخروج من المتصفّح أو قفلِ الشاشة. رصده
   * المالك على جهازه ٢٠٢٦-٠٨-٢٦.
   *
   * والنظامُ لا يحتاج أكثر: شريطُ شاشة القفل **يتقدّم بنفسه** من الموضع والسرعة
   * المُعلَنين، فإعلانٌ في الثانية يُبقيه دقيقًا. ويُعلَن فورًا حين تتبدّل الحالُ
   * أو السرعةُ أو الحلقة، فالوثبةُ لا تنتظر دورَها.
   */
  const lastPos = useRef(0);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!current || typeof ms.setPositionState !== "function") return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (Math.abs(time - lastPos.current) < 1) return;
    lastPos.current = time;
    try {
      ms.setPositionState({
        duration,
        playbackRate: rate > 0 ? rate : 1,
        // الموضعُ لا يتجاوز المدّة، وإلّا رمى المتصفّحُ ووقف كلُّ ما بعده.
        position: Math.max(0, Math.min(time, duration)),
      });
    } catch { /* مدّةٌ لم تستقرّ بعد: تُصحَّح في الخطوة التالية */ }
  }, [current, playing, time, duration, rate]);

  /* وثبةٌ أو تبدّلُ سرعةٍ أو حلقةٍ: يُعلَن فورًا ولا ينتظر عتبةَ الثانية. */
  useEffect(() => { lastPos.current = -999; }, [current, playing, rate]);

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
    /**
     * **القفزُ ±١٠ دائمًا، ولا زرَّ مسارٍ يزيحه** (قرارُ المالك ٢٠٢٦-٠٨-٢٦).
     *
     * النظامُ يعرض **إمّا** زرّي المسار **وإمّا** زرّي القفز، لا الأربعة. وكان
     * `nexttrack` يُسجَّل حين يكون في الطابور تاليةٌ فعلًا، فاختلفت شاشةُ القفل
     * من حلقةٍ إلى حلقة: القديماتُ لهنّ تاليةٌ فظهر ⏪⏩، والأحدثُ لا تاليةَ لها
     * فظهر القفز. رآه المالكُ في جهازه وسأل: لماذا الاختلاف؟
     *
     * والصوابُ الثبات، وعُرفُ مشغّلات البودكاست كلِّها (أبل وأوفركاست وبوكِت
     * كاستس) أنّ شاشةَ القفل للقفز لا للمسارات — فالحلقةُ طويلةٌ يُتنقَّل داخلها
     * لا بينها. والانتقالُ إلى التالية يبقى تلقائيًّا عند الانتهاء.
     */
    set("previoustrack", null);
    set("nexttrack", null);

    return () => {
      for (const a of ACTIONS) set(a, null);
      ms.metadata = null;
      ms.playbackState = "none";
    };
  }, []);

}
