"use client";

/**
 * **قالبُ «الحساب»** (٢٠٢٦-١١-٠٤) — الطبقة ٤ لغرف صاحب الحساب الخمس: الرئيسية، وحجوزاتي، وشهاداتي، وتطوّعي، وحسابي.
 *
 * مساحةُ المرء نفسِه لا قائمةُ إدارة: ما ينتظره، وسجلّاتُه، وإعداداتُه — فلا بحثَ ولا مرشّحاتٍ ولا مواضع. وهو قطعتان فوق الأساس الواحد:
 * - **القسمُ وسطورُه** (`AdSection` + `AdLine`): لغةُ «حسابي» التي اعتمدها محمد (٢٠٢٦-١٠-١٣) وصارت من الشاشات الخمس المرجعيّة للهويّة —
 *   كرتٌ معنونٌ ورأسُه مربّعٌ من اللوح برمزه، وتحته سطور: رمزٌ في مربّعٍ مصبوغ، وتسميةٌ صغيرةٌ فوق قيمةٍ عريضة، ووصفٌ، وفعلٌ واحدٌ في طرفه
 *   والسطرُ كلُّه زرّ. والحالُ قيمةٌ بلون نغمتها لا شارة، والخطرُ سطرٌ بهيبته.
 * - **السجلّاتُ تذاكر** (`AdCard` من قالب «قائمة السجلّات» نفسِه): الحجزُ تذكرةُ فعاليّةٍ حرفًا، والشهادةُ كشهادات الخبرة — فالسجلُّ الواحد
 *   بشكلٍ واحدٍ في البوّابة كلّها، لا كرتٌ للإدارة وكرتٌ لصاحبه.
 * والرأسُ لوحُ الغرفة كسائر الغرف، والعمودان: العريضُ لما ينتظرك، والضيّقُ لسجلّك (يأخذ العريضُ العرضَ كلَّه بلا ضيّق).
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { Alert, Button, Modal } from "@adeeb/design-system";
import { CaretLeft, PencilSimple } from "@/app/_components/glyphs";
import { AdFigureRow, AdGroupTitle, AdRoom, AdStepsBar, PlateCrumb, RoomPlate, type AdAction, type AdFigure, type AdSteps } from "./primitives";
import { useRoomCrumb } from "./crumb";
import { Avatar } from "@/app/dashboard/_components/Avatar";

/** غرفةُ الحساب: لوحُها بفتاته من خريطة الشريط، وتحته مبدّلُ مواضعها إن كان (`head`: «القادمة» و«السابقة»)، ثمّ ما فيها. */
export function AccountRoom({ navPath, title, action, head, children }: { navPath: string; title: string; action?: AdAction; head?: ReactNode; children: ReactNode }) {
  const crumb = useRoomCrumb(navPath, title);
  return (
    <AdRoom label={title}>
      <div className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} action={action} />
        {head}
      </div>
      {children}
    </AdRoom>
  );
}

/**
 * **لوحُ اليوم** (رأسُ «الرئيسية»، مختبر ٢٠٢٦-١١-٠٥، الاتّجاه «أ»): الرئيسيةُ صدرُ البوّابة لا غرفةُ قائمة، فلوحُها لا يقول «الرئيسية»
 * وحدَها (الشريطُ الجانبيّ يقولها) بل **يومَك**: المسارُ فوقه، والخلاصةُ عنوانُه (`h1`)، وأرقامُ رحلتك زجاجًا تحتها، وأقربُ ما ينتظرك
 * قطعةُ زجاجٍ في طرفه بتاريخها وفعلِها — الشيءُ الواحدُ الأهمّ اليوم. وفي الضيّق تنزل القطعةُ تحت العنوان بعرض اللوح.
 */
export function AdToday({ navPath, room, title, sub, figs, next }: {
  navPath: string; room: string; title: string;
  /** سطرٌ تحت العنوان («أجندتك»: العنوانُ يومُك، وتحته خلاصتُه) */
  sub?: string;
  figs: { value: string; label: string }[];
  next?: AdTodayNextItem;
}) {
  const crumb = useRoomCrumb(navPath, room);
  return (
    <section className="ad-plate ad-today" aria-labelledby="ad-room-title">
      <div className="ad-today-body" data-next={next ? "" : undefined}>
        <div className="ad-today-say">
          <PlateCrumb crumb={[...crumb, { label: room }]} />
          <h1 id="ad-room-title" className="ad-today-title">{title}</h1>
          {sub ? <p className="ad-today-sub">{sub}</p> : null}
          {figs.length ? (
            <ul className="ad-today-figs">
              {figs.map((f) => <li key={f.label}><b className="ad-num">{f.value}</b><span>{f.label}</span></li>)}
            </ul>
          ) : null}
        </div>
        {next ? <AdTodayNext next={next} /> : null}
      </div>
    </section>
  );
}

export type AdTodayNextItem = { date?: { big: string; small: string }; icon?: ReactNode; label: string; title: string; sub?: string; action: ReactNode };
/** **أقربُ ما ينتظرك** قطعةً بتاريخها وفعلها — زجاجٌ على لوح اليوم («أ»)، وورقةٌ بحافّتها تحت عنوان الصفحة («ب») */
export function AdTodayNext({ next }: { next: AdTodayNextItem }) {
  return (
    <div className="ad-today-next">
      <span className="ad-today-next-mark" aria-hidden>
        {next.date ? <><b className="ad-num">{next.date.big}</b><small>{next.date.small}</small></> : next.icon}
      </span>
      <span className="ad-today-next-t">
        <small>{next.label}</small>
        <b>{next.title}</b>
        {next.sub ? <span>{next.sub}</span> : null}
      </span>
      <span className="ad-today-next-act">{next.action}</span>
    </div>
  );
}

/**
 * **بطاقةُ أدِيب** (رأسُ «الرئيسية»، مختبر ٢٠٢٦-١١-٠٥، الاتّجاه «ب»): بطاقةٌ بنسبة البطاقة الحقيقيّة — شعارُ أدِيب ومكانتُك في أعلاها،
 * ووجهُك واسمُك و«منذ…» في أسفلها. للمتطوّع قطعةٌ من اللوح، ولصديق أدِيب ورقةٌ بحافّتها (كبطاقة الرئيسية المعتمدة ٢٠٢٦-١٠-١٣: «للمتطوّع
 * كحليّة، ولصديق أدِيب فاتحة»). والمادّتان مادّتا الهويّة لا ثالثَ لهما.
 */
export function AdIdCard({ name, avatar, gender, standing, since, plate, tierIcon, fields }: {
  name: string; avatar: string | null; gender: "male" | "female" | null; standing: string; since?: string; plate: boolean; tierIcon?: ReactNode;
  /** أرقامُك مطبوعةً على البطاقة كحقول بطاقة المحفظة («بطاقتك وأيّامك»): البطاقةُ سجلُّك لا زينتُك */
  fields?: AdFig[];
}) {
  return (
    <div className={plate ? "ad-plate ad-idcard" : "ad-idcard"} data-paper={plate ? undefined : ""}>
      {/* بطاقةٌ حقيقيّة كبطاقة الأمس (المالك ٢٠٢٦-١٠-١٣): إكليلان في ركنين متقابلين يفيض ثلثُ كلٍّ منهما فتقصّه الحافّة، ووهجٌ من
          ركنها ولمعةٌ تعبرها عند المرور (وتسكن لمن طلب تقليلَ الحركة) */}
      <span className="ad-idcard-wreath" aria-hidden />
      <span className="ad-idcard-wreath" data-end="" aria-hidden />
      <span className="ad-idcard-gloss" aria-hidden />
      <div className="ad-idcard-body">
        <div className="ad-idcard-top">
          {/* الورقيّةُ في الداكن ورقٌ داكن، فشعارُها الأبيض (الكحليُّ عليه لا يُرى) — صورتان والوضعُ يختار */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ad-idcard-logo" data-light={plate ? undefined : ""} src={plate ? "/brand/logo-horizontal-white.svg" : "/brand/logo-horizontal.svg"} alt="أدِيب" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {plate ? null : <img className="ad-idcard-logo" data-dark="" src="/brand/logo-horizontal-white.svg" alt="" aria-hidden />}
          <span className="ad-idcard-tier">{tierIcon}{standing}</span>
        </div>
        {fields ? (
          <dl className="ad-idcard-figs">
            {fields.map((f) => <div key={f.label}><dt>{f.label}</dt><dd className="ad-num">{f.value}</dd></div>)}
          </dl>
        ) : null}
        <div className="ad-idcard-who">
          <Avatar name={name} src={avatar ?? undefined} gender={gender} size="lg" />
          <span><b>{name}</b>{since ? <small>{since}</small> : null}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ صدرُ «الرئيسية» (مختبر ٢٠٢٦-١١-٠٧): محمد: «السابقُ أجمل لأنّه متنوّعٌ بصريًّا، أقوى» و«هل التصاميمُ مقيّدتك؟» — فالصدرُ يُصمَّم
   لها لا يُركَّب من طقم الغرف، بمادّتي الهويّة. ثلاثةُ وجوه: المنقولةُ كما هي (`AdHello`)، وتذكرتُك (`AdPass`)، واللوحُ والبطاقةُ خارجةٌ منه (`AdHero`) ═══ */

export type AdFig = { icon: ReactNode; value: string; label: string; note?: string };

/** **صفُّ الأرقام** — كروتُ الرقم البيضاء بلا بطل (رئيسيّةُ الأمس: ثلاثةُ أرقامٍ متساوية تحت الخلاصة)، ولكلٍّ سطرُ شرحٍ إن كان */
export function AdStatRow({ items }: { items: AdFig[] }) {
  return (
    <div className="ad-stats ad-statrow" data-n={items.length}>
      {items.map((x) => (
        <div key={x.label} className="ad-stat">
          <span className="ad-stat-ic" aria-hidden>{x.icon}</span>
          <b className="ad-num">{x.value}</b>
          <span className="ad-stat-l">{x.label}</span>
          {x.note ? <small className="ad-stat-note">{x.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

/** **المنقولة** — صدرُ رئيسيّة الأمس المعتمد (٢٠٢٦-١٠-١٣) بمادّة الهويّة: التحيّةُ صغيرةً والخلاصةُ عنوانًا وصفُّ الأرقام. والبطاقةُ
 *  بجانبها تضعها الغرفة (`.ad-home-port`)، لأنّها على الجوّال تنزل آخرَ الصفحة بعد ما ينتظرك كما كانت */
export function AdHello({ hi, title, figs }: { hi: string; title: string; figs?: AdFig[] }) {
  return (
    <section className="ad-hello" aria-labelledby="ad-room-title">
      <p className="ad-hello-hi">{hi}</p>
      <h1 id="ad-room-title" className="ad-hello-title">{title}</h1>
      {figs ? <AdStatRow items={figs} /> : null}
    </section>
  );
}

/**
 * **أيّامُك** (رئيسيّةُ «بطاقتك وأيّامك»، مختبر ٢٠٢٦-١١-٠٧) — «ما القادمُ لك» على خطّ الزمن لا في قائمتين: اليومُ أوّلًا («أنت هنا»)،
 * ثمّ كلُّ يومٍ فيه شيءٌ محطّةً بتاريخها وكم بقي، وما لا يومَ له («متى شئت») آخرًا. وما هو **لك** (موعدُك، حجزُك) قطعةٌ من اللوح ونقطتُه
 * ممتلئة، وما هو **مفتوحٌ لك** (فعاليّةٌ تُحجز، فرصةٌ تُطلب) ورقٌ ونقطتُه فارغة، والشهادةُ الجاهزةُ خضراءُ في يومها.
 */
export type AdDayItem = { key: string; tone: "mine" | "open" | "ok"; icon: ReactNode; k: string; title: string; meta?: string; act?: ReactNode };
export type AdDayStop = { key: string; mark: "here" | "mine" | "open" | "any"; big: ReactNode; small: string; rel?: string; items: AdDayItem[]; none?: string };
export function AdDays({ label, stops }: { label: string; stops: AdDayStop[] }) {
  return (
    <ol className="ad-days" aria-label={label}>
      {stops.map((s) => (
        <li key={s.key} className="ad-day" data-mark={s.mark}>
          <div className="ad-day-when">
            <b>{s.big}</b>
            <span>{s.small}</span>
            {s.rel ? <small>{s.rel}</small> : null}
          </div>
          <span className="ad-day-dot" aria-hidden />
          <div className="ad-day-its">
            {s.items.length ? s.items.map((it) => (
              <article key={it.key} className={it.tone === "mine" ? "ad-plate ad-day-it" : "ad-day-it"} data-tone={it.tone}>
                <span className="ad-day-it-ic" aria-hidden>{it.icon}</span>
                <div className="ad-day-it-t">
                  <small>{it.k}</small>
                  <b>{it.title}</b>
                  {it.meta ? <span>{it.meta}</span> : null}
                </div>
                {it.act ? <div className="ad-day-it-act">{it.act}</div> : null}
              </article>
            )) : <p className="ad-day-none">{s.none}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * **تذكرتُك** — أقوى ما في الهويّة (التذكرةُ بكعبها وثلمتيها) مكبَّرًا صدرًا: الكعبُ قطعةٌ من اللوح فيها وجهُك واسمُك ومكانتُك، وخطُّ
 * القطع بثقوبه، ثمّ الورقةُ: التحيّةُ والخلاصةُ عنوانًا، وأرقامُك كبيرةً بخيوطٍ بينها كأرقام تذكرة السفر. وفي الضيّق الكعبُ رأسُها.
 */
export function AdPass({ face, name, standing, since, hi, title, figs }: {
  face: ReactNode; name: string; standing: string; since?: string; hi: string; title: string; figs: AdFig[];
}) {
  return (
    <section className="ad-pass" aria-labelledby="ad-room-title">
      <div className="ad-pass-stub">
        <span className="ad-pass-face">{face}</span>
        <b className="ad-pass-name">{name}</b>
        <span className="ad-pass-tier">{standing}</span>
        {since ? <small className="ad-pass-since">{since}</small> : null}
      </div>
      <div className="ad-pass-body">
        <p className="ad-pass-hi">{hi}</p>
        <h1 id="ad-room-title" className="ad-pass-title">{title}</h1>
        <dl className="ad-pass-figs">
          {figs.map((f) => (
            <div key={f.label}>
              <dt>{f.icon}{f.label}</dt>
              <dd className="ad-num">{f.value}</dd>
              {f.note ? <dd className="ad-pass-note">{f.note}</dd> : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * **التذكرةُ لشيءٍ لا لشخص** (صفحةُ الفعاليّة العامّة، ٢٠٢٦-١١-١٥) — «تذكرتُك» نفسُها بكعبها وثلمتيها وخطّ قطعها (`.ad-pass`)، والكعبُ
 * يحمل ما يُعطى (يومَ الفعاليّة كبيرًا وشهرَه ويومَ الأسبوع وكم بقي) لا وجهًا.
 *
 * **والورقةُ خاناتُ تذكرة السفر في شبكةٍ واحدة** (محمد ٢٠٢٦-١١-١٦): تسميةٌ صغيرةٌ برمزها فوق قيمةٍ بمقاس العنوان، **عمودان ثابتان**
 * والخاناتُ تجري فيهما بترتيبها وبينها شعرةُ السطر. كانت صفوفًا تختلف خاناتُها من حالٍ إلى حال (خانتان ثمّ أربعٌ ثمّ واحدة) فلا تستقيم
 * أعمدتُها («ملخبط»)، ثمّ سطورًا صغيرةً برموزها (ورقةُ رأس السجلّ) فاستقامت وذهب جمالُها («بصريًّا مو جميل أبدًا»). فبقي شكلُ الأولى
 * ونظامُ الثانية. ثمّ **الأرقامُ بشرائطها** (`AdFigureRow`) سطرًا بعرض الورقة تحتها. وحالُك وفعلُك تنبيهٌ تحت التذكرة لا فيها.
 */
/**
 * **قسائمُ التذكرة** (`acts`، اعتمده محمد ٢٠٢٦-١١-١٦: «جبّار وممتاز»): ما يُفعل بالتذكرة نفسِها — التقويمُ والخريطة — قسائمُ تُقطع من قاعها:
 * خطُّ قطعٍ ثانٍ، وتحته الأفعالُ أجزاءً متساويةً بخطٍّ متقطّعٍ بينها، كلٌّ برمزه على مربّع اللوح واسمِه (والقصيرُ في الجوّال، `short`).
 * جُرّبت قبلها أيقونةً وحدها («كيف يفهم أنّ الدبّوس هو الخريطة؟»)، وكلمةً مسطَّرة، وزرًّا تحت القيمة، وسطرَ أدوات، والخانةَ نفسَها فعلًا،
 * وحبّتين في الكعب.
 */
export type AdTicketAct = { label: string;
  /** اسمُه القصيرُ في الجوّال («الخريطة») */
  short?: string; icon?: ReactNode; href?: string; onClick?: () => void; external?: boolean };
export type AdTicketFig = { icon?: ReactNode; label: string; value: ReactNode; note?: string };
function TicketCoupon({ act }: { act: AdTicketAct }) {
  const inner = (
    <>
      {act.icon}
      {act.short ? <><span className="ad-act-long">{act.label}</span><span className="ad-act-short" aria-hidden>{act.short}</span></> : act.label}
    </>
  );
  if (act.href && act.external) {
    return <a className="ad-ticket-coupon" href={act.href} target="_blank" rel="noopener noreferrer">{inner}<span className="ad-sr">، يُفتح في نافذةٍ جديدة</span></a>;
  }
  if (act.href) return <Link className="ad-ticket-coupon" href={act.href}>{inner}</Link>;
  return <button type="button" className="ad-ticket-coupon" onClick={act.onClick}>{inner}</button>;
}

export function AdTicket({ stub, facts, figures, acts, menu, label, cut }: {
  stub: ReactNode; facts: AdTicketFig[]; figures?: AdFigure[]; acts?: AdTicketAct[]; label: string;
  /** قسيمةٌ تفتح قائمة (المشاركة: `DropdownMenu` مُطلِقُه بصنف القسيمة `ad-ticket-coupon`) — آخرَ القسائم */
  menu?: ReactNode;
  /** قطعةُ النقش في الكعب (`cutOf(seed)`) — كعبُ كرت الفعاليّة في البوّابة نفسُه: لكلّ تذكرةٍ قطعتُها من النقش الكبير */
  cut?: number;
}) {
  return (
    <section className="ad-pass ad-ticket" aria-label={label}>
      <div className="ad-pass-stub ad-ticket-stub" data-cut={cut}>{stub}</div>
      <div className="ad-pass-body ad-ticket-body">
        {facts.length ? (
          <dl className="ad-ticket-cells">
            {facts.map((f) => (
              <div key={f.label}>
                {/* رمزُ الخانة على مربّعه المصبوغ بجانبها كلِّها، كرمز سطر «حسابي» (`.ad-line-ic`) */}
                <dt><span className="ad-line-ic" aria-hidden>{f.icon}</span><span>{f.label}</span></dt>
                <dd>{f.value}</dd>
                {f.note ? <dd className="ad-ticket-note">{f.note}</dd> : null}
              </div>
            ))}
          </dl>
        ) : null}
        {figures && figures.length ? <AdFigureRow figures={figures} /> : null}
        {(acts && acts.length) || menu ? <div className="ad-ticket-coupons">{acts?.map((x) => <TicketCoupon key={x.label} act={x} />)}{menu}</div> : null}
      </div>
    </section>
  );
}

/**
 * **اللوحُ والبطاقةُ خارجةٌ منه** — لوحٌ عريضٌ فيه التحيّةُ والخلاصةُ عنوانًا كبيرًا وأرقامُك زجاجًا، وبطاقةُ أدِيب ورقةٌ مائلةٌ قليلًا
 * تقعد على حدّه وتخرج منه إلى الصفحة: الشيءُ الوحيدُ الذي يكسر الإطار في البوّابة كلّها، فلا يُرى إلّا في صدرها.
 */
export function AdHero({ hi, title, figs, card }: { hi: string; title: string; figs: AdFig[]; card: ReactNode }) {
  return (
    <section className="ad-hero" aria-labelledby="ad-room-title">
      <div className="ad-plate ad-hero-plate">
        <div className="ad-hero-body">
          <p className="ad-hero-hi">{hi}</p>
          <h1 id="ad-room-title" className="ad-hero-title">{title}</h1>
          <ul className="ad-hero-figs">
            {figs.map((f) => <li key={f.label}><span aria-hidden>{f.icon}</span><b className="ad-num">{f.value}</b><small>{f.label}</small></li>)}
          </ul>
        </div>
      </div>
      <div className="ad-hero-card">{card}</div>
    </section>
  );
}

/**
 * **الأبواب** («أجندتك» ٢٠٢٦-١١-٠٧): ما سوى ما ينتظرك شريطٌ هادئٌ واحدٌ في آخر الرئيسية — رحلتُك والمقترحاتُ والدعوة — كلٌّ ورقةٌ صغيرةٌ
 * برمزها واسمِها وجملتِها وفعلٍ يأخذك إلى غرفته. لا قائمةَ فيها ولا أرقامَ كبيرة: الأجندةُ هي الصفحة، وهذه أبوابٌ منها.
 */
export function AdDoors({ label, items }: {
  label: string;
  items: { icon: ReactNode; k: string; v: string; action: ReactNode; plate?: boolean }[];
}) {
  return (
    <section className="ad-doors" aria-label={label}>
      {items.map((x) => (
        <div key={x.k} className={x.plate ? "ad-plate ad-door" : "ad-door"}>
          <div className="ad-door-body">
            <span className="ad-door-ic" aria-hidden>{x.icon}</span>
            <span className="ad-door-t"><small>{x.k}</small><b>{x.v}</b></span>
            <span className="ad-door-act">{x.action}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * **الدعوة** (رئيسيّةُ الصديق: «تطوّع في أدِيب»، ٢٠٢٦-١١-٠٥): **قطعةٌ من اللوح** — الكحليُّ الصلبُ للإبراز وحده (المالك ٢٠٢٦-١٠-١٣: رأسُ
 * «رحلتك» ودعوةُ «تطوّع في أدِيب») — ختمُها زجاجٌ برمزه، واسمُها وسطرُه، ثمّ ما تَعِد به سطورًا برموزها على اللوح، وفعلُها زجاجًا في
 * طرفها. ليست تنبيهًا (لا خبرَ فيها) ولا قسمًا (لا سجلَّ فيها): هي ما تقوله الغرفةُ لصاحبها لتدعوه.
 */
export function AdInvite({ icon, title, sub, points, action, art }: {
  icon: ReactNode; title: string; sub?: string;
  points: { icon: ReactNode; k: string; v: string }[];
  action: ReactNode;
  /** رسمٌ في طرف اللوح يقعد على قاعه (ديبو صاحبُ الفكرة في دعوة الصديق) */
  art?: ReactNode;
}) {
  return (
    <section className="ad-plate ad-invite" aria-label={title}>
      <div className="ad-invite-body">
        <header className="ad-invite-head">
          <span className="ad-invite-ic" aria-hidden>{icon}</span>
          <span className="ad-invite-t"><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</span>
        </header>
        <ul className="ad-invite-pts">
          {points.map((x) => (
            <li key={x.k}><span className="ad-invite-pt-ic" aria-hidden>{x.icon}</span><span><small>{x.k}</small><b>{x.v}</b></span></li>
          ))}
        </ul>
        {/* الرسمُ بجانب الفعل في صفّه لا فوق النصّ (على الجوّال طال سطرُ «جهدُك موثّق» فدخل تحته) */}
        <div className="ad-invite-act">{action}{art ? <span className="ad-invite-art" aria-hidden>{art}</span> : null}</div>
      </div>
    </section>
  );
}

/**
 * **كرتُك رأسُ الغرفة في الجوّال** (اعتمده محمد ٢٠٢٦-١١-٠٥، (أ) من اثنين مبنيّين). قال: «الشريطُ بالأعلى وتحته رأسُ التبويب ثمّ التذكرة،
 * مزعجٌ بصريًّا» — لوحان كحليّان منقوشان متتاليان، ووجهُك واسمُك مرّتين، ونصفُ الشاشة رؤوسٌ قبل أوّل سطر. فالكرتُ الذي يقود الغرفةَ في
 * الضيّق يحمل مسارَها واسمَها على كعبه، ووجهُك على حدّه، ويغيب اللوح: لوحٌ واحدٌ له معنى. (رُفض (ب): الكرتُ سطرٌ على الورقة تحت اللوح —
 * أقصر، وأبسطُ من أن يليق.) يُمرَّر إلى `AdCard band`، والعنوانُ فيه `h1` الضيّق كما اللوحُ `h1` المكتب: واحدٌ يُرى في كلّ عرض.
 */
export function AdRoomBand({ navPath, title }: { navPath: string; title: string }) {
  const crumb = useRoomCrumb(navPath, title);
  return (
    <>
      <PlateCrumb crumb={crumb} />
      <h1 className="ad-plate-title">{title}</h1>
    </>
  );
}

/**
 * العمودان: العريضُ لما ينتظرك، والضيّقُ لسجلّك — وعلى الضيّق عمودٌ واحد والعريضُ أوّلًا. وبلا ضيّقٍ يأخذ العريضُ العرض.
 * `top`: الضيّقُ أوّلًا في الجوّال وحده («حسابي»: كرتُك فوق أقسامه، وفي المكتب بجانبها). `sticky`: الضيّقُ يلازم الشاشة في المكتب (الفهرس).
 */
export function AdCols({ children, aside, asideEnd, asideFirst, top, sticky }: {
  children: ReactNode; aside?: ReactNode; asideFirst?: boolean; top?: boolean; sticky?: boolean;
  /**
   * **ذيلُ الجانب ينزل آخرَ الغرفة في الضيّق** («عضويتي»، ٢٠٢٦-١١-١٥): في المكتب تحت ما في الجانب، وفي الجوّال بعد العمود العريض لا
   * قبله — «مسيرتي» تحت البطاقة، والإنذارُ أهمُّ من تاريخ الانضمام فلا تدفعه تحتها
   */
  asideEnd?: ReactNode;
}) {
  return (
    <div className="ad-acc-cols" data-aside={aside ? "" : undefined} data-first={asideFirst ? "" : undefined} data-top={top ? "" : undefined} data-sticky={sticky ? "" : undefined}>
      <div className="ad-acc-main">{children}</div>
      {aside ? <aside className="ad-acc-aside">{aside}{asideEnd ? <div className="ad-acc-late">{asideEnd}</div> : null}</aside> : null}
    </div>
  );
}

/**
 * القسم: كرتٌ معنونٌ رأسُه مربّعٌ من اللوح برمزه، واسمُه، وسطرٌ تحته — ثمّ سطوره. و`id` مرساتُه في فهرس الغرفة (`AdIndex`).
 * `tone="bad"` **منطقةُ الخطر** (المالك ٢٠٢٦-١٠-١٣: «لونُه لا يوحي أنّه خطر»): الكرتُ نفسُه يقول «احذر» — حدٌّ أحمر وأرضٌ ورديّةٌ خفيفة
 * وختمُ رأسه ورموزُ سطوره بالأحمر، والنصُّ بحبره كي لا يصرخ كلُّ شيء. ولا كحليَّ فيه: لونٌ مشبعٌ واحدٌ في السطح الواحد.
 */
export function AdSection({ id, icon, title, sub, media, tone, more, steps, foot, act, children }: {
  id?: string; icon: ReactNode; title: string; sub?: string; media?: ReactNode; tone?: "bad"; children?: ReactNode;
  /** **فعلُ القسم في طرف رأسه** («أضف نافذة»، «أضِف شريكًا»): في القاع كان زرًّا وحيدًا على شريطٍ عريضٍ فارغ (محمد ٢٠٢٦-١١-١٧: «مساحة كبيرة والزر بهذا الشكل… قبيح») */
  act?: ReactNode;
  /** **قاعُ القسم**: فعلُه بعد سطوره («احجز مقعدي» تحت المقاعد في صفحة الفعاليّة، ٢٠٢٦-١١-١٥) — مقابلُ `media` الذي يسبقها */
  foot?: ReactNode;
  /** درجاتُ حدٍّ في طرف الرأس — قطعةُ رأس المجموعة في غرفة الإنذارات نفسُها («إنذاراتي» في «عضويتي»، محمد ٢٠٢٦-١١-١٤: «ممتاز، ضعه») */
  steps?: AdSteps;
  /** «عرض الكل» في قاع القسم إلى غرفته: الرئيسيةُ ملخّصٌ يأخذ من كلّ نوعٍ ثلاثة (قواعدُ النموّ، محمد ٢٠٢٦-١١-٠٧) */
  more?: { label: string; href: string };
}) {
  return (
    // `tabIndex` لمرساته: الفهرسُ ينقل التركيزَ إلى القسم الذي ساق إليه (كما يفعل الرابطُ بلا تمريرٍ منساب)
    <section className="ad-sec" id={id} data-tone={tone} tabIndex={id ? -1 : undefined}>
      <header className="ad-sec-head">
        <span className="ad-sec-ic" aria-hidden>{icon}</span>
        <span className="ad-sec-t">
          <h2>{title}</h2>
          {sub ? <p>{sub}</p> : null}
        </span>
        {steps ? <AdStepsBar steps={steps} /> : null}
        {act ? <span className="ad-sec-act">{act}</span> : null}
      </header>
      {media ? <div className="ad-sec-media">{media}</div> : null}
      {children ? <ul className="ad-lines">{children}</ul> : null}
      {foot ? <div className="ad-sec-foot">{foot}</div> : null}
      {more ? <Link className="ad-sec-more" href={more.href}>{more.label}<CaretLeft aria-hidden /></Link> : null}
    </section>
  );
}

export type AdLineTone = "ok" | "warn" | "bad" | "muted";
/**
 * القيمةُ اللاتينيّة الطويلة (بريدٌ، معرّفٌ عند المزوّد) لا مسافةَ فيها، فكان السطرُ الضيّقُ يكسرها حيث اتّفق («shahad142810@icl/oud.com»،
 * صفحةُ الرسالة ٢٠٢٦-١١-٠٧). فنَعرض عليه مواضعَ كسرٍ مقروءة بعد «@» و«.» و«_» و«-» و«/»، فيكسر عندها أوّلًا،
 * ولا يقطع وسطَ الكلمة إلّا إن ضاقت قطعةٌ واحدةٌ عن السطر.
 */
function ltrBreaks(v: string): ReactNode {
  const parts = v.split(/(?<=[@._\/-])/);
  return parts.length < 2 ? v : parts.map((p, i) => (i ? [<wbr key={i} />, p] : p));
}

/** فعلُ السطر: رمزٌ وكلمة (والقلمُ وحده بلا كلمة)، والسطرُ كلُّه زرُّه. */
export type AdLineAct = {
  icon: ReactNode; text?: string; label: string;
  /** الزرُّ وحده بنغمة الخطر («إنهاء» جلسة، «حذف» الحساب) والسطرُ بحبره — «كي لا يصرخ كلُّ شيء» (حسابي ٢٠٢٦-١٠-١٣). و`AdLine.danger` السطرُ كلُّه. */
  danger?: boolean;
};

/**
 * **السطر**: رمزٌ في مربّعٍ مصبوغٍ بلون سطره، ثمّ التسميةُ صغيرةً فوق القيمة العريضة ووصفٌ تحتها، ثمّ فعلٌ واحدٌ في طرفه.
 * والسطرُ ذو الفعل زرٌّ كلُّه (أو رابط) — فيُفهم على اللمس بلا تصويب. `tone` حالُه بلون نغمته على القيمة (أو الوصف بـ`toneAt`)،
 * و`danger` سطرُ خطرٍ بهيبته (الإلغاء، والحذف).
 */
export function AdLine({ icon, k, v, sub, tone, toneAt = "v", act, href, external, onClick, danger, ltr, disabled, current, read }: {
  icon: ReactNode; k?: string; v: string; sub?: string; tone?: AdLineTone; toneAt?: "v" | "sub";
  act?: AdLineAct; href?: string; onClick?: () => void; danger?: boolean; ltr?: boolean; disabled?: boolean;
  /** رابطٌ خارج الموقع (الخريطة في صفحة الفعاليّة، ٢٠٢٦-١١-١٥): يُفتح في تبويبٍ جديد ويقول ذلك لقارئ الشاشة */
  external?: boolean;
  /** السطرُ المختار في قائمةٍ تعرض مختارَها بجانبها (المعرض) — قطعةٌ من المختار */
  current?: boolean;
  /**
   * **قيمةٌ تُقرأ لا تُلمَح** (٢٠٢٦-١١-٠٨): جوابُ سؤالٍ أو تعليقٌ طويل — بوزن القراءة وارتفاع سطرها، ويحفظ أسطرَه. القيمةُ العريضةُ
   * لقيمةٍ قصيرة (بريد، تاريخ)، والطويلُ بها متعب (عيبُ محادثة ديبو نفسُه قبل قطعة الحوار).
   */
  read?: boolean;
}) {
  const body = (
    <>
      <span className="ad-line-ic" aria-hidden>{icon}</span>
      <span className="ad-line-kv">
        {k ? <span className="ad-line-k">{k}</span> : null}
        <span className="ad-line-v" data-tone={toneAt === "v" ? tone : undefined} data-read={read || undefined}>{ltr ? <bdi dir="ltr" className="lat">{ltrBreaks(v)}</bdi> : v}</span>
        {sub ? <span className="ad-line-sub" data-tone={toneAt === "sub" ? tone : undefined}>{sub}</span> : null}
      </span>
      {act ? (
        <span className={`ad-btn ${danger || act.danger ? "ad-btn-danger" : "ad-btn-soft"} ad-btn-sm ad-line-act`} aria-hidden>
          {act.icon}{act.text}
        </span>
      ) : null}
    </>
  );
  return (
    <li className="ad-line" data-danger={danger || undefined}>
      {href && !disabled && external ? (
        // بلا `aria-label`: اسمُ الرابط سطرُه كلُّه (المكانُ نفسُه) ثمّ «يُفتح في نافذةٍ جديدة» — كان الوسمُ يُسقط اسمَ المكان
        <a href={href} className="ad-line-hit" target="_blank" rel="noopener noreferrer">{body}<span className="ad-sr">، يُفتح في نافذةٍ جديدة</span></a>
      ) : href && !disabled ? (
        <Link href={href} className="ad-line-hit" aria-label={act?.label}>{body}</Link>
      ) : onClick ? (
        <button type="button" className="ad-line-hit" onClick={onClick} disabled={disabled} aria-current={current || undefined} aria-label={act?.label ? `${act.label}: ${k ? `${k}، ` : ""}${v}` : undefined}>{body}</button>
      ) : (
        <div className="ad-line-hit">{body}</div>
      )}
    </li>
  );
}

/**
 * **كروتُ الرقم** (`AdStats`، «رحلتك» في تطوّعي، ٢٠٢٦-١١-٠٤ — لبنةُ «كرت الرقم» في طبقات `DESIGN.md`): ملخّصٌ لا سجلّ، فشكلُه غيرُ
 * شكل التذكرة في كلّ عرض (محمد على الجوّال: التذكرةُ تحت التذاكر «لا تُفهم، لأنّها تشابه المشاركات»). عنوانُ المجموعة يسمّيه، ثمّ
 * **البطلُ قطعةٌ من اللوح** — قراءةُ الكعب نفسُها التي رآها محمد أسهل: الرقمُ وحدَه في قطعته فتقع عليه العين أوّلًا — ثمّ أرقامٌ صغيرةٌ
 * كروتًا بيضاءَ على الأرض. لا زمنَ فيه (أشهرٌ أو محطّات): حجمُه ثابتٌ مهما طالت المدّة.
 */
export function AdStats({ icon, title, hero, items }: {
  icon: ReactNode; title: string;
  hero: { value: string; label: string; notes?: string[] };
  items: { icon: ReactNode; value: string; label: string }[];
}) {
  return (
    <section className="ad-stats-group" aria-label={title}>
      <AdGroupTitle icon={icon}>{title}</AdGroupTitle>
      <div className="ad-stats" data-n={items.length}>
        <div className="ad-plate ad-stat-hero">
          <div className="ad-stat-hero-body">
            <p className="ad-stat-hero-fact"><b className="ad-num">{hero.value}</b><span>{hero.label}</span></p>
            {hero.notes?.map((n) => <small key={n}>{n}</small>)}
          </div>
        </div>
        {items.map((x) => (
          <div key={x.label} className="ad-stat">
            <span className="ad-stat-ic" aria-hidden>{x.icon}</span>
            <b className="ad-num">{x.value}</b>
            <span className="ad-stat-l">{x.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}


/**
 * **سطرٌ ينفتح للتعديل في نافذةٍ صغيرة** (لغةُ «حسابي»، المالك ٢٠٢٦-١٠-١٣): فعلُه **باسمه** — «تعديل»، و«إضافة» لقيمةٍ فارغة —
 * صندوقًا بختم القلم كسائر الأفعال الثانويّة (محمد ٢٠٢٦-١١-٠٥: «المفروض يكون هناك نصُّ تعديل، لماذا فارغ؟» — كان القلمُ وحده بلا كلمة،
 * ثمّ قلمًا بلا ختم «جدًّا قبيح»). والقيمةُ الفارغةُ بنغمة التحذير («لم تُضِفه بعد»). والحقلُ يُمرَّر، والحفظُ يُرجع نجاحَه؛ والنافذةُ لا تُغلق وهو يعمل ولا على خطأ — والخطأُ فيها بتنبيه النافذة القديم حتى نبلغ قالبَ النوافذ (محمد ٢٠٢٦-١١-٠٥).
 */
export function AdEditLine({ icon, k, v, empty, ltr, field, onSave, busy, error, onOpen }: {
  icon: ReactNode; k: string; v: string; empty?: string; ltr?: boolean;
  field: ReactNode;
  onSave: () => Promise<boolean>;
  busy?: boolean;
  error?: string | null;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => { if (!busy) setOpen(false); };
  const save = async () => { if (await onSave()) setOpen(false); };
  return (
    <>
      <AdLine icon={icon} k={k} v={v || empty || ""} tone={v ? undefined : "warn"} ltr={ltr && !!v}
        act={{ icon: <PencilSimple />, text: v ? "تعديل" : "إضافة", label: `${v ? "تعديل" : "إضافة"} ${k}` }} onClick={() => { onOpen?.(); setOpen(true); }} />
      <Modal open={open} onClose={close} busy={busy} title={v ? `تعديل ${k}` : `إضافة ${k}`} size="sm"
        footer={<><Button variant="primary" loading={busy} onClick={save}>حفظ</Button><Button variant="ghost" onClick={close} disabled={busy}>إلغاء</Button></>}>
        {/* النافذةُ بتنبيهها القديم حتى نبلغ قالبَ النوافذ: تنبيهُ الهويّة ورقةٌ تُوضع على الصفحة، وفي النافذة ورقةٌ فوق ورقة (محمد ٢٠٢٦-١١-٠٥: «غريب») */}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {field}
      </Modal>
    </>
  );
}

/**
 * **سطرُ المفتاح** (الإشعارات، ٢٠٢٦-١١-٠٥): السطرُ كلُّه يقلبه — رمزُه في مربّعه، والتسميةُ بثقل القيمة ووصفُها تحتها كسائر السطور، والمفتاحُ
 * في الطرف: مجرًى مصبوغٌ ومقبضٌ أبيض، **والمُشغَّلُ قطعةٌ من اللوح** (المختارُ من المادّة الأخرى) لا لونٌ ثالث. (كان `Switch` القديم: مجرًى
 * رماديٌّ بلا هويّة.) والمدخلُ الحقيقيُّ تحت الرسم، فيُقلب بالمسافة ويُعلَن مفتاحًا.
 */
export function AdToggleLine({ icon, label, description, checked, disabled, onChange, ltr }: {
  icon: ReactNode; label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void;
  /** الوصفُ لاتينيٌّ (مفتاحُ القدرة `manage_news`): بخطّه واتّجاهه لا بخطّ العربيّة */
  ltr?: boolean;
}) {
  return (
    <li className="ad-line">
      <label className="ad-line-hit ad-toggle" data-disabled={disabled || undefined}>
        <span className="ad-line-ic" aria-hidden>{icon}</span>
        <span className="ad-line-kv">
          <span className="ad-line-v">{label}</span>
          {description ? <span className="ad-line-sub">{ltr ? <bdi dir="ltr" className="lat">{description}</bdi> : description}</span> : null}
        </span>
        <input type="checkbox" role="switch" className="ad-toggle-in" checked={checked} disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} />
        <span className="ad-toggle-sw" aria-hidden><span /></span>
      </label>
    </li>
  );
}

/**
 * **فهرسُ الغرفة** («حسابي»، أُعيد شكلُه الأوّل بأمر المالك ٢٠٢٦-١٠-١٣): أقسامُها روابطُ إلى مراسيها، والقسمُ الذي تقرؤه مُعلَّم —
 * صفحةٌ بيضاءُ ورمزُه قطعةٌ من اللوح (المختارُ من المادّة الأخرى). و`due` نقطةُ تحذيرٍ على قسمٍ ينقصه شيء. وفي الجوّال لا فهرس:
 * الأقسامُ تحت بعضها، والكرتُ فوقها.
 */
/**
 * **قراءةُ الفهرس** (`AdIndex`): القسمُ المعلَّمُ آخرُ قسمٍ بلغ رأسُه خطَّ القراءة — ثلثَ الشاشة، يهبط إلى قاعها قرب آخر الصفحة. (كانت مراقبةَ تقاطعٍ
 * بشريط قراءة، فالقسمان الأخيران لا يبلغانه أبدًا: في قاع «حسابي» بقي «أجهزتك» معلَّمًا وأنت ترى «الإشعارات» و«حسابك» — ٢٠٢٦-١١-٠٥.)
 * و`pick` للنقر: يعلّم القسمَ فورًا **ويُسكت القراءةَ حتى يستقرّ التمرير**: التمريرُ منساب، ولو بقيت القراءةُ حيّةً لمرّ المعلَّمُ على
 * كلّ قسمٍ يعبره في طريقه، ولعاد ما فوق القاع إلى الأخير.
 */
export function useSectionIndex(initial: string) {
  const [at, setAt] = useState(initial);
  const hush = useRef<{ on: boolean; timer?: ReturnType<typeof setTimeout> }>({ on: false });
  useEffect(() => {
    const h = hush.current;
    let frame = 0;
    const read = (sc: Element) => {
      const secs = [...document.querySelectorAll<HTMLElement>(".ad-sec[id]")];
      if (!secs.length) return;
      // خطُّ القراءة ثلثُ الحاوية، **ويهبط إلى قاعها كلّما دنا آخرُ الصفحة** بقدر ما بقي: الأقسامُ الأخيرة لا تبلغ الثلثَ أبدًا، فكان
      // القفزُ إلى الأخير في القاع يتخطّى ما قبله («أجهزتك» ثمّ «حسابك» رأسًا، و«الإشعارات» لا تُعلَّم — محمد ٢٠٢٦-١١-٠٥). وبهبوطه
      // يعبر كلَّ رأسٍ بترتيبه، وفي القاع يبلغ حدَّ الحاوية فيُعلَّم آخرُ ما يُرى
      const box = sc === document.scrollingElement ? { top: 0 } : sc.getBoundingClientRect();
      const h = sc === document.scrollingElement ? window.innerHeight : sc.clientHeight;
      const left = sc.scrollHeight - sc.clientHeight - sc.scrollTop;
      const line = box.top + h / 3 + Math.min(Math.max((h * 2) / 3 - left, 0), (h * 2) / 3);
      const hit = secs.filter((el) => el.getBoundingClientRect().top <= line - 1).pop() ?? secs[0];
      setAt(hit.id);
    };
    // التمريرُ لا يفقع، فيُلتقط في طور النزول من الحاوية التي تمرّر الأقسام (`.ash-content` في البوّابة، أو الصفحةُ نفسُها)
    const onScroll = (e: Event) => {
      const t = e.target;
      const sc = t instanceof Document ? document.scrollingElement : t instanceof Element ? t : null;
      const first = document.querySelector(".ad-sec[id]");
      if (!sc || !first || !sc.contains(first)) return;
      if (h.on) {
        clearTimeout(h.timer);
        h.timer = setTimeout(() => { h.on = false; }, 150);
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => read(sc));
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(h.timer);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);
  const pick = useCallback((id: string) => {
    const h = hush.current;
    h.on = true;
    setAt(id);
    clearTimeout(h.timer);
    h.timer = setTimeout(() => { h.on = false; }, 600); // وإن لم يتحرّك شيء (القسمُ في موضعه) عادت القراءةُ بعد لحظة
  }, []);
  return { at, pick };
}

export function AdIndex({ items, at, label, onPick }: {
  items: { id: string; label: string; icon: ReactNode; due?: string }[]; at: string; label: string;
  /** النقرُ يعلّم القسمَ فورًا — الأخيرُ في أسفل الصفحة لا يبلغ شريطَ القراءة فلا يُعلَّم بالتمرير وحده */
  onPick?: (id: string) => void;
}) {
  /* **الانتقالُ ينساب** (محمد ٢٠٢٦-١١-٠٥: «يذهب بالصفحة بشكلٍ غير انسيابيّ»): كان قفزةَ المرساة. فصار تمريرًا منسابًا إلى القسم،
     وبلا حركةٍ لمن طلب تقليلَها من جهازه، والعنوانُ يحمل المرساةَ كما كان (رابطٌ يُنسخ)؛ والنقرُ مع مفتاحٍ يبقى للمتصفّح (لسانٌ جديد) */
  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onPick?.(id);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
    window.history.replaceState(window.history.state, "", `#${id}`);
  };
  return (
    <nav className="ad-acc-index" aria-label={label}>
      {items.map((x) => (
        <a key={x.id} href={`#${x.id}`} aria-current={at === x.id || undefined} onClick={(e) => go(e, x.id)}>
          <span className="ad-acc-index-ic" aria-hidden>{x.icon}</span>
          {x.label}
          {x.due ? <span className="ad-acc-index-due" aria-label={x.due} /> : null}
        </a>
      ))}
    </nav>
  );
}
