// يُستورَد من مكوّنات خادمية فقط (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { ROLE_ORDER } from "@/lib/roleOrder";
import { DASHBOARD_CAPS } from "@/lib/capabilities";
import { seatScope, type SeatScope } from "@/lib/preview-seat";
import { roleTitle } from "@/lib/positionLabel";
import type { PermRole, Capability } from "./vocab";

/** اسم المنصب = الرتبة + وحدته الأمّ — يميّز «قائد الموارد» من «قائد» اللجنة في قائمةٍ بلا إسناد. */
function titler(committees: { id: number; committee_name_ar: string }[]) {
  const home = new Map(committees.map((c) => [c.id, c.committee_name_ar]));
  return (r: { role_name: string; role_name_ar: string | null; home_committee_id: number | null }) =>
    roleTitle({
      roleAr: r.role_name_ar ?? r.role_name,
      homeCommitteeId: r.home_committee_id,
      homeName: r.home_committee_id != null ? home.get(r.home_committee_id) ?? null : null,
    });
}

export type PermMatrix = {
  roles: PermRole[];
  capabilities: Capability[];
  granted: string[]; // "roleName:permId" لكلّ منحٍ قائم — مصدر حقيقة العرض
  error: string | null;
};

/**
 * المصفوفة (منصب × قدرة) — خادميّ، عبر مفتاح الخدمة (يتجاوز RLS بأمان).
 *
 * لا تُعرَض إلّا القدرات التي تفتح غرفةً في اللوحة (`DASHBOARD_CAPS` — المصدر الواحد في
 * `lib/capabilities.ts`). فما في `permissions` ولا قفل له هنا مفتاحٌ لبابٍ غير مبنيّ:
 * تبديله يكتب صفًّا ولا يغيّر شيئًا يراه أحد. ومن أراد إظهار قدرةٍ فليبنِ غرفتها أوّلًا،
 * فتظهر هنا من تلقائها.
 */
export async function getPermissionMatrix(): Promise<PermMatrix> {
  const empty = { roles: [], capabilities: [], granted: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [rRes, pRes, rpRes, cRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, home_committee_id"),
    sb.from("permissions").select("id, permission_key, permission_name_ar, category").in("permission_key", [...DASHBOARD_CAPS]),
    sb.from("role_permissions").select("role_name, permission_id"),
    sb.from("committees").select("id, committee_name_ar"),
  ]);
  const err = rRes.error || pRes.error || rpRes.error || cRes.error;
  if (err) return { ...empty, error: err.message };
  const title = titler(cRes.data ?? []);

  // المناصب مرتّبةٌ بالترتيب القياسيّ (بالاسم، لا برقم — أُعدم role_level).
  const rank = (name: string) => { const i = ROLE_ORDER.indexOf(name); return i === -1 ? ROLE_ORDER.length : i; };
  const roles: PermRole[] = (rRes.data ?? [])
    .map((r) => ({ roleName: r.role_name as string, roleAr: title(r) }))
    .sort((a, b) => rank(a.roleName) - rank(b.roleName));

  const capabilities: Capability[] = (pRes.data ?? [])
    .map((p) => ({ id: p.id as number, key: p.permission_key as string, nameAr: (p.permission_name_ar as string) ?? (p.permission_key as string), category: (p.category as string) ?? "" }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.nameAr.localeCompare(b.nameAr, "ar"));

  const granted = (rpRes.data ?? []).map((x) => `${x.role_name}:${x.permission_id}`);

  return { roles, capabilities, granted, error: null };
}

/** عضوٌ قائمٌ في منصبه — هدفٌ صالح للمعاينة. */
export type ViewAsTarget = { id: string; name: string; roleAr: string };

/**
 * أهداف المعاينة — كلّ عضوٍ **نشطٍ** يشغل منصبًا، مُجمَّعًا بمنصبه.
 *
 * الهدف شخصٌ لا منصب — عمدًا: نطاق نصف التبويبات هويّةٌ لا قدرة (قائد الموارد يوزّع
 * وحدته هو)، فمعاينةُ «المنصب» مجرّدًا لا معنى لها. والمنصب هنا مجموعةٌ للعرض ليعرف
 * المُعاين بعينَي من ينظر.
 */
export async function getViewAsTargets(): Promise<ViewAsTarget[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return [];
  const sb = createAdeebServiceClient(url, key);

  const [rRes, urRes, pRes, cRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, home_committee_id"),
    sb.from("user_roles").select("user_id, role_name").eq("is_active", true),
    sb.from("profiles").select("id, full_name").eq("account_status", "active"),
    sb.from("committees").select("id, committee_name_ar"),
  ]);
  if (rRes.error || urRes.error || pRes.error || cRes.error) return [];

  const title = titler(cRes.data ?? []);
  // خريطةٌ واحدة بالاسم — كانت خريطتين بالرقم (رقم←عربيّ ورقم←اسم) لأنّ الصفّ يحمل الرقم.
  const roleAr = new Map((rRes.data ?? []).map((r) => [r.role_name as string, title(r)]));
  const name = new Map((pRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) ?? "عضو"]));

  // العضو الواحد قد يحمل صفوفًا كثيرة (المشرف الإداريّ صفٌّ لكلّ لجنة) — يُعرَض مرّةً بأعلى مناصبه
  const rank = (n: string | undefined) => { const i = ROLE_ORDER.indexOf(n ?? ""); return i === -1 ? ROLE_ORDER.length : i; };
  const best = new Map<string, string>();
  for (const ur of urRes.data ?? []) {
    const uid = ur.user_id as string;
    const rn = ur.role_name as string;
    if (!name.has(uid)) continue; // غير نشطٍ — لا يُعايَن
    const cur = best.get(uid);
    if (cur === undefined || rank(rn) < rank(cur)) best.set(uid, rn);
  }

  return [...best.entries()]
    .map(([id, rn]) => ({ id, name: name.get(id)!, roleAr: roleAr.get(rn) ?? "بلا منصب", rank: rank(rn) }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ar"))
    .map(({ id, name: n, roleAr: r }) => ({ id, name: n, roleAr: r }));
}

/** منصبٌ بلا شاغل — يُعايَن بإجلاس الشاغل المؤقّت عليه (`lib/preview-seat.ts`). */
export type VacantSeat = { roleName: string; roleAr: string; scope: SeatScope; units: { id: number; name: string }[] };

/**
 * المناصب الشاغرة — كلّ دورٍ لا يشغله عضوٌ نشط، ومعه **الوحدات التي يصحّ فيها**.
 *
 * الوحدات مقروءةٌ من الهيكلة لا مُخمَّنة: من يقود وحدةً (`leader_role_name`) وحداتُه هي؛
 * ومن كان دورَ عضوها (`member_role_name`) فوحدتُه أمُّه — إدارةً كانت أو لجنة. (كانت وحداتُ
 * عضو الإدارة لجانَ التنفيذيّ يوم كان الإشراف منصبًا فيها؛ وقد فُصل الإشراف عن الانتماء
 * فصار يُسنَد إلى إدارته وحدها — وهو ما يقبله `assign_position` اليوم ولا يقبل غيره.)
 */
export async function getVacantPositions(): Promise<VacantSeat[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return [];
  const sb = createAdeebServiceClient(url, key);

  const [rRes, urRes, pRes, cRes, dRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, home_committee_id"),
    sb.from("user_roles").select("user_id, role_name").eq("is_active", true),
    sb.from("profiles").select("id").eq("account_status", "active"),
    sb.from("committees").select("id, committee_name_ar, council_id, leader_role_name, member_role_name").eq("is_active", true),
    sb.from("departments").select("id, name_ar").eq("is_active", true),
  ]);
  if (rRes.error || urRes.error || pRes.error || cRes.error || dRes.error) return [];

  const title = titler(cRes.data ?? []);
  const active = new Set((pRes.data ?? []).map((p) => p.id as string));
  const occupied = new Set((urRes.data ?? []).filter((ur) => active.has(ur.user_id as string)).map((ur) => ur.role_name as string));

  const committees = (cRes.data ?? []).map((c) => ({
    id: c.id as number,
    name: (c.committee_name_ar as string) ?? `لجنة #${c.id}`,
    council: c.council_id as string,
    leader: c.leader_role_name as string | null,
    member: c.member_role_name as string | null,
  }));
  const executive = committees.filter((c) => c.council === "executive").map((c) => ({ id: c.id, name: c.name }));
  const departments = (dRes.data ?? []).map((d) => ({ id: d.id as number, name: (d.name_ar as string) ?? `قسم #${d.id}` }));

  const unitsFor = (roleName: string): { id: number; name: string }[] => {
    const leads = committees.filter((c) => c.leader === roleName);
    if (leads.length) return leads.map((c) => ({ id: c.id, name: c.name }));
    const home = committees.find((c) => c.member === roleName);
    if (home) return [{ id: home.id, name: home.name }];
    return executive; // دورٌ لا تسمّيه وحدةٌ بعينها — مقاعدُه لجانُ التنفيذيّ
  };

  const rank = (name: string) => { const i = ROLE_ORDER.indexOf(name); return i === -1 ? ROLE_ORDER.length : i; };
  return (rRes.data ?? [])
    .filter((r) => !occupied.has(r.role_name as string))
    .map((r) => {
      const roleName = r.role_name as string;
      const scope = seatScope(roleName);
      return {
        roleName,
        roleAr: title(r),
        scope,
        units: scope === "committee" ? unitsFor(roleName) : scope === "department" ? departments : [],
        rank: rank(roleName),
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ roleName, roleAr, scope, units }) => ({ roleName, roleAr, scope, units }));
}
