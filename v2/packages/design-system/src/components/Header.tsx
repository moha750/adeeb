import { Container } from "./Container";

type NavItem = { label: string; href: string };

const defaultNav: NavItem[] = [
  { label: "الأنشطة", href: "#activities" },
  { label: "الأخبار", href: "#news" },
  { label: "العضوية", href: "#join" },
];

/** هيدر الموقع: الشعار + التنقّل + زر الانضمام (رابطٌ إلى صفحة التسجيل). */
export function Header({
  logoSrc = "/brand/logo-horizontal.svg",
  nav = defaultNav,
  cta = "انضمّ إلينا",
  ctaHref = "/join",
}: {
  logoSrc?: string;
  nav?: NavItem[];
  cta?: string;
  ctaHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="نادي أديب" className="h-11 w-auto" />
        <nav className="hidden gap-7 text-content-muted md:flex">
          {nav.map((n) => (
            <a key={n.label} href={n.href} className="transition hover:text-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <a href={ctaHref} className="abtn abtn-primary abtn-sm">{cta}</a>
      </Container>
    </header>
  );
}
