/**
 * **تصنيفاتُ الأعمال** (قرار محمد ٢٠٢٦-١١-١٥): ستّةٌ ثابتة بدل النصّ الحرّ — كان نصفُ ما كُتب أسماءَ أعمالٍ لا تصنيفات، فتفرّق
 * مرشّحُ «كلّ الأعمال». والقيمةُ العربيّةُ هي المخزَّنة نفسُها، ومرآتُها قيدُ `works_category_check`
 * (`20261115004500_works_01_fixed_categories.sql`) — لا تُضاف قيمةٌ هنا دون هجرةٍ هناك. بلا إطار: يستورده الخادمُ والعميل.
 */
export const WORK_CATEGORIES = ["معرض", "فلم", "ورشة", "شراكة", "جائزة", "مبادرة"] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export const WORK_CATEGORY_OPTIONS = WORK_CATEGORIES.map((c) => ({ value: c, label: c }));

export const isWorkCategory = (v: string): v is WorkCategory => (WORK_CATEGORIES as readonly string[]).includes(v);
