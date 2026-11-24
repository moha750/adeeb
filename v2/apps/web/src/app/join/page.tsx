import "@adeeb/design-system/ad.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { getSessionAdmin } from "@/lib/auth";
import { isAdeebMember } from "@/lib/memberRecord";
import { shareOg } from "@/lib/share";
import { getCommittees, getViewerJoinState } from "./data";
import { JoinRoom, type JoinStage } from "./JoinRoom";
import { getPublicOrg } from "@/app/structure/data";

export const metadata: Metadata = {
  title: "الانضمام إلى أدِيب",
  description: "بلا ترشيحٍ ولا مقابلةٍ ولا موعدٍ للتسجيل: تبدأ متى شئت، وتصير متطوّعًا في أدِيب في دقيقة.",
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
 * **والصفحةُ إقناعٌ خالصٌ للجميع** (محمد ٢٠٢٦-١١-٢٤): متنُها واحدٌ لكلّ قارئ، ولا نموذجَ في ذيلها — كان فيه ترتيبُ الرغبات، فرجع
 * من فتح حسابَه إلى صفحةٍ كُتبت لتقنعه ثمّ رُمي إلى آخرها. فصارت الخطوتان صفحةً منفصلة (`/join/apply`) بهيئة أبواب الحساب،
 * وفعلُ هذه الصفحة يقود إليها:
 *
 * | القاصد | فعلُ الصفحة |
 * |---|---|
 * | بلا جلسة (`guest`) | «أنشئ حسابَك» و«بوّابة أدِيب»، ويعودان إلى `/join/apply` |
 * | صاحبُ حسابٍ لم يتطوّع (`friend`) | «أكمِل خطوتك» إلى `/join/apply` |
 * | متطوّع (`volunteer`) | «حدّث رغباتك» إلى `/join/apply`، و«بوّابتك» |
 * | عضوٌ في النادي | `/dashboard`: هو فوق هذه المحطّة لا دونها |
 */
export default async function JoinPage() {
  const me = await getSessionAdmin();
  // العضوُ فوق هذه المحطّة لا دونها — ويُسأل قبل أيّ قراءةٍ أخرى فلا تُقرأ لمن لا يراها
  if (me && (await isAdeebMember(me.id))) redirect("/dashboard");

  const [committees, viewer, org] = await Promise.all([
    getCommittees(),
    me ? getViewerJoinState(me.id) : Promise.resolve(null),
    // اللجانُ تفتح نوافذَها من «هيكلة أدِيب» نفسِها: التعريفُ، ومن يقودها ومن فيها (١١-٢٤)
    getPublicOrg().then((r) => r.data ?? null),
  ]);
  const stage: JoinStage = !me ? "guest" : viewer?.isVolunteer ? "volunteer" : "friend";

  return (
    <>
      <SiteHeader />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <JoinRoom org={org} committees={committees} stage={stage} />
        </div>
      </main>
      <Footer />
    </>
  );
}
