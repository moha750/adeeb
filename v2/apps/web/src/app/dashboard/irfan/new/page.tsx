import { redirect } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "../../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { PageHeader } from "../../_components/PageHeader";
import { getOpenSeason, getRecipients } from "../data";
import { sendIrfan } from "../actions";
import { IrfanCompose } from "../IrfanCompose";

/** **اكتب عِرفانًا** — للعضو، والموسمُ مفتوح. ومن جاء والموسمُ مغلقٌ عاد إلى الغرفة. */
export const metadata = { title: "اكتب عِرفانًا، بوّابة أدِيب" };

export default async function IrfanNewPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const denied = await denyUnless("/dashboard/irfan");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const season = await getOpenSeason();
  if (!season) redirect("/dashboard/irfan");
  const [{ list, error }, sp] = await Promise.all([getRecipients(), searchParams]);
  const gender = me.gender === "female" || me.gender === "male" ? me.gender : null;
  return (
    <>
      <PageHeader title="اكتب عِرفانًا" parent={{ label: "عِرفان", href: "/dashboard/irfan" }} />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <IrfanCompose leaders={list} season={season.title} sender={{ name: me.fullName ?? "", gender }} initialTo={sp.to ?? null} send={sendIrfan} />
    </>
  );
}
