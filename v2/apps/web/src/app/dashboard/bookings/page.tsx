import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyAccount } from "@/app/me/data";
import { getPublicActivities } from "@/app/activities/data";
import { BookingsRoom } from "../_portal/BookingsRoom";
import { dayLabel, seatsLeft, today } from "../_portal/time";
import { PageHeader } from "../_components/PageHeader";
import { usesSidebar } from "@/lib/capabilities";

/**
 * **حجوزاتي** — مقاعدُ صاحب الحساب في فعاليّات أدِيب (كانت في `/me`). لكلّ صاحب حساب (`use_portal`):
 * الصديقُ والمتطوّعُ في تبويباتهما، والعضوُ في شريطه. والجلبُ بمعرّف صاحب الجلسة وحده.
 */
export const metadata = { title: "حجوزاتي، بوّابة أدِيب" };


export default async function BookingsPage() {
  const denied = await denyUnless("/dashboard/bookings");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const account = await getMyAccount(me.id);
  const upcoming = account?.upcoming ?? [];
  const now = today();
  const open = upcoming.length
    ? []
    : (await getPublicActivities())
        .filter((a) => !a.full && a.date >= now)
        .slice(0, 3)
        .map((a) => ({ id: a.id, title: a.name, when: dayLabel(a.date), seats: seatsLeft(a.totalRemaining, a.unlimited) }));

  return (
    <>
      {/* في الشريط الجانبيّ عنوانٌ كسائر غرف اللوحة؛ وفي الإطار الخفيف التبويبُ نفسُه عنوانُها */}
      {usesSidebar(me.caps) ? <PageHeader title="حجوزاتي" /> : null}
      <BookingsRoom upcoming={upcoming} past={account?.past ?? []} open={open} female={me.gender === "female"} />
    </>
  );
}
