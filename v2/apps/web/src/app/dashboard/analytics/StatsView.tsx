"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, Stat, Segmented, ChartPanel, BarList, Donut, AreaChart, ColumnBars, type BarItem } from "@adeeb/design-system";
import { Users, Timer, Globe, Robot, DeviceMobile } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { ArrowUUpLeft, ArrowBendUpLeft } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { EmptyState } from "../_components/EmptyState";
import type { Analytics, Cat, RecentVisitor } from "./data";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// ألوان قوائم الأشرطة من لوحة المخطّطات الرسميّة (--chart-*) — لا هيكسات شاردة (2=كحليّ · 3=ذهبيّ بيانيّ)
const NAVY = "var(--chart-2)", GOLD = "var(--chart-3)";

const nf = (n: number) => n.toLocaleString("en-US");
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

const RANGES: Array<[number, string]> = [[7, "٧ أيّام"], [30, "٣٠ يومًا"], [90, "٩٠ يومًا"], [3650, "الكلّ"]];

// محوّلٌ لفئات القاعدة {label, count} إلى سلسلة {label, value} — يخدم BarList والحلقة معًا.
const toSeries = (cats: Cat[]): BarItem[] => cats.map((c) => ({ label: c.label, value: c.count }));

// أعمدة جدول «أحدث الزوّار» — على DataTable الموحّد (لا قائمة .st-rv خاصّة).
const recentCols: Column<RecentVisitor>[] = [
  { key: "country", header: "الدولة", width: "1fr", render: (v) => (v.country ? <span className="txt">{v.country}</span> : <span className="txt na">—</span>) },
  { key: "member", header: "النوع", width: "1fr", render: (v) => (v.isMember ? <Badge tone="success" variant="soft">عضو</Badge> : <span className="txt na">زائر</span>) },
  { key: "pageviews", header: "الزيارات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.pageviews)}</span> },
  { key: "sessions", header: "الجلسات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.sessions)}</span> },
];

// توزيع ٢٤ ساعة من بيانات ساعيّة متفرّقة — أعمدة ColumnBars بتسمية كلّ ٦ ساعات.
const hourBars = (hourly: Analytics["hourly"]) => {
  const map = new Map(hourly.map((h) => [h.hour, h.count]));
  return Array.from({ length: 24 }, (_, h) => {
    const c = map.get(h) ?? 0;
    return { value: c, title: `الساعة ${h}: ${nf(c)}`, tick: h % 6 === 0 ? String(h) : undefined };
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

      <ChartPanel title="الزيارات عبر الزمن">
        <AreaChart seriesA="الزيارات" seriesB="الزوّار الفريدون"
          data={data.daily.map((d) => ({ label: fmtDate(d.date), a: d.pageviews, b: d.visitors }))} />
      </ChartPanel>

      <div className="st-grid2">
        <ChartPanel title="أعلى الصفحات"><BarList items={toSeries(data.top_pages)} /></ChartPanel>
        <ChartPanel title="الدول"><BarList items={toSeries(data.countries)} tone={NAVY} /></ChartPanel>
      </div>

      <div className="st-grid2">
        <ChartPanel title="الأجهزة" icon={<DeviceMobile />}><Donut items={toSeries(data.devices)} centerLabel="زيارة" /></ChartPanel>
        <ChartPanel title="المتصفّحات"><BarList items={toSeries(data.browsers)} tone={GOLD} /></ChartPanel>
      </div>

      <div className="st-grid2">
        <ChartPanel title="مصادر الزيارات"><BarList items={toSeries(data.referrers)} tone="var(--chart-4)"
          empty={<EmptyState variant="soft" icon={<Globe aria-hidden />} title="زيارات مباشرة فقط" description="لا مصادر خارجيّة في هذه المدّة." />} /></ChartPanel>
        <ChartPanel title="التوزيع الساعيّ"><ColumnBars bars={hourBars(data.hourly)} /></ChartPanel>
      </div>

      <section>
        <h3 className="mb-3 text-[17px] font-extrabold text-content">أحدث الزوّار</h3>
        <DataTable columns={recentCols} rows={recent} getRowId={(v) => v.id}
          emptyState={<EmptyState icon={<Users />} title="لا زوّار بعد" />} />
      </section>
    </div>
  );
}
