/**
 * **حسابُ التقييم الربعيّ: المصدرُ الواحد** (لائحة تقييم القيادات، المادتان الخامسة والثامنة).
 *
 * دالّةٌ نقيّة بلا إطارٍ ولا قاعدة: يستعملها منفذُ التنفيذ (`/api/evaluation/execute`) وبابُ
 * التصحيح وصفحةُ «نتيجتي»، ويحرسها `lib/__tests__/evaluationScore.test.ts`. ولماذا هنا لا في SQL
 * (قرار محمد ٢٠٢٦-١٠-٢٠): لو كُتب الحسابُ في القاعدة للتنفيذ وهنا للاختبار لصار له مصدران
 * يفترقان يومًا، والاختبارُ لا يحرس SQL. فالقاعدةُ تجمع الدرجات، وهذه تحكم، والقاعدةُ تكتب الحكم
 * وتتحقّق منه بقيدٍ واحد (`evaluation_targets_verdict_matches`) لا بحسابٍ ثانٍ.
 *
 * ## لماذا كسورٌ صحيحة لا أعدادٌ عشريّة
 * «تُحسب النتيجة بلا تقريب» (م٨/3)، والحدُّ 40% يفصل بين البقاء والاستبعاد (م٩/1). والعشريُّ يخطئ
 * عنده: ٢٥ ورقةً للأعضاء مجموعُها 419 وخمسٌ للمجلس مجموعُها 27 نتيجتُها 40% بالضبط، وحسابُها
 * بالمتوسّطات عشريًّا يعطي 0.4000000000000001، فيبقى في منصبه من أوجبت اللائحةُ استبعادَه. فكلُّ
 * نتيجةٍ هنا كسرٌ (بسطٌ ومقام) من أعدادٍ صحيحة، والمقارنةُ بالضرب
 * التبادليّ، فلا يدخل الحسابَ عددٌ عشريّ أبدًا.
 */

/** بنودُ استبيان الأعضاء (م٦/2): التفاعل، والتفعيل، والتواصل، وعدالة التوزيع، والمتابعة، والتعامل، والقدوة. */
export const MEMBER_ITEMS = 7;
/** بنودُ استبيان المجلس (م٧/2): التفعيل، وجودة المخرجات، والتجاوب، وإدارة الفريق، والتعاون. */
export const COUNCIL_ITEMS = 5;
/** أعلى درجةٍ في البند (م٦/1): من 1 ضعيف جدًا إلى 5 ممتاز. */
export const SCALE = 5;
/** وزنا الشقّين بالعُشر (م٨/2): 70% للأعضاء و30% للمجلس. */
// بـ`BigInt()` لا بحرف `n`: هدفُ الترجمة ES2017 (`tsconfig.json`) لا يقبل حرفيّات BigInt.
const B0 = BigInt(0);
const B1 = BigInt(1);
const B2 = BigInt(2);
const B5 = BigInt(5);
const B10 = BigInt(10);
const W_MEMBERS = BigInt(7);
const W_COUNCIL = BigInt(3);

/** كسرٌ صحيح: البسطُ والمقامُ عددان صحيحان، والمقامُ موجب. */
export type Fraction = { num: number; den: number };

/** ما تجمعه القاعدةُ لكلّ شقّ: مجموعُ الدرجات، وعددُ الأوراق، وعددُ المؤهّلين في اللقطة. */
export type PartTally = { sum: number; ballots: number; eligible: number };

/**
 * فروعُ النتيجة الأربعة (م٥):
 * - `both`: اكتمل نصابُ الأعضاء وفي المجلس ورقة ← 70% و30%.
 * - `members_only`: اكتمل نصابُ الأعضاء ولا ورقةَ في المجلس ← نتيجةُ الأعضاء كاملة (م٥/3).
 * - `council_only`: لم يكتمل نصابُ الأعضاء وفي المجلس ورقة ← نتيجةُ المجلس كاملة (م٥/2).
 * - `none`: خلا الشقّان ← لا نتيجة في هذه الدورة (م٥/3).
 */
export type Branch = "both" | "members_only" | "council_only" | "none";
export type Verdict = "kept" | "removed" | "no_result";

export type Outcome = {
  branch: Branch;
  /** اكتمل نصابُ الأعضاء؟ يُحفظ لتقرير الضمان عن الوحدة التي سقط نصابُها دورتين (م٥/4). */
  membersQuorum: boolean;
  members: Fraction | null;
  council: Fraction | null;
  final: Fraction | null;
  verdict: Verdict;
};

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a < B0 ? -a : a;
}

/** يختزل الكسر ويعيده أعدادًا عاديّة. والأعدادُ هنا صغيرة، لكنّ تجاوزَ الحدّ الآمن يُرفض لا يُبتلَع. */
function toFraction(num: bigint, den: bigint): Fraction {
  const g = gcd(num, den) || B1;
  const n = num / g;
  const d = den / g;
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || d > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("كسرُ التقييم تجاوز الحدّ الآمن للأعداد");
  }
  return { num: Number(n), den: Number(d) };
}

function assertTally(t: PartTally, items: number, label: string): void {
  const ok =
    Number.isSafeInteger(t.sum) &&
    Number.isSafeInteger(t.ballots) &&
    Number.isSafeInteger(t.eligible) &&
    t.ballots >= 0 &&
    t.eligible >= 0 &&
    // كلُّ ورقةٍ مكتملةُ البنود، وكلُّ بندٍ بين 1 و5: فالمجموعُ محصورٌ بين حدّين
    t.sum >= t.ballots * items &&
    t.sum <= t.ballots * items * SCALE;
  if (!ok) throw new RangeError(`مجاميعُ ${label} غيرُ متّسقة`);
}

/** نتيجةُ الشقّ (م٨/1): متوسّطُ جميع درجاته مقسومًا على 5، أي المجموعُ على (البنود × الأوراق × 5). */
export function partScore(t: PartTally, items: number): Fraction | null {
  if (t.ballots === 0) return null;
  return toFraction(BigInt(t.sum), BigInt(t.ballots * items * SCALE));
}

/**
 * نصابُ الأعضاء (م٥/1): «إذا شارك فيه نصفُهم على الأقل». بالضرب لا بالقسمة: خمسةُ مؤهّلين نصفُهم
 * 2.5، فلا يكتمل بأقلّ من ثلاثة. **ويشترط ورقةً واحدةً على الأقل**: لجنةٌ لا مؤهّلَ فيها
 * (صفرٌ من صفر) شقُّها الأوّل فارغ، لا مكتملُ النصاب، فتكون النتيجةُ من المجلس وحده كما في جدول
 * الحالات. ولولا هذا الشرط لقُسم على صفر.
 */
export function membersQuorum(t: PartTally): boolean {
  return t.ballots >= 1 && t.ballots * 2 >= t.eligible;
}

/** هل النتيجةُ 40% أو أقلّ (م٩/1)؟ مقارنةٌ بالضرب التبادليّ: بسط/مقام ≤ 2/5. */
export function atOrBelowThreshold(f: Fraction): boolean {
  return BigInt(f.num) * B5 <= BigInt(f.den) * B2;
}

/** الحكمُ كلُّه لمقيَّمٍ واحد: من مجاميع الشقّين إلى الفرع والنتيجة والحكم. */
export function evaluate(input: { members: PartTally; council: PartTally }): Outcome {
  assertTally(input.members, MEMBER_ITEMS, "الأعضاء");
  assertTally(input.council, COUNCIL_ITEMS, "المجلس");

  const quorum = membersQuorum(input.members);
  const m = quorum ? partScore(input.members, MEMBER_ITEMS) : null;
  const c = partScore(input.council, COUNCIL_ITEMS);
  // نتيجةُ الأعضاء تُحفظ ولو سقط نصابُهم؟ لا: الشقُّ الذي لا يُعتدّ به لا نتيجةَ له (م٥/1).

  let branch: Branch;
  let final: Fraction | null;
  if (m && c) {
    branch = "both";
    // 0.7 × (mN/mD) + 0.3 × (cN/cD) = (7·mN·cD + 3·cN·mD) / (10·mD·cD)
    const [mN, mD, cN, cD] = [BigInt(m.num), BigInt(m.den), BigInt(c.num), BigInt(c.den)];
    final = toFraction(W_MEMBERS * mN * cD + W_COUNCIL * cN * mD, B10 * mD * cD);
  } else if (m) {
    branch = "members_only";
    final = m;
  } else if (c) {
    branch = "council_only";
    final = c;
  } else {
    branch = "none";
    final = null;
  }

  const verdict: Verdict = final === null ? "no_result" : atOrBelowThreshold(final) ? "removed" : "kept";
  return { branch, membersQuorum: quorum, members: m, council: c, final, verdict };
}

/**
 * **النسبةُ كما تُعرض**: منزلةٌ عشريّةٌ واحدة **مقطوعةٌ لا مقرَّبة** (لائحة م٨/3)، وتُحذف «.0».
 *
 * **واستثناءٌ واحد عند الحدّ:** القطعُ وحده يُظهر 40.004% «40.0» فيقرؤها صاحبُها مستبعَدًا وهو باقٍ
 * (والمواصفةُ ٢-٥ أرادت منعَ هذا بالقطع، والقطعُ لا يمنعه). فإن كانت النتيجةُ فوق 40% وقطعُها يساوي
 * 40، زِيدت المنازلُ حتّى يظهر ما فوقها («40.004»). والعكسُ لا يقع: ما كان 40% أو أقلّ لا يُقطع إلى
 * ما فوقها أبدًا. والحسابُ بأعدادٍ صحيحة كالحكم.
 *
 * يعيد الرقمَ نصًّا بلا علامة «%» («43.9»، «44»): العلامةُ والخطُّ اللاتينيّ شأنُ العرض.
 */
export function percentText(f: Fraction): string {
  const num = BigInt(f.num);
  const den = BigInt(f.den);
  const above = !atOrBelowThreshold(f);
  let digits = 1;
  let scaled = (num * BigInt(100) * B10) / den; // القسمةُ الصحيحة تقطع ولا تقرّب
  // منازلُ تُزاد ما دام القطعُ يُظهر الباقيَ على الحدّ؛ والسقفُ يكفي كلَّ كسرٍ تبلغه أوراقُ أدِيب
  while (above && scaled === BigInt(40) * BigInt(10) ** BigInt(digits) && digits < 12) {
    digits += 1;
    scaled = (num * BigInt(100) * BigInt(10) ** BigInt(digits)) / den;
  }
  const s = scaled.toString().padStart(digits + 1, "0");
  const whole = s.slice(0, s.length - digits);
  const frac = s.slice(s.length - digits).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

// ══ الجسرُ إلى القاعدة ═════════════════════════════════════════════════════

/** صفٌّ من `evaluation_tally`: مجاميعُ الشقّين لمقيَّمٍ واحد. */
export type TallyRow = {
  target_id: number;
  m_sum: number;
  m_ballots: number;
  m_eligible: number;
  c_sum: number;
  c_ballots: number;
  c_eligible: number;
};

/**
 * ما يُسلَّم لـ`evaluation_record` و`evaluation_apply_correction` لكلّ مقيَّم: الحكمُ ومعه المجاميعُ التي
 * حُسب عليها، فتطابقها القاعدةُ بالحاضرة قبل الكتابة ولا تكتب حكمًا على أوراقٍ تغيّرت بعده.
 */
export type RecordResult = {
  targetId: number;
  tally: { mSum: number; mBallots: number; mEligible: number; cSum: number; cBallots: number; cEligible: number };
  branch: Branch;
  membersQuorum: boolean;
  members: [number, number] | null;
  council: [number, number] | null;
  final: [number, number] | null;
  verdict: Verdict;
};

const pair = (f: Fraction | null): [number, number] | null => (f ? [f.num, f.den] : null);

export function recordFor(row: TallyRow): RecordResult {
  const o = evaluate({
    members: { sum: row.m_sum, ballots: row.m_ballots, eligible: row.m_eligible },
    council: { sum: row.c_sum, ballots: row.c_ballots, eligible: row.c_eligible },
  });
  return {
    targetId: row.target_id,
    tally: {
      mSum: row.m_sum,
      mBallots: row.m_ballots,
      mEligible: row.m_eligible,
      cSum: row.c_sum,
      cBallots: row.c_ballots,
      cEligible: row.c_eligible,
    },
    branch: o.branch,
    membersQuorum: o.membersQuorum,
    members: pair(o.members),
    council: pair(o.council),
    final: pair(o.final),
    verdict: o.verdict,
  };
}
