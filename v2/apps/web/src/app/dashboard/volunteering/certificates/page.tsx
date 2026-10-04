import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubDayKey } from "@/lib/dates";
import { listCertificateRoom, manualIssueOptions } from "../data";
import { ParticipationView } from "./ParticipationView";

export const metadata = { title: "شهادات المتطوّعين، بوّابة أديب" };

/**
 * **غرفةُ شهادات المتطوّعين** — قفلُها `manage_volunteering` كأختيها، فيراها الموارد والرئيسان.
 * دفترٌ لا غرفةُ حكم: الحضورُ والاستحقاقُ يُحسمان في سجلّ الفرصة، وههنا يُرى ما تأخّر منهما
 * عبر الفرص كلِّها، وتُصدَر الجاهزةُ وتُبطَل الخاطئة.
 */
export default async function ParticipationCertificatesPage() {
  const denied = await denyUnless("/dashboard/volunteering/certificates");
  if (denied) return denied;

  // «اليوم» بساعة الرياض يُحسب في الخادم ويُمرَّر (سنّةُ غرفة الفرص): منه يُعرف أحلّ موعدُ الفرصة
  const today = clubDayKey(new Date().toISOString());
  const [room, manual] = await Promise.all([listCertificateRoom(), manualIssueOptions(today)]);
  return <ParticipationView room={room} today={today} manual={manual} />;
}
