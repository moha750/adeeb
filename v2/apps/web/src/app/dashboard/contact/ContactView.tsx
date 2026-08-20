"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert, Badge, Button, Stat, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import {
  ChatCircleText, Copy, Envelope, EnvelopeOpen, EnvelopeSimpleOpen, NotePencil, PaperPlaneTilt } from "@phosphor-icons/react";
import { Eye, MagnifyingGlass } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { Avatar } from "../_components/Avatar";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { fmtDate } from "@/lib/dates";
import { CONTACT_STATUSES, statusLabel, statusTone } from "@/lib/contact/vocab";
import { saveContactNotes, sendContactReply, setContactStatus } from "./actions";
import type { ContactRow } from "./data";
import { PageHeader } from "../_components/PageHeader";
import { copyText } from "@/lib/clipboard";

/**
 * **رسائل التواصل** — ما يكتبه الزائر في «تواصل معنا» بالصفحة الرئيسيّة، يصل هنا.
 *
 * كان النموذج يكتب في `contact_messages` ولا بابَ في البوّابة يقرؤها، فبقيت رسائلُ الناس
 * في القاعدة بلا قارئ. هذه هي الغرفة: تُقرأ، ويُردّ عليها **بريدًا فعليًّا** يخرج من نطاق
 * النادي (`send-contact-reply`) لا سطرًا يُخزَّن ويُنسى.
 *
 * ولا أولويّةَ ولا أرشفة: الأولى أداةُ ترتيب طابورٍ لا طابورَ له (رسالةٌ كلّ خمسة أسابيع)،
 * والثانية إغلاقٌ بلا جواب لا واقعةَ له — فكلّ رسالةٍ حقيقيّة تُقرأ فتُجاب.
 *
 * وفتحُ الرسالة يُعلّمها مقروءةً من نفسه: العلامةُ أثرُ فعلٍ حقيقيّ لا زرٌّ يُنقر.
 */
export function ContactView({ rows }: { rows: ContactRow[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState("");

  // الصفّ المفتوح يُقرأ من القائمة نفسها لا من نسخةٍ محفوظة — فيتبع تحديثَ الخادم بعد كلّ فعل.
  const detail = openId ? rows.find((r) => r.id === openId) ?? null : null;

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!matchesSearch(search, `${r.name} ${r.email} ${r.subject ?? ""} ${r.message}`)) return false;
        if (filters.status && r.status !== filters.status) return false;
        return true;
      }),
    [rows, search, filters],
  );

  const stats = useMemo(
    () => ({
      unread: rows.filter((r) => r.status === "new").length,
      waiting: rows.filter((r) => r.status === "new" || r.status === "read").length,
      replied: rows.filter((r) => r.status === "replied").length,
    }),
    [rows],
  );

  const pageKey = `${search}|${pageSize}|${JSON.stringify(filters)}`;
  const [prevKey, setPrevKey] = useState(pageKey);
  if (prevKey !== pageKey) { setPrevKey(pageKey); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  /** فتحُ الرسالة — وقراءتُها تُثبَّت في القاعدة إن كانت ما تزال «جديدة». */
  const open = (r: ContactRow) => {
    setOpenId(r.id);
    setReply(r.replyMessage ?? "");
    setNotes(r.notes ?? "");
    if (r.status === "new") start(async () => { await setContactStatus(r.id, "read"); });
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, silent?: boolean) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.message); return; }
      if (!silent) toast.success(res.message);
    });

  const submitReply = () => {
    if (!detail) return;
    start(async () => {
      const res = await sendContactReply(detail.id, reply);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      setOpenId(null);
    });
  };

  const copyEmail = async (r: ContactRow) => {
    try {
      await copyText(r.email);
      toast.success("نُسخ البريد.");
    } catch {
      toast.error("تعذّر نسخ البريد.");
    }
  };

  const senderCol: Column<ContactRow> = {
    key: "sender", header: "المُرسِل", width: "minmax(190px, 1.5fr)",
    render: (r) => (
      <div className="dt-mem">
        <Avatar name={r.name} size="sm" />
        <span className="dt-mm">
          <b>{r.name}</b>
          {/* البريد لاتينيّ خطًّا (`.lat`) ومعزولٌ اتّجاهًا (`bdi`) — و`@` محرفٌ محايد،
              فلولا العزل أخذ اتّجاه الفقرة العربيّة فانتقل صدرُ العنوان إلى آخره. */}
          <span><bdi className="lat" dir="ltr">{r.email}</bdi></span>
        </span>
      </div>
    ),
  };
  const subjectCol: Column<ContactRow> = {
    key: "subject", header: "الموضوع", width: "minmax(140px, 1.2fr)",
    render: (r) => <span className="txt">{r.subject?.trim() || "بلا موضوع"}</span>,
  };
  const messageCol: Column<ContactRow> = {
    key: "message", header: "الرسالة", width: "minmax(200px, 2fr)",
    render: (r) => (
      <button type="button" className="txt txt-clip txt-more" title={r.message} onClick={() => open(r)}>
        {r.message}
      </button>
    ),
  };
  const stateCol: Column<ContactRow> = {
    key: "state", header: "الحالة", width: "150px",
    render: (r) => (
      <Badge tone={statusTone(r.status)} variant="soft" icon={r.status === "new" ? <Envelope /> : <EnvelopeOpen />}>
        {statusLabel(r.status)}
      </Badge>
    ),
  };
  const dateCol: Column<ContactRow> = {
    key: "date", header: "التاريخ", width: "1fr",
    render: (r) => <span className="txt">{fmtDate(r.createdAt)}</span>,
  };

  // الحالة تتصدّر: أوّلُ ما يُسأل عن رسالةٍ أَجُوبَت أم تنتظر — فتُقرأ الصفوف حالةً ثمّ صاحبًا.
  const columns: Column<ContactRow>[] = [stateCol, senderCol, subjectCol, messageCol, dateCol];

  const rowActions = (r: ContactRow) => [
    {
      items: [
        { label: "قراءة الرسالة والردّ", icon: <Eye />, onSelect: () => open(r) },
        { label: "نسخ البريد", icon: <Copy />, onSelect: () => void copyEmail(r) },
      ],
    },
    // تعليمُها مقروءةً بلا فتحٍ — للجديدة وحدها؛ وما بعدها لا رجعةَ فيه: القراءة واقعةٌ لا تُنقض.
    ...(r.status === "new"
      ? [{ items: [{ label: "تعليمها مقروءة", icon: <EnvelopeOpen />, onSelect: () => run(() => setContactStatus(r.id, "read")) }] }]
      : []),
  ];

  const filterDefs: FilterDef[] = [
    { key: "status", label: "الحالة", options: CONTACT_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
  ];

  const emptyState = rows.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<EnvelopeSimpleOpen />}
      title="لا رسائل بعد"
      description="ما يكتبه الزائر في «تواصل معنا» بالصفحة الرئيسيّة يصل إلى هنا، فيُقرأ ويُردّ عليه من مكانه."
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا نتائج مطابقة"
      description="لم نعثر على رسالةٍ تطابق بحثك أو مرشّحاتك."
      action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFilters({}); }}>مسح البحث</Button>}
    />
  );

  return (
    <>
      <PageHeader title="رسائل التواصل" />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Envelope />} value={stats.unread} label="رسائل جديدة" tone={stats.unread > 0 ? "warning" : "brand"} />
        <Stat icon={<ChatCircleText />} value={stats.waiting} label="بانتظار الردّ" tone={stats.waiting > 0 ? "warning" : "brand"} />
        <Stat icon={<PaperPlaneTilt />} value={stats.replied} label="أُجيب عنها" tone="success" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالاسم أو البريد أو نصّ الرسالة…"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(r) => r.id}
        rowActions={rowActions}
        onRowClick={open}
        rowTone={(r) => (r.status === "new" ? "warning" : r.status === "replied" ? "success" : undefined)}
        emptyState={emptyState}
        footer={
          filtered.length > 0 ? (
            <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="رسالة" />
          ) : null
        }
      />

      {/* الرسالة كاملةً، وتحتها الردُّ الذي يخرج بريدًا إلى صاحبها */}
      <Modal
        open={!!detail}
        onClose={() => setOpenId(null)}
        size="lg"
        busy={pending}
        title={detail ? detail.subject?.trim() || `رسالة من ${detail.name}` : ""}
        // البريد لا يُدسّ في نصّ الوصف: هو سلسلةُ نصٍّ عربيّة لا تحتمل خطًّا لاتينيًّا ولا عزلًا،
        // فيخرج شارةً في الجسد بخطّه واتّجاهه.
        description={detail ? `${detail.name}، ${fmtDate(detail.createdAt)}` : undefined}
        footer={
          detail ? (
            <>
              <Button
                variant="primary"
                size="md"
                loading={pending}
                disabled={reply.trim().length < 2}
                onClick={submitReply}
              >
                <PaperPlaneTilt aria-hidden /> {detail.replyMessage ? "إرسال ردٍّ جديد" : "إرسال الردّ"}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setOpenId(null)} disabled={pending}>إغلاق</Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <>
            <div>
              <Badge tone="info" variant="outline" icon={<Envelope />}>
                <bdi className="lat" dir="ltr">{detail.email}</bdi>
              </Badge>
            </div>

            <Alert tone="info" title="نصّ الرسالة">
              <span style={{ whiteSpace: "pre-wrap" }}>{detail.message}</span>
            </Alert>

            {detail.replyMessage ? (
              <Alert
                tone="success"
                title={`رُدّ عليها${detail.repliedBy ? `، ${detail.repliedBy}` : ""}${detail.repliedAt ? `، ${fmtDate(detail.repliedAt)}` : ""}`}
              >
                <span style={{ whiteSpace: "pre-wrap" }}>{detail.replyMessage}</span>
              </Alert>
            ) : null}

            <Textarea
              label="الردّ"
              icon={<PaperPlaneTilt />}
              innerIcon={<NotePencil />}
              placeholder="اكتب ردّك على الرسالة…"
              rows={5}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              helper="يُرسَل بريدًا إلى المُرسِل من نطاق النادي، ويُسجَّل هنا."
            />

            <Textarea
              label="ملاحظة داخليّة"
              icon={<NotePencil />}
              innerIcon={<NotePencil />}
              placeholder="لأهل اللوحة وحدهم، لا تُرسَل إلى أحد."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              optional
            />
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || notes.trim() === (detail.notes ?? "").trim()}
                onClick={() => run(() => saveContactNotes(detail.id, notes))}
              >
                <NotePencil aria-hidden /> حفظ الملاحظة
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
