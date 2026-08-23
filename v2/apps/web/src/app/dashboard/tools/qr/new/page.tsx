import { denyUnless } from "@/app/dashboard/_shell/guard";
import { NewQrView } from "./NewQrView";

export const metadata = { title: "باركود جديد، بوّابة أديب" };

/** بابُ الإنشاء. القفلُ قفلُ الغرفة نفسِه (`use_qr_generator`). */
export default async function NewQrPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  return <NewQrView />;
}
