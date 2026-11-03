import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCertificates } from "../data";
import { MemberCertificatesRoom } from "@/app/_ad/rooms/MemberCertificatesRoom";
import { AdRoomError } from "@/app/_ad/states";
import { MEMBER_CERTIFICATES_ROOM } from "@/app/_ad/rooms/member-certificates.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(MEMBER_CERTIFICATES_ROOM);

/**
 * غرفةُ شهادات الخبرة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: المعاينةُ (`preview`) شقيقُها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export default async function CertificatesPage() {
  const denied = await denyUnless("/dashboard/members/certificates");
  if (denied) return denied;

  const data = await getCertificates();
  if (data.error) return <AdRoomError {...MEMBER_CERTIFICATES_ROOM} message={data.error} />;

  return (
    <MemberCertificatesRoom
      rows={data.rows}
      targets={data.targets}
      serverNow={await requestNow()}
      view={await roomView(MEMBER_CERTIFICATES_ROOM.viewKey, MEMBER_CERTIFICATES_ROOM.defaultView)}
    />
  );
}
