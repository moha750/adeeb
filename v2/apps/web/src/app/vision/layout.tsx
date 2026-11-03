import type { ReactNode } from "react";
// أصنافُ الصفحة (`.vz-*`) ولبناتُها (اللوح والشارة والشريط) في طبقة الأساس الجديد، وكانت لا تُحمَّل إلّا في البوّابة.
import "@adeeb/design-system/ad.css";

export default function VisionLayout({ children }: { children: ReactNode }) {
  return children;
}
