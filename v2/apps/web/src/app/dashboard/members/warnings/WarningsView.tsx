"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Stat, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import { NotePencil, ShieldWarning, UserMinus, WarningOctagon } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { Eye, MagnifyingGlass, Prohibit, Warning, WhatsappLogo } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { Pagination } from "../../_components/Pagination";
import { Avatar } from "../../_components/Avatar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { fmtDate, fmtDateOnly } from "@/lib/dates";
import { positionLine } from "@/lib/positionLabel";
import { WARNING_CATEGORIES, categoryLabel, dots, remainingText, toneOf, warningTitle } from "@/lib/warnings/vocab";
import { downloadWarningLetter } from "@/lib/warnings/letter";
import { warningWhatsappMessage } from "@/lib/warnings/message";
import { waHref } from "@/lib/whatsapp";
import { cancelWarning } from "./actions";
import { IssueWarningModal } from "./IssueWarningModal";
import type { WarningRow, WarningsData } from "./data";
import { PageHeader } from "../../_components/PageHeader";

type Mode = "members" | "all";

/**
 * **سجلّ الإنذارات** — غرفة إدارة الموارد البشريّة، ويطّلع عليها رئيس النادي والرئيس التنفيذي.
 *
 * عرضان لسجلٍّ واحد: **حسب العضو** (الأصل — الإنذار حالٌ لصاحبه لا حادثةٌ منفردة، فيُقرأ
 * «فلانٌ عليه اثنان من ثلاثة»)، و**كلّ الإنذارات** مسطّحًا حين يُطلب الحدث نفسه.
 *
 * والأفعال تتبع الصفَّ لا صاحبَ الشاشة: `mayManage` جوابُ القاعدة عن **هذا العضو بعينه**
 * (`can_issue_warning`) — فالرئيسان يريان السجلّ ولا يُصدران، وعضو الموارد لا يبلغ إلّا من يشرف عليهم.
 */
export function WarningsView({ data }: { data: WarningsData }) {
  const { rows, targets, limit, mayIssue } = data;
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>("members");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [issuing, setIssuing] = useState(false);
  const [cancelling, setCancelling] = useState<WarningRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [detail, setDetail] = useState<WarningRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesSearch(search, `${r.name} ${r.reason}`)) return false;
      if (filters.category && r.category !== filters.category) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.committee && (r.committee ?? "") !== filters.committee) return false;
      return true;
    });
  }, [rows, search, filters]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active");
    const byMember = new Map<string, number>();
    for (const r of active) byMember.set(r.userId, (byMember.get(r.userId) ?? 0) + 1);
    return {
      members: byMember.size,
      active: active.length,
      atLimit: [...byMember.values()].filter((n) => n >= limit).length,
    };
  }, [rows, limit]);

  // «حسب العضو» — مجموعاتٌ مرتّبةٌ بالأقرب إلى الحدّ ثمّ بالأحدث
  const groups = useMemo(() => {
    const map = new Map<string, WarningRow[]>();
    for (const r of filtered) {
      const list = map.get(r.userId);
      if (list) list.push(r); else map.set(r.userId, [r]);
    }
    return [...map.values()]
      .map((list) => ({ head: list[0], list, active: list.filter((r) => r.status === "active").length }))
      .sort((a, b) => b.active - a.active || (a.head.name < b.head.name ? -1 : 1));
  }, [filtered]);

  // هل ثمّة تنقيةٌ قائمة؟ — تفتح أشرطةَ «حسب العضو» المغلقةَ أصلًا (انظر موضعَ استعمالها)
  const filtering = search.trim() !== "" || Object.values(filters).some(Boolean);

  const pageKey = `${search}|${pageSize}|${mode}|${JSON.stringify(filters)}`;
  const [prevKey, setPrevKey] = useState(pageKey);
  if (prevKey !== pageKey) { setPrevKey(pageKey); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const letterOf = (r: WarningRow) => ({
    name: r.name,
    gender: r.gender,
    // النداء من **لقطة** الإنذار (منصبه ولجنتُه يومَها) لا من حاله اليوم — وهما لسطر النداء وحده،
    // وهما القطعتان كما يعرفهما `lib/positionLabel` فيصلهما النداءُ بقاعدته الواحدة.
    role: r.roleAr,
    committee: r.scope,
    ordinal: r.ordinal ?? 1,
    category: r.category,
    reason: r.reason,
    issuedAt: r.createdAt,
    activeCount: r.activeCount,
    limit,
  });

  const onDownload = async (r: WarningRow) => {
    try {
      await downloadWarningLetter(letterOf(r));
      toast.success(`نُزّل خطاب «${r.name}».`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الخطاب.");
    }
  };

  const onWhatsapp = (r: WarningRow) => {
    if (!r.phone) { toast.error("لا جوّال مسجّل لهذا العضو."); return; }
    window.open(waHref(r.phone, warningWhatsappMessage(letterOf(r))), "_blank", "noopener");
  };

  const submitCancel = () => {
    const w = cancelling;
    if (!w) return;
    start(async () => {
      const res = await cancelWarning({ warningId: w.id, reason: cancelReason });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(
        res.offerRestore
          ? "أُلغي الإنذار. وعضويّة صاحبه ما زالت منتهية، أعِدها من تبويب «أعضاء سابقون»."
          : res.message,
      );
      setCancelling(null);
      setCancelReason("");
    });
  };

  /** الشارة تقول رتبته أو إلغاءه — والرتبة تسقط عن الملغى لأنّه خرج من العدّ. */
  const stateBadge = (r: WarningRow) =>
    r.status === "cancelled" ? (
      <Badge tone="neutral" variant="outline" icon={<Prohibit />}>ملغى</Badge>
    ) : (
      <Badge tone={toneOf(r.ordinal ?? 1, limit)} variant="soft" icon={<Warning />}>
        {warningTitle(r.ordinal ?? 1)}
      </Badge>
    );

  const memberCol: Column<WarningRow> = {
    key: "member", header: "العضو", width: "minmax(190px, 1.6fr)",
    render: (r) => (
      <div className="dt-mem">
        <Avatar name={r.name} src={r.avatar ?? undefined} gender={r.gender} size="sm" />
        <span className="dt-mm">
          <b>{r.name}</b>
          <span>{positionLine(r.roleAr, r.scope) ?? "بلا موقع"}</span>
        </span>
      </div>
    ),
  };
  const stateCol: Column<WarningRow> = {
    key: "state", header: "الإنذار", width: "150px",
    render: stateBadge,
  };
  const categoryCol: Column<WarningRow> = {
    key: "category", header: "التصنيف", width: "1fr",
    render: (r) => <span className="txt">{categoryLabel(r.category)}</span>,
  };
  const reasonCol: Column<WarningRow> = {
    key: "reason", header: "السبب", width: "minmax(180px, 2fr)",
    // النصّ يُقصّ بالـCSS لا بالجافاسكربت (`txt-clip`)، والنقر يفتح تفاصيله كاملةً — كسبب الإنهاء
    render: (r) => (
      <button type="button" className="txt txt-clip txt-more" title={r.reason} onClick={() => setDetail(r)}>
        {r.reason}
      </button>
    ),
  };
  const issuerCol: Column<WarningRow> = {
    key: "issuer", header: "المُصدِر", width: "1.2fr",
    render: (r) => <span className="txt">{r.issuer ?? "—"}</span>,
  };
  const dateCol: Column<WarningRow> = {
    key: "date", header: "التاريخ", width: "1fr",
    render: (r) => <span className="txt">{fmtDate(r.createdAt)}</span>,
  };

  const columns = (withMember: boolean): Column<WarningRow>[] =>
    [withMember ? memberCol : null, stateCol, categoryCol, reasonCol, issuerCol, dateCol]
      .filter((c): c is Column<WarningRow> => !!c);

  const rowActions = (r: WarningRow) => [
    {
      items: [
        { label: "عرض التفاصيل", icon: <Eye />, onSelect: () => setDetail(r) },
        { label: "تنزيل الخطاب", icon: <DownloadSimple />, onSelect: () => void onDownload(r) },
        { label: "فتح واتساب", icon: <WhatsappLogo />, onSelect: () => onWhatsapp(r), disabled: !r.phone },
      ],
    },
    ...(r.mayManage && r.status === "active"
      ? [{ danger: true, items: [{ label: "إلغاء الإنذار", icon: <Prohibit />, danger: true, onSelect: () => { setCancelling(r); setCancelReason(""); } }] }]
      : []),
  ];

  const filterDefs: FilterDef[] = [
    { key: "category", label: "التصنيف", options: WARNING_CATEGORIES.map((c) => ({ value: c.value, label: c.label })) },
    { key: "status", label: "الحالة", options: [{ value: "active", label: "سارٍ" }, { value: "cancelled", label: "ملغى" }] },
    {
      key: "committee",
      label: "اللجنة",
      options: [...new Set(rows.map((r) => r.committee).filter((c): c is string => !!c))].map((c) => ({ value: c, label: c })),
    },
  ];

  const emptyState = rows.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<ShieldWarning />}
      title="لا إنذارات، والحمد لله"
      description={mayIssue
        ? "لم يصدر إنذارٌ على أحدٍ في نطاقك بعد. وحين يلزم، يُصدَر من هنا فيُسجَّل ويُبلَّغ صاحبه."
        : "لم يصدر إنذارٌ بعد في نطاق اطّلاعك."}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا نتائج مطابقة"
      description="لم نعثر على إنذارٍ يطابق بحثك أو مرشّحاتك."
      action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFilters({}); }}>مسح البحث</Button>}
    />
  );

  return (
    <>
      <PageHeader title="الإنذارات" status={mayIssue ? null : <Badge tone="info" variant="soft" icon={<Eye />}>اطّلاعٌ لا إصدار</Badge>} />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Warning />} value={stats.active} label="إنذارات سارية" tone={stats.active > 0 ? "warning" : "brand"} />
        <Stat icon={<ShieldWarning />} value={stats.members} label="أعضاء عليهم إنذارات" />
        <Stat icon={<UserMinus />} value={stats.atLimit} label={`بلغوا الحدّ (${limit})`} tone={stats.atLimit > 0 ? "danger" : "brand"} />
      </div>

      <Toolbar
        searchPlaceholder="ابحث باسم العضو أو بالسبب…"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
        actions={
          <>
            <Button variant={mode === "members" ? "primary" : "ghost"} size="sm" onClick={() => setMode("members")}>حسب العضو</Button>
            <Button variant={mode === "all" ? "primary" : "ghost"} size="sm" onClick={() => setMode("all")}>كلّ الإنذارات</Button>
            {/* معاينة القوالب — عيّنةٌ متخيَّلة بالتصنيفات السبعة، لا سجلّ فيها */}
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/members/warnings/preview")}>
              <Eye aria-hidden /> معاينة الخطاب
            </Button>
            {mayIssue ? (
              <Button variant="warning" size="sm" onClick={() => setIssuing(true)} disabled={targets.length === 0}>
                <Warning aria-hidden /> إصدار إنذار
              </Button>
            ) : null}
          </>
        }
      />

      {filtered.length === 0 ? (
        <DataTable columns={columns(true)} rows={[]} getRowId={(r) => r.id} emptyState={emptyState} />
      ) : mode === "members" ? (
        /* جدولٌ واحدٌ مجمَّع: اسمُ العضو شريطٌ يشقّ الشبكة، ونغمتُه حالُه من الحدّ — فيُقرأ
           «مَن بلغ» بلمحةٍ قبل القراءة. كان أكورديونًا يلفّ جدولًا، أي إطارًا داخل إطار.
           والأشرطةُ **مغلقةٌ** (قرار المالك): الشاشةُ تُقرأ «مَن عليه كم» لا «ما الإنذارات»،
           فالأسماءُ ونقاطُها هي المتن، والتفصيلُ يُطلَب بنقرة. **إلّا عند بحثٍ أو ترشيح فتُفتح**،
           فالباحثُ يطلب نتيجةً لا تصنيفًا، وشريطٌ مغلقٌ فوق نتيجته يجعل البحثَ يبدو معطوبًا. */
        <DataTable
          columns={columns(false)}
          groups={groups.map((g) => ({
            key: g.head.userId,
            label: g.head.name,
            hint: `${dots(g.active, limit)}، ${remainingText(g.active, limit)}`,
            tone: g.active === 0 ? "neutral" : toneOf(g.active, limit),
            defaultOpen: filtering,
            rows: g.list,
          }))}
          getRowId={(r) => r.id}
          rowActions={rowActions}
          rowTone={(r) => (r.status === "cancelled" ? "neutral" : toneOf(r.ordinal ?? 1, limit))}
        />
      ) : (
        <DataTable
          columns={columns(true)}
          rows={pageRows}
          getRowId={(r) => r.id}
          rowActions={rowActions}
          rowTone={(r) => (r.status === "cancelled" ? "neutral" : toneOf(r.ordinal ?? 1, limit))}
          emptyState={emptyState}
          footer={
            <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="إنذار" />
          }
        />
      )}

      {/* تفاصيل الإنذار — السبب كما كُتب، ومصيرُه إن أُلغي أو سحب عضويّة */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        size="md"
        className={detail?.status === "cancelled" ? undefined : "mdl-tone-warning"}
        title={detail ? `${warningTitle(detail.ordinal ?? 1)}: ${detail.name}` : ""}
        description={detail ? `${categoryLabel(detail.category)}، ${fmtDate(detail.createdAt)}${detail.issuer ? `، أصدره ${detail.issuer}` : ""}` : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setDetail(null)}>إغلاق</Button>}
      >
        {detail ? (
          <>
            <Alert tone={detail.status === "cancelled" ? "info" : "warning"} title="السبب كما كُتب">
              <span style={{ whiteSpace: "pre-wrap" }}>{detail.reason}</span>
            </Alert>
            {detail.occurredOn ? (
              <Alert tone="info" title="تاريخ الواقعة">{fmtDateOnly(detail.occurredOn)}</Alert>
            ) : null}
            {detail.causedTermination ? (
              <Alert tone="danger" title="هذا الإنذار سحب العضويّة">
                ببلوغه الحدّ ({limit}) سُحبت عضويّة {detail.name}.
              </Alert>
            ) : null}
            {detail.status === "cancelled" ? (
              <Alert tone="neutral" title={`أُلغي${detail.canceller ? ` بقرار ${detail.canceller}` : ""}${detail.cancelledAt ? `، ${fmtDate(detail.cancelledAt)}` : ""}`}>
                {detail.cancelReason ?? "بلا سبب مكتوب."}
              </Alert>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* الإلغاء — قرارٌ مُسبَّب: الصفّ يبقى مشطوبًا ويخرج من العدّ فيُعاد ترتيب ما بعده */}
      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title={cancelling ? `إلغاء ${warningTitle(cancelling.ordinal ?? 1)}: ${cancelling.name}` : ""}
        description="الملغى يبقى في السجلّ مشطوبًا، ويخرج من العدّ فتُعاد رتبةُ ما بعده."
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} disabled={cancelReason.trim().length < 5} onClick={submitCancel}>
              <Prohibit aria-hidden /> إلغاء الإنذار
            </Button>
            <Button variant="ghost-danger" size="md" onClick={() => setCancelling(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        {cancelling?.causedTermination ? (
          <Alert tone="warning" title="هذا الإنذار سحب العضويّة">
            إلغاؤه لا يُعيدها تلقائيًّا، تُعاد بقرارٍ من تبويب «أعضاء سابقون».
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإلغاء"
          icon={<WarningOctagon />}
          innerIcon={<NotePencil />}
          placeholder="لماذا يُلغى هذا الإنذار؟"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر، يبقى في السجلّ."
        />
      </Modal>

      {mayIssue ? (
        <IssueWarningModal open={issuing} targets={targets} limit={limit} onClose={() => setIssuing(false)} />
      ) : null}
    </>
  );
}
