import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getPermissionMatrix, getVacantPositions, getViewAsTargets } from "./data";
import { PermissionsMatrix } from "./PermissionsMatrix";
import { ViewAsPicker } from "./ViewAsPicker";
import { VacantSeatPicker } from "./VacantSeatPicker";
import { Breadcrumb } from "../../_shell/Breadcrumb";

const Head = () => (
  <div className="ash-phead">
    <div>
      <Breadcrumb />
      <h1>لوحة الصلاحيات</h1>
    </div>
  </div>
);

export default async function PermissionsPage() {
  const denied = await denyUnless("/dashboard/system/permissions");
  if (denied) return denied;

  const [{ roles, capabilities, granted, error }, targets, vacancies] = await Promise.all([
    getPermissionMatrix(),
    getViewAsTargets(),
    getVacantPositions(),
  ]);

  if (error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب الصلاحيات">{error}</Alert>
      </>
    );
  }

  return (
    <>
      <Head />
      {targets.length ? <ViewAsPicker targets={targets} /> : null}
      {vacancies.length ? <VacantSeatPicker seats={vacancies} /> : null}
      <PermissionsMatrix roles={roles} capabilities={capabilities} granted={granted} />
    </>
  );
}
