import "server-only";
import { notificationsDb } from "@/lib/notifications/db";
import { irfanSeat } from "@/lib/irfan/seat";
import type { IrfanCard, IrfanLook } from "@/lib/irfan/card";

/**
 * بطاقةُ «عِرفان» برمزها — بمفتاح الخدمة، لأنّ الصفحة علنيّة (يقرؤها واتساب بلا جلسة). ولا يُقرأ إلّا
 * ما يُرسم في البطاقة نفسِها: الاسمان والمقعدُ والرسالةُ والموسم. لا رقمَ ولا معرّف.
 */
export type SharedIrfan = { id: number; card: IrfanCard; look: IrfanLook };

const TOKEN = /^[0-9a-f]{32}$/;

export async function getSharedIrfan(token: string): Promise<SharedIrfan | null> {
  if (!TOKEN.test(token)) return null;
  const db = notificationsDb();
  if (!db) return null;
  const { data } = await db
    .from("irfan_messages")
    .select("id, sender_name, recipient_name, recipient_gender, role_name, unit_name, body, look, irfan_seasons(title)")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) return null;
  const { data: role } = await db.from("roles").select("role_name_ar").eq("role_name", data.role_name).maybeSingle();
  const s = Array.isArray(data.irfan_seasons) ? data.irfan_seasons[0] : data.irfan_seasons;
  return {
    id: data.id,
    look: data.look === "aurora" ? "aurora" : "letter",
    card: {
      to: data.recipient_name,
      seat: irfanSeat(role?.role_name_ar, data.unit_name, data.recipient_gender),
      from: data.sender_name,
      body: data.body,
      season: (s as { title?: string } | null)?.title ?? "",
    },
  };
}
