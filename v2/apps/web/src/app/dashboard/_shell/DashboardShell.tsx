"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BurgerIcon, Button } from "@adeeb/design-system";
import { Avatar } from "../_components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { navFor, type NavItem } from "./nav";
import { NavProvider } from "./nav-context";
import type { MyScope } from "@/lib/myScope";
import { ICONS, IconBell, IconCaret, IconCaretDown, IconDashboard, IconLogout, IconMe, IconPlus } from "./icons";
import { DropdownMenu } from "../_components/DropdownMenu";
import { HelpCenter } from "./HelpCenter";
import { stopViewAs } from "./view-as-actions";

// المستخدم الحاليّ — يُمرَّر من تخطيط اللوحة الخادميّ (getCurrentAdmin)
export type ShellUser = { fullName: string | null; avatar: string | null; gender: "male" | "female" | null };

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href;
}
function groupHasActive(pathname: string, item: NavItem) {
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

export function DashboardShell({ children, user, caps, scope }: { children: React.ReactNode; user: ShellUser; caps: string[]; scope: MyScope }) {
  const pathname = usePathname();
  const router = useRouter();
  // الخريطة كما يراها صاحب هذه القدرات في موقعه — بندٌ لا مفتاح له لا يُعرَض، وبندُ الهويّة
  // لا يُعرَض بلا غرفة (والحراسة في الصفحة نفسها)
  const nav = useMemo(() => navFor(caps, scope), [caps, scope]);
  const [signingOut, startSignOut] = useTransition();
  const signOut = () =>
    startSignOut(async () => {
      // الهويّة المستعارة تُترَك عند الباب — وإلّا استأنفتها الجلسةُ القادمة بلا أن يطلبها أحد
      await stopViewAs();
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  const [mobOpen, setMobOpen] = useState(false);
  // طيّ الشريط إلى ريّل (سطح المكتب) — يُحفظ بين الجلسات
  const [rail, setRail] = useState(false);
  useEffect(() => { setRail(localStorage.getItem("ash-rail") === "1"); }, []);
  const toggleRail = () =>
    setRail((v) => { const n = !v; localStorage.setItem("ash-rail", n ? "1" : "0"); return n; });

  // المجموعات المفتوحة — تُفتح تلقائيًا المجموعة الحاوية للمسار النشط
  const initialOpen = useMemo(() => {
    const s = new Set<string>();
    nav.forEach((g) => g.items.forEach((it) => {
      if (it.children && groupHasActive(pathname, it)) s.add(it.label);
    }));
    return s;
  }, [pathname, nav]);
  const [open, setOpen] = useState<Set<string>>(initialOpen);
  const toggle = (label: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });

  // ترحيب حسب الوقت (على العميل لتفادي عدم تطابق الترطيب)
  const [greet, setGreet] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    setGreet(d.getHours() >= 4 && d.getHours() < 12 ? "صباحُ الخير" : "مساءُ الخير");
  }, []);

  // إغلاق الدُرج عند تغيّر المسار
  useEffect(() => { setMobOpen(false); }, [pathname]);

  // تلاشي طرفَي التنقّل — بديلُ شريط التمرير المخفيّ (الوصفُ في `.ash-nav` بالمكتبة).
  // باتّجاهٍ: يتلاشى الطرفُ الذي **خلفه مزيد** وحده، فلا يبهت رأسُ القائمة بلا سبب.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const sync = () => {
      const more = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.style.setProperty("--ash-fade-top", el.scrollTop > 1 ? "18px" : "0px");
      el.style.setProperty("--ash-fade-bot", more > 1 ? "18px" : "0px");
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // المراقبُ يلتقط ما لا يلتقطه التمرير: فتحُ مطويّةٍ · طيُّ الشريط · تبدّلُ الخريطة
    // بالقدرات. ويُراقَب الأبناءُ لا الحاويةُ وحدها — ارتفاعُها ثابتٌ بينما ينمو محتواها.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [nav, rail]);

  const cls = ["ash", rail && "rail", mobOpen && "mob-open"].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <div className="ash-scrim" onClick={() => setMobOpen(false)} />

      <aside className="ash-side">
        {/* طبقاتُ اللوح المذهّب — شبكةٌ فنقشٌ فحجاب، كلُّها خلف المحتوى وخارج شجرة القراءة.
            والشبكةُ صنفُ الهوية نفسُه (`.amb-mesh`) لا نسخةً منه — يتبدّل قناعُه وحده
            (`--amb-mask` على `.ash-canvas`) فيتبع ضوءَ اللوح بدل بؤر الشفق. */}
        <div className="ash-canvas" aria-hidden>
          <div className="amb-mesh" />
          <div className="ash-naqsh" />
        </div>

        <button type="button" className="ash-handle" onClick={toggleRail} aria-label={rail ? "توسيع الشريط" : "طيّ الشريط"}>
          <IconCaret />
        </button>
        {/* الاسمُ نصٌّ لا صورة (اللوحُ نفسُه علامة)، والرمزُ يدلّ على اللوحة لا ينوب عن الشعار */}
        <div className="ash-brand">
          <span className="ash-mark" aria-hidden><IconDashboard /></span>
          <b className="ash-name">بوّابة أديب</b>
        </div>
        <div className="ash-rule" aria-hidden />

        {/* `inverse` لا `primary`: الأساسيُّ تدرّجُ الهوية نفسُه، فيذوب في لوحٍ مذهّب —
            والمعكوسُ مصنوعٌ لهذا («يُعكَس ما يختفي على الداكن»). */}
        <Button variant="inverse" className="ash-cta"><IconPlus /><span>إجراء سريع</span></Button>

        {/* الوزن صفةُ **الموقع** لا صفةُ مكانٍ ولا أيقونةٍ على حدة: سياقُ الجذر
            (`IconDefaults` في `app/layout.tsx`) يرسم أيقونات أديب كلَّها duotone، وما
            يُستثنى منها مسمًّى في `_components/glyphs.tsx` (الشيفرونُ منه) — فلا سياقَ
            محلّيّ هنا ولا `weight` مرصَّع في بندٍ. */}
        <nav className="ash-nav" ref={navRef}>
          {nav.map((g, gi) => (
            <div className="ash-group" key={g.head ?? gi}>
              {g.head ? <div className="ash-nav-head">{g.head}</div> : null}
              {g.items.map((it) => {
                const Icon = ICONS[it.icon];
                if (!it.children) {
                  return (
                    <Link key={it.label} href={it.href!} className={"ash-i" + (isActive(pathname, it.href) ? " on" : "")}>
                      <Icon /><span className="lbl">{it.label}</span>
                      {it.badge ? <em className="ash-b">{it.badge}</em> : null}
                    </Link>
                  );
                }
                const isOpen = open.has(it.label);
                return (
                  <div key={it.label}>
                    <button type="button" className={"ash-i" + (isOpen ? " open" : "")} onClick={() => toggle(it.label)}>
                      <Icon /><span className="lbl">{it.label}</span><IconCaret className="ash-caret" />
                    </button>
                    <div className="ash-sub">
                      <div className="ash-sub-in">
                        {it.children.map((c) => (
                          <Link key={c.href} href={c.href} className={"ash-s" + (isActive(pathname, c.href) ? " on" : "")}>
                            <span className="lbl">{c.label}</span>
                            {c.badge ? <em className="ash-b">{c.badge}</em> : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* مركز المساعدة: طوقُ النجاة بندٌ في الشريط كسائر البنود. */}
        <HelpCenter />
      </aside>

      <div className="ash-main">
        <header className="ash-top">
          {/* البرغر **يقول حالتَه ولا يفتح فقط**: `aria-expanded` هو ما تقرأه أيقونةُ
              المكتبة (`BurgerIcon`) فتنطبق خطوطُها وتستدير × كبرغر رأس الموقع — حركةٌ
              واحدةٌ من مصدرٍ واحد. ولذلك صار **مبدّلًا** لا مُطلِقًا: زرٌّ يعلن أنّه
              مفتوح ثمّ لا يُغلِق تناقضٌ في الوصف قبل أن يكون نقصًا في السلوك. */}
          <button
            type="button"
            className="ash-ham"
            aria-expanded={mobOpen}
            aria-label={mobOpen ? "إغلاق القائمة" : "فتح القائمة"}
            onClick={() => setMobOpen((v) => !v)}
          >
            <BurgerIcon />
          </button>
          {/* الهويّة هي المُطلِق: تنقر «من أنت» فتجد «ما تفعله بحسابك». والشيفرون هو ما يحوّلها من
              صورةٍ إلى أداة — بدونه لا شيء في الشريط يقول إنّ هنا قائمةً تُفتح.
              السلوك كلّه (أسهم · ESC · نقر‑خارج · إرجاع التركيز · ARIA) من `DropdownMenu`. */}
          <DropdownMenu
            ariaLabel="حسابي"
            triggerClassName="ash-greet"
            trigger={
              <>
                <Avatar name={user.fullName ?? undefined} src={user.avatar || undefined} gender={user.gender} className="ash-av" />
                <span className="ash-gtx">
                  <span className="ash-ghi">{greet ?? "مرحبًا"} 👋</span>
                  <b>{user.fullName?.trim() || "مستخدم"}</b>
                </span>
                <IconCaretDown className="ash-gcaret" />
              </>
            }
            groups={[
              { items: [{ label: "عضويّتي", icon: <IconMe />, onSelect: () => router.push("/dashboard") }] },
              { items: [{ label: "تسجيل الخروج", icon: <IconLogout />, danger: true, disabled: signingOut, onSelect: signOut }] },
            ]}
          />
          <div className="ash-tools">
            <button type="button" className="ash-bell" aria-label="الإشعارات"><IconBell /><i /></button>
          </div>
        </header>

        {/* الخريطة المرشَّحة تُحسب هنا مرّةً، وتقرؤها فتاتُ المسار في كلّ صفحة — لا ترشيحَ ثانٍ
            ولا قدراتٌ تُمرَّر عبر عشرات الشاشات */}
        <main className="ash-content"><NavProvider value={nav}>{children}</NavProvider></main>
      </div>
    </div>
  );
}
