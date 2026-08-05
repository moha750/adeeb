"use client";

import { Button, Select, type SelectOption, Modal } from "@adeeb/design-system";
import { SignOut, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import type { MemberOption } from "../members/assignments/AssignmentModal";
import { committeesLabel } from "./UnitMemberCard";
import type { UnitMember, Target, Unit } from "./model";

type Person = Pick<UnitMember, "userId" | "name" | "avatar" | "gender">;

/**
 * حالة المحرّر — **فعلان تنظيميّان واثنان تشغيليّان**، وهذا هو انقسامُ الشاشة نفسه ظاهرًا:
 *   `recruit` ← ضمُّ عضوٍ إلى الإدارة (انتماء)      · `expel`  ← إخراجه منها
 *   `seat`    ← اللجنة معلومة ويُختار المشرف       · `remove` ← سحب إشرافٍ قائم، والتأكيد وحده.
 * وسحبُ آخر لجنةٍ لم يعد يُخرج أحدًا من إدارته — لذلك سقط تحذيرُ «آخر لجنة».
 *
 * وسقط معه `join` (المشرفُ معلوم ويُختار المقعد) في 20260803: صار للتوزيع بابٌ واحدٌ هو
 * المقعد، فلا فعلَ واحدٌ بمدخلين ولا سؤالٌ «من أين أُسنِد؟».
 */
export type SupState =
  | { kind: "recruit" }
  | { kind: "expel"; member: Person; count: number }
  | { kind: "seat"; committee: Target; holder: Person | null }
  | { kind: "remove"; member: Person; committee: Target };

/**
 * محرّر توزيع الإشراف — النافذة المنغّمة (القاعدة ٩). النغمةُ تقول شدّة الفعل:
 * ضمٌّ أو إسنادٌ لمقعدٍ شاغر = محايد · استبدالُ مشرفٍ قائم = warning · سحبٌ أو إخراج = danger.
 * مُتحكَّم به: يملك المستدعي الاختيار والإرسال، وأنماطه من المكتبة (`.mdl-*`/`.org-modal-*`).
 */
export function SupervisionModal({
  state,
  unit,
  candidates,
  unitMembers,
  pick,
  onPick,
  busy,
  onClose,
  onSubmit,
}: {
  state: SupState | null;
  unit: Unit;
  /** مرشّحو الضمّ: أعضاء النادي ممّن ليسوا في الإدارة بعد. */
  candidates: MemberOption[];
  /** أعضاء الإدارة وحدهم — فالتوزيع لا يقع إلّا على من ضُمّ. */
  unitMembers: MemberOption[];
  pick: string;
  onPick: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isDanger = state?.kind === "remove" || state?.kind === "expel";
  // شدّةُ الفعل من حال المقعد: شاغرٌ إسناد، ومشغولٌ استبدال.
  const isReplace = state?.kind === "seat" && state.holder !== null;
  const tone = isDanger ? "danger" : isReplace ? "warning" : undefined;

  const title = !state
    ? ""
    : state.kind === "recruit"
      ? `تعيين عضو إداريّ في ${unit.name}`
      : state.kind === "expel"
        ? `إخراج ${state.member.name} من الإدارة`
        : state.kind === "remove"
          ? `سحب الإشراف على ${state.committee.name}`
          : isReplace
            ? `استبدال المشرف على ${state.committee.name}`
            : `إسناد مشرف على ${state.committee.name}`;

  // الموضع الحاليّ تلميحًا — لمرشّحي الضمّ وحدهم: ضمُّهم نقلٌ من لجانهم، فيُقال من أين.
  // أمّا أعضاء الإدارة (بِركة التوزيع) فلا `held` لهم أصلًا — موضعهم هذه الإدارة، وقولُه
  // على كلّ اسمٍ حشوٌ لا خبر. (والتوزيع ليس نقل منصبٍ بحال.)
  const optionsOf = (list: MemberOption[]): SelectOption[] =>
    list.map((m) => ({
      value: m.id,
      label: m.name,
      hint: m.held ?? undefined,
      icon: <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="xs" />,
    }));

  // الشخص المعروض في رأس المتن: الشاغل الحاليّ (استبدال/سحب) أو صاحبُ الكرت
  const person: Person | null =
    !state ? null : state.kind === "seat" ? state.holder : state.kind === "recruit" ? null : state.member;
  const personLabel = state?.kind === "seat" ? "المشرف الحاليّ" : state?.kind === "expel" ? "العضو" : "المشرف";

  const confirmLabel =
    state?.kind === "expel" ? "إخراج من الإدارة"
      : state?.kind === "remove" ? "سحب الإشراف"
        : state?.kind === "recruit" ? "تعيين"
          : isReplace ? "استبدال" : "إسناد";

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      busy={busy}
      className={tone ? `mdl-tone-${tone}` : undefined}
      title={title}
      description={unit.name}
      size="sm"
      footer={
        isDanger ? (
          <>
            <Button variant="ghost-danger" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant="danger" size="md" loading={busy} onClick={onSubmit}>{confirmLabel}</Button>
          </>
        ) : (
          <>
            <Button variant={isReplace ? "ghost-warning" : "ghost"} size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant={isReplace ? "warning" : "primary"} size="md" loading={busy} disabled={!pick} onClick={onSubmit}>
              {confirmLabel}
            </Button>
          </>
        )
      }
    >
      {state ? (
        <div className="org-modal">
          {person ? (
            <div className="org-modal-cur">
              <span className="org-sublbl">{personLabel}</span>
              <span className="asgm-holder">
                <Avatar name={person.name} src={person.avatar ?? undefined} gender={person.gender} size="sm" />
                <span>{person.name}</span>
              </span>
            </div>
          ) : null}

          {state.kind === "recruit" ? (
            candidates.length ? (
              <>
                <Select
                  label="العضو"
                  icon={<UserPlus />}
                  searchable
                  options={optionsOf(candidates)}
                  value={pick}
                  onValueChange={onPick}
                  required
                />
                <p className="org-modal-warn">
                  {`التعيينُ انتماءٌ لا توزيع: يصير عضوًا إداريًّا في ${unit.name} بلا لجنة، ثمّ تُسنِد إليه ما تشاء من مقاعد الإشراف.`}
                </p>
              </>
            ) : (
              <p className="org-modal-warn">لا مرشّح — أعضاء النادي كلّهم في هذه الإدارة.</p>
            )
          ) : null}

          {state.kind === "seat" ? (
            unitMembers.length ? (
              <Select
                label={isReplace ? "المشرف الجديد" : "المشرف"}
                icon={<UserPlus />}
                searchable
                tone={tone}
                options={optionsOf(unitMembers)}
                value={pick}
                onValueChange={onPick}
                required
              />
            ) : (
              <p className="org-modal-warn">
                لا عضو في {unit.name} بعد — عيّن عضوًا إداريًّا أوّلًا، فالتوزيع لا يقع إلّا على أعضائك.
              </p>
            )
          ) : null}

          {state.kind === "remove" ? (
            <p className="org-modal-warn">
              يُسحب إشرافه على {state.committee.name} ويبقى عضوًا في {unit.name} — فالإشراف تكليفٌ يدور،
              والانتماء لا يُمسّ إلّا بالإخراج.
            </p>
          ) : null}

          {state.kind === "expel" ? (
            <p className="org-modal-warn">
              <SignOut aria-hidden /> يخرج من {unit.name} ويُطوى منصبه فيها
              {state.count ? `، ويُسحب معه إشرافه على ${committeesLabel(state.count)}` : ""}.
              وقد يُسحب ترشّحه الانتخابيّ إن كان قائمًا.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
