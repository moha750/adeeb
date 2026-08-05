#!/usr/bin/env node
/**
 * **سرُّ عميل أبل — يُولَّد عندنا لا في متصفّح.**
 *
 * أبل وحدها بين المزوّدين لا تعطيك سرًّا ثابتًا: تعطيك **مفتاحًا** (`.p8`) وتطلب منك أن توقّع
 * به رمزًا (JWT) قصيرَ العمر يكون هو «السرّ». وتوثيق Supabase يحيلك إلى أداةٍ في صفحة الويب
 * تُلصق فيها مفتاحُك — ونحن لا نلصق مفاتيحنا في صفحات، فهذا نظيرُها محلّيًّا **بلا حزمة**
 * (كتوقيع pkpass): `node:crypto` وحده يوقّع ES256، والمفتاح لا يغادر هذا الجهاز.
 *
 * **التشغيل** (من `v2/`):
 *   APPLE_KEY_FILE=~/Downloads/AuthKey_ABCD123456.p8 node scripts/apple-secret.mjs
 *
 * ورقمُ المفتاح يُشتقّ من اسم الملفّ (`AuthKey_<KEY_ID>.p8`)، ويُنقَض بـ`APPLE_KEY_ID` صراحةً.
 *
 * **والعمر ستّة أشهر سقفًا من أبل** — وهذا مطبُّ هذا الباب كلِّه: ينتهي السرُّ فيموت الدخول
 * **صامتًا** بلا نشرٍ ولا تغييرٍ منّا. فالسكربت يطبع تاريخ الانتهاء بالميلاديّ صريحًا، ويرفض
 * `auth-config.mjs` سرًّا منتهيًا قبل أن يرفعه.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createPrivateKey, sign } from "node:crypto";

/** معرّفاتٌ لا أسرار — تُكتب هنا لتُرى في diff، كمعرّف عميل قوقل. */
const TEAM_ID = "72T373ZM34";                 // فريق أديب في حساب المطوّر (نفسه الذي يوقّع بطاقة الولاء)
const SERVICES_ID = "club.adeeb.signin";      // «Services ID» في لوحة أبل — وهو `client_id` عند Supabase

/** ١٨٠ يومًا. سقفُ أبل ١٥٧٧٧٠٠٠ ثانية (~٦ أشهر)؛ نقف دونه فلا يُردّ الرمزُ على الحدّ. */
const LIFETIME_SEC = 180 * 24 * 60 * 60;

const keyFile = process.env.APPLE_KEY_FILE?.trim();
if (!keyFile) {
  console.error("✗ لا مفتاح: صدّر APPLE_KEY_FILE بمسار ملفّ ‎.p8 من لوحة أبل (Keys).");
  process.exit(1);
}

const keyId = process.env.APPLE_KEY_ID?.trim() || /^AuthKey_([A-Z0-9]{10})\.p8$/i.exec(basename(keyFile))?.[1];
if (!keyId) {
  console.error("✗ تعذّر معرفة رقم المفتاح: سمِّ الملفّ كما نزّلته (‏AuthKey_XXXXXXXXXX.p8) أو صدّر APPLE_KEY_ID.");
  process.exit(1);
}

let key;
try {
  key = createPrivateKey(readFileSync(keyFile, "utf8"));
} catch (e) {
  console.error(`✗ المفتاح لا يُقرأ: ${e.message}`);
  process.exit(1);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

const iat = Math.floor(Date.now() / 1000);
const exp = iat + LIFETIME_SEC;
const head = b64({ alg: "ES256", kid: keyId });
const body = b64({ iss: TEAM_ID, iat, exp, aud: "https://appleid.apple.com", sub: SERVICES_ID });

// **`ieee-p1363` لا DER**: العقدة توقّع ECDSA بصيغة DER افتراضًا، وJOSE يريد `r‖s` مجرّدةً.
// والفرق لا يظهر عندنا بل عند أبل — تردّ `invalid_client` بلا تفسير، فيُظنّ المفتاحُ خاطئًا.
const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");

console.log(`\n✅ سرُّ أبل (‏Services ID: ${SERVICES_ID} · Key: ${keyId})\n`);
console.log(`${head}.${body}.${sig}\n`);
console.log(`ينتهي: ${new Date(exp * 1000).toISOString().slice(0, 10)} — جدّده قبلها، وإلّا مات الدخول بأبل صامتًا.`);
console.log(`الرفع: APPLE_OAUTH_SECRET='<السرّ أعلاه>' SUPABASE_ACCESS_TOKEN=sbp_… node scripts/auth-config.mjs\n`);
