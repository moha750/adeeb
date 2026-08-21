import { supabase } from "./supabase";

/**
 * قدراتُ صاحب الجلسة.
 *
 * `get_user_permissions` ممنوحةٌ لـ`authenticated`، فالتطبيقُ يحمّلها بنفسه بلا مفتاح
 * خدمة. **وهي زينةُ تنقّلٍ لا حراسة**: البابُ الحقيقيُّ RLS في القاعدة وحرّاسُ الصفحات
 * في اللوحة، فمن أخفى عنه شريطُ التبويبات بابًا لم يزدد به منعًا ولا نقصًا.
 */
export async function getMyCaps(): Promise<string[]> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase.rpc("get_user_permissions", { p_user_id: uid });
  if (error || !Array.isArray(data)) return [];

  // الدالّةُ تُخرج صفوفًا، وقد تكون نصوصًا أو كائناتٍ بمفتاحٍ واحد — يُقبل الشكلان
  return data
    .map((row: unknown) =>
      typeof row === "string" ? row : row && typeof row === "object" ? String(Object.values(row)[0] ?? "") : "",
    )
    .filter(Boolean);
}
