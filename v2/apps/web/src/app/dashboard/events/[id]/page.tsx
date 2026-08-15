import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getEventDetail } from "../data";
import { EventDetailView } from "../EventDetailView";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

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
        <PageHeader title="تفاصيل الفعاليّة" crumbLeaf="التفاصيل" />
        <Alert tone="warning" title="تعذّر جلب تفاصيل الفعاليّة">{error}</Alert>
      </>
    );
  }
  if (!detail) notFound();

  return <EventDetailView detail={detail} />;
}
