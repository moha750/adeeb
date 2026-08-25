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
  /** حذفها صاحبُها من سجلّه في هذا الوقت — والمحادثةُ ههنا كما هي (حكمُ المالك ٢٠٢٦-٠٨-٢١). */
  hiddenAt: string | null;
  /** اسمُ صاحبها إن كان له حساب — `null` للزائر المجهول (وله بصمتُه وحدَها). */
  ownerName: string | null;
  /**
   * صفتُه في أديب — تُقرأ من القاعدة لا تُخمَّن من وجود الحساب: **صاحبُ الحساب ليس عضوًا
   * بالضرورة** (م١ وحّدت `profiles` فسكنه من لم ينضمّ بعد). والثلاثُ هي صفاتُ
   * `lib/deebo/viewer.ts` نفسُها، فلا صفتان لشخصٍ واحدٍ في المنتج.
   */
  ownerStanding: "member" | "volunteer" | "account" | null;
  /** جنسُ صاحبها — للفعل المسنَد إليه («حذفها» / «حذفتها»)، لا لغيره. */
  ownerGender: "male" | "female" | null;
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
 *
 * **وما حذفه صاحبُه يبقى ههنا كما هو** (حكمُ المالك ٢٠٢٦-٠٨-٢١): الحذفُ عنده لا عندنا،
 * و`hidden_at` خبرٌ يُعرَض للأدمن لا مرشِّحٌ يُطبَّق (ومفتاحُ الخدمة يتجاوز سياسةَ الحجب
 * أصلًا). وحدُّ الحفظ باقٍ: سنةٌ ثمّ تذهب المملوكةُ كلُّها بمهمّة `deebo_purge_owned`.
 */
export async function getDeeboLog(): Promise<DeeboLogData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { rows: [], error: KEY_HINT };

  const sb = createAdeebServiceClient(url, key);
  const { data: convs, error } = await sb
    .from("deebo_conversations")
    .select(
      "id, started_at, last_at, visitor_hash, user_id, hidden_at, entry_path, model, message_count, total_input_tokens, total_output_tokens, total_cached_tokens",
    )
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) return { rows: [], error: error.message };

  type RawConv = {
    id: string; started_at: string; last_at: string; visitor_hash: string;
    user_id: string | null; hidden_at: string | null;
    entry_path: string | null; model: string; message_count: number;
    total_input_tokens: number; total_output_tokens: number; total_cached_tokens: number;
  };
  const raw = (convs ?? []) as RawConv[];
  if (!raw.length) return { rows: [], error: null };

  /* أسماءُ أصحاب المحادثات — نداءٌ واحدٌ لهم جميعًا لا نداءٌ لكلّ صفّ.
     **والاسمُ يُقرأ من `profiles` لا يُخزَّن في المحادثة**: من غيّر اسمَه غيّره في سجلّه
     معه، ومن خرج من أديب صار `user_id` فيها `null` (م١) فعادت مجهولةً بلا أثرٍ لاسمه. */
  const ownerIds = [...new Set(raw.map((c) => c.user_id).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  const genders = new Map<string, "male" | "female">();
  const members = new Set<string>();
  const volunteers = new Set<string>();
  if (ownerIds.length) {
    /* ثلاثةُ نداءاتٍ لأصحاب المحادثات جميعًا لا ثلاثةٌ لكلّ واحد، وتجري معًا.
       و`members` **عرضٌ مفتاحُه `id`** لا `user_id` (سابقةُ `viewer.ts`: الاستعلامُ
       بـ`user_id` يتعثّر صامتًا فيصير العضوُ «صاحبَ حساب»). والمتطوّعُ صفٌّ لم يُنهَ. */
    const [people, mem, vol] = await Promise.all([
      sb.from("profiles").select("id, full_name, gender").in("id", ownerIds),
      sb.from("members").select("id").in("id", ownerIds),
      sb.from("volunteers").select("user_id, ended_at").in("user_id", ownerIds),
    ]);
    for (const p of (people.data ?? []) as Array<{ id: string; full_name: string | null; gender: string | null }>) {
      if (p.full_name) names.set(p.id, p.full_name);
      if (p.gender === "male" || p.gender === "female") genders.set(p.id, p.gender);
    }
    for (const m of (mem.data ?? []) as Array<{ id: string }>) members.add(m.id);
    for (const v of (vol.data ?? []) as Array<{ user_id: string; ended_at: string | null }>) {
      if (!v.ended_at) volunteers.add(v.user_id);
    }
  }

  /** صفةُ صاحب الحساب: عضويّةٌ قائمة، ثمّ تطوّعٌ قائم، ثمّ حسابٌ لا غير. */
  const standingOf = (id: string | null): DeeboConversation["ownerStanding"] =>
    !id ? null : members.has(id) ? "member" : volunteers.has(id) ? "volunteer" : "account";

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
      hiddenAt: c.hidden_at,
      ownerName: c.user_id ? names.get(c.user_id) ?? "صاحبُ حسابٍ لا اسمَ له" : null,
      ownerStanding: standingOf(c.user_id),
      ownerGender: c.user_id ? genders.get(c.user_id) ?? null : null,
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

/**
 * محادثةٌ واحدةٌ برسائلها — قارئُ صفحة الحوار (`/dashboard/deebo/[id]`).
 *
 * **ولِمَ قارئٌ ثانٍ ولا يُنخَل من قائمة الغرفة؟** لأنّ القائمةَ محدودةٌ بمئتَي محادثةٍ من
 * الأحدث، فمحادثةٌ من الشهر الماضي يُفتَح رابطُها لا تكون فيها أصلًا. والرابطُ يُنسَخ ويُرسَل
 * (وهو نصفُ علّة اختيار الصفحة على النافذة ٢٠٢٦-٠٨-٢٢)، فلا يصحّ أن يعمل حينًا ويخيب حينًا.
 *
 * والتفويضُ عند الباب كسائر الغرفة (`manage_deebo` في `denyUnless`)، والقراءةُ بمفتاح الخدمة.
 * **وما حذفه صاحبُه يبقى مقروءًا ههنا** كما يبقى في القائمة (حكمُ المالك ٢٠٢٦-٠٨-٢١).
 */
export async function getDeeboTalk(
  id: string,
): Promise<{ talk: DeeboConversation | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { talk: null, error: KEY_HINT };

  const sb = createAdeebServiceClient(url, key);
  const { data: conv, error } = await sb
    .from("deebo_conversations")
    .select(
      "id, started_at, last_at, visitor_hash, user_id, hidden_at, entry_path, model, message_count, total_input_tokens, total_output_tokens, total_cached_tokens",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return { talk: null, error: error.message };
  if (!conv) return { talk: null, error: null };

  const c = conv as {
    id: string; started_at: string; last_at: string; visitor_hash: string;
    user_id: string | null; hidden_at: string | null; entry_path: string | null;
    model: string; message_count: number;
    total_input_tokens: number; total_output_tokens: number; total_cached_tokens: number;
  };

  // الاسمُ من `profiles` لا من صفّ المحادثة (العلّةُ في `getDeeboLog`: من غيّر اسمَه غيّره
  // في سجلّه معه، ومن خرج من أديب صار `user_id` فيها `null` فعادت مجهولةً بلا أثرٍ لاسمه).
  let ownerName: string | null = null;
  let ownerStanding: DeeboConversation["ownerStanding"] = null;
  let ownerGender: DeeboConversation["ownerGender"] = null;
  if (c.user_id) {
    const [person, mem, vol] = await Promise.all([
      sb.from("profiles").select("full_name, gender").eq("id", c.user_id).maybeSingle(),
      sb.from("members").select("id").eq("id", c.user_id).maybeSingle(),
      sb.from("volunteers").select("ended_at").eq("user_id", c.user_id).maybeSingle(),
    ]);
    const row = person.data as { full_name: string | null; gender: string | null } | null;
    ownerName = row?.full_name ?? "صاحبُ حسابٍ لا اسمَ له";
    ownerGender = row?.gender === "male" || row?.gender === "female" ? row.gender : null;
    const volRow = vol.data as { ended_at: string | null } | null;
    ownerStanding = mem.data ? "member" : volRow && !volRow.ended_at ? "volunteer" : "account";
  }

  const { data: msgs, error: msgErr } = await sb
    .from("deebo_messages")
    .select("id, at, role, content, input_tokens, output_tokens, cached_tokens, latency_ms, guard_blocked")
    .eq("conversation_id", c.id)
    .order("at", { ascending: true });
  if (msgErr) return { talk: null, error: msgErr.message };

  type RawOne = {
    id: number; at: string; role: string; content: string;
    input_tokens: number | null; output_tokens: number | null; cached_tokens: number | null;
    latency_ms: number | null; guard_blocked: boolean;
  };

  return {
    talk: {
      id: c.id,
      startedAt: c.started_at,
      lastAt: c.last_at,
      visitorHash: c.visitor_hash,
      hiddenAt: c.hidden_at,
      ownerName,
      ownerStanding,
      ownerGender,
      entryPath: c.entry_path,
      model: c.model,
      messageCount: c.message_count,
      inputTokens: c.total_input_tokens,
      outputTokens: c.total_output_tokens,
      cachedTokens: c.total_cached_tokens,
      messages: ((msgs ?? []) as RawOne[]).map((m) => ({
        id: String(m.id),
        at: m.at,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        inputTokens: m.input_tokens,
        outputTokens: m.output_tokens,
        cachedTokens: m.cached_tokens,
        latencyMs: m.latency_ms,
        guardBlocked: m.guard_blocked,
      })),
    },
    error: null,
  };
}
