/**
 * بوّابةُ ديبو — المِنفذُ الوحيد الذي يُنادى منه نموذجٌ في هذا المشروع.
 *
 * ## لماذا مسارٌ لا فعلٌ خادميّ
 * الأفعالُ الخادميّة (`"use server"`) تردّ قيمةً واحدةً بعد اكتمالها، وديبو يبثّ
 * جملةً جملة. فالمسارُ هو ما يملك `ReadableStream`.
 *
 * ## ترتيبُ الحرّاس، وهو مقصود
 *   ١) شكلُ الطلب      ← رخيص، يردّ العابث قبل أن يكلّفنا شيئًا
 *   ٢) Turnstile       ← نداءُ شبكةٍ لكلاودفلير، وأوّلَ رسالةٍ فقط (ومحادثةٌ تُستأنَف تُصدَّق قبله)
 *   ٣) حدُّ الزائر والسقفُ اليوميّ ← استعلاما قاعدة
 *   ٤) المزوّد          ← وهو وحده ما يكلّف مالًا
 * فكلُّ حارسٍ أرخصُ ممّا بعده. ومن سقط في الأوّل لم يبلغ الرابع.
 *
 * ## والفشلُ يُغلق لا يفتح
 * تعذُّرُ القاعدة أو غيابُ مفتاح الخدمة يردّ الطلبَ، ولا يمرّره «تسامحًا».
 */

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { buildSystemPrompt } from "@/lib/deebo/persona";
import { createSentenceGuard, allowedNumbers } from "@/lib/deebo/guard";
import { liveProvider, readableError, type ChatMessage } from "@/lib/deebo/providers";
import { checkGate, clientIp, deeboService, visitorHash } from "@/lib/deebo/limits";
import { loadDeeboViewer, viewerBriefing } from "@/lib/deebo/viewer";
import type { FaqRow } from "@/lib/deebo/knowledge";

/** أطولُ سؤالٍ يُقبل. ما زاد إفراطٌ أو عبث، وكلاهما يُكلّف رموزًا بلا فائدة. */
const MAX_QUESTION = 600;

/**
 * كم رسالةً سابقةً تُرسل مع السؤال.
 * كلُّ رسالةٍ في التاريخ تُحاسَب في كلّ دورة، فالتاريخُ الطويل يضاعف الفاتورة
 * تصاعديًّا. وستٌّ تكفي لتماسك محادثةٍ قصيرةٍ كمحادثات ديبو.
 */
const MAX_HISTORY = 6;

type Body = {
  message?: unknown;
  history?: unknown;
  conversationId?: unknown;
  turnstileToken?: unknown;
  path?: unknown;
};

const line = (o: unknown) => new TextEncoder().encode(`${JSON.stringify(o)}\n`);

/**
 * عنوانُ المحادثة من أوّل سؤال — **قصٌّ عند كلمةٍ لا عند حرف**: «كيف أنضمّ إل…» تُقرأ عطبًا.
 * ولا يُستدعى النموذجُ لتسميتها: أوّلُ سؤالٍ هو موضوعُها في العادة، وثمنُ التسمية رحلةٌ ثانية.
 */
function conversationTitle(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  if (flat.length <= 48) return flat;
  const cut = flat.slice(0, 48);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ type: "error", message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  /* ── ١) شكلُ الطلب ─────────────────────────────────────────────────────── */
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "طلبٌ غير مفهوم.");
  }

  const question = typeof body.message === "string" ? body.message.trim() : "";
  if (!question) return fail(400, "اكتب سؤالك أوّلًا.");
  if (question.length > MAX_QUESTION) {
    return fail(400, `سؤالك طويل. اجعله دون ${MAX_QUESTION} حرفًا.`);
  }

  const history: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            typeof m === "object" &&
            typeof (m as ChatMessage).content === "string" &&
            ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
        )
        .slice(-MAX_HISTORY)
    : [];

  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  const entryPath = typeof body.path === "string" ? body.path.slice(0, 200) : null;

  /* ── ١٫٥) مَن يسأل؟ ───────────────────────────────────────────────────────
     صاحبُ الجلسة يُعرَف من كوكيز الطلب لا من حقلٍ في المتن: معرّفٌ يرسله المتصفّح
     يعني أنّ كلَّ زائرٍ يستطيع أن يكتب محادثةً باسم غيره (درسُ `p_actor` المسدود). */
  let userId: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null; // تعثُّرُ قراءةِ الجلسة يجعله زائرًا، ولا يُسقط سؤاله
  }

  /* ── ١٫٦) أهذه المحادثةُ محادثتُك؟ ────────────────────────────────────────
     معرّفُ المحادثة يأتي من المتصفّح، وحتّى اليوم كان يُصدَّق كما جاء: فمن حمل معرّفَ
     محادثةِ غيره كتب فيها. فالمعرّفُ يُصدَّق بشرطين لا ثالثَ لهما:
       · صاحبُ الجلسة يُكمل ما هو **له**.
       · والمجهولُ يُكمل ما لا صاحبَ له وحدَه، فلا يُلحِق كلامَه بسجلّ عضو.
     وما لم يجتَزْ يُهمَل بلا خطأ: تُفتح له محادثةٌ جديدة، ويعود الدرعُ شرطًا كما لو
     لم يرسل معرّفًا أصلًا (وإلّا كان المعرّفُ المخترَعُ بابًا يتخطّى Turnstile). */
  const supabase = deeboService();
  if (!supabase) return fail(503, "ديبو غير مهيّأ الآن.");

  let resumeId: string | null = null;
  if (conversationId) {
    const { data: own } = await supabase
      .from("deebo_conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .maybeSingle();
    const row = own as { id: string; user_id: string | null } | null;
    if (row && (row.user_id ?? null) === userId) resumeId = row.id;
  }

  /* ── ٢) الدرع، وأوّلَ رسالةٍ فقط ────────────────────────────────────────── */
  // رمزُ Turnstile يُستهلك مرّةً، ومطالبةُ الزائر بحلّ اللغز عند كلّ سؤالٍ تقتل
  // المحادثة. فالأوّلُ يُدرَع، وما بعده يحرسه ربطُ المحادثة بالبصمة + حدُّ الساعة.
  //
  // **ومن دخل بحسابه لا يُدرَع أصلًا**: الدرعُ يسأل «أإنسانٌ أنت؟»، وحسابٌ قائمٌ في
  // أديب جوابٌ أوثق من لغزٍ يُحلّ. وحدُّ الساعة والسقفُ اليوميّ يبقيان عليه كما هما،
  // فالبابُ الذي يحرس الرصيد لم يُفتح. (والصفحةُ لا ترسم الودجةَ له من أصلها.)
  if (!resumeId && !userId) {
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
    const shieldError = await verifyTurnstile(token);
    if (shieldError) return fail(403, shieldError);
  }

  /* ── ٣) البصمةُ والحدود ────────────────────────────────────────────────── */
  let hash: string;
  try {
    hash = visitorHash(clientIp(req.headers));
  } catch {
    return fail(503, "ديبو غير مهيّأ الآن.");
  }

  const provider = liveProvider();
  const gate = await checkGate(supabase, hash, provider.rates);
  if (!gate.ok) return fail(gate.status, gate.message);

  /* ── ٤) المعرفة ───────────────────────────────────────────────────────── */
  const { data: faq, error: faqErr } = await supabase
    .from("faq")
    .select("question, answer")
    .order("id");
  if (faqErr) return fail(503, "تعذّر قراءة معرفة ديبو الآن.");

  const rows = (faq ?? []) as FaqRow[];
  // صفةُ صاحب الجلسة (إن كان له حساب) — بإذن المالك ٢٠٢٦-٠٨-٢٠: الاسمُ الأوّل والصفة لا أكثر.
  const viewer = userId ? await loadDeeboViewer(userId) : null;
  const system = buildSystemPrompt(rows, viewer ? viewerBriefing(viewer) : null);

  // ما يُسمح لديبو أن يذكره من أعداد: ما في معرفته، وما كتبه الزائر بنفسه.
  const guard = createSentenceGuard(allowedNumbers(system, question));

  /* ── ٥) البثُّ عبر الحارس ──────────────────────────────────────────────── */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      let convId = resumeId;

      try {
        // المحادثةُ تُفتح قبل البثّ كي يعود معرّفُها للعميل في أوّل سطر،
        // فلو انقطع الاتّصال في منتصف الجواب بقي للعميل ما يواصل به.
        if (!convId) {
          const { data } = await supabase
            .from("deebo_conversations")
            .insert({
              visitor_hash: hash,
              entry_path: entryPath,
              model: provider.model,
              // الصاحبُ من الجلسة، والعنوانُ من أوّل سؤالٍ له (لا رحلةَ ثانيةً إلى المزوّد لتسميةٍ).
              user_id: userId,
              title: conversationTitle(question),
            })
            .select("id")
            .single();
          convId = (data?.id as string | undefined) ?? null;
        }
        controller.enqueue(line({ type: "meta", conversationId: convId }));

        let usage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
        for await (const ev of provider.stream(system, [
          ...history,
          { role: "user", content: question },
        ])) {
          if (ev.type === "text") {
            // الحارسُ يبتلع القطع ولا يُخرج إلّا جملةً مكتملةً مفحوصة.
            const safe = guard.push(ev.text);
            if (safe) {
              answer += safe;
              controller.enqueue(line({ type: "text", text: safe }));
            }
          } else {
            usage = ev.usage;
          }
        }

        const rest = guard.end();
        if (rest) {
          answer += rest;
          controller.enqueue(line({ type: "text", text: rest }));
        }
        controller.enqueue(line({ type: "done" }));

        // السجلُّ بعد إغلاق البثّ: الزائر لا ينتظر كتابتَنا.
        if (convId) {
          const id = convId;
          const blocked = guard.didBlock;
          after(async () => {
            /* **صفّا الدفعة يتّحدان في مفاتيحهما، ولو كانت قيمةُ أحدهما فارغة.**
               رُصد 2026-08-20 على أوّل محادثةٍ حقيقيّة: المحادثةُ سُجّلت وعدّادُها زاد
               ورموزُها حُسبت، و**رسائلُها صفر**. والعلّةُ أنّ PostgREST يبني للدفعة عمودًا
               واحدًا من **اتّحاد** مفاتيح صفوفها، ثمّ يملأ الغائبَ من صفٍّ بـ`NULL`
               **لا بقيمة العمود الافتراضيّة**. فصفُّ الزائر لم يكن يحمل `guard_blocked`
               (وهو `not null default false`) فوقع فيه `NULL`، فسقطت الدفعةُ كلُّها بـ23502.

               وسقطت **صامتةً** لأنّ عميلَ Supabase يردّ الخطأَ في كائنٍ ولا يرميه، والسطرُ
               التالي (`deebo_bump_conversation`) يمضي فيزيد العدّاد — فبدا السجلُّ كأنّه
               يعمل وهو لا يحفظ حرفًا. ولذلك يُفحَص الردُّ أدناه ولا يُهمَل.

               والحلُّ شكلٌ واحدٌ للصفّين لا `defaultToNull: false` مخبوءةٌ في خيار: ما يُرى
               في الكود هو ما يصل القاعدة. وأعمدةُ الرموز تبقى `null` في سطر الزائر بأمر
               الترحيل («للمساعد وحده»)، وهي تقبل الفراغ فلا يضرّها الاتّحاد. */
            const { error: insErr } = await supabase.from("deebo_messages").insert([
              {
                conversation_id: id,
                role: "user",
                content: question,
                input_tokens: null,
                output_tokens: null,
                cached_tokens: null,
                guard_blocked: false,
              },
              {
                conversation_id: id,
                role: "assistant",
                content: answer,
                input_tokens: usage.inputTokens,
                output_tokens: usage.outputTokens,
                cached_tokens: usage.cachedTokens,
                guard_blocked: blocked,
              },
            ]);
            // العدّادُ لا يزيد على رسائلَ لم تُحفظ: صفٌّ يقول «ثلاثٌ» وتحته صفرٌ يكذب مرّتين.
            if (insErr) {
              console.error("[deebo] تعذّر حفظُ الرسائل، فلم يُزَد العدّاد:", insErr.message);
              return;
            }
            await supabase.rpc("deebo_bump_conversation", {
              p_id: id,
              p_in: usage.inputTokens,
              p_out: usage.outputTokens,
              p_cached: usage.cachedTokens,
            });
          });
        }
      } catch (e) {
        controller.enqueue(line({ type: "error", message: readableError(e, provider.envKey) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // يمنع وكيلًا وسيطًا من تجميع البثّ فيصل دفعةً واحدة
      "x-accel-buffering": "no",
    },
  });
}
