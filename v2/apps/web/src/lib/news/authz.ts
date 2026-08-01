/**
 * تفويض غرفة التحرير — **قدرةٌ لا رتبة، وحَكَمٌ واحد في القاعدة**.
 *
 * لا يُعاد هنا حسابُ من يملك ماذا: الجواب كلّه في دالّة القاعدة `news_role`
 * (SECURITY DEFINER)، وهذا الملفّ جسرٌ إليها. فلو تغيّر المنطق يومًا تغيّر في
 * موضعٍ واحد — لا في القاعدة مرّةً وفي TypeScript مرّةً فتنحرفان.
 *
 * دوران اثنان لا ثالث لهما:
 *   • `chief`  — من مُنحت له `manage_news`. يرى كلّ خبر، يكلّف، يراجع، ينشر، يحذف.
 *   • `writer` — من كُلِّف بهذا الخبر (أو أنشأه). يرى تكليفه ويحرّر حقوله ويرفعه.
 *
 * والهويّة تُقرأ من `getCurrentAdmin` لا من الجلسة مباشرةً — فتسري **معاينة
 * الهويّة** (view-as) على الأخبار كما تسري على بقيّة اللوحة.
 */
import "server-only";
import { cache } from "react";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";

export type NewsRole = "chief" | "writer" | "none";

export type NewsroomActor = {
  userId: string;
  /** رئيس التحرير: `manage_news`. الفارق الوحيد الذي تعرفه الواجهة. */
  isChief: boolean;
  name: string | null;
};

export function newsService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلّا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export const ENV_MISSING = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";
export const DENIED = "لست من أهل غرفة التحرير.";

/**
 * صاحب الغرفة الحاليّ — أو `null` لمن لا يملك مفتاحها.
 * الباب يفتحه `manage_news` أو `write_news`؛ و`write_news` تُمنح **بالتكليف**
 * (دالّة `news_assign_writers` في القاعدة تمنحها لمن كلّفته).
 */
export const getNewsroomActor = cache(async function getNewsroomActor(): Promise<NewsroomActor | null> {
  const me = await getCurrentAdmin();
  if (!me) return null;
  const isChief = me.caps.includes("manage_news");
  if (!isChief && !me.caps.includes("write_news")) return null;
  return { userId: me.id, isChief, name: me.fullName };
});

/** دور الفاعل الحاليّ في خبرٍ بعينه — من الحَكَم في القاعدة لا من حسابٍ هنا. */
export async function newsRoleFor(newsId: string): Promise<NewsRole> {
  const actor = await getNewsroomActor();
  if (!actor) return "none";
  const sb = newsService();
  if (!sb) return "none";

  const { data, error } = await sb.rpc("news_role", { p_actor: actor.userId, p_news: newsId });
  if (error || typeof data !== "string") return "none";
  return data as NewsRole;
}
