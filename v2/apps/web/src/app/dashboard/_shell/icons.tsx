// أيقونات الهيكل — Phosphor (currentColor؛ الأحجام عبر CSS الحاوي)
import {
  Buildings,
  IdentificationBadge,
  MicrophoneStage,
  Newspaper,
  UsersThree,
  ClipboardText,
  FileText,
  CalendarBlank,
  Globe,
  Gear,
  Bell,
  CaretDown,
  CaretRight,
  CaretDoubleRight,
  Plus,
  Lifebuoy,
  List,
  SidebarSimple,
  ChartLineUp,
  Scales,
  BookOpen,
  SignOut,
  ImagesSquare,
  ChartBar,
  Handshake,
  Question,
  UserCheck,
  HourglassMedium,
  Prohibit,
  Cake,
  TreeStructure,
  UserGear,
  UsersFour,
  SquaresFour,
  Layout,
  Key,
  ShieldWarning,
  Certificate,
  QrCode,
  EnvelopeSimpleOpen,
  UserCircle,
} from "@phosphor-icons/react";

// بلا `weight`: الوزن من سياق الجذر وحده (`IconDefaults`) — لا استثناء لأيقونةٍ في الشريط
type P = { className?: string };

// عضويتي — بطاقة الهويّة: عضويّة صاحب الجلسة نفسه (حلّت محلّ بيت «نظرة عامة»)
export const IconMe = (p: P) => <IdentificationBadge aria-hidden {...p} />;
// الملف الشخصي — الشخص نفسُه لا بطاقتُه: بياناتُه وصورتُه، فيفترق عن «عضويتي» (موقعُه في الهيكل)
export const IconProfile = (p: P) => <UserCircle aria-hidden {...p} />;
export const IconUsers = (p: P) => <UsersThree aria-hidden {...p} />;
export const IconClip = (p: P) => <ClipboardText aria-hidden {...p} />;
export const IconDoc = (p: P) => <FileText aria-hidden {...p} />;
export const IconCal = (p: P) => <CalendarBlank aria-hidden {...p} />;
export const IconGlobe = (p: P) => <Globe aria-hidden {...p} />;
export const IconGear = (p: P) => <Gear aria-hidden {...p} />;
export const IconBell = (p: P) => <Bell aria-hidden {...p} />;
export const IconCaret = (p: P) => <CaretRight aria-hidden {...p} />;
// شيفرون «هنا قائمة» — لأسفل لا لجانب: هو الإشارة التي تحوّل الأفتار من صورةٍ إلى أداة
export const IconCaretDown = (p: P) => <CaretDown aria-hidden {...p} />;
export const IconChevrons = (p: P) => <CaretDoubleRight aria-hidden {...p} />;
export const IconPlus = (p: P) => <Plus aria-hidden {...p} />;
export const IconLife = (p: P) => <Lifebuoy aria-hidden {...p} />;
export const IconMenu = (p: P) => <List aria-hidden {...p} />;
export const IconPanel = (p: P) => <SidebarSimple aria-hidden {...p} />;
export const IconChart = (p: P) => <ChartLineUp aria-hidden {...p} />;
// الانتخابات — الميزان: نبض التصويت الموزون (صوتٌ أثقل من صوت)، لا مجرّد صندوق اقتراع
export const IconVote = (p: P) => <Scales aria-hidden {...p} />;
export const IconBook = (p: P) => <BookOpen aria-hidden {...p} />;
export const IconLogout = (p: P) => <SignOut aria-hidden {...p} />;
// محتوى الصفحة الرئيسية — معرض الأعمال، ملخص المسيرة، الرعاة، الأسئلة الشائعة
export const IconImages = (p: P) => <ImagesSquare aria-hidden {...p} />;
export const IconStats = (p: P) => <ChartBar aria-hidden {...p} />;
export const IconHandshake = (p: P) => <Handshake aria-hidden {...p} />;
export const IconFaq = (p: P) => <Question aria-hidden {...p} />;
// أعضاء أديب — حالات العضويّة وأدواتها (بنودٌ مسطّحة تحت رأس «العضوية»)
export const IconActive = (p: P) => <UserCheck aria-hidden {...p} />;
export const IconPending = (p: P) => <HourglassMedium aria-hidden {...p} />;
export const IconSuspended = (p: P) => <Prohibit aria-hidden {...p} />;
export const IconCake = (p: P) => <Cake aria-hidden {...p} />;
export const IconTree = (p: P) => <TreeStructure aria-hidden {...p} />;
export const IconAssign = (p: P) => <UserGear aria-hidden {...p} />;
// من أشرف عليهم — فريقٌ تُتابعه (لا شخصٌ واحد كأيقونة التعيين)
export const IconSupervise = (p: P) => <UsersFour aria-hidden {...p} />;
// إدارتي — الوحدة نفسها لا ساكنوها: بندُ القائد عن **مكانه** في الهيكل، فيفترق عن «من أشرف عليهم»
export const IconUnit = (p: P) => <Buildings aria-hidden {...p} />;
// قسمي — عنقودُ لجانٍ لا فريقٌ واحد: القسم يُرى شبكةَ وحداتٍ تحته، فيفترق عن «لجنتي» (فريق)
/* رمزُ ترويسة الشريط — يدلّ على اللوحة نفسِها.
   جُرِّبت `Gauge` فسقطت: عدّادُ سيّارةٍ لا لوحةَ تحكّم (المالك).
   و`SquaresFour` ممنوعة — مأخوذةٌ لـ`IconDept`، وأيقونةٌ بمعنيين في شريطٍ واحد تكذب.
   `Layout` ترسم اللوحةَ ذاتَها: شريطٌ جانبيّ وألواحُ محتوى. */
export const IconDashboard = (p: P) => <Layout aria-hidden {...p} />;
export const IconDept = (p: P) => <SquaresFour aria-hidden {...p} />;
export const IconKey = (p: P) => <Key aria-hidden {...p} />;
// الإذاعة — المايكروفون: إذاعةٌ مسموعة لا مرئيّة، فالأيقونة من عالم الصوت لا البثّ
export const IconMic = (p: P) => <MicrophoneStage aria-hidden {...p} />;
// الأخبار — الصحيفة: غرفة تحريرٍ تكتب وتنشر، لا بوقُ إعلانٍ يُذيع
export const IconNews = (p: P) => <Newspaper aria-hidden {...p} />;
// الإنذارات — الدرع المحذّر: ضبطٌ يحمي العمل، لا مثلّثُ خطرٍ يُنذر بعطب
export const IconWarn = (p: P) => <ShieldWarning aria-hidden {...p} />;
// شهادات الخبرة — الوثيقة المختومة: ورقةٌ تُقدَّم لجهةٍ خارج النادي، لا ميداليّةُ تكريم
export const IconCertificate = (p: P) => <Certificate aria-hidden {...p} />;
// مولّد الباركود — الرمز نفسه: أصدقُ أيقونةٍ لأداةٍ مُخرَجُها هذا الشكل بعينه
export const IconQr = (p: P) => <QrCode aria-hidden {...p} />;
// رسائل التواصل — الظرف الوارد: بريدٌ يصل من خارج النادي فيُقرأ ويُجاب، لا ظرفٌ يُرسَل
export const IconInbox = (p: P) => <EnvelopeSimpleOpen aria-hidden {...p} />;

export const ICONS = {
  me: IconMe, profile: IconProfile, users: IconUsers, clip: IconClip, doc: IconDoc,
  cal: IconCal, globe: IconGlobe, gear: IconGear, chart: IconChart,
  vote: IconVote, book: IconBook, images: IconImages,
  stats: IconStats, handshake: IconHandshake, faq: IconFaq,
  active: IconActive, pending: IconPending, suspended: IconSuspended,
  cake: IconCake, tree: IconTree, assign: IconAssign, supervise: IconSupervise, unit: IconUnit, dept: IconDept, key: IconKey,
  mic: IconMic, news: IconNews, warn: IconWarn, certificate: IconCertificate, qr: IconQr,
  inbox: IconInbox,
} as const;
export type IconKey = keyof typeof ICONS;
