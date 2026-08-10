"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "../../../dashboard/radio/vocab";

/**
 * مشغّلُ الحلقة، وفيه **المبدّلُ السلس** بين النسختين.
 *
 * المبدأ: النسختان جسدُ حديثٍ واحد، تسبق الموسيقيّةُ المجرّدةَ بمقدار المقدّمة
 * الموسيقيّة (`leadSeconds`) ولا خاتمةَ بعدها. فالانتقال حسابٌ لا سحر:
 *   من الموسيقى إلى المجرّدة: `t − الإزاحة`
 *   من المجرّدة إلى الموسيقى: `t + الإزاحة`
 * ومن كان داخل المقدّمة الموسيقيّة فلا مقابلَ له، فيبدأ من أوّل الحديث (صفر).
 *
 * وسلاسةُ القفزة: العنصران محمَّلان معًا، ويبدأ الهدفُ قبل أن يقف المصدر —
 * فلا صمتَ بينهما. والصوتُ لا يُحمَّل كاملًا سلفًا (`preload="metadata"`) كي لا
 * تُستهلك باقةُ من لن يستمع.
 *
 * 🚧 بلا تنسيق عمدًا (القاعدة ١): لا مكوّنَ مشغّلٍ في المكتبة ولم يُطلَب تصميمُه،
 * فيُترك خامًا موسومًا بـ`data-needs` حتّى يُقَرّ شكلُه ويُبنى في الهوية.
 */

type Variant = "music" | "plain";

export function EpisodePlayer({
  musicUrl, plainUrl, leadSeconds, musicSeconds, plainSeconds, title,
}: {
  musicUrl: string;
  plainUrl: string | null;
  leadSeconds: number;
  musicSeconds: number | null;
  plainSeconds: number | null;
  title: string;
}) {
  const musicRef = useRef<HTMLAudioElement>(null);
  const plainRef = useRef<HTMLAudioElement>(null);

  const [variant, setVariant] = useState<Variant>("music");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  // المدّة من الخادم أوّلًا فيُرسَم الشريط قبل أن تصل بيانات الملفّ، ثمّ يصحّحها الملفّ.
  const [duration, setDuration] = useState(musicSeconds ?? 0);

  const elementOf = useCallback(
    (v: Variant) => (v === "music" ? musicRef.current : plainRef.current),
    [],
  );

  /** زمنُ النسخة الأخرى المقابلُ لهذه اللحظة، محبوسًا داخل حدودها. */
  const mapTime = useCallback((t: number, from: Variant, to: Variant): number => {
    const raw = from === "music" ? t - leadSeconds : t + leadSeconds;
    const target = elementOf(to);
    const max = target && Number.isFinite(target.duration) ? target.duration : Infinity;
    return Math.min(Math.max(raw, 0), max);
  }, [leadSeconds, elementOf]);

  /* ── الشريطُ يتبع النسخةَ العاملة وحدها ── */
  useEffect(() => {
    const a = elementOf(variant);
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => { if (Number.isFinite(a.duration)) setDuration(a.duration); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setTime(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    onMeta();
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [variant, elementOf]);

  /** الوثوبُ لا يقع قبل أن يعرف الملفُّ مدّته، وإلّا ابتُلع صامتًا. */
  const seekWhenReady = (a: HTMLAudioElement, t: number): Promise<void> => {
    if (a.readyState >= 1) { a.currentTime = t; return Promise.resolve(); }
    return new Promise((resolve) => {
      const on = () => { a.removeEventListener("loadedmetadata", on); a.currentTime = t; resolve(); };
      a.addEventListener("loadedmetadata", on);
    });
  };

  const toggle = () => {
    const a = elementOf(variant);
    if (!a) return;
    if (a.paused) void a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const seek = (t: number) => {
    const a = elementOf(variant);
    if (!a) return;
    a.currentTime = t;
    setTime(t);
  };

  const skip = (by: number) => seek(Math.min(Math.max(time + by, 0), duration || time));

  const switchTo = async (next: Variant) => {
    if (next === variant || !plainUrl) return;
    const from = elementOf(variant);
    const to = elementOf(next);
    if (!from || !to) return;

    const t = mapTime(from.currentTime, variant, next);
    await seekWhenReady(to, t);

    // الهدفُ يبدأ ثمّ يقف المصدر، فلا تقع بينهما لحظةُ صمت.
    if (!from.paused) {
      try { await to.play(); } catch { /* المتصفّح قد يمنع، فيبقى الشريط ساكنًا */ }
      from.pause();
    }
    setVariant(next);
    setTime(t);
    if (Number.isFinite(to.duration)) setDuration(to.duration);
    else setDuration((next === "music" ? musicSeconds : plainSeconds) ?? 0);
  };

  const inIntro = variant === "music" && time < leadSeconds;

  return (
    <div data-needs="مشغّل الحلقة">
      <audio ref={musicRef} src={musicUrl} preload="metadata" />
      {plainUrl ? <audio ref={plainRef} src={plainUrl} preload="metadata" /> : null}

      <button type="button" onClick={toggle} aria-label={playing ? `إيقاف ${title}` : `تشغيل ${title}`}>
        {playing ? "إيقاف" : "تشغيل"}
      </button>
      <button type="button" onClick={() => skip(-15)}>خمس عشرة إلى الوراء</button>
      <button type="button" onClick={() => skip(15)}>خمس عشرة إلى الأمام</button>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={Math.min(time, duration || time)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="موضع الاستماع"
      />
      <span>
        <bdi dir="ltr">{formatDuration(time)}</bdi> من <bdi dir="ltr">{formatDuration(duration)}</bdi>
      </span>

      {plainUrl ? (
        <div role="group" aria-label="نسخة الاستماع">
          <button type="button" aria-pressed={variant === "music"} onClick={() => void switchTo("music")}>
            بموسيقى
          </button>
          <button type="button" aria-pressed={variant === "plain"} onClick={() => void switchTo("plain")}>
            بلا موسيقى
          </button>
          {inIntro ? <span>المقدّمة موسيقيّة، والتبديل الآن يبدأ من أوّل الحديث.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
