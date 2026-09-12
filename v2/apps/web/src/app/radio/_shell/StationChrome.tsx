"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Broadcast, SquaresFour, Books } from "@phosphor-icons/react";
import { MagnifyingGlass } from "@/app/_components/glyphs";

/**
 * **هيكلُ المحطّة** — أبوابُها ورأسُها، بديلًا عن رأس الموقع وتذييله.
 *
 * ══ الإذن ══
 * قرارُ المالك ٢٠٢٦-٠٩-٠٥ (مكتوبٌ في `DESIGN-RULES.md` تحت القاعدة ١):
 * البرنامجُ التابع «هويّةٌ خاصّةٌ منعزلةٌ تمامًا كليًّا عن هويّة موقع أدِيب في
 * كلّ شيء، حتّى الهيدر والفوتر، بلا استثناء». فرأسُ الموقع **يُستبدَل** ولا
 * يُلوَّن.
 *
 * ══ ولمَ بابان في هيئتين ══
 * على الجوّال شريطٌ سفليٌّ أسفلَ الإبهام، وعلى الحاسوب شريطٌ جانبيّ. وهما
 * **مصدرٌ واحد** يتبدّل باستعلامِ حاوية (‏`.stc-app` في `components.css`)، لا
 * نسختان تُصانان.
 *
 * ══ ومسكنُه التخطيطُ لا الصفحة ══
 * كي لا يُعاد بناؤه في كلّ تنقّل، ولئلّا تنسى صفحةٌ جديدةٌ أن تلبسه.
 */

const DOORS = [
  { href: "/radio", label: "المحطّة", Icon: Broadcast },
  { href: "/radio/shows", label: "تصفَّح", Icon: SquaresFour },
  { href: "/radio/library", label: "مكتبتي", Icon: Books },
  { href: "/radio/search", label: "بحث", Icon: MagnifyingGlass },
] as const;

/**
 * البابُ المضيء. و**المطابقةُ بالبادئة لا بالتساوي** إلّا في الجذر: من فتح
 * حلقةً (`/radio/munataf/…`) جاء من المحطّة، فيبقى بابُها مضيئًا. ولو طُوبق
 * بالتساوي لانطفأت الأبوابُ كلُّها في كلّ شاشةٍ داخليّة.
 */
function isOn(pathname: string, href: string) {
  if (href === "/radio") {
    return pathname === "/radio" || (!DOORS.some((d) => d.href !== "/radio" && pathname.startsWith(d.href)));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StationSide({ stationName, stationLogoUrl }: { stationName: string; stationLogoUrl: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="stc-side">
      <Link href="/radio" className="stc-mark">
        {stationLogoUrl ? <img src={stationLogoUrl} alt="" /> : null}
        {stationName}
      </Link>
      {DOORS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="stc-side-a"
          aria-current={isOn(pathname, href) ? "page" : undefined}
        >
          <Icon aria-hidden />
          {label}
        </Link>
      ))}
    </aside>
  );
}

export function StationDoors() {
  const pathname = usePathname();
  return (
    <nav className="stx-tabs" aria-label="أبوابُ المحطّة">
      {DOORS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="stx-tab"
          aria-current={isOn(pathname, href) ? "page" : undefined}
        >
          <Icon aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
