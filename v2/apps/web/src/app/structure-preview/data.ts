import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { rankFor } from "@/lib/positionLabel";
import { buildStructure, type CommitteeNode, type Holder } from "../dashboard/members/structure/model";

/**
 * **هيكلةُ أدِيب كما تُقال للناس** — النموذجُ نفسُه الذي تبنيه غرفة الهيكلة (`buildStructure`)،
 * مقصوصًا إلى ما يُنشَر. فلا شجرةٌ ثانية تُبنى من الصفوف، ولا عددٌ يفترق عن اللوحة.
 *
 * ### ما يُقصّ ولماذا
 * - **الشاغرُ لا يُقال**: في اللوحة عملٌ ينتظر صاحبَه، وفي صفحة الناس فراغٌ لا يُخبر بشيء.
 *   واللجنةُ الخالية (لا أحدَ فيها) تسقط كلُّها.
 * - **المشرفان لا يُقالان**: إشرافُ عضو الإدارة على لجنةٍ ليس **فيها** علاقةُ عمل لا موضع،
 *   وصاحبُه ظاهرٌ في إدارته أصلًا.
 * - **حسابُ النادي (`adeeb_admin`) ليس عضوًا**: استثناءٌ مؤسّسيّ خارج المنازل.
 * - **العضويّةُ الساريةُ وحدها**: حدُّ `account_status = 'active'` نفسُه الذي تنخل به الغرفة
 *   (`orgData.ts`)، فالمنتهيةُ عضويّتُه صديقُ أدِيب لا يبقى في كشف لجنته.
 *
 * ### والمعاينةُ قبل البناء
 * هذا المحمّل بمفتاح الخدمة لأنّ الصفحة اليوم معاينةٌ محروسة بقفل الغرفة. فإن أُقِرّت وصارت
 * علنيّة، صار بابُها دالّةً آمنة (`SECURITY DEFINER`) تُرجع هذه الحقول وحدها، على سَنن
 * `get_board_members` و`get_public_profile` — قانونُ النشر في القاعدة لا في الشاشة.
 */

export type PubPerson = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  /** المسمّى بجنس صاحبه — «قائدة» · «منسّق» · «رئيسة نادي أدِيب». فارغٌ للعضو داخل لجنته. */
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
  counts: { members: number; volunteers: number };
};

const CLUB_ACCOUNT = "adeeb_admin";

export async function getPublicStructure(): Promise<{ data: PubStructure | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  const sb = createAdeebServiceClient(url, key);

  const [c, d, com, r, ur, p, v] = await Promise.all([
    sb.from("councils").select("id, name_ar, head_role_name, description, group_link"),
    sb.from("departments").select("id, name_ar, display_order, description, group_link").eq("is_active", true),
    sb.from("committees").select("id, committee_name_ar, department_id, council_id, leader_role_name, member_role_name, description, group_link").eq("is_active", true),
    sb.from("roles").select("id, role_name, role_name_ar, council_type, is_elected, membership_kind, vote_weight, holder_uniqueness, home_committee_id, prerequisite_role_name"),
    sb.from("user_roles").select("user_id, role_name, committee_id, department_id").eq("is_active", true),
    sb.from("profiles").select("id, full_name, avatar_url, gender, account_status, public_slug").eq("account_status", "active").not("joined_date", "is", null),
    sb.from("volunteers").select("user_id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const error = c.error || d.error || com.error || r.error || ur.error || p.error || v.error;
  if (error) return { data: null, error: error.message };

  const profiles = p.data ?? [];
  const serving = new Set(profiles.map((x) => x.id as string));
  const slugOf = new Map(profiles.map((x) => [x.id as string, (x.public_slug as string | null) ?? null]));
  const userRoles = (ur.data ?? []).filter((x) => serving.has(x.user_id) && x.role_name !== CLUB_ACCOUNT);

  // الإشرافُ لا يُنشَر، فلا يُجلب: يُمرَّر فارغًا فلا يُبنى مشرفٌ أصلًا.
  const model = buildStructure(c.data ?? [], d.data ?? [], com.data ?? [], r.data ?? [], userRoles, profiles, []);

  const person = (h: Holder, title: string | null): PubPerson => ({
    id: h.userId,
    name: h.name,
    avatar: h.avatar,
    gender: h.gender,
    title: title ? rankFor(title, h.gender) : null,
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
  const filled = (u: PubUnit) => u.total > 0;

  // رئيسُ المجلس أوّلًا (`isHead`) — الصفحةُ تضعه في القلب، فلا يُستنتَج من ترتيب الأدوار
  const seats = [...model.administrative.seats.filter((s) => s.isHead), ...model.administrative.seats.filter((s) => !s.isHead)]
    .flatMap((s) => s.holders.map((h) => person(h, s.roleAr)));

  const departments = model.executive.departments
    .map((dn): PubDepartment => {
      const units = dn.committees.map(unit).filter(filled);
      return { id: dn.id, name: dn.name, head: dn.head ? person(dn.head, dn.head.roleAr) : null, units, total: units.reduce((s, u) => s + u.total, 0) };
    })
    .filter((dn) => dn.units.length > 0 || dn.head);

  const counted = new Set<string>();
  for (const x of userRoles) counted.add(x.user_id);

  return {
    data: {
      administrative: { name: model.administrative.name, seats, units: model.administrative.committees.map(unit).filter(filled) },
      executive: { name: model.executive.name, head: model.executive.head ? person(model.executive.head, model.executive.headRoleAr) : null, departments },
      counts: { members: counted.size, volunteers: v.count ?? 0 },
    },
    error: null,
  };
}
