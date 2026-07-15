import type { ReactNode } from "react";
import { Badge, Card, CardBody, Stat } from "@adeeb/design-system";

type Tone = "brand" | "success" | "warning" | "danger";
type StatItem = { n: string; l: string; tone: Tone; icon: ReactNode; trend: string; dir: "up" | "down" };

const chevUp = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l6-6 6 6" /></svg>
);
const chevDown = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10l6 6 6-6" /></svg>
);

const STATS: StatItem[] = [
  {
    n: "800", l: "إجمالي الأعضاء", tone: "brand", trend: "12%", dir: "up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" /><path d="M16.5 5.4a3 3 0 0 1 0 5.5" /><path d="M18 20c0-2.6-1-4.4-2.8-5.4" /></svg>
    ),
  },
  {
    n: "350", l: "مادة مرئية", tone: "success", trend: "8%", dir: "up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10.5 9.2l4 2.8-4 2.8z" /></svg>
    ),
  },
  {
    n: "45", l: "فعالية", tone: "warning", trend: "5%", dir: "up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
    ),
  },
];

export default function DashboardOverview() {
  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › <b>نظرة عامة</b></div>
          <h1>نظرة عامة</h1>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        {STATS.map((s) => (
          <Stat
            key={s.l}
            icon={s.icon}
            value={s.n}
            label={s.l}
            tone={s.tone}
            trend={
              <Badge tone={s.dir === "up" ? "success" : "danger"} variant="soft" size="sm" icon={s.dir === "up" ? chevUp : chevDown}>
                {s.trend}
              </Badge>
            }
          />
        ))}
      </div>

      <Card>
        <CardBody>
          <p style={{ color: "var(--color-text-muted)" }}>
            هذا هيكل اللوحة الحيّ. سنبني الأقسام تباعًا داخل هذا الإطار — بدءًا من العناصر الأكثر تكرارًا.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
