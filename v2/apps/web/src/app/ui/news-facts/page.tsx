import { getMoreNews, getPublicNews, getPublicNewsItem } from "@/app/news/data";
import { getApprovedComments } from "@/app/news/[slug]/data";
import { NewsFactsLab } from "./NewsFactsLab";

/**
 * **معاينةُ توصيةِ صفّ الحقائق — صفحتان كاملتان.**
 *
 * قال المالك ٢٠٢٦-٠٩-٢٠ إنّه تعب من الصفّ وسأل: أمكانُه صحيح؟ وتشخيصي أنّ العلّة
 * ليست تخطيطًا بل **تصنيفًا**: الصفُّ يجمع أربعةَ أشياءَ لا تنتمي إلى بعضها، فأيُّ
 * ترتيبٍ يبدو اعتباطيًّا لأنّه اعتباطيٌّ فعلًا.
 *   · التاريخُ والريشةُ هويّةُ الخبر ← يبقيان في الصدر.
 *   · العدسةُ نسبةُ **الصورة** ← تنزل على الصورة.
 *   · مدّةُ القراءة أداةُ **قارئ** ← تنزل إلى شريط الأفعال.
 * فيبقى في الصدر اثنان دائمًا، ويسقط سؤالُ العدد الفرد و٢×٢ واليتيمِ في السطر الثاني.
 */
export const dynamic = "force-dynamic";

/** خبرٌ **مميَّزٌ** عمدًا، وإلّا لَما ظهر الفرقُ أصلًا. */
const PREFERRED = "6412204d-7e86-4d9e-b9e6-4d755645eaf6";

export default async function NewsFactsLabPage() {
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

  return <NewsFactsLab n={chosen} comments={comments} more={more} />;
}
