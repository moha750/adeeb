"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardHeader, Stat, Segmented, SectionCard, BarList, Donut, AreaChart, HeatGrid, type BarItem } from "@adeeb/design-system";
import { Users, Timer, Globe, Robot, DeviceMobile, MapPin, UserPlus, Clock } from "@phosphor-icons/react";
import { Eye, SignOut } from "@/app/_components/glyphs";
import { ArrowUUpLeft, ArrowBendUpLeft } from "@/app/_components/glyphs";
import { deviceName } from "@/lib/devices";
import { CountryFlag, cityName, cityOf, countryName } from "@/lib/geo";
import { ICONS } from "../_shell/icons";
import { iconKeyForHref } from "../_shell/nav";
import { DataTable, type Column } from "../_components/DataTable";
import { EmptyState } from "../_components/EmptyState";
import type { Analytics, Cat, RecentVisitor, Source } from "./data";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// نغمةُ قوائم الأشرطة **واحدةٌ** (الافتراضيّة `--chart-1`) — أُزيلت النغمات الأربع ٢٠٢٦-٠٨-٠٩:
// اللونُ في قائمةٍ أحاديّة السلسلة لا يشفّر شيئًا، فأربعُ نغماتٍ في صفحةٍ واحدة تدفع القارئ يبحث
// عن معنًى غير موجود، وتُنازع الحلقةَ والخريطةَ اللتين يحمل لونُهما معنًى. واللونُ يبقى حيث يشفّر
// (خيارٌ سابقٌ بـchart-6 في الاستبيانات · «أخرى» رماديّة في الحلقة).

const nf = (n: number) => n.toLocaleString("en-US");
/** عنوانُ الشاشة يحمل الاختيارين معًا: تبديلُ المدّة لا يعيدك إلى البابين، والعكس. */
const href = (days: number, source: Source | null) =>
  `/dashboard/analytics?days=${days}${source ? `&src=${source}` : ""}`;
const total = (s: Analytics["sources"]) => Object.values(s).reduce((a, b) => a + b, 0);
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

// وحداتُ العدّ في قوائم التحليلات — تُصرَّف عربيًّا داخل `BarList`.
const U_VIEW = { one: "مشاهدة", two: "مشاهدتان", few: "مشاهدات" };
const U_VISIT = { one: "زيارة", two: "زيارتان", few: "زيارات" };
const U_VISITOR = { one: "زائر", two: "زائران", few: "زوّار" };
const U_SESSION = { one: "جلسة", two: "جلستان", few: "جلسات" };

// الرقمُ ملفوفٌ بـ`font-latin` كعدد الأبواب تحته — لا زينةً بل توحيدًا للوزن (٢٠٢٦-٠٨-٢١):
// رقمٌ متروكٌ في نصٍّ عربيّ يُرسَم من وجه الأرقام المعلَن داخل عائلة Lyon (‎700 ← Eras Demi‎)، وملفوفُه
// يُرسَم من عائلة Eras نفسِها (‎700 ← Eras Bold‎). فبلا لفٍّ يقع في الشريط الواحد وزنان لرقمٍ واحد.
const RANGES: Array<[number, ReactNode]> = [
  [7, <><span className="seg-num">7</span> أيّام</>],
  [30, <><span className="seg-num">30</span> يومًا</>],
  [90, <><span className="seg-num">90</span> يومًا</>],
  [3650, "الكلّ"],
];

// بابُ الزيارة (عمود `source`، ٢٠٢٦-٠٨-٢٠): صار للنادي مدخلان، فرقمٌ يجمعهما لا يصف أحدَهما.
// و«البابان» أوّلًا لأنّه ما كانت عليه الشاشةُ قبل اليوم، فلا يتبدّل ما يراه القادمُ بلا اختيار.
const DOORS: Array<[Source | null, string]> = [[null, "البابان"], ["web", "الموقع"], ["app", "التطبيق"]];

// محوّلٌ لفئات القاعدة {label, count} إلى سلسلة {label, value} — يخدم BarList والحلقة معًا.
const toSeries = (cats: Cat[]): BarItem[] => cats.map((c) => ({ label: c.label, value: c.count }));

// أيقونةُ المسار من **خريطة التنقّل نفسها**: ما يراه العضو في الشريط الجانبيّ يراه هنا، فلا أيقونةَ
// تُخترَع لقائمة. وما ليس بندًا في اللوحة (‎/login‎ وصفحات الموقع العامّ) يبقى موضعه فراغًا.
// الدول: الرمز الخام (SA) يصير اسمًا عربيًّا وعلمًا — المصدر الواحد `lib/geo.ts` (لا جدولَ هنا).
const withCountries = (cats: Cat[]): BarItem[] =>
  cats.map((c) => ({ label: countryName(c.label), value: c.count, icon: <CountryFlag code={c.label} /> }));

// المدن: تُدمَج رسومُ المزوّد المختلفة في هويّةٍ واحدة (`Hofuf` و`Al Hufuf` مدينةٌ واحدة) **ثمّ**
// تُقتطَع اثنتا عشرة — والدالّة تُرجع أربعين كي يقع الدمجُ قبل الاقتطاع لا بعده.
const mergeCities = (cats: Analytics["cities"]): BarItem[] => {
  const by = new Map<string, BarItem>();
  for (const c of cats) {
    // الهويّة = المدينة **ودولتُها**: «طرابلس» في لبنان غيرُها في ليبيا.
    const id = `${cityOf(c.label).id}|${c.country ?? ""}`;
    const row = by.get(id);
    if (row) row.value += c.count;
    // الفاصلُ **شرطةٌ طويلة** بأمر المالك (٢٠٢٦-٠٨-١١): استثناءٌ منصوصٌ من قاعدته «لا شرطة طويلة
    // في النصّ المرئيّ»، **لهذا الموضع وحده** — هي هنا تصل اسمين (مدينةٌ ودولتُها) لا تعترض جملة.
    // لا تُقاس عليها، والقاعدةُ باقيةٌ في كلّ نصٍّ آخر. والعلمُ أيقونةُ الصفّ كما في «توزيع الدول».
    else by.set(id, {
      label: cityName(c.label),
      value: c.count,
      note: `— ${countryName(c.country)}`,
      icon: <CountryFlag code={c.country} />,
    });
  }
  return [...by.values()].sort((a, b) => b.value - a.value).slice(0, 12);
};

/**
 * الصفحاتُ تُنادى بعناوينها: العنوانُ من `page_title` المخزَّن، ويُنقّى من لاحقة الموقع المكرّرة
 * في كلّ سطر («تسجيل الدخول — نادي أديب» ← «تسجيل الدخول»). ويُدمَج ما تطابق عنوانُه: «/» و
 * «/index.html» صفحةٌ واحدة. والمسارُ يبقى هويّةً: منه الأيقونة، وإليه يُرجَع إن خلا العنوان.
 */
const SITE_TAIL = /\s*[—–\-|]\s*[^—–\-|]*(أد[ِي]?يب|Adeeb)[^—–\-|]*$/u;
/** أيقونةُ المسار من خريطة التنقّل — وما ليس بندًا في اللوحة (أكثرُ مسارات V1) بلا أيقونة. */
const routeIcon = (href: string) => {
  const key = iconKeyForHref(href);
  if (!key) return undefined;
  const I = ICONS[key];
  return <I />;
};
/** جذورُ الموقع: عنوانُها اسمُ النادي نفسُه، فتُسمّى بوظيفتها لا باسمه. */
const HOME_PATHS = new Set(["/", "/index.html", "/index.htm"]);
const pageTitle = (p: { label: string; title: string | null }) => {
  if (HOME_PATHS.has(p.label)) return "الصفحة الرئيسية";
  const t = (p.title ?? "").trim();
  if (!t) return p.label;
  const short = t.replace(SITE_TAIL, "").trim();
  return short || t;
};
const mergePages = (pages: { label: string; title: string | null; count: number }[]): BarItem[] => {
  const by = new Map<string, BarItem & { top: number }>();
  for (const p of pages) {
    const name = pageTitle(p);
    const row = by.get(name);
    if (row) {
      row.value += p.count;
      // الأيقونةُ من المسار الأكثر مشاهدةً بين ما اجتمع تحت العنوان الواحد.
      if (p.count > row.top) { row.top = p.count; row.icon = routeIcon(p.label); }
    } else {
      by.set(name, { label: name, value: p.count, icon: routeIcon(p.label), top: p.count });
    }
  }
  return [...by.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
    .map(({ top: _t, ...item }) => item);
};

// أعمدة جدول «أحدث الزوّار» — على DataTable الموحّد (لا قائمة .st-rv خاصّة).
// آخرُ ظهورٍ جملةً تُقرأ: «٩ أغسطس الساعة 10:49 م» — بتوقيت الرياض كسائر أوقات الصفحة،
// وبأرقامٍ لاتينيّة واسمِ شهرٍ عربيّ. و«ص/م» تُشتقّ من `dayPeriod` لا تُحسب باليد.
const RIYADH_DT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "numeric", minute: "2-digit", hour12: true,
});
const fmtSeen = (iso: string) => {
  const p = Object.fromEntries(RIYADH_DT.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const period = (p.dayPeriod ?? "").toUpperCase().startsWith("A") ? "ص" : "م";
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} الساعة ${p.hour}:${p.minute} ${period}`;
};

const recentCols: Column<RecentVisitor>[] = [
  { key: "country", header: "الدولة", width: "1fr", render: (v) => (v.country ? <span className="txt"><CountryFlag code={v.country} /> {countryName(v.country)}</span> : <span className="txt na">—</span>) },
  { key: "lastSeen", header: "آخر ظهور", width: "1.2fr", render: (v) => <span className="txt">{fmtSeen(v.lastSeen)}</span> },
  { key: "pageviews", header: "الزيارات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.pageviews)}</span> },
  { key: "sessions", header: "الجلسات", width: "0.8fr", align: "center", render: (v) => <span className="txt num">{nf(v.sessions)}</span> },
];

// مصفوفةُ الذروة: ٧ أيّام × ٢٤ ساعة من قائمةٍ مبعثرة (الخالي صفرٌ) — بتوقيت الرياض من القاعدة.
const DOW_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS_AR = Array.from({ length: 24 }, (_, h) => String(h));
const heatMatrix = (heat: Analytics["hourly_heat"]) => {
  const m = DOW_AR.map(() => Array.from({ length: 24 }, () => 0));
  for (const c of heat) if (m[c.dow]) m[c.dow][c.hour] = c.count;
  return m;
};

export function StatsView({ data, recent, days, source }: { data: Analytics; recent: RecentVisitor[]; days: number; source: Source | null }) {
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
      <div className="seg-row">
        <Segmented aria-label="مدى المدّة" linkAs={Link} value={String(days)}
          items={RANGES.map(([d, lbl]) => ({ value: String(d), href: href(d, source), label: lbl }))} />
        <Segmented aria-label="باب الزيارة" linkAs={Link} value={source ?? "all"}
          items={DOORS.map(([door, lbl]) => ({
            value: door ?? "all",
            href: href(days, door),
            // العددُ في التسمية عمدًا: يقول لك إن كان وراء البابِ الآخر أحدٌ قبل أن تفتحه
            label: (
              <>
                {lbl} <span className="seg-num">{nf(door ? data.sources[door] ?? 0 : total(data.sources))}</span>
              </>
            ),
          }))} />
      </div>

      <div className="stat-grid">
        {kpis.map((x, i) => (
          <Stat key={i} icon={x.icon} value={x.n} label={x.l} />
        ))}
      </div>

      {/* ترتيبُ الإحصاءات بكلمة المالك (٢٠٢٦-٠٨-١١): عشرةٌ بعينها وبترتيبها، **كلٌّ في صفٍّ
          مستقلّ** — لا كرتين في صفّ. فالترتيبُ في الكود هو الترتيبُ في العين بلا وساطةِ شبكة. */}

      {/* ١ */}
      <SectionCard title="الزيارات اليوميّة">
        <AreaChart
          labels={data.daily.map((d) => fmtDate(d.date))}
          series={[
            { name: "الزيارات", values: data.daily.map((d) => d.pageviews) },
            { name: "الزوّار الفريدون", values: data.daily.map((d) => d.visitors) },
          ]}
        />
      </SectionCard>

      {/* ٢ */}
      <SectionCard title="توزيع الأجهزة" icon={<DeviceMobile />}>
        <Donut items={data.devices.map((c) => ({ label: deviceName(c.label), value: c.count }))} unit={U_VISIT} />
      </SectionCard>

      {/* ٣ */}
      <SectionCard title="توزيع الدول" icon={<Globe />}>
        <BarList items={withCountries(data.countries)} unit={U_VISIT} />
      </SectionCard>

      {/* ٤ — المدينة تُكتب كما يرسلها مزوّد الموقع (لا ترجمةَ لها في القاعدة). */}
      <SectionCard title="توزيع المدن" icon={<MapPin />}>
        <BarList items={mergeCities(data.cities)} unit={U_VISIT}
          empty={<EmptyState variant="soft" icon={<MapPin aria-hidden />} title="لا مدنَ بعد" description="لم يصل تحديدُ مدينةٍ في هذه المدّة." />} />
      </SectionCard>

      {/* ٥ — العدّ **زائرٌ** لا زيارة، فوحدتُه تقول ذلك. */}
      <SectionCard title="زوّارٌ جُدد مقابل عائدين" icon={<UserPlus />}>
        <Donut unit={U_VISITOR} items={[
          { label: "جُدد", value: data.visitor_types.new },
          { label: "عائدون", value: data.visitor_types.returning },
        ]} />
      </SectionCard>

      {/* ٦ — بُعدان لا بُعد: يومُ الأسبوع × الساعة، فيظهر فرقُ ذروةِ الخميس عن ذروةِ الأحد. */}
      <SectionCard title="ساعات الذروة" icon={<Clock />}>
        <HeatGrid rows={DOW_AR} cols={HOURS_AR} values={heatMatrix(data.hourly_heat)}
          legendLow="أهدأ" legendHigh="أزحم" />
      </SectionCard>

      {/* ٧ */}
      <SectionCard title="أعلى مصادر الإحالة">
        <BarList items={toSeries(data.referrers)} unit={U_VISIT}
          empty={<EmptyState variant="soft" icon={<Globe aria-hidden />} title="زيارات مباشرة فقط" description="لا مصادر خارجيّة في هذه المدّة." />} />
      </SectionCard>

      {/* ٨ */}
      <SectionCard title="أكثر الصفحات مُشاهدة">
        <BarList items={mergePages(data.top_pages)} unit={U_VIEW} />
      </SectionCard>

      {/* ٩ — الخروجُ يُعدّ بالجلسة: كم جلسةً انتهت عند هذه الصفحة. */}
      <SectionCard title="صفحات الخروج" icon={<SignOut />}>
        <BarList items={mergePages(data.exit_pages)} unit={U_SESSION}
          empty={<EmptyState variant="soft" icon={<SignOut aria-hidden />} title="لا جلساتٍ منتهية" description="لم تكتمل جلسةٌ في هذه المدّة." />} />
      </SectionCard>

      {/* ١٠ — كرتٌ برأسٍ منسّم كسائر لوحات هذه الصفحة (`SectionCard` هو الكرتُ نفسُه)، والجدولُ
          ابنُه المباشر فيبلغ حافّتيه بلا إطارٍ ثانٍ (ق١٢). */}
      <Card>
        <CardHeader variant="soft" icon={<Users />} title="أحدث الزوّار" />
        <DataTable columns={recentCols} rows={recent} getRowId={(v) => v.id}
          emptyState={<EmptyState icon={<Users />} title="لا زوّار بعد" />} />
      </Card>
    </div>
  );
}
