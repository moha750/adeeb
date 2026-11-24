import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { personTitle } from "@/lib/positionLabel";
import { shareOg } from "@/lib/share";
import { getPublicProfile, type PublicPosition } from "./data";
import { MemberPublic } from "@/app/_ad/rooms/MemberPublicRoom";

export const revalidate = 300;

/** سطرُ التعريف: المنصبُ الأوّل (والقيادةُ متقدّمةٌ في الترتيب من القاعدة)، والمتطوّعُ بمنزلته. */
function headline(positions: PublicPosition[], gender: string | null, volunteer = false) {
  if (volunteer) return gender === "female" ? "متطوّعةٌ في نادي أدِيب" : "متطوّعٌ في نادي أدِيب";
  const p = positions[0];
  if (!p) return "عضوٌ في نادي أدِيب";
  return personTitle(p.roleAr, p.unitName, gender, p.acting) ?? "عضوٌ في نادي أدِيب";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const me = await getPublicProfile(decodeURIComponent(slug));
  if (!me) return { title: "صفحة عضو، أدِيب" };

  const line = headline(me.positions, me.gender, me.standing === "volunteer");
  return {
    title: `${me.name}، أدِيب`,
    description: me.bio ?? `${line} في نادي أدِيب.`,
    openGraph: shareOg({ title: me.name, description: line, type: "profile" }),
  };
}

/**
 * **صفحةُ العضو والمتطوّع العلنيّة** (المتطوّعُ منذ ٢٠٢٦-١١-٢٤) — يَنشرها صاحبُها ليُعرَف من هو وما سيرتُه في أدِيب.
 *
 * وقارئُها غريبٌ لا زميل، فما لا يفهمه في ثانيتين لا يدخلها: المنصبُ بالعربيّة لا
 * بمفتاحه، والوحدةُ باسمها، والوسامُ بسببه. ولا بيانَ فيها يخصّ الشخصَ دون المنصب:
 * البابُ `get_public_profile` لا يُخرِج بريدًا ولا جوّالًا ولا ميلادًا ولا إنذارًا،
 * فالحجبُ في القاعدة لا في هذه الشاشة.
 *
 * **على قالب «القراءة»** (`_ad/rooms/MemberPublicRoom`، اعتمده محمد ٢٠٢٦-١١-١٧): بطاقةُ أدِيب تتدلّى من اللوح، والأوسمةُ و«عنه» سطورًا،
 * ولصاحبها وحده ملاحظةٌ بزوّار صفحته. و`ProfileView` القديمُ باقٍ بلا مستعمِل حتى يقرّر المالكُ حذفه.
 */
export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getPublicProfile(decodeURIComponent(slug));
  if (!me) notFound();

  return (
    <>
      <SiteHeader />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <MemberPublic me={me} />
        </div>
      </main>
      <Footer />
    </>
  );
}
