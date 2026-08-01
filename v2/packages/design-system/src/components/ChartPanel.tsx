import type { HTMLAttributes, ReactNode } from "react";
import { Card, CardBody, CardHeader } from "./Card";

export interface ChartPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
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
 * لوحة مخطّط — **قاعدة الكروت نفسها بلا اجتهاد**: `Card` + `CardHeader` + `CardBody`.
 * السطح والحدّ والظلّ والزاوية والحشو والرأس كلّها من نظام الكروت (مصدرٌ واحد)، لا صنفَ خاصّ.
 * رأسها الافتراضيّ `soft` (منسّمٌ هادئ)؛ يُتجاوَز بـ `headerVariant` عند الحاجة.
 */
export function ChartPanel({ title, icon, actions, headerVariant = "soft", children, ...props }: ChartPanelProps) {
  return (
    <Card {...props}>
      {(title != null || actions != null) && (
        <CardHeader variant={headerVariant} title={title} icon={icon} actions={actions} />
      )}
      <CardBody>{children}</CardBody>
    </Card>
  );
}
