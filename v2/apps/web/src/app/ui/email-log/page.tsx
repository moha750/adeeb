"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { EmailLogView } from "../../dashboard/system/email/EmailLogView";
import type { MailHealth, MailRow } from "../../dashboard/system/email/data";
import { clubDayKey } from "@/lib/dates";

/**
 * **معرضُ «سجلّ البريد»** (٢٠٢٦-١٠-١٨) — الغرفةُ الحيّة نفسُها (`EmailLogView`) بحقائقَ مخترَعة.
 *
 * **وقصّتُها**: عُرض على المالك وجهان قبل البناء، «سجلٌّ يُقرأ» (كروتُ الأيّام على سنّة سجلّ ديبو) و«الحالُ
 * أوّلًا» (نبضُ البريد، ثمّ ما يحتاج نظرك، ثمّ جدول). فقال: «أبغاهم اثنينهم». فجُمعا في غرفةٍ واحدة: رأسُ
 * الثاني فوق سجلّ الأوّل، وسقط ما تكرّر (جدولُ الثاني وشرائطُه، وإحصاءا الأوّل). وأُعدم الوجهان المنفصلان،
 * وصار المعرضُ يرسم الغرفةَ الحيّة نفسَها، فما يُرى هنا هو ما في اللوحة.
 *
 * الأسماءُ والعناوينُ مخترَعة: `/ui` صفحةٌ عامّة. والأزرارُ تنادي أفعالَ الغرفة الحقيقيّة فتردّ «لا تملك
 * صلاحية» لمن لا يملكها، وذلك هو الصواب.
 */

const IT = "قسم نظم المعلومات";
const HR = "إدارة الموارد البشرية";
const OUT = "الإدارة التنفيذية";

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const M = (
  id: number, subject: string, to: string, email: string, unit: string, min: number,
  status: MailRow["status"], extra: Partial<MailRow> = {},
): MailRow => ({
  id, kind: extra.auth ? "auth.code" : "notify.note", subject, to, email, unit, status,
  attempts: 1, why: null, createdAt: ago(min), sentAt: status === "sent" ? ago(min) : null, auth: false,
  delivery: status === "sent" ? "delivered" : null, suppressed: false, ...extra,
});

const ROWS: MailRow[] = [
  M(1, "رمزُ دخولك إلى أدِيب", "سديم القحطاني", "sadeem.q@example.com", IT, 4, "sent", { auth: true }),
  M(2, "أُسند إليك منصب", "فهد العتيبي", "fahad.ot@example.com", HR, 38, "sent", { delivery: null }),
  M(3, "أُسند إليك منصب", "ريما المحسن", "rima.m@exmaple.com", HR, 38, "sent", { delivery: "bounced", suppressed: true, why: "ارتدّت: العنوانُ لا يستقبل البريد، فأُوقف" }),
  M(10, "انتهى تكليفك", "سعد العبود", "saad.a@example.com", HR, 50, "dead", { why: "المزوّدُ متعطّلٌ مؤقّتًا" }),
  M(4, "ردُّنا على رسالتك", "نوف الشمري", "n.alshammari@example.com", OUT, 2, "queued", { attempts: 2, why: "المزوّدُ مزدحم" }),
  M(5, "رمزُ دخولك إلى أدِيب", "يوسف البقمي", "yousef.b@example.com", IT, 60 * 20, "sent", { auth: true }),
  M(6, "انتهى تكليفك", "لطيفة السليطين", "latifa.s@example.com", HR, 60 * 27, "sent"),
  M(7, "إعادةُ تعيين كلمة المرور", "ماجد الحربي", "majed.h@example.com", IT, 60 * 30, "dead", { auth: true, attempts: 6, why: "فات أجلُها قبل أن تخرج" }),
  M(8, "أكّد بريدك الجديد", "جود الغامدي", "jood.g@example.com", IT, 60 * 72, "sent", { auth: true }),
  M(9, "رسالةُ تجربة من نادي أدِيب", "محمّد إسماعيل", "mohammad@example.com", IT, 60 * 96, "cancelled", { attempts: 0 }),
];

const HEALTH: Record<string, MailHealth> = {
  ok: { down: false, lastSentAt: ago(4), queued: 1 },
  down: { down: true, lastSentAt: ago(60 * 3), queued: 7 },
};

export default function EmailLogGallery() {
  const [w, setW] = useState("375");
  const [state, setState] = useState("ok");
  return (
    <ToastProvider>
      <main className="py-16">
        <Container>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, Email log</p>
          <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">سجلّ البريد</h1>
          <p className="mt-2 max-w-2xl text-content-muted">
            غرفةُ كلّ رسالةٍ خرجت من أدِيب أو تعثّرت: نبضُ البريد، ثمّ ما يحتاج نظرك، ثمّ السجلُّ كروتًا تجمعها الأيّام.
            الأسماءُ مخترَعة، ورمزُ الدخول لا يظهر.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Segmented items={[{ value: "375", label: "جوّال" }, { value: "760", label: "حاسوب" }]} value={w} onValueChange={setW} aria-label="عرض الشاشة" />
            <Segmented items={[{ value: "ok", label: "البريد يعمل" }, { value: "down", label: "البريد متعطّل" }]} value={state} onValueChange={setState} aria-label="حال البريد" />
          </div>

          <div className="phdlab mt-8" style={{ ["--phdlab-w" as string]: `${w}px` }}>
            <div className="phdlab-col">
              <div className="phdlab-frame">
                <EmailLogView rows={ROWS} health={HEALTH[state]} todayKey={clubDayKey(new Date().toISOString())} />
              </div>
            </div>
          </div>
        </Container>
      </main>
    </ToastProvider>
  );
}
