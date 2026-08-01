import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdeebServiceClient } from "@adeeb/core";
import { Alert, Card, CardBody } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/server";
import { SurveyRespond } from "./SurveyRespond";
import { toPublicSurvey, toPublicQuestions } from "./public";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const fmtDT = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const surveyId = Number(id);
  const sb = service();
  if (!sb || !Number.isInteger(surveyId)) return { title: "نظام استبيانات أديب" };
  // العنوان يُكشف لمعاينات الروابط للنشط العامّ وحده — عنوان مسودّةٍ أو استبيانِ
  // أعضاءٍ ليس لعابر يحمل الرابط (نفس حدود قراءة anon في RLS)
  const { data } = await sb
    .from("surveys")
    .select("title, description")
    .eq("id", surveyId)
    .eq("status", "active")
    .eq("access_type", "public")
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { title: "نظام استبيانات أديب" };
  return {
    title: data.title,
    description: data.description ?? "شارك برأيك في استبيان نادي أديب.",
  };
}

/** غلاف موحّد لشاشات الحالة (غير متاح · مجدول · للأعضاء · أُجيب سابقًا). */
function StateScreen({ title, tone, children }: { title: string; tone: "info" | "warning" | "success"; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-4 py-10">
      <Card>
        <CardBody className="p-6">
          <Alert tone={tone} title={title}>{children}</Alert>
        </CardBody>
      </Card>
    </main>
  );
}

export default async function PublicSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  const sb = service();
  if (!sb) {
    return <StateScreen title="الخدمة غير مهيّأة" tone="warning">تعذّر تجهيز الصفحة — حاول لاحقًا.</StateScreen>;
  }

  const [sRes, qRes, session] = await Promise.all([
    sb.from("surveys").select("*").eq("id", surveyId).maybeSingle(),
    sb.from("survey_questions").select("id, question_text, question_description, question_type, question_order, is_required, options").eq("survey_id", surveyId).order("question_order", { ascending: true }),
    createClient(),
  ]);
  if (sRes.error || qRes.error) {
    return <StateScreen title="تعذّر التحميل" tone="warning">حدث خطأ أثناء جلب الاستبيان — حاول مجدّدًا.</StateScreen>;
  }
  const survey = sRes.data;
  if (!survey) notFound();

  const { data: { user } } = await session.auth.getUser();
  const now = Date.now();
  const closedMsg = survey.closed_message ?? null;

  // ١) الحالة: النشط وحده يستقبل — والأرشفة/الحذف عَلَمان يُبقيان الحالة فيُفحصان صراحةً (وسواه يقوله)
  if (survey.status !== "active" || survey.archived_at || survey.deleted_at) {
    return (
      <StateScreen title="هذا الاستبيان غير متاح" tone="info">
        {closedMsg ?? "توقّف استقبال الإجابات على هذا الاستبيان."}
      </StateScreen>
    );
  }
  // ٢) النافذة الزمنيّة
  if (survey.start_date && new Date(survey.start_date).getTime() > now) {
    return (
      <StateScreen title="لم يبدأ بعد" tone="info">
        يبدأ استقبال الإجابات في {fmtDT(survey.start_date)}.
      </StateScreen>
    );
  }
  if (survey.end_date && new Date(survey.end_date).getTime() < now) {
    return (
      <StateScreen title="انتهت مدّة الاستبيان" tone="info">
        {closedMsg ?? "انتهى استقبال الإجابات على هذا الاستبيان."}
      </StateScreen>
    );
  }
  // ٣) وصول الأعضاء — الدخول ثمّ العضويّة النشطة
  if (survey.access_type === "members_only") {
    if (!user) {
      return (
        <StateScreen title="هذا الاستبيان لأعضاء أديب" tone="info">
          سجّل دخولك ثمّ عد إلى هذه الصفحة.{" "}
          <Link className="font-bold underline" href={`/login?next=/surveys/${surveyId}`}>تسجيل الدخول</Link>
        </StateScreen>
      );
    }
    const { data: profile } = await sb.from("profiles").select("account_status").eq("id", user.id).maybeSingle();
    if (profile?.account_status !== "active") {
      return (
        <StateScreen title="لعضويّات أديب النشطة" tone="warning">
          هذا الاستبيان متاح للأعضاء النشطين فقط.
        </StateScreen>
      );
    }
  }
  // ٤) استجابة واحدة للمسجَّل — تُفحص هنا لعرض شاشة صادقة قبل عناء الإجابة
  //    (الاستبيان المجهول لا يسجّل هويّةً فلا فحص له، والدالّة تعيد الفحص عند الإرسال)
  if (!survey.allow_multiple_responses && !survey.allow_anonymous && user) {
    const { data: prior } = await sb
      .from("survey_responses")
      .select("id")
      .eq("survey_id", surveyId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (prior) {
      return (
        <StateScreen title="سبق أن شاركت" tone="success">
          وصلتنا إجابتك على هذا الاستبيان — شكرًا لك.
          {survey.show_results_to_participants ? (
            <>
              {" "}
              <Link className="font-bold underline" href={`/surveys/${surveyId}/results`}>عرض النتائج</Link>
            </>
          ) : null}
        </StateScreen>
      );
    }
  }

  // عدّ المشاهدة — من الخادم وحده (الدالّة سُحب تنفيذها من anon/authenticated)
  await sb.rpc("increment_survey_views", { survey_id: surveyId });

  // التحويل من مصدرٍ واحد يشاركه فعل المعاينة (getSurveyPreview) — فلا ينحرف العرضان
  const publicSurvey = toPublicSurvey(survey);
  const questions = toPublicQuestions(qRes.data ?? []);

  if (!questions.length) {
    return <StateScreen title="هذا الاستبيان غير مكتمل" tone="info">لا أسئلة فيه بعد — عد لاحقًا.</StateScreen>;
  }

  return <SurveyRespond survey={publicSurvey} questions={questions} />;
}
