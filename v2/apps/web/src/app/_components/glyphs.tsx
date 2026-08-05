"use client";
// **قائمةُ المستثنَين من duotone — المصدر الواحد.**
//
// الأصل أنّ أيقونات أديب كلَّها duotone بسياقٍ واحد في جذر التخطيط (`IconDefaults`).
// وهذا الملفّ يسمّي الاستثناء صراحةً: أيقوناتٌ يفسدها الوزنُ المزدوج، فتُربَط هنا بوزنها
// مرّةً واحدة وتُستورد من هنا لا من Phosphor مباشرةً. فيبقى الاستثناء **معدودًا في مكانٍ
// واحد** لا مرصَّعًا في مئات المواضع (وهو ما نُزع في تحويل ٢٠٢٦-٠٨-٠٥).
//
// **القاعدة الحاكمة:** duotone يليق بالأيقونة التي طبقتُها الخافتة **جسمُها** (كتابٌ يمتلئ ·
// شخصٌ يثقُل). ويفسد حين تكون الطبقة **شكلًا دخيلًا ليس منها** — مربّعُ إطارٍ خلف علامة `+`،
// أو مثلّثٌ مصمتٌ خلف سهمٍ خطّيّ.
//
// **كيف يُستعمل:** استورد الاسم من هنا كما تستورده من Phosphor — التوقيع نفسُه عدا `weight`
// (مُسقَطٌ من النوع عمدًا: الوزن قرارُ هذا الملفّ، فتمريرُه من الشاشة خطأٌ يوقفه المترجم).
//
//     import { Plus, CaretDown } from "@/app/_components/glyphs";
//
// **لإعادة أيقونةٍ إلى duotone:** احذف سطرَها من هنا وأعد استيرادها من `@phosphor-icons/react`.
import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  // ١ · رموزُ الفعل — طبقتُها الخافتة **مربّعٌ مستدير يملأ الإطار** لا شكلُ الرمز
  Plus as PhPlus, X as PhX, Check as PhCheck, Minus as PhMinus, DotsSixVertical as PhDotsSixVertical,
  // ٢ · الأسهم والشيفرونات — الطبقة **مثلّثٌ مصمتٌ** خلف السهم الخطّيّ (إشارةُ اتّجاهٍ لا أيقونةَ معنى)
  CaretDown as PhCaretDown, CaretUp as PhCaretUp, CaretLeft as PhCaretLeft, CaretRight as PhCaretRight,
  CaretUpDown as PhCaretUpDown, CaretDoubleRight as PhCaretDoubleRight,
  ArrowUp as PhArrowUp, ArrowDown as PhArrowDown, ArrowRight as PhArrowRight, ArrowLeft as PhArrowLeft,
  ArrowUpRight as PhArrowUpRight, ArrowUUpLeft as PhArrowUUpLeft, ArrowBendUpLeft as PhArrowBendUpLeft,
  ArrowSquareOut as PhArrowSquareOut,
  // ٣ · أسهمُ الدوران — الطبقة **قرصٌ كامل** فتبدو عملةً مصمتةً خلف السهم
  ArrowCounterClockwise as PhArrowCounterClockwise, ArrowsClockwise as PhArrowsClockwise,
  ArrowClockwise as PhArrowClockwise,
  // ٧ · أدواتُ الفعل — تسكن الأزرارَ وأشرطةَ الأدوات، فتتبع وزنَ الفعل لا وزنَ المعنى
  Trash as PhTrash, PencilSimple as PhPencilSimple, Eye as PhEye, EyeSlash as PhEyeSlash,
  MagnifyingGlass as PhMagnifyingGlass, DownloadSimple as PhDownloadSimple, UploadSimple as PhUploadSimple,
  // ٤ · شعاراتُ المنصّات — شعارُ العلامة صورتُها المسجّلة، لا يُخترع له وجهٌ ثنائيّ
  WhatsappLogo as PhWhatsappLogo, XLogo as PhXLogo, LinkedinLogo as PhLinkedinLogo,
  InstagramLogo as PhInstagramLogo, TiktokLogo as PhTiktokLogo,
  GoogleLogo as PhGoogleLogo, AppleLogo as PhAppleLogo,
  // ٥ · نجمةُ «مميّز» — حالةُ تشغيلٍ لا معنى؛ ونصفُ الممتلئة تُقرأ «نصف مفعّلة»
  Star as PhStar,
  // ٦ · الحالاتُ الدائريّة — علامةُ حالةٍ تُقرأ لمحةً، فلا تُثقَل بطبقةٍ خافتة
  CheckCircle as PhCheckCircle, XCircle as PhXCircle, WarningCircle as PhWarningCircle,
  Warning as PhWarning, Prohibit as PhProhibit, Info as PhInfo, Question as PhQuestion,
} from "@phosphor-icons/react";
import { ICON_WEIGHT_EXCEPTION } from "@/lib/iconWeight";

/** التوقيعُ نفسُه بلا `weight` — الوزنُ قرارُ هذا الملفّ، والمترجمُ حارسُه. */
type GlyphProps = Omit<IconProps, "weight">;

/** يربط أيقونةً بوزن الاستثناء ربطًا نهائيًّا: الخاصّةُ بعد النشر، فلا يُنقَض من الشاشة.
    والوزنُ **واحدٌ للصفوف السبعة** — لا قسمة بين فعلٍ ومصمت. */
function bind(Icon: Icon, name: string) {
  const Glyph = (props: GlyphProps) => <Icon {...props} weight={ICON_WEIGHT_EXCEPTION} />;
  Glyph.displayName = name;
  return Glyph;
}

// ١ · رموزُ الفعل
export const Plus = bind(PhPlus, "Plus");
export const X = bind(PhX, "X");
export const Check = bind(PhCheck, "Check");
export const Minus = bind(PhMinus, "Minus");
export const DotsSixVertical = bind(PhDotsSixVertical, "DotsSixVertical");

// ٢ · الأسهم والشيفرونات
export const CaretDown = bind(PhCaretDown, "CaretDown");
export const CaretUp = bind(PhCaretUp, "CaretUp");
export const CaretLeft = bind(PhCaretLeft, "CaretLeft");
export const CaretRight = bind(PhCaretRight, "CaretRight");
export const CaretUpDown = bind(PhCaretUpDown, "CaretUpDown");
export const CaretDoubleRight = bind(PhCaretDoubleRight, "CaretDoubleRight");
export const ArrowUp = bind(PhArrowUp, "ArrowUp");
export const ArrowDown = bind(PhArrowDown, "ArrowDown");
export const ArrowRight = bind(PhArrowRight, "ArrowRight");
export const ArrowLeft = bind(PhArrowLeft, "ArrowLeft");
export const ArrowUpRight = bind(PhArrowUpRight, "ArrowUpRight");
export const ArrowUUpLeft = bind(PhArrowUUpLeft, "ArrowUUpLeft");
export const ArrowBendUpLeft = bind(PhArrowBendUpLeft, "ArrowBendUpLeft");
export const ArrowSquareOut = bind(PhArrowSquareOut, "ArrowSquareOut");

// ٣ · أسهمُ الدوران
export const ArrowCounterClockwise = bind(PhArrowCounterClockwise, "ArrowCounterClockwise");
export const ArrowsClockwise = bind(PhArrowsClockwise, "ArrowsClockwise");
export const ArrowClockwise = bind(PhArrowClockwise, "ArrowClockwise");

// ٧ · أدواتُ الفعل
export const Trash = bind(PhTrash, "Trash");
export const PencilSimple = bind(PhPencilSimple, "PencilSimple");
export const Eye = bind(PhEye, "Eye");
export const EyeSlash = bind(PhEyeSlash, "EyeSlash");
export const MagnifyingGlass = bind(PhMagnifyingGlass, "MagnifyingGlass");
export const DownloadSimple = bind(PhDownloadSimple, "DownloadSimple");
export const UploadSimple = bind(PhUploadSimple, "UploadSimple");

// ٤ · شعاراتُ المنصّات
export const WhatsappLogo = bind(PhWhatsappLogo, "WhatsappLogo");
export const XLogo = bind(PhXLogo, "XLogo");
export const LinkedinLogo = bind(PhLinkedinLogo, "LinkedinLogo");
export const InstagramLogo = bind(PhInstagramLogo, "InstagramLogo");
export const TiktokLogo = bind(PhTiktokLogo, "TiktokLogo");
// وشعارا مزوّدَي الدخول — من العائلة نفسِها لا من أصولٍ ملوّنةٍ تُستورَد: لونُهما من الرموز
// كسائر الأيقونات، فلا يدخل الموقعَ لونٌ خارج `tokens.css` ولو كان لونَ علامةٍ أخرى.
export const GoogleLogo = bind(PhGoogleLogo, "GoogleLogo");
export const AppleLogo = bind(PhAppleLogo, "AppleLogo");

// ٥ · نجمةُ «مميّز»
export const Star = bind(PhStar, "Star");

// ٦ · الحالاتُ الدائريّة
export const CheckCircle = bind(PhCheckCircle, "CheckCircle");
export const XCircle = bind(PhXCircle, "XCircle");
export const WarningCircle = bind(PhWarningCircle, "WarningCircle");
export const Warning = bind(PhWarning, "Warning");
export const Prohibit = bind(PhProhibit, "Prohibit");
export const Info = bind(PhInfo, "Info");
export const Question = bind(PhQuestion, "Question");
