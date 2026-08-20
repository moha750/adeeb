import { denyUnless } from "@/app/dashboard/_shell/guard";
import { activeCommittees, listVolunteers } from "../data";
import { VolunteersView } from "./VolunteersView";

export const metadata = { title: "سجلّ المتطوّعين، بوّابة أديب" };

export default async function VolunteersPage() {
  const denied = await denyUnless("/dashboard/volunteering/volunteers");
  if (denied) return denied;

  const [rows, committees] = await Promise.all([listVolunteers(), activeCommittees()]);
  return <VolunteersView rows={rows} committees={committees} />;
}
