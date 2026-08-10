import { Card } from "@adeeb/design-system";
import type { ReactNode } from "react";

/**
 * كرتُ «فرصة» محتوًى لبابَي الترشّح والتصويت — أيقونةٌ في قرص الهوية المذهّب (`.acard-chip`)،
 * منصبٌ وموعدٌ، وفعلٌ (زرٌّ ممتدٌّ أو شارة) أسفلَه. يلتفّ في شبكة `.opp-grid` فلا يمتدّ شريطًا،
 * والواحدُ يبقى كرتًا محتوًى لا يفيض. مصدرٌ واحدٌ للبابين كي يتطابقا.
 */
export function OpportunityCard({ icon, title, subtitle, action, done }: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action: ReactNode;
  /** حالةُ «تمّ» (ترشّحت/صوّتت): تُنغّم الكرتَ والقرصَ بالأخضر تكامُلًا مع زرّ الحالة. */
  done?: boolean;
}) {
  return (
    <Card className="opp-card" tone={done ? "success" : undefined}>
      <span className="acard-chip">{icon}</span>
      <div className="opp-tx">
        <h3 className="acard-htitle">{title}</h3>
        {subtitle ? <span className="acard-hsub">{subtitle}</span> : null}
      </div>
      <div className="opp-act">{action}</div>
    </Card>
  );
}
