"use client";

import { useState } from "react";
import { Badge, CountBadge, Container } from "@adeeb/design-system";
import { Check, Clock } from "@phosphor-icons/react";

const TONES = ["neutral", "info", "success", "warning", "danger"] as const;
const TL: Record<string, string> = { neutral: "عام", info: "معلومة", success: "منشور", warning: "تحذير", danger: "خطأ" };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

export default function BadgesPage() {
  const [tags, setTags] = useState(["تصميم", "شعر", "قصة", "خطّ عربيّ"]);
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Badges
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الشارات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          ناعم + نقطة · حبّة · ألوان دلالية حيّة · مؤشّرات (نقطة/أيقونة/live/إزالة).
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>النغمات (ناعم + نقطة)</Label>
            <div className="flex flex-wrap gap-3">
              {TONES.map((t) => <Badge key={t} tone={t} dot>{TL[t]}</Badge>)}
            </div>
          </section>

          <section>
            <Label>الأنماط (نغمة عامّة)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Badge dot>ناعم</Badge>
              <Badge variant="solid">صلب</Badge>
              <Badge variant="outline">مفرّغ</Badge>
              <span className="inline-flex items-center rounded-full px-3 py-2" style={{ background: "var(--grad-primary)" }}>
                <Badge variant="glass" dot>زجاجيّ</Badge>
              </span>
            </div>
            <p className="mt-3 text-xs text-content-muted">
              الزجاجيّ (<span dir="ltr" className="font-latin">glass</span>) شفّاف مضبَّب — يظهر على الأسطح الداكنة/الملوّنة فقط، لذا عُرِض على خلفيّة الهوية.
            </p>
          </section>

          <section>
            <Label>الأحجام</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Badge size="sm" tone="success" dot>صغير</Badge>
              <Badge size="md" tone="success" dot>متوسط</Badge>
              <Badge size="lg" tone="success" dot>كبير</Badge>
            </div>
          </section>

          <section>
            <Label>مؤشّرات</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="success" icon={<Check aria-hidden />}>منشور</Badge>
              <Badge tone="warning" icon={<Clock aria-hidden />}>قيد المراجعة</Badge>
              <Badge tone="danger" live>مباشر</Badge>
              <Badge tone="success" live>جديد</Badge>
              <span className="inline-flex items-center gap-2 text-content">
                الإشعارات <CountBadge tone="danger">٩</CountBadge>
              </span>
              <CountBadge>٣</CountBadge>
            </div>
          </section>

          <section>
            <Label>وسوم قابلة للإزالة (انقر ×)</Label>
            <div className="flex flex-wrap gap-3">
              {tags.map((t) => (
                <Badge key={t} onRemove={() => setTags((ts) => ts.filter((x) => x !== t))}>
                  {t}
                </Badge>
              ))}
              {tags.length === 0 ? <span className="text-sm text-content-muted">حُذفت كلّها.</span> : null}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
