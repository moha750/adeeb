"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Container } from "@adeeb/design-system";
import { UsersThree } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../dashboard/_components/DataTable";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import { Avatar } from "../../dashboard/_components/Avatar";
import { Pagination } from "../../dashboard/_components/Pagination";
import { EmptyState } from "../../dashboard/_components/EmptyState";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// نوع صفّ تجريبيّ يحاكي MemberRow المستعمَل في شاشة الأعضاء الحقيقيّة
type DemoStatus = "active" | "pending" | "suspended" | "inactive";
type DemoRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  joined: string;
  joinedRaw: string; // ISO للفرز الزمنيّ الصحيح
  status: DemoStatus;
};

const STATUS: Record<DemoStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  active: { label: "نشط", tone: "success" },
  pending: { label: "بانتظار المراجعة", tone: "warning" },
  suspended: { label: "موقوف", tone: "danger" },
  inactive: { label: "غير نشط", tone: "neutral" },
};

// نغمة صفّ حسب الحالة (كما في العرض المختلط للأعضاء)
const rowToneOf = (m: DemoRow): "success" | "warning" | "danger" | undefined =>
  m.status === "active" ? "success" : m.status === "pending" ? "warning" : m.status === "suspended" ? "danger" : undefined;

const ROWS: DemoRow[] = [
  { id: "1", name: "محمّد إسماعيل", role: "رئيس النادي", phone: "0551234567", email: "mohammad@adeeb.club", joined: "3 مارس 2024", joinedRaw: "2024-03-03", status: "active" },
  { id: "2", name: "سارة القحطاني", role: "نائبة الرئيس", phone: "0509876543", email: "sara@adeeb.club", joined: "17 سبتمبر 2024", joinedRaw: "2024-09-17", status: "active" },
  { id: "3", name: "فهد العتيبي", role: "عضو لجنة الإعلام", phone: "0567654321", email: "fahad@adeeb.club", joined: "2 يناير 2025", joinedRaw: "2025-01-02", status: "pending" },
  { id: "4", name: "ليلى المطيري", role: "منسّقة الفعاليّات", phone: "0533219876", email: "laila@adeeb.club", joined: "28 مايو 2023", joinedRaw: "2023-05-28", status: "suspended" },
  { id: "5", name: "عبدالله الشمري", role: "عضو", phone: "0544455667", email: "abdullah@adeeb.club", joined: "11 نوفمبر 2022", joinedRaw: "2022-11-11", status: "inactive" },
];

// أعمدة تحاكي أعمدة شاشة الأعضاء: خليّة العضو (أفتار + اسم + دور)، جوّال، بريد، تاريخ، حالة (شارة)
const columns: Column<DemoRow>[] = [
  {
    key: "member",
    header: "العضو",
    width: "minmax(220px, 2.2fr)",
    sortable: true,
    render: (m) => (
      <div className="dt-mem">
        <Avatar name={m.name} size="sm" />
        <span className="dt-mm">
          <b>{m.name}</b>
          <span>{m.role}</span>
        </span>
      </div>
    ),
  },
  { key: "phone", header: "رقم الجوّال", width: "1fr", sortable: true, render: (m) => <span className="txt lat">{m.phone}</span> },
  { key: "email", header: "البريد الإلكترونيّ", width: "minmax(180px, 1.8fr)", sortable: true, render: (m) => <span className="txt lat">{m.email}</span> },
  { key: "joined", header: "تاريخ الانضمام", width: "1.1fr", sortable: true, render: (m) => <span className="txt">{m.joined}</span> },
  {
    key: "status",
    header: "الحالة",
    width: "130px",
    align: "center",
    render: (m) => (
      <Badge tone={STATUS[m.status].tone} variant="soft" dot live={m.status === "active"}>
        {STATUS[m.status].label}
      </Badge>
    ),
  },
];

// قيمة الفرز لكلّ عمود (نصّ العرض، والتاريخ بالـ ISO للترتيب الزمنيّ الصحيح)
const sortValue = (m: DemoRow, id: string): string => {
  switch (id) {
    case "member": return m.name;
    case "phone": return m.phone;
    case "email": return m.email;
    case "joined": return m.joinedRaw;
    default: return "";
  }
};

export default function TablePage() {
  // فرز مُتحكَّم به (كما يُدار في الشاشة الحقيقيّة عبر TanStack Table)
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>({ id: "member", desc: false });
  const toggleSort = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, desc: false } : s.desc ? null : { id, desc: true }));
  const sortedRows = useMemo(() => {
    if (!sort) return ROWS;
    const out = [...ROWS].sort((a, b) => sortValue(a, sort.id).localeCompare(sortValue(b, sort.id), "ar"));
    return sort.desc ? out.reverse() : out;
  }, [sort]);

  // تحديد مُتحكَّم به (يُشارَك مع شريط أدوات)
  const [selected, setSelected] = useState<Set<string>>(new Set(["1"]));

  // آخر تفاعل (نقر صفّ / إجراء من قائمة ⋯)
  const [event, setEvent] = useState<string | null>(null);
  const actionsFor = (m: DemoRow): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "عرض الملف", icon: <Eye aria-hidden />, onSelect: () => setEvent(`عرض الملف — ${m.name}`) },
        { label: "تعديل البيانات", icon: <PencilSimple aria-hidden />, onSelect: () => setEvent(`تعديل — ${m.name}`) },
        { label: "تغيير الحالة", icon: <ArrowsClockwise aria-hidden />, onSelect: () => setEvent(`تغيير الحالة — ${m.name}`) },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف العضو", icon: <Trash aria-hidden />, danger: true, onSelect: () => setEvent(`حذف — ${m.name}`) }],
    },
  ];

  // ترقيم (تذييل داخل بطاقة الجدول)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const pageRows = ROWS.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · DataTable</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض جدول البيانات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          جدولٌ بشبكة CSS بمظهر Aurora — أعمدة مرنة، ترويسة فرز مُتحكَّم بها، تحديد صفوف، قائمة إجراءات (⋯)، نقر الصفّ،
          نغمات للطاولة وللصفّ، تذييل ترقيم، حالة فارغة، وحالة تحميل بلبنات هيكل.
        </p>

        <div className="mt-10 flex items-center gap-3 rounded border border-line bg-surface px-5 py-3">
          <span className="font-latin text-xs font-bold uppercase tracking-[0.14em] text-content-muted">آخر تفاعل</span>
          <span className="text-sm font-bold text-content">{event ?? "لم يقع تفاعل بعد"}</span>
          {event ? (
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setEvent(null)}>
              إعادة
            </Button>
          ) : null}
        </div>

        <div className="mt-12 space-y-14">
          <Sec title="أساسيّ">
            <Lab>أعمدة بخلايا مخصّصة (render) — أفتار، أرقام لاتينيّة، وشارة حالة</Lab>
            <DataTable columns={columns} rows={ROWS} getRowId={(m) => m.id} />
          </Sec>

          <Sec title="قابل للفرز">
            <Lab>ترويسة فرز مُتحكَّم بها — انقر عمودًا: تصاعديّ ← تنازليّ ← بلا فرز</Lab>
            <DataTable columns={columns} rows={sortedRows} getRowId={(m) => m.id} sort={sort} onToggleSort={toggleSort} />
          </Sec>

          <Sec title="قابل للتحديد">
            <Lab>تحديد مُتحكَّم به (Set) — يُشارَك مع شريط أدوات؛ المُحدَّد الآن: {selected.size}</Lab>
            <DataTable
              columns={columns}
              rows={ROWS}
              getRowId={(m) => m.id}
              selectable
              selected={selected}
              onSelectedChange={setSelected}
            />
          </Sec>

          <Sec title="إجراءات الصفّ ونقره">
            <Lab>عمود ⋯ (مجموعات ذات رؤوس + بند خطر) · نقر الصفّ يفتح الملفّ</Lab>
            <DataTable
              columns={columns}
              rows={ROWS}
              getRowId={(m) => m.id}
              rowActions={actionsFor}
              onRowClick={(m) => setEvent(`فُتح ملفّ «${m.name}»`)}
            />
          </Sec>

          <Sec title="نغمة الطاولة (tone)">
            <Lab>الطاولة كاملةً بنغمة واحدة (حدّ/ترويسة/تزيبير) — success · warning · danger</Lab>
            <div className="space-y-8">
              {(["success", "warning", "danger"] as const).map((t) => (
                <div key={t}>
                  <p className="mb-2 font-latin text-[0.7rem] font-bold uppercase tracking-[0.14em] text-content-muted">{t}</p>
                  <DataTable columns={columns} rows={ROWS.slice(0, 2)} getRowId={(m) => m.id} tone={t} />
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="نغمة الصفّ (rowTone)">
            <Lab>تِنت كلّ صفّ حسب حالته — نشط (success) · قيد الإكمال (warning) · موقوف (danger)</Lab>
            <DataTable columns={columns} rows={ROWS} getRowId={(m) => m.id} rowActions={actionsFor} rowTone={rowToneOf} />
          </Sec>

          <Sec title="تذييل بالترقيم (footer)">
            <Lab>تذييل مُلحق داخل بطاقة الجدول — مكوّن الترقيم يقطّع الصفوف</Lab>
            <DataTable
              columns={columns}
              rows={pageRows}
              getRowId={(m) => m.id}
              footer={
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={ROWS.length}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                  pageSizeOptions={[3, 5, 10]}
                  noun="عضو"
                />
              }
            />
          </Sec>

          <Sec title="حالة فارغة (emptyState)">
            <Lab>يُعرض بدل الصفوف حين تكون القائمة فارغة</Lab>
            <DataTable
              columns={columns}
              rows={[]}
              getRowId={(m) => m.id}
              emptyState={
                <EmptyState
                  variant="aurora"
                  icon={<UsersThree />}
                  title="لا أعضاء بعد"
                  description="لا أعضاء في هذا القسم حاليًّا."
                  action={<Button variant="primary" size="md"><Plus size={18} />إضافة عضو</Button>}
                />
              }
            />
          </Sec>

          <Sec title="حالة التحميل (loading)">
            <Lab>صفوف هيكل بلبنات لمعان — عددها عبر skeletonRows</Lab>
            <DataTable columns={columns} rows={[]} getRowId={(m) => m.id} loading skeletonRows={4} selectable rowActions={actionsFor} />
          </Sec>
        </div>
      </Container>
    </main>
  );
}
