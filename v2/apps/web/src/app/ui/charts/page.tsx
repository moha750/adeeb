"use client";

import { AreaChart, BarList, SectionCard, Container, Donut, HeatGrid } from "@adeeb/design-system";
import { ChartBar, ChartLineUp, Clock, DeviceMobile } from "@phosphor-icons/react";
import { CountryFlag, countryName } from "@/lib/geo";
import { EmptyState } from "../../dashboard/_components/EmptyState";

// خريطة حراريّة تجريبيّة: ٧ أيّام × ٢٤ ساعة (ذروةٌ مسائيّة، مع تفاوتٍ يوميّ)
const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS_LBL = Array.from({ length: 24 }, (_, h) => String(h));
const HEAT = DAYS_AR.map((_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const evening = 42 * Math.max(0, Math.sin((h - 8) / 4.2));
    const wobble = (Math.sin(d * 1.7 + h * 0.8) + 1) * 6;
    return Math.max(0, Math.round(evening * (0.62 + d * 0.05) + wobble - 9));
  }),
);

// سلسلةٌ زمنيّة تجريبيّة (١٤ يومًا) — مساحة (زيارات) + خطّ (زوّار)
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const base = 80 + Math.round(60 * Math.sin(i / 2)) + i * 4;
  return { label: `${i + 1} يوليو`, a: base, b: Math.round(base * 0.62) };
});

const DEVICES = [
  { label: "جوّال", value: 1820 },
  { label: "حاسوب", value: 940 },
  { label: "لوحيّ", value: 180 },
];

/* رموزٌ كما تخزّنها القاعدة — الاسم والعلم يُشتقّان منها (‎lib/geo‎) لا يُكتبان. */
const COUNTRIES = [
  { code: "SA", value: 438 }, { code: "US", value: 35 }, { code: "GB", value: 6 }, { code: "IQ", value: 5 },
];

const PAGES = [
  { label: "/dashboard/members", value: 1240 },
  { label: "/dashboard", value: 980 },
  { label: "/login", value: 610 },
  { label: "/dashboard/surveys", value: 315 },
];

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// الاسم الاحترافيّ بالإنجليزيّة — للبحث عن تصاميم المحترفين لهذا النوع.
function Term({ children }: { children: string }) {
  return <p className="mb-3 font-latin text-xs text-secondary" dir="ltr">↗ search: {children}</p>;
}

export default function ChartsPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">المخطّطات</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          بدائيّات عرض البيانات: ألوان الفئات من <code className="font-latin text-xs" dir="ltr">--chart-1..6</code> بترتيبٍ ثابت،
          الأسطح من رموز الحدّ والظلّ، والنصّ محايدٌ والعلامة اللونيّة بجانبه. كلّ رسمٍ داخل لوحةٍ معنونة.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Lab>لوحة المخطّط: عنوان + أيقونة اختياريّة، ثمّ الرسم</Lab>
            <Term>Chart panel, Card container, Titled panel</Term>
            <div className="flex flex-col gap-4">
              <SectionCard title="لوحةٌ بعنوان">
                <p className="text-content-muted">محتوى الرسم هنا.</p>
              </SectionCard>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SectionCard title="الأجهزة" icon={<DeviceMobile />}>
                  <p className="text-content-muted">لوحةٌ بأيقونة.</p>
                </SectionCard>
                <SectionCard title="النموّ" icon={<ChartLineUp />}>
                  <p className="text-content-muted">داخل شبكةٍ ثنائيّة.</p>
                </SectionCard>
              </div>
            </div>
          </section>

          <section>
            <Lab>المخطّط الزمنيّ: منحنًى ناعمٌ بتدرّجٍ غنيّ (مرّر لترى الشعرة والتلميح)</Lab>
            <Term>Area chart, Time-series, Smooth area</Term>
            <SectionCard title="الزيارات عبر الزمن">
              <AreaChart labels={DAYS.map((d) => d.label)} series={[{ name: "الزيارات", values: DAYS.map((d) => d.a) }, { name: "الزوّار الفريدون", values: DAYS.map((d) => d.b) }]} />
            </SectionCard>
          </section>

          <section>
            <Lab>قائمة أشرطة: لونٌ للقائمة، أو لكلّ عنصر مع وسم، والتلميح يُظهر النسبة من المجموع</Lab>
            <Term>Horizontal bar chart, Bar list, Ranking chart</Term>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SectionCard title="أعلى الصفحات">
                <BarList items={PAGES} />
              </SectionCard>
              <SectionCard title="نتائج التصويت">
                <BarList total={PAGES.reduce((s, p) => s + p.value, 0)} items={[
                  { label: "موافق", value: 820 },
                  { label: "محايد", value: 240 },
                  { label: "معارض", value: 90, color: "var(--chart-6)", note: "(خيار سابق)" },
                ]} />
              </SectionCard>
              <SectionCard title="بأيقونةٍ مشتقّة: أعلامُ الدول">
                <BarList
                  total={COUNTRIES.reduce((s, c) => s + c.value, 0)}
                  items={COUNTRIES.map((c) => ({ label: countryName(c.code), value: c.value, icon: <CountryFlag code={c.code} /> }))}
                />
              </SectionCard>
              <SectionCard title="قائمة فارغة">
                <BarList items={[]} empty={<EmptyState variant="soft" icon={<ChartBar aria-hidden />} title="لا بيانات بعد" description="ستظهر القائمة حين تتوفّر بيانات." />} />
              </SectionCard>
            </div>
          </section>

          <section>
            <Lab>حلقة: قطاعاتٌ بفجوة سطح، رقمٌ مركزيّ، وسقف ٦ فئات يُطوى ما بعدها في «أخرى»</Lab>
            <Term>Donut chart, Pie chart, Ring chart</Term>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SectionCard title="الأجهزة" icon={<DeviceMobile />}>
                <Donut items={DEVICES} unit={{ one: "زيارة", two: "زيارتان", few: "زيارات" }} />
              </SectionCard>
              <SectionCard title="ثمان فئات: الطيّ في «أخرى»">
                <Donut unit={{ one: "عنصر", two: "عنصران", few: "عناصر" }} items={[
                  { label: "الأوّل", value: 300 }, { label: "الثاني", value: 220 }, { label: "الثالث", value: 160 },
                  { label: "الرابع", value: 120 }, { label: "الخامس", value: 90 }, { label: "السادس", value: 60 },
                  { label: "السابع", value: 40 }, { label: "الثامن", value: 20 },
                ]} />
              </SectionCard>
              <SectionCard title="حلقة فارغة، EmptyState">
                <Donut items={[]} empty={<EmptyState variant="soft" icon={<ChartBar aria-hidden />} title="لا توزيع بعد" description="ستظهر الحلقة حين تتوفّر بيانات." />} />
              </SectionCard>
            </div>
          </section>

          <section>
            <Lab>خريطة حراريّة ثنائيّة: يوم × ساعة، كثافةُ لونٍ واحد + الرقم في الخليّة (مرّر لترى التلميح)</Lab>
            <Term>Heatmap, Matrix / calendar heatmap, Punchcard chart</Term>
            <SectionCard title="الازدحام حسب اليوم والساعة" icon={<Clock />}>
              <HeatGrid rows={DAYS_AR} cols={HOURS_LBL} values={HEAT} legendLow="أقلّ ازدحامًا" legendHigh="أكثر ازدحامًا" />
            </SectionCard>
            <div className="mt-4">
              <SectionCard title="خريطة فارغة، EmptyState">
                <HeatGrid rows={[]} cols={[]} values={[]} empty={<EmptyState variant="soft" icon={<Clock aria-hidden />} title="لا نشاط بعد" description="ستظهر الخريطة حين تُسجَّل زيارات." />} />
              </SectionCard>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
