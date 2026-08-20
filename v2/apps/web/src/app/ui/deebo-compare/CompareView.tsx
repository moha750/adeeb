"use client";

/**
 * مختبرُ المقارنة — أربعةُ نماذجَ تجيب السؤالَ نفسَه، والحكمُ للعين.
 *
 * وفيه **وضعُ العمى**: الأسماء تُخفى والترتيبُ يدور بدوران السؤال، فلا يتعلّم
 * الناظرُ أنّ الأوّل هو الأغلى دائمًا فيُحابيه. يقرأ أوّلًا ويحكم، ثمّ يكشف.
 * فالسؤال ذوقيٌّ في العربيّة، والذوقُ يُغشّ باسمٍ معروفٍ قبل أن يُقرأ الجواب.
 */

import { useState, useTransition } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Switch } from "@adeeb/design-system";
import { TEST_QUESTIONS } from "@/lib/deebo/questions";
import { askAll, type CompareResult } from "./actions";

const BLIND_NAMES = ["الجواب الأوّل", "الجواب الثاني", "الجواب الثالث", "الجواب الرابع"];
const SAR_PER_USD = 3.75;

type RowState = { loading: boolean; results?: CompareResult[]; error?: string };

/** ريالٌ لكلّ ألف سؤال. الرقمُ الخام بالدولار أصغرُ من أن يُقرأ. */
function riyalPerThousand(costUsd: number): string {
  return (costUsd * 1000 * SAR_PER_USD).toFixed(2);
}

/** يدوّر ترتيب العرض بدوران السؤال، فلا يثبت موضعُ نموذجٍ بعينه في وضع العمى. */
function rotate<T>(items: readonly T[], by: number): T[] {
  if (items.length === 0) return [];
  const n = by % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

export function CompareView({ missing }: { missing: string[] }) {
  const [blind, setBlind] = useState(true);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [, startTransition] = useTransition();

  const run = (index: number) => {
    setRows((r) => ({ ...r, [index]: { loading: true } }));
    startTransition(async () => {
      const res = await askAll(index);
      setRows((r) => ({
        ...r,
        [index]: res.ok
          ? { loading: false, results: res.results }
          : { loading: false, error: res.message },
      }));
    });
  };

  const runAll = () => TEST_QUESTIONS.forEach((_, i) => run(i));
  const busy = Object.values(rows).some((r) => r.loading);

  return (
    <div className="space-y-8">
      {missing.length > 0 && (
        <Alert tone="warning" title="مفاتيحُ ناقصة">
          لم أجد هذه المفاتيح في ملفّ البيئة، فمزوّدوها سيردّون خطأً ويبقى إخوتُهم يعملون:{" "}
          <span className="font-latin" dir="ltr">
            {missing.join("، ")}
          </span>
        </Alert>
      )}

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              checked={blind}
              onChange={(e) => setBlind(e.currentTarget.checked)}
              label="وضع العمى"
              description="تُخفى أسماء النماذج ويدور ترتيبُها، فتحكم بالعربيّة وحدها."
              row
            />
            <Button onClick={runAll} loading={busy} disabled={busy}>
              شغّل الأسئلة العشرة
            </Button>
          </div>
        </CardBody>
      </Card>

      {TEST_QUESTIONS.map((q, i) => {
        const state = rows[i];
        const shown = state?.results ? (blind ? rotate(state.results, i) : state.results) : [];

        return (
          <Card key={q.text}>
            <CardHeader
              variant="soft"
              title={q.text}
              subtitle={q.measures}
              actions={
                <Button size="sm" variant="ghost" onClick={() => run(i)} loading={state?.loading}>
                  {state?.results ? "أعِد" : "شغّل"}
                </Button>
              }
            />
            <CardBody>
              {!state && <p className="text-content-muted">لم يُشغَّل بعد.</p>}
              {state?.error && <Alert tone="danger" title="تعذّر">{state.error}</Alert>}

              {shown.length > 0 && (
                <div className="space-y-6">
                  {shown.map((r, pos) => (
                    <div key={r.providerId} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" variant="outline" size="sm">
                          {blind ? BLIND_NAMES[pos] : r.label}
                        </Badge>
                        {!blind && (
                          <Badge tone="neutral" size="sm" className="font-latin">
                            {r.model}
                          </Badge>
                        )}
                        {r.answer.ok && (
                          <>
                            <Badge tone="info" size="sm">
                              <span className="font-latin" dir="ltr">
                                {(r.answer.ms / 1000).toFixed(1)}
                              </span>
                              {" ثانية"}
                            </Badge>
                            <Badge tone="success" size="sm">
                              <span className="font-latin" dir="ltr">
                                {riyalPerThousand(r.answer.costUsd)}
                              </span>
                              {" ريال لكلّ ألف سؤال"}
                            </Badge>
                          </>
                        )}
                      </div>

                      {r.answer.ok ? (
                        <p className="whitespace-pre-wrap leading-loose text-content">
                          {r.answer.text}
                        </p>
                      ) : (
                        <p className="text-danger-700">{r.answer.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
