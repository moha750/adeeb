/**
 * **أيقوناتُ الوحدات المقترحة** — أوّلُ ما يُرى في منتقي الأيقونة بنافذة الوحدة (عمود `icon` في
 * `departments` و`committees`، ترحيل `20261010083838_unit_icons`). ومن ورائها بحثٌ في مكتبة Phosphor
 * كلِّها (`lib/unitIconCatalog.ts`، المالك ٢٠٢٦-١٠-١١)، فهذه **اقتراحٌ لا حدّ**: يحرس الحفظَ الفهرسُ لا هي.
 *
 * ملفٌّ بلا «use client» عمدًا: يقرؤه المنتقي ويصحّ في الخادم. ورسمُها في `dashboard/_components/UnitIcon.tsx`
 * (لكلّ مفتاحٍ هنا فرعٌ هناك، باستيرادٍ ثابتٍ لا يحتاج الخادم). ولإضافة مقترحة: سطرٌ هنا وفرعٌ هناك.
 *
 * والترتيبُ بالمعنى لا بالأبجديّة: الإعلامُ، فالتصميم، فالكتابة، فالمجتمع، فالتقنية، فالإدارة.
 */
export const UNIT_ICONS: readonly { key: string; label: string }[] = [
  { key: "film-slate", label: "لوح تصوير" },
  { key: "camera", label: "كاميرا" },
  { key: "video-camera", label: "كاميرا فيديو" },
  { key: "microphone", label: "ميكروفون" },
  { key: "headphones", label: "سمّاعات" },
  { key: "megaphone", label: "مكبّر صوت" },
  { key: "paint-brush", label: "فرشاة" },
  { key: "palette", label: "لوحة ألوان" },
  { key: "pen-nib", label: "سنّ قلم" },
  { key: "feather", label: "ريشة" },
  { key: "book-open", label: "كتاب" },
  { key: "newspaper", label: "صحيفة" },
  { key: "calendar-star", label: "فعالية" },
  { key: "handshake", label: "مصافحة" },
  { key: "identification-badge", label: "بطاقة تعريف" },
  { key: "users-three", label: "جماعة" },
  { key: "chats-circle", label: "محادثة" },
  { key: "globe-hemisphere-east", label: "عالم" },
  { key: "code", label: "برمجة" },
  { key: "cpu", label: "معالج" },
  { key: "database", label: "قاعدة بيانات" },
  { key: "archive", label: "أرشيف" },
  { key: "chart-line-up", label: "نموّ" },
  { key: "seal-check", label: "ختم" },
  { key: "briefcase", label: "حقيبة" },
  { key: "lightbulb", label: "فكرة" },
  { key: "trophy", label: "كأس" },
  { key: "graduation-cap", label: "تخرّج" },
];

const KEYS = new Set(UNIT_ICONS.map((i) => i.key));
/** من المقترحة؟ (تُرسم باستيرادٍ ثابت؛ وغيرُها من المكتبة يُرسم من الخادم). */
export const isSuggestedIcon = (k: string | null | undefined): k is string => !!k && KEYS.has(k);
