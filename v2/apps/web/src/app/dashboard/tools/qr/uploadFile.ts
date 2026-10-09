"use client";

import { createClient } from "@/lib/supabase/client";
import { QR_FILE_BUCKET } from "@/lib/qrLinks";
import { prepareQrFile } from "@/lib/qrFile";
import { prepareQrFileUpload } from "./actions";

/**
 * **رفعُ ملفّ الباركود — مصدرٌ واحدٌ لبابين**: شاشةُ الإنشاء، ونافذةُ التعديل في الإعدادات.
 *
 * ثلاثُ خطوات: يُجهَّز في المتصفّح (الصورةُ تُصغَّر، والـPDF كما هو — `lib/qrFile`)، ثمّ يُطلب
 * رابطٌ موقَّعٌ يصكّه الخادمُ بعد حارس الغرفة، ثمّ يُرفع إلى الدلو مباشرةً. ولا يُكتب الصفُّ هنا:
 * المسارُ يُرَدّ لمن ناداه، فيُنشئ به باركودًا أو يبدّل به وجهة، والخادمُ يمحو الملفَّ إن رُدّ الفعل.
 */
export type QrFileUpload = { ok: true; path: string } | { ok: false; message: string };

export async function uploadQrFile(file: File): Promise<QrFileUpload> {
  let blob: Blob;
  try {
    blob = await prepareQrFile(file);
  } catch {
    return { ok: false, message: "تعذّرت قراءةُ الملف. اختر صورةً بصيغة JPG أو PNG أو WEBP، أو ملفّ PDF." };
  }

  const ticket = await prepareQrFileUpload(blob.type, blob.size);
  if (!ticket.ok || !ticket.path || !ticket.token) return { ok: false, message: ticket.message || "تعذّر تجهيز الرفع." };

  const { error } = await createClient()
    .storage.from(QR_FILE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: blob.type });
  if (error) return { ok: false, message: "تعذّر رفعُ الملف. تحقّق من اتّصالك ثمّ أعِد المحاولة." };

  return { ok: true, path: ticket.path };
}
