import { createCipheriv, createECDH, createPrivateKey, generateKeyPairSync, hkdfSync, randomBytes, sign } from "node:crypto";

/**
 * **دفعُ الإشعار إلى المتصفّح، بلا مكتبة** — تشفيرُ الحمولة (RFC 8291) وتوقيعُ VAPID (RFC 8292)
 * بـ`node:crypto` وحدَه. (٢٠٢٦-١٠-٠٣)
 *
 * **لِمَ لا حزمةُ `web-push`:** كلُّ ما تفعله هو هذا الملفّ وحده (اشتقاقُ مفتاحٍ وتشفيرُ سجلٍّ
 * واحدٍ وتوقيعُ رمز)، وتجرّ معها أربعَ حزمٍ لا نحتاجها. وسابقتُها عندنا بطاقةُ المحفظة: توقيعُها
 * وضغطُها مكتوبان بأيدينا (`wallet-preview/cms.ts` و`zip.ts`). والحَكَمُ مِعيارٌ لا ثقة:
 * `__tests__/webpush.test.ts` يطابق مثالَ الملحق (أ) من RFC 8291 **بايتًا ببايت**، ويفكّ ما شفّره.
 *
 * والملفُّ **نقيٌّ** عمدًا (لا قاعدةَ ولا بيئة ولا `server-only`) كي يُختبَر بلا خادم. ومن يرسل
 * فعلًا هو `lib/push/send.ts`.
 */

const b64u = (buf: Uint8Array) => Buffer.from(buf).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

/** مفتاحا اشتراك الجهاز كما يسلّمهما المتصفّح (`PushSubscription.toJSON().keys`). */
export type PushKeys = { p256dh: string; auth: string };

/** مفاتيحُ خادمنا: العامُّ يعرفه المتصفّح عند الاشتراك، والخاصُّ يوقّع كلَّ إرسال. */
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

/**
 * **حجمُ السجلّ ٤٠٩٦** — والحمولةُ كلُّها سجلٌّ واحد. وخدماتُ الدفع (أبل وقوقل وموزيلا) تردّ
 * جسمًا فوق ٤٠٩٦ بايتًا، ورأسُ التشفير وحده ٨٦، فسقفُ النصّ الصريح دون ذلك بهامش.
 */
const RS = 4096;
export const MAX_PLAINTEXT = 3800;

/** بذورٌ تُحقَن في المِعيار وحدَه — كي يُطابَق مثالُ الـRFC. وفي الإرسال تُترك فتُولَّد عشوائيّة. */
export type EncryptSeed = { salt?: Uint8Array; asPrivate?: Uint8Array };

/**
 * يشفّر الحمولة لجهازٍ واحد (`Content-Encoding: aes128gcm`) ويرجع الجسمَ كاملًا: الرأسُ
 * (ملحٌ ١٦ · حجمُ السجلّ ٤ · طولُ المفتاح ١ · مفتاحُنا المؤقّت ٦٥) ثمّ النصُّ المشفَّر بوسمه.
 */
export function encryptPayload(plaintext: Uint8Array, keys: PushKeys, seed: EncryptSeed = {}): Buffer {
  const uaPublic = fromB64u(keys.p256dh);
  const authSecret = fromB64u(keys.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error("p256dh: مفتاحٌ عامٌّ غير صالح");
  if (authSecret.length !== 16) throw new Error("auth: سرٌّ غير صالح");
  if (plaintext.length > MAX_PLAINTEXT) throw new Error("الحمولةُ أطولُ ممّا تقبله خدماتُ الدفع");

  const ecdh = createECDH("prime256v1");
  if (seed.asPrivate) ecdh.setPrivateKey(Buffer.from(seed.asPrivate));
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const ecdhSecret = ecdh.computeSecret(uaPublic);

  // RFC 8291 §3.4: سرُّ الاتّفاق يُمزَج بسرّ الجهاز ومفتاحَي الطرفين — فلا يفكّه إلّا هذا الجهاز.
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32));

  // RFC 8188: ملحٌ جديدٌ لكلّ رسالة، ومنه مفتاحُ المحتوى والـnonce.
  const salt = seed.salt ? Buffer.from(seed.salt) : randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  // سجلٌّ واحدٌ أخير: النصُّ ثمّ فاصلُ «السجلّ الأخير» (0x02)، بلا حشو.
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RS, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, body]);
}

/**
 * ترويسةُ `Authorization` لخدمة الدفع (RFC 8292): رمزٌ موقَّعٌ بـES256 جمهورُه **أصلُ** عنوان
 * الجهاز، يعيش اثنتي عشرة ساعة (الحدُّ ٢٤)، ومعه مفتاحُنا العامّ.
 *
 * و`sub` بريدٌ أو رابطُ https — وأبل **تردّ** ما سواه بـ`BadJwtToken` (رابطٌ محلّيٌّ مثلًا).
 */
export function vapidAuthorization(endpoint: string, v: VapidKeys, nowSec = Math.floor(Date.now() / 1000)): string {
  const aud = new URL(endpoint).origin;
  const head = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: v.subject })));
  const input = `${head}.${claims}`;
  const pub = fromB64u(v.publicKey);
  const key = createPrivateKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", d: v.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
  });
  const sig = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${input}.${b64u(sig)}, k=${v.publicKey}`;
}

/** زوجُ مفاتيح VAPID جديد — يُولَّد **مرّةً للموقع**؛ تبديلُه يُسقط كلَّ اشتراكٍ قائم. */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = privateKey.export({ format: "jwk" });
  const pub = Buffer.concat([Buffer.from([4]), fromB64u(jwk.x!), fromB64u(jwk.y!)]);
  return { publicKey: b64u(pub), privateKey: jwk.d! };
}

/**
 * **أين يجوز أن نرسل.** عنوانُ الجهاز يأتي من المتصفّح، والخادمُ يُرسل إليه بنفسه — فلو قُبل
 * أيُّ عنوانٍ لَصار الاشتراكُ بابًا يوجّه خادمَنا إلى حيث شاء صاحبُه. فالمقبولُ https إلى
 * خدمات الدفع المعروفة وحدها: أبل وقوقل (كروم وإيدج على أندرويد وسامسونج وأوبرا) وموزيلا ومايكروسوفت.
 */
const PUSH_HOSTS = ["push.apple.com", "fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com"];

export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    return PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export type PushResult = { status: number; gone: boolean };

/**
 * يرسل حمولةً واحدةً إلى جهازٍ واحد. `gone` حين تقول الخدمةُ إنّ الاشتراك مات (٤٠٤/٤١٠)،
 * فيُحذف صفُّه. وما سوى ذلك من فشلٍ يُترك: قد يكون عارضًا.
 */
export async function sendWebPush(
  sub: { endpoint: string } & PushKeys,
  payload: unknown,
  v: VapidKeys,
  opts: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high"; topic?: string } = {},
): Promise<PushResult> {
  if (!isPushEndpoint(sub.endpoint)) return { status: 0, gone: true };
  const body = encryptPayload(Buffer.from(JSON.stringify(payload)), sub);
  const headers: Record<string, string> = {
    TTL: String(opts.ttl ?? 86_400),
    Urgency: opts.urgency ?? "normal",
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    Authorization: vapidAuthorization(sub.endpoint, v),
  };
  if (opts.topic) headers.Topic = opts.topic;
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers,
    body: new Uint8Array(body),
    // لا تحويل: لو تبع الطلبُ تحويلًا لَخرج من قائمة الخدمات المسموحة إلى حيث يشاء المُحوِّل.
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  // الجسمُ لا يعنينا، ويُحرَّر كي لا يبقى الاتّصالُ معلَّقًا في الإرسال الجماعيّ.
  await res.body?.cancel().catch(() => {});
  return { status: res.status, gone: res.status === 404 || res.status === 410 };
}
