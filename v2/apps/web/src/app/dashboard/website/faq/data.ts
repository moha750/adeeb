// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

/** قائمة الأسئلة الشائعة مرتّبةً (order تصاعديًّا). */
export async function getFaqs(): Promise<{ faqs: FaqRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { faqs: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("faq")
    .select("id, question, answer, order")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { faqs: [], error: error.message };

  const faqs: FaqRow[] = (data ?? []).map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    order: f.order,
  }));
  return { faqs, error: null };
}

export type FaqEditData = {
  id: string;
  question: string;
  answer: string;
};

export async function getFaqForEdit(id: string): Promise<{ faq: FaqEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { faq: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("faq")
    .select("id, question, answer")
    .eq("id", id)
    .maybeSingle();
  if (error) return { faq: null, error: error.message };
  if (!data) return { faq: null, error: null };

  return { faq: { id: data.id, question: data.question, answer: data.answer }, error: null };
}
