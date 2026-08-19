import "server-only";
import { cache } from "react";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * **نطاق صاحب الجلسة في الهيكل** — مصدرٌ واحد لتبويبات الهويّة الثلاثة.
 *
 * التبويب يحتاج جوابين لا جوابًا: القدرةُ تفتح الباب (`SECTION_CAP`)، و**الصفُّ الحيّ** يقول
 * إن كانت وراءه غرفة. فقدرةٌ كـ`manage_committee_members` يحملها ثمانية أدوار، وأكثرهم لا
 * لجنةَ له — فلو اكتفى البند بالقفل لعرض لهم بندًا يقول «لا لجنة تقودها». هذا الملفّ هو
 * الجواب الثاني، تقرؤه **القائمة والصفحة** معًا فلا يفترقان.
 *
 * وكلّ سطرٍ هنا مقروءٌ من عمودٍ مُصرَّح، لا رتبةً محفورة (ولا `role_level` — أُعدم):
 *   `committees.leader_role_name` + `council_id='administrative'` → إدارةٌ يقودها  ⇒ «إدارتي»
 *   `user_roles.department_id`                                    → قسمٌ ينسّقه   ⇒ «قسمي»
 *   `council_id='executive'` + `roles.membership_kind='member'`   → مقعدُ قيادةٍ في لجنة ⇒ «لجنتي»
 *
 * والثالث يستحقّ كلمة: `membership_kind` تقول «عضوٌ يجلس في المجلس ويقرّر» مقابل «تابعٌ تحت
 * فرعه» — فالقائد والنائب `member`، وعضو اللجنة `subordinate`. فبها يُعرَف مقعدُ القيادة بلا
 * أن نحفر اسم «نائب» في الكود (لا عمود `deputy_role_name` في `committees` بعد؛ لو أُضيف
 * صارت القراءة أصرح).
 *
 * وهو **عرضٌ لا حراسة**: من كتب المسار في شريط العنوان يردّه حارس الصفحة، والقاعدةُ تردّ
 * كلّ كتابةٍ لا تخصّه (`can_assign_role`).
 */
export type MySeat = { id: number; name: string };

/** إشاراتُ ظهور أبواب الانتخابات للعضو — بوليةٌ لا مقعد: البابُ يظهر حين يصير فعلُه متاحًا. */
export type ElectionSignals = {
  /** له انتخابٌ مفتوحٌ للترشّح ولم يترشّح فيه بعد ⇒ «الترشُّح». */
  canRun: boolean;
  /** له ترشّحٌ قائم (يتابعه/يعدّله/يسحبه/يرى سجلّه) ⇒ «سِجلّ ترشُّحي». */
  hasCandidacy: boolean;
  /** له تصويتٌ مفتوحٌ لم يصوّت فيه ⇒ «التصويت». */
  canVote: boolean;
};

export type MyScope = {
  /** إدارةٌ إداريّة يقودها — «إدارتي»: يضمّ أعضاءها ويوزّع إشرافهم. */
  unit: MySeat | null;
  /**
   * الإداراتُ التي **يبلُغها تعيينُه** — قد تكون أوسعَ من التي يقودها.
   *
   * فالقائدُ يقود واحدةً فهي وحدَها، وأمّا الرئيسان (النادي والتنفيذيّ) فلا يقودان إدارةً
   * وسلطتُهما تبلغ الإدارتين — ولذلك لم تكن الغرفةُ تُفتح لهما (20260819): كانت تسأل
   * «أيَّ إدارةٍ تقود؟» ولا جواب. فصار السؤالُ «أيَّ إدارةٍ تبلُغ؟»، وجوابُه من
   * `admin_units_i_may_staff` وهي تقرأ `can_assign_role` — الحَكَمَ نفسَه الذي يردّ الكتابة.
   *
   * و`unit` تبقى على حالها: هي **مقعدُه** لا مداه، وبها يُسمّى البندُ «إدارتي» لمن له مقعد.
   */
  units: MySeat[];
  /** قسمٌ ينسّقه — «قسمي»: يرى لجانه وقيادتها وأعضاءها، عرضًا محضًا. */
  department: MySeat | null;
  /** لجنةٌ تنفيذيّة له فيها مقعد قيادة (قائدًا أو نائبًا) — «لجنتي»: عرضٌ محض. */
  committee: MySeat | null;
  /** أبواب الانتخابات: تظهر حين يصير فعلُها متاحًا (كالمقاعد: لا بابَ بلا غرفة). */
  elections: ElectionSignals;
};

export const NO_ELECTIONS: ElectionSignals = { canRun: false, hasCandidacy: false, canVote: false };
export const NO_SCOPE: MyScope = { unit: null, units: [], department: null, committee: null, elections: NO_ELECTIONS };

/** مقاعدُ الهيكل الثلاثة — تقرؤها خريطة التنقّل بلا أن تعرف بنيتها. */
export type SeatKind = "unit" | "department" | "committee";
/** إشارةُ بابِ انتخابٍ — تُقرأ من `scope.elections`. */
export type ElectionSignal = keyof ElectionSignals;

export const getMyScope = cache(async function getMyScope(userId: string): Promise<MyScope> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  // بلا مفتاح خدمة لا نستطيع القراءة — فلا نطاق (وحارسُ الصفحة يقول السبب هناك).
  if (!url || !key) return NO_SCOPE;
  const sb = createAdeebServiceClient(url, key);

  // أربعة استعلامات صغيرة: صفوفُ صاحب الجلسة وحده، وثلاثة كتالوجات بأحد عشر صفًّا.
  // (هذا يُقرأ في **كل** صفحة من اللوحة لأنّ القائمة تحتاجه — فلا يجلب الهيكلة كلّها.)
  const [seatsRes, comRes, deptRes, roleRes, sigRes, unitsRes] = await Promise.all([
    sb.from("user_roles").select("role_name, committee_id, department_id").eq("user_id", userId).eq("is_active", true),
    sb.from("committees").select("id, committee_name_ar, council_id, leader_role_name").eq("is_active", true),
    sb.from("departments").select("id, name_ar").eq("is_active", true),
    sb.from("roles").select("role_name, membership_kind"),
    // إشارات أبواب الانتخابات — استعلامٌ واحد يلفّ أهليّة الترشّح/التصويت والترشّح القائم
    sb.rpc("get_member_election_signals", { p_user: userId }),
    // الإداراتُ التي يبلُغها تعيينُه — من `can_assign_role` نفسِها (لا اسمَ دورٍ محفورٌ هنا)
    sb.rpc("admin_units_i_may_staff", { p_actor: userId }),
  ]);
  if (seatsRes.error || comRes.error || deptRes.error || roleRes.error) return NO_SCOPE;

  const seats = seatsRes.data ?? [];
  const committees = comRes.data ?? [];
  const kindOf = new Map((roleRes.data ?? []).map((r) => [r.role_name, r.membership_kind]));
  const deptName = new Map((deptRes.data ?? []).map((d) => [d.id, d.name_ar ?? `قسم #${d.id}`]));
  const comById = new Map(committees.map((c) => [c.id, c]));

  // إشارات الانتخابات — إن تعثّرت لا تُسقط النطاق كلّه (تبقى الأبواب مخفيّة)
  const sig = (sigRes.data as { can_run: boolean; has_candidacy: boolean; can_vote: boolean }[] | null)?.[0];
  const scope: MyScope = {
    unit: null, units: [], department: null, committee: null,
    elections: { canRun: !!sig?.can_run, hasCandidacy: !!sig?.has_candidacy, canVote: !!sig?.can_vote },
  };

  // الصفّ الواحد قد يحمل الوجهين (قسمًا ولجنة) — فيُقرأ الوجهان، ولا يُقصي أحدُهما الآخر
  for (const s of seats) {
    if (s.department_id != null && !scope.department) {
      scope.department = { id: s.department_id, name: deptName.get(s.department_id) ?? `قسم #${s.department_id}` };
    }
    if (s.committee_id == null) continue;
    const c = comById.get(s.committee_id);
    if (!c) continue;
    const name = c.committee_name_ar ?? `وحدة #${c.id}`;
    if (c.council_id === "administrative") {
      // الإدارة لقائدها وحده — وعضوُها (`hr_admin_member`) غرفتُه «من أشرف عليهم»
      if (!scope.unit && c.leader_role_name === s.role_name) scope.unit = { id: c.id, name };
      continue;
    }
    if (!scope.committee && kindOf.get(s.role_name) === "member") scope.committee = { id: c.id, name };
  }

  // **مداه لا مقعده**: الإداراتُ التي يبلُغها تعيينُه. وتعثّرُ الدالّة لا يُسقط النطاق كلّه —
  // يعود المدى إلى مقعده وحده، وهو ما كانت عليه الغرفةُ قبل 20260819.
  const staffable = unitsRes.error ? null : ((unitsRes.data ?? []) as number[]);
  scope.units = staffable
    ? staffable.flatMap((id) => {
        const c = comById.get(id);
        return c ? [{ id, name: c.committee_name_ar ?? `وحدة #${id}` }] : [];
      })
    : scope.unit
      ? [scope.unit]
      : [];

  return scope;
});
