import { describe, expect, it } from "vitest";
import {
  ACCESS_LABEL, ACCESS_TYPES, QUESTION_TYPES, QUESTION_TYPE_LABEL, QUESTION_TYPE_VALUES,
  OP_NEEDS, SCALE_MAX, SCALE_MIN, SHARE_ERRORS, STATUS_META, STATUS_OPS,
  SUBMIT_ERRORS, SURVEY_CAN, SURVEY_ROLE_VALUES,
  canEditSurvey, canSurvey, hasChoices, hasScale, isShareLevel, isSurveyRole, shareErrorMessage, submitErrorMessage,
  type LifecycleState, type StatusOp, type SurveyCan, type SurveyRole, type SurveyStatus,
} from "@/app/dashboard/surveys/vocab";

/**
 * دورةُ حياة الاستبيان — **الحالةُ رباعيّة، والأرشفةُ والحذفُ عَلَمان متعامدان** لا حالتان.
 * فالحالاتُ المرئيّةُ ٤ × ٢ × ٢ = ستَّ عشرةَ حالًا، وحرّاسُ الأفعال يقرؤونها الثلاثةَ معًا.
 * وههنا تُمسَح المصفوفةُ كاملةً لكلّ فعل: لا حالٌ تُنسى ولا فعلٌ يُخمَّن.
 */

const STATUSES: SurveyStatus[] = ["draft", "active", "paused", "closed"];

/** الستَّ عشرةَ حالًا كلُّها. */
const ALL_STATES: LifecycleState[] = STATUSES.flatMap((status) =>
  [false, true].flatMap((archived) => [false, true].map((deleted) => ({ status, archived, deleted }))));

const allow = (op: StatusOp, s: LifecycleState) => STATUS_OPS[op].when(s);
const key = (s: LifecycleState) => `${s.status}${s.archived ? "+مؤرشف" : ""}${s.deleted ? "+محذوف" : ""}`;

/** الحالاتُ التي يُسمَح فيها بالفعل، مسمّاةً — يُقارَن بها جدولُ الحقّ. */
const allowedIn = (op: StatusOp) => ALL_STATES.filter((s) => allow(op, s)).map(key).sort();

describe("المصفوفة", () => {
  it("ستَّ عشرةَ حالًا لا تتكرّر", () => {
    expect(ALL_STATES.length).toBe(16);
    expect(new Set(ALL_STATES.map(key)).size).toBe(16);
  });
});

describe("STATUS_OPS: جدولُ الحقّ لكلّ فعل", () => {
  // النشرُ من مسودّةٍ أو من موقوفٍ مؤقّتًا، ولا نشرَ لمؤرشفٍ ولا لمحذوف
  it("publish: من المسودّة والموقوف وحدهما", () => {
    expect(allowedIn("publish")).toEqual(["draft", "paused"].sort());
  });

  it("pause: من النشط وحده", () => {
    expect(allowedIn("pause")).toEqual(["active"]);
  });

  it("close: من النشط والموقوف", () => {
    expect(allowedIn("close")).toEqual(["active", "paused"].sort());
  });

  // «إعادة الفتح» تعيد للنشط مباشرةً وتمسح موعدَ النهاية (سببَ الإغلاق) — والأثرُ في الفعل الخادميّ
  it("reopen: من المنتهي وحده", () => {
    expect(allowedIn("reopen")).toEqual(["closed"]);
  });

  it("archive: لا يُؤرشَف إلّا منتهٍ غيرُ مؤرشفٍ ولا محذوف", () => {
    expect(allowedIn("archive")).toEqual(["closed"]);
  });

  // إلغاءُ الأرشفة يقرأ العَلَم وحدَه: الحالةُ الأربعُ سواءٌ عنده، فأربعُ حالاتٍ مؤرشفةٍ غيرُ محذوفة
  it("unarchive: كلُّ مؤرشفٍ غيرِ محذوفٍ أيًّا كانت حالتُه", () => {
    expect(allowedIn("unarchive")).toEqual(STATUSES.map((s) => `${s}+مؤرشف`).sort());
  });

  // النقلُ إلى المحذوفات بابٌ من كلّ حالٍ ما دام غيرَ محذوف: ثمانٍ (أربعُ حالاتٍ × عَلَم أرشفة)
  it("softDelete: كلُّ ما ليس محذوفًا، مؤرشفًا كان أو لا", () => {
    expect(allowedIn("softDelete").length).toBe(8);
    expect(allowedIn("softDelete").every((k) => !k.includes("محذوف"))).toBe(true);
  });

  it("restore: كلُّ محذوفٍ لا غير", () => {
    expect(allowedIn("restore").length).toBe(8);
    expect(allowedIn("restore").every((k) => k.includes("محذوف"))).toBe(true);
  });
});

describe("قواعدُ المصفوفة كلِّها", () => {
  const OPS = Object.keys(STATUS_OPS) as StatusOp[];

  /** **المحذوفُ بابُه واحد**: لا فعلَ عليه إلّا الاستعادة. */
  it("لا فعلَ على المحذوف إلّا restore", () => {
    for (const s of ALL_STATES.filter((x) => x.deleted)) {
      for (const op of OPS) {
        expect(allow(op, s), `${op} على ${key(s)}`).toBe(op === "restore");
      }
    }
  });

  /** **والمؤرشفُ مجمَّد**: لا يُنشَر ولا يُوقَف ولا يُنهى، إنّما يُرفَع عنه العَلَم أو يُحذَف. */
  it("المؤرشفُ غيرُ المحذوف لا يقبل إلّا unarchive و softDelete", () => {
    for (const s of ALL_STATES.filter((x) => x.archived && !x.deleted)) {
      const open = OPS.filter((op) => allow(op, s)).sort();
      expect(open, key(s)).toEqual(["softDelete", "unarchive"]);
    }
  });

  // لكلّ حالٍ حيّةٍ بابٌ واحدٌ على الأقلّ، فلا استبيانَ يُسجَن بلا مخرج
  it("لكلّ حالٍ فعلٌ ممكنٌ واحدٌ على الأقلّ", () => {
    for (const s of ALL_STATES) {
      expect(OPS.some((op) => allow(op, s)), key(s)).toBe(true);
    }
  });

  // publish و pause و close و reopen يتنافون: لا يجتمع منها اثنان على حالٍ واحدة
  it("أفعالُ الحالة الأربعةُ يتنافى بعضُها ببعض", () => {
    const LIFECYCLE: StatusOp[] = ["publish", "pause", "close", "reopen"];
    for (const s of ALL_STATES) {
      const open = LIFECYCLE.filter((op) => allow(op, s));
      // «النشط» يقبل الإيقافَ والإنهاءَ معًا، و«الموقوف» النشرَ والإنهاء — وما عداهما واحدٌ أو صفر
      expect(open.length, `${key(s)} ⇐ ${open.join("، ")}`).toBeLessThanOrEqual(2);
    }
  });

  it("لكلّ فعلٍ تسميةٌ عربيّةٌ غيرُ فارغة", () => {
    for (const op of OPS) expect(STATUS_OPS[op].label.trim(), op).not.toBe("");
  });
});

describe("STATUS_META", () => {
  it("لكلّ حالةٍ تسميةٌ ونغمة", () => {
    for (const s of STATUSES) {
      expect(STATUS_META[s].label.trim(), s).not.toBe("");
      expect(["success", "warning", "danger", "neutral", "info"]).toContain(STATUS_META[s].tone);
    }
  });

  it("لا حالةَ زائدةٌ عن الأربع", () => {
    expect(Object.keys(STATUS_META).sort()).toEqual([...STATUSES].sort());
  });
});

describe("أنواعُ الأسئلة", () => {
  it("لكلّ نوعٍ تسميةٌ ومجموعة، ولا تكرار", () => {
    expect(QUESTION_TYPE_VALUES.length).toBe(new Set(QUESTION_TYPE_VALUES).size);
    for (const t of QUESTION_TYPES) {
      expect(t.label.trim(), t.value).not.toBe("");
      expect(t.group.trim(), t.value).not.toBe("");
      expect(QUESTION_TYPE_LABEL[t.value]).toBe(t.label);
    }
  });

  // الأنواعُ ذاتُ الخيارات تخزّن `options.choices` وتُجاب بهُويّة الخيار لا نصّه
  it("hasChoices: الثلاثةُ لا غير", () => {
    for (const t of ["single_choice", "multiple_choice", "dropdown"]) expect(hasChoices(t), t).toBe(true);
    for (const t of QUESTION_TYPE_VALUES.filter((v) => !["single_choice", "multiple_choice", "dropdown"].includes(v))) {
      expect(hasChoices(t), t).toBe(false);
    }
  });

  it("hasScale: النجومُ والمقياسُ الخطّيّ لا غير", () => {
    for (const t of ["rating_stars", "linear_scale"]) expect(hasScale(t), t).toBe(true);
    for (const t of QUESTION_TYPE_VALUES.filter((v) => !["rating_stars", "linear_scale"].includes(v))) {
      expect(hasScale(t), t).toBe(false);
    }
  });

  // ولا نوعَ يجمع الخيارات والمقياس معًا: عمودُ `options` شكلٌ واحدٌ لا شكلان
  it("لا نوعَ ذو خياراتٍ ومقياسٍ معًا", () => {
    for (const t of QUESTION_TYPE_VALUES) expect(hasChoices(t) && hasScale(t), t).toBe(false);
  });

  it("hasChoices و hasScale يردّان النوعَ المجهول", () => {
    expect(hasChoices("signature")).toBe(false);
    expect(hasScale("signature")).toBe(false);
    expect(hasChoices("")).toBe(false);
  });

  it("حدودُ المقياس متّسقة", () => {
    expect(SCALE_MIN).toBeLessThan(SCALE_MAX);
  });
});

describe("الوصول", () => {
  it("نوعان لا ثالث، ولكلٍّ تسميتان (مطوّلةٌ للاختيار وقصيرةٌ للشارة)", () => {
    expect(ACCESS_TYPES.map((a) => a.value)).toEqual(["public", "members_only"]);
    for (const a of ACCESS_TYPES) expect(ACCESS_LABEL[a.value].trim(), a.value).not.toBe("");
  });
});

describe("submitErrorMessage", () => {
  // الدالّةُ في القاعدة ترفع برمزٍ ثابت وقد يلحقه `:qid` — يُقصّ قبل الترجمة
  it("يترجم الرمز المعروف", () => {
    expect(submitErrorMessage("already_answered")).toBe(SUBMIT_ERRORS.already_answered);
    expect(submitErrorMessage("not_found")).toBe(SUBMIT_ERRORS.not_found);
  });

  it("يقصّ اللاحقة `:qid` قبل الترجمة", () => {
    expect(submitErrorMessage("required_missing:42")).toBe(SUBMIT_ERRORS.required_missing);
    expect(submitErrorMessage("bad_answer:c3:extra")).toBe(SUBMIT_ERRORS.bad_answer);
  });

  it("المجهولُ يُقال جملةً عامّةً لا رمزًا خامًا في وجه المستخدم", () => {
    for (const raw of ["boom", "", null, undefined, ":"]) {
      expect(submitErrorMessage(raw), String(raw)).toBe("تعذّر إرسال الإجابات. حاول مجدّدًا.");
    }
  });

  it("كلُّ رسائل الأخطاء عربيّةٌ غيرُ فارغة", () => {
    for (const [code, msg] of Object.entries(SUBMIT_ERRORS)) expect(msg.trim(), code).not.toBe("");
  });
});

/**
 * الملكيّةُ والمشاركة (2026-10-08) — **جدولُ الحقّ كاملًا**: أربعةُ أدوارٍ في سبعة أفعال.
 * الواجهةُ تُخفي بها والخادمُ يرفض بها، فخطأٌ ههنا خطأٌ في الاثنين معًا.
 */
describe("SURVEY_CAN: من يفعل ماذا", () => {
  const ALL: SurveyCan[] = ["see", "results", "edit", "lifecycle", "archive", "delete", "share"];
  const allowed = (r: SurveyRole) => ALL.filter((w) => canSurvey(r, w));

  it("صاحبُ الاستبيان يفعل كلَّ شيء", () => {
    expect(allowed("owner")).toEqual(ALL);
  });

  it("حسابُ النادي على المنشور: كلُّ شيءٍ إلّا إدارةَ المشاركة", () => {
    expect(allowed("steward")).toEqual(ALL.filter((w) => w !== "share"));
  });

  it("التحرير: المحتوى ودورةُ الحياة، بلا أرشفةٍ ولا حذفٍ ولا مشاركة", () => {
    expect(allowed("edit")).toEqual(["see", "results", "edit", "lifecycle"]);
  });

  it("يقرأ: الاستبيانُ ونتائجُه وحدهما", () => {
    expect(allowed("read")).toEqual(["see", "results"]);
  });

  it("من لا دور له لا يفعل شيئًا", () => {
    for (const w of ALL) {
      expect(canSurvey(null, w), w).toBe(false);
      expect(canSurvey(undefined, w), w).toBe(false);
    }
  });

  it("المشاركةُ لصاحبه وحده", () => {
    expect(SURVEY_ROLE_VALUES.filter((r) => canSurvey(r, "share"))).toEqual(["owner"]);
  });

  it("كلُّ دورٍ يرى ما يحقّ له رؤيته (لا فعلَ بلا رؤية)", () => {
    for (const r of SURVEY_ROLE_VALUES) {
      if (SURVEY_CAN[r].length) expect(canSurvey(r, "see"), r).toBe(true);
    }
  });
});

describe("OP_NEEDS: كلُّ فعلِ دورةِ حياةٍ له حاجة", () => {
  it("لا فعلَ في STATUS_OPS بلا حاجةٍ مسمّاة", () => {
    expect(Object.keys(OP_NEEDS).sort()).toEqual(Object.keys(STATUS_OPS).sort());
  });

  it("المُحرِّرُ ينشر ويوقف ويُنهي ويعيد الفتح، ولا يؤرشف ولا يحذف", () => {
    const byEditor = (Object.keys(OP_NEEDS) as StatusOp[]).filter((op) => canSurvey("edit", OP_NEEDS[op])).sort();
    expect(byEditor).toEqual(["close", "pause", "publish", "reopen"]);
  });

  it("الشريكُ القارئ لا يملك فعلًا واحدًا", () => {
    expect((Object.keys(OP_NEEDS) as StatusOp[]).filter((op) => canSurvey("read", OP_NEEDS[op]))).toEqual([]);
  });
});

describe("المشاركة: الإذنان والرسائل", () => {
  it("إذنان يطابقان قيد survey_shares_access_check ولفظَي شركاء الباركود", () => {
    expect(isShareLevel("read")).toBe(true);
    expect(isShareLevel("edit")).toBe(true);
    for (const bad of ["view", "owner", "steward", "", null, undefined, 1]) expect(isShareLevel(bad), String(bad)).toBe(false);
  });

  it("الأدوارُ أربعةٌ لا خامس لها", () => {
    for (const r of SURVEY_ROLE_VALUES) expect(isSurveyRole(r)).toBe(true);
    for (const bad of ["admin", "public", "view", "", null, undefined]) expect(isSurveyRole(bad), String(bad)).toBe(false);
  });

  it("رموز القاعدة تُترجَم، والمجهولُ جملةٌ عامّة", () => {
    for (const [code, msg] of Object.entries(SHARE_ERRORS)) expect(shareErrorMessage(code)).toBe(msg);
    expect(shareErrorMessage("boom")).toBe("تعذّر حفظ المشاركة. حاول مجدّدًا.");
    expect(shareErrorMessage(null)).toBe("تعذّر حفظ المشاركة. حاول مجدّدًا.");
  });
});

describe("canEditSurvey: التحريرُ دورٌ وحال", () => {
  const LIVE = { archived: false, deleted: false };
  const PARKED = [{ archived: true, deleted: false }, { archived: false, deleted: true }, { archived: true, deleted: true }];

  it("القائم يحرّره كلُّ من له التحرير", () => {
    expect(SURVEY_ROLE_VALUES.filter((r) => canEditSurvey(r, LIVE))).toEqual(["owner", "steward", "edit"]);
  });

  it("المركونُ لا يحرّره إلّا من يملك إعادتَه", () => {
    for (const st of PARKED) expect(SURVEY_ROLE_VALUES.filter((r) => canEditSurvey(r, st)), JSON.stringify(st)).toEqual(["owner", "steward"]);
  });

  it("لا تحريرَ بلا دور", () => {
    expect(canEditSurvey(null, LIVE)).toBe(false);
  });
});
