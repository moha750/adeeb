import { describe, expect, it } from "vitest";
import { parseChapters, parseTimestamp } from "../chapters";

describe("parseTimestamp", () => {
  it("يقرأ mm:ss و h:mm:ss", () => {
    expect(parseTimestamp("0:00")).toBe(0);
    expect(parseTimestamp("10:19")).toBe(619);
    expect(parseTimestamp("1:02:03")).toBe(3723);
  });

  it("يردّ null لما لا يصحّ", () => {
    expect(parseTimestamp("10:75")).toBeNull();
    expect(parseTimestamp("1:99:00")).toBeNull();
    expect(parseTimestamp("a:bb")).toBeNull();
  });
});

describe("parseChapters", () => {
  it("يقرأ الوقتَ في أوّل السطر، صنيعُ فنجان بالأقواس", () => {
    const out = parseChapters("(00:00) البداية\n(02:08) مغالطة\n(11:40) الخاتمة");
    expect(out).toEqual([
      { at: 0, title: "البداية" },
      { at: 128, title: "مغالطة" },
      { at: 700, title: "الخاتمة" },
    ]);
  });

  it("يقرأ الوقتَ في آخر السطر، صنيعُ سقراط", () => {
    // العنوانُ أوّلًا هو الترتيبُ الطبيعيّ في سطرٍ عربيّ، ويوتيوب يقبله
    expect(parseChapters("البداية 00:00\nصراع الاستمراريّة 03:12")).toEqual([
      { at: 0, title: "البداية" },
      { at: 192, title: "صراع الاستمراريّة" },
    ]);
  });

  it("يقبل الأرقامَ العربيّة والفواصلَ المألوفة", () => {
    expect(parseChapters("٠٠:٠٠ - البداية\n٠٥:٣٠ : الحلم")).toEqual([
      { at: 0, title: "البداية" },
      { at: 330, title: "الحلم" },
    ]);
  });

  it("يتجاهل السطورَ الفارغة ولا يعدّها محاور", () => {
    expect(parseChapters("00:00 البداية\n\n\n01:00 التالي")).toEqual([
      { at: 0, title: "البداية" },
      { at: 60, title: "التالي" },
    ]);
  });

  /* ══ الكلُّ أو لا شيء ══ */

  it("يردّ null إن خلا سطرٌ واحدٌ من وقت", () => {
    // قائمةٌ نصفُها أزرارٌ ونصفُها سطورٌ ميّتة تُقرأ عطلًا لا تصميمًا
    expect(parseChapters("00:00 البداية\nالحلم وحده لا يكفي\n05:00 الخاتمة")).toBeNull();
  });

  it("يردّ null لنصٍّ بلا أوقات، وهو حالُ الحلقات القائمة", () => {
    expect(parseChapters("الحلم وحده لا يكفي\nصراع الاستمراريّة\nلماذا نؤجّل؟")).toBeNull();
  });

  it("يردّ null لسطرٍ واحد، فليس قائمة", () => {
    expect(parseChapters("00:00 البداية")).toBeNull();
  });

  it("يردّ null إن لم تبدأ القائمةُ من أوّل الحلقة", () => {
    // قائمةٌ تبدأ من الدقيقة الرابعة تترك أوّلَ الحلقة بلا باب، وهو شرطُ يوتيوب نفسُه
    expect(parseChapters("04:00 الأوّل\n08:00 الثاني")).toBeNull();
  });

  it("يردّ null لأوقاتٍ لا تتصاعد", () => {
    // أرقامٌ تتراجع تعني أنّ ما قُرئ وقتًا ليس وقتًا
    expect(parseChapters("00:00 الأوّل\n05:00 الثاني\n02:00 الثالث")).toBeNull();
  });

  it("يردّ null للفراغ والغياب", () => {
    expect(parseChapters(null)).toBeNull();
    expect(parseChapters("")).toBeNull();
    expect(parseChapters("   \n  ")).toBeNull();
  });
});
