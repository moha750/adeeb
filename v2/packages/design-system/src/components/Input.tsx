import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

/**
 * حقل إدخال خام بهوية العلامة (بلا تسمية) — للتخطيطات المخصّصة.
 * للاستخدام العامّ فضّل مكوّن `Field` (تسمية ثابتة أعلى + أيقونة هويّة + حالات).
 */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("fld-in", className)} {...props} />;
}
