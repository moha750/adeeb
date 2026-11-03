import "server-only";
import { getPublicStructure, type PubPerson } from "@/app/structure/data";

/**
 * **فريقُ الرؤية وخطُّ متابعتها** — «الإدارة التنفيذية تنفّذ، والضمان والجودة يتابع، والمجلس الإداريّ يطّلع» (محمد ٢٠٢٦-١١-٠١).
 * أسماءُ الجهات وأصحابُ مقاعد الفريق من هيكل أدِيب العلنيّ نفسِه (`get_public_structure`) لا مكتوبةً باليد:
 * فإن تغيّر اسمٌ أو صورةٌ تغيّرت الصفحةُ وحدها.
 *
 * والوحدتان بمعرّفيهما في `committees` (إدارتا المجلس الإداريّ): الاسمُ قد يُعدَّل والمعرّفُ لا.
 */
const EXECUTIVE_UNIT = 37; // الإدارة التنفيذية — قائدُها الرئيسُ التنفيذيّ (`executive_council_president`)
const QA_UNIT = 23;        // إدارة الضمان والجودة (`qa_committee_leader`)

/** جهةٌ في خطّ المتابعة: اسمُها وفعلُها (محمد ٢٠٢٦-١١-٠٣: «أزل الأشخاص واجعله خطَّ متابعةٍ بأسماء الإدارات») */
export type TeamGroup = {
  key: "execute" | "follow" | "council";
  /** الفعلُ: ما تفعله الجهةُ بالرؤية */
  verb: string;
  name: string;
};

/**
 * **فريقُ الرؤية الخاصّ** (محمد ٢٠٢٦-١١-٠٣: «لكلّ رؤيةٍ فريقُها»): مشرفٌ عامّ، وقائدٌ للرؤية، وقائدٌ لكلّ مسار.
 * **معاينةٌ في الكود** حتى يعتمدها محمد، ثمّ تصير بياناتٍ في القاعدة تُدار من البوّابة. المعرّفاتُ معرّفاتُ الملفّات،
 * والاسمُ والصورةُ من الهيكل. و`null` مقعدٌ لم يُسمَّ صاحبُه بعد.
 */
const CORE: Record<string, { supervisor: string | null; leader: string | null; tracks: (string | null)[] }> = {
  hilal: {
    supervisor: "f4a1cd18-9a27-4316-bb7a-ba8fd363bac1", // بشائر الحداد
    leader: "17dce2b9-72bf-4a92-937f-6be273022852", // نوره الصالح
    tracks: [null, null, null, null],
  },
};

export type CoreTeam = { supervisor: PubPerson | null; leader: PubPerson | null; trackLeads: (PubPerson | null)[] };

export async function getVisionTeam(slug: string): Promise<{ data: { core: CoreTeam | null; oversight: TeamGroup[] } | null; error: string | null }> {
  const { data, error } = await getPublicStructure();
  if (!data) return { data: null, error };
  const everyone = new Map<string, PubPerson>();
  const add = (p: PubPerson | null) => { if (p && !everyone.has(p.id)) everyone.set(p.id, p); };
  data.administrative.seats.forEach(add);
  add(data.executive.head);
  for (const u of [...data.administrative.units, ...data.executive.departments.flatMap((d) => d.units)]) {
    add(u.leader); add(u.deputy); u.members.forEach(add);
  }
  data.executive.departments.forEach((d) => add(d.head));
  const who = (id: string | null) => (id ? everyone.get(id) ?? null : null);
  const c = CORE[slug];
  const core: CoreTeam | null = c ? { supervisor: who(c.supervisor), leader: who(c.leader), trackLeads: c.tracks.map(who) } : null;
  const units = data.administrative.units;
  const unit = (id: number, key: TeamGroup["key"], verb: string): TeamGroup | null => {
    const u = units.find((x) => x.id === id);
    return u ? { key, verb, name: u.name } : null;
  };
  const groups = [
    unit(EXECUTIVE_UNIT, "execute", "تنفّذ الرؤية"),
    unit(QA_UNIT, "follow", "تتابع تنفيذها"),
    { key: "council" as const, verb: "يطّلع على سيرها", name: data.administrative.name },
  ].filter((g): g is TeamGroup => g !== null);
  return { data: { core, oversight: groups }, error: null };
}
