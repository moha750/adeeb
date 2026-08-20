"use client";

/**
 * معاينةُ بطاقة نتيجة الانتخاب — الرسّامُ الحقيقيّ نفسُه (`lib/elections/resultCard`) لا رسمٌ
 * ثانٍ للعرض: ما تراه ههنا هو ما يُوزَّع في قروب القسم بايتًا ببايت.
 *
 * وثلاثُ حالاتٍ تُغطّي ما يقع: تنافسٌ مُحسَم، وتزكيةٌ بتأييدٍ واعتراض، واسمٌ ومقعدٌ طويلان
 * (فالمقاسُ ينزل ولا يطفح النصّ عن البطاقة).
 */

import { useEffect, useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { ImageSquare } from "@phosphor-icons/react";
import { renderResultCard, saveResultCard, type ConfettiStyle, type ResultCard } from "@/lib/elections/resultCard";

/** درجاتُ الاحتفال الثلاث — تُعرَض على بطاقةٍ واحدةٍ ليُقارَن بينها بالعين لا بالوصف. */
const GRADES: { lab: string; style: ConfettiStyle }[] = [
  { lab: "بلا قصاصات", style: "none" },
  { lab: "قصاصاتٌ في الزوايا", style: "corners" },
  { lab: "مطرٌ خفيفٌ يعبر البطاقة", style: "rain" },
];

const SAMPLES: { lab: string; card: ResultCard }[] = [
  {
    lab: "تنافسٌ مُحسَم",
    card: {
      position: "قائد لجنة الإعلام",
      roleName: "committee_leader",
      winner: "محمّد بن إسماعيل المطر",
      gender: "male",
      votes: 12,
      turnout: 19,
      confidence: false,
      opposeVotes: 0,
      declaredAt: "2026-08-16T09:12:00.000Z",
    },
  },
  {
    lab: "تزكيةٌ: تأييدٌ واعتراض",
    card: {
      position: "منسّق قسم البرامج",
      winner: "الجازي محمد الغوينم",
      gender: "female",
      votes: 9,
      turnout: 11,
      confidence: true,
      opposeVotes: 2,
      declaredAt: "2026-08-16T09:12:00.000Z",
    },
  },
  {
    // البطاقةُ التي طفح فيها الاسمُ عن حافّتي المربّع (٢٠٢٦-٠٨-١٦): تبقى شاهدةً فلا يعود
    // القياسُ يُحسَب بحرفٍ غيرِ ممدودٍ ثمّ يُرسَم ممدودًا.
    lab: "شاهدُ الطفح: اسمٌ متوسّطٌ خرج عن البطاقة",
    card: {
      position: "منسّق قسم التواصل المجتمعي",
      roleName: "department_head",
      winner: "ريان بن صالح الشمري",
      gender: "male",
      votes: 4,
      turnout: 10,
      confidence: false,
      opposeVotes: 0,
      declaredAt: "2026-08-16T09:12:00.000Z",
    },
  },
  {
    lab: "طولٌ يُختبَر: مقعدٌ واسمٌ طويلان، وصوتان لا غير",
    card: {
      position: "نائب قائد لجنة السفراء والتصوير",
      winner: "عبد الرحمن بن عبد العزيز الدوسري",
      gender: "male",
      votes: 2,
      turnout: 3,
      confidence: false,
      opposeVotes: 0,
      declaredAt: "2026-08-16T09:12:00.000Z",
    },
  },
];

function CardPreview({ card, style }: { card: ResultCard; style?: ConfettiStyle }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    renderResultCard(card, style)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setSrc(url);
      })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : "تعذّر توليد البطاقة."); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [card, style]);

  return (
    <div>
      <div
        className="overflow-hidden rounded border border-line bg-surface-2"
        style={{ aspectRatio: "1 / 1", maxWidth: 460 }}
      >
        {error
          ? <p className="p-4 text-content-muted">{error}</p>
          /* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) لا أصلٌ يُحسّنه Next */
          : src ? <img src={src} alt="بطاقة نتيجة الانتخاب" style={{ width: "100%", display: "block" }} />
            : <p className="p-4 text-content-muted">جارٍ الرسم…</p>}
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={() => void saveResultCard(card)} disabled={!src}>
          <ImageSquare size={18} />استخرج البطاقة
        </Button>
      </div>
    </div>
  );
}

export default function ResultCardPage() {
  return (
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Artifact</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">بطاقة نتيجة الانتخاب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          صورةٌ مربّعةٌ تُستخرَج بعد إعلان الفائز فتُرسَل في قروب القسم أو اللجنة. لا قالبَ لها:
          خلفيّتُها من رموز الهوية نفسِها، ونصُّها ممدودٌ كخطّ الموقع. وحصيلتُها بعدد المصوّتين لا
          بالأوزان، وليس فيها أصواتُ الخاسرين.
        </p>

        <section className="mt-12">
          <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">
            درجاتُ القصاصات الذهبيّة على بطاقةٍ واحدة
          </p>
          <p className="mb-4 max-w-2xl text-content-muted">
            الذهبُ ذهبُ افتتاحيّة القصّة نفسُه، والقطعُ موضوعةٌ بيدٍ في جدولٍ مكتوب (كحروف الفصل
            الأوّل) فلا تخرج بطاقتان مختلفتان لمقعدٍ واحد، ولا تقع قصاصةٌ على اسم.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {GRADES.map((g) => (
              <div key={g.style}>
                <p className="mb-3 text-sm font-bold text-content">{g.lab}</p>
                <CardPreview card={SAMPLES[0].card} style={g.style} />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 grid gap-10 sm:grid-cols-2">
          {SAMPLES.map((s) => (
            <section key={s.lab}>
              <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{s.lab}</p>
              <CardPreview card={s.card} />
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
