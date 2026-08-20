/**
 * **خريطةُ الخروج من أديب لكلّ دورٍ ومنصب** — محرّكُ المعاينة في `/ui/account-deletion`.
 *
 * منقولٌ عن القاعدة لا مخترَع: الأدوارُ من `roles`، وقسمةُ الأبواب من `membership_exit_door`،
 * والقاضون في الطلب من `can_decide_membership_exit`. وهو **مرآةٌ لا مصدر**: إن تغيّرت
 * القاعدة وجب أن يتبعها هذا الملفّ، كما في `elections-sim` سواءً.
 *
 * والأعدادُ لقطةُ ٢٠ أغسطس ٢٠٢٦ مكتوبةً بيد: هذه صفحةٌ في معرضٍ لا يحرسه بابٌ في الإنتاج،
 * فلا تقرأ صفًّا حيًّا ولا تسمّي أحدًا.
 */

/** الوحدةُ التي يقع فيها المنصب — تُقرأ في سطر البطاقة الثاني. */
export type Unit = "عامّ في النادي" | "قسم تنفيذيّ" | "لجنة تنفيذيّة" | "إدارة";

/** أربعةُ أبوابٍ لا خامس، وهي نفسُها قيمُ `membership_exit_door`. */
export type Door = "sealed" | "request" | "end_now" | "delete";

export type RoleCase = {
  key: string;
  /** ما يفرّق بين «عضو» و«عضو»: الاسمُ وحدَه لا يكفي في هذه الشجرة. */
  full: string;
  unit: Unit;
  /** كم يحمله اليوم. */
  holders: number;
  /** ملاحظةٌ تخصّه. */
  caveat?: string;
};

/** أحدَ عشرَ دورًا، ١٦٠ حاملًا. والترتيب من أعلى الشجرة إلى أوسعها. */
export const ROLES: RoleCase[] = [
  { key: "club_president", full: "رئيس نادي أدِيب", unit: "عامّ في النادي", holders: 1,
    caveat: "لا يزيله أحدٌ ولا يزيل نفسَه، فلا مخرجَ لمقعده من الشاشات. وهو استثناءٌ صرّح به المالكُ ولم يسدّه." },
  { key: "executive_council_president", full: "رئيس المجلس التنفيذي", unit: "عامّ في النادي", holders: 1,
    caveat: "من فوقه واحدٌ فقط، فهو قاضي طلبه وحدَه." },
  { key: "president_advisor", full: "مستشار رئيس النادي", unit: "عامّ في النادي", holders: 0 },
  { key: "hr_committee_leader", full: "قائد إدارة الموارد البشرية", unit: "إدارة", holders: 1,
    caveat: "الرئيسان وحدَهما، فلا يقضي في طلب نفسه ولا في طلب نظيره." },
  { key: "qa_committee_leader", full: "قائد إدارة ضمان الجودة", unit: "إدارة", holders: 1,
    caveat: "الرئيسان وحدَهما، كنظيره في الموارد." },
  { key: "department_head", full: "منسّق قسم", unit: "قسم تنفيذيّ", holders: 3 },
  { key: "committee_leader", full: "قائد لجنة", unit: "لجنة تنفيذيّة", holders: 6 },
  { key: "deputy_committee_leader", full: "نائب قائد لجنة", unit: "لجنة تنفيذيّة", holders: 6 },
  { key: "hr_admin_member", full: "عضو إدارة الموارد البشرية", unit: "إدارة", holders: 6,
    caveat: "عضوٌ اسمًا، وفي باب الطلب حكمًا: إدارةٌ لا لجنةٌ تنفيذيّة." },
  { key: "qa_admin_member", full: "عضو إدارة ضمان الجودة", unit: "إدارة", holders: 0,
    caveat: "وقاضيه قائدُ إدارته هو، لا قائدُ الموارد (٢٠ أغسطس)." },
  { key: "committee_member", full: "عضو لجنة تنفيذيّة", unit: "لجنة تنفيذيّة", holders: 135,
    caveat: "وهؤلاء أكثرُ النادي، وخروجُهم لا يُستأذَن فيه بأمر المالك." },
];

/** ومن لا مقعدَ له. */
export type PlainCase = {
  key: string; ar: string; count: string; door: Door; what: string;
  /** حالةٌ لا يعرفها الدستور، بقي بابُها شبكةَ أمانٍ لا طريقًا مسلوكًا. */
  forbidden?: boolean;
};

export const PLAIN: PlainCase[] = [
  { key: "visitor", ar: "صاحبُ حسابٍ بلا عضويّة", count: "151 حسابًا", door: "delete",
    what: "لا عضويّةَ تُنهى، فبابُه بابُ الحذف رأسًا. ومن لا أثرَ له في السجلّ (22 حسابًا) يُمحى محوًا تامًّا فلا يبقى منه صفّ." },
  { key: "member", ar: "عضوٌ حيٌّ بلا منصب", count: "حالةٌ لا يعرفها الدستور", door: "end_now", forbidden: true,
    what: "لا يعرف دستورُ أديب عضوًا حيًّا بلا منصب (قرارُ المالك ٢٠ أغسطس)، فنزل حارسان مؤجَّلان يمنعان نشوءَها: لا يُنزَع آخرُ مقعدٍ عن عضوٍ حيّ، ولا تُحيا عضويّةٌ لمن لا مقعدَ له. والبابُ باقٍ شبكةَ أمانٍ لصفٍّ واحدٍ سابقٍ للحارس ينتظر قضاءَ المالك." },
  { key: "suspended", ar: "عضويّةٌ منتهيةٌ بلا منصب", count: "25 حسابًا", door: "delete",
    what: "عضويّتُه انتهت من قبلُ فلا شيءَ يُنهى، وبابُه الحذفُ رأسًا." },
  { key: "volunteer", ar: "متطوّع", count: "متطوّعٌ واحد", door: "delete",
    what: "التطوّعُ صفةٌ في السجلّ لا عضويّةٌ تُنهى، فبابُه الحذف. وتبقى صفتُه في الأرشيف كما هي." },
];

/* ── الحكم ───────────────────────────────────────────────────────────────────
 * قرارُ المالك ٢٠ أغسطس ٢٠٢٦ بعد أن رأى هذه الصفحةَ نفسَها في جيلها الأوّل: **العضويّةُ
 * تُنهى قبل الحساب لا معه**، وبابُ الخروج يتبدّل بالمقعد لا يستوي فيه الناس.
 */
export type Verdict = { door: Door; label: string; tone: "danger" | "warning" | "success"; line: string };

/** مقعدُ العضويّة في اللجان التنفيذيّة وحدَه يمضي بزرّ، والإدارتان في باب الطلب بأمره. */
const SELF_EXIT = new Set(["committee_member"]);
/** مقعدٌ لا مخرجَ منه: رئيسُ النادي وحدَه، لا يزيله أحدٌ ولا يزيل نفسَه (٢٠ أغسطس). */
const SEALED = new Set(["club_president"]);

export function judge(role: RoleCase): Verdict {
  if (SEALED.has(role.key)) {
    return { door: "sealed", label: "لا مخرج", tone: "danger",
      line: "صاحبُ المنصب يزيل ما دونه لا نفسَه، ولا أحدَ فوقه يزيله. فمقعدُه مختومٌ ولا بابَ له في الشاشات." };
  }
  if (SELF_EXIT.has(role.key)) {
    return { door: "end_now", label: "زرٌّ فوريّ", tone: "success",
      line: "يُنهي عضويّتَه بزرٍّ بسببٍ مكتوب، بلا طلبٍ ولا انتظار، ثمّ يصير صاحبَ حسابٍ فيحذف حسابَه إن شاء." };
  }
  return { door: "request", label: "طلبٌ يُقرّ", tone: "warning",
    line: "يطلب إنهاء عضويّته بسببٍ مكتوب، فيُقضى فيه. وبالقبول تنتهي عضويّتُه وتُنزَع مناصبُه، فيصير صاحبَ حساب." };
}

/**
 * من يقضي في طلب كلّ مقعد — مرآةُ `exit_decider_roles` (٢٠٢٦-٠٨-٢٠).
 * والسلطةُ تتبع مقعدَ الطالب: قائدا الإدارتين للرئيسين، وعضوُ الضمان لقائد إدارته.
 */
const PRESIDENTS = ["رئيس النادي", "رئيس المجلس التنفيذي"];

export function decidersFor(key: string): string[] {
  if (key === "executive_council_president") return ["رئيس النادي"];
  if (key === "president_advisor") return PRESIDENTS;
  if (key === "hr_committee_leader" || key === "qa_committee_leader") return PRESIDENTS;
  if (key === "qa_admin_member") return [...PRESIDENTS, "قائد إدارة ضمان الجودة"];
  return [...PRESIDENTS, "قائد إدارة الموارد البشرية"];
}

/** كم يمضي بزرّه وكم ينتظر قرارًا — الرقمُ يُري ما لا يُريه الوصف. */
export function tally(): { self: number; request: number; sealed: number } {
  let self = 0;
  let request = 0;
  let sealed = 0;
  for (const r of ROLES) {
    const d = judge(r).door;
    if (d === "end_now") self += r.holders;
    else if (d === "request") request += r.holders;
    else sealed += r.holders;
  }
  return { self, request, sealed };
}

/** رحلةُ الخروج بالترتيب: عضويّةٌ أوّلًا ثمّ حساب. */
export const AFTER: { at: string; text: string }[] = [
  { at: "أوّلًا: العضويّة", text: "تنتهي بزرٍّ أو بطلبٍ يُقرّ، والسببُ إجباريٌّ في الحالين. وتُنزَع المقاعدُ معها، فيصير صاحبَ حسابٍ في أديب لا عضوًا." },
  { at: "ثمّ: طلبُ الحذف", text: "يطلب حذفَ حسابه، فتقف رسائلُ النادي، ويُساق خارج غرف اللوحة إلى صفحة حسابه." },
  { at: "خلال 30 يومًا", text: "له أن يعدل بضغطة، فيعود الحسابُ كما كان بلا أثر." },
  { at: "اليوم الثلاثون", text: "يُحذف حسابُ المصادقة فلا دخولَ بعده، ويتحرّر بريدُه لحسابٍ جديد إن عاد." },
  { at: "وبعدُ", text: "يبقى أرشيفُ النادي كاملًا باسمه: عضويّتُه ومناصبُه وأصواتُه وما شارك فيه. ومن لا أثرَ له لا يبقى منه صفّ." },
];
