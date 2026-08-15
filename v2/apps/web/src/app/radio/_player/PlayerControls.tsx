"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  MicrophoneStage, MusicNotes, MusicNotesMinus, Play, Pause, SpeakerSimpleNone,
  SpeakerHigh, SpeakerSlash,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowClockwise } from "@/app/_components/glyphs";
import { downsample } from "@/lib/radio/peaks";
import { formatDuration } from "../../dashboard/radio/vocab";
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
export function PlayerControls({
  compact, track, rest = [],
}: {
  compact: boolean;
  track?: Track;
  rest?: Track[];
}) {
  const p = useRadioPlayer();
  /** آخرُ مقدارٍ سُمعت به الموسيقى، فزرُّ الإطفاء يعيدها إليه لا إلى الأقصى. */
  const lastMusic = useRef(1);
  const shown = p.current ?? track ?? null;
  if (!shown) return null;

  const isThis = !track || p.current?.id === track.id;
  const seconds = isThis && p.duration > 0 ? p.duration : shown.seconds ?? 0;
  const time = isThis ? p.time : 0;
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
    if (track && p.current?.id !== track.id) p.play(track, rest);
    else p.toggle();
  };

  const seeker = (
    <input
      className="rad-scrub-input"
      type="range" min={0} max={seconds || 0} step={1}
      value={Math.min(time, seconds || time)}
      onChange={(e) => p.seek(Number(e.target.value))}
      disabled={!isThis}
      aria-label="موضع الاستماع"
    />
  );

  /* ── القطع ── */

  const transport = (
    <div className={compact ? "rad-bar-ctrl" : "radp-transport"}>
      <button type="button" className="rad-skip rad-skip-n" onClick={() => p.skip(-15)}
        disabled={!isThis} aria-label="خمس عشرة ثانية إلى الوراء">
        <ArrowCounterClockwise size={16} aria-hidden /><span className="font-latin">15</span>
      </button>
      <button type="button" className="rad-play" onClick={onPlay}
        aria-label={playing ? `إيقاف ${shown.title}` : `تشغيل ${shown.title}`}>
        {playing ? <Pause size={compact ? 18 : 24} aria-hidden /> : <Play size={compact ? 18 : 24} aria-hidden />}
      </button>
      <button type="button" className="rad-skip rad-skip-n" onClick={() => p.skip(15)}
        disabled={!isThis} aria-label="خمس عشرة ثانية إلى الأمام">
        <ArrowClockwise size={16} aria-hidden /><span className="font-latin">15</span>
      </button>
    </div>
  );

  const wave = hasWave ? (
    <div className="radw">
      {downsample(peaks!).map((v, i, arr) => (
        <span key={i} className={"radw-bar" + (i < Math.round(arr.length * (pct / 100)) ? " is-played" : "")}
          style={{ height: `${v}%` }} />
      ))}
      {seeker}
    </div>
  ) : null;

  // حين تُرسَم الموجة يبقى الرقمان ويسقط المسار: الموجةُ **هي** المسار.
  const times = (
    <div className={"rad-scrub" + (hasWave ? " rad-scrub-flat" : "")}>
      <span className="rad-scrub-time"><bdi dir="ltr">{formatDuration(time) || "0:00"}</bdi></span>
      {hasWave ? null : (
        <div className="rad-scrub-track">
          <div className="rad-scrub-fill" style={{ width: `${pct}%` }} />
          <div className="rad-scrub-knob" style={{ insetInlineStart: `${pct}%` }} />
          {seeker}
        </div>
      )}
      <span className="rad-scrub-time"><bdi dir="ltr">{formatDuration(seconds) || "0:00"}</bdi></span>
    </div>
  );

  const takes = shown.plainUrl ? (
    <div className="rad-takes" role="group" aria-label="نسخة الاستماع">
      <button type="button" className="rad-take" aria-pressed={p.variant === "music"}
        onClick={() => void p.switchTo("music")} disabled={!isThis}>
        <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بموسيقى</span>
      </button>
      <button type="button" className="rad-take" aria-pressed={p.variant === "plain"}
        onClick={() => void p.switchTo("plain")} disabled={!isThis}>
        <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بلا موسيقى</span>
      </button>
    </div>
  ) : null;

  /**
   * مقبضُ الموسيقى — **ما لا تعطيه المنصّاتُ الأخرى**: الكلامُ ثابتٌ والموسيقى
   * وحدَها تعلو وتخفت. ولا يظهر إلّا حين تكون الحلقةُ مسارين، فحلقةُ المكس
   * القديم لا تملك ما يُفصَل.
   *
   * وهو غيرُ مقبض الصوت وإن تشابها: ذاك جهارةُ الجهاز كلِّها (ولذلك يُخفى على
   * الجوّال، فأزرارُه الماديّة أولى)، وهذا مزجُ الحلقة نفسِها فيبقى في كلّ شاشة.
   * وضغطُ الأيقونة يطفئ الموسيقى ويعيدها إلى مقدارها السابق.
   *
   * **وحضورُه من الحلقة المعروضة لا من العاملة**: لو عُلِّق على `p.current` لغاب
   * قبل أوّل ضغطةٍ ثمّ ظهر بعدها، فيقفز الصفُّ في عين الناظر — وهو المسلكُ نفسُه
   * الذي عليه المبدّلُ وسائرُ الأدوات.
   */
  const musicDial = shown.plainUrl && shown.stemUrl ? (
    <div className="rad-music">
      <button type="button" className="rad-skip"
        onClick={() => p.setMusicLevel(p.musicLevel > 0 ? 0 : lastMusic.current)}
        aria-label={p.musicLevel > 0 ? "إطفاء الموسيقى" : "إعادة الموسيقى"}>
        {p.musicLevel > 0 ? <MusicNotes size={17} aria-hidden /> : <MusicNotesMinus size={17} aria-hidden />}
      </button>
      <input
        className="rad-vol-input"
        type="range" min={0} max={1} step={0.05}
        value={p.musicLevel}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v > 0) lastMusic.current = v;
          p.setMusicLevel(v);
        }}
        aria-label="مقدار الموسيقى"
      />
    </div>
  ) : null;

  const rate = (
    <button type="button" className="rad-chip" onClick={p.cycleRate}
      aria-label={`سرعة التشغيل ${p.rate} أضعاف، اضغط لتغييرها`}>
      <bdi dir="ltr">{p.rate}×</bdi>
    </button>
  );

  const volume = (
    <div className="rad-vol">
      <button type="button" className="rad-skip" onClick={() => p.setMuted(!p.muted)}
        aria-label={p.muted ? "إلغاء الكتم" : "كتم الصوت"}>
        {p.muted ? <SpeakerSlash size={17} aria-hidden /> : <SpeakerHigh size={17} aria-hidden />}
      </button>
      <input
        className="rad-vol-input"
        type="range" min={0} max={1} step={0.05}
        value={p.muted ? 0 : p.volume}
        onChange={(e) => { const v = Number(e.target.value); p.setVolume(v); p.setMuted(v === 0); }}
        aria-label="مستوى الصوت"
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
        <span className="rad-slimline" aria-hidden><i style={{ width: `${pct}%` }} /></span>
        <span className="rad-bar-cover">
          {shown.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={shown.coverUrl} alt="" />
            : <MicrophoneStage size={20} aria-hidden />}
        </span>
        <div className="rad-bar-meta">
          <Link href={`/radio/${shown.showSlug}/${shown.episodeSlug}`} className="rad-bar-title">
            {shown.title}
          </Link>
          <div className="rad-bar-show">{shown.showTitle}</div>
        </div>
        <div className="rad-bar-end">
          <button type="button" className="rad-play" onClick={onPlay}
            aria-label={playing ? `إيقاف ${shown.title}` : `تشغيل ${shown.title}`}>
            {playing ? <Pause size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {wave}
      <div className="radp-time">{times}</div>
      {transport}
      <div className="radp-aux">
        {takes}
        <div className="flex items-center gap-3">{rate}{musicDial}{volume}</div>
      </div>
    </>
  );
}
