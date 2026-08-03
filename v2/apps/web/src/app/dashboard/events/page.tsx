import { Alert } from "@adeeb/design-system";
import { getEvents } from "./data";
import { EventsView } from "./EventsView";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "./_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../_shell/Breadcrumb";

export default async function EventsPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { events, error } = await getEvents();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>الفعاليّات</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الفعاليّات">{error}</Alert>
      </>
    );
  }

  return <EventsView events={events} />;
}
