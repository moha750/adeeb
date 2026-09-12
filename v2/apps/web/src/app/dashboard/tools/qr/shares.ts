import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { QrOwnerBrief } from "./oversight/data";

/**
 * **من يصلح شريكًا** — حاملو قدرة مولّد الباركود سوى السائل.
 *
 * وسؤالان لا سؤالٌ واحد: `qr_owner_candidates` دالّةُ **غرفة الإشراف** لنقل الملكيّة،
 * وأوّلُ شرطها `oversee_qr`. فلمّا نادتها نافذةُ المشاركة قرأ صاحبُ الباركود قائمةً
 * **فارغة** (رآه المالك ٢٠٢٦-٠٩-٠٦): مُنِع من السؤال فبدا أنّ «لا أحدَ متاح».
 *
 * وتوسيعُ دالّة الإشراف يفتح نقلَ الملكيّة لكلّ صاحب باركود، فالصوابُ دالّةٌ ثانيةٌ لها
 * شرطُها (`qr_share_candidates`، ترحيل م١٤). وحسابُ القدرة يبقى في القاعدة: نداءٌ لكلّ
 * اسمٍ من الشاشة عملٌ لا يُحتمَل، وسياسةُ القراءة لا تُخرج قدرةً.
 */
export async function getQrShareCandidates(): Promise<QrOwnerBrief[]> {
  const sb = await createClient();
  const { data } = await sb.rpc("qr_share_candidates");
  return ((data ?? []) as { id: string; full_name: string }[]).map((c) => ({ id: c.id, name: c.full_name }));
}

// (ومرشّحو نقل الملكيّة تقرؤهم غرفةُ الإشراف من `qr_owner_candidates` في `oversight/data`.)
