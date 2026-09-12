"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, Card, CardHeader, ColumnBars, Stat, Segmented, SectionCard, BarList, Donut, AreaChart, HeatGrid, type BarItem } from "@adeeb/design-system";
import { Users, Timer, Globe, Robot, DeviceMobile, MapPin, UserPlus, Clock, DoorOpen } from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, ArrowUUpLeft, ArrowsClockwise, Eye, SignOut } from "@/app/_components/glyphs";
import { deviceName } from "@/lib/devices";
import { CountryFlag, cityName, cityOf, countryName } from "@/lib/geo";
import { ICONS } from "../_shell/icons";
import { iconKeyForHref } from "../_shell/nav";
import { DataTable, type Column } from "../_components/DataTable";
import { EmptyState } from "../_components/EmptyState";
import { RangePicker, deltaPct } from "./RangePicker";
import { analyticsHref, type AnalyticsUrlState } from "@/lib/analyticsRange";
import type { Analytics, Cat, Source } from "./data";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// نغمةُ قوائم الأشرطة **واحدةٌ** (الافتراضيّة `--chart-1`) — أُزيلت النغمات الأربع ٢٠٢٦-٠٨-٠٩:
// اللونُ في قائمةٍ أحاديّة السلسلة لا يشفّر شيئًا، فأربعُ نغماتٍ في صفحةٍ واحدة تدفع القارئ يبحث
// عن معنًى غير موجود، وتُنازع الحلقةَ والخريطةَ اللتين يحمل لونُهما معنًى. واللونُ يبقى حيث يشفّر
// (خيارٌ سابقٌ بـchart-6 في الاستبيانات · «أخرى» رماديّة في الحلقة).

const nf = (n: number) => n.toLocaleString("en-US");
const total = (s: Analytics["sources"]) => Object.values(s).reduce((a, b) => a + b, 0);
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

// وحداتُ العدّ في قوائم التحليلات — تُصرَّف عربيًّا داخل `BarList`.
// **المفرداتُ الثلاث** (قرار المالك ٢٠٢٦-٠٨-٣١): **مشاهدة** لكلّ فتحِ صفحة، و**زيارة**
// للدخول المتّصل (كانت تُسمّى «جلسة»، وهي كلمةٌ لا يقولها أحد)، و**زائر** للجهاز الذي جاء منه.
// فتُقرأ الشاشةُ جملةً واحدة: ١٠٩٣ مشاهدةً في ٥٥٤ زيارةً من ٢٨٥ زائرًا. وكلُّ قائمةٍ تأخذ
// وحدتَها من **طريقة عدّها**: ما جُمِع من صفوف الصفحات بالمشاهدة، وما جُمِع بالجلسات بالزيارة.
const U_VIEW = { one: "مشاهدة", two: "مشاهدتان", few: "مشاهدات" };
const U_VISIT = { one: "زيارة", two: "زيارتان", few: "زيارات" };
const U_VISITOR = { one: "زائر", two: "زائران", few: "زوّار" };

// بابُ الزيارة (عمود `source`، ٢٠٢٦-٠٨-٢٠): صار للنادي مدخلان، فرقمٌ يجمعهما لا يصف أحدَهما.
// و«الكلّ» أوّلًا لأنّه ما كانت عليه الشاشةُ قبل اليوم، فلا يتبدّل ما يراه القادمُ بلا اختيار.
// (كان اسمُه «البابان» فبُدِّل ٢٠٢٦-٠٩-٠٥: تسميةٌ داخليّةٌ لا يفهمها إلّا من كتبها.)
const DOORS: Array<[Source | null, string]> = [[null, "الكلّ"], ["web", "الموقع"], ["app", "التطبيق"]];

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

// مصفوفةُ الذروة: ٧ أيّام × ٢٤ ساعة من قائمةٍ مبعثرة (الخالي صفرٌ) — بتوقيت الرياض من القاعدة.
const DOW_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS_AR = Array.from({ length: 24 }, (_, h) => String(h));
const heatMatrix = (heat: Analytics["hourly_heat"]) => {
  const m = DOW_AR.map(() => Array.from({ length: 24 }, () => 0));
  for (const c of heat) if (m[c.dow]) m[c.dow][c.hour] = c.count;
  return m;
};

export function StatsView({ data, preset, source, compare }: { data: Analytics; preset: string; source: Source | null; compare: boolean }) {
  const k = data.kpis;
  const cur: AnalyticsUrlState = { preset, from: data.from, to: data.to, source, compare };
  // المقارنةُ تُعرَض حين تُطلَب **وحين يكون لها أساس**: فترةٌ سابقةٌ فارغةٌ لا تُنسَب إليها نسبة
  const prev = compare && data.prev && data.prev.pageviews > 0 ? data.prev : null;

  /**
   * شارةُ الفرق: خضراءُ للأحسن وحمراءُ للأسوأ، و«أحسن» ليس دائمًا «أكبر» — معدّلُ الارتداد
   * كلّما نزل كان أحسن، فيُقلَب حكمُه ولا يُقلَب سهمُه (السهم يقول الاتّجاه لا الحكم).
   */
  const trend = (now: number, before: number | undefined, lowerIsBetter = false) => {
    if (!prev || before === undefined) return undefined;
    const d = deltaPct(now, before);
    if (d === null) return undefined;
    const tone = d === 0 ? "neutral" : (lowerIsBetter ? d < 0 : d > 0) ? "success" : "danger";
    return (
      <Badge tone={tone} size="sm" icon={d >= 0 ? <ArrowUp /> : <ArrowDown />}>
        <span className="font-latin">{Math.abs(d)}٪</span>
      </Badge>
    );
  };

  // أربعةُ كروتٍ بعد تشذيبٍ متتابعٍ من المالك (٢٠٢٦-٠٩-٠٥): رُفعت الجلسةُ والروبوتُ
  // وصفحةٌ لكلّ زيارة والخروجُ السريع والعائدون. وأرقامُ ما رُفع باقيةٌ في الحمولة.
  const kpis = useMemo(() => [
    { icon: <Eye />, n: nf(k.pageviews), l: "مشاهدة للصفحات", t: trend(k.pageviews, prev?.pageviews) },
    { icon: <Users />, n: nf(k.visitors), l: "زائر للموقع", t: trend(k.visitors, prev?.visitors) },
    { icon: <Timer />, n: fmtDur(k.avg_seconds), l: "متوسّط بقاء الصفحة", t: trend(k.avg_seconds, prev?.avg_seconds) },
    { icon: <Globe />, n: nf(k.countries), l: "دولة مختلفة", t: trend(k.countries, prev?.countries) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [k, prev]);

  return (
    <div className="st">
      {/* سطران ممتدّان بقرار المالك (٢٠٢٦-٠٨-٣١): المدّةُ سطرٌ والأبوابُ سطرٌ، كلٌّ يملأ عرضَه.
          والامتدادُ هو الهدف — هدفٌ للإبهام بعرض الشاشة، ولا يتقاسم اثنان سطرًا فيضيقان. */}
      <div className="drng-stack">
        <RangePicker preset={preset} range={{ from: data.from, to: data.to }} compare={compare} href={(patch) => analyticsHref(cur, patch)} wide />
        <Segmented aria-label="باب الزيارة" linkAs={Link} value={source ?? "all"} wide
          items={DOORS.map(([door, lbl]) => ({
            value: door ?? "all",
            href: analyticsHref(cur, { source: door }),
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
          <Stat key={i} icon={x.icon} value={x.n} label={x.l} trend={x.t} />
        ))}
      </div>

      {/* رُفع سطرُ «مقارنةً بـ…» والشرحُ المطويّ «ما معنى هذه الأرقام؟» بأمر المالك
          (٢٠٢٦-٠٩-٠٥). وشارةُ الفرق فوق كلّ رقمٍ باقيةٌ كما هي. */}

      {/* ترتيبُ الإحصاءات بكلمة المالك (٢٠٢٦-٠٨-١١): عشرةٌ بعينها وبترتيبها، **كلٌّ في صفٍّ
          مستقلّ** — لا كرتين في صفّ. فالترتيبُ في الكود هو الترتيبُ في العين بلا وساطةِ شبكة. */}

      {/* ١ */}
      <SectionCard title="المشاهدات اليوميّة">
        <AreaChart
          groupable
          labels={data.daily.map((d) => fmtDate(d.date))}
          series={[
            { name: "المشاهدات", values: data.daily.map((d) => d.pageviews) },
            { name: "الزوّار الفريدون", values: data.daily.map((d) => d.visitors) },
          ]}
        />
      </SectionCard>

      {/* ٢ */}
      <SectionCard title="توزيع الأجهزة" icon={<DeviceMobile />}>
        <Donut items={data.devices.map((c) => ({ label: deviceName(c.label), value: c.count }))} unit={U_VIEW} />
      </SectionCard>

      {/* ٣ */}
      <SectionCard title="توزيع الدول" icon={<Globe />}>
        <BarList items={withCountries(data.countries)} unit={U_VIEW} />
      </SectionCard>

      {/* ٤ — المدينة تُكتب كما يرسلها مزوّد الموقع (لا ترجمةَ لها في القاعدة). */}
      <SectionCard title="توزيع المدن" icon={<MapPin />}>
        <BarList items={mergeCities(data.cities)} unit={U_VIEW}
          empty={<EmptyState variant="soft" icon={<MapPin aria-hidden />} title="لا مدنَ بعد" description="لم يصل تحديدُ مدينةٍ في هذه المدّة." />} />
      </SectionCard>

      {/* ٥ — العدّ **زائرٌ** لا مشاهدة، فوحدتُه تقول ذلك.
          و**منتسبو أدِيب صنفٌ ثالث** بأمر المالك (٢٠٢٦-٠٩-٠٥). والعضويّةُ في أصلها بُعدٌ
          متعامدٌ على «جديد/عائد» لا قسمٌ ثالثٌ فيه (العضوُ نفسُه إمّا جديدٌ أو عائد)، فلو
          أُضيف شريحةً فوقهما لصار مجموعُ الأجزاء أكبرَ من الكلّ. فالفرزُ **بالأولويّة**:
          يُخرَج المنتسبون أوّلًا، ثمّ يُقسَم من بقي جديدًا وعائدًا — فتجمع الشرائحُ الثلاث
          عددَ الزوّار بالضبط، ويبقى لكلّ زائرٍ موضعٌ واحد.
          والقاعدةُ هي التي تفرز (`visitor_types.member`)؛ وقبل تطبيق ترحيلها تسقط الحلقةُ
          إلى صنفيها القديمين بلا كسر. */}
      {/* العنوانُ صار «أصنافُ الزوّار» (٢٠٢٦-٠٩-٠٥): «جُدد مقابل عائدين» كان يعد بصنفين
          والحلقةُ تعرض ثلاثة، والتسمياتُ صارت جملةً تامّةً تُقرأ وحدَها بلا عنوانٍ فوقها. */}
      <SectionCard title="أصنافُ الزوّار" icon={<UserPlus />}>
        <Donut unit={U_VISITOR} items={[
          ...(data.visitor_types.member != null
            ? [{ label: "منتسبو أدِيب", value: data.visitor_types.member }]
            : []),
          { label: "زوّار جُدد", value: data.visitor_types.new },
          { label: "زوّار عائدون", value: data.visitor_types.returning },
        ]} />
      </SectionCard>

      {/* ٦ — بُعدان لا بُعد: يومُ الأسبوع × الساعة، فيظهر فرقُ ذروةِ الخميس عن ذروةِ الأحد. */}
      <SectionCard title="ساعات الذروة" icon={<Clock />}>
        <HeatGrid rows={DOW_AR} cols={HOURS_AR} values={heatMatrix(data.hourly_heat)}
          legendLow="أهدأ" legendHigh="أزحم" />
      </SectionCard>

      {/* قسمُ «أعلى مصادر الإحالة» أُعدم (٢٠٢٦-٠٩-٠٥): كان يعرض النطاقاتِ خامًا، فصار توأمًا
          لـ«من أين جاؤوا» بعد أن صار الأخيرُ يسمّي المعروفَ ويُظهر المجهولَ بنطاقه. ووجودُهما
          معًا يُربك: المنصّةُ الواحدةُ باسمها هنا وبنطاقاتها هناك. */}
      {/* ٧ — المصادرُ: المعروفُ باسم منصّته والمجهولُ باسم نطاقه. خلَفُ «أعلى مصادر الإحالة». */}
      {/* **قائمةٌ لا حلقة** (٢٠٢٦-٠٩-٠٥): الحلقةُ ستّةُ ألوانٍ ثابتة (ق١٠)، فتطوي ما بعد الخامس
          في «أخرى» — فاختفى TikTok وLinkedIn داخلَها والمالكُ يبحث عنهما. والقائمةُ لا سقفَ
          لها ولا تحتاج لونًا يشفّر، فيظهر كلُّ مصدرٍ باسمه ورقمه. */}
      <SectionCard title="من أين جاؤوا" icon={<ArrowsClockwise />}>
        <BarList items={toSeries(data.sources_class)} unit={U_VIEW}
          empty={<EmptyState variant="soft" icon={<Globe aria-hidden />} title="لا مصادرَ بعد" description="لم يصل أحدٌ من موقعٍ آخر في هذه المدّة." />} />
      </SectionCard>

      {/* ١٣ — مدّةُ الزيارة **توزيعًا لا رقمًا** (اختيارُ المالك من أربع هيئاتٍ في
          `/ui/analytics-next`): الرقمُ الواحد يكذب — متوسّطٌ ٣د١٩ث ووسيطٌ ٢ث في القياس نفسِه،
          لأنّ حفنةً طويلةً ترفع المتوسّط. والتسمياتُ كاملةٌ تحت الأعمدة (`fullTicks`) لا رموزًا. */}
      <SectionCard title="مدّةُ الزيارة" icon={<Timer />}>
        <ColumnBars
          height={150}
          barMaxWidth={64}
          fullTicks
          formatValue={(n) => `${nf(n)} زيارة`}
          bars={data.visit_buckets.map((b) => ({ value: b.count, label: b.label, tick: b.label }))}
        />
      </SectionCard>

      {/* ١٤ — أطولُ الصفحات مكثًا: أيُّ صفحةٍ تُقرأ فعلًا. والقيمةُ ثوانٍ لا عددُ مشاهدات. */}
      <SectionCard title="أطولُ الصفحات مكثًا" icon={<Timer />}>
        <BarList items={mergePages(data.dwell_pages)} formatValue={fmtDur}
          empty={<EmptyState variant="soft" icon={<Timer aria-hidden />} title="لا مدّةَ مقيسةٌ بعد" description="لم تُقَس مدّةُ صفحةٍ في هذه المدّة." />} />
      </SectionCard>

      {/* ٨ */}
      <SectionCard title="أكثر الصفحات مُشاهدة" icon={<Eye />}>
        <BarList items={mergePages(data.top_pages)} unit={U_VIEW} />
      </SectionCard>

      {/* ١١ — صفحاتُ الدخول (٢٠٢٦-٠٩-٠٥): من أين يبدأ الناسُ زيارتَهم، ومقلوبُ ما تحته. */}
      <SectionCard title="صفحاتُ الدخول" icon={<DoorOpen />}>
        <BarList items={mergePages(data.entry_pages)} unit={U_VISIT}
          empty={<EmptyState variant="soft" icon={<DoorOpen aria-hidden />} title="لا زياراتٍ بعد" description="لم تبدأ زيارةٌ في هذه المدّة." />} />
      </SectionCard>

      {/* ٩ — الخروجُ يُعدّ بالزيارة: كم زيارةً انتهت عند هذه الصفحة. */}
      <SectionCard title="صفحات الخروج" icon={<SignOut />}>
        <BarList items={mergePages(data.exit_pages)} unit={U_VISIT}
          empty={<EmptyState variant="soft" icon={<SignOut aria-hidden />} title="لا زياراتٍ منتهية" description="لم تنتهِ زيارةٌ في هذه المدّة." />} />
      </SectionCard>

      {/* ١٠ — الروبوتاتُ **مقارنةً لا جردًا** (بكلمة المالك ٢٠٢٦-٠٩-٠٥): اسمُ الروبوت
          لا يُبنى عليه شيء، والسؤالُ الذي يُسأل حقًّا: كم من هذه الحركة بشرٌ وكم منها آلة؟
          فحلقةٌ بشريحتين، ومقامُها المشاهداتُ لا الزوّار (الروبوتُ لا يُعدّ زائرًا أصلًا). */}
      <SectionCard title="زوّارٌ حقيقيّون مقابل روبوتات" icon={<Robot />}>
        <Donut unit={U_VIEW} items={[
          { label: "زوّار حقيقيّون", value: k.pageviews },
          { label: "روبوتات", value: data.bots },
        ]} />
      </SectionCard>

      {/* كرتُ «أحدث الزوّار» أُعدم بأمر المالك (٢٠٢٦-٠٩-٠٥): صفٌّ لكلّ زائرٍ بدولته ووقته
          لا يُبنى عليه قرار، وهو أثقلُ ما في الصفحة قراءةً على الجوّال. */}
    </div>
  );
}
