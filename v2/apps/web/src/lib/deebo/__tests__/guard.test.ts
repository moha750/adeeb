import { describe, expect, it } from "vitest";
import {
  FALLBACK_SENTENCE,
  allowedNumbers,
  createSentenceGuard,
  extractNumbers,
  inspect,
  normalizeDigits,
} from "../guard";

/**
 * حارسُ أرقام ديبو.
 *
 * هذا الملفّ سببُ وجود الاختبار لا العكس: الحارسُ كُتب ثمّ أُعدم في كنس ط٤ لأنّه
 * لم يُستورَد من أحد. فليبقَ مبرهنًا لا مظنونًا حتى يصله بابُ المحادثة.
 *
 * ووظيفتُه واحدة: كلُّ عددٍ في جواب ديبو يجب أن يكون قد ورد في معرفته أو في سؤال
 * الزائر. ما عداه يُحجَب قبل أن يصل القارئ.
 */

describe("تطبيع الأرقام", () => {
  it("يحوّل الهنديّة والفارسيّة إلى لاتينيّة", () => {
    expect(normalizeDigits("عندنا ٢٥٠ عضوًا")).toBe("عندنا 250 عضوًا");
    expect(normalizeDigits("۱۹۹۹")).toBe("1999");
  });

  it("يوحّد الفاصلة العشريّة العربيّة وفاصلة الألوف", () => {
    expect(normalizeDigits("٣٫٥")).toBe("3.5");
    expect(normalizeDigits("1,200")).toBe("1200");
  });
});

describe("استخراج الأعداد", () => {
  it("يسقط الأصفار البادئة فلا يفترق 07 عن 7", () => {
    expect(extractNumbers("رقم 07")).toEqual(new Set(["7"]));
  });

  it("لا يعدّ ترقيم القوائم عددًا مُدّعًى", () => {
    expect(extractNumbers("١. الأوّل\n٢. الثاني")).toEqual(new Set());
  });

  it("يمسك الكسر العشريّ كوحدة", () => {
    expect(extractNumbers("النسبة 3.5 بالمئة")).toEqual(new Set(["3.5"]));
  });
});

describe("مصادر الأعداد المسموحة", () => {
  it("يقبل ما ورد في المعرفة", () => {
    const allowed = allowedNumbers("تأسّس النادي سنة 2019", "متى تأسّستم؟");
    expect(allowed.has("2019")).toBe(true);
  });

  it("يقبل ما كتبه الزائر نفسه، فإعادتُه ليست ادّعاءً", () => {
    const allowed = allowedNumbers("لا رقم هنا", "أنا في المستوى 7، أقدر أنضمّ؟");
    expect(allowed.has("7")).toBe(true);
  });
});

describe("الحكم على الجملة", () => {
  const allowed = allowedNumbers("تأسّس سنة 2019", "");

  it("يُمرّر جملةً بلا أعداد", () => {
    expect(inspect("أهلًا بك في أديب.", allowed)).toEqual({ ok: true });
  });

  it("يُمرّر عددًا مصدرُه المعرفة", () => {
    expect(inspect("تأسّس النادي سنة 2019.", allowed)).toEqual({ ok: true });
  });

  it("يحجب عددًا لا مصدر له", () => {
    expect(inspect("في النادي 250 عضوًا.", allowed)).toEqual({
      ok: false,
      reason: "unsourced_number",
      value: "250",
    });
  });
});

describe("مِبضع البثّ", () => {
  it("يستبدل الجملة المخترِعة ويُبقي أخواتها", () => {
    const guard = createSentenceGuard(allowedNumbers("تأسّس سنة 2019", ""));
    let out = guard.push("أهلًا بك. في النادي 250 عضوًا. وتأسّس سنة 2019.");
    out += guard.end();

    expect(out).toContain("أهلًا بك.");
    expect(out).toContain("تأسّس سنة 2019.");
    expect(out).not.toContain("250");
    expect(out).toContain(FALLBACK_SENTENCE);
    expect(guard.didBlock).toBe(true);
  });

  it("لا يكسر الكسر العشريّ نصفين عند حدّ الجملة", () => {
    const guard = createSentenceGuard(allowedNumbers("النسبة 3.5", ""));
    let out = guard.push("النسبة 3.5 بالمئة.");
    out += guard.end();
    expect(out).toBe("النسبة 3.5 بالمئة.");
    expect(guard.didBlock).toBe(false);
  });

  it("يجمع القطع المتناثرة فلا يحكم على نصف جملة", () => {
    const guard = createSentenceGuard(allowedNumbers("", ""));
    // القطعة الأولى وحدها لا تكوّن جملةً مكتملة، فلا يُدفع منها شيء بعد
    expect(guard.push("في النادي ")).toBe("");
    let out = guard.push("400 عضوًا.");
    out += guard.end();
    expect(out).not.toContain("400");
    expect(guard.didBlock).toBe(true);
  });

  it("يمرّ نظيفًا حين لا عدد أصلًا", () => {
    const guard = createSentenceGuard(allowedNumbers("", ""));
    let out = guard.push("نادي أديب منارةٌ أدبيّة. ");
    out += guard.push("أبوابنا مفتوحة.");
    out += guard.end();
    expect(out).toBe("نادي أديب منارةٌ أدبيّة. أبوابنا مفتوحة.");
    expect(guard.didBlock).toBe(false);
  });
});
