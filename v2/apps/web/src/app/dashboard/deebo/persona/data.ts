// يُستورَد من مكوّنات خادميّة وحدها (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/** طبعُ ديبو كما تعرضه الشاشةُ وتحفظه: قوائمُه أسطرٌ لا مصفوفاتٌ يكتبها الناظر. */
export type PersonaForm = {
  identity: string;
  tone: string;
  boundaries: string;
  /** سطرٌ لكلّ محظور. */
  prohibitions: string;
  unknownAnswer: string;
  /** سطرٌ لكلّ سؤال. */
  suggestedQuestions: string;
  shownQuestions: number;
  updatedAt: string | null;
};

export async function getPersona(): Promise<{ persona: PersonaForm | null; error: string | null }> {
  const sb = service();
  if (!sb) return { persona: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("deebo_persona")
    .select("identity, tone, boundaries, prohibitions, unknown_answer, suggested_questions, shown_questions, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return { persona: null, error: error.message };
  if (!data) return { persona: null, error: "صفُّ طبع ديبو مفقودٌ من القاعدة." };

  return {
    persona: {
      identity: data.identity,
      tone: data.tone,
      boundaries: data.boundaries,
      prohibitions: (data.prohibitions ?? []).join("\n"),
      unknownAnswer: data.unknown_answer,
      suggestedQuestions: (data.suggested_questions ?? []).join("\n"),
      shownQuestions: data.shown_questions,
      updatedAt: data.updated_at,
    },
    error: null,
  };
}
