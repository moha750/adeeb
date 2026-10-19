import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * **خطّافُ Resend: التحقّقُ والقراءة** (٢٠٢٦-١٠-١٩) — ما بعد خروج الرسالة: وصلت، تأخّرت، ارتدّت، شكا صاحبُها.
 *
 * Resend يوقّع كلَّ طرقةٍ بطريقة Svix: `HMAC-SHA256` على «المعرّف.الوقت.الجسم» بسرٍّ يبدأ بـ`whsec_` (وما بعده
 * base64)، ويضع التوقيعَ في `svix-signature` بصيغة `v1,<base64>` (وقد يكون أكثرَ من واحدٍ بمسافة، حين يُبدَّل
 * السرّ). ولا مكتبةَ لهذا: عشرون سطرًا أوضح من اعتماديّةٍ جديدة.
 *
 * والوقتُ يُرفض إن بعُد عن الآن أكثرَ من خمس دقائق: توقيعٌ صحيحٌ قديمٌ قد يكون طرقةً مسروقةً تُعاد.
 */

const TOLERANCE_SECS = 5 * 60;

export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSecs: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSecs - ts) > TOLERANCE_SECS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export type DeliveryEvent = {
  providerId: string;
  type: "delivered" | "delayed" | "bounced" | "complained";
  note: string | null;
  /** الارتدادُ الدائمُ (`Permanent`) يُوقِف العنوان، والعابرُ والمجهولُ (`Transient`، `Undetermined`) لا. */
  permanent: boolean;
};

const TYPES: Record<string, DeliveryEvent["type"]> = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** واقعةُ تسليمٍ من جسم الطرقة، أو `null` لما لا يعنينا (خرجت، فُتحت، نُقر رابطٌ فيها). */
export function readDeliveryEvent(payload: unknown): DeliveryEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { type?: unknown; data?: { email_id?: unknown; bounce?: { type?: unknown; subType?: unknown; message?: unknown } } };
  const type = typeof p.type === "string" ? TYPES[p.type] : undefined;
  const providerId = typeof p.data?.email_id === "string" ? p.data.email_id : null;
  if (!type || !providerId) return null;

  const bounce = p.data?.bounce;
  const note = type === "bounced" && typeof bounce?.message === "string" ? bounce.message : null;
  const permanent = type !== "bounced" || bounce?.type === "Permanent";
  return { providerId, type, note, permanent };
}
