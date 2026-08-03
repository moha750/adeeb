import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getEventDetail } from "../data";
import { EventDetailView } from "../EventDetailView";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { id } = await params;
  const { detail, error, notFound: nf } = await getEventDetail(id);
  if (nf) notFound();
  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb leaf="التفاصيل" />
            <h1>تفاصيل الفعاليّة</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب تفاصيل الفعاليّة">{error}</Alert>
      </>
    );
  }
  if (!detail) notFound();

  return <EventDetailView detail={detail} />;
}
