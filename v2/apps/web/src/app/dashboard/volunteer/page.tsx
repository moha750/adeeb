import { Alert } from "@adeeb/design-system";
import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { usesSidebar } from "@/lib/capabilities";
import { getMyVolunteering } from "@/app/me/volunteering";
import { PageHeader } from "../_components/PageHeader";
import { buildVolunteer } from "../_portal/volunteer";
import { VolunteerRoom } from "../_portal/VolunteerRoom";

/**
 * **تطوّعي** — للمتطوّع وحده (`view_own_volunteering`، مفتاحٌ مشتقٌّ من مكانته لا يُمنح بدور).
 * مشاركاتُه وفرصُه ورحلتُه وسجلُّه، من `getMyVolunteering` بمعرّف صاحب الجلسة.
 */
export const metadata = { title: "تطوّعي، بوّابة أدِيب" };

export default async function VolunteerPage() {
  const denied = await denyUnless("/dashboard/volunteer");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const vol = await getMyVolunteering(me.id);
  const header = usesSidebar(me.caps) ? <PageHeader title="تطوّعي" /> : null;
  if (!vol) return <>{header}<Alert tone="danger" title="تعذّر تحميل تطوّعك">إعداد الخادم ناقص. أبلغ الإدارة.</Alert></>;
  return <>{header}<VolunteerRoom view={buildVolunteer(vol, me.gender === "female")} /></>;
}
