"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@adeeb/design-system";
import { Avatar } from "../_components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { NAV, type NavItem } from "./nav";
import { ICONS, IconBell, IconCaret, IconLife, IconLogout, IconMenu, IconPlus, IconSearch } from "./icons";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// المستخدم الحاليّ — يُمرَّر من تخطيط اللوحة الخادميّ (getCurrentAdmin)
export type ShellUser = { fullName: string | null; avatar: string | null; roleName: string | null };

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href;
}
function groupHasActive(pathname: string, item: NavItem) {
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

export function DashboardShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const shortName = user.fullName?.trim().split(/\s+/)[0] ?? "مستخدم";
  const [signingOut, startSignOut] = useTransition();
  const signOut = () =>
    startSignOut(async () => {
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
    NAV.forEach((g) => g.items.forEach((it) => {
      if (it.children && groupHasActive(pathname, it)) s.add(it.label);
    }));
    return s;
  }, [pathname]);
  const [open, setOpen] = useState<Set<string>>(initialOpen);
  const toggle = (label: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });

  // ترحيب حسب الوقت (على العميل لتفادي عدم تطابق الترطيب)
  const [greet, setGreet] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const d = new Date();
    setGreet(d.getHours() >= 4 && d.getHours() < 12 ? "صباحُ الخير" : "مساءُ الخير");
    setDateStr(`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  }, []);

  // إغلاق الدُرج عند تغيّر المسار
  useEffect(() => { setMobOpen(false); }, [pathname]);

  const cls = ["ash", rail && "rail", mobOpen && "mob-open"].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <div className="ash-scrim" onClick={() => setMobOpen(false)} />

      <aside className="ash-side">
        <button type="button" className="ash-handle" onClick={toggleRail} aria-label={rail ? "توسيع الشريط" : "طيّ الشريط"}>
          <IconCaret />
        </button>
        <div className="ash-brand">
          <span className="ash-logo">أ</span>
          <b>لوحة أديب</b>
        </div>

        <Button variant="primary" className="ash-cta"><IconPlus /><span>إجراء سريع</span></Button>

        <nav className="ash-nav">
          {NAV.map((g, gi) => (
            <div key={g.head ?? gi}>
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

        <div className="ash-foot">
          <span className="ash-fic"><IconLife /></span>
          <span className="ash-ftx"><b>مركز المساعدة</b><span>أدلّة وأسئلة شائعة</span></span>
        </div>
      </aside>

      <div className="ash-main">
        <header className="ash-top">
          <button type="button" className="ash-ham" onClick={() => setMobOpen(true)} aria-label="فتح القائمة"><IconMenu /></button>
          <div className="ash-greet">
            <Avatar name={user.fullName ?? undefined} src={user.avatar || undefined} className="ash-av" />
            <span className="ash-gtx">
              <b>{greet ?? "مرحبًا"}، {shortName} 👋</b>
              <span className="ash-gdate">{user.roleName ?? dateStr}</span>
            </span>
          </div>
          <div className="ash-tools">
            <div className="ash-search"><IconSearch /><span>بحث…</span></div>
            <button type="button" className="ash-bell" aria-label="الإشعارات"><IconBell /><i /></button>
            <button type="button" className="ash-logout" aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={signOut} disabled={signingOut}>
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="ash-content">{children}</main>
      </div>
    </div>
  );
}
