"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, Card, CardHeader, Stat, Segmented, SectionCard, BarList, Donut, AreaChart, ColumnBars, type BarItem } from "@adeeb/design-system";
import { Users, Timer, Globe, Robot, DeviceMobile } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { ArrowUUpLeft, ArrowBendUpLeft } from "@/app/_components/glyphs";
import { CountryFlag, countryName } from "@/lib/geo";
import { ICONS } from "../_shell/icons";
import { iconKeyForHref } from "../_shell/nav";
import { DataTable, type Column } from "../_components/DataTable";
import { EmptyState } from "../_components/EmptyState";
import type { Analytics, Cat, RecentVisitor } from "./data";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// نغمةُ قوائم الأشرطة **واحدةٌ** (الافتراضيّة `--chart-1`) — أُزيلت النغمات الأربع ٢٠٢٦-٠٨-٠٩:
// اللونُ في قائمةٍ أحاديّة السلسلة لا يشفّر شيئًا، فأربعُ نغماتٍ في صفحةٍ واحدة تدفع القارئ يبحث
// عن معنًى غير موجود، وتُنازع الحلقةَ والخريطةَ اللتين يحمل لونُهما معنًى. واللونُ يبقى حيث يشفّر
// (خيارٌ سابقٌ بـchart-6 في الاستبيانات · «أخرى» رماديّة في الحلقة).

const nf = (n: number) => n.toLocaleString("en-US");
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

// وحداتُ العدّ في قوائم التحليلات — تُصرَّف عربيًّا داخل `BarList`.
const U_VIEW = { one: "مشاهدة", two: "مشاهدتان", few: "مشاهدات" };
const U_VISIT = { one: "زيارة", two: "زيارتان", few: "زيارات" };

const RANGES: Array<[number, string]> = [[7, "٧ أيّام"], [30, "٣٠ يومًا"], [90, "٩٠ يومًا"], [3650, "الكلّ"]];

// محوّلٌ لفئات القاعدة {label, count} إلى سلسلة {label, value} — يخدم BarList والحلقة معًا.
const toSeries = (cats: Cat[]): BarItem[] => cats.map((c) => ({ label: c.label, value: c.count }));

// أيقونةُ المسار من **خريطة التنقّل نفسها**: ما يراه العضو في الشريط الجانبيّ يراه هنا، فلا أيقونةَ
// تُخترَع لقائمة. وما ليس بندًا في اللوحة (‎/login‎ وصفحات الموقع العامّ) يبقى موضعه فراغًا.
// الدول: الرمز الخام (SA) يصير اسمًا عربيًّا وعلمًا — المصدر الواحد `lib/geo.ts` (لا جدولَ هنا).
const withCountries = (cats: Cat[]): BarItem[] =>
  cats.map((c) => ({ label: countryName(c.label), value: c.count, icon: <CountryFlag code={c.label} /> }));

const withRouteIcons = (cats: Cat[]): BarItem[] =>
  toSeries(cats).map((it) => {
    const key = iconKeyForHref(it.label);
    if (!key) return it;
    const I = ICONS[key];
    return { ...it, icon: <I /> };
  });

// أعمدة جدول «أحدث الزوّار» — على DataTable الموحّد (لا قائمة .st-rv خاصّة).
const recentCols: Column<RecentVisitor>[] = [
  { key: "country", header: "الدولة", width: "1fr", render: (v) => (v.country ? <span className="txt"><CountryFlag code={v.country} /> {countryName(v.country)}</span> : <span className="txt na">—</span>) },
  { key: "member", header: "النوع", width: "1fr", render: (v) => (v.isMember ? <Badge tone="success" variant="soft">عضو</Badge> : <span className="txt na">زائر</span>) },
  { key: "pageviews", header: "الزيارات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.pageviews)}</span> },
  { key: "sessions", header: "الجلسات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.sessions)}</span> },
];

// توزيع ٢٤ ساعة من بيانات ساعيّة متفرّقة — أعمدة ColumnBars بتسمية كلّ ٦ ساعات.
const hourBars = (hourly: Analytics["hourly"]) => {
  const map = new Map(hourly.map((h) => [h.hour, h.count]));
  return Array.from({ length: 24 }, (_, h) => {
    const c = map.get(h) ?? 0;
    return { value: c, label: `الساعة ${h}:00`, tick: h % 6 === 0 ? String(h) : undefined };
  });
};

export function StatsView({ data, recent, days }: { data: Analytics; recent: RecentVisitor[]; days: number }) {
  const k = data.kpis;
  const kpis = useMemo(() => [
    { icon: <Eye />, n: nf(k.pageviews), l: "زيارة (صفحة)" },
    { icon: <Users />, n: nf(k.visitors), l: "زائر فريد" },
    { icon: <ArrowUUpLeft />, n: nf(k.sessions), l: "جلسة" },
    { icon: <Timer />, n: fmtDur(k.avg_seconds), l: "متوسّط المدّة" },
    { icon: <ArrowBendUpLeft />, n: `${k.bounce_rate}٪`, l: "معدّل الارتداد" },
    { icon: <Globe />, n: nf(k.countries), l: "دولة" },
    { icon: <Robot />, n: nf(data.bots), l: "زيارة روبوت" },
  ], [k, data.bots]);

  return (
    <div className="st">
      <div className="st-tools">
        <Segmented aria-label="مدى المدّة" linkAs={Link} value={String(days)}
          items={RANGES.map(([d, lbl]) => ({ value: String(d), href: `/dashboard/analytics?days=${d}`, label: lbl }))} />
        <span className="st-note">لا يشمل الصفحات الإداريّة ولا الروبوتات</span>
      </div>

      <div className="stat-grid">
        {kpis.map((x, i) => (
          <Stat key={i} icon={x.icon} value={x.n} label={x.l} />
        ))}
      </div>

      <SectionCard title="الزيارات عبر الزمن">
        <AreaChart
          labels={data.daily.map((d) => fmtDate(d.date))}
          series={[
            { name: "الزيارات", values: data.daily.map((d) => d.pageviews) },
            { name: "الزوّار الفريدون", values: data.daily.map((d) => d.visitors) },
          ]}
        />
      </SectionCard>

      <div className="st-grid2">
        <SectionCard title="أعلى الصفحات"><BarList items={withRouteIcons(data.top_pages)} unit={U_VIEW} /></SectionCard>
        <SectionCard title="الدول"><BarList items={withCountries(data.countries)} unit={U_VISIT} /></SectionCard>
      </div>

      <div className="st-grid2">
        <SectionCard title="الأجهزة" icon={<DeviceMobile />}><Donut items={toSeries(data.devices)} unit={U_VISIT} /></SectionCard>
        <SectionCard title="المتصفّحات"><BarList items={toSeries(data.browsers)} unit={U_VISIT} /></SectionCard>
      </div>

      <div className="st-grid2">
        <SectionCard title="مصادر الزيارات"><BarList items={toSeries(data.referrers)} unit={U_VISIT}
          empty={<EmptyState variant="soft" icon={<Globe aria-hidden />} title="زيارات مباشرة فقط" description="لا مصادر خارجيّة في هذه المدّة." />} /></SectionCard>
        <SectionCard title="التوزيع الساعيّ"><ColumnBars bars={hourBars(data.hourly)} /></SectionCard>
      </div>

      {/* كرتٌ برأسٍ منسّم كسائر لوحات هذه الصفحة (`SectionCard` هو الكرتُ نفسُه) — كان عنوانًا
          شاردًا بأنماط مضمَّنة خارج المكتبة (ق١)، وهو الجوابُ الرابع في الموقع عن سؤالٍ واحد:
          «كيف يُعنوَن جدول؟». والجدولُ ابنُ الكرت مباشرةً فيبلغ حافّتيه بلا إطارٍ ثانٍ. */}
      <Card>
        <CardHeader variant="soft" icon={<Users />} title="أحدث الزوّار" />
        <DataTable columns={recentCols} rows={recent} getRowId={(v) => v.id}
          emptyState={<EmptyState icon={<Users />} title="لا زوّار بعد" />} />
      </Card>
    </div>
  );
}
