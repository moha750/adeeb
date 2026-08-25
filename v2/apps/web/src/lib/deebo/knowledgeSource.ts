import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { DeeboKnowledge, FaqRow, KnowledgeChunk } from "./knowledge";
import type { BoundaryRule, DeeboPersona } from "./persona";

/**
 * **قراءةُ عقل ديبو** — طبعُه ومعرفتُه في موضعٍ واحد.
 *
 * كانت قراءةُ `faq` مكتوبةً في مِنفذ ديبو وفي مختبر المقارنة كلٌّ على حدة، فلمّا
 * انضمّ إليها جدولُ الوقائع ثمّ جدولُ الطبع (٢٠٢٦-٠٨-٢٢) صار الازدواجُ بابَ افتراق:
 * مِنفذٌ يقرأ ثلاثةً ومختبرٌ يقرأ واحدًا، فيُحكَم على جوابٍ بعقلٍ ليس عقلَه. فصارت
 * القراءةُ ههنا وحدها، والثلاثةُ تُقرأ **معًا** لا واحدًا بعد واحد (`Promise.all`).
 *
 * والقراءةُ **بعميل الطلب** لا بمفتاح الخدمة: ديبو يُسأل من غير جلسة، وسياسةُ
 * القراءة تفتح للعموم ما كان قائمًا (`is_active`). فلو قُرئ بمفتاح الخدمة لتجاوز
 * العلَمَ فأجاب من واقعةٍ أوقفها صاحبُ الغرفة بيده.
 *
 * **والفشلُ يُغلق لا يفتح**: يردّ رسالةً فيردّ المِنفذُ ٥٠٣، ولا يجيب ديبو بنصف
 * معرفةٍ لا يدري أيَّ نصفٍ سقط منه.
 */
export type DeeboReader = Awaited<ReturnType<typeof createClient>>;

/** ما يلزم لبناء توجيه ديبو كاملًا: طبعُه ومعرفتُه. */
export type DeeboMind = { persona: DeeboPersona; knowledge: DeeboKnowledge };

export type MindLoad = { ok: true; mind: DeeboMind } | { ok: false; message: string };

export async function loadDeeboMind(sb: DeeboReader): Promise<MindLoad> {
  const [personaRes, faqRes, factRes] = await Promise.all([
    sb
      .from("deebo_persona")
      .select("identity, tone, boundary_rules, prohibitions, unknown_answer, suggested_questions, shown_questions")
      .eq("id", 1)
      .maybeSingle(),
    sb.from("faq").select("question, answer").order("id"),
    sb
      .from("deebo_knowledge")
      .select("slug, title, body")
      .eq("is_active", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (personaRes.error || faqRes.error || factRes.error) {
    return { ok: false, message: "تعذّر قراءة معرفة ديبو الآن." };
  }
  // صفُّ الطبع واحدٌ يُولد مع الترحيل ولا سياسةَ حذفٍ له. فغيابُه عطبٌ في القاعدة لا
  // حالةٌ تُعالَج بطبعٍ افتراضيّ: ديبو بلا حدودٍ ولا محظورات أسوأُ من ديبو صامت.
  const row = personaRes.data as PersonaRow | null;
  if (!row) return { ok: false, message: "طبعُ ديبو مفقودٌ من القاعدة." };

  return {
    ok: true,
    mind: {
      persona: {
        identity: row.identity,
        tone: row.tone,
        boundaryRules: (row.boundary_rules ?? []) as BoundaryRule[],
        prohibitions: row.prohibitions ?? [],
        unknownAnswer: row.unknown_answer,
        suggestedQuestions: row.suggested_questions ?? [],
        shownQuestions: row.shown_questions,
      },
      knowledge: {
        faq: (faqRes.data ?? []) as FaqRow[],
        facts: (factRes.data ?? []) as KnowledgeChunk[],
      },
    },
  };
}

type PersonaRow = {
  identity: string;
  tone: string;
  boundary_rules: BoundaryRule[] | null;
  prohibitions: string[] | null;
  unknown_answer: string;
  suggested_questions: string[] | null;
  shown_questions: number;
};

/** ما تحتاجه الشاشةُ العلنيّة من طبعه: أسئلتُه المعروضة وجملةُ «لا أعرف» (لوجه الاعتذار). */
export type DeeboVoice = { questions: readonly string[]; unknownAnswer: string };

/**
 * صوتُ ديبو للشاشة — قراءةٌ واحدةٌ خفيفةٌ لا تجرّ معرفتَه كلَّها.
 *
 * **وتعثُّرُها لا يُسقط الصفحة**: بلا أسئلةٍ تبقى الغرفةُ غرفةً يُكتب فيها، وبلا جملةِ
 * «لا أعرف» يبقى وجهُ الشرح. فالحدُّ ههنا زينةٌ لا حقيقةٌ تُقال للزائر.
 */
export async function loadDeeboVoice(sb: DeeboReader): Promise<DeeboVoice> {
  const { data, error } = await sb
    .from("deebo_persona")
    .select("suggested_questions, shown_questions, unknown_answer")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { questions: [], unknownAnswer: "" };

  const row = data as { suggested_questions: string[] | null; shown_questions: number; unknown_answer: string };
  return {
    questions: (row.suggested_questions ?? []).slice(0, Math.max(0, row.shown_questions)),
    unknownAnswer: row.unknown_answer,
  };
}
