/**
 * **عميلُ YCloud** — الطريقُ إلى واتساب منذ ٢٠٢٦-٠٨-٢١.
 *
 * **لماذا وسيطٌ بعد أن كان النداءُ إلى ميتا مباشرةً؟** لأنّ رقمَ الأعمال رُبط عبر
 * **YCloud Coexistence**: يبقى الرقمُ عاملًا في تطبيق WhatsApp Business بيدِ الإدارة،
 * ويُرسِل النظامُ عليه آليًّا في الوقت نفسِه. وهذا ما لا يعطيه Graph API المباشر.
 *
 * ولا SDK ولا حزمة: نداءُ `fetch` واحدٌ إلى الواجهة الرسميّة v2. والمفتاحُ لا يخرج من
 * ههنا: لا يُكتب في سجلٍّ ولا يُردّ في جواب.
 *
 * المرجع: `POST https://api.ycloud.com/v2/whatsapp/messages` بترويسة `X-API-Key`.
 */

const YCLOUD_BASE = "https://api.ycloud.com/v2";

export const YC_API_KEY = Deno.env.get("YCLOUD_API_KEY")?.trim() ?? "";

/** رقمُ الإرسال بصيغة E.164 تامّةً (`+9665…`) — هو رقمُ التعايش نفسُه. */
export const YC_NUMBER = Deno.env.get("YCLOUD_WHATSAPP_NUMBER")?.trim() ?? "";

/**
 * **مفتاحُ الإطفاء** — قناةُ واتساب تُعطَّل كلُّها بلا حذف سطرٍ من الكود. وغيابُ المتغيّر
 * يعني «مطفأة»: قناةٌ تُرسِل من تلقاء نفسها لمجرّد أنّ أحدًا نسي ضبطها خطرٌ لا يُحتمل.
 */
export const WA_ENABLED = (Deno.env.get("WHATSAPP_NOTIFICATIONS_ENABLED") ?? "").trim().toLowerCase() === "true";

/**
 * **قالبان لا واحد** (٢٠٢٦-٠٨-٢١): الإنذارُ الذي بقي بعده شيءٌ يقول «وقد بقي لك…»،
 * والإنذارُ الأخيرُ يقول إنّ العضويّة سُحبت. والمتنُ ثابتٌ في القالب لا يُبدَّل بمعامل،
 * فلا يسع الحالَين متنٌ واحد.
 *
 * وكلاهما مضبوطٌ من الخارج اسمًا، فاسمُ اليوم ليس عهدًا على الغد. **ولا اسمَ افتراضيًّا
 * يُخمَّن**: غيابُ السرّ يُقال عطلًا مقروءًا ولا يُرسَل باسمٍ مخترَع تردّه YCloud برمزٍ
 * غامض. وغيابُ الأخير بعينه له حكمٌ آخر (انظر حارسَ الإنذار الأخير في دالّة الإرسال).
 */
export const YC_TEMPLATE = Deno.env.get("YCLOUD_WARNING_TEMPLATE")?.trim() ?? "";
export const YC_FINAL_TEMPLATE = Deno.env.get("YCLOUD_FINAL_WARNING_TEMPLATE")?.trim() ?? "";

/** لغةُ القالبين معًا: كلاهما عربيّ، ولا يُفرَّق بينهما بسرٍّ ثانٍ لا يختلف. */
export const YC_TEMPLATE_LANGUAGE = Deno.env.get("YCLOUD_WARNING_TEMPLATE_LANGUAGE")?.trim() || "ar";

/**
 * معاملُ زرِّ الرابط إن كان القالبُ يحمل زرًّا **ديناميكيًّا**. وتركُه فارغًا يعني زرًّا
 * ثابتًا لا معاملَ له، وهو الأبسطُ والأسرعُ إجازةً من ميتا.
 */
export const YC_BUTTON_PARAM = Deno.env.get("YCLOUD_WARNING_BUTTON_PARAM")?.trim() ?? "";

export type YcSendResult =
  | {
    ok: true;
    /** معرّفُ YCloud للرسالة — به يُربَط الـwebhook بصفّه. */
    messageId: string;
    /** معرّفُ واتساب (`wamid.…`) إن أعطته YCloud لحظتَها، وقد يتأخّر إلى الـwebhook. */
    wamid: string | null;
    /** حالُ YCloud لحظةَ القبول: `accepted` غالبًا. */
    status: string | null;
  }
  | {
    ok: false;
    transient: boolean;
    /** رمزُ YCloud أو `HTTP_<status>` أو رمزٌ من عندنا. */
    code: string;
    message: string;
    httpStatus: number | null;
  };

/** جسدُ خطأ YCloud: `{ error: { status, code, message, target, docUrl } }`. */
type YcError = {
  error?: { status?: number; code?: string; message?: string; target?: string };
};

/** جسدُ النجاح: كائنُ `WhatsappMessage`. */
type YcMessage = {
  id?: string;
  wamid?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * **العارضُ من الدائم** — الفرقُ الذي تقوم عليه إعادةُ المحاولة كلُّها.
 *
 * عارضٌ: خنقُ المعدّل، وتعطّلٌ عند YCloud أو عند ميتا خلفَها، وانقطاعُ شبكة. يزول
 * بانتظارٍ وإعادة. دائمٌ: مفتاحٌ مرفوض، ورقمٌ ليس على واتساب، وقالبٌ غيرُ موجودٍ أو موقوف.
 * الإعادةُ فيه عبث، ويدُ إنسانٍ هي التي تُصلحه.
 *
 * ورموزُ YCloud نصوصٌ من عندها (`RATE_LIMITED`، `INTERNAL_SERVER_ERROR`، …)، فالحكمُ
 * برمزها إن عُرف، وبحالة HTTP إن لم يُعرَف.
 */
const TRANSIENT_CODES = new Set([
  "RATE_LIMITED",
  "TOO_MANY_REQUESTS",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "TEMPORARILY_UNAVAILABLE",
  "TIMEOUT",
]);

const classify = (httpStatus: number, code: string | undefined): boolean => {
  if (code && TRANSIENT_CODES.has(code)) return true;
  return httpStatus === 429 || httpStatus >= 500;
};

export type TemplateArgs = {
  /** الوجهةُ بصيغة E.164 تامّةً (`+9665…`). */
  to: string;
  /**
   * اسمُ القالب — **يختاره المُنادي لا هذا الملفّ**: أيُّ الحالَين هي شأنُ الإنذار
   * (`_shared` لا تعرف الإنذارات)، وههنا يُحمَل الاسمُ كما جاء.
   */
  templateName: string;
  /** رابطُ صورة الترويسة — تنزّله YCloud/ميتا، فليكن نافذًا مدّةً تسع الطابور. */
  imageUrl: string;
  /** معاملات المتن بالترتيب: {{1}} ثمّ {{2}}. */
  bodyParams: string[];
  /**
   * مرجعُنا لدى YCloud (`externalId`) — به تُطابَق الرسالةُ بسجلّنا في لوحتها. ونضع فيه
   * معرّفَ صفّ التسليم ورقمَ المحاولة، فلا يتكرّر بين محاولتين ويبقى مقروءَ النسب.
   */
  externalId: string;
};

/** يُرسِل قالبَ الخدمة (Utility) بترويسةِ صورة. لا يرمي: يردّ نتيجةً مصنَّفة. */
export async function sendWarningTemplate(args: TemplateArgs): Promise<YcSendResult> {
  if (!YC_API_KEY || !YC_NUMBER) {
    return {
      ok: false,
      transient: false,
      code: "NOT_CONFIGURED",
      message: "إعدادُ YCloud ناقص في أسرار دوالّ الحافة (المفتاح أو رقم الإرسال).",
      httpStatus: null,
    };
  }
  if (!args.templateName) {
    return {
      ok: false,
      transient: false,
      code: "NO_TEMPLATE",
      message: "لم يُضبَط اسمُ القالب في أسرار دوالّ الحافة.",
      httpStatus: null,
    };
  }

  /* ترتيبُ المكوّنات لا يعني شيئًا لدى الواجهة، والوسمُ هو الذي يُطابِق. والترويسةُ أوّلًا
     لأنّها أوّلُ ما يُقرأ في القالب، فيُقرأ الجسدُ ههنا كما يُقرأ هناك. */
  const components: unknown[] = [
    { type: "header", parameters: [{ type: "image", image: { link: args.imageUrl } }] },
    { type: "body", parameters: args.bodyParams.map((text) => ({ type: "text", text })) },
  ];
  if (YC_BUTTON_PARAM) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: YC_BUTTON_PARAM }],
    });
  }

  let res: Response;
  try {
    res = await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
      method: "POST",
      headers: { "X-API-Key": YC_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: YC_NUMBER,
        to: args.to,
        type: "template",
        externalId: args.externalId,
        template: {
          name: args.templateName,
          // `deterministic` هي السياسةُ الوحيدةُ المدعومة: تُسلَّم باللغة المطلوبة بعينها
          language: { code: YC_TEMPLATE_LANGUAGE, policy: "deterministic" },
          components,
        },
      }),
    });
  } catch (e) {
    // الشبكةُ سقطت قبل أن تبلغ YCloud: عارضٌ بيقين، لم يخرج شيءٌ إلى أحد
    return {
      ok: false,
      transient: true,
      code: "NETWORK",
      message: e instanceof Error ? e.message : "تعذّر الوصول إلى YCloud.",
      httpStatus: null,
    };
  }

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    /* جسدٌ غير JSON — يُقال كما هو أدناه */
  }

  if (!res.ok) {
    const err = (payload as YcError)?.error;
    const code = err?.code;
    return {
      ok: false,
      transient: classify(res.status, code),
      code: code || `HTTP_${res.status}`,
      message: [err?.message, err?.target].filter(Boolean).join(": ") || text.slice(0, 400),
      httpStatus: res.status,
    };
  }

  const msg = payload as YcMessage;

  /* **قبولٌ يحمل فشلًا**: قد تردّ الواجهةُ 200 وحالتُها `failed` (رفضٌ عرفته قبل الطابور).
     فلا يُقرأ رمزُ HTTP وحده حكمًا، بل حالُ الرسالة نفسِها. */
  if (msg?.status === "failed") {
    return {
      ok: false,
      transient: false,
      code: msg.errorCode || "FAILED",
      message: msg.errorMessage || "ردّت YCloud الرسالةَ فاشلةً.",
      httpStatus: res.status,
    };
  }

  if (!msg?.id) {
    return {
      ok: false,
      transient: true,
      code: "NO_MESSAGE_ID",
      message: "قبلت YCloud النداء ولم تُعطِ معرّفًا.",
      httpStatus: res.status,
    };
  }

  return { ok: true, messageId: msg.id, wamid: msg.wamid ?? null, status: msg.status ?? null };
}
