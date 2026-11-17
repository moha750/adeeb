"use client";

/**
 * **إحصائيّات الزوّار** على قالب الإحصاء (٢٠٢٦-١١-١٤، «اللوحة» التي اختارها محمد ٢٠٢٦-١١-٠٧ لإحصاء الباركود). السلوكُ سلوكُ
 * `dashboard/analytics/StatsView.tsx` حرفًا: المدّةُ وبابُ الزيارة والمقارنةُ في العنوان (`analyticsHref`)، والأرقامُ الأربعةُ بفرقها عن
 * الفترة السابقة (والارتدادُ لا يُعرض)، والمفرداتُ الثلاث (**مشاهدة** لفتح صفحة، و**زيارة** للدخول المتّصل، و**زائر** للجهاز)، ودمجُ
 * المدن برسوم المزوّد المختلفة، وعناوينُ الصفحات منقّاةً من لاحقة الموقع ومدموجةً، ورمزُ الصفحة من خريطة التنقّل، وأصنافُ الزوّار الثلاثة
 * بالأولويّة، والروبوتاتُ مقارنةً لا جردًا.
 *
 * والفرقُ في الشكل:
 * - **الرأسُ لوحُ الغرفة، والأرقامُ الأربعةُ رأسُ قسم «الحركة اليوميّة»** بفرقها شارةً (كانت سطرًا حرًّا تحت اللوح فرآه محمد أضعفَ ما فيها)، والمقارنةُ فعلٌ هادئٌ على اللوح («قارِن بالفترة السابقة» / «أخفِ المقارنة»).
 * - **المدّةُ مبدّلُ المواضع** كإحصاء الباركود (كانت زرًّا يفتح لوحًا)، والنادرُ في «المزيد»، والمخصّصةُ نافذةٌ بتاريخين. وبابُ الزيارة
 *   مبدّلٌ ثانٍ بأعداده.
 * - **الرسومُ قطعُ الهويّة** (`_ad/charts.tsx`) في أقسام القالب (`AdPanel`) **اثنين في سطر**: العريضُ وبجانبه الأضيق، والحركةُ اليوميّةُ سطرٌ كامل.
 *   فتبدّل الترتيبُ قليلًا ليتساوى طولُ قسمَي كلّ سطر فلا يبقى في أحدهما فراغ: القائمتان معًا (الدول
 *   والمدن، والصفحاتُ ومكثُها، والدخولُ والخروج)، والحلقاتُ بجانب ما يطولها (الأجهزةُ بجانب الذروة وهي تملأ قسمها، وأصنافُ الزوّار
 *   بجانب مدّة الزيارة، والروبوتاتُ بجانب المصادر) — وكان «كلٌّ في صفٍّ مستقلّ» (٢٠٢٦-٠٨-١١)
 *   قبل أن يُعتمد القالب.
 * - **الحركةُ اليوميّة خطّان** (المشاهدات والزوّار، اختيارُ محمد على المبدّل)، وما جاوز خمسةً وأربعين يومًا يُجمع أسابيع.
 */
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Field, Modal } from "@adeeb/design-system";
import { CalendarBlank, CalendarDots, ChartLineUp, Clock, DeviceMobile, DoorOpen, Globe, MapPin, Robot, Timer, UserPlus, Users } from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, ArrowsClockwise, Eye, SignOut } from "@/app/_components/glyphs";
import { deviceName } from "@/lib/devices";
import { CountryFlag, cityName, cityOf, countryName } from "@/lib/geo";
import { PRESETS, presetName, rangeLabel, todayKey, analyticsHref, type AnalyticsUrlState } from "@/lib/analyticsRange";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { ICONS } from "@/app/dashboard/_shell/icons";
import { iconKeyForHref } from "@/app/dashboard/_shell/nav";
import { deltaPct } from "@/app/dashboard/analytics/RangePicker";
import type { Analytics, Cat, Source } from "@/app/dashboard/analytics/data";
import { AdBadge, AdButton, AdEmpty, AdRoom, AdSwitch, RoomPlate, type AdFigure, type AdPosition } from "../primitives";
import { useRoomCrumb } from "../crumb";
import { AdPanel } from "../panel";
import { AdBars, AdColumns, AdHeat, AdRing, AdTrend, weekly } from "../charts";
import { fmtNum } from "../format";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const fmtDate = (s: string) => { const [, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
/** علاماتُ عمود المدّة قصيرةً تحت الأعمدة (تتراكب كاملةً على الجوّال)، والتسميةُ كاملةٌ في التلميح */
const DUR_TICKS = ["10ث", "1د", "5د", "15د", "+15د"];
// الدقائقُ وثوانيها لا تنفصلان على سطرين (كانت «4د» فوق «50ث» على الجوّال)
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د\u00a0${s % 60}ث`);

// **المفرداتُ الثلاث** (قرار المالك ٢٠٢٦-٠٨-٣١): كلُّ قائمةٍ تأخذ وحدتَها من طريقة عدّها
const AR_VIEW: ArForms = ["مشاهدةٌ واحدة", "مشاهدتان", "مشاهدات", "مشاهدةً"];
const AR_VISIT: ArForms = ["زيارةٌ واحدة", "زيارتان", "زيارات", "زيارةً"];
const AR_VISITOR: ArForms = ["زائرٌ واحد", "زائران", "زوّار", "زائرًا"];
const views = (v: number) => (v ? arCount(v, AR_VIEW) : "لا مشاهدات");
const visits = (v: number) => (v ? arCount(v, AR_VISIT) : "لا زيارات");
const visitors = (v: number) => (v ? arCount(v, AR_VISITOR) : "لا زوّار");

// بابُ الزيارة: «الكلّ» أوّلًا، ثمّ الموقع، ثمّ التطبيق (العددُ في الموضع يقول إن كان وراء البابِ الآخر أحد)
const DOORS: Array<[Source | null, string]> = [[null, "الكلّ"], ["web", "الموقع"], ["app", "التطبيق"]];
/** مُددُ المبدّل بترتيبها كإحصاء الباركود، والنادرُ منها في «المزيد» */
const ORDER = ["mtd", "7", "today", "90", "ytd", "all", "lastmonth", "yesterday"];
const RARE = new Set(["lastmonth", "yesterday", "ytd"]);

const toSeries = (cats: Cat[]) => cats.map((c) => ({ label: c.label, value: c.count }));
const withCountries = (cats: Cat[]) => cats.map((c) => ({ label: countryName(c.label), value: c.count, icon: <CountryFlag code={c.label} /> }));

/** المدن: تُدمَج رسومُ المزوّد المختلفة في هويّةٍ واحدة **ثمّ** تُقتطَع اثنتا عشرة. والهويّةُ المدينةُ ودولتُها. */
const mergeCities = (cats: Analytics["cities"]) => {
  const by = new Map<string, { label: string; value: number; note: string; icon: ReactNode }>();
  for (const c of cats) {
    const id = `${cityOf(c.label).id}|${c.country ?? ""}`;
    const row = by.get(id);
    if (row) row.value += c.count;
    // الدولةُ تحت اسم المدينة بخطّ الوصف (كانت «— الدولة» بشرطةٍ طويلةٍ استُثنيت لهذا الموضع؛ وسطرُ القطعة يحمل الوصفَ بلا فاصل)
    else by.set(id, { label: cityName(c.label), value: c.count, note: countryName(c.country), icon: <CountryFlag code={c.country} /> });
  }
  return [...by.values()].sort((a, b) => b.value - a.value).slice(0, 12);
};

/** الصفحاتُ تُنادى بعناوينها منقّاةً من لاحقة الموقع، ويُدمَج ما تطابق عنوانُه، والمسارُ يبقى هويّةً للرمز. */
const SITE_TAIL = /\s*[—–\-|،]\s*[^—–\-|،]*(أد[ِي]?يب|Adeeb)[^—–\-|،]*$/u;
const routeIcon = (href: string) => {
  const key = iconKeyForHref(href);
  if (!key) return undefined;
  const I = ICONS[key];
  return <I />;
};
const HOME_PATHS = new Set(["/", "/index.html", "/index.htm"]);
const pageTitle = (p: { label: string; title: string | null }) => {
  if (HOME_PATHS.has(p.label)) return "الصفحة الرئيسية";
  const t = (p.title ?? "").trim();
  if (!t) return p.label;
  return t.replace(SITE_TAIL, "").trim() || t;
};
const mergePages = (pages: { label: string; title: string | null; count: number }[]) => {
  const by = new Map<string, { label: string; value: number; icon?: ReactNode; top: number }>();
  for (const p of pages) {
    const name = pageTitle(p);
    const row = by.get(name);
    if (row) {
      row.value += p.count;
      if (p.count > row.top) { row.top = p.count; row.icon = routeIcon(p.label); }
    } else by.set(name, { label: name, value: p.count, icon: routeIcon(p.label), top: p.count });
  }
  return [...by.values()].sort((a, b) => b.value - a.value).slice(0, 12).map((x) => ({ label: x.label, value: x.value, icon: x.icon }));
};
const sum = (xs: { value: number }[]) => xs.reduce((s, x) => s + x.value, 0);

// مصفوفةُ الذروة: ٧ أيّام × ٢٤ ساعة (الخالي صفر) — بتوقيت الرياض من القاعدة
const DOW_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS_AR = Array.from({ length: 24 }, (_, h) => String(h));
const heatMatrix = (heat: Analytics["hourly_heat"]) => {
  const m = DOW_AR.map(() => Array.from({ length: 24 }, () => 0));
  for (const c of heat) if (m[c.dow]) m[c.dow][c.hour] = c.count;
  return m;
};

/**
 * **خلاصةُ المدّة** رأسَ «الحركة اليوميّة» (اختارها محمد ٢٠٢٦-١١-١٤ من شكلين، «أ»): الأرقامُ الأربعةُ أعمدةً بخيطٍ بينها لا كروت،
 * ورمزُ كلٍّ في مربّعه المصبوغ كتذكرة السجلّ، والرقمُ بدرجة عنوان القسم، والفرقُ عن الفترة السابقة تحته **شارةً** بسهمها (طلبُه).
 * ورُدّ الشكلُ «ب» (رقمٌ كبيرٌ بلا رموز).
 */
function Summary({ figures }: { figures: AdFigure[] }) {
  return (
    <dl className="ad-vs-sum">
      {figures.map((f) => (
        <div key={f.label} className="ad-vs-fig">
          <dt><span className="ad-vs-ic" aria-hidden>{f.icon}</span>{f.label}</dt>
          <dd className="ad-vs-row">
            <span className="ad-num ad-vs-v">{f.value}</span>
            {f.delta ? (
              <AdBadge tone={f.delta.good === null ? "neutral" : f.delta.good ? "ok" : "bad"} icon={f.delta.pct >= 0 ? <ArrowUp /> : <ArrowDown />}>
                <bdi dir="ltr">{`${Math.abs(f.delta.pct)}%`}</bdi>
                <span className="ad-sr">{f.delta.pct >= 0 ? "أكثر من الفترة السابقة" : "أقلّ من الفترة السابقة"}</span>
              </AdBadge>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function VisitorStatsRoom({ data, preset, source, compare }: { data: Analytics; preset: string; source: Source | null; compare: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const crumb = useRoomCrumb("/dashboard/analytics", "إحصائيّات الزوّار");
  const k = data.kpis;
  const cur: AnalyticsUrlState = { preset, from: data.from, to: data.to, source, compare };
  const go = (url: string) => start(() => router.push(url));
  // المقارنةُ تُعرض حين تُطلب **وحين يكون لها أساس**: فترةٌ سابقةٌ فارغةٌ لا تُنسَب إليها نسبة
  const prev = compare && data.prev && data.prev.pageviews > 0 ? data.prev : null;
  const delta = (now: number, before: number | undefined, lowerIsBetter = false): AdFigure["delta"] => {
    if (!prev || before === undefined) return undefined;
    const d = deltaPct(now, before);
    if (d === null) return undefined;
    return { pct: d, good: d === 0 ? null : lowerIsBetter ? d < 0 : d > 0 };
  };
  const figures: AdFigure[] = [
    { icon: <Eye />, value: fmtNum(k.pageviews), label: "مشاهدة للصفحات", delta: delta(k.pageviews, prev?.pageviews) },
    { icon: <Users />, value: fmtNum(k.visitors), label: "زائر للموقع", delta: delta(k.visitors, prev?.visitors) },
    { icon: <Timer />, value: fmtDur(k.avg_seconds), label: "متوسّط بقاء الصفحة", delta: delta(k.avg_seconds, prev?.avg_seconds) },
    { icon: <Globe />, value: fmtNum(k.countries), label: "دولة مختلفة", delta: delta(k.countries, prev?.countries) },
  ];

  // ── المدّة ──
  const today = todayKey();
  const [picking, setPicking] = useState(false);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const custom = preset === "custom";
  const dates = rangeLabel({ from: data.from, to: data.to });
  const ranges: AdPosition[] = [
    ...ORDER.filter((key) => PRESETS.some((p) => p.key === key)).map((key) => ({ key, label: PRESETS.find((p) => p.key === key)!.label, rare: RARE.has(key) })),
    { key: "custom", label: custom ? dates : "مدّة مخصّصة", rare: true },
  ];
  const onRange = (key: string) => { if (key === "custom") { setFrom(data.from); setTo(data.to); setPicking(true); return; } go(analyticsHref(cur, { preset: key })); };
  const apply = () => { setPicking(false); go(analyticsHref(cur, { from, to })); };
  const doors: AdPosition[] = DOORS.map(([door, label]) => ({
    key: door ?? "all", label, count: door ? data.sources[door] ?? 0 : Object.values(data.sources).reduce((a, b) => a + (b ?? 0), 0),
  }));

  // ── الأقسام ──
  const f = useMemo(() => {
    const daily = data.daily.map((d) => ({ label: fmtDate(d.date), value: d.pageviews }));
    const dailyVisitors = data.daily.map((d) => ({ label: fmtDate(d.date), value: d.visitors }));
    const devices = data.devices.map((c) => ({ label: deviceName(c.label), value: c.count }));
    const countries = withCountries(data.countries);
    const cities = mergeCities(data.cities);
    const sources = toSeries(data.sources_class);
    const top = mergePages(data.top_pages);
    const dwell = mergePages(data.dwell_pages);
    const entry = mergePages(data.entry_pages);
    const exit = mergePages(data.exit_pages);
    return { daily: weekly(daily, undefined, 45), dailyVisitors: weekly(dailyVisitors, undefined, 45), devices, countries, cities, sources, top, dwell, entry, exit };
  }, [data]);
  const span = `${presetName(preset)}، ${dates}`;
  // **بماذا تُقارَن** (محمد ٢٠٢٦-١١-١٤: «أيّ فترةٍ سابقةٍ بالضبط؟»): الأيّامُ نفسُها عددًا قبل المدّة مباشرة، تقولها القاعدةُ في `prev`،
  // فتُكتب بتاريخيها في الزرّ وتحت عنوان القسم بدل «الفترة السابقة» التي لا تقول شيئًا
  const before = data.prev && data.prev.pageviews > 0 ? rangeLabel({ from: data.prev.from, to: data.prev.to }) : null;
  const nothing = !k.pageviews && !data.bots;
  const none = (icon: ReactNode, title: string, desc: string) => <AdEmpty icon={icon} title={title} desc={desc} />;

  return (
    <AdRoom label="إحصائيّات الزوّار">
      <RoomPlate title="إحصائيّات الزوّار" crumb={crumb}
        extra={before ? { label: compare ? "أخفِ المقارنة" : `قارِن بـ${before}`, icon: <ArrowsClockwise />, onClick: () => go(analyticsHref(cur, { compare: !compare })) } : undefined} />
      <AdSwitch label="المدّة" positions={ranges} position={preset} onPosition={onRange} />
      <AdSwitch label="باب الزيارة" positions={doors} position={source ?? "all"} onPosition={(key) => go(analyticsHref(cur, { source: key === "all" ? null : (key as Source) }))} />

      {nothing ? (
        <AdEmpty icon={<Eye />} title="لا زيارات في هذه المدّة" desc="اختر مدّةً أوسع، أو بابًا آخر." />
      ) : (
        <div className="ad-st" data-pending={pending ? "" : undefined}>
          {/* **الأرقامُ الأربعةُ رأسُ الحركة اليوميّة** (محمد ٢٠٢٦-١١-١٤: سطرُها حرًّا تحت اللوح «أضعفُ ما في الصفحة»، ولا كروتَ إحصاءٍ في
              نظامنا): خلاصةُ المدّة فوق رسمها، في قسمٍ واحدٍ بعرض الغرفة. **والرسمُ خطّان** (المشاهداتُ والزوّار) بعد أن كان مبدّلًا بينهما */}
          <AdPanel icon={<ChartLineUp />} title="الحركة اليوميّة" sub={prev && before ? `${span}، مقارنةً بـ${before}` : span} span="full">
            <Summary figures={figures} />
            <AdTrend height={300} points={f.daily} unit={views} name="المشاهدات" label={`المشاهدات والزوّار، ${span}`}
              also={{ points: f.dailyVisitors, unit: visitors, name: "الزوّار الفريدون" }} />
          </AdPanel>

          <AdPanel icon={<Globe />} title="توزيع الدول" span="wide">
            {f.countries.length ? <AdBars items={f.countries} total={sum(f.countries)} unit={views} label="المشاهدات بحسب الدولة" /> : none(<Globe />, "لا دول بعد", "لم يصل تحديدُ دولةٍ في هذه المدّة.")}
          </AdPanel>

          <AdPanel icon={<MapPin />} title="توزيع المدن" sub="كما يرسلها مزوّد الموقع">
            {f.cities.length ? <AdBars items={f.cities} total={sum(f.cities)} unit={views} label="المشاهدات بحسب المدينة" /> : none(<MapPin />, "لا مدنَ بعد", "لم يصل تحديدُ مدينةٍ في هذه المدّة.")}
          </AdPanel>

          <AdPanel icon={<Clock />} title="ساعات الذروة" sub="يومُ الأسبوع في ساعاته، بتوقيت الرياض" span="wide">
            <AdHeat rows={DOW_AR} cols={HOURS_AR} values={heatMatrix(data.hourly_heat)} colName={(h) => `الساعة ${h}`} unit={views} label="المشاهدات في أيّام الأسبوع وساعاته" />
          </AdPanel>
          {/* مقارنةٌ لا جرد (المالك ٢٠٢٦-٠٩-٠٥): كم من الحركة بشرٌ وكم منها آلة، ومقامُها المشاهدات */}
          <AdPanel icon={<DeviceMobile />} title="توزيع الأجهزة">
            <AdRing items={f.devices} unit={views} label="المشاهدات بحسب الجهاز" empty={none(<DeviceMobile />, "لا أجهزة", "لم تُسجَّل مشاهدةٌ في هذه المدّة.")} />
          </AdPanel>

          {/* مدّةُ الزيارة توزيعًا لا رقمًا (اختيارُ المالك): المتوسّطُ يكذب حين ترفعه حفنةٌ طويلة */}
          <AdPanel icon={<Timer />} title="مدّةُ الزيارة" span="wide">
            <AdColumns height={280} bars={data.visit_buckets.map((b, i) => ({ tick: DUR_TICKS[i] ?? b.label, label: b.label, value: b.count }))} unit={visits} label="الزيارات بحسب مدّتها" every={1} />
          </AdPanel>
          {/* منتسبو أدِيب صنفٌ ثالثٌ يُفرَز أوّلًا (المالك ٢٠٢٦-٠٩-٠٥)، فتجمع الشرائحُ الثلاث عددَ الزوّار بالضبط */}
          <AdPanel icon={<UserPlus />} title="أصنافُ الزوّار">
            <AdRing unit={visitors} label="الزوّار بحسب الصنف" items={[
              ...(data.visitor_types.member != null ? [{ label: "منتسبو أدِيب", value: data.visitor_types.member }] : []),
              { label: "زوّار جُدد", value: data.visitor_types.new },
              { label: "زوّار عائدون", value: data.visitor_types.returning },
            ]} empty={none(<UserPlus />, "لا زوّار", "لم يزر أحدٌ في هذه المدّة.")} />
          </AdPanel>

          {/* المصادرُ قليلةٌ في الغالب وعددُها لا يُعرف سلفًا: بجانبها الروبوتات، وإن طالت توسّطت الحلقةُ قسمَها فلا يبقى الفراغُ تحتها وحدها */}
          <AdPanel icon={<ArrowsClockwise />} title="من أين جاؤوا" sub="المعروفُ باسم منصّته، والمجهولُ باسم نطاقه" span="wide">
            {f.sources.length ? <AdBars items={f.sources} total={sum(f.sources)} unit={views} label="المشاهدات بحسب المصدر" /> : none(<Globe />, "لا مصادرَ بعد", "لم يصل أحدٌ من موقعٍ آخر في هذه المدّة.")}
          </AdPanel>
          <AdPanel icon={<Robot />} title="زوّارٌ حقيقيّون مقابل روبوتات">
            <AdRing unit={views} label="المشاهدات: بشرٌ أم آلات" items={[{ label: "زوّار حقيقيّون", value: k.pageviews }, { label: "روبوتات", value: data.bots }]} />
          </AdPanel>

          <AdPanel icon={<Eye />} title="أكثر الصفحات مُشاهدة" span="wide">
            {f.top.length ? <AdBars items={f.top} total={sum(f.top)} unit={views} label="أكثر الصفحات مشاهدة" /> : none(<Eye />, "لا صفحات", "لم تُشاهَد صفحةٌ في هذه المدّة.")}
          </AdPanel>
          {/* القيمةُ ثوانٍ لا عددٌ، فلا حصّةَ في السطر: الشريطُ يُقاس على أطولها */}
          <AdPanel icon={<Timer />} title="أطولُ الصفحات مكثًا">
            {f.dwell.length ? <AdBars items={f.dwell} total={sum(f.dwell)} share={false} unit={fmtDur} label="أطول الصفحات مكثًا" /> : none(<Timer />, "لا مدّةَ مقيسةٌ بعد", "لم تُقَس مدّةُ صفحةٍ في هذه المدّة.")}
          </AdPanel>

          <AdPanel icon={<DoorOpen />} title="صفحاتُ الدخول" sub="من أين يبدأ الناسُ زيارتَهم" span="wide">
            {f.entry.length ? <AdBars items={f.entry} total={sum(f.entry)} unit={visits} label="صفحات الدخول" /> : none(<DoorOpen />, "لا زياراتٍ بعد", "لم تبدأ زيارةٌ في هذه المدّة.")}
          </AdPanel>
          <AdPanel icon={<SignOut />} title="صفحات الخروج">
            {f.exit.length ? <AdBars items={f.exit} total={sum(f.exit)} unit={visits} label="صفحات الخروج" /> : none(<SignOut />, "لا زياراتٍ منتهية", "لم تنتهِ زيارةٌ في هذه المدّة.")}
          </AdPanel>
        </div>
      )}

      <Modal open={picking} onClose={() => setPicking(false)} title="مدّة مخصّصة" description="اختر يومَي البداية والنهاية." size="sm"
        footer={<>
          <AdButton variant="fill" disabled={!from || !to || from > to} onClick={apply}>طبّق</AdButton>
          <AdButton plain variant="line" onClick={() => setPicking(false)}>إلغاء</AdButton>
        </>}>
        <Field label="من" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <Field label="إلى" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
      </Modal>
    </AdRoom>
  );
}
