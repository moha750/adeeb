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

/**
 * حالُ الجلسة الثلاثة — و«المُبطَلة» ليست «غائبة» (٢٠٢٦-٠٩-٢٤).
 *
 * صار التحقّقُ من الرمز **محلّيًّا** (`getClaims`)، فرمزُ جلسةٍ أُبطِلت يبقى صحيحَ التوقيع
 * حتّى انتهاء عمره. والقاعدةُ هي من يكشفه (`session_alive` في موجة `loadIdentity`).
 *
 * ولهذا فرْقٌ عمليٌّ لا بدّ منه: الغائبُ يُردّ إلى `/login`، أمّا المُبطَلُ فيُردّ إلى
 * `/logout` **كي يُمحى كوكيُّه أوّلًا**. ولو رُدّ إلى `/login` لَدار في حلقة: الحارسُ
 * يرى رمزًا صحيحًا فيقذفه إلى اللوحة، واللوحةُ ترى الجلسةَ ميّتةً فتقذفه إلى الدخول.
 */
export type SessionState =
  | { status: "anonymous" }
  | { status: "revoked" }
  | { status: "ok"; admin: CurrentAdmin };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/**
 * هويّةٌ واحدة بقدراتها — بمفتاح الخدمة (يتجاوز RLS بأمان خادميّ). `null` بلا مفتاح خدمة.
 * لا دورَ هنا ولا رتبة: التفويض قدراتيٌّ بحتٌ، ومن أراد اسم دورٍ للعرض قرأه في موضعه.
 *
 * **وفحصُ حياة الجلسة يركب هذه الموجة** ولا يضيف إليها زمنًا: ثلاثةُ نداءاتٍ في
 * `Promise.all` واحد بدل اثنين. وهو ثمنُ أنّ الرمز صار يُصدَّق محلّيًّا — انظر
 * `SessionState` والترحيل `20260924170000_session_alive.sql`.
 *
 * و`p_session` يُمرَّر `null` للهويّة **المُعارة** (المعاينة كعضو): ليست لها جلسةٌ
 * ههنا تُفحَص، والدالّة تقبل الغياب فترجع `true` — فلا فرعَ في هذا الملفّ.
 */
const loadIdentity = cache(async function loadIdentity(
  userId: string,
  sessionId: string | null,
): Promise<CurrentAdmin | "revoked" | null> {
  const svc = service();
  if (!svc) return null;

  const BASE = "full_name, email, avatar_url, gender";
  const [firstRes, permsRes, aliveRes] = await Promise.all([
    svc.from("profiles").select(`${BASE}, deletion_requested_at, deleted_at`).eq("id", userId).maybeSingle(),
    svc.rpc("get_user_permissions", { p_user_id: userId }),
    svc.rpc("session_alive", { p_user: userId, p_session: sessionId }),
  ]);

  // **الجلسةُ أُبطِلت** — من جهازٍ آخر أو بـ«الخروج من كلّ الأجهزة». والشرطُ صريحٌ
  // بـ`=== false`: خطأٌ في النداء يترك القيمةَ `null`، ولا يُطرَد أحدٌ لأنّ نداءً تعثّر.
  if (!aliveRes.error && aliveRes.data === false) return "revoked";

  // **ارتدادٌ إن لم تكن أعمدةُ الحذف بعدُ في القاعدة.** ترحيلُها (`20260819_deletion_02`) قد
  // يتأخّر عن نشر الكود، وعمودٌ مفقودٌ يُسقط الاستعلامَ كلَّه في PostgREST — فتعود الهويّةُ
  // بلا اسمٍ ولا قدرات، ويُطرد الناسُ من اللوحة كلِّهم بسبب حقلٍ زائد. فالنقصُ يُحتمَل ولا
  // يُعمَّم: تُقرأ الأعمدةُ الأصلُ وتُترك واقعةُ الحذف فارغةً حتّى ينزل الترحيل.
  const profileRes = firstRes.error
    ? await svc.from("profiles").select(BASE).eq("id", userId).maybeSingle()
    : firstRes;
  const life = (firstRes.data ?? null) as { deletion_requested_at?: string | null; deleted_at?: string | null } | null;

  // **ومن لا ملفَّ له فطلبُ حذفه في جدولٍ آخر** (٢٠٢٦-١٠-٠٣): الحسابُ يولد بلا صفٍّ في
  // `profiles`، فطلبُه في `account_deletion_requests`. ويُسأل عنه من لا صفَّ له وحدَه — فلا
  // نداءَ زائدًا على أصحاب الملفّات — وخطؤه (جدولٌ لم ينزل ترحيلُه بعد) يُترك فارغًا لا يُسقط شيئًا.
  const pendingWithoutProfile =
    !firstRes.error && !firstRes.data
      ? ((
          await svc
            .from("account_deletion_requests")
            .select("requested_at")
            .eq("user_id", userId)
            .is("closed_at", null)
            .maybeSingle()
        ).data as { requested_at?: string } | null)?.requested_at ?? null
      : null;

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
    deletionRequestedAt: life?.deletion_requested_at ?? pendingWithoutProfile,
    deletedAt: life?.deleted_at ?? null,
  };
});

/**
 * مطالباتُ الرمز — **مصدرُ الهويّة الأوّل، ويُقرأ بلا نداءِ شبكة** (٢٠٢٦-٠٩-٢٤).
 *
 * كان هذا الموضعُ ينادي `auth.getUser()`، وهو رحلةٌ كاملةٌ إلى خادم المصادقة في **كلّ**
 * طلب. و`getClaims()` يتحقّق من توقيع الرمز بالمفتاح العامّ (ES256) في العمليّة نفسِها:
 * صفرُ نداءات ما دام الرمزُ حيًّا، ونداءٌ واحدٌ للتجديد حين ينتهي عمرُه — كما كان.
 * (و`GLOBAL_JWKS` في `auth-js` مخزَنٌ على مستوى العمليّة، فالنسخةُ الدافئة لا تجلب المفاتيح.)
 *
 * وما فقدناه بالتحقّق المحلّيّ — معرفةُ أنّ الجلسة أُبطِلت — استُرِدّ في `loadIdentity`
 * بلا كلفة. ولو كان الرمزُ متماثلَ التوقيع (HS256) لَارتدّ `getClaims` إلى `getUser`
 * من تلقاء نفسه، فالتغييرُ آمنٌ ولو دارت المفاتيح.
 *
 * مُغلَّفةٌ بـ`cache` — مرّةً واحدة في الطلب مهما تعدّد مستدعوها.
 */
export const getSessionClaims = cache(async function getSessionClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims;
});

/**
 * حالُ جلسةِ صاحبها — **لا تُعار ولا تُستعار**. يقرؤها من يحرس المعاينة نفسها (بدْأَها)،
 * وإلّا لَحرَسَ الباب بمفتاح من في الداخل.
 */
export const getSessionState = cache(async function getSessionState(): Promise<SessionState> {
  const claims = await getSessionClaims();
  if (!claims) return { status: "anonymous" };

  const me = await loadIdentity(claims.sub, claims.session_id ?? null);
  if (me === "revoked") return { status: "revoked" };

  // بلا مفتاح خدمة لا نستطيع قراءة القدرات — نعامله كغير مخوّل (آمن افتراضًا).
  if (!me) {
    return {
      status: "ok",
      admin: {
        id: claims.sub, email: claims.email ?? null, fullName: null, avatarUrl: null, gender: null,
        caps: [], isAdmin: false, deletionRequestedAt: null, deletedAt: null,
      },
    };
  }
  return { status: "ok", admin: { ...me, email: me.email ?? claims.email ?? null } };
});

/** صاحبُ الجلسة نفسه، أو `null` إن غاب أو أُبطِلت جلستُه. من احتاج التفريق قرأ `getSessionState`. */
export const getSessionAdmin = cache(async function getSessionAdmin(): Promise<CurrentAdmin | null> {
  const state = await getSessionState();
  return state.status === "ok" ? state.admin : null;
});

/**
 * بابُ الردّ لمن لا جلسةَ له — **مصدرٌ واحد** لقرارٍ يتكرّر في ثلاث شاشات.
 * يعيد `null` إن كانت الجلسةُ قائمة، وإلّا المسارَ الذي يُردّ إليه.
 *
 * والتفريقُ هو كلُّ فائدته: الغائبُ إلى `/login`، والمُبطَلُ إلى `/logout` كي يُمحى
 * كوكيُّه فلا يدور بين الحارس والشاشة. انظر `SessionState`.
 */
export async function awayIfNoSession(next?: string): Promise<string | null> {
  const state = await getSessionState();
  if (state.status === "ok") return null;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return state.status === "revoked" ? `/logout${q}` : `/login${q}`;
}

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

  // `null` للجلسة: المُعايَنُ هويّةٌ تُقرأ لا جلسةٌ تُصدَّق (انظر `loadIdentity`).
  const viewed = await loadIdentity(target, null);
  if (!viewed || viewed === "revoked") return me;
  return { ...viewed, viewAs: { realId: me.id, realName: me.fullName } };
});
