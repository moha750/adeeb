"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, ModalSectionHeading, Select, Stat, Textarea, matchesSearch } from "@adeeb/design-system";
import { AddressBook, ArrowCounterClockwise, At, BookOpen, Books, Buildings, CalendarBlank, CalendarX, Certificate, Envelope, Eye, GraduationCap, Hash, IdentificationBadge, IdentificationCard, MagnifyingGlass, NotePencil, PencilSimple, Phone, Plus, Prohibit, ShareNetwork, ShieldWarning, Star, Trash, User, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { Modal } from "../_components/Modal";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { MemberCard } from "./MemberCard";
import { IssueWarningModal } from "./warnings/IssueWarningModal";
import { IssueCertificateModal } from "./certificates/IssueCertificateModal";
import type { MenuGroup } from "../_components/DropdownMenu";
import { Pagination } from "../_components/Pagination";
import { Avatar } from "../_components/Avatar";
import { EmptyState } from "../_components/EmptyState";
import { Skeleton } from "../_components/Skeleton";
import { useToast } from "../_components/ToastProvider";
import { Cell } from "../_components/Cell";
import { Section } from "../_components/Section";
import { SOCIAL_ICON } from "../_components/socialIcons";
import { MEMBER_STATUS } from "@/lib/memberStatus";
import { waHref } from "@/lib/whatsapp";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { MemberRow, MemberStatus } from "./data";
import { DEGREES, DEGREE_VALUES, PHONE_RE, PHONE_HINT, SOCIAL_KEYS, hasAcademicFields, socialHandle, socialLabel, socialLabelOf, socialUrl } from "./vocab";
import { endMembership, restoreMembership, updateMember } from "./actions";
import { Breadcrumb } from "../_shell/Breadcrumb";

// الحقول الثلاثة التي تلزم صاحب الدرجة الجامعيّة وحده — ويُمنع منها صاحب «ثانوية عامة» و«موظف».
const ACADEMIC_REQUIRED = [
  { key: "college", message: "الكلّية مطلوبة لهذه الدرجة" },
  { key: "major", message: "التخصّص مطلوب لهذه الدرجة" },
  { key: "recordNo", message: "الرقم الأكاديميّ مطلوب لهذه الدرجة" },
] as const;

// مخطّط التحقّق من نموذج العضو (Zod) — مصدر واحد للقواعد ولنوع النموذج.
// النطاق مقصود: القسم والدور يملكهما `assignments/`، والبريد يملكه `credentials/` (هويّة مصادقة) — فلا يُحرَّران هنا.
const memberSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب (حرفان على الأقلّ)"),
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

// نغمة سطح الجدول/الكرت بالحالة — النشط بهوية العلامة (فولاذيّ) لا أخضر (الأغلبيّة الافتراضيّة)؛
// الأخضر يبقى لشارة «نشط» عبر STATUS.tone فقط. قيد الإكمال/موقوف يحملان دلالتهما.
const SURFACE_TONE: Record<MemberStatus, "success" | "warning" | "danger" | undefined> = {
  active: undefined, pending: "warning", suspended: "danger", inactive: undefined,
};
// عنوان كل قسم حسب الحالة المثبّتة
const SECTION: Record<"all" | MemberStatus, { title: string; noun: string }> = {
  all: { title: "كل الأعضاء", noun: "عضو" },
  active: { title: "أعضاء أديب", noun: "عضو" },
  pending: { title: "أعضاء قيد الإكمال", noun: "عضو" },
  suspended: { title: "أعضاء سابقون", noun: "عضو سابق" },
  inactive: { title: "غير النشطين", noun: "عضو" },
};

const uniq = (arr: string[]) => [...new Set(arr)];

const Ico = {
  eye: <Eye />,
  edit: <PencilSimple />,
  end: <Prohibit />,
  restore: <ArrowCounterClockwise />,
  warn: <ShieldWarning />,
  cert: <Certificate />,
};

/** أدنى طول لسبب الإنهاء — نفس عتبة `terminate_membership` في القاعدة (خمسة أحرف). */
const REASON_MIN = 5;

const columns: Column<MemberRow>[] = [
  {
    key: "member", header: "العضو", width: "minmax(220px, 2.2fr)", sortable: true,
    render: (m) => {
      const rc = [m.role, m.committee].filter(Boolean).join(" ") || "غير متوفّر";
      return (
        <div className="dt-mem">
          <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="sm" />
          <span className="dt-mm"><b>{m.name}</b><span>{rc}</span></span>
        </div>
      );
    },
    skeleton: (
      <div className="dt-mem">
        <Skeleton className="sk-av" />
        <span style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Skeleton width={130} /><Skeleton width={90} height={10} />
        </span>
      </div>
    ),
  },
  { key: "phone", header: "رقم الجوّال", width: "1fr", sortable: true, render: (m) => m.phone ? <span className="txt lat">{m.phone}</span> : <span className="txt na">غير متوفّر</span> },
  { key: "email", header: "البريد الإلكترونيّ", width: "minmax(180px, 1.8fr)", sortable: true, render: (m) => <span className="txt lat">{m.email}</span> },
  { key: "joined", header: "تاريخ الانضمام", width: "1.1fr", sortable: true, render: (m) => <span className="txt">{m.joined}</span> },
];

// تبويب الموقوفين: العضو + تاريخ إنهاء العضوية + سببه (بدل الجوّال/البريد/الانضمام).
// دالّة لا ثابت: عمود السبب يحمل مستدعيًا يفتح نافذته، فيُبنى بمعرفته.
const makeSuspendedColumns = (onReason: (m: MemberRow) => void): Column<MemberRow>[] => [
  columns[0],
  { key: "endDate", header: "تاريخ إنهاء العضوية", width: "1.2fr", render: (m) => (m.endDate ? <span className="txt">{m.endDate}</span> : <span className="txt na">غير مسجّل</span>) },
  // السبب جملة حرّة: سطرٌ واحد و«…»، والتلميح يكشف كاملها، والنقر يفتحها في نافذتها.
  {
    key: "endReason", header: "سبب إنهاء العضوية", width: "minmax(240px, 2.6fr)",
    render: (m) => (m.endReason
      ? <button type="button" className="txt txt-clip txt-more" title={m.endReason} onClick={() => onReason(m)}>{m.endReason}</button>
      : <span className="txt na">غير مذكور</span>),
  },
];

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
function ProfileBody({ member }: { member: MemberRow }) {
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
      <div className="pvb-name">{member.name}</div>
      <div className="pvb-role">{[member.role, member.committee].filter(Boolean).join(" · ") || "غير متوفّر"}</div>
      <div className="pvb-badges"><Badge tone={MEMBER_STATUS[member.status].tone} variant="soft" dot live={member.status === "active"}>{MEMBER_STATUS[member.status].label}</Badge></div>
      <div className="pva-sections">
        <Section icon={<IdentificationCard />} title="بيانات العضويّة">
          <Cell label="الدور" icon={<Star />} value={member.role} />
          <Cell label="تاريخ الانضمام" icon={<CalendarBlank />} value={member.joined} />
          {member.dept ? <Cell full label="القسم" icon={<Buildings />} value={member.dept} /> : null}
          {member.committee ? <Cell full label="اللجنة" icon={<UsersThree />} value={member.committee} /> : null}
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
            <Cell full label="سبب الإنهاء" icon={<WarningCircle />} value={member.endReason} />
            <Cell full label="تاريخ الإنهاء" icon={<CalendarX />} value={member.endDate} />
          </Section>
        ) : null}
      </div>
    </>
  );
}

type ViewProps = {
  members: MemberRow[];
  lockedStatus?: MemberStatus;
  /** شاشة «من أشرف عليهم» — عنوانٌ مختلف، والإضافة تسقط عنها (ليست سجلَّ الأعضاء). */
  mode?: "reach";
  /** يملك `manage_member_data`؟ عليه يتوقّف «تعديل البيانات» و«إضافة عضو». */
  mayManageData?: boolean;
  /** الرأس يملكه المستدعي — حيث تسبق الجدولَ إحصاءاتٌ ومبدّلٌ لا يجوز أن يقعا تحت عنوانه. */
  headless?: boolean;
  /**
   * **عرضٌ محض** — شاشاتُ الهويّة («لجنتي» · «قسمي»): يرى صاحبُها بيانات من تحته ولا يتحكّم
   * بها. ولا يُنفَّذ بإخفاء زرٍّ زرٍّ، بل **بتجفيف منابع الأفعال الثلاثة**: سلطةُ كلّ صفّ
   * (`canEnd`/`canEdit`) تُقرأ صفرًا، و`mayManageData` تسقط، والتحديدُ الجماعيّ يسقط معه —
   * فما بقي «عرض الملف» وحده. فمن أضاف فعلًا جديدًا غدًا وجده مقفولًا هنا بلا أن يتذكّرنا.
   */
  readOnly?: boolean;
  /** سطرُ الخلوّ حين يعرف المستدعي نطاقَه أدقَّ من الجدول («لا أعضاء في لجنتك بعد»). */
  emptyNote?: string;
  /**
   * زرُّ «التواصل» (واتساب) في الكروت — لشاشات من يقود أهلَه لا لسجلّ الأعضاء العامّ:
   * القائد يكلّم عضوه. ومن لا جوّالَ له لا زرَّ له (لا وعدَ برابطٍ لا رقم فيه).
   */
  contact?: boolean;
  /** حدُّ الإنذارات — يمرّ من القاعدة إلى نافذة الإصدار (لا رقمَ محفورًا هنا). */
  warningLimit?: number;
};

export function MembersView({ members: input, lockedStatus, mode, mayManageData: mayManage = false, headless = false, readOnly = false, emptyNote, contact = false, warningLimit = 3 }: ViewProps) {
  // منبعٌ واحد للسلطة: في العرض المحض تُقرأ صفرًا فتغيب الأفعال كلُّها من الجدول والكرت والنافذة
  const members = useMemo(
    () => (readOnly ? input.map((m) => ({ ...m, canEnd: false, canEdit: false, canWarn: false, canCertify: false })) : input),
    [input, readOnly],
  );
  const mayManageData = mayManage && !readOnly;
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  // نافذة السبب — نافذةٌ ثانية مستقلّة لا وضعٌ في الأولى: نغمتها ومحتواها وتذييلها مختلفة،
  // وحشرها في ModalState لأثقلت ثلاثة أوضاع بشرطٍ رابع لا يشبهها.
  const [reason, setReason] = useState<MemberRow | null>(null);
  const suspendedColumns = useMemo(() => makeSuspendedColumns(setReason), []);
  // إنهاء العضوية وإعادتها — نافذتان مستقلّتان: الأولى تطلب سببًا (نصٌّ يُحفظ ويُعرَض بعدها)،
  // والثانية تأكيدٌ مجرّد. والقاعدة هي الحَكَم في الحالين؛ هذه أوراقُها لا حكمُها.
  const [ending, setEnding] = useState<MemberRow | null>(null);
  const [endReason, setEndReason] = useState("");
  const [endErr, setEndErr] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<MemberRow | null>(null);
  // إصدار إنذار — نافذة الغرفة نفسها (مصدرٌ واحد)، مثبّتةً على صاحب الصفّ فلا يُختار غيره
  const [warning, setWarning] = useState<MemberRow | null>(null);
  const [certifying, setCertifying] = useState<MemberRow | null>(null);
  const [acting, startAct] = useTransition();
  // نموذج الإضافة/التعديل عبر React Hook Form + Zod
  const editForm = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", phone: "", college: "", degree: "", major: "", recordNo: "", twitter: "", instagram: "", tiktok: "", linkedin: "", hasDetails: false },
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [view, changeView] = usePersistentView("members-view");

  const section = mode === "reach" ? { title: "من أشرف عليهم", noun: "عضو" } : SECTION[lockedStatus ?? "all"];
  // نغمة الطبقة البصريّة: شاشة أحاديّة الحالة → الطاولة كلّها بنغمة الحالة؛ العرض المختلط → نغمة كلّ صفّ حسب حالته
  const tableTone = lockedStatus ? SURFACE_TONE[lockedStatus] : undefined;
  const rowToneFn = lockedStatus
    ? undefined
    : (m: MemberRow) => {
        return SURFACE_TONE[m.status]; // نغمة الصفّ من حالة العضو (نجاح/تحذير/خطر)
      };
  const member = modal && modal.mode !== "add" ? modal.member : null;
  const openEdit = (m: MemberRow) => setModal({ mode: "edit", member: m });
  const openView = (m: MemberRow) => setModal({ mode: "view", member: m });
  const openAdd = () => setModal({ mode: "add" });
  const close = () => setModal(null);
  const clearFilters = () => { setSearch(""); setFv({}); };

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

  // خيارات المرشّحات مشتقّة من أعضاء هذا القسم
  const scope = useMemo(() => (lockedStatus ? members.filter((m) => m.status === lockedStatus) : members), [members, lockedStatus]);
  const deptOpts = useMemo(() => uniq(scope.map((m) => m.dept).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  const roleOpts = useMemo(() => uniq(scope.map((m) => m.role).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  const committeeOpts = useMemo(() => uniq(scope.map((m) => m.committee).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  const filters: FilterDef[] = useMemo(() => [
    { key: "role", label: "الدور", options: roleOpts },
    { key: "dept", label: "القسم", options: deptOpts },
    { key: "committee", label: "اللجنة", options: committeeOpts },
  ], [roleOpts, deptOpts, committeeOpts]);

  const rows = useMemo(() => {
    return scope.filter((m) => {
      // ما يعرضه الجدول والكرت يُبحَث فيه — الجوّال والدور واللجنة والقسم كالاسم والبريد،
      // فلا يقف الباحث أمام عمودٍ يراه ولا يبلغه.
      if (!matchesSearch(search, m.name, m.email, m.phone, m.role, m.committee, m.dept)) return false;
      if (fv.role && m.role !== fv.role) return false;
      if (fv.dept && m.dept !== fv.dept) return false;
      if (fv.committee && m.committee !== fv.committee) return false;
      return true;
    });
  }, [scope, search, fv]);

  // فرز عبر TanStack Table — نموذج أعمدة مُنمّط ومنطق فرز مصان (يُشارَك بين الجدول والكروت)
  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<MemberRow>[]>(() => [
    { id: "member", accessorFn: (m) => m.name.toLowerCase() },
    { id: "phone", accessorFn: (m) => m.phone ?? "" },
    { id: "email", accessorFn: (m) => m.email.toLowerCase() },
    { id: "joined", accessorFn: (m) => m.joinedRaw },
  ], []);
  const table = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (m) => m.id,
  });
  const sortedRows = table.getRowModel().rows.map((r) => r.original);
  const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const toggleSort = (id: string) => table.getColumn(id)?.toggleSorting();

  useEffect(() => { setPage(1); }, [search, fv, pageSize, sorting]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const emptyState = scope.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<UsersThree />}
      title={`لا ${section.noun} بعد`}
      description={emptyNote ?? (mode === "reach" ? "لا أعضاء تحت إشرافك حاليًّا." : "لا أعضاء في هذا القسم حاليًّا.")}
      action={mayManageData ? <Button variant="primary" size="md" onClick={openAdd}><Plus size={18} />إضافة عضو</Button> : undefined}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا أعضاء مطابقون"
      description="لم نعثر على أعضاء يطابقون بحثك أو مرشّحاتك. جرّب تعديل المعايير."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>}
    />
  );

  const openEnd = (m: MemberRow) => { setEndReason(""); setEndErr(null); setEnding(m); };
  const submitEnd = () => {
    const reason = ending ? endReason.trim() : "";
    if (reason.length < REASON_MIN) { setEndErr(`اذكر سبب إنهاء العضوية (${REASON_MIN} أحرف فأكثر).`); return; }
    const target = ending;
    if (!target) return;
    startAct(async () => {
      const r = await endMembership({ userId: target.id, reason });
      if (r.ok) { toast.success(`أُنهيت عضوية «${target.name}».`); setEnding(null); router.refresh(); } else toast.error(r.message);
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

  // الموقوف عضويّته منتهية فلا تُحرَّر بياناته — يسقط «تعديل البيانات» عنه. والحكم بحالته لا بالتبويب:
  // يسري في شاشة الموقوفين وفي العرض المختلط معًا، فلا يصير الصفّ نفسه قابلًا للتحرير بتبديل الشاشة.
  //
  // و«إنهاء العضوية»/«إعادتها» يظهران لمن تبلغه سلطتُه وحده (`canEnd` — جوابُ القاعدة نفسِها):
  // فلا يرى المدير بندًا يُردّ عنه، ولا يُخفي الإخفاءُ بابًا مفتوحًا (الباب مقفولٌ في القاعدة أوّلًا).
  //
  // ولا حذفَ هنا: **إنهاء العضوية هو الفعل**، والحذف الصلب أُزيل من اللوحة (قرار المالك 2026-07-31).
  // الإنهاء يُبقي السجلّ والسبب والتاريخ ويُرجَع عنه؛ والحذف كان يمحو الحساب ومناصبه وحجوزاته،
  // وأكثرُه يردّه القيد أصلًا (٣٤ رابطًا يمنعان حذف من صوّت أو قُوبل أو كتب).
  const actionsFor = (m: MemberRow): MenuGroup[] => {
    const danger = m.canEnd && m.status !== "suspended"
      ? [{ label: "إنهاء العضوية", icon: Ico.end, danger: true, onSelect: () => openEnd(m) }]
      : [];
    const groups: MenuGroup[] = [
      {
        header: "إجراءات",
        items: [
          { label: "عرض الملف", icon: Ico.eye, onSelect: () => openView(m) },
          ...(m.status === "suspended"
            ? (m.canEnd ? [{ label: "إعادة العضوية", icon: Ico.restore, onSelect: () => setRestoring(m) }] : [])
            : (m.canEdit ? [{ label: "تعديل البيانات", icon: Ico.edit, onSelect: () => openEdit(m) }] : [])),
          // الإنذار فعلٌ على العضو نفسه، فبندُه هنا لا في غرفةٍ أخرى — ويتبع الصفَّ لا صاحبَ الشاشة.
          ...(m.canWarn && m.status === "active"
            ? [{ label: "إصدار إنذار", icon: Ico.warn, onSelect: () => setWarning(m) }]
            : []),
          // شهادةُ الخبرة **لا تشترط عضويّةً سارية** (بخلاف الإنذار): أكثرُ من يطلبها من غادر،
          // فالبند يظهر في «أعضاء أديب» و«أعضاء سابقون» سواء.
          ...(m.canCertify
            ? [{ label: "إصدار شهادة خبرة", icon: Ico.cert, onSelect: () => setCertifying(m) }]
            : []),
        ],
      },
    ];
    // منطقة الخطر تسقط كلّها إن خلت — لا رأسَ لمجموعةٍ بلا بنود
    if (danger.length) groups.push({ header: "منطقة الخطر", danger: true, items: danger });
    return groups;
  };

  // الكرت يقول إجراءاته أزرارًا صريحة، فيسقط عن قائمة نقاطه ما نطقت به أزراره (وتبقى القائمة كاملة في الجدول).
  // النشط: زرّه «عرض الملف الشخصي». والموقوف: زرّاه «إعادة العضوية» و«عرض التفاصيل» (نافذة السبب) —
  // فـ«عرض الملف» **يعود** إلى نقاطه، إذ لم يعد زرٌّ يقوله.
  const cardActionsFor = (m: MemberRow): MenuGroup[] => {
    const saidByButtons = m.status === "suspended" ? ["إعادة العضوية"] : ["عرض الملف"];
    return actionsFor(m)
      .map((g) => ({ ...g, items: g.items.filter((it) => !saidByButtons.includes(it.label)) }))
      .filter((g) => g.items.length > 0);
  };

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun={section.noun} />
  ) : null;

  return (
    <>
      {headless ? null : (
        <div className="ash-phead">
          <div>
            {/* الأقسام الثلاثة **أخواتٌ** لا أبناءَ لـ«أعضاء أديب» — بندُ كلٍّ في الخريطة قائمٌ بنفسه.
                وعنوانُ الورقة من `section` نفسه الذي يقوله العنوان، فلا يفترقان. */}
            <Breadcrumb leaf={section.title} />
            <h1>{section.title}</h1>
          </div>
        </div>
      )}

      {lockedStatus === "active" ? (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <Stat icon={<UsersThree />} value={scope.length} label="عدد أعضاء أديب" />
        </div>
      ) : null}

      <Toolbar
        searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
        search={search}
        onSearch={setSearch}
        filters={filters}
        filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))}
        onReset={() => setFv({})}
        view={view}
        onViewChange={changeView}
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        // العرضُ المحض لا يُحدَّد فيه صفٌّ: أفعالُ الحزمة («تغيير الحالة») وعدٌ لا يملكه صاحبُ الشاشة
        bulkActions={
          readOnly ? undefined : (
            <>
              <button type="button" className="tb-ba" onClick={() => toast.info(`جارٍ تغيير حالة ${selected.size} عضو…`)}>تغيير الحالة</button>
              <button type="button" className="tb-ba" onClick={() => toast.info(`جارٍ تجهيز ملف ${selected.size} عضو…`)}>تصدير</button>
            </>
          )
        }
      />

      {view === "table" ? (
        <DataTable
          columns={lockedStatus === "suspended" ? suspendedColumns : columns}
          rows={pageRows}
          getRowId={(m) => m.id}
          selectable={!readOnly}
          selected={selected}
          onSelectedChange={setSelected}
          sort={sort}
          onToggleSort={toggleSort}
          emptyState={emptyState}
          footer={pager ?? undefined}
          rowActions={actionsFor}
          tone={tableTone}
          rowTone={rowToneFn}
        />
      ) : rows.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <>
          {/* الكرت ابنٌ مباشر للشبكة: الغلاف كان للحركة وحدها (تأخير سطريّ حسب الفهرس)،
              وسقط معها. والمفتاح على الشبكة كان يُجبر إعادة التركيب لإعادة الحركة —
              فلا لزوم له، وإسقاطه يُبقي عُقَد DOM بين الصفحات بدل هدمها وبنائها. */}
          <div className="card-grid">
            {pageRows.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onOpen={() => openView(m)}
                actions={cardActionsFor(m)}
                // بلا سلطةٍ لا زرّ: الكرت لا يَعِد بما تردّه القاعدة (كما تسقط نقاطُه حين تخلو)
                onRestore={m.canEnd ? () => setRestoring(m) : undefined}
                onReason={() => setReason(m)}
                contactHref={contact && m.phone ? waHref(m.phone) : null}
              />
            ))}
          </div>
          <div className="card-pager">{pager}</div>
        </>
      )}

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
            // تذييل هدّام: الإجراء الهدّام يسارًا (وهو الإنهاء بعد إزالة الحذف)، والحفظ/الإلغاء يمينًا
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 10 }}>
              {member?.canEnd && member.status !== "suspended"
                ? <Button variant="ghost-danger" size="md" onClick={() => { close(); openEnd(member); }}>إنهاء العضوية</Button>
                : <span />}
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="ghost" size="md" onClick={close} disabled={saving}>إلغاء</Button>
                <Button type="submit" form="member-form" variant="primary" size="md" loading={saving}>حفظ التغييرات</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={close}>إلغاء</Button>
              <Button type="submit" form="member-form" variant="primary" size="md">إضافة العضو</Button>
            </>
          )
        }
      >
        {modal?.mode === "view" && member ? (
          <ProfileBody member={member} />
        ) : (
          <form id="member-form" className="mdl-grid" onSubmit={onSubmitMember} noValidate>
            <ModalSectionHeading className="mdl-full" icon={<IdentificationBadge />} title="البيانات الأساسيّة" />
            <Field className="mdl-full" label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب الاسم" error={editForm.formState.errors.name?.message} required {...editForm.register("name")} />

            <ModalSectionHeading className="mdl-full" icon={<AddressBook />} title="بيانات التواصل" />
            {/* البريد هويّة مصادقة لا بيان تواصل: يُغيَّر من «بيانات الدخول» حيث يُزامَن مع auth.users — كتابته هنا وحده تفكّ المزامنة */}
            <Field className="mdl-full" label="رقم الجوّال" type="tel" charset="digits" icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" error={editForm.formState.errors.phone?.message} required {...editForm.register("phone")} />
            <Field className="mdl-full" label="البريد الإلكترونيّ" type="email" charset="latin" disabled readOnly value={member?.email ?? ""} icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" helper="يُغيَّر من «بيانات الدخول»." />

            {member && member.degreeRaw == null ? (
              <Alert className="mdl-full" tone="warning" title="لا سجلّ تفاصيل لهذا العضو">
                البيانات الأكاديميّة والتواصل الاجتماعيّ لن تُحفظ له — سجلّها يُنشأ عند إكمال بيانات الالتحاق. أمّا الاسم ورقم الجوّال فيُحفظان.
              </Alert>
            ) : null}

            <ModalSectionHeading className="mdl-full" icon={<Books />} title="البيانات الأكاديميّة" />
            <Controller
              control={editForm.control}
              name="degree"
              render={({ field }) => (
                <Select className="mdl-full" label="الدرجة العلمية" icon={<Certificate />} options={DEGREES} value={field.value ?? ""} onValueChange={field.onChange} error={editForm.formState.errors.degree?.message} required />
              )}
            />
            {/* إنقاصُ الدرجة عن جامعيّة محوٌ لا رجعة فيه: الفعل الخادميّ يكتب null في الثلاثة، ولا نسخة
                تحفظها (لا مؤقّت تدقيق على member_details ولا لقطات). فيُحذَّر قبل الحفظ لا بعده.
                الشرط يقارن درجة القاعدة بالمختارة: يظهر حين كانت جامعيّة فصارت غير جامعيّة — لا عند فتح
                النافذة على عضوٍ غير جامعيّ أصلًا (لا شيء عنده ليُمحى). */}
            {member && hasAcademicFields(member.degreeRaw) && !hasAcademicFields(editForm.watch("degree")) ? (
              <Alert className="mdl-full" tone="danger" title="ستُمحى بياناته الأكاديميّة عند الحفظ">
                كلّيته وتخصّصه ورقمه الأكاديميّ تُحذف نهائيًّا — لا نسخة منها ولا استرجاع. وإن أعدت درجته جامعيّةً لاحقًا، فأدخِلها من جديد.
              </Alert>
            ) : null}

            {/* الحقول الثلاثة تتبع الدرجة: تظهر لصاحب الدرجة الجامعيّة وحده. «ثانوية عامة» و«موظف» لا كلّية
                لهما ولا تخصّص ولا رقم أكاديميّ — تُخفى هنا، ويمحوها الفعل الخادميّ، ويردّ الممتلئ قيدُ القاعدة. */}
            {hasAcademicFields(editForm.watch("degree")) ? (
              <>
                <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={editForm.formState.errors.college?.message} required {...editForm.register("college")} />
                <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={editForm.formState.errors.major?.message} required {...editForm.register("major")} />
                <Field className="mdl-full" label="الرقم الأكاديميّ" charset="digits" icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" error={editForm.formState.errors.recordNo?.message} required {...editForm.register("recordNo")} />
              </>
            ) : null}

            <ModalSectionHeading className="mdl-full" icon={<ShareNetwork />} title="التواصل الاجتماعيّ" />
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
        title={reason ? `سبب إنهاء العضوية — ${reason.name}` : "سبب إنهاء العضوية"}
        size="sm"
        className="pvb-modal mdl-tone-danger"
        hero={reason ? <Avatar name={reason.name} src={reason.avatar ?? undefined} gender={reason.gender} size="2xl" status="busy" className="pvb-av" /> : undefined}
        // «إغلاق» يتبع نغمة النافذة (ghost-danger) — الزرّ الوحيد في تذييلٍ منغَّم يلبس نغمته
        footer={<Button variant="ghost-danger" size="md" onClick={() => setReason(null)}>إغلاق</Button>}
      >
        {reason ? (
          <>
            <div className="pvb-name">{reason.name}</div>
            <div className="pvb-role">{reason.endAgo ? `عضوية منتهية ${reason.endAgo}` : "عضوية منتهية"}</div>
            <div className="pva-sections">
              <Section end icon={<Prohibit />} title="سبب إنهاء العضوية">
                <Cell full noCopy label="سبب الإنهاء" icon={<WarningCircle />} value={reason.endReason} />
                <Cell full noCopy label="تاريخ الإنهاء" icon={<CalendarX />} value={reason.endDate} />
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
        title={ending ? `إنهاء عضوية «${ending.name}»؟` : "إنهاء العضوية"}
        description="تُنقَل العضويّة إلى «الأعضاء السابقين»، ولا تُحرَّر بياناتها بعدها حتّى تُعاد."
        size="sm"
        className="mdl-tone-danger"
        footer={
          <>
            <Button variant="ghost-danger" size="md" onClick={() => setEnding(null)} disabled={acting}>إلغاء</Button>
            <Button variant="danger" size="md" loading={acting} onClick={submitEnd}>إنهاء العضوية</Button>
          </>
        }
      >
        <div className="mdl-grid">
          <Textarea
            className="mdl-full"
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
        </div>
      </Modal>

      <ConfirmDialog
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
            roleAr: warning.role,
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
}
