"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DRIFT_TOLERANCE, PLAY_THRESHOLD_SECONDS, PLAYBACK_RATES } from "@adeeb/core";
import { reportPlay } from "@/lib/radio/countPlay";
import { clearProgress, resumeAt, saveProgress } from "@/lib/radio/progress";
import { DEFAULT_MUSIC_LEVEL, MUSIC_LEVEL_KEY, SKIP_SECONDS } from "../../dashboard/radio/vocab";
import { PlayerControls } from "./PlayerControls";
import { useMediaSession } from "./useMediaSession";

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



type Api = {
  current: Track | null;
  playing: boolean;
  /** أتعثّر تحميلُ المسار القائد؟ يقرؤه السطحُ فيقول ذلك بدل أن يصمت. */
  failed: boolean;
  /**
   * يبدأ حلقةً، أو يقلب التشغيل إن كانت هي العاملة.
   * و`rest` ما يليها في القائمة التي ضُغطت منها — فتنتهي الحلقةُ فتليها أختُها
   * بلا نقرة، وهذا ما يجعل القسمَ محطّةً تُذاع لا صفحةً تُفتح.
   *
   * و`at` **منفذُ البدء من موضع**، ومصدرٌ واحدٌ لثلاثة أبواب: محورٌ يُنقَر،
   * ورابطٌ فيه `?t=`، وتكملةُ ما سُمع. ولولا توحيدُها لاحتاج كلٌّ منها أن يبدأ
   * ثمّ يثب بعد التحميل، وذاك يُسمِع أوّلَ الحلقة قبل أن يقفز.
   * و`undefined` تعني «من حيث يقول المخزن»، والصفرُ يعني «من أوّلها» صراحةً.
   */
  play: (t: Track, rest?: Track[], at?: number) => void;
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

/**
 * ══ مقبضُ الموسيقى: مخزنٌ خارجيٌّ يُقرأ، لا نسخةٌ منه في حالة ═══════════
 *
 * كان يُنسَخ من `localStorage` إلى حالةٍ داخل أثرٍ بعد التركيب، فيُرسَم المشغّلُ
 * مرّةً بالمقدار الافتراضيّ ثمّ يُعاد رسمُه بمقدار صاحبه (رسمتان، وقفزةُ مقبضٍ
 * تُرى). وهو ما تردّه قاعدةُ المصرّف `set-state-in-effect`. فصار المخزنُ هو
 * المصدرَ يُقرأ بـ`useSyncExternalStore` (سابقةُ `lib/useDraft`).
 *
 * **والغيابُ يُفحَص قبل التحويل**: `getItem` يردّ `null` لمن لم يضبط شيئًا،
 * و`Number(null)` صفرٌ صحيحٌ مقبولٌ في المدى — فكان كلُّ زائرٍ جديدٍ يسمع الحلقةَ
 * بلا موسيقى ولا يدري لماذا. رُصد في المعاينة، ٢٠٢٦-٠٨-١٤.
 *
 * **ونسخةٌ في الذاكرة فوق المخزن**: متصفّحٌ يمنع التخزين (تصفّحٌ خاصّ) يجعل
 * الكتابةَ ترمي، فلولا هذه النسخةُ لعاد المقبضُ إلى مكانه كلّما حُرّك.
 */
const levelListeners = new Set<() => void>();
let levelCache: number | null = null;

const readStoredLevel = (): number => {
  try {
    const raw = localStorage.getItem(MUSIC_LEVEL_KEY);
    if (raw === null) return DEFAULT_MUSIC_LEVEL;
    const saved = Number(raw);
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_MUSIC_LEVEL;
  } catch { return DEFAULT_MUSIC_LEVEL; /* متصفّحٌ يمنع التخزين: يبقى الافتراضيّ */ }
};

/** لقطةٌ ثابتةٌ بين الكتابتين — قراءةُ المخزن في كلّ رسمةٍ لا داعيَ لها. */
const levelSnapshot = (): number => (levelCache ??= readStoredLevel());
const subscribeLevel = (cb: () => void) => {
  levelListeners.add(cb);
  return () => { levelListeners.delete(cb); };
};
const writeLevel = (level: number) => {
  levelCache = level;
  try { localStorage.setItem(MUSIC_LEVEL_KEY, String(level)); } catch { /* مُنع التخزين */ }
  levelListeners.forEach((cb) => cb());
};

const Ctx = createContext<Api | null>(null);

/** يقرؤه كلُّ زرِّ تشغيلٍ في القسم. خارج القسم لا مشغّل، فيردّ حالةً خاملة. */
export function useRadioPlayer(): Api {
  return useContext(Ctx) ?? {
    current: null, playing: false, failed: false, play: () => {}, isCurrent: () => false,
    variant: "music", time: 0, duration: 0, rate: 1, volume: 1, muted: false,
    musicLevel: DEFAULT_MUSIC_LEVEL,
    toggle: () => {}, seek: () => {}, skip: () => {}, cycleRate: () => {},
    setVolume: () => {}, setMuted: () => {}, setMusicLevel: () => {},
    switchTo: () => {}, setInlineVisible: () => {},
  };
}

export function RadioPlayerProvider({
  children,
  stationName,
  stationLogoUrl,
}: {
  children: React.ReactNode;
  /** اسمُ المحطّة وشعارُها: لا يُرسَمان هنا، بل يُمليان على النظام في شاشة القفل. */
  stationName: string;
  stationLogoUrl: string | null;
}) {
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
  // المقبضُ من المخزن لا من حالةٍ تنسخه — والخادمُ لا مخزنَ له فلقطتُه الافتراضيّ
  const musicLevel = useSyncExternalStore(subscribeLevel, levelSnapshot, () => DEFAULT_MUSIC_LEVEL);
  const [queue, setQueue] = useState<Track[]>([]);
  const [inlineVisible, setInlineVisible] = useState(false);
  /**
   * **تعثّرٌ يُقال.** كان عطلُ الصوت صامتًا تمامًا: لا مستمعَ لحدث `error`، وكلُّ
   * نداءِ `play()` ينتهي بـ`catch` يطفئ العَلَم ولا يقول شيئًا. فلو ردّ المخزنُ
   * ‏404 (مفتاحٌ استُبدل ولم يُحدَّث صفُّه) أو ‏403، ومض الزرُّ ولم يقع شيءٌ أبدًا،
   * ولا رسالةَ ولا إعادةَ محاولة — والزائرُ يحكم أنّ الموقع معطوب.
   *
   * ويخصّ **المسارَ القائد وحدَه**: تعثّرُ الموسيقى ليس عطلًا (تغيب لحظةً وتعود
   * في موضعها، وهو قرارٌ قائم)، فإعلانُه يقول عطلًا حيث يُسمَع الحديثُ سليمًا.
   */
  const [failed, setFailed] = useState(false);

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
  /** آخرُ موضعٍ كُتب في المخزن، فلا يُكتَب مع كلّ حدث. */
  const savedAt = useRef(0);

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

  /**
   * **الانتقالُ إلى التالية — مصدرٌ واحدٌ لبابين.**
   *
   * تُنادى حين تنتهي الحلقةُ وحدَها، وحين يُضغَط زرُّ «التالية» في شاشة القفل.
   * وكانت خطواتُها مكتوبةً في `onEnded` وحدَه، فلو نُسخت للزرّ لافترقتا يومًا
   * (عدّادُ الاستماع خاصّةً: نسيانُ تسليحه يجعل الحلقةَ الثانيةَ تُحسَب بما سُمع
   * من الأولى).
   *
   * وتردّ: أوُجد تالٍ أم انتهى الطابور.
   */
  const advance = useCallback((): boolean => {
    const [next, ...rest] = queue;
    aRef.current?.pause();
    bRef.current?.pause();
    // استماعةٌ انتهت، فما بعدها بدايةٌ جديدة تُحتسَب وحدَها.
    heard.current = 0; reported.current = false; lastAt.current = 0; savedAt.current = 0;
    setFailed(false);
    if (!next) return false;
    setCurrent(next);
    setQueue(rest);
    setLegacyVariant("music");
    setTime(0);
    setDuration(next.seconds ?? 0);
    return true;
  }, [queue]);

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

      /* تكملةُ ما سمعت: الموضعُ يُحفَظ كلَّ خمس ثوانٍ لا كلَّ حدث. و`timeupdate`
         يقع نحوَ أربع مرّاتٍ في الثانية، فالكتابةُ عنده آلافُ نداءاتِ تخزينٍ في
         حلقةٍ واحدة. وخمسٌ أقصى ما يخسره من أُغلق جهازُه فجأة. */
      if (current && Math.abs(t - savedAt.current) >= 5) {
        savedAt.current = t;
        saveProgress(current.id, t, a.duration || current.seconds || 0);
      }

      setTime(t);
    };
    const onMeta = () => { if (Number.isFinite(a.duration)) setDuration(a.duration); };
    const onPlay = () => setPlaying(true);
    // الوقوفُ يحفظ فورًا: هو أشهرُ ما يسبق إغلاقَ التبويب، فلا يُنتظَر به الخمس.
    const onPause = () => {
      setPlaying(false);
      if (current) saveProgress(current.id, a.currentTime, a.duration || current.seconds || 0);
    };
    // حلقةٌ سُمعت إلى آخرها تبدأ من أوّلها إن عاد إليها، فيُمسَح موضعُها.
    const onEnded = () => {
      if (current) clearProgress(current.id);
      if (!advance()) { setPlaying(false); setTime(0); }
    };
    const onSeeking = () => { seeking.current = true; };
    const onSeeked = () => { lastAt.current = a.currentTime; seeking.current = false; };
    // العطلُ يُعلَن، والنجاحُ يمحوه: من عادت إليه الشبكةُ لا يبقى أمامه إنذارٌ كاذب.
    const onError = () => { setFailed(true); setPlaying(false); };
    const onPlaying = () => setFailed(false);
    a.addEventListener("error", onError);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("seeking", onSeeking);
    a.addEventListener("seeked", onSeeked);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    onMeta();
    return () => {
      a.removeEventListener("error", onError);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("seeking", onSeeking);
      a.removeEventListener("seeked", onSeeked);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [leadEl, stemEl, variant, current, advance]);

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

  /** الموضعُ الذي تبدأ عنده الحلقةُ القادمة. يُملأ قبل `setCurrent` ويُقرأ بعد التركيب. */
  const startAt = useRef(0);

  const play = useCallback((t: Track, rest: Track[] = [], at?: number) => {
    // الحلقةُ نفسُها: إن طُلب موضعٌ وثبت إليه، وإلّا فالزرُّ يقلب التشغيل ولا يعيد من أوّلها.
    if (current?.id === t.id) {
      const a = leadEl();
      if (!a) return;
      if (at !== undefined) {
        a.currentTime = at;
        stemEl() && (stemEl()!.currentTime = at);
        setTime(at);
      }
      if (a.paused) void a.play().catch(() => setPlaying(false));
      else if (at === undefined) { a.pause(); stemEl()?.pause(); }
      return;
    }
    aRef.current?.pause();
    bRef.current?.pause();
    // موضعُ البدء: ما طُلب صراحةً، وإلّا ما حفظه المخزنُ إن استحقّ الاستئناف.
    const from = at ?? resumeAt(t.id, t.seconds ?? 0);
    startAt.current = from;
    setCurrent(t);
    setQueue(rest);
    setLegacyVariant("music");
    setTime(from);
    setDuration(t.seconds ?? 0);
    // استماعةٌ جديدة تبدأ، فيُسلَّح العدّادُ من جديد ويسقط إنذارُ ما قبلها.
    heard.current = 0; reported.current = false; lastAt.current = from; savedAt.current = from;
    setFailed(false);
  }, [current, leadEl, stemEl]);

  // حلقةٌ جديدة: تُحمَّل ثمّ تبدأ. والتشغيلُ هنا نتيجةُ نقرةِ المستخدم فلا يمنعه المتصفّح.
  useEffect(() => {
    if (!current) return;
    const a = aRef.current;
    if (!a) return;
    a.currentTime = startAt.current;
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
    // المخزنُ هو المصدر: يُكتَب ثمّ يُنادى قارئوه (فيُعاد الرسمُ بمقدارٍ واحدٍ لا بنسختين)
    writeLevel(level);

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

  const skip = (by: number) => {
    const a = leadEl();
    if (!a) return;
    seek(Math.min(Math.max(a.currentTime + by, 0), duration || a.currentTime));
  };

  const cycleRate = () =>
    setRate((r) => PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(r as (typeof PLAYBACK_RATES)[number]) + 1) % PLAYBACK_RATES.length] ?? 1);

  /**
   * **اختصاراتُ لوحة المفاتيح** — لا يملكها سبوتيفاي ولا أبل في الوِب، ويملكها
   * Pocket Casts فيُعدّ بها مشغّلًا لا مشغّلَ صفحة. وثمنُها مستمعٌ واحد.
   *
   * ══ والسهمان مقلوبان عمدًا ══
   * الزمنُ عندنا يمتلئ **من اليمين** (قرارُ المالك ٢٠٢٦-٠٨-١٨)، فالتقدّمُ يسارًا.
   * وهو ما يفعله المتصفّحُ نفسُه في `input[type=range]` داخل سياقٍ من اليمين إلى
   * اليسار: السهمُ الأيسرُ يزيد. فلو جعلنا الأيمنَ تقدّمًا لاختلف الاختصارُ عن
   * الأداة التي يقف عليها التركيزُ في الصفحة نفسِها.
   * و`J`/`L` لمن جاء من يوتيوب: حرفان لا اتّجاهَ فيهما فلا يلتبسان.
   *
   * ══ ولا تُخطَف مفاتيحُ أحد ══
   * تُتجاهَل إن كان التركيزُ في حقلٍ أو نصٍّ يُحرَّر، أو مع مُبدِّلٍ مضغوط
   * (‏`⌘`/`Ctrl`/`Alt`)، أو على عنصرٍ يعمل بالمسافة أصلًا (زرٌّ أو رابط) — وإلّا
   * صارت المسافةُ تشغّل الحلقةَ بدل أن تضغط الزرَّ الذي تحت إصبعك. ولا تعمل إلّا
   * وفي المشغّل حلقةٌ فعلًا، فلا يُسرَق مفتاحُ صفحةٍ لم يبدأ فيها صوت.
   */
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // زرٌّ أو رابطٌ تحت التركيز: المسافةُ والإدخالُ ملكُه لا ملكُنا.
      if ((tag === "BUTTON" || tag === "A" || tag === "SUMMARY") && (e.key === " " || e.key === "Enter")) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          toggle();
          return;
        case "ArrowLeft":
        case "l":
        case "L":
          e.preventDefault();
          skip(SKIP_SECONDS);
          return;
        case "ArrowRight":
        case "j":
        case "J":
          e.preventDefault();
          skip(-SKIP_SECONDS);
          return;
        case "m":
        case "M":
          e.preventDefault();
          setMuted((v) => !v);
          return;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mode, legacyVariant, duration, variant]);

  /**
   * **ما يقوله الجهازُ عن الحلقة** — شاشةُ القفل ومركزُ التحكّم وأزرارُ
   * السمّاعة. طبقةٌ فوق الزمام لا فرعٌ منه: تقرأ الحالَ وتنادي الأفعالَ نفسَها
   * التي تناديها الأزرارُ في الصفحة، فلا يفترق ما في جيبك عمّا في يدك.
   */
  useMediaSession({
    current, playing, time, rate,
    // زرُّ «التالية» يظهر حين يكون في الطابور تاليةٌ فعلًا، ويغيب فتعود مكانَه
    // أزرارُ القفز — فلا زرَّ ميّتٌ في شاشة القفل.
    hasNext: queue.length > 0,
    // المدّةُ من العنصر إن قرأها، وإلّا فالمحفوظةُ مع الحلقة — فالشريطُ في شاشة
    // القفل يقول زمنَه الصحيح من أوّل ثانيةٍ لا بعد أن يجهز الملفّ.
    duration: duration || current?.seconds || 0,
    stationName, stationLogoUrl,
    reins: { toggle, seek, skip, next: advance },
  });

  const api = useMemo<Api>(
    () => ({
      current, playing, failed, play, isCurrent: (id: string) => current?.id === id,
      variant, time, duration, rate, volume, muted,
      musicLevel,
      toggle, seek, skip, cycleRate, setVolume, setMuted, setMusicLevel,
      switchTo: (v: Variant) => void switchTo(v),
      setInlineVisible,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, playing, failed, play, variant, time, duration, rate, volume, muted, musicLevel, mode],
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
        <div className="radn-bar-space" aria-hidden />
        <div className={`radn-bar rad-tone-${current.tone}`}>
          <PlayerControls compact />
        </div>
        </>
      ) : null}
    </Ctx.Provider>
  );
}
