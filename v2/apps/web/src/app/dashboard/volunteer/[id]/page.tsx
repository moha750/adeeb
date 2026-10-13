import { denyUnless } from "../../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyVolunteering } from "@/app/me/volunteering";
import { isFit } from "../../_portal/volunteer";
import { OpportunityGone, OpportunityRoom } from "../../_portal/OpportunityRoom";

/**
 * **فرصةُ تطوّع** — وجهةُ رابط القروب القصير (`/v/<id>`). تُعرَض من الفرص المفتوحة لصاحب الجلسة
 * (القارئُ نفسُه يحصر ما يُعرض: فئتُه وحالُها). وما أُغلق أو لم يُوجَد يُقال، ويُدَلّ على الغرفة.
 */
export const metadata = { title: "فرصة تطوّع، بوّابة أدِيب" };

const STATUS: Record<string, string> = {
  pending: "طلبك قيد المراجعة",
  accepted: "قُبلت، نراك في موعدك",
};

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/volunteer");
  if (denied) return denied;
  const { id } = await params;
  const me = (await getCurrentAdmin())!;
  const vol = await getMyVolunteering(me.id);
  const o = vol?.open.find((x) => x.id === id);

  if (!vol || !o) {
    const mine = vol?.applications.find((a) => a.opportunityId === id);
    return <OpportunityGone title={mine?.title ?? null} />;
  }

  const app = vol.applications.find((a) => a.opportunityId === id && (a.status === "pending" || a.status === "accepted"));
  return <OpportunityRoom o={o} fit={isFit(o, vol.prefs)} applied={!o.periods.length && app ? STATUS[app.status] : null} />;
}
