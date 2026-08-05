#!/usr/bin/env node
/**
 * **إعدادُ مصادقة Supabase — من المستودع لا من اللوحة.**
 *
 * ما تنقره في لوحة Supabase لا يُرى في diff ولا يُراجَع ولا يُستعاد. فهذا الملفّ هو
 * مصدرُ الإعداد، ويُطبَّق بـ Management API. غيّر القيمة هنا ثمّ ارفعها.
 *
 * **التشغيل** (من `v2/`):
 *   SUPABASE_ACCESS_TOKEN=sbp_… RESEND_API_KEY=re_… GOOGLE_OAUTH_SECRET=GOCSPX-… node scripts/auth-config.mjs
 *   node scripts/auth-config.mjs --dry     ← يعرض الفرق ولا يكتب شيئًا
 *
 * والمفاتيح **من البيئة لا من ملفّ**: لا يُكتب سرٌّ في المستودع ولا يُطبع في مخرَج.
 * وكلُّ سرٍّ يحرس بابَه وحده: بلا `RESEND_API_KEY` يُطبَّق كلُّ شيءٍ عدا SMTP، وبلا
 * `GOOGLE_OAUTH_SECRET` عدا الدخول بقوقل، وبلا `APPLE_OAUTH_SECRET` عدا الدخول بأبل
 * (‏يولّده `scripts/apple-secret.mjs`) — فترتيبُ الخطوات لا يحبس بعضها بعضًا.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "nnlhkfeybyhvlinbqqfa";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const resendKey = process.env.RESEND_API_KEY?.trim();
const googleSecret = process.env.GOOGLE_OAUTH_SECRET?.trim();
const appleSecret = process.env.APPLE_OAUTH_SECRET?.trim();
const dry = process.argv.includes("--dry");

if (!token) {
  console.error("✗ لا توكن: صدّر SUPABASE_ACCESS_TOKEN (‏Supabase → Account → Access Tokens).");
  process.exit(1);
}

// **التوكن يُستبدَل لا يُنسَخ**: من لصق `sbp_…` كما هو في السطر ردّته `fetch` بخطأٍ خامٍ عن
// ByteString لا يُفهم منه أنّ العلّة حرفُ حذفٍ في الأمر. فيُفحص هنا ويُسمَّى العطبُ باسمه.
if (!/^sbp_[A-Za-z0-9_-]+$/.test(token)) {
  console.error("✗ التوكن ليس توكنًا: يبدأ بـ`sbp_` ويتلوه لاتينيٌّ وأرقام.");
  console.error("  (إن نسختَ سطر الأمر كما هو فاستبدل `sbp_…` بتوكنك من Supabase → Account → Access Tokens.)");
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
const emailChangeTemplate = readFileSync(join(HERE, "..", "emails", "email-change.html"), "utf8");

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

  // **تغيير بريد الدخول** — يطلبه العضو من «الإعدادات»، ولا يسري حتى يفتح الرابط. وبلا هذين
  // السطرين يخرج نصُّ Supabase الإنجليزيّ الافتراضيّ إلى صندوق عضوٍ عربيّ.
  mailer_subjects_email_change: "تأكيد بريد الدخول الجديد — نادي أديب",
  mailer_templates_email_change_content: emailChangeTemplate,

  // **التأكيد المزدوج**: الرسالة تُرسَل إلى العنوانين — القديم يعلم بما يجري (فلا يُسلَب
  // حسابٌ من جلسةٍ مسروقة بصمت)، والجديد يُثبت ملكيّته. وهو افتراض Supabase؛ يُعلَن هنا
  // صراحةً كي لا يُطفأ بنقرةٍ في اللوحة بلا أثرٍ في diff.
  mailer_secure_email_change_enabled: true,

  // **حارسُ الدخول الاجتماعيّ** — خطّافُ ما‑قبل‑الإنشاء. كان قفلًا يردّ من لا حساب له، ثمّ
  // صار الحسابُ للجميع (م٣ · ٢٠٢٦-٠٨-٠٥) ففُتح: من دخل بقوقل يُنشأ له حساب — لا عضويّة.
  // ولم يبقَ من المنع إلّا بريدُ أبل المُخفى (عنوانُ تحويلٍ لا يُبلَغ صاحبُه).
  //
  // ونظيرُه في القاعدة `public.hook_block_oauth_signup` — لا يُفعَّل أحدُهما بلا الآخر:
  // الدالّةُ بلا هذين السطرين حبرٌ لا يُنادى، وهما بلا الدالّة يكسران الإنشاء. (والاسمُ من
  // عهد القفل — أُبقي لأنّ تغييرَه ههنا وهناك معًا شرطٌ لا يُؤمَن نسيانُه.)
  hook_before_user_created_enabled: true,
  hook_before_user_created_uri: "pg-functions://postgres/public/hook_block_oauth_signup",
};

/**
 * **درعُ الأبواب (Turnstile)** — يُضاف إن وُجد السرّ وحدَه.
 *
 * ولمَ الشرط؟ لأنّ تفعيلَ الدرع بلا سرٍّ **يُغلق كلّ أبواب المصادقة**: GoTrue يطلب رمزًا
 * ولا يملك ما يتحقّق به منه. فالسرُّ هو الإذن، وغيابُه يعني «لا تُفعّله».
 *
 * ولمَ عند GoTrue لا عندنا؟ لأنّ الحارس يجب أن يقف عند **الطرَف نفسِه**: نداءُ إرسال الرمز
 * يقع من المتصفّح بالمفتاح العلنيّ، فأيُّ حارسٍ في شاشتنا يُلتَفّ عليه بنداءٍ مباشر. وGoTrue
 * يسأل Cloudflare بنفسه قبل أن يرسل حرفًا.
 *
 * **ونظيرُه في الكود**: `TurnstileWidget` في شاشات الدخول والاستعادة وودجة الحجز — تمرّر
 * الرمزَ في `options.captchaToken`. **لا يُفعَّل هذا قبل نشر تلك**، وإلّا طُلب رمزٌ لا يرسله
 * أحد. (والعكسُ آمن: الرمزُ يُهمَل ما دام الدرعُ مطفأً.)
 *
 * وأوسعُ ما يحميه بابُ **رمز الحجز**: يرسل بريدًا إلى أيّ عنوانٍ يُكتب، بلا حسابٍ ولا إذن —
 * فهو أقربُ أبواب أديب إلى أن يصير مِرشّةَ بريدٍ باسم النطاق.
 */
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
if (turnstileSecret) {
  Object.assign(desired, {
    security_captcha_enabled: true,
    security_captcha_provider: "turnstile",
    security_captcha_secret: turnstileSecret,
  });
}

/** SMTP: يُضاف إن وُجد المفتاح وحده — وبدونه يبقى الإرسالُ على مرسِل Supabase المحدود. */
if (resendKey) {
  Object.assign(desired, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",          // اسمُ المستخدم في Resend ثابتٌ لكلّ الحسابات
    smtp_pass: resendKey,
    smtp_admin_email: "noreply@adeeb.club",   // العنوانُ الحيّ منذ الإعداد الأوّل — بلا شرطة
    smtp_sender_name: "نادي أديب",
  });
}

/**
 * **الدخول بقوقل** — بابٌ للقائمين وحدهم، يحرسه الخطّافُ أعلاه.
 *
 * والمعرِّفُ هنا لا في البيئة: ليس سرًّا أصلًا، يظهر في رابط شاشة الموافقة لكلّ داخل،
 * وموضعُه في الملفّ يجعل تبديلَ عميلٍ بعميلٍ **مرئيًّا في diff**. والسرُّ وحده من البيئة.
 *
 * والثلاثةُ تُضاف معًا أو لا يُضاف شيء: `enabled` بلا سرٍّ صحيحٍ بابٌ يفتح على
 * `invalid_client` عند أوّل ضغطة — وذاك عطبٌ يظهر للعضو لا لنا.
 */
if (googleSecret) {
  Object.assign(desired, {
    external_google_enabled: true,
    external_google_client_id: "873958636887-2mc27n5cl9pns515q4l8egpng1fiml7s.apps.googleusercontent.com",
    external_google_secret: googleSecret,
  });
}

/**
 * **الدخول بأبل** — كقوقل في البنية، ويفارقها في شيءٍ واحد: سرُّه **رمزٌ ينتهي**
 * (‏JWT موقَّعٌ بمفتاح `.p8`، سقفُه ستّة أشهر عند أبل). يولّده `scripts/apple-secret.mjs`.
 *
 * ولأنّ انتهاءه يقتل الدخول **صامتًا**، يُقرأ تاريخُه هنا قبل الرفع: المنتهي يُردّ، والقريبُ
 * من الانتهاء يُطبع تحذيرُه. فلا يُرفع سرٌّ ميّتٌ ولا يمضي الشهرُ الأخير بلا إنذار.
 */
if (appleSecret) {
  const claims = (() => {
    try { return JSON.parse(Buffer.from(appleSecret.split(".")[1] ?? "", "base64url").toString()); }
    catch { return null; }
  })();
  if (!claims?.exp) {
    console.error("✗ سرُّ أبل ليس رمزًا صالحًا: ولّده بـ`node scripts/apple-secret.mjs` وانسخه كاملًا.");
    process.exit(1);
  }
  const msLeft = claims.exp * 1000 - Date.now();
  const daysLeft = Math.floor(msLeft / 86400000);
  if (msLeft <= 0) {
    // `ceil` للمنقضي لا `floor`: الأخير يجعل يومًا واحدًا «يومين» (تقريبٌ للأسفل في السالب).
    console.error(`✗ سرُّ أبل منتهٍ منذ ${Math.ceil(-msLeft / 86400000)} يومًا — ولّد غيره قبل الرفع.`);
    process.exit(1);
  }
  if (daysLeft <= 30) console.warn(`⚠️  سرُّ أبل ينتهي بعد ${daysLeft} يومًا — جدّده قريبًا.`);

  Object.assign(desired, {
    external_apple_enabled: true,
    external_apple_client_id: "club.adeeb.signin", // Services ID — معرّفٌ لا سرّ
    external_apple_secret: appleSecret,
  });
}

/** أسرارٌ تُقرأ **مقنَّعةً** من الخادم — تُستثنى من الطباعة ومن مقارنة التحقّق (انظر أسفلَه). */
const SECRETS = new Set(["smtp_pass", "external_google_secret", "external_apple_secret", "security_captcha_secret"]);

/** لا يُطبع سرٌّ ولا قالبٌ كامل — المفتاح يُقنَّع، والقالب يُقاس بطولِه. */
const show = (k, v) => {
  if (v == null) return "—";
  // بصمةُ المفتاح (64) تأتي من القراءة، والمفتاحُ نفسُه (36) منّا — فيبدوان مختلفَين أبدًا.
  if (SECRETS.has(k)) return `${String(v).slice(0, 6)}…(${String(v).length} محرفًا${String(v).length === 64 ? " — بصمة" : ""})`;
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
//
// والأسرارُ وحدها تخرج من الفحص (`SECRETS`): القراءةُ تُرجع **بصمةً** لها لا قيمتَها —
// فمقارنتُها بما أرسلناه تفشل دائمًا ولو حُفظت. (وهذا هو الصواب: مفتاحٌ يُقرأ نصًّا مفتاحٌ
// مسروق.) وصحّتُها تُقاس بأثرها: رسالةٌ تصل، وزرُّ قوقل يفتح شاشةَ موافقةٍ لا `invalid_client`.
const after = await call("GET");
const stuck = Object.keys(desired).filter(
  (k) => !SECRETS.has(k) && String(after[k] ?? "") !== String(desired[k]),
);
if (stuck.length) {
  console.error(`\n✗ لم تُحفظ: ${stuck.join(", ")}`);
  process.exit(1);
}
console.log(`\n✅ طُبِّق ${changed.length} حقلًا وتُحقِّق منه بالقراءة.`);
if (!resendKey) console.log("ℹ️  بلا RESEND_API_KEY — إعدادُ SMTP لم يُلمس بعد.");
