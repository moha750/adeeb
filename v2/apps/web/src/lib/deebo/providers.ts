/**
 * طبقةُ المزوّد — أربعةُ نماذجَ خلف واجهةٍ واحدة.
 *
 * الغرضُ منها أن يكون تبديلُ النموذج **سطرًا** لا إعادةَ بناء. والمالك أطلق على
 * DeepSeek ٢٠٢٦-٠٨-١٨ بعد أن جرّب عربيّته، والبابُ يبقى مفتوحًا لغيره.
 *
 * ## البثُّ هو الأصل، و`ask` مشتقٌّ منه
 * لكلّ مزوّدٍ تنفيذٌ واحد (`stream`)، و`ask` يجمع بثّه في جوابٍ واحد. فلا نسختان
 * تفترقان مع الزمن: مختبرُ المقارنة يستعمل `ask`، والمحادثةُ الحيّة تستعمل
 * `stream`، وكلاهما يمرّ على الشيفرة نفسِها.
 *
 * وسببُ أن يكون البثُّ هو الأصل لا العكس: **حارسُ الأرقام** يفحص جملةً جملةً
 * قبل دفعها، فلو انتظرنا اكتمال الجواب لقرأ الزائر الرقمَ المخترَع ثمّ حُجب.
 *
 * ⚠️ **خادميٌّ محض.** يقرأ مفاتيح بلا بادئة `NEXT_PUBLIC_`، فلا يُستورد إلّا من
 * خادم. استيرادُه في مكوّنٍ عميليّ يسرّب المفاتيح.
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * ثمنُ المليون رمزٍ بالدولار — قائمةُ الذروة كما نشرها المزوّد.
 *
 * ولا تُقرأ للحساب مباشرةً بعد ٢٠٢٦-٠٨-٢١: بعضُ المزوّدين ينصّف خارج الذروة،
 * فالحسابُ يمرّ بـ`ratesAt` ليأخذ ثمنَ اللحظة. ومن قرأ القائمةَ خامًا أخطأ
 * الضِّعف، وقد أخطأناه.
 *
 * و`cachedIn` بندٌ مستقلٌّ لا نسبةٌ من `in`، لأنّ الخصم يختلف اختلافًا كبيرًا:
 * Claude يقرأ المخزَّن بعُشر الثمن، وDeepSeek بنحو ثلاثة بالمئة. فاشتقاقُه
 * بنسبةٍ واحدةٍ يكذب على أحدهما.
 */
export type Rates = { in: number; cachedIn: number; out: number };

/**
 * ساعاتُ الذروة عند DeepSeek بتوقيت UTC: 01:00-04:00 و06:00-10:00، وما عداها
 * وفرةٌ بنصف الثمن (سياستُهم منذ ٢٠٢٦-٠٨-١٦، وصفحةُ أسعارهم مصدرُها).
 *
 * ولماذا `getUTCHours` وقد مُنع `getHours` في هذا المستودع؟ لأنّ المنعَ على
 * قراءة ساعةِ **الجهاز** (تختلف بين حاسوبِ المطوّر وخادمِ Vercel)، وهذه ساعةُ
 * UTC صريحةً وهي التي عرّف بها المزوّدُ نافذتَه. فلا ساعةَ محلّيّةَ هنا أصلًا.
 */
const DEEPSEEK_PEAK_UTC: readonly (readonly [number, number])[] = [
  [1, 4],
  [6, 10],
];

/** أفي ساعةِ الذروة نحن؟ الحدُّ الأدنى داخلٌ والأعلى خارج. */
export function isDeepseekPeak(at: Date): boolean {
  const hour = at.getUTCHours();
  return DEEPSEEK_PEAK_UTC.some(([from, to]) => hour >= from && hour < to);
}

/**
 * ثمنُ المزوّد **في لحظةٍ بعينها**.
 *
 * وفصلُه عن `rates` مقصود: القائمةُ تبقى أسعارَ الذروة كما نشرها المزوّد،
 * والوفرةُ قاعدةٌ تُطبَّق عليها. فمن أراد الثمنَ المعلن قرأ `rates`، ومن أراد
 * ما سيُدفع فعلًا نادى هذه. والمزوّدُ الذي لا وفرةَ عنده يردّ قائمتَه كما هي.
 */
export function ratesAt(provider: Provider, at: Date): Rates {
  if (!provider.offPeakAt?.(at)) return provider.rates;
  const { in: i, cachedIn, out } = provider.rates;
  return { in: i / 2, cachedIn: cachedIn / 2, out: out / 2 };
}

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  /** ما قُرئ من الذاكرة المؤقّتة بثمنٍ مخفَّض. */
  cachedTokens: number;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; usage: Usage; ms: number; costUsd: number };

export type Answer =
  | { ok: true; text: string; usage: Usage; ms: number; costUsd: number }
  | { ok: false; error: string; ms: number };

export type Provider = {
  id: string;
  label: string;
  model: string;
  /** أسعارُ الذروة المعلنة. لا تُستعمل للحساب مباشرةً: نادِ `ratesAt`. */
  rates: Rates;
  /** متى يكون الثمنُ نصفًا؟ غيابُه يعني ثمنًا واحدًا لا يتبدّل بالساعة. */
  offPeakAt?: (at: Date) => boolean;
  /** اسمُ متغيّر البيئة الذي يحمل مفتاحه، ليُقال للناظر أيُّها ناقص. */
  envKey: string;
  /** يرمي عند العطب؛ المستدعي يمسك ويترجم. */
  stream(system: string, messages: readonly ChatMessage[]): AsyncGenerator<StreamEvent>;
  ask(system: string, question: string): Promise<Answer>;
};

const MODELS = {
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5",
  gemini: process.env.GEMINI_MODEL?.trim() || "gemini-3-flash",
  // المعرّف الصريح لا الاسم المستعار `deepseek-chat`: كلاهما يشير اليوم إلى
  // Flash نفسِه (مُجرَّبٌ ٢٠٢٦-٠٨-١٨)، لكنّ المستعار يتبع «أحدث نموذج» فينزلق
  // إلى Pro مع إصدارٍ قادم، وثمنُ Pro ثلاثةُ أضعافه. تثبيتُ الاسم أرخصُ من مفاجأة.
  deepseek: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
} as const;

/**
 * سقفُ الخرج ألفُ رمز.
 *
 * ليس تقتيرًا بل مطابقةٌ للمطلوب: ديبو يجيب بجملتين أو ثلاث بحكم توجيهه، وسقفٌ
 * أوسعُ لا يطيل جوابًا قصيرًا وإنّما يترك بابًا لجوابٍ شاردٍ يطول بلا داعٍ.
 */
const MAX_TOKENS = 1024;

const ZERO: Usage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };

function costOf(usage: Usage, rates: Rates): number {
  return (
    (Math.max(0, usage.inputTokens) * rates.in) / 1_000_000 +
    (usage.cachedTokens * rates.cachedIn) / 1_000_000 +
    (usage.outputTokens * rates.out) / 1_000_000
  );
}

/** يحوّل أيّ عطبٍ إلى جملةٍ عربيّةٍ تُقرأ، فلا تُعرض رسالةُ مكتبةٍ خام. */
export function readableError(e: unknown, envKey: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/401|unauthor|invalid.*api.*key|api key/i.test(raw)) {
    return `المفتاح مرفوض أو ناقص. تحقّق من ${envKey} في ملفّ البيئة.`;
  }
  if (/402|insufficient|balance/i.test(raw)) return "نفد رصيد المزوّد.";
  if (/429|rate.?limit|quota/i.test(raw)) return "تجاوزتَ حدّ الطلبات. أعد المحاولة بعد قليل.";
  if (/404|not.?found|unknown model|does not exist/i.test(raw)) {
    return "النموذج غير معروف لدى المزوّد. عدّل معرّفه في ملفّ البيئة.";
  }
  return `تعذّر النداء: ${raw.slice(0, 200)}`;
}

/** يجمع بثًّا في جوابٍ واحد. مصدرُ `ask` لكلّ مزوّد، فلا تنفيذَ ثانيًا. */
async function collect(p: Provider, system: string, question: string): Promise<Answer> {
  const started = Date.now();
  try {
    let text = "";
    let tail: Extract<StreamEvent, { type: "done" }> | null = null;
    for await (const ev of p.stream(system, [{ role: "user", content: question }])) {
      if (ev.type === "text") text += ev.text;
      else tail = ev;
    }
    const ms = Date.now() - started;
    return {
      ok: true,
      text: text.trim(),
      usage: tail?.usage ?? ZERO,
      ms: tail?.ms ?? ms,
      costUsd: tail?.costUsd ?? 0,
    };
  } catch (e) {
    return { ok: false, error: readableError(e, p.envKey), ms: Date.now() - started };
  }
}

/**
 * قارئُ SSE مشترك.
 *
 * يجمع القطع الواردة في مخزنٍ ويُخرج **الأسطر المكتملة** وحدها: حزمةُ TCP قد
 * تنقطع في منتصف سطر JSON، فتحليلُ ما وصل بلا انتظارٍ يرمي خطأ تحليلٍ عشوائيًّا
 * لا يُعاد إنتاجه.
 */
async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ————————————————————————————— Claude ————————————————————————————— */

/**
 * فيه أمران مقصودان:
 *  · **الذاكرة المؤقّتة على التوجيه** (`cache_control`): معرفةُ ديبو هي هي في كلّ
 *    سؤال، فتُكتب مرّةً وتُقرأ بعُشر ثمنها فيما بعد.
 *  · **جهدٌ منخفض مع تفكيرٍ متكيّف**: السؤال «أجب ممّا في السياق» لا يحتاج تفكيرًا
 *    عميقًا، وإطفاءُ التفكير رأسًا له مطبّاتُه الموثَّقة.
 */
function makeClaude(id: string, label: string, model: string, rates: Rates): Provider {
  const p: Provider = {
    id,
    label,
    model,
    rates,
    envKey: "ANTHROPIC_API_KEY",
    async *stream(system, messages) {
      const started = Date.now();
      const key = process.env.ANTHROPIC_API_KEY?.trim();
      if (!key) throw new Error("api key missing");

      const res = new Anthropic({ apiKey: key }).messages.stream({
        model,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      for await (const ev of res) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          yield { type: "text", text: ev.delta.text };
        }
      }

      const final = await res.finalMessage();
      if (final.stop_reason === "refusal") {
        throw new Error("امتنع النموذج عن الإجابة لأسباب سلامة.");
      }
      const usage: Usage = {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cachedTokens: final.usage.cache_read_input_tokens ?? 0,
      };
      yield {
        type: "done",
        usage,
        ms: Date.now() - started,
        costUsd: costOf(usage, ratesAt(p, new Date(started))),
      };
    },
    ask: (system, question) => collect(p, system, question),
  };
  return p;
}

/* ————————————————————————————— Gemini ————————————————————————————— */

const gemini: Provider = {
  id: "gemini",
  label: "Gemini Flash",
  model: MODELS.gemini,
  rates: { in: 0.5, cachedIn: 0.05, out: 3.0 },
  envKey: "GEMINI_API_KEY",
  async *stream(system, messages) {
    // بلا بثٍّ حقيقيّ: عمودُ مقارنةٍ لا مزوّدُ إنتاج. يُدفع الجوابُ قطعةً واحدة.
    const started = Date.now();
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("api key missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: MAX_TOKENS },
      }),
    });
    const data = (await resp.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      error?: { message?: string };
    };
    if (!resp.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${resp.status}`);

    const text = (data.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");
    if (text) yield { type: "text", text };

    const usage: Usage = {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      cachedTokens: 0,
    };
    yield {
      type: "done",
      usage,
      ms: Date.now() - started,
      costUsd: costOf(usage, ratesAt(gemini, new Date(started))),
    };
  },
  ask: (system, question) => collect(gemini, system, question),
};

/* ———————————————————————————— DeepSeek ———————————————————————————— */

const deepseek: Provider = {
  id: "deepseek",
  label: "DeepSeek",
  model: MODELS.deepseek,
  // أسعارُ الذروة من صفحتهم الرسميّة (٢٠٢٦-٠٨-١٨).
  //
  // وكنّا نحسب بالذروة دائمًا تحوّطًا، فتبيّن ٢٠٢٦-٠٨-٢١ أنّ التحوّطَ يضرّ من
  // حيثُ أراد أن ينفع: حسابُنا قال ٣ سنتات ولوحةُ المزوّد قالت سنتًا، فسقفُ
  // اليوم كان يقفل بابَ ديبو عند ثلث ما أذن به المالك. فالوفرةُ صارت تُحسب.
  rates: { in: 0.44, cachedIn: 0.014, out: 1.32 },
  offPeakAt: (at) => !isDeepseekPeak(at),
  envKey: "DEEPSEEK_API_KEY",
  async *stream(system, messages) {
    const started = Date.now();
    const key = process.env.DEEPSEEK_API_KEY?.trim();
    if (!key) throw new Error("api key missing");

    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODELS.deepseek,
        max_tokens: MAX_TOKENS,
        stream: true,
        // بلا هذا لا تأتي أعدادُ الرموز في البثّ أصلًا، فلا سقفَ إنفاقٍ يُحسب
        stream_options: { include_usage: true },
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!resp.ok || !resp.body) {
      const detail = await resp.text().catch(() => "");
      throw new Error(detail.slice(0, 200) || `HTTP ${resp.status}`);
    }

    let usage: Usage = ZERO;
    for await (const payload of sseLines(resp.body)) {
      if (payload === "[DONE]") break;
      let chunk: {
        choices?: { delta?: { content?: string } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_cache_hit_tokens?: number;
        };
      };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue; // سطرُ إبقاءٍ حيٍّ أو تعليق، لا حمولة
      }
      const piece = chunk.choices?.[0]?.delta?.content;
      if (piece) yield { type: "text", text: piece };
      if (chunk.usage) {
        const hit = chunk.usage.prompt_cache_hit_tokens ?? 0;
        usage = {
          // إصاباتُ الذاكرة تُحسب عندهم **ضمن** رموز المدخل، فطرحُها واجبٌ
          // وإلّا حوسبت مرّتين: مرّةً بالسعر الكامل ومرّةً بالمخفَّض
          inputTokens: Math.max(0, (chunk.usage.prompt_tokens ?? 0) - hit),
          outputTokens: chunk.usage.completion_tokens ?? 0,
          cachedTokens: hit,
        };
      }
    }

    yield {
      type: "done",
      usage,
      ms: Date.now() - started,
      costUsd: costOf(usage, ratesAt(deepseek, new Date(started))),
    };
  },
  ask: (system, question) => collect(deepseek, system, question),
};

/* ————————————————————————————— الجميع ————————————————————————————— */

/** الترتيب هو ترتيب العرض في مختبر المقارنة. */
export const PROVIDERS: readonly Provider[] = [
  // قراءةُ المخزَّن عند Claude بعُشر ثمن الدخل
  makeClaude("sonnet", "Claude Sonnet 5", MODELS.sonnet, { in: 3, cachedIn: 0.3, out: 15 }),
  makeClaude("haiku", "Claude Haiku 4.5", MODELS.haiku, { in: 1, cachedIn: 0.1, out: 5 }),
  gemini,
  deepseek,
] as const;

/**
 * المزوّدُ الذي يخدم المحادثة الحيّة.
 *
 * **هذا هو «السطر» الذي وُعد به**: تبديلُ ديبو كلِّه من نموذجٍ إلى آخر تبديلُ
 * قيمةِ `DEEBO_PROVIDER` في البيئة، بلا لمس كود ولا إعادة بناء.
 */
export function liveProvider(): Provider {
  const want = process.env.DEEBO_PROVIDER?.trim() || "deepseek";
  return PROVIDERS.find((p) => p.id === want) ?? deepseek;
}
