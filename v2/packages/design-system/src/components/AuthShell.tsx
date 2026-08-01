import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Ambient } from "./Ambient";
import { Card, CardBody } from "./Card";

export interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  /** جملة الهويّة داخل اللوح. */
  slogan?: ReactNode;
  /** المتن: نموذج الدخول (أو مخرجُ شاشة «لا صلاحية»). */
  children: ReactNode;
  className?: string;
}

/**
 * غلافُ شاشات المصادقة — الدخولُ وشاشةُ «لا صلاحية» معًا.
 *
 * **اللوح المنقسم** (هيئةُ المالك المعتمَدة): سطحٌ واحد نصفُه لوحٌ مذهّبٌ يحمل نقشَ
 * الهويّة من رأسه وشعارَ النادي **الحقيقيّ** من `public/brand` (لا حرفٌ في مربّع)،
 * ونصفُه النموذج. والسطحُ `Card` نفسُه بلا اجتهاد — حدُّه وظلُّه وزاويتُه وAurora
 * من مصدرها الواحد؛ فلا يبقى في الشاشتين صنفٌ شاردٌ خارج المكتبة.
 *
 * **عنصرُه `<div>` لا `<main>`** كي يُعرَض في المعرض داخل صفحةٍ لها `<main>` أصلًا —
 * فالشاشةُ الحيّة تلفّه بـ`<main>`.
 */
export function AuthShell({ title, subtitle, slogan, children, className }: AuthShellProps) {
  return (
    <div className={cn("aauth amb-host", className)}>
      <Ambient />
      <div className="aauth-stack">
        <Card className="aauth-panel">
          <aside className="aauth-side">
            <img src="/brand/logo-vertical-white.svg" alt="نادي أديب" />
            {slogan ? <p className="aauth-slogan">{slogan}</p> : null}
          </aside>

          <CardBody>
            <div className="aauth-head">
              <h1 className="aauth-title">{title}</h1>
              {subtitle ? <p className="aauth-sub">{subtitle}</p> : null}
            </div>
            {children}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
