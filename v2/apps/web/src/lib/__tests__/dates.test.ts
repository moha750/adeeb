import { afterEach, describe, expect, it, vi } from "vitest";
import { CLUB_TZ, fmtDate, fmtDayMonth, fmtMonthYear, fmtStamp, fromClubInput, toClubInput } from "@/lib/dates";
import { fmtDateAndTime, fmtDateOnly, fmtSince } from "@/lib/dates";

/**
 * ساعةُ النادي — **الرياض لا ساعةُ الجهاز**. وهذا الملفُّ هو الجواب المكتوب على العطب الذي
 * يصفه رأسُه: خادمُ النشر يعمل بـUTC، فلو تُرك التنسيقُ للبيئة لظهر الموعدُ ناقصًا ثلاثَ
 * ساعاتٍ على الشبكة وصحيحًا على جهاز المطوّر.
 *
 * وساعةُ المِعيار مثبَّتةٌ على UTC (`vitest.config.ts`)، فما يقيسه هذا الملفُّ هو **الإزاحة
 * نفسُها** لا مصادفةَ جهازٍ سعوديّ. وما عدا `fmtSince` لا يقرأ `Date.now()` فنتائجُه ثابتةٌ
 * أبدًا؛ وهي وحدَها تُقاس بساعةٍ مزيَّفةٍ تُنصَب وتُرفَع في قسمها.
 */

const RIYADH_OFFSET_H = 3;

describe("CLUB_TZ", () => {
  it("منطقةُ النادي مثبَّتةٌ نصًّا لا مأخوذةٌ من البيئة", () => {
    expect(CLUB_TZ).toBe("Asia/Riyadh");
  });
});

describe("fmtDate", () => {
  it("يوم وشهرٌ عربيٌّ وسنة", () => {
    expect(fmtDate("2026-08-16T12:00:00Z")).toBe("16 أغسطس 2026");
    expect(fmtDate("2026-01-01T09:00:00Z")).toBe("1 يناير 2026");
    expect(fmtDate("2026-12-31T06:00:00Z")).toBe("31 ديسمبر 2026");
  });

  /**
   * **العطبُ الذي بُني الملفُّ لأجله**: لحظةٌ في آخر يومٍ بتوقيت غرينتش هي **اليومُ التالي**
   * في الرياض. فلو قرأ الخادمُ بـUTC لأظهر «16 أغسطس» حيث يقول النادي «17 أغسطس».
   */
  it("اللحظةُ بعد الحادية والعشرين UTC يومٌ تالٍ في الرياض", () => {
    expect(fmtDate("2026-08-16T21:30:00Z")).toBe("17 أغسطس 2026");
    expect(fmtDate("2026-08-16T20:59:00Z")).toBe("16 أغسطس 2026");
  });

  it("ينتقل بالشهر والسنة معًا عند حدّ رأس السنة", () => {
    expect(fmtDate("2025-12-31T21:00:00Z")).toBe("1 يناير 2026");
  });

  it("الفارغُ والفاسدُ نصٌّ فارغٌ لا رميٌ ولا Invalid Date", () => {
    expect(fmtDate(null)).toBe("");
    expect(fmtDate("")).toBe("");
    expect(fmtDate("ليس تاريخًا")).toBe("");
  });
});

describe("fmtDayMonth", () => {
  it("يومٌ وشهرٌ بلا سنة", () => {
    expect(fmtDayMonth("2026-08-16T12:00:00Z")).toBe("16 أغسطس");
  });

  it("يتبع ساعةَ الرياض كأخواته", () => {
    expect(fmtDayMonth("2026-08-16T21:30:00Z")).toBe("17 أغسطس");
  });

  it("الفارغُ فارغ", () => {
    expect(fmtDayMonth(null)).toBe("");
    expect(fmtDayMonth("لا شيء")).toBe("");
  });
});

describe("fmtMonthYear", () => {
  // اسمُ الدورة الانتخابيّة: اليومُ لا يميّز دورةً عن دورة
  it("شهرٌ وسنةٌ بلا يوم", () => {
    expect(fmtMonthYear("2026-08-16T12:00:00Z")).toBe("أغسطس 2026");
    expect(fmtMonthYear("2026-08-01T00:00:00Z")).toBe("أغسطس 2026");
  });

  it("آخرُ ليلةٍ في الشهر بـUTC قد تكون الشهرَ التالي عندنا", () => {
    expect(fmtMonthYear("2026-07-31T21:30:00Z")).toBe("أغسطس 2026");
  });

  it("الفارغُ فارغ", () => {
    expect(fmtMonthYear(null)).toBe("");
  });
});

describe("fmtStamp", () => {
  /**
   * **اثنتا عشرةَ بصباحٍ ومساء** (قرار المالك): «11:59 م» لا «23:59». والحسابُ بيدنا لا
   * بـ`hour12` من `Intl` — تلك تُخرج «PM» أو «م» بحسب لغة التنسيق، والصيغةُ يجب أن تكون
   * واحدةً لا تتبدّل.
   */
  it("ساعةُ الظهيرة ثنتا عشرةَ مساءً لا صفرًا", () => {
    expect(fmtStamp("2026-08-16T09:00:00Z")).toBe("16 أغسطس 2026 الساعة 12:00 م");
  });

  it("ساعةُ منتصف الليل ثنتا عشرةَ صباحًا لا صفرًا", () => {
    expect(fmtStamp("2026-08-16T21:00:00Z")).toBe("17 أغسطس 2026 الساعة 12:00 ص");
  });

  it("ما قبل الظهر صباحٌ وما بعده مساء", () => {
    expect(fmtStamp("2026-08-16T05:30:00Z")).toBe("16 أغسطس 2026 الساعة 8:30 ص");
    expect(fmtStamp("2026-08-16T20:59:00Z")).toBe("16 أغسطس 2026 الساعة 11:59 م");
  });

  // الدقيقةُ بخانتين والساعةُ بلا صفرٍ سابق: «8:05 ص» لا «08:05 ص»
  it("الدقيقةُ مصفوفةٌ بخانتين والساعةُ بلا حشو", () => {
    expect(fmtStamp("2026-08-16T05:05:00Z")).toBe("16 أغسطس 2026 الساعة 8:05 ص");
  });

  it("الفارغُ فارغ", () => {
    expect(fmtStamp(null)).toBe("");
    expect(fmtStamp("لا شيء")).toBe("");
  });
});

describe("toClubInput و fromClubInput", () => {
  // ما يكتبه المشرف في `datetime-local` ساعةُ النادي لا ساعةُ جهازه
  it("ISO إلى قيمة الحقل بساعة الرياض", () => {
    expect(toClubInput("2026-08-16T21:30:00Z")).toBe("2026-08-17T00:30");
    expect(toClubInput("2026-08-16T09:00:00Z")).toBe("2026-08-16T12:00");
  });

  it("قيمةُ الحقل إلى ISO تطرح إزاحةَ الرياض", () => {
    const iso = fromClubInput("2026-08-17T00:30");
    expect(iso).toBe("2026-08-16T21:30:00.000Z");
  });

  it("الإزاحةُ ثلاثُ ساعاتٍ تامّة (الرياض بلا توقيتٍ صيفيّ)", () => {
    const iso = fromClubInput("2026-08-16T12:00")!;
    const utcHour = new Date(iso).getUTCHours();
    expect(utcHour).toBe(12 - RIYADH_OFFSET_H);
  });

  it("والإزاحةُ نفسُها في الشتاء كما في الصيف", () => {
    const winter = fromClubInput("2026-01-16T12:00")!;
    expect(new Date(winter).getUTCHours()).toBe(12 - RIYADH_OFFSET_H);
  });

  // ذهابٌ وإيابٌ لا يفقد دقيقةً — وهذا ما يمنع «موعدك في الماضي» على موعدٍ صحيح
  it("الذهابُ والإياب يعيدان القيمة نفسَها", () => {
    for (const v of ["2026-08-16T00:00", "2026-08-16T23:59", "2026-01-01T12:34", "2026-12-31T23:59"]) {
      expect(toClubInput(fromClubInput(v))).toBe(v);
    }
  });

  it("fromClubInput يردّ ما ليس على صيغة الحقل", () => {
    expect(fromClubInput("")).toBeNull();
    expect(fromClubInput("2026-08-16")).toBeNull();
    expect(fromClubInput("16/08/2026 12:00")).toBeNull();
    expect(fromClubInput("لا شيء")).toBeNull();
  });

  it("toClubInput يردّ نصًّا فارغًا للفارغ والفاسد", () => {
    expect(toClubInput(null)).toBe("");
    expect(toClubInput("لا شيء")).toBe("");
  });

  it("يقبل الثواني في مُدخَل الحقل ويطويها", () => {
    expect(fromClubInput("2026-08-16T12:00:45")).toBe("2026-08-16T09:00:00.000Z");
  });
});

/**
 * **الوافدان من `lib/date` المُعدَم** (٢٠٢٦-٠٨-١٦): كان للتاريخ مِلفّان، أحدُهما يقرأ
 * ساعةَ الجهاز فيكذب على الخادم. فأُعدم وانتقلت دالّتاه إلى هذا المصدر الواحد،
 * وههنا يُثبَّت أنّهما قِيسَتا بعد النقل لا قبله.
 */
describe("الوافدتان: fmtDateOnly و fmtDateAndTime", () => {
  /**
   * عمودُ `date` الخالص **لا يمرّ بـ`Date`** عمدًا: `new Date("2026-01-16")` يُفسَّر منتصفَ
   * ليلٍ بغرينتش، ثمّ تُقرأ أجزاؤه بمنطقةٍ أخرى فينقص التاريخ يومًا. والشطرُ النصّيّ يُنجيه:
   * يومٌ بلا وقتٍ لا منطقةَ له أصلًا.
   */
  it("fmtDateOnly يشطر النصّ فلا يزحزحه توقيتٌ ولا يُنقصه يومًا", () => {
    expect(fmtDateOnly("2026-01-16")).toBe("16 يناير 2026");
    expect(fmtDateOnly("2026-12-01")).toBe("1 ديسمبر 2026");
    expect(fmtDateOnly("2026-01-01")).toBe("1 يناير 2026");
  });

  /**
   * وهي **لعمود `date` وحدَه**: الطابعُ الكامل يعود منها فارغًا لا مقصوصًا، إذ يصير الشطرُ
   * الثالث `16T21:30:00Z` فيُقرأ `NaN`. وهذا فشلٌ ظاهرٌ خيرٌ من يومٍ مقصوصٍ يبدو صحيحًا:
   * من مرّر طابعًا رأى الخانةَ خاليةً فعرف أنّه أخطأ الدالّة. فليست ههنا بديلًا عن `fmtDate`.
   */
  it("fmtDateOnly لعمود التاريخ وحده: الطابعُ الكامل يعود فارغًا", () => {
    expect(fmtDateOnly("2026-08-16T21:30:00Z")).toBe("");
    expect(fmtDate("2026-08-16T21:30:00Z")).toBe("17 أغسطس 2026");
  });

  it("fmtDateOnly يردّ الناقصَ والفارغ", () => {
    expect(fmtDateOnly(null)).toBe("");
    expect(fmtDateOnly(undefined)).toBe("");
    expect(fmtDateOnly("")).toBe("");
    expect(fmtDateOnly("2026-01")).toBe("");
    expect(fmtDateOnly("لا شيء")).toBe("");
  });

  // بأربعٍ وعشرين لا باثنتي عشرة — وهي غيرُ `fmtStamp` عمدًا: تلك لعرض العضو وهذه لسطرٍ إداريّ
  it("fmtDateAndTime ساعةٌ بأربعٍ وعشرين مصفوفةٌ بخانتين", () => {
    expect(fmtDateAndTime("2026-08-16T12:00:00Z")).toBe("16 أغسطس 2026، 15:00");
    expect(fmtDateAndTime("2026-08-16T05:05:00Z")).toBe("16 أغسطس 2026، 08:05");
  });

  // وهي بساعة الرياض كأخواتها بعد النقل — وكانت قبله تقرأ ساعةَ الجهاز
  it("fmtDateAndTime يتبع ساعةَ النادي لا ساعةَ المُشغِّل", () => {
    expect(fmtDateAndTime("2026-08-16T21:30:00Z")).toBe("17 أغسطس 2026، 00:30");
  });

  it("fmtDateAndTime يردّ الفارغ والفاسد", () => {
    expect(fmtDateAndTime(null)).toBe("");
    expect(fmtDateAndTime("لا شيء")).toBe("");
  });

  // والملفّان صارا واحدًا: من أعاد `lib/date` أعاد معه احتمالَ يومين لتاريخٍ واحد
  it("لا `fmtStamp` ولا `fmtDateAndTime` يفترقان عن يوم `fmtDate`", () => {
    const iso = "2026-08-16T21:30:00Z";
    expect(fmtStamp(iso).startsWith(fmtDate(iso))).toBe(true);
    expect(fmtDateAndTime(iso).startsWith(fmtDate(iso))).toBe(true);
  });
});

/**
 * «منذ متى» — الوحيدةُ ههنا التي تقرأ اللحظةَ الحاضرة، فتُقاس بساعةٍ **مزيَّفة**: تُنصَب
 * عند لحظةٍ معلومة، فيصير الفارقُ حسابًا لا مصادفةً. ولولا ذلك لَنجح المِعيارُ اليومَ
 * وسقط غدًا (كلُّ تاريخٍ ثابتٍ يشيخ إلى ما بعد الأسبوع فيتحوّل جوابُه إلى تاريخ).
 */
describe("fmtSince", () => {
  const NOW = "2026-08-18T12:00:00Z";
  const at = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    return fmtSince(iso);
  };
  afterEach(() => vi.useRealTimers());

  it("ما دون الدقيقة «الآن»", () => {
    expect(at("2026-08-18T12:00:00Z")).toBe("الآن");
    expect(at("2026-08-18T11:59:20Z")).toBe("الآن");
  });

  it("الدقائقُ بمفردها ومثنّاها وجمعِ قلّتها", () => {
    expect(at("2026-08-18T11:59:00Z")).toBe("منذ دقيقة");
    expect(at("2026-08-18T11:58:00Z")).toBe("منذ دقيقتين");
    expect(at("2026-08-18T11:56:00Z")).toBe("منذ 4 دقائق");
    expect(at("2026-08-18T11:35:00Z")).toBe("منذ 25 دقيقة");
  });

  it("الساعاتُ والأيّام تُقرأ بأكبرِ وحدةٍ تصدق", () => {
    expect(at("2026-08-18T11:00:00Z")).toBe("منذ ساعة");
    expect(at("2026-08-18T10:00:00Z")).toBe("منذ ساعتين");
    expect(at("2026-08-18T07:00:00Z")).toBe("منذ 5 ساعات");
    expect(at("2026-08-17T12:00:00Z")).toBe("منذ يوم");
    expect(at("2026-08-16T12:00:00Z")).toBe("منذ يومين");
    expect(at("2026-08-15T12:00:00Z")).toBe("منذ 3 أيّام");
  });

  it("ما جاوز الأسبوعَ يستسلم للتاريخ الكامل — لا «منذ 41 يومًا»", () => {
    expect(at("2026-08-11T11:00:00Z")).toBe(fmtDate("2026-08-11T11:00:00Z"));
    expect(at("2026-07-08T09:00:00Z")).toBe("8 يوليو 2026");
  });

  it("المستقبلُ لا يُقال «منذ» — وقعت الساعتان في غير ترتيبهما فالجوابُ «الآن»", () => {
    expect(at("2026-08-18T12:05:00Z")).toBe("الآن");
  });

  it("يردّ الفارغ والفاسد", () => {
    expect(at("")).toBe("");
    expect(fmtSince(null)).toBe("");
    expect(fmtSince("لا شيء")).toBe("");
  });
});
