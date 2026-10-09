import { describe, expect, it } from "vitest";
import { crumbFor, upFor } from "../crumb";
import { NAV } from "../nav";

/**
 * وجهةُ «رجوع» تُشتقّ من الخريطة لا من تسمية الورقة (٢٠٢٦-١٠-٠٨): كان الرجوعُ من تحرير
 * استبيانٍ يذهب إلى «عضويتي» لأنّ الشاشةَ لم تُسمِّ ورقتَها، فلم يبقَ في الفتات رابطٌ إلّا الجذر.
 */
describe("upFor: أبُ الصفحة من الخريطة", () => {
  it("الصفحةُ الفرعيّة ترجع إلى بندها ولو لم تُسمِّ ورقتَها", () => {
    expect(upFor("/dashboard/surveys/12/edit")).toEqual({ label: "الاستبيانات", href: "/dashboard/surveys" });
    expect(upFor("/dashboard/surveys/new")).toEqual({ label: "الاستبيانات", href: "/dashboard/surveys" });
    expect(upFor("/dashboard/surveys/12/results")).toEqual({ label: "الاستبيانات", href: "/dashboard/surveys" });
  });

  it("وأقربُ البنود يغلب: الإشرافُ بندٌ قائمٌ تحت مولّد الباركود", () => {
    expect(upFor("/dashboard/tools/qr/abc/settings")?.href).toBe("/dashboard/tools/qr");
    expect(upFor("/dashboard/tools/qr/oversight")?.href).toBe("/dashboard");
  });

  it("البندُ نفسُه يرجع إلى الجذر، والصدرُ لا رجوعَ منه", () => {
    expect(upFor("/dashboard/surveys")).toEqual({ label: "بوّابة أدِيب", href: "/dashboard" });
    expect(upFor("/dashboard")).toBeUndefined();
  });

  it("يطابق آخرَ رابطٍ في الفتات حين تُسمّي الشاشةُ ورقتَها (لا يتبدّل سلوكُ الصفحات السليمة)", () => {
    for (const [path, leaf] of [
      ["/dashboard/surveys/12/results", "النتائج"],
      ["/dashboard/tools/qr/abc/design", "التصميم"],
      ["/dashboard/events/3/edit", "تحرير"],
      ["/dashboard/tools/qr/oversight", "الإشراف"], // بندٌ قائمٌ بنفسه ومعه ورقة
      ["/dashboard/components", "المعرض"], // مسارٌ خارج الخريطة
    ] as const) {
      const lastLink = [...crumbFor(path, NAV, leaf)].reverse().find((s) => s.kind === "link");
      expect(upFor(path), path).toEqual(lastLink && lastLink.kind === "link" ? { label: lastLink.label, href: lastLink.href } : undefined);
    }
  });
});
