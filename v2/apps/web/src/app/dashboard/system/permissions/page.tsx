import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getPermissionMatrix, getVacantPositions, getViewAsTargets } from "./data";
import { PermissionsRoom } from "@/app/_ad/rooms/PermissionsRoom";

/** على قالب «الحساب» منذ ٢٠٢٦-١١-١٤ (`_ad/rooms/PermissionsRoom`)؛ والقديمُ (`./PermissionsMatrix`) يقرؤه المختبرُ للمقارنة. */
export const metadata = { title: "الصلاحيات، بوّابة أدِيب" };

export default async function PermissionsPage() {
  const denied = await denyUnless("/dashboard/system/permissions");
  if (denied) return denied;

  const [{ roles, capabilities, granted, error }, targets, vacancies] = await Promise.all([
    getPermissionMatrix(),
    getViewAsTargets(),
    getVacantPositions(),
  ]);

  return <PermissionsRoom roles={roles} capabilities={capabilities} granted={granted} targets={targets} vacancies={vacancies} error={error} />;
}
