"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, ModalSectionHeading, Select, Stat } from "@adeeb/design-system";
import { AddressBook, At, BookOpen, Books, Buildings, CalendarBlank, CalendarX, Certificate, Copy, Envelope, Eye, GraduationCap, Hash, IdentificationBadge, IdentificationCard, InstagramLogo, LinkedinLogo, MagnifyingGlass, PencilSimple, Phone, Plus, Prohibit, ShareNetwork, Star, TiktokLogo, Trash, User, UsersThree, WarningCircle, XLogo } from "@phosphor-icons/react";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef, type ViewMode } from "../_components/Toolbar";
import { Modal } from "../_components/Modal";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { MemberCard } from "./MemberCard";
import type { MenuGroup } from "../_components/DropdownMenu";
import { Pagination } from "../_components/Pagination";
import { Avatar } from "../_components/Avatar";
import { EmptyState } from "../_components/EmptyState";
import { Skeleton } from "../_components/Skeleton";
import { useToast } from "../_components/ToastProvider";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { MemberRow, MemberStatus } from "./data";
import { DEGREES, DEGREE_VALUES, PHONE_RE, PHONE_HINT, hasAcademicFields } from "./vocab";
import { updateMember } from "./actions";

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
  // الفارغ مقبول (العمود يقبل NULL)، وأيّ نصّ آخر يجب أن يطابق الصيغة — القاعدة تفرضها بقيد مقابل
  phone: z.string().trim().refine((v) => !v || PHONE_RE.test(v), PHONE_HINT).optional(),
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
});
type MemberForm = z.infer<typeof memberSchema>;

const STATUS: Record<MemberStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  active: { label: "نشط", tone: "success" },
  pending: { label: "قيد الإكمال", tone: "warning" },
  suspended: { label: "موقوف", tone: "danger" },
  inactive: { label: "غير نشط", tone: "neutral" },
};
// نغمة سطح الجدول/الكرت بالحالة — النشط بهوية العلامة (فولاذيّ) لا أخضر (الأغلبيّة الافتراضيّة)؛
// الأخضر يبقى لشارة «نشط» عبر STATUS.tone فقط. قيد الإكمال/موقوف يحملان دلالتهما.
const SURFACE_TONE: Record<MemberStatus, "success" | "warning" | "danger" | undefined> = {
  active: undefined, pending: "warning", suspended: "danger", inactive: undefined,
};
// أوّل حرفين من الاسم لأفتار النافذة، ولون نقطة الحالة في الأفتار المربّع
// حالة العضو → نقطة الأفتار الموحّدة (نظام .av-dot)
const AV_STATUS: Record<MemberStatus, "online" | "away" | "busy" | "offline"> = {
  active: "online", pending: "away", suspended: "busy", inactive: "offline",
};

// عنوان كل قسم حسب الحالة المثبّتة
const SECTION: Record<"all" | MemberStatus, { title: string; noun: string }> = {
  all: { title: "كل الأعضاء", noun: "عضو" },
  active: { title: "الأعضاء النشطون", noun: "عضو نشط" },
  pending: { title: "قيد إكمال البيانات", noun: "عضو" },
  suspended: { title: "الأعضاء الموقوفون", noun: "عضو موقوف" },
  inactive: { title: "غير النشطين", noun: "عضو" },
};

const uniq = (arr: string[]) => [...new Set(arr)];

const Ico = {
  eye: <Eye />,
  edit: <PencilSimple />,
  trash: <Trash />,
};

const columns: Column<MemberRow>[] = [
  {
    key: "member", header: "العضو", width: "minmax(220px, 2.2fr)", sortable: true,
    render: (m) => {
      const rc = [m.role, m.committee].filter(Boolean).join(" ") || "غير متوفّر";
      return (
        <div className="dt-mem">
          <Avatar name={m.name} src={m.avatar ?? undefined} size="sm" />
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

// تبويب الموقوفين: العضو + تاريخ إنهاء العضوية + سببه (بدل الجوّال/البريد/الانضمام)
const suspendedColumns: Column<MemberRow>[] = [
  columns[0],
  { key: "endDate", header: "تاريخ إنهاء العضوية", width: "1.2fr", render: (m) => (m.endDate ? <span className="txt">{m.endDate}</span> : <span className="txt na">غير مسجّل</span>) },
  { key: "endReason", header: "سبب إنهاء العضوية", width: "minmax(240px, 2.6fr)", render: (m) => (m.endReason ? <span className="txt txt-wrap">{m.endReason}</span> : <span className="txt na">غير مذكور</span>) },
];

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; member: MemberRow }
  | { mode: "view"; member: MemberRow }
  | null;

// منصّات التواصل — المفتاح حقلٌ في MemberRow، وبانٍ للرابط من المُعرّف
const SOCIALS = [
  { key: "twitter", label: "منصّة X", url: (h: string) => `https://x.com/${h}` },
  { key: "instagram", label: "إنستغرام", url: (h: string) => `https://instagram.com/${h}` },
  { key: "tiktok", label: "تيك توك", url: (h: string) => `https://tiktok.com/@${h}` },
  { key: "linkedin", label: "لينكدإن", url: (h: string) => `https://linkedin.com/in/${h}` },
] as const;

// أيقونة كل منصّة (شعارها) — تُستعمل في قسم التواصل الاجتماعيّ بعرض الملفّ
const SOCIAL_ICON: Record<string, React.ReactNode> = {
  twitter: <XLogo />, instagram: <InstagramLogo />, tiktok: <TiktokLogo />, linkedin: <LinkedinLogo />,
};

// يقبل رابطًا كاملًا أو مُعرّفًا (مع/بلا @) فيبني الرابط الصحيح
const socialHref = (key: string, raw: string) => {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const h = t.replace(/^@/, "");
  return SOCIALS.find((s) => s.key === key)?.url(h) ?? t;
};

// خليّة بيانات في شبكة عرض الملفّ: أيقونة + تسمية، ثمّ القيمة، وزرّ نسخ (أو رابط للتواصل)
function Cell({ label, value, icon, lat, full, href }: { label: string; value: string | null; icon: React.ReactNode; lat?: boolean; full?: boolean; href?: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const empty = value == null || value === "";
  const copy = async () => {
    if (empty || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
      toast.success(`نُسِخ: ${label}`);
    } catch { toast.error("تعذّر النسخ"); }
  };
  return (
    <div className={"pva-cell" + (full ? " full" : "")}>
      <div className="pva-lbl"><span className="pva-lic">{icon}</span>{label}</div>
      {empty ? (
        <div className="pva-val na">غير متوفّر</div>
      ) : href ? (
        <a className={"pva-val" + (lat ? " lat" : "")} href={href} target="_blank" rel="noreferrer">{value}</a>
      ) : (
        <div className={"pva-val" + (lat ? " lat" : "")}>{value}</div>
      )}
      {!empty && !href ? (
        <button type="button" className={"pva-copy" + (done ? " done" : "")} onClick={copy} aria-label={`نسخ ${label}`} title="نسخ">
          <span className="ic-copy"><Copy aria-hidden /></span>
          <span className="ic-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12l5 5L20 6" /></svg></span>
        </button>
      ) : null}
    </div>
  );
}

// قسم في عرض الملفّ: فاصل خفيف (أيقونة هوية + عنوان) ثمّ شبكة خلاياه؛ end=نغمة خطر (إنهاء العضويّة)
function Section({ icon, title, end, children }: { icon: React.ReactNode; title: string; end?: boolean; children: React.ReactNode }) {
  return (
    <section className={"pva-sec" + (end ? " pva-sec--end" : "")}>
      <ModalSectionHeading icon={icon} title={title} tone={end ? "danger" : "default"} />
      <div className="pva-grid">{children}</div>
    </section>
  );
}

// جسم عرض الملفّ: رأس (اسم/دور/شارة) + أقسام معنونة بحقول العضو الحقيقيّة.
// تُخفى الأقسام الخالية (أكاديميّ بلا بيانات · لا تواصل اجتماعيّ · غير منتهٍ)؛ والحقول الفارغة تظهر «غير متوفّر».
// استثناء: اللجنة والقسم والكلّية والتخصّص والرقم الأكاديميّ تُخفى إن خلَت — لأنّ خلوّها يعني أنّ الدور/الدرجة
// لا يحملها أصلًا لا أنّ البيانات ناقصة: الإدارة العليا بلا لجنة ولا قسم، و«ثانوية عامة»/«موظف» بلا كلّية ولا
// تخصّص ولا رقم أكاديميّ — يفرض خلوّها قيدُ member_details_academic_fields_check، فالخلوّ فحصٌ كافٍ هنا.
function ProfileBody({ member }: { member: MemberRow }) {
  // المنصّات المملوءة فقط — وثلاثٌ منها تترك الأخيرة نصفَ صفّ في شبكة العمودين، فتُمدّ لصفّ كامل
  const filledSocials = SOCIALS.filter((s) => member[s.key]);
  const socialCells = filledSocials.map((s, i) => {
    const val = member[s.key] as string;
    return <Cell key={s.key} label={s.label} icon={SOCIAL_ICON[s.key]} value={val.replace(/^@/, "")} lat href={socialHref(s.key, val)} full={filledSocials.length === 3 && i === 2} />;
  });
  const hasAcademic = [member.college, member.major, member.degree, member.recordNo].some((v) => v != null && v !== "");
  // قسم الإنهاء للموقوفين فقط — لا يظهر لعضو أُعيد تفعيله وبقيت لديه بيانات إنهاء قديمة (terminated_at مختوم بتريغر)
  const terminated = member.status === "suspended" && !!(member.endReason || member.endDate);
  return (
    <>
      <div className="pvb-name">{member.name}</div>
      <div className="pvb-role">{[member.role, member.committee].filter(Boolean).join(" · ") || "غير متوفّر"}</div>
      <div className="pvb-badges"><Badge tone={STATUS[member.status].tone} variant="soft" dot live={member.status === "active"}>{STATUS[member.status].label}</Badge></div>
      <div className="pva-sections">
        <Section icon={<IdentificationCard weight="fill" />} title="بيانات العضويّة">
          <Cell label="الدور" icon={<Star />} value={member.role} />
          <Cell label="تاريخ الانضمام" icon={<CalendarBlank />} value={member.joined} />
          {member.dept ? <Cell full label="القسم" icon={<Buildings />} value={member.dept} /> : null}
          {member.committee ? <Cell full label="اللجنة" icon={<UsersThree />} value={member.committee} /> : null}
        </Section>
        <Section icon={<AddressBook weight="fill" />} title="بيانات التواصل">
          <Cell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value={member.email} />
          <Cell full lat label="رقم الجوّال" icon={<Phone />} value={member.phone} />
        </Section>
        {hasAcademic ? (
          <Section icon={<Books weight="fill" />} title="البيانات الأكاديميّة">
            {member.college ? <Cell full label="الكلّية" icon={<GraduationCap />} value={member.college} /> : null}
            <Cell full={!member.major} label="الدرجة العلمية" icon={<Certificate />} value={member.degree} />
            {member.major ? <Cell label="التخصّص" icon={<BookOpen />} value={member.major} /> : null}
            {member.recordNo ? <Cell full lat label="الرقم الأكاديميّ" icon={<IdentificationCard />} value={member.recordNo} /> : null}
          </Section>
        ) : null}
        {socialCells.length > 0 ? (
          <Section icon={<ShareNetwork weight="fill" />} title="التواصل الاجتماعيّ">
            {socialCells}
          </Section>
        ) : null}
        {terminated ? (
          <Section end icon={<Prohibit weight="fill" />} title="إنهاء العضويّة">
            <Cell full label="سبب الإنهاء" icon={<WarningCircle />} value={member.endReason} />
            <Cell full label="تاريخ الإنهاء" icon={<CalendarX />} value={member.endDate} />
          </Section>
        ) : null}
      </div>
    </>
  );
}

export function MembersView({ members, lockedStatus }: { members: MemberRow[]; lockedStatus?: MemberStatus }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDel, setConfirmDel] = useState<MemberRow | null>(null);
  // نموذج الإضافة/التعديل عبر React Hook Form + Zod
  const editForm = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", phone: "", college: "", degree: "", major: "", recordNo: "", twitter: "", instagram: "", tiktok: "", linkedin: "", hasDetails: false },
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<ViewMode>("table");

  // نمط العرض محفوظ بين الجلسات
  useEffect(() => { setView(localStorage.getItem("members-view") === "cards" ? "cards" : "table"); }, []);
  const changeView = (v: ViewMode) => { setView(v); localStorage.setItem("members-view", v); };

  const section = SECTION[lockedStatus ?? "all"];
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
    const q = search.trim().toLowerCase();
    return scope.filter((m) => {
      if (q && !(m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))) return false;
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
      icon={<UsersThree weight="duotone" />}
      title={`لا ${section.noun} بعد`}
      description="لا أعضاء في هذا القسم حاليًّا."
      action={<Button variant="primary" size="md" onClick={openAdd}><Plus size={18} />إضافة عضو</Button>}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass weight="duotone" />}
      title="لا أعضاء مطابقون"
      description="لم نعثر على أعضاء يطابقون بحثك أو مرشّحاتك. جرّب تعديل المعايير."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>}
    />
  );

  const actionsFor = (m: MemberRow): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "عرض الملف", icon: Ico.eye, onSelect: () => openView(m) },
        { label: "تعديل البيانات", icon: Ico.edit, onSelect: () => openEdit(m) },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف العضو", icon: Ico.trash, danger: true, onSelect: () => setConfirmDel(m) }],
    },
  ];

  // الكرت فيه زرّ «عرض الملف الشخصي» صريح، فنزيل بند «عرض الملف» من قائمة نقاطه (يبقى في الجدول)
  const cardActionsFor = (m: MemberRow): MenuGroup[] =>
    actionsFor(m)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "عرض الملف") }))
      .filter((g) => g.items.length > 0);

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun={section.noun} />
  ) : null;

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › أعضاء أديب › <b>{section.title}</b></div>
          <h1>{section.title}</h1>
        </div>
      </div>

      {lockedStatus === "active" ? (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <Stat icon={<UsersThree weight="fill" />} value={scope.length} label="عدد أعضاء أديب" />
        </div>
      ) : null}

      <Toolbar
        searchPlaceholder="ابحث بالاسم أو البريد…"
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
        bulkActions={
          <>
            <button type="button" className="tb-ba" onClick={() => toast.info(`جارٍ تغيير حالة ${selected.size} عضو…`)}>تغيير الحالة</button>
            <button type="button" className="tb-ba" onClick={() => toast.info(`جارٍ تجهيز ملف ${selected.size} عضو…`)}>تصدير</button>
            <button type="button" className="tb-ba dg" onClick={() => { toast.success(`حُذف ${selected.size} عضو.`); setSelected(new Set()); }}>حذف</button>
          </>
        }
      />

      {view === "table" ? (
        <DataTable
          columns={lockedStatus === "suspended" ? suspendedColumns : columns}
          rows={pageRows}
          getRowId={(m) => m.id}
          selectable
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
        <div className="mc-empty">{emptyState}</div>
      ) : (
        <>
          <div className="mc-grid mc-grid-anim" key={`${safePage}-${sort?.id ?? ""}-${sort?.desc ?? ""}`}>
            {pageRows.map((m, i) => (
              <div key={m.id} className="mc-card-anim" style={{ animationDelay: `${i * 0.045}s` }}>
                <MemberCard
                  member={m}
                  onOpen={() => openView(m)}
                  actions={cardActionsFor(m)}
                  onRestore={() => toast.success(`أُعيدت عضوية «${m.name}».`)}
                  onDelete={() => setConfirmDel(m)}
                />
              </div>
            ))}
          </div>
          <div className="mc-pager">{pager}</div>
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={close}
        title={modal?.mode === "view" ? (member?.name ?? "الملفّ الشخصيّ") : modal?.mode === "add" ? "إضافة عضو" : "تعديل العضو"}
        description={
          modal?.mode === "view" ? undefined
            : modal?.mode === "add" ? "أدخِل بيانات العضو الجديد." : "حدّث بيانات العضو ثمّ احفظ."
        }
        size="md"
        className={modal?.mode === "view" ? "pvb-modal" : undefined}
        hero={
          modal?.mode === "view" && member ? (
            <Avatar name={member.name} src={member.avatar ?? undefined} size="2xl" status={AV_STATUS[member.status]} className="pvb-av" />
          ) : undefined
        }
        footer={
          modal?.mode === "view" ? (
            <>
              <Button variant="ghost" size="md" onClick={close}>إغلاق</Button>
              {member ? <Button variant="primary" size="md" onClick={() => openEdit(member)}>تعديل</Button> : null}
            </>
          ) : modal?.mode === "edit" ? (
            // تذييل هدّام: إجراء الحذف يسارًا، والحفظ/الإلغاء يمينًا
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 10 }}>
              <Button variant="ghost-danger" size="md" onClick={() => { if (member) { close(); setConfirmDel(member); } }}>حذف العضو</Button>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="ghost" size="md" onClick={close}>إلغاء</Button>
                <Button type="submit" form="member-form" variant="primary" size="md" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}</Button>
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
            <ModalSectionHeading className="mdl-full" icon={<IdentificationBadge weight="fill" />} title="البيانات الأساسيّة" />
            <Field className="mdl-full" label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب الاسم" error={editForm.formState.errors.name?.message} {...editForm.register("name")} />

            <ModalSectionHeading className="mdl-full" icon={<AddressBook weight="fill" />} title="بيانات التواصل" />
            {/* البريد هويّة مصادقة لا بيان تواصل: يُغيَّر من «بيانات الدخول» حيث يُزامَن مع auth.users — كتابته هنا وحده تفكّ المزامنة */}
            <Field className="mdl-full" label="رقم الجوّال" type="tel" charset="digits" icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" error={editForm.formState.errors.phone?.message} {...editForm.register("phone")} />
            <Field className="mdl-full" label="البريد الإلكترونيّ" type="email" charset="latin" disabled readOnly value={member?.email ?? ""} icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" helper="يُغيَّر من «بيانات الدخول»." />

            {member && member.degreeRaw == null ? (
              <Alert className="mdl-full" tone="warning" title="لا سجلّ تفاصيل لهذا العضو">
                البيانات الأكاديميّة والتواصل الاجتماعيّ لن تُحفظ له — سجلّها يُنشأ عند إكمال بيانات الالتحاق. أمّا الاسم ورقم الجوّال فيُحفظان.
              </Alert>
            ) : null}

            <ModalSectionHeading className="mdl-full" icon={<Books weight="fill" />} title="البيانات الأكاديميّة" />
            <Controller
              control={editForm.control}
              name="degree"
              render={({ field }) => (
                <Select className="mdl-full" label="الدرجة العلمية" icon={<Certificate />} options={DEGREES} value={field.value ?? ""} onValueChange={field.onChange} error={editForm.formState.errors.degree?.message} />
              )}
            />
            {/* الحقول الثلاثة تتبع الدرجة: تظهر لصاحب الدرجة الجامعيّة وحده. «ثانوية عامة» و«موظف» لا كلّية
                لهما ولا تخصّص ولا رقم أكاديميّ — تُخفى هنا، ويمحوها الفعل الخادميّ، ويردّ الممتلئ قيدُ القاعدة. */}
            {hasAcademicFields(editForm.watch("degree")) ? (
              <>
                <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={editForm.formState.errors.college?.message} {...editForm.register("college")} />
                <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={editForm.formState.errors.major?.message} {...editForm.register("major")} />
                <Field className="mdl-full" label="الرقم الأكاديميّ" charset="digits" icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" error={editForm.formState.errors.recordNo?.message} {...editForm.register("recordNo")} />
              </>
            ) : null}

            <ModalSectionHeading className="mdl-full" icon={<ShareNetwork weight="fill" />} title="التواصل الاجتماعيّ" />
            <Field label="تويتر (X)" charset="latin" icon={<XLogo />} innerIcon={<At />} placeholder="المعرّف بلا @" error={editForm.formState.errors.twitter?.message} {...editForm.register("twitter")} />
            <Field label="إنستغرام" charset="latin" icon={<InstagramLogo />} innerIcon={<At />} placeholder="المعرّف بلا @" error={editForm.formState.errors.instagram?.message} {...editForm.register("instagram")} />
            <Field label="تيك توك" charset="latin" icon={<TiktokLogo />} innerIcon={<At />} placeholder="المعرّف بلا @" error={editForm.formState.errors.tiktok?.message} {...editForm.register("tiktok")} />
            <Field label="لينكدإن" charset="latin" icon={<LinkedinLogo />} innerIcon={<At />} placeholder="المعرّف بلا @" error={editForm.formState.errors.linkedin?.message} {...editForm.register("linkedin")} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        tone="danger"
        icon={<Trash weight="bold" />}
        title="حذف العضو؟"
        text={confirmDel ? `سيُحذف «${confirmDel.name}» نهائيًّا. لا يمكن استرجاعه.` : undefined}
        confirmLabel="حذف نهائيّ"
        onConfirm={() => { if (confirmDel) { toast.success(`حُذف «${confirmDel.name}».`); setConfirmDel(null); } }}
      />
    </>
  );
}
