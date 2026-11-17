"use client";

/**
 * **تعيينُ المناصب** على الهويّة الجديدة (٢٠٢٦-١١-١٤) — السلوكُ سلوكُ `dashboard/members/assignments/AssignmentsView.tsx` حرفًا: الإسنادُ
 * والاستبدالُ والإزالة (`assign_position`، والدفعةُ بتاريخ سريانٍ أو سببٍ أو نقلاتٍ معًا `create_position_batch`)، والتكليفُ وتعديلُ آخر
 * يومه وإنهاؤه، والتغييراتُ المجدولة وإلغاؤها، وتعديلُ الوحدات وإضافتُها لمن يملك `manage_positions`، والمنصبان الثابتان (الرئيسان)
 * بلا أفعال. والنوافذُ الثلاث نفسُها (`AssignmentModal` و`ActingModal` و`UnitEditModal`) بمنطقها.
 *
 * والشكلُ **قالبُ «قائمة السجلّات» بلا مكوّنٍ خاصّ** (محمد ٢٠٢٦-١١-١٤: «هل نحن محتاجون فعلًا أن يكون لها مكوّنٌ خاصّ؟»): المقعدُ سجلٌّ،
 * وسجلّاتُ الوحدة تحت رأسها — كالإنذارات تحت أصحابها. فكلُّ وحدةٍ (مقاعدُ المجلس، تنسيقُ القسم، اللجنة) رأسٌ بحالها («1 من 2
 * مشغولة») وأفعالِها («تعديل»)، وتحته مقاعدُها سطورًا: الشاغلُ بوجهه، والمنصبُ، والحالُ، والأفعالُ ظاهرةً. والمواضعُ «الكلّ /
 * الفارغة / المشغولة» بأعدادها، والمجلسُ والقسمُ مرشّحان.
 * ورُدّ قبلها في اليوم نفسِه: لوحةُ المقاعد كروتًا ستّةً وعشرين («جدًّا قبيح»)، ثمّ المعرضُ بخريطة القسم («ثقيلٌ سيّئٌ قبيح»).
 */
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, matchesSearch } from "@adeeb/design-system";
import {
  Bank, Briefcase, Buildings, CalendarBlank, CalendarCheck, CalendarX, Compass, Crown, LockSimple, SealCheck, Snowflake,
  StarHalf, UserCircle, UserPlus, UsersThree, UserSwitch, IdentificationBadge,
} from "@phosphor-icons/react";
import { ArrowLeft, ArrowsClockwise, PencilSimple, Plus, Star, Trash } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys, fmtDateOnly } from "@/lib/dates";
import { AR_SEAT, arCount, type ArForms } from "@/lib/arabicCount";
import { rankFor } from "@/lib/positionLabel";
import { UnitIcon, UnitIconNodesProvider } from "@/app/dashboard/_components/UnitIcon";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import {
  applyPositionBatch, assignActing, assignPosition, cancelPositionBatch, createOrgUnit, endActing, extendActing, loadActingCandidates, removePosition,
  updateOrgUnit, type ActingCandidate,
} from "@/app/dashboard/members/structure/actions";
import type { Holder, Position, RawCommittee, RawCouncil, RawDept } from "@/app/dashboard/members/structure/model";
import { buildSeatBoard } from "@/app/dashboard/members/assignments/board";
import { holderNote } from "@/app/dashboard/members/assignments/PositionCard";
import { AssignmentModal, type AssignState, type AssignSubmit, type MemberOption } from "@/app/dashboard/members/assignments/AssignmentModal";
import { ActingModal, type ActingSeat, type ActingValues } from "@/app/dashboard/members/assignments/ActingModal";
import { UnitEditModal, type EditableUnit, type UnitValues } from "@/app/dashboard/members/assignments/UnitEditModal";
import type { ScheduledBatch } from "@/app/dashboard/members/assignments/batches";
import { AdActs, AdBadge, AdButton, AdConfirm, AdGroupHead, AdRow, type AdMeta } from "../primitives";
import { AdLine, AdSection } from "../account";
import { CollectionRoom, type Position as RoomPosition } from "../collection";

const NAV = "/dashboard/members/assignments";
const AR_MOVE: ArForms = ["نقلةٌ واحدة", "نقلتان", "نقلات", "نقلةً"];

/** رمزُ الرتبة (مفاتيحُ `role_name` الثابتة): تاجٌ للرئيس، وحقيبةٌ للتنفيذيّ، وبوصلةٌ للمنسّق، ونجمةٌ للقائد، ونصفُها للنائب */
function rankIcon(roleName: string): ReactNode {
  switch (roleName) {
    case "club_president": return <Crown />;
    case "executive_council_president": return <Briefcase />;
    case "hr_committee_leader": return <UsersThree />;
    case "qa_committee_leader": return <SealCheck />;
    case "department_head": return <Compass />;
    case "committee_leader": return <Star />;
    case "deputy_committee_leader": return <StarHalf />;
    default: return <UserCircle />;
  }
}
/** المسمّى المجرّد في وحدته (الوحدةُ يقولها عنوانُ المجموعة)، بجنس شاغله */
// الرتبةُ مجرّدةً بلا «ال» كي يؤنّثها `rankFor` («قائدة»، «نائبة»، «منسّقة») — بـ«ال» كانت تمرّ مذكّرةً (المراجع ٢٠٢٦-١١-١٤)
const RANK_TITLE: Record<string, string> = { department_head: "منسّق", committee_leader: "قائد", deputy_committee_leader: "نائب" };

/** المنصبان الثابتان: لا يُزالان ولا يُستبدلان من هنا (`20261010091310_top_seats_fixed`، قرار المالك) — توأمُ `PROTECTED` في القاعدة */
const FIXED = new Set(["club_president", "executive_council_president"]);
/** الفارغُ بمعدوده وصفتِه: «مقعدٌ فارغ»، «مقعدان فارغان»، «3 مقاعد فارغة»، «11 مقعدًا فارغًا» */
const vacant = (n: number) => (n === 1 ? "مقعدٌ فارغ" : n === 2 ? "مقعدان فارغان" : n <= 10 ? `${n} مقاعد فارغة` : `${n} مقعدًا فارغًا`);

const daysLeft = (n: number) => (n <= 0 ? "ينتهي اليوم" : n === 1 ? "باقٍ يومٌ واحد" : n === 2 ? "باقٍ يومان" : n <= 10 ? `باقٍ ${n} أيام` : `باقٍ ${n} يومًا`);



/** **المقعدُ سجلّ**: صفٌّ لكلّ شاغلٍ جالس، أو لصاحبه المجمَّد محجوزًا له، أو صفٌّ فارغ — ووحدتُه مفتاحُ مجموعته وترتيبُها */
type Seat = {
  id: string; p: Position; h: Holder | null; owner: Holder | null;
  unit: string; order: number; council: Position["council"]; dept: string | null;
};
type UnitHead = {
  title: string; icon: ReactNode; sub: string; all: Position[]; acts?: { label: string; icon: ReactNode; onClick: () => void }[];
  /** رأسٌ أعلى (المجلس، القسم): رمزُه مربّعُ اللوح؛ واللجنةُ تحته برمزٍ على صبغةٍ خفيفة فتُقرأ فرعًا من قسمها لا وحدةً بجانبه */
  top?: boolean;
};

export function AssignmentsRoom({ positions, units, members, canEditUnits, iconNodes = {}, batches = [], dry }: {
  positions: Position[];
  units: { councils: RawCouncil[]; departments: RawDept[]; committees: RawCommittee[] };
  members: MemberOption[];
  canEditUnits: boolean;
  iconNodes?: Record<string, ReactNode>;
  batches?: ScheduledBatch[];
  /** مختبر: النوافذُ تُفتح وتُملأ، والحفظُ لا يُكتب — رسالةٌ تقول ذلك وتُغلق النافذة */
  dry?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<AssignState | null>(null);
  const [modalSeq, setModalSeq] = useState(0);
  const [cancelFor, setCancelFor] = useState<ScheduledBatch | null>(null);
  const [busy, start] = useTransition();
  const [acting, setActing] = useState<{ position: Position; seat: ActingSeat } | null>(null);
  const [actingPool, setActingPool] = useState<ActingCandidate[] | null>(null);
  const [extendFor, setExtendFor] = useState<Holder | null>(null);
  const [extendUntil, setExtendUntil] = useState("");
  const [endFor, setEndFor] = useState<Holder | null>(null);
  const [editUnit, setEditUnit] = useState<EditableUnit | null>(null);

  // ── الأفعال (منطقُ القديمة حرفًا) ──
  const openAssign = (pos: Position, replace: boolean) => { setModalSeq((n) => n + 1); setModal({ kind: "assign", position: pos, replace }); };
  const openRemove = (pos: Position, holder: Holder) => { setModalSeq((n) => n + 1); setModal({ kind: "remove", position: pos, holder }); };
  const openAct = (pos: Position) => {
    const owner = pos.holders.find((h) => h.frozen) ?? null;
    setActingPool(null);
    setActing({ position: pos, seat: { roleAr: pos.roleAr, scope: pos.scope, owner: owner ? { name: owner.name, gender: owner.gender } : null } });
    void loadActingCandidates(pos.roleName).then((r) => {
      if (!r.ok) toast.error(r.message ?? "تعذّر جلب المرشّحين.");
      setActingPool(r.members);
    });
  };
  const run = (job: () => Promise<{ ok: boolean; message: string }>, done: () => void) => dry ? (toast.info("مختبر: لا يُكتب شيء."), done()) : start(async () => {
    const r = await job();
    if (r.ok) { toast.success(r.message); done(); router.refresh(); } else toast.error(r.message);
  });
  const submitActing = (v: ActingValues) => {
    if (!acting) return;
    const pos = acting.position;
    run(() => assignActing({ userId: v.userId, roleName: pos.roleName, committeeId: pos.committeeId, departmentId: pos.departmentId, until: v.until, freeze: v.freeze, reason: v.reason }), () => setActing(null));
  };
  const submitExtend = () => {
    const rowId = extendFor?.rowId;
    if (!rowId || !extendUntil) return;
    run(() => extendActing({ rowId, until: extendUntil }), () => setExtendFor(null));
  };
  const submitEnd = () => {
    const rowId = endFor?.rowId;
    if (!rowId) return;
    run(() => endActing({ rowId }), () => setEndFor(null));
  };
  const submitUnit = (v: UnitValues) => {
    const u = editUnit;
    if (!u) return;
    run(() => (u.kind === "council"
      ? updateOrgUnit({ kind: "council", id: String(u.id), description: v.description, groupLink: v.link })
      : u.id == null
        ? createOrgUnit({ kind: u.kind, name: v.name, departmentId: u.parent?.id ?? null, icon: v.icon, description: v.description, groupLink: v.link })
        : updateOrgUnit({ kind: u.kind, id: u.id, icon: v.icon, description: v.description, groupLink: v.link })), () => setEditUnit(null));
  };
  const submitAssign = (v: AssignSubmit) => {
    if (!modal || modal.kind !== "assign") return;
    const m = v.moves[0];
    run(() => (v.simple
      ? assignPosition({ userId: m.userId, roleName: m.roleName, committeeId: m.committeeId, departmentId: m.departmentId, replace: modal.replace })
      : applyPositionBatch({ moves: v.moves, effectiveOn: v.effectiveOn, reason: v.reason })), () => setModal(null));
  };
  const submitRemove = () => {
    if (!modal || modal.kind !== "remove") return;
    const h = modal.holder;
    run(() => removePosition({ userId: h.userId, roleName: h.roleName, committeeId: h.committeeId }), () => setModal(null));
  };
  const submitCancelBatch = () => {
    const b = cancelFor;
    if (!b) return;
    run(() => cancelPositionBatch({ id: b.id }), () => setCancelFor(null));
  };

  // ── السجلّات: مقاعدُ اللوحة بترتيبها، ورؤوسُ وحداتها ──
  const board = buildSeatBoard(positions, units.departments, units.committees, units.councils);
  const seats: Seat[] = [];
  const heads = new Map<string, UnitHead>();
  let order = 0;
  const edit = (u: EditableUnit, label = "تعديل") => (canEditUnits ? [{ label, icon: <PencilSimple />, onClick: () => setEditUnit(u) }] : undefined);
  const push = (unit: string, p: Position | null, dept: string | null) => {
    if (!p) return;
    const sitting = p.holders.filter((h) => !h.frozen);
    const owner = p.holders.find((h) => h.frozen) ?? null;
    const base = { p, owner, unit, order: order, council: p.council, dept };
    if (sitting.length) sitting.forEach((h) => seats.push({ ...base, id: `${p.key}-${h.userId}-${h.rowId ?? ""}`, h }));
    else seats.push({ ...base, id: p.key, h: null });
  };
  const allOf = (...ps: (Position | null)[]) => ps.filter((p): p is Position => !!p);
  // المجلسُ الإداريّ: مقاعدُه الأربعة وحدةٌ واحدة
  heads.set("council", {
    title: board.admin?.name ?? "المجلس الإداري", icon: <Bank />, sub: "الرئاسةُ والإدارات", all: board.council, top: true,
    acts: board.admin ? edit({ kind: "council", id: board.admin.id, name: board.admin.name, icon: null, description: board.admin.description, link: board.admin.link }, "تعديل المجلس") : undefined,
  });
  board.council.forEach((p) => push("council", p, null));
  for (const d of board.depts) {
    // تنسيقُ القسم رأسُ أقسامه: وحدتُه اسمُ القسم، وأفعالُ القسم فيه («تعديل القسم»، «إضافة لجنة»)
    order += 1;
    const dk = `d${d.id ?? "x"}`;
    heads.set(dk, {
      // رأسُ القسم يعدّ القسمَ كلَّه (منسّقَه ولجانَه) كما كانت اللوحة — لا مقعدَ المنسّق وحده
      title: d.name, icon: <UnitIcon icon={d.icon} kind="department" />, sub: "تنسيقُ القسم ولجانُه",
      all: allOf(d.head, ...d.committees.flatMap((c) => [c.lead, c.dep])), top: true,
      acts: canEditUnits && d.id != null ? [
        { label: "تعديل القسم", icon: <PencilSimple />, onClick: () => setEditUnit({ kind: "department", id: d.id as number, name: d.name, icon: d.icon, description: d.description, link: d.link }) },
        { label: "إضافة لجنة", icon: <Plus />, onClick: () => setEditUnit({ kind: "committee", id: null, name: "", icon: null, description: null, link: null, parent: { id: d.id as number, name: d.name } }) },
      ] : undefined,
    });
    push(dk, d.head, d.name);
    for (const c of d.committees) {
      order += 1;
      const ck = `c${c.id}`;
      heads.set(ck, {
        title: c.name, icon: <UnitIcon icon={c.icon} kind="committee" />, sub: d.id != null ? d.name : "لجنةٌ بلا قسم", all: allOf(c.lead, c.dep),
        acts: edit({ kind: "committee", id: c.id, name: c.name, icon: c.icon, description: c.description, link: c.link }),
      });
      push(ck, c.lead, d.name);
      push(ck, c.dep, d.name);
    }
  }

  // ── السطر ──
  const today = clubDayKey(new Date().toISOString());
  const state = (x: Seat): ReactNode => {
    // الفارغُ عنوانُه «فارغ» ووجهُه متقطّع، فلا شارةَ تكرّر الكلمة
    if (!x.h && !x.owner) return null;
    // والتكليفُ يقوله سطرُه («تكليفًا حتى…»)، فلا شارةَ تكرّره
    if (!x.h && x.owner) return <AdBadge icon={<Snowflake />}>{x.owner.gender === "female" ? "محجوزٌ لصاحبته" : "محجوزٌ لصاحبه"}</AdBadge>;
    return null;
  };
  const info = (x: Seat): AdMeta[] => {
    const who = x.h ?? x.owner;
    const note = who ? holderNote(who) : null;
    return [
      ...(note ? [{ icon: <CalendarBlank />, text: x.h?.acting?.until && !x.h.acting.awaits ? `${note}، ${daysLeft(Math.max(0, daysBetweenKeys(today, x.h.acting.until)))}` : note }] : []),
      ...(!who ? [{ icon: <CalendarBlank />, text: x.p.elected ? "لم يُنتخب بعد" : "لم يُعيَّن بعد", tone: "muted" as const }] : []),
    ];
  };
  const actsOf = (x: Seat): ReactNode => {
    const { p, h, owner } = x;
    if (FIXED.has(p.roleName)) return <span className="ad-asg-fixed"><LockSimple aria-hidden />منصبٌ ثابت</span>;
    if (h?.acting) {
      return h.acting.awaits
        ? <AdButton variant="danger" size="sm" icon={<CalendarX />} onClick={() => setEndFor(h)}>إنهاء التكليف</AdButton>
        : <AdActs inRow primary={{ label: "تعديل المدّة", icon: <CalendarBlank />, onClick: () => { setExtendUntil(h.acting?.until ?? ""); setExtendFor(h); } }}
            ops={[{ key: "end", label: "إنهاء التكليف", icon: <CalendarX />, danger: true, onClick: () => setEndFor(h) }]} />;
    }
    if (h) {
      return p.singleton
        ? <AdActs inRow primary={{ label: "استبدال", icon: <ArrowsClockwise />, onClick: () => openAssign(p, true) }}
            ops={[{ key: "rm", label: "إزالة", icon: <Trash />, danger: true, onClick: () => openRemove(p, h) }]} />
        : <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => openRemove(p, h)}>إزالة</AdButton>;
    }
    if (owner) return p.actable ? <AdActs inRow primary={{ label: "تكليف", icon: <UserSwitch />, onClick: () => openAct(p) }} ops={[]} /> : null;
    return <AdActs inRow primary={{ label: "إسناد", icon: <UserPlus />, onClick: () => openAssign(p, false) }}
      ops={p.actable ? [{ key: "act", label: "تكليف", icon: <UserSwitch />, onClick: () => openAct(p) }] : []} />;
  };
  const face = (x: Seat) => {
    const who = x.h ?? x.owner;
    return who ? { name: who.name, src: who.avatar, gender: who.gender } : { name: "", vacant: true };
  };
  // المنصبُ عمودٌ باسمه لا سطرٌ تحت الاسم: كان السطرُ يترك وسطَه فارغًا عريضًا بين الاسم والأفعال (محمد ٢٠٢٦-١١-١٤)
  const seatOf = (x: Seat) => rankFor(RANK_TITLE[x.p.roleName] ?? x.p.roleAr, (x.h ?? x.owner)?.gender ?? null);
  const row = (x: Seat) => (
    <AdRow key={x.id} face={face(x)} title={(x.h ?? x.owner)?.name ?? "فارغ"} badge={state(x)} sub={info(x)}
      cells={[{ label: "المنصب", text: true, value: <span className="ad-asg-seat">{rankIcon(x.p.roleName)}{seatOf(x)}</span> }]} acts={actsOf(x)} />
  );

  // رأسُ الوحدة: اسمُها ورمزُها، وحالُها من مقاعدها كلّها لا من المعروض (العدسةُ لا تغيّر حقيقةَ الوحدة)، وأفعالُها في طرفه
  const headOf = (items: Seat[]) => {
    const u = heads.get(items[0].unit)!;
    const vac = u.all.filter((p) => p.holders.length === 0).length;
    const filled = u.all.filter((p) => p.holders.some((h) => !h.frozen)).length;
    return (
      <AdGroupHead title={u.title} lead={<span className={u.top ? "ad-sec-ic" : "ad-asg-sub-ic"} aria-hidden>{u.icon}</span>}
        // سطرٌ واحد: موضعُ الوحدة وحالُها («قسم الإنتاج الإعلامي، 1 من 2 مشغولة») — كانا سطرين فثقُل الرأس
        sub={[{
          icon: vac ? <IdentificationBadge /> : <Buildings />,
          text: `${u.sub}، ${filled} من ${u.all.length} مشغولة${vac ? `، ${vacant(vac)}` : ""}`,
          tone: vac ? "warn" : undefined,
        }]}
        act={u.acts?.length ? (
          <span className="ad-asg-acts">
            {u.acts.map((a) => <AdButton key={a.label} variant="soft" size="sm" icon={a.icon} onClick={a.onClick}>{a.label}</AdButton>)}
          </span>
        ) : undefined} />
    );
  };

  const POS: RoomPosition<Seat>[] = [
    { key: "all", label: "الكلّ", match: () => true, empty: "لا مناصب." },
    { key: "vacant", label: "الفارغة", match: (x) => !x.h && !x.owner, empty: "لا مقعدَ فارغ." },
    { key: "filled", label: "المشغولة", match: (x) => !!x.h || !!x.owner, empty: "لا مقعدَ مشغول." },
  ];
  const deptNames = board.depts.map((d) => ({ value: d.name, label: d.name }));

  return (
    <UnitIconNodesProvider nodes={iconNodes}>
      <CollectionRoom<Seat>
        navPath={NAV}
        title="تعيين المناصب"
        action={canEditUnits ? { label: "إضافة قسم", icon: <Plus />, onClick: () => setEditUnit({ kind: "department", id: null, name: "", icon: null, description: null, link: null }) } : undefined}
        extra={canEditUnits && board.ops ? { label: `تعديل ${board.ops.name}`, icon: <PencilSimple />, onClick: () => setEditUnit({ kind: "council", id: board.ops!.id, name: board.ops!.name, icon: null, description: board.ops!.description, link: board.ops!.link }) } : undefined}
        noun={AR_SEAT}
        items={seats}
        positions={POS}
        defaultPosition="all"
        searchPlaceholder="ابحث بالمنصب أو الوحدة أو الشاغل"
        matchSearch={(x, q) => matchesSearch(q, x.p.roleAr, x.p.scope, heads.get(x.unit)?.title ?? "", x.dept ?? "", ...x.p.holders.map((h) => h.name))}
        filters={[
          { key: "council", label: "المجلس", options: [{ value: "administrative", label: board.admin?.name ?? "المجلس الإداري" }, { value: "executive", label: board.ops?.name ?? "المجلس التشغيلي" }], match: (x, v) => x.council === v },
          { key: "dept", label: "القسم", options: deptNames, match: (x, v) => x.dept === v },
        ]}
        listOnly
        group={{ of: (x) => x.unit, head: (items) => headOf(items), order: (a, b) => a[0].order - b[0].order }}
        table={{ head: "الشاغل", stub: { key: "face", label: "", icon: <UserCircle /> }, columns: [{ key: "seat", label: "المنصب", icon: <IdentificationBadge />, text: true }] }}
        emptyAll={{ title: "لا مناصب", desc: "لم تُعرَّف مقاعدُ قيادةٍ بعد." }}
        notice={batches.length ? (
          // **التغييراتُ المجدولة** فوق القائمة: القائمةُ الهيكلُ كما هو اليوم، وهذه ما سيصيره في يومه
          <>
            {batches.map((b) => (
              <AdSection key={b.id} icon={<CalendarCheck />} title={`تغييرات تسري في ${fmtDateOnly(b.effectiveOn)}`}
                sub={[arCount(b.moves.length, AR_MOVE), b.reason, b.creatorName ? `أنشأها ${b.creatorName}` : null].filter(Boolean).join("، ")}>
                {b.moves.map((m) => <AdLine key={`${b.id}-${m.userId}`} icon={<ArrowLeft />} k={m.name} v={m.to} />)}
                {b.canCancel ? <AdLine icon={<CalendarX />} v="إلغاء هذه التغييرات" danger disabled={busy}
                  act={{ icon: <CalendarX />, text: "إلغاء", label: "إلغاء التغييرات المجدولة" }} onClick={() => setCancelFor(b)} /> : null}
              </AdSection>
            ))}
          </>
        ) : undefined}
        renderCard={row}
        renderRow={row}
      />

      <AssignmentModal key={`asg-${modalSeq}`} state={modal} members={members} positions={positions} committees={units.committees} departments={units.departments}
        busy={busy} onClose={() => setModal(null)} onAssign={submitAssign} onRemove={submitRemove} />

      <AdConfirm open={cancelFor !== null} onClose={() => setCancelFor(null)} tone="danger" icon={<CalendarX />} title="إلغاء التغييرات المجدولة؟"
        text={cancelFor ? `لن تُطبَّق ${arCount(cancelFor.moves.length, AR_MOVE)} في يومها.` : undefined}
        confirmLabel="إلغاء التغييرات" cancelLabel="إبقاؤها" onConfirm={submitCancelBatch} loading={busy} />

      <ActingModal key={acting?.position.key ?? "none"} seat={acting?.seat ?? null} members={actingPool} busy={busy}
        onClose={() => setActing(null)} onSubmit={submitActing} />

      <Modal open={extendFor !== null} onClose={() => setExtendFor(null)} busy={busy} size="sm" title="تعديل آخر يوم في التكليف" description={extendFor?.name}
        footer={<>
          <Button variant="ghost" size="md" onClick={() => setExtendFor(null)} disabled={busy}>إلغاء</Button>
          <Button variant="primary" size="md" loading={busy} disabled={!extendUntil || extendUntil === extendFor?.acting?.until} onClick={submitExtend}>حفظ</Button>
        </>}>
        <Field label="آخر يوم في التكليف" icon={<CalendarBlank />} innerIcon={<CalendarCheck />} placeholder="اختر التاريخ" type="date"
          min={clubDayKey(new Date().toISOString())} value={extendUntil} onChange={(e) => setExtendUntil(e.target.value)} required />
      </Modal>

      <UnitEditModal key={editUnit ? `unit-${editUnit.kind}-${editUnit.id ?? `new-${editUnit.parent?.id ?? ""}`}` : "unit-none"} unit={editUnit} busy={busy}
        onClose={() => setEditUnit(null)} onSubmit={submitUnit} />

      <AdConfirm open={endFor !== null} onClose={() => setEndFor(null)} tone="warning" icon={<CalendarX />} title="إنهاء التكليف؟"
        text={endFor ? `ينتهي تكليف ${endFor.name} الآن.` : undefined} confirmLabel="إنهاء التكليف" onConfirm={submitEnd} loading={busy} />
    </UnitIconNodesProvider>
  );
}
