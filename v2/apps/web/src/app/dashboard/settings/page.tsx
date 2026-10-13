import { redirect } from "next/navigation";

/**
 * **صار تحويلًا إلى «حسابي»** (قرار المالك ٢٠٢٦-١٠-١٣: «تُدمج الإعدادات والملف الشخصي في حسابي»).
 * يبقى العنوانُ لأنّ روابطَ قديمةً تقصده، و«حسابي» نفسُه محروسٌ بـ`denyUnless`.
 */
export default function MovedToAccount() {
  redirect("/dashboard/account");
}
