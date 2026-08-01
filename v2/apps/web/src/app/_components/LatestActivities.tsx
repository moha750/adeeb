import { createAdeebServerClient, toLatinDigits } from "@adeeb/core";
import { TYPE_META, type ActivityType } from "@/lib/activities";
import { ActivitiesCarousel, type ActCard } from "./ActivitiesCarousel";

// تنسيق التاريخ على الخادم (أرقام لاتينية) لتفادي اختلاف الترميز بين الخادم والعميل
function dayNum(d: string): string {
  try {
    return new Intl.DateTimeFormat("en", { day: "numeric" }).format(new Date(d));
  } catch {
    return "";
  }
}
function monthShort(d: string): string {
  try {
    return new Intl.DateTimeFormat("ar", { month: "short" }).format(new Date(d));
  } catch {
    return "";
  }
}

type Activity = {
  id: string;
  name: string;
  activity_type: string | null;
  location: string | null;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  cover_image_url: string | null;
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
function timeRange(start: string | null, end: string | null): string | null {
  const s = hhmm(start);
  const e = hhmm(end);
  if (!s) return null;
  return e ? `${s} – ${e}` : s;
}

/** قسم حيّ: برامجنا وأنشطتنا — إطلالة جانبية ببطاقات تسجيل من Supabase. */
export async function LatestActivities() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("activities")
    .select("id,name,activity_type,location,activity_date,start_time,end_time,cover_image_url")
    .eq("is_published", true)
    .eq("is_cancelled", false)
    .order("activity_date", { ascending: false })
    .limit(10)
    .returns<Activity[]>();

  if (error) {
    return <p className="text-danger">تعذّر جلب الأنشطة: {error.message}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-content-muted">لا توجد أنشطة منشورة حاليًا.</p>;
  }

  const items: ActCard[] = data.map((a) => ({
    id: a.id,
    name: toLatinDigits(a.name),
    typeLabel: TYPE_META[a.activity_type as ActivityType]?.label ?? "نشاط",
    location: a.location ? toLatinDigits(a.location) : null,
    day: dayNum(a.activity_date),
    month: monthShort(a.activity_date),
    time: timeRange(a.start_time, a.end_time),
    cover: a.cover_image_url,
    href: `/activities/${a.id}`,
  }));

  return <ActivitiesCarousel items={items} />;
}
