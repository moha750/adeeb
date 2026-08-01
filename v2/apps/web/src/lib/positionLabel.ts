// تسمية المنصب — مصدرٌ واحد لكلّ شاشةٍ تقول «مَن هذا وأين».
//
// العلّة التي وُلد منها: كان `roles.role_name_ar` يحمل أحيانًا وحدةَ صاحبه
// («قائد إدارة الضمان والجودة») وأحيانًا الرتبةَ وحدها («قائد»). والواجهةُ تُلحق
// وحدةَ الإسناد بالاسم دائمًا، فخرج «قائد إدارة الضمان والجودة · إدارة الضمان والجودة».
//
// العلاج في القاعدة لا هنا: `roles.home_committee_id` يقول وحدةَ الدور الأمّ
// (20260731_roles_home_committee)، والأسماء نُظّفت من نصّها. فصارت التسمية
// **مقارنةَ معرّفَين** لا استنتاجًا ولا قائمةً بيضاء:
//
//   الاسم  = الرتبة + الوحدة الأمّ (إن وُجدت)
//   الوحدة = وحدة الإسناد، وتُسكت إن كانت الأمّ نفسها
//
// نقيّ بلا استيراد خادميّ — يستورده الخادم والنموذج معًا بأمان.

/** ما يلزم من صفّ الدور. `homeName` اسمُ لجنته الأمّ محلولًا من `committees`. */
export type RolePart = {
  roleAr: string;
  homeCommitteeId: number | null;
  homeName: string | null;
};

/** وحدة الإسناد كما في صفّ `user_roles`: لجنةٌ (بمعرّفها) أو قسمٌ (بلا معرّف لجنة). */
export type UnitPart = {
  committeeId?: number | null;
  unitName?: string | null;
};

/**
 * اسم المنصب وحده — الرتبةُ ووحدتُها الأمّ. يُستعمل حيث لا إسناد بعدُ:
 * كتالوج الأدوار، وقوائم الصلاحيّات، ومقاعد المجالس، ولوائح الانتخابات.
 */
export function roleTitle(r: RolePart): string {
  return r.homeName ? `${r.roleAr} ${r.homeName}` : r.roleAr;
}

/**
 * الوحدة التي تُقال مع المنصب — أو `null` حين لا تضيف شيئًا.
 * تُسكت في حالةٍ واحدة: أن تكون لجنةُ الإسناد هي لجنةُ الدور الأمّ نفسها
 * (قائد إدارة الضمان مُسنَدٌ إلى إدارة الضمان — واسمُه يقولها).
 */
export function assignmentScope(homeCommitteeId: number | null, u: UnitPart): string | null {
  if (u.committeeId != null && u.committeeId === homeCommitteeId) return null;
  return u.unitName ?? null;
}

/** القطعتان معًا. القاعدة تُعطي القطعتين، والشاشةُ تركّب الجملة كما يليق بها. */
export function positionLabel(r: RolePart, u: UnitPart = {}): { title: string; scope: string | null } {
  return { title: roleTitle(r), scope: assignmentScope(r.homeCommitteeId, u) };
}
