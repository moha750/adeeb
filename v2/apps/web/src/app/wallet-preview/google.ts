import "server-only";

import { createSign } from "node:crypto";
import {
  CATALOG,
  GOAL,
  isComplete,
  type Mode,
  nextReward,
  num,
  pointsStatusText,
  REWARD,
  serialFor,
  statusText,
  type DemoMember,
} from "./demo";

/**
 * **بطاقةُ أندرويد — Google Wallet**، وهي بابٌ آخر لا نسخةٌ من باب أبل. والفروقُ جوهريّة
 * لا شكليّة، وكلُّ تصميمٍ هنا مبنيٌّ عليها:
 *
 * | | Apple Wallet | Google Wallet |
 * |---|---|---|
 * | **التسليم** | ملفٌّ موقَّع (`.pkpass`) يُحمَّل | **رابطٌ موقَّع** (JWT) يفتح المحفظة |
 * | **الحالة** | في ملفّنا، والجهازُ يجلبها | **في خوادم قوقل**، ننادي REST لنغيّرها |
 * | **التحديث** | دفعةٌ صامتة ثمّ يجلب الجهاز | `PATCH` على الكائن، وقوقل تُبلّغ |
 * | **السطح** | صورةُ شريطٍ نرسمها | صورةُ واجهة (`heroImage`) نرسمها |
 * | **الاعتماد** | شهادةُ Pass Type ID | حسابُ مُصدِرٍ + مفتاحُ حساب خدمة |
 *
 * **والحالةُ عند قوقل لا عندنا** — وهذا أهمُّ فرق: هناك يُنشَأ الكائنُ مرّةً ثمّ يُعدَّل،
 * فبطاقتُنا في القاعدة تبقى الحقيقةَ عندنا ونحن نُزامنها إليهم. ولو تعذّر النداء بقيت
 * بطاقةُ الجوّال متقادمةً بلا أن تدري — بخلاف أبل حيث الجهازُ يسأل بنفسه.
 *
 * ### ما يلزم من بيانات الاعتماد
 *
 * ثلاثةٌ لا تُنشَأ إلّا من حساب المالك في قوقل (انظر `GOOGLE_ENV`)، والبابُ **معطَّلٌ
 * بدونها** يردّ ٥٠٣ يسمّي الناقصَ — كما فعلنا في شهادة أبل.
 *
 * > **وطورُ العرض (Demo mode) قيدٌ حقيقيّ يُعلَن ولا يُكتشَف**: حسابُ المُصدِر الجديد لا
 * > يستطيع إصدارَ بطاقاتٍ إلّا لحسابات المُدراء والمطوّرين و**حساباتِ الاختبار المضافة
 * > صراحةً** في لوحة قوقل. فبطاقتُك تعمل في جوّالك، ولا تعمل في جوّال راعٍ حتى يُضاف
 * > حسابُه أو يُمنَح المشروعُ إذنَ النشر.
 */

/* ── بيانات الاعتماد ────────────────────────────────────────────────────── */

/** متغيّرات البيئة الثلاثة، ووصفُ كلٍّ منها كما يُعرَض عند نقصانه. */
export const GOOGLE_ENV = {
  GOOGLE_WALLET_ISSUER_ID: "معرّف حساب المُصدِر (رقمٌ طويل) من لوحة Google Pay & Wallet",
  GOOGLE_WALLET_SA_EMAIL: "بريد حساب الخدمة (…@….iam.gserviceaccount.com)",
  GOOGLE_WALLET_SA_KEY: "المفتاح الخاصّ لحساب الخدمة بصيغة PEM (حقل private_key في ملفّ JSON)",
} as const;

/** ما ينقص من البيئة — فارغةٌ يعني أنّ التوقيع ممكن. */
export const missingGoogleEnv = (): { name: string; need: string }[] =>
  Object.keys(GOOGLE_ENV)
    .filter((k) => !process.env[k])
    .map((k) => ({ name: k, need: GOOGLE_ENV[k as keyof typeof GOOGLE_ENV] }));

/** يردّ `\n` النصّيّة إلى أسطرٍ حقيقيّة — مفتاحُ حساب الخدمة يُلصَق سطرًا واحدًا غالبًا. */
const pem = (v: string): string => v.replace(/\\n/g, "\n");

/* ── التوقيع ────────────────────────────────────────────────────────────── */

/** base64url — بلا حشوٍ ولا محارفَ تحتاج ترميزًا في رابط. */
const b64u = (b: Buffer): string => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * **يوقّع JWT بـRS256 بلا حزمة** — `node:crypto` يعرف `RSA-SHA256` والمفتاحُ PEM، فلا
 * حاجة إلى `jsonwebtoken` ولا `google-auth-library`. (نسقُ `cms.ts` نفسُه: نكتب المعيار
 * بأيدينا ولا نجرّ شجرةَ تبعيّاتٍ لأجل دالّتين.)
 */
export function signJwt(claims: Record<string, unknown>): string {
  const head = b64u(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" }), "utf8"));
  const body = b64u(Buffer.from(JSON.stringify(claims), "utf8"));
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${body}`);
  return `${head}.${body}.${b64u(signer.sign(pem(process.env.GOOGLE_WALLET_SA_KEY!)))}`;
}

/* ── الصنف والكائن ──────────────────────────────────────────────────────── */

/** لونُ البطاقة عند قوقل — كحليُّ الهوية نفسُه الذي عليه بطاقةُ أبل (`--navy-700`). */
const HEX_BACKGROUND = "#274060";

/** معرّفُ الصنف: `<المُصدِر>.<لاحقة>` — لاحقةٌ لكلّ نظام، فالصنفان يختلفان اسمًا وحقولًا. */
export const classIdFor = (mode: Mode): string =>
  `${process.env.GOOGLE_WALLET_ISSUER_ID}.adeeb_preview_${mode}`;

/** معرّفُ الكائن: `<المُصدِر>.<رقم البطاقة>` — والنقطةُ فاصلٌ، فتُنقّى من الرقم. */
export const objectIdFor = (serial: string): string =>
  `${process.env.GOOGLE_WALLET_ISSUER_ID}.${serial.replace(/[^\w.-]/g, "_")}`;

/**
 * **صنفُ البطاقة** — القالبُ المشترك بين كلّ بطاقات النظام الواحد: اسمُ البرنامج وشعارُه
 * ولونُه. يُنشَأ مرّةً ويُعاد استعمالُه، ولذلك لا يحمل شيئًا يخصّ عضوًا بعينه.
 *
 * **و`reviewStatus` يبقى `underReview`**: الصنفُ في حالة `draft` **لا تُنشَأ منه كائنات**
 * أصلًا، فبطاقةٌ بمسوّدةِ صنفٍ لا تُحفَظ في المحفظة. وهذا يخصّ حالةَ الصنف لا إذنَ النشر
 * (ذاك قرارٌ من قوقل على الحساب كلِّه — انظر طورَ العرض في رأس الملفّ).
 */
export function loyaltyClass(mode: Mode, origin: string): Record<string, unknown> {
  return {
    id: classIdFor(mode),
    issuerName: "نادي أَدِيب",
    programName: mode === "points" ? "نقاط أَدِيب" : "بطاقة ولاء أَدِيب",
    reviewStatus: "underReview",
    hexBackgroundColor: HEX_BACKGROUND,
    programLogo: image(`${origin}/wallet-preview/icon`, "شعار نادي أَدِيب"),
    // بابُ الرمز في وجه البطاقة — لا يُترَك لقوقل تختار له عنوانًا
    homepageUri: link(`${origin}/wallet-preview`, "معاينة البطاقة"),
  };
}

/** صورةٌ بصيغة قوقل — رابطٌ ووصفٌ مترجَم، وهي بنيةٌ متكرّرةٌ فتُكتب مرّةً. */
const image = (uri: string, description: string) => ({
  sourceUri: { uri },
  contentDescription: { defaultValue: { language: "ar", value: description } },
});

/** رابطٌ بصيغة قوقل. */
const link = (uri: string, description: string) => ({
  uri,
  description,
  id: "home",
});

/** نصٌّ مترجَمٌ بصيغة قوقل — كلُّ نصٍّ يُعرَض يمرّ به، فلا يُنسى وسمُ اللغة. */
const t = (value: string) => ({ defaultValue: { language: "ar", value } });

/**
 * **كائنُ البطاقة** — بطاقةُ عضوٍ بعينه: رصيدُه وحقولُه وباركودُه وصورةُ واجهته.
 *
 * **وصورةُ الواجهة تحمل الحالة في رابطها** (`hero?stamps=7`): قوقل تجلب الصورةَ من
 * الرابط، فلو ثبت الرابطُ لَثبتت الصورةُ في مخزنها ولم تتبع الأختام. والرابطُ المتغيّر
 * يجعل كلَّ حالةٍ صورةً مستقلّةً بذاتها.
 *
 * **والحقولُ نصوصٌ لا خانات**: قوقل لا تعرف «حقلًا ثانويًّا» و«مساعدًا» كأبل، بل صفوفَ
 * نصوصٍ (`textModulesData`). فما كان على وجه بطاقة أبل يُعاد ترتيبُه هنا لا يُنسَخ.
 */
export function loyaltyObject(m: DemoMember, mode: Mode, origin: string): Record<string, unknown> {
  const serial = serialFor(m, mode);
  const points = mode === "points";
  const next = nextReward(m.points);

  return {
    id: objectIdFor(serial),
    classId: classIdFor(mode),
    state: "ACTIVE",
    accountName: m.name,
    accountId: serial,

    // العدّادُ في موضعه الطبيعيّ عند قوقل — حقلٌ تعرفه بطاقةُ الولاء بذاتها
    loyaltyPoints: {
      label: points ? "النقاط" : "المشاركات",
      balance: { string: points ? num(m.points) : `${num(m.stamps)} / ${num(GOAL)}` },
    },

    heroImage: image(
      points
        ? `${origin}/wallet-preview/hero?points=${m.points}`
        : `${origin}/wallet-preview/hero?stamps=${m.stamps}`,
      points ? `رصيدك ${num(m.points)} نقطة` : `${num(m.stamps)} من ${num(GOAL)} مشاركات`,
    ),

    barcode: {
      type: "QR_CODE",
      value: `${origin}/wallet-preview/card/${serial}`,
      alternateText: serial,
    },

    textModulesData: [
      { id: "status", header: "الحالة", body: points ? pointsStatusText(m.points) : statusText(m.stamps) },
      { id: "unit", header: "القسم واللجنة", body: `${m.department} · ${m.committee}` },
      points
        ? {
            id: "store",
            header: "متجر المكافآت",
            body: CATALOG.map((r) => `${m.points >= r.cost ? "✓" : "·"} ${num(r.cost)} — ${r.title}`).join(" · "),
          }
        : { id: "reward", header: `مكافأة ${REWARD.sponsor}`, body: REWARD.title },
      points
        ? { id: "next", header: "المحطّة التالية", body: next ? `${next.title} · ${num(next.cost)} نقطة` : "بلغتَ أعلى السُّلَّم" }
        : { id: "cycles", header: "بطاقاتٌ أكملتَها", body: num(m.cycles) },
      {
        id: "notice",
        header: "تنبيه",
        body: "هذه بطاقةُ معاينةٍ ببياناتٍ وهميّة، صدرت لتجربة النظام قبل إقراره. لا تُخوّل حاملَها شيئًا.",
      },
    ],

    // **الرسالةُ هي إشعارُ قوقل** — نظيرةُ `changeMessage` عند أبل، تُضاف عند كلّ تغيير
    // (انظر `patchObject`). ولا تُوضَع هنا عند الإنشاء: بطاقةٌ تُضاف فتُشعِر فورًا عبثٌ.
    messages: [],

    // نصوصٌ تحتاجها قوقل صراحةً وإلّا كتبت من عندها
    localizedIssuerName: t("نادي أَدِيب"),
    ...(points ? {} : { secondaryLoyaltyPoints: { label: "أكملها", balance: { string: num(m.cycles) } } }),
    validTimeInterval: undefined,
  };
}

/**
 * **رابطُ «أضِف إلى Google Wallet»** — JWT موقَّعٌ يحمل الصنفَ والكائنَ معًا، فتُنشئهما
 * قوقل عند أوّل حفظٍ ولا يلزم نداءُ REST قبله.
 *
 * `origins` **شرطُ قبولٍ لا زينة**: قوقل ترفض الحفظ من نطاقٍ لم يُذكر فيه.
 */
export function saveUrl(m: DemoMember, mode: Mode, origin: string): string {
  const jwt = signJwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [new URL(origin).host],
    payload: {
      loyaltyClasses: [loyaltyClass(mode, origin)],
      loyaltyObjects: [loyaltyObject(m, mode, origin)],
    },
  });
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

/* ── التحديث ────────────────────────────────────────────────────────────── */

/**
 * **رمزُ وصولٍ من حساب الخدمة** — تدفّق `JWT bearer`: نوقّع ادّعاءً بمفتاحنا فتبادلنا به
 * قوقل رمزًا صالحًا ساعة. (لا `google-auth-library`؛ النداءان اللذان نحتاجهما أقصرُ من
 * تبعيّةٍ كاملة.)
 */
async function accessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string };
  return body.access_token ?? null;
}

/** خلاصةُ محاولةِ التحديث — تُعرَض كما هي، فالنداءُ البعيد لا يُصدَّق بلا خبر. */
export type GoogleSync = { ok: boolean; status: number; reason?: string };

/**
 * **يزامن بطاقةَ قوقل** بعد كلّ تغييرٍ عندنا: `PATCH` على الكائن بالحالة الجديدة ورسالةٍ
 * تُشعِر صاحبَها.
 *
 * **و٤٠٤ ليست عطلًا هنا**: الكائنُ لا يُنشَأ إلّا حين يحفظ العضوُ البطاقةَ فعلًا، فبطاقةٌ
 * لم تُضَف بعدُ ليس لها كائنٌ يُعدَّل — تُقال ولا تُعامَل معاملةَ الخطأ.
 */
export async function patchObject(m: DemoMember, mode: Mode, origin: string): Promise<GoogleSync> {
  if (missingGoogleEnv().length > 0) return { ok: false, status: 0, reason: "لم تُضبَط بيانات قوقل" };

  const token = await accessToken();
  if (!token) return { ok: false, status: 0, reason: "تعذّر الحصول على رمز وصول" };

  const serial = serialFor(m, mode);
  const body = loyaltyObject(m, mode, origin);
  const points = mode === "points";

  // الرسالةُ نظيرةُ `changeMessage` عند أبل — تُصاغ للحظتها لا تُعمَّم
  body.messages = [
    {
      header: "نادي أَدِيب",
      body: points
        ? `رصيدك ${num(m.points)} نقطة`
        : isComplete(m.stamps)
          ? "أكملت مُشاركاتك🥳 مكافأتك في انتظارك"
          : `مبروك! حصدت مُشاركة جديدة🥳 مُشاركاتك ${num(m.stamps)}`,
      id: `s-${Date.now()}`,
      messageType: "TEXT",
    },
  ];

  const res = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectIdFor(serial)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 404) return { ok: false, status: 404, reason: "لم تُضَف هذه البطاقة إلى محفظة قوقل بعد" };
  if (!res.ok) return { ok: false, status: res.status, reason: (await res.text()).slice(0, 120) };
  return { ok: true, status: res.status };
}
