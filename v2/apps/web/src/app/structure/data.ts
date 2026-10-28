import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { actingLine, rankFor } from "@/lib/positionLabel";
import { buildStructure, type CommitteeNode, type Holder, type RawCommittee, type RawCouncil, type RawDept, type RawProfile, type RawRole, type RawUserRole } from "../dashboard/members/structure/model";

/**
 * **هيكلةُ أدِيب كما تُقال للناس** — النموذجُ نفسُه الذي تبنيه غرفة الهيكلة (`buildStructure`)،
 * مقصوصًا إلى ما يُنشَر. فلا شجرةٌ ثانية تُبنى من الصفوف، ولا عددٌ يفترق عن اللوحة.
 *
 * ### ما يُقصّ ولماذا
 * - **كلُّ وحدةٍ قائمة تُنشَر وإن خلت** (عدل المالك ٢٠٢٦-١٠-١٧ عن إسقاط الخالية): الهيكلُ تخطيطٌ
 *   ثابت، والمقعدُ الخالي يُرسم في الصفحة «شاغرًا».
 * - **المشرفان لا يُقالان**: إشرافُ عضو الإدارة على لجنةٍ ليس **فيها** علاقةُ عمل لا موضع،
 *   وصاحبُه ظاهرٌ في إدارته أصلًا.
 * - **حسابُ النادي (`adeeb_admin`) ليس عضوًا**: استثناءٌ مؤسّسيّ خارج المنازل.
 * - **العضويّةُ الساريةُ وحدها**: حدُّ `account_status = 'active'` نفسُه الذي تنخل به الغرفة
 *   (`orgData.ts`)، فالمنتهيةُ عضويّتُه صديقُ أدِيب لا يبقى في كشف لجنته.
 *
 * ### البابُ دالّةٌ آمنة (٢٠٢٦-١٠-١٨، طلبُ المالك)
 * يُقرأ بمفتاح الزائر من `get_public_structure` (SECURITY DEFINER)، وهي تُخرج الحقولَ المنشورة وحدها
 * وتنخل الحسابَ والعضويّةَ في القاعدة، على سَنن `get_board_members` و`get_public_profile`: قانونُ النشر
 * في القاعدة لا في الشاشة. وكان قبلها مفتاحُ الخدمة يقرأ القاعدةَ كلَّها ثمّ يقصّ هنا.
 */

export type PubPerson = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  /** المسمّى بجنس صاحبه — «قائدة» · «منسّق» · «رئيسة أدِيب». فارغٌ للعضو داخل لجنته. */
  title: string | null;
  /** صفحتُه العلنيّة `/m/<slug>`. */
  slug: string | null;
};

export type PubUnit = {
  id: number;
  name: string;
  leader: PubPerson | null;
  deputy: PubPerson | null;
  members: PubPerson[];
  total: number;
};

export type PubDepartment = { id: number; name: string; head: PubPerson | null; units: PubUnit[]; total: number };

export type PubStructure = {
  /** المجلسُ الإداريّ: مقاعدُه المشغولة (رئيسُه أوّلُها دائمًا) وإدارتاه. */
  administrative: { name: string; seats: PubPerson[]; units: PubUnit[] };
  /** المجلسُ التنفيذيّ: رئيسُه وأقسامُه بلجانها. */
  executive: { name: string; head: PubPerson | null; departments: PubDepartment[] };
};

type PublicRows = {
  councils: RawCouncil[]; departments: RawDept[]; committees: RawCommittee[]; roles: RawRole[];
  user_roles: RawUserRole[]; profiles: (RawProfile & { public_slug: string | null })[];
};

export async function getPublicStructure(): Promise<{ data: PubStructure | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return { data: null, error: "أضِف NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY إلى apps/web/.env.local." };
  // بمفتاح الزائر لا بمفتاح الخدمة: القاعدةُ نفسُها لا تُخرج إلّا الحقولَ العلنيّة (`get_public_structure`،
  // ٢٠٢٦-١٠-١٨). والوصفُ ورابطُ المجموعة لا يخرجان، فيُملآن فارغَين ليوافقا شكلَ `buildStructure`.
  const sb = createAdeebServerClient(url, anon);
  const { data: raw, error } = await sb.rpc("get_public_structure");
  if (error) return { data: null, error: error.message };
  const rows = raw as PublicRows;
  const noMeta = { description: null, group_link: null };

  const profiles = rows.profiles;
  const slugOf = new Map(profiles.map((x) => [x.id, x.public_slug ?? null]));
  // المناصبُ مصفّاةٌ في الدالّة: الساريةُ لأصحاب العضويّة الساريةِ، بلا حساب النادي.
  const userRoles = rows.user_roles;

  // الإشرافُ لا يُنشَر، فلا يُجلب: يُمرَّر فارغًا فلا يُبنى مشرفٌ أصلًا.
  const model = buildStructure(
    rows.councils.map((c) => ({ ...c, ...noMeta })),
    rows.departments.map((d) => ({ ...d, ...noMeta })),
    rows.committees.map((c) => ({ ...c, ...noMeta })),
    rows.roles, userRoles, profiles, [],
  );

  const person = (h: Holder, title: string | null): PubPerson => ({
    id: h.userId,
    name: h.name,
    avatar: h.avatar,
    gender: h.gender,
    // والتكليف بلفظه (20261010): «قائد لجنة التسويق تكليفًا»؛ والعضو المكلَّف بلا رتبةٍ «تكليفًا» وحدها
    title: title ? actingLine(rankFor(title, h.gender), !!h.acting) : h.acting ? "تكليفًا" : null,
    slug: slugOf.get(h.userId) ?? null,
  });
  const byName = (a: PubPerson, b: PubPerson) => a.name.localeCompare(b.name, "ar");

  const unit = (n: CommitteeNode): PubUnit => ({
    id: n.id,
    name: n.name,
    leader: n.leader ? person(n.leader, n.leader.roleAr) : null,
    deputy: n.deputy ? person(n.deputy, n.deputy.roleAr) : null,
    members: n.members.map((m) => person(m, null)).sort(byName),
    total: n.total,
  });
  // كلُّ وحدةٍ قائمة تُعرض وإن خلت (٢٠٢٦-١٠-١٧، المالك): الهيكلُ تخطيطٌ ثابت لا يتبدّل بمن حضر —
  // «يدخل اليوم فلا يجد قائدًا للتقارير والأرشفة، ثمّ يدخل بعد أسبوعٍ فيرى العكس». والخالي يُرسم شاغرًا.

  // رئيسُ المجلس أوّلًا (`isHead`) — الصفحةُ تضعه في القلب، فلا يُستنتَج من ترتيب الأدوار
  const seats = [...model.administrative.seats.filter((s) => s.isHead), ...model.administrative.seats.filter((s) => !s.isHead)]
    .flatMap((s) => s.holders.map((h) => person(h, s.roleAr)));

  const departments = model.executive.departments
    .map((dn): PubDepartment => {
      const units = dn.committees.map(unit);
      return { id: dn.id, name: dn.name, head: dn.head ? person(dn.head, dn.head.roleAr) : null, units, total: units.reduce((s, u) => s + u.total, 0) };
    });

  return {
    data: {
      administrative: { name: model.administrative.name, seats, units: model.administrative.committees.map(unit) },
      executive: { name: model.executive.name, head: model.executive.head ? person(model.executive.head, model.executive.headRoleAr) : null, departments },
    },
    error: null,
  };
}
