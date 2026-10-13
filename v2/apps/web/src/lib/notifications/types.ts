/**
 * **أنواعُ نظام الإشعارات** — بلا إطارٍ ولا خادم، فيستوردها الدليلُ والموزِّعُ والجرسُ سواءً.
 * التصميم: `v2/NOTIFICATIONS-SYSTEM.md`.
 */
import type { IconKey } from "@/app/dashboard/_shell/icons";

/**
 * **الدرجةُ تختار القناة** (القرار §٣هـ): العاديّ يبقى في الجرس، والمهمّ يبلغ شاشةَ القفل معه،
 * والحرِجُ يبلغ واتساب كذلك حين تُبنى قناتُه. والدرجةُ للمخاطَب لا للواقعة: قبولُ طلب تطوّعٍ
 * مهمٌّ لصاحبه وعاديٌّ لقائد لجنته.
 */
export type Level = "normal" | "important" | "critical";

/** جنسُ القارئ يصرّف النصّ، ومن لا جنسَ في ملفّه يأخذ المذكّر (سابقةُ `lib/warnings/message.ts`). */
export type Gender = "male" | "female" | null;

/**
 * **العنوانُ وصفٌ لا اسم** — يُحوَّل إلى أشخاصٍ في القاعدة لحظةَ التوزيع
 * (`notification_recipients`). وكلُّ شكلٍ هنا له فرعٌ هناك بالمفتاح نفسِه، وشكلٌ لا يُعرف
 * يُسقط التوزيعَ بخطئه ولا يُبتلَع.
 *
 * - `user`: شخصٌ بعينه.
 * - `seat`: شاغلُ المقعد الآن، أصيلًا أو مكلَّفًا (`committee_leader` + لجنةٌ، `department_head` + قسم).
 * - `capability`: كلُّ من يملك القدرة (منطقُ `get_user_permissions` نفسُه).
 * - `committee`: كلُّ مقاعد اللجنة الحيّة.
 * - `standing`: المنزلة كلُّها.
 */
export type Address =
  | { user: string }
  | { seat: string; committee?: number; department?: number }
  | { capability: string }
  | { committee: number }
  | { standing: "member" | "volunteer" };

/** ما يصل الجرسَ من الخادم: مرسومًا بجنس قارئه، فلا يبلغ المتصفّحَ من الواقعة إلّا ما يُقرأ. */
export type InboxItem = {
  id: number;
  icon: IconKey;
  level: Level;
  title: string;
  body: string | null;
  /** مسارٌ داخليّ، أو `null` لإشعارٍ حُذف نوعُه من الدليل فلم يبقَ له وِجهة. */
  href: string | null;
  at: string;
  unread: boolean;
};

export type InboxFilter = "unread" | "all";
