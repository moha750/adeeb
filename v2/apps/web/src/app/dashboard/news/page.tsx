import { Alert } from "@adeeb/design-system";
import { getNewsroomActor } from "@/lib/news/authz";
import { getCommitteeOptions, getNews } from "./data";
import { NewsView } from "./NewsView";
import { NewsHead, NewsroomDenied } from "./_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function NewsPage() {
  // قفل الغرفة من `SECTION_CAP`؛ ثمّ الفاعل نفسه — فمنه يُعرف رئيسُ التحرير من الكاتب.
  const denied = await denyUnless("/dashboard/news");
  if (denied) return denied;

  const actor = await getNewsroomActor();
  if (!actor) return <NewsroomDenied />;

  const [{ rows, error }, committees] = await Promise.all([
    getNews(actor),
    actor.isChief ? getCommitteeOptions() : Promise.resolve([]),
  ]);

  if (error) {
    return (
      <>
        <NewsHead />
        <Alert tone="warning" title="تعذّر جلب الأخبار">{error}</Alert>
      </>
    );
  }

  return <NewsView rows={rows} committees={committees} isChief={actor.isChief} />;
}
