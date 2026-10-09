"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS, IconDashboard, IconMenu } from "./icons";
import { firstHref, searchNav, type NavGroup, type NavItem } from "./nav";
import { DuotoneZone, GlyphZone, X } from "@/app/_components/glyphs";
import { HelpCenter } from "./HelpCenter";
import { NavSearch } from "./NavSearch";

/**
 * تنقّلُ الجوّال — **جزيرةُ وجهاتٍ في منطقة الإبهام، وورقةٌ ترفع الشريطَ الجانبيّ**.
 *
 * العلّةُ مقيسة: ٢٣٠ عضوًا من ٢٩١ لم يفتحوا اللوحةَ من حاسوبٍ قطّ، وبابُ التنقّل عندهم
 * برغرٌ في **الزاوية العليا** — أبعدُ ما يكون عن الإبهام، وعُرفٌ مكتبيٌّ لا يقول ما خلفه.
 *
 * فاعتُمد (المالك ٢٠٢٦-٠٨-٢٠): أربعُ وجهاتٍ تُنقر بلا فتح، وخامسٌ («الكلّ») يرفع الخريطةَ
 * كاملةً، والهيئةُ **جزيرةٌ** كجزيرتَي الرأس والتذييل. وأُعدمت أربعُ هيئاتٍ عُرِضت معها.
 */

/* ── الوجهاتُ الأربع: **ثابتةٌ لا تتبدّل تحت الإبهام** ────────────────────────
   عقدُ الشريط السفليّ هو الثبات: يتعلّم الإبهامُ موضعًا فيصيبه بلا نظر. فلو دخلت فيه
   الأبوابُ الموقوتة (الترشُّح والتصويت) لانزاحت الوجهاتُ كلُّها يومَ يُفتح بابٌ ويُغلق،
   وطُردت واحدةٌ كان يعتمدها. فالمجموعةُ تُحسَب من **قدراته ومقعده** وحدهما — وهما لا
   يتبدّلان إلّا بتعيينٍ جديد — والموقوتُ يُقال **بنقطةٍ على «الكلّ»**.

   ويُستبعَد دائمًا ما يُبلَغ من مكانٍ آخر أو يُفتَح مرّةً في الشهر: «الملف الشخصي»
   و«الإعدادات» تُبلغان من الأفتار في الترويسة، فمقعدٌ دائمٌ لهما هدرٌ لخانةٍ من أربع. */
const ALWAYS = [
  "/dashboard",        // عضويّتي — جذرُ اللوحة
  "/dashboard/tasks",  // مهامّي — ما كُلِّفتَ به
];
/** مقعدُه من الهيكل — **واحدٌ لا ثلاثة**: من له لجنةٌ وقسمٌ معًا لا يُملأ له نصفُ الجزيرة بمقاعده */
const SEATS = ["/dashboard/committee", "/dashboard/department", "/dashboard/unit"];
/** غرفةُ عملِه اليوميّة — أوّلُ ما يملك مفتاحَه */
const WORK = ["/dashboard/events", "/dashboard/members/active", "/dashboard/surveys", "/dashboard/news"];

/** لا يقع في الجزيرة أبدًا: يُبلَغ من الأفتار، أو بابٌ موقوتٌ تقوله النقطة. */
const TAB_NEVER = new Set(["/dashboard/profile", "/dashboard/settings"]);
const isTimedDoor = (href: string) =>
  href === "/dashboard/elections/run" || href === "/dashboard/elections/vote";

export function mobileTabs(nav: NavGroup[], count = 4): NavItem[] {
  const flat = nav
    .flatMap((g) => g.items)
    .filter((it) => it.href && !TAB_NEVER.has(it.href) && !isTimedDoor(it.href));
  const at = (href: string) => flat.find((it) => it.href === href);
  const picked: NavItem[] = [];
  const take = (it?: NavItem) => {
    if (it && picked.length < count && !picked.some((p) => p.href === it.href)) picked.push(it);
  };

  ALWAYS.forEach((h) => take(at(h)));
  take(SEATS.map(at).find(Boolean));   // مقعدٌ واحد
  take(WORK.map(at).find(Boolean));    // غرفةُ عملٍ واحدة
  for (const it of flat) take(it);     // وما بقي يُملأ من صدر الخريطة
  return picked;
}

/** نقطةُ «الكلّ»: بابٌ موقوتٌ مفتوح، أو بندٌ يحمل عددًا لم يقع في الجزيرة. */
export function hasNews(nav: NavGroup[], tabs: NavItem[]): boolean {
  const shown = new Set(tabs.map((t) => t.href));
  return nav
    .flatMap((g) => g.items)
    .some((it) => !!it.href && !shown.has(it.href) && (isTimedDoor(it.href) || !!it.badge));
}

/** جزيرةُ الوجهات — أربعٌ تُنقر بلا فتح، والخامسُ يفتح الخريطة كاملةً */
export function MobileTabs({
  nav,
  pathname,
  onOpenAll,
  sheetOpen,
}: {
  nav: NavGroup[];
  pathname: string;
  onOpenAll: () => void;
  sheetOpen: boolean;
}) {
  const tabs = mobileTabs(nav);
  const news = hasNews(nav, tabs);

  /* موضعُ الحبّة: خانةُ الصفحة الحاليّة، **وإلّا خانةُ «الكلّ»**. فمن كان في صفحةٍ خارج
     الأربع (بلغها من الورقة) لا تبقى الحبّةُ معلّقةً ولا تُحدَّد له وجهةٌ ليس فيها —
     تجلس على الباب الذي دخل منه. ورقمُ الخانة وعددُها رمزان تقرؤهما الأنماط. */
  const at = tabs.findIndex((it) => it.href === pathname);
  const elsewhere = at < 0;
  const slots = tabs.length + 1;
  const style = {
    ["--mnav-n" as string]: String(slots),
    ["--mnav-i" as string]: String(elsewhere ? tabs.length : at),
  };

  return (
    <nav className="mnav" aria-label="التنقّل السريع" style={style}>
      {/* الحبّةُ تبقى فتنزلق، والخيطُ **يُستأنَف بمفتاحه** فيُخَطّ من وسطه إلى طرفيه
          مع كلّ وجهة — حركتان تقعان معًا لا واحدةٌ تنتظر أختها. */}
      <i className="mnav-ind" aria-hidden>
        <i key={elsewhere ? "all" : at} className="mnav-thr" />
      </i>
      {tabs.map((it) => {
        const on = it.href === pathname;
        const Icon = ICONS[it.icon];
        return (
          <Link key={it.href} href={it.href!} className={"mnav-i" + (on ? " on" : "")} aria-current={on ? "page" : undefined}>
            <Icon />
            <span className="mnav-lbl">{it.label}</span>
            {it.badge ? <i className="mnav-dot" aria-hidden /> : null}
          </Link>
        );
      })}
      <button
        type="button"
        className={"mnav-i" + (elsewhere ? " on" : "")}
        aria-expanded={sheetOpen}
        onClick={onOpenAll}
      >
        <IconMenu />
        <span className="mnav-lbl">الكلّ</span>
        {news ? <i className="mnav-dot" aria-hidden /> : null}
      </button>
    </nav>
  );
}

/**
 * الورقةُ الصاعدة — **الشريطُ الجانبيُّ نفسُه وقد جاء من جهة الإبهام**.
 *
 * الوسمُ يحمل `ash-side`، فالمادّةُ والطبقاتُ (الشبكةُ والنقشُ والحجاب) والترويسةُ
 * والخيطُ والبنودُ والتذييلُ كلُّها من مصدرها لا نسخةً منها؛ ولا يخصّ الورقةَ إلّا
 * موضعُها ومقاسُها ومقبضُها. (قرار المالك ٢٠٢٦-٠٨-٢٠: «أريد تصميم mnsh مثل الشريط».)
 *
 * و`DuotoneZone` تردّ المستثنى من الأيقونات إلى وزن الموقع ما دام على لوحٍ مذهّب —
 * كما تفعل في الشريط سواءً بسواء. **إلّا زرَّ الإغلاق**: ليس بندَ تنقّلٍ حتى يلبس لبسَه،
 * فيُثقَب له في المنطقة ثقبٌ (`GlyphZone`) تبقى فيه `×` على وزن الاستثناء
 * (أمرُ المالك ٢٠٢٦-٠٨-٢٣).
 */
export function MobileSheet({
  nav,
  pathname,
  open,
  onClose,
}: {
  nav: NavGroup[];
  pathname: string;
  open: boolean;
  onClose: () => void;
}) {
  /* ── **المقبضُ يُسحَب حقًّا** (٢٠٢٦-٠٨-٢٠): كان رسمًا يقول «تُسحَب» ولا شيءَ خلفه،
     ومقبضٌ يَعِد بما لا يفعل أسوأُ من ورقةٍ بلا مقبض. فالسحبُ يتبع الإصبعَ نزولًا
     (لا صعودًا: الورقةُ في قاعها أصلًا)، ويُفلَت فيُحسَم:
       تجاوز **خُمسَ ارتفاعها أو 90px** (أيّهما أصغر) ⇒ تُغلَق،
       ودون ذلك ⇒ ترتدّ إلى مكانها بحركة المكتبة.
     والحركةُ تُكتَب في `style` مباشرةً لا في حالةٍ تُرسَم: ستّون إطارًا في الثانية لا
     تُدار بإعادة رسم شجرةٍ فيها ٣٦ بندًا. و`touch-action: none` على منطقة المقبض
     تمنع المتصفّحَ من ابتلاع السحب تمريرًا للصفحة. */
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  /* ── البحثُ في الورقة: **ههنا موضعُ حاجته الأشدّ** ──
     اللوحةُ منتَجُ جوّالٍ (٢٣٠ من ٢٩١ لم يفتحوها من حاسوبٍ قطّ)، والورقةُ سقفُها ٨٢٪
     من شاشةٍ صغيرة تحمل الخريطةَ كاملةً — فصاحبُ المفاتيح الكثيرة يمرّرها مرّاتٍ ليجد
     بندًا يعرف اسمَه. وحرفان يُغنيان عن التمرير كلِّه.

     **ولا تركيزَ تلقائيّ:** لوحةُ مفاتيحٍ تقفز مع الورقة تأكل نصفَ ما فُتح لأجله،
     ومن أراد وجهةً تحت إبهامه لا يريد أن يكتب.

     والمكتوبُ يُمسَح مع إغلاق الورقة — في الرسم لا في أثر (سابقةُ إغلاق الدُرج في
     `DashboardShell`): الأثرُ يرسم الورقةَ منخولةً رسمةً كاملةً ثمّ يُصلحها، فتُرى
     تومض على الطريق. */
  const [q, setQ] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) { setWasOpen(open); if (!open) setQ(""); }
  const shown = useMemo(() => searchNav(nav, q), [nav, q]);
  const router = useRouter();
  const submitSearch = () => {
    const href = firstHref(shown);
    if (!href) return;
    router.push(href);
    onClose();
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, dy: 0 };
    sheetRef.current?.classList.add("is-drag");
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    el.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    const { dy } = drag.current;
    drag.current = null;
    el.classList.remove("is-drag");
    el.style.transform = "";
    if (dy > Math.min(90, el.getBoundingClientRect().height * 0.2)) onClose();
  };

  return (
    <DuotoneZone>
      <div className="mn-scrim" data-open={open} onClick={onClose} />
      <aside ref={sheetRef} className="ash-side mnsh" data-open={open} aria-label="قائمة التنقّل" aria-hidden={!open}>
        <div className="ash-canvas" aria-hidden>
          <div className="amb-mesh" />
          <div className="ash-naqsh" />
        </div>

        <div
          className="mnsh-grab"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <i className="mnsh-grip" aria-hidden />
        </div>
        <div className="ash-brand">
          <span className="ash-mark" aria-hidden><IconDashboard /></span>
          <b className="ash-name">بوّابة أدِيب</b>
          <button type="button" className="mnsh-x" aria-label="إغلاق القائمة" onClick={onClose}>
            <GlyphZone><X /></GlyphZone>
          </button>
        </div>
        <NavSearch value={q} onChange={setQ} onSubmit={submitSearch} />
        <div className="ash-rule" aria-hidden />

        <nav className="ash-nav">
          {q && shown.length === 0 ? <div className="ash-srch-none" role="status">لا تبويبَ بهذا الاسم</div> : null}
          {shown.map((g, gi) => (
            <div className="ash-group" key={g.head ?? gi}>
              {g.head ? <div className="ash-nav-head">{g.head}</div> : null}
              {g.items.map((it) => {
                const Icon = ICONS[it.icon];
                const on = pathname === it.href;
                return (
                  <Link key={it.label} href={it.href!} className={"ash-i" + (on ? " on" : "")} onClick={onClose}>
                    <Icon /><span className="lbl">{it.label}</span>
                    {it.badge ? <em className="ash-b">{it.badge}</em> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* طوقُ النجاة بندٌ في الورقة كما هو بندٌ في الشريط — بندُ الشريط نفسُه لا نسخة */}
        <HelpCenter />
      </aside>
    </DuotoneZone>
  );
}
