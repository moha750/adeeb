"use client";

/**
 * غرفةُ «إدارتي» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٣) — السلوكُ سلوكُ `dashboard/unit/UnitView.tsx` القديم وكرتِه
 * (`UnitMemberCard.tsx`): **أعضاءُ الإدارة** بكرت الشخص (وجهُه، واسمُه، ومقعدُه شارةً، وحِملُ إشرافه رقمًا)، والضمُّ («تعيين عضو
 * إداريّ») والتكليفُ من اللوح، والإخراجُ (وللمكلَّف إنهاءُ تكليفه بدل إخراجه) من الكرت، **وتوزيعُ الإشراف** قسمًا ثانيًا بعد
 * القائمة كما كان: شبكةُ مقاعد اللجان بكرت المقعد (`PositionCard`) ونافذتِها نفسِها (`SupervisionModal`) — فالقالبُ لا يحمل
 * قائمةً ثانيةً سجلّاتُها لجانٌ لا أشخاص. والإداراتُ التي يبلغها الداخلُ مواضعُ الغرفة (كانت `UnitSwitcher`): القائدُ يبلغ إدارتَه
 * وحدها فلا مبدّل، والرئيسان يبلغان الإدارات فيختاران. **والحارسُ في القاعدة لا هنا** (`can_assign_role`): هذا إخفاءٌ لِما لا
 * يُستطاع لا حراسة.
 */
import type { RoomView } from "../view";
import { UNIT_ROOM } from "./unit.meta";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModalSectionHeading, matchesSearch } from "@adeeb/design-system";
import { Buildings, CalendarX, UserCircle, UserPlus, UserSwitch } from "@phosphor-icons/react";
import { ArrowsClockwise, SignOut, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { MenuGroup } from "@/app/dashboard/_components/DropdownMenu";
import { ICONS } from "@/app/dashboard/_shell/icons";
import {
  assignActing, assignPosition, assignSupervision, endActing, loadActingCandidates, removePosition, revokeSupervision, type ActingCandidate,
} from "@/app/dashboard/members/structure/actions";
import type { Position as Seat } from "@/app/dashboard/members/structure/model";
import { ActingModal, type ActingValues } from "@/app/dashboard/members/assignments/ActingModal";
import { PositionCard } from "@/app/dashboard/members/assignments/PositionCard";
import type { MemberOption } from "@/app/dashboard/members/assignments/AssignmentModal";
import { SupervisionModal, type SupState } from "@/app/dashboard/unit/SupervisionModal";
import type { Target, Unit, UnitMember } from "@/app/dashboard/unit/model";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdBadge, AdButton, AdCard, AdConfirm, AdEmpty, AdRoom, AdRow, RoomPlate, type AdFigure, type AdMeta } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { roomIconKey, useRoomCrumb } from "../crumb";
import { fmtDayFull } from "../format";

const AR_MEMBER: ArForms = ["عضوٌ واحد", "عضوان", "أعضاء", "عضوًا"];
const AR_COMMITTEE: ArForms = ["لجنةٌ واحدة", "لجنتان", "لجان", "لجنةً"];

/** إدارةٌ يبلغها الداخل: هي، ومقاعدُ إشرافها (إن كانت تُشرف)، وأعضاؤها — كما تبنيها الصفحةُ من `dashboard/unit/model.ts`. */
export type UnitData = { unit: Unit; seats: Seat[]; roster: UnitMember[] };
/** عضوٌ بإدارته: قد يكون العضوُ في إدارتين، فمعرّفُه الإدارةُ والشخصُ معًا. */
type Item = UnitMember & { unitId: number; key: string };
type Person = Pick<UnitMember, "userId" | "name" | "avatar" | "gender">;

/** التكليفُ في الإدارة للتنفيذيّة وحدها: لا يُكلَّف أحدٌ عضوًا في الموارد ولا الضمان (جهتا رقابة، قرار محمد). والقاعدةُ تقول الحكم (`NOT_ACTABLE`). */
const actableOf = (u: Unit) => !["hr_admin_member", "qa_admin_member"].includes(u.memberRoleName);
/** حِملُ الإشراف كما كان تحت الاسم: «بلا لجان»، «لجنةٌ واحدة»، «لجنتان»، «3 لجان». */
const loadText = (n: number) => (n === 0 ? "بلا لجان" : arCount(n, AR_COMMITTEE));
/** آخرُ يوم التكليف (`date` بلا وقت) بسنته — ظهرَه بساعة النادي، فلا ينقلب يومًا بين الخادم والمتصفّح. */
const dayOnly = (d: string) => fmtDayFull(`${d.slice(0, 10)}T12:00:00+03:00`);

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض هنا فلا يُقرأ. */
export function UnitRoom({ units, members, initial, view }: {
  units: UnitData[];
  /** بِركةُ الضمّ: أعضاءُ النادي الذين يجوز للداخل إسنادُهم (`assignable_members`). */
  members: MemberOption[];
  /** الإدارةُ التي تُفتح عليها الغرفة: ما طلبه الرابط (`?u=`) إن كان في المدى، وإلّا مقعدُ الداخل، وإلّا أوّلُ ما يبلغ. */
  initial: number | null;
  serverNow: number;
  view?: RoomView;
}) {
  if (units.length === 0) return <NoUnitRoom />;
  return <UnitList units={units} members={members} initial={initial ?? units[0].unit.id} view={view} />;
}

function UnitList({ units, members, initial, view }: { units: UnitData[]; members: MemberOption[]; initial: number; view?: RoomView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  /** النافذةُ وإدارتُها: الضمُّ والإسنادُ لإدارة اللوح، والإخراجُ لإدارة العضو نفسِه. */
  const [modal, setModal] = useState<{ s: SupState; unitId: number } | null>(null);
  const [pick, setPick] = useState("");
  const [actingFor, setActingFor] = useState<Unit | null>(null);
  const [actingPool, setActingPool] = useState<ActingCandidate[] | null>(null);
  const actingAsk = useRef(0);
  const [endFor, setEndFor] = useState<Item | null>(null);

  /**
   * **الإدارةُ المعروضة موضعُ القالب المختار** — والقالبُ يكتبه في الرابط (`?pos=`، ويحذفه للموضع الأوّل)، فتقرؤه الغرفةُ من هناك
   * بقاعدته نفسِها: رأسُ اللوح وأفعالُه (الضمُّ والتكليف) وقسمُ الإشراف للإدارة المعروضة، كما كانت الصفحةُ تُبنى لإدارةٍ واحدة.
   * (القالبُ لا يُخبر الغرفةَ بموضعها؛ حاجةٌ في التقرير.)
   */
  const sp = useSearchParams();
  const fallback = String(initial);
  const asked = sp.get("pos");
  const cur = units.find((u) => String(u.unit.id) === asked) ?? units.find((u) => String(u.unit.id) === fallback) ?? units[0];
  const byId = useMemo(() => new Map(units.map((u) => [u.unit.id, u])), [units]);

  const items = useMemo<Item[]>(
    () => units.flatMap(({ unit, roster }) => roster.map((m) => ({ ...m, unitId: unit.id, key: `${unit.id}:${m.userId}` }))),
    [units],
  );
  /** **المواضعُ الإداراتُ** بأعدادها (كان عددُ أعضاء الإدارة كاردَ إحصاءٍ فوق قسمها) — وإدارةٌ واحدةٌ لا مبدّلَ لها. */
  const positions = useMemo<Position<Item>[]>(
    () => units.map(({ unit }) => ({
      key: String(unit.id), label: unit.name, match: (m: Item) => m.unitId === unit.id, empty: "لا عضو في إدارتك بعد.", canCreate: true,
    })),
    [units],
  );

  const open = (s: SupState, unitId: number) => { setPick(""); setModal({ s, unitId }); };
  const recruit = () => open({ kind: "recruit" }, cur.unit.id);

  // إدارةُ النافذة المفتوحة (وإلّا المعروضة) — منها بِركتا الضمّ والتوزيع كما في القديمة
  const target = (modal ? byId.get(modal.unitId) : undefined) ?? cur;
  // أعضاءُ الإدارة: بِركةُ التوزيع (لا يُوزَّع إلّا من ضُمّ)
  const unitMembers = useMemo<MemberOption[]>(
    () => target.roster.map((s) => ({ id: s.userId, name: s.name, avatar: s.avatar, gender: s.gender })),
    [target],
  );
  // مرشّحو الضمّ = بقيّةُ النادي، مضيَّقةً بشرط المقعد (منصبٌ بعينه، أو العضويّةُ في أدِيب الآن) — بيانٌ من القاعدة لا حُكمٌ مستنسخ
  const candidates = useMemo<MemberOption[]>(() => {
    const u = target.unit;
    const inUnit = new Set(target.roster.map((s) => s.userId));
    return members.filter((m) => !inUnit.has(m.id)
      && (!u.memberPrerequisite || m.heldRole === u.memberPrerequisite)
      && (!u.memberRequiresMembership || m.heldRole != null));
  }, [members, target]);

  const openActing = (u: Unit) => {
    const ask = ++actingAsk.current;
    setActingPool(null);
    setActingFor(u);
    void loadActingCandidates(u.memberRoleName).then((r) => {
      if (ask !== actingAsk.current) return; // فُتحت النافذةُ لإدارةٍ أخرى قبل الردّ
      if (!r.ok) toast.error(r.message ?? "تعذّر جلب المرشّحين.");
      setActingPool(r.members);
    });
  };
  const submitActing = (v: ActingValues) => {
    const u = actingFor;
    if (!u) return;
    start(async () => {
      const r = await assignActing({ userId: v.userId, roleName: u.memberRoleName, committeeId: u.id, until: v.until, freeze: v.freeze, reason: v.reason });
      if (r.ok) { toast.success(r.message); setActingFor(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitEnd = () => {
    const rowId = endFor?.acting?.rowId;
    if (!rowId) return;
    start(async () => {
      const r = await endActing({ rowId });
      if (r.ok) { toast.success(r.message); setEndFor(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const seatOf = (p: Seat): Target => ({ id: p.committeeId as number, name: p.scope });
  // مقعدُ الإشراف مفردٌ بحكم فهرس `committee_supervision` (لجنة + إدارة)، فأوّلُ الشاغلين هو كلُّهم
  const seatHolder = (p: Seat): Person | null => {
    const h = p.holders[0];
    return h ? { userId: h.userId, name: h.name, avatar: h.avatar, gender: h.gender } : null;
  };
  const openSeat = (p: Seat, u: Unit) => open({ kind: "seat", committee: seatOf(p), holder: seatHolder(p) }, u.id);
  const openSeatRemove = (p: Seat, u: Unit) => {
    const h = seatHolder(p);
    if (h) open({ kind: "remove", member: h, committee: seatOf(p) }, u.id);
  };
  const seatActions = (p: Seat, u: Unit): MenuGroup[] => [{
    header: "إجراءات", items: [
      { label: "استبدال المشرف", icon: <ArrowsClockwise />, onSelect: () => openSeat(p, u) },
      { label: "سحب الإشراف", icon: <Trash />, danger: true, onSelect: () => openSeatRemove(p, u) },
    ],
  }];

  // المكلَّفُ لا يُخرَج من الإدارة، بل يُنهى تكليفُه (فيعود أصيلُه المجمَّد إن كان)
  const openExpel = (m: Item) => (m.acting ? setEndFor(m) : open({ kind: "expel", member: m, count: m.committees.length }, m.unitId));

  // إرسالٌ واحدٌ يخدم الأفعالَ الأربعة كما في القديمة: الانتماءُ إلى `assign/removePosition`، والإشرافُ إلى `assign/revokeSupervision`
  const submit = () => {
    if (!modal) return;
    const { s } = modal;
    const u = target.unit;
    const done = (r: { ok: boolean; message: string }) => {
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    };
    if (s.kind === "expel") {
      start(async () => done(await removePosition({ userId: s.member.userId, roleName: u.memberRoleName, committeeId: u.id })));
      return;
    }
    if (s.kind === "remove") {
      start(async () => done(await revokeSupervision({ userId: s.member.userId, committeeId: s.committee.id, unitId: u.id })));
      return;
    }
    if (!pick) return;
    if (s.kind === "recruit") {
      start(async () => done(await assignPosition({ userId: pick, roleName: u.memberRoleName, committeeId: u.id })));
      return;
    }
    // والباقي مقعد: اللجنةُ معلومةٌ ويُختار مشرفُها، والاستبدالُ يُعلَن حين يكون مشغولًا (تُصدّقه القاعدة بـ`OCCUPIED`)
    start(async () => done(await assignSupervision({ userId: pick, committeeId: s.committee.id, unitId: u.id, replace: s.holder !== null })));
  };

  const unitOf = (m: Item) => byId.get(m.unitId)?.unit ?? cur.unit;
  const face = (m: Item) => ({ src: m.avatar, gender: m.gender, name: m.name });
  /**
   * **لا شارةَ مقعدٍ على كلّ كرت**: المقعدُ واحدٌ للجميع («عضو إدارة الموارد البشرية») يقوله عنوانُ الغرفة وموضعُها، فتكرارُه على كلّ
   * كرتٍ معلومةٌ مكرّرة (قاعدة «الرقمُ الذي يكرّر جملةً بجانبه يُحذف»). والذي يميّز صاحبَه وحدَه «تكليفًا».
   */
  const where = (m: Item) => (m.acting ? <AdBadge>تكليفًا</AdBadge> : null);
  /** **الكرتُ والسطرُ مصدرُهما واحد**: آخرُ يوم التكليف سطرًا (كان «تكليفًا حتى …» تحت الاسم، و«تكليفًا» صارت في الشارة). */
  const info = (m: Item): AdMeta[] => (m.acting?.until ? [{ icon: <CalendarX />, text: `التكليف حتى ${dayOnly(m.acting.until)}` }] : []);
  /**
   * **حِملُ الإشراف رقمُ الكرت وعمودُ السطر** — كان تحت الاسم «خبرًا لا مقبضًا» يدلّ على من ضُمّ ولم يُوزَّع بعد («بلا لجان»).
   * ولا رقمَ في إدارةٍ لا تُشرف (التنفيذيّة).
   */
  const figures = (m: Item): AdFigure[] =>
    unitOf(m).supervises ? [{ icon: <Buildings />, label: "الإشراف", value: loadText(m.committees.length) }] : [];
  /**
   * **فعلٌ واحدٌ في الكرت القديم ولا وجهةَ نقرٍ له**: الإخراجُ من الإدارة (بنافذته في `SupervisionModal`)، وللمكلَّف إنهاءُ تكليفه
   * (بتأكيده). وهو هدّامٌ فلا يكون أساسيًّا: يُرسم كما يرسم `AdActs` الفعلَ الخطِرَ الوحيد — صندوقًا بختمه الأحمر — في العرضين.
   */
  const acts = (m: Item) =>
    m.acting ? (
      <AdButton variant="danger" size="sm" icon={<CalendarX />} onClick={() => setEndFor(m)}>إنهاء التكليف</AdButton>
    ) : (
      <AdButton variant="danger" size="sm" icon={<SignOut />} onClick={() => openExpel(m)}>إخراج</AdButton>
    );

  const create = <AdButton variant="fill" icon={<UserPlus />} onClick={recruit}>تعيين عضو إداريّ</AdButton>;

  return (
    <>
      <CollectionRoom<Item>
        navPath={UNIT_ROOM.navPath}
        // العنوانُ اسمُ الإدارة المعروضة — فيعرف الداخلُ أيَّها يدير بلا سطرٍ يشرح (كما كان رأسُها)
        title={cur.unit.name}
        action={{ label: "تعيين عضو إداريّ", icon: <UserPlus />, onClick: recruit }}
        // كان زرًّا هادئًا بجانب الضمّ في رأس قسم الأعضاء؛ واللوحُ يحمل فعلًا ثانيًا هادئًا بجانب الأساسيّ
        extra={actableOf(cur.unit) ? { label: "تكليف", icon: <UserSwitch />, onClick: () => openActing(cur.unit) } : undefined}
        noun={AR_MEMBER}
        items={items}
        positions={positions}
        defaultPosition={fallback}
        searchPlaceholder="ابحث بالاسم…"
        matchSearch={(m, q) => matchesSearch(q, m.name)}
        viewKey={UNIT_ROOM.viewKey}
        initialView={view}
        idOf={(m) => m.key}
        table={{
          // الترتيبُ بالاسم وبحِمل الإشراف من رأسيهما كجداول الغرف كلّها (لم يكن للغرفة القديمة جدول)
          head: "العضو",
          headSortBy: (m) => m.name,
          stub: { key: "face", label: "", icon: <UserCircle /> },
          columns: cur.unit.supervises ? [{ key: "load", label: "الإشراف", icon: <Buildings />, sortBy: (m) => m.committees.length }] : [],
        }}
        emptyAll={{
          title: "لا عضو في إدارتك بعد",
          desc: cur.unit.supervises
            ? "ابدأ بتعيين عضوٍ إداريٍّ في الإدارة، ثمّ وزّع إشرافه من قسم اللجان أدناه."
            : "ابدأ بتعيين عضوٍ إداريٍّ في الإدارة.",
        }}
        createAction={create}
        renderCard={(m) => (
          <AdCard key={m.key} seed={m.key} face={face(m)} chips={where(m)} title={m.name} meta={info(m)} figures={figures(m)} foot={acts(m)} />
        )}
        renderRow={(m) => (
          <AdRow
            key={m.key}
            face={face(m)}
            title={m.name}
            badge={where(m)}
            sub={info(m)}
            cells={figures(m).map((f) => ({ label: f.label, value: f.value }))}
            acts={acts(m)}
          />
        )}
        // القسمُ الثاني — الإشراف: مقعدُ الإدارة في كلّ لجنةٍ تشغيليّة، وهو **بابُ التوزيع الوحيد**، كما كان بكرت المقعد. ولا قسمَ
        // للإدارة التنفيذيّة: ذراعُ الرئيس التنفيذيّ لا رقيبٌ على اللجان
        after={cur.unit.supervises ? (
          <section className="asg-sec">
            <ModalSectionHeading icon={<Buildings />} title="توزيع الإشراف على اللجان" />
            <div className="card-grid">
              {cur.seats.map((p) => (
                <PositionCard key={p.key} position={p} hero="scope" actions={() => seatActions(p, cur.unit)} onAssign={() => openSeat(p, cur.unit)} />
              ))}
            </div>
          </section>
        ) : undefined}
      />

      {/* الضمُّ والإخراجُ والإسنادُ والسحب — نافذةُ الغرفة القديمة كما هي */}
      <SupervisionModal
        state={modal?.s ?? null}
        unit={target.unit}
        candidates={candidates}
        unitMembers={unitMembers}
        pick={pick}
        onPick={setPick}
        busy={busy}
        onClose={() => setModal(null)}
        onSubmit={submit}
      />

      {/* التكليف — نافذةُ الغرفة القديمة كما هي، للإدارة التنفيذيّة وحدها */}
      <ActingModal
        key={actingFor ? `acting-${actingFor.id}` : "acting-closed"}
        seat={actingFor ? { roleAr: actingFor.memberRoleAr, scope: actingFor.name, owner: null } : null}
        members={actingPool}
        busy={busy}
        onClose={() => setActingFor(null)}
        onSubmit={submitActing}
      />

      <AdConfirm
        open={endFor !== null}
        onClose={() => setEndFor(null)}
        tone="warning"
        icon={<CalendarX />}
        title="إنهاء التكليف؟"
        text={endFor ? `ينتهي تكليف ${endFor.name} الآن.` : undefined}
        confirmLabel="إنهاء التكليف"
        onConfirm={submitEnd}
        loading={busy}
      />
    </>
  );
}

/**
 * **من لا إدارةَ يبلغها** — كانت تنبيهًا تحت الرأس، فصارت «القطعة» برمز الغرفة على هيئة الفراغ الواحدة، بلا أدواتٍ ولا قائمة
 * (لا شيءَ يُبحث فيه).
 */
function NoUnitRoom() {
  const crumb = useRoomCrumb(UNIT_ROOM.navPath, UNIT_ROOM.title);
  const iconKey = roomIconKey(UNIT_ROOM.navPath);
  const RoomIcon = iconKey ? ICONS[iconKey] : null;
  return (
    <AdRoom label={UNIT_ROOM.title}>
      <div className="ad-room-head">
        <RoomPlate title={UNIT_ROOM.title} crumb={crumb} />
      </div>
      <AdEmpty
        icon={RoomIcon ? <RoomIcon /> : undefined}
        title="لا إدارة تبلغها"
        desc="هذه الشاشة لمن يعيّن الأعضاء الإداريّين: يضمّهم إلى إداراتهم ويوزّع إشرافهم على لجان المجلس التشغيليّ. وقائدُ اللجنة غرفتُه «لجنتي»، ومنسّقُ القسم «قسمي»."
      />
    </AdRoom>
  );
}
