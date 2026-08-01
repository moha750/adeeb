"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Segmented, Stat } from "@adeeb/design-system";
import { ArrowsClockwise, Buildings, Trash, UserMinus, UserPlus, UsersFour } from "@phosphor-icons/react";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { assignPosition, assignSupervision, removePosition, revokeSupervision } from "../members/structure/actions";
import type { Position } from "../members/structure/model";
import { PositionCard } from "../members/assignments/PositionCard";
import type { MemberOption } from "../members/assignments/AssignmentModal";
import { SupervisionModal, type SupState } from "./SupervisionModal";
import { UnitMemberCard, committeesLabel } from "./UnitMemberCard";
import type { UnitMember, Target, Unit } from "./model";

/**
 * «وحدتي» — شاشة **كلّ قائد وحدة**، وفيها **فعلان لا فعلٌ واحد**:
 *   ضمُّ عضوٍ إلى الوحدة (انتماءٌ في `user_roles`) ثمّ — في الإدارات وحدها — توزيعُه على
 *   لجان التنفيذيّ (إشرافٌ في `committee_supervision`). كانا مدمجين فكان التوزيع تعيينًا خفيًّا.
 *
 * **الافتراق بُعدٌ لا شاشة:** قائد اللجنة يرى كشفه وضمَّه وإخراجَه؛ وقائد الإدارة يرى معها
 * مقاعد الإشراف (عينان: «حسب اللجنة» شبكةُ مقاعد فيُرى ما لم يُغطَّ · «حسب المشرف» كرتٌ لكلّ
 * عضوٍ بلجانه فيُرى مَن حُمِّل فوق طاقته). فما زاد في الإدارة زيادةٌ في المعروض لا نسخةٌ ثانية.
 *
 * ولا تُعرض وحدةٌ أخرى: الشاشة وحدةُ صاحبها — و`can_assign_role` في القاعدة تردّ ما وراءها،
 * فالإخفاءُ عرضٌ لا حراسة.
 */
export function UnitView({
  unit,
  seats,
  roster,
  members,
}: {
  unit: Unit;
  /** مقاعد الإشراف — فارغةٌ في اللجان التنفيذيّة (لا إشرافَ توزّعه لجنة). */
  seats: Position[];
  roster: UnitMember[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const supervises = unit.kind === "admin";
  const [view, setView] = useState<"seat" | "person">(supervises ? "seat" : "person");
  const [modal, setModal] = useState<SupState | null>(null);
  const [pick, setPick] = useState("");
  const [busy, start] = useTransition();

  const stats = useMemo(() => {
    const covered = seats.filter((s) => s.holders.length > 0).length;
    return { covered, vacant: seats.length - covered, people: roster.length };
  }, [seats, roster]);

  // أعضاء الإدارة — بِركةُ التوزيع. ومرشّحو الضمّ = بقيّة النادي.
  const unitMembers: MemberOption[] = useMemo(
    () => roster.map((s) => ({ id: s.userId, name: s.name, avatar: s.avatar, gender: s.gender })),
    [roster],
  );
  const candidates: MemberOption[] = useMemo(() => {
    const inUnit = new Set(roster.map((s) => s.userId));
    return members.filter((m) => !inUnit.has(m.id));
  }, [members, roster]);

  const loadOf = useMemo(
    () => new Map(roster.map((s) => [s.userId, s.committees.length])),
    [roster],
  );

  const open = (s: SupState) => { setPick(""); setModal(s); };

  const seatOf = (p: Position): Target => ({ id: p.committeeId as number, name: p.scope });

  // مقعد الإشراف مفردٌ بحكم فهرس `committee_supervision` (لجنة + إدارة)، فأوّلُ الشاغلين هو كلُّهم.
  const seatHolder = (p: Position) => p.holders[0] ?? null;

  const openSeat = (p: Position) => {
    const h = seatHolder(p);
    open({
      kind: "seat",
      committee: seatOf(p),
      holder: h ? { userId: h.userId, name: h.name, avatar: h.avatar, gender: h.gender } : null,
    });
  };

  const openSeatRemove = (p: Position) => {
    const h = seatHolder(p);
    if (!h) return;
    open({ kind: "remove", member: { userId: h.userId, name: h.name, avatar: h.avatar, gender: h.gender }, committee: seatOf(p) });
  };

  // من كرت المشرف يُختار **مقعدٌ** لا لجنة: `seats` هي مصدر حالة المقاعد نفسه الذي تعرضه
  // «حسب اللجنة» — فيُرى الشاغر والمشغول (ومعه شاغلُه) بدل إخفاء ما ليس له.
  const openJoin = (s: UnitMember) =>
    open({
      kind: "join",
      member: s,
      slots: seats
        .filter((p) => p.committeeId != null && !s.committees.some((x) => x.id === p.committeeId))
        .map((p) => {
          const h = seatHolder(p);
          return {
            committee: seatOf(p),
            holder: h ? { userId: h.userId, name: h.name, avatar: h.avatar, gender: h.gender } : null,
          };
        }),
    });

  const openChipRemove = (s: UnitMember, c: Target) => open({ kind: "remove", member: s, committee: c });
  const openExpel = (s: UnitMember) => open({ kind: "expel", member: s, count: loadOf.get(s.userId) ?? 0 });

  // إرسالٌ واحد يخدم الأفعال الخمسة — الفعل يُقرأ من الحالة، وبابُه يُقرأ من نوعه:
  // الانتماء إلى `assign/removePosition`، والإشراف إلى `assign/revokeSupervision`.
  const submit = () => {
    if (!modal) return;
    const done = (r: { ok: boolean; message: string }) => {
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    };

    if (modal.kind === "expel") {
      start(async () => done(await removePosition({ userId: modal.member.userId, roleName: unit.memberRoleName, committeeId: unit.id })));
      return;
    }
    if (modal.kind === "remove") {
      start(async () => done(await revokeSupervision({ userId: modal.member.userId, committeeId: modal.committee.id, unitId: unit.id })));
      return;
    }
    if (!pick) return;
    if (modal.kind === "recruit") {
      start(async () => done(await assignPosition({ userId: pick, roleName: unit.memberRoleName, committeeId: unit.id })));
      return;
    }

    const userId = modal.kind === "seat" ? pick : modal.member.userId;
    const committeeId = modal.kind === "seat" ? modal.committee.id : Number(pick);
    // الاستبدال يُعلَن من الوجهتين بمعنًى واحد: المقعد مشغول. (تُصدّقه القاعدة بـ`OCCUPIED`.)
    const replace =
      modal.kind === "seat"
        ? modal.holder !== null
        : modal.slots.some((s) => s.committee.id === committeeId && s.holder !== null);
    start(async () => done(await assignSupervision({ userId, committeeId, unitId: unit.id, replace })));
  };

  const seatActions = (p: Position): MenuGroup[] => [{
    header: "إجراءات", items: [
      { label: "استبدال المشرف", icon: <ArrowsClockwise />, onSelect: () => openSeat(p) },
      { label: "سحب الإشراف", icon: <Trash />, danger: true, onSelect: () => openSeatRemove(p) },
    ],
  }];

  return (
    <div className="asg">
      {/* الإحصاءات تقول ما للوحدة من أمر: الإدارةُ تُقاس بتغطيتها، واللجنةُ بعددها ونصيبها من الحِمل. */}
      <div className="stat-grid">
        {supervises ? (
          <>
            <Stat icon={<Buildings weight="fill" />} value={stats.covered} label="لجنة مُغطّاة" tone="success" />
            <Stat icon={<UserMinus weight="fill" />} value={stats.vacant} label="لجنة بلا مشرف" tone="danger" />
          </>
        ) : null}
        <Stat icon={<UsersFour weight="fill" />} value={stats.people} label="عضوًا في وحدتك" tone="brand" />
      </div>

      <div className="viewbar">
        {/* عينٌ واحدة لا تحتاج مبدّلًا: لا مقاعد إشرافٍ في لجنة، فالمبدّل يعرض خيارًا لا وجود له. */}
        {supervises ? (
          <Segmented
            aria-label="طريقة العرض"
            value={view}
            onValueChange={(v) => setView(v as "seat" | "person")}
            items={[{ value: "seat", label: "حسب اللجنة" }, { value: "person", label: "حسب المشرف" }]}
          />
        ) : <span />}
        <Button variant="primary" size="md" onClick={() => open({ kind: "recruit" })}>
          <UserPlus weight="bold" aria-hidden /> ضمّ عضو
        </Button>
      </div>

      {view === "seat" ? (
        <div className="card-grid">
          {seats.map((p) => (
            // البطلُ النطاق لا الدور: تسعُ لجانٍ ومقعدٌ واحدٌ مكرّر — فاسمُ الدور وشارتُه يسقطان
            // (يقولهما الفتاتُ مرّةً)، ويبقى في الكرت ما يفرّق لجنةً عن أخرى.
            <PositionCard key={p.key} position={p} hero="scope" actions={() => seatActions(p)} onAssign={() => openSeat(p)} />
          ))}
        </div>
      ) : roster.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<UsersFour weight="duotone" />}
          title="لا عضو في وحدتك بعد"
          description={
            supervises
              ? "ابدأ بضمّ عضوٍ إلى الإدارة — ثمّ وزّعه على ما تشاء من لجان المجلس التنفيذيّ."
              : "ابدأ بضمّ عضوٍ إلى لجنتك — وهو ضمٌّ لا نقل، فمن كان في لجنةٍ أخرى يبقى فيها."
          }
          action={<Button variant="primary" size="md" onClick={() => open({ kind: "recruit" })}>ضمّ عضو</Button>}
        />
      ) : (
        <div className="card-grid">
          {roster.map((s) => (
            <UnitMemberCard
              key={s.userId}
              member={s}
              subtitle={supervises ? committeesLabel(s.committees.length) : unit.memberRoleAr}
              onAdd={supervises ? () => openJoin(s) : undefined}
              onRemove={(c) => openChipRemove(s, c)}
              onExpel={() => openExpel(s)}
            />
          ))}
        </div>
      )}

      <SupervisionModal
        state={modal}
        unit={unit}
        candidates={candidates}
        unitMembers={unitMembers}
        pick={pick}
        onPick={setPick}
        busy={busy}
        onClose={() => setModal(null)}
        onSubmit={submit}
      />
    </div>
  );
}
