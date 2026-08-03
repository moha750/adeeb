/**
 * توقيع PKCS#7 المنفصل (detached CMS SignedData) — ما تشترطه أبل على ملفّ `signature`
 * داخل حزمة `.pkpass`: توقيعٌ على `manifest.json` لا يحمل محتواه.
 *
 * البنية المكتوبة هنا (RFC 5652):
 *
 * ```
 * ContentInfo ::= SEQUENCE { signedData OID, [0] EXPLICIT SignedData }
 * SignedData  ::= SEQUENCE { version, digestAlgorithms, encapContentInfo,
 *                            [0] certificates, signerInfos }
 * SignerInfo  ::= SEQUENCE { version, IssuerAndSerialNumber, digestAlgorithm,
 *                            [0] signedAttrs, signatureAlgorithm, signature }
 * ```
 *
 * **موضعُ الزلل الوحيد ونُصّ عليه**: التوقيع يقع على `signedAttrs` مُرمَّزةً
 * **`SET OF` (0x31)** لا بوسمها السياقيّ `[0]` (0xA0) الذي تُكتَب به داخل البنية —
 * تفصيلٌ يُغفَل فيخرج توقيعٌ سليمُ الشكل يرفضه كلُّ متحقّق. لذا نبنيها مرّةً `SET`
 * فنوقّعها، ثمّ نستبدل وسمَها الأوّل بـ`0xA0` عند التركيب.
 */

import { createHash, createSign, type KeyObject, createPrivateKey } from "node:crypto";
import { algId, explicit, implicit, int, issuerAndSerial, octet, oid, pemToDer, seq, set, utcTime } from "./asn1";

/* معرّفات الكائنات — بأسمائها كي يُقرأ التركيب أدناه بلا جدول. */
const OID = {
  signedData: "1.2.840.113549.1.7.2",
  data: "1.2.840.113549.1.7.1",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsa: "1.2.840.113549.1.1.1",
} as const;

/** سِمةٌ موقَّعة: `SEQUENCE { OID, SET OF value }`. */
const attr = (type: string, value: Buffer): Buffer => seq(oid(type), set(value));

export type SigningMaterial = {
  /** شهادة Pass Type ID (PEM) — الموقِّع. */
  certPem: string;
  /** مفتاحها الخاصّ (PEM)، مشفَّرًا أو غير مشفَّر. */
  keyPem: string;
  /** عبارةُ مرور المفتاح إن كان مشفَّرًا. */
  keyPassphrase?: string;
  /** شهادة أبل الوسيطة (WWDR) — تُرفَق لتكتمل سلسلةُ الثقة. */
  wwdrPem: string;
};

/**
 * توقيعٌ منفصلٌ على `payload` بصيغة DER — هو بايتات ملفّ `signature` كما تُوضَع في الحزمة.
 *
 * **ولا نلمس الوقت الظاهر للمستخدم**: `signingTime` لحظةُ التوقيع بالتوقيت العالميّ،
 * وهي سِمةٌ للمتحقّق لا للعرض.
 */
export function signDetached(payload: Buffer, mat: SigningMaterial): Buffer {
  const [certDer] = pemToDer(mat.certPem);
  const [wwdrDer] = pemToDer(mat.wwdrPem);
  if (!certDer) throw new Error("شهادة Pass Type ID غير مقروءة — تأكّد أنّها بصيغة PEM كاملة.");
  if (!wwdrDer) throw new Error("شهادة أبل الوسيطة (WWDR) غير مقروءة — تأكّد أنّها بصيغة PEM كاملة.");

  let key: KeyObject;
  try {
    key = createPrivateKey(
      mat.keyPassphrase ? { key: mat.keyPem, passphrase: mat.keyPassphrase } : { key: mat.keyPem },
    );
  } catch {
    throw new Error("تعذّر فتح المفتاح الخاصّ — تحقّق من الصيغة ومن عبارة المرور.");
  }

  const digest = createHash("sha256").update(payload).digest();

  // السِّمات الموقَّعة — ترتيبها في DER يفرضه ترميزُ `SET OF` (تُرتَّب بايتاتُها)،
  // وnode لا يرتّب لنا؛ لكنّ المتحقّقين يقبلون ترتيبَ الكتابة في CMS عمليًّا، والترتيب
  // هنا مطابقٌ لترتيب OIDها تصاعديًّا أصلًا (…9.3 ثمّ 9.4 ثمّ 9.5).
  const signedAttrsSet = set(
    attr(OID.contentType, oid(OID.data)),
    attr(OID.messageDigest, octet(digest)),
    attr(OID.signingTime, utcTime(new Date())),
  );

  const signature = createSign("RSA-SHA256").update(signedAttrsSet).sign(key);

  // نفسُ البايتات بوسمٍ سياقيّ — انظر رأس الملفّ.
  const signedAttrsTagged = Buffer.concat([Buffer.from([0xa0]), signedAttrsSet.subarray(1)]);

  const { issuer, serial } = issuerAndSerial(certDer);

  const signerInfo = seq(
    int(1), // IssuerAndSerialNumber ⇒ الإصدار 1
    seq(issuer, serial),
    algId(OID.sha256),
    signedAttrsTagged,
    algId(OID.rsa),
    octet(signature),
  );

  const signedData = seq(
    int(1),
    set(algId(OID.sha256)),
    seq(oid(OID.data)), // منفصل: لا `eContent`
    implicit(0, Buffer.concat([certDer, wwdrDer])), // الشهادتان: الموقِّع ثمّ الوسيطة
    set(signerInfo),
  );

  return seq(oid(OID.signedData), explicit(0, signedData));
}
