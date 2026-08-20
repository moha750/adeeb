import { denyUnless } from "@/app/dashboard/_shell/guard";
import { activeCommittees, listOpportunities } from "./data";
import { VolunteeringView } from "./VolunteeringView";

export const metadata = { title: "الفرص التطوّعيّة، بوّابة أديب" };

/**
 * **غرفةُ التطوّع** — قفلُها `manage_volunteering` (الرئيسان وقائد الموارد).
 * والفرصةُ ليست فعاليّةً: تلك مفتوحةٌ للناس، وهذه عملٌ داخليٌّ لمن يطمح للعضويّة.
 */
export default async function VolunteeringPage() {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const [rows, committees] = await Promise.all([listOpportunities(), activeCommittees()]);
  return <VolunteeringView rows={rows} committees={committees} />;
}
