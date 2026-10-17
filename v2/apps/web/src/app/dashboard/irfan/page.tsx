import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { PageHeader } from "../_components/PageHeader";
import { getIrfanRoom } from "./data";
import { IrfanRoom } from "./IrfanRoom";

/**
 * **عِرفان** (٢٠٢٦-١٠-١٧) — رسائلُ شكر أعضاء أدِيب لقادتهم في المجلسين. للعضو وحده.
 * خادميّةٌ تجلب وتمرّر، والعرضُ كلُّه في `IrfanRoom`.
 */
export const metadata = { title: "عِرفان، بوّابة أدِيب" };

export default async function IrfanPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const denied = await denyUnless("/dashboard/irfan");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const [data, sp] = await Promise.all([getIrfanRoom(me.id), searchParams]);
  const initial = Number(sp.m);
  return (
    <>
      <PageHeader title="عِرفان" />
      <IrfanRoom data={data} initial={Number.isSafeInteger(initial) ? initial : null} />
    </>
  );
}
