import { describe, expect, it } from "vitest";
import {
  GAME_ERRORS,
  LIMITS,
  ROUND_STATE_META,
  ROOM_CODE_LEN,
  cleanText,
  gameError,
  isRoomCode,
  roomPath,
  roundRemainingMs,
  roundState,
  validatePlayerName,
  parseBulkWords,
  type RoundTiming,
} from "@/app/dashboard/games/vocab";
import { LINK_ALPHABET, ROOM_ALPHABET, codeShapeGuard, randomCode } from "@/lib/shortCode";

/* ═══════════════════════ حالُ الجولة ═══════════════════════
   الحالُ **مشتقّةٌ** من أزمنتها لا مخزَّنةٌ عمودًا يتناقض معها، فتُمسَح تركيباتُ
   الأزمنة كلُّها ههنا: لا حالٌ تُخمَّن ولا تركيبةٌ تُنسى. */

const t = (p: Partial<RoundTiming>): RoundTiming => ({
  startedAt: null,
  endedAt: null,
  pausedAt: null,
  pausedMs: 0,
  ...p,
});

const T0 = "2026-08-25T10:00:00.000Z";
const ms = (s: string) => Date.parse(s);

describe("roundState", () => {
  it("لم تبدأ حين لا ختمَ بدءٍ لها", () => {
    expect(roundState(t({}))).toBe("pending");
  });

  it("جاريةٌ حين بدأت ولم توقَف ولم تنتهِ", () => {
    expect(roundState(t({ startedAt: T0 }))).toBe("running");
  });

  it("موقوفةٌ حين لها ختمُ وقف", () => {
    expect(roundState(t({ startedAt: T0, pausedAt: T0 }))).toBe("paused");
  });

  it("النهايةُ تغلب الوقفَ: منتهيةٌ ولو بقي ختمُ وقفٍ عالقًا", () => {
    expect(roundState(t({ startedAt: T0, pausedAt: T0, endedAt: T0 }))).toBe("ended");
  });

  it("لكلّ حالٍ تسميةٌ ونغمة", () => {
    for (const s of ["pending", "running", "paused", "ended"] as const) {
      expect(ROUND_STATE_META[s].label.length).toBeGreaterThan(0);
    }
  });
});

/* ═══════════════════════ ما بقي من الجولة ═══════════════════════
   وهذا موضعُ العطل الحقيقيّ لو أُخطئ: **وقفةُ المضيف يجب ألّا تأكل مهلةَ اللاعب**،
   والمهلةُ يجب ألّا تنزل تحت الصفر ولا تتجاوز كاملَها. */

describe("roundRemainingMs", () => {
  const SIXTY = 60;

  it("الكاملُ قبل البدء", () => {
    expect(roundRemainingMs(t({}), SIXTY, ms("2026-08-25T10:00:30.000Z"))).toBe(60_000);
  });

  it("ينقص بمقدار ما مضى", () => {
    const now = ms("2026-08-25T10:00:20.000Z");
    expect(roundRemainingMs(t({ startedAt: T0 }), SIXTY, now)).toBe(40_000);
  });

  it("لا ينزل تحت الصفر مهما تأخّر السؤال", () => {
    const now = ms("2026-08-25T11:00:00.000Z");
    expect(roundRemainingMs(t({ startedAt: T0 }), SIXTY, now)).toBe(0);
  });

  it("**الرصيدُ المتراكم يُطرح**: عشرُ ثوانٍ وُقفت لا تُحسَب من مهلة اللاعب", () => {
    const now = ms("2026-08-25T10:00:30.000Z"); // مضت ٣٠، منها ١٠ وقفًا
    expect(roundRemainingMs(t({ startedAt: T0, pausedMs: 10_000 }), SIXTY, now)).toBe(40_000);
  });

  it("**الموقوفةُ تتجمّد**: العدُّ يقف عند لحظة الوقف ولا يمضي بمضيّ الساعة", () => {
    const timing = t({ startedAt: T0, pausedAt: "2026-08-25T10:00:15.000Z" });
    const soon = roundRemainingMs(timing, SIXTY, ms("2026-08-25T10:00:16.000Z"));
    const later = roundRemainingMs(timing, SIXTY, ms("2026-08-25T10:05:00.000Z"));
    expect(soon).toBe(45_000);
    expect(later).toBe(45_000);
  });

  it("**المنتهيةُ تُقرأ بختم نهايتها** لا بالساعة الجارية", () => {
    const timing = t({ startedAt: T0, endedAt: "2026-08-25T10:00:25.000Z" });
    expect(roundRemainingMs(timing, SIXTY, ms("2026-08-25T12:00:00.000Z"))).toBe(35_000);
  });

  it("لا يتجاوز كاملَ المهلة ولو جاء ختمُ البدء من المستقبل", () => {
    const timing = t({ startedAt: "2026-08-25T10:00:10.000Z" });
    expect(roundRemainingMs(timing, SIXTY, ms(T0))).toBe(60_000);
  });
});

/* ═══════════════════════ رمزُ الغرفة ═══════════════════════ */

describe("رمزُ الغرفة", () => {
  it("ستّةُ محارفَ من أبجديّة القاعة", () => {
    expect(isRoomCode("G69GRA")).toBe(true);
    expect(isRoomCode("AZSCGS")).toBe(true);
  });

  it("يردُّ ما خالف الطولَ أو الأبجديّة", () => {
    expect(isRoomCode("G69GR")).toBe(false); // أقصر
    expect(isRoomCode("G69GRAA")).toBe(false); // أطول
    expect(isRoomCode("g69gra")).toBe(false); // صغيرة
    expect(isRoomCode("G69GR-")).toBe(false); // محرفٌ دخيل
    expect(isRoomCode("")).toBe(false);
  });

  /**
   * **لا زوجَ ملتبِسًا** — والدقّةُ هنا في الزوج لا في الحرف: تُنفى `0` و`O` معًا،
   * وتُنفى `1` و`I` معًا. أمّا `L` **فباقيةٌ عمدًا**: التباسُها إنّما هو بـ`1` وقد
   * سقطت الأرقامُ دون الاثنين، فلا يبقى لها شبيه. (وهذا وصفُ الأبجديّة الحيّة في
   * القاعدة منذ ٢٠٢٦-٠٥-١٠، وستّةُ رموزٍ مطبوعةٍ عليها.)
   */
  it("**لا زوجَ ملتبِسًا**: يردُّ ما فيه 0 أو O أو 1 أو I", () => {
    for (const bad of ["G69GR0", "G69GRO", "G69GR1", "G69GRI"]) {
      expect(isRoomCode(bad)).toBe(false);
    }
    expect(isRoomCode("G69GRL")).toBe(true);
  });

  it("المسارُ يُبنى من مصدرٍ واحد", () => {
    expect(roomPath("G69GRA")).toBe("/g/G69GRA");
  });
});

describe("shortCode", () => {
  it("الأبجديّتان بلا ملتبِس، وطولاهما ما تعتمد عليه القاعدة", () => {
    for (const ch of "0O1I") expect(ROOM_ALPHABET).not.toContain(ch);
    for (const ch of "01loi") expect(LINK_ALPHABET).not.toContain(ch);
    expect(ROOM_ALPHABET).toHaveLength(32);
    expect(LINK_ALPHABET).toHaveLength(31);
  });

  it("المولّدُ يعطي الطولَ المطلوب من الأبجديّة المطلوبة", () => {
    const guard = codeShapeGuard(ROOM_CODE_LEN, ROOM_ALPHABET);
    for (let i = 0; i < 200; i++) {
      expect(guard(randomCode(ROOM_CODE_LEN, ROOM_ALPHABET))).toBe(true);
    }
  });

  it("لا يعيد القيمةَ نفسَها مرّتين في مئتَي سحبة", () => {
    const seen = new Set(Array.from({ length: 200 }, () => randomCode(ROOM_CODE_LEN, ROOM_ALPHABET)));
    expect(seen.size).toBeGreaterThan(190);
  });
});

/* ═══════════════════════ الاسمُ والتنقية ═══════════════════════ */

describe("اسمُ اللاعب", () => {
  it("يُقبَل ما بين الحدَّين", () => {
    expect(validatePlayerName("محمّد")).toBeNull();
    expect(validatePlayerName("م".repeat(LIMITS.nameMax))).toBeNull();
  });

  it("يُردّ القصيرُ والطويل", () => {
    expect(validatePlayerName("م")).toBe(GAME_ERRORS.GW_INVALID_NAME);
    expect(validatePlayerName("م".repeat(LIMITS.nameMax + 1))).toBe(GAME_ERRORS.GW_INVALID_NAME);
  });

  it("**المسافاتُ لا تصنع اسمًا**: الفراغُ المحضُ يُردّ", () => {
    expect(validatePlayerName("   ")).toBe(GAME_ERRORS.GW_INVALID_NAME);
  });

  it("**محارفُ الاتّجاه الخفيّة تُنقّى ولا تُعَدّ من الطول**", () => {
    // ‏‏ (RLM) يلتصق باللصق العربيّ، وهو غيرُ مرئيّ فلا يفهم كاتبُه لِمَ رُدّ اسمُه.
    expect(cleanText("‏محمّد‎")).toBe("محمّد");
    expect(validatePlayerName("‏م‎")).toBe(GAME_ERRORS.GW_INVALID_NAME);
  });

  it("الاسمُ اللاتينيّ مقبول: لقبٌ في لعبةٍ لا اسمٌ في سجلّ عضويّة", () => {
    expect(validatePlayerName("Mohammad")).toBeNull();
  });
});

/* ═══════════════════════ رسائلُ العطل ═══════════════════════ */

describe("gameError", () => {
  it("يستخرج الرمزَ من نصّ القاعدة ويترجمه", () => {
    expect(gameError("GW_NAME_TAKEN: هذا الاسم مأخوذ")).toBe(GAME_ERRORS.GW_NAME_TAKEN);
    expect(gameError('unexpected error: GW_TIME_UP: انتهى وقت الجولة')).toBe(GAME_ERRORS.GW_TIME_UP);
  });

  it("**لا يُعرَض نصٌّ خامٌّ للمستخدم**: المجهولُ يُقال عامًّا", () => {
    const generic = gameError("PGRST202: could not find function");
    expect(generic).not.toContain("PGRST");
    expect(generic.length).toBeGreaterThan(0);
    expect(gameError(null)).toBe(generic);
    expect(gameError(undefined)).toBe(generic);
    expect(gameError("GW_NOT_A_REAL_CODE: x")).toBe(generic);
  });

  it("كلُّ رسالةٍ عربيّةٌ مكتملة", () => {
    for (const [key, msg] of Object.entries(GAME_ERRORS)) {
      expect(key.startsWith("GW_"), key).toBe(true);
      expect(/[؀-ۿ]/.test(msg), key).toBe(true);
    }
  });
});

/* ═══════════════════════ اللصقُ الجماعيّ ═══════════════════════
   المعنى إجباريٌّ بقرار المالك، والقاعدةُ تحرسه بقيد. وهذه تمنع الرحلةَ إلى القيد
   وتقول للكاتب أيُّ سطرٍ أعوج — فتُمسَح صيغُ اللصق كلُّها ههنا. */

describe("parseBulkWords", () => {
  it("يقرأ «كلمة : معنى» ويقلّم ما حولهما", () => {
    const r = parseBulkWords("سَحاب : الغَيم المتراكم");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{ line: 1, word: "سَحاب", hint: "الغَيم المتراكم" }]);
  });

  it("**يقرأ لصقَ إكسل**: المسافةُ الجدوليّةُ فاصلًا", () => {
    const r = parseBulkWords("سَحاب\tالغَيم\nوَجْد\tالحُزن الشديد");
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.word, x.hint])).toEqual([
      ["سَحاب", "الغَيم"],
      ["وَجْد", "الحُزن الشديد"],
    ]);
  });

  it("**يقسم على أوّل فاصلٍ لا آخره**: المعنى قد يحمل نقطتين", () => {
    const r = parseBulkWords("وَجْد : الحُبّ: شدّتُه");
    expect(r.rows[0]).toEqual({ line: 1, word: "وَجْد", hint: "الحُبّ: شدّتُه" });
  });

  it("**بلا معنًى خطأٌ لا صفٌّ ناقص** (قرار المالك)", () => {
    const r = parseBulkWords("سَلسبيل");
    expect(r.rows).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(1);
    expect(r.errors[0].reason).toContain("معنًى");
  });

  it("والفاصلُ بلا معنًى بعده خطأٌ أيضًا", () => {
    expect(parseBulkWords("سَحاب :").errors).toHaveLength(1);
    expect(parseBulkWords("سَحاب\t   ").errors).toHaveLength(1);
  });

  it("الأسطرُ الفارغةُ تُتخطّى بلا شكوى", () => {
    const r = parseBulkWords("\n\nسَحاب : غَيم\n   \n\nوَجْد : حُزن\n");
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
  });

  it("**رقمُ السطر يشير إلى موضعه في اللصقة** لا إلى ترتيبه بين الصالحات", () => {
    const r = parseBulkWords("\n\nسَحاب : غَيم");
    expect(r.rows[0].line).toBe(3);
  });

  it("**المكرَّرُ داخل اللصقة يُردّ ويُسمّي سابقَه**", () => {
    const r = parseBulkWords("سَحاب : غَيم\nوَجْد : حُزن\nسَحاب : سُحُب");
    expect(r.rows).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(3);
    expect(r.errors[0].reason).toContain("السطر 1");
  });

  it("يردُّ ما تجاوز حدَّ الكلمة أو حدَّ المعنى", () => {
    expect(parseBulkWords(`${"م".repeat(LIMITS.bankWordMax + 1)} : معنى`).errors).toHaveLength(1);
    expect(parseBulkWords(`كلمة : ${"م".repeat(LIMITS.bankHintMax + 1)}`).errors).toHaveLength(1);
  });

  it("محارفُ الاتّجاه الخفيّة تُنقّى من الطرفين معًا", () => {
    const r = parseBulkWords("‏سَحاب‎ : ‏الغَيم‎");
    expect(r.rows[0]).toEqual({ line: 1, word: "سَحاب", hint: "الغَيم" });
  });

  it("لا صفوفَ ولا أخطاءَ من نصٍّ فارغ", () => {
    expect(parseBulkWords("")).toEqual({ rows: [], errors: [] });
    expect(parseBulkWords("   \n  \n")).toEqual({ rows: [], errors: [] });
  });
});
