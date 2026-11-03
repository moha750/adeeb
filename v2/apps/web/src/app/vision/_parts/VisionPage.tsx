import type { Metadata } from "next";
import { Alert, Ambient, Container, Footer } from "@adeeb/design-system";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { requestNow } from "@/app/_ad/now";
import { fmtDateOnly } from "@/lib/dates";
import { shareOg } from "@/lib/share";
import { getPublicVision } from "@/lib/vision/data";
import { VISION_PATH } from "@/lib/vision/vocab";
import { getVisionTeam } from "@/lib/vision/team";
import type { PublicVision } from "@/lib/vision/types";
import { VisionView } from "./VisionView";

/**
 * هيكلُ صفحة الرؤية الواحد للمسارين: `/vision` (السارية، فإن لم تكن فآخرُ منتهية) و`/vision/<slug>` (رؤيةٌ بعينها).
 * وخطأُ القاعدة لا يُعرض للزائر: رسالةٌ عامّة، والتفصيلُ في سجلّ الخادم.
 */
export function visionDescription(v: PublicVision): string {
  const n = v.tracks.reduce((a, t) => a + t.goals.length, 0);
  return `${v.name}: رؤية نادي أدِيب من ${fmtDateOnly(v.starts_on)} حتى ${v.horizon_label}، بمساراتها وأهدافها الـ${n} وما تحقق منها، وفريقها.`;
}

export async function visionMetadata(slug?: string): Promise<Metadata> {
  const { data } = await getPublicVision(slug);
  if (!data) return { title: "رؤى أدِيب" };
  const description = visionDescription(data);
  const url = slug ? `${VISION_PATH}/${data.slug}` : VISION_PATH;
  return { title: data.name, description, openGraph: shareOg({ title: data.name, description, url }) };
}

export async function VisionPage({ slug }: { slug?: string }) {
  const [{ data, error }, now] = await Promise.all([getPublicVision(slug), requestNow()]);
  const team = data ? await getVisionTeam(data.slug) : { data: null, error: null };
  if (error) console.error("[vision] get_public_vision:", error);
  if (team.error) console.error("[vision] team:", team.error);
  return (
    <>
      <SiteHeader />
      <main className="amb-host">
        <Ambient />
        {data ? (
          <VisionView v={data} team={team.data} now={now} />
        ) : (
          <Container>
            <div className="vz-page">
              <Alert tone={error ? "danger" : "info"}>{error ? "تعذّر تحميل الرؤية الآن، أعد المحاولة بعد قليل." : "لا رؤية منشورة بعد."}</Alert>
            </div>
          </Container>
        )}
      </main>
      <Footer />
    </>
  );
}
