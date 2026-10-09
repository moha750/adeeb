import type { PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **شجرةُ أدِيب** — من البيانات المقصوصة للنشر (`data.ts`) إلى عُقَدٍ تُرسم. نقيّةٌ بلا React.
 *
 *   رئيسُ النادي
 *   ├─ مقاعدُ المجلس الإداريّ (المستشار…)
 *   ├─ إدارتا المجلس (الموارد البشريّة · الضمان والجودة) ← أعضاؤهما أوراق
 *   └─ رئيسُ المجلس التنفيذيّ
 *        └─ الأقسام (المنسّق) ← اللجان (القائد ونائبه) ← الأعضاء أوراق
 *
 * **الشخصُ يُرسم مرّةً واحدة**: قائدةُ الموارد البشريّة مقعدٌ في المجلس وقائدةُ إدارتها، فتظهر
 * على عقدة إدارتها لا مرّتين. ورئيسُ التنفيذيّ مقعدٌ في الإداريّ، فهو عقدةُ فرعه لا مقعدٌ بجانبه.
 *
 * والعضوُ **ورقةٌ لا عقدة**: ٩٢ عقدةً بخطوطها تجعل الشجرةَ أعرض من أيّ شاشة؛ فأهلُ اللجنة
 * عنقودُ وجوهٍ تحت عقدتها.
 */

export type TNode = {
  key: string;
  /** الوجهُ الذي تحمله العقدة: صاحبُ المقعد، أو قائدُ الوحدة ومنسّقُ القسم. */
  face: PubPerson | null;
  /** نائبُ اللجنة، يُرسم وجهُه ملاصقًا لوجه قائدها. */
  pair: PubPerson | null;
  /** السطرُ الأوّل: اسمُ الشخص لعقدة المقعد، واسمُ الوحدة لعقدة الوحدة. */
  label: string;
  /** السطرُ الثاني: اسمُ القائد/المنسّق لعقدة الوحدة. */
  sub: string | null;
  /** السطرُ الثالث: المسمّى بجنس صاحبه. */
  role: string | null;
  members: PubPerson[];
  children: TNode[];
  depth: number;
  /** من في الفرع كلِّه (الوحدةُ بقائدها ونائبها، والقسمُ بلجانه) — العددُ الذي يُقال. */
  total: number;
  /** وحدةٌ (لجنة/إدارة) أم مقعدٌ أم قسم — به تعرف النماذجُ ما يُفتح وما يُزهر. */
  kind: "seat" | "unit" | "dept";
};

const unitNode = (u: PubUnit, depth: number): TNode => ({
  key: `u${u.id}`,
  face: u.leader,
  pair: u.deputy,
  label: u.name,
  sub: u.leader?.name ?? null,
  role: u.leader?.title ?? null,
  members: u.members,
  children: [],
  depth,
  total: u.total,
  kind: "unit",
});

const seatNode = (p: PubPerson, depth: number, children: TNode[] = []): TNode => ({
  key: `p${p.id}`,
  face: p,
  pair: null,
  label: p.name,
  sub: null,
  role: p.title,
  members: [],
  children,
  depth,
  total: 1 + children.reduce((a, c) => a + c.total, 0),
  kind: "seat",
});

export function buildTree(s: PubStructure): TNode | null {
  const [core, ...seats] = s.administrative.seats;
  if (!core) return null;

  const unitLeaders = new Set(s.administrative.units.map((u) => u.leader?.id).filter(Boolean) as string[]);
  const execHead = s.executive.head;

  const exec = execHead
    ? seatNode(
        execHead,
        1,
        s.executive.departments.map((d) => ({
          key: `d${d.id}`,
          face: d.head,
          pair: null,
          label: d.name,
          sub: d.head?.name ?? null,
          role: d.head?.title ?? null,
          members: [],
          children: d.units.map((u) => unitNode(u, 3)),
          depth: 2,
          total: d.total + (d.head ? 1 : 0),
          kind: "dept" as const,
        })),
      )
    : null;

  const others = seats
    .filter((p) => !unitLeaders.has(p.id) && p.id !== execHead?.id)
    .map((p) => seatNode(p, 1));

  return seatNode(core, 0, [
    ...others,
    ...s.administrative.units.map((u) => unitNode(u, 1)),
    ...(exec ? [exec] : []),
  ]);
}

/** كلُّ مفاتيح العُقَد التي لها ما يُفتح — لعرض الشجرة مفتوحةً كلَّها. */
export function allKeys(n: TNode, out: string[] = []): string[] {
  if (n.children.length || n.members.length) out.push(n.key);
  n.children.forEach((c) => allKeys(c, out));
  return out;
}
