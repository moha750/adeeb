// يُستورَد من مكوّنات خادميّة وحدها (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { BoundaryRule } from "@/lib/deebo/persona";

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
  /** حدودُه أحكامًا مفردة (م١٠) — كلٌّ يُحرَّر ويُطفأ وحدَه. */
  rules: BoundaryRule[];
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
    .select("identity, tone, boundary_rules, prohibitions, unknown_answer, suggested_questions, shown_questions, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return { persona: null, error: error.message };
  if (!data) return { persona: null, error: "صفُّ طبع ديبو مفقودٌ من القاعدة." };

  return {
    persona: {
      identity: data.identity,
      tone: data.tone,
      rules: (data.boundary_rules ?? []) as BoundaryRule[],
      prohibitions: (data.prohibitions ?? []).join("\n"),
      unknownAnswer: data.unknown_answer,
      suggestedQuestions: (data.suggested_questions ?? []).join("\n"),
      shownQuestions: data.shown_questions,
      updatedAt: data.updated_at,
    },
    error: null,
  };
}

/** لقطةُ طبعٍ سابقة كما تُعرض في قائمة الرجعة. */
export type PersonaVersion = {
  id: number;
  at: string;
  byName: string | null;
  /** أوّلُ سطرٍ من نبرته: علامةٌ تُميّز نسخةً عن أختها بلا فتحها. */
  gist: string;
};

/**
 * تاريخُ الطبع — آخرُ اللقطات أوّلًا.
 *
 * **وغيابُ الجدول ليس عطبًا يُصرَخ به**: الترحيلُ (`deebo_09`) ينتظر إذنَ المالك، وحتى
 * يُطبَّق تعمل الشاشةُ كما كانت وتقول إنّ الرجعةَ لم تُفتَح بعد. فيُفرَّق بين «لا تاريخَ
 * بعد» و«الجدولُ غيرُ موجود»، ولا يُحجَب تحريرُ الطبع لأجل ميزةٍ مؤجّلة.
 */
export async function getPersonaHistory(): Promise<{
  versions: PersonaVersion[];
  ready: boolean;
}> {
  const sb = service();
  if (!sb) return { versions: [], ready: false };

  const { data, error } = await sb
    .from("deebo_persona_history")
    .select("id, at, changed_by, tone")
    .order("at", { ascending: false })
    .limit(20);
  if (error) return { versions: [], ready: false };

  const rows = (data ?? []) as Array<{ id: number; at: string; changed_by: string | null; tone: string }>;
  const ids = [...new Set(rows.map((r) => r.changed_by).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await sb.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (people ?? []) as Array<{ id: string; full_name: string | null }>) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }

  return {
    ready: true,
    versions: rows.map((r) => ({
      id: r.id,
      at: r.at,
      byName: r.changed_by ? names.get(r.changed_by) ?? null : null,
      gist: r.tone.split("\n")[0]?.trim().slice(0, 80) ?? "",
    })),
  };
}

/** لقطةٌ بعينها، كاملةً — لتُملأ بها الشاشةُ عند الرجعة. */
export async function getPersonaVersion(id: number): Promise<PersonaForm | null> {
  const sb = service();
  if (!sb) return null;

  const { data, error } = await sb
    .from("deebo_persona_history")
    .select("identity, tone, boundaries, boundary_rules, prohibitions, unknown_answer, suggested_questions, shown_questions, at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  /* **جسرُ اللقطات القديمة**: ما أُخذ قبل م١٠ يحمل نصًّا لا صفوفًا، فيُشقّ كما شُقّ
     في الترحيل — وإلّا رجعتَ إلى نسخةٍ بلا حدود. */
  const rules: BoundaryRule[] =
    ((data.boundary_rules ?? []) as BoundaryRule[]).length > 0
      ? (data.boundary_rules as BoundaryRule[])
      : String(data.boundaries ?? "")
          .split(/\n(?=- )/)
          .map((part) => part.replace(/^-\s*/, "").trim())
          .filter((body) => body.length >= 2)
          .map((body) => ({ title: "", body, enabled: true }));

  return {
    identity: data.identity,
    tone: data.tone,
    rules,
    prohibitions: (data.prohibitions ?? []).join("\n"),
    unknownAnswer: data.unknown_answer,
    suggestedQuestions: (data.suggested_questions ?? []).join("\n"),
    shownQuestions: data.shown_questions,
    updatedAt: data.at,
  };
}
