// الترتيب القياسيّ لأدوار أديب — بالاسم لا بالرقم. مصدرٌ واحد للعرض والفرز في اللوحة كلّها.
// أُعدم `role_level`: «مَن أعلى» صار يُقرأ من هذه القائمة الصريحة (هويّةٌ لا عدد)، والسلطة
// تُقرأ من القدرات (permissions) لا من الموضع هنا. القائمة هرميّة من الأعلى: كلّ اسمٍ فوق ما بعده.
// نقيّ بلا استيراد خادميّ — يستورده الخادم والنموذج معًا بأمان.
export const ROLE_ORDER: readonly string[] = [
  "club_president",
  "president_advisor",
  "executive_council_president",
  "hr_committee_leader",
  "qa_committee_leader",
  "department_head",
  "hr_admin_member",
  "qa_admin_member",
  "committee_leader",
  "activity_coordinator",
  "deputy_committee_leader",
  "committee_member",
];

// رتبة العرض: الأصغر = الأعلى. الدور المجهول (لا اسم له في القائمة) يقع آخرًا فيخسر أمام أيّ معروف —
// نظير ما كان يفعله role_level=0 سابقًا، بلا رقمٍ في القاعدة.
export const roleRank = (roleName: string): number => {
  const i = ROLE_ORDER.indexOf(roleName);
  return i === -1 ? ROLE_ORDER.length : i;
};
