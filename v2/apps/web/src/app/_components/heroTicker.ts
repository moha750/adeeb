import "server-only";
import { createAdeebServerClient } from "@adeeb/core";

/**
 * كلماتُ الشريط الجاري في صدر الهبوط — من **اللوحة الإعلانية** لا من الكود.
 *
 * كانت خمسَ جملٍ ثابتةً في `Hero.tsx`، فتبديلُ كلمةٍ نشرٌ كامل. صارت جدولًا
 * (`announcements`) بأمر المالك ٢٠٢٦-٠٩-١٨، وغرفتُها `/dashboard/website/announcements`.
 *
 * **والفرقُ بين «لا إعلان» و«تعذّرت القراءة» فرقٌ يُبنى عليه:**
 * قائمةٌ فارغةٌ قرارُ صاحب اللوحة (أفرغها فيختفي الشريط)، و`null` عطبٌ عابر
 * (بيئةٌ ناقصةٌ أو قاعدةٌ لا تردّ) — فيرجع الصدرُ إلى الجملِ المكتوبة في الورقة
 * فلا يظهر الشريطُ أبترَ لزائرٍ بسبب دقيقةٍ سيّئة. راجع `Hero.tsx`.
 *
 * والقراءةُ بعميل الزائر (anon) لا بمفتاح الخدمة: سياسةُ القاعدة تُظهر المُشعَلَ
 * للعموم وتحجب المُطفَأ، فالنخلُ في القاعدة لا في الورقة.
 */
export async function getHeroTicker(): Promise<string[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const sb = createAdeebServerClient(url, key);
  const { data, error } = await sb
    .from("announcements")
    .select("text")
    .eq("is_active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ text: string }[]>();

  if (error || !data) return null;
  return data.map((a) => a.text);
}
