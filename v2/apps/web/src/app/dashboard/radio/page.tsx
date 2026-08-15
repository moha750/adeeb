import { Alert } from "@adeeb/design-system";
import { getCommitteeOptions, getMemberOptions, getShows, getStation } from "./data";
import { RadioView } from "./RadioView";
import { getRadioManager } from "@/lib/radio/authz";
import { RadioDenied } from "./_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";

export default async function RadioPage() {
  const denied = await denyUnless("/dashboard/radio");
  if (denied) return denied;

  if (!(await getRadioManager())) return <RadioDenied />;

  const [{ shows, error }, members, committees, { station }] = await Promise.all([
    getShows(),
    getMemberOptions(),
    getCommitteeOptions(),
    getStation(),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="إذاعة أدِيب" />
        <Alert tone="warning" title="تعذّر جلب البرامج">{error}</Alert>
      </>
    );
  }

  return <RadioView shows={shows} members={members} committees={committees} station={station} />;
}
