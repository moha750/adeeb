"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { Play, Waveform, Heart, ShareNetwork } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowClockwise, Plus } from "@/app/_components/glyphs";

/**
 * **محطّةُ أدِيب: «الاستوديو»** — الاتّجاهُ الذي اختاره المالك ٢٠٢٦-٠٨-٢٨ من ثلاثة،
 * مطوَّرًا على الأسطح الثلاثة كلِّها.
 *
 * **الإذنُ ونطاقُه بنصّه:** «المشاريعُ المنفصلة التابعة لأدِيب مثل المحطّة تكون
 * لها صفحاتُها الخاصّة، وبطبيعة الحال هي مشروعٌ لأدِيب فتكون ضمن نطاقها.»
 * فالقاعدةُ ١ على الموقع كلِّه، ويُستثنى `/radio/*` وحدَه: يبقى رأسُ الموقع
 * وتذييلُه **وخطُّه وأيقوناتُه وشعارُه** لأدِيب (أمرُ المالك)، ويتحرّر التخطيطُ
 * واللونُ والشكلُ والكثافة.
 *
 * **وما جاء من المالك وما وُلِّد:** الشعارُ والباترنُ منه، واللونان مستخرَجان من
 * الشعار بإقراره (كريميٌّ أساسًا وعنّابيٌّ ثانيًا). **والتدرّجاتُ لم تكن عنده**
 * فوُلِّدت من اللونين وحدهما وقِيست قبل أن تدخل.
 *
 * ولا هكسَ في هذه الشاشة: كلُّه رموزٌ في `components.css`، فالمصدرُ الواحد قائمٌ
 * **داخل** الاستثناء.
 */

const PEAKS = Array.from({ length: 46 }, (_, i) => {
  const t = i / 46;
  return Math.round(100 * Math.max(0.16, Math.min(1, 0.5 + 0.26 * Math.sin(t * 21) + 0.14 * Math.sin(t * 57))));
});

const EPS = [
  { n: 3, t: "أسطورة الشغف", s: "27 أغسطس، 20:28", p: 0 },
  { n: 2, t: "من الحلم إلى الواقع", s: "20 أغسطس، 21:27", p: 0 },
  { n: 1, t: "من أنا فعلًا؟", s: "13 أغسطس، 11:36", p: 28 },
];

function Pattern() {
  return <span className="rst-pat" aria-hidden />;
}

function Wave({ played = 13 }: { played?: number }) {
  return (
    <div className="rst-wave" aria-hidden>
      {PEAKS.map((v, i) => (
        <i key={i} className={i < played ? "on" : undefined} style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}

function Transport({ big = true }: { big?: boolean }) {
  return (
    <div className="rst-bar">
      <button className="rst-skip" type="button" aria-label="الرجوع 10 ثوانٍ">
        <ArrowCounterClockwise size={26} /><b>10</b>
      </button>
      <button className="rst-play" type="button" aria-label="تشغيل"><Play size={big ? 28 : 24} weight="fill" /></button>
      <button className="rst-skip" type="button" aria-label="التقدّم 10 ثوانٍ">
        <ArrowClockwise size={26} /><b>10</b>
      </button>
    </div>
  );
}

function Rows({ list, thumbIcon = false }: { list: typeof EPS; thumbIcon?: boolean }) {
  return (
    <div>
      {list.map((e) => (
        <div className="rst-item" key={e.n}>
          <span className="rst-thumb">
            {thumbIcon ? <Waveform size={22} /> : e.n}
            {e.p ? <span className="p"><i style={{ width: `${e.p}%` }} /></span> : null}
          </span>
          <span className="rst-itx">
            <span className="rst-it">{e.t}</span>
            <span className="rst-is">{e.s}</span>
          </span>
          <button className="rst-igo" type="button" aria-label={`تشغيل ${e.t}`}><Play size={15} weight="fill" /></button>
        </div>
      ))}
    </div>
  );
}

/* ── ١ · واجهةُ المحطّة ── */
function Station() {
  return (
    <div className="rst rst-plate">
      <Pattern />
      <div className="rst-body rst-inner">
        <p className="rst-kicker">ADEEB RADIO</p>
        <h1 className="rst-h1">إذاعة أَدِيب</h1>
        <p className="rst-lede">حيثُ يَصيرُ الصوتُ أثرًا. مساحةٌ نحوّل فيها ما يُكتب إلى ما يُسمَع.</p>

        <h2 className="rst-h2">تابع الاستماع</h2>
        <Rows list={[EPS[2]]} />

        <h2 className="rst-h2">البرامج</h2>
        <div className="rst-shelf">
          {["منعطف", "قريبًا", "قريبًا"].map((n, i) => (
            <div className="rst-card" key={i}>
              <span className="rst-cover"><Waveform size={38} /></span>
              <p className="rst-cn">{n}</p>
              <p className="rst-cs">{i === 0 ? "3 حلقات" : "قيد الإعداد"}</p>
            </div>
          ))}
        </div>

        <h2 className="rst-h2">أحدث الحلقات</h2>
        <Rows list={EPS} thumbIcon />
      </div>
    </div>
  );
}

/* ── ٢ · صفحةُ البرنامج ── */
function Show() {
  return (
    <div className="rst rst-plate">
      <Pattern />
      <div className="rst-body rst-inner">
        <p className="rst-kicker">ADEEB RADIO</p>
        <div className="rst-cols">
        <div>
        <div className="mt-4 flex items-center gap-4">
          <span className="rst-cover rst-cover-sm"><Waveform size={34} /></span>
          <span>
            <h1 className="rst-h1" style={{ marginTop: 0 }}>منعطف</h1>
            <p className="rst-meta"><span>حوارٌ عن منعطفات الحياة</span></p>
          </span>
        </div>
        <div className="rst-chips">
          <button className="rst-cta" type="button"><Play size={17} weight="fill" />استمع لآخر حلقة</button>
          <button className="rst-cta rst-cta-2" type="button"><Plus size={17} />تابِع</button>
        </div>
        <p className="rst-lede">
          برنامجٌ أسبوعيٌّ عن مسارات ومنعطفات الحياة، نجلس فيه مع من غيّر طريقَه فنسأله عن اللحظة التي التفت فيها.
        </p>
        </div>
        <div>
        <h2 className="rst-h2">3 حلقات</h2>
        <Rows list={EPS} />
        </div>
        </div>
      </div>
    </div>
  );
}

/* ── ٣ · صفحةُ الحلقة ── */
function Episode() {
  return (
    <div className="rst rst-plate">
      <Pattern />
      <div className="rst-body rst-inner">
        <p className="rst-kicker">MUNATAF — EP 1</p>
        <div className="rst-cols">
        <div>
        <div className="rst-cover" style={{ marginTop: 14 }}><Waveform size={72} /></div>
        <h1 className="rst-h1">من أنا فعلًا؟</h1>
        <div className="rst-meta"><b>الحلقة 1</b><span>13 أغسطس</span><span>11:36</span></div>
        {/* الأفعالُ تسكن عمودَ الهويّة على السعة، فلا يبقى تحت الغلاف خواء.
            وعلى الجوّال تتبع الترتيبَ نفسَه بلا قاعدةٍ ثانية. */}
        <div className="rst-chips rst-aside-acts">
          <button className="rst-chip" type="button"><Heart size={16} />أعجبتني</button>
          <button className="rst-chip" type="button"><ShareNetwork size={16} />مشاركة</button>
        </div>
        </div>
        <div>
        <div className="rst-player">
          <Wave />
          <div className="rst-times">
            <span className="now">3:15</span><span>بقي 8:21</span><span>11:36</span>
          </div>
          <Transport />
          <div className="rst-chips">
            <button className="rst-chip on" type="button">بموسيقى</button>
            <button className="rst-chip" type="button">بلا موسيقى</button>
            <button className="rst-chip" type="button">السرعة 1×</button>
          </div>
        </div>

        <p className="rst-lede">
          سؤالٌ يبدو بسيطًا، لكنه من أصعب ما يواجهه الإنسان في حياته. نفتح فيه بابَ الهويّة ونسأل:
          هل نكتشف أنفسنا أم نصنعها؟
        </p>

        <h2 className="rst-h2">التالي في البرنامج</h2>
        <Rows list={EPS.slice(0, 2)} />
        </div>
        </div>
      </div>
    </div>
  );
}

const SURFACES = [
  { key: "s", name: "واجهةُ المحطّة", path: "/radio", el: <Station /> },
  { key: "p", name: "صفحةُ البرنامج", path: "/radio/munataf", el: <Show /> },
  { key: "e", name: "صفحةُ الحلقة", path: "/radio/munataf/ep-1", el: <Episode /> },
];

const SIZES = [
  { value: "m", label: "جوّال 375" },
  { value: "t", label: "لوح 820" },
  { value: "w", label: "سطح مكتب 1280" },
];

export default function RadioStationLab() {
  const [size, setSize] = useState("m");
  const cls = size === "t" ? "rstlab is-tab" : size === "w" ? "rstlab is-wide" : "rstlab";
  return (
    <main className="py-10 md:py-14">
      <Container>
        <p className="font-latin text-xs tracking-widest text-content-muted">DESIGN SYSTEM, RADIO STATION</p>
        <h1 className="mt-3 font-display text-3xl font-black md:text-4xl">لغةُ المحطّة</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-content-muted">
          الكريميُّ أساسٌ والعنّابيُّ ثانٍ. الأسطحُ الثلاثةُ في ثلاثة مقاسات، والتخطيطُ يتبدّل
          لا يتمدّد: على سطح المكتب تفترق الهويّةُ عن المحتوى عمودين.
        </p>

        <div className="mt-6"><Segmented items={SIZES} value={size} onValueChange={setSize} aria-label="مقاس الشاشة" /></div>

        <div className={`${cls} mt-8`}>
          {SURFACES.map((s) => (
            <section className="rstlab-col" key={s.key} aria-label={s.name}>
              <div className="rstlab-cap">
                <b>{s.name}</b>
                <p className="font-latin" dir="ltr">{s.path}</p>
              </div>
              <div className="rstlab-frame">{s.el}</div>
            </section>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-content-muted">
          نطاقُ الاستثناء: يبقى رأسُ الموقع وتذييلُه وخطُّه وأيقوناتُه وشعارُه لأدِيب،
          ويتحرّر ما داخل <span className="font-latin"> /radio/* </span> وحدَه.
          ولا هكسَ في الشاشة، فكلُّ لونٍ رمزٌ في المكتبة.
        </p>
      </Container>
    </main>
  );
}
