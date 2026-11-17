import { redirect } from "next/navigation";
import { denyUnless } from "../../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { amILeader, getOpenSeason, getRecipients } from "../data";
import { sendIrfan } from "../actions";
import { IrfanComposeRoom } from "@/app/_ad/rooms/IrfanComposeRoom";

/** **اكتب عِرفانًا** — للعضو، والموسمُ مفتوح. ومن جاء والموسمُ مغلقٌ عاد إلى الغرفة. على قالب «النموذج» منذ ٢٠٢٦-١١-١٣. */
export const metadata = { title: "اكتب عِرفانًا، بوّابة أدِيب" };

export default async function IrfanNewPage() {
  const denied = await denyUnless("/dashboard/irfan");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const season = await getOpenSeason();
  if (!season) redirect("/dashboard/irfan");
  const [{ list, error }, canReceive] = await Promise.all([getRecipients(), amILeader(me.id)]);
  const gender = me.gender === "female" || me.gender === "male" ? me.gender : null;
  return <IrfanComposeRoom leaders={list} season={season.title} sender={{ name: me.fullName ?? "", gender }} canReceive={canReceive} send={sendIrfan} error={error} />;
}
