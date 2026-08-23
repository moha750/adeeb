"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDeeboManager } from "@/lib/deebo/authz";
import { loadDeeboMind } from "@/lib/deebo/knowledgeSource";
import { buildSystemPrompt, type DeeboPersona } from "@/lib/deebo/persona";
import { liveProvider, readableError } from "@/lib/deebo/providers";
import type { PersonaForm } from "./data";

export type PersonaResult = { ok: boolean; message: string };

const clean = (v: string | null | undefined): string => v?.replace(/[‎‏‪-‮]/g, "").trim() ?? "";
const lines = (v: string): string[] => clean(v).split("\n").map((l) => l.trim()).filter(Boolean);

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية إدارة ديبو.";

/**
 * **الرقمُ يُردّ لا يُنبَّه عليه** — وهذا يفارق غرفةَ الوقائع عن قصد.
 *
 * حارسُ `lib/deebo/guard.ts` يبيح لجواب ديبو كلَّ عددٍ ورد في نصّ توجيهه. فرقمٌ في طبعه
 * يصير رقمًا مأذونًا في كلّ جوابٍ بعده، ويسقط الحارسُ كلُّه صامتًا. أمّا في الوقائع
 * فالرقمُ قد يكون ثابتًا صادقًا، فيُنبَّه عليه ولا يُمنَع. والقيدُ في القاعدة
 * (`deebo_persona_no_digits`) يمسك ما يفلت من ههنا.
 */
const DIGITS = /[0-9٠-٩۰-۹]/;

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: PersonaForm): string | null {
  const required: [keyof PersonaForm, string, number][] = [
    ["identity", "«من أنت»", 2000],
    ["tone", "«نبرتك»", 1200],
    ["boundaries", "«حدودك»", 4000],
    ["unknownAnswer", "جملة «لا أعرف»", 400],
  ];
  for (const [key, label, max] of required) {
    const v = clean(input[key] as string);
    if (v.length < 2) return `${label} مطلوبٌ ولا يُترك فارغًا.`;
    if (v.length > max) return `${label} أطول من الحدّ المسموح.`;
    if (DIGITS.test(v)) return `${label} فيه رقم. الرقمُ في طبع ديبو يُسقط حارسَ الأرقام، فامحُه.`;
  }
  const bad = lines(input.prohibitions).find((p) => DIGITS.test(p));
  if (bad) return `في المحظورات رقم: «${bad}». اكتبها شُرَطًا لا قائمةً مرقَّمة.`;

  const asks = lines(input.suggestedQuestions);
  if (input.shownQuestions < 0 || input.shownQuestions > asks.length) {
    return `المعروضُ من الأسئلة لا يتجاوز ما كتبتَه منها (${asks.length}).`;
  }
  return null;
}

export async function savePersona(input: PersonaForm): Promise<PersonaResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb
    .from("deebo_persona")
    .update({
      identity: clean(input.identity),
      tone: clean(input.tone),
      boundaries: clean(input.boundaries),
      prohibitions: lines(input.prohibitions),
      unknown_answer: clean(input.unknownAnswer),
      suggested_questions: lines(input.suggestedQuestions),
      shown_questions: input.shownQuestions,
      updated_by: mgr.userId,
    })
    .eq("id", 1);
  if (error) return { ok: false, message: `تعذّر الحفظ: ${error.message}` };

  revalidatePath("/dashboard/deebo/persona");
  // الصفحةُ العلنيّةُ تقرأ أسئلتَه وجملةَ «لا أعرف» عند الرسم، فتُنعَش معها.
  revalidatePath("/deebo");
  return { ok: true, message: "حُفظ طبعُ ديبو، ويتكلّم به من الآن." };
}

export type ProbeResult =
  | { ok: true; answer: string; ms: number }
  | { ok: false; message: string };

/**
 * **جرّبه قبل أن تحفظ** — سؤالٌ واحدٌ بالطبع المكتوب في الشاشة الآن.
 *
 * وعلّتُه أنّ الحفظَ ههنا يسري على الزوّار في اللحظة بلا مراجعة، فلا بابَ بين المسوّدة
 * والناس إلّا هذا. ويُبنى التوجيهُ **بمعرفته الحيّة** لا بمعرفةٍ مصطنعة: التجربةُ تصدق
 * أو لا تكون. ولا يُكتب في السجلّ ولا يُحسب من سقف الزوّار: هذه غرفةُ إدارةٍ لا محادثة.
 */
export async function probePersona(draft: PersonaForm, question: string): Promise<ProbeResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };

  const invalid = validate(draft);
  if (invalid) return { ok: false, message: invalid };

  const q = clean(question);
  if (!q) return { ok: false, message: "اكتب سؤالًا لتجرّبه به." };
  if (q.length > 600) return { ok: false, message: "السؤال أطول من الحدّ." };

  const load = await loadDeeboMind(await createClient());
  if (!load.ok) return { ok: false, message: load.message };

  const persona: DeeboPersona = {
    identity: clean(draft.identity),
    tone: clean(draft.tone),
    boundaries: clean(draft.boundaries),
    prohibitions: lines(draft.prohibitions),
    unknownAnswer: clean(draft.unknownAnswer),
    suggestedQuestions: lines(draft.suggestedQuestions),
    shownQuestions: draft.shownQuestions,
  };

  const provider = liveProvider();
  const answer = await provider.ask(buildSystemPrompt(persona, load.mind.knowledge), q);
  if (!answer.ok) return { ok: false, message: readableError(answer.error, provider.envKey) };
  return { ok: true, answer: answer.text, ms: answer.ms };
}
