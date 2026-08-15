"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PLAY_THRESHOLD_SECONDS, reportPlay } from "@/lib/radio/countPlay";
import { DEFAULT_MUSIC_LEVEL, MUSIC_LEVEL_KEY } from "../../dashboard/radio/vocab";
import { PlayerControls } from "./PlayerControls";

/**
 * مشغّلُ المحطّة — **عنصرا الصوت يعيشان في تخطيط القسم لا في صفحته.**
 *
 * وهذا هو الفرقُ بين «محطّة» و«صفحاتِ محتوى»: تخطيطُ المسار يبقى مركَّبًا وأنت
 * تتنقّل بين البرامج والحلقات، فيبقى الصوتُ متّصلًا. ولو سكن المشغّلُ صفحةَ
 * الحلقة لانقطع عند أوّل نقرة.
 *
 * ══ والحلقةُ تُسمَع بأحد بابين ═══════════════════════════════════════
 *
 * **مساران** (`stems`): مسارُ صوتٍ ومسارُ موسيقى يُشغَّلان معًا، فما يُسمَع هو
 * مجموعُهما و«بلا موسيقى» إخفاتُ الثاني. وهذا هو البابُ الذي تُرفَع به الحلقاتُ
 * اليوم، وفيه **المقبض**.
 *
 * **مكسٌ قديم** (`legacy`): ملفّان كاملان لا يعمل منهما إلّا واحد، والتبديلُ
 * بينهما قفزٌ `t ← t`. تعمل به الحلقاتُ التي رُفعت قبل المسارين.
 *
 * ══ ولمَ لم يُبنَ المقبضُ على المكسين ═════════════════════════════════
 *
 * لأنّ الكلامَ فيهما مكرّرٌ مرّتين، فجمعُهما بمقدارين يجمع صوتَ المذيع من
 * مصدرين، وانزياحُ جزءٍ من الألف بين ساعتَي مشغّلين يُحدث عليه رنينًا معدنيًّا.
 * ولمّا صار الكلامُ في مسارٍ واحد زال ذلك: انزياحُ الموسيقى وحدَها لا تسمعه أذنٌ
 * (سريرٌ لا يُوقَّع على كلمات).
 */

export type Track = {
  id: string;
  title: string;
  showTitle: string;
  showSlug: string;
  episodeSlug: string;
  /** المكسُ القديم. `null` في الحلقات المرفوعة بالمسارين. */
  musicUrl: string | null;
  /** مسارُ الصوت. */
  plainUrl: string | null;
  /** مسارُ الموسيقى. باجتماعه مع الصوت يصير للحلقة مقبض. */
  stemUrl: string | null;
  talkStartsAt: number;
  coverUrl: string | null;
  seconds: number | null;
  /** موجةُ ما يُسمَع بالموسيقى، وموجةُ الصوت وحدَه. تتبدّلان عند الطرفين. */
  musicPeaks: number[] | null;
  plainPeaks: number[] | null;
  /** نغمةُ البرنامج — يلبسها الشريطُ فيُعرَف البرنامجُ بلونه وهو يُذاع. */
  tone: string;
};

/**
 * **مفتاحُ التجربة (٢٠٢٦-٠٨-١٣).** المشغّلُ صار داخلَ صفحة الحلقة، والشريطُ
 * الملازم لا يظهر إلّا حين يغيب عن النظر أو تغادر الصفحة.
 *
 * اجعلها `false` فيعود الشريطُ ظاهرًا دائمًا كما كان ويختفي المشغّلُ الداخليّ —
 * سطرٌ واحدٌ يرجع بك، فالتجربةُ لم تُعمَّد بعد.
 */
export const INLINE_PLAYER = true;

type Variant = "music" | "plain";
type Mode = "stems" | "legacy";

/**
 * ما نتسامح به من انزياحٍ بين المسارين قبل أن يُعاد ضبطُ الموسيقى.
 *
 * رُبعُ ثانيةٍ سخيّ عمدًا: السريرُ الموسيقيُّ لا يُوقَّع على كلمات، فانزياحُه
 * دون ذلك لا يُسمَع أصلًا. والضبطُ قفزةٌ صغيرة، فكلّما ندر كان أنظفَ للأذن.
 */
const DRIFT_TOLERANCE = 0.25;

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

  /* ── زمامُ المشغّل: يقرؤه كلُّ سطحٍ يعرض الأدوات ── */
  variant: Variant;
  time: number;
  duration: number;
  rate: number;
  volume: number;
  muted: boolean;
  /**
   * مقدارُ الموسيقى من صفرٍ إلى واحد. لا معنى له إلّا حين تكون الحلقةُ مسارين،
   * وحضورُ أداته يقرّره السطحُ من الحلقة المعروضة لا من هنا.
   */
  musicLevel: number;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (by: number) => void;
  cycleRate: () => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setMusicLevel: (v: number) => void;
  switchTo: (v: Variant) => void;
  /** يُخبر المشغّلَ أنّ سطحًا داخليًّا حاضرٌ في النظر، فيكفّ الشريطُ الملازم. */
  setInlineVisible: (v: boolean) => void;
};

const Ctx = createContext<Api | null>(null);

/** يقرؤه كلُّ زرِّ تشغيلٍ في القسم. خارج القسم لا مشغّل، فيردّ حالةً خاملة. */
export function useRadioPlayer(): Api {
  return useContext(Ctx) ?? {
    current: null, playing: false, play: () => {}, isCurrent: () => false,
    variant: "music", time: 0, duration: 0, rate: 1, volume: 1, muted: false,
    musicLevel: DEFAULT_MUSIC_LEVEL,
    toggle: () => {}, seek: () => {}, skip: () => {}, cycleRate: () => {},
    setVolume: () => {}, setMuted: () => {}, setMusicLevel: () => {},
    switchTo: () => {}, setInlineVisible: () => {},
  };
}

export function RadioPlayerProvider({ children }: { children: React.ReactNode }) {
  /**
   * عنصران لا أربعة، ودورُهما يتبدّل بالباب:
   *   بالمسارين: `a` مسارُ الصوت و`b` مسارُ الموسيقى، ويعملان معًا.
   *   بالمكس القديم: `a` النسخةُ بموسيقى و`b` المجرّدة، ولا يعمل إلّا واحد.
   */
  const aRef = useRef<HTMLAudioElement>(null);
  const bRef = useRef<HTMLAudioElement>(null);

  const [current, setCurrent] = useState<Track | null>(null);
  const [legacyVariant, setLegacyVariant] = useState<Variant>("music");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [musicLevel, setMusicLevelState] = useState(DEFAULT_MUSIC_LEVEL);
  const [queue, setQueue] = useState<Track[]>([]);
  const [inlineVisible, setInlineVisible] = useState(false);

  const mode: Mode = current?.plainUrl && current?.stemUrl ? "stems" : "legacy";
  const srcA = mode === "stems" ? current?.plainUrl : current?.musicUrl;
  const srcB = mode === "stems" ? current?.stemUrl : current?.plainUrl;

  /** النسخةُ المسموعة: تُشتقّ من المقبض بالمسارين، وتُختار بالمبدّل في المكس. */
  const variant: Variant = mode === "stems" ? (musicLevel > 0 ? "music" : "plain") : legacyVariant;

  /** المسارُ الذي يملك الزمن: الصوتُ دائمًا بالمسارين، والعاملُ في المكس. */
  const leadEl = useCallback(
    () => (mode === "stems" || legacyVariant === "music" ? aRef.current : bRef.current),
    [mode, legacyVariant],
  );
  /** مسارُ الموسيقى — تابعٌ لا يملك زمنًا. `null` في المكس القديم. */
  const stemEl = useCallback(() => (mode === "stems" ? bRef.current : null), [mode]);

  /**
   * المقبضُ يُحفَظ في المتصفّح: من فضّل موسيقى أخفت لا يعيد ضبطَها كلَّ حلقة.
   *
   * **والغيابُ يُفحَص قبل التحويل**: `getItem` يردّ `null` لمن لم يضبط شيئًا،
   * و`Number(null)` صفرٌ صحيحٌ مقبولٌ في المدى — فكان كلُّ زائرٍ جديدٍ يسمع
   * الحلقةَ بلا موسيقى ولا يدري لماذا. رُصد في المعاينة، ٢٠٢٦-٠٨-١٤.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MUSIC_LEVEL_KEY);
      if (raw === null) return;
      const saved = Number(raw);
      if (Number.isFinite(saved) && saved >= 0 && saved <= 1) setMusicLevelState(saved);
    } catch { /* متصفّحٌ يمنع التخزين: يبقى الافتراضيّ */ }
  }, []);

  /**
   * عدّادُ الاستماع — يُقاس **سماعًا حقيقيًّا لا زمنًا يمرّ**.
   *
   * فلا يُحسَب الوقتُ بالساعة (فمن ترك الصفحة مفتوحةً وهي متوقّفةٌ لم يسمع
   * شيئًا)، بل تُجمَع خطواتُ الشريط.
   *
   * **والوثبةُ تُعرَف بحدثها لا بحجمها**: كان يُستبعَد ما تجاوز ثانيتين، فيُخطئ
   * في الاتّجاهين. فالمتصفّح يقول `seeking` عند الوثب، وهو أصدقُ من التخمين.
   * ويبقى سقفٌ رحبٌ (خمسُ ثوانٍ) لتبويبٍ خُلِّف فأبطأ.
   *
   * ويُسلَّح مرّةً لكلّ استماعةٍ **تبدأ**: بلاغٌ واحدٌ ثمّ يُقفل حتّى تبدأ أخرى.
   */
  const heard = useRef(0);
  const reported = useRef(false);
  const lastAt = useRef(0);
  const seeking = useRef(false);

  /**
   * المقاديرُ تُضبَط على العنصرين معًا لا على العامل وحده، وإلّا رجع المستمعُ
   * إلى سرعةٍ أخرى بمجرّد أن يبدّل، وهو لم يطلب ذلك.
   *
   * و`b` وحدَه يحمل المقبض: مقدارُه حاصلُ ضربِ صوتِ المستمع في مقدار الموسيقى،
   * فيبقى الكلامُ ثابتًا مهما تحرّك المقبض. وهذا هو المقبضُ كلُّه في سطر.
   */
  useEffect(() => {
    const a = aRef.current, b = bRef.current;
    for (const el of [a, b]) {
      if (!el) continue;
      el.playbackRate = rate;
      el.muted = muted;
    }
    if (a) a.volume = volume;
    if (b) b.volume = mode === "stems" ? volume * musicLevel : volume;
  }, [rate, volume, muted, musicLevel, mode, current]);

  /** الصمتُ لا يُبدأ فيه: من أطفأ الموسيقى والمقدّمةُ لم تنتهِ يُنقَل إلى الكلام. */
  const landing = useCallback(
    (silent: boolean, t: number) => (silent && current && t < current.talkStartsAt ? current.talkStartsAt : t),
    [current],
  );

  /* ── الشريطُ يتبع المسارَ القائد وحدَه ── */
  useEffect(() => {
    const a = leadEl();
    if (!a) return;
    const onTime = () => {
      const t = a.currentTime;
      const step = t - lastAt.current;
      // ما جاء عبر وثبةٍ لا يُحسَب، وما عداه سماعٌ ما دام موجبًا دون السقف.
      if (!seeking.current && step > 0 && step < 5) heard.current += step;
      lastAt.current = t;

      if (!reported.current && heard.current >= PLAY_THRESHOLD_SECONDS && current) {
        reported.current = true;
        void reportPlay(current.id, variant === "plain");
      }

      /**
       * ضبطُ الانزياح — **ولا يُضبَط مسارٌ ما زال يُحمّل**.
       *
       * فلو تعثّرت الموسيقى في الشبكة تجمّد زمنُها وكبر الانزياح، فلو قفزنا بها
       * لأعدنا التحميلَ من موضعٍ جديد فتعثّرت ثانيةً، ودارت الرحى. فيُنتظَر
       * حتّى يصير أمامها ما تعرضه ثمّ تُلحَق بالكلام.
       *
       * وأثناء تعثّرها **لا يُوقَف الكلام**: الموسيقى سريرٌ يغيب لحظةً ثمّ يعود
       * في موضعه، وإيقافُ الحديث لأجلها أسوأُ من غيابها.
       */
      const s = stemEl();
      if (s && !s.paused && s.readyState >= 3 && Math.abs(s.currentTime - t) > DRIFT_TOLERANCE) {
        s.currentTime = t;
      }

      setTime(t);
    };
    const onMeta = () => { if (Number.isFinite(a.duration)) setDuration(a.duration); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      stemEl()?.pause();
      // انتهت استماعةٌ، فما بعدها بدايةٌ جديدة تُحتسَب وحدَها.
      heard.current = 0; reported.current = false; lastAt.current = 0;
      const [next, ...rest] = queue;
      if (next) { setCurrent(next); setQueue(rest); setLegacyVariant("music"); setTime(0); setDuration(next.seconds ?? 0); return; }
      setPlaying(false);
      setTime(0);
    };
    const onSeeking = () => { seeking.current = true; };
    const onSeeked = () => { lastAt.current = a.currentTime; seeking.current = false; };
    a.addEventListener("seeking", onSeeking);
    a.addEventListener("seeked", onSeeked);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    onMeta();
    return () => {
      a.removeEventListener("seeking", onSeeking);
      a.removeEventListener("seeked", onSeeked);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [leadEl, stemEl, variant, current, queue]);

  /**
   * مصالحةُ مسار الموسيقى بالحال — مكانٌ واحدٌ يقرّر أيعمل أم يقف، فلا تتفرّق
   * القرارات على كلّ زرّ.
   *
   * **ولا يُبَثّ ما لا يُسمَع**: من أنزل المقبضَ إلى الصفر أُوقف مسارُه فلم
   * يُحمَّل أصلًا، فوفّر عليه بضعةَ ميغاباياتٍ من باقيته.
   */
  useEffect(() => {
    if (mode !== "stems") return;
    const a = aRef.current, b = bRef.current;
    if (!a || !b) return;
    if (playing && musicLevel > 0) {
      if (Math.abs(b.currentTime - a.currentTime) > DRIFT_TOLERANCE) b.currentTime = a.currentTime;
      // **والضبطُ يُعاد بعد أن يبدأ فعلًا**: الضبطُ قبل `play()` يقع على زمنٍ
      // يعتّق، فمُهلةُ البدء (نحو ٨٦ ملّي ثانية، قِيست) تصير تأخّرًا ثابتًا
      // يرافق الحلقةَ إلى آخرها. وضبطةٌ ثانيةٌ بعد البدء تمحوه مرّةً واحدة.
      if (b.paused) {
        void b.play()
          .then(() => { b.currentTime = a.currentTime; })
          .catch(() => { /* يُعاد عند أوّل ضبطِ انزياح */ });
      }
    } else if (!b.paused) b.pause();
  }, [playing, musicLevel, mode, current]);

  const play = useCallback((t: Track, rest: Track[] = []) => {
    // الحلقةُ نفسُها: الزرُّ يقلب التشغيل ولا يعيد من أوّلها.
    if (current?.id === t.id) {
      const a = leadEl();
      if (!a) return;
      if (a.paused) void a.play().catch(() => setPlaying(false));
      else { a.pause(); stemEl()?.pause(); }
      return;
    }
    aRef.current?.pause();
    bRef.current?.pause();
    setCurrent(t);
    setQueue(rest);
    setLegacyVariant("music");
    setTime(0);
    setDuration(t.seconds ?? 0);
    // استماعةٌ جديدة تبدأ، فيُسلَّح العدّادُ من جديد.
    heard.current = 0; reported.current = false; lastAt.current = 0;
  }, [current, leadEl, stemEl]);

  // حلقةٌ جديدة: تُحمَّل ثمّ تبدأ. والتشغيلُ هنا نتيجةُ نقرةِ المستخدم فلا يمنعه المتصفّح.
  useEffect(() => {
    if (!current) return;
    const a = aRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => setPlaying(false));
  }, [current]);

  const seek = useCallback((t: number) => {
    const a = leadEl();
    if (!a) return;
    a.currentTime = t;
    const s = stemEl();
    if (s) s.currentTime = t;
    setTime(t);
  }, [leadEl, stemEl]);

  const toggle = () => {
    const a = leadEl();
    if (!a) return;
    if (a.paused) {
      const at = landing(variant === "plain", a.currentTime);
      if (at !== a.currentTime) seek(at);
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
      stemEl()?.pause();
    }
  };

  /**
   * المقبض. وإنزالُه إلى الصفر في المقدّمة الموسيقيّة ينقل المستمعَ إلى الكلام،
   * فلا يجلس في صمتٍ لا يفهم سببَه — وهو سلوكُ المبدّل نفسُه لا سلوكٌ مستحدَث.
   */
  const setMusicLevel = useCallback((v: number) => {
    const level = Math.max(0, Math.min(1, v));
    setMusicLevelState(level);
    try { localStorage.setItem(MUSIC_LEVEL_KEY, String(level)); } catch { /* مُنع التخزين */ }

    if (level === 0 && mode === "stems") {
      const a = aRef.current;
      if (a) {
        const at = landing(true, a.currentTime);
        if (at !== a.currentTime) seek(at);
      }
    }
  }, [mode, landing, seek]);

  /**
   * المبدّل — طرفا المقبض بالمسارين، وقفزةٌ بين ملفّين في المكس القديم.
   *
   * وفي المكس: الهدفُ يبدأ **ثمّ** يقف المصدر فلا تقع بينهما لحظةُ صمت، **ولا
   * يُسكَت المصدرُ إن لم يبدأ الهدف** — فإن ردّ المتصفّحُ `play()` (وهو يردّه
   * إذا انقطعت سلسلةُ إيماءة المستخدم بانتظارٍ غير متزامن) بقي المستمعُ في صمتٍ
   * تامّ ولا يدري لماذا. وقع فعلًا ورُصد في المعاينة، ٢٠٢٦-٠٨-١٣.
   */
  const switchTo = async (next: Variant) => {
    if (next === variant) return;

    if (mode === "stems") { setMusicLevel(next === "music" ? 1 : 0); return; }

    if (!current?.plainUrl) return;
    const from = legacyVariant === "music" ? aRef.current : bRef.current;
    const to = legacyVariant === "music" ? bRef.current : aRef.current;
    if (!from || !to) return;

    const t = landing(next === "plain", from.currentTime);
    if (to.readyState >= 1) to.currentTime = t;
    else await new Promise<void>((res) => {
      const on = () => { to.removeEventListener("loadedmetadata", on); to.currentTime = t; res(); };
      to.addEventListener("loadedmetadata", on);
    });

    if (!from.paused) {
      try { await to.play(); } catch { return; }
      from.pause();
    }
    setLegacyVariant(next);
    setTime(t);
  };

  /** خمسَ عشرةَ ثانية: أكثرُ ما يُحتاج في الحديث المسموع، تكرارُ جملةٍ فاتت أو تخطّي استطراد. */
  const skip = (by: number) => {
    const a = leadEl();
    if (!a) return;
    seek(Math.min(Math.max(a.currentTime + by, 0), duration || a.currentTime));
  };

  /** دورةُ السرعة. الحلقةُ حديثٌ لا موسيقى، فتُسمَع مسرَّعةً بلا أن تفقد معناها. */
  const RATES = [1, 1.25, 1.5, 2];
  const cycleRate = () => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length] ?? 1);

  const api = useMemo<Api>(
    () => ({
      current, playing, play, isCurrent: (id: string) => current?.id === id,
      variant, time, duration, rate, volume, muted,
      musicLevel,
      toggle, seek, skip, cycleRate, setVolume, setMuted, setMusicLevel,
      switchTo: (v: Variant) => void switchTo(v),
      setInlineVisible,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, playing, play, variant, time, duration, rate, volume, muted, musicLevel, mode],
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* الصوتُ خارج شرطِ العرض: لو رُكِّب مع الشريط لانقطع كلّما اختفى. */}
      <audio ref={aRef} src={srcA ?? undefined} preload="metadata" />
      <audio ref={bRef} src={srcB ?? undefined} preload="metadata" />

      {current && !(INLINE_PLAYER && inlineVisible) ? (
        <>
        {/* فسحةٌ في التدفّق بقدر الشريط، فلا يحجب آخرَ صفٍّ في الصفحة */}
        <div className="rad-bar-space" aria-hidden />
        <div className={`rad-bar rad-bar-slim rad-tone-${current.tone}`}>
          <PlayerControls compact />
        </div>
        </>
      ) : null}
    </Ctx.Provider>
  );
}
