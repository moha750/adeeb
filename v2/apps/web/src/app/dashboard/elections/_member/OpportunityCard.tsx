import { Card } from "@adeeb/design-system";
import type { ReactNode } from "react";

/**
 * كرتُ «فرصة» محتوًى لبابَي الترشّح والتصويت — أيقونةٌ في قرص الهوية المذهّب (`.acard-chip`)،
 * منصبٌ وموعدٌ، وفعلٌ (زرٌّ ممتدٌّ أو شارة) أسفلَه. يلتفّ في شبكة `.opp-grid` فلا يمتدّ شريطًا،
 * والواحدُ يبقى كرتًا محتوًى لا يفيض. مصدرٌ واحدٌ للبابين كي يتطابقا.
 */
export function OpportunityCard({ icon, title, subtitle, action, done, badge, tone }: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action: ReactNode;
  /** حالةُ «تمّ» (ترشّحت/صوّتت): تُنغّم الكرتَ والقرصَ بالأخضر تكامُلًا مع زرّ الحالة. */
  done?: boolean;
  /** شارةُ حالٍ في صدر الكرت، **مقابلَ الأيقونة** في صفّها (سجلّ الترشّح). */
  badge?: ReactNode;
  /** نغمةُ الكرت كلِّه بحال صاحبِه — تغلب `done` حين تُمرَّر. */
  tone?: "brand" | "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="opp-card" tone={tone ?? (done ? "success" : undefined)}>
      <div className="opp-head">
        <span className="acard-chip">{icon}</span>
        {badge ? <div className="acard-hactions">{badge}</div> : null}
      </div>
      <div className="opp-tx">
        <h3 className="acard-htitle">{title}</h3>
        {subtitle ? <span className="acard-hsub">{subtitle}</span> : null}
      </div>
      <div className="opp-act">{action}</div>
    </Card>
  );
}
