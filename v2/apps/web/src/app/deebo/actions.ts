"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * سِجلُّ محادثاتي — القراءةُ والحذفُ بجلسة صاحبها لا بمفتاح الخدمة.
 *
 * أذن المالك ٢٠٢٦-٠٨-٢٠ بأن يكون للعضو سِجلٌّ كسجلّ المساعدين. وحارسُه **القاعدةُ لا
 * الشاشة**: سياستا `deebo_conv_own_read` و`deebo_conv_own_delete` تقيسان `user_id =
 * auth.uid()`، فلو مُرِّر معرّفُ محادثةِ غيرك رجع الصفُّ فارغًا. ولذلك تُقرأ هنا بعميل
 * الكوكيز (المستخدم) لا بمفتاح الخدمة (الذي يتجاوز RLS ويجعل الحارسَ زينة).
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

/** يفتح محادثةً بعينها. يردّ `null` إن لم تكن لصاحب الجلسة (السياسةُ تحجبها). */
export async function openMyConversation(id: string): Promise<ConversationTurn[] | null> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

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
 * حذفُ محادثة — **حذفٌ من كلّ مكان** (كلمةُ المالك ٢٠٢٦-٠٨-٢٠: «حذفك للمحادثة يعني
 * حذفها من كلّ مكان»): يذهب الصفُّ ورسائلُه معه (`on delete cascade`)، ولا يبقى له أثرٌ
 * في غرفة اللوحة ولا في غيرها. وجُرّب في اليوم نفسِه إخفاءٌ يُبقيها للنادي فنُقض.
 */
export async function deleteMyConversation(id: string): Promise<{ ok: boolean; message: string }> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, message: "لا بدّ من تسجيل الدخول." };

  const { error } = await sb.from("deebo_conversations").delete().eq("id", id);
  if (error) return { ok: false, message: "تعذّر حذف المحادثة. أعد المحاولة." };
  return { ok: true, message: "حُذفت المحادثة." };
}
