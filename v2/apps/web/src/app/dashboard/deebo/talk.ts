import type { DeeboConversation } from "./data";
import { standingName } from "@/lib/standing";

/**
 * حقائقُ المحادثة المشتقّة — **بلا إطارٍ ولا خادم**، فتقرؤها القائمةُ العميليّة وصفحةُ
 * الحوار الخادميّة من مصدرٍ واحد (سابقةُ `vocab.ts` في سائر الغرف).
 *
 * والنوعُ وحدَه يُستورَد من `data.ts` (وهي `server-only`)، واستيرادُ الأنواع يُمحى عند
 * الترجمة فلا يصل المتصفّح منه شيء.
 */

/**
 * اسمُ من له حسابٌ ولا اسمَ في ملفّه — يكتبه `data.ts` ويقرؤه `askerLine` فلا تتكرّر الصفة:
 * كان «صاحبُ حسابٍ لا اسمَ له» فيُقرأ السطرُ «صاحبُ حساب صاحبُ حسابٍ لا اسمَ له».
 */
export const NAMELESS_OWNER = "حسابٌ بلا اسم";

/** أوّلُ ما قاله الزائر: عنوانُ المحادثة الطبيعيّ، ولا عنوانَ يُكتب لها غيرُه. */
export const firstAsk = (c: DeeboConversation): string =>
  c.messages.find((m) => m.role === "user")?.content ?? "محادثةٌ بلا سؤال";

/**
 * **السائلُ كما يُقرأ**: صفتُه ثمّ اسمُه («عضو أدِيب سارة القحطاني»)، والمجهولُ «زائرٌ مجهول».
 *
 * والصفةُ تسبق الاسمَ بأمر المالك ٢٠٢٦-٠٨-٢٣: من يقرأ السجلَّ يسأل أوّلًا **مَن هذا من
 * أدِيب** (أعضوٌ يعرف الجواب أصلًا؟ أم زائرٌ يطرق البابَ أوّلَ مرّة؟) ثمّ يسأل عن اسمه.
 * وهي من القاعدة لا من وجود الحساب: صاحبُ الحساب ليس عضوًا بالضرورة.
 */
export const askerLine = (c: DeeboConversation): string => {
  if (!c.ownerName) return "زائرٌ مجهول";
  const title = standingName(c.ownerStanding ?? "account", c.ownerGender);
  return c.ownerName === NAMELESS_OWNER ? `${title} بلا اسم` : `${title} ${c.ownerName}`;
};

/** حجب حارسُ الأرقام جملةً في أحد أجوبتها — نغمةُ الصفّ ومرشِّحُ الشريط يقرآنها. */
export const hasGuardBlock = (c: DeeboConversation): boolean => c.messages.some((m) => m.guardBlocked);
