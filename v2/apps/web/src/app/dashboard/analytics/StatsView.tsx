"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Stat } from "@adeeb/design-system";
import { Eye, Users, Timer, ArrowUUpLeft, Globe, Robot, DeviceMobile, ArrowBendUpLeft } from "@phosphor-icons/react";
import type { Analytics, Cat, RecentVisitor } from "./data";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// ألوان السلاسل من لوحة المخطّطات الرسميّة (--chart-*) — لا هيكسات شاردة (1=فولاذيّ · 2=كحليّ · 3=ذهبيّ بيانيّ)
const STEEL = "var(--chart-1)", NAVY = "var(--chart-2)", GOLD = "var(--chart-3)";
const CATS = [STEEL, NAVY, GOLD, "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

const nf = (n: number) => n.toLocaleString("en-US");
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };
const fmtDur = (s: number) => (s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

const RANGES: Array<[number, string]> = [[7, "٧ أيّام"], [30, "٣٠ يومًا"], [90, "٩٠ يومًا"], [3650, "الكلّ"]];

// ── مخطّط زمنيّ (مساحة + خطّ) مع تمرير ──
function AreaChart({ daily }: { daily: Analytics["daily"] }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 780, H = 240, PL = 8, PR = 8, PT = 16, PB = 26;
  const n = daily.length;
  const max = Math.max(1, ...daily.map((d) => d.pageviews));
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const x = (i: number) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PT + plotH - (v / max) * plotH;
  const areaPts = daily.map((d, i) => `${x(i)},${y(d.pageviews)}`).join(" ");
  const areaPath = n ? `M ${PL},${PT + plotH} L ${areaPts} L ${x(n - 1)},${PT + plotH} Z` : "";
  const linePts = daily.map((d, i) => `${x(i)},${y(d.visitors)}`).join(" ");
  const gy = [0.25, 0.5, 0.75, 1].map((f) => PT + plotH - f * plotH);
  const labelIdx = n <= 8 ? daily.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHi(Math.round(rel * (n - 1)));
  };
  const hd = hi != null ? daily[hi] : null;

  return (
    <div className="st-area" dir="ltr" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="الزيارات عبر الزمن">
        {gy.map((yy, i) => <line key={i} x1={PL} x2={W - PR} y1={yy} y2={yy} className="st-grid" />)}
        <defs>
          <linearGradient id="stfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STEEL} stopOpacity="0.34" />
            <stop offset="100%" stopColor={STEEL} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {areaPath ? <path d={areaPath} fill="url(#stfill)" /> : null}
        {n > 1 ? <polyline points={areaPts} fill="none" stroke={STEEL} strokeWidth={2} strokeLinejoin="round" /> : null}
        {n > 1 ? <polyline points={linePts} fill="none" stroke={GOLD} strokeWidth={2} strokeDasharray="1 0" strokeLinejoin="round" opacity="0.9" /> : null}
        {hi != null && hd ? (
          <>
            <line x1={x(hi)} x2={x(hi)} y1={PT} y2={PT + plotH} className="st-cross" />
            <circle cx={x(hi)} cy={y(hd.pageviews)} r={4} fill={STEEL} stroke="#fff" strokeWidth={1.5} />
            <circle cx={x(hi)} cy={y(hd.visitors)} r={4} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
          </>
        ) : null}
      </svg>
      <div className="st-xaxis">{labelIdx.map((i) => <span key={i} style={{ insetInlineStart: `${(x(i) / W) * 100}%` }}>{daily[i] ? fmtDate(daily[i].date) : ""}</span>)}</div>
      {hi != null && hd ? (
        <div className="st-tip" style={{ insetInlineStart: `${(x(hi) / W) * 100}%` }}>
          <b>{fmtDate(hd.date)}</b>
          <span><i style={{ background: STEEL }} /> زيارات: {nf(hd.pageviews)}</span>
          <span><i style={{ background: GOLD }} /> زوّار: {nf(hd.visitors)}</span>
        </div>
      ) : null}
      <div className="st-legend"><span><i style={{ background: STEEL }} /> الزيارات</span><span><i style={{ background: GOLD }} /> الزوّار الفريدون</span></div>
    </div>
  );
}

// ── قائمة أشرطة أفقيّة ──
function BarList({ items, tone = STEEL, empty }: { items: Cat[]; tone?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="st-empty">{empty ?? "لا بيانات."}</p>;
  return (
    <div className="st-bars">
      {items.map((it, i) => (
        <div key={it.label + i} className="st-bar" title={`${it.label}: ${nf(it.count)}`}>
          <span className="st-bar-label">{it.label}</span>
          <span className="st-bar-track"><span className="st-bar-fill" style={{ width: `${(it.count / max) * 100}%`, background: tone }} /></span>
          <span className="st-bar-val">{nf(it.count)}</span>
        </div>
      ))}
    </div>
  );
}

// ── حلقة (دونات) ──
function Donut({ items }: { items: Cat[] }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="st-donut">
      <svg viewBox="0 0 140 140" aria-hidden>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="18" />
          {items.map((it, i) => {
            const len = (it.count / total) * C;
            const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={CATS[i % CATS.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" className="st-donut-n">{nf(total)}</text>
        <text x="70" y="84" textAnchor="middle" className="st-donut-l">زيارة</text>
      </svg>
      <div className="st-donut-leg">
        {items.map((it, i) => (
          <div key={i}><i style={{ background: CATS[i % CATS.length] }} /><span>{it.label}</span><b>{Math.round((it.count / total) * 100)}%</b></div>
        ))}
      </div>
    </div>
  );
}

// ── توزيع ساعيّ (٢٤ عمودًا) ──
function HourBars({ hourly }: { hourly: Analytics["hourly"] }) {
  const map = new Map(hourly.map((h) => [h.hour, h.count]));
  const arr = Array.from({ length: 24 }, (_, h) => ({ h, c: map.get(h) ?? 0 }));
  const max = Math.max(1, ...arr.map((a) => a.c));
  return (
    <div className="st-hours">
      {arr.map((a) => (
        <div key={a.h} className="st-hour" title={`الساعة ${a.h}: ${nf(a.c)}`}>
          <span className="st-hour-bar" style={{ height: `${(a.c / max) * 100}%` }} />
          {a.h % 6 === 0 ? <span className="st-hour-lbl">{a.h}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function StatsView({ data, recent, days }: { data: Analytics; recent: RecentVisitor[]; days: number }) {
  const k = data.kpis;
  const kpis = useMemo(() => [
    { icon: <Eye weight="fill" />, n: nf(k.pageviews), l: "زيارة (صفحة)" },
    { icon: <Users weight="fill" />, n: nf(k.visitors), l: "زائر فريد" },
    { icon: <ArrowUUpLeft weight="fill" />, n: nf(k.sessions), l: "جلسة" },
    { icon: <Timer weight="fill" />, n: fmtDur(k.avg_seconds), l: "متوسّط المدّة" },
    { icon: <ArrowBendUpLeft weight="fill" />, n: `${k.bounce_rate}٪`, l: "معدّل الارتداد" },
    { icon: <Globe weight="fill" />, n: nf(k.countries), l: "دولة" },
    { icon: <Robot weight="fill" />, n: nf(data.bots), l: "زيارة روبوت" },
  ], [k, data.bots]);

  return (
    <div className="st">
      <div className="st-tools">
        <div className="st-range">
          {RANGES.map(([d, lbl]) => (
            <Link key={d} href={`/dashboard/analytics?days=${d}`} className={"st-range-b" + (days === d ? " on" : "")}>{lbl}</Link>
          ))}
        </div>
        <span className="st-note">لا يشمل الصفحات الإداريّة ولا الروبوتات</span>
      </div>

      <div className="stat-grid">
        {kpis.map((x, i) => (
          <Stat key={i} icon={x.icon} value={x.n} label={x.l} />
        ))}
      </div>

      <section className="st-card st-card-wide">
        <h3 className="st-h">الزيارات عبر الزمن</h3>
        <AreaChart daily={data.daily} />
      </section>

      <div className="st-grid2">
        <section className="st-card"><h3 className="st-h">أعلى الصفحات</h3><BarList items={data.top_pages} /></section>
        <section className="st-card"><h3 className="st-h">الدول</h3><BarList items={data.countries} tone={NAVY} /></section>
      </div>

      <div className="st-grid2">
        <section className="st-card"><h3 className="st-h"><DeviceMobile weight="fill" /> الأجهزة</h3><Donut items={data.devices} /></section>
        <section className="st-card"><h3 className="st-h">المتصفّحات</h3><BarList items={data.browsers} tone={GOLD} /></section>
      </div>

      <div className="st-grid2">
        <section className="st-card"><h3 className="st-h">مصادر الزيارات</h3><BarList items={data.referrers} tone="#2f8a7f" empty="زيارات مباشرة فقط." /></section>
        <section className="st-card"><h3 className="st-h">التوزيع الساعيّ</h3><HourBars hourly={data.hourly} /></section>
      </div>

      <section className="st-card">
        <h3 className="st-h">أحدث الزوّار</h3>
        {recent.length ? (
          <div className="st-rv">
            {recent.map((v) => (
              <div key={v.id} className="st-rv-row">
                <span className="st-rv-c">{v.country ?? "—"}</span>
                <span className="st-rv-m">{v.isMember ? <Badge tone="success" variant="soft">عضو</Badge> : <span className="txt na">زائر</span>}</span>
                <span className="st-rv-stat">{nf(v.pageviews)} زيارة · {nf(v.sessions)} جلسة</span>
              </div>
            ))}
          </div>
        ) : <p className="st-empty">لا زوّار بعد.</p>}
      </section>
    </div>
  );
}
