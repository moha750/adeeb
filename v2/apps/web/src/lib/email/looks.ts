/**
 * **وجها رسائل أدِيب — للعرض لا للإرسال** (٢٠٢٦-١٠-١٧، مرحلةُ التصميم في `v2/EMAIL-SYSTEM.md`).
 *
 * يُعرَضان جنبًا إلى جنب في `/ui/emails` على كلّ أنواع الدليل بعيّناتها، فيختار محمد بعينه لا بالوصف.
 * والمُرسِلُ لا يقرأ هذا الملفّ: ما زال يلبس الثوبَ المؤقّت في `layout.ts`. فإذا اختير وجهٌ حلّ محلَّ
 * ذاك الثوب في `layout.ts`، وحُذف هذا الملفُّ كلُّه ووجهُه الآخر.
 *
 * **ما يجمعهما** (قيودُ البريد لا ذوقُنا): جداولُ بأنماطٍ مضمَّنة، فـOutlook يُسقط الـflex وكثيرٌ
 * من البرامج يُسقط `<style>`. والتدرّجُ فوق لونٍ صلبٍ يبقى إن سقط. والخطُّ «Lyon Arabic» من موقعنا
 * يظهر في بريد أبل وما يقبل `@font-face`، ويسقط إلى Tahoma في Gmail وOutlook. والصورُ PNG لا SVG،
 * فـGmail لا يعرض SVG. والألوانُ قيمٌ من سلّمَي العلامة في `tokens.css` مكتوبةً حرفًا، فالبريدُ لا
 * يقرأ متغيّراتنا.
 */
import { absoluteUrl, esc, SITE, type EmailContent } from "./layout";

export type Look = "band" | "letter";

export const LOOKS: Record<Look, { name: string; idea: string }> = {
  band: {
    name: "الترويسة",
    idea: "شريطٌ بتدرّج الهويّة في رأس الرسالة يحمل الشعارَ الأبيض، ثمّ بطاقةٌ بيضاء. يُعرَف أنّها من أدِيب قبل أن تُقرأ.",
  },
  letter: {
    name: "الرسالة",
    idea: "ورقةٌ هادئة: خيطُ الهويّة في أعلاها، والشعارُ الملوّن في وسطها، والرمزُ خاناتٌ منفصلة، والريشةُ توقيعٌ في آخرها.",
  },
};

// سلّما العلامة (tokens.css): الكحليّ والفولاذيّ والمحايد.
const C = {
  navy900: "#16263a",
  navy800: "#1e3350",
  navy700: "#274060",
  navy200: "#bcc9dc",
  navy100: "#dde3ed",
  navy50: "#eff2f7",
  steel400: "#5e88ab",
  n50: "#f6f7fa",
  n100: "#eceef2",
  n200: "#dce0e7",
  n500: "#6f7789",
  n600: "#545c6d",
  n700: "#414857",
  bg: "#eef1f6",
  page: "#f5f7fa",
  white: "#ffffff",
};

const FONT = "font-family:'Lyon Arabic',Tahoma,Arial,sans-serif;";
const MONO = "font-family:'Courier New',Courier,monospace;";

/** الخطُّ من موقعنا لمن يقبله، وهوامشُ أضيق على الجوّال لمن يقرأ `<style>`. */
const HEAD_STYLE = `<style>
@font-face{font-family:'Lyon Arabic';font-weight:400 600;src:url(${SITE}/fonts/lyon-arabic-medium.woff2) format('woff2');}
@font-face{font-family:'Lyon Arabic';font-weight:700 900;src:url(${SITE}/fonts/lyon-arabic-bold.woff2) format('woff2');}
@media (max-width:480px){.px{padding-left:22px!important;padding-right:22px!important}.wrap{padding:16px 8px!important}}
</style>`;

const lines = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

function shell(c: EmailContent, bg: string, card: string, after = ""): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title>${HEAD_STYLE}</head>
<body style="margin:0;padding:0;background:${bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};">
<tr><td class="wrap" align="center" style="padding:32px 16px;">
${card}
${after}
</td></tr>
</table>
</body>
</html>`;
}

// ══ الوجه الأوّل: الترويسة ═══════════════════════════════════════════════════

function band(c: EmailContent): string {
  const row = (inner: string, pad: string, style: string, dir = "rtl") =>
    `<tr><td class="px" dir="${dir}" style="padding:${pad};${FONT}text-align:${dir === "rtl" ? "right" : "center"};${style}">${inner}</td></tr>`;

  const paras = c.paragraphs
    .filter((p) => p.trim())
    .map((p) => row(lines(p), "10px 36px 0", `color:${C.n600};font-size:16px;line-height:1.9;`))
    .join("");
  const quote = c.quote
    ? `<tr><td class="px" dir="rtl" style="padding:20px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.n50};border-right:3px solid ${C.steel400};border-radius:8px;"><tr><td dir="rtl" style="padding:14px 18px;${FONT}text-align:right;"><div style="color:${C.n500};font-size:12px;margin-bottom:6px;">${esc(c.quote.label)}</div><div style="color:${C.n700};font-size:15px;line-height:1.8;">${lines(c.quote.text)}</div></td></tr></table></td></tr>`
    : "";
  const code = c.code
    ? `<tr><td class="px" dir="ltr" align="center" style="padding:22px 36px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background:${C.navy50};border:1px solid ${C.navy100};border-radius:14px;"><tr><td style="padding:16px 28px;${MONO}font-size:32px;font-weight:bold;letter-spacing:10px;color:${C.navy700};">${esc(c.code)}</td></tr></table></td></tr>`
    : "";
  const cta = c.cta
    ? `<tr><td class="px" dir="rtl" style="padding:26px 36px 0;text-align:right;"><a href="${esc(absoluteUrl(c.cta.href))}" style="display:inline-block;background:${C.navy700};background-image:linear-gradient(135deg,${C.steel400},${C.navy800});color:${C.white};text-decoration:none;${FONT}font-size:16px;font-weight:bold;padding:14px 30px;border-radius:12px;">${esc(c.cta.label)}</a></td></tr>`
    : "";
  const note = c.note
    ? row(`<div style="border-top:1px solid ${C.n100};padding-top:16px;">${esc(c.note)}</div>`, "26px 36px 0", `color:${C.n500};font-size:13px;line-height:1.8;`)
    : "";
  const signature = c.signature
    ? row(lines(c.signature), "24px 36px 0", `color:${C.navy700};font-size:15px;font-weight:bold;line-height:1.8;`)
    : "";

  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.white};border-radius:18px;border:1px solid ${C.n200};overflow:hidden;">
<tr><td class="px" dir="rtl" align="right" style="background:${C.navy700};background-image:linear-gradient(135deg,${C.steel400},${C.navy800});padding:24px 36px;border-radius:18px 18px 0 0;"><img src="${SITE}/brand/logo-horizontal-white.png" width="94" height="55" alt="نادي أدِيب" style="display:block;border:0;outline:none;width:94px;height:55px;"></td></tr>
${row(esc(c.title), "30px 36px 2px", `color:${C.navy900};font-size:22px;line-height:1.6;font-weight:bold;`)}
${paras}${quote}${code}${cta}${note}${signature}
<tr><td style="height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;

  const footer = `<p dir="rtl" style="margin:18px 0 0;${FONT}font-size:12px;line-height:1.9;color:${C.n500};text-align:center;">نادي أدِيب، جامعة الملك فيصل<br>وصلتك هذه الرسالة من بوّابة النادي: <a href="${SITE}" style="color:${C.navy700};text-decoration:none;">adeeb.club</a></p>`;

  return shell(c, C.bg, card, footer);
}

// ══ الوجه الثاني: الرسالة ════════════════════════════════════════════════════

/** الرمزُ خاناتٌ منفصلة: يُقرأ رقمًا رقمًا ولا يلتبس. */
function codeCells(code: string): string {
  const cells = [...code]
    .map(
      (ch) =>
        `<td style="padding:0 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="42" height="54" style="width:42px;height:54px;border:1px solid ${C.navy200};border-radius:10px;background:${C.white};${MONO}font-size:28px;font-weight:bold;color:${C.navy700};">${esc(ch)}</td></tr></table></td>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" dir="ltr"><tr>${cells}</tr></table>`;
}

function letter(c: EmailContent): string {
  const row = (inner: string, pad: string, style: string, align: "right" | "center" = "right") =>
    `<tr><td class="px" dir="rtl" align="${align}" style="padding:${pad};${FONT}text-align:${align};${style}">${inner}</td></tr>`;

  const paras = c.paragraphs
    .filter((p) => p.trim())
    .map((p) => row(lines(p), "12px 44px 0", `color:${C.n700};font-size:16.5px;line-height:2;`))
    .join("");
  const quote = c.quote
    ? row(
        `<div style="border-top:1px solid ${C.n200};border-bottom:1px solid ${C.n200};padding:14px 0;"><div style="color:${C.n500};font-size:12px;margin-bottom:6px;">${esc(c.quote.label)}</div><div style="color:${C.n600};font-size:15px;line-height:1.9;">${lines(c.quote.text)}</div></div>`,
        "22px 44px 0",
        "",
      )
    : "";
  const code = c.code
    ? `<tr><td class="px" align="center" style="padding:26px 30px 6px;">${codeCells(c.code)}</td></tr>`
    : "";
  const cta = c.cta
    ? `<tr><td class="px" align="center" style="padding:30px 44px 0;"><a href="${esc(absoluteUrl(c.cta.href))}" style="display:inline-block;background:${C.navy700};color:${C.white};text-decoration:none;${FONT}font-size:16px;font-weight:bold;padding:14px 38px;border-radius:10px;">${esc(c.cta.label)}</a></td></tr>`
    : "";
  const note = c.note
    ? row(esc(c.note), "20px 44px 0", `color:${C.n500};font-size:13px;line-height:1.9;`, "center")
    : "";
  const signature = c.signature
    ? row(lines(c.signature), "28px 44px 0", `color:${C.navy700};font-size:15.5px;font-weight:bold;line-height:1.9;`)
    : "";

  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.white};border-radius:6px;border:1px solid ${C.n200};">
<tr><td style="height:5px;background:${C.navy700};background-image:linear-gradient(90deg,${C.navy800},${C.steel400});border-radius:6px 6px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:34px 44px 6px;"><img src="${SITE}/brand/logo-horizontal.png" width="116" height="68" alt="نادي أدِيب" style="display:block;border:0;outline:none;width:116px;height:68px;"></td></tr>
${row(esc(c.title), "22px 44px 4px", `color:${C.navy900};font-size:24px;line-height:1.6;font-weight:bold;`, "center")}
${paras}${quote}${code}${cta}${note}${signature}
<tr><td align="center" style="padding:34px 44px 0;"><img src="${SITE}/brand/quill-96.png" width="24" height="31" alt="" style="display:block;border:0;width:24px;height:31px;"></td></tr>
${row(`نادي أدِيب، جامعة الملك فيصل<br><a href="${SITE}" style="color:${C.navy700};text-decoration:none;">adeeb.club</a>`, "10px 44px 30px", `color:${C.n500};font-size:12px;line-height:1.9;`, "center")}
</table>`;

  return shell(c, C.page, card);
}

/**
 * **بأيّ خطٍّ تُقرأ** — البريدُ لا يضمن خطَّنا، فالمعرضُ يُري الرسالةَ بما يحلّ محلَّه (طلب محمد ٢٠٢٦-١٠-١٧:
 * «أريد أن أرى الخطّ الذي سيُعرَض»). والرسالةُ المُرسَلة واحدةٌ في الثلاثة، والفرقُ في برنامج القارئ:
 * - `adeeb`: يقبل `@font-face` (بريدُ أبل): خطُّ أدِيب.
 * - `desktop`: يُسقطه وعلى الجهاز Tahoma (Gmail في متصفّح الحاسوب): Tahoma.
 * - `phone`: يُسقطه ولا Tahoma على الجهاز (تطبيقُ Gmail على الآيفون): خطُّ النظام العربيّ. ويُحاكى هنا
 *   بـ`system-ui`، فهو على الآيفون والماك خطُّ النظام نفسُه. وعلى أندرويد خطٌّ آخر (Noto) لا يُحاكى.
 */
export type FontView = "adeeb" | "desktop" | "phone";

export function renderLook(c: EmailContent, look: Look, font: FontView = "adeeb"): string {
  const html = look === "band" ? band(c) : letter(c);
  if (font === "adeeb") return html;
  const bare = html.replace(/@font-face\{[^}]*\}\n?/g, "");
  return font === "desktop"
    ? bare.replaceAll("'Lyon Arabic',", "")
    : bare.replaceAll("'Lyon Arabic',Tahoma,Arial,", "system-ui,");
}
