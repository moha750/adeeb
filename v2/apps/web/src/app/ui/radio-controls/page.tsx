"use client";

import { useCallback, useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { MusicNotes, MusicNotesMinus, Play, SpeakerHigh, SpeakerSimpleNone } from "@phosphor-icons/react";
import { ArrowClockwise, ArrowCounterClockwise } from "@/app/_components/glyphs";
import { BAR_GAP, barsForWidth, downsample } from "@/lib/radio/peaks";
import { MUSIC_STOPS, SKIP_SECONDS } from "../../dashboard/radio/vocab";

/**
 * **قرارا لوحةِ المشغّل** — معاينةٌ تعرضهما بمكوّنات الإنتاج نفسِها.
 *
 * سببُ الصفحة (٢٠٢٦-٠٨-١٨، تقييمُ الإذاعة كاملةً): خرج من التقييم سؤالان
 * **بصريّان لا يُحسَمان بالوصف**، فبُنيت لهما ورقةٌ تُنظَر (ق: القرار البصريّ
 * يُعرَض لا يُشرَح، وسابقتُها `/ui/waveform` و`/ui/radio-structure`).
 *
 * ولا تُخترع هنا صنفٌ ولا لون: القطعُ `.rad-*` كما تُشحَن، والفرقُ في التركيب
 * وحدَه، فما تراه هو ما سيقع لا رسمٌ يشبهه.
 */

/* ══ القرار الأوّل: أداةُ الموسيقى، الجولةُ الثانية ═════════════════════
   الجولةُ الأولى (٢٠٢٦-٠٨-١٨) عُرضت ثلاثةً: الاثنان معًا · مقبضٌ مُسمًّى ·
   مبدّلٌ وحدَه. **ورُفضت كلُّها**، وقال المالك إنّ (ب) أقلُّها سوءًا وإنّ المطلوب
   **وضوحٌ بالاستخدام**. فالجولةُ الأولى عالجت التسمية، والعلّةُ ليست في الاسم.

   ══ تشخيصُ الجولة الثانية ══
   قِيس فتبيّن أنّ «التوأمَين المتجاورَين» **علّةُ سطح المكتب وحدَه**: على مؤشّرٍ
   خشن يُخفى `.rad-vol` كلُّه (قِيس: `display: none`)، فلا جارَ للمقبض على الجوّال
   أصلًا — واللوحةُ منتَجُ جوّال. فبقيت العلّةُ الحقيقيّةُ عاريةً، وهي **ثلاثةُ
   أسئلةٍ لا يجيب عنها المقبض**:
     ١) ما هذه الأداة؟ (‏مِزلاقٌ بلا كلمة)
     ٢) ما مداها؟ (‏لا يُعرَف طرفاها إلّا بالتجريب)
     ٣) ماذا يتغيّر إن حرّكتُها؟ (‏لا شيءَ يقول إنّ الكلامَ يثبت والموسيقى وحدَها تخفت)
   والاسمُ وحدَه يجيب عن الأوّل ويترك الثاني والثالث. فالمقترحاتُ أدناه مرتّبةٌ
   **بمقدار ما تجيب**، من أصمتَ إلى أصرح، لا بجمالٍ يُفاضَل فيه.

   ولا صنفَ مخترعًا: الحبّاتُ `.rad-take` كما هي، والمِزلاقُ `.rad-vol-input` كما هو،
   وما زاد فكلمةٌ مكتوبة.
   ══════════════════════════════════════════════════════════════════ */

type DialKey = "now" | "stops";

const DIALS: { key: DialKey; tag: string; tone: "bad" | "good"; note: string }[] = [
  {
    key: "now",
    tag: "أ) الذي كان: مبدّلٌ ومِزلاق",
    tone: "bad",
    note:
      "شيئان يفعلان فعلًا واحدًا في صفٍّ واحد. والمِزلاقُ لا يقول ما هو ولا أين طرفاه، " +
      "فيُقرأ مقبضَ صوتٍ آخر ويُتجاوَز. أُعدم.",
  },
  {
    key: "stops",
    tag: "ب) المُقَرّ: ثلاثُ مراتبَ مسمّاة",
    tone: "good",
    note:
      "أداةٌ واحدةٌ تُغني عن المبدّل، والمدى كلُّه معروضٌ وكلُّ موضعٍ يحمل اسمَه. " +
      "اختاره المالك، وهو ما يُشحَن اليوم. والثمنُ سقوطُ الضبط الدقيق، وقد قِيس السلوكُ قبله فكان ثنائيًّا.",
  },
];

function Dial({ variant }: { variant: DialKey }) {
  const [level, setLevel] = useState(0.35);
  const on = level > 0;

  const music =
    variant === "now" ? (
      <div className="rad-music">
        <button type="button" className="rad-skip" onClick={() => setLevel(on ? 0 : 1)}
          aria-label={on ? "إطفاء الموسيقى" : "إعادة الموسيقى"}>
          {on ? <MusicNotes size={17} aria-hidden /> : <MusicNotesMinus size={17} aria-hidden />}
        </button>
        <input className="rad-vol-input" type="range" min={0} max={1} step={0.05}
          value={level} onChange={(e) => setLevel(Number(e.target.value))}
          aria-label="مقدار الموسيقى" />
      </div>
    ) : null;

  /* المُقَرُّ يُرسَم من `MUSIC_STOPS` نفسِها لا من نسخةٍ عنها: القرارُ صدر، فالورقةُ
     تعرض ما يُشحَن حقًّا ولا تفارقه يوم تُعدَّل مرتبةٌ أو تُزاد. */
  const takes =
    variant === "stops" ? (
      <div className="rad-takes" role="group" aria-label="مقدار الموسيقى">
        {MUSIC_STOPS.map((stop) => (
          <button key={stop.level} type="button" className="rad-take"
            aria-pressed={level === stop.level} onClick={() => setLevel(stop.level)}>
            <span className="rad-take-t">{stop.label}</span>
          </button>
        ))}
      </div>
    ) : (
      <div className="rad-takes" role="group" aria-label="نسخة الاستماع">
        <button type="button" className="rad-take" aria-pressed={on} onClick={() => setLevel(1)}>
          <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden />
          <span className="rad-take-t">بموسيقى</span>
        </button>
        <button type="button" className="rad-take" aria-pressed={!on} onClick={() => setLevel(0)}>
          <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden />
          <span className="rad-take-t">بلا موسيقى</span>
        </button>
      </div>
    );

  const volume = (
    <div className="rad-vol">
      <button type="button" className="rad-skip" aria-label="كتم الصوت">
        <SpeakerHigh size={17} aria-hidden />
      </button>
      <input className="rad-vol-input" type="range" min={0} max={1} step={0.05}
        defaultValue={1} aria-label="مستوى الصوت" aria-valuetext="100٪" />
    </div>
  );

  return (
    <div className="radp">
      <div className="radp-transport">
        <button type="button" className="rad-skip rad-skip-n" aria-label="خمس عشرة ثانية إلى الوراء">
          <ArrowCounterClockwise size={16} aria-hidden /><span className="font-latin">{SKIP_SECONDS}</span>
        </button>
        <button type="button" className="rad-play" aria-label="تشغيل"><Play size={24} aria-hidden /></button>
        <button type="button" className="rad-skip rad-skip-n" aria-label="خمس عشرة ثانية إلى الأمام">
          <ArrowClockwise size={16} aria-hidden /><span className="font-latin">{SKIP_SECONDS}</span>
        </button>
      </div>
      <div className="radp-aux">
        {takes}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="button" className="rad-chip" aria-label="سرعة التشغيل"><bdi dir="ltr">1×</bdi></button>
          {music}
          {volume}
        </div>
      </div>
    </div>
  );
}

/* ══ القرار الثاني: من أيّ حافّةٍ يمتلئ الزمن؟ ══════════════════════════
   الموجةُ عندنا تمتلئ **من اليمين**، وهو ما يُقرأ بديهيًّا في صفحةٍ عربيّة.
   ولكنّ صانعي المشغّلات وثّقوا العكسَ بأربعة أفواه:
   • Material Design نصًّا: «لا تعكس أزرارَ التشغيل ولا مؤشّرَ التقدّم، فهي
     تشير إلى **اتّجاه الشريط المُشغَّل** لا اتّجاه الزمن».
   • أبل أضافت قيمةً في واجهتها لهذا وحدَه (`…SemanticContentAttributePlayback`)
     كي **لا ينعكس** مِزلاقُ التصفّح في سياقٍ من اليمين إلى اليسار.
   • سبوتيفاي حين شحنت العربيّة: «الناطقون بالعربيّة **يتوقّعون** أدواتِ التشغيل
     وشريطَ التقدّم كما هي في اللغات من اليسار».
   • ومايكروسوفت: أيقونتا التقديم والترجيع لا تُعكسان (وأيقونتانا دوّارتان أصلًا،
     فهما خارج هذا السؤال).

   **والفرقُ الذي يُغفَل**: شريطُ رفعِ ملفٍّ يُعكَس في العربيّة، وشريطُ الاستماع
   لا يُعكَس. الشكلُ واحدٌ والقاعدةُ ضدّان، والفاصلُ المعنى.

   فالسؤالُ ليس «أيُّهما صواب» بل «أنتبع العرفَ الموثَّق أم بداهةَ صفحتنا؟».
   ولا يُحسَم بالنقل: يُنظَر.

   **والحكمُ صدر (٢٠٢٦-٠٨-١٨): (أ) من اليمين، وهو ما يُشحَن** — فلا يتغيّر شيءٌ
   في الإنتاج. والإطاران يبقيان سجلَّ القرار لا سؤالًا مفتوحًا، كي لا يُفتَح
   الملفُّ ثانيةً بعد سنةٍ بحجّةٍ نُظر فيها اليوم.
   ══════════════════════════════════════════════════════════════════ */

/** قممُ «من أنا فعلاً؟» (بموسيقى)، أوّلُ ٢٠٠ قمّةٍ من الأربعمئة المخزَّنة. */
const PEAKS = [
  96, 90, 92, 100, 58, 25, 79, 34, 20, 51, 38, 36, 26, 28, 15, 12, 22, 14, 20, 20,
  14, 31, 24, 26, 20, 22, 19, 20, 17, 16, 18, 14, 19, 17, 15, 21, 22, 12, 27, 33,
  25, 23, 20, 38, 23, 28, 23, 22, 18, 17, 18, 22, 27, 23, 28, 30, 24, 22, 28, 31,
  31, 27, 19, 25, 32, 36, 23, 25, 22, 24, 22, 26, 51, 25, 31, 26, 35, 28, 22, 33,
  19, 25, 20, 19, 23, 21, 28, 17, 19, 36, 27, 28, 21, 26, 45, 20, 28, 26, 19, 33,
  20, 34, 40, 27, 31, 34, 28, 39, 31, 25, 24, 23, 27, 26, 23, 22, 59, 31, 32, 46,
  36, 27, 26, 29, 38, 24, 30, 25, 22, 27, 16, 35, 19, 17, 19, 20, 21, 15, 20, 22,
  19, 18, 31, 24, 30, 17, 20, 23, 17, 27, 23, 27, 30, 22, 21, 26, 25, 30, 21, 46,
  26, 26, 31, 24, 24, 18, 25, 26, 24, 28, 25, 25, 29, 24, 37, 21, 26, 18, 25, 28,
  24, 29, 27, 32, 36, 26, 23, 22, 21, 21, 19, 22, 21, 20, 23, 27, 29, 25, 30, 20,
];

/** يقيس عرضَ عنصرٍ حيًّا. صفرٌ قبل أوّل قياس، فيُرسَم بالأدنى ثمّ يُصحَّح. */
function useW(): [number, (el: HTMLDivElement | null) => void] {
  const [w, setW] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => setW(el.getBoundingClientRect().width);
    apply();
    new ResizeObserver(apply).observe(el);
  }, []);
  return [w, ref];
}

/**
 * موجةٌ بحافّةِ بدءٍ مختارة. و«من اليسار» **لا يحتاج صنفًا جديدًا**: اللوحةُ
 * وحدَها تُعلَن `dir="ltr"` فتصطفّ أعمدتُها من اليسار، ويبقى كلُّ ما حولها عربيًّا.
 * وهو عينُ ما تفعله أبل بقيمتها، فالتجربةُ تطابق ما سيُشحَن لو أُقِرّ.
 */
function WaveEdge({ from, pct, onSeek }: { from: "right" | "left"; pct: number; onSeek: (p: number) => void }) {
  const [w, ref] = useW();
  const count = w > 0 ? barsForWidth(w) : 24;
  const drawn = downsample(PEAKS, count);
  const barW = w > 0 ? (w - (drawn.length - 1) * BAR_GAP) / drawn.length : 0;
  const played = Math.round(drawn.length * (pct / 100));

  return (
    <div className="radp">
      <div
        className="radw"
        ref={ref}
        dir={from === "left" ? "ltr" : undefined}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const p = from === "left" ? (e.clientX - r.left) / r.width : (r.right - e.clientX) / r.width;
          onSeek(Math.round(p * 100));
        }}
      >
        {drawn.map((h, i) => (
          <span key={i} className={"radw-bar" + (i < played ? " is-played" : "")} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="radp-time">
        <div className="rad-scrub rad-scrub-flat" dir={from === "left" ? "ltr" : undefined}>
          <span className="rad-scrub-time"><bdi dir="ltr">7:18</bdi></span>
          <span className="rad-scrub-time"><bdi dir="ltr">21:27</bdi></span>
        </div>
      </div>
      <div className="phdlab-body" style={{ paddingBottom: 0 }}>
        <span className="font-latin">{w > 0 ? `${drawn.length} × ${barW.toFixed(2)}px` : ""}</span>
      </div>
    </div>
  );
}

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "768", label: "لوح ٧٦٨" },
  { value: "1000", label: "سطح مكتب" },
];

export default function RadioControlsLab() {
  const [w, setW] = useState("390");
  const [pct, setPct] = useState(34);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System, Radio Player Decisions
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          قرارا لوحة المشغّل
        </h1>
        <p className="mt-2 max-w-2xl text-content-muted">
سؤالان خرجا من تقييم الإذاعة، **وكلاهما حُسم في ٢٠٢٦-٠٨-١٨**: أداةُ الموسيقى
          صارت ثلاثَ مراتبَ مسمّاة، والزمنُ يبقى يمتلئ من اليمين. وهذه الصفحةُ **سجلُّ
          القرارين** لا سؤالٌ مفتوح: يبقى فيها ما كان بجوار ما صار، كي لا يُفتَح الملفُّ
          بعد سنةٍ بحجّةٍ نُظر فيها اليوم.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1400px] px-6">
        <div style={{ ["--phdlab-w" as string]: `calc(${w}px + 28px + 2 * var(--card-stroke-w))` }}>
          <Container>
            <h2 className="mb-1 mt-12 font-display text-xl font-black text-content">
              الأوّل: أداةُ الموسيقى (حُسم)
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
جولةٌ أولى عالجت التسمية فسقطت، لأنّ العلّة ليست في الاسم: المِزلاقُ يُخفي
              مداه بطبيعته، ولا سابقةَ لهذه الميزة في مشغّلٍ يستند إليها المستمع. والمراتبُ
              تعرض المدى كلَّه وكلُّ موضعٍ يحمل اسمَه، وهي أداةٌ واحدةٌ تُغني عن المبدّل.
              وحلقاتُ المكس القديم تبقى على المبدّل: ملفّان لا يُمزَجان فليس فيهما ما يُخفَت.
            </p>
          </Container>
          <div className="phdlab">
            {DIALS.map((d) => (
              <div key={d.key} className="phdlab-col">
                <div className={"phdlab-tag " + d.tone}>
                  <span className="dot" aria-hidden />
                  {d.tag}
                </div>
                <div className="phdlab-frame">
                  <Container><Dial variant={d.key} /></Container>
                  <div className="phdlab-body">{d.note}</div>
                </div>
              </div>
            ))}
          </div>

          <Container>
            <h2 className="mb-1 mt-16 font-display text-xl font-black text-content">
              الثاني: من أيّ حافّةٍ يمتلئ الزمن؟ (حُسم)
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              نمتلئ اليوم من اليمين، وهو بديهةُ صفحةٍ عربيّة. وMaterial وأبل وسبوتيفاي
              ومايكروسوفت وثّقوا العكسَ لأدوات التشغيل وحدَها: الشريطُ يصف اتّجاهَ الشريط
              المُشغَّل لا اتّجاهَ القراءة. وشريطُ رفعِ ملفٍّ يُعكَس، وشريطُ الاستماع لا يُعكَس.
            </p>
          </Container>
          <div className="phdlab">
            <div className="phdlab-col">
              <div className="phdlab-tag good">
                <span className="dot" aria-hidden />أ) المُقَرّ: من اليمين
              </div>
              <div className="phdlab-frame">
                <Container><WaveEdge from="right" pct={pct} onSeek={setPct} /></Container>
                <div className="phdlab-body">
                  **اختاره المالك.** يتبع بداهةَ الصفحة: يبدأ الزمنُ حيث يبدأ النصّ.
                </div>
              </div>
            </div>
            <div className="phdlab-col">
              <div className="phdlab-tag bad">
                <span className="dot" aria-hidden />ب) العرفُ الموثَّق: من اليسار (لم يُؤخَذ به)
              </div>
              <div className="phdlab-frame">
                <Container><WaveEdge from="left" pct={pct} onSeek={setPct} /></Container>
                <div className="phdlab-body">
                  ما يجده المستمعُ في سبوتيفاي ويوتيوب وأبل بالعربيّة، فلا يتعلّم قاعدةً لموقعٍ واحد.
                  والوقتان يتبعان الحافّةَ نفسَها فلا يتناقضان معها.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
