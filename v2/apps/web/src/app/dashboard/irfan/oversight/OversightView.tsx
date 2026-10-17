"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, BarList, Card, CardHeader, Donut, Modal, SectionCard, Stat, type BarItem } from "@adeeb/design-system";
import { CalendarBlank, Crown, ChatTeardropText, EnvelopeSimple, HandHeart, ImageBroken, Image as ImageIcon, Palette, TextT, Tray, UsersThree } from "@phosphor-icons/react";
import { fmtDate } from "@/lib/dates";
import { renderIrfanCard } from "@/lib/irfan/card";
import { EmptyState } from "../../_components/EmptyState";
import { Avatar } from "../../_components/Avatar";
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
    let alive = true;
    let url: string | null = null;
    renderIrfanCard(row.card, row.look).then((b) => { url = URL.createObjectURL(b); if (alive) setSrc(url); }, () => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [row]);
  return (
    // البطاقةُ كاملةً في النافذة، بلا لوحٍ حولها كما في الصفّ
    <div className="irf-card-shot">
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
      {src ? <img className="acr-shot is-portrait" src={src} alt={`عِرفان إلى ${row.to}`} /> : <span className="acr-shot is-portrait" aria-hidden />}
    </div>
  );
}

/**
 * المصغّرة: صورةُ المعاينة، وإلّا فلوحٌ يقول إنّها لم تُرفع، لا مربّعٌ رماديٌّ أخرس يُحسب عطلًا.
 */
function Thumb({ r }: { r: OversightRow }) {
  // eslint-disable-next-line @next/next/no-img-element -- صورةُ المعاينة من التخزين، تُقصّ إلى البطاقة
  if (r.thumb) return <span className="irf-thumb"><img src={r.thumb} alt="" /></span>;
  return (
    <span className="irf-thumb is-missing">
      <ImageBroken size={28} aria-hidden />
      <small>لم تُرفع صورتُها</small>
    </span>
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

      {rows.length ? (
        // **صفٌّ كاملٌ لكلّ رسالة** (المالك ٢٠٢٦-١٠-١٧: رأى الكرتَ اليتيمَ ممتدًّا أفقيًّا فاستحسنه، «يعطينا مساحةً
        // لعرض بياناتٍ أكثر بأريحيّة»): البطاقةُ في جنب، وفي الجنب الآخر لمن ومقعدُه، ومن كتب ومتى، ونصُّ الرسالة
        // نفسُه، ثمّ العنوانُ والتصميمُ والحال. وعلى الجوّال يعود الكرتُ قائمًا (`.irf-card` يقيس عرضَه هو).
        <div className="card-grid card-grid-1col">
          {rows.map((r) => (
            <Card key={r.id} className="irf-card" interactive role="button" tabIndex={0} aria-label={`عِرفان إلى ${r.to} من ${r.from}`} onClick={() => setOpen(r)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(r); } }}>
              {/* الرأسُ ممتدٌّ على الكرت كلِّه فوق البطاقة والسطور معًا (المالك ٢٠٢٦-١٠-١٧). وجُرِّب «من» في طرفه
                  ثمّ ذيلًا ممتدًّا تحته، فأعاده المالكُ سطرًا أوّلَ بين السطور: «كانت أجمل» */}
              <CardHeader variant="soft" icon={<Avatar name={r.to} gender={r.toGender ?? undefined} src={r.toAvatar ?? undefined} size="md" />}
                title={`إلى ${r.to}`} subtitle={r.seat} />
              <div className="irf-card-in">
                <div className="irf-card-shot"><Thumb r={r} /></div>
                <div>
                  {/* كلُّ حقيقةٍ سطرٌ بأيقونته وتسميته، على نسق «من» (المالك ٢٠٢٦-١٠-١٧): لا شاراتٌ مبعثرةٌ ولا نصٌّ سائب */}
                  <Row Icon={UsersThree} k="من" v={r.from} sub={fmtDate(r.at)} />
                  <Row Icon={TextT} k="العنوان" v={r.title ?? "بلا عنوان"} />
                  <Row Icon={Palette} k="التصميم" v={LOOK_NAMES[r.look]} />
                  <Row Icon={ChatTeardropText} k="الرسالة" v={r.card.body} />
                  <Row Icon={EnvelopeSimple} k="الحال" v={r.read ? "قرأها في البوّابة" : "لم يقرأها بعد"}
                    tone={r.pictured ? undefined : "wait"} toneAt="sub"
                    sub={r.pictured ? "صورةُ معاينتها سليمة" : "لم تُرفع صورةُ معاينتها، فوصلت في واتساب بلا صورة"} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `من ${open.from} إلى ${open.to}` : ""}
        description={open ? fmtDate(open.at) : undefined}>
        {open ? <CardShot row={open} /> : null}
      </Modal>
    </div>
  );
}
