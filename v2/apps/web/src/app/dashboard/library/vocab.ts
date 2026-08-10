// مفردات المكتبة — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
//   library_books_kind_check · library_books_status_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.

/* ══ نوع المنشور ═════════════════════════════════════════════════════ */

export type BookKind = "annual_report" | "magazine" | "booklet";

/** النوع تصنيفٌ لا حالة — يحمله نصٌّ لا لونُ نغمة (اللون للحالة وحدها). */
export const KIND_META: Record<BookKind, { label: string }> = {
  annual_report: { label: "تقرير سنويّ" },
  magazine: { label: "مجلّة" },
  booklet: { label: "كُتيّب" },
};
export const KIND_VALUES = Object.keys(KIND_META) as BookKind[];
export const KIND_OPTIONS: { value: BookKind; label: string }[] =
  KIND_VALUES.map((v) => ({ value: v, label: KIND_META[v].label }));

/* ══ حالة المنشور ════════════════════════════════════════════════════ */

export type BookStatus = "draft" | "published";

export const STATUS_META: Record<BookStatus, { label: string; tone: "info" | "success" }> = {
  draft: { label: "مسودّة", tone: "info" },
  published: { label: "منشور", tone: "success" },
};

/* ══ ترقيم عربيّ للسنة (عرض) ═══════════════════════════════════════════ */

/** يجمع الهجريّ والميلاديّ في سطر عرض واحد؛ يُخفى ما خلا. */
export function yearLabel(hijri: number | null, gregorian: number | null): string {
  if (hijri && gregorian) return `${hijri}هـ، ${gregorian}م`;
  if (gregorian) return `${gregorian}م`;
  if (hijri) return `${hijri}هـ`;
  return "";
}

/* ══ اشتقاق السلاگ (المعرّف) ═══════════════════════════════════════════ */

// نُقل إلى `lib/slug.ts` حين احتاجته الإذاعة أيضًا — مصدرٌ واحد لا نسختان.
// ويُعاد تصديره هنا فلا يتغيّر مستورِدٌ واحد.
export { slugify } from "@/lib/slug";
