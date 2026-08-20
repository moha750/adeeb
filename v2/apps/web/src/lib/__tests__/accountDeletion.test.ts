import { describe, expect, it } from "vitest";
import { DELETION_GRACE_DAYS, deletionDueLabel } from "@/lib/accountDeletion";
import { fmtDate } from "@/lib/dates";

/**
 * مهلةُ حذف الحساب — **عددٌ يُقال في ثلاث شاشاتٍ ودالّةِ قاعدة**، فيُحرَس ههنا أن يبقى واحدًا.
 *
 * وساعةُ المِعيار مثبَّتةٌ على UTC (`vitest.config.ts`)، وذلك عينُ ما يُقاس: طلبٌ سُجِّل بعد
 * التاسعة مساءً بتوقيت الرياض يقع في اليوم التالي عند UTC — فلو صيغ اليومُ بساعة الخادم
 * لَقال للناس موعدًا غيرَ موعدهم.
 */

describe("DELETION_GRACE_DAYS", () => {
  it("ثلاثون يومًا كما قضى المالك، وتوأمُها في sweep_account_deletions", () => {
    expect(DELETION_GRACE_DAYS).toBe(30);
  });
});

describe("deletionDueLabel", () => {
  it("بلا طلبٍ لا موعد", () => {
    expect(deletionDueLabel(null)).toBeNull();
  });

  it("تاريخٌ لا يُقرأ لا يُخمَّن", () => {
    expect(deletionDueLabel("ليس تاريخًا")).toBeNull();
  });

  it("الموعدُ بعد ثلاثين يومًا من الطلب", () => {
    const at = "2026-08-19T10:00:00.000Z";
    expect(deletionDueLabel(at)).toBe(fmtDate("2026-09-18T10:00:00.000Z"));
  });

  it("طلبٌ ليلَ الرياض يقع يومَه لا يومَ الخادم", () => {
    // ٢١:٣٠ بتوقيت الرياض من ١٩ أغسطس = ١٨:٣٠ UTC، ومَداها ١٨ سبتمبر بتوقيت النادي.
    expect(deletionDueLabel("2026-08-19T18:30:00.000Z")).toBe(fmtDate("2026-09-18T18:30:00.000Z"));
    // ولو زادت ثلاثُ ساعاتٍ لَعبرت منتصفَ ليل الرياض، فيتقدّم اليومُ يومًا واحدًا لا أكثر.
    expect(deletionDueLabel("2026-08-19T21:30:00.000Z")).toBe(fmtDate("2026-09-19T00:30:00.000Z"));
  });
});
