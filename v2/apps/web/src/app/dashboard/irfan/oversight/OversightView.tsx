"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, BarList, Card, CardFooter, CardHeader, Donut, Modal, SectionCard, Stat, type BarItem } from "@adeeb/design-system";
import { CalendarBlank, Crown, EnvelopeSimple, HandHeart, Image as ImageIcon, Palette, TextT, Tray, UsersThree } from "@phosphor-icons/react";
import { fmtDate } from "@/lib/dates";
import { renderIrfanCard } from "@/lib/irfan/card";
import { EmptyState } from "../../_components/EmptyState";
import { Row } from "../../_portal/Row";
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

/** شارتا الحال: قُرئت أم لا، وصورتُها في واتساب. */
function State({ r }: { r: OversightRow }) {
  return (
    <>
      <Badge tone={r.read ? "success" : "neutral"}>{r.read ? "قُرئت" : "لم تُقرأ"}</Badge>
      {r.pictured ? null : <Badge tone="warning">بلا صورة</Badge>}
    </>
  );
}

/** المصغّرة: صورةُ المعاينة، أو لوحٌ بأيقونةٍ لما حُجب نصُّه أو لم تُرفع صورتُه. */
function Thumb({ r }: { r: OversightRow }) {
  // eslint-disable-next-line @next/next/no-img-element -- صورةُ المعاينة من التخزين، تُقصّ إلى البطاقة
  return r.thumb ? <img className="acr-shot is-portrait" src={r.thumb} alt="" /> : <span className="acr-shot is-portrait" aria-hidden />;
}

export function OversightView({ data, list = "cards" }: { data: OversightData; list?: "cards" | "gallery" }) {
  const { rows, leaders, error } = data;
  const [open, setOpen] = useState<OversightRow | null>(null);
  const [sel, setSel] = useState<number | null>(rows[0]?.id ?? null);
  const cur = rows.find((r) => r.id === sel) ?? rows[0];

  const senders = new Set(rows.map((r) => r.from)).size;
  const reached = new Set(rows.map((r) => r.to)).size;
  const pictured = rows.filter((r) => r.pictured).length;
  const read = rows.filter((r) => r.read).length;

  const byDay = useMemo(() => count(rows, (r) => fmtDate(r.at)), [rows]);
  const byLook = useMemo(() => count(rows, (r) => LOOK_NAMES[r.look]), [rows]);
  const byTitle = useMemo(() => count(rows, (r) => r.title ?? "بلا عنوان"), [rows]);

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

      {!rows.length ? <EmptyState icon={<Tray />} title="لا رسائل بعد" description="ما يُكتب في الموسم يظهر هنا." /> : null}

      {rows.length && list === "cards" ? (
        // الشكلُ الأوّل: جدارُ بطاقات، كلُّ رسالةٍ بطاقتُها معلّقةٌ في رأس كرتها، وتحتها مَن ولمن ومتى
        <div className="card-grid">
          {rows.map((r) => (
            <Card key={r.id} interactive role="button" tabIndex={0} aria-label={`عِرفان إلى ${r.to} من ${r.from}`} onClick={() => setOpen(r)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(r); } }}>
              <div className="acr-easel is-plain is-thumb"><Thumb r={r} /></div>
              <CardHeader variant="soft" title={`إلى ${r.to}`} subtitle={`من ${r.from}`} />
              <Row Icon={TextT} k={fmtDate(r.at)} v={r.title ?? "بلا عنوان"} sub={`تصميم ${LOOK_NAMES[r.look]}`} />
              <CardFooter><State r={r} /></CardFooter>
            </Card>
          ))}
        </div>
      ) : null}

      {rows.length && list === "gallery" && cur ? (
        // الشكلُ الثاني: معرضُ الغرفة نفسُه، قائمةٌ بمصغّراتها والبطاقةُ معلّقةٌ في جنبها
        <div className="acr-room">
          <Card className="acr-list">
            <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="الرسائل" subtitle="الأحدثُ أوّلًا" />
            <nav aria-label="رسائل عِرفان">
              {rows.map((r) => (
                <button key={r.id} type="button" className="acc-row acr-pick" aria-current={cur.id === r.id} onClick={() => setSel(r.id)}>
                  <Thumb r={r} />
                  <span className="acc-kv">
                    <span className="acr-title"><b>إلى {r.to}</b></span>
                    <small>من {r.from}، {fmtDate(r.at)}</small>
                  </span>
                </button>
              ))}
            </nav>
          </Card>
          <section className="acr-stage" aria-live="polite">
            <Card>
              <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title={`إلى ${cur.to}`} subtitle={cur.seat} />
              <CardShot key={cur.id} row={cur} />
              <Row Icon={UsersThree} k="من" v={cur.from} sub={fmtDate(cur.at)} />
              <Row Icon={TextT} k="العنوان" v={cur.title ?? "بلا عنوان"} sub={`تصميم ${LOOK_NAMES[cur.look]}`} />
              <Row Icon={EnvelopeSimple} k="الحال" v={cur.read ? "قرأها في البوّابة" : "لم يقرأها بعد"}
                sub={cur.pictured ? "صورةُ معاينتها سليمة" : "وصلت في واتساب بلا صورة"} />
            </Card>
          </section>
        </div>
      ) : null}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `من ${open.from} إلى ${open.to}` : ""}
        description={open ? fmtDate(open.at) : undefined}>
        {open ? <CardShot row={open} /> : null}
      </Modal>
    </div>
  );
}
