import { seatMode, type SeatMode } from "@adeeb/core/activities";

import { supabase } from "./supabase";

/**
 * قراءةُ الأنشطة المنشورة.
 *
 * تُقرأ بمفتاح anon مباشرةً: سياسةُ `activities_select_published` تنخل المنشور.
 * والتواريخُ تُعامَل **نصوصًا لا `Date`** كما في الويب (`app/activities/data.ts`):
 * العمودُ من نوع `date` بلا وقت، وتمريرُه على `Date` يزيحه يومًا كاملًا في منطقةٍ زمنيّةٍ
 * تسبق الرياض أو تتأخّر عنها. وهو العطلُ نفسُه الذي أعدم `lib/date.ts` في الويب.
 */

export type Activity = {
  id: string;
  name: string;
  activityType: string;
  location: string | null;
  /** «YYYY-MM-DD» كما في القاعدة، بلا تحويل */
  date: string;
  startTime: string;
  totalSeats: number | null;
};

type Row = {
  id: string;
  name: string;
  activity_type: string;
  location: string | null;
  activity_date: string;
  start_time: string;
  total_seats: number | null;
};

/** «اليوم» بتوقيت الرياض، نصًّا — لا بساعة الجهاز. */
function todayRiyadh(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

export async function getUpcomingActivities(): Promise<{ data: Activity[]; error: string | null }> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, activity_type, location, activity_date, start_time, total_seats")
    .eq("is_cancelled", false)
    .gte("activity_date", todayRiyadh())
    .order("activity_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(30);

  if (error) return { data: [], error: error.message };

  return {
    data: (data as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      activityType: r.activity_type,
      location: r.location,
      date: r.activity_date,
      startTime: r.start_time.slice(0, 5),
      totalSeats: r.total_seats,
    })),
    error: null,
  };
}


/* ═════════════════════ نشاطٌ بعينه ═════════════════════ */

export type ActivityDetail = Activity & {
  description: string | null;
  locationUrl: string | null;
  endTime: string | null;
  coverImageUrl: string | null;
  targetGender: "male" | "female" | null;
  isPublished: boolean;
  isCancelled: boolean;
};

export async function getActivity(id: string): Promise<{ data: ActivityDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, name, description, activity_type, location, location_url, activity_date, start_time, end_time, total_seats, cover_image_url, target_gender, is_published, is_cancelled"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const r = data as Row & {
    description: string | null;
    location_url: string | null;
    end_time: string | null;
    cover_image_url: string | null;
    target_gender: "male" | "female" | null;
    is_published: boolean;
    is_cancelled: boolean;
  };

  return {
    data: {
      id: r.id,
      name: r.name,
      activityType: r.activity_type,
      location: r.location,
      date: r.activity_date,
      startTime: r.start_time.slice(0, 5),
      totalSeats: r.total_seats,
      description: r.description,
      locationUrl: r.location_url,
      endTime: r.end_time ? r.end_time.slice(0, 5) : null,
      coverImageUrl: r.cover_image_url,
      targetGender: r.target_gender,
      isPublished: r.is_published,
      isCancelled: r.is_cancelled,
    },
    error: null,
  };
}

/* ═════════════════════ المقاعد ═════════════════════ */

export type Seats = {
  mode: SeatMode;
  totalSeats: number | null;
  totalRemaining: number | null;
  maleRemaining: number | null;
  femaleRemaining: number | null;
};

/**
 * حالةُ المقاعد من دالّة القاعدة لا بالعدّ في الواجهة.
 *
 * ولا سبيلَ غيرُها: صفوفُ الحجز يحرسها `reservations_select_own` فلا يرى الحاجزُ إلّا
 * صفَّه، فعدُّ المشغول من العميل مستحيلٌ أصلًا. والدالّةُ `SECURITY DEFINER` تعدّ
 * وتردّ الأرقامَ مجرّدةً بلا أن تكشف أحدًا.
 */
export async function getSeats(activityId: string): Promise<Seats | null> {
  const { data, error } = await supabase.rpc("get_activity_seat_status", { p_activity_id: activityId });
  if (error || !data) return null;

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        male_seats: number | null;
        female_seats: number | null;
        male_remaining: number | null;
        female_remaining: number | null;
        total_seats: number | null;
        total_remaining: number | null;
      }
    | undefined;
  if (!row) return null;

  return {
    mode: seatMode(row.total_seats, row.male_seats),
    totalSeats: row.total_seats,
    totalRemaining: row.total_remaining,
    maleRemaining: row.male_remaining,
    femaleRemaining: row.female_remaining,
  };
}
