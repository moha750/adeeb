"use client";

import { useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { CheckCircle, Gift, Stamp, User, Warning } from "@phosphor-icons/react";
import { GOAL, isComplete, num, REWARD, score, statusText, type DemoMember } from "../../demo";
import { useLiveCards, type LiveCard } from "../../useLiveCards";

/** جوابُ المزامنة كما يردّه الخادم — يُعرَض كما هو، فالدفعةُ الصامتة لا تُصدَّق بلا خبر. */
type SyncResult = {
  stamps: number;
  cycles: number;
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
export function ScanView({ holder, initial }: { holder: DemoMember; initial: Record<string, LiveCard> }) {
  /**
   * الحالة **متابَعةٌ لحظةً بلحظة**: من ختم في صفحة المعاينة (أو ماسحٌ آخر) رأيتَه هنا
   * بلا تحديث — وهو ما يمنع ماسحًا من الختم على رقمٍ متقادمٍ أمام عينيه.
   */
  const { cards, merge } = useLiveCards(initial);
  const state = cards[holder.serial] ?? { stamps: holder.stamps, cycles: holder.cycles, updatedAt: "" };
  const [busy, setBusy] = useState(false);
  /** ما تمّ آخرًا — **الفعلُ نفسُه لا يُشتقّ من الأرقام**: مقارنةُ الدورات بقيمة البداية
   *  تكذب بعد فعلين، فيُقال «خُتم» وقد سُلّمت المكافأة. */
  const [done, setDone] = useState<{ act: "stamp" | "claim"; res: SyncResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = isComplete(state.stamps);

  /**
   * **الشاشةُ تسبق الشبكة**: يُرسَم أثرُ الضغطة فورًا ثمّ يُسأل الخادم — لأنّ ردَّه ينتظر
   * دفعةَ APNs، فالانتظارُ عند بابٍ مزدحمٍ يُقرأ عطلًا لا بطئًا. وإن أخفق الطلبُ رُدَّت
   * الحالةُ السابقة بزمنٍ جديد، فيفوز الرجوعُ على ما رُسم تفاؤلًا.
   */
  async function act(action: "stamp" | "claim") {
    const before = state;
    const after =
      action === "claim"
        ? { stamps: 0, cycles: state.cycles + 1 }
        : { stamps: Math.min(GOAL, state.stamps + 1), cycles: state.cycles };

    setBusy(true);
    setError(null);
    merge({ [holder.serial]: { ...after, updatedAt: new Date().toISOString() } });

    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: holder.serial, action }),
        cache: "no-store",
      });
      const body = (await res.json()) as SyncResult & { error?: string; updatedAt?: string };
      if (!res.ok) {
        merge({ [holder.serial]: { ...before, updatedAt: new Date().toISOString() } });
        setError(body.error ?? "تعذّر إتمام العمليّة.");
        return;
      }
      // بزمنِ الخادم — فالمتابعُ يقارن به ولا يمحو ما جرى للتوّ (`useLiveCards`)
      merge({ [holder.serial]: { stamps: body.stamps, cycles: body.cycles, updatedAt: body.updatedAt ?? new Date().toISOString() } });
      setDone({ act: action, res: body });
    } catch {
      merge({ [holder.serial]: { ...before, updatedAt: new Date().toISOString() } });
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
                <Badge tone={complete ? "success" : "info"}>
                  {/* كتلةٌ واحدةٌ لا ثلاث — الفاصلُ المحاطُ بمسافتين ينقلب في الجملة العربيّة */}
                  <span className="font-latin">{score(state.stamps)}</span>
                </Badge>
              }
            />
            <CardBody>
              {/* سطحُ البطاقة **بالبايتات نفسِها** التي تدخل الحزمة — لا محاكاةٌ تشبهها */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/wallet-preview/strip?stamps=${state.stamps}`}
                alt={`${num(state.stamps)} من ${num(GOAL)} مشاركات`}
                className="mb-4 block w-full rounded-[var(--radius-sm)]"
              />

              <p className="text-sm">
                {statusText(state.stamps)} · بطاقاتٌ أكملها:{" "}
                <span className="font-latin">{num(state.cycles)}</span>
              </p>
              <p className="mt-1 font-latin text-xs text-content-muted">{holder.serial}</p>
            </CardBody>
          </Card>

          {/* الفعلُ واحدٌ يُشتقّ من الحالة — انظر رأس الملفّ */}
          {complete ? (
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
              title={done.act === "claim" ? "سُلِّمت المكافأة" : "خُتم الحضور"}
              icon={<CheckCircle />}
            >
              {done.res.devices === 0 ? (
                "حُفظ — ولا جهازَ أضاف هذه البطاقة إلى محفظته بعد."
              ) : done.res.failures.length > 0 ? (
                <>تعذّر تنبيه جهازه: {done.res.failures[0].reason ?? done.res.failures[0].status}</>
              ) : (
                <>
                  دُفع إلى <span className="font-latin">{num(done.res.pushed)}</span>{" "}
                  {done.res.pushed === 1 ? "جهاز" : "أجهزة"} — تتحدّث بطاقتُه خلال ثوانٍ
                </>
              )}
            </Alert>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
