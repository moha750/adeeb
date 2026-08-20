import { describe, expect, it } from "vitest";
import {
  EMAIL_HINT, EMAIL_RE, PHONE_HINT, PHONE_LEN, PHONE_PREFIX, PHONE_RE,
  emailError, isEmail, isPhone, phoneError,
} from "@/lib/fieldFormats";

/**
 * صيغُ الحقول — علّةُ توحيدها مكتوبةٌ في رأس الملفّ: كان تعبيرُ البريد **أربع نسخ**،
 * نسختان منها تختلفان فعلًا (`{2,}` مقابل `+` في آخر مقطع)، فكان البريدُ الواحد يُقبل
 * في بابٍ ويُردّ في آخر. فههنا تُثبَّت الحدودُ التي كانت النسختان تفترقان عندها.
 */

describe("EMAIL_RE", () => {
  it("يقبل البريد المعتاد", () => {
    for (const v of [
      "a@b.co",
      "member@adeeb.club",
      "mohammad.bin.ismael@gmail.com",
      "first+tag@sub.domain.example",
      "خالد@نطاق.شبكة", // متعمَّدُ التساهل: لا يدّعي RFC 5322 ولا يمنع نطاقًا عربيًّا
    ]) expect(EMAIL_RE.test(v), v).toBe(true);
  });

  /**
   * **الحدُّ الذي افترقت عنده النسختان**: اللاحقةُ حرفان فأكثر (`{2,}`). فلاحقةُ حرفٍ
   * واحدٍ `a@b.c` كانت تُقبل في البابين اللذين كتبا `+` وتُردّ في الآخرين — وهذا هو
   * الحكمُ الموحَّد اليوم: تُردّ.
   */
  it("يردّ لاحقةَ حرفٍ واحد (موضعُ الافتراق القديم)", () => {
    expect(EMAIL_RE.test("a@b.c")).toBe(false);
    expect(EMAIL_RE.test("member@adeeb.c")).toBe(false);
  });

  it("يردّ ما لا يمكن أن يكون بريدًا أصلًا", () => {
    for (const v of [
      "",                 // فارغ
      "member",           // بلا @
      "member@",          // بلا نطاق
      "@adeeb.club",      // بلا اسم
      "member@adeeb",     // بلا نقطةٍ ولا لاحقة
      "member@.club",     // نطاقٌ فارغٌ قبل النقطة
      "mem ber@adeeb.club", // مسافةٌ في الاسم
      "member@adeeb .club", // مسافةٌ في النطاق
      "a@b@c.com",        // @ مرّتين
    ]) expect(EMAIL_RE.test(v), v).toBe(false);
  });

  it("لا يقبل المسافةَ في الطرفين (التقليمُ شأنُ الدوالّ لا التعبير)", () => {
    expect(EMAIL_RE.test(" member@adeeb.club")).toBe(false);
    expect(isEmail(" member@adeeb.club ")).toBe(true);
  });
});

describe("PHONE_RE", () => {
  // يطابق `profiles_phone_check` في القاعدة حرفًا بحرف: `^05[0-9]{8}$`
  it("يقبل عشرةَ أرقامٍ تبدأ بـ05", () => {
    for (const v of ["0501234567", "0559876543", "0500000000", "0598765432"]) {
      expect(PHONE_RE.test(v), v).toBe(true);
    }
  });

  it("يردّ الأقصرَ والأطول من عشرة", () => {
    expect(PHONE_RE.test("050123456")).toBe(false);
    expect(PHONE_RE.test("05012345678")).toBe(false);
    expect(PHONE_RE.test("05")).toBe(false);
  });

  it("يردّ ما لا يبدأ بـ05", () => {
    for (const v of ["0601234567", "9660501234", "1234567890", "5012345678"]) {
      expect(PHONE_RE.test(v), v).toBe(false);
    }
  });

  // اللصيقةُ عرضٌ لا بيانات: المحفوظ عشرةُ أرقامٍ لا يسبقها خطُّ الدولة
  it("يردّ الرقمَ ومعه خطُّ الدولة", () => {
    expect(PHONE_RE.test("+966501234567")).toBe(false);
    expect(PHONE_RE.test("00966501234567")).toBe(false);
    expect(PHONE_RE.test(`${PHONE_PREFIX}0501234567`)).toBe(false);
  });

  // الحقلُ يقبل ما تلصقه العينُ عربيًّا، والتعبيرُ لاتينيُّ الأرقام فيردُّه
  it("يردّ أرقام العربيّة الهنديّة والفارسيّة", () => {
    expect(PHONE_RE.test("٠٥٠١٢٣٤٥٦٧")).toBe(false);
    expect(PHONE_RE.test("۰۵۰۱۲۳۴۵۶۷")).toBe(false);
  });

  it("يردّ الفواصلَ والمسافاتِ داخل الرقم", () => {
    for (const v of ["0501-234567", "050 123 4567", "050.123.4567"]) {
      expect(PHONE_RE.test(v), v).toBe(false);
    }
  });

  it("الطولُ الملزِم عشرة، وهو نفسُه ما يخدم maxLength", () => {
    expect(PHONE_LEN).toBe(10);
    expect(PHONE_RE.test("0".repeat(PHONE_LEN))).toBe(false); // يبدأ بـ00 لا 05
    expect(PHONE_RE.test(`05${"1".repeat(PHONE_LEN - 2)}`)).toBe(true);
  });
});

describe("emailError و phoneError", () => {
  // **لا يُخطَّأ المستخدم وهو يكتب**: أوّلُ محرفٍ ليس بريدًا صالحًا بعد
  it("لا رايةَ قبل مغادرة الحقل مهما كان المكتوب", () => {
    expect(emailError("m", false)).toBeUndefined();
    expect(emailError("لا شيء", false)).toBeUndefined();
    expect(phoneError("0", false)).toBeUndefined();
    expect(phoneError("abc", false)).toBeUndefined();
  });

  // الفارغُ لا يُخطَّأ ههنا: إلزامُه شأنُ `required` في النموذج
  it("لا رايةَ على الفارغ بعد المغادرة", () => {
    expect(emailError("", true)).toBeUndefined();
    expect(emailError("   ", true)).toBeUndefined();
    expect(phoneError("", true)).toBeUndefined();
    expect(phoneError("  ", true)).toBeUndefined();
  });

  it("الرايةُ بلفظها الموحَّد عند المغادرة بقيمةٍ فاسدة", () => {
    expect(emailError("member@adeeb", true)).toBe(EMAIL_HINT);
    expect(phoneError("0601234567", true)).toBe(PHONE_HINT);
  });

  it("لا رايةَ على الصحيح ولو صحبته مسافات", () => {
    expect(emailError(" member@adeeb.club ", true)).toBeUndefined();
    expect(phoneError(" 0501234567 ", true)).toBeUndefined();
  });
});

describe("isEmail و isPhone", () => {
  // تُسألان عند الإرسال حيث لا معنى لـ`touched` — فحكمُهما القيمةُ وحدَها
  it("تقلّمان الطرفين ثمّ تحكمان", () => {
    expect(isEmail("  member@adeeb.club  ")).toBe(true);
    expect(isPhone("\t0501234567\n")).toBe(true);
  });

  it("تردّان الفارغ (بخلاف دالّتَي الراية)", () => {
    expect(isEmail("")).toBe(false);
    expect(isEmail("   ")).toBe(false);
    expect(isPhone("")).toBe(false);
  });

  it("حكمُهما حكمُ التعبيرين نفسِه، فلا طبقتان تفترقان", () => {
    for (const v of ["a@b.c", "member@adeeb.club", "member@adeeb", ""]) {
      expect(isEmail(v), v).toBe(EMAIL_RE.test(v.trim()));
    }
    for (const v of ["0501234567", "050123456", "+966501234567", ""]) {
      expect(isPhone(v), v).toBe(PHONE_RE.test(v.trim()));
    }
  });
});
