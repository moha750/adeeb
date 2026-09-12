"use client";

import { useMemo } from "react";
import { Alert, AreaChart, Donut, SectionCard, Stat, type BarItem } from "@adeeb/design-system";
import { ChartLineUp, Clock, DeviceMobile, QrCode, Robot } from "@phosphor-icons/react";
import { EmptyState } from "../../_components/EmptyState";
import { PageHeader } from "../../_components/PageHeader";
import { formatThousands as fmt } from "@/app/_components/format";
import { deviceName } from "@/lib/devices";
import { clubDayKey, fmtDate, fmtDayMonth, hour12Long } from "@/lib/dates";
import { todayKey } from "@/lib/analyticsRange";
import { RangePicker } from "../../analytics/RangePicker";
import { qrRangeHref } from "./range";
import { SCAN_UNIT } from "./copy";
import { QrDeepStats } from "./QrDeepStats";
import { QrTabs } from "./QrTabs";
import type { QrStats } from "./data";

/**
 * **إحصاءُ باركودٍ واحد** — بابُ القراءة، وأخوه `QrSettingsView` بابُ الإدارة.
 *
 * وانفصلا صفحتين ٢٠٢٦-٠٩-٠٥ بحجّة المالك: «فالقائمةُ المنسدلة تُرسل الإحصاءات إلى بابها
 * وتعديلَ الوجهة إلى بابه». والصفحةُ عنوانٌ يُربَط به، والتبويبُ حالٌ في الذاكرة لا يُربَط.
 *
 * **ورقمٌ واحدٌ لا رقمان**: كان يُقال معه «الزائرون الفريدون»، فأزاله المالك ٢٠٢٦-٠٨-٢٨
 * لأنّ البصمةَ تدور كلّ يوم، فمن مسح أمسِ واليوم يُعَدّ اثنين — رقمٌ يُقرأ يقينًا وهو ظنّ.
 *
 * **ومسحاتُ الآلات تُقال ولا تُخفى**: استبعادُها من الرقم صوابٌ، وكتمانُ عددِها إيهامٌ
 * بأنّ الرمزَ لم يره إلّا بشر.
 */
export function QrStatsView({
  stats,
  range,
  canSettings = true,
}: {
  stats: QrStats;
  /** بابُ الإعدادات يغيب عن الشريك القارئ: يقرأ الإحصاءَ ولا يبدّل شيئًا. */
  canSettings?: boolean;
  /** المدّةُ المعروضة الآن. `from`/`to` فارغان يعنيان عمرَ الباركود كلَّه. */
  range?: { preset: string; from: string | null; to: string | null };
}) {
  const { link } = stats;
  /** يومُ مولد الباركود — حدُّ «منذ البداية» في لوحة المدّة. */
  const bornKey = clubDayKey(link?.createdAt ?? new Date().toISOString());

  const devices: BarItem[] = useMemo(
    () => stats.devices.map((d) => ({ label: deviceName(d.key), value: d.count })),
    [stats.devices],
  );

  if (!link) {
    return (
      <>
        <PageHeader title="الباركود" crumbLeaf="الباركود" />
        <Alert tone="warning" title="لم يُعثر على الباركود">
          إمّا أنّه حُذف، وإمّا أنّه ليس من رموزك. عُد إلى قائمة رموزك.
        </Alert>
      </>
    );
  }

  return (
    <>
      {/* **الورقةُ «الإحصاء» لا اسمُ الباركود**: الاسمُ مكتوبٌ عنوانًا فوقه فيُسقَط من الفتات،
          فينتهي المسارُ برابط الغرفة وكأنّك فيها. */}
      {/* **الورقةُ اسمُ الباركود لا اسمُ الصفحة** (المالك ٢٠٢٦-٠٩-٠٥): صار تحت الرأس مبدّلٌ
          يقول «الإحصاء» أو «الإعدادات» مضيئًا، فورقةٌ في الفتات تقول ما يقوله تكرارٌ. والاسمُ
          يُسقَط من الفتات لأنّه عينُ العنوان، فيبقى أثرُه: «مولّد الباركود» رابطًا قبله. */}
      <PageHeader title={link.title} crumbLeaf={link.title} />
      <QrTabs id={link.id} on="stats" canSettings={canSettings} />

      {stats.error ? <Alert tone="warning" title="نقصٌ في القراءة">{stats.error}</Alert> : null}

      {range ? (
        <div className="mt-4">
          <RangePicker
            wide
            showCompare={false}
            preset={range.preset}
            range={{ from: range.from ?? bornKey, to: range.to ?? todayKey() }}
            compare={false}
            href={(next) => qrRangeHref(link.id, range, next)}
          />
        </div>
      ) : null}

      {/**
        * **الكرتُ يتبع المصفّي كالمخطّطات** (المالك ٢٠٢٦-٠٩-٠٦): كان الرقمُ الكبير عدّادَ
        * العمر كلِّه بينما ما تحته يعرض مدّةً مختارة، فمن اختار «اليوم» قرأ ٨٦ فوق مخطّطٍ
        * شبه فارغ. فصار الرقمُ **مسحاتِ المدّة**، وتسميتُه تقول مدّتَها بلا لبس، والعمرُ
        * كلُّه يبقى مقروءًا باختيار «منذ البداية» وهو الافتراض.
        */}
      <div className="stat-grid mt-4">
        <Stat
          icon={<ChartLineUp />}
          value={fmt(stats.daily.reduce((n, d) => n + d.count, 0))}
          label={!range || range.preset === "all" ? "مسحة منذ الإنشاء" : "مسحة في المدّة"}
          tone="success"
        />
        <Stat
          icon={<Clock />}
          value={stats.hours.some((h) => h > 0) ? hour12Long(stats.hours.indexOf(Math.max(...stats.hours))) : "—"}
          label="ساعةُ الذروة"
        />
        {stats.bots ? <Stat icon={<Robot />} value={fmt(stats.bots)} label="مسحةُ آلةٍ مستبعَدة" /> : null}
      </div>

      {/**
        * **الفراغُ يُحلّ بالتأليف لا بالحشو.** كان الصفُّ الأخير: حلقةٌ قصيرةٌ بجوار بطاقةٍ
        * طويلة، فيبقى تحت القصيرة خواءٌ بمقدار الفرق (رآه المالك ٢٠٢٦-٠٨-٢٨). ولا يُصلحه
        * تساوي الارتفاعات: ذاك ينقل الخواءَ من تحت الكرت إلى داخله.
        *
        * فأُعيد التأليف على قاعدة: **يُقرَن الشبيهُ بالشبيه**.
        * · صفٌّ للمخطّطين معًا (خطٌّ وحلقة): كلاهما رسمٌ، وارتفاعُهما متقارب.
        * · وبطاقةُ الباركود **بعرض الصفحة وأفقيّةً**: معاينةٌ إلى جانبها بياناتُها وأفعالُها،
        *   فتملأ عرضَها بمضمونها ولا تطول فتُخلي جارتَها.
        */}
      <div className="card-grid mt-4">
        <SectionCard
          headerVariant="soft"
          icon={<ChartLineUp />}
          /**
           * **العنوانُ يتبع المصفّي** (صُحّح ٢٠٢٦-٠٩-٠٦): كان يقول «منذ الإنشاء» دائمًا،
           * فمن اختار «اليوم» قرأ عنوانًا يناقض ما تحته. فلا يُقال «منذ الإنشاء» إلّا حين
           * تكون المدّةُ هي العمرَ كلَّه، وما عداه يكفيه «حركةُ المسح» والمدّةُ مكتوبةٌ فوقه
           * في المصفّي.
           */
          title={!stats.clipped && (!range || range.preset === "all") ? "حركةُ المسح منذ الإنشاء" : "حركةُ المسح"}
        >
          {/* الحدُّ يُقال في موضعه: باركودٌ تجاوز سنةً أو عشرين ألفَ مسحةٍ يُرسَم له أحدثُ ما
              في السجلّ، فلو بقي العنوانُ «منذ الإنشاء» كذب على قارئه. */}
          {stats.clipped ? (
            <p className="fld-help">هذا أحدثُ ما في السجلّ، لا عمرُ الباركود كلُّه.</p>
          ) : null}
          {/* **خطٌّ على الصفر ليس مخطّطًا**: شبكةٌ وتواريخُ وخطٌّ مسطّحٌ تُقرأ عطلًا لا خبرًا،
              فتُترك الحالُ الفارغةُ نفسُها التي في جارته (المالك ٢٠٢٦-٠٨-٣١). */}
          {stats.daily.some((d) => d.count > 0) ? (
            <AreaChart
              tall
              // المدّةُ الطويلةُ تُجمَع أسبوعيًّا (المكوّنُ يقرّر بالعتبة)، وتسميةُ اليوم
              // تُقصَّر حينها إلى يومٍ وشهرٍ كي تسع في محورٍ يحمل أسابيع.
              groupable
              groupLabel={(start) => `أسبوع ${start}`}
              labels={stats.daily.map((d) =>
                stats.daily.length > 60 ? fmtDayMonth(`${d.day}T12:00:00Z`) : fmtDate(`${d.day}T12:00:00Z`),
              )}
              series={[{ name: "المسحات", values: stats.daily.map((d) => d.count) }]}
            />
          ) : (
            <EmptyState
              variant="soft"
              icon={<ChartLineUp aria-hidden />}
              title="لا مسحات بعد"
              description="حين يُمسح الباركود سترى هنا حركةَ المسح يومًا بيوم."
            />
          )}
        </SectionCard>

        <SectionCard className="card-mid" headerVariant="soft" icon={<DeviceMobile />} title="من أيّ جهاز">
          <Donut stack items={devices} unit={SCAN_UNIT} empty={
              <EmptyState
                variant="soft"
                icon={<DeviceMobile aria-hidden />}
                title="لا مسحات بعد"
                description="حين يُمسح الباركود ستعرف هنا حصّةَ كلّ جهاز من المسح."
              />
            } />
        </SectionCard>
      </div>

      {/* **القراءةُ الأعمق** — أُقِرّت في `\/ui\/qr-deep` ٢٠٢٦-٠٩-٠٥ ثمّ رُكّبت هنا: ساعاتُ
          المسح، والأسبوعُ في ساعاته، وأربعةُ أرقامٍ لا يقولها الخطُّ اليوميّ. */}
      <QrDeepStats stats={stats} />
    </>
  );
}
