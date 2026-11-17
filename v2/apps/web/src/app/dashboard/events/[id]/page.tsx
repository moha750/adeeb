import { notFound } from "next/navigation";
import { getEventDetail } from "../data";
import { getEventsManager } from "@/lib/events/authz";
import { EventsDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { EventRecordRoom } from "@/app/_ad/rooms/EventRecordRoom";
import { AdRoomError } from "@/app/_ad/states";

/** اسمُ التبويب كإخوته من صفحات السجلّ (كان «بوّابة أدِيب» وحده) */
export const metadata = { title: "تفاصيل الفعاليّة، بوّابة أدِيب" };

/**
 * صفحةُ الفعاليّة على قالب «التذكرة المفتوحة» (٢٠٢٦-١١-٠٧). الحرّاسُ والجلبُ كما كانت حرفًا؛ والخطأُ حالُ الغرفة («القطعة» برمز السحابة
 * المنقطعة وبلاغِ الدعم) لا تنبيهٌ تحت رأسٍ قديم. والصفحةُ القديمة `../EventDetailView.tsx` باقيةٌ حتى يقرّر صاحبُ الموقع حذفَها.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/events");
  if (denied) return denied;

  if (!(await getEventsManager())) return <EventsDenied />;

  const { id } = await params;
  const { detail, error, notFound: nf } = await getEventDetail(id);
  if (nf) notFound();
  if (error) return <AdRoomError title="تفاصيل الفعاليّة" navPath="/dashboard/events" viewKey="events-record" cols={1} what="تفاصيل الفعاليّة" message={error} />;
  if (!detail) notFound();

  return <EventRecordRoom detail={detail} />;
}
