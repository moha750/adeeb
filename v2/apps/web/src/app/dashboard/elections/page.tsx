import { Alert } from "@adeeb/design-system";
import { getElections, getElectionCreateOptions } from "./data";
import { ElectionsView } from "./ElectionsView";
import { Maintenance } from "../_components/Maintenance";
import { denyUnless } from "@/app/dashboard/_shell/guard";

// التبويب تحت الصيانة مؤقّتًا — يُعرَض إشعار الصيانة مكان المحتوى. أعِد التبويب بجعلها false.
const UNDER_MAINTENANCE = true;

export default async function ElectionsPage() {
  const denied = await denyUnless("/dashboard/elections");
  if (denied) return denied;

  if (UNDER_MAINTENANCE)
    return <Maintenance crumb={<>أديب › التفاعل › <b>الانتخابات</b></>} title="الانتخابات" />;

  const [{ elections, error }, createOptions] = await Promise.all([getElections(), getElectionCreateOptions()]);

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › التفاعل › <b>الانتخابات</b></div>
            <h1>الانتخابات</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الانتخابات">{error}</Alert>
      </>
    );
  }

  return <ElectionsView elections={elections} createOptions={createOptions} />;
}
