"use client";

import {
  AreaChart, Badge, BarList, SectionCard, ColumnBars,
  Container, Donut, HeatGrid,
} from "@adeeb/design-system";
import { Clock, DeviceMobile } from "@phosphor-icons/react";
import { CountryFlag, countryName } from "@/lib/geo";
import { ICONS } from "@/app/dashboard/_shell/icons";
import { iconKeyForHref } from "@/app/dashboard/_shell/nav";

/* بياناتٌ واحدة للعمودين: المقارنة تصحّ حين يختلف الرسم وحده. (النسخة نفسها في /ui/charts) */
const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS_LBL = Array.from({ length: 24 }, (_, h) => String(h));
const HEAT = DAYS_AR.map((_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const evening = 42 * Math.max(0, Math.sin((h - 8) / 4.2));
    const wobble = (Math.sin(d * 1.7 + h * 0.8) + 1) * 6;
    return Math.max(0, Math.round(evening * (0.62 + d * 0.05) + wobble - 9));
  }),
);
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const base = 80 + Math.round(60 * Math.sin(i / 2)) + i * 4;
  return { label: `${i + 1} يوليو`, a: base, b: Math.round(base * 0.62) };
});
const DEVICES = [
  { label: "جوّال", value: 1820 },
  { label: "حاسوب", value: 940 },
  { label: "لوحيّ", value: 180 },
];
const PAGES = [
  { label: "/dashboard/members", value: 1240 },
  { label: "/dashboard", value: 980 },
  { label: "/login", value: 610 },
  { label: "/dashboard/surveys", value: 315 },
];
/** أيقونةُ المسار من خريطة التنقّل نفسها — المصدر الواحد (‎/login‎ ليس بندًا في اللوحة فلا أيقونةَ له). */
function routeIcon(href: string) {
  const key = iconKeyForHref(href);
  if (!key) return undefined;
  const I = ICONS[key];
  return <I />;
}
const PAGES_ICONS = PAGES.map((p) => ({ ...p, icon: routeIcon(p.label) }));
const U_VIEW = { one: "مشاهدة", two: "مشاهدتان", few: "مشاهدات" };
const U_VISIT = { one: "زيارة", two: "زيارتان", few: "زيارات" };
const PAGES_TOTAL = PAGES.reduce((s, p) => s + p.value, 0);
const LONG_PAGES = [
  ...PAGES,
  { label: "/dashboard/tasks", value: 240 },
  { label: "/dashboard/events", value: 180 },
].map((p) => ({ ...p, icon: routeIcon(p.label) }));
const LONG_TOTAL = LONG_PAGES.reduce((s, p) => s + p.value, 0);

/* رموزٌ حيّةٌ كما تخزّنها القاعدة (‎country_code‎ بمعيار آيزو) — لا أسماءَ مكتوبةً بيدنا. */
const COUNTRIES = [
  { code: "SA", value: 438 }, { code: "US", value: 35 }, { code: "GB", value: 6 },
  { code: "IQ", value: 5 }, { code: "FR", value: 5 }, { code: "EG", value: 2 },
];

const HOUR_BARS_SRC = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.round(38 * Math.max(0, Math.sin((h - 8) / 4.2)) + (h % 3) * 2)));
const HOUR_BARS = HOUR_BARS_SRC.map((v, h) => ({ value: v, label: `الساعة ${h}:00`, tick: h % 6 === 0 ? String(h) : undefined }));

const HOURLY = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.round(38 * Math.max(0, Math.sin((h - 8) / 4.2)) + (h % 3) * 2)));

function Now() {
  return <Badge tone="danger" variant="soft">الحالي</Badge>;
}
function Next() {
  return <Badge tone="success" variant="soft">المقترح</Badge>;
}

/** قسمٌ واحد: عنوان · العلّة · العمودان · ما تغيّر. */
function Compare({
  n, title, ill, comp, now, next, changed, wide,
}: {
  n: string; title: string; ill: string; comp: string;
  now: React.ReactNode; next: React.ReactNode; changed: string[]; wide?: boolean;
}) {
  return (
    <section className="mt-16">
      <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">{n}</p>
      <h2 className="mt-1 font-display text-2xl font-black text-content">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-content-muted">{ill}</p>

      <div className={"mt-5 grid gap-4 " + (wide ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        <SectionCard title={<span className="font-latin text-sm" dir="ltr">{comp}</span>} actions={<Now />}>{now}</SectionCard>
        <SectionCard title={<span className="font-latin text-sm" dir="ltr">{comp}Next</span>} actions={<Next />}>{next}</SectionCard>
      </div>

      <ul className="mt-4 max-w-3xl space-y-1.5 text-sm text-content-muted">
        {changed.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ChartsComparePage() {
  return (
    <main className="py-16">
      <Container className="max-w-6xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design review</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">المخطّطات: الحالي مقابل المقترح</h1>
        <p className="mt-3 max-w-3xl text-content-muted">
سجلُّ قرارات عائلة المخطّطات: كلُّ ما دونه مُقَرٌّ ومُطبَّقٌ في المكتبة نفسها (لا نسخةَ مختبرٍ باقية)،
          والصفحة تُبقيه حيًّا لتراه بالفأرة وباللمس وبتضييق النافذة.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["مقياسٌ مرقّم", "لا خطوطَ شبكةٍ بلا أرقام، ولا رسمَ كميٍّ بلا محور"],
            ["الرقم ليس رهينة", "ما يُقرأ بالنظر لا يُخبَّأ في تحويم، وما بقي يعمل باللمس"],
            ["نسبةٌ لا تكذب", "الرسم بالبكسل الحقيقيّ، فالميل واحدٌ على كلّ شاشة"],
            ["حبرٌ للبيان", "لا زينةَ تنافس البيانات ولا رقمَ مكتوبًا مرّتين"],
          ].map(([t, d]) => (
            <div key={t} className="rounded border border-line bg-surface p-4">
              <p className="font-display text-sm font-black text-content">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-content-muted">{d}</p>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">01</p>
          <h2 className="mt-1 flex items-center gap-3 font-display text-2xl font-black text-content">
            المخطّط الزمنيّ <Badge tone="success" variant="soft">مُعتمَد</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: يبقى الحاليّ كما هو، ويُؤخذ من المقترح شيئان فقط: عدّاد الأرقام يمينًا، وخطّ التاريخ أسفل.
            طُبِّقا في <code className="font-latin text-xs" dir="ltr">AreaChart</code> نفسه، فورثتهما التحليلاتُ ونتائجُ الاستبيانات، وحُذفت نسخة المختبر.
          </p>
          <div className="mt-5">
            <SectionCard title={<span className="font-latin text-sm" dir="ltr">AreaChart</span>} actions={<Badge tone="success" variant="soft">بعد التعديل</Badge>}>
              <AreaChart labels={DAYS.map((d) => d.label)} series={[{ name: "الزيارات", values: DAYS.map((d) => d.a) }, { name: "الزوّار الفريدون", values: DAYS.map((d) => d.b) }]} />
            </SectionCard>
          </div>
          <ul className="mt-4 max-w-3xl space-y-1.5 text-sm text-content-muted">
            {[
              "عدّاد الأرقام على اليمين بإزاء كلّ خطّ شبكة، بسقفٍ مستدير (0، 50، 100، 150، 200) لا برقمٍ شارد.",
              "خطّ قاعٍ عند الصفر تقف عليه المساحة، وتحته تسمياتُ التاريخ ملتصقةً به لا طافيةً بفجوة.",
              "أرقام المحور نصُّ HTML لا SVG: الرسم ممطوطٌ أفقيًّا، ونصُّ SVG داخله يُمطّ معه.",
              "ما عدا ذلك كما هو: اللونان، والمساحتان، والنقاط، والتلميح، والأسطورة.",
            ].map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">02</p>
          <h2 className="mt-1 flex items-center gap-3 font-display text-2xl font-black text-content">
            الخريطة الحراريّة <Badge tone="success" variant="soft">مُعتمَدة كما هي</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: تبقى <code className="font-latin text-xs" dir="ltr">HeatGrid</code> بلا تعديل. رُدّ المقترح وحُذفت نسخته من المكتبة.
          </p>
          <div className="mt-5">
            <SectionCard title={<span className="font-latin text-sm" dir="ltr">HeatGrid</span>} icon={<Clock />} actions={<Badge tone="success" variant="soft">بلا تعديل</Badge>}>
              <HeatGrid rows={DAYS_AR} cols={HOURS_LBL} values={HEAT} legendLow="أقلّ ازدحامًا" legendHigh="أكثر ازدحامًا" />
            </SectionCard>
          </div>
        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">03</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black text-content">
            الحلقة <Badge tone="success" variant="soft">مُعتمَدة</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: الحركة كما عُرضت، والتخطيط «ج، أسطورةٌ بأشرطة» من ثلاثةٍ عُرضت. حلّت محلّ القديمة وأخذت
            اسم <code className="font-latin text-xs" dir="ltr">Donut</code>، فورثتها التحليلاتُ ونتائجُ الاستبيانات، وأُعدم أخواها.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title={<span className="font-latin text-sm" dir="ltr">Donut</span>} icon={<DeviceMobile />} actions={<Badge tone="success" variant="soft">بعد التعديل</Badge>}>
              <Donut items={DEVICES} unit={U_VISIT} />
            </SectionCard>
            <SectionCard title="ستّ فئاتٍ وأكثر: الطيّ في «أخرى»" actions={<Badge tone="neutral" variant="soft">حدّ اللوحة</Badge>}>
              <Donut unit={{ one: "عنصر", two: "عنصران", few: "عناصر" }} items={[
                { label: "الأوّل", value: 300 }, { label: "الثاني", value: 220 }, { label: "الثالث", value: 160 },
                { label: "الرابع", value: 120 }, { label: "الخامس", value: 90 }, { label: "السادس", value: 60 },
                { label: "السابع", value: 40 }, { label: "الثامن", value: 20 },
              ]} />
            </SectionCard>
          </div>
          <ul className="mt-4 max-w-3xl space-y-1.5 text-sm text-content-muted">
            {[
              "الحلقة تُقاس من الكرت (بحدَّي 112 و156) فلا تبقى ١٤٠px في كرتٍ عرضه خمس مئة.",
              "كلّ سطر: تسميةٌ وعددٌ ونسبةٌ مكتوبة، وتحته شريطُ نسبته، فالفراغ يمتلئ بمعلومةٍ لا بحشو.",
              "التحويم يُفرد القطاع في القلب ويُخفت إخوته، والضغط يُخفي. والنسبة من المجموع الكامل دائمًا فلا تقفز.",
              "ينقلب عموديًّا تحت 480px والحلقة تتوسّط، والأشرطة تمتدّ بعرض الشاشة.",
            ].map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">04</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black text-content">
            قائمة الأشرطة <Badge tone="success" variant="soft">مُعتمَدة</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: سطرُ قراءةٍ فوق شريطٍ بعرض البطاقة، وأيقونةٌ ترسو في بلاطة، ونغمةُ البلاطة بقاعدةٍ
            واحدةٍ آليّة. حلّت محلّ القديمة وأخذت اسم <code className="font-latin text-xs" dir="ltr">BarList</code>،
            فورثتها التحليلاتُ ونتائجُ الاستبيانات.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="أعلى الصفحات: أيقونةُ المسار من خريطة التنقّل" actions={<Badge tone="success" variant="soft">بعد التعديل</Badge>}>
              <BarList items={PAGES_ICONS} total={PAGES_TOTAL} unit={U_VIEW} />
            </SectionCard>
            <SectionCard title="ألوانٌ في الصفوف: بلاطاتٌ منسَّمة" actions={<Badge tone="success" variant="soft">القاعدة الآليّة</Badge>}>
              <BarList
                total={1150} unit={{ one: "إجابة", two: "إجابتان", few: "إجابات" }}
                items={[
                  { label: "موافق", value: 820, icon: <ICONS.active />, color: "var(--chart-1)" },
                  { label: "محايد", value: 240, icon: <ICONS.pending />, color: "var(--chart-3)" },
                  { label: "معارض", value: 90, icon: <ICONS.suspended />, color: "var(--chart-6)", note: "(خيار سابق)" },
                ]}
              />
            </SectionCard>
            <SectionCard title="الدول: العلمُ والاسمُ من الرمز وحده" actions={<Badge tone="success" variant="soft">lib/geo</Badge>}>
              <BarList
                total={COUNTRIES.reduce((s, c) => s + c.value, 0)} unit={U_VISIT}
                items={COUNTRIES.map((c) => ({ ...c, label: countryName(c.code), icon: <CountryFlag code={c.code} /> }))}
              />
            </SectionCard>
            <SectionCard title="قائمةٌ أطول: ستّة مسارات" actions={<Badge tone="neutral" variant="soft">rhythm</Badge>}>
              <BarList items={LONG_PAGES} total={LONG_TOTAL} unit={U_VIEW} />
            </SectionCard>
          </div>

        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">05</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black text-content">
            مدرّج الأعمدة <Badge tone="success" variant="soft">مُعتمَد</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: تعبئةٌ رأسيّة من الهوية بقمّةٍ مضيئة، وخلفها خطوطُ الشبكة وحدها (لا أنبوب)، وتحويمٌ
            يُخفت الإخوةَ بلا ظلٍّ يتوهّج. حلّ محلّ القديم وأخذ اسم <code className="font-latin text-xs" dir="ltr">ColumnBars</code>،
            فورثته التحليلاتُ ونتائجُ الاستبيانات.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4">
            <SectionCard title="التوزيع الساعيّ: أربعةٌ وعشرون عمودًا" actions={<Badge tone="success" variant="soft">بعد التعديل</Badge>}>
              <ColumnBars height={148} bars={HOUR_BARS} />
            </SectionCard>
            <SectionCard title="أعمدةٌ قليلةٌ عريضة: توزيع أوقات الإجابة" actions={<Badge tone="neutral" variant="soft">barMaxWidth</Badge>}>
              <ColumnBars height={132} barMaxWidth={44} bars={[
                { value: 12, tick: "أقلّ من دقيقة", label: "أقلّ من دقيقة" },
                { value: 48, tick: "١ إلى ٣", label: "من دقيقة إلى ثلاث" },
                { value: 31, tick: "٣ إلى ٥", label: "من ثلاث إلى خمس" },
                { value: 9, tick: "٥ إلى ١٠", label: "من خمس إلى عشر" },
                { value: 3, tick: "أكثر", label: "أكثر من عشر" },
              ]} />
            </SectionCard>
          </div>
        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">06</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black text-content">
            مكوّنان أُعدما <Badge tone="danger" variant="soft">حُذفا</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            <code className="font-latin text-xs" dir="ltr">HeatStrip</code> (شريطٌ حراريّ بلا رقمٍ ولا مقياس) و
            <code className="font-latin text-xs" dir="ltr">RadialHours</code> (ساعةٌ قطبيّة تُقارن أطوالًا على زوايا مختلفة):
            كانا مُصدَّرين من المكتبة، لا يستعملهما أحد، ولا يظهران في معرض. حُذف المكوّنان وأنماطهما وتصديرهما.
            وبديلُ الأوّل حاضر: مدرّجُ الأعمدة نفسه بمحوره وقراءته.
          </p>
        </section>

        <section className="mt-16">
          <p className="font-latin text-xs font-bold tracking-[0.2em] text-secondary">07</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black text-content">
            اتّجاه الزمن <Badge tone="success" variant="soft">مُعتمَد: يمين ← يسار</Badge>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-content-muted">
            قرارك: أقدمُ نقطةٍ عند اليمين والأحدثُ عند اليسار، في الزمنيّ والحراريّة معًا. نُفِّذ داخل
            <code className="font-latin text-xs" dir="ltr"> AreaChart </code> نفسه (دالّةُ الموضع والالتقاطُ بالمؤشّر وأسهمُ لوحة المفاتيح)،
            والخريطةُ تقرأ هكذا أصلًا فلم تُمسّ.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4">
            <SectionCard title="الزمنيّ: ١ يوليو يمينًا و١٤ يسارًا" actions={<Badge tone="success" variant="soft">بعد التعديل</Badge>}>
              <AreaChart labels={DAYS.map((d) => d.label)} series={[{ name: "الزيارات", values: DAYS.map((d) => d.a) }, { name: "الزوّار الفريدون", values: DAYS.map((d) => d.b) }]} />
            </SectionCard>
            <SectionCard title="أربع سلاسل: لكلٍّ لونٌ ونمطُ تقطيع، والأسطورة تُفرد" actions={<Badge tone="neutral" variant="soft">series</Badge>}>
              <AreaChart
                labels={DAYS.map((d) => d.label)}
                series={[
                  { name: "الزيارات", values: DAYS.map((d) => d.a) },
                  { name: "الزوّار الفريدون", values: DAYS.map((d) => d.b) },
                  { name: "الأعضاء", values: DAYS.map((d) => Math.round(d.b * 0.45)) },
                  { name: "الزوّار العائدون", values: DAYS.map((d) => Math.round(d.a * 0.22)) },
                ]}
              />
            </SectionCard>
            <SectionCard title="الحراريّة: الساعة صفر يمينًا" icon={<Clock />} actions={<Badge tone="success" variant="soft">بلا تعديل</Badge>}>
              <HeatGrid rows={DAYS_AR} cols={HOURS_LBL} values={HEAT} legendLow="أقلّ ازدحامًا" legendHigh="أكثر ازدحامًا" />
            </SectionCard>
          </div>
        </section>

        <section className="mt-16 rounded border border-line bg-surface-2 p-6">
          <h2 className="font-display text-xl font-black text-content">قراران ينتظرانك (لم ألمسهما)</h2>
          <ol className="mt-3 space-y-3 text-sm text-content-muted">
            <li>
              <b className="text-content">اتّجاه الزمن.</b> الزمنيّ يسير اليوم يسارًا←يمينًا، والخريطة الحراريّة تسير يمينًا←يسارًا:
              الساعة صفرٌ عند اليمين والثالثة والعشرون عند اليسار. أحدهما يخالف الآخر في الشاشة نفسها. أبقيتُ كلًّا على حاله كي
              لا أقرّر عنك: نوحّدهما على العربيّ (يمين←يسار) أم على المألوف في لوحات التحليلات (يسار←يمين)؟
            </li>
            <li>
              <b className="text-content">اسم SectionCard.</b> ليس مخطّطًا: يلفّ حقول نماذج في ستّة ملفّات (الأسئلة الشائعة، الأعمال،
              الباركود، بناء الاستبيان…). اسمه الصادق SectionCard. إعادة التسمية تمسّ ستّة ملفّات ولا تغيّر بكسلًا واحدًا.
            </li>
          </ol>
        </section>
      </Container>
    </main>
  );
}
