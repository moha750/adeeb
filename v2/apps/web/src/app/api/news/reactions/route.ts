import { NextResponse } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { peekReaderId } from "@/lib/news/guest";

/**
 * **ما يخصُّ هذا القارئَ وحدَه في هذا الخبر.**
 *
 * صفحةُ الخبر ساكنةٌ (`revalidate = 60`) ويجب أن تبقى: هي أكثرُ صفحاتنا قراءةً من
 * الغرباء. ولو قرأت الجلسةَ في الخادم لصارت ديناميكيّةً وسقط التخبئةُ كلُّها. فيُقرأ
 * المشتركُ عند التوليد (المتنُ والصورُ والتعليقاتُ المُقَرّةُ وعدُّ الإعجاب)، ويُطلَب
 * **الخاصُّ** من ههنا بعد التركيب — سابقةُ `api/me/brief` في رأس الموقع بحرفها.
 *
 * ولا يُنشئ كعكةً لمن لا كعكةَ له (`peekReaderId`): من لم يتفاعل بعدُ ليس له ما
 * يُستعاد، وإنشاءُ هويّةٍ لكلّ زائرٍ يقرأ خبرًا وسمٌ بلا سبب. الكعكةُ تُولَد عند أوّل فعل.
 */
export const dynamic = "force-dynamic";

export type NewsReactions = {
  signedIn: boolean;
  liked: boolean;
  likes: number;
  likedComments: string[];
  /** تعليقٌ لصاحبه ينتظر الإقرار — يراه هو وحدَه، فلا يظنّ أنّ كلامَه ضاع. */
  pending: { id: string; text: string; when: string | null }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY: NewsReactions = { signedIn: false, liked: false, likes: 0, likedComments: [], pending: [] };

export async function GET(req: Request) {
  const newsId = new URL(req.url).searchParams.get("news") ?? "";
  if (!UUID.test(newsId)) return NextResponse.json(EMPTY);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return NextResponse.json(EMPTY);
  const sb = createAdeebServiceClient(url, key);

  const { data: { user } } = await (await createClient()).auth.getUser();
  const guestId = user ? null : await peekReaderId();

  const { count: likes } = await sb
    .from("news_likes").select("id", { count: "exact", head: true }).eq("news_id", newsId);

  // لا هويّةَ بعدُ ⇒ لا شيءَ خاصًّا يُقال، والعدُّ وحدَه يُردّ.
  if (!user && !guestId) {
    return NextResponse.json({ ...EMPTY, likes: likes ?? 0 }, { headers: { "cache-control": "no-store" } });
  }

  const column = user ? "user_id" : "guest_identifier";
  const value = user?.id ?? guestId!;

  const { data: mine } = await sb
    .from("news_likes").select("id").eq("news_id", newsId).eq(column, value).maybeSingle();

  // إعجاباتي على تعليقات هذا الخبر وحدَه — لا على تعليقات الموقع كلِّه.
  const { data: ids } = await sb
    .from("news_public_comments").select("id").eq("news_id", newsId)
    .returns<{ id: string }[]>();
  let likedComments: string[] = [];
  if (ids?.length) {
    const { data: rows } = await sb
      .from("comment_likes").select("comment_id").eq(column, value)
      .in("comment_id", ids.map((c) => c.id))
      .returns<{ comment_id: string }[]>();
    likedComments = (rows ?? []).map((r) => r.comment_id);
  }

  // ما ينتظر الإقرارَ من كلامي أنا. والزائرُ لا يُسأل عنه: صفُّه لا يحمل بصمتَه.
  let pending: NewsReactions["pending"] = [];
  if (user) {
    const { data: rows } = await sb
      .from("news_public_comments")
      .select("id, content, created_at")
      .eq("news_id", newsId).eq("user_id", user.id).eq("is_approved", false)
      .order("created_at", { ascending: false })
      .returns<{ id: string; content: string; created_at: string | null }[]>();
    pending = (rows ?? []).map((r) => ({ id: r.id, text: r.content, when: r.created_at }));
  }

  return NextResponse.json(
    { signedIn: !!user, liked: !!mine, likes: likes ?? 0, likedComments, pending },
    { headers: { "cache-control": "no-store" } }
  );
}
