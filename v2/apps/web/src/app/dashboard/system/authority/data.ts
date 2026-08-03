// يُستورَد من مكوّنات خادمية فقط (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { ROLE_ORDER } from "@/lib/roleOrder";
import { roleTitle } from "@/lib/positionLabel";

/** منصبٌ في المحورين: صفًّا (المُنفّذ) وعمودًا (المقعد المقصود). */
export type AuthRole = { roleName: string; roleAr: string };

/** صفُّ سلطةِ الإسناد كما هو في `position_authority` — بلا تأويل. */
export type PositionAuthorityRow = {
  roleName: string;
  targetRoles: string[];
  ownUnitRoles: string[];
  blockedRoles: string[];
};

/** صفُّ سلطةِ العضويّة كما هو في `membership_authority` — بابٌ آخر لا يختلط بالمناصب. */
export type MembershipAuthorityRow = {
  roleName: string;
  scope: "all" | "supervised" | string;
  blockedRoles: string[];
};

export type AuthorityData = {
  roles: AuthRole[];
  position: PositionAuthorityRow[];
  membership: MembershipAuthorityRow[];
  error: string | null;
};

/**
 * سلطةُ الهيكل — جدولاها كما هما.
 *
 * لا تُحسب هنا ولا تُؤوَّل: الشاشة مرآةُ الجدولين لا حَكَمٌ ثانٍ. ومن أراد أن يعرف ما
 * يفعله صفٌّ فليقرأ `can_assign_role` و`member_within_reach` — هما وحدهما من يقرآنه.
 */
export async function getAuthority(): Promise<AuthorityData> {
  const empty = { roles: [], position: [], membership: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [rRes, cRes, paRes, maRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar, home_committee_id"),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("position_authority").select("role_name, target_roles, own_unit_roles, blocked_roles"),
    sb.from("membership_authority").select("role_name, scope, blocked_roles"),
  ]);
  const err = rRes.error || cRes.error || paRes.error || maRes.error;
  if (err) return { ...empty, error: err.message };

  // اسم المنصب = الرتبة + وحدته الأمّ — يميّز «قائد الموارد» من «قائد» اللجنة في قائمةٍ بلا إسناد.
  const home = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));
  const rank = (name: string) => { const i = ROLE_ORDER.indexOf(name); return i === -1 ? ROLE_ORDER.length : i; };
  const roles: AuthRole[] = (rRes.data ?? [])
    .map((r) => ({
      roleName: r.role_name as string,
      roleAr: roleTitle({
        roleAr: (r.role_name_ar as string) ?? (r.role_name as string),
        homeCommitteeId: r.home_committee_id as number | null,
        homeName: r.home_committee_id != null ? home.get(r.home_committee_id as number) ?? null : null,
      }),
    }))
    .sort((a, b) => rank(a.roleName) - rank(b.roleName));

  const position: PositionAuthorityRow[] = (paRes.data ?? []).map((x) => ({
    roleName: x.role_name as string,
    targetRoles: (x.target_roles as string[]) ?? [],
    ownUnitRoles: (x.own_unit_roles as string[]) ?? [],
    blockedRoles: (x.blocked_roles as string[]) ?? [],
  }));

  const membership: MembershipAuthorityRow[] = (maRes.data ?? []).map((x) => ({
    roleName: x.role_name as string,
    scope: (x.scope as string) ?? "none",
    blockedRoles: (x.blocked_roles as string[]) ?? [],
  }));

  return { roles, position, membership, error: null };
}
