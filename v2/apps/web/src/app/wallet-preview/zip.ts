/**
 * كاتب ZIP أدنى — حزمة `.pkpass` أرشيفُ ZIP لا غير.
 *
 * **بلا ضغط (STORE) عمدًا**: ما في الحزمة صورُ PNG (مضغوطةٌ أصلًا فلا يُنقصها deflate
 * شيئًا) وملفّا JSON صغيران وتوقيع. فالضغطُ كلفةُ سطورٍ بلا مكسب.
 *
 * **وترتيبُ الملفّات لا يعني شيئًا لأبل** — المهمّ أن يوافق `manifest.json` بصمةَ كلّ
 * ملفّ، وأن يقع التوقيع على المانيفست نفسه.
 */

/* ── CRC-32 ─────────────────────────────────────────────────────────────── */

/** جدول CRC-32 (متعدّد الحدود المعكوس 0xEDB88320) — يُبنى مرّةً عند التحميل. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** بصمة CRC-32 — يشترطها ZIP لكلّ مُدخَل، ويشترطها PNG لكلّ كتلة. */
export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ── الأرشيف ────────────────────────────────────────────────────────────── */

export type ZipEntry = { name: string; data: Buffer };

/**
 * وقتُ التعديل بصيغة MS-DOS (كلمتان). **ثابتٌ لا لحظيّ**: أرشيفٌ يُبنى مرّتين من
 * المدخلات نفسها يخرج بايتًا ببايت — فيُقارَن ويُخزَّن مؤقّتًا بلا مفاجأة. (والوقت
 * الحقيقيّ للتوقيع مسجّلٌ في `signingTime` داخل التوقيع نفسه.)
 */
const DOS_TIME = 0x0000;
const DOS_DATE = 0x2821; // 2020-01-01

/** يبني أرشيف ZIP من مُدخلاته — مصدرٌ واحدٌ للترويستين المحلّيّة والمركزيّة. */
export function zip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // توقيع الترويسة المحلّيّة
    local.writeUInt16LE(20, 4); // أدنى إصدارٍ يفكّها
    local.writeUInt16LE(0, 6); // بلا أعلام (الأسماء ASCII فلا يلزم علم UTF-8)
    local.writeUInt16LE(0, 8); // الطريقة: تخزين
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18); // المضغوط = الأصل (تخزين)
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // بلا حقولٍ إضافيّة

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // صانعُه
    central.writeUInt16LE(20, 6); // أدنى إصدارٍ يفكّها
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(e.data.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // إضافيّ
    central.writeUInt16LE(0, 32); // تعليق
    central.writeUInt16LE(0, 34); // رقم القرص
    central.writeUInt16LE(0, 36); // سِمات داخليّة
    central.writeUInt32LE(0, 38); // سِمات خارجيّة
    central.writeUInt32LE(offset, 42); // موضعُ ترويستها المحلّيّة

    locals.push(local, name, e.data);
    centrals.push(central, name);
    offset += local.length + name.length + e.data.length;
  }

  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // رقم هذا القرص
  end.writeUInt16LE(0, 6); // القرص الذي فيه الفهرس
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16); // بداية الفهرس المركزيّ
  end.writeUInt16LE(0, 20); // بلا تعليق

  return Buffer.concat([...locals, cd, end]);
}
