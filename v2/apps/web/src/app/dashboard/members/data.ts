// يُستورَد فقط من مكوّنات خادمية (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { formatDegree } from "./vocab";

export type MemberStatus = "active" | "pending" | "suspended" | "inactive";
export type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  dept: string | null;
  committee: string | null;
  role: string | null;
  status: MemberStatus;
  joined: string;
  joinedRaw: string; // ISO للفرز الزمنيّ الصحيح (بدل النصّ المنسّق)
  // أكاديميّ (من member_details)
  college: string | null;
  major: string | null;
  degree: string | null;
  degreeRaw: string | null; // الرمز الخام للشروط (degree مُعرَّب للعرض، فلا يُقارَن به)
  recordNo: string | null;
  // تواصل اجتماعيّ (من member_details)
  twitter: string | null;
  instagram: string | null;
  tiktok: string | null;
  linkedin: string | null;
  // إنهاء العضوية (للموقوفين) — السبب من termination_reason، والتاريخ الحقيقيّ من terminated_at (يُختَم لحظة الإيقاف عبر تريغر، فلا يتذبذب بتعديلات لاحقة)
  endReason: string | null;
  endDate: string;
  endAgo: string; // مدّة نسبيّة منذ الإنهاء («منذ ٣ أشهر»)
};

const STATUS_MAP: Record<string, MemberStatus> = {
  active: "active",
  pending_onboarding: "pending",
  suspended: "suspended",
  inactive: "inactive",
};

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// مدّة نسبيّة عربيّة — date-fns بلغة ar (مصانة)، مع تلميع للإيجاز والنحو:
// حذف «تقريبًا» و«واحد/واحدة»، وتصحيح «يومان»→«يومين».
const agoPhrase = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: ar })
    .replace(/ تقريب\S*/g, "")
    .replace(/ واحدة/g, "")
    .replace(/ واحد/g, "")
    .replace(/يومان/g, "يومين")
    .trim();
};
const fmtDate = (iso: string | null): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`; // الشهر Lyon + الأرقام Eras تلقائيًّا (تكامل الخطّين)
};

/** جلب الأعضاء من قاعدة البيانات الحيّة (خادميّ، عبر مفتاح الخدمة). */
export async function getMembers(): Promise<{ members: MemberRow[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من أيّ محرف دخيل من اللصق (مسافات/اقتباس/محارف خفيّة) — JWT لا يحوي إلا هذه المحارف
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { members: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [pRes, urRes, rRes, dRes, cRes, mdRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, phone, avatar_url, account_status, joined_date, termination_reason, terminated_at").order("joined_date", { ascending: false }),
    sb.from("user_roles").select("user_id, role_name, department_id, committee_id, assigned_at").eq("is_active", true),
    sb.from("roles").select("role_name, role_name_ar, role_level"),
    sb.from("departments").select("id, name_ar"),
    sb.from("committees").select("id, department_id, committee_name_ar"),
    sb.from("member_details").select("user_id, academic_record_number, academic_degree, college, major, twitter_account, instagram_account, tiktok_account, linkedin_account"),
  ]);

  const firstErr = pRes.error || urRes.error || rRes.error || dRes.error || cRes.error || mdRes.error;
  if (firstErr) return { members: [], error: firstErr.message };

  const roleByName = new Map((rRes.data ?? []).map((r) => [r.role_name, r]));
  const deptById = new Map((dRes.data ?? []).map((d) => [d.id, d.name_ar as string]));
  const committeeDept = new Map((cRes.data ?? []).map((c) => [c.id, c.department_id as number | null]));
  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id, c.committee_name_ar as string]));
  const detailsByUser = new Map((mdRes.data ?? []).map((d) => [d.user_id, d]));

  // أفضل دور نشط لكل عضو (الأعلى رتبةً = أقلّ role_level)
  const bestRole = new Map<string, { role_name: string; department_id: number | null; committee_id: number | null; level: number }>();
  for (const ur of urRes.data ?? []) {
    const level = roleByName.get(ur.role_name)?.role_level ?? 999;
    const cur = bestRole.get(ur.user_id);
    if (!cur || level < cur.level) {
      bestRole.set(ur.user_id, { role_name: ur.role_name, department_id: ur.department_id, committee_id: ur.committee_id, level });
    }
  }

  const members: MemberRow[] = (pRes.data ?? []).map((p) => {
    const br = bestRole.get(p.id);
    const deptId = br?.department_id ?? (br?.committee_id != null ? committeeDept.get(br.committee_id) ?? null : null);
    const md = detailsByUser.get(p.id);
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone ?? null,
      avatar: p.avatar_url ?? null,
      dept: deptId != null ? deptById.get(deptId) ?? null : null,
      committee: br?.committee_id != null ? committeeName.get(br.committee_id) ?? null : null,
      role: br ? roleByName.get(br.role_name)?.role_name_ar ?? null : null,
      status: STATUS_MAP[p.account_status] ?? "inactive",
      joined: fmtDate(p.joined_date),
      joinedRaw: p.joined_date ?? "",
      college: md?.college ?? null,
      major: md?.major ?? null,
      degree: formatDegree(md?.academic_degree),
      degreeRaw: md?.academic_degree ?? null,
      recordNo: md?.academic_record_number ?? null,
      twitter: md?.twitter_account ?? null,
      instagram: md?.instagram_account ?? null,
      tiktok: md?.tiktok_account ?? null,
      linkedin: md?.linkedin_account ?? null,
      endReason: p.termination_reason ?? null,
      endDate: fmtDate(p.terminated_at ? String(p.terminated_at).slice(0, 10) : null),
      endAgo: agoPhrase(p.terminated_at ?? null),
    };
  });

  return { members, error: null };
}
