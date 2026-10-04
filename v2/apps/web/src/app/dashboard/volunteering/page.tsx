import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubDayKey } from "@/lib/dates";
import { listOpportunities } from "./data";
import { VolunteeringView } from "./VolunteeringView";

export const metadata = { title: "الفرص التطوّعيّة، بوّابة أديب" };

/**
 * **غرفةُ التطوّع** — قفلُها `manage_volunteering` (الرئيسان وقائد الموارد).
 * والفرصةُ ليست فعاليّةً: تلك مفتوحةٌ للناس، وهذه عملٌ داخليٌّ لمن يطمح للعضويّة.
 */
export default async function VolunteeringPage() {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const rows = await listOpportunities();
  // «اليوم» بساعة الرياض يُحسب هنا مرّةً ويُمرَّر: منه يُعرف أمضى موعدُ الفرصة أم لا، ولو حُسب في
  // المتصفّح لاختلف الخادمُ والمتصفّحُ ليلةَ منتصف الليل فتباين الترطيب
  const today = clubDayKey(new Date().toISOString());
  return <VolunteeringView rows={rows} today={today} />;
}
