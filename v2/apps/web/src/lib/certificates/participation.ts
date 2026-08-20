/**
 * شهادة المشاركة التطوّعيّة — تُرسَم وتُنزَّل. عميليّ حصرًا (يمسّ DOM).
 *
 * **القالبُ مستعارٌ مؤقّتًا** (قرار المالك ١٥ أغسطس ٢٠٢٦): تُرسم اليومَ على ورقة شهادة الخبرة
 * نفسِها حتّى يُصمَّم قالبُ المشاركة. ولذلك الهندسةُ ههنا صورةٌ من `letter.ts` (مواضعُ مقيسةٌ
 * على تلك الورقة)، **ومتى وصل القالبُ الجديد قِيست مواضعُه وحدَها وبقي كلُّ ما عداه**.
 *
 * والفرقُ الحيّ بين الورقتين هو النصّ: تلك تشهد بخبرةٍ في منصب، وهذه تشهد بمشاركةٍ في عمل.
 */
import { downloadBlob } from "@/lib/download";
import { imagePdf, A4_LANDSCAPE } from "@/lib/pdf";
import { openPaper, sealPaper, fitSize, elongationRatio, WEIGHTS, type PageSize, type Piece } from "@/lib/paper";
import { stampQr } from "@/lib/qr";
import { certDate, verifyLine, verifyUrl, QR_CAPTION, type Gender } from "./text";

export type ParticipationCertificate = {
  /** الاسم كما رُسم يوم الإصدار (لقطةٌ من الصفّ لا من الملفّ). */
  name: string;
  serial?: string | null;
  /** عنوانُ الفرصة كما كان يوم الإصدار. */
  opportunity: string;
  gender: Gender;
  /** أوّلُ يومٍ في الفرصة (ISO). */
  from: string;
  /** آخرُ يومٍ فيها إن كانت أيّامًا، وإلّا فهو اليومُ نفسُه. */
  to: string;
};

const PAGE: PageSize = { w: 3508, h: 2480 };
const templateFor = (c: ParticipationCertificate): string =>
  `/brand/certificate-template-${c.gender === "female" ? "female" : "male"}.png`;

const CENTER = 1754;
const MAXW = 2620;
const INK = "#2a4968";

const LINES = {
  testimony: { y: 1166, size: 74, weight: WEIGHTS.bold, min: 48 },
  name: { y: 1350, size: 115, weight: WEIGHTS.bold, min: 70 },
  period: { y: 1566, size: 66, weight: WEIGHTS.body, min: 48 },
} as const;

const VERIFY = { y: 1772, size: 30, color: "rgba(42,73,104,.62)" } as const;
const QR = { x: 400, y: 1930, size: 300, caption: { y: 2288, size: 26 } } as const;

/** سطرُ الشهادة: العملُ لا المنصب. */
const testimony = (c: ParticipationCertificate): string =>
  `تشهد عائلة أديب بمشاركة ${c.opportunity}`;

/** سطرُ المدّة: يومٌ واحدٌ يُقال يومًا، والأيّامُ تُقال فترة. */
const period = (c: ParticipationCertificate): string =>
  c.to && c.to !== c.from
    ? `مشاركةٌ تطوّعيّةٌ خلال الفترة من ${certDate(c.from)} إلى ${certDate(c.to)}`
    : `مشاركةٌ تطوّعيّةٌ في ${certDate(c.from)}`;

export async function renderParticipation(
  c: ParticipationCertificate,
  type: "image/png" | "image/jpeg" = "image/png",
): Promise<Blob> {
  const ctx = await openPaper(templateFor(c), PAGE);

  const rows: [string, keyof typeof LINES][] = [
    [testimony(c), "testimony"],
    [c.name.trim(), "name"],
    [period(c), "period"],
  ];

  const pieces: Piece[] = rows.map(([text, key]) => {
    const l = LINES[key];
    return {
      text,
      x: CENTER,
      y: l.y,
      // كشهادة الخبرة سواءً (والعلّةُ مشروحةٌ هناك): الأضيقُ من التخمين والقياس — يحمي
      // السطرَ الطافح ولا يكبّر سطرًا صحّ اليوم بمقاسه.
      size: fitSize(
        ctx, text,
        Math.min(MAXW * 0.86, MAXW / elongationRatio(ctx, text, l.size, l.weight)),
        l.size, l.weight, l.min,
      ),
      weight: l.weight,
      color: INK,
      anchor: "middle",
    };
  });

  const serial = c.serial?.trim();
  if (serial) {
    await stampQr(
      ctx,
      { text: verifyUrl(serial), size: QR.size, dots: { shape: "square", paint: { kind: "solid", color: INK } }, bg: "#ffffff" },
      QR.x,
      QR.y,
    );
    pieces.push(
      { text: verifyLine(serial), x: CENTER, y: VERIFY.y, size: VERIFY.size, weight: WEIGHTS.body, color: VERIFY.color, anchor: "middle" },
      { text: QR_CAPTION, x: QR.x + QR.size / 2, y: QR.caption.y, size: QR.caption.size, weight: WEIGHTS.body, color: VERIFY.color, anchor: "middle" },
    );
  }

  return await sealPaper(ctx, pieces, PAGE, type);
}

export async function downloadParticipation(c: ParticipationCertificate): Promise<void> {
  const blob = await renderParticipation(c);
  downloadBlob(blob, `شهادة مشاركة - ${c.name || "متطوّع"}.png`);
}

export async function downloadParticipationPdf(c: ParticipationCertificate): Promise<void> {
  const jpeg = await renderParticipation(c, "image/jpeg");
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  downloadBlob(imagePdf(bytes, { w: PAGE.w, h: PAGE.h }, A4_LANDSCAPE), `شهادة مشاركة - ${c.name || "متطوّع"}.pdf`);
}
