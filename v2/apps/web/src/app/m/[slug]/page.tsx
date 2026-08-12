import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { positionLine } from "@/lib/positionLabel";
import { getPublicProfile, type PublicPosition } from "./data";
import { ProfileView } from "./ProfileView";

export const revalidate = 300;

/** سطرُ التعريف: المنصبُ الأوّل (والقيادةُ متقدّمةٌ في الترتيب من القاعدة). */
function headline(positions: PublicPosition[]) {
  const p = positions[0];
  if (!p) return "عضوٌ في نادي أديب";
  return positionLine(p.roleAr, p.unitName) ?? "عضوٌ في نادي أديب";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const me = await getPublicProfile(decodeURIComponent(slug));
  if (!me) return { title: "صفحة عضو، أديب" };

  const line = headline(me.positions);
  return {
    title: `${me.name}، أديب`,
    description: me.bio ?? `${line} في نادي أديب.`,
    openGraph: { title: me.name, description: line, type: "profile" },
  };
}

/**
 * **صفحةُ العضو العلنيّة** — يَنشرها صاحبُها ليُعرَف من هو وما سيرتُه في أديب.
 *
 * وقارئُها غريبٌ لا زميل، فما لا يفهمه في ثانيتين لا يدخلها: المنصبُ بالعربيّة لا
 * بمفتاحه، والوحدةُ باسمها، والوسامُ بسببه. ولا بيانَ فيها يخصّ الشخصَ دون المنصب:
 * البابُ `get_public_profile` لا يُخرِج بريدًا ولا جوّالًا ولا ميلادًا ولا إنذارًا،
 * فالحجبُ في القاعدة لا في هذه الشاشة.
 */
export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getPublicProfile(decodeURIComponent(slug));
  if (!me) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-16 md:py-24">
          <Container className="max-w-3xl">
            <ProfileView me={me} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
