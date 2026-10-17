"use client";

import { createClient } from "@/lib/supabase/client";
import { composeIrfanPreview, renderIrfanCard, type IrfanCard, type IrfanLook } from "./card";

/** رابطُ رفعٍ موقَّعٌ يصكّه الخادمُ لصورة رسالةٍ بعينها (`images/irfan/<رمز>.jpg`). */
export type IrfanUploadSlot = { path: string; token: string };

/** نتيجةُ التجهيز: نجحت، أو سقطت في خطوةٍ بعينها وبخطئها (يُسجَّل في `irfan_preview_failures`). */
export type IrfanPreviewResult = { ok: true } | { ok: false; step: "render" | "upload"; error: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const why = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 400);

/**
 * **يجهّز صورةَ المعاينة ويرفعها** — مصدرٌ واحدٌ لشاشة الكتابة (بعد الحفظ) وللغرفة (ترميمُ صورةٍ سقطت).
 *
 * - المحاولةُ الأولى من البطاقة الجاهزة إن أُعطيت (`ready`، ما في المعاينة الحيّة): لوحٌ واحدٌ خفيف.
 * - وإن لم تُعطَ أو سقطت رُسمت البطاقةُ من جديد، مرّتين بينهما مهلةٌ تكفي سفاري ليُفرغ ألواحه.
 * - الرفعُ يُعاد وحده إن سقط والصورةُ سليمة، فلا يُرسم ما رُسم.
 * ولا يرمي: الرسالةُ محفوظةٌ في كلّ حال، والنتيجةُ تقول أين سقط.
 */
export async function uploadIrfanPreview(
  card: IrfanCard, look: IrfanLook, slot: IrfanUploadSlot, ready?: Blob | null,
): Promise<IrfanPreviewResult> {
  let last: IrfanPreviewResult = { ok: false, step: "render", error: "لم تبدأ" };
  const delays = [0, 800, 2000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await wait(delays[i]);
    let blob: Blob;
    try {
      blob = await composeIrfanPreview(i === 0 && ready ? ready : await renderIrfanCard(card, look), look);
    } catch (e) {
      last = { ok: false, step: "render", error: why(e) };
      continue;
    }
    for (let u = 0; u < 2; u++) {
      try {
        const { error } = await createClient().storage.from("images")
          .uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
        if (!error) return { ok: true };
        last = { ok: false, step: "upload", error: why(error.message) };
      } catch (e) {
        last = { ok: false, step: "upload", error: why(e) };
      }
      await wait(600);
    }
  }
  return last;
}
