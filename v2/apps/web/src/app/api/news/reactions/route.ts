import { NextResponse } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { peekReaderId } from "@/lib/news/guest";
import { firstAndLastOf } from "@/lib/personName";
import { isLiveMembership } from "@/lib/memberRecord";
import type { CommentMe } from "@/app/news/[slug]/_parts/Comments";
import { getNewsroomActor } from "@/lib/news/authz";

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
  /**
   * هويّةُ المسجَّل كما سيُنشَر بها تعليقُه: تظهر في رأس خانة الكتابة فيعرف قبل أن يكتب أنّ التعليقَ باسمه
   * (المالك ٢٠٢٦-١٠-١٥). وبالقواعد نفسها التي تُعرَض بها التعليقاتُ المُقَرّة: الاسمُ الأوّلُ والأخير، والمنزلة.
   */
  me: CommentMe | null;
  liked: boolean;
  likes: number;
  likedComments: string[];
  /** عددُ إعجابات كلّ تعليقٍ مُقَرٍّ حيًّا — الصفحةُ ساكنةٌ دقيقةً، فلا يظهر بعد التحديث عددٌ قديم. */
  commentLikes: Record<string, number>;
  /** يملك `manage_news` فيرى «لسانَ الحذف» تحت كلّ تعليق (٢٠٢٦-١٠-١٦). والحذفُ يتحقّق ثانيةً في الخادم. */
  canModerate: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY: NewsReactions = { signedIn: false, me: null, liked: false, likes: 0, likedComments: [], commentLikes: {}, canModerate: false };

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

  // أعدادُ إعجابات التعليقات للجميع (لا لصاحب هويّةٍ وحده): نداءان، ثمّ جمعٌ في الذاكرة.
  const { data: ids } = await sb
    .from("news_public_comments").select("id").eq("news_id", newsId)
    .returns<{ id: string }[]>();
  const commentLikes: Record<string, number> = {};
  if (ids?.length) {
    const { data: all } = await sb
      .from("comment_likes").select("comment_id").in("comment_id", ids.map((c) => c.id))
      .returns<{ comment_id: string }[]>();
    for (const r of all ?? []) commentLikes[r.comment_id] = (commentLikes[r.comment_id] ?? 0) + 1;
  }

  // لا هويّةَ بعدُ ⇒ لا شيءَ خاصًّا يُقال، والعدُّ وحدَه يُردّ.
  if (!user && !guestId) {
    return NextResponse.json({ ...EMPTY, likes: likes ?? 0, commentLikes }, { headers: { "cache-control": "no-store" } });
  }

  const column = user ? "user_id" : "guest_identifier";
  const value = user?.id ?? guestId!;

  const { data: mine } = await sb
    .from("news_likes").select("id").eq("news_id", newsId).eq(column, value).maybeSingle();

  // إعجاباتي على تعليقات هذا الخبر وحدَه — لا على تعليقات الموقع كلِّه.
  let likedComments: string[] = [];
  if (ids?.length) {
    const { data: rows } = await sb
      .from("comment_likes").select("comment_id").eq(column, value)
      .in("comment_id", ids.map((c) => c.id))
      .returns<{ comment_id: string }[]>();
    likedComments = (rows ?? []).map((r) => r.comment_id);
  }

  let me: CommentMe | null = null;
  if (user) {
    const [{ data: p }, { data: vol }] = await Promise.all([
      sb.from("profiles").select("full_name, avatar_url, gender, joined_date, account_status").eq("id", user.id)
        .maybeSingle<{ full_name: string | null; avatar_url: string | null; gender: string | null; joined_date: string | null; account_status: string | null }>(),
      sb.from("volunteers").select("user_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    ]);
    if (p) {
      me = {
        name: firstAndLastOf(p.full_name ?? "") || "عضو أدِيب",
        avatar: p.avatar_url ?? null,
        gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
        standing: isLiveMembership(p) ? "member" : vol ? "volunteer" : "account",
      };
    } else {
      // مسجَّلٌ بلا ملفّ: يبقى مسجَّلًا (لا يُسأل عن اسمه)، ويُنشَر كما تُنشَر تعليقاتُ من لا ملفَّ له.
      me = { name: "عضو أدِيب", avatar: null, gender: null, standing: "account" };
    }
  }

  return NextResponse.json(
    { signedIn: !!user, me, liked: !!mine, likes: likes ?? 0, likedComments, commentLikes, canModerate: user ? !!(await getNewsroomActor())?.isChief : false },
    { headers: { "cache-control": "no-store" } }
  );
}
