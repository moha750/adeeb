import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { positionLabel, positionLine } from "@/lib/positionLabel";
import { getPublicProfile } from "./data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "صفحة عضو في نادي أديب";

const AR = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

/** اتّجاهُ الجملة من أوّل حرفٍ قويٍّ فيها، كما تفعل خوارزميّةُ الاتّجاه. */
function isRtl(s: string): boolean {
  for (const ch of s) {
    if (AR.test(ch)) return true;
    if (LATIN.test(ch)) return false;
  }
  return true;
}

/**
 * **سطرٌ عربيّ.** Satori يشكّل الحروفَ ويصلها صحيحةً، لكنّه لا يطبّق خوارزميّة الاتّجاه
 * ثنائيّ الاتّجاه: يرسم الكلماتِ بترتيب الذاكرة، فيخرج «الهنداس ناصر روان». و`direction:
 * rtl` لا تُصلحه (تحكم صندوقَ العرض لا ترتيبَ الكلمات).
 *
 * وقلبُ النصّ نصًّا يُصلح الترتيبَ ويكسر الالتفاف: السطرُ الثاني يحمل أوائلَ الكلمات.
 * فالعلاجُ **تخطيطٌ لا نصّ**: كلُّ كلمةٍ عنصرٌ في صفٍّ معكوسٍ يلتفّ، فيصحّ الاثنان معًا.
 */
function Line({ text, style }: { text: string; style: React.CSSProperties }) {
  const words = text.trim().split(/\s+/);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        flexDirection: isRtl(text) ? "row-reverse" : "row",
        columnGap: 16,
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span key={i}>{w}</span>
      ))}
    </div>
  );
}

/**
 * **صورةُ المشاركة** — ما يُرى في واتساب وإكس حين يَنشر صاحبُ الصفحة رابطَه.
 *
 * وهي شرطُ أن تُنشَر أصلًا: رابطٌ أعمى لا يُنقَر، ورابطٌ يحمل اسمَ صاحبه ومنصبَه
 * وأوسمتَه يُنقَر. ولذلك عُدّت من الصفحة لا زينةً بعدها.
 *
 * والعربيّةُ ههنا **رسمٌ لا نصّ**، فلا بدّ من ملفّ خطٍّ يُمرَّر: Satori لا يقرأ خطوط
 * النظام ولا يفكّ ضغط woff2. ولذلك نُسخ أصلُ Lyon Arabic (otf) إلى `assets/`.
 */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getPublicProfile(decodeURIComponent(slug));

  // `readFile` بمسارٍ حرفيٍّ من جذر المشروع لا `fetch(import.meta.url)`: الثاني يفشل على
  // وقت Node بـ«fetch failed» (روابط `file:` لا تُجلَب)، والأوّل يتتبّعه Next فيُحزَم مع الدالّة.
  const [bold, medium] = await Promise.all([
    readFile(join(process.cwd(), "assets/lyon-bold.otf")),
    readFile(join(process.cwd(), "assets/lyon-medium.otf")),
  ]);

  const name = me?.name ?? "نادي أديب";
  const p = me?.positions[0];
  const label = p
    ? positionLabel(
        { roleAr: p.roleAr, homeCommitteeId: p.homeCommitteeId, homeName: p.homeName },
        { committeeId: p.committeeId, unitName: p.unitName },
      )
    : null;
  const line = (label ? positionLine(label.title, label.scope) : null) ?? "عضوٌ في نادي أديب";
  const earned = (me?.badges ?? []).filter((b) => b.earnedAt).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          background: "linear-gradient(135deg, #45719a, #14243d)",
          color: "#fff",
          fontFamily: "Lyon",
          padding: 80,
        }}
      >
        <Line text={name} style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.35 }} />
        <Line text={line} style={{ fontSize: 38, fontWeight: 500, opacity: 0.92, lineHeight: 1.4 }} />

        {earned.length ? (
          <div style={{ display: "flex", flexDirection: "row-reverse", gap: 12, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {earned.map((b) => (
              <div
                key={b.key}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.16)",
                  border: "1px solid rgba(255,255,255,.28)",
                }}
              >
                <Line text={b.name} style={{ fontSize: 26, fontWeight: 500 }} />
              </div>
            ))}
          </div>
        ) : null}

        <Line text="نادي أديب" style={{ fontSize: 24, fontWeight: 500, opacity: 0.7, marginTop: 24 }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Lyon", data: bold, style: "normal", weight: 700 },
        { name: "Lyon", data: medium, style: "normal", weight: 500 },
      ],
    },
  );
}
