#!/usr/bin/env node
/**
 * **إعدادُ CORS لدلو الإذاعة — من المستودع لا من لوحة Cloudflare.**
 *
 * لماذا يلزم أصلًا: رفعُ الحلقة يجري **من المتصفّح مباشرةً** برابط PUT موقّع
 * (‏`lib/radio/r2.ts`) كي يتجاوز حدَّ جسم Server Action ولا يمرّ الملفُّ بخادمنا.
 * فالطلب يعبر أصلًا إلى مضيفٍ آخر، والمتصفّح يسبقه بـpreflight يسأل الدلوَ:
 * أتأذن لهذا الأصل بـPUT؟ ودلوُ R2 صامتٌ ما لم تُكتب له سياسة، فيُحجَب الرفع
 * بلا خطأٍ من عندنا: «No Access-Control-Allow-Origin header».
 *
 * والسياسة تُكتب هنا لا في اللوحة، فما يُنقر لا يُرى في diff ولا يُستعاد.
 *
 * **التشغيل** (من `v2/`):
 *   node scripts/r2-cors.mjs          ← يطبّق السياسة أدناه
 *   node scripts/r2-cors.mjs --dry    ← يعرضها ولا يكتب
 *   node scripts/r2-cors.mjs --show   ← يقرأ ما هو مضبوطٌ الآن على الدلو
 *
 * والمفاتيح تُقرأ من `apps/web/.env.local` (‏`R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` ·
 * `R2_SECRET_ACCESS_KEY` · `R2_BUCKET`) أو من البيئة إن صُدِّرت — ولا يُطبع سرٌّ.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * **الأصولُ المأذونة — قائمةٌ صريحة لا نجمة.**
 *
 * `*` يفتح الرفعَ الموقَّع لأيّ صفحةٍ في الشبكة تملك الرابط، والرابطُ يمرّ بالمتصفّح.
 * ونطاقُ معاينات Vercel بنجمةٍ واحدة (وهي كلّ ما تسمح به مواصفةُ S3) كي تعمل
 * فروعُ المعاينة بلا تعديلٍ في كلّ نشرة.
 */
const ORIGINS = [
  "http://localhost:3000",
  "https://adeeb.club",
  "https://www.adeeb.club",
  "https://*.vercel.app",
];

/** GET وHEAD للقراءة (بثُّ الصوت وعرضُ الشعار)، وPUT للرفع الموقَّع. لا DELETE: الحذفُ من الخادم. */
const METHODS = ["GET", "HEAD", "PUT"];

const cors =
  "<CORSConfiguration>" +
  ORIGINS.map((o) =>
    "<CORSRule>" +
    `<AllowedOrigin>${o}</AllowedOrigin>` +
    METHODS.map((m) => `<AllowedMethod>${m}</AllowedMethod>`).join("") +
    // الرفع يحمل `content-type`، والمتصفّح يسأل عنه في الـpreflight.
    "<AllowedHeader>*</AllowedHeader>" +
    // ETag يُقرأ للتحقّق من تمام الرفع.
    "<ExposeHeader>ETag</ExposeHeader>" +
    "<MaxAgeSeconds>3600</MaxAgeSeconds>" +
    "</CORSRule>",
  ).join("") +
  "</CORSConfiguration>";

/* ══ المفاتيح ════════════════════════════════════════════════════════ */

function fromEnvFile() {
  try {
    const raw = readFileSync(join(HERE, "..", "apps", "web", ".env.local"), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const file = fromEnvFile();
const pick = (k) => (process.env[k]?.trim() || file[k] || "").trim();

const ACCOUNT = pick("R2_ACCOUNT_ID");
const BUCKET = pick("R2_BUCKET") || "adeeb-radio";

/**
 * **مفتاحٌ إداريٌّ للإعداد، ومفتاحُ التطبيق يبقى على أدنى صلاحيّته.**
 *
 * ضبطُ CORS إعدادُ **دلوٍ** لا كتابةُ كائن، فيطلب توكن R2 من صنف
 * «Admin Read & Write». ومفتاحُ التطبيق في `.env.local` صنفُه «Object Read & Write»
 * عمدًا — يكفيه أن يرفع ويحذف ويوقّع، ولا يملك أن يعيد تشكيل الدلو. فلو رُفع
 * لأجل هذا السطر الواحد لبقي مرفوعًا في الإنتاج إلى الأبد.
 *
 * فيُصدَّر التوكن الإداريّ **للحظة التشغيل وحدها** ولا يُكتب في ملفّ:
 *   R2_ADMIN_ACCESS_KEY_ID=… R2_ADMIN_SECRET_ACCESS_KEY=… node scripts/r2-cors.mjs
 */
const ACCESS_KEY = pick("R2_ADMIN_ACCESS_KEY_ID") || pick("R2_ACCESS_KEY_ID");
const SECRET = pick("R2_ADMIN_SECRET_ACCESS_KEY") || pick("R2_SECRET_ACCESS_KEY");
const usingAdmin = Boolean(pick("R2_ADMIN_ACCESS_KEY_ID"));

if (!ACCOUNT || !ACCESS_KEY || !SECRET) {
  console.error("✗ مفاتيح R2 ناقصة. أضِفها إلى apps/web/.env.local أو صدّرها في البيئة:");
  console.error("  R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_BUCKET");
  process.exit(1);
}

/** رسالةُ المنع تسمّي العلّة، فـ«Access Denied» وحدها تُقرأ عطبًا في المفاتيح. */
function explainDenied() {
  console.error("");
  console.error("  والعلّةُ صلاحيّةٌ لا مفتاحٌ خاطئ: ضبطُ CORS إعدادُ دلوٍ يطلب توكنًا إداريًّا،");
  console.error("  ومفتاحُ التطبيق صنفُه «Object Read & Write» فلا يبلغه (وهذا صوابُه).");
  console.error("");
  console.error("  الحلّ: Cloudflare ← R2 ← Manage API Tokens ← Create، صنف **Admin Read & Write**،");
  console.error("  ثمّ شغّل مرّةً واحدة بلا أن تكتبه في ملفّ:");
  console.error("    R2_ADMIN_ACCESS_KEY_ID=… R2_ADMIN_SECRET_ACCESS_KEY=… node scripts/r2-cors.mjs");
  if (usingAdmin) {
    console.error("");
    console.error("  (تُشغّل بمفتاحٍ إداريّ فعلًا. فتأكّد أنّ نطاقه يشمل هذا الدلو.)");
  }
}

const HOST = `${ACCOUNT}.r2.cloudflarestorage.com`;

/* ══ توقيع SigV4 ═════════════════════════════════════════════════════ */

const sha256 = (v) => createHash("sha256").update(v).digest("hex");
const hmac = (key, v) => createHmac("sha256", key).update(v).digest();

/** طلبٌ موقَّع إلى واجهة S3 في R2. المنطقة `auto` والخدمة `s3` كما يقتضي R2. */
async function signedFetch(method, path, query, body) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const stamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? "");

  const headers = {
    host: HOST,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(body ? { "content-type": "application/xml" } : {}),
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join("");

  const canonical = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${stamp}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");

  let key = hmac(`AWS4${SECRET}`, stamp);
  key = hmac(key, "auto");
  key = hmac(key, "s3");
  key = hmac(key, "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");

  return fetch(`https://${HOST}${path}?${query}`, {
    method,
    headers: {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  });
}

/* ══ التنفيذ ═════════════════════════════════════════════════════════ */

const path = `/${BUCKET}`;

if (process.argv.includes("--show")) {
  const res = await signedFetch("GET", path, "cors=");
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ تعذّرت القراءة (${res.status}).`);
    console.error(text.trim() || "(بلا جسم)");
    if (res.status === 403) explainDenied();
    process.exit(1);
  }
  console.log(`سياسةُ ${BUCKET} الحاليّة:\n`);
  console.log(text.trim() || "(فارغة — لا سياسة مضبوطة)");
  process.exit(0);
}

if (process.argv.includes("--dry")) {
  console.log(`الدلو: ${BUCKET}`);
  console.log(`الأصول المأذونة: ${ORIGINS.join("، ")}`);
  console.log(`الطرق: ${METHODS.join("، ")}`);
  console.log("\nلم يُكتب شيء (--dry).");
  process.exit(0);
}

const res = await signedFetch("PUT", path, "cors=", cors);
if (!res.ok) {
  const text = await res.text();
  console.error(`✗ تعذّر ضبط CORS (${res.status}).`);
  console.error(text.trim() || "(بلا جسم)");
  if (res.status === 403) explainDenied();
  process.exit(1);
}

console.log(`✓ ضُبطت سياسة CORS على «${BUCKET}».`);
console.log(`  الأصول: ${ORIGINS.join("، ")}`);
console.log(`  الطرق: ${METHODS.join("، ")}`);
console.log("  (سرَت فورًا. أعِد الرفع من اللوحة.)");
