"use client";

/**
 * **إحصاءُ باركودٍ واحد على قالب الإحصاء** (اختار محمد ٢٠٢٦-١١-٠٧ «اللوحة» من ثلاثة اتّجاهات في `dashboard/ad/stats`). السلوكُ سلوكُ
 * `tools/qr/QrStatsView.tsx` + `QrDeepStats.tsx` القديمتين: رقمُ المدّة لا العمر، وساعةُ الذروة، والآلاتُ تُقال ولا تُخفى، وحدُّ السجلّ
 * يُقال حين يُقصّ، والمدّةُ في العنوان (`?preset=` أو `?from=&to=`، والافتراضُ العمرُ كلُّه)، والإعداداتُ للمالك ومن له التعديل.
 * والفرقُ في الشكل:
 * - **الرأسُ تذكرةُ الباركود** (قاعدةُ صفحة السجلّ): كعبُه يومُ إنشائه، وحالُه شارة، ووجهتُه سطر، والأرقامُ الأربعةُ فيه، و«الإعدادات»
 *   زرُّه الأساسيّ (كان تبويبًا «إعدادات الباركود» بجانب «إحصائيّات الباركود» — والتذكرةُ نفسُها هي الإحصاء).
 * - **المدّةُ مبدّلُ المواضع بأعدادها** (كانت قائمةً منسدلة): يُقرأ قبل النقر كم في «هذا الشهر» وكم في «اليوم»، والمخصّصةُ في «المزيد»
 *   تفتح نافذةً بتاريخين (من يوم مولد الباركود إلى اليوم) كما كانت.
 * - **الرسومُ بقطع الهويّة** (`_ad/charts.tsx`): الخطُّ بجانب الأجهزة (حلقةٌ بطلب محمد، والنسبُ وحدها بجانبها)، ثمّ ساعاتُ اليوم بالذروة
 *   مؤكَّدة، ثمّ الأسبوعُ في ساعاته. ومدّةٌ بلا مسحاتٍ فراغٌ واحدٌ لا أربعة.
 * - **«آخر 7 أيّام» من سجلّ العمر لا من المدّة** (`week`): كان «هذا الأسبوع» يُعدّ من صفوفٍ قصّتها المدّة فيكون صفرًا تحت «الشهر الماضي».
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Modal } from "@adeeb/design-system";
import { CalendarBlank, CalendarDots, ChartLineUp, Clock, DeviceMobile, Gear, Robot, Scan, TrendUp } from "@phosphor-icons/react";
import { deviceName } from "@/lib/devices";
import { clubDayKey, fmtDayMonth, hour12, hour12Long } from "@/lib/dates";
import { PRESETS, presetName, rangeLabel, todayKey } from "@/lib/analyticsRange";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import type { QrStats } from "@/app/dashboard/tools/qr/data";
import { qrRangeHref } from "@/app/dashboard/tools/qr/range";
import { qrStub, qrState, qrTarget } from "./QrLinksRoom";
import { AdButton, AdEmpty, AdGroupTitle, AdNote, AdRoom, AdSwitch, RoomPlate, type AdFigure, type AdPosition } from "../primitives";
import { useRoomCrumb } from "../crumb";
import { RecordTicket } from "../record";
import { AdPanel } from "../panel";
import { AdColumns, AdHeat, AdRing, AdTrend, weekly } from "../charts";
import { QrHomeSection } from "./QrHomeSection";
import { fmtNum, fmtPct } from "../format";

const AR_SCAN: ArForms = ["مسحةٌ واحدة", "مسحتان", "مسحات", "مسحةً"];
const scans = (v: number) => (v ? arCount(v, AR_SCAN) : "لا مسحات");
/** المعدودُ تحت رقمه (قاعدةُ العدّاد): «66» ثمّ «مسحةً»، و«4» ثمّ «مسحات» */
const NOUN: ArForms = ["مسحة", "مسحتان", "مسحات", "مسحةً"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
// أعمدةُ الساعات أربعٌ وعشرون، فتُكتب بلا مسافةٍ («11ص») كما كانت
const HOURS = Array.from({ length: 24 }, (_, h) => hour12(h, false));
/** مُددُ المبدّل بترتيبها، والنادرُ منها في «المزيد» */
const ORDER = ["all", "ytd", "90", "mtd", "7", "today", "lastmonth", "yesterday"];
const RARE = new Set(["lastmonth", "yesterday"]);

export type QrRange = { preset: string; from: string | null; to: string | null };


export function QrStatsRoom({ stats, counts, week, range, canSettings, home }: {
  stats: QrStats;
  /** مسحاتُ كلّ مدّةٍ من سجلّ العمر — أعدادُ المبدّل */
  counts: Record<string, number>;
  /** آخرُ سبعة أيّامٍ والسبعةُ قبلها — من سجلّ العمر، لا من المدّة */
  week: { now: number; before: number };
  range: QrRange;
  /** بابُ الإعدادات يغيب عن الشريك القارئ (كان يُطوى شريطُ التبويبين كلُّه) */
  canSettings: boolean;
  /** **بيتُ الباركود** (مختبرُ ٢٠٢٦-١١-١٦): الباركودُ وما يُفعل به فوق الإحصاء — و`ready` حين يصل إليها من الإنشاء */
  home?: { ready?: boolean; designHref?: string; settingsHref?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState(false);
  /** فتاتُ الغرفة للوح «لم يُعثر عليه» (كان رأسُ «الباركود» برابط الرجوع إلى المولّد فوق التنبيه) */
  const crumb = useRoomCrumb("/dashboard/tools/qr", "الباركود");
  const { link } = stats;
  const today = todayKey();
  /** يومُ مولد الباركود — حدُّ المدّة المخصّصة من جهة البداية (كان `bornKey`) */
  const born = clubDayKey(link?.createdAt ?? new Date().toISOString());
  const [from, setFrom] = useState(range.from ?? born);
  const [to, setTo] = useState(range.to ?? today);

  const f = useMemo(() => {
    const total = stats.daily.reduce((s, x) => s + x.count, 0);
    const peak = stats.hours.some((h) => h > 0) ? stats.hours.indexOf(Math.max(...stats.hours)) : null;
    const devices = stats.devices.map((x) => ({ label: deviceName(x.key), value: x.count }));
    const devTotal = devices.reduce((s, x) => s + x.value, 0);
    const top = [...devices].sort((a, b) => b.value - a.value)[0];
    const points = weekly(stats.daily.map((x) => ({ label: fmtDayMonth(`${x.day}T12:00:00Z`), value: x.count })));
    return { total, peak, devices, top, topPct: top && devTotal ? Math.round((top.value / devTotal) * 100) : 0, points };
  }, [stats]);

  if (!link) {
    return (
      <AdRoom label="الباركود">
        <RoomPlate title="الباركود" crumb={crumb} />
        <AdNote tone="warn" title="لم يُعثر على الباركود">إمّا أنّه حُذف، وإمّا أنّه ليس من رموزك. عُد إلى قائمة رموزك.</AdNote>
      </AdRoom>
    );
  }

  /** العمرُ كلُّه — ولا يُقال «منذ الإنشاء» إن قُصّ السجلّ (حكمُ الصفحة القديمة) */
  const all = !range.from && range.preset === "all";
  const life = all && !stats.clipped;
  const custom = range.preset === "custom" && range.from && range.to;
  const dates = range.from && range.to ? rangeLabel({ from: range.from, to: range.to }) : null;
  // السجلُّ يُقصّ عند سنةٍ أو عشرين ألفَ مسحة (`data.ts`)، فلا يُقال «آخر سنة» وقد يكون أقلَّ منها
  const totalLabel = `${arCounted(f.total, NOUN)} ${life ? "منذ الإنشاء" : all ? "في أحدث السجلّ" : "في المدّة"}`;
  /** ما تقوله المدّةُ تحت اسم القسم: الاختصارُ وتاريخاه (الاختصارُ وحده لا يقول أيّ أيّام)، أو المخصّصةُ بتاريخيها */
  const spanSub = life ? "منذ إنشائه" : all ? "أحدثُ ما في السجلّ" : custom ? dates! : `${presetName(range.preset)}، ${dates}`;

  const positions: AdPosition[] = [
    ...ORDER.map((k) => ({ key: k, label: PRESETS.find((p) => p.key === k)?.label ?? k, count: counts[k] ?? 0, rare: RARE.has(k) })),
    // المخصّصةُ آخرُ «المزيد»، وإن كانت المختارةَ حملت تاريخيها وعددَها
    { key: "custom", label: custom ? dates! : "مدّة مخصّصة", count: custom ? f.total : 0, rare: true },
  ];
  const go = (url: string) => start(() => router.push(url));
  const onPosition = (key: string) => {
    if (key === "custom") { setPicking(true); return; }
    go(qrRangeHref(link.id, range, { preset: key }));
  };
  const apply = () => { setPicking(false); go(qrRangeHref(link.id, range, { from, to })); };

  const figures: AdFigure[] = [
    { icon: <Scan />, value: fmtNum(f.total), label: totalLabel },
    { icon: <Clock />, value: f.peak === null ? "—" : hour12Long(f.peak), label: "ساعةُ الذروة" },
    { icon: <TrendUp />, value: fmtNum(week.now), label: "آخر 7 أيّام" },
    stats.bots
      ? { icon: <Robot />, value: fmtNum(stats.bots), label: `${arCounted(stats.bots, NOUN)} من الآلات، مستبعَدة` }
      : { icon: <DeviceMobile />, value: f.top ? fmtPct(f.topPct) : "—", label: f.top ? f.top.label : "الأجهزة" },
  ];

  return (
    <AdRoom label={link.title}>
      <RecordTicket
        title={link.title}
        seed={link.id}
        stub={qrStub(link)}
        chips={qrState(link)}
        acts={canSettings ? <AdButton variant="fill" size="sm" icon={<Gear />} href={home?.settingsHref ?? `/dashboard/tools/qr/${link.id}/settings`}>الإعدادات</AdButton> : undefined}
        info={[qrTarget(link)]}
        figures={figures}
      />
      {home ? <QrHomeSection link={link} canEdit={canSettings} ready={home.ready} designHref={home.designHref} /> : null}
      {stats.error ? <AdNote tone="warn" title="نقصٌ في القراءة">{stats.error}</AdNote> : null}
      {home ? <AdGroupTitle icon={<ChartLineUp />}>الإحصاء</AdGroupTitle> : null}
      <AdSwitch label="المدّة" positions={positions} position={range.preset} onPosition={onPosition} />

      {/* **مدّةٌ بلا مسحاتٍ فراغٌ واحدٌ لا أربعة**: والباركودُ الذي مُسح قبلها يُدعى إلى مدّةٍ أوسع، والذي لم يُمسح قطّ يُقال له ذلك */}
      {f.total === 0 ? (
        <AdEmpty
          icon={<Scan />}
          title={all || !counts.all ? "لا مسحات بعد" : "لا مسحات في هذه المدّة"}
          desc={all || !counts.all ? "حين يُمسح الباركود سترى هنا حركةَ المسح، وأجهزتَه، وساعاتِه، وأيّامَه." : `مُسح ${scans(counts.all)} منذ إنشائه، فاختر مدّةً أوسع.`}
        />
      ) : (
        <div className="ad-st" data-pending={pending ? "" : undefined}>
          <AdPanel icon={<ChartLineUp />} title="حركة المسح" sub={spanSub} span="wide">
            {/* الحدُّ يُقال في موضعه: باركودٌ تجاوز سنةً أو عشرين ألفَ مسحةٍ يُرسَم له أحدثُ ما في السجلّ */}
            {stats.clipped ? <p className="ad-st-clip">هذا أحدثُ ما في السجلّ، لا عمرُ الباركود كلُّه.</p> : null}
            <AdTrend points={f.points} unit={scans} label={`حركة المسح، ${spanSub}`} />
          </AdPanel>
          <AdPanel icon={<DeviceMobile />} title="من أيّ جهاز">
            <AdRing items={f.devices} unit={scans} label="المسح بحسب الجهاز" />
          </AdPanel>
          <AdPanel icon={<Clock />} title="ساعات المسح" span="full">
            <AdColumns bars={stats.hours.map((v, h) => ({ tick: HOURS[h], label: `الساعة ${hour12(h)}`, value: v }))} unit={scans} label="المسح في ساعات اليوم" peak={f.peak} />
          </AdPanel>
          <AdPanel icon={<CalendarBlank />} title="الأسبوع في ساعاته" span="full">
            <AdHeat rows={DAYS} cols={HOURS} values={stats.heat} unit={scans} label="المسح في أيّام الأسبوع وساعاته" />
          </AdPanel>
        </div>
      )}

      {/* المدّةُ المخصّصة: تاريخان من مولد الباركود إلى اليوم، كما كانت في لوحة المدّة القديمة (`RangePicker`) */}
      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="مدّة مخصّصة"
        description="تختار بين يوم إنشائه واليوم."
        size="sm"
        footer={
          <>
            <AdButton variant="fill" disabled={!from || !to || from > to} onClick={apply}>طبّق</AdButton>
            <AdButton plain variant="line" onClick={() => setPicking(false)}>إلغاء</AdButton>
          </>
        }
      >
        <Field label="من" type="date" placeholder="" icon={<CalendarBlank />} innerIcon={<CalendarDots />}
          value={from} min={born} max={to} onChange={(e) => setFrom(e.target.value)} />
        <Field label="إلى" type="date" placeholder="" icon={<CalendarBlank />} innerIcon={<CalendarDots />}
          value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
      </Modal>
    </AdRoom>
  );
}
