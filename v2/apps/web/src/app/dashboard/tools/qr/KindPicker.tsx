"use client";

import { Radio } from "@adeeb/design-system";
import { File as FileIcon, Globe } from "@phosphor-icons/react";
import type { QrKind } from "@/lib/qrLinks";

/**
 * **نوعُ الوجهة: رابطٌ أم ملف** — بطاقتا اختيارٍ بأيقونتين، اختارها المالك من `/ui/qr-image`
 * (٢٠٢٦-١٠-٠٨) على شريطٍ مقطعيّ: النوعُ قرارٌ يغيّر ما بعده من حقول، فيُعرَض سطحين يُنقران لا
 * مبدّلًا صغيرًا. وبلا وصفٍ تحت الاسمين: الأيقونةُ والكلمةُ تكفيان.
 *
 * **و«ملف» لا «صورة» و«PDF»** (م٢٤): الملفُّ صورةٌ أو PDF ونوعُه من امتداده، فتبقى البطاقتان
 * اثنتين في صفٍّ واحد (ثلاثٌ في شبكةِ أنصافٍ تترك الثالثةَ وحدها سطرًا).
 *
 * مصدرٌ واحدٌ لبابين: شاشةُ الإنشاء، ونافذةُ التعديل (التحويلُ بعد الإنشاء، م٢٣).
 */
export function KindPicker({
  value,
  onChange,
  name = "qr-kind",
  disabled,
}: {
  value: QrKind;
  onChange: (v: QrKind) => void;
  /** اسمُ مجموعة الراديو — يتميّز إن اجتمع منتقيان في صفحةٍ واحدة (المعرض). */
  name?: string;
  disabled?: boolean;
}) {
  return (
    <div className="form-grid" role="radiogroup" aria-label="نوع الوجهة">
      <Radio card name={name} icon={<Globe />} label="رابط" checked={value === "link"} disabled={disabled} onChange={() => onChange("link")} />
      <Radio card name={name} icon={<FileIcon />} label="ملف" checked={value === "file"} disabled={disabled} onChange={() => onChange("file")} />
    </div>
  );
}
