import type { OrgData } from "./orgData";

/** موضعُ القارئ من الهيكل — تبنيه الصفحة من صفوفه هو، ويقرؤه العرض بطلًا ووسمًا. */
export type YouAre = {
  committees: number[];
  departments: number[];
  councils: string[];
  /** لجنتُه التنفيذيّة — بطلُ الصدر. */
  home: number | null;
};

export const NO_YOU: YouAre = { committees: [], departments: [], councils: [], home: null };

/**
 * **موضعُ القارئ** — من صفوفه هو لا من `myScope`: تلك تسأل «هل له غرفةٌ يقودها»، وهذه تسأل «أين هو من الهيكل» — وعضوُ
 * اللجنة له موضعٌ ولا غرفةَ له. والهويّةُ من `getCurrentAdmin` عند المستدعي، فتسري معاينةُ «انظر بعين» على الوسم كما تسري على
 * سائر الشاشة. (أُخرج من صفحة «معاينة المقترح» ٢٠٢٦-١١-١٤ لتقرأه غرفةُ الهيكلة الجديدة أيضًا، بلا تغيير.)
 */
export function youOf(org: Pick<OrgData, "userRoles" | "committees" | "roles">, meId: string | null | undefined): YouAre {
  if (!meId) return NO_YOU;
  const mine = org.userRoles.filter((r) => r.user_id === meId);
  const councilOfCommittee = new Map(org.committees.map((c) => [c.id, c.council_id]));
  const seatRoles = new Map(org.roles.filter((r) => r.membership_kind === "member").map((r) => [r.role_name, r.council_type]));
  const committees = [...new Set(mine.map((r) => r.committee_id).filter((x): x is number => x != null))];
  const councils = [...new Set([
    // مقعدُ مجلسٍ يجلس فيه (لا مجرّد تبعيّةٍ لفرعه): `membership_kind = 'member'`
    ...mine.map((r) => seatRoles.get(r.role_name)).filter(Boolean),
    ...committees.map((id) => councilOfCommittee.get(id)).filter(Boolean),
  ] as string[])];
  return {
    committees,
    departments: [...new Set(mine.map((r) => r.department_id).filter((x): x is number => x != null))],
    councils,
    // اللجنةُ التنفيذيّة أوّلًا هدفًا لزرّ «موقعي» — وإلّا فأوّلُ ما له
    home: committees.find((id) => councilOfCommittee.get(id) !== "administrative") ?? committees[0] ?? null,
  };
}
