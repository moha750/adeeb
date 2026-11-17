import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubDayKey } from "@/lib/dates";
import { listCertificateRoom, manualIssueOptions } from "../data";
import { VolunteerCertificatesRoom } from "@/app/_ad/rooms/VolunteerCertificatesRoom";
import { VOLUNTEER_CERTIFICATES_ROOM } from "@/app/_ad/rooms/volunteer-certificates.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(VOLUNTEER_CERTIFICATES_ROOM);

/**
 * **غرفةُ شهادات المتطوّعين** — قفلُها `manage_volunteering` كأختيها، فيراها الرئيسان وقائد الموارد وأعضاؤها وأعضاء الإدارة التنفيذيّة.
 * دفترٌ لا غرفةُ حكم: الحضورُ والاستحقاقُ يُحسمان في سجلّ الفرصة، وههنا يُرى ما تأخّر منهما
 * عبر الفرص كلِّها، وتُصدَر الجاهزةُ وتُبطَل الخاطئة. على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤)، والحارسُ والجلبُ كما كانا حرفًا،
 * والشاشةُ القديمة (`ParticipationView`) باقيةٌ بلا استعمال.
 */
export default async function ParticipationCertificatesPage() {
  const denied = await denyUnless("/dashboard/volunteering/certificates");
  if (denied) return denied;

  // «اليوم» بساعة الرياض يُحسب في الخادم ويُمرَّر (سنّةُ غرفة الفرص): منه يُعرف أحلّ موعدُ الفرصة
  const today = clubDayKey(new Date().toISOString());
  const [room, manual] = await Promise.all([listCertificateRoom(), manualIssueOptions(today)]);
  return (
    <VolunteerCertificatesRoom
      room={room}
      today={today}
      manual={manual}
      serverNow={await requestNow()}
      view={await roomView(VOLUNTEER_CERTIFICATES_ROOM.viewKey, VOLUNTEER_CERTIFICATES_ROOM.defaultView)}
    />
  );
}
