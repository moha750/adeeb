import { describe, expect, it } from "vitest";
import { COVERAGE, COVER_GROUPS } from "../coverage";
import { SCENARIOS, scenarioOf } from "../scenarios";
import { resolveDepartmentWinners, setSeatPreference, submitCandidacy, sweep } from "../rules";
import { shiftWorld, type SimWorld } from "../world";

/**
 * **مصفوفةُ التغطية تصير حَكَمًا** — كانت تُرسَم في صفحةٍ لا يفتحها أحد، فتقول «مُغطًّى»
 * ولا يسألها سائل. وههنا تُشغَّل: لكلّ بندٍ سيناريوه، ويُبنى عالمُه، ويُسأل مِجَسُّه.
 * فإن ادّعى بندٌ حالًا لا يبلغها سيناريوه سقط المِعيار، ولم تعد التغطيةُ دعوى.
 *
 * والساعةُ مثبَّتةٌ ههنا: عوالمُ السيناريوهات تُبنى من `now` المُعطى، فلو أخذناه من الجهاز
 * لتبدّل ما نقيسه بين تشغيلين.
 */

const NOW = Date.UTC(2026, 7, 16, 9, 0, 0);
const DAY = 86_400_000;

/**
 * ثلاثةُ بنودٍ لا يبلغها **بذرُ** السيناريو وحدَه، إنّما خطواتُه المكتوبة فوق الشاشة. فتُنفَّذ
 * ههنا بالأفعال نفسِها التي يناديها المحاكي، ويُسأل المِجَسُّ بعدها. وهذا أنفعُ ما في الملفّ:
 * يثبت أنّ **الخطوةَ الموصوفة تبلغ الحالَ الموعودة**، وهو ما لم تكن الصفحةُ تتحقّق منه قطّ.
 */
const REACH: Record<string, (w: SimWorld) => void> = {
  // «ترشّح للمقعد الثاني ثمّ بدّل المفضَّل» — فيصير ترشُّحُه الأوّل مرتبةً ثانية
  "dp-pref": (w) => {
    const r = submitCandidacy(w, "u-m1", "e-head-1", "ب".repeat(150), null);
    expect(r.ok, r.message).toBe(true);
    setSeatPreference(w, "u-m1", 1, "e-head-1");
  },
  // «اضغط إعلان فائزي القسم معًا» — فتُسنَد المناصب
  "ef-assign": (w) => {
    const r = resolveDepartmentWinners(w, "u-pres", 1);
    expect(r.ok, r.message).toBe(true);
  },
  // «قدِّم الساعةَ يومًا واحدًا ودع الكنّاسة تفعلها»
  "ef-sweep": (w) => {
    shiftWorld(w, DAY);
    sweep(w);
  },
};

/** عالمُ البند: بذرُ سيناريوه، ثمّ خطوتُه إن كان لها خطوة. */
function worldFor(key: string, scenario: string): SimWorld {
  const w = scenarioOf(scenario).build(NOW);
  REACH[key]?.(w);
  return w;
}

describe("سلامةُ المصفوفة في نفسها", () => {
  it("لا مفتاحَ مكرّرًا", () => {
    const keys = COVERAGE.map((c) => c.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it("لكلّ بندٍ مجموعةٌ وتسميةٌ عربيّتان", () => {
    for (const c of COVERAGE) {
      expect(c.group.trim(), c.key).not.toBe("");
      expect(c.label.trim(), c.key).not.toBe("");
    }
  });

  // ما لا سيناريو له لا يُبلَغ بضغطة، فادّعاءُ تغطيته كذب
  it("كلُّ بندٍ يسمّي سيناريو قائمًا", () => {
    const known = new Set(SCENARIOS.map((s) => s.key));
    for (const c of COVERAGE) expect(known.has(c.scenario), `${c.key} ⇐ ${c.scenario}`).toBe(true);
  });

  it("المجموعاتُ مشتقّةٌ من البنود بلا تكرار", () => {
    expect(COVER_GROUPS).toEqual([...new Set(COVERAGE.map((c) => c.group))]);
  });

  // ولا سيناريو مهجورٌ في القائمة: كلٌّ يخدم بندًا أو أكثر
  it("كلُّ سيناريو مذكورٌ في بندٍ من بنود التغطية", () => {
    const used = new Set(COVERAGE.map((c) => c.scenario));
    const idle = SCENARIOS.map((s) => s.key).filter((k) => !used.has(k));
    expect(idle).toEqual(["candidate_journey"]); // رحلةُ العضو تُمشى بيدٍ ولا تُقاس بمِجَسّ
  });
});

describe("كلُّ بندٍ يبلغه سيناريوه", () => {
  for (const item of COVERAGE) {
    const suffix = REACH[item.key] ? " (بعد خطوته)" : "";
    it(`${item.group}: ${item.label}${suffix}`, () => {
      expect(item.probe(worldFor(item.key, item.scenario))).toBe(true);
    });
  }
});

/**
 * **والمِجَسُّ يجب أن يميّز**: مِجَسٌّ يقول «نعم» في كلّ عالمٍ لا يقيس شيئًا. فيُسأل كلُّ
 * مِجَسٍّ عن **العالم الفارغ**: لا انتخابَ ولا مرشّحَ ولا صوت. ومن قال «نعم» هناك فليس
 * مِجَسًّا لحال، إلّا مِجَسَّ الفراغ نفسَه.
 */
describe("المِجَسُّ يميّز", () => {
  it("لا مِجَسَّ يصدق على العالم الفارغ إلّا مِجَسَّ الفراغ", () => {
    const empty = scenarioOf("empty").build(NOW);
    const truthy = COVERAGE.filter((c) => c.probe(empty)).map((c) => c.key);
    expect(truthy).toEqual(["ef-empty"]);
  });
});

/**
 * السيناريوهاتُ نفسُها: كلُّ عالمٍ يُبنى مرّتين متطابقتين (لا عشوائيّةَ فيه)، ويفتح على
 * شاشةٍ بهويّةٍ معلومة، وكلُّ معرّفٍ في `start` قائمٌ في عالمه — فلا يُفتح المحاكي على مقعدٍ
 * لا وجودَ له.
 */
describe("السيناريوهات", () => {
  it("البناءُ نقيٌّ: عالمان من بذرةٍ واحدةٍ متطابقان", () => {
    for (const s of SCENARIOS) {
      expect(JSON.stringify(s.build(NOW)), s.key).toBe(JSON.stringify(s.build(NOW)));
    }
  });

  it("لكلّ سيناريو مفتاحٌ فريدٌ وتسميةٌ ووصفٌ وخطوات", () => {
    const keys = SCENARIOS.map((s) => s.key);
    expect(keys.length).toBe(new Set(keys).size);
    for (const s of SCENARIOS) {
      expect(s.label.trim(), s.key).not.toBe("");
      expect(s.about.trim(), s.key).not.toBe("");
      expect(s.steps.length, s.key).toBeGreaterThan(0);
    }
  });

  it("مقعدُ الافتتاح قائمٌ في عالمه", () => {
    for (const s of SCENARIOS) {
      if (!s.start.electionId) continue;
      const w = s.build(NOW);
      expect(w.elections.some((e) => e.id === s.start.electionId), `${s.key} ⇐ ${s.start.electionId}`).toBe(true);
    }
  });

  // مفتاحٌ مجهولٌ يرتدّ إلى الأوّل ولا يُسقط الشاشة
  it("scenarioOf يرتدّ إلى الأوّل عند المجهول", () => {
    expect(scenarioOf("لا شيء")).toBe(SCENARIOS[0]);
    expect(scenarioOf("competition").key).toBe("competition");
  });
});
