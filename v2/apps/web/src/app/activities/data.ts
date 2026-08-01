import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import type { ActivityType } from "@/lib/activities";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من "YYYY-MM-DD" — تقسيمٌ نصّيّ (يتفادى انزياح المنطقة الزمنيّة). */
export const fmtDate = (ymd: string | null): string => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const hm = (t: string | null): string => (t ? t.slice(0, 5) : "");
export const timeLabel = (start: string | null, end: string | null): string =>
  end ? `${hm(start)}–${hm(end)}` : hm(start);

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
};

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
      .select("id, name, description, activity_type, location, location_url, activity_date, start_time, end_time, cover_image_url, male_seats, female_seats, total_seats, target_gender, is_cancelled")
      .eq("id", id).eq("is_published", true).maybeSingle(),
    sb.rpc("get_activity_seat_status", { p_activity_id: id }).maybeSingle(),
  ]);
  if (aRes.error || !aRes.data) return null;
  const a = aRes.data;
  const seat = sRes.data as { male_remaining: number | null; female_remaining: number | null; total_remaining: number } | null;
  return mapPublic({
    ...a,
    male_remaining: seat?.male_remaining ?? null,
    female_remaining: seat?.female_remaining ?? null,
    total_remaining: seat?.total_remaining ?? a.total_seats,
  } as RawPublic);
}
