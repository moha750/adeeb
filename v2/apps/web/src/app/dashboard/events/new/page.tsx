import { Alert } from "@adeeb/design-system";
import { getOrganizerOptions } from "../data";
import { EventForm } from "../EventForm";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function NewEventPage() {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { options, error } = await getOrganizerOptions();
  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb leaf="فعاليّة جديدة" />
            <h1>فعاليّة جديدة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر تجهيز النموذج">{error}</Alert>
      </>
    );
  }

  return <EventForm organizers={options} />;
}
