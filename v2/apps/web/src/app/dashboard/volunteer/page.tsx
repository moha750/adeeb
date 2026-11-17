import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getMyVolunteering } from "@/app/me/volunteering";
import { buildVolunteer } from "../_portal/volunteer";
import { MyVolunteerRoom } from "@/app/_ad/rooms/MyVolunteerRoom";
import { AccountRoom } from "@/app/_ad/account";
import { AdNote } from "@/app/_ad/primitives";

/**
 * **تطوّعي** — للمتطوّع وحده (`view_own_volunteering`، مفتاحٌ مشتقٌّ من مكانته لا يُمنح بدور).
 * مشاركاتُه وفرصُه ورحلتُه وسجلُّه، من `getMyVolunteering` بمعرّف صاحب الجلسة.
 * على قالب «الحساب» (اعتمده محمد ٢٠٢٦-١١-٠٥): المواضعُ تذاكر، و«رحلتك» رأسُ «سجلّك»، و«رغباتك» رأسُ «فرصٌ مفتوحة» — والجلبُ كما كان
 * حرفًا، والغرفةُ القديمة (`_portal/VolunteerRoom`) باقيةٌ بلا استعمال حتى يقرّر المالكُ حذفها. ولوحُ الغرفة في الإطارين (الشريطُ الجانبيّ
 * والإطارُ الخفيف) كحجوزاتي وشهاداتي.
 */
export const metadata = { title: "تطوّعي، بوّابة أدِيب" };

export default async function VolunteerPage() {
  const denied = await denyUnless("/dashboard/volunteer");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const vol = await getMyVolunteering(me.id);
  if (!vol) {
    return (
      <AccountRoom navPath="/dashboard/volunteer" title="تطوّعي">
        <AdNote tone="bad" title="تعذّر تحميل تطوّعك.">إعدادُ الخادم ناقص. أبلغ الإدارة.</AdNote>
      </AccountRoom>
    );
  }
  return <MyVolunteerRoom view={buildVolunteer(vol, me.gender === "female")} />;
}
