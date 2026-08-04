"use client";

import { useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { CheckCircle, Gift, Stamp, User, Warning } from "@phosphor-icons/react";
import { num, GOAL, isComplete, REWARD, statusText, type DemoMember } from "../../demo";

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
export function ScanView({ holder, stamps, cycles }: { holder: DemoMember; stamps: number; cycles: number }) {
  const [state, setState] = useState({ stamps, cycles });
  const [busy, setBusy] = useState(false);
  /** ما تمّ آخرًا — **الفعلُ نفسُه لا يُشتقّ من الأرقام**: مقارنةُ الدورات بقيمة البداية
   *  تكذب بعد فعلين، فيُقال «خُتم» وقد سُلّمت المكافأة. */
  const [done, setDone] = useState<{ act: "stamp" | "claim"; res: SyncResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = isComplete(state.stamps);

  async function act(action: "stamp" | "claim") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: holder.serial, action }),
        cache: "no-store",
      });
      const body = (await res.json()) as SyncResult & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "تعذّر إتمام العمليّة.");
        return;
      }
      setState({ stamps: body.stamps, cycles: body.cycles });
      setDone({ act: action, res: body });
    } catch {
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
            قدرةَ الختم، ويُقيَّد كلُّ ختمٍ باسمه.
          </Alert>

          <Card className="mb-6">
            <CardHeader
              icon={<User />}
              title={holder.name}
              subtitle={`${holder.department} · ${holder.committee}`}
              actions={
                <Badge tone={complete ? "success" : "info"}>
                  <span className="font-latin">{num(state.stamps)}</span> /{" "}
                  <span className="font-latin">{num(GOAL)}</span>
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
