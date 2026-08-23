/**
 * مِعيارُ نصّ الإنذار — و**هو الحارسُ على معاملَي القالب** `{{1}}` و`{{4}}`.
 *
 * قالبُ واتساب المعتمَد (٢٠٢٦-٠٨-٢١) يحمل أربعة معاملات، اثنان منها من هذا الملفّ:
 * النداءُ (`salutation`) وما بقي قبل الحدّ (`leftPhrase`). وتُبنى في الحافة من توأمٍ
 * مكتوبٍ لـDeno (`supabase/functions/_shared/fmt.ts`) لا يُستورَد لأنّ بينهما حدَّ
 * زمنَي تشغيل. فما يُقاس ههنا هو ما يجب أن يُخرجه التوأمُ حرفًا بحرف.
 */
import { describe, expect, it } from "vitest";
import { leftPhrase, salutation } from "../message";

describe("salutation : معاملُ القالب {{1}}", () => {
  it("يصل المسمّى بالاسم بمسافةٍ لا فاصل", () => {
    expect(salutation({ name: "أحمد محمد", gender: "male", role: "عضو", committee: "لجنة التأليف" }))
      .toBe("عضو لجنة التأليف أحمد محمد");
  });

  it("يؤنّث الرتبةَ وحدها : أوّلَ كلمةٍ في المسمّى", () => {
    expect(salutation({ name: "زهراء العريفي", gender: "female", role: "قائد", committee: "لجنة التصميم" }))
      .toBe("قائدة لجنة التصميم زهراء العريفي");
    expect(salutation({ name: "نورة", gender: "female", role: "عضو", committee: "لجنة التأليف" }))
      .toBe("عضوة لجنة التأليف نورة");
    // رتبةٌ لا تأنيثَ لها في الجدول تبقى كما هي، ولا تُخترع لها صيغة
    expect(salutation({ name: "سارة", gender: "female", role: "أمين", committee: "لجنة المالية" }))
      .toBe("أمين لجنة المالية سارة");
  });

  it("بلا منصبٍ ينسبه إلى النادي لا ينادي نداءً عامًّا", () => {
    expect(salutation({ name: "أحمد محمد", gender: "male", role: null, committee: null }))
      .toBe("الأدِيب أحمد محمد");
    expect(salutation({ name: "نورة", gender: "female", role: null, committee: null }))
      .toBe("الأدِيبة نورة");
  });

  it("المجهولُ الجنسِ يأخذ صيغةَ المذكّر، ولا يُخترع له جنس", () => {
    expect(salutation({ name: "أحمد", gender: null, role: "عضو", committee: "لجنة التأليف" }))
      .toBe("عضو لجنة التأليف أحمد");
    expect(salutation({ name: "أحمد", gender: null, role: null, committee: null }))
      .toBe("الأدِيب أحمد");
  });

  it("رتبةٌ بلا وحدةٍ تُقال وحدها بلا مسافةٍ زائدة", () => {
    expect(salutation({ name: "أحمد", gender: "male", role: "رئيس النادي", committee: null }))
      .toBe("رئيس النادي أحمد");
  });
});

describe("leftPhrase : معاملُ القالب {{4}}", () => {
  const LIMIT = 3;

  it("يُميّز العربيّةَ تمييزًا صحيحًا", () => {
    expect(leftPhrase({ activeCount: 1, limit: LIMIT })).toBe("إنذاران");
    expect(leftPhrase({ activeCount: 2, limit: LIMIT })).toBe("إنذارٌ واحد");
    expect(leftPhrase({ activeCount: 0, limit: LIMIT })).toBe("3 إنذارات");
  });

  /**
   * **ولهذا قالبٌ ثانٍ**: قالبُ العامّة يقول «وقد بقي لك {{4}} قبل بلوغ الحدّ»، وهي
   * جملةٌ كاذبةٌ على من بلغ الحدّ. فالأخيرُ يخرج بقالبه الخاصّ بثلاثة معاملاتٍ لا أربعة،
   * ولا تدخله هذه الصيغةُ أصلًا. (وغيابُ سرِّ ذلك القالب يردّ `FINAL_WARNING_NO_TEMPLATE`.)
   */
  it("يقول صفرًا عند بلوغ الحدّ، ولذلك لا يدخل قالبَ الإنذار الأخير", () => {
    expect(leftPhrase({ activeCount: LIMIT, limit: LIMIT })).toBe("0 إنذارات");
    expect(leftPhrase({ activeCount: 99, limit: LIMIT })).toBe("0 إنذارات");
  });

  it("يتبع الحدَّ أيًّا كان، فلا رقمَ محفور", () => {
    expect(leftPhrase({ activeCount: 3, limit: 5 })).toBe("إنذاران");
    expect(leftPhrase({ activeCount: 4, limit: 5 })).toBe("إنذارٌ واحد");
  });
});
