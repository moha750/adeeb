"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { ensureReaderId } from "@/lib/news/guest";
import { cleanComment, commentError } from "@/lib/news/comments";

/**
 * أفعالُ قارئ الخبر — إعجابٌ وتعليقٌ وإعجابٌ بتعليق.
 *
 * **بمفتاح الخدمة، والهويّةُ تُقرأ ههنا لا تُستقبَل.** صاحبُ الحساب من `auth.getUser()`،
 * والزائرُ من كعكةٍ `httpOnly` (`lib/news/guest`). ولا يُمرَّر مُعرِّفُ فاعلٍ من العميل
 * أبدًا — وهي عينُ القاعدة التي نُزعت بها `p_actor` عن ٣٣ دالّةً في ٢٠٢٦-٠٨-٠٦.
 *
 * **ولِمَ لا تُنادى `toggle_news_like`؟** لأنّها كانت تأخذ `p_user_id` مُدخَلًا
 * وتُصدّقه، وهي `SECURITY DEFINER` ممنوحةٌ لـ`anon`: فمن ناداها بمفتاحٍ علنيٍّ أعجب
 * باسم أيّ عضوٍ ونزع إعجابَه. **وأُسقطت في ٢٠٢٦-٠٩-٢٤** لأنّ لا ساكنَ لها: الكتابةُ
 * ههنا مباشرةٌ في `news_likes`، و`likes_count` يبقى صادقًا بمُشغِّل `news_recount_likes`.
 *
 * **والدرعُ لم يعد زينة:** نُزع منحُ `INSERT` على `news_public_comments` عن `anon`
 * و`authenticated` في التاريخ نفسِه، فلم يبقَ إلى التعليق بابٌ إلّا هذا — ومفتاحُ
 * الخدمة لا تحكمه RLS. (درسُ التواصل: الدرعُ يُركَّب والسياسةُ تُغلَق معًا.)
 */

export type ReaderResult = { ok: boolean; message: string; liked?: boolean; total?: number };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** هويّةُ الفاعل: صاحبُ حسابٍ، أو زائرٌ ببصمة كعكته. أحدُهما لا كلاهما (قيدُ القاعدة). */
async function actor(): Promise<{ userId: string | null; guestId: string | null }> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user) return { userId: user.id, guestId: null };
  return { userId: null, guestId: await ensureReaderId() };
}

/**
 * قلبُ الإعجاب — يضيف أو ينزع، ويردّ الحصيلةَ الصادقة.
 *
 * ولا درعَ Turnstile عليه بقرارٍ معلّل: نقرةٌ واحدةٌ خلف تحدٍّ تجربةٌ ثقيلة، والقيدُ
 * `unique(news_id, guest_identifier)` مع كعكةٍ `httpOnly` يمنع التضخيم من جهازٍ واحد.
 */
export async function toggleNewsLike(newsId: string): Promise<ReaderResult> {
  if (!UUID.test(newsId)) return { ok: false, message: "خبرٌ غير معروف." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };

  // الخبرُ منشورٌ؟ الفرضُ ههنا لأنّ مفتاحَ الخدمة يتخطّى RLS.
  const { data: item } = await sb
    .from("news").select("id").eq("id", newsId).eq("workflow_status", "published").maybeSingle();
  if (!item) return { ok: false, message: "خبرٌ غير منشور." };

  const { userId, guestId } = await actor();
  const column = userId ? "user_id" : "guest_identifier";
  const value = userId ?? guestId!;

  const { data: existing } = await sb
    .from("news_likes").select("id").eq("news_id", newsId).eq(column, value).maybeSingle();

  if (existing) {
    const { error } = await sb.from("news_likes").delete().eq("id", existing.id);
    if (error) return { ok: false, message: "تعذّر نزعُ الإعجاب. أعد المحاولة." };
  } else {
    const { error } = await sb
      .from("news_likes")
      .insert({ news_id: newsId, user_id: userId, guest_identifier: guestId });
    // سباقُ نقرتين يصطدم بالقيد الفريد — وليس خطأً يُبلَّغ به القارئ.
    if (error && error.code !== "23505") return { ok: false, message: "تعذّر الإعجاب. أعد المحاولة." };
  }

  const { count } = await sb
    .from("news_likes").select("id", { count: "exact", head: true }).eq("news_id", newsId);

  return { ok: true, message: "", liked: !existing, total: count ?? 0 };
}

/** الإعجابُ بتعليقٍ مُقَرّ — بالمنطق نفسِه، وشرطُه أن يكون التعليقُ منشورًا. */
export async function toggleCommentLike(commentId: string): Promise<ReaderResult> {
  if (!UUID.test(commentId)) return { ok: false, message: "تعليقٌ غير معروف." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };

  const { data: row } = await sb
    .from("news_public_comments").select("id").eq("id", commentId).eq("is_approved", true).maybeSingle();
  if (!row) return { ok: false, message: "تعليقٌ غير متاح." };

  const { userId, guestId } = await actor();
  const column = userId ? "user_id" : "guest_identifier";
  const value = userId ?? guestId!;

  const { data: existing } = await sb
    .from("comment_likes").select("id").eq("comment_id", commentId).eq(column, value).maybeSingle();

  if (existing) {
    await sb.from("comment_likes").delete().eq("id", existing.id);
  } else {
    const { error } = await sb
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: userId, guest_identifier: guestId });
    if (error && error.code !== "23505") return { ok: false, message: "تعذّر الإعجاب. أعد المحاولة." };
  }

  const { count } = await sb
    .from("comment_likes").select("id", { count: "exact", head: true }).eq("comment_id", commentId);

  return { ok: true, message: "", liked: !existing, total: count ?? 0 };
}

/**
 * تعليقٌ جديد — يدخل **غيرَ مُقَرٍّ دائمًا**، كما تفرض سياسةُ القاعدة.
 *
 * ولا يُقبَل من العميل إلّا نصُّه واسمُه إن كان زائرًا: العضويّةُ تُقرأ من الجلسة،
 * و`is_approved` لا يُمرَّر أصلًا فلا يُنتحَل.
 */
export async function postComment(input: {
  newsId: string;
  text: string;
  guestName?: string;
  turnstileToken?: string;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!UUID.test(input.newsId)) return { ok: false, message: "خبرٌ غير معروف." };

  const shieldError = await verifyTurnstile(input.turnstileToken);
  if (shieldError) return { ok: false, message: shieldError };

  const { data: { user } } = await (await createClient()).auth.getUser();

  const text = cleanComment(input.text);
  const name = user ? null : cleanComment(input.guestName ?? "");
  const bad = commentError(text, name, !!user);
  if (bad) return { ok: false, message: bad };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص. أبلغ الإدارة." };

  const { data: item } = await sb
    .from("news").select("id").eq("id", input.newsId).eq("workflow_status", "published").maybeSingle();
  if (!item) return { ok: false, message: "خبرٌ غير منشور." };

  const { data, error } = await sb
    .from("news_public_comments")
    .insert({
      news_id: input.newsId,
      user_id: user?.id ?? null,
      guest_name: name,
      content: text,
      is_approved: false,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: "تعذّر إرسالُ تعليقك. أعد المحاولة." };
  return { ok: true, message: "وصل تعليقُك، ويظهر بعد أن يُقرأ.", id: data.id };
}
