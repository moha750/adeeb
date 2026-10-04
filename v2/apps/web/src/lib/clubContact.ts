/**
 * **قنواتُ النادي للتواصل** — واتسابُه وبريدُه وحساباتُه. مصدرٌ واحدٌ لكلّ صفحةٍ تحتاجها خارج
 * هويّة الموقع (أوّلُها صالةُ «ألعاب أدِيبيّة»، ٢٠٢٦-٠٩-٢٦).
 *
 * والرقمُ والبريدُ هما قناةُ الدعم التي قرّرها المالك لدربك خضر (٢٠٢٦-٠٩-٢٥)، وفي
 * `games/darbak-khadar/_components/{bits,Help}.tsx` نسختُهما الأولى؛ تُنقل إلى هنا متى لُمست تلك الصفحة.
 * والحساباتُ باسمٍ واحدٍ في كلّ المنصّات (`@AB_KFU`)، فتُبنى روابطُها منه. ولينكدإن غائبٌ عمدًا:
 * صيغةُ رابط صفحة النادي فيه غيرُ معروفة، ولا يُكتب رابطٌ بالظنّ.
 */
export const CLUB_WA_NUMBER = "0543837775";
export const clubWaLink = (text?: string) =>
  `https://wa.me/966543837775${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const CLUB_EMAIL = "adeab.kfu@gmail.com";

export const CLUB_HANDLE = "AB_KFU";
export const CLUB_ACCOUNTS: { label: string; href: string }[] = [
  { label: "إكس", href: `https://x.com/${CLUB_HANDLE}` },
  { label: "إنستقرام", href: `https://instagram.com/${CLUB_HANDLE}` },
  { label: "سناب", href: `https://snapchat.com/add/${CLUB_HANDLE}` },
  { label: "يوتيوب", href: `https://youtube.com/@${CLUB_HANDLE}` },
  { label: "تيك توك", href: `https://tiktok.com/@${CLUB_HANDLE}` },
];
