// يُستورَد من مكوّنات خادميّة وحدها (page.tsx) — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { asPriority, asStatus, type ContactPriority, type ContactStatus } from "@/lib/contact/vocab";

/** رسالةُ زائرٍ كما تُقرأ في اللوحة — صفٌّ من `contact_messages` بأسماء الواجهة. */
export type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  priority: ContactPriority;
  notes: string | null;
  replyMessage: string | null;
  repliedAt: string | null;
  /** اسمُ الرادّ — يُقرأ من `profiles` لأنّ `replied_by` يشير إلى `auth.users` لا إليها. */
  repliedBy: string | null;
  createdAt: string;
};

export type ContactData = { rows: ContactRow[]; error: string | null };

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/** صندوقُ رسائل الموقع كاملًا — الأحدث أوّلًا. الحراسةُ في الصفحة (`manage_contact`). */
export async function getContactMessages(): Promise<ContactData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { rows: [], error: KEY_HINT };

  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb
    .from("contact_messages")
    .select("id, name, email, subject, message, status, priority, notes, reply_message, replied_at, replied_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return { rows: [], error: error.message };

  type Raw = {
    id: string; name: string; email: string; subject: string | null; message: string;
    status: string | null; priority: string | null; notes: string | null;
    reply_message: string | null; replied_at: string | null; replied_by: string | null; created_at: string;
  };
  const raw = (data ?? []) as Raw[];

  // أسماءُ الرادّين في نداءٍ واحد — لا صفٌّ يجرّ نداءَه.
  const ids = [...new Set(raw.map((r) => r.replied_by).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await sb.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }

  return {
    rows: raw.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      subject: r.subject,
      message: r.message,
      status: asStatus(r.status),
      priority: asPriority(r.priority),
      notes: r.notes,
      replyMessage: r.reply_message,
      repliedAt: r.replied_at,
      repliedBy: r.replied_by ? names.get(r.replied_by) ?? null : null,
      createdAt: r.created_at,
    })),
    error: null,
  };
}
