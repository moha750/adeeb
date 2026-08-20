import { bookError } from "@adeeb/core/activities";

import { supabase } from "./supabase";

/**
 * الحجزُ والإلغاء.
 *
 * **لا خادمَ بيننا وبين القاعدة.** جدولُ `activity_reservations` لا سياسةَ كتابةٍ عليه
 * أصلًا (لا لـanon ولا لـauthenticated)، والكتابةُ كلُّها عبر دوالَّ `SECURITY DEFINER`
 * ممنوحةٍ للعميل تتحقّق بنفسها من `auth.uid()`، وتقفل صفَّ النشاط بـ`FOR UPDATE` فلا
 * يسبق حاجزان إلى مقعدٍ واحد. فالتطبيقُ يناديها كما يناديها المتصفّحُ حرفًا بحرف.
 */

export type SeatStatus = {
  mode: "unlimited" | "shared" | "split";
  total: number | null;
  takenTotal: number;
  maleSeats: number | null;
  femaleSeats: number | null;
  takenMale: number;
  takenFemale: number;
};

export type Booking = {
  id: string;
  activityId: string;
  activityName: string;
  date: string;
  startTime: string;
  gender: "male" | "female";
};

/** حجوزي المؤكّدة — تحرسها `reservations_select_own` فلا أرى إلّا صفوفي. */
export async function getMyBookings(): Promise<{ data: Booking[]; error: string | null }> {
  const { data, error } = await supabase
    .from("activity_reservations")
    .select("id, gender_at_booking, activities!inner(id, name, activity_date, start_time)")
    .eq("status", "confirmed")
    .order("reserved_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  type Row = {
    id: string;
    gender_at_booking: "male" | "female";
    activities: { id: string; name: string; activity_date: string; start_time: string };
  };

  return {
    data: (data as unknown as Row[]).map((r) => ({
      id: r.id,
      activityId: r.activities.id,
      activityName: r.activities.name,
      date: r.activities.activity_date,
      startTime: r.activities.start_time.slice(0, 5),
      gender: r.gender_at_booking,
    })),
    error: null,
  };
}

/** حجزي في نشاطٍ بعينه، إن وُجد. */
export async function getMyBooking(activityId: string): Promise<Booking | null> {
  const { data } = await supabase
    .from("activity_reservations")
    .select("id, gender_at_booking, activities!inner(id, name, activity_date, start_time)")
    .eq("activity_id", activityId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!data) return null;
  const r = data as unknown as {
    id: string;
    gender_at_booking: "male" | "female";
    activities: { id: string; name: string; activity_date: string; start_time: string };
  };
  return {
    id: r.id,
    activityId: r.activities.id,
    activityName: r.activities.name,
    date: r.activities.activity_date,
    startTime: r.activities.start_time.slice(0, 5),
    gender: r.gender_at_booking,
  };
}

export type BookResult = { ok: true; id: string } | { ok: false; message: string };

export async function bookSeat(activityId: string): Promise<BookResult> {
  const { data, error } = await supabase.rpc("book_activity_seat", { p_activity_id: activityId });
  if (error) return { ok: false, message: bookError(error.message) };
  return { ok: true, id: String(data) };
}

export async function cancelBooking(reservationId: string, reason: string): Promise<BookResult> {
  const { error } = await supabase.rpc("cancel_activity_reservation", {
    p_reservation_id: reservationId,
    p_reason: reason,
  });
  if (error) return { ok: false, message: bookError(error.message) };
  return { ok: true, id: reservationId };
}

/**
 * بيانُ الزائر أوّلَ مرّة — الاسمُ والجوّالُ والجنس.
 * والجنسُ ليس حقلًا زائدًا: الفعاليّةُ المقسومةُ تحجز به، والقاعدةُ ترفض `GENDER_REQUIRED`
 * لمن لا جنسَ له. ويُكتب مرّةً ولا يُعدَّل من هنا (الكتابةُ على `profiles` منزوعةٌ عن العميل).
 */
export async function createMyProfile(input: {
  fullName: string;
  phone: string;
  gender: "male" | "female";
  city?: string;
}): Promise<BookResult> {
  const { error } = await supabase.rpc("create_my_account_profile", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_gender: input.gender,
    p_city: input.city ?? null,
    p_accepts_marketing: false,
  });
  if (error) return { ok: false, message: bookError(error.message) };
  return { ok: true, id: "profile" };
}
