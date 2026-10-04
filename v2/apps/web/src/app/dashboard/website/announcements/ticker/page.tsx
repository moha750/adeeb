import { Alert } from "@adeeb/design-system";
import { getAnnouncements } from "../data";
import { AnnouncementsView } from "../AnnouncementsView";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../_components/PageHeader";

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
 */
export const metadata = { title: "شريط الإعلانات" };

export default async function TickerPage() {
  const denied = await denyUnless("/dashboard/website/announcements");
  if (denied) return denied;

  if (!(await getWebsiteManager("announcements"))) {
    return <WebsiteDenied section="اللوحة الإعلانية" />;
  }

  const { announcements, error } = await getAnnouncements();

  if (error) {
    return (
      <>
        <PageHeader title="اللوحة الإعلانية" crumbLeaf="شريط الإعلانات" />
        <Alert tone="warning" title="تعذّر جلب الإعلانات">{error}</Alert>
      </>
    );
  }

  return <AnnouncementsView announcements={announcements} />;
}
