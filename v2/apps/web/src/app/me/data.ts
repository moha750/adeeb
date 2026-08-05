import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate, timeLabel } from "@/app/activities/data";
import type { ActivityType } from "@/lib/activities";

/**
 * قارئُ بيت صاحب الحساب.
 *
 * **بمفتاح الخدمة لا بمفتاح صاحبه** — وليس تجاوزًا للحراسة بل موضعُها: البابُ يُحرَس مرّةً في
 * الصفحة (لا جلسةَ ← `/login`)، ثمّ يُقرأ **بمعرّف صاحب الجلسة وحده** في كلّ استعلام. وهذا
 * عُرفُ V2 كلِّه: الخادمُ يقرأ ويكتب، والمتصفّح يطلب.
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type MyReservation = {
  id: string;
  activityId: string;
  name: string;
  type: ActivityType;
  date: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  cancelled: boolean;
  /** لم يمضِ يومُها بعد — وهي وحدها ما يُلغى (القاعدة تمنع إلغاء الماضي). */
  upcoming: boolean;
  attended: boolean;
  whatsappConfirmed: boolean;
};

export type MyAccount = {
  /** له صفٌّ في `profiles`؟ من دخل بالرمز ولم يُكمل بياناته قطُّ لا صفَّ له. */
  hasProfile: boolean;
  /** عضوٌ في النادي (له تاريخُ انضمام) — بيتُه اللوحةُ لا هذه الصفحة. */
  isMember: boolean;
  fullName: string;
  email: string;
  phone: string;
  gender: "male" | "female" | null;
  city: string;
  upcoming: MyReservation[];
  past: MyReservation[];
};

type RawResv = {
  id: string;
  activity_id: string;
  status: string;
  attendance_status: string | null;
  whatsapp_confirmed_at: string | null;
};
type RawAct = {
  id: string; name: string; activity_type: ActivityType; activity_date: string;
  start_time: string | null; end_time: string | null; location: string | null;
};

/** يومُ الرياض بصيغة YYYY-MM-DD — الحجزُ يُقاس بيوم الفعاليّة لا بلحظتها (كما في القاعدة). */
function riyadhToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

export async function getMyAccount(userId: string): Promise<MyAccount | null> {
  const sb = service();
  if (!sb) return null;

  const [pRes, rRes] = await Promise.all([
    sb.from("profiles").select("full_name, email, phone, gender, city, joined_date").eq("id", userId).maybeSingle(),
    sb.from("activity_reservations")
      .select("id, activity_id, status, attendance_status, whatsapp_confirmed_at")
      .eq("user_id", userId),
  ]);

  const p = pRes.data;
  const raw = (rRes.data ?? []) as RawResv[];

  // الفعاليّاتُ تُجلَب مرّةً بمعرّفاتها — لا وصلةَ مضمَّنة (PostgREST) كي يبقى الاستعلام صريحًا.
  const ids = [...new Set(raw.map((r) => r.activity_id))];
  const aRes = ids.length
    ? await sb.from("activities")
        .select("id, name, activity_type, activity_date, start_time, end_time, location")
        .in("id", ids)
    : { data: [] as RawAct[] };
  const byId = new Map(((aRes.data ?? []) as RawAct[]).map((a) => [a.id, a]));

  const today = riyadhToday();
  const rows: MyReservation[] = raw
    .map((r) => {
      const a = byId.get(r.activity_id);
      if (!a) return null;
      return {
        id: r.id,
        activityId: a.id,
        name: a.name,
        type: a.activity_type,
        date: a.activity_date,
        dateLabel: fmtDate(a.activity_date),
        timeLabel: timeLabel(a.start_time, a.end_time),
        location: a.location ?? null,
        cancelled: r.status === "cancelled",
        upcoming: r.status !== "cancelled" && a.activity_date >= today,
        attended: r.attendance_status === "attended",
        whatsappConfirmed: r.whatsapp_confirmed_at != null,
      } satisfies MyReservation;
    })
    .filter((r): r is MyReservation => r !== null);

  return {
    hasProfile: !!p,
    isMember: p?.joined_date != null,
    fullName: p?.full_name ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    gender: p?.gender === "male" || p?.gender === "female" ? p.gender : null,
    city: p?.city ?? "",
    // القادمُ الأقربُ أوّلًا، والماضي الأحدثُ أوّلًا — كلٌّ بترتيبِ ما يعني صاحبَه.
    upcoming: rows.filter((r) => r.upcoming).sort((x, y) => x.date.localeCompare(y.date)),
    past: rows.filter((r) => !r.upcoming).sort((x, y) => y.date.localeCompare(x.date)),
  };
}
