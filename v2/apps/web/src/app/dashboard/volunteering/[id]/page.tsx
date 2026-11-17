import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubNow } from "@/lib/volunteerPeriods";
import { getOpportunity } from "../data";
import { OpportunityRecordRoom } from "@/app/_ad/rooms/OpportunityRecordRoom";

export const metadata = { title: "سجلّ الفرصة، بوّابة أدِيب" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const { id } = await params;
  const data = await getOpportunity(id);
  if (!data) notFound();

  // على قالب «التذكرة المفتوحة» (٢٠٢٦-١١-٠٧)؛ والقديمةُ `./OpportunityRecord.tsx` باقيةٌ حتى يقرّر صاحبُ الموقع حذفَها
  return <OpportunityRecordRoom opp={data.opp} rows={data.rows} now={clubNow()} />;
}
