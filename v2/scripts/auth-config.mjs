#!/usr/bin/env node
/**
 * **إعدادُ مصادقة Supabase — من المستودع لا من اللوحة.**
 *
 * ما تنقره في لوحة Supabase لا يُرى في diff ولا يُراجَع ولا يُستعاد. فهذا الملفّ هو
 * مصدرُ الإعداد، ويُطبَّق بـ Management API. غيّر القيمة هنا ثمّ ارفعها.
 *
 * **التشغيل** (من `v2/`):
 *   SUPABASE_ACCESS_TOKEN=sbp_… RESEND_API_KEY=re_… node scripts/auth-config.mjs
 *   node scripts/auth-config.mjs --dry     ← يعرض الفرق ولا يكتب شيئًا
 *
 * والمفاتيح **من البيئة لا من ملفّ**: لا يُكتب سرٌّ في المستودع ولا يُطبع في مخرَج.
 * وبلا `RESEND_API_KEY` يُطبَّق كلُّ شيءٍ عدا SMTP — فترتيبُ الخطوات لا يحبس بعضها بعضًا.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "nnlhkfeybyhvlinbqqfa";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const resendKey = process.env.RESEND_API_KEY?.trim();
const dry = process.argv.includes("--dry");

if (!token) {
  console.error("✗ لا توكن: صدّر SUPABASE_ACCESS_TOKEN (‏Supabase → Account → Access Tokens).");
  process.exit(1);
}

/**
 * **رابطُ الاستعادة يُصدَّق أو يُهمَل:** من طلب تحويلًا إلى عنوانٍ خارج هذه القائمة
 * أعادته Supabase إلى `site_url` صامتةً — فيقع العضو في الصفحة الرئيسة بلا جلسة،
 * ويبدو الرابطُ «معطوبًا» بلا خطأ. والنمطُ `**` يغطّي المسارات كلَّها تحت الأصل.
 *
 * ومعاينات Vercel بنمطٍ مقيَّدٍ باسم المشروع (`adeeb-v2-*`) لا بـ`*.vercel.app`:
 * الثاني يجعل أيّ مشروعٍ على المنصّة وجهةً مشروعة لرمز استعادةٍ من أديب.
 */
const REDIRECTS = [
  "https://adeeb.club/**",
  "https://www.adeeb.club/**",
  "https://adeeb-v2-*.vercel.app/**",
  "http://localhost:3000/**",
];

const template = readFileSync(join(HERE, "..", "emails", "recovery.html"), "utf8");

/** القيم المقصودة — كلُّ سطرٍ منها له نظيرٌ في الكود يعتمد عليه. */
const desired = {
  site_url: "https://adeeb.club",
  uri_allow_list: REDIRECTS.join(","),

  // عمرُ رابط الاستعادة — يطابق `RESET_WINDOW_SEC` في `lib/resetWindow.ts` وعدّادَ
  // شاشة التعيين. لا تغيّر أحدَهما وحده وإلّا وعد العدّادُ بوقتٍ مات عند الخادم.
  mailer_otp_exp: 600,

  // أقلُّ فاصلٍ بين رسالتين للمستخدم الواحد — يطابق `COOLDOWN` في `ForgotForm.tsx`.
  smtp_max_frequency: 60,

  // الحدُّ الأدنى لطول كلمة المرور — يطابق `MIN` في `ResetForm.tsx`. كان ٦ في القاعدة
  // و٨ في الشاشة، فكان الخادم يقبل ما ترفضه الشاشة (وأيّ عميلٍ آخر يمرّ).
  password_min_length: 8,

  mailer_subjects_recovery: "استعادة كلمة المرور — نادي أديب",
  mailer_templates_recovery_content: template,
};

/** SMTP: يُضاف إن وُجد المفتاح وحده — وبدونه يبقى الإرسالُ على مرسِل Supabase المحدود. */
if (resendKey) {
  Object.assign(desired, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",          // اسمُ المستخدم في Resend ثابتٌ لكلّ الحسابات
    smtp_pass: resendKey,
    smtp_admin_email: "no-reply@adeeb.club",
    smtp_sender_name: "نادي أديب",
  });
}

/** لا يُطبع سرٌّ ولا قالبٌ كامل — المفتاح يُقنَّع، والقالب يُقاس بطولِه. */
const show = (k, v) => {
  if (v == null) return "—";
  if (k === "smtp_pass") return `${String(v).slice(0, 6)}…(${String(v).length} محرفًا)`;
  if (typeof v === "string" && v.length > 90) return `«${v.length} محرفًا»`;
  return String(v);
};

const call = async (method, body) => {
  const res = await fetch(API, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
};

const before = await call("GET");

console.log(`\nالمشروع: ${PROJECT_REF}${dry ? "  (تجربةٌ جافّة — لا كتابة)" : ""}\n`);
const changed = Object.keys(desired).filter((k) => String(before[k] ?? "") !== String(desired[k]));
if (!changed.length) {
  console.log("✅ الإعداد مطابقٌ للمقصود — لا شيء يُكتب.");
  process.exit(0);
}
for (const k of changed) console.log(`  ${k}\n    قبل: ${show(k, before[k])}\n    بعد: ${show(k, desired[k])}`);

if (dry) {
  console.log(`\n(${changed.length} حقلًا سيتغيّر. أعِد التشغيل بلا --dry للتطبيق.)`);
  process.exit(0);
}

await call("PATCH", desired);

// **التحقّق بالقراءة لا بالردّ:** رمزُ ٢٠٠ يقول «قُبل الطلب» لا «حُفظت القيمة».
const after = await call("GET");
const stuck = Object.keys(desired).filter((k) => String(after[k] ?? "") !== String(desired[k]));
if (stuck.length) {
  console.error(`\n✗ لم تُحفظ: ${stuck.join(", ")}`);
  process.exit(1);
}
console.log(`\n✅ طُبِّق ${changed.length} حقلًا وتُحقِّق منه بالقراءة.`);
if (!resendKey) console.log("ℹ️  بلا RESEND_API_KEY — إعدادُ SMTP لم يُلمس بعد.");
