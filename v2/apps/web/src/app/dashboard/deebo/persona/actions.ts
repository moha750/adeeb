"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDeeboManager } from "@/lib/deebo/authz";
import { loadDeeboMind } from "@/lib/deebo/knowledgeSource";
import { boundariesText, buildSystemPrompt, type DeeboPersona } from "@/lib/deebo/persona";
import { liveProvider, readableError } from "@/lib/deebo/providers";
import { PROBE_SET } from "@/lib/deebo/probeSet";
import { PROMPT_BUDGET, PROMPT_FIELDS } from "./limits";
import { getPersonaVersion, type PersonaForm } from "./data";

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

  /* الأحكامُ صفوفٌ (م١٠): يُفحَص كلُّ واحدٍ وحدَه فتُسمّى المخالفةُ باسمها، لا «في حدودك
     رقمٌ ما». والمعطَّلُ يُفحَص كالعامل: يُطفأ اليومَ ويُشعَل غدًا. */
  if (input.rules.length === 0) return "لا حدَّ واحدَ مكتوب. اكتب حكمًا على الأقلّ.";
  if (input.rules.length > 40) return "الأحكامُ أكثرُ من أربعين. ادمج ما تكرّر.";
  for (const [i, r] of input.rules.entries()) {
    const name = r.title?.trim() || `الحكم ${["الأوّل","الثاني","الثالث","الرابع","الخامس","السادس","السابع","الثامن"][i] ?? ""}`.trim();
    const body = clean(r.body);
    if (body.length < 2) return `${name}: متنُه فارغ. اكتبه أو احذف الحكم.`;
    if (body.length > 1200) return `${name}: أطولُ من الحدّ (١٢٠٠ حرف). اقسمه حكمين.`;
    if (DIGITS.test(body) || DIGITS.test(r.title ?? "")) {
      return `${name}: فيه رقم. الرقمُ في طبع ديبو يُسقط حارسَ الأرقام، فامحُه.`;
    }
  }

  /* **سقفُ الطول: تضيف فتحذف** (٢٠٢٦-٠٨-٢٥). أسهلُ إصلاحٍ في شاشةٍ كهذه إضافةُ سطرٍ لكلّ
     شكوى، وكلُّ سطرٍ يُضاف يُضعِف ما قبله: النموذجُ يوزّع انتباهَه على ما يُعطى، فتوجيهٌ
     متورّمٌ يُنسي أوّلَه. والقيودُ في القاعدة على كلّ عمودٍ وحدَه، والمحظوراتُ بلا قيدٍ
     أصلًا — فالميزانُ ههنا على **المجموع**: من بلغ السقفَ حذف قبل أن يضيف. */
  const total =
    PROMPT_FIELDS.reduce((n, k) => n + clean(input[k] as string).length, 0) +
    boundariesText(input.rules).length;
  if (total > PROMPT_BUDGET) {
    return `طبعُه أطول ممّا يحتمل (${total} من ${PROMPT_BUDGET} حرفًا). التوجيهُ المتورّم يُنسي أوّلَه، فاحذف قبل أن تضيف.`;
  }

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
      /* **الصفوفُ مصدرٌ، والنصُّ نسخةٌ** حتى يُنشَر الجديد: الإنتاجُ يعمل بالكود المنشور
         وهو يقرأ `boundaries`، فكتابةُ الاثنين تمنع صمتَ ديبو بين الترحيل والنشر.
         ويُحذف العمودُ في م١١ بعد النشر. */
      boundary_rules: input.rules.map((r) => ({
        title: clean(r.title ?? ""),
        body: clean(r.body),
        enabled: r.enabled !== false,
      })),
      boundaries: boundariesText(input.rules),
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
    boundaryRules: draft.rules,
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


/**
 * **الرجعة** — تعيد لقطةً قديمةً صفًّا حيًّا.
 *
 * وهي تحديثٌ عاديٌّ لا استثناء، فيأخذ المُطلِقُ لقطةً للقائم قبل أن يُستبدَل: **الرجعةُ
 * نفسُها يُرجَع عنها**. ويمرّ بالتحقّق نفسِه (اللقطةُ قديمةٌ وقد تكون كُتبت قبل قيدٍ زِيد).
 */
export async function restorePersona(versionId: number): Promise<PersonaResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };

  const old = await getPersonaVersion(versionId);
  if (!old) return { ok: false, message: "لم تُوجد هذه النسخة." };

  const invalid = validate(old);
  if (invalid) return { ok: false, message: `النسخةُ القديمة لا تمرّ بالقيود اليوم: ${invalid}` };

  return savePersona(old);
}

export type SuiteAnswer = {
  id: string;
  ms: number;
  /** جوابُ الطبع القائم اليوم — يُطلَب حين تُقارَن المسوّدةُ بالحيّ. */
  live?: string;
} & ({ ok: true; answer: string } | { ok: false; message: string });

/**
 * **حزمةُ القياس** — الأسئلةُ الثمانيةُ الثابتة بالمسوّدة، في نداءٍ واحدٍ من الشاشة.
 *
 * وتجري **أربعةً أربعة** لا ثمانيةً معًا: المزوّدُ يخنق التوازيَ الكثيف، وبطءُ غرفةِ
 * إدارةٍ أهونُ من نصفِ حزمةٍ يعود بخطأ. ولا تُسجَّل ولا تُحسب من سقف الزوّار كأختها.
 */
export async function probeSuite(
  draft: PersonaForm,
  compareLive = false,
): Promise<{ ok: true; answers: SuiteAnswer[] } | { ok: false; message: string }> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };

  const invalid = validate(draft);
  if (invalid) return { ok: false, message: invalid };

  const load = await loadDeeboMind(await createClient());
  if (!load.ok) return { ok: false, message: load.message };

  const persona: DeeboPersona = {
    identity: clean(draft.identity),
    tone: clean(draft.tone),
    boundaryRules: draft.rules,
    prohibitions: lines(draft.prohibitions),
    unknownAnswer: clean(draft.unknownAnswer),
    suggestedQuestions: lines(draft.suggestedQuestions),
    shownQuestions: draft.shownQuestions,
  };
  const provider = liveProvider();
  const prompt = buildSystemPrompt(persona, load.mind.knowledge);
  /* **القياسُ المزدوج**: القيمةُ في الفرق لا في الجواب. فالسؤالُ نفسُه يُسأل للطبع القائم
     (كما يقرؤه الزائرُ الآن) وللمسوّدة، ويُقرآن متجاورين. ولا يُطلب الحيُّ إلّا حين
     يُطلَب: ستّةَ عشرَ نداءً بدل ثمانية. */
  const livePrompt = compareLive ? buildSystemPrompt(load.mind.persona, load.mind.knowledge) : null;

  const answers: SuiteAnswer[] = [];
  for (let i = 0; i < PROBE_SET.length; i += 4) {
    const batch = await Promise.all(
      PROBE_SET.slice(i, i + 4).map(async (p) => {
        const [a, l] = await Promise.all([
          provider.ask(prompt, p.question),
          livePrompt ? provider.ask(livePrompt, p.question) : Promise.resolve(null),
        ]);
        const live = l && l.ok ? l.text : undefined;
        return a.ok
          ? ({ id: p.id, ok: true, answer: a.text, ms: a.ms, live } as SuiteAnswer)
          : ({ id: p.id, ok: false, message: readableError(a.error, provider.envKey), ms: a.ms, live } as SuiteAnswer);
      }),
    );
    answers.push(...batch);
  }
  return { ok: true, answers };
}
