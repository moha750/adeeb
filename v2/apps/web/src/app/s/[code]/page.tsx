import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { SurveyRespond } from "./SurveyRespond";
import { StateScreen } from "./StateScreen";
import { fmtStamp } from "@/lib/dates";
import { toPublicSurvey, toPublicQuestions } from "./public";
import { isSurveyCode, surveyPath } from "@/lib/surveys/code";
import { isAdeebMember } from "@/lib/memberRecord";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const sb = service();
  if (!sb || !isSurveyCode(code)) return { title: "نظام استبيانات أدِيب" };
  // **العنوانُ والوصفُ في معاينة الرابط لكلّ استبيانٍ منشور** (قرار المالك ٢٠٢٦-١٠-١٩): كان
  // يُحجب عن استبيان الأعضاء فيخرج رابطُه في القروب «نظام استبيانات أدِيب» بوصف النادي العامّ،
  // ورابطٌ لا يقول ما وراءه لا يُضغط. وعناوينُها ليست أسرارًا، والدخولُ نفسُه باقٍ بحارسه أدناه.
  // والمحجوبُ ما لم يُنشر بعد أو أُخفي: المسودّةُ والمؤرشفُ والمحذوف.
  const { data } = await sb
    .from("surveys")
    .select("title, description")
    .eq("code", code)
    .neq("status", "draft")
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { title: "نظام استبيانات أدِيب" };
  return {
    title: data.title,
    description: data.description?.trim() || "شارك برأيك في استبيان نادي أدِيب.",
  };
}

export default async function PublicSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isSurveyCode(code)) notFound();

  const sb = service();
  if (!sb) {
    return <StateScreen kind="error" title="الخدمة غير مهيّأة" text="تعذّر تجهيز الصفحة. حاول لاحقًا." />;
  }

  // الاستبيانُ بالرمز أوّلًا (فرقمُه الداخليّ مفتاحُ أسئلته)، ثمّ الأسئلةُ والجلسةُ معًا
  const [sRes, session] = await Promise.all([
    sb.from("surveys").select("*").eq("code", code).maybeSingle(),
    createClient(),
  ]);
  if (sRes.error) {
    return <StateScreen kind="error" title="تعذّر التحميل" text="حدث خطأ أثناء جلب الاستبيان. حاول مجدّدًا." />;
  }
  const survey = sRes.data;
  if (!survey) notFound();
  const surveyId: number = survey.id;

  const qRes = await sb.from("survey_questions").select("id, question_text, question_description, question_type, question_order, is_required, options").eq("survey_id", surveyId).order("question_order", { ascending: true });
  if (qRes.error) {
    return <StateScreen kind="error" title="تعذّر التحميل" text="حدث خطأ أثناء جلب الاستبيان. حاول مجدّدًا." />;
  }

  const { data: { user } } = await session.auth.getUser();
  // مكوّنٌ **خادميّ** غيرُ متزامن: يجري مرّةً لكلّ طلبٍ ولا يُعاد رسمُه، فلا معنى لقاعدة
  // نقاء الرسم هنا (لا خطّافات ولا حالة). والساعةُ لازمةٌ لنافذة الاستبيان الزمنيّة.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const closedMsg = survey.closed_message ?? null;

  // ١) الحالة: النشط وحده يستقبل — والأرشفة/الحذف عَلَمان يُبقيان الحالة فيُفحصان صراحةً (وسواه يقوله)
  if (survey.status !== "active" || survey.archived_at || survey.deleted_at) {
    return <StateScreen kind="closed" title="هذا الاستبيان غير متاح" text={closedMsg ?? "توقّف استقبال الإجابات على هذا الاستبيان."} />;
  }
  // ٢) النافذة الزمنيّة
  if (survey.start_date && new Date(survey.start_date).getTime() > now) {
    // بساعة النادي لا ساعة الخادم: `getHours` على Vercel كانت تقول الموعدَ بغرينتش
    return <StateScreen kind="soon" title="لم يبدأ بعد" text={`يبدأ استقبال الإجابات في ${fmtStamp(survey.start_date)}.`} />;
  }
  if (survey.end_date && new Date(survey.end_date).getTime() < now) {
    return <StateScreen kind="ended" title="انتهت مدّة الاستبيان" text={closedMsg ?? "انتهى استقبال الإجابات على هذا الاستبيان."} />;
  }
  // ٣) وصول الأعضاء — الدخول ثمّ العضويّة
  if (survey.access_type === "members_only") {
    if (!user) {
      return (
        <StateScreen
          kind="members"
          title="هذا الاستبيان لأعضاء أدِيب"
          text="ادخل من بوّابة أدِيب، وتعود إلى الاستبيان بعدها."
          action={{ href: `/login?next=${surveyPath(code)}`, label: "بوّابة أدِيب" }}
        />
      );
    }
    // **عضوُ أدِيب هنا هو عضوُ أدِيب في الموقع كلّه** (قرار المالك ٢٠٢٦-١٠-٢٠): انضمّ ولم يُوقَف، من
    // مصدره الواحد (`isAdeebMember` ← نظيرُ `is_adeeb_member` الذي تقيس به دالّةُ الإرسال). كان يُقاس هنا
    // بالحال `active` وحدها فيُردّ العضوُ غيرُ النشط، وهو عند الموقع عضو: للعضويّة معنيان.
    if (!(await isAdeebMember(user.id))) {
      return <StateScreen kind="inactive" title="لأعضاء أدِيب" text="هذا الاستبيان متاح لأعضاء أدِيب فقط." />;
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
      return <StateScreen kind="answered" title="سبق أن شاركت" text="وصلتنا إجابتك على هذا الاستبيان، شكرًا لك." />;
    }
  }

  // عدّ المشاهدة — من الخادم وحده (الدالّة سُحب تنفيذها من anon/authenticated)
  await sb.rpc("increment_survey_views", { survey_id: surveyId });

  // التحويل من مصدرٍ واحد يشاركه فعل المعاينة (getSurveyPreview) — فلا ينحرف العرضان
  const publicSurvey = toPublicSurvey(survey);
  const questions = toPublicQuestions(qRes.data ?? []);

  if (!questions.length) {
    return <StateScreen kind="empty" title="هذا الاستبيان غير مكتمل" text="لا أسئلة فيه بعد. عد لاحقًا." />;
  }

  return <SurveyRespond survey={publicSurvey} questions={questions} />;
}
