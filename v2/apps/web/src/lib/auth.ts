import "server-only";
import { cache } from "react";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_CAPS } from "./capabilities";
import { VIEW_AS_CAP, readViewAsTarget } from "./view-as";

export type CurrentAdmin = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  gender: "male" | "female" | null; // لأيقونة الأفتار حين لا صورة
  caps: string[]; // القدرات الفعليّة (من get_user_permissions) — مصدر كلّ تفويض
  isAdmin: boolean; // يملك مفتاح غرفةٍ واحدة على الأقلّ (DASHBOARD_CAPS)
  /**
   * طلبُ حذف الحساب إن كان قائمًا — والمهلةُ ثلاثون يومًا منه (٢٠٢٦-٠٨-١٩).
   * يُقرأ ههنا لا في كلّ غرفةٍ على حدة: من طلب أن يذهب لا يُترَك يعمل في اللوحة كأنّ شيئًا
   * لم يكن، وبابُ العدول يُعرَض له حيثما حلّ.
   */
  deletionRequestedAt: string | null;
  /** متى نُفِّذ الحذفُ فعلًا. صفٌّ بعده **أرشيفٌ لا حساب**، ولا جلسةَ تبلغه أصلًا. */
  deletedAt: string | null;
  /** حاضرٌ حين تكون الهويّة **مستعارة** — واسمُ صاحب الجلسة الحقيقيّ معه. انظر `lib/view-as.ts`. */
  viewAs?: { realId: string; realName: string | null } | null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/**
 * هويّةٌ واحدة بقدراتها — بمفتاح الخدمة (يتجاوز RLS بأمان خادميّ). `null` بلا مفتاح خدمة.
 * لا دورَ هنا ولا رتبة: التفويض قدراتيٌّ بحتٌ، ومن أراد اسم دورٍ للعرض قرأه في موضعه.
 */
const loadIdentity = cache(async function loadIdentity(userId: string): Promise<CurrentAdmin | null> {
  const svc = service();
  if (!svc) return null;

  const BASE = "full_name, email, avatar_url, gender";
  const [firstRes, permsRes] = await Promise.all([
    svc.from("profiles").select(`${BASE}, deletion_requested_at, deleted_at`).eq("id", userId).maybeSingle(),
    svc.rpc("get_user_permissions", { p_user_id: userId }),
  ]);

  // **ارتدادٌ إن لم تكن أعمدةُ الحذف بعدُ في القاعدة.** ترحيلُها (`20260819_deletion_02`) قد
  // يتأخّر عن نشر الكود، وعمودٌ مفقودٌ يُسقط الاستعلامَ كلَّه في PostgREST — فتعود الهويّةُ
  // بلا اسمٍ ولا قدرات، ويُطرد الناسُ من اللوحة كلِّهم بسبب حقلٍ زائد. فالنقصُ يُحتمَل ولا
  // يُعمَّم: تُقرأ الأعمدةُ الأصلُ وتُترك واقعةُ الحذف فارغةً حتّى ينزل الترحيل.
  const profileRes = firstRes.error
    ? await svc.from("profiles").select(BASE).eq("id", userId).maybeSingle()
    : firstRes;
  const life = (firstRes.data ?? null) as { deletion_requested_at?: string | null; deleted_at?: string | null } | null;

  const caps = ((permsRes.data ?? []) as Array<{ permission_key: string }>).map((p) => p.permission_key);
  const gender = profileRes.data?.gender;

  return {
    id: userId,
    email: profileRes.data?.email ?? null,
    fullName: profileRes.data?.full_name ?? null,
    avatarUrl: profileRes.data?.avatar_url ?? null,
    gender: gender === "male" || gender === "female" ? gender : null,
    caps,
    // البوّابة: مفتاحُ غرفةٍ واحدة يكفي للدخول. من لا يملك أيّ مفتاحٍ لا شيء له في الداخل.
    isAdmin: caps.some((c) => DASHBOARD_CAPS.includes(c)),
    deletionRequestedAt: life?.deletion_requested_at ?? null,
    deletedAt: life?.deleted_at ?? null,
  };
});

/**
 * صاحبُ الجلسة نفسه — **لا يُعار ولا يُستعار**. يقرؤه من يحرس المعاينة نفسها (بدؤها)،
 * وإلّا لَحرَسَ الباب بمفتاح من في الداخل.
 *
 * مُغلَّفةٌ بـ`cache` — تُنفَّذ مرّةً واحدة في الطلب مهما تعدّد مستدعوها.
 */
export const getSessionAdmin = cache(async function getSessionAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const me = await loadIdentity(user.id);
  // بلا مفتاح خدمة لا نستطيع قراءة القدرات — نعامله كغير مخوّل (آمن افتراضًا).
  if (!me) {
    return {
      id: user.id, email: user.email ?? null, fullName: null, avatarUrl: null, gender: null,
      caps: [], isAdmin: false, deletionRequestedAt: null, deletedAt: null,
    };
  }
  return { ...me, email: me.email ?? user.email ?? null };
});

/**
 * المستخدم الحاليّ **الفعليّ** — صاحبُ الجلسة، أو المُعايَنُ إن كانت المعاينة قائمة.
 * هي التي تقرؤها اللوحةُ كلُّها: التخطيط والتنقّل وحارس الصفحة و`p_actor` في كلّ كتابة.
 * فاستعارةُ الهويّة هنا تسري على الرؤية والتنفيذ معًا بلا تعديل في أيّ إجراء.
 *
 * والحارس **قدرةُ صاحب الجلسة** تُفحَص في كلّ طلب — لا الكوكي؛ فتزويرُه بلا قدرةٍ لا يفعل شيئًا.
 */
export const getCurrentAdmin = cache(async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const me = await getSessionAdmin();
  if (!me || !me.caps.includes(VIEW_AS_CAP)) return me;

  const target = await readViewAsTarget();
  if (!target || target === me.id) return me;

  const viewed = await loadIdentity(target);
  if (!viewed) return me;
  return { ...viewed, viewAs: { realId: me.id, realName: me.fullName } };
});
