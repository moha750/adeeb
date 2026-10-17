import "server-only";
import { createClient } from "@/lib/supabase/server";
import { irfanSeat } from "@/lib/irfan/seat";
import type { IrfanLook } from "@/lib/irfan/card";
import type { IrfanItem, IrfanRoomData, IrfanSeason, Recipient } from "./vocab";

/**
 * قراءاتُ «عِرفان» — **بجلسة صاحبها** (`createClient`) لا بمفتاح الخدمة: القاعدةُ تقرّر ما يرى
 * (`irfan_messages_read`: رسائلُه وحدها، مرسلًا أو مستلمًا)، فلا يُرشَّح هنا ما لا يُرى.
 */

type Row = {
  id: number; sender_id: string; recipient_id: string; sender_name: string; recipient_name: string;
  recipient_gender: string | null; role_name: string; unit_name: string | null; body: string; look: string;
  created_at: string; read_at: string | null;
  irfan_seasons: { title: string } | { title: string }[] | null;
};

const g = (x: string | null | undefined): "male" | "female" | null => (x === "female" || x === "male" ? x : null);
const COUNCIL: Record<string, string> = { administrative: "المجلس الإداري", executive: "المجلس التشغيلي" };

async function roleNames(sb: Awaited<ReturnType<typeof createClient>>): Promise<Map<string, string>> {
  const { data } = await sb.from("roles").select("role_name, role_name_ar");
  return new Map((data ?? []).map((r: { role_name: string; role_name_ar: string }) => [r.role_name, r.role_name_ar]));
}

export async function getOpenSeason(): Promise<IrfanSeason | null> {
  const sb = await createClient();
  const { data } = await sb.rpc("irfan_open_season");
  const s = Array.isArray(data) ? data[0] : null;
  return s ? { id: s.id, title: s.title, closesAt: s.closes_at } : null;
}

export async function getIrfanRoom(meId: string): Promise<IrfanRoomData> {
  const sb = await createClient();
  const [season, roles, msgs] = await Promise.all([
    getOpenSeason(),
    roleNames(sb),
    sb.from("irfan_messages")
      .select("id, sender_id, recipient_id, sender_name, recipient_name, recipient_gender, role_name, unit_name, body, look, created_at, read_at, irfan_seasons(title)")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const items: IrfanItem[] = ((msgs.data ?? []) as Row[]).map((r) => {
    const s = Array.isArray(r.irfan_seasons) ? r.irfan_seasons[0] : r.irfan_seasons;
    const dir: IrfanItem["dir"] = r.recipient_id === meId ? "in" : "out";
    return {
      id: r.id,
      dir,
      card: {
        to: r.recipient_name,
        seat: irfanSeat(roles.get(r.role_name), r.unit_name, r.recipient_gender),
        from: r.sender_name,
        body: r.body,
        season: s?.title ?? "",
      },
      look: (r.look === "aurora" ? "aurora" : "letter") as IrfanLook,
      at: r.created_at,
      unread: dir === "in" && !r.read_at,
    };
  });

  return { season, items, error: msgs.error ? "تعذّر جلب رسائل عِرفان." : null };
}

/**
 * أيشغل صاحبُ الجلسة مقعدَ قيادةٍ (`membership_kind = 'member'`)؟ هو وحده من يصله عِرفان، فبه تُقال
 * الغرفةُ «ما أرسلتَه وما وصلك» أو «ما أرسلتَه». والحدُّ نفسُه حدُّ `irfan_leaders` في القاعدة.
 */
export async function amILeader(meId: string): Promise<boolean> {
  const sb = await createClient();
  const [seats, kinds] = await Promise.all([
    sb.from("user_roles").select("role_name").eq("user_id", meId).eq("is_active", true),
    sb.from("roles").select("role_name").eq("membership_kind", "member").neq("role_name", "adeeb_admin"),
  ]);
  const lead = new Set((kinds.data ?? []).map((r: { role_name: string }) => r.role_name));
  return (seats.data ?? []).some((s: { role_name: string }) => lead.has(s.role_name));
}

/** من يستطيع صاحبُ الجلسة أن يكتب له الآن — ومن كتب له في الموسم يسقط من القائمة. */
export async function getRecipients(): Promise<{ list: Recipient[]; error: string | null }> {
  const sb = await createClient();
  const [roles, res] = await Promise.all([roleNames(sb), sb.rpc("irfan_recipients")]);
  if (res.error) return { list: [], error: "تعذّر جلب قادة أدِيب." };
  type L = { user_id: string; full_name: string; gender: string | null; avatar_url: string | null; role_name: string; unit_name: string | null; council_type: string | null; already_sent: boolean };
  const list = ((res.data ?? []) as L[])
    .filter((l) => !l.already_sent)
    .map((l) => ({
      id: l.user_id,
      name: l.full_name,
      gender: g(l.gender),
      seat: irfanSeat(roles.get(l.role_name), l.unit_name, l.gender),
      council: COUNCIL[l.council_type ?? ""] ?? "",
      avatar: l.avatar_url,
    }));
  return { list, error: null };
}
