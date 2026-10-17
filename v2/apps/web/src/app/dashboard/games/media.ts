"use client";

import { createClient } from "@/lib/supabase/client";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { prepareGameMedia } from "./actions";

/**
 * **مقطعُ الكابينة: ملفٌّ يختاره المحرّر، وملفّان يُرفعان.**
 *
 * الصورةُ الثابتةُ (ما تعرضه الشاشةُ قبل أن يدور المقطع، وغلافُ كرت اللعبة) تُقتطع من المقطع نفسِه
 * في المتصفّح: إطارٌ عند ثلثه أو عند الثانية الأولى أيّهما أسبق، بعرضٍ أقصاه ٧٢٠. فلا يُطالَب المحرّرُ
 * بملفّين يجب أن يتطابقا، والقاعدةُ تشترطهما معًا. وسفاري لا يكتب WEBP من اللوح، فيُكتب JPEG هناك.
 */
const BUCKET = "games";

/** حدثٌ يُنتظر بمهلة: سفاري الآيفون قد لا يطلق `loadeddata` لمقطعٍ خارج الصفحة، فلا يعلق الزرُّ أبدًا. */
function within<T>(ms: number, p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, fail) => setTimeout(() => fail(new Error("timeout")), ms))]);
}

async function posterFrom(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;
    await within(8000, new Promise<void>((ok, fail) => {
      v.onloadedmetadata = () => ok();
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error("video"));
    }));
    await within(8000, new Promise<void>((ok, fail) => {
      v.onseeked = () => ok();
      v.onerror = () => fail(new Error("seek"));
      v.currentTime = Math.min(1, (v.duration || 0) / 3);
    }));
    const w = Math.min(720, v.videoWidth);
    const h = Math.round((v.videoHeight * w) / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")?.drawImage(v, 0, 0, w, h);
    const as = (type: string) => new Promise<Blob | null>((ok) => c.toBlob(ok, type, 0.85));
    const webp = await as("image/webp");
    const blob = webp?.type === "image/webp" ? webp : await as("image/jpeg");
    if (!blob) throw new Error("canvas");
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

export type MediaUpload = { ok: true; video: string; poster: string } | { ok: false; message: string };

export async function uploadGameMedia(slug: string, file: File): Promise<MediaUpload> {
  const why = checkFile(file, UPLOAD_RULES.gameVideo);
  if (why) return { ok: false, message: why };

  let poster: Blob;
  try {
    poster = await posterFrom(file);
  } catch {
    return { ok: false, message: "تعذّرت قراءةُ المقطع في هذا المتصفّح. جرّب MP4." };
  }

  const ticket = await prepareGameMedia(slug, file.type, file.size, poster.type, poster.size);
  if (!ticket.ok) return { ok: false, message: ticket.message };

  const store = createClient().storage.from(BUCKET);
  const [a, b] = await Promise.all([
    store.uploadToSignedUrl(ticket.video.path, ticket.video.token, file, { contentType: file.type }),
    store.uploadToSignedUrl(ticket.poster.path, ticket.poster.token, poster, { contentType: poster.type }),
  ]);
  if (a.error || b.error) return { ok: false, message: "تعذّر رفعُ المقطع. تحقّق من اتّصالك ثمّ أعِد المحاولة." };
  return { ok: true, video: ticket.video.url, poster: ticket.poster.url };
}
