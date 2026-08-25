import { Hash, HourglassMedium, Pause, Timer, Trophy } from "@phosphor-icons/react";
import type { WordBoardIcons } from "@adeeb/design-system";

/**
 * **أيقوناتُ لوح الكلمة — تُعلَن مرّةً هنا.**
 *
 * المكتبةُ لا تستورد حزمةَ أيقونات (لا تبعيّةَ في `package.json`، ولا ملفَّ فيها يمسّ
 * Phosphor)، وقانونُها أنّ **الأيقونةَ تُمرَّر خاصّيّةً** كما في `Field` و`Alert`
 * و`Badge`. فلو رسم اللوحُ أيقوناتِه بنفسه لخرجت خطوطًا رفيعةً وسط موقعٍ كلُّه
 * duotone — وهو ما وقع في أوّل بناءٍ ثمّ صُحّح.
 *
 * وتُعلَن **مرّةً واحدةً** لا في كلّ مستدعٍ: أربعُ شاشاتٍ تعرض اللوحَ (المِقوَد ·
 * شاشةُ العرض · شاشةُ اللاعب · المعرض)، ولو كتب كلٌّ أيقوناتِه لافترقت واحدةٌ يومًا.
 *
 * ولا `weight` هنا: الوزنُ من سياق الجذر (`IconDefaults`) كسائر أيقونات الموقع.
 * **والمدخلُ هو المدخلُ العاديّ لا `/dist/ssr`**: الثاني لا يقرأ `IconContext`، فتقع
 * الأيقونةُ `regular` وسط موقعٍ كلُّه duotone. (أمسكه `scripts/glyph-weights.mjs`.)
 */
export const BOARD_ICONS: WordBoardIcons = {
  round: <Hash />,
  timer: <Timer />,
  paused: <Pause />,
  idle: <HourglassMedium />,
  winner: <Trophy />,
};
