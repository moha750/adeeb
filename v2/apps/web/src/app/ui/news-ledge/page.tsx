import { getMoreNews, getPublicNews, getPublicNewsItem } from "@/app/news/data";
import { getApprovedComments } from "@/app/news/[slug]/data";
import { NewsLedgeLab } from "./NewsLedgeLab";

/**
 * **تجربةُ الزجاج على الشُّرفة — ثلاثُ صفحاتٍ كاملة.**
 *
 * طلب المالك ٢٠٢٦-٠٩-١٩: «جرّب تستخدم الglass في الشُّرفة». والتجربةُ وجهان لا وجه،
 * لأنّ `--glass-bg` أبيضُ شفّافٌ بـ١٦٪ وكلُّ استعمالاته في المستودع فوق سطحٍ **داكن**،
 * والشُّرفةُ تجلس أكثرُها على الورق الفاتح — فالأبيضُ عليها يقع على فاتحٍ فيغيب.
 */
export const dynamic = "force-dynamic";

/** خبرٌ **مميَّزٌ** عمدًا، وإلّا لَما ظهر الفرقُ أصلًا. */
const PREFERRED = "6412204d-7e86-4d9e-b9e6-4d755645eaf6";

export default async function NewsLedgeLabPage() {
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

  return <NewsLedgeLab n={chosen} comments={comments} more={more} />;
}
