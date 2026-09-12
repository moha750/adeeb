import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { isAdeebMember } from "@/lib/memberRecord";
import { shareOg } from "@/lib/share";
import { getCommittees, getViewerJoinState } from "./data";
import { JoinView, type JoinStep } from "./JoinView";

export const metadata: Metadata = {
  title: "الانضمام إلى أديب",
  description: "طريقُك إلى نادي أَدِيب: حسابٌ، ثمّ تطوّعٌ في لجانِنا، ثمّ عضويّةٌ تُهدى لمن رأينا عملَه.",
  openGraph: shareOg({
    title: "الانضمام إلى نادي أَدِيب",
    description: "حسابٌ، ثمّ تطوّعٌ في لجانِنا، ثمّ عضويّةٌ تُهدى لمن رأينا عملَه.",
  }),
};

export const dynamic = "force-dynamic";

/**
 * **بابُ الانضمام الواحد — والقصّةُ تسبق الحساب.**
 *
 * زرُّ «انضمّ إلينا» في الرأس والهبوط يقصد هذا المسار وحده، والفرقُ يقع ههنا مرّةً واحدة.
 *
 * **وكانت الصفحةُ مغلقةً على من له جلسة** (`if (!me) redirect("/signup?next=/join")`)، فصار
 * وجهُ النادي للقادم الجديد **نموذجَ مصادقةٍ** لا يقول شيئًا: بريدٌ وكلمةُ مرورٍ تحت شعارِ
 * «من هُنا يُدار نادي أدِيب». يُطلب الثمنُ قبل أن تُعرَض البضاعة. فقُلب الترتيبُ بقرار
 * المالك (٢٠٢٦-٠٩-١٢): **تُفتح الصفحةُ للعموم**، ويقرأ الزائرُ الطريقَ واللجانَ أوّلًا، ثمّ
 * يأتي الحسابُ **خطوةً في آخرها**. وثلاثةُ مكاسبَ تبعت: رابطٌ يُنشَر فيفتح على دعوةٍ لا على
 * نموذج، ولجانٌ تُقرأ فتكون هي الإعلان، ومترّددٌ ينصرف بلا حسابٍ فارغٍ يتركه خلفه.
 *
 * **والصفحةُ واحدةٌ لا أربع**: متنُها ثابتٌ للجميع (الطريقُ واللجان)، وآخرُها وحدَه يتبدّل
 * بمنزلة قارئه — وكلٌّ يُساق إلى خطوته:
 *
 * | القاصد | خطوتُه | آخرُ الصفحة |
 * |---|---|---|
 * | بلا جلسة | `account` | نموذجُ إنشاء الحساب (والمزوّدان فوقه) |
 * | صاحبُ حسابٍ بلا بيانات | `data` | بياناتُه — لا متطوّعَ بلا جوّالٍ يُتواصل به ولا جنسٍ تُقاس به فرصُه |
 * | صاحبُ حسابٍ لم يقدّم | `apply` | ترتيبُ الرغبات، وبه يصير متطوّعًا |
 * | متطوّع | `edit` | الرغباتُ نفسُها يعيد ترتيبها |
 * | عضوٌ في النادي | — | `/dashboard`: هو فوق هذه المحطّة لا دونها |
 *
 * **والبياناتُ تُسأل في `data` لا عند إنشاء الحساب** (قرار المالك ١٥ أغسطس ٢٠٢٦): الحسابُ
 * يُفتح بنقرةٍ من قوقل، فلا يُثقَل بابُه بستّة حقولٍ يهرب منها إلى المزوّد.
 */
export default async function JoinPage() {
  const me = await getSessionAdmin();
  // العضوُ فوق هذه المحطّة لا دونها — ويُسأل قبل أيّ قراءةٍ أخرى فلا تُقرأ لمن لا يراها
  if (me && (await isAdeebMember(me.id))) redirect("/dashboard");

  const [committees, viewer] = await Promise.all([
    getCommittees(),
    me ? getViewerJoinState(me.id) : Promise.resolve(null),
  ]);

  const step: JoinStep = !me
    ? "account"
    : !viewer?.hasProfile
      ? "data"
      : viewer.isVolunteer
        ? "edit"
        : "apply";

  return (
    <>
      <SiteHeader />
      <JoinView
        committees={committees}
        step={step}
        prefs={viewer?.prefs ?? []}
        isVolunteer={!!viewer?.isVolunteer}
        hasProfile={!!viewer?.hasProfile}
      />
      <Footer />
    </>
  );
}
