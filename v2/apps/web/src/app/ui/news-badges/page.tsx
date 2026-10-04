import { getMoreNews, getPublicNews, getPublicNewsItem } from "@/app/news/data";
import { getApprovedComments } from "@/app/news/[slug]/data";
import { NewsBadgesLab } from "./NewsBadgesLab";

/**
 * **معرضُ شارات الخبر — ثلاثُ صفحاتٍ كاملة، والفرقُ في الشارات وحدَها.**
 *
 * سأل المالك ٢٠٢٦-٠٩-١٩: «هل ترى بادج تغطية ومميّز جميلة؟» فقلتُ لا، وحجّتي مقيسة:
 * **١٣ من ١٤ خبرًا منشورًا قسمُها «تغطية»**، فالشارةُ تتكرّر على ٩٣٪ من المواد ولا
 * تفرّق خبرًا عن خبر. و«مميّز» عَلَمٌ إداريٌّ (`is_featured`) معناه «قدِّمه في الواجهة»،
 * أمرٌ لنا لا خبرٌ للقارئ.
 *
 * وطلب أن يرى الحالين بعينه قبل الحكم، فهذه هي — **صفحاتٍ كاملةً** كما اشترط قبلها.
 */
export const dynamic = "force-dynamic";

/** خبرٌ **مميَّزٌ** عمدًا، وإلّا لَما ظهر الفرقُ أصلًا. */
const PREFERRED = "6412204d-7e86-4d9e-b9e6-4d755645eaf6";

export default async function NewsBadgesLabPage() {
  const chosen =
    (await getPublicNewsItem(PREFERRED)) ??
    (await getPublicNews()).find((n) => n.featured) ??
    (await getPublicNews())[0] ??
    null;

  if (!chosen) {
    return (
      <main className="py-16">
        <p className="text-center text-content-muted">لا خبرَ منشورًا لتُعايَن عليه الصفحة.</p>
      </main>
    );
  }

  const [comments, more] = await Promise.all([
    getApprovedComments(chosen.id),
    getMoreNews(chosen.id, 2),
  ]);

  return <NewsBadgesLab n={chosen} comments={comments} more={more} />;
}
