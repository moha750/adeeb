// تحويل صفوف القاعدة إلى شكلَي صفحة الاستبيان (PublicSurvey/PublicQuestion) — **مصدرٌ واحد**
// تقرؤه الصفحةُ العلنيّة (page.tsx) والمعاينةُ (فعل getSurveyPreview) معًا، فلا ينحرف الاثنان
// يوم يُضاف حقلٌ أو نوعُ سؤال. دوالّ نقيّة بلا أثر (لا جلب ولا أسرار) فتصلح للخادم حيثما استُدعيت.
import type { Choice, QuestionType } from "@/app/dashboard/surveys/vocab";
import type { PublicSurvey, PublicQuestion } from "./SurveyRespond";

/** أعمدة الاستبيان اللازمة للعرض العلنيّ (مجموعة جزئيّة من صفّ surveys). */
type SurveyRow = {
  id: number;
  title: string;
  description: string | null;
  welcome_message: string | null;
  thank_you_message: string | null;
  show_progress_bar: boolean | null;
  show_results_to_participants: boolean | null;
  end_date: string | null;
};

/** أعمدة السؤال اللازمة للعرض العلنيّ (مجموعة جزئيّة من صفّ survey_questions). */
type QuestionRow = {
  id: number;
  question_text: string;
  question_description: string | null;
  question_type: string;
  is_required: boolean | null;
  options: unknown;
};

export function toPublicSurvey(s: SurveyRow): PublicSurvey {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? null,
    welcome: s.welcome_message ?? null,
    thankYou: s.thank_you_message ?? null,
    showProgress: !!s.show_progress_bar,
    showResults: !!s.show_results_to_participants,
    endDate: s.end_date ?? null,
  };
}

/** يتوقّع صفوفًا مرتّبة بـ question_order — المتقاعد لا يُعرض للمجيب (يعيش في التجميع التاريخيّ وحده). */
export function toPublicQuestions(rows: QuestionRow[]): PublicQuestion[] {
  return rows.map((q) => {
    const options = (q.options ?? null) as { choices?: Choice[]; scale?: { min: number; max: number } } | null;
    return {
      id: q.id,
      text: q.question_text,
      description: q.question_description ?? null,
      type: q.question_type as QuestionType,
      required: !!q.is_required,
      choices: (options?.choices ?? []).filter((c) => !c.retired).map((c) => ({ id: c.id, label: c.label })),
      scale: options?.scale ?? null,
    };
  });
}
