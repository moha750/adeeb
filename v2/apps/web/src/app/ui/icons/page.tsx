"use client";
/* صفحةُ معاينةٍ تعرض الوزنَين جنبًا إلى جنب، فتكتب `weight` صراحةً في بطاقات المقارنة
   وحدها — وهو الموضعُ الوحيدُ المأذونُ فيه بذلك: المعروضُ هنا هو الوزنُ نفسُه. */

import { Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import {
  XLogo, InstagramLogo, TiktokLogo, LinkedinLogo,
  AddressBook, Aperture, Archive, Armchair, Article, Asterisk, At, Bank, Bell, BookOpen,
  BookOpenText, BookmarkSimple, Books, Briefcase, Broadcast, Buildings, Cake, CalendarBlank, CalendarCheck, CalendarDots,
  CalendarX, Camera, Certificate, Chalkboard, ChalkboardTeacher, ChartBar, ChartLineUp, ChatCenteredDots, ChatCenteredText, ChatCircle,
  ChatCircleDots, ChatCircleText, ChatText, ChatsCircle, CheckSquare, ClipboardText, Clock, ClockCountdown, ClockCounterClockwise, Clover,
  CoffeeBean, Coins, Columns, Compass, Confetti, Copy, CopySimple, Crown, Desktop, DeviceMobile,
  DotsThreeOutlineVertical, Drop, Envelope, EnvelopeOpen, EnvelopeSimpleOpen, Export, Feather, FileArrowDown, FileDashed, FilePdf,
  FileSvg, FileText, FilmReel, FilmSlate, FilmStrip, Fire, Flag, FlagCheckered, FloppyDisk, FloppyDiskBack,
  Gear, GenderFemale, GenderIntersex, GenderMale, Gift, Globe, GraduationCap, GridFour, HandGrabbing, HandHeart,
  HandWaving, HandsClapping, Handshake, Hash, Heart, Hourglass, HourglassMedium, IdentificationBadge, IdentificationCard, Image,
  ImageSquare, Images, ImagesSquare, Infinity, Key, Layout, Leaf, Lifebuoy, Lightbulb, Lightning,
  LinkSimple, List, ListBullets, ListChecks, ListDashes, Lock, LockKey, LockSimple, MagnifyingGlassMinus, MagnifyingGlassPlus,
  MapPin, MapPinLine, Medal, Megaphone, MegaphoneSimple, Microphone, MicrophoneStage, Moon, MusicNotes, Newspaper,
  Note, NoteBlank, NotePencil, NumberCircleOne, PaintBrush, PaintBucket, Palette, PaperPlaneTilt, Paperclip, Path,
  Pause, PauseCircle, PenNib, Percent, Phone, Play, Playlist, PuzzlePiece, QrCode, Quotes,
  Repeat, Robot, Rocket, Scales, SealCheck, Shapes, ShareNetwork, ShieldCheck, ShieldWarning, SidebarSimple,
  Signpost, SlidersHorizontal, Sparkle, SpeakerHigh, SpeakerSimpleNone, SpeakerSlash, Square, SquaresFour, Stack, Stamp,
  StopCircle, Storefront, Student, Table, Tag, Target, Tent, TextAa, TextAlignLeft, TextT,
  ThumbsUp, Ticket, Timer, Tray, TreeStructure, Trophy, User, UserCheck, UserCircle, UserGear,
  UserMinus, UserPlus, Users, UsersFour, UsersThree, VideoCamera, Wallet, WarningOctagon, Waveform, YoutubeLogo,
} from "@phosphor-icons/react";
import {
  Plus, X, Check, Checks, Minus, DotsSixVertical, CaretDown, CaretUp, CaretLeft, CaretRight,
  CaretUpDown, CaretDoubleRight, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUUpLeft, ArrowBendUpLeft, ArrowSquareOut,
  ArrowCounterClockwise, ArrowsClockwise, ArrowClockwise, Trash, PencilSimple, Eye, EyeSlash, MagnifyingGlass, DownloadSimple, UploadSimple,
  FunnelSimple, SignOut, WhatsappLogo, GoogleLogo, AppleLogo, Star,
  CheckCircle, XCircle, WarningCircle, Warning, Prohibit, Info, Question,
} from "@/app/_components/glyphs";
import { DuotoneZone } from "@/app/_components/glyphs";
import { ICON_WEIGHT, ICON_WEIGHT_EXCEPTION } from "@/lib/iconWeight";

/**
 * **جردُ أوزان الأيقونات — الموقعُ كلُّه في صفحةٍ واحدة.**
 *
 * القانون: كلُّ أيقونةٍ `duotone` بسياقٍ واحد في جذر التخطيط، ولا يخرج منها إلّا ما سمّاه
 * المالكُ في `app/_components/glyphs.tsx` فيصير `bold`. وهذه الصفحةُ تعرض الطرفين معًا
 * كي يُرى القانونُ لا أن يُقرأ، وتضع في صدرها **ما لم يُفصَل فيه بعدُ**.
 *
 * والأسماءُ هنا مجرودةٌ من الشيفرة نفسِها (كلُّ ما يُستورد فعلًا)، لا مكتوبةً باليد.
 */

/* ── الصفوفُ السبعةُ للمستثنَين، بأسبابها كما في `glyphs.tsx` ─────────────────── */
const EXC_GROUPS: { n: string; title: string; why: string; names: string[] }[] = [
  { n: "١", title: "رموزُ الفعل", why: "طبقتُها الخافتة مربّعٌ مستدير يملأ الإطار، لا شكلُ الرمز", names: ["Plus", "X", "Check", "Checks", "Minus", "DotsSixVertical"] },
  { n: "٢", title: "الأسهم والشيفرونات", why: "الطبقةُ مثلّثٌ مصمتٌ خلف سهمٍ خطّيّ: إشارةُ اتّجاهٍ لا أيقونةَ معنى", names: ["CaretDown", "CaretUp", "CaretLeft", "CaretRight", "CaretUpDown", "CaretDoubleRight", "ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "ArrowUpRight", "ArrowUUpLeft", "ArrowBendUpLeft", "ArrowSquareOut"] },
  { n: "٣", title: "أسهمُ الدوران", why: "الطبقةُ قرصٌ كامل، فتبدو عملةً مصمتةً خلف السهم", names: ["ArrowCounterClockwise", "ArrowsClockwise", "ArrowClockwise"] },
  { n: "٧", title: "أدواتُ الفعل", why: "تسكن الأزرارَ وأشرطةَ الأدوات، فتتبع وزنَ الفعل لا وزنَ المعنى", names: ["Trash", "PencilSimple", "Eye", "EyeSlash", "MagnifyingGlass", "DownloadSimple", "UploadSimple", "FunnelSimple", "SignOut"] },
  { n: "٤", title: "شعاراتُ الدخول والتواصل", why: "شعارُ العلامة صورتُها المسجّلة، لا يُخترع له وجهٌ ثنائيّ. وشعاراتُ المنصّات الاجتماعيّة خرجت من هنا بقرارك ٢٠٢٦-٠٨-١٣، وهذه الثلاثةُ تنتظر كلمتك", names: ["WhatsappLogo", "GoogleLogo", "AppleLogo"] },
  { n: "٥", title: "نجمةُ «مميّز»", why: "حالةُ تشغيلٍ لا معنى، ونصفُ الممتلئة تُقرأ «نصف مفعّلة»", names: ["Star"] },
  { n: "٦", title: "الحالاتُ الدائريّة", why: "علامةُ حالةٍ تُقرأ لمحةً، فلا تُثقَل بطبقةٍ خافتة", names: ["CheckCircle", "XCircle", "WarningCircle", "Warning", "Prohibit", "Info", "Question"] },
];

const EXC: Record<string, React.ComponentType<{ size?: number }>> = {
  Plus, X, Check, Checks, Minus, DotsSixVertical, CaretDown, CaretUp, CaretLeft, CaretRight,
  CaretUpDown, CaretDoubleRight, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, ArrowUpRight, ArrowUUpLeft, ArrowBendUpLeft, ArrowSquareOut,
  ArrowCounterClockwise, ArrowsClockwise, ArrowClockwise, Trash, PencilSimple, Eye, EyeSlash, MagnifyingGlass, DownloadSimple, UploadSimple,
  FunnelSimple, SignOut, WhatsappLogo, GoogleLogo, AppleLogo, Star,
  CheckCircle, XCircle, WarningCircle, Warning, Prohibit, Info, Question,
};

const DUO: Record<string, React.ComponentType<{ size?: number }>> = {
  XLogo, InstagramLogo, TiktokLogo, LinkedinLogo,
  AddressBook, Aperture, Archive, Armchair, Article, Asterisk, At, Bank, Bell, BookOpen,
  BookOpenText, BookmarkSimple, Books, Briefcase, Broadcast, Buildings, Cake, CalendarBlank, CalendarCheck, CalendarDots,
  CalendarX, Camera, Certificate, Chalkboard, ChalkboardTeacher, ChartBar, ChartLineUp, ChatCenteredDots, ChatCenteredText, ChatCircle,
  ChatCircleDots, ChatCircleText, ChatText, ChatsCircle, CheckSquare, ClipboardText, Clock, ClockCountdown, ClockCounterClockwise, Clover,
  CoffeeBean, Coins, Columns, Compass, Confetti, Copy, CopySimple, Crown, Desktop, DeviceMobile,
  DotsThreeOutlineVertical, Drop, Envelope, EnvelopeOpen, EnvelopeSimpleOpen, Export, Feather, FileArrowDown, FileDashed, FilePdf,
  FileSvg, FileText, FilmReel, FilmSlate, FilmStrip, Fire, Flag, FlagCheckered, FloppyDisk, FloppyDiskBack,
  Gear, GenderFemale, GenderIntersex, GenderMale, Gift, Globe, GraduationCap, GridFour, HandGrabbing, HandHeart,
  HandWaving, HandsClapping, Handshake, Hash, Heart, Hourglass, HourglassMedium, IdentificationBadge, IdentificationCard, Image,
  ImageSquare, Images, ImagesSquare, Infinity, Key, Layout, Leaf, Lifebuoy, Lightbulb, Lightning,
  LinkSimple, List, ListBullets, ListChecks, ListDashes, Lock, LockKey, LockSimple, MagnifyingGlassMinus, MagnifyingGlassPlus,
  MapPin, MapPinLine, Medal, Megaphone, MegaphoneSimple, Microphone, MicrophoneStage, Moon, MusicNotes, Newspaper,
  Note, NoteBlank, NotePencil, NumberCircleOne, PaintBrush, PaintBucket, Palette, PaperPlaneTilt, Paperclip, Path,
  Pause, PauseCircle, PenNib, Percent, Phone, Play, Playlist, PuzzlePiece, QrCode, Quotes,
  Repeat, Robot, Rocket, Scales, SealCheck, Shapes, ShareNetwork, ShieldCheck, ShieldWarning, SidebarSimple,
  Signpost, SlidersHorizontal, Sparkle, SpeakerHigh, SpeakerSimpleNone, SpeakerSlash, Square, SquaresFour, Stack, Stamp,
  StopCircle, Storefront, Student, Table, Tag, Target, Tent, TextAa, TextAlignLeft, TextT,
  ThumbsUp, Ticket, Timer, Tray, TreeStructure, Trophy, User, UserCheck, UserCircle, UserGear,
  UserMinus, UserPlus, Users, UsersFour, UsersThree, VideoCamera, Wallet, WarningOctagon, Waveform, YoutubeLogo,
};

/** بلاطةُ أيقونةٍ واحدة: الرسمُ ثمّ اسمُه اللاتينيّ صغيرًا */
function Tile({ name, Icon }: { name: string; Icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="iclab-tile" title={name}>
      <Icon size={26} />
      <span className="iclab-name font-latin">{name}</span>
    </div>
  );
}

/** خانةُ مقارنة: وجهٌ واحدٌ من وجهَي الحالة المعلّقة */
function Face({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="iclab-face">
      <span className="iclab-face-lbl">{label}</span>
      <div className="iclab-face-row">{children}</div>
      <span className="iclab-face-note">{note}</span>
    </div>
  );
}

export default function IconWeightsLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Icon Weights</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أوزانُ الأيقونات</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الأصلُ أنّ أيقونات أدِيب كلَّها <b className="font-latin">duotone</b>، ولا يخرج منها إلّا ما
          تستثنيه أنت فيصير <b className="font-latin">bold</b>. تحتها جردُ الطرفين كما يُرسمان
          اليوم فعلًا، وفي صدر الصفحة أربعُ حالاتٍ خرجت عن القانون وتنتظر كلمتك.
        </p>

        {/* ══ الحالاتُ المعلّقة — القرارُ أوّلًا ══════════════════════════════ */}
        <section className="mt-12">
          <h2 className="mb-1 font-display text-2xl font-black text-content">أربعٌ فُصل فيها</h2>
          <p className="mb-5 max-w-2xl text-sm text-content-muted">
            أربعُ حالاتٍ كانت الشاشةُ تكتب وزنَها بيدها، عُرضت على المالك في هذه الصفحة
            فحكم فيها كلِّها <b>٢٠٢٦-٠٨-١٣</b>: الأربعُ إلى <b className="font-latin">duotone</b>.
            واليمينُ ما كان، واليسارُ ما صار وهو المشحونُ اليوم.
          </p>

          <div className="iclab-cases">
            <Card>
              <CardHeader variant="soft" icon={<Play />} title="مثلّثُ التشغيل" subtitle="مشغّلُ الإذاعة، في كلّ صفحات /radio" />
              <CardBody>
                <div className="iclab-cmp">
                  <Face label="كان" note="مصمتًا (fill)، كأزرار التشغيل في كلّ مشغّل">
                    <Play size={30} weight="fill" /><Pause size={30} weight="fill" />
                  </Face>
                  <Face label="صار" note="duotone كسائر الموقع">
                    <Play size={30} weight={ICON_WEIGHT} /><Pause size={30} weight={ICON_WEIGHT} />
                  </Face>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader variant="soft" icon={<Medal />} title="أوسمةُ البروفايل العلنيّ" subtitle="‏/m/‹اسمك›، ستّةُ أوسمةٍ مُحتسَبة" />
              <CardBody>
                <div className="iclab-cmp">
                  <Face label="كان" note="مصمتةً (fill) لتُقرأ وسامًا، و«المتكرّر» bold وحدَه">
                    <CalendarCheck size={30} weight="fill" /><Compass size={30} weight="fill" />
                    <Megaphone size={30} weight="fill" /><Ticket size={30} weight="fill" />
                    <Fire size={30} weight="fill" /><Medal size={30} weight="fill" />
                    <Repeat size={30} weight="bold" />
                  </Face>
                  <Face label="صار" note="duotone كسائر الموقع">
                    <CalendarCheck size={30} weight={ICON_WEIGHT} /><Compass size={30} weight={ICON_WEIGHT} />
                    <Megaphone size={30} weight={ICON_WEIGHT} /><Ticket size={30} weight={ICON_WEIGHT} />
                    <Fire size={30} weight={ICON_WEIGHT} /><Medal size={30} weight={ICON_WEIGHT} />
                    <Repeat size={30} weight={ICON_WEIGHT} />
                  </Face>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader variant="soft" icon={<XLogo weight={ICON_WEIGHT} />} title="شعاراتُ البروفايل العلنيّ" subtitle="صفُّ منصّات العضو في ‎/m/‹اسمك›" />
              <CardBody>
                <div className="iclab-cmp">
                  <Face label="كان" note="مصمتةً (fill)، وهي يومَها في قائمة الاستثناء ووزنُها bold">
                    <XLogo size={30} weight="fill" /><InstagramLogo size={30} weight="fill" />
                    <TiktokLogo size={30} weight="fill" /><LinkedinLogo size={30} weight="fill" />
                  </Face>
                  <Face label="صار" note="duotone: الشعاراتُ الأربعةُ خرجت من قائمة الاستثناء">
                    <XLogo size={30} weight={ICON_WEIGHT} /><InstagramLogo size={30} weight={ICON_WEIGHT} />
                    <TiktokLogo size={30} weight={ICON_WEIGHT} /><LinkedinLogo size={30} weight={ICON_WEIGHT} />
                  </Face>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader variant="soft" icon={<YoutubeLogo />} title="شعارُ يوتيوب" subtitle="صفُّ منصّات البرنامج في ‎/radio/‹البرنامج›" />
              <CardBody>
                <div className="iclab-cmp">
                  <Face label="كان" note="يوتيوب duotone وحدَه بين ثلاثةٍ bold: صفٌّ بوزنين">
                    <YoutubeLogo size={30} weight={ICON_WEIGHT} /><XLogo size={30} weight={ICON_WEIGHT_EXCEPTION} />
                    <InstagramLogo size={30} weight={ICON_WEIGHT_EXCEPTION} /><TiktokLogo size={30} weight={ICON_WEIGHT_EXCEPTION} />
                  </Face>
                  <Face label="صار" note="الصفُّ كلُّه duotone، فاستوى">
                    <YoutubeLogo size={30} weight={ICON_WEIGHT} /><XLogo size={30} weight={ICON_WEIGHT} />
                    <InstagramLogo size={30} weight={ICON_WEIGHT} /><TiktokLogo size={30} weight={ICON_WEIGHT} />
                  </Face>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* ══ منطقةُ duotone ══════════════════════════════════════════════ */}
        <section className="mt-14">
          <h2 className="mb-1 font-display text-2xl font-black text-content">منطقةُ duotone</h2>
          <p className="mb-5 max-w-2xl text-sm text-content-muted">
            استثناءُ الاستثناء، بالمكان لا بالاسم (قرارك ٢٠٢٦-٠٨-١٣): سطحٌ يُعلن نفسَه منطقةً
            فترجع كلُّ أيقونةٍ فيه إلى duotone ولو كان اسمُها في القائمة. وأوّلُ ساكنيها
            <b> الشريطُ الجانبيّ للوحة</b>. والأيقوناتُ أدناه واحدةٌ في الوجهين، لم يتغيّر إلّا المكان.
          </p>
          <div className="iclab-cmp" style={{ maxWidth: 620 }}>
            <div className="iclab-face">
              <span className="iclab-face-lbl">خارجها</span>
              <div className="iclab-face-row">
                <CaretDown size={30} /><Checks size={30} /><SignOut size={30} />
                <Plus size={30} /><MagnifyingGlass size={30} />
              </div>
              <span className="iclab-face-note">وزنُ الاستثناء: bold</span>
            </div>
            <DuotoneZone>
              <div className="iclab-face">
                <span className="iclab-face-lbl">داخلها (الشريط)</span>
                <div className="iclab-face-row">
                  <CaretDown size={30} /><Checks size={30} /><SignOut size={30} />
                  <Plus size={30} /><MagnifyingGlass size={30} />
                </div>
                <span className="iclab-face-note">ترجع إلى وزن الموقع: duotone</span>
              </div>
            </DuotoneZone>
          </div>
        </section>

        {/* ══ المستثنَون ══════════════════════════════════════════════════ */}
        <section className="mt-14">
          <h2 className="mb-1 font-display text-2xl font-black text-content">
            المستثنَون <span className="font-latin text-lg text-content-muted">bold · {Object.keys(EXC).length}</span>
          </h2>
          <p className="mb-5 max-w-2xl text-sm text-content-muted">
            سبعةُ صفوفٍ، لكلٍّ علّتُه. والقاعدةُ الحاكمة: duotone يليق بالأيقونة التي طبقتُها
            الخافتة جسمُها (كتابٌ يمتلئ، شخصٌ يثقُل)، ويفسد حين تكون الطبقةُ شكلًا دخيلًا ليس منها.
          </p>
          {EXC_GROUPS.map((g) => (
            <div key={g.n} className="mt-6">
              <h3 className="font-display text-lg font-black text-content">{g.n} · {g.title}</h3>
              <p className="mb-3 text-sm text-content-muted">{g.why}</p>
              <div className="iclab-grid">
                {g.names.map((n) => <Tile key={n} name={n} Icon={EXC[n]} />)}
              </div>
            </div>
          ))}
        </section>

        {/* ══ البقيّة ═════════════════════════════════════════════════════ */}
        <section className="mt-14">
          <h2 className="mb-1 font-display text-2xl font-black text-content">
            البقيّة <span className="font-latin text-lg text-content-muted">duotone · {Object.keys(DUO).length}</span>
          </h2>
          <p className="mb-5 max-w-2xl text-sm text-content-muted">
            كلُّ ما يستورده الموقعُ فعلًا خارج القائمة. لا تكتب شاشةٌ وزنَه: يأتي من الجذر.
            فإن رأيتَ فيها ما يفسده الوزنُ المزدوج، سمِّه لي فيدخل القائمة.
          </p>
          <div className="iclab-grid">
            {Object.entries(DUO).map(([n, Icon]) => <Tile key={n} name={n} Icon={Icon} />)}
          </div>
        </section>
      </Container>
    </main>
  );
}
