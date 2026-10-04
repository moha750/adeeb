/**
 * **الجهةُ التنظيميّة — مصدرٌ واحد لترميزها وترتيبها.**
 *
 * ثلاثةُ جداولَ تصف هيكلةَ أدِيب (`councils` · `departments` · `committees`)، ومعرّفاتُها
 * تتكرّر بينها (القسم ١ ليس اللجنة ١)، فلا يكفي رقمٌ مجرّدٌ ليقول «هذه الجهة». فالقيمةُ
 * النصّيّة تحمل **النوعَ ومعرّفَه** معًا: `council:<id>` · `dept:<id>` · `comm:<id>`،
 * والفراغُ يعني **النادي كلَّه** (لا شيءَ مضبوطٌ في القاعدة).
 *
 * وُلد هذا الترميز في نظام الفعاليّات (`organizerValue` ٢٠٢٦-٠٧) بنوعين، ثمّ طلب المالكُ
 * (٢٠٢٦-٠٩-١٧) أن تتّسع جهةُ الخبر للأقسام والمجالس، فرُفع إلى هنا بثلاثة أنواع ليقرأه
 * النظامان من بيتٍ واحد: فلو رُمّز ثانيةً في الأخبار لصار للنادي ترميزان يفترقان أوّلَ
 * تغييرٍ في الهيكلة، ولاختلف ترتيبُ القائمة بين شاشتين وهي هيكلةٌ واحدة.
 *
 * **والقوسُ حصريٌّ في القاعدة**: عمودٌ واحدٌ يُضبَط لا اثنان، يحرسه قيدٌ مقابل
 * (`news_one_unit` في الأخبار)، فلا يقع صفٌّ يقول إنّه لقسمٍ ولجنةٍ معًا.
 */

export type UnitKind = "council" | "dept" | "comm";

/** أعمدةُ الجهة كما تُكتب في القاعدة — واحدٌ منها على الأكثر غيرُ فارغ. */
export type UnitCols = {
  councilId: string | null;
  departmentId: number | null;
  committeeId: number | null;
};

export const NO_UNIT: UnitCols = { councilId: null, departmentId: null, committeeId: null };

/** اسمُ الجهة حين لا جهةَ بعينها: الخبرُ للنادي كلِّه لا خبرٌ بلا صاحب. */
export const CLUB_LABEL = "نادي أدِيب";

/** عناوينُ التجميع في المنسدل — الإدارةُ لجنةٌ بلا قسم، فتُفرَز بعنوانها لا بنوعها. */
export const UNIT_GROUPS = {
  council: "المجالس",
  dept: "الأقسام",
  comm: "اللجان",
  admin: "الإدارات",
} as const;

/** القيمة النصّيّة الموحّدة من أعمدة القاعدة (للقائمة والتحرير والترشيح). */
export function unitValue(cols: Partial<UnitCols>): string {
  if (cols.committeeId != null) return `comm:${cols.committeeId}`;
  if (cols.departmentId != null) return `dept:${cols.departmentId}`;
  if (cols.councilId) return `council:${cols.councilId}`;
  return "";
}

/**
 * يفكّ القيمة النصّيّة إلى أعمدة القاعدة (للحفظ).
 * وكلُّ ما لا يُفهَم يسقط إلى «النادي» بدل أن يُكتب معرّفٌ مختلّ — والقاعدةُ خلفه
 * بمفتاحٍ أجنبيٍّ يردّ ما لا وجودَ له.
 */
export function parseUnit(v: string | null | undefined): UnitCols {
  const s = (v ?? "").trim();
  if (s.startsWith("comm:")) {
    const id = Number(s.slice(5));
    return Number.isInteger(id) && id > 0 ? { ...NO_UNIT, committeeId: id } : NO_UNIT;
  }
  if (s.startsWith("dept:")) {
    const id = Number(s.slice(5));
    return Number.isInteger(id) && id > 0 ? { ...NO_UNIT, departmentId: id } : NO_UNIT;
  }
  if (s.startsWith("council:")) {
    // معرّفُ المجلس نصٌّ (`executive` · `administrative`) — يُقلَّم ويُحصَر في حروفٍ
    // لاتينيّةٍ وأرقامٍ وشرطتين، فلا يمرّ منه إلى الاستعلام ما ليس معرّفًا. ولم يُضيَّق
    // إلى الحروف وحدها: مجلسٌ يُسمّى غدًا `executive-2` كان يسقط صامتًا إلى «النادي».
    const id = s.slice(8).trim();
    return /^[a-z0-9_-]{2,40}$/i.test(id) ? { ...NO_UNIT, councilId: id } : NO_UNIT;
  }
  return NO_UNIT;
}

/* ══ بناءُ خيارات المنسدل ════════════════════════════════════════════ */

export type UnitOption = { value: string; label: string; group?: string };

type CouncilRow = { id: string; name_ar: string | null };
type DeptRow = { id: number; name_ar: string | null; display_order?: number | null };
type CommRow = { id: number; committee_name_ar: string | null; department_id: number | null };

const ar = (a: string, b: string) => a.localeCompare(b, "ar");

/**
 * خياراتُ الجهة بترتيبِ الهيكلة من أعلاها: النادي · المجالس · الأقسام · اللجان (كلٌّ
 * بترتيب قسمها) · الإدارات (لجانٌ بلا قسم: الموارد البشريّة والضمان).
 *
 * والمجالسُ تُحذَف بحذف `councils` من المُدخَل — فنظامُ الفعاليّات يُنظِّم قسمٌ أو لجنة
 * ولا يُنظِّم مجلس، ونظامُ الأخبار يَنسِب إلى المجلس كما يَنسِب إلى اللجنة.
 */
export function buildUnitOptions(src: {
  councils?: CouncilRow[] | null;
  departments: DeptRow[] | null;
  committees: CommRow[] | null;
  clubLabel?: string;
}): UnitOption[] {
  const councils = src.councils ?? [];
  const departments = src.departments ?? [];
  const committees = src.committees ?? [];

  const order = new Map<number, number>();
  for (const d of departments) order.set(d.id, d.display_order ?? 999);
  const deptRank = (id: number | null) => (id == null ? 999 : order.get(id) ?? 999);

  const options: UnitOption[] = [{ value: "", label: src.clubLabel ?? CLUB_LABEL }];

  for (const c of [...councils].sort((a, b) => ar(a.name_ar ?? a.id, b.name_ar ?? b.id))) {
    options.push({ value: `council:${c.id}`, label: c.name_ar ?? c.id, group: UNIT_GROUPS.council });
  }

  for (const d of [...departments].sort(
    (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || ar(a.name_ar ?? "", b.name_ar ?? ""),
  )) {
    options.push({ value: `dept:${d.id}`, label: d.name_ar ?? "", group: UNIT_GROUPS.dept });
  }

  for (const c of committees
    .filter((c) => c.department_id != null)
    .sort((a, b) => deptRank(a.department_id) - deptRank(b.department_id) || ar(a.committee_name_ar ?? "", b.committee_name_ar ?? ""))) {
    options.push({ value: `comm:${c.id}`, label: c.committee_name_ar ?? "", group: UNIT_GROUPS.comm });
  }

  for (const c of committees
    .filter((c) => c.department_id == null)
    .sort((a, b) => ar(a.committee_name_ar ?? "", b.committee_name_ar ?? ""))) {
    options.push({ value: `comm:${c.id}`, label: c.committee_name_ar ?? "", group: UNIT_GROUPS.admin });
  }

  return options;
}

/**
 * فهرسُ الاسم بالقيمة — يُبنى من الخيارات نفسِها، فاسمُ الجهة في الجدول هو اسمُها في
 * المنسدل حرفًا بحرف، ولا يُقرأ من خريطةٍ ثانية تنسى صفًّا.
 */
export function unitNameIndex(options: UnitOption[]): Map<string, string> {
  return new Map(options.map((o) => [o.value, o.label]));
}
