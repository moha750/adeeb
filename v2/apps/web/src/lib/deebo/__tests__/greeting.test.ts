import { describe, expect, it } from "vitest";
import { GREETING_PERIOD, dayPartOf, nextSeed, pickGreeting } from "../greeting";

/**
 * التحيّةُ نصٌّ يراه كلُّ زائر، وما يُختبر منها **أربعةٌ يكسرها تعديلٌ صامت**:
 * أن تُقسَم الساعةُ قسمتَها، وأن تكون الدالّةُ صافيةً (وإلّا انكسر الترطيب)،
 * وأن تُغيّر «محادثةٌ جديدة» التحيّةَ فعلًا لا احتمالًا،
 * **وأن يصدق الوجهُ على الجملة** منذ صار لكلّ صدرٍ وجهُه (٢٠٢٦-٠٨-٢٠).
 */

/** جملةُ التحيّة وحدَها : أكثرُ ما يُختبر ههنا نصٌّ، والوجهُ له بابُه في آخر الملفّ. */
const say = (input: Parameters<typeof pickGreeting>[0]) => pickGreeting(input).text;
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
    const a = say({ seed: 7, hour: 9, name: "محمّد" });
    const b = say({ seed: 7, hour: 9, name: "محمّد" });
    expect(a).toBe(b);
  });

  it("تنادي صاحبَ الحساب باسمه ولا تنادي المجهول", () => {
    expect(say({ seed: 0, hour: 9, name: "محمّد" })).toContain("محمّد");
    expect(say({ seed: 0, hour: 9, name: null })).not.toContain("محمّد");
    // اسمٌ فارغٌ أو فراغاتٌ ليس اسمًا: تُقال كما تُقال للمجهول، لا «صباح الخير، .»
    expect(say({ seed: 0, hour: 9, name: "   " })).toBe(say({ seed: 0, hour: 9, name: null }));
  });

  it("تعرف صباحَها من مسائها", () => {
    expect(say({ seed: 0, hour: 9, name: null }).startsWith("صباح")).toBe(true);
    expect(say({ seed: 0, hour: 19, name: null }).startsWith("مساء")).toBe(true);
    expect(say({ seed: 0, hour: 1, name: null }).startsWith("آخر الليل")).toBe(true);
  });

  it("تُخرج الدورةَ كاملةً بلا تكرار، ثمّ تعود", () => {
    const all = Array.from({ length: GREETING_PERIOD }, (_, i) => say({ seed: i, hour: 9, name: null }));
    expect(new Set(all).size).toBe(GREETING_PERIOD);
    expect(say({ seed: GREETING_PERIOD, hour: 9, name: null })).toBe(all[0]);
  });

  it("تلصق الاسمَ بالصدر بلا فاصلةٍ قبله، وتفصل بعده : صيغةُ المالك بخطّه", () => {
    // «صباح الخير محمّد، ...» لا «صباح الخير، محمّد. ...» — والثانيةُ هي التي قُرئت رسميّة.
    for (const hour of [9, 19, 1]) {
      for (let seed = 0; seed < GREETING_PERIOD; seed++) {
        const g = say({ seed, hour, name: "محمّد" });
        expect(g).not.toContain("، محمّد");
        expect(g).toContain("محمّد، ");
      }
    }
  });

  it("تطوي «يا» مع الاسم، فلا يبقى نداءٌ بلا منادًى", () => {
    for (const hour of [9, 19, 1]) {
      for (let seed = 0; seed < GREETING_PERIOD; seed++) {
        expect(say({ seed, hour, name: null })).not.toContain(" يا،");
      }
    }
  });

  it("تسمّي أديب مرّةً واحدةً في كلّ تحيّةٍ ممكنة", () => {
    // حارسُ قاعدة التركيب: الصدرُ لا يسمّيه والعجُزُ يسمّيه. سقطت أوّلُ قرعةٍ حيّةٍ فيها.
    for (const hour of [9, 19, 1]) {
      for (let seed = 0; seed < GREETING_PERIOD; seed++) {
        const said = say({ seed, hour, name: "محمّد" }).split("أديب").length - 1;
        expect(said).toBeLessThanOrEqual(1);
      }
    }
  });

  it("تحتمل بذرةً سالبةً أو كسريّةً ولا تنهار", () => {
    expect(say({ seed: -3, hour: 9, name: null })).toBeTruthy();
    expect(say({ seed: 2.7, hour: 9, name: null })).toBe(say({ seed: 2, hour: 9, name: null }));
  });
});

describe("nextSeed", () => {
  it("لا يعيد التحيّةَ نفسَها مهما وقعت القرعة", () => {
    for (let seed = 0; seed < GREETING_PERIOD; seed++) {
      for (let r = 0; r < 100; r++) {
        const roll = r / 100;
        const before = say({ seed, hour: 9, name: null });
        const after = say({ seed: nextSeed(seed, roll), hour: 9, name: null });
        expect(after).not.toBe(before);
      }
    }
  });
});

describe("وجهُ التحيّة", () => {
  it("يُسحب مع جملته لا بعدها : بذرةٌ واحدةٌ تُخرجهما معًا", () => {
    for (const hour of [9, 19, 1]) {
      for (let seed = 0; seed < GREETING_PERIOD; seed++) {
        const a = pickGreeting({ seed, hour, name: "محمّد" });
        const b = pickGreeting({ seed, hour, name: "محمّد" });
        expect(a).toEqual(b);
      }
    }
  });

  it("يتبع الصدرَ لا العجُز : الأعجازُ الستّةُ لصدرٍ واحدٍ وجهُها واحد", () => {
    // العجُزُ دعوةٌ إلى السؤال لا حال، فلو بدّل الوجهَ لتبدّل الرسمُ بلا سبب.
    for (const hour of [9, 19, 1]) {
      for (let open = 0; open < 4; open++) {
        const moods = new Set(
          Array.from({ length: 6 }, (_, k) => pickGreeting({ seed: open + 4 * k, hour, name: null }).mood),
        );
        expect(moods.size).toBe(1);
      }
    }
  });

  it("لا يقول ساعةً غيرَ ساعته", () => {
    // حارسُ الخلط الوحيدِ الذي يُقرأ كذبًا: نعسانُ الوجه في الصباح، أو فنجانُ الصباح آخرَ الليل.
    const morning = new Set(Array.from({ length: GREETING_PERIOD }, (_, i) => pickGreeting({ seed: i, hour: 9, name: null }).mood));
    const late = new Set(Array.from({ length: GREETING_PERIOD }, (_, i) => pickGreeting({ seed: i, hour: 1, name: null }).mood));
    expect(morning.has("sleepy")).toBe(false);
    expect(morning.has("tired")).toBe(false);
    expect(morning.has("good-night")).toBe(false);
    expect(late.has("good-morning")).toBe(false);
  });

  it("يتبدّل في القسم الواحد، فلا وجهٌ واحدٌ لأربعِ تحيّات", () => {
    for (const hour of [9, 19, 1]) {
      const moods = new Set(Array.from({ length: 4 }, (_, i) => pickGreeting({ seed: i, hour, name: null }).mood));
      expect(moods.size).toBe(4);
    }
  });
});
