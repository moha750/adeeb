// مفردات لوحة الصلاحيات — آمنةٌ للعميل (بلا server-only)، فيستوردها العارض العميليّ والبيانات الخادميّة معًا.
// (لا تنقلها إلى data.ts: ذاك خادميّ حصرًا — استيراد قيمة منه في مكوّن عميل يسحبه إلى حزمة المتصفّح.)

// **هويّة المنصب اسمُه لا رقمُه.** كان `id` رقمَ `roles.id` ويُخزَّن في `user_roles.role_id`
// و`role_permissions.role_id` — وهما عمودان مكرّران مصيرهما الحذف (البند ١ في قائمة موت V1).
// فصار الاسم هو المفتاح في كلّ الطبقات: القراءة والعرض والكتابة، بلا رقمٍ وسيط.
export type PermRole = { roleName: string; roleAr: string };
export type Capability = { id: number; key: string; nameAr: string; category: string };

// تسميات فئات القدرات العربيّة (permissions.category) — للعرض المجمَّع.
// فئات القدرات المعروضة وحدها (لا «الأخبار»: لا قدرة أخبارٍ تفتح غرفةً في اللوحة).
export const CATEGORY_LABEL: Record<string, string> = {
  admin: "الإدارة",
  membership: "العضوية",
  activities: "الأنشطة",
  surveys: "الاستبيانات",
  elections: "الانتخابات",
  website: "الموقع",
  radio: "الإذاعة",
  // الفئةُ غيرُ المسمّاة هنا تُعرَض بمفتاحها الإنجليزيّ (`CATEGORY_LABEL[key] ?? key`)،
  // فتظهر «deebo» في شاشةٍ عربيّة. أُضيفت يومَ نزلت قدرةُ `manage_deebo` (2026-08-19).
  deebo: "ديبو",
};
