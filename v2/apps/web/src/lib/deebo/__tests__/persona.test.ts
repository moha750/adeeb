import { describe, expect, test } from "vitest";
import { buildSystemPrompt, shownQuestionsOf, type DeeboPersona } from "../persona";
import { allowedNumbers } from "../guard";

/** طبعٌ مصغَّرٌ يكفي للبنية — والحقيقيُّ في القاعدة، وهذا امتحانُ التركيب لا النصّ. */
const persona: DeeboPersona = {
  identity: "تتحدّث عن نفسك بصيغة المتكلّم.",
  tone: "ودود، مختصر.",
  boundaryRules: [
    { body: "لا تخترع رقمًا.", enabled: true },
    { body: "حكمٌ معطَّلٌ لا يدخل التوجيه.", enabled: false },
  ],
  prohibitions: ["لا تعِد أحدًا بقبول عضويّة.", "لا تتحدّث باسم المجلس."],
  unknownAnswer: "هذا ما لا أعرفه.",
  suggestedQuestions: ["ما نادي أديب؟", "كيف أنضمّ إليكم؟", "هل أحضر بلا عضويّة؟"],
  shownQuestions: 2,
};

const empty = { faq: [], facts: [] };

describe("نصُّ التوجيه يُركَّب من الصفّ", () => {
  /* م١٠: الحدودُ أحكامٌ مفردة، والمعطَّلُ منها **لا يُرسَل**. وهذا هو معنى المفتاح: يُطفأ
     الحكمُ ليُعرَف أثرُه، فلو بقي في النصّ لَما دلّ الإطفاءُ على شيء. */
  test("الحكمُ المعطَّل لا يدخل التوجيه، والعاملُ يدخل بشَرطته", () => {
    const p = buildSystemPrompt(persona, empty);
    expect(p).toContain("- لا تخترع رقمًا.");
    expect(p).not.toContain("حكمٌ معطَّلٌ لا يدخل التوجيه.");
  });

  test("العناوينُ الخمسةُ بترتيبها، والمعرفةُ آخرًا", () => {
    const p = buildSystemPrompt(persona, empty);
    const order = ["## من أنت", "## نبرتك", "## حدودك", "## ما لا تفعله أبدًا", "## معرفتك"];
    const at = order.map((h) => p.indexOf(h));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  test("جملةُ «لا أعرف» تدخل بندَ المعرفة، والمحظوراتُ شُرَطٌ لا أرقام", () => {
    const p = buildSystemPrompt(persona, empty);
    expect(p).toContain(`وما ليس فيها قل: ${persona.unknownAnswer}`);
    expect(p).toContain("- لا تعِد أحدًا بقبول عضويّة.");
    expect(p).not.toMatch(/^\s*\d+[.)]/m);
  });

  test("سطرُ التعريف بصاحب الجلسة يقع بعد الحدود وقبل المعرفة", () => {
    const p = buildSystemPrompt(persona, empty, "صاحبُ الجلسة: محمّد، عضوٌ في النادي.");
    expect(p.indexOf("صاحبُ الجلسة")).toBeGreaterThan(p.indexOf("## ما لا تفعله أبدًا"));
    expect(p.indexOf("صاحبُ الجلسة")).toBeLessThan(p.indexOf("## معرفتك"));
  });

  test("المعرفةُ تُحشى كلُّها: أجوبةُ faq ثمّ الوقائع", () => {
    const p = buildSystemPrompt(persona, {
      faq: [{ question: "كيف أنضمّ؟", answer: "بابُ الانضمام مغلقٌ الآن." }],
      facts: [{ slug: "where-we-are", title: "أين أديب", body: "في جامعة الملك فيصل." }],
    });
    expect(p.indexOf("كيف أنضمّ؟")).toBeLessThan(p.indexOf("أين أديب"));
    expect(p).toContain("(where-we-are)");
  });

  /* الحارسُ يبيح للجواب كلَّ عددٍ في التوجيه — وهذا امتحانُ العلّة التي منعت الأرقام
     في جدول الطبع: رقمٌ يُكتب هناك يخرج ههنا مأذونًا. والعددُ يُطبَّع لاتينيًّا في الحارس،
     فالمكتوبُ «٩٩» يُسأل عنه بـ«99». */
  test("رقمٌ في الطبع يصير رقمًا مأذونًا في الجواب", () => {
    expect(allowedNumbers(buildSystemPrompt(persona, empty), "").has("99")).toBe(false);
    const dirty = allowedNumbers(
      buildSystemPrompt({ ...persona, tone: "جوابك ٩٩ كلمة." }, empty),
      "",
    );
    expect(dirty.has("99")).toBe(true);
  });
});

describe("المعروضُ من الأسئلة", () => {
  test("يُقصّ على العدد الذي اختاره المالك", () => {
    expect(shownQuestionsOf(persona)).toEqual(["ما نادي أديب؟", "كيف أنضمّ إليكم؟"]);
  });

  test("صفرٌ يعني شاشةً بلا أسئلة، والزائدُ لا يخترع سؤالًا", () => {
    expect(shownQuestionsOf({ ...persona, shownQuestions: 0 })).toEqual([]);
    expect(shownQuestionsOf({ ...persona, shownQuestions: 9 })).toHaveLength(3);
  });
});
