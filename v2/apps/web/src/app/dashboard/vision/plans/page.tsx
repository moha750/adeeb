import type { Metadata } from "next";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomDenied, AdRoomError } from "@/app/_ad/states";
import { VisionPlansRoom } from "@/app/_ad/rooms/VisionPlansRoom";
import { getCurrentAdmin } from "@/lib/auth";
import { getPlans, planAccess } from "./data";

export const metadata: Metadata = { title: "الرؤى" };

/**
 * **«الرؤى»** (دورةُ حياة الرؤية ٢٠٢٦-١١-٢٢) — تحت بابِ «متابعة الرؤية» (`work_vision`)، ولا يدخلها إلّا من يُعدّ الرؤى (`draft_vision`:
 * إدارةُ الضمان والجودة والرئيسان) ومن يسمّي فريقها (`manage_vision`).
 */
export default async function VisionPlansPage() {
  const denied = await denyUnless("/dashboard/vision/plans");
  if (denied) return denied;
  const me = await getCurrentAdmin();
  if (!me) return null;
  const access = await planAccess(me.id);
  if (!access || !(access.drafter || access.president)) {
    return <AdRoomDenied title="الرؤى" navPath="/dashboard/vision" what="إعداد الرؤى" desc="هذه الغرفة لإدارة الضمان والجودة والرئيسين." />;
  }
  const { data, error } = await getPlans(access);
  if (error || !data) return <AdRoomError title="الرؤى" navPath="/dashboard/vision/plans" what="الرؤى" message={error ?? "تعذّر تحميل الرؤى."} />;
  return <VisionPlansRoom plans={data} access={access} />;
}
