import "server-only";
import { notificationsDb } from "@/lib/notifications/db";
import { irfanSeat } from "@/lib/irfan/seat";
import { irfanPreviewPath } from "@/lib/irfan/whatsapp";
import type { IrfanLook } from "@/lib/irfan/card";
import type { OversightData, OversightRow } from "./vocab";

/**
 * قراءاتُ **إشراف عِرفان** — بمفتاح الخدمة، لأنّ الصفحة ترى رسائلَ ليست لصاحبها، وسياسةُ القراءة
 * (`irfan_messages_read`) لا تفتح لأحدٍ إلّا رسائلَه. فالحارسُ هو `denyUnless("/dashboard/irfan/oversight")`
 * بقدرة `oversee_irfan` قبل النداء، ولا يُنادى هذا إلّا من صفحتها.
 *
 * والموسمُ المقروءُ هو المفتوحُ الآن، وإلّا فآخرُ موسمٍ أُغلق: الصفحةُ تبقى تقول ما كان بعد إغلاقه.
 */

type Msg = {
  id: number; created_at: string; read_at: string | null; sender_name: string; recipient_id: string;
  recipient_name: string; recipient_gender: string | null; role_name: string; unit_name: string | null;
  body: string; look: string; title: string | null; share_token: string;
};

const g = (x: string | null | undefined): "male" | "female" | null => (x === "female" || x === "male" ? x : null);

export async function getIrfanOversight(): Promise<OversightData> {
  const db = notificationsDb();
  const empty: OversightData = { season: null, leaders: 0, rows: [], error: null };
  if (!db) return { ...empty, error: "تعذّر الوصول إلى رسائل عِرفان." };

  const { data: seasons } = await db.from("irfan_seasons").select("id, title, opens_at, closes_at").order("opens_at", { ascending: false });
  const now = Date.now();
  const list = (seasons ?? []) as { id: number; title: string; opens_at: string; closes_at: string }[];
  const season = list.find((s) => Date.parse(s.opens_at) <= now && now < Date.parse(s.closes_at)) ?? list[0] ?? null;
  if (!season) return empty;

  const [msgs, roles, seats, kinds, files] = await Promise.all([
    db.from("irfan_messages")
      .select("id, created_at, read_at, sender_name, recipient_id, recipient_name, recipient_gender, role_name, unit_name, body, look, title, share_token")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false }),
    db.from("roles").select("role_name, role_name_ar"),
    db.from("user_roles").select("user_id, role_name").eq("is_active", true),
    db.from("roles").select("role_name").eq("membership_kind", "member").neq("role_name", "adeeb_admin"),
    db.storage.from("images").list("irfan", { limit: 1000 }),
  ]);
  if (msgs.error) return { ...empty, season: { title: season.title, closesAt: season.closes_at }, error: "تعذّر جلب رسائل عِرفان." };

  // القادةُ الآن: من يشغل مقعدًا حيًّا `membership_kind = 'member'` (حدُّ `irfan_leaders` نفسُه في القاعدة)
  const lead = new Set((kinds.data ?? []).map((r: { role_name: string }) => r.role_name));
  const leaders = new Set((seats.data ?? []).filter((s: { role_name: string }) => lead.has(s.role_name)).map((s: { user_id: string }) => s.user_id)).size;

  const roleAr = new Map((roles.data ?? []).map((r: { role_name: string; role_name_ar: string }) => [r.role_name, r.role_name_ar]));
  const uploaded = new Set((files.data ?? []).map((f) => `irfan/${f.name}`));
  const rows = (msgs.data ?? []) as Msg[];

  const ids = [...new Set(rows.map((r) => r.recipient_id))];
  const { data: faces } = ids.length ? await db.from("profiles").select("id, avatar_url").in("id", ids) : { data: [] };
  const face = new Map((faces ?? []).map((p: { id: string; avatar_url: string | null }) => [p.id, p.avatar_url]));

  const out: OversightRow[] = rows.map((r) => {
    const seat = irfanSeat(roleAr.get(r.role_name), r.unit_name, r.recipient_gender);
    const look: IrfanLook = r.look === "aurora" ? "aurora" : "letter";
    const path = irfanPreviewPath(r.share_token);
    const pictured = uploaded.has(path);
    return {
      id: r.id,
      at: r.created_at,
      from: r.sender_name,
      to: r.recipient_name,
      seat,
      toGender: g(r.recipient_gender),
      toAvatar: face.get(r.recipient_id) ?? null,
      title: r.title,
      look,
      card: { to: r.recipient_name, seat, from: r.sender_name, body: r.body, season: season.title, title: r.title },
      pictured,
      read: !!r.read_at,
      thumb: pictured ? db.storage.from("images").getPublicUrl(path).data.publicUrl : null,
    };
  });

  return { season: { title: season.title, closesAt: season.closes_at }, leaders, rows: out, error: null };
}
