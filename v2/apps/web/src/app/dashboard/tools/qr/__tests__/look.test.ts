import { describe, expect, it } from "vitest";
import { look } from "../look";
import { defaultQrSpec, EXPORT, LOGO_SCALE, SHAPE } from "../defaults";
import type { QrSpec } from "@/lib/qr";

/**
 * **البذرةُ عهدٌ لا تطبيع.** كان `look` يُهمل الشكلَ والمقاسَ وحجمَ الشعار، فتُعاد المواصفةُ
 * بناءً من ثوابت اليوم؛ فصفٌّ حُفظ قبل تثبيتها يخرج مخالفًا لمحفوظه فيُشعل «تغيّر شيء»
 * لحظةَ الفتح، فيكتب الحفظُ التلقائيّ تصميمًا جديدًا على ملصقٍ مطبوع (٢٠٢٦-٠٨-٣١).
 */
describe("look", () => {
  const old: QrSpec = {
    ...defaultQrSpec("https://adeeb.club/q/abcdefg"),
    size: 512,
    dots: { shape: "square", paint: { kind: "solid", color: "#123456" } },
    eye: { shape: "square", color: null },
    pupil: { shape: "square", color: null },
    logo: { href: "data:image/svg+xml,x", scale: 0.2 },
  };

  it("تحمل ما لا تحرّره الشاشة كما حُفظ", () => {
    const seed = look(old);
    expect(seed.size).toBe(512);
    expect(seed.dotsShape).toBe("square");
    expect(seed.eyeShape).toBe("square");
    expect(seed.pupilShape).toBe("square");
    expect(seed.logoScale).toBe(0.2);
  });

  it("وتأخذ افتراض الهوية حين لا وصفة", () => {
    const seed = look(null);
    expect(seed.size).toBe(EXPORT);
    expect(seed.dotsShape).toBe(SHAPE.dots);
    expect(seed.logoScale).toBe(LOGO_SCALE);
  });

  it("وتردّ التدرّج ومركزه ولونيه", () => {
    const grad: QrSpec = {
      ...defaultQrSpec("https://adeeb.club/q/abcdefg"),
      dots: { shape: "fluid", paint: { kind: "radial", from: "#111111", to: "#222222", cx: 0.2, cy: 0.8 } },
    };
    const seed = look(grad);
    expect(seed.gradient).toBe(true);
    expect(seed.gradKind).toBe("radial");
    expect([seed.ink, seed.ink2]).toEqual(["#111111", "#222222"]);
    expect([seed.cx, seed.cy]).toEqual([0.2, 0.8]);
  });
});
