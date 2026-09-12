"use client";

import { useRef, useState } from "react";
import { AnchoredPopover, Badge, Button, Container, Divider, Field, Segmented, Stat } from "@adeeb/design-system";
import { CalendarBlank, CalendarDots, Timer, Users } from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, Eye } from "@/app/_components/glyphs";
import { RangePicker } from "@/app/dashboard/analytics/RangePicker";
import { PRESETS, presetRange, previousRange, rangeLabel, todayKey, type DayRange } from "@/lib/analyticsRange";

/**
 * معرضُ ضابط المدّة في «إحصائيّات الزوّار» — **اختيارٌ للمالك**، ثمّ يبقى واحدٌ ويُعدم الباقي.
 *
 * **المسألة:** الشاشةُ اليوم تجيب عن سؤالٍ واحد: «كم في آخر ٧ أو ٣٠ أو ٩٠ يومًا أو الكلّ».
 * فلا يُسأل عن شهرٍ بعينه (رمضان · أسبوعُ الفعاليّة)، ولا يُقارَن رقمٌ بما قبله، ولا يُحفظ
 * اختيارٌ. والثلاثةُ أدناه تختلف في **أين يسكن الخيار** لا في زخرفته:
 *
 * - **أ** يُبقي الشريطَ القائم ويزيده بابًا خامسًا «مخصّص» — أقلُّ تبديلٍ لِما تعوّدته العين.
 * - **ب** يطوي المدّةَ كلَّها في زرٍّ واحدٍ يقول ما هو مختارٌ الآن، ويفتح لوحةً فيها
 *   الاختصاراتُ الثمانية و«من/إلى» والمقارنة. صفٌّ واحدٌ على 375px يبقى فيه متّسعٌ لباب الزيارة.
 * - **ج** يبسط الاختصاراتِ شرائحَ تُمرَّر بالإصبع — تُرى كلُّها بلا فتح، وثمنُها صفٌّ يُمرَّر.
 *
 * وكلُّها بالبيانات نفسِها وبالعرض نفسِه ليُقارَن ما يختلف وحدَه. والمقارنةُ معروضةٌ أسفلَ
 * كلِّ توجّهٍ على كروت الإحصاء: هي الغنى الحقيقيّ، والضابطُ بابُها لا هي.
 *
 * **واختار المالكُ «ب» ومعها المقارنة** (٢٠٢٦-٠٨-٣١)، فنزلت حيّةً في «إحصائيّات الزوّار»
 * مكوّنًا اسمُه `RangePicker`. ثمّ سأل: أين يسكن مبدّلُ الأبواب إن امتدّ زرُّ المدّة؟ فعُرضت
 * أربعةُ تخطيطاتٍ أسفلَ الصفحة **فاختار «د»: سطران ممتدّان** (بلفظه: «ز مع تعديل أن يكون
 * الاثنان ممتدَّين سطرين»)، فذاك ما نزل. وتبقى هذه الصفحةُ سجلًّا للقرار وما رُفض معه.
 */

// حسابُ المدد وأسماؤه ومقارنتُه كلُّها من المصدر الواحد `lib/analyticsRange` — المعرضُ
// يعرض ما تعرضه الشاشةُ الحيّة بعينه، فلا نسخةَ ثانيةً تُصيب هنا وتُخطئ هناك.
type Range = DayRange;
const preset = (key: string, today: string): Range => presetRange(key, today) ?? { from: "2026-05-03", to: today };
const label = rangeLabel;
const previous = previousRange;

// ————— لوحةُ الاختيار: مشتركةٌ بين التوجّهات الثلاثة فما يُقارَن هو موضعُها لا محتواها —————
function RangePanel({
  value, onPick, compare, onCompare, onClose,
}: {
  value: { key: string; range: Range };
  onPick: (key: string, range: Range) => void;
  compare?: boolean;
  onCompare?: (v: boolean) => void;
  onClose: () => void;
}) {
  const today = todayKey();
  const [from, setFrom] = useState(value.range.from);
  const [to, setTo] = useState(value.range.to);

  return (
    <div className="drng-panel">
      <div className="drng-quick">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={"drng-qb" + (value.key === p.key ? " on" : "")}
            onClick={() => { const r = preset(p.key, today); setFrom(r.from); setTo(r.to); onPick(p.key, r); onClose(); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* الاختصاراتُ ومدّةُ «من/إلى» بديلان متساويان لا خطوتان، فالفاصلُ بكلمته في محلّه */}
      <Divider label="أو" />

      <div className="drng-dates">
        <Field
          label="من" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم"
          value={from} max={to} onChange={(e) => setFrom(e.target.value)}
        />
        <Field
          label="إلى" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم"
          value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {onCompare ? (
        <div className="drng-cmp">
          <span>قارِن بالفترة السابقة</span>
          <Segmented
            aria-label="المقارنة بالفترة السابقة"
            value={compare ? "on" : "off"}
            onValueChange={(v) => onCompare(v === "on")}
            items={[{ value: "on", label: "نعم" }, { value: "off", label: "لا" }]}
          />
        </div>
      ) : null}

      <div className="drng-foot">
        <Button size="sm" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button size="sm" onClick={() => { onPick("custom", { from, to }); onClose(); }}>طبّق</Button>
      </div>
    </div>
  );
}

// ————— أثرُ المقارنة على الأرقام: ما تشتريه الميزةُ فعلًا —————
const DEMO = [
  { icon: <Eye />, n: "1,240", l: "زيارة (صفحة)", d: 18 },
  { icon: <Users />, n: "412", l: "زائر فريد", d: 6 },
  { icon: <Timer />, n: "2د 14ث", l: "متوسّط المدّة", d: -9 },
];

function DemoStats({ compare, range }: { compare: boolean; range: Range }) {
  const prev = previous(range);
  return (
    <>
      <div className="stat-grid mt-3">
        {DEMO.map((s) => (
          <Stat
            key={s.l}
            icon={s.icon}
            value={s.n}
            label={s.l}
            trend={compare ? (
              <Badge tone={s.d >= 0 ? "success" : "danger"} size="sm" icon={s.d >= 0 ? <ArrowUp /> : <ArrowDown />}>
                <span className="font-latin">{Math.abs(s.d)}٪</span>
              </Badge>
            ) : undefined}
          />
        ))}
      </div>
      {compare ? <p className="drng-note mt-2">مقارنةً بـ{label(prev)}</p> : null}
    </>
  );
}

// ————— التوجّه أ: الشريطُ القائم + بابٌ خامس «مخصّص» —————
function ShapeA() {
  const today = todayKey();
  const [sel, setSel] = useState({ key: "mtd", range: preset("mtd", today) });
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const items = [
    { value: "7", label: <><span className="seg-num">7</span> أيّام</> },
    { value: "30", label: <><span className="seg-num">30</span> يومًا</> },  /* سجلُّ الشريط القديم كما كان */
    { value: "90", label: <><span className="seg-num">90</span> يومًا</> },
    { value: "all", label: "الكلّ" },
    { value: "custom", label: "مخصّص" },
  ];

  return (
    <>
      <div ref={barRef} className="seg-row">
        <Segmented
          aria-label="مدى المدّة"
          value={sel.key}
          onValueChange={(v) => (v === "custom" ? setOpen(true) : setSel({ key: v, range: preset(v, today) }))}
          items={items}
        />
      </div>
      <p className="drng-note mt-2">المختار: {label(sel.range)}</p>
      <AnchoredPopover open={open} anchorRef={barRef} onDismiss={() => setOpen(false)} align="end" className="tb-fs-panel">
        <RangePanel value={sel} onPick={(key, range) => setSel({ key, range })} onClose={() => setOpen(false)} />
      </AnchoredPopover>
      <DemoStats compare={false} range={sel.range} />
    </>
  );
}

// ————— التوجّه ب: **المكوّنُ الحيّ نفسُه** (`RangePicker`) لا نسخةٌ ثانيةٌ من وسمه —————
// فما يُعايَن هنا هو ما يعمل في الشاشة، وأيُّ تعديلٍ عليه يظهر في الموضعين معًا. والعناوينُ
// معطَّلةٌ («#») كي لا يغادر المعاينُ الصفحة، والمقارنةُ حالةٌ محلّيّةٌ تُري أثرَ المفتاح.
function ShapeB() {
  const today = todayKey();
  const [compare, setCompare] = useState(true);
  const range = preset("mtd", today);
  return (
    <>
      <RangePicker preset="mtd" range={range} compare={compare} href={(patch) => (patch.compare !== undefined ? (setCompare(patch.compare), "#") : "#")} />
      <DemoStats compare={compare} range={range} />
    </>
  );
}

// ————— التوجّه ج: شرائحُ تُمرَّر بالإصبع، والمخصّصُ آخرُها —————
function ShapeC() {
  const today = todayKey();
  const [sel, setSel] = useState({ key: "mtd", range: preset("mtd", today) });
  const [compare, setCompare] = useState(true);
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="arlab-chips">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={"arlab-chip" + (sel.key === p.key ? " on" : "")}
            onClick={() => setSel({ key: p.key, range: preset(p.key, today) })}
          >
            {p.label}
          </button>
        ))}
        <button ref={chipRef} type="button" className={"arlab-chip" + (sel.key === "custom" ? " on" : "")} onClick={() => setOpen(true)}>
          مخصّص
        </button>
      </div>
      <div className="drng-cmp mt-3">
        <span>قارِن بالفترة السابقة</span>
        <Segmented
          aria-label="المقارنة بالفترة السابقة"
          value={compare ? "on" : "off"}
          onValueChange={(v) => setCompare(v === "on")}
          items={[{ value: "on", label: "نعم" }, { value: "off", label: "لا" }]}
        />
      </div>
      <AnchoredPopover open={open} anchorRef={chipRef} onDismiss={() => setOpen(false)} align="end" className="tb-fs-panel">
        <RangePanel value={sel} onPick={(key, range) => setSel({ key, range })} onClose={() => setOpen(false)} />
      </AnchoredPopover>
      <DemoStats compare={compare} range={sel.range} />
    </>
  );
}


// ————— وأين يسكن مبدّلُ الأبواب إن امتدّ زرُّ المدّة؟ ثلاثةُ تخطيطات —————
// الأعدادُ في التسميات نموذجٌ ثابت: هي في الشاشة الحيّة عددُ ما وراء كلّ باب.
const DOORS: Array<[string, string, string]> = [
  ["all", "البابان", "1,180"],
  ["web", "الموقع", "1,024"],
  ["app", "التطبيق", "156"],
];

function Doors({ wide }: { wide?: boolean }) {
  const [v, setV] = useState("all");
  return (
    <Segmented
      aria-label="باب الزيارة"
      wide={wide}
      value={v}
      onValueChange={setV}
      items={DOORS.map(([k, l, n]) => ({ value: k, label: <>{l} <span className="seg-num">{n}</span></> }))}
    />
  );
}

function Layout({ kind }: { kind: "stacked-wide" | "stacked-natural" | "one-row" | "row-grow" }) {
  const range = preset("30", todayKey());
  const picker = (
    <RangePicker
      preset="mtd" range={range} compare href={() => "#"}
      wide={kind === "stacked-wide" || kind === "stacked-natural"}
      grow={kind === "row-grow"}
    />
  );
  if (kind === "one-row" || kind === "row-grow") return <div className="seg-row">{picker}<Doors /></div>;
  return (
    <div className="drng-stack">
      {picker}
      {/* الطبيعيُّ يبقى بعرض كلماته: لا يُلفّ بـ`.seg-row` وإلّا مدّه استعلامُ الحاوية فصار نظيرَ «د» */}
      {kind === "stacked-wide" ? <Doors wide /> : <div><Doors /></div>}
    </div>
  );
}

const WIDTHS = [
  { value: "375", label: <span className="font-latin">375</span> },
  { value: "480", label: <span className="font-latin">480</span> },
  { value: "760", label: <span className="font-latin">760</span> },
];

function Shape({ tag, note, children }: { tag: string; note: string; children: React.ReactNode }) {
  return (
    <div className="phdlab-col">
      <div className="phdlab-tag"><span className="dot" /><b>{tag}</b></div>
      <p className="drng-note mb-2">{note}</p>
      <div className="phdlab-frame">{children}</div>
    </div>
  );
}

export default function AnalyticsRangeLab() {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Analytics Range</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">ضابطُ المدّة في الإحصائيّات</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ثلاثةُ توجّهاتٍ لِما يحلّ محلّ «٧ و٣٠ و٩٠ والكلّ»: مدّةٌ مخصّصة، واختصاراتٌ
          تعرف الشهرَ والسنة، ومقارنةٌ بالفترة السابقة تحت كلّ رقم. الأرقامُ في الكروت
          نموذجٌ ثابتٌ ليُرى أثرُ المقارنة، والتواريخُ حقيقيّةٌ محسوبةٌ بتوقيت الرياض.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="phdlab mt-10" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <Shape tag="أ) الشريطُ نفسُه وبابٌ خامس" note="أقلُّ تبديل: يبقى ما تعرفه العين، و«مخصّص» يفتح من/إلى. وخمسةُ أبوابٍ على 375px تضيق.">
            <ShapeA />
          </Shape>
          <Shape tag="ب) زرُّ المدّة" note="المدّةُ كلُّها في زرٍّ يقول المختارَ الآن، واللوحةُ تحمل الاختصاراتِ ومن/إلى والمقارنة.">
            <ShapeB />
          </Shape>
          <Shape tag="ج) شرائحُ تُمرَّر" note="تُرى الخياراتُ كلُّها بلا فتح، وثمنُها صفٌّ يُمرَّر بالإصبع ومقارنةٌ في سطرٍ مستقلّ.">
            <ShapeC />
          </Shape>
        </div>

        {/* سؤالُ المالك ٢٠٢٦-٠٨-٣١: زرُّ المدّة ممتدًّا أجمل، فأين يسكن مبدّلُ الأبواب؟ */}
        <h2 className="mt-16 font-display text-2xl font-black text-content">وأين يسكن مبدّلُ الأبواب؟</h2>
        <p className="mt-2 mb-6 max-w-2xl text-sm text-content-muted">
          زرُّ المدّة ممتدًّا يملأ سطرَه، فيلزم المبدّلَ موضعٌ. ثلاثةُ تخطيطاتٍ بالعرض نفسِه،
          والفرقُ بينها سطرٌ يُكسَب أو يُبذَل.
        </p>
        <div className="phdlab" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <Shape tag="د) الاثنان ممتدّان" note="سطران، كلٌّ يملأ عرضَه. أوضحُها للإبهام، وأطولُها.">
            <Layout kind="stacked-wide" />
          </Shape>
          <Shape tag="هـ) المدّةُ ممتدّةٌ والأبوابُ بعرضها" note="سطران، والثاني بقدر كلماته فيبقى في الصفحة هواء.">
            <Layout kind="stacked-natural" />
          </Shape>
          <Shape tag="ز) سطرٌ واحد والمدّةُ تبتلع ما بقي" note="على الحاسوب تمتدّ المدّةُ إلى حافّة الأبواب، وعلى الجوّال ينكسران سطرين ممتدّين.">
            <Layout kind="row-grow" />
          </Shape>
          <Shape tag="و) سطرٌ واحد (الحالُ اليوم)" note="على الحاسوب سطرٌ واحد يجمعهما، وعلى الجوّال ينكسران سطرين من تلقائهما.">
            <Layout kind="one-row" />
          </Shape>
        </div>
      </div>
    </main>
  );
}
