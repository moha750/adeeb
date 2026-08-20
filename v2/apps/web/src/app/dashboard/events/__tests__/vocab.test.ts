import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_META, RESERVATION_ERRORS, RESERVATION_STATUS_META, STAGE_META, STATUS_META, STATUS_OPS,
  deriveStatus, reservationErrorMessage, reservationStage,
  type AttendanceStatus, type EventStatus, type ReservationStage, type StatusOp,
} from "@/app/dashboard/events/vocab";

/**
 * حالةُ الفعاليّة **مشتقّةٌ لا مخزّنة**: لا عمودَ لها في القاعدة، إنّما تُحسب من علمَي
 * `is_published` و`is_cancelled` والتاريخ. وقيدُ القاعدة `NOT(cancelled AND published)`
 * يضمن ألّا تجتمع النغمتان. فههنا تُمسَح المصفوفةُ الثمانيّة كلُّها (علمان × ماضٍ ومستقبل).
 */

const TODAY = "2026-08-16";
const FUTURE = "2026-09-01";
const PAST = "2026-08-01";

describe("deriveStatus", () => {
  // الإلغاءُ يعلو كلَّ شيء: ملغاةٌ ولو كان تاريخُها ماضيًا أو كانت منشورة
  it("الملغاةُ ملغاةٌ مهما كان النشرُ والتاريخ", () => {
    for (const published of [true, false]) {
      for (const date of [PAST, TODAY, FUTURE]) {
        expect(deriveStatus(published, true, date, TODAY), `${published}/${date}`).toBe("cancelled");
      }
    }
  });

  it("غيرُ المنشورة مسودّةٌ ولو مضى تاريخُها", () => {
    expect(deriveStatus(false, false, FUTURE, TODAY)).toBe("draft");
    expect(deriveStatus(false, false, PAST, TODAY)).toBe("draft");
  });

  it("المنشورةُ في المستقبل منشورة، وفي الماضي منتهية", () => {
    expect(deriveStatus(true, false, FUTURE, TODAY)).toBe("published");
    expect(deriveStatus(true, false, PAST, TODAY)).toBe("ended");
  });

  /**
   * **حدُّ اليوم نفسِه**: المقارنةُ `>=` فالفعاليّةُ التي تقع اليومَ ما زالت «منشورة» لا
   * «منتهية». والمقارنةُ نصّيّةٌ على `YYYY-MM-DD` فتصحّ معجميًّا بلا `Date` ولا منطقة —
   * وهذا ما ينجيها من زحزحة التوقيت التي تُنقص يومًا.
   */
  it("فعاليّةُ اليوم منشورةٌ لا منتهية", () => {
    expect(deriveStatus(true, false, TODAY, TODAY)).toBe("published");
  });

  it("المقارنةُ معجميّةٌ فتصحّ عبر الشهر والسنة", () => {
    expect(deriveStatus(true, false, "2026-09-01", "2026-08-31")).toBe("published");
    expect(deriveStatus(true, false, "2025-12-31", "2026-01-01")).toBe("ended");
    expect(deriveStatus(true, false, "2026-01-01", "2025-12-31")).toBe("published");
  });
});

describe("STATUS_OPS", () => {
  const OPS = Object.keys(STATUS_OPS) as StatusOp[];
  const ALL: EventStatus[] = ["draft", "published", "ended", "cancelled"];
  const from = (op: StatusOp) => [...STATUS_OPS[op].from].sort();

  it("النشرُ من المسودّة وحدها", () => {
    expect(from("publish")).toEqual(["draft"]);
  });

  // «المنتهية» منشورةٌ مضى وقتُها، فإخفاؤها يعيدها مسودّةً فتُحجب عن العامّة
  it("إلغاءُ النشر من المنشورة والمنتهية معًا", () => {
    expect(from("unpublish")).toEqual(["ended", "published"]);
  });

  it("الإلغاءُ من المسودّة والمنشورة لا من المنتهية", () => {
    expect(from("cancel")).toEqual(["draft", "published"]);
    expect(STATUS_OPS.cancel.from).not.toContain("ended");
  });

  it("إعادةُ التفعيل من الملغاة وحدها", () => {
    expect(from("reactivate")).toEqual(["cancelled"]);
  });

  it("لكلّ فعلٍ مصدرٌ واحدٌ على الأقلّ وتسميةٌ عربيّة", () => {
    for (const op of OPS) {
      expect(STATUS_OPS[op].from.length, op).toBeGreaterThan(0);
      expect(STATUS_OPS[op].label.trim(), op).not.toBe("");
      for (const s of STATUS_OPS[op].from) expect(ALL, `${op} ⇐ ${s}`).toContain(s);
    }
  });

  // ولا حالةَ محبوسة: من كلّ حالٍ بابٌ يُخرج منها
  it("لكلّ حالةٍ فعلٌ يخرج منها", () => {
    for (const s of ALL) {
      expect(OPS.some((op) => (STATUS_OPS[op].from as readonly EventStatus[]).includes(s)), s).toBe(true);
    }
  });
});

describe("reservationStage", () => {
  const base = {
    status: "confirmed" as const,
    attendance: "registered" as AttendanceStatus,
    whatsappConfirmed: false,
    certificateSent: false,
  };

  // ترتيبُ الأسبقيّة من الأبعد للأقرب — وهو ما يُختبَر ههنا بندًا بندًا
  it("الملغى يعلو كلَّ علم", () => {
    expect(reservationStage({ ...base, status: "cancelled", attendance: "attended", whatsappConfirmed: true, certificateSent: true }))
      .toBe("cancelled");
  });

  it("«لم يحضر» يعلو الشهادةَ والواتساب", () => {
    expect(reservationStage({ ...base, attendance: "no_show", whatsappConfirmed: true, certificateSent: true }))
      .toBe("no_show");
  });

  it("الشهادةُ تعلو الحضور", () => {
    expect(reservationStage({ ...base, attendance: "attended", certificateSent: true })).toBe("cert_sent");
  });

  it("الحضورُ يعلو تأكيدَ الواتساب", () => {
    expect(reservationStage({ ...base, attendance: "attended", whatsappConfirmed: true })).toBe("attended");
  });

  it("تأكيدُ الواتساب يعلو الانتظار", () => {
    expect(reservationStage({ ...base, whatsappConfirmed: true })).toBe("confirmed_wa");
  });

  it("والافتراضُ انتظارُ الواتساب", () => {
    expect(reservationStage(base)).toBe("awaiting_whatsapp");
  });

  // شهادةٌ بلا حضورٍ مسجَّل: تبقى الشهادةُ هي المرحلة (العَلَمُ أصدقُ من ترتيبٍ متوقَّع)
  it("الشهادةُ تُقال ولو لم يُسجَّل الحضور", () => {
    expect(reservationStage({ ...base, certificateSent: true })).toBe("cert_sent");
  });

  it("كلُّ مرحلةٍ ممكنةٍ لها تسميةٌ ونغمة", () => {
    const stages: ReservationStage[] = ["awaiting_whatsapp", "confirmed_wa", "attended", "cert_sent", "no_show", "cancelled"];
    for (const s of stages) {
      expect(STAGE_META[s].label.trim(), s).not.toBe("");
      expect(STAGE_META[s].tone, s).toBeTruthy();
    }
    expect(Object.keys(STAGE_META).sort()).toEqual([...stages].sort());
  });
});

describe("reservationErrorMessage", () => {
  // الرمزُ يصل داخل `error.message` محشوًّا، فالالتقاطُ بالاحتواء أمتنُ من المطابقة التامّة
  it("يلتقط الرمز داخل نصّ الخطأ الخام", () => {
    expect(reservationErrorMessage("RESERVATION_LOCKED")).toBe(RESERVATION_ERRORS.RESERVATION_LOCKED);
    expect(reservationErrorMessage('new row violates ... RAISE: ACTIVITY_CANCELLED at line 4'))
      .toBe(RESERVATION_ERRORS.ACTIVITY_CANCELLED);
  });

  it("المجهولُ يُقال جملةً عامّة", () => {
    for (const raw of ["boom", "", null, undefined]) {
      expect(reservationErrorMessage(raw), String(raw)).toBe("تعذّر تنفيذ الإجراء. حاول مجدّدًا.");
    }
  });

  it("كلُّ رمزٍ له رسالةٌ عربيّةٌ غيرُ فارغة", () => {
    for (const [code, msg] of Object.entries(RESERVATION_ERRORS)) {
      expect(msg.trim(), code).not.toBe("");
      expect(reservationErrorMessage(code), code).toBe(msg);
    }
  });
});

describe("خرائطُ العرض", () => {
  it("لكلّ حالةِ فعاليّةٍ تسميةٌ ونغمة", () => {
    for (const s of ["draft", "published", "ended", "cancelled"] as EventStatus[]) {
      expect(STATUS_META[s].label.trim(), s).not.toBe("");
    }
  });

  it("حالتا الحجز اثنتان، وحالاتُ الحضور ثلاث", () => {
    expect(Object.keys(RESERVATION_STATUS_META).sort()).toEqual(["cancelled", "confirmed"]);
    expect(Object.keys(ATTENDANCE_META).sort()).toEqual(["attended", "no_show", "registered"]);
  });
});
