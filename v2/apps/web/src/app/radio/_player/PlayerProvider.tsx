"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MicrophoneStage, MusicNotes, Play, Pause, SpeakerSimpleNone,
  ArrowCounterClockwise, ArrowClockwise, SpeakerHigh, SpeakerSlash, ShareNetwork, Check,
} from "@phosphor-icons/react";
import { formatDuration } from "../../dashboard/radio/vocab";

/**
 * مشغّلُ المحطّة — **عنصرا الصوت يعيشان في تخطيط القسم لا في صفحته.**
 *
 * وهذا هو الفرقُ بين «محطّة» و«صفحاتِ محتوى»: تخطيطُ المسار يبقى مركَّبًا وأنت
 * تتنقّل بين البرامج والحلقات، فيبقى الصوتُ متّصلًا. ولو سكن المشغّلُ صفحةَ
 * الحلقة لانقطع عند أوّل نقرة.
 *
 * والنسختان **تايم لاينٌ واحد** (المنتج يصدّر التسلسل نفسَه بكتم مسار الموسيقى)،
 * فالتبديلُ بينهما `t ← t` دقيقٌ بلا حساب ولا يتحرّك الشريطُ عنده. ولا يُستعمل
 * `talkStartsAt` إلّا لشيءٍ واحد: ألّا يبدأ المستمعُ المجرّدةَ في صمت المقدّمة.
 */

export type Track = {
  id: string;
  title: string;
  showTitle: string;
  showSlug: string;
  episodeSlug: string;
  musicUrl: string;
  plainUrl: string | null;
  talkStartsAt: number;
  coverUrl: string | null;
  seconds: number | null;
  /** نغمةُ البرنامج — يلبسها الشريطُ فيُعرَف البرنامجُ بلونه وهو يُذاع. */
  tone: string;
};

type Variant = "music" | "plain";

type Api = {
  current: Track | null;
  playing: boolean;
  /**
   * يبدأ حلقةً، أو يقلب التشغيل إن كانت هي العاملة.
   * و`rest` ما يليها في القائمة التي ضُغطت منها — فتنتهي الحلقةُ فتليها أختُها
   * بلا نقرة، وهذا ما يجعل القسمَ محطّةً تُذاع لا صفحةً تُفتح.
   */
  play: (t: Track, rest?: Track[]) => void;
  isCurrent: (id: string) => boolean;
};

const Ctx = createContext<Api | null>(null);

/** يقرؤه كلُّ زرِّ تشغيلٍ في القسم. خارج القسم لا مشغّل، فيردّ حالةً خاملة. */
export function useRadioPlayer(): Api {
  return useContext(Ctx) ?? { current: null, playing: false, play: () => {}, isCurrent: () => false };
}

export function RadioPlayerProvider({ children }: { children: React.ReactNode }) {
  const musicRef = useRef<HTMLAudioElement>(null);
  const plainRef = useRef<HTMLAudioElement>(null);

  const [current, setCurrent] = useState<Track | null>(null);
  const [variant, setVariant] = useState<Variant>("music");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [shared, setShared] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  /**
   * السرعةُ والصوتُ يُضبطان على **العنصرين معًا** لا على العامل وحده.
   * وإلّا رجع المستمعُ إلى سرعةٍ أخرى بمجرّد أن يبدّل النسخة، وهو لم يطلب ذلك.
   */
  useEffect(() => {
    for (const a of [musicRef.current, plainRef.current]) {
      if (!a) continue;
      a.playbackRate = rate;
      a.volume = volume;
      a.muted = muted;
    }
  }, [rate, volume, muted, current]);

  const elementOf = useCallback(
    (v: Variant) => (v === "music" ? musicRef.current : plainRef.current),
    [],
  );

  /** المجرّدةُ لا تُبدأ في صمت المقدّمة. */
  const landing = useCallback(
    (v: Variant, t: number) => (v === "plain" && current && t < current.talkStartsAt ? current.talkStartsAt : t),
    [current],
  );

  /* ── الشريطُ يتبع النسخة العاملة وحدها ── */
  useEffect(() => {
    const a = elementOf(variant);
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => { if (Number.isFinite(a.duration)) setDuration(a.duration); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const [next, ...rest] = queue;
      if (next) { setCurrent(next); setQueue(rest); setVariant("music"); setTime(0); setDuration(next.seconds ?? 0); return; }
      setPlaying(false);
      setTime(0);
    };
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
  }, [variant, current, queue, elementOf]);

  const play = useCallback((t: Track, rest: Track[] = []) => {
    // الحلقةُ نفسُها: الزرُّ يقلب التشغيل ولا يعيد من أوّلها.
    if (current?.id === t.id) {
      const a = elementOf(variant);
      if (!a) return;
      if (a.paused) void a.play().catch(() => setPlaying(false));
      else a.pause();
      return;
    }
    elementOf("music")?.pause();
    elementOf("plain")?.pause();
    setCurrent(t);
    setQueue(rest);
    setVariant("music");
    setTime(0);
    setDuration(t.seconds ?? 0);
  }, [current, variant, elementOf]);

  // حلقةٌ جديدة: تُحمَّل ثمّ تبدأ. والتشغيلُ هنا نتيجةُ نقرةِ المستخدم فلا يمنعه المتصفّح.
  useEffect(() => {
    if (!current) return;
    const a = musicRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => setPlaying(false));
  }, [current]);

  const seek = (t: number) => {
    const a = elementOf(variant);
    if (!a) return;
    a.currentTime = t;
    setTime(t);
  };

  const toggle = () => {
    const a = elementOf(variant);
    if (!a) return;
    if (a.paused) {
      const at = landing(variant, a.currentTime);
      if (at !== a.currentTime) seek(at);
      void a.play().catch(() => setPlaying(false));
    } else a.pause();
  };

  const switchTo = async (next: Variant) => {
    if (!current?.plainUrl || next === variant) return;
    const from = elementOf(variant);
    const to = elementOf(next);
    if (!from || !to) return;

    const t = landing(next, from.currentTime);
    if (to.readyState >= 1) to.currentTime = t;
    else await new Promise<void>((res) => {
      const on = () => { to.removeEventListener("loadedmetadata", on); to.currentTime = t; res(); };
      to.addEventListener("loadedmetadata", on);
    });

    // الهدفُ يبدأ ثمّ يقف المصدر، فلا تقع بينهما لحظةُ صمت.
    if (!from.paused) {
      try { await to.play(); } catch { /* المتصفّح قد يمنع، فيبقى الشريط ساكنًا */ }
      from.pause();
    }
    setVariant(next);
    setTime(t);
  };

  /** خمسَ عشرةَ ثانية: أكثرُ ما يُحتاج في الحديث المسموع، تكرارُ جملةٍ فاتت أو تخطّي استطراد. */
  const skip = (by: number) => {
    const a = elementOf(variant);
    if (!a) return;
    seek(Math.min(Math.max(a.currentTime + by, 0), duration || a.currentTime));
  };

  /** دورةُ السرعة. الحلقةُ حديثٌ لا موسيقى، فتُسمَع مسرَّعةً بلا أن تفقد معناها. */
  const RATES = [1, 1.25, 1.5, 2];
  const cycleRate = () => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length] ?? 1);

  /**
   * المشاركة: `navigator.share` حيث وُجد (وهو الجوّال غالبًا) وإلّا نسخٌ للحافظة.
   * ولا إشعارَ عندنا في الموقع العامّ، فالزرُّ نفسُه يقول «نُسخ» بعلامةِ صحٍّ لحظتين.
   */
  const share = async () => {
    if (!current) return;
    const url = `${window.location.origin}/radio/${current.showSlug}/${current.episodeSlug}`;
    try {
      if (navigator.share) await navigator.share({ title: current.title, text: current.showTitle, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* أُلغيت المشاركة أو مُنعت الحافظة، فلا شيء يُقال */ }
  };

  const api = useMemo<Api>(
    () => ({ current, playing, play, isCurrent: (id: string) => current?.id === id }),
    [current, playing, play],
  );

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* الصوتُ خارج شرطِ العرض: لو رُكِّب مع الشريط لانقطع كلّما اختفى. */}
      <audio ref={musicRef} src={current?.musicUrl} preload="metadata" />
      <audio ref={plainRef} src={current?.plainUrl ?? undefined} preload="metadata" />

      {current ? (
        <>
        {/* فسحةٌ في التدفّق بقدر الشريط، فلا يحجب آخرَ صفٍّ في الصفحة */}
        <div className="rad-bar-space" aria-hidden />
        <div className={`rad-bar rad-tone-${current.tone}`}>
          <Link href={`/radio/${current.showSlug}/${current.episodeSlug}`} className="rad-bar-cover" aria-label={`صفحة ${current.title}`}>
            {current.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={current.coverUrl} alt="" />
              : <MicrophoneStage size={22} aria-hidden />}
          </Link>

          <div className="rad-bar-meta">
            <div className="rad-bar-title">{current.title}</div>
            <Link href={`/radio/${current.showSlug}`} className="rad-bar-show">{current.showTitle}</Link>
          </div>

          <div className="rad-bar-ctrl">
            {/* دوّارةٌ لا سهمٌ مستقيم: خطُّ الوقت عندنا يمشي يمينًا إلى يسار، فالسهمُ
                المستقيم يقول عكسَ ما يفعل. والدوّارةُ لا اتّجاهَ لها تكذب فيه،
                وهي التي تستعملها أبل وسبوتيفاي للسبب نفسِه. والرقمُ مكتوبٌ فلا يُخمَّن. */}
            <button type="button" className="rad-skip rad-skip-n" onClick={() => skip(-15)} aria-label="خمس عشرة ثانية إلى الوراء">
              <ArrowCounterClockwise size={16} aria-hidden /><span className="font-latin">15</span>
            </button>
            <button type="button" className="rad-play" onClick={toggle}
              aria-label={playing ? `إيقاف ${current.title}` : `تشغيل ${current.title}`}>
              {playing ? <Pause size={18} weight="fill" aria-hidden /> : <Play size={18} weight="fill" aria-hidden />}
            </button>
            <button type="button" className="rad-skip rad-skip-n" onClick={() => skip(15)} aria-label="خمس عشرة ثانية إلى الأمام">
              <ArrowClockwise size={16} aria-hidden /><span className="font-latin">15</span>
            </button>
          </div>

          <div className="rad-scrub">
            <span className="rad-scrub-time"><bdi dir="ltr">{formatDuration(time) || "0:00"}</bdi></span>
            {/* المسارُ مُدخَلُ مدًى حقيقيّ تحت الرسم: يُقاد بلوحة المفاتيح واللمس بلا حسابِ بكسل. */}
            <div className="rad-scrub-track">
              <div className="rad-scrub-fill" style={{ width: `${pct}%` }} />
              <div className="rad-scrub-knob" style={{ insetInlineStart: `${pct}%` }} />
              <input
                className="rad-scrub-input"
                type="range" min={0} max={duration || 0} step={1}
                value={Math.min(time, duration || time)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="موضع الاستماع"
              />
            </div>
            <span className="rad-scrub-time"><bdi dir="ltr">{formatDuration(duration) || "0:00"}</bdi></span>
          </div>

          {current.plainUrl ? (
            <div className="rad-takes" role="group" aria-label="نسخة الاستماع">
              <button type="button" className="rad-take" aria-pressed={variant === "music"} onClick={() => void switchTo("music")}>
                <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بموسيقى</span>
              </button>
              <button type="button" className="rad-take" aria-pressed={variant === "plain"} onClick={() => void switchTo("plain")}>
                <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بلا موسيقى</span>
              </button>
            </div>
          ) : null}

          <button type="button" className="rad-chip" onClick={cycleRate}
            aria-label={`سرعة التشغيل ${rate} أضعاف، اضغط لتغييرها`}>
            <bdi dir="ltr">{rate}×</bdi>
          </button>

          <div className="rad-vol">
            <button type="button" className="rad-skip" onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "إلغاء الكتم" : "كتم الصوت"}>
              {muted ? <SpeakerSlash size={17} aria-hidden /> : <SpeakerHigh size={17} aria-hidden />}
            </button>
            <input
              className="rad-vol-input"
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => { const v = Number(e.target.value); setVolume(v); setMuted(v === 0); }}
              aria-label="مستوى الصوت"
            />
          </div>


          <button type="button" className="rad-skip" onClick={() => void share()}
            aria-label={shared ? "نُسخ الرابط" : "مشاركة الحلقة"}>
            {shared ? <Check size={16} aria-hidden /> : <ShareNetwork size={16} aria-hidden />}
          </button>
        </div>
        </>
      ) : null}
    </Ctx.Provider>
  );
}
