import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getEventForEdit, getOrganizerOptions } from "../../data";
import { EventForm } from "../../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../_components/PageHeader";

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
        <PageHeader title="تحرير الفعاليّة" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب الفعاليّة">{failure}</Alert>
      </>
    );
  }
  if (!event) notFound();

  return <EventForm event={event} organizers={options} />;
}
