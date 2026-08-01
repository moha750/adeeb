// مفردات لوحة الصلاحيات — آمنةٌ للعميل (بلا server-only)، فيستوردها العارض العميليّ والبيانات الخادميّة معًا.
// (لا تنقلها إلى data.ts: ذاك خادميّ حصرًا — استيراد قيمة منه في مكوّن عميل يسحبه إلى حزمة المتصفّح.)

export type PermRole = { id: number; roleName: string; roleAr: string };
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
};
