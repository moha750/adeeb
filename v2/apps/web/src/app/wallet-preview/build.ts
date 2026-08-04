import "server-only";

import { createHash } from "node:crypto";
import { signDetached } from "./cms";
import { GOAL, type DemoMember } from "./demo";
import { passJson } from "./pass";
import { brandIcon, stampStrip } from "./png";
import { authTokenFor } from "./store";
import { zip, type ZipEntry } from "./zip";

/**
 * بناءُ الحزمة الموقَّعة — **مصدرٌ واحدٌ لمَخرَجين**: زرُّ التنزيل في الصفحة، وخدمةُ الويب
 * التي يسألها الجهاز عن نسخةٍ محدَّثة.
 *
 * استُخرج إلى هنا يوم صار للبطاقة بابان. ولو بقي في مسار التنزيل لَنُسخ في الثاني، ثمّ
 * افترقا يومًا في تفصيلٍ صغير — فتخرج بطاقةُ التنزيل غيرَ بطاقة التحديث وهما بطاقةٌ واحدة.
 */

/** متغيّرات البيئة الخمسة، ووصفُ كلٍّ منها كما يُعرَض عند نقصانه. */
export const ENV = {
  WALLET_PASS_TYPE_ID: "معرّف نوع البطاقة (pass.club.adeeb.…) من بوّابة أبل",
  WALLET_TEAM_ID: "معرّف الفريق (Team ID) — عشرة محارف",
  WALLET_PASS_CERT_PEM: "شهادة Pass Type ID بصيغة PEM",
  WALLET_PASS_KEY_PEM: "المفتاح الخاصّ للشهادة بصيغة PEM",
  WALLET_WWDR_PEM: "شهادة أبل الوسيطة WWDR (G4) بصيغة PEM",
} as const;

/** ما ينقص من البيئة — فارغةٌ يعني أنّ التوقيع ممكن. */
export const missingEnv = (): { name: string; need: string }[] =>
  Object.keys(ENV)
    .filter((k) => !process.env[k])
    .map((k) => ({ name: k, need: ENV[k as keyof typeof ENV] }));

/**
 * يقرأ مفتاحًا/شهادةً من البيئة **ويردّ `\n` النصّيّة إلى أسطرٍ حقيقيّة**.
 *
 * PEM أسطرٌ متعدّدة، وأكثرُ من يلصقه في متغيّر بيئة يلصقه سطرًا واحدًا فيه `\n` مكتوبةً
 * حرفين. وتنقيةُ المسافات في `pemToDer` لا تُزيلهما (الشرطةُ المائلة ليست فراغًا)، فتدخل
 * في base64 فيخرج DER مشوَّهًا — والرسالة عندها تقول «الشهادة غير مقروءة» ولا تقول لماذا.
 */
export const pem = (v: string): string => v.replace(/\\n/g, "\n");

/** عنوانُ خدمة التحديث الذي يُكتب في البطاقة — انظر `passJson`. */
export const webServiceUrl = (origin: string): string => `${origin}/wallet-preview/w`;

/**
 * الشعار من أصول الموقع نفسها **عبر HTTP لا `fs`**: ملفّات `public` ليست مضمونةَ الوجود
 * داخل حزمة الدالّة على الخادم، بينما الأصلُ مخدومٌ من الشبكة قطعًا. وغيابُه لا يُسقط
 * الحزمة — تُعنوَن البطاقة بـ`logoText` بدلًا منه.
 */
async function fetchLogo(origin: string): Promise<Buffer | null> {
  try {
    const res = await fetch(new URL("/brand/logo-horizontal-white.png", origin), { cache: "no-store" });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * يبني `.pkpass` موقَّعًا لعضوٍ بحالته الراهنة.
 *
 * @param origin أصلُ الطلب — يُشتقّ منه الشعارُ وعنوانُ خدمة التحديث، فتعمل الحزمة في
 *               التطوير والإنتاج بلا عنوانٍ محفور.
 * @throws إن تعذّر التوقيع (شهادةٌ ناقصةٌ أو معطوبة) — والمستدعي يترجمه إلى ردّ.
 */
export async function buildPkpass(member: DemoMember, origin: string): Promise<Buffer> {
  const logo = await fetchLogo(origin);

  const files: ZipEntry[] = [
    {
      name: "pass.json",
      data: Buffer.from(
        JSON.stringify(
          passJson(member, {
            passTypeIdentifier: process.env.WALLET_PASS_TYPE_ID!,
            teamIdentifier: process.env.WALLET_TEAM_ID!,
            hasLogo: logo !== null,
            webServiceURL: webServiceUrl(origin),
            authenticationToken: authTokenFor(member.serial),
          }),
          null,
          2,
        ),
        "utf8",
      ),
    },
    // الأيقونة **إلزاميّة** في المواصفة: ٢٩ نقطةً، ومضاعفاها لشاشات الشبكيّة.
    // **و`@3x` ليست ترفًا**: أيفونات الـPro شاشتُها ثلاثيّة، وبدونها يُكبّر iOS `@2x`
    // فتخرج العلامةُ رخوةً في الإشعار — وهو أكثرُ موضعٍ تُرى فيه.
    { name: "icon.png", data: brandIcon(29) },
    { name: "icon@2x.png", data: brandIcon(58) },
    { name: "icon@3x.png", data: brandIcon(87) },
    // شريط الأختام — 375×144 ومضاعفُه، كما تشترط أبل لبطاقة المتجر.
    { name: "strip.png", data: stampStrip(member.stamps, GOAL, 375) },
    { name: "strip@2x.png", data: stampStrip(member.stamps, GOAL, 750) },
  ];

  if (logo) files.push({ name: "logo.png", data: logo }, { name: "logo@2x.png", data: logo });

  const manifest = Object.fromEntries(files.map((f) => [f.name, createHash("sha1").update(f.data).digest("hex")]));
  const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");

  const signature = signDetached(manifestBuf, {
    certPem: pem(process.env.WALLET_PASS_CERT_PEM!),
    keyPem: pem(process.env.WALLET_PASS_KEY_PEM!),
    keyPassphrase: process.env.WALLET_PASS_KEY_PASSPHRASE,
    wwdrPem: pem(process.env.WALLET_WWDR_PEM!),
  });

  return zip([...files, { name: "manifest.json", data: manifestBuf }, { name: "signature", data: signature }]);
}
