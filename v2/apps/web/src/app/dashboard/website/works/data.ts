// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من ISO — للعمود «أُضيف». */
const fmtDate = (iso: string | null): string => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

export type WorkRow = {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  created: string;
};

/** قائمة الأعمال مرتّبةً كما تظهر في المعرض (order تصاعديًّا ثمّ الأحدث). */
export async function getWorks(): Promise<{ works: WorkRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { works: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("works")
    .select("id, title, category, image_url, link_url, order, created_at")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { works: [], error: error.message };

  const works: WorkRow[] = (data ?? []).map((w) => ({
    id: w.id,
    title: w.title,
    category: w.category ?? null,
    imageUrl: w.image_url,
    linkUrl: w.link_url ?? null,
    order: w.order,
    created: fmtDate(w.created_at),
  }));
  return { works, error: null };
}

export type WorkEditData = {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

export async function getWorkForEdit(id: string): Promise<{ work: WorkEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { work: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("works")
    .select("id, title, category, image_url, link_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return { work: null, error: error.message };
  if (!data) return { work: null, error: null };

  return {
    work: {
      id: data.id,
      title: data.title,
      category: data.category ?? null,
      imageUrl: data.image_url,
      linkUrl: data.link_url ?? null,
    },
    error: null,
  };
}
