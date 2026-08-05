import { InstagramLogo, LinkedinLogo, TiktokLogo, XLogo } from "@/app/_components/glyphs";
import type { SocialKey } from "@/lib/membershipFields";

/**
 * أيقونة كلّ منصّة تواصل — **مصدرٌ واحد** لعرض الملفّ (تبويب الأعضاء) وصفحة «عضويتي».
 * هنا الأيقونة وحدها: التسمية وبانـي الرابط في `lib/membershipFields` — وذاك ملفّ `.ts` لا يحمل JSX.
 */
export const SOCIAL_ICON: Record<SocialKey, React.ReactNode> = {
  twitter: <XLogo />,
  instagram: <InstagramLogo />,
  tiktok: <TiktokLogo />,
  linkedin: <LinkedinLogo />,
};
