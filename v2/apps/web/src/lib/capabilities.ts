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
  // **صدر اللوحة وبابُها معًا** — «عضويتي». وقفلُه `view_own_membership` قدرةٌ يحملها كلّ من
  // له منصبٌ قائم (مُنحت لأدوار الهيكل كلّها في القاعدة، 20260802)، فمن كان في أديب دخل
  // بوّابته ورأى عضويّته وحدها.
  //
  // وهي قفلٌ كسائر الأقفال لا استثناءَ مرصّع في البوّابة: البابُ يُفتح بمفتاح غرفةٍ واحدة،
  // وهذه غرفة. فمن انتهت عضويّته سقطت مناصبه فسقط مفتاحُه، ولا شرطَ ثانٍ يُفحص عنده.
  "/dashboard": "view_own_membership",
  // **الملفّ الشخصيّ** — بيانات صاحب الجلسة نفسه. مفتاحُه مفتاحُ «عضويتي» عن قصد، وليس نقضًا
  // لقاعدة «لكلّ تبويبٍ قفلُه»: تلك تمنع مفتاحًا واحدًا يفتح غرفًا **مختلفة**، وهاتان غرفتا
  // موضوعٍ واحد هو المرء نفسه — عضويّتُه وسجلُّه. ولا يقع خلف هذا القفل إلّا سجلُّ حامله:
  // الجلب والكتابة كلاهما مقيَّدٌ بمعرّفه، فليس ثمّة ما يُوسَّع مداه بقفلٍ آخر.
  // وسلطةُ التحرير نفسُها ليست هنا أصلًا — تقولها القاعدة ببند «لكلٍّ بياناتُ نفسه»
  // في `can_edit_member_data`.
  "/dashboard/profile": "view_own_membership",
  // **الإعدادات** — حسابُ صاحب الجلسة: بريدُ دخوله ومفتاحُه وجلساتُه. مفتاحُها مفتاحُ أختيها
  // للعلّة نفسها: بابُ المرء إلى نفسه واحد. ولا يقع خلفها إلّا حسابُ حاملها — الجلسات تقرؤها
  // القاعدة بـ`auth.uid()`، والأفعال كلُّها بجلسته لا بمفتاح خدمةٍ يتجاوز الحراسة.
  "/dashboard/settings": "view_own_membership",
  "/dashboard/members/active": "view_members",
  "/dashboard/members/suspended": "view_suspended_members",
  // غرفةُ من لا يرى السجلّ كلّه: عضو إدارة الموارد يرى **من يشرف عليهم** وحدهم
  "/dashboard/members/supervised": "view_supervised_members",
  // سجلّ الإنذارات: بابُه `view_warnings` — يحمله قائد الموارد وعضوها **والرئيسان** (اطّلاعًا).
  // والإصدارُ والإلغاء قدرةٌ ثانية (`manage_warnings`) تُسأل داخل الغرفة وفي القاعدة، لا هنا.
  "/dashboard/members/warnings": "view_warnings",
  // شهادات الخبرة: قدرةٌ **واحدة** لا بابٌ وفعل — الرائي هنا هو المُصدِر نفسه (رئيس النادي ·
  // رئيس التنفيذيّ · قائد الموارد)، فلا فرقَ يُصنَع بلا أثر. ومدى الإصدار يقوله
  // `membership_authority` في القاعدة لا هذا القفل.
  "/dashboard/members/certificates": "manage_certificates",
  "/dashboard/members/birthdays": "view_birthdays",
  "/dashboard/members/structure": "view_org_structure",
  // تبويب التعيينات: مفتاحُه `assign_positions` — قدرةٌ **تُشتقّ** من جدول `position_authority`
  // بتريغر (من له صفُّ سلطةٍ له المفتاح). ولا تُخلَط بـ`manage_positions` فتلك تحرير بيانات
  // الوحدات (الوصف والرابط) وتبقى للرئيس. والمدى داخل الشاشة تقوله القاعدة لا هذا القفل.
  "/dashboard/members/assignments": "assign_positions",
  // تبويبات الهويّة الثلاثة — لكلٍّ قفلُه القائم، ومعه **شرطٌ ثانٍ** لا يُقرأ من هنا: صفٌّ حيٌّ
  // في `user_roles` يقول إن كانت وراء الباب غرفة (`lib/myScope.ts`). فالقدرة تفتح، والصفّ
  // يسمّي — وقد يملك المرء القفل ولا غرفةَ له، فيراه البند مخفيًّا والصفحةُ تقول لماذا.
  //
  // «إدارتي» — قائد الإدارة الإداريّة: يضمّ أعضاءها ويوزّع إشرافهم (و`can_assign_role` تحرس).
  "/dashboard/unit": "assign_unit_members",
  // «قسمي» — منسّق القسم: لجانُه وقيادتُها وأعضاؤها **عرضًا محضًا**، لا إنهاءَ ولا تعديل.
  "/dashboard/department": "manage_department",
  // «لجنتي» — قائد اللجنة ونائبها: كشفُها **عرضًا محضًا** (نُزع الضمّ والإخراج، 20260801).
  "/dashboard/committee": "manage_committee_members",
  "/dashboard/members/credentials": "manage_member_data",
  "/dashboard/events": "manage_activities",
  // رسائل التواصل — صندوقُ ما يكتبه الزائر في «تواصل معنا». قدرةٌ **واحدة** لا بابٌ وفعل:
  // من يرى بريد الزائر يردّ عليه، فلا معنى لقارئٍ لا يُجيب في غرفةٍ كلُّ عملها الجواب.
  "/dashboard/contact": "manage_contact",
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
  // لوحة السلطة — حدودُ المناصب (من يُسنِد مَن، ومن لا تطوله يدُه، ومدى سلطة العضويّة).
  // قفلُها قفلُ الصلاحيات: من يوزّع القدرات يرسم الحدود.
  "/dashboard/system/authority": "manage_permissions",
  "/dashboard/analytics": "view_site_stats",
  // أداةُ الرمز — لا سجلَّ لها ولا بيانات: تكتب نصًّا فتأخذ صورة. فقفلُها قدرةٌ خاصّة بها
  // (`use_qr_generator`) لا مفتاحُ غرفةٍ أخرى — من يصنع الملصقات ليس بالضرورة من يدير الموقع.
  "/dashboard/tools/qr": "use_qr_generator",
  "/dashboard/components": "manage_permissions",
} as const;

/** مسار قسمٍ مقفول. النوع يمنع اسمًا مكتوبًا خطأً في حارسٍ أو في بند تنقّل. */
export type Section = keyof typeof SECTION_CAP;

/** صدر اللوحة — غرفةٌ لها قفلُها كغيرها (`view_own_membership`). */
export const HOME = "/dashboard" as const satisfies Section;

/** المسارات التي يجوز أن يقصدها بند تنقّل — كلُّها أقسامٌ مقفولة، والصدر منها. */
export type NavHref = Section;

/** مفاتيح اللوحة كلّها. من يملك واحدًا منها يدخل الباب، ومن لا يملك أيًّا منها يُردّ عنده. */
export const DASHBOARD_CAPS: readonly string[] = [...new Set<string>(Object.values(SECTION_CAP))];

/** هل يفتح صاحب هذه القدرات هذا المسار؟ سؤالٌ واحدٌ لكلّ باب — والصدرُ بابٌ منها. */
export function canOpen(caps: readonly string[], href: NavHref): boolean {
  return caps.includes(SECTION_CAP[href]);
}
