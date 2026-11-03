"use client";

/**
 * غرفةُ تحرير الأنظمة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `dashboard/regulations/page.tsx` القديم (الدستور م٦٨):
 * الوثائقُ السبع بترتيبها في القاعدة، ولكلٍّ إصدارُها النافذ أو ما جُدول نفاذُه، وشارةُ مسودّتها بموافقاتها؛ والنقرُ على الوثيقة يفتحها
 * للتحرير. ولا مواضعَ ولا مرشّحاتِ ولا أفعالَ غيرُ الفتح، كما كانت. والنصوصُ والبياناتُ لا تُمسّ هنا: الغرفةُ تقرأ `getRoomIndex` كما هو.
 * والفرقُ في الشكل: الكعبُ رقمُ الإصدار (حقيقةُ الوثيقة الأولى في غرفة التحرير)، وحالُه سطرٌ تحت الاسم، والفتحُ زرٌّ ظاهر.
 */
import type { RoomView } from "../view";
import { REGULATIONS_ROOM } from "./regulations.meta";
import { matchesSearch } from "@adeeb/design-system";
import { CalendarCheck, ClockCountdown, Hash } from "@phosphor-icons/react";
import { RegIcon } from "@/app/regulations/_parts/RegIcon";
import { PencilSimple } from "@/app/_components/glyphs";
import type { RoomRow } from "@/app/dashboard/regulations/data";
import { AR_DOC } from "@/lib/regulations/text";
import { AdActs, AdBadge, AdCard, AdRow, type AdMeta, type AdStub } from "../primitives";
import { CollectionRoom } from "../collection";
import { fmtDayFull, fmtNum } from "../format";

const editorOf = (d: RoomRow) => `/dashboard/regulations/${d.slug}`;

/** شارةُ المسودّة كما كانت: لوثيقةٍ منشورةٍ لها مسودّة، بعدد موافقات الرئيسين (اثنتان: جاهزةٌ للنشر). */
const draftChip = (d: RoomRow) => {
  if (!d.draft || !d.current) return null;
  const n = d.draft.approvals;
  return <AdBadge tone={n === 2 ? "ok" : "warn"}>{n === 2 ? "جاهز للنشر" : n === 1 ? "موافقة واحدة" : "مسودة"}</AdBadge>;
};

/**
 * **الكعبُ رمزُ الوثيقة** (رمزُها في الموقع، `RegIcon`) وتحته رقمُ إصدارها — النافذ، وإلّا المجدولُ نفاذُه — أو «لم يُنشر بعد».
 * كان الرقمَ وحده، فصارت الوثائقُ السبعُ قبل نشرها سبعةَ كعوبٍ متطابقة (مراجعة ٢٠٢٦-١١-٠٢).
 * **وحالُه سطرٌ لا يكرّر الكعب**: كان العنوانُ الفرعيّ «الإصدار ٢، نافذ منذ…»، فصار الرقمُ في الكعب والسطرُ «نافذ منذ…».
 * والمجدولُ يتقدّم كما كان («الإصدار ٣ يسري في…»)، ورقمُه في السطر حين يخالف رقمَ الكعب.
 */
const stubOf = (d: RoomRow): AdStub => {
  const v = d.current ?? d.scheduled;
  return { big: "", icon: <RegIcon slug={d.slug} />, small: v ? `الإصدار ${fmtNum(v.no)}` : "لم يُنشر بعد" };
};
const info = (d: RoomRow): AdMeta[] => {
  if (d.scheduled) {
    const when = fmtDayFull(d.scheduled.effectiveFrom);
    return [{ icon: <ClockCountdown />, text: d.current ? `الإصدار ${fmtNum(d.scheduled.no)} يسري في ${when}` : `يسري في ${when}` }];
  }
  if (d.current) return [{ icon: <CalendarCheck />, text: `نافذ منذ ${fmtDayFull(d.current.effectiveFrom)}` }];
  return [];
};

/** الفتحُ وحده، كما كانت الوثيقةُ رابطًا إلى صفحتها — والتحريرُ والموافقةُ والنشرُ هناك. */
const acts = (d: RoomRow, inRow?: boolean) => (
  <AdActs inRow={inRow} primary={{ label: "فتح المحرّر", icon: <PencilSimple />, href: editorOf(d) }} ops={[]} />
);

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ والتواريخُ هنا أيّامُ نفاذٍ تُحسب في الخادم (`riyadhToday`)، فلا يُقرأ. */
export function RegulationsRoom({ rows, view }: { rows: RoomRow[]; serverNow: number; view?: RoomView }) {
  return (
    <CollectionRoom<RoomRow>
      navPath={REGULATIONS_ROOM.navPath}
      title={REGULATIONS_ROOM.title}
      noun={AR_DOC}
      items={rows}
      positions={[]}
      searchPlaceholder="ابحث باسم الوثيقة…"
      matchSearch={(d, q) => matchesSearch(q, d.title)}
      viewKey={REGULATIONS_ROOM.viewKey}
      initialView={view}
      idOf={(d) => d.slug}
      table={{
        head: "الوثيقة",
        stub: { key: "version", label: "الإصدار", icon: <Hash /> },
        columns: [],
      }}
      emptyAll={{ title: "لا وثائق بعد", desc: "هنا وثائقُ أدِيب: الدستورُ والأنظمة، لكلٍّ إصدارُه النافذ ومسودّتُه وموافقاتُ الرئيسين عليها." }}
      renderCard={(d) => (
        <AdCard
          key={d.slug}
          seed={d.slug}
          stub={stubOf(d)}
          chips={draftChip(d)}
          title={d.title}
          href={editorOf(d)}
          meta={info(d)}
          foot={acts(d)}
        />
      )}
      renderRow={(d) => (
        <AdRow
          key={d.slug}
          title={d.title}
          href={editorOf(d)}
          stub={{ ...stubOf(d), seed: d.slug }}
          badge={draftChip(d)}
          sub={info(d)}
          cells={[]}
          acts={acts(d, true)}
        />
      )}
    />
  );
}
