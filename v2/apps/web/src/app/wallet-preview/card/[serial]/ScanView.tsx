"use client";

import { useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { Gift, Stamp, User } from "@phosphor-icons/react";
import { CheckCircle } from "@/app/_components/glyphs";
import { Warning } from "@/app/_components/glyphs";
import {
  affordable,
  CATALOG,
  EARN,
  GOAL,
  isComplete,
  type Mode,
  num,
  pointsStatusText,
  REWARD,
  score,
  serialFor,
  statusText,
  TOP_COST,
  type DemoMember,
} from "../../demo";
import { useLiveCards, type LiveCard } from "../../useLiveCards";

/** جوابُ المزامنة كما يردّه الخادم — يُعرَض كما هو، فالدفعةُ الصامتة لا تُصدَّق بلا خبر. */
type SyncResult = {
  stamps: number;
  cycles: number;
  points: number;
  redemptions: number;
  devices: number;
  pushed: number;
  failures: { status: number; reason?: string }[];
};

/**
 * ما يراه **مسؤولُ الحضور** حين يمسح بطاقةَ عضو: من هو، وأين بلغ، وفعلٌ واحدٌ لا فعلان.
 *
 * **والفعلُ يُشتقّ من الحالة لا يُختار**: البطاقةُ الناقصة تُختَم، والمكتملةُ تُصرَف
 * مكافأتُها. زرٌّ واحدٌ في الشاشة يمنع الخطأ عند باب مزدحم — ومن يمسك الجوّال هناك ليس
 * فارغًا لقراءة خيارات.
 *
 * **والحالةُ تُقرأ في الخادم عند كلّ فعل** (نرسل `action` لا رقمًا) — فماسحان في وقتٍ
 * واحدٍ لا يمحو أحدُهما ختمَ الآخر.
 */
export function ScanView({ holder, mode, initial }: { holder: DemoMember; mode: Mode; initial: Record<string, LiveCard> }) {
  /**
   * الحالة **متابَعةٌ لحظةً بلحظة**: من ختم في صفحة المعاينة (أو ماسحٌ آخر) رأيتَه هنا
   * بلا تحديث — وهو ما يمنع ماسحًا من الختم على رقمٍ متقادمٍ أمام عينيه.
   */
  const serial = serialFor(holder, mode);
  const { cards, merge } = useLiveCards(initial);
  const state = cards[serial] ?? {
    stamps: holder.stamps,
    cycles: holder.cycles,
    points: holder.points,
    redemptions: holder.redemptions,
    updatedAt: "",
  };
  const [busy, setBusy] = useState(false);
  /** ما تمّ آخرًا — **الفعلُ نفسُه لا يُشتقّ من الأرقام**: مقارنةُ الدورات بقيمة البداية
   *  تكذب بعد فعلين، فيُقال «خُتم» وقد سُلّمت المكافأة. */
  const [done, setDone] = useState<{ act: string; res: SyncResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = isComplete(state.stamps);
  const can = affordable(state.points);

  /**
   * **الشاشةُ تسبق الشبكة**: يُرسَم أثرُ الضغطة فورًا ثمّ يُسأل الخادم — لأنّ ردَّه ينتظر
   * دفعةَ APNs، فالانتظارُ عند بابٍ مزدحمٍ يُقرأ عطلًا لا بطئًا. وإن أخفق الطلبُ رُدَّت
   * الحالةُ السابقة بزمنٍ جديد، فيفوز الرجوعُ على ما رُسم تفاؤلًا.
   *
   * **والأثرُ المتوقَّع يُحسَب هنا كما يحسبه الخادم** — نسختان لقاعدةٍ واحدة، وهو ثمنُ
   * ألّا ينتظر الماسحُ الشبكةَ. وجوابُ الخادم يحلّ محلَّه بعد حين، فإن اختلفا فازَ هو.
   */
  async function act(action: string) {
    const before = state;
    const [verb, key = ""] = action.split(":");

    let after: Omit<LiveCard, "updatedAt">;
    if (verb === "earn") {
      const gain = EARN.find((e) => e.key === key)?.points ?? 0;
      after = { ...state, points: Math.min(TOP_COST, state.points + gain) };
    } else if (verb === "redeem") {
      const cost = CATALOG.find((r) => r.key === key)?.cost ?? 0;
      after = { ...state, points: Math.max(0, state.points - cost), redemptions: state.redemptions + 1 };
    } else if (action === "claim") {
      after = { ...state, stamps: 0, cycles: state.cycles + 1 };
    } else {
      after = { ...state, stamps: Math.min(GOAL, state.stamps + 1) };
    }

    setBusy(true);
    setError(null);
    merge({ [serial]: { ...after, updatedAt: new Date().toISOString() } });

    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial, action }),
        cache: "no-store",
      });
      const body = (await res.json()) as SyncResult & { error?: string; updatedAt?: string };
      if (!res.ok) {
        merge({ [serial]: { ...before, updatedAt: new Date().toISOString() } });
        setError(body.error ?? "تعذّر إتمام العمليّة.");
        return;
      }
      // بزمنِ الخادم — فالمتابعُ يقارن به ولا يمحو ما جرى للتوّ (`useLiveCards`)
      merge({
        [serial]: {
          stamps: body.stamps,
          cycles: body.cycles,
          points: body.points,
          redemptions: body.redemptions,
          updatedAt: body.updatedAt ?? new Date().toISOString(),
        },
      });
      setDone({ act: action, res: body });
    } catch {
      merge({ [serial]: { ...before, updatedAt: new Date().toISOString() } });
      setError("تعذّر الاتّصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-10">
      <Container>
        <div className="mx-auto max-w-md">
          <Alert tone="warning" title="معاينة" icon={<Warning />} className="mb-6" compact>
            بطاقةٌ وهميّةٌ لتجربة النظام. في النظام الحقيقيّ لا تُفتَح هذه الصفحة إلّا لمن يملك
            الصلاحية.
          </Alert>

          <Card className="mb-6">
            <CardHeader
              icon={<User />}
              title={holder.name}
              subtitle={`${holder.department} · ${holder.committee}`}
              actions={
                <Badge tone={mode === "points" ? (can.length > 0 ? "success" : "info") : complete ? "success" : "info"}>
                  {/* كتلةٌ واحدةٌ لا ثلاث — الفاصلُ المحاطُ بمسافتين ينقلب في الجملة العربيّة */}
                  <span className="font-latin">{mode === "points" ? num(state.points) : score(state.stamps)}</span>
                </Badge>
              }
            />
            <CardBody>
              {/* سطحُ البطاقة **بالبايتات نفسِها** التي تدخل الحزمة — لا محاكاةٌ تشبهها */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  mode === "points"
                    ? `/wallet-preview/strip?points=${state.points}`
                    : `/wallet-preview/strip?stamps=${state.stamps}`
                }
                alt={mode === "points" ? `${num(state.points)} نقطة` : `${num(state.stamps)} من ${num(GOAL)} مشاركات`}
                className="mb-4 block w-full rounded-[var(--radius-sm)]"
              />

              {mode === "points" ? (
                <p className="text-sm">
                  {pointsStatusText(state.points)} · مكافآتٌ صرفها:{" "}
                  <span className="font-latin">{num(state.redemptions)}</span>
                </p>
              ) : (
                <p className="text-sm">
                  {statusText(state.stamps)} · بطاقاتٌ أكملها:{" "}
                  <span className="font-latin">{num(state.cycles)}</span>
                </p>
              )}
              <p className="mt-1 font-latin text-xs text-content-muted">{serial}</p>
            </CardBody>
          </Card>

          {mode === "points" ? (
            <>
              {/* **الماسحُ يختار الفعل هنا** بخلاف الأختام: في النقاط لا يكفي «حضر» —
                  فالقيمةُ تتفاوت بتفاوت الجهد، ولا يُشتقّ ذلك من حالة البطاقة.
                  وهذا في ذاته فرقٌ يراه المالك: بابٌ أبطأُ وقرارٌ على الماسح. */}
              <Card className="mb-6">
                <CardHeader icon={<Stamp />} title="سجّل مشاركته" subtitle="القيمةُ بحسب الجهد" />
                <CardBody>
                  <div className="grid gap-2">
                    {EARN.map((e) => (
                      <Button
                        key={e.key}
                        size="lg"
                        variant={e.key === "attend" ? "primary" : "ghost"}
                        className="w-full justify-between"
                        loading={busy}
                        onClick={() => act(`earn:${e.key}`)}
                      >
                        <span>{e.label}</span>
                        <span className="font-latin">+{num(e.points)}</span>
                      </Button>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {can.length > 0 ? (
                <Card tone="success" className="mb-6">
                  <CardHeader icon={<Gift />} title="رصيدُه يكفي" subtitle="اصرف ما يختاره" />
                  <CardBody>
                    <div className="grid gap-2">
                      {can.map((r) => (
                        <Button
                          key={r.key}
                          size="lg"
                          variant="success"
                          className="w-full justify-between"
                          loading={busy}
                          onClick={() => act(`redeem:${r.key}`)}
                        >
                          <span>{r.title}</span>
                          <span className="font-latin">−{num(r.cost)}</span>
                        </Button>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ) : null}
            </>
          ) : complete ? (
            /* الفعلُ واحدٌ يُشتقّ من الحالة — انظر رأس الملفّ */
            <Card tone="success" className="mb-6">
              <CardHeader icon={<Gift />} title="بطاقةٌ مكتملة" subtitle={REWARD.sponsor} />
              <CardBody>
                <b className="block text-lg">{REWARD.title}</b>
                <p className="mt-1 text-xs text-content-muted">{REWARD.terms}</p>
                <Button variant="success" size="lg" className="mt-4 w-full" loading={busy} onClick={() => act("claim")}>
                  <Gift />
                  سلّم المكافأة وابدأ بطاقةً جديدة
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Button size="lg" className="mb-6 w-full" loading={busy} onClick={() => act("stamp")}>
              <Stamp />
              اختم حضوره
            </Button>
          )}

          {error ? (
            <Alert tone="danger" title="لم تتمّ العمليّة">
              {error}
            </Alert>
          ) : null}

          {done && !error ? (
            <Alert
              tone="success"
              title={
                done.act.startsWith("redeem") || done.act === "claim"
                  ? "سُلِّمت المكافأة"
                  : done.act.startsWith("earn")
                    ? "سُجّلت مشاركته"
                    : "خُتم الحضور"
              }
              icon={<CheckCircle />}
            >
              {done.res.devices === 0 ? (
                "حُفظ، ولا جهازَ أضاف هذه البطاقة إلى محفظته بعد."
              ) : done.res.failures.length > 0 ? (
                <>تعذّر تنبيه جهازه: {done.res.failures[0].reason ?? done.res.failures[0].status}</>
              ) : (
                <>
                  دُفع إلى <span className="font-latin">{num(done.res.pushed)}</span>{" "}
                  {done.res.pushed === 1 ? "جهاز" : "أجهزة"}، تتحدّث بطاقتُه خلال ثوانٍ
                </>
              )}
            </Alert>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
