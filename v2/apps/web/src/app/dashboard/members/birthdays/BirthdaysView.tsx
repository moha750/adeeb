"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Stat, matchesSearch } from "@adeeb/design-system";
import { Cake, CalendarDots, Confetti, UsersFour } from "@phosphor-icons/react";
import { DownloadSimple, MagnifyingGlass } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { Pagination } from "../../_components/Pagination";
import { Avatar } from "../../_components/Avatar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import type { BirthdayRow } from "./data";
import { prewarmBirthdayCard, saveBirthdayCard } from "./card";
import { PageHeader } from "../../_components/PageHeader";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

type ViewMode = "soon" | "month";
type Today = { y: number; m0: number; d: number };

// صفّ مُشتقّ — «الآن» يأتي من الخادم (بتوقيت الرياض) فيُحسب العدّ التنازليّ والعمر مرّةً واحدة اتّساقًا،
// بلا لحظةٍ عميليّةٍ تخالف الخادم (فلا عدمُ تطابقٍ عند الإماهة) وبلا effect يضبط الحالة.
type Derived = BirthdayRow & {
  month: number;    // 0–11
  day: number;
  birthYear: number;
  daysUntil: number;
  ageTurning: number;
  isToday: boolean;
};

function derive(row: BirthdayRow, today: Today): Derived {
  const [y, m, d] = row.birthDate.split("-").map(Number);
  const month = (m || 1) - 1;
  const day = d || 1;
  const t = new Date(today.y, today.m0, today.d);
  let nb = new Date(today.y, month, day);
  if (nb < t) nb = new Date(today.y + 1, month, day);
  const daysUntil = Math.round((nb.getTime() - t.getTime()) / 86400000);
  return { ...row, month, day, birthYear: y || 0, daysUntil, ageTurning: nb.getFullYear() - (y || 0), isToday: daysUntil === 0 };
}

function countdownText(d: number): string {
  if (d === 0) return "اليوم";
  if (d === 1) return "غدًا";
  if (d === 2) return "بعد يومين";
  if (d <= 10) return `بعد ${d} أيّام`;
  return `بعد ${d} يومًا`;
}

// تمييز العدد العربيّ للسنوات: ١ سنة · ٢ سنتان · ٣–١٠ سنوات · ١١+ سنة (مفرد)
function yearsText(n: number): string {
  if (n === 1) return "سنة";
  if (n === 2) return "سنتان";
  if (n >= 3 && n <= 10) return `${n} سنوات`;
  return `${n} سنة`;
}

// عدّ مواليد الشهر بصيغة صريحة: يوم ميلاد · يوما ميلاد · ٨ أيّام ميلاد · ١٥ يوم ميلاد
function birthdaysText(n: number): string {
  if (n === 1) return "يوم ميلاد";
  if (n === 2) return "يوما ميلاد";
  if (n <= 10) return `${n} أيّام ميلاد`;
  return `${n} يوم ميلاد`;
}

/** نطاق الرائي — تقرّره الصفحة بالقدرة، وتقوله الشاشة بلا أن تحسبه. */
export type BirthdayScope = "all" | "supervised";

export function BirthdaysView({
  members,
  todayIso,
  scope = "all",
}: {
  members: BirthdayRow[];
  todayIso: string;
  scope?: BirthdayScope;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("soon");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = useMemo<Today>(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    return { y: y || 2000, m0: (m || 1) - 1, d: d || 1 };
  }, [todayIso]);

  const rows = useMemo(() => {
    return members
      .filter((r) => matchesSearch(search, r.name))
      .map((r) => derive(r, today));
  }, [members, search, today]);

  const stats = useMemo(() => ({
    todayCount: rows.filter((r) => r.isToday).length,
    weekCount: rows.filter((r) => r.daysUntil <= 7).length,
    monthCount: rows.filter((r) => r.month === today.m0).length,
  }), [rows, today]);

  // «الأقرب»: مرتّب بأقرب ميلاد قادم (فاليوم فالشهر عند التساوي)
  const soonRows = useMemo(() =>
    [...rows].sort((a, b) => a.daysUntil - b.daysUntil || a.month - b.month || a.day - b.day),
  [rows]);

  // «حسب الشهر»: مجموعات تقويميّة (الشهور الفارغة تُخفى)، وداخل الشهر ترتيبٌ باليوم
  const byMonth = useMemo(() => {
    const groups: { month: number; rows: Derived[] }[] = [];
    for (let m = 0; m < 12; m++) {
      const mr = rows.filter((r) => r.month === m).sort((a, b) => a.day - b.day);
      if (mr.length) groups.push({ month: m, rows: mr });
    }
    return groups;
  }, [rows]);

  // إعادة الترقيم للصفحة الأولى عند تغيّر البحث/المقاس/العرض — أثناء الرندر (نمط «معلومة من رندر سابق»)،
  // لا في effect (القاعدة react-hooks/set-state-in-effect، ومُصرِّف React يفرضها على هذا المكوّن).
  const pageKey = `${search}|${pageSize}|${view}`;
  const [prevKey, setPrevKey] = useState(pageKey);
  if (prevKey !== pageKey) { setPrevKey(pageKey); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(soonRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = soonRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // تسخين القالب والخطّ عند فتح التبويب — فتُولَّد البطاقة فورًا عند النقرة ويبقى إذن اللمسة
  // حيًّا لورقة المشاركة (وإلّا سقط الإذن وارتدّت إلى التنزيل). انظر prewarmBirthdayCard.
  useEffect(() => { prewarmBirthdayCard(); }, []);

  const onDownload = async (r: Derived) => {
    setBusyId(r.id);
    try {
      const how = await saveBirthdayCard({ name: r.name, favoriteColor: r.favoriteColor });
      if (how === "shared") toast.success(`تهنئة «${r.name}» جاهزة.`);
      else if (how === "downloaded") toast.success(`نُزّلت تهنئة «${r.name}».`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد التهنئة.");
    } finally {
      setBusyId(null);
    }
  };

  const memberCol: Column<Derived> = {
    key: "member", header: "العضو", width: "minmax(200px, 2fr)",
    render: (r) => (
      <div className="dt-mem">
        <Avatar name={r.name} src={r.avatar ?? undefined} gender={r.gender} size="sm" />
        <span className="dt-mm"><b>{r.name}</b><span>مواليد {r.birthYear}</span></span>
      </div>
    ),
  };
  const dateCol: Column<Derived> = {
    key: "date", header: "تاريخ الميلاد", width: "1fr",
    render: (r) => <span className="txt">{r.day} {MONTHS[r.month]}</span>,
  };
  const ageCol: Column<Derived> = {
    key: "age", header: "يُتمّ", width: "1fr",
    render: (r) => <span className="txt">{yearsText(r.ageTurning)}</span>,
  };
  const downloadCol: Column<Derived> = {
    key: "card", header: "التهنئة", width: "150px", align: "end",
    render: (r) => (
      <Button variant="ghost" size="sm" loading={busyId === r.id} onClick={() => onDownload(r)}>
        <DownloadSimple aria-hidden /> حفظ
      </Button>
    ),
  };
  const countdownCol: Column<Derived> = {
    key: "countdown", header: "قادم", width: "1.2fr",
    render: (r) =>
      r.isToday
        ? <Badge tone="success" variant="soft" icon={<Confetti />}>{countdownText(0)}</Badge>
        : <span className="txt">{countdownText(r.daysUntil)}</span>,
  };
  const soonColumns: Column<Derived>[] = [memberCol, dateCol, countdownCol, ageCol, downloadCol];
  const monthColumns: Column<Derived>[] = [memberCol, dateCol, ageCol, downloadCol];

  const emptyState = members.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<Cake />}
      title={scope === "supervised" ? "لا مواليد في نطاق إشرافك" : "لا مواليد مسجّلة بعد"}
      description={
        scope === "supervised"
          ? "لا يظهر هنا إلّا مواليد من تشرف عليهم، فإن لم تُسنَد إليك لجانٌ بعد، أو لم يسجّل أعضاؤها تواريخهم، بقيت الشاشة فارغة."
          : "لا يوجد أعضاء نشطون بتاريخ ميلاد مسجّل حاليًّا."
      }
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا أعضاء مطابقون"
      description="لم نعثر على من يطابق بحثك. جرّب اسمًا آخر."
      action={<Button variant="ghost" size="md" onClick={() => setSearch("")}>مسح البحث</Button>}
    />
  );

  return (
    <>
      {/* النطاق يُقال حيث يُرى — فلا يُحسب الجزءُ كلًّا. وموضعُه سطرُ الفتات: حالٌ لا فعل. */}
      <PageHeader
        title="أعياد الميلاد"
        status={scope === "supervised" ? <Badge tone="info" variant="soft" icon={<UsersFour />}>مواليد من تشرف عليهم</Badge> : undefined}
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Cake />} value={stats.todayCount} label="ميلاد اليوم" tone={stats.todayCount > 0 ? "success" : "brand"} />
        <Stat icon={<Confetti />} value={stats.weekCount} label="خلال أسبوع" />
        <Stat icon={<CalendarDots />} value={stats.monthCount} label={`مواليد هذا الشهر (${MONTHS[today.m0]})`} />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالاسم…"
        search={search}
        onSearch={setSearch}
        actions={
          <>
            <Button variant={view === "soon" ? "primary" : "ghost"} size="sm" onClick={() => setView("soon")}>الأقرب</Button>
            <Button variant={view === "month" ? "primary" : "ghost"} size="sm" onClick={() => setView("month")}>حسب الشهر</Button>
          </>
        }
      />

      {view === "soon" ? (
        <DataTable
          columns={soonColumns}
          rows={pageRows}
          getRowId={(r) => r.id}
          emptyState={emptyState}
          footer={soonRows.length ? (
            <Pagination page={safePage} pageSize={pageSize} total={soonRows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="عضو" />
          ) : undefined}
        />
      ) : byMonth.length === 0 ? (
        <DataTable columns={monthColumns} rows={[]} getRowId={(r) => r.id} emptyState={emptyState} />
      ) : (
        /* جدولٌ واحدٌ مجمَّع: الشهرُ شريطٌ يشقّ الشبكة، وشهرُ اليومِ منغَّمٌ بالنجاح ليُلتقط بالعين.
           كان أكورديونًا يلفّ جدولًا، أي إطارًا داخل إطار.
           ويُفتح شهرُ اليوم وحدَه: هذا عرضُ التصفّح (المسطّحُ المرقَّم في «الأقرب»)، فاثنا عشر
           شهرًا مفتوحةً تُغرق ما يهمّ الآن — والنغمةُ والفتحُ يقولان الشيءَ نفسه. */
        <DataTable
          columns={monthColumns}
          groups={byMonth.map((g) => ({
            key: String(g.month),
            // «(الشهر الحالي)» نصًّا لا نغمةً وحدَها: الأخضرُ والفتحُ يقولانها لمن يرى اللون،
            // والكلمةُ تقولها للجميع (مبدأ ق١٠: لا تُقرأ الهويّة باللون وحده).
            label: `شهر ${MONTHS[g.month]}${g.month === today.m0 ? " (الشهر الحالي)" : ""}`,
            hint: birthdaysText(g.rows.length),
            tone: g.month === today.m0 ? ("success" as const) : undefined,
            // شهرُ اليوم وحدَه مفتوحٌ في التصفّح — **إلّا أن يكون هناك بحث، فتُفتح كلُّها**:
            // الباحثُ يطلب نتيجةً لا تصنيفًا، وشريطٌ مغلقٌ فوق نتيجته يجعل البحثَ يبدو معطوبًا.
            defaultOpen: search.trim() !== "" || g.month === today.m0,
            rows: g.rows,
          }))}
          getRowId={(r) => r.id}
        />
      )}
    </>
  );
}
