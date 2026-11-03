"use client";

/**
 * غرفةُ إشراف عِرفان على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `irfan/oversight/OversightView.tsx` القديم:
 * لحساب أدِيب المؤسسيّ وحده (`oversee_irfan`، وجهُ «المرآة»): رسائلُ الموسم كلُّها بنصوصها، وبطاقةُ كلِّ رسالةٍ تُفتح في نافذتها
 * مرسومةً في المتصفّح. ولا فعلَ على رسالة: المرآةُ عرضٌ لا تحرير.
 * **وأرقامُ الموسم ورسومُه** (كاردُ الإحصاء، والرسائلُ في كلّ يوم، والتصميم، والعنوان) خرجت من الغرفة إلى صفحة الإحصاء
 * (سياسةُ القالب، اعتمدها المالك): الغرفةُ قائمتُها، وحالُ القراءة مواضعُها بأعدادها.
 */
import type { RoomView } from "../view";
import { IRFAN_OVERSIGHT_ROOM } from "./irfan-oversight.meta";
import { useEffect, useState } from "react";
import { Modal, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChatTeardropText, EnvelopeOpen, EnvelopeSimple, IdentificationCard, ImageBroken, Palette, TextT, UsersThree } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { renderIrfanCard } from "@/lib/irfan/card";
import { LOOK_NAMES } from "@/app/dashboard/irfan/vocab";
import type { OversightRow } from "@/app/dashboard/irfan/oversight/vocab";
import type { ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdCard, AdRow, type AdMeta } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtDayFull } from "../format";

const AR_MESSAGE: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];

/**
 * **مواضعُ الرسائل بحال قراءتها**: كان فوق القائمة القديمة كاردُ «قرأها قائدُها في البوّابة» (كذا من كذا) — فصار موضعين
 * بعدديهما، والعددُ بجانب «الكلّ» عددُ الرسائل (كان كاردَ «رسالة»). ولم تكن للغرفة القديمة تبويباتٌ ولا مرشّحات.
 */
const POSITIONS: Position<OversightRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا رسائل بعد." },
  { key: "read", label: "قُرئت", match: (r) => r.read, empty: "لم تُقرأ رسالةٌ في البوّابة بعد." },
  { key: "unread", label: "لم تُقرأ", match: (r) => !r.read, empty: "قُرئت الرسائلُ كلُّها." },
];

/** البطاقةُ كاملةً في النافذة، مرسومةً في المتصفّح (blob) بلا لوحٍ حولها — نافذةُ الغرفة القديمة كما هي. */
function CardShot({ row }: { row: OversightRow }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderIrfanCard(row.card, row.look).then((b) => { url = URL.createObjectURL(b); if (alive) setSrc(url); }, () => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [row]);
  return (
    <div className="irf-card-shot">
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
      {src ? <img className="acr-shot is-portrait" src={src} alt={`عِرفان إلى ${row.to}`} /> : <span className="acr-shot is-portrait" aria-hidden />}
    </div>
  );
}

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض في الإشراف فلا يُقرأ هنا. */
export function IrfanOversightRoom({ rows, view }: { rows: OversightRow[]; serverNow: number; view?: RoomView }) {
  const [open, setOpen] = useState<OversightRow | null>(null);

  /** الحالُ شارةٌ في العرضين (كانت سطرَ «الحال»): قُرئت في البوّابة أم لم تُقرأ — مبنيّةً للمجهول فلا تُخطئ جنسَ القائد. */
  const chips = (r: OversightRow) =>
    r.read
      ? <AdBadge tone="ok" icon={<EnvelopeOpen />}>قُرئت في البوّابة</AdBadge>
      : <AdBadge tone="neutral" icon={<EnvelopeSimple />}>لم تُقرأ بعد</AdBadge>;
  /**
   * **السطورُ مصدرُها واحدٌ وترتيبُها واحد**، بترتيب الكرت القديم: مقعدُ القائد (كان تحت «إلى فلان» في رأسه)، ثمّ «من» كتب،
   * ثمّ العنوانُ والتصميم، ثمّ نصُّ الرسالة سطرًا واحدًا (كاملُه في البطاقة)، ثمّ غيابُ صورة المعاينة بنغمته — والحاضرةُ تقولها
   * صورتُها في الكعب. وفي السطر العنوانُ والتصميمُ عمودان فيخرجان منها.
   */
  const info = (r: OversightRow, inCard: boolean): AdMeta[] => [
    ...(r.seat ? [{ icon: <IdentificationCard />, text: r.seat }] : []),
    { icon: <UsersThree />, text: `من ${r.from}` },
    ...(inCard
      ? [{ icon: <TextT />, text: r.title ?? "بلا عنوان" }, { icon: <Palette />, text: LOOK_NAMES[r.look] }]
      : []),
    { icon: <ChatTeardropText />, text: r.card.body, clip: true },
    ...(r.pictured ? [] : [{ icon: <ImageBroken />, text: "لم تُرفع صورةُ معاينتها، فوصلت في واتساب بلا صورة", tone: "warn" as const }]),
  ];
  /** الكعبُ: يومُ الرسالة وشهرُه (كان سطرًا تحت «من»)، على صورة معاينتها (كانت مصغّرةَ الكرت)؛ وبلا صورةٍ قماشُ اللوح. */
  const stubOf = (r: OversightRow) => { const d = dayParts(r.at); return { big: d.day, small: d.month }; };
  const look = (r: OversightRow) => (r.thumb ? { cover: r.thumb } : { seed: String(r.id) });

  /** فعلٌ واحد: فتحُ البطاقة (كان الكرتُ كلُّه يفتحها). */
  const acts = (r: OversightRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "عرض البطاقة", icon: <Eye />, onClick: () => setOpen(r) }} ops={[]} />
  );

  return (
    <>
      <CollectionRoom<OversightRow>
        navPath={IRFAN_OVERSIGHT_ROOM.navPath}
        title={IRFAN_OVERSIGHT_ROOM.title}
        noun={AR_MESSAGE}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        // البحثُ لبنةٌ في القالب (لم يكن في الغرفة القديمة): بالقائد والكاتب والمقعد والعنوان ونصّ الرسالة
        searchPlaceholder="ابحث باسم القائد أو الكاتب أو نصّ الرسالة…"
        matchSearch={(r, q) => matchesSearch(q, r.to, r.from, r.seat, r.title, r.card.body)}
        viewKey={IRFAN_OVERSIGHT_ROOM.viewKey}
        initialView={view}
        idOf={(r) => String(r.id)}
        table={{
          // الترتيبُ بالقائد والتاريخ من رأسيهما كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن للغرفة القديمة جدول)
          head: "الرسالة",
          headSortBy: (r) => r.to,
          stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.at) },
          columns: [
            { key: "title", label: "العنوان", icon: <TextT />, text: true },
            { key: "look", label: "التصميم", icon: <Palette />, text: true },
          ],
        }}
        emptyAll={{ title: "لا رسائل بعد", desc: "ما يُكتب في الموسم يظهر هنا." }}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            {...look(r)}
            stub={stubOf(r)}
            chips={chips(r)}
            title={`إلى ${r.to}`}
            onOpen={() => setOpen(r)}
            meta={info(r, true)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={`إلى ${r.to}`}
            onOpen={() => setOpen(r)}
            stub={{ ...stubOf(r), ...look(r) }}
            badge={chips(r)}
            sub={info(r, false)}
            cells={[
              { label: "العنوان", value: r.title ?? "بلا عنوان", text: true },
              { label: "التصميم", value: LOOK_NAMES[r.look], text: true },
            ]}
            acts={acts(r, true)}
          />
        )}
      />

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `من ${open.from} إلى ${open.to}` : ""}
        description={open ? fmtDayFull(open.at) : undefined}>
        {open ? <CardShot row={open} /> : null}
      </Modal>
    </>
  );
}
