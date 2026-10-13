import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { usesSidebar } from "@/lib/capabilities";
import { getMyVolunteering } from "@/app/me/volunteering";
import { PageHeader } from "../_components/PageHeader";
import { getMyCertificates } from "../_portal/certificates";
import { CertificatesRoom } from "../_portal/CertificatesRoom";

/**
 * **شهاداتي** — كلُّ ورقةٍ أصدرها أدِيب لصاحب الحساب: مشاركاتُ تطوّعه وخبرتُه في اللجان.
 * لكلّ صاحب حساب (`use_portal`)، والجلبُ بمعرّف صاحب الجلسة وحده.
 */
export const metadata = { title: "شهاداتي، بوّابة أدِيب" };

export default async function CertificatesPage() {
  const denied = await denyUnless("/dashboard/certificates");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const vol = await getMyVolunteering(me.id);
  const gender = me.gender === "female" || me.gender === "male" ? me.gender : null;
  const { certs, error } = await getMyCertificates(me.id, gender, vol?.certificates ?? []);
  return (
    <>
      {usesSidebar(me.caps) ? <PageHeader title="شهاداتي" /> : null}
      <CertificatesRoom certs={certs} volunteer={!!vol?.isVolunteer} member={me.caps.includes("view_own_membership")} error={error} />
    </>
  );
}
