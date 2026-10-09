import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubNow } from "@/lib/volunteerPeriods";
import { activeCommittees } from "../data";
import { OpportunityForm } from "../OpportunityForm";

export const metadata = { title: "فرصة تطوّعيّة جديدة، بوّابة أدِيب" };

/** إنشاءُ فرصة — صفحةٌ لا نافذة منذ صار الموعدُ فتراتٍ (٢٠٢٦-١٠-٠١، `OpportunityForm`). */
export default async function NewOpportunityPage() {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;
  return <OpportunityForm committees={await activeCommittees()} now={clubNow()} />;
}
