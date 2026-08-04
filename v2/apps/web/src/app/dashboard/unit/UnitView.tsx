"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalSectionHeading, Stat } from "@adeeb/design-system";
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
 * «إدارتي» — شاشة **قائد الإدارة الإداريّة**، وفيها **فعلان لا فعلٌ واحد**:
 *   ضمُّ عضوٍ إلى الإدارة (انتماءٌ في `user_roles`) ثمّ توزيعُه على لجان التنفيذيّ (إشرافٌ في
 *   `committee_supervision`). كانا مدمجين فكان التوزيع تعيينًا خفيًّا.
 *
 * **وفعلان يعنيان قسمين لا عينين** (20260803): كانت الشاشةُ مبدّلًا بين «حسب اللجنة» و«حسب
 * المشرف» — نطاقٌ واحدٌ يُعرض مرّتين، والتوزيعُ يقع من الجهتين، فشتّت. فصارت **قسمًا للانتماء**
 * (أعضاء الإدارة: ضمٌّ وإخراج) فوق **قسمٍ للإشراف** (شبكةُ مقاعد اللجان: إسنادٌ واستبدالٌ
 * وسحب). ترتيبُهما هو ترتيبُ الفعلين: لا يُوزَّع إلّا من ضُمّ.
 *
 * وكانت تخدم قائد اللجنة التنفيذيّة معه فتُقرضه ضمًّا وإخراجًا (20260801): صار للجنة تبويبُها
 * «لجنتي» عرضًا محضًا، وبقي هنا مَن يضمّ ويوزّع — فلا فرعَ يسأل «أإدارةٌ هذه أم لجنة».
 *
 * ولا تُعرض إدارةٌ أخرى: الشاشة إدارةُ صاحبها — و`can_assign_role` في القاعدة تردّ ما وراءها،
 * فالإخفاءُ عرضٌ لا حراسة.
 */
export function UnitView({
  unit,
  seats,
  roster,
  members,
}: {
  unit: Unit;
  /** مقاعد الإشراف — مقعدُ إدارتك في كلّ لجنةٍ تنفيذيّة، مشغولًا كان أو شاغرًا. */
  seats: Position[];
  roster: UnitMember[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const toast = useToast();
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
  // مرشّحو الضمّ = بقيّة النادي، مضيَّقةً بشرط المقعد: عضو الإدارة لا يُضمّ إلّا من هو
  // عضو لجنةٍ الآن (انتقالٌ لا ضمٌّ من خارج). الشرط بيانٌ من القاعدة لا حُكمٌ مستنسخ.
  const candidates: MemberOption[] = useMemo(() => {
    const inUnit = new Set(roster.map((s) => s.userId));
    return members.filter((m) => !inUnit.has(m.id) && (!unit.memberPrerequisite || m.heldRole === unit.memberPrerequisite));
  }, [members, roster, unit.memberPrerequisite]);

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

  const openExpel = (s: UnitMember) => open({ kind: "expel", member: s, count: loadOf.get(s.userId) ?? 0 });

  // إرسالٌ واحد يخدم الأفعال الأربعة — الفعل يُقرأ من الحالة، وبابُه يُقرأ من نوعه:
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

    // والباقي مقعد: اللجنة معلومة ويُختار مشرفُها. والاستبدال يُعلَن حين يكون مشغولًا
    // (تُصدّقه القاعدة بـ`OCCUPIED`).
    start(async () =>
      done(await assignSupervision({
        userId: pick,
        committeeId: modal.committee.id,
        unitId: unit.id,
        replace: modal.holder !== null,
      })),
    );
  };

  const seatActions = (p: Position): MenuGroup[] => [{
    header: "إجراءات", items: [
      { label: "استبدال المشرف", icon: <ArrowsClockwise />, onSelect: () => openSeat(p) },
      { label: "سحب الإشراف", icon: <Trash />, danger: true, onSelect: () => openSeatRemove(p) },
    ],
  }];

  return (
    <div className="asg">
      {/* الإحصاءات تقول ما للإدارة من أمر: بعدد من فيها، وبتغطيتها للجان — بترتيب القسمين. */}
      <div className="stat-grid">
        <Stat icon={<UsersFour />} value={stats.people} label="عضوًا في إدارتك" tone="brand" />
        <Stat icon={<Buildings />} value={stats.covered} label="لجنة مُغطّاة" tone="success" />
        <Stat icon={<UserMinus />} value={stats.vacant} label="لجنة بلا مشرف" tone="danger" />
      </div>

      {/* القسم الأوّل — الانتماء: من هم أعضاء إدارتك، ضمًّا وإخراجًا. لا إشرافَ يُمسّ هنا. */}
      <section className="asg-sec">
        <div className="viewbar">
          <ModalSectionHeading icon={<UsersFour />} title="أعضاء الإدارة" />
          <Button variant="primary" size="md" onClick={() => open({ kind: "recruit" })}>
            <UserPlus aria-hidden /> تعيين عضو إداريّ
          </Button>
        </div>

        {roster.length === 0 ? (
          <EmptyState
            variant="soft"
            icon={<UsersFour />}
            title="لا عضو في إدارتك بعد"
            description="ابدأ بتعيين عضوٍ إداريٍّ في الإدارة — ثمّ وزّع إشرافه من قسم اللجان أدناه."
            action={<Button variant="primary" size="md" onClick={() => open({ kind: "recruit" })}>تعيين عضو إداريّ</Button>}
          />
        ) : (
          <div className="card-grid">
            {roster.map((s) => (
              <UnitMemberCard
                key={s.userId}
                member={s}
                subtitle={committeesLabel(s.committees.length)}
                onExpel={() => openExpel(s)}
              />
            ))}
          </div>
        )}
      </section>

      {/* القسم الثاني — الإشراف: مقعدُ إدارتك في كلّ لجنةٍ تنفيذيّة، وهو **بابُ التوزيع الوحيد**. */}
      <section className="asg-sec">
        <ModalSectionHeading icon={<Buildings />} title="توزيع الإشراف على اللجان" />
        <div className="card-grid">
          {seats.map((p) => (
            // البطلُ النطاق لا الدور: تسعُ لجانٍ ومقعدٌ واحدٌ مكرّر — فاسمُ الدور وشارتُه يسقطان
            // (يقولهما الفتاتُ مرّةً)، ويبقى في الكرت ما يفرّق لجنةً عن أخرى.
            <PositionCard key={p.key} position={p} hero="scope" actions={() => seatActions(p)} onAssign={() => openSeat(p)} />
          ))}
        </div>
      </section>

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
