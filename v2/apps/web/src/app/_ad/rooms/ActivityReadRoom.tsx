"use client";

/**
 * **صفحةُ الفعاليّة على قالب «القراءة»** (٢٠٢٦-١١-١٥، `_ad/read.tsx`). السلوكُ سلوكُ الصفحة القديمة حرفًا: الفعاليّةُ من قارئها
 * (`getPublicActivity`)، والحجزُ صندوقُه نفسُه (`BookingWidget`: الجلسة، وإكمالُ البيانات مرّةً، والإلغاء) ومرساتُه `#book`.
 *
 * **والفعاليّةُ تذكرة** (محمد: «العرضُ بدائيٌّ جدًّا… أمنحك المساحةَ لتبدع»): كانت أقسامًا من سطورٍ متشابهة («الموعد والمكان»، ثمّ
 * «احجز مقعدك»، ثمّ «الضيوف») فتُقرأ استمارةً. صارت قطعةَ الهويّة الأقوى، **التذكرة بكعبها** (`AdTicket` من «تذكرتك»): الكعبُ قطعةٌ من
 * اللوح فيها يومُها كبيرًا وشهرُه ويومُ الأسبوع وكم بقي، والورقةُ صفوفٌ كتذكرة السفر — متى وأين ولمن، ثمّ المقاعدُ والمسجَّلون وآخرُ
 * موعد — وقاعُها أفعالُها: الخريطة، والتقويم، والمشاركة. والفعاليّةُ التي مضت تذكرةٌ مستعملة: حصيلتُها مكانَ مقاعدها، وخبرُها في قاعها.
 * ثمّ **الضيوفُ كروتُ أشخاصٍ واقفين** (`AdSeats`، صفُّ القيادة نفسُه) لا أسطر، ثمّ الحجزُ، ثمّ «عن الفعاليّة».
 */
import { Buildings, CalendarBlank, CalendarPlus, Certificate, ChartBar, Clock, DotsThree, HourglassMedium, LinkSimple, MapPin, Microphone, Newspaper, ShareNetwork, Ticket, TextAlignRight, UserCheck, UsersThree, WhatsappLogo, XLogo } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@/app/_components/glyphs";
import { soonLabel } from "@/app/dashboard/_portal/time";
import { useShare } from "@/app/news/[slug]/_parts/useShare";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { AUDIENCE_LABEL, TYPE_META, guestRoleLabel } from "@/lib/activities";
import { dateOnlyParts } from "@/lib/dates";
import type { PublicActivity } from "@/app/activities/data";
import { BookingWidget, type BookingParts } from "@/app/activities/[id]/BookingWidget";
import { AdBadge, AdButton, AdGroupTitle, AdNote, AdSeats, cutOf, type AdFigure } from "../primitives";
import { DropdownMenu } from "@/app/dashboard/_components/DropdownMenu";
import { AdTicket, type AdTicketAct, type AdTicketFig } from "../account";
import { PubRead } from "../read";

/**
 * **أرقامُ التذكرة بشرائطها** — «الحجوزات» كما يقولها رأسُ سجلّ الفعاليّة في البوّابة (المحجوزُ من المقاعد، والنسبةُ، و«مكتملة» إذا
 * امتلأت)، ولكلّ جنسٍ رقمُه حين تُقسم المقاعد. والمفتوحةُ بلا عدد رقمُ مسجَّليها وكلمتُها مكانَ النسبة؛ وما مضى حضورُه من مسجَّليه.
 * والملغاةُ لا أرقامَ لها.
 */
function figuresOf(a: PublicActivity): AdFigure[] {
  if (a.cancelled) return [];
  if (a.past) {
    return a.booked ? [{ icon: <UserCheck />, label: "حضروا من المسجَّلين", value: `${a.attended ?? 0} / ${a.booked}`, of: { now: a.attended ?? 0, max: a.booked } }] : [];
  }
  // المفتوحةُ بلا عدد رقمُها مسجَّلوها — ولا «المسجَّلون 0» على فعاليّةٍ جديدة: صفرٌ بلا سقفٍ لا يقول شيئًا ويصدّ أوّلَ زائر
  if (a.unlimited) return a.booked ? [{ icon: <Ticket />, label: "المسجَّلون", value: `${a.booked}`, of: { now: a.booked, max: 0, note: "بلا عدد" } }] : [];
  const fig = (label: string, seats: number | null, left: number | null): AdFigure => {
    const max = seats ?? 0;
    const now = Math.max(0, max - (left ?? 0));
    return { icon: <Ticket />, label, value: `${now} / ${max}`, of: { now, max, full: "مكتملة" } };
  };
  if (a.splitByGender) {
    return (["male", "female"] as const)
      .filter((g) => !a.targetGender || a.targetGender === g)
      .map((g) => (g === "male" ? fig("حجوزات الرجال", a.maleSeats, a.maleRemaining) : fig("حجوزات النساء", a.femaleSeats, a.femaleRemaining)));
  }
  return [fig("الحجوزات", a.totalSeats, a.totalRemaining)];
}

/**
 * **خاناتُ التذكرة** بترتيبٍ واحد في كلّ حال، أزواجًا بمعناها في عموديها: متى وأين، ثمّ لمن وحتى متى يُسجَّل، ثمّ ما تحمله (الشهادة)
 * ومن نظّمها. وما لم يُعرف لا يُكتب فتجري الخاناتُ بعده مكانَه. وموعدُ التسجيل للمفتوحة وحدها: المغلقةُ يقولها قاعُها، وما مضى أو أُلغي
 * لا تسجيلَ فيه. و«الفئة» لا «الحضور»: الحضورُ رقمُ ما مضى (`figuresOf`)، فلا تحمل الكلمةُ معنيين في تذكرةٍ واحدة.
 */
function factsOf(a: PublicActivity): AdTicketFig[] {
  const open = !a.past && !a.cancelled && !a.closed;
  const [closesDay, closesAt] = (a.closesLabel ?? "").split(" الساعة ");
  return [
    ...(a.timeLabel ? [{ icon: <Clock />, label: "الوقت", value: a.timeLabel }] : []),
    ...(a.location ? [{ icon: <MapPin />, label: "المكان", value: a.location }] : []),
    { icon: <UsersThree />, label: "الفئة", value: a.targetGender ? `${AUDIENCE_LABEL[a.targetGender]} فقط` : "للجنسين" },
    ...(open && a.closesLabel ? [{ icon: <HourglassMedium />, label: "آخر موعد للتسجيل", value: closesDay, note: closesAt ? `الساعة ${closesAt}` : undefined }] : []),
    ...(a.certificate ? [{ icon: <Certificate />, label: "شهادة الحضور", value: a.past ? "مُنحت لمن حضر" : "تُمنح لمن يحضر" }] : []),
    ...(a.organizer ? [{ icon: <Buildings />, label: "الجهة المنظِّمة", value: a.organizer }] : []),
  ];
}

export function ActivityRead({ a, demo }: { a: PublicActivity;
  /** مختبرُ الصفحة وحده (لا يُرفع): حالُ الحجز مرسومةً بلا جلسة — الزائرُ بلا حساب، ومن حجز — لتُرى كلُّ أحوال القاع */
  demo?: BookingParts }) {
  const router = useRouter();
  const share = useShare(`/activities/${a.id}`, a.name);
  const toCalendar = () => downloadIcs("adeeb-event", buildIcs({
    uid: a.id, title: a.name, day: a.date, start: a.startTime, end: a.endTime, location: a.location,
    url: typeof window === "undefined" ? undefined : window.location.href, description: a.description,
  }));

  /* **المشاركةُ قسيمةٌ من قسائم التذكرة** (محمد ٢٠٢٦-١١-١٦: «شارك في التنبيه ليست جميلة»؛ وقبلها: «ما عندنا مكوّنٌ لأمورٍ مثل هذه»):
     آخرَ قسائمها بعد التقويم والخريطة — هي فعلٌ بالفعاليّة نفسِها لا بحالك — تفتح **قائمةَ «المزيد»
     نفسَها** (`DropdownMenu`) بوجهاتها بأسمائها — واتساب، وإكس، ونسخُ الرابط، ومشاركةُ الجهاز — فهي قطعةُ الهويّة لا سطرٌ مخترع، وقرارُ
     المالك (٢٠٢٦-١٠-١٤: لا زرٌّ واحدٌ يُخمَّن ما يفعل) قائمٌ: الوجهةُ تُختار باسمها. جُرّبت قبلها قسمًا برأسه آخرَ الصفحة، ثمّ سطرَ أيقوناتٍ
     تحت الملصق. والملغاةُ لا تُشارَك */
  const toShare = !a.cancelled ? (
    <DropdownMenu ariaLabel="شارك الفعاليّة" triggerClassName="ad-ticket-coupon" trigger={<><ShareNetwork aria-hidden /><span className="ad-act-long">شارك الفعاليّة</span><span className="ad-act-short" aria-hidden>شارك</span></>} groups={[{
      // لا رأسَ لمجموعةٍ واحدة: الزرُّ قال اسمَها («شارك الفعاليّة»)، فرأسُها تكرارٌ له (٢٠٢٦-١١-١٦، كالكتيّب)
      items: [
        { label: "واتساب", icon: <WhatsappLogo />, onSelect: () => window.open(share.links.whatsapp, "_blank", "noopener,noreferrer") },
        { label: "إكس", icon: <XLogo />, onSelect: () => window.open(share.links.x, "_blank", "noopener,noreferrer") },
        { label: share.copied ? "نُسخ الرابط" : "نسخ الرابط", icon: share.copied ? <Check /> : <LinkSimple />, onSelect: share.copy },
        ...(share.native ? [{ label: "عبر الجهاز", icon: <DotsThree />, onSelect: share.more }] : []),
      ],
    }]} />
  ) : null;
  const next = <AdButton variant="soft" size="sm" icon={<CalendarBlank />} href="/activities">الفعاليّات القادمة</AdButton>;

  /** **حالُك تنبيهٌ تحت التذكرة** (`AdNote`، محمد ٢٠٢٦-١١-١٦): جملتُها وشرحُها بنغمتها، وفعلُها في طرفها؛ وما يحتاج مساحةً
   *  (إكمالُ البيانات، وسببُ الإلغاء) قسمٌ تحتها */
  const note = (p: BookingParts, icon?: ReactNode) => (
    <>
      <AdNote tone={p.tone ?? "info"} title={p.title} live={p.live} icon={icon ?? (p.icon === "full" ? <UsersThree /> : p.tone === "info" || !p.tone ? <Ticket /> : undefined)}
        action={p.acts}>{p.sub}</AdNote>
      {p.panel}
    </>
  );
  const about = <EventAbout a={a} />;

  return (
    <PubRead back={{ href: "/activities", label: "العودة إلى الفعاليّات" }} tags={<EventTags a={a} />} title={a.name}
      cover={a.cover ? { src: a.cover, alt: `ملصق ${a.name}` } : null} aside={about}>
      <div id="book" className="ad-pr-anchor"><EventTicket a={a} onCalendar={toCalendar} share={toShare} /></div>
      {a.cancelled ? note({ title: "أُلغيت هذه الفعاليّة", sub: "نعتذر عن ذلك، وتجد ما يقيمه أدِيب قريبًا في صفحة الفعاليّات.", tone: "warn", acts: next })
        : a.past ? note({ title: "انتهت هذه الفعاليّة", sub: `أُقيمت في ${a.dateLabel}.`, tone: "info",
            acts: a.coverage ? <AdButton variant="soft" size="sm" icon={<Newspaper />} href={`/news/${encodeURIComponent(a.coverage.slug)}`}>اقرأ خبر التغطية</AdButton> : next }, <ChartBar />)
        : a.closed ? note({ title: "أُغلق التسجيل", sub: `انتهى موعدُ التسجيل في ${a.closesLabel}.`, tone: "info", acts: next }, <HourglassMedium />)
        : demo ? note(demo)
        : (
          <BookingWidget activityId={a.id} unlimited={a.unlimited} splitByGender={a.splitByGender} targetGender={a.targetGender} totalRemaining={a.totalRemaining ?? 0} maleRemaining={a.maleRemaining} femaleRemaining={a.femaleRemaining}
            render={(p) => note(p)} />
        )}

      {/* **«عن الفعاليّة» نصٌّ يُقرأ لا صندوق**: عنوانُ المجموعة كعنوان «الضيوف»، والنصُّ على الأرض. وعلى السعة **تحت الملصق** (محمد
          ٢٠٢٦-١١-١٦) — يملأ ما كان فراغًا تحته، وعمودُه بقياس القراءة، والمتنُ يبقى لما تفعله (التذكرة، والحجز، والضيوف) — وفي الجوّال
          قبل الضيوف في مجرى الصفحة (الملصقُ هناك آخرُها). نسختان تُظهر الشاشةُ إحداهما (`ad.css`) */}
      {about}
      <EventGuests a={a} onOpen={(slug) => router.push(`/m/${encodeURIComponent(slug)}`)} />
    </PubRead>
  );
}

/**
 * **تذكرةُ الفعاليّة** وحدها — صفحتُها العامّة ومعاينةُ نموذجها في البوّابة («كما ستظهر» في الموقع) تقرآنها من مصدرٍ واحد. وبلا قاعٍ
 * (المعاينة) حقائقُها وأرقامُها وحدها. واليومُ قبل أن يُختار يقوله الكعبُ («لم يُحدَّد»).
 */
export function EventTicket({ a, onCalendar, share }: { a: PublicActivity; onCalendar?: () => void; share?: ReactNode }) {
  const stub = <EventStub a={a} />;
  return <AdTicket label="تذكرة الفعاليّة" stub={stub} facts={factsOf(a)} figures={figuresOf(a)} acts={actsOf(a, onCalendar)} menu={share} cut={cutOf(a.id)} />;
}

/** **قسائمُ التذكرة**: التقويمُ لما سيأتي ويُسجَّل فيه، والخريطةُ (بالدبّوس) لما لم يمضِ. والمعاينةُ بلا قسائم */
function actsOf(a: PublicActivity, onCalendar?: () => void): AdTicketAct[] {
  if (!onCalendar || a.past || a.cancelled) return [];
  return [
    // التقويمُ لما له يوم (معاينةُ النموذج قبل أن يُختار اليوم بلا قسيمته)
    ...(!a.closed && a.date ? [{ label: "أضف إلى التقويم", short: "التقويم", icon: <CalendarPlus />, onClick: onCalendar }] : []),
    ...(a.locationUrl ? [{ label: "افتح الخريطة", short: "الخريطة", icon: <MapPin />, href: a.locationUrl, external: true }] : []),
  ];
}

/** الكعب: اليومُ كبيرًا، والشهرُ والسنة، ويومُ الأسبوع حبّةً، وكم بقي (أو الحال) تحتها */
export function EventStub({ a }: { a: PublicActivity }) {
  const day = dateOnlyParts(a.date);
  return (
    <>
      {/* قبل أن يُختار اليوم (معاينةُ النموذج): مكانُ الرقم شرطةُ الفراغ، والشهرُ كلمةُ «الموعد» */}
      <b className="ad-ticket-day ad-num">{day?.day ?? "—"}</b>
      <span className="ad-ticket-month">{day ? `${day.month} ${day.year}` : a.dateLabel || "الموعد"}</span>
      {day ? <span className="ad-pass-tier">{day.weekday}</span> : null}
      <small className="ad-pass-since">{a.cancelled ? "أُلغيت" : a.past ? "انتهت" : day ? soonLabel(a.date) : "اليوم لم يُحدَّد"}</small>
    </>
  );
}

/** «عن الفعاليّة» نصٌّ على الأرض تحت عنوان مجموعته — الصفحةُ ومعاينةُ نموذجها من مصدرٍ واحد */
export function EventAbout({ a }: { a: PublicActivity }) {
  if (!a.description) return null;
  return (
    <section className="ad-pr-about">
      <AdGroupTitle icon={<TextAlignRight />}>عن الفعاليّة</AdGroupTitle>
      <p className="ad-pr-prose">{a.description}</p>
    </section>
  );
}

/** **ضيوفُ الفعاليّة** كروتُ أشخاصٍ واقفين: صفتُهم بتأنيثها في الكعب، واسمُهم بلقبه تحت وجوههم، وعضوُ أدِيب بصفحةٍ عامّة يفتحها اسمُه */
export function EventGuests({ a, onOpen }: { a: PublicActivity; onOpen?: (slug: string) => void }) {
  if (!a.guests || !a.guests.length) return null;
  return (
    <AdSeats label="الضيوف" seats={a.guests.map((g) => ({
      title: guestRoleLabel(g.role, g.gender), icon: <Microphone />,
      person: { name: g.honorific ? `${g.honorific} ${g.name}` : g.name, gender: g.gender, src: g.avatar ?? null },
      onOpen: g.slug && onOpen ? () => onOpen(g.slug!) : undefined,
      group: { label: "الضيوف", icon: <Microphone /> },
      foot: null,
    }))} />
  );
}

/** شاراتُ رأس الفعاليّة: النوعُ والجمهورُ حبّةٌ واحدة («ورشة للنساء») كما في كرت الفهرس، والحالُ حبّةٌ بنغمتها */
export function EventTags({ a }: { a: PublicActivity }) {
  return (
    <>
      <AdBadge glass>{a.targetGender ? `${TYPE_META[a.type].label} ${AUDIENCE_LABEL[a.targetGender]}` : TYPE_META[a.type].label}</AdBadge>
      {/* **الحالُ زجاجٌ محايدٌ كالنوع** (محمد ٢٠٢٦-١١-١٦: «مكتملة» بالذهبيّ «غير جميل أبدًا»): على اللوح الكحليّ تصرخ الكهرمانيّة، والتنبيهُ
          تحت التذكرة يقول الحالَ بنغمته */}
      {a.cancelled ? <AdBadge glass>أُلغيت</AdBadge> : a.past ? <AdBadge glass>انتهت</AdBadge> : a.full ? <AdBadge glass>مكتملة</AdBadge> : a.closed ? <AdBadge glass>أُغلق التسجيل</AdBadge> : null}
    </>
  );
}

