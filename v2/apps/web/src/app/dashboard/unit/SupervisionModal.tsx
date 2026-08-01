"use client";

import { Button, Select, type SelectOption } from "@adeeb/design-system";
import { Buildings, SignOut, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { Modal } from "../_components/Modal";
import type { MemberOption } from "../members/assignments/AssignmentModal";
import { committeesLabel } from "./UnitMemberCard";
import type { UnitMember, Target, Unit } from "./model";

type Person = Pick<UnitMember, "userId" | "name" | "avatar" | "gender">;

/**
 * مقعدٌ مرشَّح في «إسناد لجنة» — المقعد لا اللجنة: يقول من يشغله الآن إن كان مشغولًا.
 * فالسؤال ليس «أيّ لجنةٍ لا يشرف عليها هو؟» بل «أيّ مقعدٍ يقبله؟» — والمشغول يقبله
 * باستبدالٍ مُعلَن، والقاعدة تردّ ما دونه (`OCCUPIED`).
 */
export type JoinSlot = { committee: Target; holder: Person | null };

/**
 * حالة المحرّر — **فعلان تنظيميّان وثلاثةٌ تشغيليّة**، وهذا هو الفصل نفسه ظاهرًا في الشاشة:
 *   `recruit` ← ضمُّ عضوٍ إلى الإدارة (انتماء)      · `expel`  ← إخراجه منها
 *   `seat`    ← اللجنة معلومة ويُختار المشرف       · `join` ← المشرف معلوم ويُختار المقعد
 *   `remove`  ← سحب إشرافٍ قائم، والتأكيد وحده.
 * وسحبُ آخر لجنةٍ لم يعد يُخرج أحدًا من إدارته — لذلك سقط تحذيرُ «آخر لجنة».
 */
export type SupState =
  | { kind: "recruit" }
  | { kind: "expel"; member: Person; count: number }
  | { kind: "seat"; committee: Target; holder: Person | null }
  | { kind: "join"; member: Person; slots: JoinSlot[] }
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
  // المقعد المختار في «إسناد لجنة» — منه تُعرف شدّة الفعل: شاغرٌ إسناد، ومشغولٌ استبدال.
  const slot = state?.kind === "join" ? state.slots.find((s) => String(s.committee.id) === pick) ?? null : null;
  const isReplace = state?.kind === "seat" ? state.holder !== null : slot?.holder != null;
  const tone = isDanger ? "danger" : isReplace ? "warning" : undefined;

  const title = !state
    ? ""
    : state.kind === "recruit"
      ? `ضمّ عضو إلى ${unit.name}`
      : state.kind === "expel"
        ? `إخراج ${state.member.name} من الإدارة`
        : state.kind === "remove"
          ? `سحب الإشراف على ${state.committee.name}`
          : state.kind === "join"
            ? `إسناد لجنة إلى ${state.member.name}`
            : isReplace
              ? `استبدال المشرف على ${state.committee.name}`
              : `إسناد مشرف على ${state.committee.name}`;

  const optionsOf = (list: MemberOption[]): SelectOption[] =>
    list.map((m) => ({
      value: m.id,
      label: m.name,
      icon: <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="xs" />,
    }));

  // الشاغرُ أوّلًا ثمّ المشغول، ورأسُ كلّ مجموعةٍ يقول ما يعنيه الاختيار — فلا يُفاجَأ
  // القائد برسالة «المقعد مشغول» بعد الإرسال، ولا تختفي اللجنة كأنّها غير موجودة.
  const committeeOptions: SelectOption[] =
    state?.kind === "join"
      ? [...state.slots]
          .sort((a, b) => Number(a.holder !== null) - Number(b.holder !== null) || a.committee.id - b.committee.id)
          .map((s) => ({
            value: String(s.committee.id),
            label: s.holder ? `${s.committee.name} — ${s.holder.name}` : s.committee.name,
            group: s.holder ? "مقاعد مشغولة — تُستبدَل" : "مقاعد شاغرة",
            icon: s.holder ? (
              <Avatar name={s.holder.name} src={s.holder.avatar ?? undefined} gender={s.holder.gender} size="xs" />
            ) : undefined,
          }))
      : [];

  // الشخص المعروض في رأس المتن: الشاغل الحاليّ (استبدال/سحب) أو صاحبُ الكرت
  const person: Person | null =
    !state ? null : state.kind === "seat" ? state.holder : state.kind === "recruit" ? null : state.member;
  const personLabel = state?.kind === "seat" ? "المشرف الحاليّ" : state?.kind === "expel" ? "العضو" : "المشرف";

  const confirmLabel =
    state?.kind === "expel" ? "إخراج من الإدارة"
      : state?.kind === "remove" ? "سحب الإشراف"
        : state?.kind === "recruit" ? "ضمّ"
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
                  icon={<UserPlus weight="bold" />}
                  searchable
                  options={optionsOf(candidates)}
                  value={pick}
                  onValueChange={onPick}
                  required
                />
                <p className="org-modal-warn">
                  {`الضمُّ انتماءٌ لا توزيع: يصير عضوًا في ${unit.name} بلا لجنة، ثمّ تُسنِد إليه ما تشاء من مقاعد الإشراف.`}
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
                icon={<UserPlus weight="bold" />}
                searchable
                tone={tone}
                options={optionsOf(unitMembers)}
                value={pick}
                onValueChange={onPick}
                required
              />
            ) : (
              <p className="org-modal-warn">
                لا عضو في {unit.name} بعد — ضُمّ عضوًا أوّلًا، فالتوزيع لا يقع إلّا على أعضائك.
              </p>
            )
          ) : null}

          {state.kind === "join" ? (
            state.slots.length ? (
              <>
                <Select
                  label="اللجنة"
                  icon={<Buildings weight="bold" />}
                  searchable
                  tone={tone}
                  options={committeeOptions}
                  value={pick}
                  onValueChange={onPick}
                  required
                />
                {slot?.holder ? (
                  <p className="org-modal-warn">
                    هذا المقعد يشغله {slot.holder.name} — والإسناد يُحلّ {state.member.name} محلّه، فيُسحب إشرافه
                    على {slot.committee.name}.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="org-modal-warn">لا لجنة متبقّية — هذا المشرف يغطّي لجان المجلس التنفيذيّ كلّها.</p>
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
              <SignOut weight="bold" aria-hidden /> يخرج من {unit.name} ويُطوى منصبه فيها
              {state.count ? `، ويُسحب معه إشرافه على ${committeesLabel(state.count)}` : ""}.
              وقد يُسحب ترشّحه الانتخابيّ إن كان قائمًا.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
