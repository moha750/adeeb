"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, BarList, Donut, Modal, SectionCard, Stat, type BarItem } from "@adeeb/design-system";
import { CalendarBlank, Crown, EnvelopeSimple, HandHeart, Image as ImageIcon, Palette, TextT, Tray, UsersThree } from "@phosphor-icons/react";
import { fmtDate } from "@/lib/dates";
import { renderIrfanCard } from "@/lib/irfan/card";
import { DataCards } from "../../_components/DataCards";
import type { Column } from "../../_components/DataTable";
import { EmptyState } from "../../_components/EmptyState";
import { LOOK_NAMES } from "../vocab";
import type { OversightData, OversightRow } from "./vocab";

/**
 * **إشرافُ عِرفان** — لرئيس أدِيب وحده (`oversee_irfan`). أرقامُ الموسم، ثمّ الرسائلُ كلُّها كروتًا، وبطاقةُ
 * كلِّ رسالةٍ تُفتح بضغطة. اختار المالكُ في المختبر (٢٠٢٦-١٠-١٧) القائمةَ المسطّحة لا المجموعةَ بالقائد،
 * وكروتًا لا جدولًا، والتصميمَ حلقةً، وأسقط سطرَي الهمس تحت كرتَي الرسائل والصور.
 */

const U_MSG = { one: "رسالة", two: "رسالتان", few: "رسائل" };

function count<T>(rows: T[], key: (r: T) => string): BarItem[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function CardShot({ row }: { row: OversightRow }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!row.card) return;
    let alive = true;
    let url: string | null = null;
    renderIrfanCard(row.card, row.look).then((b) => { url = URL.createObjectURL(b); if (alive) setSrc(url); }, () => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [row]);
  if (!row.card) {
    return <Alert tone="info" title="النصُّ محجوب">كُتبت هذه الرسالةُ قبل أن يُخبَر الأعضاءُ أنّ الرئيس يطّلع عليها، فنصُّها لمرسلها ومستلمها وحدهما.</Alert>;
  }
  return (
    <div className="acr-easel is-plain">
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
      {src ? <img className="acr-shot is-portrait" src={src} alt={`عِرفان إلى ${row.to}`} /> : <span className="acr-shot is-portrait" aria-hidden />}
    </div>
  );
}

export function OversightView({ data }: { data: OversightData }) {
  const { rows, leaders, error } = data;
  const [open, setOpen] = useState<OversightRow | null>(null);

  const senders = new Set(rows.map((r) => r.from)).size;
  const reached = new Set(rows.map((r) => r.to)).size;
  const pictured = rows.filter((r) => r.pictured).length;
  const read = rows.filter((r) => r.read).length;

  const byDay = useMemo(() => count(rows, (r) => fmtDate(r.at)), [rows]);
  const byLook = useMemo(() => count(rows, (r) => LOOK_NAMES[r.look]), [rows]);
  const byTitle = useMemo(() => count(rows, (r) => r.title ?? "بلا عنوان"), [rows]);

  const columns: Column<OversightRow>[] = [
    { key: "at", header: "اليوم", render: (r) => fmtDate(r.at) },
    // الحرفُ قبل الاسم: الكرتُ يحمل اسمين، فبلا «من» و«إلى» لا يُعرف الكاتبُ من المكتوب إليه
    { key: "from", header: "من", render: (r) => `من ${r.from}` },
    { key: "to", header: "إلى", render: (r) => `إلى ${r.to}` },
    { key: "title", header: "العنوان", render: (r) => r.title ?? "بلا عنوان" },
    { key: "look", header: "التصميم", render: (r) => LOOK_NAMES[r.look] },
    {
      key: "state", header: "الحال", render: (r) => (
        <span className="inline-flex gap-1">
          <Badge tone={r.read ? "success" : "neutral"}>{r.read ? "قُرئت" : "لم تُقرأ"}</Badge>
          {r.pictured ? null : <Badge tone="warning">بلا صورة</Badge>}
        </span>
      ),
    },
  ];

  return (
    <div className="acc-main">
      {error ? <Alert tone="warning">{error}</Alert> : null}
      <div className="stat-grid">
        <Stat icon={<EnvelopeSimple />} value={rows.length} label="رسالة" />
        <Stat icon={<UsersThree />} value={senders} label="عضوًا كتبوا" />
        <Stat icon={<Crown />} value={`${reached} من ${leaders}`} label="قائدًا وصلهم عِرفان" />
        <Stat icon={<HandHeart />} value={`${read} من ${rows.length}`} label="قرأها قائدُها في البوّابة" tone="success" />
        <Stat icon={<ImageIcon />} value={`${pictured} من ${rows.length}`} label="صورةُ معاينتها سليمة"
          tone={pictured === rows.length ? "success" : "warning"} />
      </div>

      <SectionCard title="الرسائل في كلّ يوم" icon={<CalendarBlank />}>
        <BarList items={byDay} unit={U_MSG} total={rows.length} />
      </SectionCard>
      <div className="form-grid">
        <SectionCard title="التصميم" icon={<Palette />}>
          <Donut items={byLook} unit={U_MSG} />
        </SectionCard>
        <SectionCard title="العنوان" icon={<TextT />}>
          <BarList items={byTitle} unit={U_MSG} total={rows.length} />
        </SectionCard>
      </div>

      <DataCards columns={columns} rows={rows} getRowId={(r) => String(r.id)} onRowClick={setOpen} openLabel="فتح البطاقة"
        spec={{ title: "to", subtitle: "from", badge: "state", facts: ["at", "title", "look"] }}
        emptyState={<EmptyState icon={<Tray />} title="لا رسائل بعد" description="ما يُكتب في الموسم يظهر هنا." />} />

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `من ${open.from} إلى ${open.to}` : ""}
        description={open ? fmtDate(open.at) : undefined}>
        {open ? <CardShot row={open} /> : null}
      </Modal>
    </div>
  );
}
