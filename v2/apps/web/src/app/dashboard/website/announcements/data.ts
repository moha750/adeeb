// يُستورَد من مكوّنات خادميّة وحدها (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/** إعلانٌ من إعلانات الشريط — صفٌّ من `announcements` بأسماء الواجهة. */
export type AnnouncementRow = {
  id: string;
  text: string;
  sort: number;
  /** المُطفَأُ يبقى في الغرفة ولا يمرّ في الشريط. */
  isActive: boolean;
};

/**
 * إعلاناتُ الشريط مرتّبةً — **المُطفَأُ معها**.
 *
 * والغرفةُ تقرأ بمفتاح الخدمة كسائر غرف اللوحة (التفويضُ عند الباب): سياسةُ القراءة
 * في القاعدة تُظهر المُشعَلَ للعموم، وصاحبُ الغرفة يرى المُطفَأَ أيضًا — فلو قُرئ بعميل
 * الجلسة لَما رآه إلّا بعد نداءِ `check_user_permission` في كلّ صفّ.
 */
export async function getAnnouncements(): Promise<{
  announcements: AnnouncementRow[];
  error: string | null;
}> {
  const sb = service();
  if (!sb) return { announcements: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("announcements")
    .select("id, text, sort, is_active")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { announcements: [], error: error.message };

  const announcements: AnnouncementRow[] = (data ?? []).map((a) => ({
    id: a.id,
    text: a.text,
    sort: a.sort,
    isActive: a.is_active,
  }));
  return { announcements, error: null };
}

/* ══ الأخبار المعروضة في الصدر ═══════════════════════════════════════ */

/** خبرٌ في اختيار الصدر — صفٌّ من `hero_news` مع ما يلزم من خبره. */
export type HeroNewsRow = {
  newsId: string;
  title: string;
  imageUrl: string | null;
  slug: string | null;
  publishedAt: string | null;
  /**
   * لمَ لا يمرّ في العارض الآن، أو `null` وهو يمرّ. والخبرُ يبقى في الاختيار ولو أُرشف
   * أو نُزع غلافُه (غرفةُ التحرير غيرُ هذه الغرفة)، فيُقال حالُه هنا ولا يُسقَط من وراء
   * ظهر صاحبه، ويعود إلى العارض وحدَه يومَ يُعاد نشرُه.
   */
  hidden: "unpublished" | "no-cover" | null;
};

/** خبرٌ يصلح أن يُضاف: منشورٌ له غلاف، وليس في الاختيار بعدُ. */
export type HeroNewsOption = { id: string; title: string; publishedAt: string | null };

type NewsCols = {
  id: string;
  title: string;
  image_url: string | null;
  slug: string | null;
  workflow_status: string;
  published_at: string | null;
};

/**
 * الأخبارُ المعروضة بترتيبها، ومعها ما يصلح للإضافة — مقروءةً بمفتاح الخدمة كسائر الغرفة.
 *
 * والعطبُ هنا لا يُسقط الغرفة: الشريطُ قسمٌ مستقلّ، فإن تعذّرت قراءةُ الأخبار (جدولٌ لم
 * يُرحَّل بعدُ مثلًا) قال قسمُها ذلك وحدَه وبقي الشريطُ يعمل.
 */
export async function getHeroNews(): Promise<{
  picked: HeroNewsRow[];
  options: HeroNewsOption[];
  error: string | null;
}> {
  const sb = service();
  if (!sb) return { picked: [], options: [], error: KEY_HINT };

  const [pRes, nRes] = await Promise.all([
    sb
      .from("hero_news")
      .select("news_id, sort, news(id, title, image_url, slug, workflow_status, published_at)")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<{ news_id: string; sort: number; news: NewsCols | null }[]>(),
    sb
      .from("news")
      .select("id, title, published_at")
      .eq("workflow_status", "published")
      .not("image_url", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .returns<{ id: string; title: string; published_at: string | null }[]>(),
  ]);
  if (pRes.error) return { picked: [], options: [], error: pRes.error.message };
  if (nRes.error) return { picked: [], options: [], error: nRes.error.message };

  const picked: HeroNewsRow[] = (pRes.data ?? [])
    .filter((r) => r.news)
    .map((r) => ({
      newsId: r.news_id,
      title: r.news!.title,
      imageUrl: r.news!.image_url,
      slug: r.news!.slug,
      publishedAt: r.news!.published_at,
      hidden:
        r.news!.workflow_status !== "published" ? "unpublished" : !r.news!.image_url ? "no-cover" : null,
    }));

  const taken = new Set(picked.map((p) => p.newsId));
  const options: HeroNewsOption[] = (nRes.data ?? [])
    .filter((n) => !taken.has(n.id))
    .map((n) => ({ id: n.id, title: n.title, publishedAt: n.published_at }));

  return { picked, options, error: null };
}
