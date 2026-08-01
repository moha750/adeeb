import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, CardBody } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/server";
import { getSurveyAggregates } from "@/lib/surveys/aggregate";
import { QUESTION_TYPE_LABEL } from "@/app/dashboard/surveys/vocab";

export const metadata: Metadata = { title: "نتائج الاستبيان — نادي أديب" };

const pct = (n: number, total: number): number => (total ? Math.round((n / total) * 100) : 0);

/** غلاف موحّد لشاشات الحالة (غير متاح · للأعضاء) — كصفحة التعبئة. */
function StateScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-4 py-10">
      <Card><CardBody className="p-6"><Alert tone="info" title={title}>{children}</Alert></CardBody></Card>
    </main>
  );
}

/**
 * النتائج العامّة — تُعرض فقط حين يفعّل المالك «إظهار النتائج للمشاركين».
 * إجماليّات مجرّدة بلا هويّات ولا إجابات نصيّة فرديّة (النصوص آراء أصحابها —
 * تبقى للوحة وحدها؛ العموم يرى عدّها فقط).
 */
export default async function PublicSurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  const { agg, error } = await getSurveyAggregates(surveyId);
  if (error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
        <Alert tone="warning" title="تعذّر جلب النتائج">حاول مجدّدًا لاحقًا.</Alert>
      </main>
    );
  }
  // بوّابةُ النتائج العلنيّة (كصفحة التعبئة): استبيانٌ منشورٌ (لا مسودّة) وغير مخفيّ (لا محذوف/مؤرشف)
  // ومفعَّلُ إظهار النتائج. تبقى ظاهرةً بعد الإغلاق ليراها من شارك — لكن لا تُبلَغ لمسودّة ولا لمخفيّ.
  if (!agg || agg.deleted || agg.archived || agg.status === "draft" || !agg.showResults) notFound();

  // «للأعضاء فقط»: عضوٌ نشطٌ مسجّل الدخول — لا تُبلَغ نتائجه لأيّ زائر (نفس حارس صفحة التعبئة)
  if (agg.access === "members_only") {
    const supa = await createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return (
        <StateScreen title="نتائج هذا الاستبيان لأعضاء أديب">
          سجّل دخولك بعضويّة نشطة.{" "}
          <Link className="font-bold underline" href={`/login?next=/surveys/${surveyId}/results`}>تسجيل الدخول</Link>
        </StateScreen>
      );
    }
    const { data: isMember } = await supa.rpc("survey_is_active_member", { p_user: user.id });
    if (!isMember) {
      return <StateScreen title="لأعضاء أديب النشطين">هذه النتائج متاحة للأعضاء النشطين فقط.</StateScreen>;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        <p className="font-display text-sm font-bold text-steel-600">نادي أديب</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-content">نتائج: {agg.title}</h1>
        <p className="mt-2 text-content-muted"><b className="num">{agg.totals.responses}</b> مشاركة مكتملة</p>
      </header>

      <div className="flex flex-col gap-5">
        {agg.questions.map((q) => (
          <Card key={q.qid}>
            <CardBody className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-content">{q.text}</h2>
                <Badge tone="neutral" variant="soft">{QUESTION_TYPE_LABEL[q.type] ?? q.type}</Badge>
              </div>

              {q.answered === 0 ? (
                <p className="text-sm text-content-muted">لا إجابات بعد.</p>
              ) : q.kind === "choice" || q.kind === "boolean" ? (
                <div className="flex flex-col gap-2">
                  {(q.kind === "choice"
                    ? q.items.map((it) => ({ label: it.label + (it.retired ? " (خيار سابق)" : ""), count: it.count }))
                    : [{ label: "نعم", count: q.yes }, { label: "لا", count: q.no }]
                  ).map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-sm text-content" title={it.label}>{it.label}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-steel-500" style={{ width: `${pct(it.count, q.answered)}%` }} />
                      </span>
                      <span className="num w-14 shrink-0 text-end text-sm font-bold text-content">{pct(it.count, q.answered)}٪</span>
                    </div>
                  ))}
                </div>
              ) : q.kind === "number" ? (
                <p className="text-content">
                  المتوسّط <b className="num">{q.avg ?? "—"}</b> · الأدنى <b className="num">{q.min ?? "—"}</b> · الأعلى <b className="num">{q.max ?? "—"}</b>
                </p>
              ) : (
                <p className="text-sm text-content-muted"><b className="num">{q.answered}</b> إجابة نصيّة.</p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </main>
  );
}
