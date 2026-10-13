"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import {
  CalendarBlank, CalendarCheck, Clock, HandHeart, LockSimple, MapPin, UsersThree,
} from "@phosphor-icons/react";
import { CaretLeft, CheckCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import type { OpenOpportunity } from "@/app/me/volunteering";
import { useToast } from "../_components/ToastProvider";
import { CaretAct, Row } from "./Row";
import { rpcError } from "./volunteerRpc";

/**
 * **صفحةُ الفرصة** — ما يفتحه رابطُ القروب (`/v/<id>`). بلغة الغرف: كرتُ الفرصة بحقائقها سطورًا،
 * و«ما ستفعله» نصًّا، والفتراتُ سطورُ اختيارٍ بمربّع الهويّة (`.ach`)، والمكتملةُ مقفلةٌ يبقى وقتُها
 * مقروءًا، وزرُّ التقديم في ذيل كرتها بعدد ما اختير. والفرصةُ بلا فترات (قديمةٌ أو مرنة) زرٌّ واحد.
 */

const applyLabel = (n: number): string =>
  n <= 1 ? "التقديم على الفترة" : n === 2 ? "التقديم على الفترتين" : n <= 10 ? `التقديم على ${n} فترات` : `التقديم على ${n} فترةً`;

/** «الخميس 8 أكتوبر، من 8 ص إلى 12 م» ← اليومُ تسميةً، والوقتُ قيمة. */
const split = (label: string) => {
  const [day, ...rest] = label.split("، ");
  return { day, time: rest.join("، ") || day };
};

export function OpportunityRoom({ o, fit, applied }: {
  o: OpenOpportunity;
  fit: boolean;
  /** حالُ طلبه على فرصةٍ بلا فترات، إن قدّم. */
  applied: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [sb] = useState(() => createClient());
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const periods = o.periods.filter((p) => !p.passed);
  const full = o.seats != null && o.taken >= o.seats;
  const n = picked.length;

  const apply = async () => {
    setErr(null);
    setBusy(true);
    const { error } = o.periods.length
      ? await sb.rpc("apply_for_periods", { p_opportunity_id: o.id, p_period_ids: picked })
      : await sb.rpc("apply_for_opportunity", { p_opportunity_id: o.id });
    setBusy(false);
    if (error) { setErr(rpcError(error.message)); return; }
    toast.success("وصل طلبك، وتجده في «مشاركاتك الجارية».");
    setPicked([]);
    router.refresh();
  };

  return (
    <>
      <nav className="ash-crumb avr-crumb" aria-label="مسار الصفحة">
        <ol>
          <li><Link className="ash-crumb-a" href="/dashboard/volunteer">تطوّعي</Link></li>
          <li><CaretLeft className="ash-crumb-sep" aria-hidden /><b aria-current="page">{o.title}</b></li>
        </ol>
      </nav>
      <div className="acc-cols is-wide-aside">
        <div className="acc-main">
          <Card>
            <CardHeader variant="soft" icon={<UsersThree aria-hidden />} title={o.title}
              subtitle={[o.committee, fit ? "من رغباتك" : null].filter(Boolean).join("، ") || undefined} />
            {o.dateLabel ? <Row Icon={CalendarBlank} k="الموعد" v={o.dateLabel} sub={o.timeLabel ?? undefined} /> : null}
            {!o.dateLabel && o.timeLabel ? <Row Icon={Clock} k="الوقت" v={o.timeLabel} /> : null}
            {o.location ? <Row Icon={MapPin} k="المكان" v={o.location} /> : null}
            {o.seats != null ? <Row Icon={UsersThree} k="العدد" v={`${o.seats} ${o.seats >= 3 && o.seats <= 10 ? "متطوّعين" : "متطوّعًا"}`} /> : null}
          </Card>
          {o.description ? (
            <Card>
              <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="ما ستفعله" />
              <CardBody><p className="acc-prose">{o.description}</p></CardBody>
            </Card>
          ) : null}
        </div>

        <aside className="acc-aside">
          {o.periods.length ? (
            <Card>
              <CardHeader variant="soft" icon={<CalendarCheck aria-hidden />} title="اختر فترتك" subtitle="لك أن تختار أكثر من فترة" />
              {err ? <Alert tone="danger">{err}</Alert> : null}
              {periods.length ? periods.map((p) => {
                const { day, time } = split(p.label);
                if (p.mine) {
                  return <Row key={p.id} Icon={CheckCircle} k={day} v={time} sub="قدّمتَ عليها" tone="ok" toneAt="sub" />;
                }
                if (p.full) {
                  return (
                    <div key={p.id} className="acc-row acc-pick is-full">
                      <span className="acc-ic" aria-hidden><LockSimple /></span>
                      <span className="acc-kv"><small>{day}</small><b>{time}</b>{p.seats != null ? <i>{`شُغلت مقاعدُها (${p.seats})`}</i> : null}</span>
                      <span className="acc-full"><LockSimple aria-hidden />مكتملة</span>
                    </div>
                  );
                }
                return (
                  <label key={p.id} className="acc-row ach acc-pick">
                    <input type="checkbox" checked={picked.includes(p.id)} disabled={busy}
                      onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} />
                    <span className="acc-ic" aria-hidden><CalendarBlank /></span>
                    <span className="acc-kv"><small>{day}</small><b>{time}</b><i>{p.seats == null ? "العددُ مفتوح" : `باقٍ ${p.seats - p.taken} من ${p.seats}`}</i></span>
                    <span className="ach-box" aria-hidden>
                      <svg className="ach-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    </span>
                  </label>
                );
              }) : <Row Icon={CalendarBlank} v="انتهت فتراتُها" tone="muted" />}
              {periods.some((p) => !p.mine && !p.full) ? (
                <CardFooter>
                  <div className="acard-foot-row">
                    <Button variant="primary" disabled={!n} loading={busy} onClick={apply}>{applyLabel(n)}</Button>
                  </div>
                </CardFooter>
              ) : null}
            </Card>
          ) : (
            <Card>
              <CardHeader variant="soft" icon={<CalendarCheck aria-hidden />} title="التقديم" subtitle={o.dateLabel ?? undefined} />
              {err ? <Alert tone="danger">{err}</Alert> : null}
              {applied
                ? <Row Icon={CheckCircle} v="قدّمتَ على هذه الفرصة" sub={applied} tone="ok" toneAt="sub" />
                : <Row Icon={full ? LockSimple : UsersThree} v={full ? "اكتمل العدد" : "مقاعدُها مفتوحة"}
                    sub={o.seats == null ? "بلا عددٍ محدّد" : `باقٍ ${Math.max(0, o.seats - o.taken)} من ${o.seats}`} tone={full ? "muted" : undefined} />}
              {!applied && !full ? (
                <CardFooter>
                  <div className="acard-foot-row">
                    <Button variant="primary" loading={busy} onClick={apply}>التقديم على الفرصة</Button>
                  </div>
                </CardFooter>
              ) : null}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

/** فرصةٌ أُغلقت أو لم تُوجَّه إليه: يُقال ذلك ويُدَلّ على الغرفة. */
export function OpportunityGone({ title }: { title: string | null }) {
  return (
    <Card>
      <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title={title ?? "لم تعد هذه الفرصة مفتوحة"}
        subtitle={title ? "أُغلق التقديمُ عليها، وطلبُك في «تطوّعي»" : "انتهى التقديمُ عليها أو لم تُوجَّه إليك"} />
      <Row Icon={HandHeart} k="تطوّعي" v="مشاركاتُك والفرصُ المفتوحة الآن" act={CaretAct("تطوّعي")} href="/dashboard/volunteer" />
    </Card>
  );
}
