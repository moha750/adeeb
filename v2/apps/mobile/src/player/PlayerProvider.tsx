import { useAudioPlayer } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_MUSIC_LEVEL,
  DRIFT_TOLERANCE,
  MUSIC_LEVEL_KEY,
  PLAY_THRESHOLD_SECONDS,
  PLAYBACK_RATES,
} from "@adeeb/core";

import { reportPlay } from "@/lib/countPlay";
import { readPref, subscribePrefs, writePref } from "@/lib/prefs";
import type { Episode } from "@/lib/radio";

/**
 * مشغّلُ المحطّة في الجوّال.
 *
 * منقولٌ عن `apps/web/src/app/radio/_player/PlayerProvider.tsx`، ويشترك معه في القلب:
 * **مساران يُشغَّلان معًا** (صوتٌ مجرَّد + طبقةُ موسيقى)، وما يُسمَع مجموعُهما،
 * و«بلا موسيقى» إخفاتُ الثاني. وقد قِيس هذا على جهازٍ حقيقيّ في 2026-08-18:
 * انزياحٌ ٣٥ مللي ثانية (والحدُّ المسموع ٥٠)، بلا حاجةٍ إلى تصحيحٍ واحد، ويصمد
 * والتطبيقُ في الخلفيّة. فالنمطُ نفسُه ينتقل كما هو.
 *
 * ══ وثلاثةُ فروقٍ عن الويب، كلُّها مقصودة ═══════════════════════════════
 *
 * ١) **لا مقياسَ صوتٍ ولا كتم.** في الجوّال هذان زرّان في حافّة الجهاز يملكهما
 *    النظام، فتكرارُهما في الشاشة يضع مقبضين لشيءٍ واحد.
 *
 * ٢) **لا تبديلَ بين ملفّين كاملين** (نمطُ `legacy` في الويب). قِيس زمنُ التبديل على
 *    الجهاز فبلغ ٦٧٢ مللي ثانيةً حين يحتاج الملفُّ الثاني تحميلًا، وهي فجوةُ صمتٍ
 *    تُسمَع. فالحلقةُ القديمة (بلا مسارين) تُشغَّل بمزيجها وحدَه ويغيب مقبضُها،
 *    وهو ما كان سيحصل لها في الويب أيضًا لو لم يكن التبديلُ هناك مجّانيًّا.
 *
 * ٣) **الزمنُ يُقرأ بمؤقّتٍ لا بحدث.** لا `timeupdate` في `expo-audio`؛ تُؤخَذ عيّنةٌ
 *    كلّ رُبع ثانية، وهو المعدّلُ الذي قِيس عليه الانزياحُ فثبت.
 */

/** فترةُ العيّنة: قراءةُ الزمن، وحسابُ ما سُمع، وضبطُ الانزياح. */
const SAMPLE_MS = 250;
/** سقفُ الخطوة المحسوبة سماعًا: ما فوقه وثبةٌ أو تجمّدٌ لا سماع. */
const MAX_STEP = 5;
/** ما نتسامح به من تقدّمٍ عند الاستئناف قبل أن نردَّ المستمعَ إلى موضعه. */
const RESUME_TOLERANCE = 0.35;



/* ══ مقبضُ الموسيقى: مخزنٌ خارجيٌّ يُقرأ، لا نسخةٌ منه في حالة ══
   نفسُ سببِ الويب: نسخُه إلى حالةٍ داخل أثرٍ يرسم المشغّلَ مرّةً بالافتراضيّ ثمّ
   يعيد رسمَه بقيمة صاحبه، فتُرى قفزةُ المقبض. */
function readLevel(): number {
  const raw = readPref(MUSIC_LEVEL_KEY);
  if (raw === null) return DEFAULT_MUSIC_LEVEL; // الغيابُ يُفحَص قبل التحويل: Number(null) صفرٌ مقبولٌ في المدى
  const saved = Number(raw);
  return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_MUSIC_LEVEL;
}

export type Variant = "music" | "plain";

type Api = {
  current: Episode | null;
  playing: boolean;
  /** أتعثّر تحميلُ المسار القائد؟ يقرؤه السطحُ فيقول ذلك بدل أن يصمت. */
  failed: boolean;
  /** الحلقةُ لها مقبضٌ فعلًا (رُفعت بمسارين). يقرؤه السطحُ فيُظهر المقبضَ أو يخفيه. */
  hasDial: boolean;
  variant: Variant;
  time: number;
  duration: number;
  rate: number;
  musicLevel: number;

  play: (episode: Episode, rest?: Episode[]) => void;
  isCurrent: (id: string) => boolean;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (by: number) => void;
  cycleRate: () => void;
  setMusicLevel: (v: number) => void;
  /** يُخبر المشغّلَ أنّ سطحًا داخليًّا حاضرٌ في النظر، فيكفّ الشريطُ الملازم. */
  setInlineVisible: (v: boolean) => void;
  inlineVisible: boolean;
};

const IDLE: Api = {
  current: null, playing: false, failed: false, hasDial: false, variant: "music",
  time: 0, duration: 0, rate: 1, musicLevel: DEFAULT_MUSIC_LEVEL,
  play: () => {}, isCurrent: () => false, toggle: () => {}, seek: () => {}, skip: () => {},
  cycleRate: () => {}, setMusicLevel: () => {}, setInlineVisible: () => {}, inlineVisible: false,
};

const Ctx = createContext<Api | null>(null);

export function useRadioPlayer(): Api {
  return useContext(Ctx) ?? IDLE;
}

export function RadioPlayerProvider({ children, stationName }: { children: ReactNode; stationName: string }) {
  const [current, setCurrent] = useState<Episode | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [inlineVisible, setInlineVisible] = useState(false);

  const musicLevel = useSyncExternalStore(subscribePrefs, readLevel, readLevel);

  /** الحلقةُ بمسارين تملك مقبضًا؛ وما عداها يُشغَّل بمزيجه. */
  const hasDial = Boolean(current?.plainUrl && current?.stemUrl);
  const leadSrc = hasDial ? current?.plainUrl : (current?.mixedUrl ?? current?.plainUrl);
  const stemSrc = hasDial ? current?.stemUrl : null;

  const lead = useAudioPlayer(leadSrc ?? null, { updateInterval: SAMPLE_MS });
  const stem = useAudioPlayer(stemSrc ?? null, { updateInterval: SAMPLE_MS });

  const variant: Variant = hasDial && musicLevel === 0 ? "plain" : "music";

  /* عدّادُ الاستماع — يُقاس سماعًا حقيقيًّا لا زمنًا يمرّ */
  const heard = useRef(0);
  const reported = useRef(false);
  const lastAt = useRef(0);
  /** يُرفَع حول كلّ وثبةٍ نُحدثها نحن، فلا تُحسَب الوثبةُ سماعًا. */
  const jumping = useRef(false);
  /**
   * الموضعُ الذي وقف عنده المستمع، يُحرَس حتّى يعود إليه فعلًا.
   *
   * **لماذا يُحرَس أصلًا:** `expo-audio` تستأنف بـ`playImmediately(atRate:)`، وهي
   * تبدأ «بأسرع ما يمكن» فإن لم يكن الموضعُ المحفوظ جاهزًا في الذاكرة قفزت إلى
   * أوّل ما تجده جاهزًا. فيُسمَع الاستئنافُ متقدّمًا ثانيةً أو ثانيتين عمّا وقف عليه،
   * وهو ما لاحظه المالك. فنحفظ الموضعَ عند الوقوف ونردُّه إن انزاح.
   */
  const resumeAt = useRef<number | null>(null);
  /** آخرُ حالٍ رأيناها، كي نعرف متى وقف ومتى استأنف. */
  const wasPlaying = useRef(false);

  const armCounters = useCallback(() => {
    heard.current = 0;
    reported.current = false;
    lastAt.current = 0;
  }, []);

  /* ── السرعةُ ومقدارُ الموسيقى: على المسارين معًا ──
     الكلامُ ثابتٌ دائمًا، والمقبضُ على مسار الموسيقى وحدَه. هذا هو المقبضُ كلُّه في سطر. */
  useEffect(() => {
    /**
     * السرعةُ تُضبَط بدالّةٍ لا بإسناد: `playbackRate` في `expo-audio` **قارئٌ فقط**،
     * والإسنادُ إليه يرمي `Cannot assign to property which has only a getter` فيسقط
     * التطبيقُ عند أوّل حلقة. (وقع فعلًا 2026-08-18، ونوعُ الحزمة يعلنها حقلًا فلم
     * يمسكه فحصُ الأنواع.)
     *
     * و`"high"` تصحيحُ الحدّة: الحلقةُ حديثٌ يُسمَع مسرَّعًا، وبلا التصحيح يصير
     * صوتُ المذيع سنجابًا عند ١٫٥×.
     */
    lead.setPlaybackRate(rate, "high");
    lead.volume = 1;
    stem.setPlaybackRate(rate, "high");
    stem.volume = hasDial ? musicLevel : 0;
  }, [lead, stem, rate, musicLevel, hasDial, current]);

  /** الصمتُ لا يُبدأ فيه: من أطفأ الموسيقى والمقدّمةُ لم تنتهِ يُنقَل إلى الكلام. */
  const landing = useCallback(
    (silent: boolean, t: number) => (silent && current && t < current.talkStartsAt ? current.talkStartsAt : t),
    [current]
  );

  const seek = useCallback(
    (t: number) => {
      jumping.current = true;
      // بلا سماحيّة (0, 0): بحثٌ دقيقٌ لا أقربَ إطارٍ مفتاحيّ
      void lead.seekTo(t, 0, 0).finally(() => {
        lastAt.current = t;
        jumping.current = false;
      });
      if (hasDial) void stem.seekTo(t, 0, 0);
      setTime(t);
    },
    [lead, stem, hasDial]
  );

  /** الانتقالُ إلى التالية — مصدرٌ واحدٌ لبابيه: نهايةُ الحلقة وزرُّ شاشة القفل. */
  const advance = useCallback((): boolean => {
    const [next, ...rest] = queue;
    lead.pause();
    stem.pause();
    armCounters(); // استماعةٌ انتهت، فما بعدها بدايةٌ تُحتسَب وحدَها
    setFailed(false);
    if (!next) {
      setPlaying(false);
      setTime(0);
      return false;
    }
    setCurrent(next);
    setQueue(rest);
    setTime(0);
    setDuration(next.seconds ?? 0);
    return true;
  }, [queue, lead, stem, armCounters]);

  /* ══ العيّنة: الزمنُ وما سُمع وضبطُ الانزياح ══ */
  useEffect(() => {
    if (!current) return;

    const id = setInterval(() => {
      const t = lead.currentTime;

      if (lead.duration > 0 && Math.abs(lead.duration - duration) > 1) setDuration(lead.duration);
      if (lead.playing !== playing) setPlaying(lead.playing);
      if (lead.isLoaded && failed) setFailed(false);

      /**
       * رصدُ الوقوف والاستئناف **من الحال لا من الزرّ**.
       *
       * فالإيقافُ يأتي من أبوابٍ لا تمرّ بشيفرتنا: زرُّ شاشة القفل، ونزعُ السمّاعة،
       * ومكالمةٌ تُقاطع. ولو حفظنا الموضعَ في زرّنا وحدَه لضاع في هذه كلِّها.
       */
      if (wasPlaying.current && !lead.playing) resumeAt.current = t;
      wasPlaying.current = lead.playing;

      if (lead.playing) {
        // ردُّ الاستئناف إلى موضعه: مرّةً واحدةً بعد أوّل تشغيل، ثمّ يُنسى
        const saved = resumeAt.current;
        if (saved !== null) {
          resumeAt.current = null;
          if (t - saved > RESUME_TOLERANCE) {
            seek(saved);
            return;
          }
        }

        const step = t - lastAt.current;
        // ما جاء عبر وثبةٍ لا يُحسَب، وما عداه سماعٌ ما دام موجبًا دون السقف
        if (!jumping.current && step > 0 && step < MAX_STEP) heard.current += step;
        lastAt.current = t;

        if (!reported.current && heard.current >= PLAY_THRESHOLD_SECONDS) {
          reported.current = true;
          void reportPlay(current.id, variant === "plain");
        }

        /**
         * ضبطُ الانزياح — ولا يُضبَط مسارٌ ما زال يُحمّل.
         * فلو تعثّرت الموسيقى في الشبكة تجمّد زمنُها، فلو قفزنا بها أعدنا التحميلَ
         * من موضعٍ جديد فتعثّرت ثانيةً ودارت الرحى. وأثناء تعثّرها لا يُوقَف الكلام:
         * الموسيقى سريرٌ يغيب لحظةً ثمّ يعود، وإيقافُ الحديث لأجلها أسوأُ من غيابها.
         */
        if (hasDial && musicLevel > 0 && stem.isLoaded && stem.playing) {
          if (Math.abs(stem.currentTime - t) > DRIFT_TOLERANCE) void stem.seekTo(t, 0, 0);
        }
      }

      setTime(t);
    }, SAMPLE_MS);

    return () => clearInterval(id);
  }, [current, lead, stem, hasDial, musicLevel, variant, duration, playing, failed, seek]);

  /* ══ نهايةُ الحلقة ══
     لا حدثَ `ended` في expo-audio؛ الحالةُ تقول `didJustFinish` عبر المستمع. */
  useEffect(() => {
    const sub = lead.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) advance();
    });
    return () => sub.remove();
  }, [lead, advance]);

  /* ══ مصالحةُ مسار الموسيقى بالحال ══
     مكانٌ واحدٌ يقرّر أيعمل أم يقف. ولا يُبَثّ ما لا يُسمَع: من أنزل المقبضَ إلى
     الصفر أُوقف مسارُه فلم يُحمَّل، فوفّر عليه عشراتِ الميغابايتات من باقيته. */
  useEffect(() => {
    if (!hasDial) return;
    if (playing && musicLevel > 0) {
      if (!stem.playing) {
        stem.play();
        // ضبطةٌ بعد البدء لا قبله: مهلةُ البدء تصير تأخّرًا ثابتًا يرافق الحلقةَ إلى آخرها
        void stem.seekTo(lead.currentTime, 0, 0);
      }
    } else if (stem.playing) {
      stem.pause();
    }
  }, [playing, musicLevel, hasDial, stem, lead]);

  /**
   * ما يقوله الجهازُ عن الحلقة: شاشةُ القفل ومركزُ التحكّم وأزرارُ السمّاعة.
   *
   * ويُعاد ادّعاؤه عند كلّ بدءِ تشغيلٍ لا مرّةً عند الحلقة وحدَها: النظامُ يسلّم
   * المركزَ لآخر من ادّعاه، فلو شغّل المستمعُ شيئًا آخر ثمّ عاد إلينا وجدنا المركزَ
   * قد ذهب، وادّعاءٌ واحدٌ عند الحلقة لا يستردّه.
   */
  const claimLockScreen = useCallback(() => {
    if (!current) return;
    lead.setActiveForLockScreen(
      true,
      {
        title: current.title,
        artist: current.showTitle,
        albumTitle: stationName,
        artworkUrl: current.coverUrl ?? undefined,
      },
      { showSeekForward: true, showSeekBackward: true, isLiveStream: false }
    );
  }, [current, lead, stationName]);

  /* ══ حلقةٌ جديدة: تبدأ من أوّلها، وتُملي نفسَها على شاشة القفل ══ */
  useEffect(() => {
    if (!current) return;
    void lead.seekTo(0, 0, 0);
    lead.play();
    setPlaying(true);

    claimLockScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  /* ══ الأفعال ══ */

  const play = useCallback(
    (episode: Episode, rest: Episode[] = []) => {
      // الحلقةُ نفسُها: الزرُّ يقلب التشغيل ولا يعيد من أوّلها
      if (current?.id === episode.id) {
        if (lead.playing) {
          lead.pause();
          stem.pause();
          setPlaying(false);
        } else {
          lead.play();
          setPlaying(true);
          claimLockScreen();
        }
        return;
      }
      lead.pause();
      stem.pause();
      setCurrent(episode);
      setQueue(rest);
      setTime(0);
      setDuration(episode.seconds ?? 0);
      armCounters();
      setFailed(false);
    },
    [current, lead, stem, armCounters, claimLockScreen]
  );

  const toggle = useCallback(() => {
    if (!current) return;
    if (lead.playing) {
      lead.pause();
      stem.pause();
      setPlaying(false);
    } else {
      const at = landing(variant === "plain", lead.currentTime);
      if (at !== lead.currentTime) seek(at);
      lead.play();
      setPlaying(true);
      claimLockScreen();
    }
  }, [current, lead, stem, landing, variant, seek, claimLockScreen]);

  const skip = useCallback(
    (by: number) => {
      const max = duration || lead.duration || lead.currentTime;
      seek(Math.min(Math.max(lead.currentTime + by, 0), max));
    },
    [lead, duration, seek]
  );

  const cycleRate = useCallback(() => {
    setRate((r) => PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(r as (typeof PLAYBACK_RATES)[number]) + 1) % PLAYBACK_RATES.length] ?? 1);
  }, []);

  /**
   * المقبض. وإنزالُه إلى الصفر في المقدّمة الموسيقيّة ينقل المستمعَ إلى الكلام،
   * فلا يجلس في صمتٍ لا يفهم سببَه.
   */
  const setMusicLevel = useCallback(
    (v: number) => {
      const level = Math.max(0, Math.min(1, v));
      writePref(MUSIC_LEVEL_KEY, String(level));
      if (level === 0 && hasDial) {
        const at = landing(true, lead.currentTime);
        if (at !== lead.currentTime) seek(at);
      }
    },
    [hasDial, landing, lead, seek]
  );

  const api = useMemo<Api>(
    () => ({
      current, playing, failed, hasDial, variant, time, duration, rate, musicLevel,
      play, isCurrent: (id: string) => current?.id === id,
      toggle, seek, skip, cycleRate, setMusicLevel, setInlineVisible, inlineVisible,
    }),
    [current, playing, failed, hasDial, variant, time, duration, rate, musicLevel,
     play, toggle, seek, skip, cycleRate, setMusicLevel, inlineVisible]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
