import { describe, expect, it } from "vitest";
import { isHexColor, qrSvg } from "@/lib/qr";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";

/**
 * **اللونُ المكتوبُ في وصفةٍ قد لا يكون لونًا.** الوصفةُ صفٌّ يُكتَب من المتصفّح، وقيمُها
 * تُقحَم في سمات SVG ثمّ يُوضَع الناتجُ في الصفحة. فقيمةٌ مثل `#000" onmouseover="x` تخرج
 * من السمة إلى وسمٍ جديد. حارسان: الخادمُ يردّها عند الحفظ، والراسمُ لا يكتبها أصلًا.
 */
describe("حارسُ الألوان", () => {
  it("يقبل السِّتّيَّ عشريَّ بأطواله الثلاثة", () => {
    for (const c of ["#fff", "#0A1b2C", "#00112233"]) expect(isHexColor(c)).toBe(true);
  });

  it("ويردّ ما ليس لونًا", () => {
    for (const c of ['#000" onmouseover="x', "red", "url(#x)", "", "#12345", null, 7]) {
      expect(isHexColor(c)).toBe(false);
    }
  });

  it("والراسمُ لا يكتب قيمةً ملفّقةً في سمة", () => {
    const spec = defaultQrSpec("https://adeeb.club/q/abcdefg");
    const svg = qrSvg({
      ...spec,
      size: 256,
      bg: '#fff" onload="alert(1)' as string,
      dots: { shape: "fluid", paint: { kind: "solid", color: '#000" onmouseover="x' } },
    });
    expect(svg).not.toContain("onload");
    expect(svg).not.toContain("onmouseover");
  });
});
