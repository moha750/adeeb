// يُستورَد من مكوّنات خادميّة وحدها (page.tsx) — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/** رسالةٌ واحدةٌ في محادثة — صفٌّ من `deebo_messages` بأسماء الواجهة. */
export type DeeboMessage = {
  id: string;
  at: string;
  role: "user" | "assistant";
  content: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  latencyMs: number | null;
  /** حجب حارسُ الأرقام جملةً في هذا الجواب — مقياسُ ميلِ النموذج إلى الاختراع. */
  guardBlocked: boolean;
};

/** محادثةٌ كاملةٌ برسائلها — صفٌّ من `deebo_conversations` ومعه أبناؤه. */
export type DeeboConversation = {
  id: string;
  startedAt: string;
  lastAt: string;
  /** بصمةٌ تدور يوميًّا: تكفي للتمييز داخل اليوم ولا تصل زيارتَي يومين بشخصٍ واحد. */
  visitorHash: string;
  entryPath: string | null;
  model: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  messages: DeeboMessage[];
};

export type DeeboLogData = { rows: DeeboConversation[]; error: string | null };

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/**
 * سجلُّ محادثات ديبو — الأحدث أوّلًا، وحدُّ الصفحة **مئتا محادثة**.
 *
 * والحدُّ مقصود: الغرفةُ تُقرأ لتُعرَف بمَ يُسأل النادي، وذلك يُقرأ من الأحدث لا من الأوّل.
 * ولا ترقيمَ خادميٌّ بعدُ لأنّ الجدول فارغٌ اليوم (صفرُ صفٍّ عند بنائها، ٢٠٢٦-٠٨-١٩)،
 * فبناءُ ترقيمٍ لطابورٍ لا وجودَ له تعقيدٌ بلا سببه. وحين يمتلئ فموضعُ الترقيم هنا.
 *
 * والقراءةُ بمفتاح الخدمة كسائر غرف اللوحة: **التفويض عند الباب** (`manage_deebo` في
 * `denyUnless`) لا في الاستعلام. وسياستا RLS في القاعدة تحرسان من ينادي القاعدةَ مباشرةً.
 */
export async function getDeeboLog(): Promise<DeeboLogData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { rows: [], error: KEY_HINT };

  const sb = createAdeebServiceClient(url, key);
  const { data: convs, error } = await sb
    .from("deebo_conversations")
    .select(
      "id, started_at, last_at, visitor_hash, entry_path, model, message_count, total_input_tokens, total_output_tokens, total_cached_tokens",
    )
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) return { rows: [], error: error.message };

  type RawConv = {
    id: string; started_at: string; last_at: string; visitor_hash: string;
    entry_path: string | null; model: string; message_count: number;
    total_input_tokens: number; total_output_tokens: number; total_cached_tokens: number;
  };
  const raw = (convs ?? []) as RawConv[];
  if (!raw.length) return { rows: [], error: null };

  // رسائلُ المحادثات كلِّها في نداءٍ واحد — لا محادثةٌ تجرّ نداءَها (سابقةُ أسماء الرادّين
  // في رسائل التواصل). والترتيبُ بالوقت صاعدًا فتُقرأ كما جرت.
  type RawMsg = {
    id: number; conversation_id: string; at: string; role: string; content: string;
    input_tokens: number | null; output_tokens: number | null; cached_tokens: number | null;
    latency_ms: number | null; guard_blocked: boolean;
  };
  const { data: msgs, error: msgErr } = await sb
    .from("deebo_messages")
    .select("id, conversation_id, at, role, content, input_tokens, output_tokens, cached_tokens, latency_ms, guard_blocked")
    .in("conversation_id", raw.map((c) => c.id))
    .order("at", { ascending: true });
  if (msgErr) return { rows: [], error: msgErr.message };

  const byConv = new Map<string, DeeboMessage[]>();
  for (const m of (msgs ?? []) as RawMsg[]) {
    const list = byConv.get(m.conversation_id) ?? [];
    list.push({
      id: String(m.id),
      at: m.at,
      // القيدُ في القاعدة يحصرها في اثنين، والحارسُ هنا لئلّا يكسر النوعُ صفٌّ شاذّ.
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      inputTokens: m.input_tokens,
      outputTokens: m.output_tokens,
      cachedTokens: m.cached_tokens,
      latencyMs: m.latency_ms,
      guardBlocked: m.guard_blocked,
    });
    byConv.set(m.conversation_id, list);
  }

  return {
    rows: raw.map((c) => ({
      id: c.id,
      startedAt: c.started_at,
      lastAt: c.last_at,
      visitorHash: c.visitor_hash,
      entryPath: c.entry_path,
      model: c.model,
      messageCount: c.message_count,
      inputTokens: c.total_input_tokens,
      outputTokens: c.total_output_tokens,
      cachedTokens: c.total_cached_tokens,
      messages: byConv.get(c.id) ?? [],
    })),
    error: null,
  };
}
