import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { toPublicStructure, type PubStructure } from "./shape";
import { buildStructure, type RawCommittee, type RawCouncil, type RawDept, type RawProfile, type RawRole, type RawSupervision, type RawUserRole } from "../dashboard/members/structure/model";
import { toPublicOrg, type PubOrg } from "./org";

/**
 * **هيكلةُ أدِيب كما تُقال للناس** — النموذجُ نفسُه الذي تبنيه غرفة الهيكلة (`buildStructure`)،
 * مقصوصًا إلى ما يُنشَر. فلا شجرةٌ ثانية تُبنى من الصفوف، ولا عددٌ يفترق عن اللوحة.
 *
 * ### ما يُقصّ ولماذا
 * - **كلُّ وحدةٍ قائمة تُنشَر وإن خلت** (عدل المالك ٢٠٢٦-١٠-١٧ عن إسقاط الخالية): الهيكلُ تخطيطٌ
 *   ثابت، والمقعدُ الخالي يُرسم في الصفحة «فارغًا».
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

export type { PubPerson, PubUnit, PubDepartment, PubStructure } from "./shape";

type PublicRows = {
  councils: RawCouncil[]; departments: RawDept[]; committees: RawCommittee[]; roles: RawRole[];
  user_roles: RawUserRole[]; profiles: (RawProfile & { public_slug: string | null })[];
  /** مقاعدُ الإشراف (`structure_02`، ٢٠٢٦-١١-٢١) */
  supervision?: RawSupervision[];
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

  return { data: toPublicStructure(model, slugOf), error: null };
}

/**
 * **الهيكلةُ بالبناء الجديد** (٢٠٢٦-١١-٢١): البابُ نفسُه (`get_public_structure`)، وقد صار يُخرج التعريفاتِ ومقاعدَ الإشراف
 * (`structure_02`). فيُبنى النموذجُ بهما، ويُقصّ بـ`toPublicOrg`. ولا رابطَ مجموعةٍ يُمرَّر: ليس للعامّة.
 */
export async function getPublicOrg(): Promise<{ data: PubOrg | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return { data: null, error: "أضِف NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY إلى apps/web/.env.local." };
  const sb = createAdeebServerClient(url, anon);
  const { data: raw, error } = await sb.rpc("get_public_structure");
  if (error) return { data: null, error: error.message };
  const rows = raw as PublicRows;
  const noLink = { group_link: null };
  const slugOf = new Map(rows.profiles.map((x) => [x.id, x.public_slug ?? null]));
  // اسمُ كلّ إدارةٍ بدور أعضائها: به يُسمّى مقعدُ إشرافها الفارغ («من إدارة الضمان والجودة»)
  const memberRoleUnit = new Map(
    rows.committees.filter((c) => c.council_id === "administrative" && c.committee_name_ar).map((c) => [c.member_role_name, c.committee_name_ar as string]),
  );
  const model = buildStructure(
    rows.councils.map((c) => ({ ...c, description: c.description ?? null, ...noLink })),
    rows.departments.map((d) => ({ ...d, description: d.description ?? null, ...noLink })),
    rows.committees.map((c) => ({ ...c, description: c.description ?? null, ...noLink })),
    rows.roles, rows.user_roles, rows.profiles, rows.supervision ?? [],
  );
  const org = toPublicOrg(model, slugOf, memberRoleUnit);
  // **رمزُ كلّ وحدةٍ كما اختارته الإدارة** (`structure_03`، ٢٠٢٦-١١-٢٤): يُلصق بمعرّفه بعد البناء، فلا يمسّ النموذجَ المشترك مع البوّابة
  const unitIcon = new Map(rows.committees.map((c) => [c.id, c.icon ?? null]));
  const deptIcon = new Map(rows.departments.map((d) => [d.id, d.icon ?? null]));
  for (const u of org.administrative.units) u.icon = unitIcon.get(u.id) ?? null;
  for (const d of org.executive.departments) {
    d.icon = deptIcon.get(d.id) ?? null;
    for (const u of d.units) u.icon = unitIcon.get(u.id) ?? null;
  }
  return { data: org, error: null };
}
