// مفاتيح أيقونات الإحصاءات — مصدرٌ **خادميّ‑آمن** (بلا Phosphor / بلا createContext).
// السبب: actions.ts «use server» تحتاج التحقّق من المفتاح، ولا يجوز أن تستورد statIcons.tsx
// (تستعمل أيقونات Phosphor التي تنشئ Context = عميليّ فقط، فتنهار في سياق الخادم RSC).
// هذا الملفّ مصدر المفاتيح الخادميّ‑الآمن؛ يجب أن تُطابق قائمتُه مفاتيحَ STAT_ICONS في
// statIcons.tsx مرآةً (لا حارسَ نوعٍ لأنّ منتقي اللوحة يفهرس STAT_ICONS بالنصّ). عند إضافة
// أيقونة أضِف مفتاحها في الموضعين.

export const STAT_ICON_KEYS = [
  // وسائط ومحتوى
  "film", "photo", "camera", "video", "mic", "music", "palette", "pen", "article", "quote",
  // معرفة وكتب
  "book", "books", "idea", "grad", "workshop", "puzzle",
  // أشخاص
  "users", "user", "student", "clap", "volunteer", "handshake",
  // فعاليّات وأوقات
  "calendar", "calCheck", "ticket", "pin", "clock", "flag", "confetti",
  // إنجاز ونموّ
  "trophy", "medal", "star", "crown", "certificate", "target", "chart", "rocket", "sparkle", "fire", "seal", "lightning",
  // تواصل ووصول
  "megaphone", "share", "globe", "chat", "heart", "thumbs", "eye", "broadcast",
  // عامّ
  "hashtag", "percent", "gift", "coins", "leaf", "buildings",
] as const;

export type StatIconKey = (typeof STAT_ICON_KEYS)[number];

/** الافتراض حين لا مفتاح صالح (لا اشتقاق من النصّ — آليّة واحدة صريحة). */
export const DEFAULT_STAT_ICON: StatIconKey = "chart";

/** مفتاحٌ صالح إن كان في السجلّ، وإلّا null (⇒ يقع على الافتراض عند العرض). */
export function asIconKey(key?: string | null): StatIconKey | null {
  return key && (STAT_ICON_KEYS as readonly string[]).includes(key) ? (key as StatIconKey) : null;
}
