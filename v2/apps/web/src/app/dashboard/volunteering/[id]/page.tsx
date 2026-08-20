import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getOpportunity } from "../data";
import { OpportunityView } from "./OpportunityView";

export const metadata = { title: "سجلّ الفرصة، بوّابة أديب" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const { id } = await params;
  const data = await getOpportunity(id);
  if (!data) notFound();

  return <OpportunityView opp={data.opp} rows={data.rows} />;
}
