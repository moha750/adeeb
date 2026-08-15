import { Alert } from "@adeeb/design-system";
import { getOrganizerOptions } from "../data";
import { EventForm } from "../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

export default async function NewEventPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { options, error } = await getOrganizerOptions();
  if (error) {
    return (
      <>
        <PageHeader title="فعاليّة جديدة" />
        <Alert tone="warning" title="تعذّر تجهيز النموذج">{error}</Alert>
      </>
    );
  }

  return <EventForm organizers={options} />;
}
