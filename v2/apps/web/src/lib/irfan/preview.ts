"use client";

import { createClient } from "@/lib/supabase/client";
import { renderIrfanPreview, type IrfanCard, type IrfanLook } from "./card";

/** رابطُ رفعٍ موقَّعٌ يصكّه الخادمُ لصورة رسالةٍ بعينها (`images/irfan/<رمز>.jpg`). */
export type IrfanUploadSlot = { path: string; token: string };

/**
 * **يرسم صورةَ المعاينة ويرفعها** — مصدرٌ واحدٌ لشاشة الكتابة (بعد الحفظ) وللغرفة (ترميمُ صورةٍ سقطت).
 * ومحاولتان لا واحدة: أوّلُ ما يُسقطها لوحٌ لم يُعطَ في سفاري (ذاكرةُ الألواح ممتلئة)، والثانيةُ بعد
 * لحظةٍ تجده قد فُرّغ. ويُرجع أنجح أم لا، ولا يرمي: الرسالةُ محفوظةٌ في الحالين.
 */
export async function uploadIrfanPreview(card: IrfanCard, look: IrfanLook, slot: IrfanUploadSlot): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const blob = await renderIrfanPreview(card, look);
      const { error } = await createClient().storage.from("images")
        .uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
      if (!error) return true;
    } catch { /* تُعاد مرّةً */ }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}
