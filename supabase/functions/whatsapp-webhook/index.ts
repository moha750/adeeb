/**
 * **مِسمَعُ YCloud** — يستقبل تحديثاتِ حال الرسائل الصادرة ويكتبها على صفوف التسليم.
 *
 * **ولا يُحرَس بـJWT**: YCloud لا تحمل جلستَنا ولا مفتاحَنا، فيُنشَر بـ`--no-verify-jwt`.
 * وحارسُه توقيعُ YCloud نفسِه: ترويسةُ `YCloud-Signature: t={طابع},s={بصمة}`، والبصمةُ
 * `HMAC-SHA256("{طابع}.{الجسدُ الخام}", سرُّ المِسمَع)` بصيغة hex. فمن لم يُوقّع رُدّ، ومن
 * لم يطابق توقيعُه رُدّ. والمقارنةُ بزمنٍ ثابتٍ لا بـ`===` كيلا يُستدَلّ على السرّ من زمن
 * الردّ. (هذا خلَفُ حارسِ ميتا `X-Hub-Signature-256`، وقد أُزيل بتمامه.)
 *
 * **ولا تحقّقَ باشتراكٍ على GET**: YCloud تسجّل العنوان في لوحتها بلا `hub.challenge`،
 * فلا وجهَ ثانيًا لهذا الباب. وGET يُردّ بـ405 كأيّ طريقةٍ لا نخدمها.
 *
 * **ويقرأ الجسدَ دفاعيًّا**: الوثيقةُ تزيد حقولًا وتغيّر أشكالًا، فما لم يُفهَم يُتجاوَز
 * بلا ضجيجٍ ويُردّ 200 — وردُّ غيرِ الـ2xx يجعلها تُعيد المحاولة على شيءٍ لا يعنينا.
 *
 * **والربطُ بمعرّف الرسالة وحده**: `id` الذي أعطتنا YCloud لحظةَ القبول، وعند تعذّره
 * `wamid`. لا اسمَ ولا رقمَ يُطابَق، فلا تُلمَس بياناتُ عضوٍ لأجل تحديثِ حال.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("YCLOUD_WEBHOOK_SECRET") ?? "";

/**
 * سعةُ الطابع الزمنيّ بالثواني — حارسُ إعادةٍ (replay)، لا حارسٌ رئيس.
 *
 * وواسعةٌ عمدًا (ساعة): YCloud تُعيد المحاولة على ما لم يُردّ بـ2xx، ونافذةٌ ضيّقةٌ تردّ
 * إعادةً مشروعةً فنخسر خبرَ تسليمٍ بلا سبب. و`0` تُطفئ الفحص.
 */
const TOLERANCE_SECONDS = Number(Deno.env.get("YCLOUD_WEBHOOK_TOLERANCE_SECONDS") ?? "3600");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

/** الحدثُ الذي يعنينا وحدَه. وما سواه (وارداتٌ وأصداءُ التعايش) يُتجاوَز. */
const EVENT_MESSAGE_UPDATED = "whatsapp.message.updated";

/**
 * حالاتُ YCloud كما تصل. و`accepted` لا تأتي في المِسمَع (تُردّ في جواب النداء)، وتُقبل
 * ههنا احتياطًا فتُقرأ `sent` كما قُرئت هناك.
 */
const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  accepted: "sent",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

const STATUS_COLUMN = {
  sent: "sent_at",
  delivered: "delivered_at",
  read: "read_at",
  failed: "failed_at",
} as const;

/**
 * **الحالةُ تتقدّم ولا ترجع.** والوثيقةُ تقول صراحةً إنّ ترتيبَ الأحداث غيرُ مضمون: قد
 * يصل «فشل» بعد «سُلّم»، وقد تصل «سُلّم» بعد «قُرئ».
 *
 * **وموضعُ `failed` بين `sent` و`delivered` هو الحكمُ كلُّه** (قرار المالك ٢٠٢٦-٠٨-٢١):
 * فشلٌ يعلو `sent` فيُكتب، ولا يعلو `delivered` ولا `read` فلا يُكتب. **ما وصل قد وصل**،
 * وخبرُ فشلٍ جاء بعده خبرٌ تأخّر عن الحقيقة لا حقيقةٌ جديدة.
 *
 * **توأمُ** `DELIVERY_RANK` و`advancesTo` في `apps/web/src/lib/warnings/delivery.ts`،
 * ومِعيارُ ذلك الملفّ هو الحارس على القاعدة. فمن غيّر هناك غيّر ههنا.
 */
const RANK: Record<string, number> = {
  pending: 0, processing: 1, sent: 2, failed: 3, delivered: 4, read: 5,
};

/** أتتقدّم الحالُ الواردةُ على المكتوبة؟ وحالٌ لا نعرفها لا تُكتب. */
function advancesTo(current: string, incoming: string): boolean {
  const from = RANK[current];
  const to = RANK[incoming];
  if (from === undefined || to === undefined) return false;
  return to > from;
}

/** مقارنةٌ بزمنٍ ثابت — طولان مختلفان يُردّان فورًا، والمتساويان يُمشَّطان كاملَين. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

/** يفكّ `t={طابع},s={بصمة}` — والترتيبُ لا يُفترَض، والمسافاتُ تُتجاوَز. */
function parseSignatureHeader(header: string | null): { t: string; s: string } | null {
  if (!header) return null;
  let t = "";
  let s = "";
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") t = value;
    else if (key === "s") s = value;
  }
  return t && s ? { t, s } : null;
}

async function verifySignature(raw: string, header: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  if (TOLERANCE_SECONDS > 0) {
    const t = Number(parsed.t);
    if (!Number.isFinite(t)) return false;
    if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parsed.t}.${raw}`));
  return timingSafeEqual(parsed.s.toLowerCase(), toHex(mac));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  if (!await verifySignature(raw, req.headers.get("ycloud-signature"))) {
    console.warn("[whatsapp-webhook] bad signature");
    return new Response("forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("ok", { status: 200 });
  }

  const update = extractStatus(payload);
  if (update) await applyStatus(update);

  // 200 دائمًا بعد التوقيع: YCloud تُعيد على غيره، والعطبُ عندنا يُقرأ في السجلّ
  return new Response("ok", { status: 200 });
});

type StatusUpdate = {
  /** معرّفُ YCloud — مفتاحُ الربط الأوّل. */
  messageId: string | null;
  /** معرّفُ واتساب — مفتاحُ الربط الثاني، ويُكتب على الصفّ إن غاب عنه. */
  wamid: string | null;
  status: "sent" | "delivered" | "read" | "failed";
  at: string;
  errorCode: string | null;
  errorMessage: string | null;
};

/** ينخل الجسدَ فيُخرج ما يفهمه فقط — كلُّ حقلٍ يُسأل عن وجوده قبل أن يُقرأ. */
function extractStatus(payload: unknown): StatusUpdate | null {
  const evt = payload as {
    type?: string;
    whatsappMessage?: {
      id?: string;
      wamid?: string;
      status?: string;
      errorCode?: string;
      errorMessage?: string;
      sendTime?: string;
      deliverTime?: string;
      readTime?: string;
      updateTime?: string;
    };
  };
  if (evt?.type !== EVENT_MESSAGE_UPDATED) return null;

  const m = evt.whatsappMessage;
  if (!m) return null;

  const status = typeof m.status === "string" ? STATUS_MAP[m.status] : undefined;
  if (!status) return null;

  const messageId = typeof m.id === "string" && m.id ? m.id : null;
  const wamid = typeof m.wamid === "string" && m.wamid ? m.wamid : null;
  if (!messageId && !wamid) return null;

  /* الوقتُ من طابع الحالة نفسِها إن وُجد (`sendTime`/`deliverTime`/`readTime`)، وإلّا من
     `updateTime`، وإلّا ساعتُنا. وفسادُ الطابع لا يُسقط التحديث: الحالُ أهمُّ من دقيقتها. */
  const stamp = status === "sent"
    ? m.sendTime
    : status === "delivered"
    ? m.deliverTime
    : status === "read"
    ? m.readTime
    : undefined;
  const candidate = stamp ?? m.updateTime;
  const parsed = candidate ? new Date(candidate) : null;
  const at = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();

  return {
    messageId,
    wamid,
    status,
    at,
    errorCode: m.errorCode ?? null,
    errorMessage: m.errorMessage ?? null,
  };
}

/** يكتب الحالةَ على صفّها إن كانت متقدّمةً على المكتوب. */
async function applyStatus(u: StatusUpdate): Promise<void> {
  /* الربطُ بمعرّف YCloud أوّلًا (هو المكتوب لحظةَ الإرسال)، وبـ`wamid` إن لم يُعرَف —
     فقد يصل حدثٌ لا يحمل إلّا معرّفَ واتساب. */
  const byId = u.messageId
    ? await admin
      .from("notification_deliveries")
      .select("id, status, provider_wamid")
      .eq("provider_message_id", u.messageId)
      .maybeSingle<{ id: string; status: string; provider_wamid: string | null }>()
    : null;

  let row = byId?.data ?? null;
  if (byId?.error) {
    console.error("[whatsapp-webhook] lookup failed", { provider_message_id: u.messageId, error: byId.error.message });
    return;
  }

  if (!row && u.wamid) {
    const byWamid = await admin
      .from("notification_deliveries")
      .select("id, status, provider_wamid")
      .eq("provider_wamid", u.wamid)
      .maybeSingle<{ id: string; status: string; provider_wamid: string | null }>();
    if (byWamid.error) {
      console.error("[whatsapp-webhook] lookup failed", { error: byWamid.error.message });
      return;
    }
    row = byWamid.data ?? null;
  }

  // رسالةٌ لا نعرفها (رقمُنا يخدم غيرَ الإنذارات، والتعايشُ يُخرج رسائلَ الإدارة نفسِها)
  if (!row) return;

  const patch: Record<string, unknown> = {};

  // `wamid` يُكتب أوّلَ مرّةٍ يجيء فيها : يتأخّر عن لحظة القبول غالبًا
  if (u.wamid && !row.provider_wamid) patch.provider_wamid = u.wamid;

  const advances = advancesTo(row.status, u.status);

  if (advances) {
    patch.status = u.status;
    patch[STATUS_COLUMN[u.status]] = u.at;

    if (u.status === "failed") {
      patch.error_code = u.errorCode;
      patch.error_message = u.errorMessage?.slice(0, 500) ?? null;
      // فشلٌ بعد خروج الرسالة (رفضُ الجهاز أو حجبُ المستلم) لا تُصلحه إعادةُ إرسال
      patch.permanent = true;
      patch.next_attempt_at = null;
    } else if (row.status === "failed") {
      /* **وصلت بعد أن قيل إنّها فشلت** — فالفشلُ كان خبرًا تأخّر عن الحقيقة. تُمحى
         علاماتُه كلُّها، إذ لا يستقيم صفٌّ يقول «وصلت» ويحمل سببَ فشلٍ ووسمَ `permanent`. */
      patch.error_code = null;
      patch.error_message = null;
      patch.permanent = false;
      patch.failed_at = null;
    }
  }

  if (Object.keys(patch).length === 0) return;

  const { error: upErr } = await admin.from("notification_deliveries").update(patch).eq("id", row.id);
  if (upErr) {
    console.error("[whatsapp-webhook] update failed", { delivery_id: row.id, error: upErr.message });
    return;
  }
  console.log("[whatsapp-webhook] status", {
    delivery_id: row.id,
    provider_message_id: u.messageId,
    status: advances ? u.status : row.status,
    error_code: u.errorCode,
  });
}
