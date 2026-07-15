/** دمج أسماء الأصناف مع تجاهل الفارغة (بديل خفيف عن clsx). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
