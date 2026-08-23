import { color } from "@adeeb/design-system/tokens";
import type { DotShape, EyeShape, QrSpec } from "@/lib/qr";

/**
 * **مفرداتُ رسم الرمز — مصدرٌ واحد.**
 *
 * يقرؤها بابان: **بابُ الإنشاء** (`new`) الذي يولّد وصفةً أولى للصفّ الجديد قبل أن يُصمَّم،
 * و**المحرّرُ** (`QrToolView`) الذي يبدأ منها حين لا وصفةَ محفوظة. وكانت في المحرّر وحده،
 * فلمّا انقسمت الغرفةُ خطوتين (اسمٌ ورابطٌ ثمّ تصميم) لزم أن يقرأها الاثنان من موضعٍ واحد،
 * وإلّا خرج الرمزُ الأوّلُ بلونٍ والمحرّرُ يعرضه بلونٍ آخر.
 */

/**
 * **شكلُ رمز أديب — مُقَرٌّ لا مُختار** (قرار المالك ٢٠٢٦-٠٨-٠٣): وحداتٌ سائلة وعينٌ
 * وبؤبؤٌ مستديران. أُزيلت الأشكال الأخرى من المحرّر **ومن الراسم معًا**، فلا خيارَ يُعرَض
 * ولا وصفةَ تُكتَب تُخرج رمزًا خارج الهوية.
 *
 * (والمربّع باقٍ في الراسم وحده لأنّ **ختم الشهادة** يطلبه صراحةً: وثيقةٌ رسميّة لا ملصق.)
 */
export const SHAPE = { dots: "fluid", eye: "rounded", pupil: "rounded" } as const satisfies {
  dots: DotShape;
  eye: EyeShape;
  pupil: EyeShape;
};

/**
 * **ضلعُ الصورة الخارجة، مثبَّتٌ لا مُختار** (أمرُ المالك ٢٠٢٦-٠٨-٢٢). كانت قائمةَ اختيارٍ
 * بثلاثة مقاسات، فحُذفت: السؤالُ لا يعني ملفَّ SVG أصلًا (متّجهاتٌ تكبر بلا حدّ)، والفرقُ
 * الذي يشتريه لا يُذكر (قِيس على رمزٍ حيّ: ١١ ك.ب عند ٥١٢، و٣١ عند ١٠٢٤، و**١٠٢ عند
 * ٢٠٤٨**)، وخطؤه في اتّجاهٍ واحد: من اختار الأصغر ثمّ طبع لوحةً خرج له رمزٌ متحبّب.
 * فيُؤخذ الأكبرُ دائمًا، ولا يُسأل صاحبُ الرمز سؤالَ طابع.
 */
export const EXPORT = 2048;

/** الهيئةُ الأولى: حبرٌ كحليٌّ على أرضٍ بيضاء، بلا تدرّجٍ ولا شعارٍ ولا إطار. */
export const LOOK = {
  ink: color.navy[700],
  ink2: color.steel[400],
  gradKind: "linear" as const,
  angle: "135",
  bare: false,
  bg: "#ffffff",
  eyeTinted: false,
  eyeColor: color.navy[900],
  pupilColor: color.semantic.warning,
  logoScale: "0.24",
  framed: false,
  caption: "امسحني",
  frameColor: color.navy[700],
  captionColor: "#ffffff",
};

/** الوصفةُ الأولى لرمزٍ جديد: هيئةُ الهويّة، ونصُّها يكتبه الخادمُ رابطًا قصيرًا عند الحفظ. */
export const defaultQrSpec = (text: string): QrSpec => ({
  text,
  size: EXPORT,
  dots: { shape: SHAPE.dots, paint: { kind: "solid", color: LOOK.ink } },
  eye: { shape: SHAPE.eye, color: null },
  pupil: { shape: SHAPE.pupil, color: null },
  bg: LOOK.bg,
  logo: null,
  frame: null,
});
