import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getEventForEdit, getOrganizerOptions } from "../../data";
import { EventForm } from "../../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { id } = await params;

  const [{ event, error }, { options, error: oErr }] = await Promise.all([
    getEventForEdit(id),
    getOrganizerOptions(),
  ]);

  const failure = error ?? oErr;
  if (failure) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › التفاعل › الفعاليّات › <b>تحرير</b></div>
            <h1>تحرير الفعاليّة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الفعاليّة">{failure}</Alert>
      </>
    );
  }
  if (!event) notFound();

  return <EventForm event={event} organizers={options} />;
}
