/**
 * شهادة الخبرة — تُرسَم على قالب المالك وتُنزَّل PNG. عميليّ حصرًا (يمسّ DOM).
 *
 * **قالبان لا قالب** (قرار المالك): `certificate-template-male.png` ·
 * `certificate-template-female.png` — ورقتان عرضيّتان 3508×2480 (A4 عرضيّ بـ300dpi) فيهما
 * الزخرفةُ والعنوانُ المخطوط والمسطرتان والتواقيع، **ومعها الثابتُ من النصّ مطبوعًا**:
 * البيتان والدعاء. وإنّما طُبعا لأنّ البيتين في ورقة المالك **ممدودان بالكشيدة** — تنسيقُ
 * فوتوشوب لا يرسمه المتصفّح. فبقيت يدُ المصمّم على الفنّ، وبقي للبرنامج ما يحمل البيانات.
 *
 * فما نرسمه ثلاثةُ أسطر لا ستّة: **المسمّى · الاسم · الفترة**.
 *
 * **والمواضع مقيسةٌ على بكسلات القالب لا مقدَّرةٌ بالعين** (مسحُ صفوفٍ بحثًا عن الحبر):
 * العنوان ينتهي عند y=632 · المسطرة الأولى (سطر الاسم) y=1376 وتمتدّ x من 535 إلى 2974 ·
 * المسطرة الثانية y=1835 · التواقيع تبدأ y=1901 · وبياضُ الورقة بين الزخرفتين x من 311
 * إلى 3183. ومركزُ المسطرتين 1754 وهو مركز الصفحة.
 *
 * والرسم نفسه ليس هنا: `lib/paper.ts` — هذا يقول **ماذا وأين**، وذاك يقول **كيف**.
 */
import { downloadBlob } from "@/lib/download";
import { imagePdf, A4_LANDSCAPE } from "@/lib/pdf";
import { openPaper, sealPaper, fitSize, WEIGHTS, type PageSize, type Piece } from "@/lib/paper";
import { stampQr } from "@/lib/qr";
import { period, testimony, verifyLine, verifyUrl, QR_CAPTION, type Certificate } from "./text";

const PAGE: PageSize = { w: 3508, h: 2480 };

/** القالب يتبع صاحبه — وبلا جنسٍ مسجَّل يخرج بالمذكَّر (كما يفعل نصُّ `text.ts`). */
const templateFor = (c: Certificate): string =>
  `/brand/certificate-template-${c.gender === "female" ? "female" : "male"}.png`;

/** مركزُ الورقة — ومركزُ المسطرتين المقيستين معًا. */
const CENTER = 1754;

/**
 * أقصى عرضٍ للسطر. بياضُ الورقة 311..3183، ونترك على كلّ جانبٍ فسحةً عن الزخرفة فلا
 * يكاد الحرفُ يلمسها.
 */
const MAXW = 2620;

/**
 * **الحبر من القالب نفسه لا من الذاكرة**: مقيسٌ من زخرفته (`#2a4968`). فإن بدّل المالك
 * درجةَ الكحليّ يومًا، تُعاد القياسةُ ويُغيَّر هذا الرقم وحده.
 */
const INK = "#2a4968";

/**
 * الأسطر الثلاثة الحاملةُ للبيانات: خطُّ القاعدة والمقاس والوزن — مقيسةٌ على ورقة المالك
 * المعبّأة. والاسمُ يجلس فوق المسطرة الأولى (1376) لا عليها.
 *
 * و**`min`** أدنى مقاسٍ يُقبل حين يطول السطر (مسمًّى طويل أو اسمٌ رباعيّ): يُضغط ولا يطفح.
 *
 * (والبيتان عند y=842 و962، والدعاء عند y=1666 — مطبوعةٌ في القالبين، ومواضعُها هذه
 * مكتوبةٌ هنا تعليقًا لا رسمًا: من أعاد تصدير القالب أجلسها حيث كانت.)
 */
const LINES = {
  testimony: { y: 1166, size: 74, weight: WEIGHTS.bold, min: 48 },
  name: { y: 1350, size: 115, weight: WEIGHTS.bold, min: 70 },
  period: { y: 1566, size: 66, weight: WEIGHTS.body, min: 48 },
} as const;

/**
 * سطرُ الرقم المرجعيّ — صغيرٌ باهتٌ **متوسَّطٌ بين الدعاء والمسطرة الثانية**. يُقرأ بالعين
 * ويُكتب باليد إن تعذّر مسحُ الباركود.
 */
const VERIFY = { y: 1772, size: 30, color: "rgba(42,73,104,.62)" } as const;

/**
 * **باركود التحقّق** — يفتح صفحة التحقّق بالرقم مملوءًا. وطبعُ العنوان نصًّا قبيحٌ في وثيقةٍ
 * رسميّة (قرار المالك)، فالمربّعُ يقول ما كان يقوله السطر.
 *
 * **وموضعُه مقيسٌ لا مختار**: مُسِح القالبُ بمربّعٍ منزلق بحثًا عن رقعةٍ خاليةٍ تسعه بهامشها،
 * فكانت الزاوية اليسرى السفلى **خالصةً** (أغمق بكسل فيها 155 — ورقٌ لا حبر)، بينما اليمنى
 * فيها أثرُ توقيع. وما بين المسطرة (1835) وكتلة التواقيع (1899) لا يسع مربّعًا.
 */
const QR = { x: 400, y: 1930, size: 300, caption: { y: 2288, size: 26 } } as const;

/** يبني الشهادة ويعيدها Blob (PNG افتراضًا، وJPEG لِما يُدرَج في PDF). */
export async function renderCertificate(
  c: Certificate,
  type: "image/png" | "image/jpeg" = "image/png",
): Promise<Blob> {
  const ctx = await openPaper(templateFor(c), PAGE);

  const rows: [string, keyof typeof LINES][] = [
    [testimony(c), "testimony"],
    [c.name.trim(), "name"],
    [period(c), "period"],
  ];

  const pieces: Piece[] = rows.map(([text, key]) => {
    const l = LINES[key];
    return {
      text,
      x: CENTER,
      y: l.y,
      // القياس بـcanvas أضيقُ من المرسوم (لا مدّ فيه)، فنضيّق الحدَّ احتياطًا لا نوسّعه
      size: fitSize(ctx, text, MAXW * 0.86, l.size, l.weight, l.min),
      weight: l.weight,
      color: INK,
      anchor: "middle",
    };
  });

  // بلا رقمٍ لا تحقّق — والمعاينة عيّنةٌ لا سجلّ، فتخرج بلا رقمٍ ولا باركود
  const serial = c.serial?.trim();
  if (serial) {
    // ختمٌ عاريًا من الزينة عمدًا: مربّعاتٌ حادّة بحبر القالب على أرضيّةٍ بيضاء. الوثيقةُ
    // الرسميّة ليست ملصقًا — والراسم واحدٌ مع المحرّر، والمواصفةُ وحدها تفترق.
    await stampQr(
      ctx,
      {
        text: verifyUrl(serial),
        size: QR.size,
        dots: { shape: "square", paint: { kind: "solid", color: INK } },
        bg: "#ffffff",
      },
      QR.x,
      QR.y,
    );
    pieces.push(
      { text: verifyLine(serial), x: CENTER, y: VERIFY.y, size: VERIFY.size, weight: WEIGHTS.body, color: VERIFY.color, anchor: "middle" },
      {
        text: QR_CAPTION,
        x: QR.x + QR.size / 2,
        y: QR.caption.y,
        size: QR.caption.size,
        weight: WEIGHTS.body,
        color: VERIFY.color,
        anchor: "middle",
      },
    );
  }

  return await sealPaper(ctx, pieces, PAGE, type);
}

/** يولّد الشهادة ويُنزّلها ملفَّ PNG باسم صاحبها. */
export async function downloadCertificate(c: Certificate): Promise<void> {
  const blob = await renderCertificate(c);
  downloadBlob(blob, `شهادة خبرة - ${c.name || "عضو"}.png`);
}

/**
 * ويُنزّلها PDF — وهي صيغةُ الوثائق التي تُرفَق بسيرةٍ ذاتيّة أو تُرسَل لجهة عمل:
 * صفحةٌ واحدة A4 عرضيّ تحمل الورقة نفسها، فلا يُعاد رسمُها ولا يختلف مضمونها.
 */
export async function downloadCertificatePdf(c: Certificate): Promise<void> {
  const jpeg = await renderCertificate(c, "image/jpeg");
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  downloadBlob(imagePdf(bytes, { w: PAGE.w, h: PAGE.h }, A4_LANDSCAPE), `شهادة خبرة - ${c.name || "عضو"}.pdf`);
}
