// يُستورَد فقط من مكوّنات خادمية (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { formatDegree } from "./vocab";
import { roleRank } from "@/lib/roleOrder";
import { fmtDateOnly } from "@/lib/date";
import { MEMBER_STATUS_OF, type MemberStatus } from "@/lib/memberStatus";
import { assignmentScope, roleTitle } from "@/lib/positionLabel";
import { getCurrentAdmin } from "@/lib/auth";

// الحالة ومفرداتها في `lib/memberStatus` (مصدرٌ واحد يشاركه العرض) — ويُعاد تصديرها من هنا
// فلا يُكسَر مستوردٌ قائم (`MembersScreen` · `[status]/page` · `CredentialsView`).
export type { MemberStatus };
export type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  gender: "male" | "female" | null; // لأيقونة الأفتار حين لا صورة
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
  /**
   * هل تبلغ سلطةُ قارئ الشاشة هذا الصفّ؟ — جوابان من القاعدة لا من هنا: `members_in_my_reach`
   * تقرأ الحَكَمين نفسَيهما اللذين تقرؤهما الأفعال (`can_end_membership` · `can_edit_member_data`).
   * فالزرّ يغيب حيث يمنع الباب — إخفاءٌ **فوق** منعٍ لا بدلًا منه.
   *
   * ويفترقان في النفس: لا تُنهي عضويّتك، ولك أن تعدّل بياناتك.
   */
  canEnd: boolean;
  canEdit: boolean;
  /**
   * وجوابٌ ثالثٌ من القاعدة: هل يبلغ القارئُ **إنذارَ** هذا العضو (`can_issue_warning`)؟
   * قدرةُ الفعل ومدى السلطة معًا — فبند «إصدار إنذار» يغيب حيث يمنع الباب.
   */
  canWarn: boolean;
  /** عدد إنذاراته السارية — يُقال في نافذة الإصدار («عليه اثنان من ثلاثة»). */
  warnCount: number;
  /**
   * وجوابٌ رابع: هل يبلغ القارئُ إصدارَ **شهادة خبرة** له (`can_issue_certificate`)؟
   * والاقتراحان معه من القاعدة نفسها (`certificate_targets`) لا من هذه الشاشة: الاسمُ الذي
   * سيُرسَم والمسمّى كاملًا — فلا تخترع الواجهةُ لقطةً تخالف ما تكتبه الدالّة.
   */
  canCertify: boolean;
  certName: string | null;
  certPosition: string | null;
  /** شهاداته السارية — تحذيرُ النافذة من إصدارٍ ثانٍ. */
  certCount: number;
  /** لجنتُه بمعرّفها — لقطةٌ تُكتب في الإنذار (اسمُها وحده لا يكفي للكتابة). */
  committeeId: number | null;
};

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
/**
 * جلب الأعضاء من قاعدة البيانات الحيّة (خادميّ، عبر مفتاح الخدمة).
 * ويعود معهم **حدُّ الإنذارات** لأنّ بند «إصدار إنذار» يسكن قائمة العضو — والحدُّ من القاعدة
 * (`warning_limit`) لا رقمٌ محفورٌ في شاشة.
 */
export async function getMembers(): Promise<{ members: MemberRow[]; warningLimit: number; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من أيّ محرف دخيل من اللصق (مسافات/اقتباس/محارف خفيّة) — JWT لا يحوي إلا هذه المحارف
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { members: [], warningLimit: 3, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  // هويّة القارئ — لتُسأل القاعدةُ عمّن تبلغه سلطتُه. بلا هويّة لا مدّ (آمنٌ افتراضًا).
  const me = await getCurrentAdmin();

  const [pRes, urRes, rRes, dRes, cRes, mdRes, reachRes, warnRes, limitRes, certRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, phone, avatar_url, gender, account_status, joined_date, termination_reason, terminated_at").order("joined_date", { ascending: false }),
    sb.from("user_roles").select("user_id, role_name, department_id, committee_id, assigned_at").eq("is_active", true),
    sb.from("roles").select("role_name, role_name_ar, home_committee_id"),
    sb.from("departments").select("id, name_ar"),
    sb.from("committees").select("id, department_id, committee_name_ar"),
    sb.from("member_details").select("user_id, academic_record_number, academic_degree, college, major, twitter_account, instagram_account, tiktok_account, linkedin_account"),
    me ? sb.rpc("members_in_my_reach", { p_actor: me.id }) : Promise.resolve({ data: null, error: null }),
    // ومن يبلغهم إنذارُه — مرآةٌ ثانية للسؤال نفسه بفعلٍ آخر (`can_issue_warning`)
    me ? sb.rpc("members_i_may_warn", { p_actor: me.id }) : Promise.resolve({ data: null, error: null }),
    sb.rpc("warning_limit"),
    // ومن تبلغهم شهادتُه — المرآة نفسها التي تقرؤها غرفة الشهادات، فالاقتراح واحدٌ في الموضعين
    me ? sb.rpc("certificate_targets", { p_actor: me.id }) : Promise.resolve({ data: null, error: null }),
  ]);

  const firstErr = pRes.error || urRes.error || rRes.error || dRes.error || cRes.error || mdRes.error || reachRes.error || warnRes.error || certRes.error;
  if (firstErr) return { members: [], warningLimit: 3, error: firstErr.message };

  const reach = new Map(
    ((reachRes.data ?? []) as Array<{ user_id: string; may_end: boolean; may_edit: boolean }>)
      .map((r) => [r.user_id, r] as const),
  );
  const warnable = new Map(
    ((warnRes.data ?? []) as Array<{ user_id: string; active_count: number }>)
      .map((r) => [r.user_id, r] as const),
  );

  const certifiable = new Map(
    ((certRes.data ?? []) as Array<{
      user_id: string; suggested_name: string; position_title: string | null; issued_count: number;
    }>).map((r) => [r.user_id, r] as const),
  );

  const roleByName = new Map((rRes.data ?? []).map((r) => [r.role_name, r]));
  const deptById = new Map((dRes.data ?? []).map((d) => [d.id, d.name_ar as string]));
  const committeeDept = new Map((cRes.data ?? []).map((c) => [c.id, c.department_id as number | null]));
  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id, c.committee_name_ar as string]));
  const detailsByUser = new Map((mdRes.data ?? []).map((d) => [d.user_id, d]));

  // أفضل دور نشط لكلّ عضو = الأعلى في الترتيب القياسيّ (بالاسم، لا برقم — أُعدم role_level).
  // الأصغر رتبةً = الأعلى؛ والمجهول (لا اسم له في الترتيب) يقع آخرًا فيخسر أمام أيّ دور معروف.
  const bestRole = new Map<string, { role_name: string; department_id: number | null; committee_id: number | null; rank: number }>();
  for (const ur of urRes.data ?? []) {
    const rank = roleRank(ur.role_name);
    const cur = bestRole.get(ur.user_id);
    if (!cur || rank < cur.rank) {
      bestRole.set(ur.user_id, { role_name: ur.role_name, department_id: ur.department_id, committee_id: ur.committee_id, rank });
    }
  }

  const members: MemberRow[] = (pRes.data ?? []).map((p) => {
    const br = bestRole.get(p.id);
    const role = br ? roleByName.get(br.role_name) : undefined;
    const deptId = br?.department_id ?? (br?.committee_id != null ? committeeDept.get(br.committee_id) ?? null : null);
    const md = detailsByUser.get(p.id);
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone ?? null,
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      dept: deptId != null ? deptById.get(deptId) ?? null : null,
      // اسمٌ ووحدة: الاسم يحمل وحدة الدور الأمّ، وخانةُ اللجنة تسكت إن كانت هي إيّاها
      committee: assignmentScope(role?.home_committee_id ?? null, {
        committeeId: br?.committee_id,
        unitName: br?.committee_id != null ? committeeName.get(br.committee_id) ?? null : null,
      }),
      role: role
        ? roleTitle({
            roleAr: role.role_name_ar ?? role.role_name,
            homeCommitteeId: role.home_committee_id,
            homeName: role.home_committee_id != null ? committeeName.get(role.home_committee_id) ?? null : null,
          })
        : null,
      status: MEMBER_STATUS_OF[p.account_status] ?? "inactive",
      joined: fmtDateOnly(p.joined_date),
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
      endDate: fmtDateOnly(p.terminated_at ? String(p.terminated_at).slice(0, 10) : null),
      endAgo: agoPhrase(p.terminated_at ?? null),
      canEnd: reach.get(p.id)?.may_end ?? false,
      canEdit: reach.get(p.id)?.may_edit ?? false,
      canWarn: warnable.has(p.id),
      warnCount: warnable.get(p.id)?.active_count ?? 0,
      canCertify: certifiable.has(p.id),
      certName: certifiable.get(p.id)?.suggested_name ?? null,
      certPosition: certifiable.get(p.id)?.position_title ?? null,
      certCount: certifiable.get(p.id)?.issued_count ?? 0,
      committeeId: br?.committee_id ?? null,
    };
  });

  return { members, warningLimit: typeof limitRes.data === "number" ? limitRes.data : 3, error: null };
}
