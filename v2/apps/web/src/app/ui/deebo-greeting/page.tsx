"use client";

/**
 * معرِضُ **تحيّة ديبو** : الجملةُ التي يراها الزائر قبل أن يكتب حرفًا.
 *
 * طلب المالك ٢٠٢٦-٠٨-٢٠ ترحيبًا مختلفًا في كلّ مرّة كما تفعل GPT وClaude، فصارت التحيّةُ
 * صدرًا وعجُزًا يُركَّبان (`lib/deebo/greeting`). ثمّ قال: «الرسائل رسميّة، أريدها ودودة
 * أكثر»، فعُرضت نبرتان (فصحى ليّنة · لهجةٌ خفيفة) **فاختار اللهجة وأُعدمت الفصحى**،
 * ثمّ **كتب الصباحَ بيده** وأمر أن تُعتمد صيغتُه في الأوقات كلِّها.
 *
 * ثمّ أمر ٢٠٢٦-٠٨-٢٠: «اجعل أيقونة ديبو تتفاعل مع كلّ ترحيبٍ حسب الترحيب» — فصار **لكلّ
 * صدرٍ وجهُه**، وصار الجردُ ههنا جردَ جملةٍ ووجهٍ معًا: يُقرأ السطرُ ويُنظَر إلى الرسم بجانبه،
 * فإن كذب أحدُهما على الآخر بان في السطر لا في الصفحة الحيّة.
 *
 * فلم تبقَ في الصفحة مقارنةٌ تُحسم: بقي **الجرد**، وهو الذي يُقرأ حين تُبدَّل كلمة.
 * ولا يُقاس بها شكلٌ ولا تباعد: الشكلُ في `/ui/deebo-screen` والغرفةُ هي الحَكَم.
 */

import { useState } from "react";
import { Button, Container, SectionCard, SectionHeading } from "@adeeb/design-system";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { GREETING_PERIOD, nextSeed, pickGreeting, type DayPart } from "@/lib/deebo/greeting";
import { MOOD_ALT, moodSrc } from "@/lib/deebo/mood";

/** ساعةٌ نموذجيّةٌ لكلّ قسمٍ من اليوم، ووصفُها بلغة الناظر لا بلغة الكود. */
const HOURS: { part: DayPart; hour: number; label: string; when: string }[] = [
  { part: "morning", hour: 9, label: "صباحًا", when: "من الرابعة فجرًا إلى الثانية عشرة" },
  { part: "evening", hour: 19, label: "مساءً", when: "من الثانية عشرة إلى الحادية عشرة ليلًا" },
  { part: "late", hour: 1, label: "آخر الليل", when: "من الحادية عشرة ليلًا إلى الرابعة فجرًا" },
];

/** اسمٌ نموذجيّ : التحيّةُ تُنادي صاحبَ الحساب باسمه الأوّل، والزائرُ المجهول بلا اسم. */
const NAME = "محمّد";

export default function DeeboGreetingLab() {
  const [seed, setSeed] = useState(0);
  const [named, setNamed] = useState(true);
  const [hour, setHour] = useState(9);
  const name = named ? NAME : null;
  /** القرعةُ الحاضرة : تُسحب مرّةً فيتّفق وجهُها وجملتُها كما يتّفقان في الصفحة الحيّة. */
  const drawn = pickGreeting({ seed, hour, name });

  return (
    <Container className="flex flex-col gap-6 py-16">
      <SectionHeading eyebrow="ديبو" title="تحيّةٌ تُركَّب في كلّ زيارة" />

      {/* (١) القرعةُ بيده: يضغط فيرى ما يراه الزائرُ في الفتحة التالية */}
      <SectionCard title="أدِر القرعة، كما تنزل حيّةً في الصفحة الفارغة">
        <div className="mb-4 flex items-center gap-4">
          <img className="dch-hero" src={moodSrc(drawn.mood)} alt={MOOD_ALT[drawn.mood]} width={132} height={132} />
          <p className="text-lg text-content">{drawn.text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setSeed((s) => nextSeed(s))}>
            <ArrowsClockwise />
            تحيّةٌ أخرى
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNamed((v) => !v)}>
            {named ? "بلا اسم (زائرٌ مجهول)" : "بالاسم (صاحبُ حساب)"}
          </Button>
          {HOURS.map((h) => (
            <Button key={h.part} size="sm" variant="ghost" onClick={() => setHour(h.hour)} disabled={hour === h.hour}>
              {h.label}
            </Button>
          ))}
        </div>
      </SectionCard>

      {/* (٢) الجردُ كلُّه: لا يُحكَم على جملةٍ تدور برؤية واحدةٍ منها */}
      {HOURS.map((h) => (
        <SectionCard key={h.part} title={`${h.label}، و${GREETING_PERIOD} تحيّةً ممكنة`}>
          <p className="mb-3 text-sm text-content-muted">{h.when}</p>
          <ul className="flex flex-col gap-2">
            {Array.from({ length: GREETING_PERIOD }, (_, i) => {
              const g = pickGreeting({ seed: i, hour: h.hour, name });
              return (
                <li key={i} className="flex items-center gap-3 text-content">
                  <img className="dch-hero dch-hero-xs" src={moodSrc(g.mood)} alt={MOOD_ALT[g.mood]} width={48} height={48} />
                  <span>{g.text}</span>
                  <span className="font-latin text-xs text-content-muted" dir="ltr">
                    {g.mood}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ))}
    </Container>
  );
}
