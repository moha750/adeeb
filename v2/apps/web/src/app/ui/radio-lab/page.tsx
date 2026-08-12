"use client";

import { useState } from "react";
import { Badge, Button, Container } from "@adeeb/design-system";
import { MicrophoneStage, SpeakerSimpleNone, MusicNotes, Play, Pause } from "@phosphor-icons/react";

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
      </Container>
    </main>
  );
}
