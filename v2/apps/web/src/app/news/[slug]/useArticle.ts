"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDate } from "@/lib/dates";
import { outline, parseBody } from "@/lib/news/body";
import { sectionsToBlocks } from "@/lib/news/blocks";
import type { NewsReactions } from "@/app/api/news/reactions/route";
import { deletePublicComment } from "@/app/dashboard/news/actions";
import type { PublicNews } from "../data";
import type { CommentMe, PublicComment } from "./_parts/Comments";
import { postComment, toggleCommentLike, toggleNewsLike } from "./actions";

/**
 * **سلوكُ صفحة الخبر وحده** (استُخرج من `ArticleView` حرفًا ٢٠٢٦-١١-١٧): الإعجابُ المتفائل، وتعليقاتُ القارئ وإعجاباتُها، والإشرافُ من
 * الصفحة، وما يخصّ القارئَ بعد التركيب (`/api/news/reactions`). فيقرؤه الشكلان — القديمُ (`ArticleView`، ومعاينةُ المحرّر) والجديدُ على
 * قالب «القراءة» (`_ad/rooms/NewsReadRoom`) — فلا يفترق سلوكُهما.
 */
export function useArticle(n: PublicNews, comments: PublicComment[], preview?: boolean) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(n.likes);
  const [rows, setRows] = useState<PublicComment[]>(comments);
  // هويّةُ القارئ المسجَّل كما سيُنشَر بها تعليقُه — تصل بعد التركيب، و`null` زائر.
  const [me, setMe] = useState<CommentMe | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** رئيسُ التحرير يحذف من الصفحة نفسها (شرطُ النشر المباشر الثاني). يُعرَف بعد التركيب كبقيّة ما يخصّ القارئ. */
  const [canModerate, setCanModerate] = useState(false);
  const [kill, setKill] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);

  // الأقسامُ المصرَّحةُ إن وُجدت، وإلّا فالاستدلالُ على النصّ الخام. وهذا هو الهبوطُ
  // الآمن: خبرٌ لم يُحوَّل بعدُ يُعرَض اليومَ كما كان يُعرَض أمسِ، بلا لحظةِ انكسار.
  const blocks = n.sections ? sectionsToBlocks(n.sections) : parseBody(n.content);
  const heads = outline(blocks);

  // ما يخصّ هذا القارئَ وحدَه — يصل بعد التركيب فلا يُفسد سكونَ الصفحة.
  useEffect(() => {
    if (preview) return;
    let alive = true;
    fetch(`/api/news/reactions?news=${n.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<NewsReactions>) : null))
      .then((d) => {
        if (!alive || !d) return;
        setMe(d.me);
        setCanModerate(!!d.canModerate);
        setLiked(d.liked);
        setLikes(d.likes);
        setRows((s) => {
          const mine = new Set(d.likedComments);
          // عددُ إعجابات كلّ تعليقٍ حيًّا: ما جاء مع التوليد الساكن قد يكون أقدمَ بدقيقة.
          const counts = d.commentLikes ?? {};
          return s.map((c) => ({ ...c, liked: mine.has(c.id), likes: counts[c.id] ?? c.likes }));
        });
      })
      .catch(() => { /* تعذّر السؤال: تبقى الصفحةُ صالحةً بما جاء مع التوليد */ });
    return () => { alive = false; };
  }, [n.id, preview]);

  /** عرضٌ متفائل: القلبُ يمتلئ قبل أن يردّ الخادم ويرتدّ إن ردّ بخطأ. */
  const like = useCallback(async () => {
    const was = liked;
    setLiked(!was);
    setLikes((c) => c + (was ? -1 : 1));
    const res = await toggleNewsLike(n.id);
    if (!res.ok) {
      setLiked(was);
      setLikes((c) => c + (was ? 1 : -1));
      setNotice(res.message);
      return;
    }
    if (typeof res.total === "number") setLikes(res.total);
    if (typeof res.liked === "boolean") setLiked(res.liked);
  }, [liked, n.id]);

  const likeComment = useCallback(async (id: string) => {
    const row = rows.find((c) => c.id === id);
    if (!row) return;
    const was = row.liked;
    setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: !was, likes: c.likes + (was ? -1 : 1) } : c)));
    const res = await toggleCommentLike(id);
    if (!res.ok) {
      setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: was, likes: c.likes + (was ? 1 : -1) } : c)));
      setNotice(res.message);
      return;
    }
    // ثمّ حالُ القاعدة الصادقة، كإعجاب الخبر: لا يبقى قلبٌ أحمرُ لم يُحفظ.
    setRows((s) => s.map((c) => (c.id === id
      ? { ...c, liked: res.liked ?? c.liked, likes: typeof res.total === "number" ? res.total : c.likes }
      : c)));
  }, [rows]);

  const send = useCallback(async (text: string, guestName: string, token?: string) => {
    setSending(true);
    setNotice(null);
    const res = await postComment({ newsId: n.id, text, guestName, turnstileToken: token });
    setSending(false);
    if (!res.ok) { setNotice(res.message); return false; }
    // **منشورٌ لحظتَه** (المالك ٢٠٢٦-١٠-١٦): يظهر في رأس القائمة كرتًا كاملًا كما يراه غيرُه، بمنزلته
    // وتاريخه وقلبه، وهو التأكيدُ نفسُه فلا رسالةَ معه.
    setRows((s) => [
      { id: res.id!, name: me?.name ?? guestName, standing: me?.standing ?? null, gender: me?.gender ?? null,
        avatar: me?.avatar ?? null, text, when: fmtDate(new Date().toISOString()), likes: 0, liked: false },
      ...s,
    ]);
    return true;
  }, [n.id, me]);

  /** الحذفُ نهائيّ، فبتأكيد. والفعلُ نفسُه فعلُ اللوحة (`deletePublicComment`) فلا يفترق الحكمان. */
  const removeComment = useCallback(async () => {
    if (!kill) return;
    setKilling(true);
    const res = await deletePublicComment(kill);
    setKilling(false);
    if (!res.ok) { setKill(null); setNotice(res.message); return; }
    setRows((s) => s.filter((c) => c.id !== kill));
    setKill(null);
  }, [kill]);

  return { liked, likes, rows, me, sending, notice, canModerate, kill, setKill, killing, blocks, heads, like, likeComment, send, removeComment };
}
