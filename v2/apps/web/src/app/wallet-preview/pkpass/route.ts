/**
 * مُخرِج الحزمة — `GET /wallet-preview/pkpass?member=m1` يردّ ملفّ `.pkpass` موقَّعًا،
 * يفتحه أيفون فيُضيف البطاقة إلى المحفظة.
 *
 * ثلاثُ خطواتٍ لا رابع لها:
 * 1. تُجمع ملفّات الحزمة (`pass.json` والصور).
 * 2. يُكتب `manifest.json` — بصمةُ SHA-1 لكلّ ملفّ (أبل تفرض SHA-1 هنا، وليست
 *    خيارَنا؛ فهي بصمةُ سلامةٍ داخل حزمةٍ **موقَّعة** بـSHA-256 لا حارسَ تشفير).
 * 3. يُوقَّع المانيفست توقيعًا منفصلًا (`cms.ts`)، ويُضغط الكلّ في ZIP.
 *
 * **وبلا شهادةٍ لا يُخرَج نصفُ ملفّ**: يردّ ٥٠٣ برسالةٍ تقول أيّ متغيّرٍ ينقص بالاسم —
 * فحزمةٌ غيرُ موقَّعة يرفضها الجهاز بصمتٍ ويضيع نصفُ يومٍ في تخمين السبب.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { signDetached } from "../cms";
import { memberById } from "../demo";
import { passJson } from "../pass";
import { brandIcon } from "../png";
import { zip, type ZipEntry } from "../zip";

// التوقيع والضغط يحتاجان `node:crypto` و`node:zlib` — لا تعمل على الحافة.
export const runtime = "nodejs";

/** متغيّرات البيئة الستّة، ووصفُ كلٍّ منها كما يُعرَض عند نقصانه. */
const ENV = {
  WALLET_PASS_TYPE_ID: "معرّف نوع البطاقة (pass.club.adeeb.…) من بوّابة أبل",
  WALLET_TEAM_ID: "معرّف الفريق (Team ID) — عشرة محارف",
  WALLET_PASS_CERT_PEM: "شهادة Pass Type ID بصيغة PEM",
  WALLET_PASS_KEY_PEM: "المفتاح الخاصّ للشهادة بصيغة PEM",
  WALLET_WWDR_PEM: "شهادة أبل الوسيطة WWDR (G4) بصيغة PEM",
} as const;

/**
 * يقرأ مفتاحًا/شهادةً من البيئة **ويردّ `\n` النصّيّة إلى أسطرٍ حقيقيّة**.
 *
 * PEM أسطرٌ متعدّدة، وأكثرُ من يلصقه في `.env.local` يلصقه سطرًا واحدًا فيه `\n` مكتوبةً
 * حرفين. وتنقيةُ المسافات في `pemToDer` لا تُزيلهما (الشرطةُ المائلة ليست فراغًا)، فتدخل
 * في base64 فيخرج DER مشوَّهًا — ورسالةُ الخطأ عندها تقول «الشهادة غير مقروءة» ولا تقول
 * لماذا. فالردُّ هنا مرّةً واحدة للثلاثة.
 */
const pem = (v: string): string => v.replace(/\\n/g, "\n");

export async function GET(req: Request): Promise<Response> {
  const missing = Object.keys(ENV).filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "لم تُضبَط شهادة المحفظة بعد، فلا يمكن توقيع البطاقة.",
        missing: missing.map((k) => ({ name: k, need: ENV[k as keyof typeof ENV] })),
        hint: "أنشئ Pass Type ID certificate من حساب مطوّر أبل، ثمّ ضع المتغيّرات في .env.local.",
      },
      { status: 503 },
    );
  }

  const member = memberById(new URL(req.url).searchParams.get("member") ?? "");

  const files: ZipEntry[] = [
    {
      name: "pass.json",
      data: Buffer.from(
        JSON.stringify(
          passJson(member, {
            passTypeIdentifier: process.env.WALLET_PASS_TYPE_ID!,
            teamIdentifier: process.env.WALLET_TEAM_ID!,
          }),
          null,
          2,
        ),
        "utf8",
      ),
    },
    // الأيقونة **إلزاميّة** في المواصفة، والمقاسان ٢٩ و٥٨ (نقطةٌ وضِعفها).
    { name: "icon.png", data: brandIcon(29) },
    { name: "icon@2x.png", data: brandIcon(58) },
  ];

  // شعارٌ **إن وُجد** — ضَعْ `public/brand/wallet/logo.png` (و`@2x`) فيُلتقط تلقائيًّا،
  // وإلّا فالبطاقة تكتفي بـ`logoText`. ولا نُسقط الحزمة لأجل زينة.
  for (const name of ["logo.png", "logo@2x.png"]) {
    try {
      files.push({ name, data: await readFile(join(process.cwd(), "public", "brand", "wallet", name)) });
    } catch {
      /* لا شعار — مقصودٌ لا عطب */
    }
  }

  const manifest = Object.fromEntries(
    files.map((f) => [f.name, createHash("sha1").update(f.data).digest("hex")]),
  );
  const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");

  let signature: Buffer;
  try {
    signature = signDetached(manifestBuf, {
      certPem: pem(process.env.WALLET_PASS_CERT_PEM!),
      keyPem: pem(process.env.WALLET_PASS_KEY_PEM!),
      keyPassphrase: process.env.WALLET_PASS_KEY_PASSPHRASE,
      wwdrPem: pem(process.env.WALLET_WWDR_PEM!),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر توقيع البطاقة." }, { status: 500 });
  }

  const archive = zip([...files, { name: "manifest.json", data: manifestBuf }, { name: "signature", data: signature }]);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${member.serial}.pkpass"`,
      // معاينةٌ ببياناتٍ متغيّرة — لا تُخزَّن في وسيطٍ ولا في المتصفّح.
      "Cache-Control": "no-store",
    },
  });
}
