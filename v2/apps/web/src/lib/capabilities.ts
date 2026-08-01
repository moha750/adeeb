/**
 * قفل كلّ غرفةٍ في اللوحة — **المصدر الواحد**.
 *
 * تقرؤه ثلاثة ولا يُكتب في غيره: بوّابة الدخول (`lib/auth.ts`)، وخريطة التنقّل
 * (`_shell/nav.ts` — لا يرى المستخدم بندًا لا يملك مفتاحه)، وحارس كلّ صفحة
 * (`_shell/guard.tsx`). فمن أراد تغيير قفلٍ غيّره هنا وحده.
 *
 * المفتاح مسارُ القسم، وكلّ صفحةٍ فرعيّة تحته تستعير قفله (`/dashboard/surveys/new`
 * قفلها قفل `/dashboard/surveys`) — لأنّ من يدير الاستبيانات ينشئها ويحرّرها.
 *
 * ولكلّ تبويبٍ قفلُه وحده: لا مفتاحَ يفتح أربعة أبواب. فمن مُنح «أعياد الميلاد» لم يُمنح
 * معها سجلّ الأعضاء، ومن مُنح «الرعاة» لم يُمنح معهم الأعمال والأسئلة.
 */
export const SECTION_CAP = {
  "/dashboard/members/active": "view_members",
  "/dashboard/members/pending": "view_pending_members",
  "/dashboard/members/suspended": "view_suspended_members",
  // غرفةُ من لا يرى السجلّ كلّه: عضو إدارة الموارد يرى **من يشرف عليهم** وحدهم
  "/dashboard/members/supervised": "view_supervised_members",
  "/dashboard/members/birthdays": "view_birthdays",
  "/dashboard/members/structure": "view_org_structure",
  "/dashboard/members/assignments": "manage_positions",
  // شاشة قائد الوحدة (إدارةً كانت أو لجنة) — القفل يفتح البابَ، و`can_assign_role` في
  // القاعدة تقرّر الغرفة: كلُّ قائدٍ في وحدته وحدها.
  "/dashboard/unit": "assign_unit_members",
  "/dashboard/members/credentials": "manage_member_data",
  "/dashboard/events": "manage_activities",
  "/dashboard/surveys": "manage_surveys",
  "/dashboard/elections": "manage_elections",
  "/dashboard/website/works": "manage_works",
  "/dashboard/website/achievements": "manage_achievements",
  "/dashboard/website/sponsors": "manage_sponsors",
  "/dashboard/website/faq": "manage_faq",
  "/dashboard/library": "manage_library",
  "/dashboard/radio": "manage_radio",
  // باب غرفة التحرير: `write_news`. ورئيس التحرير (`manage_news`) يملكها معه —
  // فالمفتاح واحدٌ للباب، والفارق بين رئيسٍ وكاتب داخل الغرفة لا عندها.
  "/dashboard/news": "write_news",
  "/dashboard/system/permissions": "manage_permissions",
  "/dashboard/analytics": "view_site_stats",
  "/dashboard/components": "manage_permissions",
} as const;

/** مسار قسمٍ مقفول. النوع يمنع اسمًا مكتوبًا خطأً في حارسٍ أو في بند تنقّل. */
export type Section = keyof typeof SECTION_CAP;

/** صدر اللوحة — لا قفل له: من دخل الباب رآه. */
export const HOME = "/dashboard" as const;

/** المسارات التي يجوز أن يقصدها بند تنقّل. */
export type NavHref = Section | typeof HOME;

/** مفاتيح اللوحة كلّها. من يملك واحدًا منها يدخل الباب، ومن لا يملك أيًّا منها يُردّ عنده. */
export const DASHBOARD_CAPS: readonly string[] = [...new Set<string>(Object.values(SECTION_CAP))];

/** هل يفتح صاحب هذه القدرات هذا المسار؟ الصدر مفتوحٌ لكلّ من عبر الباب. */
export function canOpen(caps: readonly string[], href: NavHref): boolean {
  return href === HOME || caps.includes(SECTION_CAP[href]);
}
