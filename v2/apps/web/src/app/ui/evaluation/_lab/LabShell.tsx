"use client";

import { useState } from "react";
import { Avatar } from "../../../dashboard/_components/Avatar";
import { ToastProvider } from "../../../dashboard/_components/ToastProvider";
import { ICONS, IconBell, IconCaretDown, IconDashboard } from "../../../dashboard/_shell/icons";
import { MobileSheet, MobileTabs } from "../../../dashboard/_shell/MobileNav";
import { NavProvider } from "../../../dashboard/_shell/nav-context";
import { navFor } from "../../../dashboard/_shell/nav";
import { DuotoneZone } from "@/app/_components/glyphs";
import type { MyScope } from "@/lib/myScope";
import type { InboxFilter, InboxItem } from "@/lib/notifications/types";
import { BellButton } from "@/app/_notifications/BellButton";
import { InboxDrawer } from "@/app/_notifications/InboxDrawer";

/**
 * **اللوحةُ كما هي على الجهاز** لمعرض تقييم القيادات: الشريطُ الجانبيُّ فوق ٨٦٠ (بخريطته الحقيقيّة
 * `navFor`)، والترويسة، وجزيرةُ الجوّال تحته. تُعرض داخل `iframe` بعرض الجهاز، فيصدق فيها ما يكذب في
 * صندوقٍ ضيّق: عتبةُ الوسائط، و`fixed`، و`100dvh`. والأصنافُ أصنافُ `DashboardShell` نفسُها، بلا جرسٍ
 * حيّ ولا بحثٍ يعمل: الغرضُ النظرُ لا التشغيل.
 *
 * **وفي المحاكي** (`/ui/evaluation/sim`، ٢٠٢٦-١٠-٢٧) يعمل الجرسُ بصندوقه الحقيقيّ (`InboxDrawer`) على إشعارات
 * المحاكاة (`bell`)، وتنتقل روابطُ التقييم في القائمة والجزيرة بين صفحاته (`onGo`) بدل أن تخرج من الإطار.
 */
export function LabShell({
  caps,
  scope,
  here,
  name,
  gender,
  children,
  onGo,
  bell,
}: {
  caps: string[];
  scope: MyScope;
  here: string;
  name: string;
  gender: "male" | "female";
  children: React.ReactNode;
  /** ينتقل داخل المحاكي: كلُّ رابطٍ يُعترض فلا يخرج من الإطار، ويُسلَّم مسارُه ليقرّر المحاكي. */
  onGo?: (href: string) => void;
  bell?: { items: InboxItem[]; onOpen: (item: InboxItem) => void; onReadAll: () => void };
}) {
  const [sheet, setSheet] = useState(false);
  const [inbox, setInbox] = useState(false);
  const [tab, setTab] = useState<InboxFilter>("unread");
  const unread = bell ? bell.items.filter((n) => n.unread).length : 0;
  const nav = navFor(caps, scope);

  return (
    <ToastProvider>
      <div
        className="ash"
        onClickCapture={
          onGo
            ? (e) => {
                const a = (e.target as HTMLElement).closest("a");
                const href = a?.getAttribute("href");
                if (!a || !href || a.closest(".ntf-drawer")) return;
                e.preventDefault();
                setSheet(false);
                if (href !== "#") onGo(href);
              }
            : undefined
        }
      >
        <DuotoneZone>
          <aside className="ash-side">
            <div className="ash-canvas" aria-hidden>
              <div className="amb-mesh" />
              <div className="ash-naqsh" />
            </div>
            <div className="ash-brand">
              <span className="ash-mark" aria-hidden><IconDashboard /></span>
              <b className="ash-name">بوّابة أدِيب</b>
            </div>
            <div className="ash-rule" aria-hidden />
            <nav className="ash-nav">
              {nav.map((g, gi) => (
                <div className="ash-group" key={g.head ?? gi}>
                  {g.head ? <div className="ash-nav-head">{g.head}</div> : null}
                  {g.items.map((it) => {
                    const Icon = ICONS[it.icon];
                    return (
                      <a key={it.label} href={onGo && it.href ? it.href : "#"} className={"ash-i" + (it.href === here ? " on" : "")}>
                        <Icon /><span className="lbl">{it.label}</span>
                        {it.badge ? <em className="ash-b">{it.badge}</em> : null}
                      </a>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </DuotoneZone>

        <div className="ash-main">
          <header className="ash-top">
            <span className="ash-greet">
              <Avatar name={name} gender={gender} className="ash-av" />
              <span className="ash-gtx">
                <span className="ash-ghi">مساءُ الخير 👋</span>
                <b>{name}</b>
              </span>
              <IconCaretDown className="ash-gcaret" />
            </span>
            <div className="ash-tools">
              {bell ? (
                <BellButton count={unread} open={inbox} onClick={() => setInbox(true)} />
              ) : (
                <span className="ntf-bell" aria-hidden><IconBell /></span>
              )}
            </div>
          </header>
          <main className="ash-content"><NavProvider value={nav}>{children}</NavProvider></main>
        </div>

        <div className="ash-mob">
          <MobileTabs nav={nav} pathname={here} sheetOpen={sheet} onOpenAll={() => setSheet(true)} />
          <MobileSheet nav={nav} pathname={here} open={sheet} onClose={() => setSheet(false)} />
        </div>
        {bell ? (
          <InboxDrawer
            open={inbox}
            unread={unread}
            tab={tab}
            onTab={setTab}
            items={tab === "unread" ? bell.items.filter((n) => n.unread) : bell.items}
            more={false}
            loadingMore={false}
            onMore={() => {}}
            onOpen={(n) => {
              setInbox(false);
              bell.onOpen(n);
            }}
            onReadAll={bell.onReadAll}
            onClose={() => setInbox(false)}
          />
        ) : null}
      </div>
    </ToastProvider>
  );
}
