import { denyUnless } from "@/app/dashboard/_shell/guard";
import { ApplyRouteBody } from "../../_member/ApplyRouteBody";

/**
 * إكمالُ الترشّح **الجديد** — تحت باب «الترشُّح» (`/run/[electionId]`) فيقرأ فتاتُها «بوّابة أديب ‹
 * الترشُّح ‹ …». يصلها العضو بعد بوّابة الشروط. محروسةٌ بقدرة `run_for_election`.
 */
export default async function ApplyFromRun({ params }: { params: Promise<{ electionId: string }> }) {
  const denied = await denyUnless("/dashboard/elections/run");
  if (denied) return denied;
  const { electionId } = await params;
  return <ApplyRouteBody electionId={electionId} />;
}
