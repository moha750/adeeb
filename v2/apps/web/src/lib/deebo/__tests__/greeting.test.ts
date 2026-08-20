import { describe, expect, it } from "vitest";
import { GREETING_PERIOD, dayPartOf, nextSeed, pickGreeting } from "../greeting";

/**
 * التحيّةُ نصٌّ يراه كلُّ زائر، وما يُختبر منها **ثلاثةٌ يكسرها تعديلٌ صامت**:
 * أن تُقسَم الساعةُ قسمتَها، وأن تكون الدالّةُ صافيةً (وإلّا انكسر الترطيب)،
 * وأن تُغيّر «محادثةٌ جديدة» التحيّةَ فعلًا لا احتمالًا.
 */
describe("dayPartOf", () => {
  it("يقسم اليوم ثلاثًا بحدودها", () => {
    expect(dayPartOf(4)).toBe("morning");
    expect(dayPartOf(11)).toBe("morning");
    expect(dayPartOf(12)).toBe("evening");
    expect(dayPartOf(22)).toBe("evening");
    expect(dayPartOf(23)).toBe("late");
    expect(dayPartOf(0)).toBe("late");
    expect(dayPartOf(3)).toBe("late");
  });
});

describe("pickGreeting", () => {
  it("صافيةٌ: البذرةُ نفسُها تُخرج الجملةَ نفسَها (شرطُ سلامة الترطيب)", () => {
    const a = pickGreeting({ seed: 7, hour: 9, name: "محمّد" });
    const b = pickGreeting({ seed: 7, hour: 9, name: "محمّد" });
    expect(a).toBe(b);
  });

  it("تنادي صاحبَ الحساب باسمه ولا تنادي المجهول", () => {
    expect(pickGreeting({ seed: 0, hour: 9, name: "محمّد" })).toContain("محمّد");
    expect(pickGreeting({ seed: 0, hour: 9, name: null })).not.toContain("محمّد");
    // اسمٌ فارغٌ أو فراغاتٌ ليس اسمًا: تُقال كما تُقال للمجهول، لا «صباح الخير، .»
    expect(pickGreeting({ seed: 0, hour: 9, name: "   " })).toBe(pickGreeting({ seed: 0, hour: 9, name: null }));
  });

  it("تعرف صباحَها من مسائها", () => {
    expect(pickGreeting({ seed: 0, hour: 9, name: null }).startsWith("صباح")).toBe(true);
    expect(pickGreeting({ seed: 0, hour: 19, name: null }).startsWith("مساء")).toBe(true);
  });

  it("تُخرج الدورةَ كاملةً بلا تكرار، ثمّ تعود", () => {
    const all = Array.from({ length: GREETING_PERIOD }, (_, i) => pickGreeting({ seed: i, hour: 9, name: null }));
    expect(new Set(all).size).toBe(GREETING_PERIOD);
    expect(pickGreeting({ seed: GREETING_PERIOD, hour: 9, name: null })).toBe(all[0]);
  });

  it("تسمّي أديب مرّةً واحدةً في كلّ تحيّةٍ ممكنة", () => {
    // حارسُ قاعدة التركيب: الصدرُ لا يسمّيه والعجُزُ يسمّيه. سقطت أوّلُ قرعةٍ حيّةٍ فيها.
    for (const hour of [9, 19, 1]) {
      for (let seed = 0; seed < GREETING_PERIOD; seed++) {
        const said = pickGreeting({ seed, hour, name: "محمّد" }).split("أديب").length - 1;
        expect(said).toBe(1);
      }
    }
  });

  it("تحتمل بذرةً سالبةً أو كسريّةً ولا تنهار", () => {
    expect(pickGreeting({ seed: -3, hour: 9, name: null })).toBeTruthy();
    expect(pickGreeting({ seed: 2.7, hour: 9, name: null })).toBe(pickGreeting({ seed: 2, hour: 9, name: null }));
  });
});

describe("nextSeed", () => {
  it("لا يعيد التحيّةَ نفسَها مهما وقعت القرعة", () => {
    for (let seed = 0; seed < GREETING_PERIOD; seed++) {
      for (let r = 0; r < 100; r++) {
        const roll = r / 100;
        const before = pickGreeting({ seed, hour: 9, name: null });
        const after = pickGreeting({ seed: nextSeed(seed, roll), hour: 9, name: null });
        expect(after).not.toBe(before);
      }
    }
  });
});
