"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Certificate, HandHeart, House, Ticket, UserCircle } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { DropdownMenu } from "../_components/DropdownMenu";
import { IconCaretDown, IconDashboard, IconLogout } from "../_shell/icons";
import { stopViewAs } from "../_shell/view-as-actions";
import { NotificationsBell } from "@/app/_notifications/NotificationsBell";
import { createClient } from "@/lib/supabase/client";
import { canOpen, type NavHref } from "@/lib/capabilities";
import type { ShellUser } from "../_shell/DashboardShell";

/**
 * **الإطارُ الخفيف لبوّابة أدِيب** — لصديق أدِيب والمتطوّع (قرار المالك ٢٠٢٦-١٠-١١، والمعتمَدُ
 * «٥ اليوم المعدّل» في المختبر). من لا يحمل إلّا مفاتيحَ المكانة لا يحتاج شريطًا
 * جانبيًّا: غرفُه أربعٌ أو خمس، **فتبويباتٌ في الحاسوب وشريطٌ سفليٌّ في الجوّال** — الشريطُ
 * نفسُه (`.mnav`) الذي يستعمله العضو، لا شريطٌ ثانٍ. وإطارُه إطارُ البوّابة لا الموقع العامّ:
 * اسمُها، والجرس، وقائمةُ الحساب.
 *
 * والغرفُ تُقرأ من الأقفال نفسِها (`canOpen`)، فلا يرى المرءُ تبويبًا لا مفتاحَ له.
 */

type Room = { href: NavHref; label: string; Icon: typeof House };

const ROOMS: Room[] = [
  { href: "/dashboard", label: "الرئيسية", Icon: House },
  { href: "/dashboard/volunteer", label: "تطوّعي", Icon: HandHeart },
  { href: "/dashboard/bookings", label: "حجوزاتي", Icon: Ticket },
  { href: "/dashboard/certificates", label: "شهاداتي", Icon: Certificate },
  // «بياناتي» و«الإعدادات» غرفةٌ واحدة (قرار المالك ٢٠٢٦-١٠-١٢): كلتاهما عن الشخص لا عن نشاطه
  { href: "/dashboard/account", label: "حسابي", Icon: UserCircle },
];

/** الغرفةُ التي أنت فيها: أطولُ مسارٍ يبدأ به العنوان (صفحةُ الفرصة تحت «تطوّعي»). */
function roomOf(pathname: string, rooms: Room[]): NavHref | null {
  const hit = rooms
    .filter((r) => pathname === r.href || (r.href !== "/dashboard" && pathname.startsWith(r.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return hit?.href ?? null;
}

export function PortalShell({
  children,
  user,
  caps,
  standing,
}: {
  children: React.ReactNode;
  user: ShellUser;
  caps: string[];
  /** «صديق أدِيب» أو «متطوّعة أدِيب» — سطرُ الهويّة تحت الاسم. */
  standing: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const rooms = ROOMS.filter((r) => canOpen(caps, r.href));
  const current = roomOf(pathname, rooms);

  const [signingOut, startSignOut] = useTransition();
  const signOut = () =>
    startSignOut(async () => {
      await stopViewAs();
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });

  // الشريطُ السفليّ: خمسٌ فما دونها تُعرض كلُّها، وغرفُ الصديق والمتطوّع لا تزيد عليها
  const at = rooms.findIndex((r) => r.href === current);
  const mnavStyle = { ["--mnav-n" as string]: String(rooms.length), ["--mnav-i" as string]: String(Math.max(0, at)) };

  return (
    <div className="ash agw">
      <div className="agw-page agw-page-narrow">
        <header className="agw-top">
          <Link href="/dashboard" className="agw-brand">
            <span className="agw-mk" aria-hidden><IconDashboard /></span>
            <b>بوّابة أدِيب</b>
          </Link>
          <NotificationsBell />
          <DropdownMenu
            ariaLabel="حسابي"
            triggerClassName="ash-greet"
            trigger={
              <>
                <Avatar name={user.fullName ?? undefined} src={user.avatar || undefined} gender={user.gender} className="ash-av" />
                <span className="ash-gtx">
                  <span className="ash-ghi">{standing}</span>
                  <b>{user.fullName?.trim() || "صاحب الحساب"}</b>
                </span>
                <IconCaretDown className="ash-gcaret" />
              </>
            }
            groups={[
              { items: [{ label: "حسابي", icon: <UserCircle aria-hidden />, onSelect: () => router.push("/dashboard/account") }] },
              { items: [{ label: "تسجيل الخروج", icon: <IconLogout />, danger: true, disabled: signingOut, onSelect: signOut }] },
            ]}
          />
        </header>

        <nav className="tabs tabs-underline agw-tabs agw-tabs-desk" aria-label="غرفك">
          {rooms.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={"tab" + (href === current ? " on" : "")} aria-current={href === current ? "page" : undefined}>
              <Icon aria-hidden />{label}
            </Link>
          ))}
        </nav>

        <main>{children}</main>
      </div>

      <div className="ash-mob">
        <nav className="mnav" aria-label="غرفك" style={mnavStyle}>
          <i className="mnav-ind" aria-hidden><i key={at} className="mnav-thr" /></i>
          {rooms.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={"mnav-i" + (href === current ? " on" : "")} aria-current={href === current ? "page" : undefined}>
              <Icon /><span className="mnav-lbl">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
