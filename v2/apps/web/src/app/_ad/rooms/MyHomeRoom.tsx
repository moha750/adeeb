"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * غرفةُ «الرئيسية» على قالب «الحساب» (مختبر ٢٠٢٦-١١-٠٧) — السلوكُ سلوكُ `dashboard/_portal/PortalHome.tsx` المعتمد (المالك ٢٠٢٦-١٠-١٣)
 * حرفًا: **ملخّصٌ لا نسخة** — ما ينتظرك الآن، وكلُّ عنصرٍ يأخذك إلى غرفته، إلّا الشهادةُ الجاهزة فتُنزَّل في مكانها. ثمّ ما تستكشفه
 * («فرصٌ تناسب رغباتك» للمتطوّع، و«فعاليّاتٌ يُحجز فيها الآن» للصديق ولمن لا ينتظره شيء)، ودعوةُ «تطوّع في أدِيب» للصديق، وأرقامُك.
 *
 * **صدرُها يُصمَّم لها لا يُركَّب من طقم الغرف** (محمد ٢٠٢٦-١١-٠٧، بعد «لوح اليوم» و«بطاقتك» و«أجندتك»: «السابقُ أجمل لأنّه متنوّعٌ
 * بصريًّا، أقوى… الحالي أنظف» و«هل التصاميمُ مقيّدتك؟»). فثلاثةُ وجوهٍ في المختبر (`look`)، والجسمُ تحتها واحد:
 * - **المنقولة** (`port`): رئيسيّةُ الأمس كما هي بمادّة الهويّة — التحيّةُ والخلاصةُ وصفُّ الأرقام، والبطاقةُ بجانبها؛ وعلى الجوّال
 *   ما ينتظرك أوّلًا والبطاقةُ آخرًا كما كانت.
 * - **تذكرتُك** (`pass`): الصدرُ تذكرةٌ كبيرةٌ كعبُها وجهُك ومكانتُك، وورقتُها يومُك وأرقامُك.
 * - **اللوحُ والبطاقة** (`hero`): لوحٌ عريضٌ بالخلاصة، وبطاقةُ أدِيب مائلةٌ تخرج من حدّه؛ وما ينتظرك تحته تذاكرُ غرفها.
 * - **الصناديق** (`bento`، من المرجع الذي اختاره محمد بعد عرض المراجع ٢٠٢٦-١١-٠٧): كلُّ معلومةٍ صندوقٌ بحجم أهمّيّتها، وللصفحة
 *   حدٌّ ثابت (ثلاثةُ صفوف) أيًّا كان ما عندك؛ انظر `_ad/bento.tsx`.
 * - **بطاقتك وأيّامك** (`days`، بعد «استوردتَ التخطيط من الحاليّة، ما ابتكرت»): تُترك عمودا الأمس كلُّها، وتُبنى الصفحةُ على سؤالين:
 *   **من أنت** — بطاقتُك بحجمها لاصقةً وأرقامُك مطبوعةٌ عليها (وهي التي ستُحمَّل في المحفظة يومًا: محمد ٢٠٢٦-١١-٠٧)،
 *   و**ما القادمُ لك** — خطُّ أيّامك: موعدُك وحجزُك وما يُحجز وما يُطلب، كلٌّ على يومه.
 */
import { useState, useSyncExternalStore } from "react";
import {
  CalendarBlank, CalendarCheck, Certificate, Clock, HandHeart, Heart, Infinity as Endless, MapPin, Path, Ticket, UsersThree, WhatsappLogo,
} from "@phosphor-icons/react";
import { CaretLeft, CheckCircle, DownloadSimple, MagnifyingGlass, PencilSimple } from "@/app/_components/glyphs";
import { TYPE_META } from "@/lib/activities";
import { dateOnlyParts } from "@/lib/dates";
import { greetNow } from "@/lib/timeGreeting";
import { arCounted, type ArForms } from "@/lib/arabicCount";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import type { HomeView, HomeWaiting } from "@/app/dashboard/_portal/home";
import { AdActs, AdBadge, AdButton, AdCard, AdGroupTitle, AdNote, AdRoom, type AdStub } from "../primitives";
import { AdCols, AdDays, AdHello, AdHero, AdIdCard, AdInvite, AdLine, AdPass, AdSection, type AdDayItem, type AdDayStop, type AdFig } from "../account";
import { soonLabel, today as clubToday } from "@/app/dashboard/_portal/time";
import { AdBento, AdCardTile, AdHelloTile, AdInviteTile, AdJourneyTile, AdThingTile, AdWrapTile, type AdThing, type BentoN } from "../bento";
import { dayParts, fmtNum } from "../format";

export type HomeLook = "port" | "pass" | "hero" | "days" | "bento" | "units";

const AR: Record<HomeView["figs"][number]["key"], ArForms> = {
  hours: ["ساعة تطوّع", "ساعتا تطوّع", "ساعات تطوّع", "ساعة تطوّع"],
  joined: ["مشاركة", "مشاركتان", "مشاركات", "مشاركةً"],
  certs: ["شهادة", "شهادتان", "شهادات", "شهادةً"],
  bookings: ["حجز", "حجزان", "حجوزات", "حجزًا"],
  attended: ["فعاليّة حضرتها", "فعاليّتان حضرتهما", "فعاليّات حضرتها", "فعاليّةً حضرتها"],
};
const FIG_ICON = { hours: <Clock />, joined: <HandHeart />, certs: <Certificate />, bookings: <Ticket />, attended: <CheckCircle /> } as const;

const stubOf = (day: string | null | undefined, flexible?: boolean): AdStub | undefined => {
  if (flexible) return { big: "", icon: <Endless />, small: "مرنة" };
  if (!day) return undefined;
  const d = dayParts(`${day}T12:00:00`);
  return { big: d.day, small: d.month };
};
/** «موعد تطوّعك، بعد 7 أيام» ← كم بقي */
const soonOf = (k: string) => k.split("، ").slice(1).join("، ");

type Cert = Extract<HomeWaiting, { kind: "certificate" }>;
type Rec = Exclude<HomeWaiting, Cert>;
type Card = { name: string; avatar: string | null; gender: "male" | "female" | null; standing: string };

export function MyHomeRoom({ view, card, look = "port" }: { view: HomeView; card: Card; look?: HomeLook }) {
  const greet = useSyncExternalStore(() => () => {}, greetNow, () => null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const download = async (w: Cert) => {
    setBusy(true);
    try {
      const { downloadParticipation } = await import("@/lib/certificates/participation");
      await downloadParticipation(w.paper);
    } catch {
      toast.error("تعذّر رسم الشهادة. جرّب مرّةً أخرى.");
    } finally {
      setBusy(false);
    }
  };
  const female = card.gender === "female";
  const hi = `${greet ?? "أهلًا"} ${view.firstName}`;
  const figs: AdFig[] = view.figs.map((f) => ({ icon: FIG_ICON[f.key], value: fmtNum(f.value), label: arCounted(f.value, AR[f.key]), note: f.note }));
  const idCard = (
    <AdIdCard name={card.name} avatar={card.avatar} gender={card.gender} standing={card.standing} since={view.since}
      plate={view.volunteer} tierIcon={view.volunteer ? <HandHeart /> : <Heart />} />
  );

  /* ── ما ينتظرك: سطورًا في «المنقولة» و«تذكرتك» (كما كان: «ينتظرك» كرتٌ واحد)، وتذاكرَ غرفها في «اللوح والبطاقة» ── */
  const certLine = (w: Cert) => (
    <AdLine key="cert" icon={<Certificate />} k={w.k} v={w.v} sub={w.sub} tone="ok" toneAt="sub"
      act={{ icon: <DownloadSimple />, text: "تنزيل", label: `تنزيل شهادة ${w.v}` }} onClick={() => void download(w)} disabled={busy} />
  );
  const recLine = (w: Rec) => (
    <AdLine key={w.kind} icon={w.kind === "volunteer" ? <CalendarCheck /> : <Ticket />} k={w.k} v={w.v} sub={w.sub}
      act={{ icon: <CaretLeft />, text: "فتح", label: w.kind === "volunteer" ? "تفاصيل موعد تطوّعك" : "تفاصيل حجزك" }} href={w.href} />
  );
  const certNote = (w: Cert) => (
    <AdNote key="cert" tone="ok" icon={<Certificate />} label={w.k} title={w.v}
      action={<AdButton size="sm" icon={<DownloadSimple />} busy={busy} onClick={() => void download(w)}>تنزيل PDF</AdButton>}>
      {w.sub}.
    </AdNote>
  );
  const whenOf = (w: Rec) => [w.day ? dateOnlyParts(w.day)?.weekday : undefined, soonOf(w.k)].filter(Boolean).join("، ");
  const ticket = (w: Rec) => {
    const when = { icon: <CalendarBlank />, text: whenOf(w) };
    if (w.kind === "booking") {
      const href = w.activityId ? `/activities/${w.activityId}` : w.href;
      return (
        <AdCard key="booking" seed={w.activityId ?? w.href} stub={stubOf(w.day)}
          chips={<>
            <AdBadge>{(w.type && TYPE_META[w.type as keyof typeof TYPE_META]?.label) || "فعاليّة"}</AdBadge>
            {w.confirmed ? <AdBadge tone="ok" icon={<CalendarCheck />}>حضورك مؤكَّد</AdBadge> : <AdBadge tone="warn" icon={<WhatsappLogo />}>نؤكّده معك بواتساب</AdBadge>}
          </>}
          title={w.v} href={href}
          meta={[{ icon: <Clock />, text: w.time || "الوقتُ يُعلَن قريبًا" }, ...(w.place ? [{ icon: <MapPin />, text: w.place }] : []), when]}
          foot={<AdActs primary={{ label: "افتح الفعاليّة", icon: <Ticket />, href }} ops={[{ key: "mine", label: "حجوزاتي", icon: <Ticket />, href: "/dashboard/bookings" }]} />} />
      );
    }
    return (
      <AdCard key="volunteer" seed={w.href} stub={stubOf(w.day)}
        chips={<AdBadge tone="ok" icon={<CalendarCheck />}>{w.say ?? "قُبلت، نراك في موعدك"}</AdBadge>} title={w.v} href={w.href}
        meta={[...(w.sub ? [{ icon: <Clock />, text: w.sub }] : []), when]}
        foot={<AdActs primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: w.href }} ops={[{ key: "mine", label: "تطوّعي", icon: <HandHeart />, href: "/dashboard/volunteer" }]} />} />
    );
  };
  const certs = view.waiting.filter((w): w is Cert => w.kind === "certificate");
  const recs = view.waiting.filter((w): w is Rec => w.kind !== "certificate");
  const waiting = !view.waiting.length ? null : look === "hero" ? (
    <div className="ad-acc-group">
      {certs.map(certNote)}
      {recs.length ? <div className="ad-grid">{recs.map(ticket)}</div> : null}
    </div>
  ) : (
    <AdSection icon={<CalendarCheck />} title="ينتظرك">
      {view.waiting.map((w) => (w.kind === "certificate" ? certLine(w) : recLine(w)))}
    </AdSection>
  );

  /* ── ما تستكشفه ── */
  const events = !view.waiting.length || !view.volunteer ? (
    <AdSection icon={<Ticket />} title="فعاليّاتٌ يُحجز فيها الآن">
      {view.events.length ? view.events.map((e) => (
        <AdLine key={e.id} icon={<Ticket />} k={e.when} v={e.title} sub={e.seats}
          act={{ icon: <Ticket />, text: "احجز", label: `احجز مقعدك في ${e.title}` }} href={`/activities/${e.id}`} />
      )) : <AdLine icon={<Ticket />} v="لا فعاليّةَ مفتوحةً للحجز الآن" sub="نُعلنها في الموقع وفي إشعاراتك" />}
    </AdSection>
  ) : null;
  const explore = view.volunteer ? (
    <AdSection icon={<MagnifyingGlass />} title="فرصٌ تناسب رغباتك">
      {view.prefs && !view.waiting.length ? (
        <AdLine icon={<Heart />} k="رغباتك" v={view.prefs.join("، ") || "لم ترتّبها بعد"}
          act={{ icon: <PencilSimple />, text: view.prefs.length ? "تعديل" : "إضافة", label: "رغباتك" }} href="/join" />
      ) : null}
      {view.opps.length ? view.opps.map((o) => (
        <AdLine key={o.id} icon={<UsersThree />} k={[o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصة"} v={o.title} sub={o.sub}
          act={{ icon: <CaretLeft />, text: "فتح", label: `تفاصيل ${o.title}` }} href={`/dashboard/volunteer/${o.id}`} />
      )) : <AdLine icon={<UsersThree />} v="لا فرصةَ مفتوحةً الآن" sub="نخبرك حين تُفتح فرصةٌ في لجانك" />}
    </AdSection>
  ) : (
    <AdInvite icon={<HandHeart />} title="تطوّع في أدِيب" sub="وكن من صنّاع فعاليّاته"
      points={[
        { icon: <UsersThree />, k: "لجانٌ تختار منها", v: "الفعاليات والإعلام والتصوير وغيرها" },
        { icon: <Clock />, k: "وقتُك بيدك", v: "تختار الفترات التي تناسبك" },
        { icon: <Certificate />, k: "جهدُك موثّق", v: "شهادةٌ لكلّ مشاركة، وساعاتٌ تُحسب لك" },
      ]}
      action={<AdButton variant="inverse" href="/join" icon={<HandHeart />}>{female ? "كوني متطوّعة أدِيب" : "كن متطوّع أدِيب"}</AdButton>} />
  );
  const stream = <AdCols aside={explore}>{waiting}{events}</AdCols>;

  if (look === "units") {
    /* ── «الوحدات» (٢٠٢٦-١١-٠٧، بعد قواعد النموّ التي اعتمدها محمد): الجوّالُ أوّلًا، وكلُّ نوعٍ وحدةٌ بشكلها، ومن كلّ نوعٍ ثلاثةٌ
       ثمّ «عرض الكل»، ولا تظهر وحدةٌ فارغة. الترتيبُ على الجوّال: الخلاصة، ثمّ ما يحتاج منك الآن (الشهادة)، ثمّ ما ينتظرك (تذاكرُ
       غرفها في شريطٍ يُسحب)، ثمّ بطاقتُك وأرقامُك عليها، ثمّ ما تستكشفه، ثمّ الدعوة. وعلى المكتب: البطاقةُ والدعوةُ عمودٌ جانبيّ لاصق ── */
    const mine = [...recs].sort((a, b) => ((a.day ?? "9") < (b.day ?? "9") ? -1 : 1));
    const showEvents = !view.waiting.length || !view.volunteer;
    const nothing = !view.waiting.length && !view.opps.length && !(showEvents && view.events.length);
    const card3 = (
      <AdIdCard name={card.name} avatar={card.avatar} gender={card.gender} standing={card.standing} since={view.since}
        plate={view.volunteer} tierIcon={view.volunteer ? <HandHeart /> : <Heart />} fields={figs} />
    );
    return (
      <AdRoom label="الرئيسية">
        <div className="ad-home-u">
          <div className="ad-home-u-main">
            <div className="ad-home-u-head" data-u="head"><AdHello hi={view.today ? `${hi}، ${view.today}` : hi} title={view.headline} /></div>
            {certs.length ? <div className="ad-home-u-now" data-u="now">{certs.map(certNote)}</div> : null}
            {mine.length ? (
              <section className="ad-home-u-wait" data-u="wait" aria-label="ينتظرك">
                <AdGroupTitle icon={<CalendarCheck />}>ينتظرك</AdGroupTitle>
                <div className="ad-strip" data-n={mine.length}>{mine.map(ticket)}</div>
              </section>
            ) : null}
            {nothing ? (
              <div data-u="explore">
                <AdNote tone="info" icon={<CalendarCheck />} label="ينتظرك" title="لا شيء ينتظرك الآن">نخبرك حين تُفتح فرصةٌ أو فعاليّة.</AdNote>
              </div>
            ) : (
              <div className="ad-home-u-explore" data-u="explore">
                {view.volunteer ? (
                  <AdSection icon={<MagnifyingGlass />} title="فرصٌ تناسب رغباتك" more={view.opps.length ? { label: "كل الفرص المفتوحة", href: "/dashboard/volunteer" } : undefined}>
                    {view.prefs && !view.waiting.length ? (
                      <AdLine icon={<Heart />} k="رغباتك" v={view.prefs.join("، ") || "لم ترتّبها بعد"}
                        act={{ icon: <PencilSimple />, text: view.prefs.length ? "تعديل" : "إضافة", label: "رغباتك" }} href="/join" />
                    ) : null}
                    {view.opps.length ? view.opps.map((o) => (
                      <AdLine key={o.id} icon={<UsersThree />} k={[o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصة"} v={o.title} sub={o.sub}
                        act={{ icon: <CaretLeft />, text: "فتح", label: `تفاصيل ${o.title}` }} href={`/dashboard/volunteer/${o.id}`} />
                    )) : <AdLine icon={<UsersThree />} v="لا فرصةَ مفتوحةً الآن" sub="نخبرك حين تُفتح فرصةٌ في لجانك" />}
                  </AdSection>
                ) : null}
                {showEvents && view.events.length ? (
                  <AdSection icon={<Ticket />} title="فعاليّاتٌ يُحجز فيها الآن" more={{ label: "كل الفعاليّات", href: "/activities" }}>
                    {view.events.map((e) => (
                      <AdLine key={e.id} icon={<Ticket />} k={e.when} v={e.title} sub={e.seats}
                        act={{ icon: <Ticket />, text: "احجز", label: `احجز مقعدك في ${e.title}` }} href={`/activities/${e.id}`} />
                    ))}
                  </AdSection>
                ) : null}
              </div>
            )}
          </div>
          <div className="ad-home-u-side">
            <div className="ad-home-u-card" data-u="card">{card3}</div>
            {view.volunteer ? null : (
              <div data-u="invite">
                <AdInvite icon={<HandHeart />} title="تطوّع في أدِيب" sub="وكن من صنّاع فعاليّاته"
                  art={<img src="/deebo/idea.webp" alt="" aria-hidden />}
                  points={[
                    { icon: <UsersThree />, k: "لجانٌ تختار منها", v: "الفعاليات والإعلام والتصوير وغيرها" },
                    { icon: <Clock />, k: "وقتُك بيدك", v: "تختار الفترات التي تناسبك" },
                    { icon: <Certificate />, k: "جهدُك موثّق", v: "شهادةٌ لكلّ مشاركة، وساعاتٌ تُحسب لك" },
                  ]}
                  action={<AdButton variant="inverse" href="/join" icon={<HandHeart />}>{female ? "كوني متطوّعة أدِيب" : "كن متطوّع أدِيب"}</AdButton>} />
              </div>
            )}
          </div>
        </div>
      </AdRoom>
    );
  }

  if (look === "bento") {
    /* ── صفُّ «ما ينتظرك»: أقربُ موعدٍ أو حجز، ثمّ الشهادةُ الجاهزة، ثمّ الباقي؛ وإن قلّ عن اثنين أكمله أقربُ ما هو مفتوحٌ لك ── */
    const dateOf = (day?: string | null, flexible?: boolean) => {
      if (flexible) return { big: <Endless />, small: "مرنة" };
      if (!day) return undefined;
      const d = dayParts(`${day}T12:00:00`);
      return { big: d.day, small: d.month };
    };
    const relOf = (day?: string | null) => (day ? [dateOnlyParts(day)?.weekday, soonLabel(day)].filter(Boolean).join("، ") : undefined);
    const mineOf = (w: Rec): AdThing => {
      if (w.kind === "booking") {
        const href = w.activityId ? `/activities/${w.activityId}` : w.href;
        return { key: "booking", tone: "mine", icon: <Ticket />, k: "حجزك", title: w.v, date: dateOf(w.day),
          meta: [relOf(w.day), [w.time, w.place].filter(Boolean).join("، ")].filter((x): x is string => !!x),
          act: <AdButton size="sm" variant="inverse" icon={<Ticket />} href={href}>افتح الفعاليّة</AdButton> };
      }
      return { key: "shift", tone: "mine", icon: <CalendarCheck />, k: "موعد تطوّعك", title: w.v, date: dateOf(w.day),
        meta: [relOf(w.day), w.sub].filter((x): x is string => !!x),
        act: <AdButton size="sm" variant="inverse" icon={<HandHeart />} href={w.href}>افتح الفرصة</AdButton> };
    };
    const certOf = (w: Cert): AdThing => ({ key: "cert", tone: "ok", icon: <Certificate />, k: w.k, title: w.v, meta: [w.sub],
      act: <AdButton size="sm" icon={<DownloadSimple />} busy={busy} onClick={() => void download(w)}>تنزيل PDF</AdButton> });
    const eventOf = (e: HomeView["events"][number]): AdThing => ({ key: `e-${e.id}`, tone: "open", icon: <Ticket />, k: "يُحجز الآن", title: e.title,
      date: dateOf(e.day), meta: [relOf(e.day), e.seats].filter((x): x is string => !!x),
      act: <AdButton size="sm" icon={<Ticket />} href={`/activities/${e.id}`}>احجز مقعدك</AdButton> });
    const oppOf = (o: HomeView["opps"][number]): AdThing => ({ key: `o-${o.id}`, tone: "open", icon: <UsersThree />,
      k: [o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصةُ تطوّع", title: o.title,
      date: dateOf(o.day, o.flexible), meta: [o.sub],
      act: <AdButton size="sm" icon={<HandHeart />} href={`/dashboard/volunteer/${o.id}`}>افتح الفرصة</AdButton> });

    const mine = [...recs].sort((a, b) => ((a.day ?? "9") < (b.day ?? "9") ? -1 : 1));
    const slots: AdThing[] = [...mine.slice(0, 1).map(mineOf), ...certs.map(certOf), ...mine.slice(1).map(mineOf)];
    const pool: AdThing[] = view.volunteer
      ? [...view.opps.map(oppOf), ...(view.waiting.length ? [] : view.events.map(eventOf))]
      : view.events.map(eventOf);
    while (slots.length < 2 && pool.length) slots.push(pool.shift() as AdThing);
    const n = Math.min(slots.length, 3) as BentoN;
    const shown = new Set(slots.map((s) => s.key));
    const restOpps = view.opps.filter((o) => !shown.has(`o-${o.id}`)).slice(0, 2);

    const all0 = view.figs.every((f) => !f.value);
    const explore2 = view.volunteer ? (
      <AdWrapTile area="explore">
        <AdSection icon={<MagnifyingGlass />} title="فرصٌ تناسب رغباتك">
          {view.prefs && !view.waiting.length ? (
            <AdLine icon={<Heart />} k="رغباتك" v={view.prefs.join("، ") || "لم ترتّبها بعد"}
              act={{ icon: <PencilSimple />, text: view.prefs.length ? "تعديل" : "إضافة", label: "رغباتك" }} href="/join" />
          ) : null}
          {restOpps.length ? restOpps.map((o) => (
            <AdLine key={o.id} icon={<UsersThree />} k={[o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصة"} v={o.title} sub={o.sub}
              act={{ icon: <CaretLeft />, text: "فتح", label: `تفاصيل ${o.title}` }} href={`/dashboard/volunteer/${o.id}`} />
          )) : <AdLine icon={<UsersThree />} v={view.opps.length ? "ولا فرصةَ غيرُها الآن" : "لا فرصةَ مفتوحةً الآن"} sub="نخبرك حين تُفتح فرصةٌ في لجانك" />}
        </AdSection>
      </AdWrapTile>
    ) : (
      <AdInviteTile title="تطوّع في أدِيب" sub="وكن من صنّاع فعاليّاته: لجانٌ تختار منها، ووقتُك بيدك، وجهدُك موثّقٌ بشهادة."
        action={<AdButton variant="inverse" href="/join" icon={<HandHeart />}>{female ? "كوني متطوّعة أدِيب" : "كن متطوّع أدِيب"}</AdButton>} />
    );
    return (
      <AdRoom label="الرئيسية">
        <AdBento n={n}>
          <AdHelloTile hi={hi} date={view.today} title={view.headline} deebo={greet === "صباح الخير" ? "good-morning" : "waving"} />
          <AdCardTile>{idCard}</AdCardTile>
          {n === 0 ? (
            <AdThingTile area="w1" thing={{ key: "none", tone: "open", icon: <CalendarCheck />, k: "ينتظرك", title: "لا شيء ينتظرك الآن",
              meta: ["نخبرك حين تُفتح فرصةٌ أو فعاليّة"], deebo: "waiting" }} />
          ) : slots.slice(0, 3).map((s, i) => <AdThingTile key={s.key} area={(["w1", "w2", "w3"] as const)[i]} thing={s} />)}
          <AdJourneyTile icon={<Path />} figs={figs.map((f) => ({ label: f.label, value: f.value, note: f.note }))}
            empty={all0 ? (view.volunteer ? "تبدأ رحلتك بأوّل مشاركة" : "تبدأ رحلتك بأوّل حجز") : undefined} />
          {explore2}
        </AdBento>
      </AdRoom>
    );
  }

  if (look === "days") {
    /* ── خطُّ أيّامك: اليومُ أوّلًا، ثمّ كلُّ يومٍ فيه شيء، ثمّ «متى شئت» ── */
    const now = clubToday();
    const days = new Map<string, AdDayItem[]>();
    const put = (day: string | null | undefined, it: AdDayItem, flexible?: boolean) => {
      const k = flexible ? "any" : !day || day < now ? now : day;
      days.set(k, [...(days.get(k) ?? []), it]);
    };
    for (const w of view.waiting) {
      if (w.kind === "certificate") {
        put(now, { key: "cert", tone: "ok", icon: <Certificate />, k: w.k, title: w.v, meta: w.sub,
          act: <AdButton size="sm" icon={<DownloadSimple />} busy={busy} onClick={() => void download(w)}>تنزيل PDF</AdButton> });
      } else if (w.kind === "volunteer") {
        put(w.day, { key: "shift", tone: "mine", icon: <CalendarCheck />, k: w.k.split("، ")[0], title: w.v, meta: w.sub,
          act: <AdButton size="sm" variant="inverse" icon={<HandHeart />} href={w.href}>افتح الفرصة</AdButton> });
      } else {
        const href = w.activityId ? `/activities/${w.activityId}` : w.href;
        put(w.day, { key: "booking", tone: "mine", icon: <Ticket />, k: w.k.split("، ")[0], title: w.v, meta: [w.time, w.place].filter(Boolean).join("، ") || undefined,
          act: <AdButton size="sm" variant="inverse" icon={<Ticket />} href={href}>افتح الفعاليّة</AdButton> });
      }
    }
    if (!view.waiting.length || !view.volunteer) {
      for (const e of view.events) {
        put(e.day, { key: `e-${e.id}`, tone: "open", icon: <Ticket />, k: "فعاليّةٌ يُحجز فيها", title: e.title, meta: e.seats,
          act: <AdButton size="sm" icon={<Ticket />} href={`/activities/${e.id}`}>احجز مقعدك</AdButton> });
      }
    }
    for (const o of view.opps) {
      put(o.day, { key: `o-${o.id}`, tone: "open", icon: <UsersThree />, k: [o.committee, o.fit ? "من رغباتك" : null].filter(Boolean).join("، ") || "فرصةُ تطوّع",
        title: o.title, meta: o.flexible || !o.day ? o.sub : o.sub.split("، ").slice(1).join("، ") || undefined,
        act: <AdButton size="sm" icon={<HandHeart />} href={`/dashboard/volunteer/${o.id}`}>افتح الفرصة</AdButton> }, o.flexible);
    }
    const rank = { mine: 0, ok: 1, open: 2 } as const;
    const sorted = (xs: AdDayItem[]) => [...xs].sort((a, b) => rank[a.tone] - rank[b.tone]);
    const tp = dateOnlyParts(now);
    const stops: AdDayStop[] = [
      { key: now, mark: "here", big: "اليوم", small: tp ? `${tp.weekday} ${tp.day} ${tp.month}` : "", items: sorted(days.get(now) ?? []), none: "لا شيء اليوم" },
      ...[...days.keys()].filter((k) => k !== now && k !== "any").sort().map((k): AdDayStop => {
        const p = dateOnlyParts(k);
        const its = sorted(days.get(k) ?? []);
        return { key: k, mark: its.some((i) => i.tone === "mine") ? "mine" : "open", big: p ? String(p.day) : k, small: p?.month ?? "",
          rel: [p?.weekday, soonLabel(k)].filter(Boolean).join("، "), items: its };
      }),
      ...(days.has("any") ? [{ key: "any", mark: "any" as const, big: <Endless />, small: "متى شئت", items: sorted(days.get("any") ?? []) }] : []),
    ];
    const card2 = (
      <AdIdCard name={card.name} avatar={card.avatar} gender={card.gender} standing={card.standing} since={view.since}
        plate={view.volunteer} tierIcon={view.volunteer ? <HandHeart /> : <Heart />} fields={figs} />
    );
    const under = view.volunteer ? (
      view.prefs && !view.waiting.length ? (
        <AdNote tone="info" icon={<Heart />} label="رغباتك" title={view.prefs.length ? view.prefs.join("، ") : "لم ترتّبها بعد"}
          action={<AdButton href="/join" size="sm" icon={<PencilSimple />}>{view.prefs.length ? "تعديل رغباتك" : "تحديد رغباتك"}</AdButton>} />
      ) : null
    ) : explore;
    return (
      <AdRoom label="الرئيسية">
        <div className="ad-home-days">
          <AdHello hi={hi} title={view.headline} />
          {/* على الجوّال: التحيّةُ ثمّ البطاقةُ ثمّ أيّامُك ثمّ الدعوة، فلا تؤخّرُ الدعوةُ ما ينتظرك (`display: contents`) */}
          <div className="ad-home-days-card">
            <div className="ad-home-days-id">{card2}</div>
            {under ? <div className="ad-home-days-more">{under}</div> : null}
          </div>
          <div className="ad-home-days-rail"><AdDays label="أيّامك القادمة" stops={stops} /></div>
        </div>
      </AdRoom>
    );
  }

  if (look === "pass") {
    return (
      <AdRoom label="الرئيسية">
        <AdPass face={<Avatar name={card.name} src={card.avatar ?? undefined} gender={card.gender} size="xl" />}
          name={card.name} standing={card.standing} since={view.since} hi={hi} title={view.headline} figs={figs} />
        {stream}
      </AdRoom>
    );
  }
  if (look === "hero") {
    return (
      <AdRoom label="الرئيسية">
        <AdHero hi={hi} title={view.headline} figs={figs} card={idCard} />
        {stream}
      </AdRoom>
    );
  }
  // المنقولة: البطاقةُ عمودٌ بجانب التحيّة، وعلى الجوّال آخرُ الصفحة بعد ما ينتظرك (كما كانت)
  return (
    <AdRoom label="الرئيسية">
      <div className="ad-home-port">
        <AdHello hi={hi} title={view.headline} figs={figs} />
        <div className="ad-home-port-card">{idCard}</div>
        <div className="ad-home-port-stream">{stream}</div>
      </div>
    </AdRoom>
  );
}
