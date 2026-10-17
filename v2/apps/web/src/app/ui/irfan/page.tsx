"use client";

/**
 * **معاينةُ «عِرفان»** (٢٠٢٦-١٠-١٧) — رسالةُ شكرٍ من عضو أدِيب إلى قائدٍ في المجلسين، تنطلق
 * بمناسبة اليوم العالمي للمدير ثمّ تبقى بمواسم. أقرّ المالكُ الفكرةَ كلَّها: الاسمُ ظاهرٌ لا
 * مجهول، والإرسالُ للأعضاء وحدهم، والقالبُ عنوانٌ يختاره المرسلُ لا رسالةٌ جاهزة (والعنوانُ حلّ
 * محلَّ الافتتاحيّة بعد أن رآهما المالكُ هنا جنبًا إلى جنب).
 *
 * والسؤالُ المعروضُ ههنا سؤالُ عين: **أيُّ الوجهين للبطاقة؟** «رسالة» أم «شفق». مرسومان بالرسّام
 * الحقيقيّ نفسِه (`lib/irfan/card.ts`)، وتحتهما شاشةُ الكتابة بمعاينةٍ حيّة. يُختار وجهٌ فيُحذف الآخر.
 *
 * الأسماءُ مخترَعة: `/ui` صفحةٌ عامّة.
 */

import { useEffect, useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { ImageSquare } from "@phosphor-icons/react";
import { renderIrfanCard, renderIrfanPreview, saveIrfanCard, type IrfanCard, type IrfanLook } from "@/lib/irfan/card";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { IrfanRoom } from "../../dashboard/irfan/IrfanRoom";
import { IrfanCompose } from "../../dashboard/irfan/IrfanCompose";
import type { IrfanRoomData, IrfanSent, Recipient } from "../../dashboard/irfan/vocab";

const SEASON = "اليوم العالمي للمدير";

const LOOKS: { value: IrfanLook; label: string; title: string }[] = [
  { value: "letter", label: "رسالة", title: "التصميم الأول: «رسالة»، ورقةٌ بيضاء" },
  { value: "aurora", label: "شفق", title: "التصميم الثاني: «شفق»، خلفيّةٌ زرقاء" },
];

const SAMPLES: { lab: string; card: IrfanCard }[] = [
  {
    lab: "رسالةٌ متوسّطة، بعنوان",
    card: {
      to: "سديم بندر القحطاني",
      seat: "قائدة لجنة التصوير",
      from: "عبد الرحمن خالد الشيخ",
      title: "شكرًا لكِ",
      body: "صبرُكِ معي في أوّل تغطيةٍ لي لن أنساه، حين أخطأتُ في الإعدادات وأعدتِ شرحها بهدوء كأنّها المرّة الأولى. تعلّمتُ منكِ أنّ القيادة تبدأ من الاستماع.",
      season: SEASON,
    },
  },
  {
    lab: "رسالةٌ قصيرة، بلا عنوان",
    card: {
      to: "نواف ثلاب الشمري",
      seat: "منسّق قسم الإعلام",
      from: "مريم هاني العلوي",
      body: "لن أنسى يوم وقفتَ معنا حتّى آخر الليل قبل المعرض. شكرًا لك.",
      season: SEASON,
    },
  },
  {
    lab: "أطولُ ما يُكتب: خمسمئة حرف، وفقرتان، واسمٌ طويل، وعنوان",
    card: {
      to: "عبد الرحمن بن عبد العزيز الدوسري",
      seat: "نائب قائد لجنة السفراء",
      from: "لطيفة عبد العزيز السليطين",
      title: "ممتنّةٌ لك",
      body:
        "لأنّك آمنتَ بفكرتي حين لم يؤمن بها أحد، وأعطيتني المساحة لأجرّب وأخطئ وأتعلّم. كنتَ تسأل عن تفاصيل العمل وعنّا قبل العمل، وتعرف متى تشدّ ومتى ترخي.\n" +
        "وأكثرُ ما أحمله منك أنّك لم تقل يومًا «هذا ليس من شأنك»، بل كنتَ تقول «تعال نجرّب». هذه السنة كانت أجمل لأنّك كنتَ فيها، وأرجو أن تبقى قريبًا مهما تغيّرت المقاعد. شكرًا من القلب على كلّ شيء، صغيرِه وكبيره.",
      season: SEASON,
    },
  },
];

/** قادةُ المجلسين كما يراهم المرسل — مخترَعون، والحقيقيّون من القاعدة لحظةَ الفتح. */
const LEADERS: Recipient[] = [
  { id: "l1", name: "محمد إسماعيل المطر", seat: "رئيس أدِيب", council: "المجلس الإداري", gender: "male", avatar: null },
  { id: "l2", name: "بشائر فاروق الحداد", seat: "الرئيسة التنفيذية", council: "المجلس الإداري", gender: "female", avatar: null },
  { id: "l3", name: "روان ناصر الهنداس", seat: "قائدة إدارة الموارد البشرية", council: "المجلس الإداري", gender: "female", avatar: null },
  { id: "l4", name: "نواف ثلاب الشمري", seat: "منسّق قسم الإعلام", council: "المجلس التشغيلي", gender: "male", avatar: null },
  { id: "l5", name: "سديم بندر القحطاني", seat: "قائدة لجنة التصوير", council: "المجلس التشغيلي", gender: "female", avatar: null },
  { id: "l6", name: "عبد الرحمن بن عبد العزيز الدوسري", seat: "نائب قائد لجنة السفراء", council: "المجلس التشغيلي", gender: "male", avatar: null },
];

/** الغرفةُ كما يراها قائدٌ في الموسم: ما وصله، وما أرسل. */
const ROOM: IrfanRoomData = {
  season: { id: 1, title: SEASON, closesAt: "2026-10-23T21:00:00.000Z" },
  items: [
    { id: 1, dir: "in", card: { ...SAMPLES[2].card, to: "محمد إسماعيل المطر", seat: "رئيس أدِيب" }, look: "aurora", at: "2026-10-17T09:00:00.000Z", unread: true },
    { id: 2, dir: "in", card: { ...SAMPLES[1].card, to: "محمد إسماعيل المطر", seat: "رئيس أدِيب" }, look: "letter", at: "2026-10-17T08:00:00.000Z", unread: false },
    { id: 3, dir: "out", card: SAMPLES[0].card, look: "letter", at: "2026-10-17T07:00:00.000Z", unread: false },
  ],
  error: null,
};

/** إرسالٌ لا يُرسِل: يُري شاشةَ ما بعد الحفظ، ورابطُ واتساب فيه بلا رقم (يفتح قائمة جهات الاتّصال). */
const demoSend = async (): Promise<IrfanSent> => ({ ok: true, message: "معاينة", upload: null, whatsapp: "https://wa.me/?text=%D9%85%D8%B9%D8%A7%D9%8A%D9%86%D8%A9" });

function useCard(card: IrfanCard, look: IrfanLook, delay = 0) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    const t = setTimeout(() => {
      renderIrfanCard(card, look)
        .then((blob) => {
          if (!alive) return;
          url = URL.createObjectURL(blob);
          setSrc((old) => { if (old) URL.revokeObjectURL(old); return url; });
        })
        .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : "تعذّر رسم البطاقة."); });
    }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, [card, look, delay]);
  return { src, error };
}

/** صورةُ الرابط كما يعرضها واتساب فوق الرسالة — الرسّامُ الحيّ نفسُه (`renderIrfanPreview`). */
function PreviewImage({ card, look }: { card: IrfanCard; look: IrfanLook }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderIrfanPreview(card, look).then((b) => { url = URL.createObjectURL(b); if (alive) setSrc(url); }, () => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [card, look]);
  return (
    <div className="overflow-hidden rounded border border-line bg-surface-2" style={{ aspectRatio: "1200 / 630" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) */}
      {src ? <img src={src} alt="معاينة الرابط في واتساب" className="block w-full" /> : null}
    </div>
  );
}

function CardImage({ card, look, delay }: { card: IrfanCard; look: IrfanLook; delay?: number }) {
  const { src, error } = useCard(card, look, delay);
  return (
    <div className="overflow-hidden rounded border border-line bg-surface-2" style={{ aspectRatio: "4 / 5" }}>
      {error
        ? <p className="p-4 text-content-muted">{error}</p>
        /* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) */
        : src ? <img src={src} alt={`عِرفان إلى ${card.to}`} className="block w-full" />
          : <p className="p-4 text-content-muted">تُرسَم البطاقة…</p>}
    </div>
  );
}

export default function IrfanLabPage() {
  return (
    <ToastProvider>
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Preview, Irfan</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">عِرفان</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          رسالةُ شكرٍ من عضو أدِيب إلى قائدٍ في المجلسين، باسمه ظاهرًا. تُرسَم بطاقةً يجدها القائدُ في
          بوّابته، ويحفظها أو ينشرها إن شاء. وللبطاقة تصميمان يختار المرسلُ أحدَهما.
        </p>

        {SAMPLES.map((s, i) => (
          <section key={s.lab} className="mt-12">
            <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{s.lab}</p>
            <div className="grid grid-cols-2 gap-6">
              {LOOKS.map((l) => (
                <div key={l.value}>
                  <p className="mb-3 text-sm font-bold text-content">{l.title}</p>
                  <CardImage card={s.card} look={l.value} delay={i * 120} />
                  <div className="mt-3">
                    <Button variant="ghost" size="sm" onClick={() => void saveIrfanCard(s.card, l.value)}>
                      <ImageSquare size={18} />احفظ البطاقة
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-16">
          <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">صورةُ الرابط في واتساب، تظهر فوق الرسالة</p>
          <div className="grid grid-cols-2 gap-6">
            {LOOKS.map((l) => (
              <div key={l.value}>
                <p className="mb-3 text-sm font-bold text-content">{l.title}</p>
                <PreviewImage card={SAMPLES[0].card} look={l.value} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">الغرفة في البوّابة، كما يراها قائدٌ في الموسم</p>
          <IrfanRoom data={ROOM} demo />
        </section>

        <section className="mt-16">
          <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">شاشة الكتابة، بمعاينةٍ حيّة، والتصميمُ يختاره المرسل</p>
          <IrfanCompose leaders={LEADERS} season={SEASON} sender={{ name: "عبد الرحمن خالد الشيخ", gender: "male" }} canReceive={false} send={demoSend} />
        </section>
      </Container>
    </main>
    </ToastProvider>
  );
}
