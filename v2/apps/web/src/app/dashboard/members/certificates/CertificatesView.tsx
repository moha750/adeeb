"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Stat, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import {
  Certificate, ChatCenteredText, FilePdf, NotePencil, SealCheck, Users } from "@phosphor-icons/react";
import { DownloadSimple, Eye, MagnifyingGlass, Prohibit } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { Pagination } from "../../_components/Pagination";
import { Avatar } from "../../_components/Avatar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { fmtDate } from "@/lib/date";
import { downloadCertificate, downloadCertificatePdf } from "@/lib/certificates/letter";
import { certDate } from "@/lib/certificates/text";
import { revokeCertificate } from "./actions";
import { IssueCertificateModal } from "./IssueCertificateModal";
import type { CertificateRow, CertificatesData } from "./data";
import { Breadcrumb } from "../../_shell/Breadcrumb";

/**
 * **شهادات الخبرة** — غرفةُ من يُصدرها: رئيس النادي · رئيس التنفيذيّ · قائد الموارد.
 * وقدرةٌ واحدة تفتحها وتُجيز الفعل فيها (لا بابٌ وفعل: الرائي هنا هو المُصدِر نفسه).
 *
 * **والسجلُّ يُقرأ لقطةً لا حالًا راهنة**: كلُّ صفٍّ يقول ما رُسم على الورقة يومَ صدرت —
 * الاسمُ والمسمّى والفترة — ولو تغيّر صاحبُها بعدها. فإعادةُ التنزيل تُخرج الورقة نفسها.
 */
export function CertificatesView({ data }: { data: CertificatesData }) {
  const { rows, targets } = data;
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<CertificateRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!matchesSearch(search, `${r.name} ${r.holderName} ${r.positionTitle} ${r.serial}`)) return false;
        if (filters.status && r.status !== filters.status) return false;
        if (filters.year && !r.periodTo.startsWith(filters.year)) return false;
        return true;
      }),
    [rows, search, filters],
  );

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.status === "valid");
    return { valid: valid.length, holders: new Set(valid.map((r) => r.userId)).size, revoked: rows.length - valid.length };
  }, [rows]);

  const pageKey = `${search}|${pageSize}|${JSON.stringify(filters)}`;
  const [prevKey, setPrevKey] = useState(pageKey);
  if (prevKey !== pageKey) { setPrevKey(pageKey); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  /** إعادةُ التنزيل تُرسَم من **اللقطة** لا من حال العضو اليوم — فالورقة واحدةٌ لا تتبدّل. */
  const onDownload = async (r: CertificateRow, as: "png" | "pdf" = "png") => {
    setBusy(true);
    try {
      const paper = {
        name: r.holderName,
        position: r.positionTitle,
        gender: r.gender,
        from: r.periodFrom,
        to: r.periodTo,
        serial: r.serial,
      };
      await (as === "pdf" ? downloadCertificatePdf(paper) : downloadCertificate(paper));
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = () => {
    if (!revoking) return;
    start(async () => {
      const res = await revokeCertificate({ id: revoking.id, reason });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      setRevoking(null);
      setReason("");
      router.refresh();
    });
  };

  const columns: Column<CertificateRow>[] = [
    {
      key: "member", header: "العضو", width: "minmax(200px, 1.6fr)",
      render: (r) => (
        <div className="dt-user">
          <Avatar name={r.name} src={r.avatar ?? undefined} gender={r.gender} size="sm" />
          <div className="dt-user-txt">
            <b>{r.holderName}</b>
            {/* الاسم في الملفّ اليوم إن خالف المرسوم — فالورقة لا تُصحَّح بعد خروجها */}
            <span className="txt">{r.holderName === r.name ? r.positionTitle : `${r.name} · ${r.positionTitle}`}</span>
          </div>
        </div>
      ),
    },
    {
      key: "serial", header: "الرقم المرجعيّ", width: "1.1fr",
      render: (r) => <span className="txt">{r.serial}</span>,
    },
    {
      key: "period", header: "الفترة", width: "1.4fr",
      render: (r) => <span className="txt">{certDate(r.periodFrom)} ← {certDate(r.periodTo)}</span>,
    },
    {
      key: "state", header: "الحالة", width: "120px",
      render: (r) =>
        r.status === "revoked"
          ? <Badge tone="danger" variant="soft" icon={<Prohibit />}>مبطَلة</Badge>
          : <Badge tone="success" variant="soft" icon={<SealCheck />}>سارية</Badge>,
    },
    {
      key: "issuer", header: "المُصدِر", width: "1.2fr",
      render: (r) => <span className="txt">{r.issuer ?? "—"}</span>,
    },
    {
      key: "date", header: "تاريخ الإصدار", width: "1fr",
      render: (r) => <span className="txt">{fmtDate(r.createdAt)}</span>,
    },
  ];

  const rowActions = (r: CertificateRow) => [
    { items: [
      { label: "تنزيل PDF", icon: <FilePdf />, onSelect: () => void onDownload(r, "pdf") },
      { label: "تنزيل صورة", icon: <DownloadSimple />, onSelect: () => void onDownload(r, "png") },
    ] },
    ...(r.mayManage && r.status === "valid"
      ? [{
          danger: true,
          items: [{
            label: "إبطال الشهادة", icon: <Prohibit />, danger: true,
            onSelect: () => { setRevoking(r); setReason(""); },
          }],
        }]
      : []),
  ];

  const filterDefs: FilterDef[] = [
    { key: "status", label: "الحالة", options: [{ value: "valid", label: "سارية" }, { value: "revoked", label: "مبطَلة" }] },
    {
      key: "year", label: "السنة",
      options: [...new Set(rows.map((r) => r.periodTo.slice(0, 4)))].sort().reverse().map((y) => ({ value: y, label: y })),
    },
  ];

  const emptyState = rows.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<Certificate />}
      title="لا شهادات بعد"
      description="من استحقّ شهادةَ خبرةٍ تُصدَر له من هنا، فتُرسَم على قالب النادي وتُحفظ برقمٍ مرجعيّ."
      action={<Button variant="primary" size="md" onClick={() => setIssuing(true)}><SealCheck aria-hidden /> إصدار شهادة</Button>}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا نتائج مطابقة"
      description="لم نعثر على شهادةٍ تطابق بحثك أو مرشّحاتك."
      action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFilters({}); }}>مسح البحث</Button>}
    />
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>شهادات الخبرة</h1>
        </div>
        <Badge tone="info" variant="soft" icon={<Certificate />}>{rows.length} شهادة</Badge>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<SealCheck />} value={stats.valid} label="شهادات سارية" />
        <Stat icon={<Users />} value={stats.holders} label="أعضاء نالوها" />
        <Stat icon={<Prohibit />} value={stats.revoked} label="مبطَلة" tone={stats.revoked > 0 ? "warning" : "brand"} />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالاسم أو المسمّى أو الرقم المرجعيّ…"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/members/certificates/preview")}>
              <Eye aria-hidden /> معاينة الشهادة
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIssuing(true)} disabled={targets.length === 0}>
              <SealCheck aria-hidden /> إصدار شهادة
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(r) => r.id}
        rowActions={rowActions}
        rowTone={(r) => (r.status === "revoked" ? "neutral" : undefined)}
        emptyState={emptyState}
        loading={busy}
        footer={
          filtered.length > 0 ? (
            <Pagination
              page={safePage} pageSize={pageSize} total={filtered.length}
              onPageChange={setPage} onPageSizeChange={setPageSize} noun="شهادة"
            />
          ) : undefined
        }
      />

      <IssueCertificateModal open={issuing} targets={targets} onClose={() => setIssuing(false)} />

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title="إبطال الشهادة"
        description="لا تُمحى — تبقى في السجلّ مشطوبةً بسببها."
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} disabled={reason.trim().length < 5} onClick={submitRevoke}>
              <Prohibit aria-hidden /> إبطال
            </Button>
            <Button variant="ghost-danger" size="md" onClick={() => setRevoking(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        {revoking ? (
          <Alert tone="danger" title={`${revoking.holderName} — ${revoking.serial}`}>
            الورقةُ التي بيده لا تُسترجع؛ الإبطالُ يُعلن في السجلّ أنّها لم تعد معتمدة.
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإبطال"
          icon={<ChatCenteredText />}
          innerIcon={<NotePencil />}
          placeholder="لماذا أُبطلت؟ (خطأٌ في الاسم أو الفترة، أو صدرت لغير مستحقّ…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر."
        />
      </Modal>
    </>
  );
}
