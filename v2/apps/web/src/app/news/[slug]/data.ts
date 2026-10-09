import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate } from "@/lib/dates";
import { firstAndLastOf } from "@/lib/personName";
import { isLiveMembership } from "@/lib/memberRecord";
import type { AdeebStanding } from "@/lib/standing";
import type { PublicComment } from "./_parts/Comments";

/**
 * تعليقاتُ الخبر المُقَرّة — تُقرأ عند التوليد الساكن فتُرسَل مع الصفحة.
 *
 * **ولِمَ مفتاحُ الخدمة لا المفتاحُ العلنيّ؟** لأنّ التعليقَ يحمل `user_id` وحدَه،
 * واسمُ صاحبه وأفتاره في `profiles` — و`profiles` لا يقرأها زائر. فتُقرأ ههنا
 * ويُرسَل **الاسمُ والأفتار والجنس فقط**: لا بريدَ ولا جوّالَ ولا معرِّفَ يُربَط به
 * صفٌّ آخر. (وسابقةُ هذا الحدّ `api/me/brief`.)
 *
 * ولا يُقرأ إلّا `is_approved = true`: ما ينتظر الإقرارَ لا يُرسَل إلى متصفّحٍ أصلًا،
 * فلا يُسرَّب بقراءةِ مصدر الصفحة.
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

type Row = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  content: string;
  created_at: string | null;
};

export async function getApprovedComments(newsId: string): Promise<PublicComment[]> {
  const sb = service();
  if (!sb) return [];

  const { data, error } = await sb
    .from("news_public_comments")
    .select("id, user_id, guest_name, content, created_at")
    .eq("news_id", newsId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error || !data?.length) return [];

  // أسماءُ الأعضاء وأفتاراتُهم في نداءٍ واحدٍ لا نداءٍ لكلّ تعليق.
  const ids = [...new Set(data.map((c) => c.user_id).filter((v): v is string => !!v))];
  const people = new Map<
    string,
    { name: string; avatar: string | null; gender: "male" | "female" | null; standing: AdeebStanding }
  >();
  if (ids.length) {
    /* والمنزلةُ معها (٢٠٢٦-١٠-٠٨): حدُّ العضويّة `isLiveMembership`، والمتطوّعُ صفٌّ حالُه `active`.
       ولا يخرج منهما إلى الصفحة إلّا اسمُ المنزلة. */
    const [{ data: rows }, { data: vols }] = await Promise.all([
      sb
        .from("profiles")
        .select("id, full_name, avatar_url, gender, joined_date, account_status")
        .in("id", ids)
        .returns<
          {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            gender: string | null;
            joined_date: string | null;
            account_status: string | null;
          }[]
        >(),
      sb
        .from("volunteers")
        .select("user_id")
        .in("user_id", ids)
        .eq("status", "active")
        .returns<{ user_id: string }[]>(),
    ]);
    const volunteering = new Set((vols ?? []).map((v) => v.user_id));
    for (const p of rows ?? []) {
      people.set(p.id, {
        // الاسمُ الأوّلُ والأخير لا الرباعيّ: تعليقٌ علنيٌّ، وأدِيب لا ينشر
        // اسمَ عضوٍ كاملًا في صفحةٍ يقرؤها الغريب.
        name: firstAndLastOf(p.full_name ?? "") || "عضو أدِيب",
        avatar: p.avatar_url ?? null,
        gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
        standing: isLiveMembership(p) ? "member" : volunteering.has(p.id) ? "volunteer" : "account",
      });
    }
  }

  // عدُّ إعجابات التعليقات في نداءٍ واحدٍ كذلك، ثمّ يُجمَع في الذاكرة.
  const counts = new Map<string, number>();
  const { data: likeRows } = await sb
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", data.map((c) => c.id))
    .returns<{ comment_id: string }[]>();
  for (const l of likeRows ?? []) counts.set(l.comment_id, (counts.get(l.comment_id) ?? 0) + 1);

  return data.map((c) => {
    const who = c.user_id ? people.get(c.user_id) : undefined;
    return {
      id: c.id,
      name: who?.name ?? c.guest_name ?? "زائر",
      standing: who?.standing ?? null,
      gender: who?.gender ?? null,
      avatar: who?.avatar ?? null,
      text: c.content,
      when: fmtDate(c.created_at),
      likes: counts.get(c.id) ?? 0,
      // «أعجبتُ به؟» لا تُعرَف عند التوليد الساكن — تصل بعد التركيب من `/api/news/reactions`.
      liked: false,
    };
  });
}
