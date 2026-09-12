"use client";

import { BarList, ColumnBars, Container, Donut, SectionCard, Stat } from "@adeeb/design-system";
import { DoorOpen, Timer } from "@phosphor-icons/react";
import { ArrowsClockwise, ArrowUUpLeft } from "@/app/_components/glyphs";
import { ICONS } from "@/app/dashboard/_shell/icons";
import { iconKeyForHref } from "@/app/dashboard/_shell/nav";

/**
 * معاينةُ أربع إحصاءاتٍ مقترحةٍ لشاشة الزوّار — **اختيارٌ للمالك**، ثمّ يُبنى ما يقرّه ويُعدم الباقي.
 *
 * **أرقامُها لقطةٌ حقيقيّةٌ** من قاعدة الإنتاج (آخر ثلاثين يومًا حتى ٢٠٢٦-٠٩-٠٥)، مكتوبةٌ هنا
 * ساكنةً لا محسوبةً حيًّا: صفحاتُ `/ui` علنيّةٌ بلا حارس، فلا تُقرأ فيها إحصاءاتُ الموقع من
 * القاعدة. وإن أُقِرّت انتقلت إلى `/dashboard/analytics` خلف قفلها وحُسبت لكلّ مدّةٍ تُختار.
 */

const nf = (n: number) => n.toLocaleString("en-US");
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : s < 3600 ? `${Math.floor(s / 60)}د ${s % 60}ث` : `${Math.floor(s / 3600)}س ${Math.floor((s % 3600) / 60)}د`);
const U_VIEW = { one: "مشاهدة", two: "مشاهدتان", few: "مشاهدات" };
const U_VISIT = { one: "زيارة", two: "زيارتان", few: "زيارات" };

/** أيقونةُ المسار من خريطة التنقّل نفسِها، كما تفعل شاشةُ الإحصاءات. */
const pageIcon = (path: string) => {
  const key = iconKeyForHref(path);
  const Ic = key ? ICONS[key] : null;
  return Ic ? <Ic /> : undefined;
};

// ١) صفحاتُ الدخول: أوّلُ صفحةٍ في كلّ زيارة
const ENTRY = [
  { label: "الرئيسيّة", path: "/", value: 321 },
  { label: "ديبو", path: "/deebo", value: 56 },
  { label: "صفحةٌ قديمةٌ لا وجود لها", path: "/membership.html", value: 48 },
  { label: "تسجيل الدخول", path: "/login", value: 42 },
  { label: "منعطف: من أنا فعلًا؟", path: "/radio/munataf/ep-1", value: 14 },
  { label: "الإذاعة", path: "/radio", value: 10 },
  { label: "تعيين كلمة مرور", path: "/reset-password", value: 10 },
  { label: "برامجنا وأنشطتنا", path: "/activities", value: 9 },
];

// ٢) المصادرُ بأسمائها (٢٠٢٦-٠٩-٠٥): «تواصلٌ اجتماعيّ» لا يقول أيَّ منصّة، والاسمُ يقول
const SOURCES = [
  { label: "دخولٌ مباشر", value: 636 },
  { label: "بحث Google", value: 189 },
  { label: "X (تويتر)", value: 84 },
  { label: "Instagram", value: 44 },
  { label: "Facebook", value: 5 },
  { label: "Snapchat", value: 1 },
];

// ٤) أطولُ الصفحات مكثًا: متوسّطُ البقاء في الصفحة الواحدة (لا يُحتسب إلّا ما جُمِع منه خمسُ مشاهدات)
const DWELL = [
  { label: "مكتبة: عامٌ بألف ذكرى", path: "/library/202", value: 2427 },
  { label: "ديبو", path: "/deebo", value: 688 },
  { label: "تسجيل الدخول", path: "/login", value: 312 },
  { label: "الرئيسيّة", path: "/", value: 157 },
  { label: "صفحةٌ قديمةٌ لا وجود لها", path: "/membership.html", value: 121 },
  { label: "استعادة كلمة المرور", path: "/forgot-password", value: 90 },
  { label: "الانضمام إلى أديب", path: "/join", value: 80 },
  { label: "منعطف: أسطورة الشغف", path: "/radio/munataf/ep-3", value: 61 },
];

// توزيعُ الزيارات على مُدَدٍ خمس — لقطةُ آخر ثلاثين يومًا
const BUCKETS = [
  { label: "أقلّ من 10 ثوانٍ", tick: "‏<10ث", value: 339 },
  { label: "من 10 ثوانٍ إلى دقيقة", tick: "دقيقة", value: 175 },
  { label: "من دقيقة إلى 5 دقائق", tick: "5د", value: 98 },
  { label: "من 5 إلى 15 دقيقة", tick: "15د", value: 28 },
  { label: "أكثر من 15 دقيقة", tick: "‏>15د", value: 12 },
];

export default function AnalyticsNextLab() {
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Analytics Next</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">هيئاتُ مدّة الزيارة</h1>
        <p className="mt-2 text-content-muted">
          الإحصاءاتُ الأربعُ أُقِرّت ونزلت في الشاشة، وبقيت هيئةُ «مدّة الزيارة» تنتظر اختيارَك:
          ثلاثةُ أشكالٍ بالأرقام نفسِها. وفوقها القسمان الآخران كما نزلا، للسياق.
        </p>

        <div className="mt-10 space-y-6">
          <SectionCard title="صفحاتُ الدخول" icon={<DoorOpen />}>
            <BarList unit={U_VISIT} items={ENTRY.map((e) => ({ label: e.label, value: e.value, icon: pageIcon(e.path) }))} />
          </SectionCard>

          <SectionCard title="من أين جاؤوا" icon={<ArrowsClockwise />}>
            <Donut unit={U_VIEW} items={SOURCES} />
          </SectionCard>

          {/* ثلاثُ هيئاتٍ لمدّة الزيارة — الأولى هي النازلةُ الآن، والأخريان تنتظران الاختيار.
              والأرقامُ لقطةُ آخرِ ثلاثين يومًا: متوسّطٌ ٣د١٩ث ووسيطٌ ٢ث و٦٥٢ زيارة. */}
          <SectionCard title="أ) ثلاثةُ كروت (النازلُ الآن)" icon={<Timer />}>
            <div className="stat-grid">
              <Stat icon={<Timer />} value={fmtDur(199)} label="متوسّط الزيارة" />
              <Stat icon={<Timer />} value={fmtDur(2)} label="الزيارةُ الوسيطة" />
              <Stat icon={<ArrowUUpLeft />} value={nf(652)} label="زيارة في الحساب" />
            </div>
          </SectionCard>

          <SectionCard title="ب) مدرّجٌ: كم زيارةً بقيت كم" icon={<Timer />}>
            <ColumnBars
              height={150}
              barMaxWidth={64}
              fullTicks
              formatValue={(n) => `${nf(n)} زيارة`}
              bars={BUCKETS.map((b) => ({ value: b.value, label: b.label, tick: b.label }))}
            />
          </SectionCard>

          <SectionCard title="ج) أشرطةٌ أفقيّة" icon={<Timer />}>
            <BarList unit={U_VISIT} items={BUCKETS.map((b) => ({ label: b.label, value: b.value }))} />
          </SectionCard>

          <SectionCard title="د) الوسيطُ ثمّ التوزيع (هجين)" icon={<Timer />}>
            <div className="vdur-head">
              <div className="vdur-big">
                <b>{fmtDur(2)}</b>
                <span>نصفُ الزيارات أقصرُ من هذا</span>
              </div>
              <div className="vdur-side">
                <span>المتوسّط <b>{fmtDur(199)}</b></span>
                <span><b>{nf(652)}</b> زيارة في الحساب</span>
              </div>
            </div>
            <BarList unit={U_VISIT} items={BUCKETS.map((b) => ({ label: b.label, value: b.value }))} />
          </SectionCard>

          <SectionCard title="أطولُ الصفحات مكثًا" icon={<Timer />}>
            <BarList
              unit={{ one: "ثانية", two: "ثانيتان", few: "ثوانٍ" }}
              items={DWELL.map((d) => ({ label: d.label, value: d.value, icon: pageIcon(d.path) }))}
            />
          </SectionCard>
        </div>
      </Container>
    </main>
  );
}
