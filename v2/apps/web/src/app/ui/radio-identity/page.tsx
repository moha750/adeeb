"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { MicrophoneStage, Waveform } from "@phosphor-icons/react";
import { RadioPlayerProvider, type Track } from "@/app/radio/_player/PlayerProvider";
import { EpisodeRow } from "@/app/radio/_player/EpisodeRow";
import { InlinePlayer } from "@/app/radio/_player/InlinePlayer";

/**
 * **هويّةُ المحطّة والبرنامج** — معاينةٌ تعرض «الآن» و«المقترح» بالمكوّنات الحقيقيّة.
 *
 * سببُها (المالك ٢٠٢٦-٠٨-٢٨): «ألا ترى أنّ صفحات الإذاعة يجب أن تكون بهويّة
 * المحطّة؟» — والعلّةُ قائمةٌ فعلًا: غلافُ «منعطف» فيروزيّ وصفحتُه فولاذيّة،
 * وشعارُ المحطّة عنّابيٌّ على كريميّ وصفحتُها زرقاء.
 *
 * **واللونان مستخرجان من الشعارين نفسِهما** لا مقترحان من عندي: عُدّت بكسلاتُ
 * كلّ شعارٍ وصُنّفت، فخرج العنّابيّ `#901303` والكريميّ `#fef3e2` للمحطّة،
 * والفيروزيّ `#008dac` مع عمقه `#01638a` لمنعطف. ثمّ أقرّ المالك أنّ **الكريميّ
 * هو الأساسُ والعنّابيّ ثانيه**.
 *
 * **ولا مكوّنَ جديدًا هنا:** الصفوفُ والمشغّلُ هي `.radn-*` نفسُها بلا تغيير،
 * واللونُ يدخل عبر رموزٍ تُعلَن على الحاوية (`.radid-*`). فما تراه هو ما ينزل.
 */

const PEAKS = Array.from({ length: 240 }, (_, i) => {
  const t = i / 240;
  return Math.round(100 * Math.max(0.12, Math.min(0.98, 0.5 + 0.22 * Math.sin(t * 26) + 0.12 * Math.sin(t * 63))));
});

const track = (n: number, title: string, seconds: number): Track => ({
  id: `demo-${n}`,
  title,
  showTitle: "منعطف",
  showSlug: "munataf",
  episodeSlug: `ep-${n}`,
  musicUrl: null,
  plainUrl: null,
  stemUrl: null,
  talkStartsAt: 0,
  coverUrl: null,
  seconds,
  musicPeaks: PEAKS,
  plainPeaks: PEAKS,
  tone: "brand",
});

const EPS = [
  { t: track(3, "أسطورة الشغف", 1228), date: "27 أغسطس", sum: "«اعمل ما تحبّ» نصيحةٌ جميلة، لكن متى تحوّلت إلى معيارٍ يقيس فشلنا؟" },
  { t: track(2, "من الحلم إلى الواقع", 1287), date: "20 أغسطس", sum: "الحلمُ وحده لا يكفي، فبين الحلم والواقع طريقٌ طويل." },
  { t: track(1, "من أنا فعلًا؟", 696), date: "13 أغسطس", sum: "سؤالٌ يبدو بسيطًا، لكنه من أصعب ما يواجهه الإنسان." },
];

const MODES = [
  { value: "now", label: "الآن" },
  { value: "next", label: "المقترح" },
];

/** لوحُ الألوان المستخرَج، يُعرَض ليُقاس بالعين لا ليوصَف. */
function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="radidlab-chip">
      <span className="radidlab-dot" style={{ background: hex }} />
      {label} <span className="font-latin" dir="ltr">{hex}</span>
    </span>
  );
}

function Surfaces({ id }: { id: string }) {
  const station = id === "next" ? "radid-station" : "";
  const show = id === "next" ? "radid-show" : "";
  return (
    <div className={`radidlab-frame ${station}`}>
      <div className="radidlab-pad">
        <section className="radidlab-sec">
          <p className="radidlab-lbl">/radio</p>
          <div className="flex items-start gap-4">
            <span className="radn-wide-c" aria-hidden><MicrophoneStage size={30} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-black">إذاعة أَدِيب</h2>
              <p className="mt-1 text-sm text-content-muted">حيثُ يَصيرُ الصوتُ أثرًا</p>
            </div>
          </div>
          <div className={`radn-rows mt-4 ${show}`}>
            {EPS.slice(0, 2).map((e) => (
              <EpisodeRow key={e.t.id} track={e.t} number={Number(e.t.episodeSlug.slice(3))}
                dateLabel={e.date} summary={e.sum} showName="منعطف" />
            ))}
          </div>
        </section>

        <section className={`radidlab-sec ${show}`}>
          <p className="radidlab-lbl">/radio/munataf</p>
          <div className="flex items-start gap-4">
            <span className="radn-wide-c" aria-hidden><Waveform size={30} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-black">منعطف</h2>
              <p className="mt-1 text-sm text-content-muted">حوارٌ عن منعطفات الحياة</p>
            </div>
          </div>
          <div className="radn-rows mt-4">
            {EPS.map((e) => (
              <EpisodeRow key={e.t.id} track={e.t} number={Number(e.t.episodeSlug.slice(3))}
                dateLabel={e.date} summary={e.sum} showName={null} />
            ))}
          </div>
        </section>

        <section className={`radidlab-sec ${show}`}>
          <p className="radidlab-lbl">/radio/munataf/ep-1</p>
          <InlinePlayer track={EPS[2].t} />
        </section>
      </div>
    </div>
  );
}

export default function RadioIdentityLab() {
  const [mode, setMode] = useState("next");

  return (
    <main className="py-10 md:py-14">
      <Container>
        <p className="font-latin text-xs tracking-widest text-content-muted">DESIGN SYSTEM, RADIO IDENTITY</p>
        <h1 className="mt-3 font-display text-3xl font-black md:text-4xl">هويّةُ المحطّة والبرنامج</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-content-muted">
          طبقتان: المحطّةُ إطارٌ والبرنامجُ لون. واللونان مستخرجان من الشعارين نفسِهما،
          والمكوّناتُ هي الحيّةُ بلا تغيير — اللونُ يدخل برموزٍ تُعلَن على الحاوية.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Segmented items={MODES} value={mode} onValueChange={setMode} aria-label="الهويّة" />
          <span className="radidlab-sw">
            <Swatch hex="#fef3e2" label="المحطّة، أساس" />
            <Swatch hex="#901303" label="المحطّة، ثانٍ" />
            <Swatch hex="#008dac" label="منعطف، سطح" />
            <Swatch hex="#01638a" label="منعطف، حبر" />
          </span>
        </div>

        <div className="radidlab-two mt-8">
          <div className="radidlab-col">
            <div className="radidlab-cap"><b>{mode === "next" ? "المقترح" : "الآن"}</b><span>375px</span></div>
            <RadioPlayerProvider stationName="إذاعة أَدِيب" stationLogoUrl={null}>
              <Surfaces id={mode} />
            </RadioPlayerProvider>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-content-muted">
          مقيسٌ قبل الإقرار: عنّابيٌّ على كريميّ <span className="font-latin">8.39</span>،
          وأبيضُ على عنّابيّ <span className="font-latin">9.21</span>.
          والفيروزيُّ الفاتحُ مع الأبيض <span className="font-latin">3.88</span> فسقط نصًّا وبقي سطحًا،
          ونابَ عنه العميقُ <span className="font-latin">6.66</span>.
        </p>
      </Container>
    </main>
  );
}
