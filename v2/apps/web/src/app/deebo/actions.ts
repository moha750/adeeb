"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * سِجلُّ محادثاتي — القراءةُ والحذفُ (عند صاحبه) بجلسته لا بمفتاح الخدمة.
 *
 * أذن المالك ٢٠٢٦-٠٨-٢٠ بأن يكون للعضو سِجلٌّ كسجلّ المساعدين. وحارسُه **القاعدةُ لا
 * الشاشة**: سياسةُ `deebo_conv_own_read` تقيس `user_id = auth.uid()`، فلو مُرِّر معرّفُ
 * محادثةِ غيرك رجع الصفُّ فارغًا. ولذلك تُقرأ هنا بعميل الكوكيز (المستخدم) لا بمفتاح
 * الخدمة (الذي يتجاوز RLS ويجعل الحارسَ زينة).
 *
 * **والحذفُ عند صاحبه لا عند النادي** (حكمُ المالك ٢٠٢٦-٠٨-٢٠ ثمّ ثبّته ٢١-٠٨): يذهب
 * الصفُّ من دَرَجه ومن أن يفتحه، ويبقى في غرفة اللوحة كما هو. ولذلك لا سياسةَ حذفٍ في
 * القاعدة أصلًا: الفعلُ إخفاءٌ بدالّةٍ ضيّقة، والكلمةُ في الواجهة «حذف» لأنّها كذلك عنده.
 *
 * والكتابةُ تبقى للمِنفذ وحده: لا فعلَ ههنا يُنشئ محادثةً ولا يعدّل رسالة.
 */

export type ConversationRow = {
  id: string;
  title: string | null;
  lastAt: string;
  messageCount: number;
};

export type ConversationTurn = { role: "user" | "assistant"; content: string };

/** أحدثُ خمسين محادثة. ومن تجاوزها فالقديمُ يذهب بمهمّة السنة لا بصفحةٍ ثانية. */
const MAX_LIST = 50;

export async function listMyConversations(): Promise<ConversationRow[]> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await sb
    .from("deebo_conversations")
    .select("id, title, last_at, message_count")
    .eq("user_id", auth.user.id)
    // المحادثةُ تُفتح قبل أن يصل جوابٌ، فصفٌّ بلا رسائلَ محادثةٌ لم تقع: لا تُعرض.
    .gt("message_count", 0)
    /* **والمحذوفةُ عنده تُنخَل ههنا صراحةً** ولا يُتَّكأ على RLS وحدها: سياسةُ `deebo_conv_read`
       تُبيح لمن له `manage_deebo` قراءةَ كلّ المحادثات، والسياساتُ تُجمع بـ«أو» — فرئيسُ
       النادي كان يرى محادثاتِه المحذوفةَ تعود بعد تحديث الصفحة (سُبر حيًّا ٢٠٢٦-٠٨-٢١). */
    .is("hidden_at", null)
    .order("last_at", { ascending: false })
    .limit(MAX_LIST);

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    lastAt: r.last_at as string,
    messageCount: (r.message_count as number) ?? 0,
  }));
}

/**
 * يفتح محادثةً بعينها. يردّ `null` إن لم تكن لصاحب الجلسة أو حذفها من سجلّه.
 *
 * **والملكيّةُ تُفحَص ههنا صراحةً** لا في سياسةٍ وحدها: من له `manage_deebo` تُبيح له
 * سياسةُ اللوحة قراءةَ كلّ صفٍّ، فلولا هذا الفحصُ لفتح رئيسُ النادي بمعرّفٍ محادثةً
 * محذوفةً عنده (أو محادثةَ غيره) في غرفته الخاصّة.
 */
export async function openMyConversation(id: string): Promise<ConversationTurn[] | null> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

  const { data: conv } = await sb
    .from("deebo_conversations")
    .select("id, user_id, hidden_at")
    .eq("id", id)
    .maybeSingle();
  const row = conv as { user_id: string | null; hidden_at: string | null } | null;
  if (!row || row.hidden_at || row.user_id !== auth.user.id) return null;

  const { data, error } = await sb
    .from("deebo_messages")
    .select("role, content")
    .eq("conversation_id", id)
    .order("id", { ascending: true });

  if (error || !data || data.length === 0) return null;
  return data
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * حذفُ محادثةٍ من سجلّي — **حذفٌ عندي، لا عند النادي** (حكمُ المالك): تخرج من دَرَجي ومن
 * أن أفتحها، ويبقى نصُّها في غرفة اللوحة كما هو. والدالّةُ في القاعدة هي التي تفعل: لا
 * امتيازَ `update` لأحدٍ على الجدول، وصاحبُ الصفّ فيها من `auth.uid()` لا من مُدخَل.
 */
export async function deleteMyConversation(id: string): Promise<{ ok: boolean; message: string }> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, message: "لا بدّ من تسجيل الدخول." };

  const { data, error } = await sb.rpc("deebo_hide_conversation", { p_id: id });
  if (error) return { ok: false, message: "تعذّر حذف المحادثة. أعد المحاولة." };
  // `false` تعني أنّها ليست له أو حُذفت قبلُ. وكلاهما في الشاشة سواء: لا تظهر بعدها.
  if (data !== true) return { ok: false, message: "لم نجد هذه المحادثة في سجلّك." };
  return { ok: true, message: "حُذفت المحادثة." };
}
