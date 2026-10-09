import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubNow } from "@/lib/volunteerPeriods";
import { activeCommittees, getOpportunity } from "../../data";
import { OpportunityForm } from "../../OpportunityForm";

export const metadata = { title: "تحرير الفرصة، بوّابة أدِيب" };

/** تحريرُ فرصة — الصفحةُ نفسُها مملوءةً بما هو قائم، وفتراتُها بطلباتها (`getOpportunity`). */
export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const { id } = await params;
  const [data, committees] = await Promise.all([getOpportunity(id), activeCommittees()]);
  if (!data) notFound();
  return <OpportunityForm opp={data.opp} committees={committees} now={clubNow()} />;
}
