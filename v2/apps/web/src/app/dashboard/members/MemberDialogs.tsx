"use client";

/**
 * **نوافذُ العضو** — استُخرجت كما هي (٢٠٢٦-١١-٠٣) من `MembersView.tsx` حين انتقلت غرفةُ «أعضاء أدِيب» إلى قالب «قائمة السجلّات»
 * (`_ad/rooms/MembersRoom.tsx`): الملفُّ الشخصيّ وتعديلُه (والإضافة)، وسببُ الإنهاء، والإنهاءُ والنقلُ إلى المتطوّعين، والنقلُ إلى
 * لجنةٍ أخرى، وإعادةُ العضويّة، وإصدارُ الإنذار وشهادةِ الخبرة — بحالاتها ورسائلها و`router.refresh` بعدها. فالقديمةُ والجديدةُ
 * تفتحان النوافذَ نفسَها، ولا تُكتب مرّتين.
 * وتأكيدُ الإعادة وحده يُمرَّر (`confirm`): `ConfirmDialog` في القديمة، و`AdConfirm` في القالب — بديلُه بواجهته نفسِها.
 */
import { useEffect, useState, useTransition, type ComponentProps, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, ModalSectionHeading, Select, Textarea, Modal } from "@adeeb/design-system";
import {
  AddressBook, At, BookOpen, Books, Buildings, CalendarBlank, CalendarX, Certificate, Envelope,
  GraduationCap, Hash, IdentificationBadge, IdentificationCard, NotePencil, Phone, ShareNetwork,
  Tag, User, UsersThree,
} from "@phosphor-icons/react";
import {
  ArrowCounterClockwise, ArrowsClockwise, PencilSimple, Prohibit, Star, WarningCircle,
} from "@/app/_components/glyphs";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { IssueWarningModal } from "./warnings/IssueWarningModal";
import { IssueCertificateModal } from "./certificates/IssueCertificateModal";
import { Avatar } from "../_components/Avatar";
import { useToast } from "../_components/ToastProvider";
import { Cell } from "../_components/Cell";
import { positionLine } from "@/lib/positionLabel";
import { ARABIC_NAME_HINT, arabicNameError } from "@/lib/personName";
import { Section } from "../_components/Section";
import { SOCIAL_ICON } from "../_components/socialIcons";
import { MEMBER_STATUS } from "@/lib/memberStatus";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MemberRow, MoveTarget } from "./data";
import { DEGREES, DEGREE_VALUES, PHONE_RE, PHONE_HINT, PHONE_LEN, PHONE_PREFIX, RECORD_NO_MAX, SOCIAL_KEYS, REASON_KIND, TERMINATION_KINDS, TERMINATION_REASONS, VOLUNTEER_MOVE_KINDS, VOLUNTEER_MOVE_REASONS, hasAcademicFields, isPresetReason, socialHandle, socialLabel, socialLabelOf, socialUrl, terminationKindLabel } from "./vocab";
import { endMembership, moveToVolunteers, restoreMembership, updateMember } from "./actions";
// النقل إسنادٌ لا فعلٌ ثانٍ: البابُ نفسه الذي يفتحه تبويب التعيينات (`assign_position`)، وهي
// تُخلي الموضع القديم وتكتب الجديد في معاملةٍ واحدة. فلا فعلَ خادميّ ثالثٌ يفترق عنهما يومًا.
import { assignPosition } from "./structure/actions";

// الحقول الثلاثة التي تلزم صاحب الدرجة الجامعيّة وحده — ويُمنع منها صاحب «ثانوية عامة» و«موظف».
const ACADEMIC_REQUIRED = [
  { key: "college", message: "الكلّية مطلوبة لهذه الدرجة" },
  { key: "major", message: "التخصّص مطلوب لهذه الدرجة" },
  { key: "recordNo", message: "الرقم الأكاديميّ مطلوب لهذه الدرجة" },
] as const;

// مخطّط التحقّق من نموذج العضو (Zod) — مصدر واحد للقواعد ولنوع النموذج.
// النطاق مقصود: القسم والدور يملكهما `assignments/`، والبريد يملكه `credentials/` (هويّة مصادقة) — فلا يُحرَّران هنا.
const memberSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب (حرفان على الأقلّ)")
    .refine((v) => !arabicNameError(v), ARABIC_NAME_HINT),
  // **إجباريّ** (قرار المالك ٢٠٢٦-٠٨-٠٤): يُلزَم على بابَي الالتحاق، فلا يُفرَّغ بعدهما — لا من
  // صاحبه في «الملف الشخصي» ولا من المدير هنا. والصيغة تفرضها القاعدة بقيد مقابل (`profiles_phone_check`).
  phone: z.string().trim().min(1, "رقم الجوّال مطلوب").regex(PHONE_RE, PHONE_HINT),
  college: z.string().trim().optional(),
  degree: z.string().optional(), // الرمز الخام لا التسمية — القاعدة تحفظ الرمز
  major: z.string().trim().optional(),
  recordNo: z.string().trim().optional(),
  twitter: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  linkedin: z.string().trim().optional(),
  // هل للعضو سجلّ member_details؟ (تُشتقّ لا تُدخَل) — تضبط إلزاميّة الدرجة
  hasDetails: z.boolean(),
}).superRefine((v, ctx) => {
  // العمود NOT NULL ومحصور بستّة — فتُلزَم الدرجة لمن يملك سجلًّا يحملها فقط،
  // وإلّا لتعذّر على مدير أن يصحّح اسم أحد الـ٢٨ الذين لا سجلّ لهم.
  if (v.hasDetails && !DEGREE_VALUES.includes(v.degree ?? "")) {
    ctx.addIssue({ code: "custom", path: ["degree"], message: "الدرجة العلمية مطلوبة" });
  }
  // من له درجة جامعيّة تلزمه الثلاثة — نفس قاعدة القيد member_details_academic_fields_check.
  // ولا نمنع الممتلئ لغير الجامعيّ هنا: النموذج يُخفي حقوله، والفعل الخادميّ يمحوها مهما أُرسل.
  if (v.hasDetails && hasAcademicFields(v.degree)) {
    for (const f of ACADEMIC_REQUIRED) {
      if (!v[f.key]?.trim()) ctx.addIssue({ code: "custom", path: [f.key], message: f.message });
    }
  }
  // معرّفات التواصل — نفس مُطبِّع الفعل الخادميّ وقيد القاعدة. الفارغ مقبول، وما ليس معرّفًا يُردّ بسببه.
  for (const k of SOCIAL_KEYS) {
    const res = socialHandle(k, v[k]);
    if (!res.ok) ctx.addIssue({ code: "custom", path: [k], message: res.reason });
  }
});
type MemberForm = z.infer<typeof memberSchema>;

/** أدنى طول لسبب الإنهاء — نفس عتبة `terminate_membership` في القاعدة (خمسة أحرف). */
const REASON_MIN = 5;

/** خيارات سبب الإنهاء: نصُّ السبب هو قيمتُه — يُملأ به الصندوق ثمّ يُحرَّر (`lib/membershipFields`). */
const REASON_OPTIONS = TERMINATION_REASONS.map((r) => ({ value: r, label: r }));
const VOLUNTEER_REASON_OPTIONS = VOLUNTEER_MOVE_REASONS.map((r) => ({ value: r, label: r }));

/**
 * فئاتُ السبب (٢٠٢٦-١٠-٠٩) — خمسٌ للإنهاء، وثلاثٌ للنقل إلى المتطوّعين (مرآةُ شرط القاعدة).
 * والفئةُ والسببُ المتكرّر متلازمان في النافذة: اختيارُ السبب يختار فئتَه، واختيارُ الفئة ينخل الأسباب.
 */
const KIND_OPTIONS = TERMINATION_KINDS.map((k) => ({ value: k.value as string, label: k.label as string }));
const VOLUNTEER_KIND_OPTIONS = KIND_OPTIONS.filter((k) => (VOLUNTEER_MOVE_KINDS as readonly string[]).includes(k.value));

/** سطرُ النقل إلى المتطوّعين بجنس صاحبه — ومن لا جنسَ في سجلّه يُقال عنه بلا ضمير. */
const VOLUNTEER_MOVE_LINE: Record<"male" | "female" | "none", string> = {
  male: "تنتهي عضويّته ويخلو مقعده، ويصير متطوّعًا نشطًا.",
  female: "تنتهي عضويّتها ويخلو مقعدها، وتصير متطوّعةً نشطة.",
  none: "تنتهي العضويّة ويخلو المقعد، ويصير صاحبها متطوّعًا نشطًا.",
};

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; member: MemberRow }
  | { mode: "view"; member: MemberRow }
  | null;

// منصّات التواصل — التسمية وبانـي الرابط في vocab.ts، والأيقونة في `_components/socialIcons`
// (رُقّيت إلى مصدرٍ واحد يشاركه عرضُ الملفّ هنا وصفحةُ «عضويتي»).

// خليّة بيانات في شبكة عرض الملفّ: أيقونة + تسمية، ثمّ القيمة، وزرّ نسخ (أو رابط للتواصل)
//
// **رُقّيت الخليّة إلى `_components/Cell` مصدرًا واحدًا** يخدم عرضَ الملفّ هنا وجسمَ كرت الاستبيان
// معًا — فلا يصير للسؤال الواحد جوابان (ق٨). تفاصيل العزل بـ<bdi> وقواعد الرُّكن موثّقةٌ هناك.

// قسم عرض الملفّ (فاصل خفيف + شبكة خلاياه) **رُقّي إلى `_components/Section`** مصدرًا واحدًا —
// يخدم نافذة الملفّ هنا وصفحة «عضويتي» معًا، كما رُقّيت `Cell` قبله (ق٨).

// جسم عرض الملفّ: رأس (اسم/دور/شارة) + أقسام معنونة بحقول العضو الحقيقيّة.
// تُخفى الأقسام الخالية (أكاديميّ بلا بيانات · لا تواصل اجتماعيّ · غير منتهٍ)؛ والحقول الفارغة تظهر «غير متوفّر».
// استثناء: اللجنة والقسم والكلّية والتخصّص والرقم الأكاديميّ تُخفى إن خلَت — لأنّ خلوّها يعني أنّ الدور/الدرجة
// لا يحملها أصلًا لا أنّ البيانات ناقصة: الإدارة العليا بلا لجنة ولا قسم، و«ثانوية عامة»/«موظف» بلا كلّية ولا
// تخصّص ولا رقم أكاديميّ — يفرض خلوّها قيدُ member_details_academic_fields_check، فالخلوّ فحصٌ كافٍ هنا.
function ProfileBody({ member, onMove }: { member: MemberRow; onMove?: () => void }) {
  // المنصّات المملوءة فقط — وثلاثٌ منها تترك الأخيرة نصفَ صفّ في شبكة العمودين، فتُمدّ لصفّ كامل
  // التخزين معياريّ (معرّف مجرّد يحرسه member_details_social_handle_check)، فالعرض يزيّن ولا يرقّع:
  // socialLabel يضيف @ للثلاث ويترك لينكدإن، و socialUrl يبني الرابط بلا فحص صيغ.
  const filledSocials = SOCIAL_KEYS.filter((k) => member[k]);
  const socialCells = filledSocials.map((k, i) => {
    const handle = member[k] as string;
    return <Cell key={k} label={socialLabelOf(k)} icon={SOCIAL_ICON[k]} value={socialLabel(k, handle)} lat href={socialUrl(k, handle)} full={filledSocials.length === 3 && i === 2} />;
  });
  const hasAcademic = [member.college, member.major, member.degree, member.recordNo].some((v) => v != null && v !== "");
  // قسم الإنهاء للموقوفين فقط — لا يظهر لعضو أُعيد تفعيله وبقيت لديه بيانات إنهاء قديمة (terminated_at مختوم بتريغر)
  const terminated = member.status === "suspended" && !!(member.endReason || member.endDate);
  return (
    <>
      {/* الرأس كتلةٌ واحدة: إيقاعُه الداخليّ أضيق من فجوة الجسم، فلو تفرّق أبناؤه لفرّقت بينهم */}
      <div className="pvb-head">
        <div className="pvb-name">{member.name}</div>
        <div className="pvb-role">{positionLine(member.role, member.committee) ?? "غير متوفّر"}</div>
        <div className="pvb-badges"><Badge tone={MEMBER_STATUS[member.status].tone} variant="soft" dot live={member.status === "active"}>{MEMBER_STATUS[member.status].label}</Badge></div>
      </div>
      <div className="pva-sections">
        <Section icon={<IdentificationCard />} title="بيانات العضويّة">
          <Cell label="الدور" icon={<Star />} value={member.role} />
          <Cell label="تاريخ الانضمام" icon={<CalendarBlank />} value={member.joined} />
          {member.dept ? <Cell full label="القسم" icon={<Buildings />} value={member.dept} /> : null}
          {/* رُكنُ اللجنة يقول فعلَها لمن يملكه: من فتح الملفّ فرأى لجنته يطلب تغييرها من حيث
              رآها لا من قائمة النقاط. وبلا سلطةٍ يعود الرُّكن نسخًا كسائر الخلايا. */}
          {member.committee ? (
            <Cell
              full label="اللجنة" icon={<UsersThree />} value={member.committee}
              action={onMove ? { icon: <ArrowsClockwise />, label: "نقل إلى لجنة أخرى", onClick: onMove } : undefined}
            />
          ) : null}
        </Section>
        <Section icon={<AddressBook />} title="بيانات التواصل">
          <Cell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value={member.email} />
          <Cell full lat label="رقم الجوّال" icon={<Phone />} value={member.phone} />
        </Section>
        {hasAcademic ? (
          <Section icon={<Books />} title="البيانات الأكاديميّة">
            {member.college ? <Cell full label="الكلّية" icon={<GraduationCap />} value={member.college} /> : null}
            {/* لا full={!major} بعد اليوم: .pva-grid تمدّ اليتيم في صفّه وحدها — القاعدة تُغني عن الترقيع */}
            <Cell label="الدرجة العلمية" icon={<Certificate />} value={member.degree} />
            {member.major ? <Cell label="التخصّص" icon={<BookOpen />} value={member.major} /> : null}
            {member.recordNo ? <Cell full lat label="الرقم الأكاديميّ" icon={<IdentificationCard />} value={member.recordNo} /> : null}
          </Section>
        ) : null}
        {socialCells.length > 0 ? (
          <Section icon={<ShareNetwork />} title="التواصل الاجتماعيّ">
            {socialCells}
          </Section>
        ) : null}
        {terminated ? (
          <Section end icon={<Prohibit />} title="إنهاء العضويّة">
            <Cell full label="فئة السبب" icon={<Tag />} value={member.endKind ? terminationKindLabel(member.endKind) : null} />
            <Cell full label="سبب الإنهاء" icon={<WarningCircle />} value={member.endReason} />
            <Cell full label="تاريخ الإنهاء" icon={<CalendarX />} value={member.endDate} />
            {/* اسمٌ لا يُنسخ — ورُكنُه خالٍ (القاعدة ٨). ومن أُنهي قبل سجلّ النشاط لا فاعلَ له فتقول «غير متوفّر». */}
            <Cell full noCopy label="من أنهى العضوية" icon={<User />} value={member.endBy} />
          </Section>
        ) : null}
      </div>
    </>
  );
}

/** نافذةُ تأكيد الإعادة: `ConfirmDialog` أو بديلُه في القالب (`AdConfirm`) — الواجهةُ واحدة. */
type ConfirmLike = ComponentType<ComponentProps<typeof ConfirmDialog>>;

/**
 * حالاتُ النوافذ وأفعالُها، وما يُرسم منها (`dialogs`) — يضعه المستدعي آخرَ شاشته. و`open*` تفتح كلٌّ نافذتَها على صفٍّ بعينه.
 */
export function useMemberDialogs({ moveTargets = [], warningLimit = 3, confirm: Confirm = ConfirmDialog }: {
  /** وجهاتُ النقل — بلاها لا يُعرض «نقل إلى لجنة أخرى» في الملفّ. */
  moveTargets?: MoveTarget[];
  /** حدُّ الإنذارات — يمرّ إلى نافذة الإصدار. */
  warningLimit?: number;
  confirm?: ConfirmLike;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [modal, setModal] = useState<ModalState>(null);
  // نافذة السبب — نافذةٌ ثانية مستقلّة لا وضعٌ في الأولى: نغمتها ومحتواها وتذييلها مختلفة،
  // وحشرها في ModalState لأثقلت ثلاثة أوضاع بشرطٍ رابع لا يشبهها.
  const [reason, setReason] = useState<MemberRow | null>(null);
  // إنهاء العضوية وإعادتها — نافذتان مستقلّتان: الأولى تطلب سببًا (نصٌّ يُحفظ ويُعرَض بعدها)،
  // والثانية تأكيدٌ مجرّد. والقاعدة هي الحَكَم في الحالين؛ هذه أوراقُها لا حكمُها.
  const [ending, setEnding] = useState<MemberRow | null>(null);
  // والنافذةُ نفسها لبابين: إنهاءٌ مجرّد، أو إنهاءٌ ينقله إلى المتطوّعين — السببُ والسلطةُ واحدان.
  const [endMode, setEndMode] = useState<"end" | "volunteer">("end");
  // حالةٌ واحدة: نصُّ السبب. والقائمة تكتب فيه، والخيارُ المختار يُشتقّ منه — فلا رقمان لسؤال.
  const [endReason, setEndReason] = useState("");
  // وفئتُه حالةٌ ثانية لا تُشتقّ من النصّ: النصُّ يُحرَّر بعد الاختيار، والفئةُ تبقى ما اختير
  const [endKind, setEndKind] = useState("");
  const [endErr, setEndErr] = useState<string | null>(null);
  const [kindErr, setKindErr] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<MemberRow | null>(null);
  // إصدار إنذار — نافذة الغرفة نفسها (مصدرٌ واحد)، مثبّتةً على صاحب الصفّ فلا يُختار غيره
  const [warning, setWarning] = useState<MemberRow | null>(null);
  const [certifying, setCertifying] = useState<MemberRow | null>(null);
  // النقل إلى لجنةٍ أخرى — نافذةٌ مستقلّة كأخواتها، ومعها اللجنةُ المختارة.
  const [moving, setMoving] = useState<MemberRow | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [acting, startAct] = useTransition();
  // نموذج الإضافة/التعديل عبر React Hook Form + Zod
  const editForm = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", phone: "", college: "", degree: "", major: "", recordNo: "", twitter: "", instagram: "", tiktok: "", linkedin: "", hasDetails: false },
  });
  const member = modal && modal.mode !== "add" ? modal.member : null;
  const openEdit = (m: MemberRow) => setModal({ mode: "edit", member: m });
  const openView = (m: MemberRow) => setModal({ mode: "view", member: m });
  const openAdd = () => setModal({ mode: "add" });
  const close = () => setModal(null);

  // تعبئة النموذج عند فتح الإضافة/التعديل (قيم العضو أو فارغة)
  useEffect(() => {
    if (!modal || modal.mode === "view") return;
    const m = modal.mode === "edit" ? modal.member : null;
    editForm.reset({
      name: m?.name ?? "",
      phone: m?.phone ?? "",
      college: m?.college ?? "",
      degree: m?.degreeRaw ?? "", // الرمز لا التسمية — قيمة الخيار في القائمة رمزٌ
      major: m?.major ?? "",
      recordNo: m?.recordNo ?? "",
      twitter: m?.twitter ?? "",
      instagram: m?.instagram ?? "",
      tiktok: m?.tiktok ?? "",
      linkedin: m?.linkedin ?? "",
      // العمود NOT NULL، فوجود درجةٍ يكافئ وجود سجلّ التفاصيل
      hasDetails: m?.degreeRaw != null,
    });
  }, [modal, editForm]);

  // `hasDetails` مشتقٌّ يضبط التحقّقَ وحده، فيُنزع ولا يُرسَل
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSubmitMember = editForm.handleSubmit(({ hasDetails: _hasDetails, ...data }) => {
    if (!member) {
      // الإضافة لم تُوصَل بعد — نقولها بدل ادّعاء النجاح
      toast.error("إضافة الأعضاء غير متاحة من هنا بعد.");
      return;
    }
    startSave(async () => {
      const r = await updateMember({ userId: member.id, ...data });
      if (r.ok) { toast.success(r.message); close(); router.refresh(); } else toast.error(r.message);
    });
  });

  const openEnd = (m: MemberRow, mode: "end" | "volunteer" = "end") => {
    setEndReason(""); setEndKind(""); setEndErr(null); setKindErr(null); setEndMode(mode); setEnding(m);
  };
  // الأسبابُ المتكرّرة منخولةً بالفئة المختارة (وبلا فئةٍ كلُّها)
  const presetOptions = (endMode === "volunteer" ? VOLUNTEER_REASON_OPTIONS : REASON_OPTIONS)
    .filter((o) => !endKind || REASON_KIND[o.value] === endKind);
  const submitEnd = () => {
    const target = ending;
    if (!target) return;
    // المحفوظُ ما في الصندوق دائمًا — اختِير من القائمة أو كُتب باليد أو زِيد عليه
    const reason = endReason.trim();
    const kindMissing = !endKind;
    if (kindMissing) setKindErr("اختر فئة السبب.");
    if (reason.length < REASON_MIN) { setEndErr(`اذكر سبب إنهاء العضوية (${REASON_MIN} أحرف فأكثر).`); return; }
    if (kindMissing) return;
    startAct(async () => {
      const toVolunteer = endMode === "volunteer";
      const r = toVolunteer
        ? await moveToVolunteers({ userId: target.id, reason, kind: endKind })
        : await endMembership({ userId: target.id, reason, kind: endKind });
      if (r.ok) {
        toast.success(toVolunteer
          ? `${target.gender === "female" ? "نُقلت" : "نُقل"} «${target.name}» إلى المتطوّعين.`
          : `أُنهيت عضوية «${target.name}».`);
        setEnding(null);
        router.refresh();
      } else toast.error(r.message);
    });
  };
  const submitRestore = () => {
    const target = restoring;
    if (!target) return;
    startAct(async () => {
      const r = await restoreMembership({ userId: target.id });
      if (r.ok) { toast.success(`أُعيدت عضوية «${target.name}».`); setRestoring(null); router.refresh(); } else toast.error(r.message);
    });
  };

  // النقل إلى لجنةٍ أخرى — إسنادُ مقعد «عضو لجنة» في الوجهة، و`assign_position` تُخلي لجنتَه
  // القديمة في المعاملة نفسها. فلا خطوتان («أخرِجه» ثمّ «أدخِله») يقع بينهما عضوٌ بلا لجنة.
  const openMove = (m: MemberRow) => { setMoveTo(""); setMoving(m); };
  const submitMove = () => {
    const target = moving;
    if (!target || !moveTo) return;
    const to = moveTargets.find((c) => String(c.id) === moveTo);
    startAct(async () => {
      const r = await assignPosition({ userId: target.id, roleName: "committee_member", committeeId: Number(moveTo) });
      if (r.ok) { toast.success(`نُقل «${target.name}» إلى ${to?.name ?? "اللجنة الجديدة"}.`); setMoving(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const dialogs = (
    <>
      <Modal
        open={modal !== null}
        onClose={close}
        busy={saving}
        title={modal?.mode === "view" ? (member?.name ?? "الملفّ الشخصيّ") : modal?.mode === "add" ? "إضافة عضو" : "تعديل العضو"}
        description={
          modal?.mode === "view" ? undefined
            : modal?.mode === "add" ? "أدخِل بيانات العضو الجديد." : "حدّث بيانات العضو ثمّ احفظ."
        }
        size="md"
        className={modal?.mode === "view" ? "pvb-modal" : undefined}
        hero={
          modal?.mode === "view" && member ? (
            <Avatar name={member.name} src={member.avatar ?? undefined} gender={member.gender} size="2xl" status={MEMBER_STATUS[member.status].dot} className="pvb-av" />
          ) : undefined
        }
        footer={
          modal?.mode === "view" ? (
            <>
              <Button variant="ghost" size="md" onClick={close}>إغلاق</Button>
              {/* «تعديل» يتبع سلطتك على هذا العضو بعينه — والمنتهية عضويّته لا تُحرَّر بياناته */}
              {member?.canEdit && member.status !== "suspended"
                ? <Button variant="primary" size="md" onClick={() => openEdit(member)}>تعديل</Button>
                : null}
            </>
          ) : modal?.mode === "edit" ? (
            // نافذةُ البيانات للبيانات وحدها: الإنهاءُ والنقلُ إلى المتطوّعين في قائمة النقاط لا هنا (قرار المالك ٢٠٢٦-١٠-٠٨)
            <>
              <Button variant="ghost" size="md" onClick={close} disabled={saving}>إلغاء</Button>
              <Button type="submit" form="member-form" variant="primary" size="md" loading={saving}>حفظ التغييرات</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={close}>إلغاء</Button>
              <Button type="submit" form="member-form" variant="primary" size="md">إضافة العضو</Button>
            </>
          )
        }
      >
        {modal?.mode === "view" && member ? (
          // النافذةُ تُغلَق قبل نافذة النقل — لا نافذتان فوق بعض
          <ProfileBody
            member={member}
            onMove={member.canMove && moveTargets.length > 0 ? () => { close(); openMove(member); } : undefined}
          />
        ) : (
          <form id="member-form" className="form-grid" onSubmit={onSubmitMember} noValidate>
            <ModalSectionHeading icon={<IdentificationBadge />} title="البيانات الأساسيّة" />
            <Field className="form-full" label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب الاسم" error={editForm.formState.errors.name?.message} required {...editForm.register("name")} />

            <ModalSectionHeading icon={<AddressBook />} title="بيانات التواصل" />
            {/* البريد هويّة مصادقة لا بيان تواصل: يُغيَّر من «بيانات الدخول» حيث يُزامَن مع auth.users — كتابته هنا وحده تفكّ المزامنة */}
            <Field className="form-full" label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" error={editForm.formState.errors.phone?.message} required {...editForm.register("phone")} />
            <Field className="form-full" label="البريد الإلكترونيّ" type="email" charset="latin" disabled readOnly value={member?.email ?? ""} icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" helper="يُغيَّر من «بيانات الدخول»." />

            {member && member.degreeRaw == null ? (
              <Alert className="form-full" tone="warning" title="لا سجلّ تفاصيل لهذا العضو">
                البيانات الأكاديميّة والتواصل الاجتماعيّ لن تُحفظ له: سجلّها يُنشأ عند إكمال بيانات الالتحاق. أمّا الاسم ورقم الجوّال فيُحفظان.
              </Alert>
            ) : null}

            <ModalSectionHeading icon={<Books />} title="البيانات الأكاديميّة" />
            <Controller
              control={editForm.control}
              name="degree"
              render={({ field }) => (
                <Select className="form-full" label="الدرجة العلمية" icon={<Certificate />} options={DEGREES} value={field.value ?? ""} onValueChange={field.onChange} error={editForm.formState.errors.degree?.message} required />
              )}
            />
            {/* إنقاصُ الدرجة عن جامعيّة محوٌ لا رجعة فيه: الفعل الخادميّ يكتب null في الثلاثة، ولا نسخة
                تحفظها (لا مؤقّت تدقيق على member_details ولا لقطات). فيُحذَّر قبل الحفظ لا بعده.
                الشرط يقارن درجة القاعدة بالمختارة: يظهر حين كانت جامعيّة فصارت غير جامعيّة — لا عند فتح
                النافذة على عضوٍ غير جامعيّ أصلًا (لا شيء عنده ليُمحى). */}
            {member && hasAcademicFields(member.degreeRaw) && !hasAcademicFields(editForm.watch("degree")) ? (
              <Alert className="form-full" tone="danger" title="ستُمحى بياناته الأكاديميّة عند الحفظ">
                كلّيته وتخصّصه ورقمه الأكاديميّ تُحذف نهائيًّا، لا نسخة منها ولا استرجاع. وإن أعدت درجته جامعيّةً لاحقًا، فأدخِلها من جديد.
              </Alert>
            ) : null}

            {/* الحقول الثلاثة تتبع الدرجة: تظهر لصاحب الدرجة الجامعيّة وحده. «ثانوية عامة» و«موظف» لا كلّية
                لهما ولا تخصّص ولا رقم أكاديميّ — تُخفى هنا، ويمحوها الفعل الخادميّ، ويردّ الممتلئ قيدُ القاعدة. */}
            {hasAcademicFields(editForm.watch("degree")) ? (
              <>
                <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={editForm.formState.errors.college?.message} required {...editForm.register("college")} />
                <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={editForm.formState.errors.major?.message} required {...editForm.register("major")} />
                <Field className="form-full" label="الرقم الأكاديميّ" charset="digits" maxLength={RECORD_NO_MAX} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" error={editForm.formState.errors.recordNo?.message} required {...editForm.register("recordNo")} />
              </>
            ) : null}

            <ModalSectionHeading icon={<ShareNetwork />} title="التواصل الاجتماعيّ" />
            {/* الأربعة على نسق واحد فتُبنى من SOCIAL_KEYS — لا أربع نسخ تفترق يومًا.
                onBlur يُطبّع ما لُصق فورًا (رابط ⇐ معرّف · @معرّف ⇐ معرّف)، فيرى المدير الصيغة المخزَّنة
                لا ما كتبه. وما ليس معرّفًا لا يُطبَّع صامتًا: يبقى كما هو ويقول Zod سببه. */}
            {SOCIAL_KEYS.map((k) => (
              <Field
                key={k}
                label={socialLabelOf(k)}
                charset="latin"
                icon={SOCIAL_ICON[k]}
                innerIcon={<At />}
                placeholder="المعرّف أو رابط الحساب"
                optional
                error={editForm.formState.errors[k]?.message}
                {...editForm.register(k, {
                  onBlur: (e) => {
                    const res = socialHandle(k, (e.target as HTMLInputElement).value);
                    if (res.ok) editForm.setValue(k, res.handle ?? "", { shouldValidate: true });
                  },
                })}
              />
            ))}
          </form>
        )}
      </Modal>

      {/* نافذة السبب — تكشف ما طُوي بـ«…» في الجدول والكرت. القاعدة ٩: النغمة تُعلَن مرّةً على
          النافذة (`mdl-tone-danger`) فيتبعها الغلاف والأفتار والاسم؛ ولا تصميم خاصّ لمتنها —
          قسم الإنهاء يجعل القيمة تلتفّ كاملةً، فالسبب خليّةٌ عاديّة كما في المعرض. */}
      <Modal
        open={reason !== null}
        onClose={() => setReason(null)}
        title={reason ? `سبب إنهاء العضوية: ${reason.name}` : "سبب إنهاء العضوية"}
        size="sm"
        className="pvb-modal mdl-tone-danger"
        hero={reason ? <Avatar name={reason.name} src={reason.avatar ?? undefined} gender={reason.gender} size="2xl" status="busy" className="pvb-av" /> : undefined}
        // «إغلاق» يتبع نغمة النافذة (ghost-danger) — الزرّ الوحيد في تذييلٍ منغَّم يلبس نغمته
        footer={<Button variant="ghost-danger" size="md" onClick={() => setReason(null)}>إغلاق</Button>}
      >
        {reason ? (
          <>
            <div className="pvb-head">
              <div className="pvb-name">{reason.name}</div>
              <div className="pvb-role">{reason.endAgo ? `عضوية منتهية ${reason.endAgo}` : "عضوية منتهية"}</div>
            </div>
            <div className="pva-sections">
              <Section end icon={<Prohibit />} title="سبب إنهاء العضوية">
                <Cell full noCopy label="فئة السبب" icon={<Tag />} value={reason.endKind ? terminationKindLabel(reason.endKind) : null} />
                <Cell full noCopy label="سبب الإنهاء" icon={<WarningCircle />} value={reason.endReason} />
                <Cell full noCopy label="تاريخ الإنهاء" icon={<CalendarX />} value={reason.endDate} />
                <Cell full noCopy label="من أنهى العضوية" icon={<User />} value={reason.endBy} />
              </Section>
            </div>
          </>
        ) : null}
      </Modal>

      {/* إنهاء العضوية — نافذة السبب. السبب يُحفظ في `termination_reason` ويُقرأ بعدها في الجدول
          والكرت ونافذة السبب، فلا يُطلب زينةً: القاعدة ترفض ما دون خمسة أحرف، وهذا يقولها قبل الرحلة. */}
      <Modal
        open={ending !== null}
        onClose={() => setEnding(null)}
        busy={acting}
        title={endMode === "volunteer"
          ? (ending ? `نقل «${ending.name}» إلى المتطوّعين؟` : "نقل إلى المتطوّعين")
          : (ending ? `إنهاء عضوية «${ending.name}»؟` : "إنهاء العضوية")}
        description={endMode === "volunteer"
          ? VOLUNTEER_MOVE_LINE[ending?.gender ?? "none"]
          : "تُنقَل العضويّة إلى «الأعضاء السابقين»، ولا تُحرَّر بياناتها بعدها حتّى تُعاد."}
        // متوسّطة لا صغيرة: الأسباب جملٌ تامّة، وفي الضيّقة يُقصّ نصفُ الجملة في الحقل المغلق —
        // ولا يُقدَم على فعلٍ هدّامٍ بسببٍ لا يُقرأ كاملًا لحظةَ الإرسال.
        size="md"
        className={endMode === "volunteer" ? "mdl-tone-warning" : "mdl-tone-danger"}
        footer={endMode === "volunteer" ? (
          <>
            <Button variant="ghost-warning" size="md" onClick={() => setEnding(null)} disabled={acting}>إلغاء</Button>
            <Button variant="warning" size="md" loading={acting} onClick={submitEnd}>نقل إلى المتطوّعين</Button>
          </>
        ) : (
          <>
            <Button variant="ghost-danger" size="md" onClick={() => setEnding(null)} disabled={acting}>إلغاء</Button>
            <Button variant="danger" size="md" loading={acting} onClick={submitEnd}>إنهاء العضوية</Button>
          </>
        )}
      >
        {/* الأسبابُ المتكرّرة **معينةً على الكتابة لا بديلًا عنها**: الاختيار يملأ الصندوق
            أسفله وحسب، والصندوقُ هو المحفوظ — يُزاد عليه تفصيلُ الواقعة أو يُمحى ويُكتب غيره.
            والخيارُ المختار يُشتقّ من النصّ: فإن حُرِّر لم يعد يطابق سببًا، فتفرغ القائمة صادقةً. */}
        {/* الفئةُ أوّلًا وإلزامًا: عليها تُجمَع أسبابُ الخروج، والنصُّ تحتها تفصيلُها */}
        <Select
          label="فئة السبب"
          icon={<Tag />}
          tone={endMode === "volunteer" ? "warning" : "danger"}
          required
          placeholder="اختر فئة"
          options={endMode === "volunteer" ? VOLUNTEER_KIND_OPTIONS : KIND_OPTIONS}
          value={endKind}
          error={kindErr ?? undefined}
          onValueChange={(v) => {
            setEndKind(v); setKindErr(null);
            // سببٌ مختارٌ من فئةٍ أخرى لم يعد يصدق عليها، فيُفرَّغ الصندوق ليُكتب لها
            if (isPresetReason(endReason) && REASON_KIND[endReason.trim()] !== v) setEndReason("");
          }}
        />
        {/* وفئةٌ لا سببَ متكرّرًا فيها («أسباب أخرى») يسقط عنها الحقل: قائمةٌ فارغةٌ وعدٌ بلا شيء */}
        {presetOptions.length > 0 ? (
          <Select
            label="أسباب متكرّرة"
            icon={<Prohibit />}
            tone={endMode === "volunteer" ? "warning" : "danger"}
            optional
            placeholder="اختر سببًا"
            options={presetOptions}
            value={isPresetReason(endReason) ? endReason.trim() : ""}
            onValueChange={(v) => { setEndReason(v); setEndErr(null); if (REASON_KIND[v]) { setEndKind(REASON_KIND[v]); setKindErr(null); } }}
          />
        ) : null}
        <Textarea
          label="سبب إنهاء العضوية"
          icon={<Prohibit />}
          innerIcon={<NotePencil />}
          placeholder="مثال: انقطاع عن الحضور شهرين بلا عذر"
          rows={4}
          required
          value={endReason}
          error={endErr ?? undefined}
          onChange={(e) => { setEndReason(e.target.value); if (endErr) setEndErr(null); }}
        />
      </Modal>

      {/* نقلٌ إلى لجنةٍ أخرى — نغمةٌ محايدة: ترتيبٌ إداريّ لا عقوبة ولا استبدالُ شاغل.
          والوجهةُ تُنخل من لجنته الحاليّة (لا يُعرَض عليك نقلُه إلى حيث هو). */}
      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        busy={acting}
        title={moving ? `نقل «${moving.name}» إلى لجنة أخرى` : "نقل إلى لجنة أخرى"}
        description="يخرج من لجنته الحاليّة ويُضمّ إلى المختارة في خطوةٍ واحدة. ولا يمسّ ذلك حالتَه ولا بياناته."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setMoving(null)} disabled={acting}>إلغاء</Button>
            <Button variant="primary" size="md" loading={acting} disabled={!moveTo} onClick={submitMove}>نقل</Button>
          </>
        }
      >
        <Select
          label="اللجنة الجديدة"
          icon={<UsersThree />}
          searchable
          options={moveTargets.filter((c) => c.id !== moving?.committeeId).map((c) => ({ value: String(c.id), label: c.name }))}
          value={moveTo}
          onValueChange={setMoveTo}
          helper={moving?.committee ? `لجنته الآن: ${moving.committee}` : undefined}
          required
        />
      </Modal>

      <Confirm
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        tone="success"
        icon={<ArrowCounterClockwise />}
        title="إعادة العضوية؟"
        text={restoring ? `يعود «${restoring.name}» عضوًا نشطًا، ويُمحى سبب الإنهاء وتاريخه.` : undefined}
        confirmLabel="إعادة العضوية"
        loading={acting}
        onConfirm={submitRestore}
      />

      {warning ? (
        <IssueWarningModal
          open
          limit={warningLimit}
          preselect={warning.id}
          targets={[{
            id: warning.id,
            name: warning.name,
            phone: warning.phone,
            avatar: warning.avatar,
            gender: warning.gender,
            committeeId: warning.committeeId,
            committee: warning.committee,
            // القطعتان كما بناهما `getMembers`: `role` رتبتُه، و`committee` وحدةُ إسناده —
            // وهما نفسُهما قطعتا سطر النداء في الخطاب.
            roleAr: warning.role,
            scope: warning.committee,
            activeCount: warning.warnCount,
            joinedDate: warning.joinedRaw || null,
          }]}
          onClose={() => { setWarning(null); router.refresh(); }}
        />
      ) : null}

      {certifying ? (
        <IssueCertificateModal
          open
          preselect={certifying.id}
          // اللقطة المقترَحة من القاعدة (`certificate_targets`) لا من صفّ الشاشة — فما يُراجَع
          // هنا هو ما ستكتبه الدالّة نفسها إن تُرك على حاله.
          targets={[{
            id: certifying.id,
            name: certifying.name,
            suggestedName: certifying.certName ?? certifying.name,
            avatar: certifying.avatar,
            gender: certifying.gender,
            phone: certifying.phone,
            ended: certifying.status !== "active",
            positionTitle: certifying.certPosition,
            joinedDate: certifying.joinedRaw || null,
            issuedCount: certifying.certCount,
          }]}
          onClose={() => { setCertifying(null); router.refresh(); }}
        />
      ) : null}
    </>
  );

  return {
    openView, openEdit, openAdd, openEnd, openMove,
    openReason: setReason, openRestore: setRestoring, openWarning: setWarning, openCertify: setCertifying,
    dialogs,
  };
}
