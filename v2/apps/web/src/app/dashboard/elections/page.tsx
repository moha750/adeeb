import { Alert } from "@adeeb/design-system";
import { getElections, getElectionCreateOptions } from "./data";
import { ElectionsView } from "./ElectionsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * غرفة الانتخابات — للإدارة والاطّلاع (قفلها `view_election_candidates`).
 * المديرُ (`manage_elections`) يرى الأزرار كاملةً؛ والمطّلِعُ (عضو الموارد) للقراءة.
 * أمّا ترشُّح العضو وتصويته فأبوابُه الثلاثة (`/run` · `/my` · `/vote`).
 */
export default async function ElectionsPage() {
  const denied = await denyUnless("/dashboard/elections");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  const canManage = !!me?.caps.includes("manage_elections");

  const [{ elections, error }, createOptions] = await Promise.all([
    getElections(),
    canManage ? getElectionCreateOptions() : Promise.resolve(null),
  ]);

  if (error) {
    return (
      <>
        <div className="ash-phead"><div><Breadcrumb /><h1>الانتخابات</h1></div></div>
        <Alert tone="warning" title="تعذّر جلب الانتخابات">{error}</Alert>
      </>
    );
  }

  return <ElectionsView elections={elections} createOptions={createOptions} readOnly={!canManage} />;
}
