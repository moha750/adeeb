// كتابة بيانات العضو — **المصدر الواحد**: يقرؤه بابان لا ثالث لهما،
// `dashboard/members/actions.ts` (الإدارة تحرّر عضوًا) و`dashboard/profile/actions.ts`
// (العضو يحرّر نفسه). كلاهما يكتب الأعمدة نفسها بالقيود نفسها، فلو نُسِخ المنطق لافترقا
// يومًا: قيدٌ يُشدَّد هنا ويُنسى هناك، ورسالةُ خطأٍ عربيّة في أحدهما وخطأُ 23514 خام في الآخر.
//
// خادميّ حصرًا (`server-only`) — يكتب بمفتاح الخدمة الذي يتجاوز RLS، فالحراسةُ هنا صريحة:
// الحَكَم `can_edit_member_data` في القاعدة (وفيه بندُ «لكلٍّ بياناتُ نفسه»)، ثمّ حالةُ العضو.
import "server-only";
import type { createAdeebServiceClient } from "@adeeb/core";
import {
  DEGREE_VALUES,
  PHONE_HINT,
  PHONE_RE,
  SOCIAL_KEYS,
  hasAcademicFields,
  socialColumn,
  socialHandle,
  socialLabelOf,
} from "./membershipFields";

/** حقول العضو القابلة للكتابة. الغائب لا يُمَسّ — فمن لا يملك تحرير الاسم لا يمرّره أصلًا. */
export type MemberFields = {
  /** الاسم — تملكه الإدارة وحدها؛ الملفّ الشخصيّ لا يمرّره (هويّةٌ لا يبدّلها صاحبها). */
  name?: string;
  phone?: string;
  degree?: string;
  college?: string;
  major?: string;
  recordNo?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  /** اللون المفضّل `#rrggbb` — يلوّن تهنئة الميلاد. يملكه صاحبُه. */
  favoriteColor?: string;
};

export type MemberWriteResult = { ok: boolean; message: string };

/** صيغة اللون كما تكتبها `ColorField` (مطبَّعةً ستّ خاناتٍ صغيرة) — والثلاثيّة تُقبل وتُمدّ. */
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** يحوّل الفارغ إلى null (للأعمدة التي تقبله)، ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

/**
 * يكتب حقول العضو بعد أن يستوثق من السلطة والحالة والقيود.
 *
 * القيود المرعيّة هنا هي قيود القاعدة نفسها برسائل عربيّة (لا نثق بالعميل، ولا نترك المستخدم
 * أمام رمز خطأ): `academic_degree` محصورٌ بستّة وNOT NULL؛ والحقول الأكاديميّة تتبع الدرجة
 * (`member_details_academic_fields_check`)؛ والجوّال بصيغته (`profiles_phone_check`)؛
 * ومعرّفات التواصل مجرّدةً (`member_details_social_handle_check`).
 *
 * و`member_details` **يُحدَّث ولا يُنشأ**: عمودا `national_id`/`birth_date` NOT NULL وليسا في
 * أيّ نموذجٍ من النموذجين — فمن لا سجلّ له يُبلَّغ صراحةً بما لم يُحفظ.
 */
export async function writeMemberData(
  sb: ReturnType<typeof createAdeebServiceClient>,
  actorId: string,
  userId: string,
  fields: MemberFields,
): Promise<MemberWriteResult> {
  // الحَكَم في القاعدة — يُسأل قبل الكتابة لأنّ مفتاح الخدمة يتجاوز RLS
  const { data: mayEdit, error: aErr } = await sb.rpc("can_edit_member_data", { p_actor: actorId, p_target: userId });
  if (aErr) return { ok: false, message: `تعذّر التحقّق من الصلاحية: ${aErr.message}` };
  if (!mayEdit) return { ok: false, message: "صلاحيتك لا تبلغ بيانات هذا العضو." };

  // عضويّة منتهية (`suspended` ومعها `terminated_at`) سجلٌّ مغلق لا مادّةٌ تُحرَّر. والحكم هنا
  // لا في الواجهة وحدها: هذا المسار يكتب بمفتاح الخدمة فيتجاوز RLS، وإخفاءُ الزرّ يُخفي البابَ
  // ولا يُغلقه. وشرطُه حالتُه لا شاشتُه، فيصمد في كلّ مستدعٍ يأتي لاحقًا.
  const { data: target, error: tErr } = await sb.from("profiles").select("account_status").eq("id", userId).maybeSingle();
  if (tErr) return { ok: false, message: `تعذّر التحقّق من حالة العضو: ${tErr.message}` };
  if (!target) return { ok: false, message: "لا وجود لهذا العضو." };
  if (target.account_status === "suspended") {
    return { ok: false, message: "عضويّة منتهية — لا تُعدَّل بياناتها. أعِد العضوية أوّلًا ثمّ عدّلها." };
  }

  // ── التحقّق ──────────────────────────────────────────────────────────────
  const wantsName = fields.name !== undefined;
  const name = clean(fields.name);
  if (wantsName && (!name || name.length < 2)) return { ok: false, message: "الاسم مطلوب (حرفان على الأقلّ)." };

  const degree = clean(fields.degree);
  if (degree && !DEGREE_VALUES.includes(degree)) return { ok: false, message: "درجة علمية غير معروفة." };

  // **الجوّال إجباريّ** (قرار المالك ٢٠٢٦-٠٨-٠٤): بابُ إكمال السجلّ (`/complete`) يُلزمه
  // أصلًا، فكان الحفظُ بعدهما يفرّغه — يُعطيه العضو مُكرَهًا ثمّ يمحوه، وينقطع الطريق الذي يصله
  // به قائدُه (وزرّ «التواصل» في كروت الأعضاء يختفي بلا رقم). والإلزام هنا لا في النموذجين وحدهما:
  // هذا الكاتب هو مَعبر كلّ تحرير، فالمحوُ يُردّ ولو نُودي الإجراءُ مباشرةً.
  // (وحدُّ الإلزام هنا: العمود ما زال يقبل NULL لسجلٍّ واحدٍ خامل سبق النظام.)
  const phone = clean(fields.phone);
  if (fields.phone !== undefined && !phone) return { ok: false, message: "رقم الجوّال مطلوب." };
  if (phone && !PHONE_RE.test(phone)) return { ok: false, message: `${PHONE_HINT}.` };

  const favoriteColor = clean(fields.favoriteColor);
  if (favoriteColor && !HEX_RE.test(favoriteColor)) {
    return { ok: false, message: "لون غير صالح — الصيغة: ‎#rrggbb." };
  }

  const college = clean(fields.college);
  const major = clean(fields.major);
  const recordNo = clean(fields.recordNo);
  if (hasAcademicFields(degree) && (!college || !major || !recordNo)) {
    return { ok: false, message: "الكلّية والتخصّص والرقم الأكاديميّ مطلوبة لهذه الدرجة العلمية." };
  }
  // الحقول الثلاثة تتبع الدرجة: تُكتب لصاحب الجامعيّة، وتُمحى عن «ثانوية عامة»/«موظف»
  // — والمحو لا يُترك للعميل. ولا درجةَ ⇒ لا سجلّ تفاصيل أصلًا (العمود NOT NULL) فلا تُمَسّ.
  const academic = !degree
    ? {}
    : hasAcademicFields(degree)
      ? { academic_degree: degree, college, major, academic_record_number: recordNo }
      : { academic_degree: degree, college: null, major: null, academic_record_number: null };

  // معرّفات التواصل — تُطبَّع إلى الصيغة المعياريّة (المعرّف مجرّدًا) بنفس مُطبِّع النموذج وقيد
  // القاعدة. وما ليس معرّفًا يُردّ برسالته لا يُمحى صامتًا: كتب المستخدم شيئًا فيُقال له لمَ رُفض.
  const socials: Record<string, string | null> = {};
  for (const key of SOCIAL_KEYS) {
    const res = socialHandle(key, fields[key]);
    if (!res.ok) return { ok: false, message: `${socialLabelOf(key)} — ${res.reason}` };
    socials[socialColumn(key)] = res.handle;
  }

  // ── الكتابة ──────────────────────────────────────────────────────────────
  // ١) الملفّ — يُحدَّث للجميع (لا يعتمد على وجود سجلّ تفاصيل). ولا يُمَسّ إلّا ما مُرِّر.
  const profileCols: Record<string, unknown> = {};
  if (wantsName) profileCols.full_name = name;
  if (fields.phone !== undefined) profileCols.phone = phone;
  if (Object.keys(profileCols).length) {
    const { error: pErr } = await sb.from("profiles").update(profileCols).eq("id", userId);
    if (pErr) return { ok: false, message: `تعذّر تحديث الملفّ الشخصيّ: ${pErr.message}` };
  }

  // ٢) التفاصيل — تحديثٌ لا إنشاء. `select()` يكشف عدد الصفوف المتأثّرة، فنعرف يقينًا هل وُجد السجلّ.
  const detailCols: Record<string, unknown> = { ...academic, ...socials, updated_at: new Date().toISOString() };
  if (fields.favoriteColor !== undefined) detailCols.favorite_color = favoriteColor;
  const { data: touched, error: dErr } = await sb
    .from("member_details")
    .update(detailCols)
    .eq("user_id", userId)
    .select("user_id");
  if (dErr) return { ok: false, message: `حُفظت البيانات الأساسيّة، لكن تعذّر تحديث التفاصيل: ${dErr.message}` };

  if (!touched || touched.length === 0) {
    return {
      ok: false,
      message:
        "حُفظت البيانات الأساسيّة. أمّا البيانات الأكاديميّة والتواصل الاجتماعيّ فلا سجلّ تفاصيل لهذا الحساب يحملها — يُنشأ عند إكمال بيانات الالتحاق.",
    };
  }

  return { ok: true, message: "حُفظت البيانات." };
}
