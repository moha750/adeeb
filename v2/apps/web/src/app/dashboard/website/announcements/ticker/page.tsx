import { getAnnouncements } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { TickerRoom } from "@/app/_ad/rooms/TickerRoom";
import { AdRoomError } from "@/app/_ad/states";
import { TICKER_ROOM } from "@/app/_ad/rooms/ticker.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **شريط الإعلانات** — كلماتُ الشريط الجاري في صدر الهبوط (٢٠٢٦-٠٩-١٨)، البابُ الأوّل
 * في «اللوحة الإعلانية». وجارُه «الأخبار المعروضة» في `../news` (٢٠٢٦-١٠-٠٣).
 *
 * كانت الجملُ الخمسُ ثابتًا في `Hero.tsx` (`TICKER`)، فتبديلُ كلمةٍ نشرٌ كامل. طلب
 * المالك أن تُدار من اللوحة، فنزلت إلى جدول `announcements` وصار هذا بابَها.
 *
 * **ولمَ مسارٌ فرعيٌّ لا جذرُ الغرفة** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٣ بلقطتين: «الأخبار
 * المعروضة لها فتات، وشريط الإعلانات ليس لها»): الفتاتُ تُسمّي الورقةَ حين يكون المسارُ
 * تحت بند الخريطة، أمّا على البند نفسِه فالورقةُ تحلّ محلَّ اسمه (`crumbFor`)، فيسقط
 * «اللوحة الإعلانية» من الفتات. فصار البابان كلاهما تحت البند، وتماثلت فتاتُهما.
 * والجذرُ يحوّل إلى هنا، فلا ينكسر رابطٌ محفوظ.
 *
 * **وعلى قالب «قائمة السجلّات»** (٢٠٢٦-١١-٠٢): الغرفةُ `TickerRoom`، وجارُها فعلٌ ثانٍ على لوحها بدل المبدّل القديم.
 */
export const metadata = roomMetadata(TICKER_ROOM);

export default async function TickerPage() {
  const denied = await denyUnless("/dashboard/website/announcements");
  if (denied) return denied;

  if (!(await getWebsiteManager("announcements"))) {
    return <WebsiteDenied section="اللوحة الإعلانية" />;
  }

  const { announcements, error } = await getAnnouncements();
  if (error) return <AdRoomError {...TICKER_ROOM} message={error} />;

  return <TickerRoom announcements={announcements} view={await roomView(TICKER_ROOM.viewKey, TICKER_ROOM.defaultView)} />;
}
