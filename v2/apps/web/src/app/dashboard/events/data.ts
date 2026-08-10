// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { organizerValue } from "@/lib/activities";
import { deriveStatus, reservationErrorMessage, type ActivityType, type AttendanceStatus, type EventStatus } from "./vocab";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من "YYYY-MM-DD" — تقسيمٌ نصّيّ لا `new Date` (يتفادى انزياح المنطقة الزمنيّة للتواريخ المجرّدة). */
export const fmtDate = (ymd: string | null): string => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** "HH:MM:SS" → "HH:MM". */
const hm = (t: string | null): string => (t ? t.slice(0, 5) : "");

/** ISO → «يوم شهر سنة · HH:MM» عربيّ (لأوقات الحجز). */
export const fmtDateTime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}، ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/** اليوم بصيغة "YYYY-MM-DD" بالتوقيت المحلّيّ للخادم — أساس اشتقاق «قادمة/منتهية». */
function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  type: ActivityType;
  location: string | null;
  locationUrl: string | null;
  date: string;          // activity_date "YYYY-MM-DD" (خام، للفرز)
  dateLabel: string;     // عربيّ مختصر
  timeLabel: string;     // "10:00–12:00" أو "10:00"
  totalSeats: number | null;   // null = غير محدود
  coverImageUrl: string | null;
  isPublished: boolean;
  isCancelled: boolean;
  status: EventStatus;   // مشتقّة
  organizer: string;             // قيمة الجهة المنظِّمة: "" | "dept:<id>" | "comm:<id>"
  organizerName: string | null;  // اسم القسم/اللجنة المنظِّمة (NULL = على مستوى النادي)
  reserved: number;      // حجوزات مؤكّدة
  attended: number;      // حضور مسجَّل
  createdRaw: string;
  created: string;
};

/**
 * قائمة الفعاليّات مع نسبها وأعدادها — العدّادات تُحسب من صفوف الحجوزات لا من أعمدة مخزّنة،
 * والحالة تُشتقّ من العلمين والتاريخ (deriveStatus). النَّسب للجنة/القسم عبر خرائط بسيطة.
 */
export async function getEvents(): Promise<{ events: EventRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { events: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [aRes, cRes, dRes, rRes] = await Promise.all([
    sb.from("activities").select("id, name, description, activity_type, location, location_url, activity_date, start_time, end_time, total_seats, male_percentage, male_seats, female_seats, cover_image_url, is_published, is_cancelled, organizing_committee_id, organizing_department_id, created_at").order("activity_date", { ascending: false }),
    sb.from("committees").select("id, committee_name_ar, department_id"),
    sb.from("departments").select("id, name_ar"),
    sb.from("activity_reservations").select("activity_id, status, attendance_status"),
  ]);
  const firstErr = aRes.error || cRes.error || dRes.error || rRes.error;
  if (firstErr) return { events: [], error: firstErr.message };

  const deptName = new Map<number, string>();
  for (const d of dRes.data ?? []) deptName.set(d.id, d.name_ar);
  const committee = new Map<number, { name: string; deptId: number | null }>();
  for (const c of cRes.data ?? []) committee.set(c.id, { name: c.committee_name_ar, deptId: c.department_id ?? null });

  const reserved = new Map<string, number>();
  const attended = new Map<string, number>();
  for (const r of rRes.data ?? []) {
    if (r.status === "confirmed") reserved.set(r.activity_id, (reserved.get(r.activity_id) ?? 0) + 1);
    if (r.attendance_status === "attended") attended.set(r.activity_id, (attended.get(r.activity_id) ?? 0) + 1);
  }

  const today = todayYMD();
  const events: EventRow[] = (aRes.data ?? []).map((a) => {
    const orgName =
      a.organizing_committee_id != null ? committee.get(a.organizing_committee_id)?.name ?? null
        : a.organizing_department_id != null ? deptName.get(a.organizing_department_id) ?? null
        : null;
    return {
      id: a.id,
      name: a.name,
      description: a.description ?? null,
      type: a.activity_type as ActivityType,
      location: a.location ?? null,
      locationUrl: a.location_url ?? null,
      date: a.activity_date,
      dateLabel: fmtDate(a.activity_date),
      timeLabel: a.end_time ? `${hm(a.start_time)}–${hm(a.end_time)}` : hm(a.start_time),
      totalSeats: a.total_seats ?? null,
      coverImageUrl: a.cover_image_url ?? null,
      isPublished: a.is_published,
      isCancelled: a.is_cancelled,
      status: deriveStatus(a.is_published, a.is_cancelled, a.activity_date, today),
      organizer: organizerValue(a.organizing_committee_id ?? null, a.organizing_department_id ?? null),
      organizerName: orgName,
      reserved: reserved.get(a.id) ?? 0,
      attended: attended.get(a.id) ?? 0,
      createdRaw: a.created_at ?? "",
      created: fmtDate((a.created_at ?? "").slice(0, 10)),
    };
  });

  return { events, error: null };
}

/* ── خيارات الجهة المنظِّمة (للنموذج) ── */

export type OrganizerOption = { value: string; label: string; group?: string };

/**
 * الجهة المنظِّمة خياراتٍ لـ`Select` بالترتيب المعتمَد: النادي (بلا جهة) · الأقسام الأربعة ·
 * اللجان (التابعة لقسم) · الإدارات (اللجان بلا قسم: الموارد البشريّة والضمان). القيمة تُرمِّز
 * النوع (`dept:<id>` · `comm:<id>` · "")، فيصحّ اختيار قسمٍ أو لجنة سواء بسواء.
 */
export async function getOrganizerOptions(): Promise<{ options: OrganizerOption[]; error: string | null }> {
  const sb = service();
  if (!sb) return { options: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const [cRes, dRes] = await Promise.all([
    sb.from("committees").select("id, committee_name_ar, department_id, is_active").eq("is_active", true),
    sb.from("departments").select("id, name_ar, display_order").eq("is_active", true),
  ]);
  if (cRes.error) return { options: [], error: cRes.error.message };
  if (dRes.error) return { options: [], error: dRes.error.message };

  const deptOrder = new Map<number, number>();
  for (const d of dRes.data ?? []) deptOrder.set(d.id, d.display_order ?? 999);
  const committees = (cRes.data ?? []).slice();

  const options: OrganizerOption[] = [{ value: "", label: "نادي أدِيب" }];

  // الأقسام الأربعة
  for (const d of [...(dRes.data ?? [])].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.name_ar.localeCompare(b.name_ar, "ar"))) {
    options.push({ value: `dept:${d.id}`, label: d.name_ar, group: "الأقسام" });
  }
  // اللجان (التابعة لقسم) — مرتّبةً بترتيب قسمها ثمّ باسمها
  for (const c of committees.filter((c) => c.department_id != null).sort((a, b) => (deptOrder.get(a.department_id) ?? 999) - (deptOrder.get(b.department_id) ?? 999) || a.committee_name_ar.localeCompare(b.committee_name_ar, "ar"))) {
    options.push({ value: `comm:${c.id}`, label: c.committee_name_ar, group: "اللجان" });
  }
  // الإدارات (لجانٌ بلا قسم: الموارد البشريّة · الضمان)
  for (const c of committees.filter((c) => c.department_id == null).sort((a, b) => a.committee_name_ar.localeCompare(b.committee_name_ar, "ar"))) {
    options.push({ value: `comm:${c.id}`, label: c.committee_name_ar, group: "الإدارات" });
  }

  return { options, error: null };
}

/* ── فعاليّة واحدة لنموذج التحرير (حقول خام، لا مشتقّات) ── */

export type EventEditData = {
  id: string;
  name: string;
  type: ActivityType;
  organizer: string;   // قيمة الجهة المنظِّمة: "" | "dept:<id>" | "comm:<id>"
  targetGender: "male" | "female" | null;  // null = للجنسين
  description: string | null;
  location: string | null;
  locationUrl: string | null;
  date: string;          // "YYYY-MM-DD"
  startTime: string;     // "HH:MM"
  endTime: string | null; // "HH:MM"
  totalSeats: number | null;   // null = غير محدود
  maleSeats: number | null;   // null = بلا تقسيم (مفتوح للجنسين)
  femaleSeats: number | null;
  coverImageUrl: string | null;
};

export async function getEventForEdit(id: string): Promise<{ event: EventEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { event: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };

  const { data, error } = await sb
    .from("activities")
    .select("id, name, activity_type, target_gender, organizing_committee_id, organizing_department_id, description, location, location_url, activity_date, start_time, end_time, total_seats, male_seats, female_seats, cover_image_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return { event: null, error: error.message };
  if (!data) return { event: null, error: null };

  return {
    event: {
      id: data.id,
      name: data.name,
      type: data.activity_type as ActivityType,
      organizer: organizerValue(data.organizing_committee_id ?? null, data.organizing_department_id ?? null),
      targetGender: (data.target_gender as "male" | "female" | null) ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
      locationUrl: data.location_url ?? null,
      date: data.activity_date,
      startTime: hm(data.start_time),
      endTime: data.end_time ? hm(data.end_time) : null,
      totalSeats: data.total_seats ?? null,
      maleSeats: data.male_seats ?? null,
      femaleSeats: data.female_seats ?? null,
      coverImageUrl: data.cover_image_url ?? null,
    },
    error: null,
  };
}

/* ── تفاصيل الفعاليّة (إحصاءات + مقاعد + حجوزات) للمرحلة ٣ ── */

export type EventStats = {
  registered_count: number;
  whatsapp_confirmed_count: number;
  attended_count: number;
  no_show_count: number;
  pending_attendance_count: number;
  certificates_issued_count: number;
  certificates_sent_count: number;
  cancelled_count: number;
  attendance_rate: number; // نسبة 0..1
};

export type EventSeatStatus = {
  male_seats: number | null; female_seats: number | null;
  male_booked: number; female_booked: number;
  male_remaining: number | null; female_remaining: number | null;
  total_seats: number; total_booked: number; total_remaining: number;
};

export type ReservationRow = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  gender: "male" | "female";
  accountType: "visitor" | "member";
  status: "confirmed" | "cancelled";
  attendance: AttendanceStatus;   // محسوبة في الدالّة (registered/attended/no_show)
  whatsappConfirmed: boolean;
  reservedAtLabel: string;
  reservedAtRaw: string;
  attendedAt: string | null;
  certificateSerial: string | null;
  certificateSent: boolean;
};

export type EventDetail = {
  id: string;
  name: string;
  type: ActivityType;
  date: string;
  dateLabel: string;
  timeLabel: string;
  startTime: string;       // "HH:MM" خام (لرسالة واتساب بصيغة ١٢‑ساعة)
  endTime: string | null;  // "HH:MM" خام
  location: string | null;
  locationUrl: string | null;
  totalSeats: number | null;   // null = غير محدود
  unlimited: boolean;
  coverImageUrl: string | null;
  status: EventStatus;
  isPast: boolean;
  isToday: boolean;
  splitByGender: boolean;   // true = مقاعد مقسّمة بالنوع · false = مخزون مشترك (مفتوح للجنسين)
  targetGender: "male" | "female" | null;   // null = للجنسين
  stats: EventStats;
  seats: EventSeatStatus | null;
  reservations: ReservationRow[];
};

/**
 * تفاصيل فعاليّة عبر RPC — **بعميل الجلسة لا الخدمة**: الدالّتان تفحصان `auth.uid()`
 * داخليًّا (SECURITY DEFINER)، فعميل الخدمة (بلا auth.uid) يرفع NOT_AUTHENTICATED.
 * تُعيد `notFound` صريحةً حين لا وجود للفعاليّة كي يستدعي المستدعي notFound().
 */
export async function getEventDetail(id: string): Promise<{ detail: EventDetail | null; error: string | null; notFound?: boolean }> {
  const sb = await createClient();
  const [fullRes, seatRes] = await Promise.all([
    sb.rpc("get_activity_full_details", { p_activity_id: id }),
    sb.rpc("get_activity_seat_status", { p_activity_id: id }).maybeSingle(),
  ]);
  if (fullRes.error) {
    if (fullRes.error.message.includes("ACTIVITY_NOT_FOUND")) return { detail: null, error: null, notFound: true };
    return { detail: null, error: reservationErrorMessage(fullRes.error.message) };
  }

  const full = fullRes.data as { activity: Record<string, unknown>; stats: EventStats; reservations: RawReservation[] } | null;
  if (!full || !full.activity) return { detail: null, error: null, notFound: true };
  const a = full.activity;

  const dateYMD = String(a.activity_date);
  const startTime = a.start_time as string | null;
  const endTime = a.end_time as string | null;
  const seats = (seatRes.data as EventSeatStatus | null) ?? null;

  const detail: EventDetail = {
    id: String(a.id),
    name: String(a.name),
    type: a.activity_type as ActivityType,
    date: dateYMD,
    dateLabel: fmtDate(dateYMD),
    timeLabel: endTime ? `${hm(startTime)}–${hm(endTime)}` : hm(startTime),
    startTime: hm(startTime),
    endTime: endTime ? hm(endTime) : null,
    location: (a.location as string | null) ?? null,
    locationUrl: (a.location_url as string | null) ?? null,
    totalSeats: a.total_seats != null ? Number(a.total_seats) : null,
    unlimited: a.total_seats == null,
    coverImageUrl: (a.cover_image_url as string | null) ?? null,
    status: deriveStatus(Boolean(a.is_published), Boolean(a.is_cancelled), dateYMD, todayYMD()),
    isPast: dateYMD < todayYMD(),
    isToday: dateYMD === todayYMD(),
    splitByGender: a.male_seats != null,
    targetGender: (a.target_gender as "male" | "female" | null) ?? null,
    stats: full.stats,
    seats,
    reservations: (full.reservations ?? []).map((r) => ({
      id: r.id,
      fullName: r.full_name ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      gender: r.gender_at_booking,
      accountType: r.account_type,
      status: r.status,
      attendance: r.attendance_status,
      whatsappConfirmed: r.whatsapp_confirmed_at != null,
      reservedAtLabel: fmtDateTime(r.reserved_at),
      reservedAtRaw: r.reserved_at ?? "",
      attendedAt: r.attended_at ?? null,
      certificateSerial: r.certificate_serial ?? null,
      certificateSent: r.certificate_sent_at != null,
    })),
  };
  return { detail, error: null };
}

type RawReservation = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  gender_at_booking: "male" | "female";
  account_type: "visitor" | "member";
  status: "confirmed" | "cancelled";
  attendance_status: AttendanceStatus;
  whatsapp_confirmed_at: string | null;
  reserved_at: string | null;
  attended_at: string | null;
  certificate_serial: string | null;
  certificate_sent_at: string | null;
};
