import type { HubEvent, HubGame } from "@/app/games/_components/Hub";
import { GAMES } from "@/app/games/_components/catalog";

/**
 * **بياناتُ المعرض المصنوعة** — لا يُعرض شيءٌ منها إلّا في المعرض.
 *
 * - **ألعابٌ للعرض فقط** بعد «دربك خضر»، لتُرى الصالةُ بأكثر من كابينة (سؤالُ المالك ٢٠٢٦-٠٩-٢٦).
 *   بلا مقطع، فشاشاتُها «بلا إشارة»، ونغماتُها في `.agmp-demo`.
 * - **«أعلى النقاط» والأرقام** مصنوعةٌ كلُّها، بأسماءٍ من معرض لوحة دربك خضر (`/ui/darb-board`).
 *   وفي الصفحة الحقيقيّة تأتي من لوحة كلّ لعبةٍ في القاعدة.
 * - **الحدثُ الجاري** نصُّه وجوائزُه من مسابقة أكواب oos كما هي (`darbak-khadar/_components/bits.tsx`)،
 *   ونافذتُه مصنوعةٌ حول لحظة فتح المعرض (افتُتحت قبل ٢٠ ساعة وتُقفل بعد ٢٨)، فيدقّ عدّادُه أيًّا
 *   كان يومُ فتحه. وفي الصفحة الحقيقيّة من `darb_contest`.
 */
const DEMO: HubGame[] = [
  {
    slug: "demo-2", name: "لعبةٌ ثانية", line: "لعبةٌ للعرض فقط، لتُرى الصالةُ بأكثر من كابينة.", tone: "demo-a", play: "/ui/games-hub", board: "/ui/games-hub",
    top: { title: "أعلى نقاط", unit: "pts", rows: [{ name: "غيمة", value: 4210 }, { name: "سهم نجد", value: 3905 }, { name: "ريم", value: 3120 }] },
  },
  {
    slug: "demo-3", name: "لعبةٌ ثالثة", line: "لعبةٌ للعرض فقط، ووصفُها أقصر.", tone: "demo-b", play: "/ui/games-hub", board: "/ui/games-hub",
    top: { title: "أعلى نقاط", unit: "pts", rows: [{ name: "الرحّال", value: 980 }, { name: "برق", value: 875 }, { name: "قلب جدّة", value: 640 }] },
  },
  {
    slug: "demo-4", name: "لعبةٌ رابعة", line: "لعبةٌ للعرض فقط، ووصفُها أطولُ من غيرها قليلًا لتُرى الكبائنُ متساويةً مهما طال.", tone: "demo-c", play: "/ui/games-hub", board: "/ui/games-hub",
    top: { title: "أعلى نقاط", unit: "pts", rows: [{ name: "نسمة الشمال", value: 12 }, { name: "ظلّ النخيل", value: 9 }, { name: "أبو سلطان", value: 2 }] },
  },
];

const DARB_TOP: HubGame["top"] = {
  title: "أبعد مسافة",
  unit: "m",
  rows: [{ name: "صقر الأحساء", value: 6840 }, { name: "نجم الشرقية", value: 6215 }, { name: "برق", value: 5930 }],
};

export const COUNTS = [1, 2, 3, 4] as const;
export const gamesFor = (n: number): HubGame[] =>
  [...GAMES.map((g) => (g.slug === "darbak-khadar" ? { ...g, top: DARB_TOP } : g)), ...DEMO].slice(0, Math.min(Math.max(n, 1), 4));

const T0 = Date.now();
const H = 3_600_000;
export const DEMO_EVENT: HubEvent = {
  title: "مسابقة أكواب oos في دربك خضر",
  note: "رصيدٌ في محفظة مقهى oos للأكثر جمعًا للأكواب: 30 ريالًا للأوّل، و20 للثاني، و10 للثالث.",
  tone: "darb",
  startsAt: T0 - 20 * H,
  endsAt: T0 + 28 * H,
  href: "/games/darbak-khadar?tab=contest",
};

export const DEMO_STATS = { players: 128, runs: 2140 };
