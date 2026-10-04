"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVolunteeringManager, service } from "@/lib/volunteering";
import { AR_CERTIFICATE, arCount } from "@/lib/arabicCount";
import { clubNow, periodEnded, periodStarted, type ClubNow } from "@/lib/volunteerPeriods";
import { listVolunteers, type VolunteerRow } from "./data";

export type Result = { ok: boolean; message: string; id?: string };

/**
 * أفعالُ غرفة التطوّع.
 *
 * **الحسمُ يمرّ بدوالِّ القاعدة بجلسة الفاعل** (لا بمفتاح الخدمة): القبولُ يقفل مقعدًا،
 * والتقييمُ يُسجَّل باسم من قيّم — و`auth.uid()` هو من يقول من الفاعل، فلو نودي بمفتاح الخدمة
 * لَصار الفاعلُ مجهولًا وردّته الدالّة. والكتابةُ المباشرة (إنشاءُ فرصةٍ وتعديلُها) بمفتاح
 * الخدمة بعد سؤال القدرة ههنا، لأنّ الجداول بلا سياسةِ إدراج.
 */

/**
 * ساعةُ حقل `time`: «HH:MM» بخانتين (وقد يُرسل المتصفّحُ ثوانيَ إن ضاق الـ`step`). والخانتان شرطٌ لا
 * زينة: بهما تصحّ مقارنةُ الساعتين نصًّا («09:00» < «16:00»)، فلا يُحلَّل وقتٌ ولا يمرّ بمنطقة.
 */
const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const isClock = (v: string) => v === "" || CLOCK_RE.test(v);

/** معرّفُ صفٍّ في القاعدة: ما لم يكن على صورته لا يُرسَل إليها (الدفعةُ تأتي من المتصفّح). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * **الفترة** (٢٠٢٦-١٠-٠١): يومٌ وساعتان وعدد. والعددُ فارغٌ = بلا سقف. و`id` للفترة القائمة حين تُعدَّل
 * فرصتُها، وغيابُه فترةٌ جديدة. والتحقّقُ بالعربيّة في الفعل، ثمّ قيودُ القاعدة (`period_hours`، `period_seats`).
 */
const periodSchema = z.object({
  id: z.string().regex(UUID_RE).optional(),
  day: z.string().trim(),
  from: z.string().trim(),
  to: z.string().trim(),
  seats: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int("العددُ رقمٌ صحيح").min(1, "عددُ الفترة واحدٌ فأكثر").nullable(),
  ),
});

const oppSchema = z.object({
  title: z.string().trim().min(3, "العنوان قصير"),
  description: z.string().trim().min(10, "اكتب وصفًا للفرصة"),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  committeeId: z.coerce.number().int().optional(),
  targetGender: z.enum(["male", "female"]).optional(),
  /** فتراتُ الفرصة: موعدُها ومقاعدُها عليها لا على الفرصة (تواريخُ الفرصة تتبعها بمشغّلٍ في القاعدة). */
  periods: z.array(periodSchema).max(40, "أربعون فترةً حدٌّ أقصى"),
  /**
   * **مرنة** (٢٠٢٦-١٠-٠١): بلا فترات، وعددُها على الفرصة (`seats`)، و`endsOn` آخرُ يومٍ اختياريّ. ولا يُقرأ
   * الحقلان إلّا فيها: موعدُ ذات الفترات فتراتُها.
   */
  flexible: z.boolean().optional(),
  seats: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int("العددُ رقمٌ صحيح").min(1, "العددُ واحدٌ فأكثر").nullable(),
  ).optional(),
  endsOn: z.string().trim().optional(),
});
export type OppInput = z.input<typeof oppSchema>;
export type PeriodInput = z.input<typeof periodSchema>;

const clean = (v: string | undefined): string | null => {
  const t = v?.replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  return t ? t : null;
};

/** فحصُ الفترات قبل القاعدة: رسالةٌ عربيّةٌ تسمّي الفترة برقمها كما يراه المشرف. */
function periodProblem(ps: z.output<typeof periodSchema>[]): string | null {
  for (const [i, p] of ps.entries()) {
    const n = i + 1;
    if (!DATE_RE.test(p.day)) return `حدّد يومَ الفترة ${n}.`;
    if (!p.from || !p.to) return `حدّد ساعتَي الفترة ${n}: من الساعة وإلى الساعة.`;
    if (!isClock(p.from) || !isClock(p.to)) return `ساعتا الفترة ${n} ليستا وقتًا صالحًا.`;
    // وتعبر منتصفَ الليل («من 8 م إلى 12 ص»)، والممنوعُ المدى الصفريّ وحدَه (قيدُ `period_hours`)
    if (p.from.slice(0, 5) === p.to.slice(0, 5)) return `«إلى الساعة» في الفترة ${n} هي «من الساعة» نفسُها.`;
  }
  return null;
}

/**
 * **لا موعدَ في الماضي** (أمرُ المالك ٢٠٢٦-١٠-٠٢: «التاريخُ والساعة لا يقبلان أقلَّ من الوقت الفعليّ»): فترةٌ
 * جديدةٌ أو غُيّر يومُها أو ساعةُ بدئها لا تبدأ قبل الآن بساعة النادي. وما بقي على حاله يُترك: فترةٌ مضت وعليها
 * حضورٌ تُحفظ فرصتُها بعدها كما هي، ولو رُدّت لَما حُفظ وصفٌ صُحّح فيها.
 */
function pastProblem(
  ps: { id?: string; day: string; starts_at: string }[],
  was: Map<string, { day: string; starts_at: string }>,
  now: ClubNow,
): string | null {
  for (const [i, p] of ps.entries()) {
    const o = p.id ? was.get(p.id) : undefined;
    if (o && o.day === p.day && o.starts_at.slice(0, 5) === p.starts_at) continue;
    if (periodStarted({ day: p.day, from: p.starts_at }, now)) {
      return p.day < now.day
        ? `يومُ الفترة ${i + 1} مضى. اختر يومًا قادمًا.`
        : `ساعةُ بدء الفترة ${i + 1} مضت. اختر ساعةً قادمة.`;
    }
  }
  return null;
}
const DEADLINE_PAST = "آخرُ موعدٍ للإنجاز مضى. اختر يومًا قادمًا، أو اتركه فارغًا.";

/**
 * `publish`: الإنشاءُ ينشر مباشرةً أو يحفظ مسوّدة (أمرُ المالك ٢٠٢٦-١٠-٠١: «ضغطتين، أنشئ ثمّ انشر»). كانت كلُّ
 * فرصةٍ تُنشأ مسوّدةً حذرَ أن تظهر نصفَ مكتوبة، والنشرُ لا يرسل إشعارًا ولا بريدًا ويُتراجَع عنه، فالحذرُ لا يستحقّ
 * خطوةً في كلّ مرّة. فصار النشرُ الزرَّ الأساس، والمسوّدةُ اختيارُ من يريد أن يكمل لاحقًا. ولا أثرَ له في التعديل.
 *
 * **والموعدُ فتراتٌ** (٢٠٢٦-١٠-٠١): لا تُنشر فرصةٌ بلا فترة، والمسوّدةُ تُحفظ بلا فترةٍ لتكمَل. وفي التعديل تُزامَن
 * الفتراتُ بما في النافذة (تُحدَّث القائمة، وتُحذف الغائبة، وتُدرج الجديدة)، إلّا ما يحمي الطلبات: فترةٌ عليها
 * طلباتٌ لا تُحذف، ولا ينزل عددُها تحت من قُبل فيها، وفرصةٌ قبل الفترات عليها طلباتٌ للفرصة كلِّها لا تُضاف لها فترات.
 */
export async function saveOpportunity(raw: OppInput, id?: string, publish = false): Promise<Result> {
  const mgr = await getVolunteeringManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة التطوّع." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const parsed = oppSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "راجع الحقول." };
  const v = parsed.data;
  const flexible = v.flexible === true;
  if (flexible && v.periods.length) return { ok: false, message: "الفرصةُ المرنة لا فتراتَ لها." };
  const deadline = flexible && v.endsOn ? v.endsOn : null;
  if (deadline && !DATE_RE.test(deadline)) return { ok: false, message: "آخرُ موعدٍ للإنجاز ليس تاريخًا صالحًا." };
  const problem = periodProblem(v.periods);
  if (problem) return { ok: false, message: problem };
  const now = clubNow();
  // المرنةُ: عددُها وآخرُ يومها على الفرصة، ولا بدايةَ لها (قيدُ `opportunity_dates`)
  const flexRow = { flexible: true, seats: v.seats ?? null, starts_on: null, ends_on: deadline, daily_from: null, daily_to: null, duration_note: null };

  const periods = v.periods.map((p) => ({
    id: p.id, day: p.day, starts_at: p.from.slice(0, 5), ends_at: p.to.slice(0, 5), seats: p.seats ?? null,
  }));
  const base = {
    title: v.title,
    description: v.description,
    location: clean(v.location),
    committee_id: v.committeeId ?? null,
    target_gender: v.targetGender ?? null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const [{ data: opp }, { data: existing }, { data: apps }] = await Promise.all([
      sb.from("volunteer_opportunities").select("status, flexible, ends_on").eq("id", id).maybeSingle(),
      sb.from("volunteer_opportunity_periods").select("id, day, starts_at").eq("opportunity_id", id),
      sb.from("volunteer_applications").select("period_id, status").eq("opportunity_id", id).neq("status", "withdrawn"),
    ]);
    if (!opp) return { ok: false, message: "لا وجود لهذه الفرصة." };
    const was = new Map(((existing ?? []) as { id: string; day: string; starts_at: string }[]).map((r) => [r.id, r]));
    const had = new Set(was.keys());
    const live = (apps ?? []) as { period_id: string | null; status: string }[];
    const wasFlexible = (opp as { flexible: boolean }).flexible;

    // **إلى مرنة**: فتراتُها تُحذف إن لم تكن عليها طلبات (فيُخليها المشغّل)، ثمّ يُكتب عددُها وآخرُ يومها
    if (flexible) {
      // آخرُ يومٍ لم يتغيّر يُترك ولو مضى: هو ما أنهاها، والحفظُ لا يُعيدها
      const sameDeadline = wasFlexible && deadline === ((opp as { ends_on: string | null }).ends_on ?? null);
      if (deadline && !sameDeadline && deadline < now.day) return { ok: false, message: DEADLINE_PAST };
      if (live.some((a) => a.period_id != null)) {
        return { ok: false, message: "فتراتُها عليها طلبات، فلا تصير مرنة. راجع طلباتها في سجلّ الفرصة أوّلًا." };
      }
      const taken = live.filter((a) => a.period_id == null && a.status === "accepted").length;
      if (v.seats != null && taken > v.seats) return { ok: false, message: `قُبل فيها ${taken}، فلا ينزل عددُها عن ذلك.` };
      if (had.size) {
        const { error: e } = await sb.from("volunteer_opportunity_periods").delete().eq("opportunity_id", id);
        if (e) return { ok: false, message: `تعذّر حذف الفترات: ${e.message}` };
      }
      const { error } = await sb.from("volunteer_opportunities").update({ ...base, ...flexRow }).eq("id", id);
      if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
      revalidatePath(`/dashboard/volunteering/${id}`);
      revalidatePath("/dashboard/volunteering");
      return { ok: true, message: "حُفظت الفرصة.", id };
    }

    if (had.size === 0 && live.some((a) => a.period_id == null) && periods.length > 0) {
      return { ok: false, message: "هذه فرصةٌ قبل الفترات وعليها طلباتٌ للفرصة كلِّها، فلا تُضاف لها فترات." };
    }
    if ((opp as { status: string }).status === "open" && had.size > 0 && periods.length === 0) {
      return { ok: false, message: "الفرصةُ منشورة، فلا تبقى بلا فترة." };
    }
    if (periods.some((p) => p.id && !had.has(p.id))) return { ok: false, message: "فترةٌ لا تتبع هذه الفرصة." };
    const past = pastProblem(periods, was, now);
    if (past) return { ok: false, message: past };
    const keep = new Set(periods.map((p) => p.id).filter(Boolean));
    const removed = [...had].filter((pid) => !keep.has(pid));
    if (removed.some((pid) => live.some((a) => a.period_id === pid))) {
      return { ok: false, message: "فترةٌ حذفتَها عليها طلبات. أبقِها، أو راجع طلباتها في سجلّ الفرصة أوّلًا." };
    }
    for (const [i, p] of periods.entries()) {
      if (!p.id || p.seats == null) continue;
      const taken = live.filter((a) => a.period_id === p.id && a.status === "accepted").length;
      if (taken > p.seats) {
        return { ok: false, message: `قُبل في الفترة ${i + 1} ${taken}، فلا ينزل عددُها عن ذلك.` };
      }
    }

    // **من مرنةٍ إلى فترات**: تُخلى حقولُها أوّلًا، فالمشغّلُ يردّ فترةً على مرنة
    const leave = wasFlexible ? { flexible: false, seats: null, ends_on: null, ended_at: null } : {};
    const { error } = await sb.from("volunteer_opportunities").update({ ...base, ...leave }).eq("id", id);
    if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };
    if (removed.length) {
      const { error: e } = await sb.from("volunteer_opportunity_periods").delete().in("id", removed);
      if (e) return { ok: false, message: `تعذّر حذف الفترة: ${e.message}` };
    }
    for (const p of periods.filter((x) => x.id)) {
      const { error: e } = await sb.from("volunteer_opportunity_periods")
        .update({ day: p.day, starts_at: p.starts_at, ends_at: p.ends_at, seats: p.seats }).eq("id", p.id!);
      if (e) return { ok: false, message: `تعذّر حفظ الفترة: ${e.message}` };
    }
    const fresh = periods.filter((x) => !x.id);
    if (fresh.length) {
      const { error: e } = await sb.from("volunteer_opportunity_periods").insert(
        fresh.map((p) => ({ opportunity_id: id, day: p.day, starts_at: p.starts_at, ends_at: p.ends_at, seats: p.seats })),
      );
      if (e) return { ok: false, message: `تعذّر إضافة الفترة: ${e.message}` };
    }
    revalidatePath(`/dashboard/volunteering/${id}`);
    revalidatePath("/dashboard/volunteering");
    return { ok: true, message: "حُفظت الفرصة.", id };
  }

  if (publish && !flexible && periods.length === 0) {
    return { ok: false, message: "أضف فترةً واحدةً على الأقلّ قبل النشر، أو اجعلها مرنة." };
  }
  if (deadline && deadline < now.day) return { ok: false, message: DEADLINE_PAST };
  const past = pastProblem(periods, new Map(), now);
  if (past) return { ok: false, message: past };

  const { data, error } = await sb
    .from("volunteer_opportunities")
    .insert({
      ...base, ...(flexible ? flexRow : {}), created_by: mgr.userId,
      ...(publish ? { status: "open", opened_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: `تعذّر الإنشاء: ${error.message}` };
  const newId = (data as { id: string }).id;

  if (periods.length) {
    const { error: e } = await sb.from("volunteer_opportunity_periods").insert(
      periods.map((p) => ({ opportunity_id: newId, day: p.day, starts_at: p.starts_at, ends_at: p.ends_at, seats: p.seats })),
    );
    if (e) {
      // لا تبقى فرصةٌ منشورةٌ بلا فترات إن رُدّت فتراتُها: تُمحى ويُعاد الأمرُ إلى صاحبه
      await sb.from("volunteer_opportunities").delete().eq("id", newId);
      return { ok: false, message: `تعذّر حفظ الفترات: ${e.message}` };
    }
  }

  revalidatePath("/dashboard/volunteering");
  return {
    ok: true,
    message: publish ? "نُشرت الفرصة، وصارت متاحة للتقديم." : "حُفظت الفرصة مسوّدةً. انشرها حين تكتمل.",
    id: newId,
  };
}

/** المسوّدةُ تُفتح، والمفتوحةُ تُغلق. والمغلقةُ يبقى سجلُّها يُؤشَّر ويُقيَّم. */
export async function setOpportunityStatus(id: string, status: "open" | "closed" | "draft"): Promise<Result> {
  const mgr = await getVolunteeringManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة التطوّع." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  // لا تُنشر فرصةٌ بلا موعد: فترةٌ واحدةٌ على الأقلّ، أو تاريخٌ في فرصةٍ قبل الفترات. **ولا بموعدٍ انتهى**
  // (جردُ الخلل، ٢٠٢٦-١٠-٠٣): مسوّدةٌ انتهت فتراتُها كلُّها تُنشر لتُغلق في الدقيقة نفسها، فتُردّ بما يُصلحها
  if (status === "open") {
    const [{ data: ps }, { data: o }] = await Promise.all([
      sb.from("volunteer_opportunity_periods").select("day, starts_at, ends_at").eq("opportunity_id", id),
      sb.from("volunteer_opportunities").select("starts_on, ends_on, daily_from, daily_to, flexible").eq("id", id).maybeSingle(),
    ]);
    const periods = (ps ?? []) as { day: string; starts_at: string; ends_at: string }[];
    const row = o as { starts_on: string | null; ends_on: string | null; daily_from: string | null; daily_to: string | null; flexible: boolean } | null;
    if (!periods.length && !row?.starts_on && !row?.flexible) {
      return { ok: false, message: "أضف فترةً واحدةً على الأقلّ قبل النشر، أو اجعلها مرنة." };
    }
    const now = clubNow();
    if (periods.length && periods.every((p) => periodEnded({ day: p.day, from: p.starts_at, to: p.ends_at }, now))) {
      return { ok: false, message: "فتراتها كلها مضت، أضف فترات جديدة." };
    }
    if (row?.flexible && row.ends_on && row.ends_on < now.day) {
      return { ok: false, message: "آخرُ موعدٍ للإنجاز مضى، فعدّله أو اتركه فارغًا قبل النشر." };
    }
    const last = row && !row.flexible && !periods.length ? (row.ends_on ?? row.starts_on) : null;
    if (last && (row?.daily_to
      ? periodEnded({ day: last, from: row.daily_from ?? "00:00", to: row.daily_to }, now)
      : last < now.day)) {
      return { ok: false, message: "موعدُها مضى، فعدّله قبل النشر." };
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  // سببُ الإغلاق (٢٠٢٦-١٠-٠٣): إغلاقُ اليد لا يفتحه اعتذارُ مقبول، وما أغلقه الاكتمالُ يفتحه (`excuse_my_application`)
  if (status === "open") { patch.opened_at = now; patch.closed_reason = null; }
  if (status === "closed") { patch.closed_at = now; patch.closed_reason = "manual"; }

  const { error } = await sb.from("volunteer_opportunities").update(patch).eq("id", id);
  if (error) return { ok: false, message: `تعذّر التنفيذ: ${error.message}` };

  revalidatePath("/dashboard/volunteering");
  revalidatePath(`/dashboard/volunteering/${id}`);
  return {
    ok: true,
    message: status === "open" ? "نُشرت الفرصة، وصارت متاحة للتقديم." : status === "closed" ? "انتهى التقديم على الفرصة." : "أُعيدت مسوّدةً.",
  };
}

/**
 * **إنهاءُ الفرصة المرنة** (أمرُ المالك ٢٠٢٦-١٠-٠١: «تاريخٌ اختياريّ مع زرّ إنهاء»): المرنةُ بلا يومٍ أخيرٍ لا
 * تنقضي وحدَها، ومن أراد إنهاءها قبل يومها الأخير أنهاها. فيُكتب `ended_at` وينتهي التقديم، فتنقضي (`timeOf`)
 * ويصير عليه تسجيلُ إنجاز المقبولين وتقييمُهم، كما بعد يوم الفرصة ذات الموعد.
 */
export async function endOpportunity(id: string): Promise<Result> {
  const mgr = await getVolunteeringManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة التطوّع." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data } = await sb.from("volunteer_opportunities").select("status, flexible, ended_at").eq("id", id).maybeSingle();
  const o = data as { status: string; flexible: boolean; ended_at: string | null } | null;
  if (!o) return { ok: false, message: "لا وجود لهذه الفرصة." };
  if (!o.flexible) return { ok: false, message: "الإنهاءُ للفرصة المرنة وحدَها، وغيرُها ينقضي بمضيّ يومه." };
  if (o.ended_at) return { ok: false, message: "أُنهيت هذه الفرصةُ من قبل." };
  if (o.status === "draft") return { ok: false, message: "المسوّدةُ لم تُنشر بعد، فلا تُنهى." };

  const now = new Date().toISOString();
  const { error } = await sb.from("volunteer_opportunities")
    .update({ ended_at: now, status: "closed", closed_reason: "ended", ...(o.status === "open" ? { closed_at: now } : {}), updated_at: now })
    .eq("id", id);
  if (error) return { ok: false, message: `تعذّر الإنهاء: ${error.message}` };

  revalidatePath("/dashboard/volunteering");
  revalidatePath(`/dashboard/volunteering/${id}`);
  return { ok: true, message: "أُنهيت الفرصة. سجّل إنجازَ المقبولين وقيّمهم لتصدر شهاداتُهم." };
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

// الحضورُ والشهادةُ يُسجَّلان من موضعين (٢٠٢٦-١٠-٠٣): سجلُّ الفرصة، وغرفةُ الشهادات.
// فيُحدَّث الاثنان معًا، وإلّا بقي المتطوّعُ في الطابور بعد أن سُجّل
const CERTS_ROOM = "/dashboard/volunteering/certificates";

export async function markAttendance(id: string, attendance: "attended" | "absent", oppId: string): Promise<Result> {
  return callRpc("mark_volunteer_attendance", { p_id: id, p_attendance: attendance }, [`/dashboard/volunteering/${oppId}`, CERTS_ROOM]);
}

/*
 * **سياسةُ الشهادة (قرارُ المجلس الإداريّ، ٢٠٢٦-١٠-٠٣):** كلُّ من حضر يأخذ شهادةَ مشاركةٍ بساعاته، بلا سؤال
 * استحقاق. ومن تميّز يُرشَّح بجملةٍ تُطبع في شهادته بختم «بتميّز». والحجبُ استثناءٌ لمخالفةٍ صريحة بسببٍ مكتوب،
 * ويُرفع. فالأفعالُ أربعة، وكلُّها على الشخص في الفرصة كلِّها لا على فترةٍ منها (الشهادةُ للفرصة).
 */
export async function nominateDistinction(id: string, note: string, oppId: string): Promise<Result> {
  return callRpc("nominate_volunteer_distinction", { p_id: id, p_note: clean(note) }, [`/dashboard/volunteering/${oppId}`, CERTS_ROOM]);
}

export async function withholdCertificate(id: string, reason: string, oppId: string): Promise<Result> {
  const why = clean(reason);
  if (!why || why.length < 5) return { ok: false, message: "اكتب سببَ الحجب، خمسةَ أحرفٍ فأكثر." };
  return callRpc("withhold_volunteer_certificate", { p_id: id, p_reason: why }, [`/dashboard/volunteering/${oppId}`, CERTS_ROOM]);
}

export async function releaseCertificate(id: string, oppId: string): Promise<Result> {
  return callRpc("release_volunteer_certificate", { p_id: id }, [`/dashboard/volunteering/${oppId}`, CERTS_ROOM]);
}

export async function setAdminNote(id: string, note: string, oppId: string): Promise<Result> {
  return callRpc("set_volunteer_admin_note", { p_id: id, p_note: clean(note) }, [`/dashboard/volunteering/${oppId}`]);
}

/**
 * **ملفُّ متطوّعٍ واحد** لنافذة «الملف» في طابور «بانتظار التقييم» (٢٠٢٦-١٠-٠٣): الطابورُ لا يحمل السجلَّ الكامل
 * (يثقُل بكلّ صفّ)، فيُجلَب عند الضغط على المتطوّع. ولا يُقرأ إلّا لمن يدير التطوّع، كصفحة سجلّ المتطوّعين.
 */
export async function volunteerRecord(userId: string): Promise<VolunteerRow | null> {
  if (!UUID_RE.test(userId)) return null;
  if (!(await getVolunteeringManager())) return null;
  const [v] = await listVolunteers(userId);
  return v ?? null;
}

export async function issueCertificate(applicationId: string, oppId: string): Promise<Result> {
  return callRpc(
    "issue_participation_certificate",
    { p_application_id: applicationId },
    [`/dashboard/volunteering/${oppId}`, "/dashboard/volunteering/certificates"],
  );
}

/**
 * **شهادةٌ لمتطوّعٍ بلا طلب** (٢٠٢٦-١٠-٠٣): شارك فعلًا ولم يقدّم من الموقع. القاعدةُ تكتب طلبَه مقبولًا حاضرًا مستحقًّا
 * بيدك وبسببك، ثمّ تُصدر من المُصدِر الواحد نفسِه، وتردّ ما لا يصحّ (طلبٌ قائم، فترةٌ لم يأتِ يومُها، شهادةٌ صدرت).
 */
export async function issueManualCertificate(
  userId: string, oppId: string, periodId: string | null, reason: string,
): Promise<Result> {
  if (!UUID_RE.test(userId) || !UUID_RE.test(oppId) || (periodId && !UUID_RE.test(periodId))) {
    return { ok: false, message: "اختر المتطوّعَ والفرصة." };
  }
  if (reason.trim().length < 5) return { ok: false, message: "اكتب سببَ الإصدار، خمسةَ أحرفٍ فأكثر." };
  return callRpc(
    "issue_manual_participation_certificate",
    { p_user_id: userId, p_opportunity_id: oppId, p_period_id: periodId, p_reason: reason.trim() },
    [`/dashboard/volunteering/${oppId}`, CERTS_ROOM],
  );
}

/**
 * **إصدارُ شهاداتِ المحدَّدين** من غرفة الشهادات — والحكمُ فيه حكمُ الإصدار الفرديّ نفسُه: كلُّ
 * شهادةٍ تمرّ بدالّة القاعدة بجلسة الفاعل، فتُسأل القدرةُ والحضورُ والاستحقاقُ لكلّ صفٍّ على حدة.
 * ولا يُطوى الفشلُ في النجاح: ما تعذّر يُقال عددُه وأوّلُ أسبابه، وما صدر يبقى صادرًا.
 *
 * وعلى التوالي لا على التوازي: الدالّةُ تأخذ رقمًا من تسلسلٍ وتكتب في السجلّ، وعشرون نداءً
 * متزامنًا من جلسةٍ واحدة لا تُسرِّع شيئًا يُذكر وتُربك ترتيبَ الأرقام.
 */
export async function issueCertificates(applicationIds: string[]): Promise<Result> {
  const ids = [...new Set(applicationIds)].filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return { ok: false, message: "حدّد من تُصدَر شهاداتُهم." };
  if (ids.length > 200) return { ok: false, message: "مئتا شهادةٍ في المرّة الواحدة أقصى ما يُصدَر." };

  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { ok: false, message: "انتهت جلستك. سجّل دخولك من جديد." };

  let issued = 0;
  const reasons: string[] = [];
  for (const id of ids) {
    const { data, error } = await session.rpc("issue_participation_certificate", { p_application_id: id });
    const res = (data ?? {}) as { ok?: boolean; message?: string };
    if (!error && res.ok) issued += 1;
    else reasons.push(error?.message ?? res.message ?? "سببٌ غيرُ معلوم");
  }

  if (issued > 0) revalidatePath("/dashboard/volunteering", "layout");
  const failed = ids.length - issued;
  if (failed === 0) return { ok: true, message: `صدرت ${arCount(issued, AR_CERTIFICATE)}.` };
  if (issued === 0) return { ok: false, message: `تعذّر الإصدار: ${reasons[0]}` };
  return { ok: true, message: `صدرت ${arCount(issued, AR_CERTIFICATE)}، وتعذّرت ${arCount(failed, AR_CERTIFICATE)}: ${reasons[0]}` };
}

/**
 * **إبطالُ شهادة مشاركة** خرجت بخطأ — بقرارٍ مُسبَّب، وتبقى في الدفتر مشطوبة. وصاحبُها يعود إلى
 * «جاهزة لم تصدر»: فإمّا تُصدَر له من جديد، وإمّا تُحجب بسببها.
 * (والدالّةُ قائمةٌ في القاعدة منذ م٤، ولم يكن لها بابٌ في الواجهة قبل هذه الغرفة.)
 */
export async function revokeParticipation(id: string, reason: string): Promise<Result> {
  const why = clean(reason);
  if (!why || why.length < 5) return { ok: false, message: "اكتب سببَ الإبطال، خمسةَ أحرفٍ فأكثر." };
  return callRpc(
    "revoke_participation_certificate",
    { p_id: id, p_reason: why },
    ["/dashboard/volunteering/certificates", "/dashboard/volunteering/volunteers", "/dashboard/volunteering"],
  );
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
