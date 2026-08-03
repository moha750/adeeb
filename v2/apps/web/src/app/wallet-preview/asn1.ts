/**
 * ترميز DER الأدنى — ما يكفي لبناء توقيع PKCS#7 بيدنا.
 *
 * **لماذا بلا حزمة؟** نفسُ حجّة `lib/pdf.ts`: البديل (`node-forge`) ثلثُ ميغابايت من
 * التشفير الكامل لنستعمل منه بنيةً واحدة. وهنا زيادةٌ على ذلك: هذا مجلّدٌ **يُحذف**،
 * فتبعيّةٌ تُضاف اليوم تُنسى غدًا في `package.json` بعد أن يزول مستعمِلُها.
 *
 * **ومُتحقَّقٌ بأداةٍ حقيقيّة** لا بالنظر: `openssl cms -verify` يفكّ ما نكتبه هنا
 * (انظر `cms.ts`) — فبنيةٌ خاطئةٌ تسقط عند الفحص لا عند المستخدم.
 */

/* ── الطول (Definite length) ────────────────────────────────────────────── */

/**
 * بايتات الطول بصيغة DER: دون 128 بايتٌ واحد، وفوقها «طولُ الطول» ثمّ الطول
 * كبير‑الطرف (big-endian) بأقلّ بايتاتٍ ممكنة — الصيغة **الأقصر إلزاميّة** في DER
 * (بخلاف BER الذي يتساهل)، وقارئُ أبل صارم.
 */
function derLength(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  let v = n;
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v >>>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

/** عنصر DER واحد: وسم + طول + محتوى. */
export function tlv(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content]);
}

/* ── الأنواع ────────────────────────────────────────────────────────────── */

export const seq = (...parts: Buffer[]): Buffer => tlv(0x30, Buffer.concat(parts));
export const set = (...parts: Buffer[]): Buffer => tlv(0x31, Buffer.concat(parts));
export const octet = (b: Buffer): Buffer => tlv(0x04, b);
export const nullVal = (): Buffer => Buffer.from([0x05, 0x00]);

/** عدد صحيح صغير موجب (نستعمله للإصدارات: 1 و3 لا أكثر). */
export function int(n: number): Buffer {
  // البايت الأعلى ≥ 0x80 يُقرأ سالبًا في DER، فيُسبَق بصفر. أرقامُنا صغيرة لكنّ
  // القاعدة تُكتب لا تُفترَض.
  const b = n < 0x80 ? Buffer.from([n]) : Buffer.from([0x00, n]);
  return tlv(0x02, b);
}

/** وسمٌ سياقيّ ضِمنيّ (IMPLICIT) — يستبدل وسمَ المحتوى ولا يلفّه. */
export const implicit = (n: number, content: Buffer, constructed = true): Buffer =>
  tlv((constructed ? 0xa0 : 0x80) | n, content);

/** وسمٌ سياقيّ صريح (EXPLICIT) — يلفّ العنصر كما هو. */
export const explicit = (n: number, inner: Buffer): Buffer => tlv(0xa0 | n, inner);

/**
 * معرّف كائن (OID) من صيغته النقطيّة.
 * أوّل بايتٍ يجمع العقدتين الأوليين (`40×a + b`)، وما بعدهما بترميز base-128 يُرفَع
 * فيه البتّ الأعلى في كلّ بايتٍ إلّا الأخير.
 */
export function oid(dotted: string): Buffer {
  const parts = dotted.split(".").map(Number);
  const out: number[] = [parts[0] * 40 + parts[1]];
  for (const p of parts.slice(2)) {
    const chunk: number[] = [];
    let v = p;
    do {
      chunk.unshift(v & 0x7f);
      v >>>= 7;
    } while (v > 0);
    for (let i = 0; i < chunk.length - 1; i += 1) chunk[i] |= 0x80;
    out.push(...chunk);
  }
  return tlv(0x06, Buffer.from(out));
}

/**
 * وقتٌ بصيغة UTCTime (`YYMMDDHHMMSSZ`) — صيغةُ CMS المعتادة لِما قبل 2050.
 * (وبعد 2050 يوجب المعيار `GeneralizedTime`؛ لا يعنينا اليوم وموضعُ التغيير هنا.)
 */
export function utcTime(d: Date): Buffer {
  const p = (n: number) => String(n).padStart(2, "0");
  const s =
    p(d.getUTCFullYear() % 100) +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds()) +
    "Z";
  return tlv(0x17, Buffer.from(s, "ascii"));
}

/** خوارزميّة بمعاملٍ فارغ — `AlgorithmIdentifier ::= SEQUENCE { OID, NULL }`. */
export const algId = (dotted: string): Buffer => seq(oid(dotted), nullVal());

/* ── قراءة الشهادة ──────────────────────────────────────────────────────── */

/** عنصرٌ مقروءٌ من DER: وسمُه، ومحتواه، وبايتاتُه كاملةً (وسم+طول+محتوى). */
type Node = { tag: number; content: Buffer; raw: Buffer };

/** يقرأ عنصرًا واحدًا عند `at` ويعيد معه موضعَ ما بعده. */
function readNode(buf: Buffer, at: number): { node: Node; next: number } {
  const tag = buf[at];
  let i = at + 1;
  let len = buf[i];
  i += 1;
  if (len & 0x80) {
    const count = len & 0x7f;
    len = 0;
    for (let k = 0; k < count; k += 1) {
      len = len * 256 + buf[i + k];
    }
    i += count;
  }
  return { node: { tag, content: buf.subarray(i, i + len), raw: buf.subarray(at, i + len) }, next: i + len };
}

/** أبناءُ عنصرٍ مركَّب، بترتيبهم. */
function children(content: Buffer): Node[] {
  const out: Node[] = [];
  let at = 0;
  while (at < content.length) {
    const { node, next } = readNode(content, at);
    out.push(node);
    at = next;
  }
  return out;
}

/**
 * يستخرج من شهادة X.509 ما يحتاجه `SignerInfo` للتعريف بالموقِّع:
 * **اسمُ المُصدِر ورقمُها التسلسليّ** — ببايتاتهما الأصليّة لا بمعناهما.
 *
 * والنقلُ حرفيّ عمدًا: اسمُ المُصدِر بنيةٌ فيها ترميزاتٌ مختلفة (`PrintableString`
 * و`UTF8String`)، وإعادةُ بنائه من نصٍّ مقروءٍ قد تُنتج بايتاتٍ أخرى فلا يُطابِق ما
 * في الشهادة — ولا يجد المتحقّق موقِّعَه.
 *
 * `Certificate ::= SEQUENCE { tbsCertificate, sigAlg, sigValue }`
 * `tbsCertificate ::= SEQUENCE { [0] version?, serialNumber, signature, issuer, … }`
 */
export function issuerAndSerial(certDer: Buffer): { issuer: Buffer; serial: Buffer } {
  const { node: cert } = readNode(certDer, 0);
  const [tbs] = children(cert.content);
  const kids = children(tbs.content);
  // الإصدار اختياريّ ([0] EXPLICIT) — يُتخطّى إن حضر، فتزحف بقيّة الحقول موضعًا.
  const at = kids[0].tag === 0xa0 ? 1 : 0;
  return { serial: kids[at].raw, issuer: kids[at + 2].raw };
}

/* ── PEM ────────────────────────────────────────────────────────────────── */

/**
 * يحوّل PEM إلى DER. يقبل **كلّ كتلة** في الملفّ (سلسلةٌ من الشهادات في ملفٍّ واحد)،
 * ويتساهل مع أسطر `\r\n` ومع مسافاتٍ بادئة — فالمفاتيح تُلصَق في متغيّرات البيئة
 * لصقًا، ومحرّرُ اللوحة يعبث بالأسطر.
 */
export function pemToDer(pem: string): Buffer[] {
  const out: Buffer[] = [];
  const re = /-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pem)) !== null) {
    out.push(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
  }
  return out;
}
