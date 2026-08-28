"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PLAY_THRESHOLD_SECONDS, PLAYBACK_RATES } from "@adeeb/core";
import { reportPlay } from "@/lib/radio/countPlay";
import { clearProgress, resumeAt, saveProgress } from "@/lib/radio/progress";
import { SKIP_SECONDS } from "../../dashboard/radio/vocab";
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
  toggle: () => void;
  seek: (t: number) => void;
  skip: (by: number) => void;
  cycleRate: () => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  switchTo: (v: Variant) => void;
  /** يُخبر المشغّلَ أنّ سطحًا داخليًّا حاضرٌ في النظر، فيكفّ الشريطُ الملازم. */
  setInlineVisible: (v: boolean) => void;
};

const Ctx = createContext<Api | null>(null);

/** يقرؤه كلُّ زرِّ تشغيلٍ في القسم. خارج القسم لا مشغّل، فيردّ حالةً خاملة. */
export function useRadioPlayer(): Api {
  return useContext(Ctx) ?? {
    current: null, playing: false, failed: false, play: () => {}, isCurrent: () => false,
    variant: "music", time: 0, duration: 0, rate: 1, volume: 1, muted: false,
    toggle: () => {}, seek: () => {}, skip: () => {}, cycleRate: () => {},
    setVolume: () => {}, setMuted: () => {},
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

  /**
   * ══ ملفٌّ واحدٌ يعمل، لا مساران يتزامنان (قرارُ المالك ٢٠٢٦-٠٨-٢٦) ═══════
   *
   * كانت الحلقةُ تُذاع بعنصرَي صوتٍ معًا (كلامٌ وموسيقى) يُمزَجان في المتصفّح،
   * فيتحرّك المقبضُ بينهما متّصلًا. وiOS معادٍ لهذا بطبعه: يخنق العنصرَ الثاني
   * أو يقاطعه، فتتقطّع الموسيقى بلا نمطٍ نملكه. رُصد على آيفون في سفاري وكروم
   * معًا (وكلاهما WebKit) على واي فاي، ٢٠٢٦-٠٨-٢٦.
   *
   * **والقيدُ فيزيائيٌّ لا عطب:** مقبضٌ متّصلٌ يعني مزجًا في المتصفّح، والمزجُ
   * لا يقع إلّا بعنصرين (مكسورٌ على iOS) أو بتنزيل الملفّ كاملًا وفكِّه قبل أوّل
   * كلمة (‏53 ميغا). فسقط المقبضُ المتّصل، وعاد الاختيارُ **ملفّين ممزوجَين
   * مسبقًا**: `music` كاملةً و`plain` بلا موسيقى. واحدٌ يعمل والآخرُ ساكن.
   *
   * وبه سقطت مزامنةُ الانزياح كلُّها: لا قائدَ ولا تابع، فلا شيءَ يُلاحَق.
   * ومسارُ `stem` يبقى في القاعدة للتطبيق الأصيل، ولا يقرؤه الويبُ بعد اليوم.
   */
  const srcA = current?.musicUrl;
  const srcB = current?.plainUrl;

  /** النسخةُ المسموعة: تُشتقّ من المقبض بالمسارين، وتُختار بالمبدّل في المكس. */
  const variant: Variant = legacyVariant;

  /** المسارُ الذي يملك الزمن: الصوتُ دائمًا بالمسارين، والعاملُ في المكس. */
  const leadEl = useCallback(
    () => (legacyVariant === "music" ? aRef.current : bRef.current),
    [legacyVariant],
  );

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
   * **مبدّلٌ جارٍ**: التبديلُ بين الملفّين يوقف الخارجَ بعد أن يبدأ الداخل، و
   * `pause` الخارجِ يُطلق مستمعَه فيقول «توقّف التشغيل» وهو لم يتوقّف. فكان
   * الزرُّ يقول «تشغيل» والصوتُ يعمل، وشاشةُ القفل تقول «متوقّف». وهذا الطريقُ
   * كان ميّتًا قبل اليوم (المسارانِ كانا يُمزَجان لا يتبادلان)، فظهر عيبُه حين
   * صار الطريقَ الوحيد.
   */
  const switching = useRef(false);
  /** سرعةُ المستمع في مرجع: مستمعُ `timeupdate` يُسجَّل مرّةً فلا يرى الحالةَ تتبدّل. */
  const rateRef = useRef(1);

  /**
   * المقاديرُ تُضبَط على العنصرين معًا لا على العامل وحده، وإلّا رجع المستمعُ
   * إلى سرعةٍ أخرى بمجرّد أن يبدّل، وهو لم يطلب ذلك.
   *
   * و`b` وحدَه يحمل المقبض: مقدارُه حاصلُ ضربِ صوتِ المستمع في مقدار الموسيقى،
   * فيبقى الكلامُ ثابتًا مهما تحرّك المقبض. وهذا هو المقبضُ كلُّه في سطر.
   */
  useEffect(() => {
    rateRef.current = rate;
    const a = aRef.current, b = bRef.current;
    for (const el of [a, b]) {
      if (!el) continue;
      // سرعةُ التابع يملكها مُلاحِقُ الانزياح، ولا تُضبَط هنا إلّا حين يكون واقفًا
      el.playbackRate = rate;
      el.muted = muted;
    }
    if (a) a.volume = volume;
    if (b) b.volume = volume;
  }, [rate, volume, muted, current]);

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
      if (switching.current) return;   // وقفةُ الخارجِ في التبديل ليست وقفةَ استماع
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
  }, [leadEl, variant, current, advance]);

  /** الموضعُ الذي تبدأ عنده الحلقةُ القادمة. يُملأ قبل `setCurrent` ويُقرأ بعد التركيب. */
  const startAt = useRef(0);

  const play = useCallback((t: Track, rest: Track[] = [], at?: number) => {
    // الحلقةُ نفسُها: إن طُلب موضعٌ وثبت إليه، وإلّا فالزرُّ يقلب التشغيل ولا يعيد من أوّلها.
    if (current?.id === t.id) {
      const a = leadEl();
      if (!a) return;
      if (at !== undefined) {
        a.currentTime = at;
        setTime(at);
      }
      if (a.paused) void a.play().catch(() => setPlaying(false));
      else if (at === undefined) a.pause();
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
  }, [current, leadEl]);

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
    setTime(t);
  }, [leadEl]);

  const toggle = () => {
    const a = leadEl();
    if (!a) return;
    if (a.paused) {
      const at = landing(variant === "plain", a.currentTime);
      if (at !== a.currentTime) seek(at);
      void a.play().catch(() => setPlaying(false));
    } else a.pause();
  };

  /**
   * المبدّل — قفزةٌ بين ملفّين ممزوجَين مسبقًا، بلا لحظةِ صمت.
   *
   * وفي المكس: الهدفُ يبدأ **ثمّ** يقف المصدر فلا تقع بينهما لحظةُ صمت، **ولا
   * يُسكَت المصدرُ إن لم يبدأ الهدف** — فإن ردّ المتصفّحُ `play()` (وهو يردّه
   * إذا انقطعت سلسلةُ إيماءة المستخدم بانتظارٍ غير متزامن) بقي المستمعُ في صمتٍ
   * تامّ ولا يدري لماذا. وقع فعلًا ورُصد في المعاينة، ٢٠٢٦-٠٨-١٣.
   */
  const switchTo = async (next: Variant) => {
    if (next === variant) return;

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
      switching.current = true;
      try { await to.play(); }
      catch { switching.current = false; return; }
      from.pause();
      // تُرفَع بعد دورةِ أحداثٍ كي يمرّ `pause` الخارجِ وهي مرفوعة
      setTimeout(() => { switching.current = false; }, 0);
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
  }, [current, legacyVariant, duration, variant]);

  /**
   * **ما يقوله الجهازُ عن الحلقة** — شاشةُ القفل ومركزُ التحكّم وأزرارُ
   * السمّاعة. طبقةٌ فوق الزمام لا فرعٌ منه: تقرأ الحالَ وتنادي الأفعالَ نفسَها
   * التي تناديها الأزرارُ في الصفحة، فلا يفترق ما في جيبك عمّا في يدك.
   */
  useMediaSession({
    current, playing, time, rate,
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
      toggle, seek, skip, cycleRate, setVolume, setMuted,
      switchTo: (v: Variant) => void switchTo(v),
      setInlineVisible,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, playing, failed, play, variant, time, duration, rate, volume, muted],
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
        <div className="stn-bar-space" aria-hidden />
        <div className="stn-bar">
          <PlayerControls compact />
        </div>
        </>
      ) : null}
    </Ctx.Provider>
  );
}
