"use client";
// هذا الملفّ عميليّ: Phosphor يستعمل createContext. التحقّق الخادميّ‑الآمن من المفاتيح في
// statIconKeys.ts (بلا Phosphor) كي تستورده actions.ts «use server» دون سحب Phosphor للخادم.
// أيقونات الإنجازات — مصدرٌ واحد لمنتقي لوحة التحكّم وعرضها (AchievementForm/AchievementsView)
// (AchievementForm/AchievementsView). كلّها مكوّنات Phosphor حقيقيّة (لا حقن SVG)،
// تُرسَم في شقّ `icon` من بدائيّة `Stat` كأيّ كرت في النظام. المفتاح يُخزَّن في
// achievements.icon_class؛ المفتاح غير المعروف/الفارغ يقع على الافتراض (DEFAULT_STAT_ICON).
//
// للتوسّع: أضِف سطرًا في STAT_ICONS ثمّ ضع مفتاحه في الفئة المناسبة — يظهر في المنتقي والعرض تلقائيًّا.
import type { Icon } from "@phosphor-icons/react";
import {
  FilmSlate, ImageSquare, Camera, VideoCamera, MicrophoneStage, MusicNotes, PaintBrush, PenNib, Article, Quotes,
  BookOpen, Books, Lightbulb, GraduationCap, ChalkboardTeacher, PuzzlePiece,
  UsersThree, User, Student, HandsClapping, HandHeart, Handshake,
  CalendarBlank, CalendarCheck, Ticket, MapPin, Clock, Flag, Confetti,
  Trophy, Medal, Star, Crown, Certificate, Target, ChartLineUp, Rocket, Sparkle, Fire, SealCheck, Lightning,
  Megaphone, ShareNetwork, Globe, ChatCircle, Heart, ThumbsUp, Eye, Broadcast,
  Hash, Percent, Gift, Coins, Leaf, Buildings,
} from "@phosphor-icons/react";
import { asIconKey, DEFAULT_STAT_ICON } from "./statIconKeys";
export { asIconKey, DEFAULT_STAT_ICON };

export type StatIconEntry = { label: string; Icon: Icon };

/** السجلّ — مصدر الحقيقة الوحيد لأيقونات الإحصاءات. المفتاح نصّ ثابت يُخزَّن في القاعدة. */
export const STAT_ICONS: Record<string, StatIconEntry> = {
  // وسائط ومحتوى
  film: { label: "مادة مرئية", Icon: FilmSlate },
  photo: { label: "صورة", Icon: ImageSquare },
  camera: { label: "تصوير", Icon: Camera },
  video: { label: "فيديو", Icon: VideoCamera },
  mic: { label: "إلقاء / صوت", Icon: MicrophoneStage },
  music: { label: "موسيقى", Icon: MusicNotes },
  palette: { label: "تصميم / فنّ", Icon: PaintBrush },
  pen: { label: "كتابة", Icon: PenNib },
  article: { label: "مقال", Icon: Article },
  quote: { label: "اقتباس", Icon: Quotes },
  // معرفة وكتب
  book: { label: "كتاب", Icon: BookOpen },
  books: { label: "إصدارات", Icon: Books },
  idea: { label: "فكرة", Icon: Lightbulb },
  grad: { label: "تخرّج / علم", Icon: GraduationCap },
  workshop: { label: "ورشة / تدريب", Icon: ChalkboardTeacher },
  puzzle: { label: "حلّ / إبداع", Icon: PuzzlePiece },
  // أشخاص
  users: { label: "أعضاء", Icon: UsersThree },
  user: { label: "فرد", Icon: User },
  student: { label: "متدرّب", Icon: Student },
  clap: { label: "تفاعل", Icon: HandsClapping },
  volunteer: { label: "تطوّع", Icon: HandHeart },
  handshake: { label: "شراكة", Icon: Handshake },
  // فعاليّات وأوقات
  calendar: { label: "فعاليّة", Icon: CalendarBlank },
  calCheck: { label: "موعد مؤكّد", Icon: CalendarCheck },
  ticket: { label: "تذكرة / حضور", Icon: Ticket },
  pin: { label: "مكان", Icon: MapPin },
  clock: { label: "ساعات / وقت", Icon: Clock },
  flag: { label: "محطّة", Icon: Flag },
  confetti: { label: "احتفال", Icon: Confetti },
  // إنجاز ونموّ
  trophy: { label: "جائزة", Icon: Trophy },
  medal: { label: "ميدالية", Icon: Medal },
  star: { label: "تميّز", Icon: Star },
  crown: { label: "ريادة", Icon: Crown },
  certificate: { label: "شهادة", Icon: Certificate },
  target: { label: "هدف", Icon: Target },
  chart: { label: "نموّ / أرقام", Icon: ChartLineUp },
  rocket: { label: "انطلاق", Icon: Rocket },
  sparkle: { label: "لمعان", Icon: Sparkle },
  fire: { label: "زخم", Icon: Fire },
  seal: { label: "توثيق", Icon: SealCheck },
  lightning: { label: "طاقة", Icon: Lightning },
  // تواصل ووصول
  megaphone: { label: "ظهور إعلاميّ", Icon: Megaphone },
  share: { label: "انتشار", Icon: ShareNetwork },
  globe: { label: "وصول", Icon: Globe },
  chat: { label: "نقاش", Icon: ChatCircle },
  heart: { label: "إعجاب", Icon: Heart },
  thumbs: { label: "تأييد", Icon: ThumbsUp },
  eye: { label: "مشاهدات", Icon: Eye },
  broadcast: { label: "بثّ", Icon: Broadcast },
  // عامّ
  hashtag: { label: "وسم", Icon: Hash },
  percent: { label: "نسبة", Icon: Percent },
  gift: { label: "هديّة", Icon: Gift },
  coins: { label: "دعم / تمويل", Icon: Coins },
  leaf: { label: "أثر", Icon: Leaf },
  buildings: { label: "جهة / مقرّ", Icon: Buildings },
};

/** فئات المنتقي — عناوينٌ ومفاتيح مرتّبة (المصدر الوحيد لترتيب المنتقي وتجميعه). */
export const STAT_ICON_CATEGORIES: { title: string; keys: string[] }[] = [
  { title: "وسائط ومحتوى", keys: ["film", "photo", "camera", "video", "mic", "music", "palette", "pen", "article", "quote"] },
  { title: "معرفة وكتب", keys: ["book", "books", "idea", "grad", "workshop", "puzzle"] },
  { title: "أشخاص", keys: ["users", "user", "student", "clap", "volunteer", "handshake"] },
  { title: "فعاليّات وأوقات", keys: ["calendar", "calCheck", "ticket", "pin", "clock", "flag", "confetti"] },
  { title: "إنجاز ونموّ", keys: ["trophy", "medal", "star", "crown", "certificate", "target", "chart", "rocket", "sparkle", "fire", "seal", "lightning"] },
  { title: "تواصل ووصول", keys: ["megaphone", "share", "globe", "chat", "heart", "thumbs", "eye", "broadcast"] },
  { title: "عامّ", keys: ["hashtag", "percent", "gift", "coins", "leaf", "buildings"] },
];

/** يرسم أيقونة الإحصائيّة من مفتاحها — مسار العرض الوحيد للعرض والمنتقي والقائمة.
    (asIconKey و DEFAULT_STAT_ICON مُعادان من statIconKeys.ts — مصدر المفاتيح الخادميّ‑الآمن.) */
export function StatIcon({ name, className }: {
  name?: string | null;
  className?: string;
}) {
  const { Icon } = STAT_ICONS[asIconKey(name) ?? DEFAULT_STAT_ICON];
  return <Icon className={className} aria-hidden />;
}
