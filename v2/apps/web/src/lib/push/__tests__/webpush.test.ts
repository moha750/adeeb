import { createDecipheriv, createECDH, createPublicKey, hkdfSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptPayload, generateVapidKeys, isPushEndpoint, vapidAuthorization } from "@/lib/push/webpush";

/**
 * **تشفيرُ الإشعار يُحاكَم إلى مثال الـRFC لا إلى ثقتنا.**
 *
 * الملحق (أ) من RFC 8291 يعطي كلَّ شيء: مفاتيحَ الطرفين والملحَ والسرَّ والنصَّ، والجسمَ
 * الناتجَ بايتًا ببايت. فإن خرج جسمُنا مطابقًا فالاشتقاقُ والتشفيرُ والرأسُ صحيحةٌ كلُّها،
 * وأيُّ انحرافٍ في سطرٍ منها يُفسد المطابقة. ثمّ يُفكّ ما شفّرناه بمفتاح «الجهاز» الخاصّ،
 * كما يفعل المتصفّح حقًّا.
 */

const b = (s: string) => Buffer.from(s, "base64url");

const RFC = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  header:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  body: "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ",
};

/** فكُّ الجسم كما يفكّه المتصفّح — مستقلٌّ عن مسار التشفير إلّا في المواصفة. */
function decrypt(body: Buffer, uaPrivate: Buffer, authSecret: Buffer): Buffer {
  const salt = body.subarray(0, 16);
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const ct = body.subarray(21 + idlen);
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(uaPrivate);
  const uaPublic = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(asPublic);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", secret, authSecret, info, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const d = createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const padded = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  expect(padded[padded.length - 1]).toBe(2);
  return padded.subarray(0, padded.length - 1);
}

describe("encryptPayload", () => {
  it("يطابق مثالَ RFC 8291 (الملحق أ) بايتًا ببايت", () => {
    const out = encryptPayload(b(RFC.plaintext), { p256dh: RFC.uaPublic, auth: RFC.auth }, {
      salt: b(RFC.salt),
      asPrivate: b(RFC.asPrivate),
    });
    // يُقارَن بالبايت لا بالنصّ: الرأسُ ٨٦ بايتًا لا تقسمها الثلاثة، فترميزا الجزأين
    // منفصلَين لا يلتصقان حرفًا بحرف بترميز الكلّ.
    expect(out.equals(Buffer.concat([b(RFC.header), b(RFC.body)]))).toBe(true);
  });

  it("رأسُه: الملحُ ثمّ ٤٠٩٦ ثمّ مفتاحُنا المؤقّت", () => {
    const out = encryptPayload(Buffer.from("x"), { p256dh: RFC.uaPublic, auth: RFC.auth });
    expect(out.readUInt32BE(16)).toBe(4096);
    expect(out[20]).toBe(65);
    expect(out[21]).toBe(4);
  });

  it("يُفكّ بمفتاح الجهاز فيرجع النصُّ كما كان، والعربيّةُ سليمة", () => {
    const text = JSON.stringify({ title: "أَدِيب", body: "قُبِل طلبُك التطوّعيّ" });
    const out = encryptPayload(Buffer.from(text), { p256dh: RFC.uaPublic, auth: RFC.auth });
    expect(decrypt(out, b(RFC.uaPrivate), b(RFC.auth)).toString()).toBe(text);
  });

  it("رسالتان متطابقتان لا تتشابهان (ملحٌ ومفتاحٌ جديدان كلَّ مرّة)", () => {
    const k = { p256dh: RFC.uaPublic, auth: RFC.auth };
    expect(encryptPayload(Buffer.from("x"), k).equals(encryptPayload(Buffer.from("x"), k))).toBe(false);
  });

  it("يرفض مفتاحًا مبتورًا وحمولةً تفوق السقف", () => {
    expect(() => encryptPayload(Buffer.from("x"), { p256dh: RFC.auth, auth: RFC.auth })).toThrow();
    expect(() => encryptPayload(Buffer.alloc(5000), { p256dh: RFC.uaPublic, auth: RFC.auth })).toThrow();
  });
});

describe("vapidAuthorization", () => {
  it("رمزٌ موقَّعٌ بمفتاحنا، جمهورُه أصلُ عنوان الجهاز، وعمرُه اثنتا عشرة ساعة", () => {
    const keys = generateVapidKeys();
    const now = 1_790_000_000;
    const h = vapidAuthorization("https://web.push.apple.com/QGuQyavXutnMH/abc", { ...keys, subject: "https://adeeb.club" }, now);
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
    expect(m).not.toBeNull();
    const [, head, claims, sig, k] = m!;
    expect(k).toBe(keys.publicKey);
    expect(JSON.parse(b(head).toString())).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(b(claims).toString())).toEqual({ aud: "https://web.push.apple.com", exp: now + 43_200, sub: "https://adeeb.club" });

    const pub = b(keys.publicKey);
    const key = createPublicKey({
      format: "jwk",
      key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") },
    });
    const ok = verify("sha256", Buffer.from(`${head}.${claims}`), { key, dsaEncoding: "ieee-p1363" }, b(sig));
    expect(ok).toBe(true);
  });

  it("المفتاحان بالمقاس الذي يطلبه المتصفّح: عامٌّ ٦٥ بايتًا، وخاصٌّ ٣٢", () => {
    const { publicKey, privateKey } = generateVapidKeys();
    expect(b(publicKey).length).toBe(65);
    expect(b(privateKey).length).toBe(32);
  });
});

describe("isPushEndpoint", () => {
  it("خدماتُ الدفع المعروفة وحدها، وبـhttps", () => {
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
  });

  it("وما سواها يُردّ: عنوانٌ داخليّ، أو http، أو نطاقٌ يتنكّر بالاسم", () => {
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isPushEndpoint("https://evilpush.apple.com.example/x")).toBe(false);
    expect(isPushEndpoint("ليس عنوانًا")).toBe(false);
  });
});
