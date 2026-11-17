"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GUEST_ROLE_VALUES, HONORIFICS, parseOrganizer } from "@/lib/activities";
import { fromClubInput } from "@/lib/dates";
import { arabicNameError } from "@/lib/personName";
import type { EventGuest } from "./data";
import { getEventsManager } from "@/lib/events/authz";
import { STATUS_OPS, TYPE_VALUES, deriveStatus, reservationErrorMessage, type ActivityType, type StatusOp } from "./vocab";

export type EventResult = { ok: boolean; message: string; id?: string };

/** يحوّل الفارغ إلى null ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/**
 * تغييرات العلمين لكلّ إجراء — مصدرٌ واحد يحترم قيد `NOT(cancelled AND published)`:
 * الإلغاء يطفئ النشر معه، وإعادة التفعيل تعيد للمسودّة (لا تنشر تلقائيًّا).
 */
const OP_FLAGS: Record<StatusOp, { is_published?: boolean; is_cancelled?: boolean }> = {
  publish: { is_published: true, is_cancelled: false },
  unpublish: { is_published: false },
  cancel: { is_published: false, is_cancelled: true },
  reactivate: { is_cancelled: false, is_published: false },
};

/** ينفّذ انتقال دورة حياة — التحقّق على الحالة المشتقّة من صفّ القاعدة لا على ما تعرضه الواجهة. */
export async function setEventStatus(eventId: string, op: StatusOp): Promise<EventResult> {
  const mgr = await getEventsManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الفعاليّات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const spec = STATUS_OPS[op];
  if (!spec) return { ok: false, message: "إجراء غير معروف." };

  const { data: ev, error } = await sb
    .from("activities")
    .select("id, name, is_published, is_cancelled, activity_date")
    .eq("id", eventId)
    .maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الفعاليّة: ${error.message}` };
  if (!ev) return { ok: false, message: "لا وجود لهذه الفعاليّة." };

  const status = deriveStatus(ev.is_published, ev.is_cancelled, ev.activity_date, todayYMD());
  if (!(spec.from as readonly string[]).includes(status)) {
    return { ok: false, message: `لا يصحّ «${spec.label}» على فعاليّة حالتها «${status}».` };
  }

  const { error: uErr } = await sb
    .from("activities")
    .update({ ...OP_FLAGS[op], updated_at: new Date().toISOString() })
    .eq("id", eventId);
  if (uErr) return { ok: false, message: `تعذّر التنفيذ: ${uErr.message}` };

  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: `${spec.label}: تمّ لـ«${ev.name}».` };
}

/**
 * حذف نهائيّ — للفعاليّات **بلا حجوزات** وحدها. المفتاح الأجنبيّ من activity_reservations
 * يمنع حذف ذات الحجوزات فيزيائيًّا؛ فنكشف ذلك برسالة صريحة بدل خطأ قاعدة غامض، ونوجّه للإلغاء.
 */
export async function deleteEvent(eventId: string): Promise<EventResult> {
  const mgr = await getEventsManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الفعاليّات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data: ev, error } = await sb.from("activities").select("id, name").eq("id", eventId).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الفعاليّة: ${error.message}` };
  if (!ev) return { ok: false, message: "لا وجود لهذه الفعاليّة." };

  const { count, error: cErr } = await sb
    .from("activity_reservations")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", eventId);
  if (cErr) return { ok: false, message: `تعذّر فحص الحجوزات: ${cErr.message}` };
  if (count && count > 0) {
    return { ok: false, message: `لهذه الفعاليّة ${count} حجزًا، لا تُحذف. ألغِها بدل الحذف لحفظ سجلّ الحجوزات.` };
  }

  const { error: dErr } = await sb.from("activities").delete().eq("id", eventId);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: `حُذفت «${ev.name}».` };
}

/* ── الإنشاء والتحرير ── */

export type EventInput = {
  name: string;
  type: ActivityType;
  organizer: string;   // "" | "dept:<id>" | "comm:<id>"
  description?: string | null;
  location?: string | null;
  locationUrl?: string | null;
  date: string;            // "YYYY-MM-DD"
  startTime: string;       // "HH:MM"
  endTime?: string | null; // "HH:MM" أو null
  totalSeats: number | null;  // null = غير محدود (متاح للجميع)
  maleSeats: number | null;   // null = بلا تقسيم (مفتوح للجنسين، مخزون مشترك)
  femaleSeats: number | null;
  targetGender: "male" | "female" | null;  // null = للجنسين
  coverImageUrl?: string | null;
  /** ٢٠٢٦-١١-١٥: شهادةُ الحضور، وآخرُ موعدٍ للتسجيل (حقلُ الوقت المحلّيّ بساعة النادي، أو فارغ)، والضيوف بترتيبهم */
  hasCertificate?: boolean;
  bookingClosesAt?: string | null;
  guests?: EventGuest[];
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validateEvent(input: EventInput): string | null {
  if (!clean(input.name)) return "اسم الفعاليّة مطلوب.";
  if (!TYPE_VALUES.includes(input.type)) return "نوع فعاليّة غير معروف.";
  if (!clean(input.location)) return "المكان مطلوب.";
  if (!clean(input.locationUrl)) return "رابط الموقع على الخرائط مطلوب.";
  if (!input.date) return "تاريخ الفعاليّة مطلوب.";
  if (!input.startTime) return "وقت البداية مطلوب.";
  if (input.endTime && input.endTime <= input.startTime) return "وقت النهاية يجب أن يلي وقت البداية.";
  if (input.totalSeats != null && (!Number.isInteger(input.totalSeats) || input.totalSeats <= 0)) return "إجمالي المقاعد رقمٌ موجب (أو اتركه فارغًا لتسجيلٍ غير محدود).";
  // مقاعد الجنسين: إمّا كلاهما (تقسيم/جنس واحد) أو لا شيء — ولا تقسيم بلا إجمالي
  if (input.maleSeats != null || input.femaleSeats != null) {
    if (input.totalSeats == null) return "لا تقسيم بلا إجمالي. حدّد الإجمالي أو اترك مقاعد الجنسين فارغة.";
    if (input.maleSeats == null || input.femaleSeats == null) return "حدّد مقاعد الرجال والنساء معًا، أو اتركهما فارغين.";
    if (!Number.isInteger(input.maleSeats) || input.maleSeats < 0 || !Number.isInteger(input.femaleSeats) || input.femaleSeats < 0) return "مقاعد الجنسين يجب أن تكون أرقامًا صحيحة غير سالبة.";
    if (input.maleSeats + input.femaleSeats !== input.totalSeats) return "مجموع مقاعد الرجال والنساء يجب أن يساوي الإجمالي.";
  }
  // آخرُ موعدٍ للتسجيل لا يجاوز بدايةَ الفعاليّة: بعدها لا معنى له (والماضي يرفضه الحجزُ أصلًا)
  if (input.bookingClosesAt) {
    const closes = fromClubInput(input.bookingClosesAt);
    if (!closes) return "آخر موعد للتسجيل غير صالح.";
    const starts = fromClubInput(`${input.date}T${input.startTime}`);
    if (starts && closes > starts) return "آخر موعد للتسجيل يجب أن يسبق بداية الفعاليّة.";
  }
  for (const [i, g] of (input.guests ?? []).entries()) {
    const n = i + 1;
    if (g.memberId && !/^[0-9a-f-]{36}$/i.test(g.memberId)) return `الضيف ${n} غير معروف.`;
    if (!g.memberId && !clean(g.name)) return `اختر الضيف ${n} أو اكتب اسمه، أو احذفه.`;
    const nameErr = g.memberId ? null : arabicNameError(g.name);
    if (nameErr) return `الضيف ${n}: ${nameErr}.`;
    if (!GUEST_ROLE_VALUES.includes(g.role)) return `صفة الضيف ${n} غير معروفة.`;
    if (g.gender !== "male" && g.gender !== "female") return `حدّد جنس الضيف ${n}.`;
    if (g.honorific && !(HONORIFICS as readonly string[]).includes(g.honorific)) return `لقب الضيف ${n} غير معروف.`;
  }
  return null;
}

/** أعمدة activities من مُدخَل النموذج — مكان واحد للإنشاء والتحديث؛ المقاعد تُشتقّ (deriveSeats) لا تُدخَل. */
function eventColumns(input: EventInput) {
  // الإجمالي null = غير محدود؛ التقسيم يلزمه إجماليّ + الجنسان (والنسبة تُشتقّ)، ولا تقسيم للفعاليّة المُوجَّهة لجنس
  const total = input.totalSeats;
  const single = input.targetGender != null;
  const split = !single && total != null && input.maleSeats != null && input.femaleSeats != null;
  const malePct = split ? Math.round((input.maleSeats! / total!) * 100) : null;
  const org = parseOrganizer(input.organizer);
  return {
    name: clean(input.name),
    activity_type: input.type,
    target_gender: input.targetGender,
    organizing_committee_id: org.committeeId,
    organizing_department_id: org.departmentId,
    description: clean(input.description),
    location: clean(input.location),
    location_url: clean(input.locationUrl),
    activity_date: input.date,
    start_time: input.startTime,
    end_time: input.endTime || null,
    total_seats: total,
    male_percentage: malePct,
    male_seats: split ? input.maleSeats : null,
    female_seats: split ? input.femaleSeats : null,
    cover_image_url: clean(input.coverImageUrl),
    has_certificate: !!input.hasCertificate,
    booking_closes_at: input.bookingClosesAt ? fromClubInput(input.bookingClosesAt) : null,
  };
}

/**
 * **الضيوفُ يُكتبون جملةً** بعد صفّ الفعاليّة: يُمحى ما كان ويُكتب ما في النموذج بترتيبه — النموذجُ يحمل القائمةَ كاملة، فلا حاجةَ
 * لمطابقة صفٍّ بصفّ. بمفتاح الخدمة (الجدولُ لا يُكتب من المتصفّح). وفشلُه رسالةٌ لا رمي: الفعاليّةُ حُفظت، والضيوفُ لم يُحفظوا.
 */
async function writeGuests(sb: NonNullable<ReturnType<typeof service>>, activityId: string, guests: EventGuest[] | undefined): Promise<string | null> {
  if (!guests) return null;
  const del = await sb.from("activity_guests").delete().eq("activity_id", activityId);
  if (del.error) return del.error.message;
  if (!guests.length) return null;
  // عضوُ أدِيب: اسمُه وجنسُه من ملفّه لا ممّا أرسله المتصفّح (فيُكتبان كما هما، ويبقى الصفُّ مقروءًا لو حُذف الملفّ)
  const ids = guests.map((g) => g.memberId).filter((v): v is string => !!v);
  const prof = new Map<string, { full_name: string; gender: string | null }>();
  if (ids.length) {
    const { data } = await sb.from("profiles").select("id, full_name, gender").in("id", ids);
    for (const p of data ?? []) prof.set(p.id as string, { full_name: p.full_name as string, gender: (p.gender as string | null) ?? null });
  }
  const ins = await sb.from("activity_guests").insert(guests.map((g, position) => {
    const p = g.memberId ? prof.get(g.memberId) : undefined;
    return {
      activity_id: activityId, member_id: p ? g.memberId : null,
      name: p?.full_name ?? clean(g.name), honorific: g.honorific || null, role: g.role,
      gender: p?.gender === "male" || p?.gender === "female" ? p.gender : g.gender, position,
    };
  }));
  return ins.error?.message ?? null;
}

export async function createEvent(input: EventInput): Promise<EventResult> {
  const mgr = await getEventsManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الفعاليّات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = validateEvent(input);
  if (invalid) return { ok: false, message: invalid };

  // تُنشأ مسودّةً دائمًا (is_published=false, is_cancelled=false) — النشر فعلُ دورة حياة مستقلّ
  const { data: created, error } = await sb
    .from("activities")
    .insert({ ...eventColumns(input), is_published: false, is_cancelled: false, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إنشاء الفعاليّة: ${error?.message ?? "بلا تفاصيل"}` };
  const gErr = await writeGuests(sb, created.id, input.guests);
  if (gErr) return { ok: false, message: `أُنشئت الفعاليّة، وتعذّر حفظ الضيوف: ${gErr}`, id: created.id };

  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: "أُنشئت الفعاليّة مسودّةً.", id: created.id };
}

export async function updateEvent(eventId: string, input: EventInput): Promise<EventResult> {
  const mgr = await getEventsManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الفعاليّات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const invalid = validateEvent(input);
  if (invalid) return { ok: false, message: invalid };

  // التحديث لا يمسّ العلمين (النشر/الإلغاء دورةُ حياة). خفضُ المقاعد دون الحجوزات المؤكّدة
  // يرفعه القيد enforce_activity_seats_vs_bookings برسالةٍ عربيّة صريحة — نُمرّرها كما هي.
  const { error } = await sb
    .from("activities")
    .update({ ...eventColumns(input), updated_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) return { ok: false, message: error.message };
  const gErr = await writeGuests(sb, eventId, input.guests);
  if (gErr) return { ok: false, message: `حُفظت الفعاليّة، وتعذّر حفظ الضيوف: ${gErr}` };

  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: "حُفظت التغييرات.", id: eventId };
}

/* ── رفع غلاف الفعاليّة إلى دلو images تحت بادئة activities/ (عُرف V1 القائم) ── */

export type UploadResult = { ok: boolean; message?: string; url?: string };

const COVER_BUCKET = "images";
const COVER_PREFIX = "activities";
const MAX_COVER_BYTES = 5 * 1024 * 1024; // حدّ الدلو نفسه
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export async function uploadEventCover(formData: FormData): Promise<UploadResult> {
  const mgr = await getEventsManager();
  if (!mgr) return { ok: false, message: "لا تملك صلاحية إدارة الفعاليّات." };
  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "لم تُرفَق صورة." };
  if (file.size > MAX_COVER_BYTES) return { ok: false, message: "حجم الصورة يتجاوز 5 ميغابايت." };
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة. استخدم JPG أو PNG أو WEBP أو GIF." };

  const path = `${COVER_PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await sb.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: `تعذّر رفع الصورة: ${error.message}` };

  const { data } = sb.storage.from(COVER_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/* ── أفعال الحجوزات (صفحة التفاصيل) — بعميل الجلسة لا الخدمة ──
   دوالّ RPC هذه تفحص auth.uid() + القدرة (وبعضُها يقبل منسّق الفعاليّات) وتفرض
   نافذة الحضور وأقفال الإلغاء داخليًّا؛ فنستدعيها بعميل الجلسة كي يصحّ auth.uid(),
   ونترجم رمز الخطأ الذي ترفعه إلى رسالة عربيّة. */

/** يسجّل الحضور (attended) أو يتراجع عنه (registered). «attended» يولّد رقم الشهادة تلقائيًّا. */
export async function markAttendance(reservationId: string, status: "attended" | "registered"): Promise<EventResult> {
  const sb = await createClient();
  const { error } = await sb.rpc("mark_attendance", { p_reservation_id: reservationId, p_status: status });
  if (error) return { ok: false, message: reservationErrorMessage(error.message) };
  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: status === "attended" ? "سُجِّل الحضور وصدر رقم الشهادة." : "أُلغي تسجيل الحضور." };
}

/** يؤكّد تواصل واتساب مع صاحب الحجز. */
export async function confirmWhatsapp(reservationId: string): Promise<EventResult> {
  const sb = await createClient();
  const { error } = await sb.rpc("confirm_whatsapp", { p_reservation_id: reservationId });
  if (error) return { ok: false, message: reservationErrorMessage(error.message) };
  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: "أُكّد تواصل واتساب." };
}

/** يُعلّم الشهادة «مُرسَلة» (يتطلّب صدور رقمها). */
export async function markCertificateSent(reservationId: string): Promise<EventResult> {
  const sb = await createClient();
  const { error } = await sb.rpc("mark_certificate_sent", { p_reservation_id: reservationId });
  if (error) return { ok: false, message: reservationErrorMessage(error.message) };
  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: "عُلِّمت الشهادة مُرسَلةً." };
}

/** فعلٌ جماعيّ يلفّ RPC حجزٍ مفردًا على قائمة معرّفات (متوازيًا) ويُعيد ملخّصًا. */
async function batchReservationRpc(fn: "confirm_whatsapp" | "mark_certificate_sent", ids: string[], noun: string): Promise<EventResult> {
  if (!ids.length) return { ok: false, message: "لم تُحدَّد صفوف." };
  const sb = await createClient();
  const results = await Promise.all(ids.map((id) => sb.rpc(fn, { p_reservation_id: id })));
  const failed = results.filter((r) => r.error).length;
  const done = results.length - failed;
  revalidatePath("/dashboard/events", "layout");
  return { ok: done > 0, message: failed ? `${noun}: تمّ ${done}، وتعذّر ${failed}.` : `${noun}: تمّ لـ${done}.` };
}

/** تأكيد واتساب لمجموعة حجوزات محدّدة. */
export async function batchConfirmWhatsapp(ids: string[]): Promise<EventResult> {
  return batchReservationRpc("confirm_whatsapp", ids, "تأكيد واتساب");
}

/** تعليم شهادات مجموعة حجوزات «مُرسَلة» (لا يمسّ ما لا رقم له — يُحصى في «تعذّر»). */
export async function batchMarkCertificatesSent(ids: string[]): Promise<EventResult> {
  return batchReservationRpc("mark_certificate_sent", ids, "إرسال الشهادات");
}

/** يُلغي حجزًا إداريًّا بسبب مطلوب — يرفضه القيد إن سُجِّل حضوره أو صدرت شهادته أو مضت الفعاليّة. */
export async function cancelReservation(reservationId: string, reason: string): Promise<EventResult> {
  const trimmed = clean(reason);
  if (!trimmed) return { ok: false, message: "سبب الإلغاء مطلوب." };
  const sb = await createClient();
  const { error } = await sb.rpc("admin_cancel_reservation", { p_reservation_id: reservationId, p_reason: trimmed });
  if (error) return { ok: false, message: reservationErrorMessage(error.message) };
  revalidatePath("/dashboard/events", "layout");
  return { ok: true, message: "أُلغي الحجز." };
}
