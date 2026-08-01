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

export type SponsorRow = {
  id: string;
  name: string;
  badge: string | null;
  logoUrl: string;
  linkUrl: string | null;
  description: string | null;
  order: number;
};

/** قائمة الرعاة مرتّبةً (order تصاعديًّا). */
export async function getSponsors(): Promise<{ sponsors: SponsorRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { sponsors: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("sponsors")
    .select("id, name, badge, logo_url, link_url, description, order")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { sponsors: [], error: error.message };

  const sponsors: SponsorRow[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    badge: s.badge ?? null,
    logoUrl: s.logo_url,
    linkUrl: s.link_url ?? null,
    description: s.description ?? null,
    order: s.order,
  }));
  return { sponsors, error: null };
}

export type SponsorEditData = {
  id: string;
  name: string;
  badge: string | null;
  logoUrl: string;
  linkUrl: string | null;
  description: string | null;
};

export async function getSponsorForEdit(id: string): Promise<{ sponsor: SponsorEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { sponsor: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("sponsors")
    .select("id, name, badge, logo_url, link_url, description")
    .eq("id", id)
    .maybeSingle();
  if (error) return { sponsor: null, error: error.message };
  if (!data) return { sponsor: null, error: null };

  return {
    sponsor: {
      id: data.id,
      name: data.name,
      badge: data.badge ?? null,
      logoUrl: data.logo_url,
      linkUrl: data.link_url ?? null,
      description: data.description ?? null,
    },
    error: null,
  };
}
