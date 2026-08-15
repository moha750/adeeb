"use client";

import { useState } from "react";
import { computePeaks, downsample } from "@/lib/radio/peaks";
import { Badge, Button, Container } from "@adeeb/design-system";
import {
  MicrophoneStage, SpeakerSimpleNone, MusicNotes, Play, Pause, SpeakerHigh,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowClockwise, UploadSimple } from "@/app/_components/glyphs";

/**
 * معرضُ قسم الإذاعة (`.rad-*`) — التخطيطُ المُقَرّ ببياناتٍ ساكنة.
 *
 * الطلب: تخطيطُ القسم يُقرأ محطّةً لها برامج، بلا استغناءٍ عن هويّة أدِيب.
 * فالجديدُ **الترتيبُ لا العناصر**: صدرُ محطّة، رفٌّ أفقيّ للبرامج، صفوفُ
 * حلقاتٍ تُشغَّل من مكانها، وشريطٌ ثابتٌ لا ينقطع معه الصوت.
 *
 * عُرض على المالك مقترحان (٢٠٢٦-٠٨-١٢): مسرحٌ داكن يعيد ربط الرموز من طرف سلّم
 * الكحليّ، ورفٌّ فاتح على سطح الموقع نفسِه. **فاختير الفاتح** ليتّصل القسمُ
 * بالموقع بلا قطع، وأُسقط الداكنُ من المكتبة فلا يبقى ما لا يُستعمَل.
 */

const SHOWS = [
  { name: "منعطف", sub: "حوار عن منعطفات الحياة", eps: 2 },
  { name: "على هامش الكلمة", sub: "قراءةٌ في كتابٍ كلّ أسبوع", eps: 8 },
  { name: "أثر", sub: "سِيَرٌ تُروى", eps: 5 },
  { name: "بين قوسين", sub: "لغةٌ ونحوٌ بلا تجهّم", eps: 12 },
  { name: "مسودّة", sub: "كيف يُكتب النصّ", eps: 4 },
];

const EPISODES = [
  { n: 2, title: "من أنا فعلاً؟", dur: "21:25", date: "١٢ أغسطس" },
  { n: 1, title: "حين تنكسر الخطّة", dur: "18:40", date: "٥ أغسطس" },
  { n: 3, title: "الطريق الذي لم أسلكه", dur: "24:02", date: "قريبًا" },
];

/* ── أجزاءُ المحطّة ────────────────────────────────────────────────── */

function Hero() {
  return (
    <div className="rad-hero">
      <div className="rad-hero-logo"><MicrophoneStage size={40} aria-hidden /></div>
      <div className="rad-hero-txt">
        <div className="rad-hero-name">إذاعة أدِيب</div>
        <p className="rad-hero-deck">برامجُ أدِيب مسموعةً، بموسيقى أو بدونها.</p>
      </div>
      <Button variant="primary" size="md"><Play size={18} />استمع لآخر حلقة</Button>
    </div>
  );
}

function Shelf() {
  return (
    <>
      <h3 className="mb-3 font-display text-lg font-black">البرامج</h3>
      <div className="rad-shelf">
        {SHOWS.map((s) => (
          <a key={s.name} className="rad-prog" href="#">
            <div className="rad-prog-cover"><MicrophoneStage size={34} aria-hidden /></div>
            <div className="rad-prog-name">{s.name}</div>
            <div className="rad-prog-sub">{s.sub}</div>
            <div className="rad-prog-sub"><span className="font-latin">{s.eps}</span> حلقة</div>
          </a>
        ))}
      </div>
    </>
  );
}

function Episodes({ playing }: { playing: number }) {
  return (
    <>
      <h3 className="mb-3 mt-8 font-display text-lg font-black">أحدث الحلقات</h3>
      <div className="rad-eps">
        {EPISODES.map((e) => (
          <div key={e.n} className={"rad-ep" + (e.n === playing ? " is-playing" : "")}>
            <span className="rad-ep-num">{e.n}</span>
            <div className="rad-ep-txt">
              <div className="rad-ep-title">{e.title}</div>
              <div className="rad-ep-sub">
                <span>منعطف</span>
                <span>{e.date}</span>
                <span className="font-latin"><bdi dir="ltr">{e.dur}</bdi></span>
                {e.n === playing ? <Badge tone="success" variant="soft" dot>يُذاع الآن</Badge> : null}
              </div>
            </div>
            <div className="rad-ep-end">
              <Button variant="ghost" size="sm">
                {e.n === playing ? <Pause size={16} /> : <Play size={16} />}
                {e.n === playing ? "إيقاف" : "تشغيل"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Bar() {
  const [take, setTake] = useState<"music" | "plain">("music");
  const [on, setOn] = useState(true);
  return (
    <div className="rad-bar">
      <div className="rad-bar-cover"><MicrophoneStage size={22} aria-hidden /></div>
      <div className="rad-bar-meta">
        <div className="rad-bar-title">من أنا فعلاً؟</div>
        <div className="rad-bar-show">منعطف</div>
      </div>
      <div className="rad-bar-ctrl">
        <Button variant="primary" size="sm" onClick={() => setOn((v) => !v)}>
          {on ? <Pause size={16} /> : <Play size={16} />}{on ? "إيقاف" : "تشغيل"}
        </Button>
      </div>
      <div className="rad-scrub">
        <span className="rad-scrub-time"><bdi dir="ltr">12:04</bdi></span>
        <div className="rad-scrub-track">
          <div className="rad-scrub-fill" style={{ width: "56%" }} />
          <div className="rad-scrub-knob" style={{ insetInlineStart: "56%" }} />
        </div>
        <span className="rad-scrub-time"><bdi dir="ltr">21:25</bdi></span>
      </div>
      <div className="rad-takes" role="group" aria-label="نسخة الاستماع">
        <button type="button" className="rad-take" aria-pressed={take === "music"} onClick={() => setTake("music")}>
          <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden /> بموسيقى
        </button>
        <button type="button" className="rad-take" aria-pressed={take === "plain"} onClick={() => setTake("plain")}>
          <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden /> بلا موسيقى
        </button>
      </div>
    </div>
  );
}

function Stage() {
  return (
    <div className="rad" style={{ borderRadius: "var(--radius)", padding: "8px 18px 18px" }}>
      <Hero />
      <Shelf />
      <Episodes playing={2} />
      <div style={{ marginTop: 18 }}><Bar /></div>
    </div>
  );
}

/** إطارٌ يحاكي أسفلَ الشاشة، فيُحكَم على الشريط في سياقه لا معلّقًا في الفراغ. */
function Screen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{label}</p>
      <div className="relative overflow-hidden rounded border border-line bg-surface-2" style={{ height: 260 }}>
        <div className="p-5 text-content-muted text-sm leading-loose">
          متنُ الصفحة يمتدّ تحت الشريط… التفريغُ النصّيّ يُقرأ هنا سطرًا بعد سطر، والقارئُ يمرّر
          وينزل، والشريطُ يبقى معه يذكّره بما يسمع ولا يزاحمه على النظر.
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── مشتركاتُ المقترحين: النقلُ والثانويّة ── */

function Transport() {
  return (
    <div className="radp-transport">
      <button type="button" className="rad-skip rad-skip-n" aria-label="خمس عشرة إلى الوراء">
        <ArrowCounterClockwise size={16} aria-hidden /><span className="font-latin">15</span>
      </button>
      <button type="button" className="rad-play" aria-label="تشغيل"><Play size={24} aria-hidden /></button>
      <button type="button" className="rad-skip rad-skip-n" aria-label="خمس عشرة إلى الأمام">
        <ArrowClockwise size={16} aria-hidden /><span className="font-latin">15</span>
      </button>
    </div>
  );
}

function Aux() {
  return (
    <div className="radp-aux">
      <div className="rad-takes" role="group" aria-label="نسخة الاستماع">
        <button type="button" className="rad-take" aria-pressed>
          <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بموسيقى</span>
        </button>
        <button type="button" className="rad-take" aria-pressed={false}>
          <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden /><span className="rad-take-t">بلا موسيقى</span>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="rad-chip"><bdi dir="ltr">1×</bdi></button>
        <div className="rad-vol">
          <button type="button" className="rad-skip" aria-label="كتم"><SpeakerHigh size={17} aria-hidden /></button>
          <input className="rad-vol-input" type="range" min={0} max={1} step={0.05} defaultValue={0.8} aria-label="مستوى الصوت" />
        </div>
      </div>
    </div>
  );
}

const PLAYED = 0.42;

/** الموجةُ تُحسَب من ملفٍّ يختاره الناظر، فيحكم على شكلٍ حقيقيّ لا على زخرفة. */
function Waveform() {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const r = await computePeaks(file);
    setPeaks(r?.peaks ?? null);
    setBusy(false);
  };

  if (!peaks) {
    return (
      <label className="radw-empty" style={{ cursor: "pointer" }}>
        {busy ? "تُحسَب الموجة من الملفّ…" : "اختر ملفًّا صوتيًّا لترى موجتَه الحقيقيّة"}
        <input type="file" accept="audio/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    );
  }

  const bars = downsample(peaks);
  const cut = Math.round(bars.length * PLAYED);
  return (
    <div className="radw" role="presentation">
      {bars.map((v, i) => (
        <span key={i} className={"radw-bar" + (i < cut ? " is-played" : "")}
          style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}

export default function RadioLabPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System, Radio Lab
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">تخطيط المحطّة</h1>
        <p className="mt-2 max-w-3xl text-content-muted">
          <strong>صدرُ محطّة</strong>، ثمّ <strong>رفٌّ أفقيّ</strong> للبرامج يَعِد بأنّ خلفه مزيدًا (لا شبكةً
          تقول «هذا كلُّ ما عندنا»)، ثمّ <strong>صفوفُ حلقات</strong> تُشغَّل من مكانها، و<strong>شريطٌ ثابت</strong>{" "}
          يلازمك فلا ينقطع الصوت وأنت تتصفّح. والجديدُ هنا <strong>الترتيبُ لا العناصر</strong>.
        </p>
        <p className="mt-2 max-w-3xl text-content-muted">
          والسطحُ سطحُ الموقع نفسُه بقرار المالك: عُرض معه مسرحٌ داكن يعيد ربط الرموز من طرف سلّم الكحليّ،
          فاختير الفاتحُ ليتّصل القسمُ بالموقع بلا قطع، وأُسقط الداكنُ من المكتبة.
        </p>

        <div className="mt-12">
          <Stage />
        </div>

        <section className="mt-20">
          <h2 className="mb-2 font-display text-2xl font-black text-content">المشغّل داخل الصفحة، مقترحان</h2>
          <p className="mb-8 max-w-3xl text-content-muted">
            عيبُ الحاليّ أنّه يلبس ثوبَ الشريط: صفٌّ أفقيٌّ واحد تصطفّ فيه سبعُ أدواتٍ بلا مراتب، فيبدو
            السيّدُ تابعًا. والمقترحان يعيدان إليه مرتبتَه: <strong>الزمنُ يتصدّر</strong>، ثمّ{" "}
            <strong>التشغيلُ كبيرًا في الوسط</strong>، ثمّ <strong>الثانويّةُ أهدأَ تحت خطّ</strong>.
          </p>

          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">
                مقترح أ, لوحةٌ بمراتب
              </p>
              <div className="radp rad-tone-brand">
                <div className="radp-time">
                  <span className="rad-scrub-time"><bdi dir="ltr">9:01</bdi></span>
                  <div className="rad-scrub-track" style={{ flex: 1 }}>
                    <div className="rad-scrub-fill" style={{ width: `${PLAYED * 100}%` }} />
                    <div className="rad-scrub-knob" style={{ insetInlineStart: `${PLAYED * 100}%` }} />
                  </div>
                  <span className="rad-scrub-time"><bdi dir="ltr">21:27</bdi></span>
                </div>
                <Transport />
                <Aux />
              </div>
            </div>

            <div>
              <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">
                مقترح ب, موجةُ صوتٍ حقيقيّة
              </p>
              <div className="radp rad-tone-brand">
                <Waveform />
                <div className="radp-time" style={{ justifyContent: "space-between" }}>
                  <span className="rad-scrub-time"><bdi dir="ltr">9:01</bdi></span>
                  <span className="rad-scrub-time"><bdi dir="ltr">21:27</bdi></span>
                </div>
                <Transport />
                <Aux />
              </div>
              <p className="mt-3 text-sm text-content-muted">
                الموجةُ هنا تُحسَب في متصفّحك من ملفٍّ تختاره، فتحكم على شكلٍ حقيقيّ.
                وفي الإنتاج تُحسَب <strong>مرّةً عند الرفع</strong> وتُخزَّن، فلا يفكّها كلُّ زائر.
              </p>
            </div>
          </div>
        </section>



        <section className="mt-20">
          <h2 className="mb-2 font-display text-2xl font-black text-content">الشريط الثابت</h2>
          <p className="mb-8 max-w-3xl text-content-muted">
            بعد أن صار المشغّلُ داخلَ صفحة الحلقة، تبدّلت وظيفةُ الشريط: لم يعد لوحةَ قيادة (أدواتُه تكرارٌ
            لما في الصفحة) بل <strong>تذكيرًا</strong> يقول «ما زلتَ تسمع هذا» ويعيدك إليه. فالمبدأ:{" "}
            <strong>أقلُّ ما يذكّر لا أكثرُ ما يتحكّم.</strong> والنقرةُ على أيٍّ منهما تعيدك إلى صفحة الحلقة
            حيث الأدواتُ كلُّها.
          </p>

          <div className="max-w-xl">
            <Screen label="المُختار, الشريط النحيل">
              <div className="rad-bar rad-bar-slim" style={{ position: "absolute", insetInline: 12, bottom: 12, maxWidth: "none" }}>
                <span className="rad-slimline"><i style={{ width: "56%" }} /></span>
                <span className="rad-bar-cover"><MicrophoneStage size={20} aria-hidden /></span>
                <div className="rad-bar-meta">
                  <div className="rad-bar-title">من أنا فعلاً؟</div>
                  <div className="rad-bar-show">منعطف</div>
                </div>
                <button type="button" className="rad-play" aria-label="إيقاف"><Pause size={16} aria-hidden /></button>
              </div>
            </Screen>

          </div>

          <p className="mt-6 max-w-3xl text-sm text-content-muted">
            عُرض معه مقترحُ <strong>حبّةٍ عائمة</strong> في الرُّكن، فاختار المالك النحيل: يُرى دائمًا ويُقرأ
            عنوانُه كاملًا، وثمنُه سطرٌ من أسفل الشاشة. وأُعدمت الحبّةُ من المكتبة فلا يبقى ما لا يُستعمَل.
          </p>
        </section>
      </Container>
    </main>
  );
}
