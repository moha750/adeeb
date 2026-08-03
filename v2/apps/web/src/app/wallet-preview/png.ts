/**
 * مرمِّز PNG أدنى — لأنّ حزمة `.pkpass` **ترفض** بلا `icon.png`، ولا رَاسِمَ صورٍ على
 * الخادم (لا `sharp` ولا canvas)، والأصولُ في `public/brand` متّجهةٌ (SVG) أو بمقاساتٍ
 * لا تصلح أيقونةً.
 *
 * فنكتب البكسلات بأيدينا ونضغطها بـ`zlib` المدمج: ثلاث كتلٍ لا غير (IHDR · IDAT · IEND)
 * بلون RGBA وبلا تشابك — أبسطُ PNG صحيحٍ ممكن.
 *
 * > **والمرسوم هنا مربّعُ علامةٍ لا شعار.** لا نخترع شكلًا لأديب من عندنا (نرسم بتدرّج
 * > الهوية وحده)؛ ومتى وُضع `public/brand/wallet/icon.png` وأخوه `@2x` استعملهما المولّد
 * > وأهمل هذا المرسوم — انظر `pkpass/route.ts`.
 */

import { deflateSync } from "node:zlib";
import { crc32 } from "./zip";

/** كتلة PNG: طول + وسم + بيانات + CRC (على الوسم والبيانات معًا). */
function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, tail]);
}

/** يبني ملفّ PNG من بكسلات RGBA خام (`w×h×4`). */
function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  // كلّ سطرٍ يُسبَق ببايت المرشِّح — صفرٌ يعني «بلا مرشِّح»، وهو أبسطُ ما يقبله المعيار.
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // ثماني بتّاتٍ للقناة
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // الضغط: deflate (الوحيد في المعيار)
  ihdr[11] = 0; // المرشِّح: الأساسيّ
  ihdr[12] = 0; // بلا تشابك

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // توقيع PNG
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── مربّع العلامة ──────────────────────────────────────────────────────── */

/** تدرّج الهوية المعتمَد: فولاذيّ‑400 ← كحليّ‑800 بزاوية 135° (`--grad-primary`). */
const FROM = [0x5e, 0x77, 0x9c] as const; // steel-400 #5e779c
const TO = [0x1e, 0x33, 0x50] as const; // navy-800 #1e3350

/**
 * أيقونةُ البطاقة: مربّعٌ بزوايا مدوّرة بتدرّج الهوية.
 *
 * **والحوافّ مُنعَّمة بالمعاينة الفائقة** (٤×٤ عيّنة للبكسل): الزاوية المدوّرة بلا تنعيمٍ
 * تُقرأ مُسنَّنةً في ٢٩ بكسلًا، وهي المقاس الذي يُعرض فيه.
 */
export function brandIcon(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // النسبة نفسها التي عليها أيقونات النظام في iOS تقريبًا
  const SS = 4; // عيّناتٌ في كلّ محور

  /** هل تقع النقطة داخل المستطيل المدوّر؟ */
  const inside = (x: number, y: number): boolean => {
    const cx = Math.min(Math.max(x, r), size - r);
    const cy = Math.min(Math.max(y, r), size - r);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          if (inside(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hits += 1;
        }
      }
      // موضعُ اللون على محور التدرّج (135° = القُطر من أعلى اليسار إلى أسفل اليمين)
      const t = Math.min(1, Math.max(0, (x + y) / (2 * (size - 1))));
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(FROM[0] + (TO[0] - FROM[0]) * t);
      rgba[i + 1] = Math.round(FROM[1] + (TO[1] - FROM[1]) * t);
      rgba[i + 2] = Math.round(FROM[2] + (TO[2] - FROM[2]) * t);
      rgba[i + 3] = Math.round((hits / (SS * SS)) * 255);
    }
  }

  return encodePng(size, size, rgba);
}
