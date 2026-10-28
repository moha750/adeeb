/**
 * **الأرقامُ في ملفٍّ لا يجرّ شيئًا** (٢٠٢٦-١٠-٢٧، قياسُ جوّالٍ على 4G).
 *
 * كانت في `index.ts`، وذاك يستورد `@supabase/supabase-js` في رأسه لمصانع العملاء. فكلُّ مكوّنٍ
 * عميليٍّ في الهبوط استورد `toLatinDigits` من الجذر جرّ معه مكتبةَ Supabase كلَّها (~60KB مضغوطة)
 * إلى كلّ زائر. فالمكوّناتُ العميليّة تستوردها من `@adeeb/core/digits`، والجذرُ يُعيد تصديرها.
 */

/** يحوّل الأرقام العربية-الهندية (٠-٩) والفارسية إلى لاتينية (0-9) لتُعرض بخط Eras. */
export function toLatinDigits(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
