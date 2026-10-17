import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";

/**
 * **رابطُ «عِرفان» القصير** (`adeeb.club/irfan`) — ما يُلصق في مجتمع أدِيب العامّ. لا يعرض شيئًا بنفسه:
 * من لا جلسةَ له يدخل ثمّ يعود، ومن له جلسةٌ يهبط على صفحة الكتابة. وغيرُ العضو تقول له البوّابةُ
 * إنّ الغرفة ليست له (قفلُها `view_own_membership`). على سنّة `/v/[id]`.
 */
export default async function IrfanShortLink() {
  const me = await getSessionAdmin();
  if (!me) redirect(`/login?next=${encodeURIComponent("/irfan")}`);
  redirect("/dashboard/irfan/new");
}
