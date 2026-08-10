"use client";

import { useId } from "react";
import { Button, Dialog } from "@adeeb/design-system";

type Tone = "danger" | "warning" | "success";

type Props = {
  open: boolean;
  onClose: () => void;
  /** نغمة الحدث: خطر (حذف) · تحذير (تعليق) · نجاح (إشعار) */
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  text?: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  /**
   * فعلُ الزرّ الثاني حين يكون **طريقًا آخر** لا مجرّد إغلاق (نافذةُ نجاحٍ تخيّر بين وجهتين).
   * تُترك فارغةً في التأكيد العاديّ فيرتدّ إلى `onClose`؛ ومخارجُ النافذة (× وESC) تبقى على `onClose` دائمًا.
   */
  onCancel?: () => void;
  /** إشعار بزرّ واحد (بلا إلغاء) — للنجاح مثلًا */
  single?: boolean;
  loading?: boolean;
};

/**
 * نافذة تأكيد استثنائيّة — سلوك يدويّ كامل عبر بدائيّة {@link Dialog} بمظهر التنبيه (`.mdl-alert`):
 * سطح Aurora بلون النغمة + أيقونة متحرّكة بمعناها (نجاح يُرسَم · تحذير يتأرجح · خطر يرتجف) + أزرار ممتدّة.
 */
export function ConfirmDialog({
  open, onClose, tone, icon, title, text, confirmLabel, onConfirm, cancelLabel = "إلغاء", onCancel, single, loading,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const hasText = !!text;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={loading}
      contentClassName={"mdl mdl-sm mdl-alert mdl-tone-" + tone}
      labelledBy={titleId}
      describedBy={hasText ? descId : undefined}
    >
      <div className="mdl-body">
        <span className="mdl-tic" aria-hidden>{icon}</span>
        <h2 id={titleId} className="mdl-title">{title}</h2>
        {hasText ? <p id={descId} className="mdl-atext">{text}</p> : null}
      </div>
      <div className="mdl-foot">
        <Button variant={tone} size="md" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        {single ? null : <Button variant={`ghost-${tone}`} size="md" onClick={onCancel ?? onClose} disabled={loading}>{cancelLabel}</Button>}
      </div>
    </Dialog>
  );
}
