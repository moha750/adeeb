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
import type { FaqRow } from "@/lib/deebo/knowledge";

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

/** يقرأ معرفة ديبو الحيّة من جدول الأسئلة الشائعة. */
async function loadFaq(): Promise<{ rows: FaqRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faq").select("question, answer").order("id");
  if (error) return { rows: [], error: "تعذّر قراءة جدول الأسئلة الشائعة من القاعدة." };
  return { rows: (data ?? []) as FaqRow[], error: null };
}

export async function askAll(questionIndex: number): Promise<CompareResponse> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "المقارنة مقفولةٌ في الإنتاج. شغّلها محليًّا بـ pnpm dev." };
  }

  const question = TEST_QUESTIONS[questionIndex];
  if (!question) return { ok: false, message: "سؤالٌ غير موجود." };

  const { rows, error } = await loadFaq();
  if (error) return { ok: false, message: error };
  if (rows.length === 0) {
    return { ok: false, message: "جدول الأسئلة الشائعة فارغ، فلا معرفة لدى ديبو ليجيب منها." };
  }

  const system = buildSystemPrompt(rows);
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
