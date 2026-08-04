"use client";

import { Button, Container } from "@adeeb/design-system";
import { CheckCircle, XCircle, Info, Warning, Stack } from "@phosphor-icons/react";
import { ToastProvider, useToast } from "../../dashboard/_components/ToastProvider";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

function Demo() {
  const toast = useToast();
  return (
    <div className="mt-12 space-y-14">
      <Sec title="النغمات">
        <Lab>success · error · info · warning</Lab>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="success" onClick={() => toast.success("حُفظت التغييرات بنجاح.")}>
            <CheckCircle aria-hidden /> نجاح
          </Button>
          <Button variant="danger" onClick={() => toast.error("تعذّر حفظ التغييرات، حاول مرّة أخرى.")}>
            <XCircle aria-hidden /> خطأ
          </Button>
          <Button variant="ghost" onClick={() => toast.info("لديك رسالة جديدة في صندوق الوارد.")}>
            <Info aria-hidden /> معلومة
          </Button>
          <Button variant="warning" onClick={() => toast.warning("ستنتهي صلاحية الجلسة قريبًا.")}>
            <Warning aria-hidden /> تحذير
          </Button>
        </div>
      </Sec>

      <Sec title="السلوك">
        <Lab>الخطأ يبقى حتى يُغلَق يدويًّا · البقيّة تختفي تلقائيًّا بعد ١٠ ثوانٍ</Lab>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="danger" onClick={() => toast.error("إشعار خطأ ثابت — لا يُجدوَل، أغلقه بزرّ ×.")}>
            خطأ ثابت
          </Button>
          <Button variant="ghost" onClick={() => toast.info("إشعار عابر — يختفي وحده وفق شريط التقدّم.")}>
            عابر افتراضيّ
          </Button>
        </div>
      </Sec>

      <Sec title="المدّة المخصّصة">
        <Lab>الخيار الثاني: opts.duration بالملّي ثانية</Lab>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost-success" onClick={() => toast.success("مدّة قصيرة — ثانيتان.", { duration: 2000 })}>
            ٢ ثانية
          </Button>
          <Button variant="ghost" onClick={() => toast.info("مدّة متوسّطة — خمس ثوانٍ.", { duration: 5000 })}>
            ٥ ثوانٍ
          </Button>
          <Button variant="ghost-warning" onClick={() => toast.warning("مدّة طويلة — عشرون ثانية.", { duration: 20000 })}>
            ٢٠ ثانية
          </Button>
        </div>
      </Sec>

      <Sec title="المكدّس">
        <Lab>سقف المكدّس ٥ إشعارات — يُزال الأقدم عند التجاوز</Lab>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            onClick={() => {
              toast.info("الإشعار الأوّل.");
              toast.success("الإشعار الثاني.");
              toast.warning("الإشعار الثالث.");
              toast.info("الإشعار الرابع.");
              toast.success("الإشعار الخامس.");
              toast.error("الإشعار السادس — يدفع الأقدم خارج المكدّس.");
            }}
          >
            <Stack aria-hidden /> أطلق ٦ دفعة واحدة
          </Button>
        </div>
      </Sec>
    </div>
  );
}

export default function ToastPage() {
  return (
    <ToastProvider>
      <main className="py-16">
        <Container>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
            Design System · Toast
          </p>
          <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الإشعارات</h1>
          <p className="mt-2 max-w-xl text-content-muted">
            إشعارات عابرة بأربع نغمات · شريط تقدّم للاختفاء التلقائيّ · مكدّس محدود بخمسة.
          </p>
          <Demo />
        </Container>
      </main>
    </ToastProvider>
  );
}
