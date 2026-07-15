import { createAdeebServerClient, toLatinDigits } from "@adeeb/core";
import { Accordion } from "@adeeb/design-system";

type Faq = { id: string; question: string; answer: string };

/** قسم حيّ: الأسئلة الشائعة (faq) كأكورديون. */
export async function FaqSection() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("faq")
    .select("id,question,answer")
    .order("order", { ascending: true })
    .returns<Faq[]>();

  if (error) {
    return <p className="text-danger">تعذّر جلب الأسئلة: {error.message}</p>;
  }
  if (!data || data.length === 0) return null;

  return (
    <Accordion
      items={data.map((f) => ({ q: toLatinDigits(f.question), a: toLatinDigits(f.answer) }))}
    />
  );
}
