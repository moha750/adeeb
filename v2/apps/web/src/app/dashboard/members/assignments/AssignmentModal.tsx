"use client";

import { Button, Select, type SelectOption } from "@adeeb/design-system";
import { UserPlus } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { Modal } from "../../_components/Modal";
import type { Holder, Position } from "../structure/model";

export type MemberOption = { id: string; name: string; avatar?: string | null; gender?: "male" | "female" | null };

// حالة المحرّر: إسنادٌ (لشاغرٍ أو زيادةٌ لمتعدّد أو استبدالٌ لمشغولٍ مفرد) أو إزالة.
// تُملَك من المستدعي (مُتحكَّم به). والإزالة تحمل **شاغلَها**: المنصب المتعدّد فيه
// أكثر من واحد، فـ«شاغل المنصب» وحدها لا تعيّن من يُزال.
export type AssignState =
  | { kind: "assign"; position: Position; replace: boolean }
  | { kind: "remove"; position: Position; holder: Holder };

/**
 * محرّر الإسناد — النافذة المنغّمة (القاعدة ٩). النغمةُ تقول شدّة الفعل:
 * إسنادٌ لشاغرٍ = محايد (روتينيّ) · استبدالٌ لمشغول = warning (يحلّ محلّ شاغل) · إزالة = danger.
 * رأسٌ يحمل سياق المنصب (منصب + نطاق + شارة العضويّة) ومنتقي عضوٍ بأفتار. (سقط مبدّل إدارة
 * HR/QA مع مقاعد الإشراف — لم يعد الإشراف منصبًا يُسنَد هنا.)
 * مُتحكَّم به: يملك المستدعي الاختيار والإرسال — أنماطه من المكتبة (`.mdl-*`/`.org-modal-*`).
 */
export function AssignmentModal({
  state,
  members,
  pick,
  onPick,
  busy,
  onClose,
  onSubmit,
}: {
  state: AssignState | null;
  members: MemberOption[];
  pick: string;
  onPick: (id: string) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const p = state?.position ?? null;
  const isRemove = state?.kind === "remove";
  const isReplace = state?.kind === "assign" && state.replace;
  const isAssign = state?.kind === "assign";
  const tone = isRemove ? "danger" : isReplace ? "warning" : undefined;
  // زيادةٌ لا إسناد: منصبٌ متعدّدٌ فيه شاغلون بالفعل — العنوان يقول ما يقع
  const isAdd = isAssign && !state.replace && p !== null && !p.singleton && p.holders.length > 0;
  // عنوانٌ جملةٌ مترابطة بلا شرطة: «إسناد منصب مستشار رئيس النادي»
  const verb = isRemove ? "إزالة من منصب" : isReplace ? "استبدال شاغل منصب" : isAdd ? "إضافة شاغل إلى منصب" : "إسناد منصب";
  // الشاغل المعروض: من يُزال بعينه، أو الشاغل الذي يُحلّ محلّه في الاستبدال (والمفرد
  // لا يزيد عن واحد). أمّا الزيادةُ فلا «شاغل حاليّ» لها — الكرت يعرض الجميع.
  const holder = state?.kind === "remove" ? state.holder : isReplace ? p?.holders[0] ?? null : null;

  const memberOptions: SelectOption[] = members.map((m) => ({
    value: m.id,
    label: m.name,
    icon: <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="xs" />,
  }));

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      busy={busy}
      className={tone ? `mdl-tone-${tone}` : undefined}
      title={p ? `${verb} ${p.roleAr}` : verb}
      description={p ? `«${p.scope}»` : undefined}
      size="sm"
      footer={
        isRemove ? (
          <>
            <Button variant="ghost-danger" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant="danger" size="md" loading={busy} onClick={onSubmit}>إزالة</Button>
          </>
        ) : (
          <>
            <Button variant={isReplace ? "ghost-warning" : "ghost"} size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant={isReplace ? "warning" : "primary"} size="md" loading={busy} disabled={!pick} onClick={onSubmit}>{isReplace ? "استبدال" : isAdd ? "إضافة" : "إسناد"}</Button>
          </>
        )
      }
    >
      {p ? (
        <div className="org-modal">
          {/* الشاغل الحاليّ (استبدال/إزالة) */}
          {holder ? (
            <div className="org-modal-cur">
              <span className="org-sublbl">{isRemove ? "الشاغل" : "الشاغل الحاليّ"}</span>
              <span className="asgm-holder"><Avatar name={holder.name} src={holder.avatar ?? undefined} gender={holder.gender} size="sm" /><span>{holder.name}</span></span>
            </div>
          ) : null}

          {isAssign ? (
            <Select
              label={isReplace ? "الشاغل الجديد" : "العضو"}
              icon={<UserPlus weight="bold" />}
              searchable
              tone={tone}
              options={memberOptions}
              value={pick}
              onValueChange={onPick}
              required
            />
          ) : (
            <p className="org-modal-warn">سيُلغى تفعيل هذا المنصب. لا يُحذف السجلّ نهائيًّا، لكن قد يُسحب ترشّح العضو الانتخابيّ إن كان قائمًا.</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
