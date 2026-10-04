import type { HubGame } from "./Hub";

/**
 * **ألعابُ الصالة** — ما يُعرض في «ألعاب أدِيبيّة» بترتيبه. مصدرٌ واحدٌ للصفحة ولمعرضها.
 *
 * وسطرُ كلّ لعبةٍ من كلامٍ قائم لا مخترَع: سطرُ «دربك خضر» وصفُ صفحتها نفسِه (`darbak-khadar/layout.tsx`).
 * ومقطعُ شاشتها صُوِّر من اللعبة نفسِها (٢٠٢٦-٠٩-٢٦) في نسخةٍ لا تتّصل بالخادم، فلم تُسجَّل جولتُه في المسابقة.
 */
export const GAMES: HubGame[] = [
  {
    slug: "darbak-khadar",
    name: "دربك خضر",
    line: "لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك: اجمع أكوابَ oos واسبق إلى رأس اللوحة.",
    tone: "darb",
    attract: { video: "/games/cabinets/darbak-khadar.mp4", poster: "/games/cabinets/darbak-khadar.jpg" },
    play: "/games/darbak-khadar/play",
    board: "/games/darbak-khadar",
  },
];
