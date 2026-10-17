/**
 * **وجهُ مَن لا صورةَ له — المصدرُ الواحد.** كلُّ موضعٍ يرسم شخصًا (الأفتار، شريطُ المجلس،
 * الهيكل، وما يأتي بعدها) يسأل هنا: صورة؟ فرسمُ جنسه؟ فأيقونةُ المستخدم؟ ثمّ يرسم الجوابَ
 * بقالبه. كانت السلسلةُ مكتوبةً في ثلاثة ملفّات بثلاث خرائط، فتباعدت: الهيكلُ يرسم حرفًا
 * والأفتارُ حرفين (أُمسك ٢٠٢٦-١٠-١٦ يومَ ألغى المالكُ الأحرفَ لأيقونة المستخدم).
 *
 * والقرارُ هنا **وحده**، والقالبُ في كلّ موضعٍ قالبُه: الأفتارُ `<img>` والشريطُ خلفيّة.
 * ومَن يحتاج رمزًا غيرَ أيقونة المستخدم (صاحبُ حسابٍ بلا ملفٍّ في غرفة الأصدقاء) يمرّره
 * لقالبه مكانَ `icon`، فالقرارُ يبقى واحدًا والرمزُ يختلف.
 */

/** رسمُ الجنس: جسمٌ أبيضُ فوق تدرّج الهويّة. */
export const GENDER_FIGURE = {
  male: "/brand/avatar/avatar-male.svg",
  female: "/brand/avatar/avatar-female.svg",
} as const;

export type AvatarFace =
  | { kind: "photo"; url: string }
  | { kind: "figure"; url: string }
  | { kind: "icon" };

/**
 * الجنسُ يُقارَن بقيمتيه صراحةً لا بفهرسة الخريطة: قيمةٌ غريبةٌ من قاعدة البيانات
 * («toString» مثلًا) كانت ستجد في سلسلة النموذج الأوّليّ ما ليس رابطًا.
 */
export function avatarFace(src?: string | null, gender?: string | null): AvatarFace {
  if (src) return { kind: "photo", url: src };
  if (gender === "male" || gender === "female") return { kind: "figure", url: GENDER_FIGURE[gender] };
  return { kind: "icon" };
}
