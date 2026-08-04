/**
 * **تجربةُ «بطاقة الحدث»** — `GET /wallet-preview/ticket?member=m2`.
 *
 * سأل المالك: لِمَ بطاقاتُ البنوك مصمَّمةٌ وبطاقتُنا تشبه كلَّ بطاقات الولاء؟ والجواب أنّ
 * بطاقة البنك ليست `pkpass` أصلًا (بابُ Apple Pay آخر). لكن بقي في صيغتنا منفذٌ واحدٌ لم
 * يُجرَّب: نوعُ **`eventTicket`** يقبل `background.png` **تملأ البطاقة كلَّها** بدل شريطٍ
 * في وسطها — وهو أقربُ ما تصل إليه `pkpass` من «بطاقةٍ مصمَّمة».
 *
 * **وهذه نسخةٌ منفصلةٌ لا تمسّ بطاقةَ أحد:**
 * · **رقمٌ تسلسليٌّ خاصّ** (`…-TICKET`) — فتعيش في المحفظة **بجانب** البطاقة الحقيقيّة.
 * · **بلا `webServiceURL`** — فلا تسجّل نفسها ولا تُحدَّث ولا تُشعِر. لقطةٌ للنظر فقط.
 * · وبلا صفٍّ في القاعدة، إذ لا خدمةَ تسألها عنها.
 *
 * **وتُحذف بحذف هذا الملفّ وحده** إن لم يُعجب النوعُ المالك.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { missingEnv, pem } from "../build";
import { signDetached } from "../cms";
import { GOAL, memberById, num, score, statusText } from "../demo";
import { brandIcon, ticketBackground } from "../png";
import { zip, type ZipEntry } from "../zip";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const missing = missingEnv();
  if (missing.length > 0) return NextResponse.json({ error: "لم تُضبَط الشهادة.", missing }, { status: 503 });

  const m = memberById(new URL(req.url).searchParams.get("member") ?? "");

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: process.env.WALLET_PASS_TYPE_ID!,
    teamIdentifier: process.env.WALLET_TEAM_ID!,
    serialNumber: `${m.serial}-TICKET`,
    organizationName: "نادي أَدِيب",
    description: "تجربةُ تصميمٍ لبطاقة ولاء أديب",
    // الخلفيّةُ صورةٌ تملأ البطاقة، فاللونُ لا يُرى إلّا خلفها — ويبقى للاتّساق.
    backgroundColor: "rgb(39,64,96)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(188,207,224)",
    eventTicket: {
      headerFields: [{ key: "stamps", label: "المشاركات", value: score(m.stamps) }],
      // في `eventTicket` يُرسَم الحقلُ الرئيس فوق الخلفيّة — فيُترَك للاسم لا للرقم.
      primaryFields: [{ key: "holder", label: "العضو", value: m.name }],
      secondaryFields: [
        { key: "department", label: "القسم", value: m.department },
        { key: "committee", label: "اللجنة", value: m.committee },
      ],
      auxiliaryFields: [{ key: "status", label: "الحالة", value: statusText(m.stamps) }],
      backFields: [
        { key: "serial", label: "رقم البطاقة", value: `${m.serial}-TICKET` },
        {
          key: "why",
          label: "ما هذه البطاقة",
          value:
            `تجربةُ تصميمٍ لا غير: نوعُ «بطاقة حدث» يقبل خلفيّةً تملأ البطاقة، ` +
            `بخلاف «بطاقة المتجر» التي لا تقبل إلّا شريطًا في وسطها. ` +
            `وهي لا تتحدّث ولا تُشعِر — بطاقتُك الحقيقيّة هي الأخرى في محفظتك.`,
        },
        { key: "goal", label: "الهدف", value: `${num(GOAL)} مشاركات` },
      ],
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: `https://adeeb.club/wallet-preview/card/${m.serial}`,
        messageEncoding: "iso-8859-1",
        altText: m.serial,
      },
    ],
  };

  const files: ZipEntry[] = [
    { name: "pass.json", data: Buffer.from(JSON.stringify(pass, null, 2), "utf8") },
    { name: "icon.png", data: brandIcon(29) },
    { name: "icon@2x.png", data: brandIcon(58) },
    { name: "icon@3x.png", data: brandIcon(87) },
    // مقاسُ خلفيّة بطاقة الحدث: 180×220 نقطةً ومضاعفاها.
    { name: "background.png", data: ticketBackground(180, 220) },
    { name: "background@2x.png", data: ticketBackground(360, 440) },
    { name: "background@3x.png", data: ticketBackground(540, 660) },
    // والمصغَّرة تُرسَم **حادّةً** بجانب الحقل الرئيس — فيها تظهر العلامة بلا تمويه.
    { name: "thumbnail.png", data: brandIcon(90) },
    { name: "thumbnail@2x.png", data: brandIcon(180) },
  ];

  const manifest = Object.fromEntries(files.map((f) => [f.name, createHash("sha1").update(f.data).digest("hex")]));
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر التوقيع." }, { status: 500 });
  }

  const archive = zip([...files, { name: "manifest.json", data: manifestBuf }, { name: "signature", data: signature }]);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${m.serial}-TICKET.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}
