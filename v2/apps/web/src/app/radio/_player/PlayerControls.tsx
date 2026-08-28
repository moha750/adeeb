"use client";

import Link from "next/link";
import { Alert, countPhrase } from "@adeeb/design-system";
import {
  MusicNotes, Play, Pause, SpeakerSimpleNone,
  SpeakerHigh, SpeakerSlash,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowClockwise } from "@/app/_components/glyphs";
import { useWaveBars } from "@/lib/radio/useWaveBars";
import { useSavedPosition } from "@/lib/radio/progress";
import { formatDuration, SKIP_SECONDS } from "../../dashboard/radio/vocab";
import { useRadioPlayer, type Track } from "./PlayerProvider";

/**
 * أدواتُ المشغّل — **سطحان وجسدٌ واحد.**
 *
 * القطعُ تُبنى مرّةً (`transport` و`takes` و`rate` و`volume`)، ثمّ تُركَّب
 * تركيبين: **مراتبَ** في المشغّل داخل الصفحة (`compact=false`) و**صفًّا واحدًا**
 * في الشريط الملازم (`compact=true`). فلا تُكتب مرّتين ولا تفترقان يومًا.
 *
 * و`track` للحال التي لم يبدأ فيها شيء بعد: المشغّلُ الداخليّ يعرض حلقتَه قبل
 * أن تُضغط، فيكون الزرُّ **بادئًا** لا مبدّلًا.
 */
/**
 * الموجة — **عددُ أعمدتها يُشتقّ من عرضها المقيس**، لا من رقمٍ ثابت. وكان ثابتًا
 * (‏١٢٠) فانحدر العمودُ على الجوّال إلى ‏0.39px، وما دون البكسل يُدهَن ولا يُرسَم؛
 * الحكايةُ كاملةً في `lib/radio/peaks.ts` والمقارنةُ في `/ui/waveform`.
 *
 * ومكوّنٌ مستقلٌّ لأنّ فيه خطّافًا: أصلُ الأدوات يرجع باكرًا حين لا حلقةَ معروضة،
 * فلا يصحّ أن يُعلَّق خطّافٌ بعد ذلك الرجوع.
 */
function Wave({ peaks, pct, seconds, marks, seeker }: {
  peaks: number[]; pct: number; seconds: number;
  /** أوقاتُ المحاور تُرسَم علاماتٍ فوق الموجة، فيُرى المفصلُ قبل أن يُقرأ. */
  marks: number[];
  seeker: React.ReactNode;
}) {
  const { ref, bars } = useWaveBars(peaks);
  const played = Math.round(bars.length * (pct / 100));

  return (
    <div className="stn-wave-wrap">
      {marks.length && seconds > 0 ? (
        <div className="stn-marks" aria-hidden>
          {marks.map((at) => <b key={at} style={{ insetInlineStart: `${(at / seconds) * 100}%` }} />)}
        </div>
      ) : null}
      <div className="stn-wave" ref={ref}>
        {bars.map((v, i) => (
          <i key={i} className={i < played ? "on" : undefined} style={{ height: `${v}%` }} />
        ))}
        <span className="stn-head" style={{ insetInlineStart: `${pct}%` }} aria-hidden />
        {seeker}
      </div>
    </div>
  );
}

export function PlayerControls({
  compact, track, rest = [], startAt = 0, marks,
}: {
  compact: boolean;
  track?: Track;
  rest?: Track[];
  /** أوقاتُ المحاور، تُرسَم علاماتٍ على الموجة. */
  marks?: number[];
  /** موضعُ بدءٍ جاء من الرابط (`?t=`). يسبق ما حفظه المخزن، فالرابطُ قصدٌ صريح. */
  startAt?: number;
}) {
  const p = useRadioPlayer();
  const shown = p.current ?? track ?? null;
  /**
   * تكملةُ ما سمعت: قبل أوّل ضغطةٍ يقف المؤشّرُ حيث وقف صاحبُه، فتقول الموجةُ
   * «تُستأنَف من هنا» بلا رسالةٍ تُكتب. وبعد أن يبدأ يصير الوقتُ من العنصر.
   *
   * **وقبل الرجوع الباكر**: الأصلُ يرجع حين لا حلقةَ معروضة، وخطّافٌ بعد ذلك
   * الرجوع لا يصحّ (وهو سببُ استقلال `Wave` بمكوّنها). فيُنادى بمعرّفٍ فارغٍ
   * حين لا حلقة، ويردّ صفرًا.
   */
  const saved = useSavedPosition(shown?.id ?? "", shown?.seconds ?? 0);
  if (!shown) return null;

  const isThis = !track || p.current?.id === track.id;
  const seconds = isThis && p.duration > 0 ? p.duration : shown.seconds ?? 0;
  // الرابطُ يسبق المخزن: من فُتح له موضعٌ بعينه قُصد به، ومن عاد بلا رابطٍ يُستأنَف.
  const time = isThis ? p.time : startAt || saved;
  const pct = seconds > 0 ? Math.min(100, (time / seconds) * 100) : 0;
  const playing = isThis && p.playing;

  /**
   * موجةُ النسخة العاملة. **تتبدّل مع المبدّل** فلا تُعرَض موجةُ الموسيقى لمن
   * يسمع المجرّدة: تلك صاخبةٌ في المقدّمة وهذه صامتةٌ فيها، فموجةٌ واحدةٌ لهما
   * تكذب على الأذن.
   */
  const peaks = p.variant === "plain" ? shown.plainPeaks : shown.musicPeaks;
  const hasWave = !compact && Boolean(peaks?.length);

  const onPlay = () => {
    if (track && p.current?.id !== track.id) p.play(track, rest, startAt || undefined);
    else p.toggle();
  };

  /**
   * المؤشّرُ يقول **وقتًا لا عددَ ثوانٍ**.
   *
   * القيمةُ الخام ثوانٍ، فقارئُ الشاشة كان ينطق «‏٧٤٣» مع كلّ ضغطةِ سهم، وهو
   * رقمٌ لا يُقاس عليه شيء. و`aria-valuetext` يستبدل بالمنطوق نصًّا، فيقال
   * «‏12:23 من 21:27». والوجهةُ لا تُفهَم من الرقم وحدَه، فذُكرت المدّةُ معه.
   */
  const seeker = (
    <input
      className="stn-seek"
      type="range" min={0} max={seconds || 0} step={1}
      value={Math.min(time, seconds || time)}
      onChange={(e) => p.seek(Number(e.target.value))}
      disabled={!isThis}
      aria-label="موضع الاستماع"
      aria-valuetext={
        seconds > 0
          ? `${formatDuration(time) || "0:00"} من ${formatDuration(seconds)}`
          : formatDuration(time) || "0:00"
      }
    />
  );

  /** المِزلاقُ يقول نسبةً مئويّة، فـ«‏0.65» ليست مقدارًا يُفهَم. */
  const pctText = (v: number) => `${Math.round(v * 100)}٪`;

  /* ── القطع ── */

  /**
   * تسميةُ القفزة **تُشتقّ من مقدارها ولا تُكتب بيدٍ**: كانت «خمس عشرة ثانية»
   * محفورةً في النصّ بينما الرقمُ المرسومُ من `SKIP_SECONDS`، فلمّا هبط المقدارُ
   * إلى عشرٍ في `@adeeb/core` صار الزرُّ يقول للعين عشرًا ولقارئ الشاشة خمسَ
   * عشرةَ (رُصد ٢٠٢٦-٠٨-١٨). و`countPhrase` تصرّفها عربيًّا من مصدرها الواحد.
   */
  const skipPhrase = countPhrase(SKIP_SECONDS, { one: "ثانية", two: "ثانيتان", few: "ثوانٍ" });

  const transport = (
    <div className="stn-trans">
      <button type="button" className="stn-skip" onClick={() => p.skip(-SKIP_SECONDS)}
        disabled={!isThis} aria-label={`الرجوع ${skipPhrase}`}>
        <ArrowCounterClockwise aria-hidden />
        <b>{SKIP_SECONDS}</b>
      </button>
      <button type="button" className="stn-play" onClick={onPlay}
        aria-label={playing ? `إيقاف ${shown.title}` : `تشغيل ${shown.title}`}>
        {playing ? <Pause size={22} weight="fill" aria-hidden /> : <Play size={22} weight="fill" aria-hidden />}
      </button>
      <button type="button" className="stn-skip" onClick={() => p.skip(SKIP_SECONDS)}
        disabled={!isThis} aria-label={`التقدّم ${skipPhrase}`}>
        <ArrowClockwise aria-hidden />
        <b>{SKIP_SECONDS}</b>
      </button>
    </div>
  );

  const chapterMarks = marks ?? [];
  const wave = hasWave
    ? <Wave peaks={peaks!} pct={pct} seconds={seconds} marks={chapterMarks} seeker={seeker} />
    : null;

  /**
   * **الثلاثةُ بثواني المادّة، ولا يُقسَم أحدُها على السرعة.**
   *
   * جرّبتُ قسمةَ «بقي» وحدَها فصار السطرُ يقول ‏0:02 و‏5:47 و‏11:36 معًا، وهو
   * تناقضٌ حسابيٌّ على سطرٍ واحد. فزمنُ المستمع يُقال في سطرٍ **مستقلٍّ مسمًّى**
   * لا يظهر إلّا حين تتغيّر السرعة.
   */
  const times = (
    <div className="stn-times">
      <span><bdi dir="ltr">{formatDuration(time) || "0:00"}</bdi></span>
      {seconds > 0 ? <span className="stn-left">بقي {formatDuration(seconds - time)}</span> : null}
      <span><bdi dir="ltr">{formatDuration(seconds) || "0:00"}</bdi></span>
    </div>
  );

  /**
   * **أداةُ الموسيقى: مراتبُ مسمّاة** (قرار المالك ٢٠٢٦-٠٨-١٨، سجلُّه `/ui/radio-controls`).
   *
   * كان ههنا شيئان يفعلان فعلًا واحدًا: مبدّلٌ بطرفين ومِزلاقٌ متّصلٌ طرفاه هما
   * المبدّلُ عينُه، متجاورين في صفٍّ واحد. وسقطت جولةُ تسميةٍ كاملةٌ قبل أن يتبيّن
   * أنّ العلّةَ ليست في الاسم: **المِزلاقُ يُخفي مداه بطبيعته**، ولا سابقةَ لهذه
   * الميزة في مشغّلٍ يستند إليها المستمع، فيُقرأ مِزلاقًا عامًّا ويُتجاوَز.
   *
   * فصارت المراتبُ تعرض المدى كلَّه دفعةً، وكلُّ موضعٍ يحمل اسمَه. **وأداةٌ واحدةٌ
   * لا اثنتان**، فماتت ازدواجيّةُ البابين في أصلها لا في عَرَضها.
   *
   * **والمكسُ القديم يبقى مبدّلًا بطرفين**: ملفّان لا يُمزَجان فليس فيهما ما يُخفَت،
   * وعرضُ «خافتة» عليه وعدٌ لا يُوفى. والمراتبُ والمقاديرُ من `@adeeb/core`
   * فيقرؤها الويبُ والجوّالُ من بيتٍ واحد.
   */
  /**
   * **نسخةُ الاستماع: ملفٌّ ممزوجٌ أو كلامٌ مجرّد** (قرارُ المالك ٢٠٢٦-٠٨-٢٦).
   *
   * كان مِزلاقًا متّصلًا يمزج مسارين في المتصفّح، وiOS يخنق أحدهما فتتقطّع
   * الموسيقى. والمزجُ الحيُّ لا سبيلَ إليه هناك، فصار الاختيارُ بين ملفّين
   * جاهزين: واحدٌ يعمل والآخرُ ساكن، فلا شيءَ يُزامَن ولا شيءَ يتقطّع.
   */
  const takes = shown.plainUrl ? (
    <div className="stn-takes" role="group" aria-label="نسخة الاستماع">
      <button type="button" className="stn-opt" aria-pressed={p.variant === "music"}
        onClick={() => void p.switchTo("music")} disabled={!isThis}>
        <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span>بموسيقى</span>
      </button>
      <button type="button" className="stn-opt" aria-pressed={p.variant === "plain"}
        onClick={() => void p.switchTo("plain")} disabled={!isThis}>
        <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span>بلا موسيقى</span>
      </button>
    </div>
  ) : null;

  const rate = (
    <button type="button" className="stn-opt" onClick={p.cycleRate}
      aria-label={`سرعة التشغيل ${p.rate}، اضغط لتغييرها`}>
      السرعة <bdi dir="ltr" className="font-latin">{p.rate}×</bdi>
    </button>
  );

  const volume = (
    <div className="stn-vol">
      <button type="button" className="stn-vol-b" onClick={() => p.setMuted(!p.muted)}
        aria-label={p.muted ? "إلغاء الكتم" : "كتم الصوت"}>
        {p.muted ? <SpeakerSlash size={17} aria-hidden /> : <SpeakerHigh size={17} aria-hidden />}
      </button>
      <input
        className="stn-vol-input"
        type="range" min={0} max={1} step={0.05}
        value={p.muted ? 0 : p.volume}
        onChange={(e) => { const v = Number(e.target.value); p.setVolume(v); p.setMuted(v === 0); }}
        aria-label="مستوى الصوت"
        aria-valuetext={pctText(p.muted ? 0 : p.volume)}
      />
    </div>
  );

  /* ── التركيبان ── */

  /**
   * **التركيب النحيل** (قرار المالك ٢٠٢٦-٠٨-١٣): بعد أن صار المشغّلُ داخلَ
   * صفحة الحلقة، لم يعد الشريطُ لوحةَ قيادة — أدواتُه تكرارٌ لما في الصفحة —
   * بل **تذكيرًا** يقول «ما زلتَ تسمع هذا» ويعيدك إليه.
   *
   * فلا يبقى فيه إلّا الغلافُ والعنوانُ وزرُّ تشغيلٍ واحد، والتقدّمُ **خطٌّ على
   * حافّته العليا** يقول الموضعَ بالنظر ولا يأخذ صفًّا.
   *
   * والصفُّ كلُّه يعيدك إلى الحلقة **برابطٍ ممدود** لا بزرٍّ داخل رابط (وسمٌ
   * باطل)، وزرُّ التشغيل يعلوه بطبقةٍ فينجو من ظلّه — سابقةُ صفّ الحلقة نفسُها.
   */
  if (compact) {
    return (
      <>
        <span className="stn-bar-line" aria-hidden><i style={{ width: `${pct}%` }} /></span>
        <span className="stn-bar-art">
          {shown.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={shown.coverUrl} alt="" />
            : <span className="stn-art-n">{shown.showTitle.trim()[0]}</span>}
        </span>
        <span className="stn-bar-b">
          <Link href={`/radio/${shown.showSlug}/${shown.episodeSlug}`} className="stn-bar-t">
            {shown.title}
          </Link>
          <span className="stn-bar-s">{shown.showTitle}</span>
        </span>
        {seconds > 0 ? (
          <span className="stn-bar-time">
            <bdi dir="ltr">{formatDuration(time)} / {formatDuration(seconds)}</bdi>
          </span>
        ) : null}
        <button type="button" className="stn-bar-btn is-main" onClick={onPlay}
          aria-label={playing ? `إيقاف ${shown.title}` : `تشغيل ${shown.title}`}>
          {playing ? <Pause size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
        </button>
      </>
    );
  }

  return (
    <>
      {/**
        * تعثّرُ الصوت **يُقال ولا يُصمَت عليه**: كان الزرُّ يومض ولا يقع شيء،
        * فيحكم الزائرُ على الموقع لا على الشبكة. و`Alert` مكوّنُ المكتبة كما هو
        * (ق١) وفيه `role="alert"` فيُنطَق لمن يسمع الصفحةَ ولا يراها.
        */}
      {isThis && p.failed ? (
        <Alert tone="warning" compact>تعذّر تحميلُ الصوت. تحقّق من اتّصالك ثمّ أعِد المحاولة.</Alert>
      ) : null}
      {wave}
      {times}
      {p.rate !== 1 && seconds > 0 ? (
        <p className="stn-rate-note">
          بسرعة <bdi dir="ltr" className="font-latin">{p.rate}×</bdi>، ينتهي بعد{" "}
          {formatDuration((seconds - time) / p.rate)} من وقتك
        </p>
      ) : null}
      {transport}
      <div className="stn-opts">
        {takes}
        {rate}
        {volume}
      </div>
    </>
  );
}
