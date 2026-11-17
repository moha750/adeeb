import { getCreditPeople } from "@/lib/people";
import { getOrganizerOptions } from "../data";
import { EventForm } from "../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

export default async function NewEventPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const [{ options, error }, members] = await Promise.all([getOrganizerOptions(), getCreditPeople()]);
  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="فعاليّة جديدة" navPath="/dashboard/events" what="بيانات النموذج" message={error} />;

  return <EventForm organizers={options} members={members} />;
}
