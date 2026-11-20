import { getCreditPeople } from "@/lib/people";
import { notFound } from "next/navigation";
import { getEventForEdit, getOrganizerOptions } from "../../data";
import { EventForm } from "../../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "تحرير الفعاليّة، بوّابة أدِيب" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { id } = await params;

  const [{ event, error }, { options, error: oErr }, members] = await Promise.all([
    getEventForEdit(id),
    getOrganizerOptions(),
    getCreditPeople(),
  ]);

  const failure = error ?? oErr;
  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (failure) return <AdRoomError title="تحرير الفعاليّة" navPath="/dashboard/events" what="الفعاليّة" message={failure} />;
  if (!event) notFound();

  return <EventForm event={event} organizers={options} members={members} />;
}
