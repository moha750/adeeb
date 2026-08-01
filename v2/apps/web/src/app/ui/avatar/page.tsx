"use client";

import { Container } from "@adeeb/design-system";
import { Avatar } from "../../dashboard/_components/Avatar";

const IMG = "/brand/pattern-circular.svg";

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

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
const SIZE_LABEL: Record<(typeof SIZES)[number], string> = {
  xs: "دقيق",
  sm: "صغير",
  md: "متوسط",
  lg: "كبير",
  xl: "ضخم",
};

const STATUSES = ["online", "away", "busy", "offline"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  online: "متّصل",
  away: "غائب",
  busy: "مشغول",
  offline: "غير متّصل",
};

export default function AvatarPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Avatar
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          معرض الصورة الرمزيّة
        </h1>
        <p className="mt-2 max-w-xl text-content-muted">
          مربّع بزوايا مستديرة وحدّ، بتدرّج الهوية · صورة مع رجوع للأحرف الأولى · خمسة أحجام ومؤشّر حالة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="الأحجام">
            <Lab>xs · sm · md · lg · xl</Lab>
            <div className="flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Avatar name="محمّد إسماعيل" size={s} />
                  <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {s} · {SIZE_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="صورة مقابل الأحرف الأولى">
            <Lab>src موجود ← الصورة · بلا src ← الأحرف الأولى من الاسم</Lab>
            <div className="flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <Avatar key={s} name="نادي أديب" src={IMG} size={s} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <Avatar key={s} name="سارة القحطاني" size={s} />
              ))}
            </div>
          </Sec>

          <Sec title="أيقونة الجنس — رجوعٌ قبل الأحرف">
            <Lab>بلا src وبجنسٍ معلوم ← أيقونة الذكر/الأنثى (فوق تدرّج الهوية) · المجهول يبقى بالأحرف</Lab>
            <div className="flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <Avatar key={s} name="عبدالله القحطاني" gender="male" size={s} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <Avatar key={s} name="سارة الفيصل" gender="female" size={s} />
              ))}
            </div>
          </Sec>

          <Sec title="مؤشّر الحالة">
            <Lab>online · away · busy · offline</Lab>
            <div className="flex flex-wrap items-end gap-8">
              {STATUSES.map((st) => (
                <div key={st} className="flex flex-col items-center gap-2">
                  <Avatar name="ليلى المطيري" size="lg" status={st} />
                  <span className="font-latin text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {STATUS_LABEL[st]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-8">
              {STATUSES.map((st) => (
                <Avatar key={st} name="فهد العتيبي" src={IMG} size="lg" status={st} />
              ))}
            </div>
          </Sec>

          <Sec title="الرجوع الافتراضيّ">
            <Lab>اسم من كلمة واحدة ← حرف واحد · بلا اسم ← «؟»</Lab>
            <div className="flex flex-wrap items-center gap-6">
              <Avatar name="أديب" size="lg" />
              <Avatar size="lg" />
              <Avatar name="عبدالله بن سعد الشمري" size="lg" />
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
