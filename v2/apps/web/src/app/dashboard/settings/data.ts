// إعدادات **صاحب الجلسة** — خادميّ حصرًا.
//
// ولا مفتاحَ خدمةٍ هنا خلافًا لبقيّة الغرف: كلُّ ما تقرؤه هذه الغرفة يخصّ صاحبَها وحده،
// والقاعدةُ تعرف ذلك بنفسها — `my_sessions` تقرأ `auth.uid()`، وسياسةُ `profiles_select`
// تُدخله في صفّه، و`user_roles_select_own` في صفوف مناصبه. فالعميلُ عميلُ الكوكيز لا
// العميلُ المتجاوز. وهذا أضيقُ وأصدق: لا يستطيع هذا الملفّ قراءةَ شأنِ غيره ولو أراد.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtSince, fmtStamp } from "@/lib/dates";
import { describeDevice, deviceKind, providerKey, type ProviderKey, type SessionKind } from "./vocab";

/* ── طرقُ الدخول ─────────────────────────────────────────────────────────────
 * هويّاتُ الحساب عند GoTrue تُقرأ من الجلسة نفسِها (`getUser().identities`) لا بنداءٍ
 * إداريّ — فلا بابَ ههنا لقراءة هويّات غير صاحبها. وتسميتُها في `vocab.ts`.
 */

export type LoginMethod = {
  /** `identity_id` — ما يُمرَّر لفكّ الربط. */
  id: string;
  provider: ProviderKey;
  /** العنوانُ عند المزوّد، إن أفصح عنه. */
  account: string | null;
  /** «أُضيفت في ١٢ أغسطس ٢٠٢٦». */
  added: string;
  /** «منذ ساعتين» — أو `null` لهويّةٍ لم يُدخَل بها قطّ. */
  lastUsed: string | null;
};

export type MySession = {
  id: string;
  /** وصفُ الجهاز مشتقًّا من `user_agent` — «Chrome على macOS» لا سلسلةً خامًا. */
  device: string;
  /** نوعُه أيقونةً — الجدولُ يُقرأ في ٣٧٥px، والأيقونةُ أسرعُ من سطرٍ يُقرأ. */
  kind: SessionKind;
  ip: string | null;
  started: string;
  /** «منذ ٤ دقائق» — الفارقُ أنفعُ من الطابع في سطرٍ يقول «آخر نشاط». */
  lastSeen: string;
  /** الطابعُ الكامل، تلميحًا تحت النسبيّ. */
  lastSeenStamp: string;
  /** الجلسة التي تقرأ بها هذه الشاشة الآن. */
  current: boolean;
};

export type MySettings = {
  email: string;
  /** بريدٌ طُلب تغييرُه ولم يُفتح رابطُه بعد — يُقال، فالصمتُ عنه يُنسي العضوَ طلبَه. */
  pendingEmail: string | null;
  methods: LoginMethod[];
  /** هل يقبل رسائل النادي؟ (`profiles.accepts_marketing`) */
  marketing: boolean;
  /** النبذة العلنيّة (`profiles.bio`) — تُقرأ في `/m/<slug>` ووصفِ مشاركتها. */
  bio: string;
  /** عنوانُ صفحته العلنيّة — `null` لمن لم يبلغ حدَّ النشر (لا منصبَ فعّالًا له). */
  publicSlug: string | null;
  sessions: MySession[];
  /** تعذّرت قراءة الجلسات — يُقال ولا يُبتلَع (الشاشة تعرض الباقي). */
  sessionsError: string | null;
  /** تعذّرت قراءة الملفّ — كسابقه. */
  profileError: string | null;
};

/**
 * معرّفُ الجلسة الحاليّة من رمز الوصول (`session_id` في حمولته).
 *
 * يُفكّ الرمز **قراءةً لا تصديقًا**: لا يُبنى عليه إذنٌ ولا تفويض — كلُّ عمله أن يضع وسمَ
 * «هذه جلستك» على صفٍّ في جدول. وقارئُ الجلسات نفسُه محروسٌ في القاعدة بـ`auth.uid()`.
 */
function currentSessionId(accessToken: string | undefined): string | null {
  const payload = accessToken?.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { session_id?: string };
    return json.session_id ?? null;
  } catch {
    return null;
  }
}

export async function getMySettings(): Promise<{ settings: MySettings | null; error: string | null }> {
  const supabase = await createClient();

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr) return { settings: null, error: uErr.message };
  if (!user) return { settings: null, error: null }; // التخطيط يحوّل للدخول قبل أن نصل هنا

  const { data: { session } } = await supabase.auth.getSession();
  const here = currentSessionId(session?.access_token);

  const [sRes, pRes, rRes] = await Promise.all([
    supabase.rpc("my_sessions"),
    supabase.from("profiles").select("bio, accepts_marketing, public_slug").eq("id", user.id).maybeSingle(),
    // حدُّ النشر منصبٌ فعّال، فالعنوانُ وحدَه لا يكفي (القاعدةُ نفسُها في `profile/data.ts`)
    supabase.from("user_roles").select("id").eq("user_id", user.id).eq("is_active", true).limit(1),
  ]);

  const rows = (sRes.data ?? []) as { id: string; created_at: string; last_seen: string; user_agent: string | null; ip: string | null }[];
  const p = pRes.data as { bio: string | null; accepts_marketing: boolean | null; public_slug: string | null } | null;

  // **جلستُك أوّلًا ثمّ الأحدثُ فالأحدث**: القاعدةُ ترتّب بآخر نشاط، وقد يسبقك إليه جهازٌ
  // آخرُ لحظةَ القراءة — فتُقرأ سطرَك في وسط الكشف. والفرزُ ههنا لا في SQL لأنّ «الحاليّة»
  // لا تُعرَف إلّا بعد فكّ رمزِ هذه الجلسة، وذلك شأنُ التطبيق.
  const sessions: MySession[] = rows
    .map((s) => ({
      id: s.id,
      device: describeDevice(s.user_agent),
      kind: deviceKind(s.user_agent),
      ip: s.ip,
      started: fmtDate(s.created_at),
      lastSeen: fmtSince(s.last_seen),
      lastSeenStamp: fmtStamp(s.last_seen),
      current: s.id === here,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));

  const methods: LoginMethod[] = (user.identities ?? [])
    .map((i) => {
      const provider = providerKey(i.provider);
      if (!provider) return null;
      const data = (i.identity_data ?? {}) as { email?: string };
      return {
        id: i.identity_id,
        provider,
        account: data.email ?? null,
        added: fmtDate(i.created_at ?? null),
        lastUsed: i.last_sign_in_at ? fmtSince(i.last_sign_in_at) : null,
      };
    })
    .filter((m): m is LoginMethod => m !== null)
    // البريدُ أوّلًا: هو الطريقُ الأصل، وما بعده إضافةٌ عليه
    .sort((a, b) => Number(b.provider === "email") - Number(a.provider === "email"));

  return {
    settings: {
      email: user.email ?? "",
      // `new_email` يبقى مملوءًا حتى يُفتح رابطُ التأكيد أو تُطلَب وجهةٌ غيرُها
      pendingEmail: (user as { new_email?: string }).new_email || null,
      methods,
      marketing: p?.accepts_marketing ?? false,
      bio: p?.bio ?? "",
      publicSlug: (rRes.data?.length ?? 0) > 0 ? (p?.public_slug ?? null) : null,
      sessions,
      sessionsError: sRes.error?.message ?? null,
      profileError: pRes.error?.message ?? null,
    },
    error: null,
  };
}
