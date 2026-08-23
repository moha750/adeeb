import type { DeeboConversation } from "./data";

/**
 * حقائقُ المحادثة المشتقّة — **بلا إطارٍ ولا خادم**، فتقرؤها القائمةُ العميليّة وصفحةُ
 * الحوار الخادميّة من مصدرٍ واحد (سابقةُ `vocab.ts` في سائر الغرف).
 *
 * والنوعُ وحدَه يُستورَد من `data.ts` (وهي `server-only`)، واستيرادُ الأنواع يُمحى عند
 * الترجمة فلا يصل المتصفّح منه شيء.
 */

/** أوّلُ ما قاله الزائر: عنوانُ المحادثة الطبيعيّ، ولا عنوانَ يُكتب لها غيرُه. */
export const firstAsk = (c: DeeboConversation): string =>
  c.messages.find((m) => m.role === "user")?.content ?? "محادثةٌ بلا سؤال";

/** حجب حارسُ الأرقام جملةً في أحد أجوبتها — نغمةُ الصفّ ومرشِّحُ الشريط يقرآنها. */
export const hasGuardBlock = (c: DeeboConversation): boolean => c.messages.some((m) => m.guardBlocked);
