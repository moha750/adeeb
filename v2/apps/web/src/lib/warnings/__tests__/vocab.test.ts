import { describe, expect, it } from "vitest";
import {
  CHARTER, WARNING_CATEGORIES, categoryLabel, countWord, dots,
  observationSentence, ordinalBare, ordinalWord, remainingText, toneOf,
} from "@/lib/warnings/vocab";

/**
 * مفرداتُ الإنذارات — **والحدُّ ثلاثةٌ يسحب العضويّة آليًّا** (حكمُ اللائحة لا سلطةُ شخص).
 * فكلُّ دالّةٍ ههنا تُقرأ في خطابٍ يُطبَع وفي رسالةٍ تُرسَل وفي صفٍّ يُلوَّن، والصرفُ العربيّ
 * فيها جزءٌ من الحكم: «بقي إنذاران» لا «بقي 2 إنذار».
 */

const LIMIT = 3;

describe("التصنيفات", () => {
  it("لكلّ تصنيفٍ رمزٌ لاتينيٌّ وتسميةٌ عربيّة، ولا تكرار", () => {
    const values = WARNING_CATEGORIES.map((c) => c.value);
    expect(values.length).toBe(new Set(values).size);
    for (const c of WARNING_CATEGORIES) {
      expect(c.value, c.value).toMatch(/^[a-z_]+$/);
      expect(c.label.trim(), c.value).not.toBe("");
    }
  });

  it("categoryLabel يقول التسمية", () => {
    expect(categoryLabel("absence")).toBe("غياب");
    expect(categoryLabel("policy")).toBe("مخالفة الدستور");
  });

  // المجهولُ يُقال كما هو لا يُخفى: خبرٌ خيرٌ من فراغ في صفّ سجلّ
  it("categoryLabel يقول المجهولَ خامًا ولا يُخفيه", () => {
    expect(categoryLabel("unheard_of")).toBe("unheard_of");
    expect(categoryLabel("")).toBe("");
  });
});

describe("observationSentence", () => {
  it("لكلّ تصنيفٍ جملتُه بلسان الخطاب", () => {
    for (const c of WARNING_CATEGORIES) {
      expect(observationSentence(c.value).trim(), c.value).not.toBe("");
    }
  });

  it("جملتان لتصنيفين مختلفين لا تتّحدان (خلا المجهول)", () => {
    const said = WARNING_CATEGORIES.map((c) => observationSentence(c.value));
    expect(new Set(said).size).toBe(WARNING_CATEGORIES.length);
  });

  // المجهولُ يرتدّ إلى جملة «أخرى» فلا يخرج خطابٌ بمتنٍ ناقص
  it("المجهولُ يرتدّ إلى جملة «أخرى»", () => {
    expect(observationSentence("boom")).toBe(observationSentence("other"));
    expect(observationSentence("")).toBe(observationSentence("other"));
  });

  /**
   * **ولا تُذكَر اللجنة في النصّ** (قرار المالك ٢٠٢٦-٠٨-٠٢): الخطابُ من إدارة الموارد إلى
   * العضو، ولجنتُه معروفةٌ له ومكتوبةٌ في السجلّ. والغيابُ وحده قُيِّد بـ«ضمن مهامك» لأنّ
   * الغياب عن شيءٍ يحتاج متعلَّقًا.
   */
  it("لا ذكرَ للّجنة في جملةٍ من الجمل", () => {
    for (const c of WARNING_CATEGORIES) {
      expect(observationSentence(c.value), c.value).not.toContain("لجنة");
    }
  });

  it("الغيابُ وحده يحمل متعلَّقَه «ضمن مهامك»", () => {
    expect(observationSentence("absence")).toContain("ضمن مهامك");
    expect(observationSentence("lateness")).not.toContain("ضمن مهامك");
  });

  it("اسمُ اللائحة عندنا دستورُ أدِيب، ومن ذكرها ذكرَه", () => {
    expect(CHARTER).toBe("دستور أدِيب");
    expect(observationSentence("policy")).toContain("دستور أدِيب");
  });
});

describe("ordinalWord و ordinalBare", () => {
  // لا تُكتب الأرقام بعد الثالث لأنّ الحدَّ ثلاثة، وما جاوزه يُقال رقمًا لا اجتهادًا في الصرف
  it("الثلاثةُ الأولى كلماتٌ معرَّفة", () => {
    expect(ordinalWord(1)).toBe("الأوّل");
    expect(ordinalWord(2)).toBe("الثاني");
    expect(ordinalWord(3)).toBe("الثالث");
  });

  it("وما جاوز الحدَّ يُقال رقمًا", () => {
    expect(ordinalWord(4)).toBe("رقم 4");
    expect(ordinalWord(9)).toBe("رقم 9");
  });

  // النكرةُ لعنوان الخطاب، ولا تُشتقّ بقصّ «ال» من المعرّفة (ولذلك «ثانٍ» لا «الثاني» منزوعةً)
  it("النكرةُ ليست قصًّا من المعرّفة", () => {
    expect(ordinalBare(1)).toBe("أوّل");
    expect(ordinalBare(2)).toBe("ثانٍ");
    expect(ordinalBare(3)).toBe("ثالث");
    expect(ordinalBare(4)).toBe("رقم 4");
  });

  it("لكلّ رتبةٍ لفظان مختلفان: معرّفةٌ ونكرة", () => {
    for (const n of [1, 2, 3]) expect(ordinalWord(n)).not.toBe(ordinalBare(n));
  });
});

describe("remainingText", () => {
  // بتمييزٍ عربيٍّ صحيح، ومصدرُه الحدُّ لا رقمٌ محفور
  it("المفردُ والمثنّى والجمعُ بصيغهم", () => {
    expect(remainingText(2, LIMIT)).toBe("بقي إنذارٌ واحد");
    expect(remainingText(1, LIMIT)).toBe("بقي إنذاران");
    expect(remainingText(0, LIMIT)).toBe("بقي 3 إنذارات");
  });

  it("بلوغُ الحدّ يُقال بلوغًا لا صفرًا", () => {
    expect(remainingText(LIMIT, LIMIT)).toBe("بلغ الحدّ");
  });

  // ومن جاوز الحدَّ (بيانٌ قديمٌ أو سباقُ كتابة) لا يُقال له «بقي -1»
  it("ما جاوز الحدَّ يُقال بلوغًا لا رقمًا سالبًا", () => {
    expect(remainingText(LIMIT + 1, LIMIT)).toBe("بلغ الحدّ");
    expect(remainingText(99, LIMIT)).toBe("بلغ الحدّ");
  });

  it("يتبع الحدَّ لو رُفع يومًا", () => {
    expect(remainingText(0, 5)).toBe("بقي 5 إنذارات");
    expect(remainingText(3, 5)).toBe("بقي إنذاران");
    expect(remainingText(5, 5)).toBe("بلغ الحدّ");
  });
});

describe("dots", () => {
  // حروفٌ لا أنماط: تُقرأ في الجدول وفي رأس الطيّ سواء
  it("النقاطُ بعددِ الحدّ دائمًا", () => {
    for (let n = 0; n <= LIMIT + 2; n++) expect(dots(n, LIMIT).length, `${n}`).toBe(LIMIT);
  });

  it("تُملأ بالسواري", () => {
    expect(dots(0, LIMIT)).toBe("○○○");
    expect(dots(1, LIMIT)).toBe("●○○");
    expect(dots(2, LIMIT)).toBe("●●○");
    expect(dots(3, LIMIT)).toBe("●●●");
  });

  // ولا تفيض بما جاوز الحدَّ فتكسر عرضَ الخانة
  it("ما جاوز الحدَّ لا يفيض", () => {
    expect(dots(7, LIMIT)).toBe("●●●");
  });
});

describe("toneOf", () => {
  // آخرُ إنذارٍ قبل السحب أحمر — لا رقمًا محفورًا بل قربًا من الحدّ
  it("ما دون الحدّ تحذيرٌ وما بلغه خطر", () => {
    expect(toneOf(1, LIMIT)).toBe("warning");
    expect(toneOf(2, LIMIT)).toBe("warning");
    expect(toneOf(3, LIMIT)).toBe("danger");
    expect(toneOf(4, LIMIT)).toBe("danger");
  });

  it("يتبع الحدَّ لو رُفع", () => {
    expect(toneOf(3, 5)).toBe("warning");
    expect(toneOf(5, 5)).toBe("danger");
  });
});

describe("countWord", () => {
  // الحدُّ كلمةً لا رقمًا في نصّ الخطاب: «ثلاثة إنذارات» لا «3 إنذارات»
  it("العشرةُ الأولى كلمات", () => {
    expect(countWord(0)).toBe("صفر");
    expect(countWord(3)).toBe("ثلاثة");
    expect(countWord(10)).toBe("عشرة");
  });

  it("وما جاوزها رقمٌ خام", () => {
    expect(countWord(11)).toBe("11");
    expect(countWord(42)).toBe("42");
  });
});
