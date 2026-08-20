"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVolunteeringManager, service } from "@/lib/volunteering";

export type Result = { ok: boolean; message: string; id?: string };

/**
 * أفعالُ غرفة التطوّع.
 *
 * **الحسمُ يمرّ بدوالِّ القاعدة بجلسة الفاعل** (لا بمفتاح الخدمة): القبولُ يقفل مقعدًا،
 * والتقييمُ يُسجَّل باسم من قيّم — و`auth.uid()` هو من يقول من الفاعل، فلو نودي بمفتاح الخدمة
 * لَصار الفاعلُ مجهولًا وردّته الدالّة. والكتابةُ المباشرة (إنشاءُ فرصةٍ وتعديلُها) بمفتاح
 * الخدمة بعد سؤال القدرة ههنا، لأنّ الجداول بلا سياسةِ إدراج.
 */

const oppSchema = z.object({
  title: z.string().trim().min(3, "العنوان قصير"),
  description: z.string().trim().min(10, "اكتب وصفًا للفرصة"),
  // فارغٌ = مفتوحٌ بلا سقف، ورقمٌ = عددٌ مخصَّص
  seats: z.coerce.number().int().min(1, "العدد المخصَّص واحدٌ فأكثر").nullable().optional(),
  startsOn: z.string().trim().optional().or(z.literal("")),
  endsOn: z.string().trim().optional().or(z.literal("")),
  durationNote: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  committeeId: z.coerce.number().int().optional(),
  targetGender: z.enum(["male", "female"]).optional(),
});
export type OppInput = z.input<typeof oppSchema>;

const clean = (v: string | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

export async function saveOpportunity(raw: OppInput, id?: string): Promise<Result> {
  const mgr = await getVolunteeringManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة التطوّع." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const parsed = oppSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "راجع الحقول." };
  const v = parsed.data;
  if (v.endsOn && !v.startsOn) return { ok: false, message: "لا نهايةَ بلا بداية. حدّد تاريخ البداية أو امحُ النهاية." };
  if (v.endsOn && v.startsOn && v.endsOn < v.startsOn) return { ok: false, message: "النهايةُ قبل البداية." };

  const row = {
    title: v.title,
    description: v.description,
    seats: v.seats ?? null,
    starts_on: clean(v.startsOn),
    ends_on: clean(v.endsOn),
    duration_note: clean(v.durationNote),
    location: clean(v.location),
    committee_id: v.committeeId ?? null,
    target_gender: v.targetGender ?? null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await sb.from("volunteer_opportunities").update(row).eq("id", id);
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
    revalidatePath(`/dashboard/volunteering/${id}`);
    revalidatePath("/dashboard/volunteering");
    return { ok: true, message: "حُفظت الفرصة.", id };
  }

  const { data, error } = await sb
    .from("volunteer_opportunities")
    .insert({ ...row, created_by: mgr.userId })
    .select("id")
    .single();
  if (error) return { ok: false, message: `تعذّر الإنشاء: ${error.message}` };

  revalidatePath("/dashboard/volunteering");
  return { ok: true, message: "أُنشئت الفرصة مسوّدةً. افتحها لتظهر للمتطوّعين.", id: (data as { id: string }).id };
}

/** المسوّدةُ تُفتح، والمفتوحةُ تُغلق. والمغلقةُ يبقى سجلُّها يُؤشَّر ويُقيَّم. */
export async function setOpportunityStatus(id: string, status: "open" | "closed" | "draft"): Promise<Result> {
  const mgr = await getVolunteeringManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة التطوّع." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "open") patch.opened_at = now;
  if (status === "closed") patch.closed_at = now;

  const { error } = await sb.from("volunteer_opportunities").update(patch).eq("id", id);
  if (error) return { ok: false, message: `تعذّر التنفيذ: ${error.message}` };

  revalidatePath("/dashboard/volunteering");
  revalidatePath(`/dashboard/volunteering/${id}`);
  return {
    ok: true,
    message: status === "open" ? "فُتحت الفرصة، وصارت تظهر للمتطوّعين." : status === "closed" ? "أُغلقت الفرصة." : "أُعيدت مسوّدةً.",
  };
}

/** كلُّ ما بعده يمرّ بالقاعدة بجلسة الفاعل — النتيجةُ `{ok, message}` كما تردّها الدالّة. */
async function callRpc(fn: string, args: Record<string, unknown>, paths: string[]): Promise<Result> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { ok: false, message: "انتهت جلستك. سجّل دخولك من جديد." };

  const { data, error } = await session.rpc(fn, args);
  if (error) return { ok: false, message: `تعذّر التنفيذ: ${error.message}` };

  const res = (data ?? {}) as { ok?: boolean; message?: string };
  if (res.ok) for (const p of paths) revalidatePath(p);
  return { ok: res.ok === true, message: res.message ?? "تمّ." };
}

export async function decideApplication(id: string, accept: boolean, reason: string, oppId: string): Promise<Result> {
  return callRpc(
    "decide_volunteer_application",
    { p_id: id, p_accept: accept, p_reason: clean(reason) },
    [`/dashboard/volunteering/${oppId}`, "/dashboard/volunteering"],
  );
}

export async function markAttendance(id: string, attendance: "attended" | "absent", oppId: string): Promise<Result> {
  return callRpc("mark_volunteer_attendance", { p_id: id, p_attendance: attendance }, [`/dashboard/volunteering/${oppId}`]);
}

export async function evaluate(
  id: string, deserves: boolean, denialReason: string, adminNote: string, oppId: string,
): Promise<Result> {
  return callRpc(
    "evaluate_volunteer",
    { p_id: id, p_deserves: deserves, p_denial_reason: clean(denialReason), p_admin_note: clean(adminNote) },
    [`/dashboard/volunteering/${oppId}`],
  );
}

export async function issueCertificate(applicationId: string, oppId: string): Promise<Result> {
  return callRpc("issue_participation_certificate", { p_application_id: applicationId }, [`/dashboard/volunteering/${oppId}`]);
}

export async function endVolunteering(userId: string, reason: string): Promise<Result> {
  return callRpc("end_volunteering", { p_user: userId, p_reason: reason }, ["/dashboard/volunteering/volunteers"]);
}

export async function grantMembership(userId: string, committeeId: number): Promise<Result> {
  return callRpc(
    "grant_membership_to_volunteer",
    { p_user: userId, p_committee_id: committeeId },
    ["/dashboard/volunteering/volunteers", "/dashboard/members/active"],
  );
}
