"use client";

/**
 * غرفةُ الفعاليّات على قالب «قائمة السجلّات» (٢٠٢٦-١٠-٣٠) — السلوكُ سلوكُ
 * `events/EventsView.tsx` القديم: المواضعُ الأربعة بحالة الفعاليّة، والبحثُ بالاسم والمكان، والنوعُ
 * والجهة، ودورةُ الحياة (نشر، إلغاء النشر، إلغاء بتأكيد، إعادة تفعيل)، والحذفُ للمسودّة
 * والملغاة وحدهما، والترتيبُ من رأس الجدول. والفرقُ في الشكل: كروتٌ بأغلفتها، وأفعالٌ ظاهرة.
 */
import type { RoomView } from "../view";
import { EVENTS_ROOM } from "./meta";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Buildings, CalendarBlank, MapPin, Megaphone, Ticket, UserCheck } from "@phosphor-icons/react";
import { ArrowCounterClockwise, EyeSlash, PencilSimple, Plus, Prohibit, Trash, Info } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { EventRow } from "@/app/dashboard/events/data";
import { STATUS_OPS, TYPE_META, TYPE_OPTIONS, type StatusOp } from "@/app/dashboard/events/vocab";
import { deleteEvent, setEventStatus } from "@/app/dashboard/events/actions";
import { matchesSearch } from "@adeeb/design-system";
import { AdActs, AdConfirm, AdBadge, AdButton, AdCard, AdRow, type AdFigure, type AdMeta, type AdMetaTone, type AdOp } from "../primitives";
import { useAdLab } from "../lab";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, endOfClubDay, fmtDayFull, fmtNum, localDay } from "../format";
import { fmtTimeRange, hour12 } from "@adeeb/core/dates";

const OP_ICON: Record<StatusOp, React.ReactNode> = {
  publish: <Megaphone />, unpublish: <EyeSlash />, cancel: <Prohibit />, reactivate: <ArrowCounterClockwise />,
};

/** لونُ سطر الموعد: القادمةُ خضراء (وكهرمانيّةٌ إن كانت خلال يومين)، والمنتهيةُ والمسودّةُ خافتة، والملغاةُ حمراء. */
const dateTone = (e: EventRow, now: number): AdMetaTone => {
  if (e.status === "cancelled") return "bad";
  if (e.status !== "published") return "muted";
  return endOfClubDay(e.date) - now < 2 * 864e5 ? "warn" : "ok";
};

const seats = (e: EventRow) => `${fmtNum(e.reserved)} / ${e.totalSeats == null ? "∞" : fmtNum(e.totalSeats)}`;
const POSITIONS: Position<EventRow>[] = [
  { key: "published", label: "قادمة", match: (e) => e.status === "published", empty: "لا فعاليّات قادمة منشورة الآن.", canCreate: true },
  { key: "draft", label: "مسودّات", match: (e) => e.status === "draft", empty: "لا مسودّات.", canCreate: true },
  { key: "ended", label: "منتهية", match: (e) => e.status === "ended", empty: "لا فعاليّات منتهية بعد." },
  { key: "cancelled", label: "ملغاة", match: (e) => e.status === "cancelled", empty: "لا فعاليّات ملغاة.", rare: true },
];

/**
 * مختبر (`?f=states`): كلُّ حالات الكرت من فعاليّاتٍ حقيقيّة — يُحذف مع المختبر. كلُّ نسخةٍ بمعرّفٍ مصطنع ووصفِ حالتها.
 */
function labStates(events: EventRow[], now: number): { rows: EventRow[]; notes: Map<string, string> } {
  const ok = (e: EventRow) => !!e.coverImageUrl && !!e.totalSeats;
  // من المنتهية أوّلًا (فعاليّاتٌ حقيقيّةٌ بأسمائها)، فالمسودّاتُ قد تكون تجارب
  const src = [...events.filter((e) => e.status === "ended" && ok(e)), ...events.filter((e) => e.status !== "ended" && ok(e))].slice(0, 4);
  if (!src.length) return { rows: events, notes: new Map() };
  const at = (i: number) => src[i % src.length];
  const future = (days: number) => localDay(now + days * 864e5);
  const mk = (i: number, note: string, patch: Partial<EventRow>): [EventRow, string] => {
    const e = at(i);
    return [{ ...e, ...patch, id: `${e.id}~lab${i}` }, note];
  };
  const cap = (i: number) => at(i).totalSeats ?? 40;
  const pairs: [EventRow, string][] = [
    mk(0, "قادمة، تمتلئ", { status: "published", date: future(12), reserved: Math.round(cap(0) * 0.7), attended: 0 }),
    mk(1, "قادمة، مكتملة", { status: "published", date: future(20), reserved: cap(1), attended: 0 }),
    mk(2, "قادمة، بلا حدّ للمقاعد", { status: "published", date: future(30), totalSeats: null, reserved: 17, attended: 0 }),
    mk(3, "قادمة، خلال يومين", { status: "published", date: future(1), reserved: Math.round(cap(3) * 0.35), attended: 0 }),
    mk(8, "اليوم، والحضور يُسجَّل", { status: "published", date: future(0), reserved: cap(0) - 4, attended: Math.round((cap(0) - 4) * 0.55) }),
    mk(4, "منتهية، اكتملت", { status: "ended" }),
    mk(5, "منتهية، لم تمتلئ", { status: "ended", reserved: Math.round(cap(5) * 0.6), attended: Math.round(cap(5) * 0.6 * 0.45) }),
    mk(6, "مسودّة جديدة", { status: "draft", date: future(40), reserved: 0, attended: 0 }),
    mk(9, "مسودّة أُعيدت من النشر بحجوزاتها", { status: "draft", date: future(25), reserved: Math.round(cap(1) * 0.4), attended: 0 }),
    mk(7, "ملغاة بعد أن حُجزت", { status: "cancelled", reserved: Math.round(cap(3) * 0.8), attended: 0 }),
  ];
  return { rows: pairs.map(([r]) => r), notes: new Map(pairs.map(([r, n]) => [r.id, n])) };
}
const LAB_POSITIONS: Position<EventRow>[] = [{ key: "all", label: "كلّ الحالات", match: () => true, empty: "—" }];

export function EventsRoom({ events: realEvents, serverNow, view }: { events: EventRow[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cancel, setCancel] = useState<EventRow | null>(null);
  const [kill, setKill] = useState<EventRow | null>(null);
  const now = serverNow;
  const { allStates } = useAdLab();
  const lab = allStates ? labStates(realEvents, now) : null;
  const events = lab ? lab.rows : realEvents;
  /**
   * **أرقامُ الكرت: شريطان في كلّ حال، والكلمةُ تقول الحال** (محمد ٢٠٢٦-١٠-٣١): الهيئةُ واحدةٌ لكلّ فعاليّة، والشريطُ كحليٌّ
   * دائمًا، ومكانَ النسبة كلمةٌ حين لا تصحّ:
   * - الحجوزاتُ من المقاعد — «مكتمل» إذا امتلأت قبل أن تُقام (قادمةً أو مسودّة)؛ والملغاةُ امتلاؤها حين أُلغيت (كم تأثّر).
   * - الحضورُ من الحجوزات — قبل يومها فارغٌ بـ«لم يبدأ» (الحضورُ يُسجَّل يومَها، و«0%» توحي بفشلٍ لم يقع)، ويومَها يمتلئ
   *   مع كلّ تسجيل، وبعدها نسبتُه؛ والملغاةُ فارغٌ بـ«أُلغيت».
   * والمسودّةُ قد تحمل حجوزات: «إلغاءُ النشر» يعيد المنشورةَ مسودّةً بحجوزاتها. والمقاعدُ بلا حدٍّ لا شريطَ لحجوزاتها.
   */
  const today = localDay(now);
  const figuresOf = (e: EventRow): AdFigure[] => {
    const cancelled = e.status === "cancelled";
    const ahead = e.status === "published" || e.status === "draft";
    const started = e.status === "ended" || (e.status === "published" && e.date <= today);
    return [
      {
        icon: <Ticket />, value: seats(e), label: "الحجوزات",
        of: e.totalSeats ? { now: e.reserved, max: e.totalSeats, full: ahead ? "مكتمل" : undefined } : undefined,
      },
      {
        icon: <UserCheck />, label: "الحضور",
        value: `${fmtNum(e.attended)} / ${fmtNum(e.reserved)}`,
        of: { now: e.attended, max: e.reserved, note: cancelled ? "أُلغيت" : started ? undefined : "لم يبدأ" },
      },
    ];
  };

  const run = (e: EventRow, op: StatusOp) =>
    start(async () => {
      const r = await setEventStatus(e.id, op);
      if (r.ok) { toast.success(r.message); setCancel(null); router.refresh(); } else toast.error(r.message);
    });

  /** أفعالُ الحال: ما يصحّ على حال الفعاليّة من دورة حياتها، والحذفُ للمسودّة والملغاة وحدهما، آخرُها. */
  const stateOps = (e: EventRow): AdOp[] => [
    ...(Object.keys(STATUS_OPS) as StatusOp[])
      .filter((op) => (STATUS_OPS[op].from as readonly string[]).includes(e.status))
      .map((op) => ({ key: op, label: STATUS_OPS[op].label, icon: OP_ICON[op], onClick: () => (op === "cancel" ? setCancel(e) : run(e, op)), danger: false })),
    ...(e.status === "draft" || e.status === "cancelled" ? [{ key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(e), danger: true }] : []),
  ];

  /** الأساسيُّ التفاصيل، ثمّ التحرير، ثمّ أفعالُ الحال — والقالبُ يقسمها (`AdActs`). */
  const acts = (e: EventRow, inRow?: boolean) => (
    <AdActs
      inRow={inRow}
      primary={{ label: "التفاصيل", icon: <Info />, href: `/dashboard/events/${e.id}` }}
      ops={[{ key: "edit", label: "تحرير", icon: <PencilSimple />, href: `/dashboard/events/${e.id}/edit` }, ...stateOps(e).map((o) => ({ ...o, disabled: pending || !!lab?.notes.has(e.id) }))]}
    />
  );

  const organizers = Array.from(new Map(events.filter((e) => e.organizer).map((e) => [e.organizer, e.organizerName ?? e.organizer])).entries());
  const create = <AdButton variant="fill" icon={<Plus />} href="/dashboard/events/new">فعاليّة جديدة</AdButton>;
  /**
   * **سطرُ الموعد** (محمد ٢٠٢٦-١٠-٣١): التاريخُ بسنته دائمًا — هو التاريخُ الكامل للفعاليّة، و«6 مايو» وحدها لا تقول أيَّ
   * عام — والوقتُ بصباحٍ ومساء من صائغ النادي الواحد (`fmtTimeRange`: «من 10 ص إلى 12 م»)، لا «10:00–12:00».
   */
  const clock = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return m ? `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}` : hour12(h);
  };
  /** **سطرُ الجهة** (محمد ٢٠٢٦-١٠-٣١: «النادي» وحدها لم تُفهم): «بتنظيم لجنة التأليف»، و«بتنظيم نادي أدِيب» حين لا جهةَ
   *  بعينها — كـ«بتحرير» في الخبر؛ ورمزُ الجهة رمزُها في الأخبار (`Buildings`). */
  const organizedBy = (e: EventRow) => `بتنظيم ${e.organizerName ?? "نادي أدِيب"}`;
  const dayOf = (e: EventRow) => fmtDayFull(`${e.date}T12:00:00`);
  const timeOf = (e: EventRow) => e.startTime && e.endTime ? fmtTimeRange(e.startTime, e.endTime) : e.startTime ? `الساعة ${clock(e.startTime)}` : "";
  const when = (e: EventRow) => {
    const time = timeOf(e);
    return time ? `${dayOf(e)}، ${time}` : dayOf(e);
  };

  /**
   * **الرقاقاتُ والسطورُ مصدرُها واحدٌ وترتيبُها واحد** (محمد ٢٠٢٦-١١-٠١): النوعُ رقاقةٌ في العرضين، ثمّ الموعدُ والمكانُ والجهة
   * بترتيبها، والكعبُ (يومُها وشهرُها وغلافُها) كعبٌ في العرضين — مصغّرًا أوّلَ السطر.
   */
  const chips = (e: EventRow) => (
    <>
      {lab?.notes.has(e.id) && <AdBadge tone="info">{`الحالة: ${lab.notes.get(e.id)}`}</AdBadge>}
      <AdBadge>{TYPE_META[e.type].label}</AdBadge>
    </>
  );
  const stubOf = (e: EventRow) => { const d = dayParts(`${e.date}T12:00:00`); return { big: d.day, small: d.month }; };
  const info = (e: EventRow): AdMeta[] => [
    { icon: <CalendarBlank />, text: when(e), tone: dateTone(e, now) },
    ...(e.location ? [{ icon: <MapPin />, text: e.location }] : []),
    { icon: <Buildings />, text: organizedBy(e) },
  ];

  return (
    <>
      <CollectionRoom<EventRow>
        navPath={EVENTS_ROOM.navPath}
        title={EVENTS_ROOM.title}
        action={{ label: "فعاليّة جديدة", icon: <Plus />, href: "/dashboard/events/new" }}
        noun={["فعاليّةٌ واحدة", "فعاليّتان", "فعاليّات", "فعاليّةً"]}
        items={events}
        positions={lab ? LAB_POSITIONS : POSITIONS}
        defaultPosition={lab ? "all" : "published"}
        searchPlaceholder="ابحث باسم الفعاليّة أو مكانها…"
        matchSearch={(e, q) => matchesSearch(q, e.name, e.description, e.location)}
        filters={[
          { key: "type", label: "النوع", options: TYPE_OPTIONS, match: (e, v) => e.type === v },
          ...(organizers.length ? [{ key: "organizer", label: "الجهة", options: organizers.map(([value, label]) => ({ value, label })), match: (e: EventRow, v: string) => e.organizer === v }] : []),
        ]}
        viewKey={EVENTS_ROOM.viewKey}
        initialView={view}
        idOf={(e) => String(e.id)}
        table={{
          // الترتيبُ من رأس العمود كما كان في الجدول القديم (الاسم، والتاريخ، والحجوزات) — والحضورُ عمودٌ مثلُها.
          // والموعدُ رقمٌ (يومُه وساعتُه بتوقيت النادي) فيبدأ بالأبعد، كتواريخ الغرف كلّها
          head: "الفعاليّة",
          headSortBy: (e) => e.name,
          stub: { key: "when", label: "الموعد", icon: <CalendarBlank />, sortBy: (e) => +new Date(`${e.date}T${e.startTime ?? "00:00"}:00+03:00`) },
          columns: [
            { key: "seats", label: "الحجوزات", icon: <Ticket />, sortBy: (e) => e.reserved },
            { key: "came", label: "الحضور", icon: <UserCheck />, sortBy: (e) => e.attended },
          ],
        }}
        emptyAll={{ title: "لا فعاليّات بعد", desc: "أنشئ أوّل فعاليّة، تُحفظ مسودّةً حتّى تنشرها." }}
        createAction={create}
        renderCard={(e) => (
          <AdCard
            key={e.id}
            cover={e.coverImageUrl}
            chips={chips(e)}
            title={e.name}
            href={`/dashboard/events/${e.id}`}
            meta={info(e)}
            figures={figuresOf(e)}
            foot={acts(e)}
            stub={stubOf(e)}
          />
        )}
        renderRow={(e) => (
          <AdRow
            key={e.id}
            title={e.name}
            href={`/dashboard/events/${e.id}`}
            badge={chips(e)}
            sub={info(e)}
            // الكعبُ المصغّر أوّلَ السطر، والموعدُ بساعته سطرٌ كما في الكرت، والشريطان تحت رقميهما كما في التذكرة
            stub={{ ...stubOf(e), cover: e.coverImageUrl }}
            cells={figuresOf(e).map((f) => ({ label: f.label, value: f.value, of: f.of }))}
            acts={acts(e, true)}
          />
        )}
      />
      <AdConfirm
        open={cancel !== null}
        onClose={() => setCancel(null)}
        tone="danger"
        icon={<Prohibit />}
        title="إلغاء الفعاليّة؟"
        text={cancel ? `ستُلغى «${cancel.name}» وتُخفى عن العامّة. حجوزاتها تبقى محفوظةً، ويمكن إعادة تفعيلها لاحقًا.` : undefined}
        confirmLabel="إلغاء الفعاليّة"
        loading={pending}
        onConfirm={() => { if (cancel) run(cancel, "cancel"); }}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الفعاليّة؟"
        text={kill ? `سيُحذف «${kill.name}» نهائيًّا. لا استرجاع بعده. (الفعاليّات ذات الحجوزات لا تُحذف، تُلغى.)` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteEvent(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
