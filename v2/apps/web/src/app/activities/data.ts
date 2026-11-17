import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import type { ActivityType, GuestRole } from "@/lib/activities";
import { clubDayKey, fmtClockSpan, fmtStamp } from "@/lib/dates";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من "YYYY-MM-DD" — تقسيمٌ نصّيّ (يتفادى انزياح المنطقة الزمنيّة). */
export const fmtDate = (ymd: string | null): string => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/**
 * **الوقتُ بصباحٍ ومساء** (قرار المالك، وصيغةُ «حجوزاتي» ونموذج الفعاليّة نفسُها): «من 10 ص إلى 11 ص»، أو «الساعة 7 م» لموعدٍ بلا نهاية.
 * كان «10:00–11:00» بأربعٍ وعشرين ساعة (٢٠٢٦-١١-١٥).
 */
export const timeLabel = (start: string | null, end: string | null): string => fmtClockSpan(start, end);

// عميل قراءة عامّ (مفتاح anon) — للصفحات العامّة، يحترم RLS (المنشور فقط للزائر).
const anon = () => createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export type PublicActivity = {
  id: string;
  name: string;
  description: string | null;
  type: ActivityType;
  location: string | null;
  locationUrl: string | null;
  date: string;
  dateLabel: string;
  timeLabel: string;
  cover: string | null;
  /** true = مقاعد مقسّمة بالنوع · false = مخزون مشترك (مفتوح للجنسين). */
  splitByGender: boolean;
  /** true = تسجيل غير محدود (بلا عدد). */
  unlimited: boolean;
  /** null = للجنسين · "male" = للرجال · "female" = للنساء. */
  targetGender: "male" | "female" | null;
  totalSeats: number | null;
  totalRemaining: number | null;
  maleSeats: number | null;
  femaleSeats: number | null;
  maleRemaining: number | null;
  femaleRemaining: number | null;
  /** لا مقعد متبقٍّ (إجماليًّا أو للجنسين معًا). */
  full: boolean;
  /** مضى يومُها بتوقيت الرياض — تُقرأ ولا تُحجز */
  past: boolean;
  /** أُلغيت بعد نشرها */
  cancelled: boolean;
  /** ساعتا الجدار خامًا («10:00:00») — لملفّ التقويم */
  startTime: string | null;
  endTime: string | null;
  /** الجهةُ المنظِّمة باسمها («لجنة الفعاليات»)، وتُقرأ في صفحة الفعاليّة وحدها */
  organizer?: string | null;
  /** ما بعدها في صفحة الفعاليّة وحدها (٢٠٢٦-١١-١٥، `activity_details_*`) */
  certificate?: boolean;
  /** آخرُ موعدٍ للتسجيل بصيغته («16 نوفمبر 2026 الساعة 8:00 مساءً»)، و`closed` مضى */
  closesLabel?: string | null;
  closed?: boolean;
  /** المسجَّلون والحاضرون عددًا (`get_activity_public_counts`) */
  booked?: number | null;
  attended?: number | null;
  guests?: PublicGuest[];
  /** خبرُ تغطيتها في «آخر الأخبار» */
  coverage?: { slug: string; title: string } | null;
};

/** `avatar` و`slug` لعضو أدِيب وحده (`get_activity_guests`): وجهُه، ورابطُ صفحته العامّة إن كانت له */
export type PublicGuest = { name: string; honorific: string | null; role: GuestRole; gender: "male" | "female"; avatar?: string | null; slug?: string | null };

/** اليومُ بتوقيت الرياض «YYYY-MM-DD» — حدُّ ما مضى */
const riyadhToday = () => clubDayKey(new Date().toISOString());

type RawPublic = {
  id: string; name: string; description: string | null; activity_type: ActivityType;
  location: string | null; location_url?: string | null; activity_date: string;
  start_time: string | null; end_time: string | null;
  cover_image_url: string | null;
  male_seats: number | null; female_seats: number | null;
  male_remaining: number | null; female_remaining: number | null;
  total_seats: number | null; total_remaining: number | null; is_cancelled: boolean;
  target_gender: "male" | "female" | null;
};

const mapPublic = (a: RawPublic): PublicActivity => {
  const split = a.male_seats != null;
  const unlimited = a.total_seats == null;
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? null,
    type: a.activity_type,
    location: a.location ?? null,
    locationUrl: a.location_url ?? null,
    date: a.activity_date,
    dateLabel: fmtDate(a.activity_date),
    timeLabel: timeLabel(a.start_time, a.end_time),
    cover: a.cover_image_url ?? null,
    splitByGender: split,
    unlimited,
    targetGender: a.target_gender ?? null,
    totalSeats: a.total_seats ?? null,
    totalRemaining: a.total_remaining ?? null,
    maleSeats: a.male_seats ?? null,
    femaleSeats: a.female_seats ?? null,
    maleRemaining: a.male_remaining ?? null,
    femaleRemaining: a.female_remaining ?? null,
    full: unlimited ? false : split ? (a.male_remaining ?? 0) <= 0 && (a.female_remaining ?? 0) <= 0 : (a.total_remaining ?? 0) <= 0,
    past: a.activity_date < riyadhToday(),
    startTime: a.start_time ?? null,
    endTime: a.end_time ?? null,
    cancelled: !!a.is_cancelled,
  };
};

/** الفعاليّات المنشورة القادمة (لم يمضِ وقتها، بتوقيت الرياض) مع المقاعد المتبقّية بالنوع. */
export async function getPublicActivities(): Promise<PublicActivity[]> {
  const sb = anon();
  const { data, error } = await sb.rpc("get_published_activities_with_seats");
  if (error || !data) return [];
  return (data as RawPublic[]).map(mapPublic);
}

/**
 * فعاليّة عامّة واحدة (منشورة) مع حالة مقاعدها — للتفاصيل والحجز.
 * تقرأ activities مباشرةً (RLS يسمح بالمنشور للزائر) + get_activity_seat_status (بلا فحص auth).
 * تُعيد null إن لم توجد أو لم تُنشَر (فيستدعي المستدعي notFound).
 */
export async function getPublicActivity(id: string): Promise<PublicActivity | null> {
  const sb = anon();
  const [aRes, sRes] = await Promise.all([
    sb.from("activities")
      .select("id, name, description, activity_type, location, location_url, activity_date, start_time, end_time, cover_image_url, male_seats, female_seats, total_seats, target_gender, is_cancelled, organizing_committee_id, organizing_department_id, has_certificate, booking_closes_at")
      .eq("id", id).eq("is_published", true).maybeSingle(),
    sb.rpc("get_activity_seat_status", { p_activity_id: id }).maybeSingle(),
  ]);
  if (aRes.error || !aRes.data) return null;
  const a = aRes.data;
  const seat = sRes.data as { male_remaining: number | null; female_remaining: number | null; total_remaining: number } | null;
  // الجهةُ المنظِّمة باسمها: اللجنةُ أولى (أدقّ)، ثمّ القسم. والجدولان مقروءان للزائر (RLS: اللجانُ النشطة، والأقسامُ كلُّها)
  const org = a.organizing_committee_id
    ? (await sb.from("committees").select("committee_name_ar").eq("id", a.organizing_committee_id).maybeSingle()).data?.committee_name_ar
    : a.organizing_department_id
      ? (await sb.from("departments").select("name_ar").eq("id", a.organizing_department_id).maybeSingle()).data?.name_ar
      : null;
  // التفاصيلُ الأخرى معًا: العددان، والضيوف، وخبرُ التغطية المنشور — وفشلُ أيٍّ منها يُسقطه وحده لا الصفحة
  const [cRes, gRes, nRes] = await Promise.all([
    sb.rpc("get_activity_public_counts", { p_activity_id: id }).maybeSingle(),
    sb.rpc("get_activity_guests", { p_activity_id: id }),
    sb.from("news").select("slug, title").eq("activity_id", id).eq("workflow_status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const counts = cRes.data as { booked: number; attended: number } | null;
  const closesAt = (a as { booking_closes_at?: string | null }).booking_closes_at ?? null;
  const news = nRes.data as { slug: string | null; title: string } | null;
  return {
    certificate: !!(a as { has_certificate?: boolean }).has_certificate,
    closesLabel: closesAt ? fmtStamp(closesAt) : null,
    closed: closesAt ? Date.now() > new Date(closesAt).getTime() : false,
    booked: counts?.booked ?? null,
    attended: counts?.attended ?? null,
    guests: ((gRes.data ?? []) as { name: string; honorific: string | null; role: GuestRole; gender: "male" | "female"; avatar_url: string | null; slug: string | null }[])
      .map((g) => ({ name: g.name, honorific: g.honorific, role: g.role, gender: g.gender, avatar: g.avatar_url, slug: g.slug })),
    coverage: news?.slug ? { slug: news.slug, title: news.title } : null,
    ...mapPublic({
      ...a,
      male_remaining: seat?.male_remaining ?? null,
      female_remaining: seat?.female_remaining ?? null,
      total_remaining: seat?.total_remaining ?? a.total_seats,
    } as RawPublic),
    organizer: (org as string | null | undefined) ?? null,
  };
}

/**
 * **ما مضى من الفعاليّات المنشورة** (٢٠٢٦-١١-١٥) — تحت القادمة في الفهرس العامّ، الأحدثُ أوّلًا، ستٌّ بحدٍّ: يومُها قبل اليوم بتوقيت
 * الرياض ولم تُلغَ. بمفتاح anon (RLS: المنشورُ للزائر). والمقاعدُ لا تُقرأ: ما مضى لا يُحجز.
 */
export async function getPastActivities(limit = 6): Promise<PublicActivity[]> {
  const today = riyadhToday();
  const { data, error } = await anon().from("activities")
    .select("id, name, description, activity_type, location, location_url, activity_date, start_time, end_time, cover_image_url, male_seats, female_seats, total_seats, target_gender, is_cancelled")
    .eq("is_published", true).eq("is_cancelled", false).lt("activity_date", today)
    .order("activity_date", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as unknown as RawPublic[]).map((a) => mapPublic({ ...a, male_remaining: null, female_remaining: null, total_remaining: null }));
}
