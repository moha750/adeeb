"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Donut, Segmented, SectionCard, Stat, matchesSearch } from "@adeeb/design-system";
import {
  Certificate, Handshake,
  ChartDonut, ShieldWarning, UserMinus, UsersThree,
} from "@phosphor-icons/react";
import {
  ArrowCounterClockwise, ArrowsClockwise, Eye, MagnifyingGlass, PencilSimple, Plus, Prohibit, Trash,
} from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { StatsScope, scopeLabels } from "../_components/StatsScope";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { MemberCard } from "./MemberCard";
// نوافذُ العضو (الملفّ والتعديل والسبب والإنهاء والنقل والإعادة والإنذار والشهادة) — مصدرُها الواحد، تشاركه غرفةُ القالب
import { useMemberDialogs } from "./MemberDialogs";
import type { MenuGroup } from "../_components/DropdownMenu";
import { Pagination } from "../_components/Pagination";
import { Avatar } from "../_components/Avatar";
import { EmptyState } from "../_components/EmptyState";
import { Skeleton } from "../_components/Skeleton";
import { useToast } from "../_components/ToastProvider";
import { positionLine } from "@/lib/positionLabel";
import { waHref } from "@/lib/whatsapp";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { MemberRow, MemberStatus, MoveTarget } from "./data";
import { GENDERS, TERMINATION_KINDS, terminationKindLabel } from "./vocab";
import { PageHeader } from "../_components/PageHeader";

// نغمة سطح الجدول/الكرت بالحالة — النشط بهوية العلامة (فولاذيّ) لا أخضر (الأغلبيّة الافتراضيّة)؛
// الأخضر يبقى لشارة «نشط» عبر STATUS.tone فقط. والموقوف يحمل دلالته.
const SURFACE_TONE: Record<MemberStatus, "success" | "warning" | "danger" | undefined> = {
  active: undefined, suspended: "danger", inactive: undefined,
};
// عنوان كل قسم حسب الحالة المثبّتة
const SECTION: Record<"all" | MemberStatus, { title: string; noun: string }> = {
  all: { title: "كل الأعضاء", noun: "عضو" },
  active: { title: "أعضاء أدِيب", noun: "عضو" },
  suspended: { title: "أعضاء سابقون", noun: "عضو سابق" },
  inactive: { title: "غير النشطين", noun: "عضو" },
};

const uniq = (arr: string[]) => [...new Set(arr)];

/** قيمةُ «من لا جنسَ في سجلّه» في مرشِّح الجنس — رمزٌ صريحٌ لا خالٍ، فالخالي هو «الكل». */
const GENDER_NONE = "none";

const Ico = {
  eye: <Eye />,
  edit: <PencilSimple />,
  end: <Prohibit />,
  restore: <ArrowCounterClockwise />,
  warn: <ShieldWarning />,
  cert: <Certificate />,
  move: <ArrowsClockwise />,
  volunteer: <Handshake />,
};

/** وحدةُ العدّ في حلقة أسباب الخروج */
const MEMBER_UNIT = { one: "عضو", two: "عضوان", few: "أعضاء" };

const columns: Column<MemberRow>[] = [
  {
    key: "member", header: "العضو", width: "minmax(220px, 2.2fr)", sortable: true,
    render: (m) => {
      const rc = positionLine(m.role, m.committee) ?? "غير متوفّر";
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

// تبويب الموقوفين: العضو + تاريخ إنهاء العضوية + من أنهاها + سببه (بدل الجوّال/البريد/الانضمام).
// دالّة لا ثابت: عمود السبب يحمل مستدعيًا يفتح نافذته، فيُبنى بمعرفته.
const makeSuspendedColumns = (onReason: (m: MemberRow) => void): Column<MemberRow>[] => [
  columns[0],
  { key: "endDate", header: "تاريخ إنهاء العضوية", width: "1.1fr", render: (m) => (m.endDate ? <span className="txt">{m.endDate}</span> : <span className="txt na">غير مسجّل</span>) },
  // من أنهاها — من سجلّ النشاط لا من الملفّ. ومن أُنهي قبل السجلّ (زمنُ V1) لا فاعلَ له: «غير مسجّل».
  {
    key: "endBy", header: "من أنهى العضوية", width: "minmax(140px, 1.3fr)",
    render: (m) => (m.endBy ? <span className="txt txt-clip" title={m.endBy}>{m.endBy}</span> : <span className="txt na">غير مسجّل</span>),
  },
  // السبب جملة حرّة: سطرٌ واحد و«…»، والتلميح يكشف كاملها، والنقر يفتحها في نافذتها.
  {
    key: "endReason", header: "سبب إنهاء العضوية", width: "minmax(200px, 2.2fr)",
    render: (m) => (m.endReason
      ? <button type="button" className="txt txt-clip txt-more" title={m.endReason} onClick={() => onReason(m)}>{m.endReason}</button>
      : <span className="txt na">غير مذكور</span>),
  },
];

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
   * زرُّ «التواصل» (واتساب) في الكروت — لشاشات من يقود أهلَه أو يشرف عليهم («لجنتي» ·
   * «من أشرف عليهم») لا لسجلّ الأعضاء العامّ: صاحبُ النطاق يكلّم من فيه. ومن لا جوّالَ له
   * لا زرَّ له (لا وعدَ برابطٍ لا رقم فيه).
   */
  contact?: boolean;
  /** حدُّ الإنذارات — يمرّ من القاعدة إلى نافذة الإصدار (لا رقمَ محفورًا هنا). */
  warningLimit?: number;
  /**
   * وجهاتُ النقل — اللجان التي تُصرّح بمقعد «عضو لجنة». تُمرَّر من الشاشة الخادميّة، وبلاها
   * يسقط البند: نافذةٌ بلا وجهةٍ وعدٌ فارغ. والسلطةُ على الصفّ (`canMove`) شرطٌ آخر معها.
   */
  moveTargets?: MoveTarget[];
  /**
   * **السابقون قسمٌ داخل «أعضاء أدِيب»** (قرار المالك ٢٠٢٦-١٠-٠٩) لا تبويبٌ مستقلّ: يُعرف سببُ
   * خروجهم وأنّهم كانوا أعضاءً من حيث يُدار الأعضاء. فمع `lockedStatus="active"` يظهر مبدّلٌ ممتدّ
   * «أعضاء / سابقون» على سنّة سجلّ المتطوّعين. ويُمرَّر لمن يملك `view_suspended_members` وحده،
   * فبلاه لا مبدّل ويبقى الكشفُ كشفَ الأعضاء.
   */
  formerTab?: boolean;
  /** القسمُ الذي تفتح عليه الشاشة (المسارُ القديم «أعضاء سابقون» يحوّل إلى هنا بالسابقين). */
  initialTab?: "active" | "suspended";
};

export function MembersView({ members: input, lockedStatus, mode, mayManageData: mayManage = false, headless = false, readOnly = false, emptyNote, contact = false, warningLimit = 3, moveTargets = [], formerTab = false, initialTab = "active" }: ViewProps) {
  // منبعٌ واحد للسلطة: في العرض المحض تُقرأ صفرًا فتغيب الأفعال كلُّها من الجدول والكرت والنافذة
  const members = useMemo(
    () => (readOnly ? input.map((m) => ({ ...m, canEnd: false, canEdit: false, canWarn: false, canCertify: false, canMove: false })) : input),
    [input, readOnly],
  );
  const mayManageData = mayManage && !readOnly;
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // نوافذُ العضو كلُّها (الملفّ، والتعديل، والسبب، والإنهاء، والنقل، والإعادة، والإنذار، والشهادة) في `MemberDialogs.tsx`،
  // مصدرٌ واحدٌ تشاركه غرفةُ القالب (`_ad/rooms/MembersRoom.tsx`).
  const { openView, openEdit, openAdd, openEnd, openMove, openReason, openRestore, openWarning, openCertify, dialogs } = useMemberDialogs({ moveTargets, warningLimit });
  const suspendedColumns = useMemo(() => makeSuspendedColumns(openReason), [openReason]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [view, changeView] = usePersistentView("members-view");

  // القسمُ الجاري: المثبّتُ كما هو، وفي «أعضاء أدِيب» ذي المبدّل ما اختير منه
  const [tab, setTab] = useState<"active" | "suspended">(initialTab);
  const withFormer = formerTab && lockedStatus === "active";
  const status: MemberStatus | undefined = withFormer ? tab : lockedStatus;

  // الحالةُ المثبّتة تسبق اسمَ الشاشة في المفردات: كشفُ «من غادر» داخل «من أشرف عليهم» ناسُه
  // «عضو سابق» لا «عضو» — والعنوانُ نفسه لا يُرسَم هناك أصلًا (`headless`).
  const section = status ? SECTION[status] : mode === "reach" ? { title: "من أشرف عليهم", noun: "عضو" } : SECTION.all;
  // نغمة الطبقة البصريّة: شاشة أحاديّة الحالة → الطاولة كلّها بنغمة الحالة؛ العرض المختلط → نغمة كلّ صفّ حسب حالته
  const tableTone = status ? SURFACE_TONE[status] : undefined;
  const rowToneFn = status
    ? undefined
    : (m: MemberRow) => {
        return SURFACE_TONE[m.status]; // نغمة الصفّ من حالة العضو (نجاح/تحذير/خطر)
      };
  const clearFilters = () => { setSearch(""); setFv({}); setHiddenKinds([]); };

  // خيارات المرشّحات مشتقّة من أعضاء هذا القسم
  const scope = useMemo(() => (status ? members.filter((m) => m.status === status) : members), [members, status]);
  const deptOpts = useMemo(() => uniq(scope.map((m) => m.dept).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  const roleOpts = useMemo(() => uniq(scope.map((m) => m.role).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  const committeeOpts = useMemo(() => uniq(scope.map((m) => m.committee).filter(Boolean) as string[]).map((v) => ({ value: v, label: v })), [scope]);
  /**
   * الجنسُ قيمةٌ **مغلقة** لا تُشتقّ من الكشف كالأقسام واللجان — رمزان يحرسهما القيد،
   * فيُقالان كما هما ولو خلا منهما القسمُ المعروض. وإنّما يُشتقّ الخيارُ الثالث وحدَه:
   * «غير محدّد» لا يُعرَض إلّا حين يكون في الكشف من لا جنسَ في سجلّه (الموقوف ومن لم
   * يُكمل تُركا بلا جنسٍ عمدًا)، فلا يقف المستعملُ أمام خيارٍ لا يردّ صفًّا واحدًا.
   */
  const genderOpts = useMemo(
    () => (scope.some((m) => !m.gender) ? [...GENDERS, { value: GENDER_NONE, label: "غير محدّد" }] : GENDERS),
    [scope],
  );
  const filters: FilterDef[] = useMemo(() => [
    // **ولا دورَ ولا قسمَ ولا لجنةَ للسابقين** (قرار المالك ٢٠٢٦-١٠-٠٩): مقاعدُهم تُخلى بالإنهاء
    // (`_apply_termination`)، فكانت المرشِّحاتُ الثلاثةُ هناك شبهَ فارغةٍ تَعِد بما لا تردّ.
    ...(status === "suspended" ? [] : [
      { key: "role", label: "الدور", options: roleOpts },
      { key: "dept", label: "القسم", options: deptOpts },
      { key: "committee", label: "اللجنة", options: committeeOpts },
    ]),
    { key: "gender", label: "الجنس", options: genderOpts },
    // ومرشِّحُ السبب لا يُعرَّف هنا: حالتُه حالةُ الحلقة (`hiddenKinds`) لا `fv`، فيُلحَق بالشريط أدناه
  ], [roleOpts, deptOpts, committeeOpts, genderOpts, status]);

  /**
   * **نطاقُ الإحصاء** (ق١٧): التبويبُ والمرشِّحاتُ الأربعةُ كلُّها سكّانيّة (دورٌ وقسمٌ
   * ولجنةٌ وجنس)، فالعدّادُ يتبعها — ترشّح لجنةً فيقول كم عضوًا فيها. والبحثُ لا يدخله.
   */
  // ما سوى السبب من المرشِّحات — عليه تُرسم حلقةُ الأسباب: موضوعُها السببُ نفسُه، فلا تنكمش
  // بإخفاء فئاتها (ق١٧، حدُّ البُعد)، بل تبقى صورةَ الكلّ والمخفيُّ فيها مشطوبٌ بنسبته، بينما
  // ينكمش الكشفُ والعدّاد.
  const inScopeBut = useMemo(() => scope.filter((m) => {
    if (fv.role && m.role !== fv.role) return false;
    if (fv.dept && m.dept !== fv.dept) return false;
    if (fv.committee && m.committee !== fv.committee) return false;
    // «غير محدّد» قيمةٌ يُنخَل بها كسائر القيم — القيمةُ الخالية محجوزةٌ لـ«الكل» في الشريط
    if (fv.gender && (fv.gender === GENDER_NONE ? m.gender != null : m.gender !== fv.gender)) return false;
    return true;
  }), [scope, fv]);
  /**
   * **الحلقةُ مرشِّحُ السبب** (سؤال المالك ٢٠٢٦-١٠-٠٩): الضغطُ على فئةٍ في حلقة «أسباب الخروج»
   * يُخفيها، وهو سلوكُ الحلقة في الموقع كلّه منذ ٢٠٢٦-٠٨-٠٨. فصار الإخفاءُ يصعد إلى هنا ويُخرج
   * أصحابَ الفئة من الكشف والعدّاد. والحالةُ تسمياتُ الفئات لا رموزُها، لأنّ الحلقة تعرف التسمية.
   */
  const [hiddenKinds, setHiddenKinds] = useState<string[]>([]);
  const counted = useMemo(
    () => (hiddenKinds.length ? inScopeBut.filter((m) => !hiddenKinds.includes(terminationKindLabel(m.endKind))) : inScopeBut),
    [inScopeBut, hiddenKinds],
  );
  const kinds = useMemo(() => {
    const n = new Map<string, number>();
    for (const m of inScopeBut) n.set(m.endKind ?? "other", (n.get(m.endKind ?? "other") ?? 0) + 1);
    // ترتيبُ الفئات الثابت لا ترتيبُ الأعداد: اللونُ يلازم الفئةَ في الحلقة من زيارةٍ إلى زيارة
    return TERMINATION_KINDS.map((k) => ({ label: k.label as string, value: n.get(k.value) ?? 0 })).filter((k) => k.value > 0);
  }, [inScopeBut]);

  /**
   * **مرشِّحُ «السبب» في الشريط** (طلب المالك ٢٠٢٦-١٠-٠٩) — بابٌ ثانٍ **لحالةٍ واحدة**: لا يملك
   * قيمةً خاصّة، بل يقرأ الحلقةَ ويكتب فيها. فاختيارُ سببٍ يُخفي في الحلقة ما سواه، والقيمةُ
   * المعروضة سببٌ متى بقي في الحلقة ظاهرًا وحده، وإلّا «الكل». فلا يفترق البابان يومًا.
   * والخياراتُ ما في الحلقة من فئات، فلا يُختار سببٌ لا أحدَ فيه فتفرغ الحلقة.
   */
  const shownKinds = kinds.filter((k) => !hiddenKinds.includes(k.label));
  const kindValue = hiddenKinds.length > 0 && shownKinds.length === 1 ? shownKinds[0].label : "";
  const toolbarFilters: FilterDef[] = status === "suspended"
    ? [...filters, { key: "kind", label: "السبب", options: kinds.map((k) => ({ value: k.label, label: k.label })) }]
    : filters;
  const onToolbarFilter = (k: string, v: string) => {
    if (k === "kind") setHiddenKinds(v ? kinds.map((x) => x.label).filter((l) => l !== v) : []);
    else setFv((p) => ({ ...p, [k]: v }));
  };
  // سطرُ النطاق يقول السببَ باسمه متى بقي وحده، وإلّا ما أُخفي
  const kindScope = !hiddenKinds.length ? null : kindValue || `بلا ${hiddenKinds.join("، ")}`;

  // تبديلُ القسم يبدأ من جديد: مرشِّحاتُ قسمٍ لا تصحّ في أخيه (السبب لا يقع على عضوٍ قائم)
  const switchTab = (t: "active" | "suspended") => {
    setTab(t); setFv({}); setHiddenKinds([]); setSearch(""); setSelected(new Set()); setPage(1);
  };

  const rows = useMemo(() => {
    // ما يعرضه الجدول والكرت يُبحَث فيه — الجوّال والدور واللجنة والقسم كالاسم والبريد،
    // فلا يقف الباحث أمام عمودٍ يراه ولا يبلغه.
    return counted.filter((m) => matchesSearch(search, m.name, m.email, m.phone, m.role, m.committee, m.dept));
  }, [counted, search]);

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

  useEffect(() => { setPage(1); }, [search, fv, hiddenKinds, pageSize, sorting]);

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
      ? [
          // إنهاءٌ يُبقيه في أدِيب متطوّعًا — يسبق الإنهاءَ المجرّد لأنّه الأخفّ
          { label: "نقل إلى المتطوّعين", icon: Ico.volunteer, danger: true, onSelect: () => openEnd(m, "volunteer") },
          { label: "إنهاء العضوية", icon: Ico.end, danger: true, onSelect: () => openEnd(m) },
        ]
      : [];
    const groups: MenuGroup[] = [
      {
        header: "إجراءات",
        items: [
          { label: "عرض الملف", icon: Ico.eye, onSelect: () => openView(m) },
          ...(m.status === "suspended"
            ? (m.canEnd ? [{ label: "إعادة العضوية", icon: Ico.restore, onSelect: () => openRestore(m) }] : [])
            : (m.canEdit ? [{ label: "تعديل البيانات", icon: Ico.edit, onSelect: () => openEdit(m) }] : [])),
          // النقل بين اللجان ترتيبٌ إداريّ لا عقوبة، فبندُه في «إجراءات» لا في منطقة الخطر.
          // ويقع على **عضو لجنةٍ سارٍ** وحده (`canMove` تحمل الشرط كلَّه من القاعدة والدور معًا).
          ...(m.canMove && moveTargets.length > 0
            ? [{ label: "نقل إلى لجنة أخرى", icon: Ico.move, onSelect: () => openMove(m) }]
            : []),
          // الإنذار فعلٌ على العضو نفسه، فبندُه هنا لا في غرفةٍ أخرى — ويتبع الصفَّ لا صاحبَ الشاشة.
          ...(m.canWarn && m.status === "active"
            ? [{ label: "إصدار إنذار", icon: Ico.warn, onSelect: () => openWarning(m) }]
            : []),
          // شهادةُ الخبرة **لا تشترط عضويّةً سارية** (بخلاف الإنذار): أكثرُ من يطلبها من غادر،
          // فالبند يظهر في «أعضاء أدِيب» و«أعضاء سابقون» سواء.
          ...(m.canCertify
            ? [{ label: "إصدار شهادة خبرة", icon: Ico.cert, onSelect: () => openCertify(m) }]
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
        // الأقسام الثلاثة **أخواتٌ** لا أبناءَ لـ«أعضاء أدِيب»: بندُ كلٍّ في الخريطة قائمٌ
        // بنفسه، فورقةُ الفتات تُشتقّ منه ولا تُمرَّر — والعنوانُ تحتها يقولها.
        <PageHeader title={withFormer ? SECTION.active.title : section.title} />
      )}

      {withFormer ? (
        <div style={{ marginBottom: 16 }}>
          {/* ممتدٌّ على الصفّ كمبدّل سجلّ المتطوّعين: الخيارُ هنا هو الكشفُ نفسُه لا زينةُ ركن */}
          <Segmented
            wide
            items={[
              { value: "active", label: "أعضاء" },
              { value: "suspended", label: "سابقون" },
            ]}
            value={tab}
            onValueChange={(v) => switchTab(v as "active" | "suspended")}
          />
        </div>
      ) : null}

      {status === "active" && lockedStatus === "active" ? (
        <>
          <StatsScope labels={scopeLabels(filters, fv)} onClear={() => setFv({})} />
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <Stat icon={<UsersThree />} value={counted.length} label="عدد أعضاء أدِيب" />
          </div>
        </>
      ) : null}

      {status === "suspended" && withFormer ? (
        <>
          <StatsScope
            labels={[...scopeLabels(filters, fv), kindScope]}
            onClear={() => { setFv({}); setHiddenKinds([]); }}
          />
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <Stat icon={<UserMinus />} value={counted.length} label="عضوٌ سابق" tone="danger" />
          </div>
          {/* أسبابُ الخروج حلقةً (اختيارُ المالك من خيارين في المعاينة، ٢٠٢٦-١٠-٠٩) */}
          <SectionCard title="أسباب الخروج" icon={<ChartDonut />} style={{ marginBottom: 18 }}>
            <Donut items={kinds} unit={MEMBER_UNIT} empty="لا أعضاء سابقين في هذا الكشف." hidden={hiddenKinds} onHiddenChange={setHiddenKinds} />
          </SectionCard>
        </>
      ) : null}

      <Toolbar
        searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
        search={search}
        onSearch={setSearch}
        filters={toolbarFilters}
        filterValues={{ ...fv, kind: kindValue }}
        onFilter={onToolbarFilter}
        onReset={() => { setFv({}); setHiddenKinds([]); }}
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
          columns={status === "suspended" ? suspendedColumns : columns}
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
                onRestore={m.canEnd ? () => openRestore(m) : undefined}
                onReason={() => openReason(m)}
                contactHref={contact && m.phone ? waHref(m.phone) : null}
              />
            ))}
          </div>
          <div className="card-pager">{pager}</div>
        </>
      )}

      {dialogs}
    </>
  );
}
