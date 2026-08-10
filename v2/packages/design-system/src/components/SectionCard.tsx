import type { HTMLAttributes, ReactNode } from "react";
import { Card, CardBody, CardHeader } from "./Card";

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** عنوان اللوحة. */
  title?: ReactNode;
  /** أيقونة بجانب العنوان. */
  icon?: ReactNode;
  /** خانة تُدفع لطرف الرأس (مبدّل/شارة/زرّ). */
  actions?: ReactNode;
  /** نمط رأس الكرت (من نظام الكروت). الافتراضي `soft` (شريطٌ منسّمٌ خفيف) للمخطّطات. */
  headerVariant?: "chip" | "soft" | "solid";
}

/**
 * كرتُ قسمٍ معنون — **قاعدة الكروت نفسها بلا اجتهاد**: `Card` + `CardHeader` + `CardBody`.
 *
 * كان اسمه `ChartPanel` وهو يلفّ حقولَ نماذجَ في عشرة ملفّات (الأسئلة الشائعة · الأعمال · الرعاة ·
 * الباركود · بناء الاستبيان · الفعاليّات)، فكان الاسمُ يكذب على قارئ الكود. أُعيدت تسميتُه
 * ٢٠٢٦-٠٨-٠٩ بلا تغيير بكسلٍ واحد: هو كرتٌ بعنوان، يخدم المخطّطَ والنموذجَ سواء.
 * السطح والحدّ والظلّ والزاوية والحشو والرأس كلّها من نظام الكروت (مصدرٌ واحد)، لا صنفَ خاصّ.
 * رأسها الافتراضيّ `soft` (منسّمٌ هادئ)؛ يُتجاوَز بـ `headerVariant` عند الحاجة.
 */
export function SectionCard({ title, icon, actions, headerVariant = "soft", children, ...props }: SectionCardProps) {
  return (
    <Card {...props}>
      {(title != null || actions != null) && (
        <CardHeader variant={headerVariant} title={title} icon={icon} actions={actions} />
      )}
      <CardBody>{children}</CardBody>
    </Card>
  );
}
