"use server";

/**
 * مِنفذُ المقارنة — يمرّر السؤال الواحد على المزوّدين الأربعة معًا.
 *
 * ⚠️ **مقفولٌ على بيئة التطوير.** مسار `/ui` غير محروسٍ في الوسيط (الحارس على
 * `/dashboard` وحده)، وهذا الفعل ينفق مالًا بكلّ ضغطة. فلو بقي مفتوحًا في
 * الإنتاج كان بابًا يستنزف الفاتورة بلا حساب. مختبرٌ لا منتَج.
 *
 * والأربعةُ يُنادَون **بالتوازي** لا بالتتابع: أبطؤهم يحدّ الانتظار بدل أن
 * يجتمع بطؤهم كلُّه.
 */

import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/deebo/persona";
import { PROVIDERS, type Answer } from "@/lib/deebo/providers";
import { TEST_QUESTIONS } from "@/lib/deebo/questions";
import { loadDeeboMind } from "@/lib/deebo/knowledgeSource";

export type CompareResult = {
  providerId: string;
  label: string;
  model: string;
  envKey: string;
  answer: Answer;
};

export type CompareResponse =
  | { ok: true; question: string; results: CompareResult[] }
  | { ok: false; message: string };


export async function askAll(questionIndex: number): Promise<CompareResponse> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "المقارنة مقفولةٌ في الإنتاج. شغّلها محليًّا بـ pnpm dev." };
  }

  const question = TEST_QUESTIONS[questionIndex];
  if (!question) return { ok: false, message: "سؤالٌ غير موجود." };

  // العقلُ من مصدره الواحد — الجداولُ الثلاثةُ كما يقرؤها مِنفذُ ديبو نفسُه، وإلّا
  // حُكِم في المختبر على جوابٍ بعقلٍ ليس عقلَه.
  const load = await loadDeeboMind(await createClient());
  if (!load.ok) return { ok: false, message: load.message };
  const { persona, knowledge } = load.mind;
  if (knowledge.faq.length === 0 && knowledge.facts.length === 0) {
    return { ok: false, message: "معرفةُ ديبو فارغةٌ في القاعدة، فلا شيء يجيب منه." };
  }

  const system = buildSystemPrompt(persona, knowledge);
  const results = await Promise.all(
    PROVIDERS.map(async (p): Promise<CompareResult> => ({
      providerId: p.id,
      label: p.label,
      model: p.model,
      envKey: p.envKey,
      answer: await p.ask(system, question.text),
    })),
  );

  return { ok: true, question: question.text, results };
}

/** أيُّ المفاتيح موجودٌ الآن، ليُقال للناظر ما ينقصه قبل أن يضغط. */
export async function missingKeys(): Promise<string[]> {
  const needed = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY"];
  return needed.filter((k) => !process.env[k]?.trim());
}
