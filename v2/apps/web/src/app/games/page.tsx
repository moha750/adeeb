import type { Metadata } from "next";
import { shareOg } from "@/lib/share";
import { getHall } from "@/lib/games/hall";
import { HALL_LOOK } from "@/lib/games/look";
import { Hub } from "./_components/Hub";

/**
 * **ألعابُ أدِيبيّة** (`/games`) — صالةُ ألعاب النادي، وكلُّ لعبةٍ تحتها على هويّتها في مسارها
 * (أوّلُها «دربك خضر» على `/games/darbak-khadar`). واسمُها كما في شعارها، والرابطُ باقٍ (قرارُ المالك ٢٠٢٦-٠٩-٢٦).
 *
 * **هويّتُها منعزلةٌ كالمحطّة** (القاعدة ١، ونطاقُها هذه الصفحةُ وحدَها بكلمته ٢٠٢٦-٠٩-٢٦): لا رأسَ
 * للموقع ولا تذييل، ولا شاشةَ بدءٍ ولا ريشة (`BootSplash` و`SiteCursor`). ومظهرُها «أ. ليلُ السِّنث» بأضواء
 * اللافتة حول الشعار (اختيارُه ٢٠٢٦-١٠-١٧، `lib/games/look.ts`).
 *
 * **ومحتواها من القاعدة لا من الكود** منذ ٢٠٢٦-١٠-١٧ (`lib/games/hall.ts`): الألعابُ وترتيبُها وظهورُها
 * والمسابقةُ الجارية تُدار من غرفة الألعاب في اللوحة (`/dashboard/games`)، وكلُّ حفظٍ هناك يُنعشها.
 * وكانت قبلها عنوانًا وحدَه بقراره (٢٠٢٦-٠٩-٢٥) غيرَ مفهرسة، فلمّا امتلأت فُتحت للفهرسة.
 */
export const revalidate = 60;

const LEDE = "ألعابٌ من نادي أدِيب، تُلعب في متصفّح جوّالك مجّانًا وبلا تحميل.";

export const metadata: Metadata = {
  title: "ألعاب أدِيبيّة",
  description: LEDE,
  openGraph: shareOg({ title: "ألعاب أدِيبيّة", description: LEDE, type: "website" }),
};

export default async function GamesPage() {
  const { games, event, stats } = await getHall();
  return (
    <div className="agm agm-page" {...HALL_LOOK}>
      <Hub games={games} event={event} stats={stats} />
    </div>
  );
}
