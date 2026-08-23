/**
 * **إبلاغُ العضو بإنذاره عبر واتساب** — قالبُ خدمةٍ (Utility) معتمدٌ من ميتا، بترويسةِ
 * صورةٍ هي خطابُ الإنذار نفسُه، يخرج عبر **YCloud**.
 *
 * لماذا قالبٌ لا رسالةٌ حرّة؟ لأنّ العضو قد لا يكون راسَلَنا خلال أربعٍ وعشرين ساعة، ونافذةُ
 * الخدمة مغلقةٌ حينئذٍ. والقالبُ **مضبوطٌ من الخارج** اسمًا ولغةً، فاسمُ اليوم ليس عهدًا.
 *
 * **ولماذا YCloud لا ميتا مباشرةً؟** لأنّ رقمَ الأعمال رُبط بـ**التعايش (Coexistence)**:
 * يبقى في يد الإدارة داخل تطبيق WhatsApp Business، ويُرسِل عليه النظامُ آليًّا في الوقت
 * نفسِه. وما تحت هذا السطر لا يتغيّر بتغيّر الحامل: الطريقُ والحرّاسُ والقفلُ كما كانت.
 *
 * **ولا يُنادى إلّا بمفتاح الخدمة**: لا مسارَ من المتصفّح إلى ههنا، ومفتاحُ YCloud لا
 * يغادر أسرارَ دوالّ الحافة. وسلطةُ الإنسان فُحصت قبل النداء في إجراء اللوحة
 * (`can_issue_warning` على صاحب الإنذار بعينه).
 *
 * **ولا يُصدَّق العميل في شيء**: لا يمرّ إلّا `warning_id`. الاسمُ والجوّالُ والرتبةُ
 * والتاريخُ كلُّها تُقرأ من القاعدة — فلا يُوجَّه إرسالٌ إلى رقمٍ يختاره النداء.
 *
 * **والإنذارُ لا يسقط بسقوط القناة**: هذه الدالّة لا تكتب في `member_warnings` حرفًا، ولا
 * تُنادى داخل معاملته. أسوأُ ما يقع أن يبقى صفُّ التسليم `failed` والإنذارُ قائمٌ في سجلّه.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { toE164 } from "../_shared/phone.ts";
import { fmtDate, leftPhrase, ordinalWord, salutation } from "../_shared/fmt.ts";
import {
  sendWarningTemplate, WA_ENABLED, YC_FINAL_TEMPLATE, YC_TEMPLATE, YC_TEMPLATE_LANGUAGE,
} from "../_shared/ycloud.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

/** دلوُ الخطابات — خاصٌّ، ولا يُقرأ إلّا برابطٍ موقَّعٍ قصيرِ الأجل. */
const LETTERS_BUCKET = "warning-letters";

/** اسمُ الحامل كما يُكتب في `notification_deliveries.provider`. */
const PROVIDER = "ycloud";

/**
 * عمرُ الرابط الموقَّع بالثواني.
 *
 * **وساعةٌ لا عشرُ دقائق** (تغيّر مع YCloud): نداءُ `/whatsapp/messages` **يُدرِج في طابور**
 * ويردّ فورًا، والتنزيلُ يقع بعدَه بلحظاتٍ أو بدقائق. فرابطٌ قصيرُ الأجل قد ينتهي قبل أن
 * تصل الصورةُ إلى واتساب، فتخرج الرسالةُ بلا ترويسة أو تُردّ.
 */
const MEDIA_TTL = Number(Deno.env.get("WHATSAPP_MEDIA_URL_TTL") ?? "3600") || 3600;

/** سقفُ المحاولات — حارسٌ ضدّ دورانٍ لا ينتهي، لا هدفٌ يُبلَغ. */
const MAX_ATTEMPTS = Number(Deno.env.get("WHATSAPP_MAX_ATTEMPTS") ?? "3") || 3;

/**
 * عمرُ المِطالبة: نداءٌ مات بعد أن طالبَ الصفَّ ولم يُنهِ يترك `processing` معلّقةً أبدًا.
 * فما مضى عليه هذا القدرُ يُعَدّ متروكًا ويُطالَب من جديد. (والقيمةُ نفسُها في الواجهة،
 * `lib/warnings/delivery.ts::STALE_CLAIM_MINUTES`، فيتّفق الزرُّ مع القاعدة.)
 */
const STALE_CLAIM_MINUTES = 10;

/** رديفُ البريد: **مطفأٌ افتراضًا** فلا يتبدّل سلوكُ النظام القائم بلا كلمةٍ صريحة. */
const EMAIL_FALLBACK =
  (Deno.env.get("WHATSAPP_FALLBACK_EMAIL_ENABLED") ?? "").trim().toLowerCase() === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

/**
 * الحارس: بطاقةُ الخدمة وحدها تفتح. والتوقيعُ فُحص قبلنا في البوّابة (`verify_jwt`)،
 * فيكفينا دعوى الدور. (منقولٌ حرفًا عن `send-contact-reply` — حارسٌ واحدٌ لدوالّنا كلّها.)
 */
function isServiceCaller(bearer: string): boolean {
  if (!bearer) return false;
  if (SERVICE_KEY && bearer === SERVICE_KEY) return true;
  const parts = bearer.split(".");
  if (parts.length !== 3) return false;
  try {
    const pad = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(pad + "=".repeat((4 - (pad.length % 4)) % 4))) as { role?: string };
    return claims.role === "service_role";
  } catch {
    return false;
  }
}

/** تراخٍ متصاعد: خمسُ دقائق، ثمّ نصفُ ساعة، ثمّ ساعتان. */
const BACKOFF_MINUTES = [5, 30, 120];
const nextAttemptAt = (attempt: number): string =>
  new Date(Date.now() + (BACKOFF_MINUTES[Math.min(attempt, BACKOFF_MINUTES.length) - 1] ?? 120) * 60_000)
    .toISOString();

/** سببُ ردّ الرقم، مقولًا لصاحب اللوحة لا رمزًا. */
const PHONE_REASON: Record<string, string> = {
  EMPTY: "لا جوّال مسجّل لهذا العضو.",
  NOT_SAUDI_MOBILE: "الجوّال المسجّل ليس جوّالًا سعوديًّا صالحًا.",
  UNRECOGNIZED: "الجوّال المسجّل غير مفهوم الصيغة.",
};

/** جوابُ `claim_notification_delivery` : أظفِرَ بالصفّ أم كان الخبرُ قد وصل؟ */
type Claim = {
  claimed: boolean;
  id: string;
  attempt_count?: number;
  status?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!isServiceCaller(bearer)) return json({ ok: false, code: "FORBIDDEN", error: "forbidden" }, 403);

  let body: { warning_id?: string; probe?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "BAD_JSON", error: "bad json" }, 400);
  }

  // جربةٌ بلا إرسال: أمُهيّأةٌ القناةُ أم لا. ولا تُفشي سرًّا، تقول «موجود» لا «هو كذا».
  if (body.probe) {
    return json({
      ok: true,
      provider: PROVIDER,
      enabled: WA_ENABLED,
      template: YC_TEMPLATE || null,
      final_template: YC_FINAL_TEMPLATE || null,
      template_language: YC_TEMPLATE_LANGUAGE,
      configured: !!Deno.env.get("YCLOUD_API_KEY") && !!Deno.env.get("YCLOUD_WHATSAPP_NUMBER"),
      email_fallback: EMAIL_FALLBACK,
    });
  }

  const warningId = (body.warning_id ?? "").trim();
  if (!warningId) return json({ ok: false, code: "MISSING_ID", error: "warning_id is required" }, 400);

  // مفتاحُ الإطفاء يسبق كلَّ شيء: مطفأةٌ يعني ألّا يُلمَس صفُّ التسليم أصلًا
  if (!WA_ENABLED) {
    return json({ ok: false, code: "DISABLED", error: "قناةُ واتساب مُعطَّلة." }, 503);
  }

  /* ── ١) السياقُ من القاعدة، لا من النداء ───────────────────────────────── */
  const { data: ctxRaw, error: ctxErr } = await admin.rpc("warning_delivery_context", {
    p_warning: warningId,
  });
  if (ctxErr) return json({ ok: false, code: "DB", error: ctxErr.message }, 500);
  if (!ctxRaw) return json({ ok: false, code: "NOT_FOUND", error: "لا وجود لهذا الإنذار." }, 404);

  const ctx = ctxRaw as {
    id: string; user_id: string; status: string; created_at: string;
    ordinal: number; active_count: number; limit: number;
    /** قطعتا النداء من **لقطة** الإنذار (منصبُه ولجنتُه يومَ صدوره) لا من حاله اليوم. */
    role_ar: string | null; committee_name: string | null;
    member: { full_name: string; gender: string | null; phone: string | null; email: string | null };
  };

  // الملغى لا يُبلَّغ: خرج من العدّ، فرسالتُه كذبٌ على صاحبها
  if (ctx.status !== "active") {
    return json({ ok: false, code: "NOT_ACTIVE", error: "الإنذار ملغًى، فلا يُبلَّغ." }, 409);
  }

  /* ── أيُّ القالبَين؟ ────────────────────────────────────────────────────
     **بلوغُ الحدّ يبدّل القالبَ لا المعاملَ**: قالبُ العامّة يقول في متنه «وقد بقي لك
     {{4}} قبل بلوغ الحدّ»، وهي جملةٌ كاذبةٌ على من سُحبت عضويّتُه. والمتنُ ثابتٌ في
     القالب لا يُبدَّل من عندنا، فلا يسع الحالَين متنٌ واحد.

     ولذلك قالبٌ ثانٍ للإنذار الأخير (`YCLOUD_FINAL_WARNING_TEMPLATE`)، معاملاتُه ثلاثةٌ
     لا أربعة: لا «ما بقي» فيه لأنّه لم يبقَ شيء.

     **والحارسُ لم يعد حكمًا على الحال بل على الإعداد**: إن غاب السرُّ فلا قالبَ يصدق
     على هذا الإنذار، فيُردّ الإرسالُ ويبقى الخطابُ وزرُّ «فتح واتساب يدويًّا». وإن
     ضُبط السرُّ زال الحارسُ من تلقاء نفسه. */
  const isFinal = ctx.active_count >= ctx.limit;

  if (isFinal && !YC_FINAL_TEMPLATE) {
    return json({
      ok: false,
      code: "FINAL_WARNING_NO_TEMPLATE",
      error: "هذا الإنذار بلغ الحدّ وسُحبت به العضويّة، ولم يُضبَط قالبُه " +
        "(YCLOUD_FINAL_WARNING_TEMPLATE). نزّل الخطاب وأرسِله يدويًّا.",
    }, 409);
  }

  /* ── ٢) صفُّ التسليم: يُفتَح إن لم يكن، ثمّ **يُطالَب** ──────────────────
     المِطالبة (`claim_notification_delivery`) عبارةُ `update` **واحدةٌ ذرّيّة** في القاعدة:
     نداءان متزامنان لا يظفر بالصفّ منهما إلّا واحد. وهذا هو منعُ الإرسال المكرّر حقًّا،
     لا فحصٌ يسبق كتابةً يتخلّلهما زمنٌ يسع رسالتين. ومن أُرسل إليه فعلًا لا تُطالَب صفَّه
     المِطالبةُ أصلًا، فيُردّ `ALREADY` بلا نداءٍ خارجيّ. */
  const { error: queueErr } = await admin.rpc("queue_warning_notification", {
    p_warning: warningId,
    p_channel: "whatsapp",
  });
  if (queueErr) return json({ ok: false, code: "DB", error: queueErr.message }, 500);

  const { data: claimRaw, error: claimErr } = await admin.rpc("claim_notification_delivery", {
    p_warning: warningId,
    p_channel: "whatsapp",
    p_stale_minutes: STALE_CLAIM_MINUTES,
  });
  if (claimErr) return json({ ok: false, code: "DB", error: claimErr.message }, 500);

  const claim = claimRaw as Claim;
  if (!claim?.claimed) {
    // لم يُظفَر بالصفّ: إمّا أُرسل من قبل، أو نداءٌ آخرُ يعمل عليه الآن
    console.log("[send-warning-whatsapp] skip", { warning_id: warningId, status: claim?.status });
    return json({
      ok: true,
      skipped: true,
      code: "ALREADY",
      status: claim?.status ?? "unknown",
      delivery_id: claim?.id ?? null,
      message: "أُرسل هذا الإنذار من قبل، فلا يُرسَل مرّتين.",
    });
  }

  const deliveryId = claim.id;
  const attempt = (claim.attempt_count ?? 0) + 1;

  /** يُنهي المحاولة فشلًا، ويقول أدائمٌ هو أم عارض. */
  const fail = async (code: string, message: string, permanent: boolean) => {
    const exhausted = permanent || attempt >= MAX_ATTEMPTS;
    await admin
      .from("notification_deliveries")
      .update({
        status: exhausted ? "failed" : "pending",
        attempt_count: attempt,
        error_code: code,
        error_message: message.slice(0, 500),
        permanent: exhausted,
        failed_at: exhausted ? new Date().toISOString() : null,
        next_attempt_at: exhausted ? null : nextAttemptAt(attempt),
      })
      .eq("id", deliveryId);

    console.error("[send-warning-whatsapp] failed", {
      warning_id: warningId,
      delivery_id: deliveryId,
      provider: PROVIDER,
      attempt,
      error_code: code,
      permanent: exhausted,
    });

    if (exhausted && EMAIL_FALLBACK) await emailFallback(ctx, code);

    return json({
      ok: false,
      code,
      delivery_id: deliveryId,
      permanent: exhausted,
      retryable: !exhausted,
      error: message,
    }, exhausted ? 502 : 503);
  };

  /* ── ٣) الرقمُ إلى E.164، ولا يُقبل باطلٌ صامتًا ───────────────────────── */
  const phone = toE164(ctx.member.phone);
  if (!phone.ok) {
    return await fail(`PHONE_${phone.code}`, PHONE_REASON[phone.code] ?? "الجوّال غير صالح.", true);
  }

  /* ── ٤) خطابُ الإنذار: رابطٌ موقَّعٌ تنزّله YCloud ───────────────────────
     الخطابُ يُرسَم في متصفّح المُصدِر (`lib/paper.ts` يمسّ DOM)، فيرفعه إجراءُ اللوحة إلى
     الدلو قبل نداء هذه الدالّة. وغيابُه ليس فشلًا دائمًا: يُرفَع ثمّ يُعاد الإرسال.

     والرابطُ الموقَّع كافٍ فلا نرفع الصورةَ إلى YCloud أوّلًا (`/media/{number}/upload`):
     رفعٌ ثانٍ يزيد نداءً ويزيد حالةً تُدار، ولا يشتري شيئًا ما دام الدلوُ نافذًا. */
  const objectPath = `${warningId}.png`;
  const { data: signed, error: signErr } = await admin.storage
    .from(LETTERS_BUCKET)
    .createSignedUrl(objectPath, MEDIA_TTL);

  if (signErr || !signed?.signedUrl) {
    return await fail("NO_LETTER", "لم يُرفَع خطابُ هذا الإنذار بعد، فلا صورةَ تُرسَل.", false);
  }

  /* ── ٥) النداء ─────────────────────────────────────────────────────────── */
  /* **معاملاتُ القالبَين بترتيبها حرفًا بحرف** — ولا واحدَ منها يأتي من العميل: كلُّها
     مشتقّةٌ ههنا من صفّ القاعدة.

       {{1}} النداء: الصفةُ واسمُ العضو  «عضو لجنة التأليف أحمد محمد»   ← في القالبَين
       {{2}} رتبةُ الإنذار                «الأوّل»                        ← في القالبَين
       {{3}} تاريخُه بتوقيت الرياض        «18 أغسطس 2026»                ← في القالبَين
       {{4}} ما بقي قبل الحدّ             «إنذاران»                      ← في العامّ وحده

     فالثلاثةُ الأُوَل مشتركةٌ بينهما، ولا يفترقان إلّا في الرابع — إذ لا «ما بقي» لمن
     بلغ الحدّ. وأربعتُها من `_shared/fmt.ts`، توأمِ ما رُسم به الخطاب، فلا ينحرف
     المكتوبُ عن المُرسَل. **ومن غيّر قالبًا غيّر هذا السطرَ وحده.** */
  const shared = [
    salutation({
      name: ctx.member.full_name,
      gender: ctx.member.gender === "female" ? "female" : ctx.member.gender === "male" ? "male" : null,
      role: ctx.role_ar,
      committee: ctx.committee_name,
    }),
    ordinalWord(ctx.ordinal),
    fmtDate(ctx.created_at),
  ];

  const sent = await sendWarningTemplate({
    to: phone.e164,
    templateName: isFinal ? YC_FINAL_TEMPLATE : YC_TEMPLATE,
    imageUrl: signed.signedUrl,
    bodyParams: isFinal ? shared : [...shared, leftPhrase(ctx.active_count, ctx.limit)],
    // مرجعُنا في لوحة YCloud: الصفُّ ومحاولتُه، فلا يتكرّر ولا يُجهَل نسبُه
    externalId: `${deliveryId}.${attempt}`,
  });

  if (!sent.ok) {
    // حالُ HTTP تُحفَظ في صدر الرسالة : عمودٌ لها وحدها ترفٌ لخبرٍ نادر
    const detail = sent.httpStatus ? `HTTP ${sent.httpStatus}: ${sent.message}` : sent.message;
    return await fail(sent.code, detail, !sent.transient);
  }

  /* **`accepted` تُكتب `sent`**: YCloud تُدرِج في طابورها وتردّ `accepted`، أي أنّ الرسالة
     **خرجت من عندنا وقُبلت**. وهذا معنى `sent` في جدولنا بعينه، ولا نخترع لها حالًا سابعةً
     تُفسد قيدَ العمود. وما يقع بعدها (`sent` عند واتساب ثمّ `delivered` ثمّ `read`) يأتي
     من الـwebhook، والرتبةُ تمنع الانحدار. */
  const now = new Date().toISOString();
  const { error: saveErr } = await admin
    .from("notification_deliveries")
    .update({
      status: "sent",
      provider: PROVIDER,
      provider_message_id: sent.messageId,
      // `wamid` قد يتأخّر إلى الـwebhook، فيُكتب حين يجيء ولا يُنتظَر ههنا
      provider_wamid: sent.wamid,
      attempt_count: attempt,
      sent_at: now,
      error_code: null,
      error_message: null,
      permanent: false,
      next_attempt_at: null,
    })
    .eq("id", deliveryId);

  // خرجت الرسالة فعلًا: لا نكذب بجعلها فشلًا لأنّ الكتابة سقطت، بل نقول ذلك صراحةً
  if (saveErr) {
    console.error("[send-warning-whatsapp] sent but not recorded", {
      warning_id: warningId,
      delivery_id: deliveryId,
      provider: PROVIDER,
      provider_message_id: sent.messageId,
    });
    return json({
      ok: true,
      recorded: false,
      delivery_id: deliveryId,
      provider_message_id: sent.messageId,
      message: "خرجت الرسالة، وتعذّر تسجيلُها في السجلّ.",
    });
  }

  console.log("[send-warning-whatsapp] sent", {
    warning_id: warningId,
    delivery_id: deliveryId,
    provider: PROVIDER,
    final: isFinal,
    provider_message_id: sent.messageId,
    provider_status: sent.status,
    attempt,
  });

  return json({
    ok: true,
    delivery_id: deliveryId,
    provider: PROVIDER,
    provider_message_id: sent.messageId,
    status: "sent",
  });
});

/**
 * **رديفُ البريد** — مطفأٌ افتراضًا (`WHATSAPP_FALLBACK_EMAIL_ENABLED`). حين يُفعَّل، يُرسَل
 * بريدٌ وجيزٌ عند فشلٍ نهائيٍّ في واتساب، ويُسجَّل صفَّ تسليمٍ مستقلًّا بقناة `email` — فلا
 * تختلط قناةٌ بقناة، ويُقرأ في السجلّ أنّ الأولى سقطت والثانية حملت الخبر.
 *
 * ولا يحمل تفاصيلَ الإنذار: البريدُ صندوقٌ يُقرأ في أماكن، والخطابُ في اللوحة.
 */
async function emailFallback(
  ctx: { id: string; user_id: string; ordinal: number; member: { full_name: string; email: string | null } },
  whyWhatsappFailed: string,
): Promise<void> {
  const to = (ctx.member.email ?? "").trim();
  if (!RESEND_API_KEY || !to) return;

  const { data: queued } = await admin.rpc("queue_warning_notification", {
    p_warning: ctx.id,
    p_channel: "email",
  });
  const deliveryId = (queued as { id?: string } | null)?.id ?? null;

  const html = `<div dir="rtl" style="font-family:system-ui,sans-serif;line-height:1.9">
    <p>السلام عليكم ورحمة الله وبركاته</p>
    <p>نودّ إشعارك بصدور الإنذار ${ordinalWord(ctx.ordinal)} بحقّك.</p>
    <p>تجد تفاصيله وخطابَه في حسابك على بوّابة نادي أدِيب.</p>
    <p>إدارة الموارد البشرية، نادي أديب</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "نادي أدِيب <noreply@adeeb.club>",
        to: [to],
        subject: `إشعارٌ من نادي أدِيب: الإنذار ${ordinalWord(ctx.ordinal)}`,
        html,
      }),
    });
    if (!deliveryId) return;
    if (res.ok) {
      await admin.from("notification_deliveries").update({
        status: "sent", provider: "resend", sent_at: new Date().toISOString(),
      }).eq("id", deliveryId);
    } else {
      await admin.from("notification_deliveries").update({
        status: "failed", provider: "resend", permanent: true,
        failed_at: new Date().toISOString(),
        error_code: `HTTP_${res.status}`,
        error_message: (await res.text()).slice(0, 500),
      }).eq("id", deliveryId);
    }
  } catch (e) {
    console.error("[send-warning-whatsapp] email fallback failed", {
      warning_id: ctx.id,
      after: whyWhatsappFailed,
      reason: e instanceof Error ? e.message : "unknown",
    });
  }
}
