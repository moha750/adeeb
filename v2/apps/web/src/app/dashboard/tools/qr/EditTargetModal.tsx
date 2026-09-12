"use client";

import { Button, Field, Modal } from "@adeeb/design-system";
import { Globe, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { QR_TITLE_MAX, checkTarget } from "@/lib/qrLinks";

/**
 * **نافذةُ تعديل الوجهة — مصدرٌ واحدٌ لبابين.**
 *
 * كانت مكتوبةً حرفًا بحرفٍ في القائمة وفي صفحة الإحصاء: عنوانُها ووصفُها وحقلاها
 * ومساعداهما. ونصٌّ يُنسَخ يفترق: تُصحَّح كلمةٌ في أحدهما وتبقى في أخيه (جُرد ٢٠٢٦-٠٩-٠٥).
 *
 * **وتصدّق قبل أن ترسل** (وهو ما كان يفعله بابُ الإنشاء وحده): الاسمُ يُقصّ عند حدّ
 * القاعدة، والوجهةُ تمرّ بـ`checkTarget` فيُقال العطبُ تحت الحقل ويُقفَل زرُّ الحفظ.
 * فالخادمُ يعيد التصديق على كلّ حال (الفحصُ في المتصفّح تجربةٌ لا حراسة)، لكنّ الرسالةَ
 * تصل قبل السفر لا بعده.
 */
export function EditTargetModal({
  open, title, target, pending, onTitle, onTarget, onClose, onSave,
}: {
  open: boolean;
  title: string;
  target: string;
  pending: boolean;
  onTitle: (v: string) => void;
  onTarget: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const trimmed = target.trim();
  const link = trimmed ? checkTarget(trimmed) : null;
  const bad = link && !link.ok ? link.message : null;
  const ready = title.trim().length > 0 && !!link?.ok;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="تعديل وجهة الباركود"
      description="الوجهةُ تتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يصل إلى الوجهة الجديدة."
      footer={
        <>
          <Button variant="primary" size="md" loading={pending} disabled={!ready} onClick={onSave}>حفظ</Button>
          <Button variant="ghost" size="md" disabled={pending} onClick={onClose}>إلغاء</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field
          className="form-full"
          label="اسم الباركود"
          icon={<TextAa />}
          innerIcon={<QrCode />}
          placeholder="اكتب اسم الباركود"
          value={title}
          onChange={(e) => onTitle(e.target.value.slice(0, QR_TITLE_MAX))}
          helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
          required
        />
        <Field
          className="form-full"
          label="الوجهة"
          icon={<LinkSimple />}
          innerIcon={<Globe />}
          placeholder="https://adeeb.club"
          dir="ltr"
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          helper="حيثما يصل من يمسح الباركود."
          error={bad ?? undefined}
          required
        />
      </div>
    </Modal>
  );
}
