import { describe, expect, it } from "vitest";
import { firstHref, searchNav, type NavGroup } from "../nav";

/**
 * **خانةُ البحث في الشريط** (٢٠٢٦-٠٩-١٩) — ترشيحُ عرضٍ فوق خريطةٍ **سبق أن نُخلت بالقدرات**
 * (`navFor`)، فلا يُسأل هنا عن مفتاح. وما يُختبَر ههنا ثلاثةٌ:
 *   ١ · التطبيعُ العربيّ يعمل حقًّا (همزةٌ وتاءٌ مربوطةٌ وتشكيل) — وهو علّةُ وجود البحث أصلًا.
 *   ٢ · رأسُ المجموعة حقلٌ يُطابَق كالبند، والمجموعةُ الخاوية يسقط رأسُها.
 *   ٣ · وجهةُ الإقرار (Enter) هي أوّلُ ما بقي، و`null` إن لم يبقَ شيء.
 */

const NAV: NavGroup[] = [
  { items: [{ label: "عضويتي", icon: "me", href: "/dashboard" }] },
  {
    head: "الانتخابات",
    items: [
      { label: "الترشُّح", icon: "candidacy", href: "/dashboard/elections/run" },
      { label: "صوّت الآن", icon: "ballot", href: "/dashboard/elections/vote" },
    ],
  },
  {
    head: "المحتوى",
    items: [
      { label: "الأخبار", icon: "news", href: "/dashboard/news" },
      { label: "الأسئلة الشائعة", icon: "faq", href: "/dashboard/website/faq" },
    ],
  },
];

const labels = (g: NavGroup[]) => g.flatMap((x) => x.items.map((i) => i.label));

describe("searchNav", () => {
  it("الاستعلامُ الفارغ لا يُرشِّح شيئًا", () => {
    expect(searchNav(NAV, "")).toBe(NAV);
    expect(searchNav(NAV, "   ")).toBe(NAV);
  });

  it("يجد البندَ بلا همزةٍ ولا تشكيل", () => {
    // «الاخبار» بلا همزة، و«الاسئله» بتاءٍ مفتوحةٍ منطوقةً هاء: الوجهان اللذان يُكتَب بهما فعلًا
    expect(labels(searchNav(NAV, "الاخبار"))).toEqual(["الأخبار"]);
    expect(labels(searchNav(NAV, "الاسئله"))).toEqual(["الأسئلة الشائعة"]);
    expect(labels(searchNav(NAV, "الترشح"))).toEqual(["الترشُّح"]);
  });

  it("رأسُ المجموعة يأتي ببنودها كلِّها", () => {
    expect(labels(searchNav(NAV, "الانتخابات"))).toEqual(["الترشُّح", "صوّت الآن"]);
  });

  it("المجموعةُ الخاوية يسقط رأسُها معها", () => {
    const out = searchNav(NAV, "الأخبار");
    expect(out).toHaveLength(1);
    expect(out[0]!.head).toBe("المحتوى");
  });

  it("كلماتُ الاستعلام تُطلَب كلُّها، والرأسُ حقلٌ منها", () => {
    expect(labels(searchNav(NAV, "المحتوى الأخبار"))).toEqual(["الأخبار"]);
    expect(labels(searchNav(NAV, "المحتوى الترشُّح"))).toEqual([]);
  });

  it("ما لا يُطابِق شيئًا يردّ خريطةً خاوية", () => {
    expect(searchNav(NAV, "زقزقة")).toEqual([]);
  });
});

describe("firstHref", () => {
  it("أوّلُ وجهةٍ فيما بقي", () => {
    expect(firstHref(searchNav(NAV, "الانتخابات"))).toBe("/dashboard/elections/run");
  });
  it("لا وجهةَ في خريطةٍ خاوية", () => {
    expect(firstHref([])).toBeNull();
  });
});
