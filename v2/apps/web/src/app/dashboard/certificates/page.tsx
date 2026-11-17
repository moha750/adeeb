import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyVolunteering } from "@/app/me/volunteering";
import { getMyCertificates } from "../_portal/certificates";
import { MyCertificatesRoom } from "@/app/_ad/rooms/MyCertificatesRoom";

/**
 * **شهاداتي** — كلُّ ورقةٍ أصدرها أدِيب لصاحب الحساب: مشاركاتُ تطوّعه وخبرتُه في اللجان.
 * لكلّ صاحب حساب (`use_portal`)، والجلبُ بمعرّف صاحب الجلسة وحده.
 * على قالب «الحساب» (٢٠٢٦-١١-٠٤، اعتمده محمد): كلُّ شهادةٍ تذكرةُ ورقتها — والجلبُ كما كان حرفًا،
 * والمعرضُ القديم (`_portal/CertificatesRoom`) باقٍ بلا استعمال (ومنه يُستعار رسمُ الورقة وتنزيلُها).
 */
export const metadata = { title: "شهاداتي، بوّابة أدِيب" };

export default async function CertificatesPage() {
  const denied = await denyUnless("/dashboard/certificates");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const vol = await getMyVolunteering(me.id);
  const gender = me.gender === "female" || me.gender === "male" ? me.gender : null;
  const { certs, error } = await getMyCertificates(me.id, gender, vol?.certificates ?? []);
  return <MyCertificatesRoom certs={certs} volunteer={!!vol?.isVolunteer} member={me.caps.includes("view_own_membership")} error={error} />;
}
