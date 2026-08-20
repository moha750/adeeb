import { describe, expect, it } from "vitest";
import {
  DEGREES, DEGREE_LABEL, DEGREE_VALUES, NATIONAL_ID_LEN, NATIONAL_ID_RE,
  PHONE_RE, RECORD_NO_MAX, RECORD_NO_MIN, RECORD_NO_RE, SOCIAL_HANDLE_RE, SOCIAL_KEYS,
  TERMINATION_REASONS, formatDegree, hasAcademicFields, isPresetReason,
  socialColumn, socialHandle, socialLabel, socialLabelOf, socialUrl,
} from "@/lib/membershipFields";
import { PHONE_RE as PHONE_RE_SOURCE } from "@/lib/fieldFormats";

/** حقولُ العضويّة — وأثقلُ ما فيها `socialHandle`: أربعُ طبقاتٍ تقرأ حكمَه (النموذجُ والفعلُ
 * الخادميّ وقيدُ `member_details_social_handle_check` وبانـي الرابط). وقبله كانت الأعمدةُ
 * تخزّن ثلاث صيغٍ معًا، فكان كلُّ قارئٍ يرقّع وحده. */

describe("الدرجة الأكاديميّة", () => {
  it("القيمُ رموزٌ لاتينيّة والتسمياتُ عربيّة (العمودُ يحفظ الرمز لا التسمية)", () => {
    for (const d of DEGREES) {
      expect(d.value, d.value).toMatch(/^[a-z_]+$/);
      expect(d.label.trim(), d.value).not.toBe("");
    }
  });

  it("لا قيمةَ مكرّرة", () => {
    expect(DEGREE_VALUES.length).toBe(new Set(DEGREE_VALUES).size);
  });

  /**
   * **القاعدةُ ثنائيّةٌ لا ثلاثيّة**: من له درجةٌ جامعيّة تلزمه الكلّيّةُ والتخصّصُ والرقم،
   * ومن لا (ثانويّةٌ عامّة · موظّف) يُمنع منها. لا منزلةَ بين المنزلتين، والقيدُ يرفض
   * الفارغَ في الأولى والممتلئَ في الثانية.
   */
  it("الجامعيّةُ تصحبها الحقولُ الثلاثة وغيرُها تُمنع منها", () => {
    for (const v of ["diploma", "bachelor", "master", "phd"]) expect(hasAcademicFields(v), v).toBe(true);
    for (const v of ["high_school", "employee"]) expect(hasAcademicFields(v), v).toBe(false);
  });

  it("الفارغُ والمجهولُ لا يستدعيان الحقول", () => {
    expect(hasAcademicFields(null)).toBe(false);
    expect(hasAcademicFields(undefined)).toBe(false);
    expect(hasAcademicFields("")).toBe(false);
    expect(hasAcademicFields("طالب")).toBe(false);
  });

  it("كلُّ قيمةٍ في المفردات لها تسميةٌ في الخريطة", () => {
    for (const v of DEGREE_VALUES) expect(DEGREE_LABEL[v], v).toBeTruthy();
  });

  // يرتدّ إلى الرمز الخام فلا يختفي الحقل صامتًا لو ورد ما ليس في المفردات
  it("formatDegree يرتدّ إلى الرمز الخام ولا يبتلعه", () => {
    expect(formatDegree("bachelor")).toBe("بكالوريوس");
    expect(formatDegree("dvm")).toBe("dvm");
    expect(formatDegree(null)).toBeNull();
    expect(formatDegree("")).toBeNull();
  });
});

describe("الحقولُ الرقميّة", () => {
  it("رقمُ الهويّة عشرةُ أرقامٍ لا أكثر ولا أقلّ", () => {
    expect(NATIONAL_ID_RE.test("1".repeat(NATIONAL_ID_LEN))).toBe(true);
    expect(NATIONAL_ID_RE.test("1".repeat(NATIONAL_ID_LEN - 1))).toBe(false);
    expect(NATIONAL_ID_RE.test("1".repeat(NATIONAL_ID_LEN + 1))).toBe(false);
    expect(NATIONAL_ID_RE.test("١٢٣٤٥٦٧٨٩٠")).toBe(false);
    expect(NATIONAL_ID_RE.test("12345 6789")).toBe(false);
  });

  // الرقمُ الأكاديميّ يتفاوت بين الجامعات، فحدُّه مدًى لا رقمٌ واحد
  it("الرقمُ الأكاديميّ مدًى مغلقُ الطرفين", () => {
    expect(RECORD_NO_RE.test("1".repeat(RECORD_NO_MIN))).toBe(true);
    expect(RECORD_NO_RE.test("1".repeat(RECORD_NO_MAX))).toBe(true);
    expect(RECORD_NO_RE.test("1".repeat(RECORD_NO_MIN - 1))).toBe(false);
    expect(RECORD_NO_RE.test("1".repeat(RECORD_NO_MAX + 1))).toBe(false);
    expect(RECORD_NO_RE.test("22a4567")).toBe(false);
  });

  // الجوّالُ يُعاد تصديرُه من `fieldFormats` فلا نسختان تفترقان
  it("صيغةُ الجوّال المُعادةُ هي عينُ صيغة المصدر لا نسخةٌ منها", () => {
    expect(PHONE_RE).toBe(PHONE_RE_SOURCE);
  });
});

describe("socialHandle", () => {
  it("الفارغُ مقبولٌ ويعود عدمًا", () => {
    for (const raw of ["", "   ", null, undefined]) {
      expect(socialHandle("twitter", raw)).toEqual({ ok: true, handle: null });
    }
  });

  it("المعرّفُ المجرّد يمرّ كما هو", () => {
    expect(socialHandle("twitter", "adeeb_club")).toEqual({ ok: true, handle: "adeeb_club" });
    expect(socialHandle("instagram", "adeeb.club")).toEqual({ ok: true, handle: "adeeb.club" });
  });

  // الناس يكتبون @ هنا وهناك: في الصدر (المعتاد) وفي العجز (ستُّ قيمٍ في القاعدة)
  it("علامةُ @ تُنزَع من الطرفين", () => {
    expect(socialHandle("twitter", "@adeeb_club")).toEqual({ ok: true, handle: "adeeb_club" });
    expect(socialHandle("twitter", "adeeb_club@")).toEqual({ ok: true, handle: "adeeb_club" });
    expect(socialHandle("twitter", "@@adeeb_club@@")).toEqual({ ok: true, handle: "adeeb_club" });
  });

  it("الرابطُ الكامل يُستخرَج منه المعرّف، ومعاملاتُ التتبّع تسقط", () => {
    expect(socialHandle("twitter", "https://x.com/adeeb_club?utm_source=share&utm_medium=ios"))
      .toEqual({ ok: true, handle: "adeeb_club" });
    expect(socialHandle("twitter", "https://twitter.com/@adeeb_club")).toEqual({ ok: true, handle: "adeeb_club" });
    expect(socialHandle("instagram", "https://www.instagram.com/adeeb.club/")).toEqual({ ok: true, handle: "adeeb.club" });
    expect(socialHandle("tiktok", "https://www.tiktok.com/@adeeb.club?lang=ar")).toEqual({ ok: true, handle: "adeeb.club" });
  });

  // سبيكةُ لينكدإن العربيّة المُرمَّزة: `%` مسموحٌ لأنّ الرابط يعمل بها كما هي
  it("سبيكةُ لينكدإن المُرمَّزة تُقبل بعلامات النسبة", () => {
    expect(socialHandle("linkedin", "https://www.linkedin.com/in/%D8%B1%D8%A7%D9%86%D9%8A%D8%A9-a1b2c3/"))
      .toEqual({ ok: true, handle: "%D8%B1%D8%A7%D9%86%D9%8A%D8%A9-a1b2c3" });
    expect(SOCIAL_HANDLE_RE.test("%D8%B1")).toBe(true);
  });

  it("مسارُ لينكدإن يقبل in و pub معًا", () => {
    expect(socialHandle("linkedin", "https://linkedin.com/pub/ahmad-x")).toEqual({ ok: true, handle: "ahmad-x" });
  });

  // عضوةٌ لصقت رابط X في أعمدتها الأربعة — الردُّ رسالةٌ لا محوٌ صامت
  it("رابطُ منصّةٍ أخرى يُردّ برسالته", () => {
    const r = socialHandle("instagram", "https://x.com/adeeb_club");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("منصّة أخرى");
  });

  it("رابطُ المنصّة نفسِها بمسارٍ ليس مسارَ حساب يُردّ", () => {
    const r = socialHandle("linkedin", "https://www.linkedin.com/company/adeeb-club/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("تعذّر استخراج المعرّف");
  });

  // اسمُ الشخص بدل معرّفه (`Hawra ALFARHAN`) كان يبني رابطًا مكسورًا
  it("اسمُ صاحب الحساب لا معرّفُه يُردّ", () => {
    const r = socialHandle("twitter", "Hawra ALFARHAN");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("معرّف غير صالح");
  });

  it("الحشوُ العربيّ يُردّ ولا يُخزَّن معرّفًا", () => {
    for (const junk of ["لا يوجد", "برايفت", "ما عندي"]) {
      expect(socialHandle("twitter", junk).ok, junk).toBe(false);
    }
  });

  // محارفُ الاتّجاه تلتصق عند اللصق العربيّ فتُفسد المطابقة — تُنزع أوّلًا
  it("محارفُ الاتّجاه الخفيّة تُنزع قبل الحكم", () => {
    expect(socialHandle("twitter", "‏@adeeb_club‎")).toEqual({ ok: true, handle: "adeeb_club" });
  });

  /**
   * ما بدا مضيفًا يُحاكَم محاكمةَ الروابط ولو لم يكن رابطًا: `HOSTISH` يطابق تعبيرَ الترحيل
   * حرفًا بحرف، فلو ساهلناه ههنا لافترقت الطبقتان. فمعرّفٌ يشبه نطاقًا (`adeeb.com`) يُردّ
   * في خانة X لأنّه ليس من مضيفها، وهذا سلوكٌ مقصودٌ لا سهو.
   */
  it("ما يشبه المضيفَ يُحاكَم محاكمةَ الرابط", () => {
    expect(socialHandle("twitter", "adeeb.com").ok).toBe(false);
    expect(socialHandle("twitter", "x.com/adeeb_club")).toEqual({ ok: true, handle: "adeeb_club" });
  });
});

describe("socialUrl و socialLabel", () => {
  it("لكلّ منصّةٍ رابطُها من المعرّف المجرّد", () => {
    expect(socialUrl("twitter", "adeeb")).toBe("https://x.com/adeeb");
    expect(socialUrl("instagram", "adeeb")).toBe("https://instagram.com/adeeb");
    expect(socialUrl("tiktok", "adeeb")).toBe("https://tiktok.com/@adeeb");
    expect(socialUrl("linkedin", "adeeb")).toBe("https://linkedin.com/in/adeeb");
  });

  // لينكدإن بلا @: لا عرفَ له بها (صفرٌ من ٣٦ قيمةً تحملها)، ومعرّفُه سبيكةٌ في in/
  it("الثلاثُ تُزيَّن بـ@ ولينكدإن يبقى مجرّدًا", () => {
    expect(socialLabel("twitter", "adeeb")).toBe("@adeeb");
    expect(socialLabel("instagram", "adeeb")).toBe("@adeeb");
    expect(socialLabel("tiktok", "adeeb")).toBe("@adeeb");
    expect(socialLabel("linkedin", "adeeb")).toBe("adeeb");
  });

  // الاشتقاقُ مقصود: الأعمدةُ الأربعة على نسقٍ واحد
  it("عمودُ كلّ منصّةٍ يُشتقّ من مفتاحها", () => {
    for (const k of SOCIAL_KEYS) expect(socialColumn(k)).toBe(`${k}_account`);
  });

  it("لكلّ منصّةٍ تسميةٌ عربيّة", () => {
    for (const k of SOCIAL_KEYS) expect(socialLabelOf(k).trim(), k).not.toBe("");
  });

  it("رابطُ ما استُخرج من رابطٍ يعود إلى الرابط نفسِه", () => {
    const r = socialHandle("tiktok", "https://www.tiktok.com/@adeeb.club?lang=ar");
    expect(r.ok && socialUrl("tiktok", r.handle!)).toBe("https://tiktok.com/@adeeb.club");
  });
});

describe("أسبابُ إنهاء العضويّة", () => {
  // **النصُّ هو القيمة لا رمزٌ يُترجَم**: العمودُ نصٌّ حرٌّ فيه ثلاثٌ وأربعون واقعةً قديمة
  it("الأسبابُ نصوصٌ عربيّةٌ غيرُ مكرّرة", () => {
    expect(TERMINATION_REASONS.length).toBeGreaterThan(0);
    expect(TERMINATION_REASONS.length).toBe(new Set(TERMINATION_REASONS).size);
    for (const r of TERMINATION_REASONS) expect(r.trim(), r).not.toBe("");
  });

  // تُسأل ليُعرَف أيُّ خيارٍ يظهر مختارًا بعد التحرير
  it("isPresetReason يعرف السببَ المختار ولو صحبته مسافات", () => {
    const first = TERMINATION_REASONS[0];
    expect(isPresetReason(first)).toBe(true);
    expect(isPresetReason(`  ${first}  `)).toBe(true);
  });

  // والمُحرَّرُ بعد الاختيار لم يعد خيارًا: المحفوظُ ما في الصندوق لا ما في القائمة
  it("السببُ المكتوبُ بيد صاحبه ليس خيارًا من القائمة", () => {
    expect(isPresetReason(`${TERMINATION_REASONS[0]} في الفصل الثاني`)).toBe(false);
    expect(isPresetReason("سببٌ كتبه المُصدِر")).toBe(false);
    expect(isPresetReason("")).toBe(false);
  });
});
