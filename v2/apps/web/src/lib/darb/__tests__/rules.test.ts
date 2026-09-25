import { describe, expect, it } from "vitest";
import { checkName, decodeInput, encodeInput, nameKey, replay, type Press } from "../rules";
import { BLOCKED } from "../blocked";
import { CORE_VERSION } from "../core";
import runs from "./runs.fixture.json";

/**
 * **الجولاتُ الثماني لُعبت في اللعبة نفسِها** (`game3d.html` في كروميوم، بلاعبٍ آليٍّ
 * يبحث أمامه ويسهو بنسبٍ مختلفة)، وحُفظ منها ما يرسله الجهاز: البذرةُ والسجلُّ
 * والتكّاتُ والمسافةُ والمصّاص. فإن أعادها الخادمُ بلبّه فخرج بالأرقام نفسِها، فاللبُّ
 * المنسوخُ هنا هو لبُّ اللعبة حرفًا بحرف. وفيها خصائصُ التقطت (تحليقٌ ودرعٌ ومغناطيسٌ
 * وتمهّل) لأنّها تمسّ السرعةَ والتصادم، وأخطرُ ما يفترق فيه لبّان.
 *
 * **ولمّا تبدّلت الكلماتُ (٢٠٢٦-٠٩-٢٥: تلاحم← كرم، وثبات← هون)** تغيّر طولُها فتغيّر متى تُمنح
 * الخاصيّة، فافترقت الجولاتُ عن عالمها القديم. فأُعيد توليدُ أرقامها **بالضغطات نفسِها** على
 * اللبّ الجديد، وقُطع ما بعد الاصطدام (لاعبٌ آليٌّ لعب عالمًا غيرَ هذا). وتطابقُ لبّ اللعبة ولبّ
 * الخادم تضمنه البصمةُ الواحدة التي يبنيها `tools/site.py` للاثنين، لا هذه الأرقام.
 */
describe("إعادةُ الجولة", () => {
  it("تُطابق كلَّ جولةٍ لُعبت في اللعبة", () => {
    expect(runs.length).toBe(8);
    expect(runs.some((r) => r.powerups > 0)).toBe(true);
    for (const r of runs) {
      const presses = decodeInput(r.input);
      expect(presses).not.toBeNull();
      const got = replay(r.seed, presses!);
      expect(got).toEqual({ ticks: r.ticks, dist: r.dist, candies: r.candies, capped: false });
    }
  });

  it("تُحجَز الجولةُ التي تبلغ الحدَّ حيّةً", () => {
    const r = runs[1];
    const got = replay(r.seed, decodeInput(r.input)!.filter(([s]) => s < 600), 600);
    expect(got?.capped).toBe(true);
    expect(got?.ticks).toBe(600);
  });

  it("تردّ سجلًّا فيه ضغطاتٌ بعد الاصطدام", () => {
    const r = runs[3];
    const presses = [...decodeInput(r.input)!, [r.ticks + 30, 1] as Press];
    expect(replay(r.seed, presses)).toBeNull();
  });

  it("تُعطي النتيجةَ نفسَها في كلّ مرّة", () => {
    const r = runs[0];
    const p = decodeInput(r.input)!;
    expect(replay(r.seed, p)).toEqual(replay(r.seed, p));
  });

  it("للّبّ بصمة", () => {
    expect(CORE_VERSION).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("ترميزُ السجلّ", () => {
  it("يُفكّ كما رُمِّز", () => {
    const log: Press[] = [[0, 3], [0, 1], [45, 4], [1200, 2], [1200, 2], [53999, 3]];
    expect(decodeInput(encodeInput(log))).toEqual(log);
    expect(decodeInput("")).toEqual([]);
  });

  it("يردّ المشوَّه", () => {
    for (const bad of [null, 5, "A.b", "1..2", "-1", ".", "1.", "zzzzzzzzzzz"]) {
      expect(decodeInput(bad)).toBeNull();
    }
  });
});

describe("الاسمُ المستعار", () => {
  const ok = (s: string) => checkName(s, BLOCKED).ok;

  it("يقبل الأسماءَ العاديّة", () => {
    for (const s of ["صقر الأحساء", "نجم الشرقية", "برق", "ريم", "Falcon_7", "أبو سلطان", "كسرى", "أديبة"]) {
      expect(ok(s)).toBe(true);
    }
  });

  it("يوحّد ما يختلف شكلًا لا نطقًا", () => {
    expect(nameKey("صقرُ الأحساء")).toBe(nameKey("صقر الاحساء"));
    expect(nameKey("صقـــر  الأحساء")).toBe(nameKey("صقر الأحساء"));
    expect(nameKey("مكة")).toBe(nameKey("مكه"));
    expect(nameKey("٧٧ برق")).toBe(nameKey("77 برق"));
  });

  it("يردّ الطولَ والرموزَ والأرقامَ وحدَها", () => {
    expect(ok("ب")).toBe(false);
    expect(ok("اسمٌ طويلٌ جدًّا يتجاوز الحدَّ")).toBe(false);
    expect(ok("برق 🔥")).toBe(false);
    expect(ok("12345")).toBe(false);
    expect(ok("برق‮")).toBe(true); // محرفُ الاتّجاه يُسقَط ولا يُرَدّ به الاسم
  });

  it("يحجب الانتحالَ والبذاءة", () => {
    for (const s of ["نادي أديب", "أديب", "Adeeb7", "مشرف اللعبة", "admin", "كس", "ابن الكلب", "FUCK"]) {
      expect(ok(s)).toBe(false);
    }
  });
});
