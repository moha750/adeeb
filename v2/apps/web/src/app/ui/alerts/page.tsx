"use client";

import { useState } from "react";
import { Alert, Button, Container } from "@adeeb/design-system";

const TONES = ["neutral", "info", "success", "warning", "danger"] as const;
const TT: Record<string, { t: string; m: string }> = {
  neutral: { t: "ملاحظة", m: "هذا تنبيه عامّ بلون الهوية." },
  info: { t: "معلومة", m: "لديك رسالة جديدة في صندوق الوارد." },
  success: { t: "تمّ بنجاح", m: "حُفظت التغييرات بنجاح." },
  warning: { t: "تنبيه", m: "ستنتهي صلاحية الجلسة قريبًا." },
  danger: { t: "خطأ", m: "تعذّر حفظ التغييرات، حاول مرّة أخرى." },
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

export default function AlertsPage() {
  const [open, setOpen] = useState(true);
  return (
    <main className="py-16">
      <Container className="max-w-2xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System, Alerts
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض التنبيهات</h1>
        <p className="mt-2 text-content-muted">بطاقة هوية هادئة، سطح Aurora + حدّ النغمة الموحّد + أيقونة منغّمة + نصّ محايد.</p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>النغمات</Label>
            <div className="space-y-4">
              {TONES.map((tone) => (
                <Alert key={tone} tone={tone} title={TT[tone].t}>
                  {TT[tone].m}
                </Alert>
              ))}
            </div>
          </section>

          <section>
            <Label>التركيب</Label>
            <div className="space-y-4">
              {open ? (
                <Alert tone="info" title="معلومة" onClose={() => setOpen(false)}>
                  تنبيه قابل للإغلاق. جرّب زرّ ×.
                </Alert>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  إظهار التنبيه من جديد
                </button>
              )}

              <Alert
                tone="warning"
                title="تأكيد الحذف"
                actions={
                  <>
                    <Button size="sm" variant="warning">تأكيد</Button>
                    <Button size="sm" variant="ghost-warning">إلغاء</Button>
                  </>
                }
              >
                هل أنت متأكّد من حذف هذا العنصر؟ لا يمكن التراجع.
              </Alert>

              <Alert tone="success" compact onClose={() => {}}>
                تمّ نسخ الرابط إلى الحافظة.
              </Alert>

              <Alert
                tone="danger"
                title="فشل الإرسال"
                onClose={() => {}}
                actions={
                  <>
                    <Button size="sm" variant="danger">إعادة المحاولة</Button>
                    <Button size="sm" variant="ghost-danger">تجاهل</Button>
                  </>
                }
              >
                تعذّر إرسال النموذج بسبب انقطاع الاتصال.
              </Alert>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
