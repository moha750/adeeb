"use server";

import { headers } from "next/headers";
import { createAdeebServiceClient } from "@adeeb/core";
import { socialHandle } from "@/lib/membershipFields";
import { isRegistrationOpen, type RegistrationSettings } from "@/lib/registration";
import { applicationSchema, APPLICATION_SOCIALS, type ApplicationInput } from "./vocab";

export type SubmitApplicationResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<keyof ApplicationInput, string>> };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إرسال طلب عضويّة — البابُ الوحيد للكتابة (submit_membership_application غير ممنوحٍ لـ anon،
 * فيُستدعى بمفتاح الخدمة كنمط submitSurveyResponse). الفعل هو الحارس لا العميل:
 *   • القناة: دعوةٌ صالحة تتجاوز الإغلاق العامّ؛ وإلّا يلزم أن يكون الباب مفتوحًا (isRegistrationOpen).
 *   • اللجنة: يجب أن تكون ضمن المسموح فعلًا (متاحة وغير ممتلئة · أو ضمن لجان الدعوة) — لا نثق باختيار العميل.
 *   • الدعوة تُسجَّل عبر record_invitation_usage وحده (يُدرج الصفّ ويزيد العدّاد)؛ لذا نمرّر p_invitation_id=NULL
 *     إلى submit كي لا يُدرج صفَّ استخدامٍ ثانيًا مكرَّرًا.
 */
export async function submitApplication(raw: ApplicationInput, inviteCode?: string): Promise<SubmitApplicationResult> {
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "راجع الحقول المميّزة بالأحمر.", fieldErrors };
  }
  const v = parsed.data;

  const sb = serviceClient();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص — أبلغ الإدارة." };

  // 1) القناة: دعوة أم باب عامّ
  let invitationId: string | null = null;
  let allowedCommitteeIds: number[] | null = null; // null = كلّ اللجان المتاحة (قناة عامّة أو دعوة بلا تقييد)

  const code = inviteCode?.trim();
  if (code) {
    const { data: rows } = await sb.rpc("validate_invitation", { p_code: code });
    const inv = Array.isArray(rows) ? rows[0] : rows;
    if (!inv?.is_valid) return { ok: false, message: inv?.message || "رابط الدعوة غير صالح أو منتهٍ." };
    invitationId = inv.invitation_id as string;
    if (inv.committee_mode === "single" && inv.selected_committee_id) {
      allowedCommitteeIds = [inv.selected_committee_id as number];
    } else if (inv.committee_mode === "multiple" && Array.isArray(inv.selected_committee_ids)) {
      allowedCommitteeIds = inv.selected_committee_ids as number[];
    }
  } else {
    const { data: settings } = await sb.from("membership_settings").select("*").eq("id", "default").single();
    if (!settings || !isRegistrationOpen(settings as RegistrationSettings, new Date())) {
      return { ok: false, message: "التسجيل في العضويّة مغلقٌ حاليًّا." };
    }
  }

  // 2) اللجنة المختارة ضمن المسموح (اسمٌ عربيّ ⇐ معرّف)
  const { data: committees } = await sb.from("committees").select("id, committee_name_ar");
  const idByName = new Map<string, number>((committees ?? []).map((c: { id: number; committee_name_ar: string }) => [c.committee_name_ar, c.id]));
  const committeeId = idByName.get(v.preferred_committee);
  if (!committeeId) {
    return { ok: false, message: "اللجنة المختارة غير معروفة.", fieldErrors: { preferred_committee: "اختر لجنةً من القائمة" } };
  }

  let allowedIds: Set<number>;
  if (allowedCommitteeIds) {
    allowedIds = new Set(allowedCommitteeIds);
  } else {
    const { data: available } = await sb
      .from("membership_available_committees")
      .select("committee_id, max_applicants, current_applicants")
      .eq("is_available", true);
    allowedIds = new Set(
      (available ?? [])
        .filter((a: { max_applicants: number | null; current_applicants: number | null }) => a.max_applicants == null || (a.current_applicants ?? 0) < a.max_applicants)
        .map((a: { committee_id: number }) => a.committee_id),
    );
  }
  if (!allowedIds.has(committeeId)) {
    return { ok: false, message: "اللجنة المختارة غير متاحة للتقديم حاليًّا.", fieldErrors: { preferred_committee: "اختر لجنةً متاحة" } };
  }

  // 3) تطبيع التواصل للتخزين المعياريّ (معرّف مجرّد أو null) — الصيغة فُحصت في المخطّط
  const socials: Record<string, string | null> = {};
  for (const s of APPLICATION_SOCIALS) {
    const res = socialHandle(s.key, v[s.column]);
    socials[s.column] = res.ok ? res.handle : null;
  }

  // 4) بيانات التتبّع من الطلب
  const h = await headers();
  const userAgent = h.get("user-agent");
  const referer = h.get("referer");
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

  const payload = {
    full_name: v.full_name,
    phone: v.phone,
    email: v.email,
    degree: v.degree,
    college: v.college || null,
    major: v.major || null,
    skills: v.skills || null,
    preferred_committee: v.preferred_committee,
    portfolio_url: v.portfolio_url || null,
    social_twitter: socials.social_twitter,
    social_instagram: socials.social_instagram,
    social_linkedin: socials.social_linkedin,
    about: v.about || null,
    path: referer,
    user_agent: userAgent,
  };

  const { data: newId, error } = await sb.rpc("submit_membership_application", { p: payload, p_invitation_id: null });
  if (error || !newId) return { ok: false, message: "تعذّر إرسال الطلب، حاول لاحقًا." };

  // 5) الدعوة تُسجَّل وتُعَدّ هنا وحدها (يُدرج الصفّ ويزيد العدّاد ويقفلها عند الامتلاء)
  if (invitationId) {
    await sb.rpc("record_invitation_usage", {
      p_invitation_id: invitationId,
      p_application_id: newId as string,
      p_email: v.email,
      p_name: v.full_name,
      p_committee_id: committeeId,
      p_ip_address: ip,
      p_user_agent: userAgent,
    });
  }

  return { ok: true, id: newId as string };
}
