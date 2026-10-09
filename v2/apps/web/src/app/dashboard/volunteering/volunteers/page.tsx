import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { activeCommittees, listVolunteers } from "../data";
import { VolunteersView } from "./VolunteersView";

export const metadata = { title: "سجلّ المتطوّعين، بوّابة أدِيب" };

export default async function VolunteersPage() {
  const denied = await denyUnless("/dashboard/volunteering/volunteers");
  if (denied) return denied;

  const [rows, committees, me] = await Promise.all([listVolunteers(), activeCommittees(), getCurrentAdmin()]);
  // الإهداءُ قدرةٌ ثانيةٌ فوق قفل الغرفة: للرئيسين وقائد الموارد وحدَهم (قرار المالك ٢٠٢٦-١٠-٠٩).
  // والقاعدةُ تردّ غيرَهم أصلًا، فلا يُعرَض زرٌّ يُضغط ليُرفَض.
  const canGrant = !!me?.caps.includes("manage_membership_applications");
  return <VolunteersView rows={rows} committees={committees} canGrant={canGrant} />;
}
