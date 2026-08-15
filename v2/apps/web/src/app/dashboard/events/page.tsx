import { Alert } from "@adeeb/design-system";
import { getEvents } from "./data";
import { EventsView } from "./EventsView";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "./_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";

export default async function EventsPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { events, error } = await getEvents();

  if (error) {
    return (
      <>
        <PageHeader title="الفعاليّات" />
        <Alert tone="warning" title="تعذّر جلب الفعاليّات">{error}</Alert>
      </>
    );
  }

  return <EventsView events={events} />;
}
