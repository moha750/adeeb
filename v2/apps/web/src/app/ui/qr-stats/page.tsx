import { Container } from "@adeeb/design-system";

/**
 * معرضُ **صفحة إحصاء الباركود** — نافذتان حيّتان (جوّالٌ وعرضٌ واسع) على الشاشة نفسِها.
 *
 * علّتُه أنّ الغرفةَ خلف تسجيل الدخول، فكان الحكمُ على تخطيطها بالظنّ. وهذه الصفحةُ تجعل
 * القرارَ بالنظر: طولُ الوجهة، ومرتبةُ الأزرار، وازدحامُ تسميات المخطّط على ٣٩٠.
 */

export const metadata = { title: "إحصاء الباركود، معرض أديب" };

export default function QrStatsLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Stats</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">صفحةُ الباركود وإحصاؤه</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الشاشةُ نفسُها ببياناتٍ مصنوعةٍ تشبه الواقع: وجهةٌ طويلةٌ كروابط النماذج، وثلاثون
          يومًا فيها ذروةٌ وسكون، وأجهزةٌ متفاوتة. انظرها بالعرضين واحكم.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1720px] px-6">
        <div className="qdlab mt-12">
          <div className="qdlab-col" style={{ ["--qdlab-w" as string]: "1180px", ["--qdlab-h" as string]: "900px" }}>
            <div className="phdlab-tag good"><span className="dot" aria-hidden />العرض الواسع</div>
            <iframe className="qdlab-screen" src="/ui/qr-stats/screen" title="إحصاء الباركود على العرض الواسع" loading="lazy" />
          </div>
          <div className="qdlab-col" style={{ ["--qdlab-h" as string]: "900px" }}>
            <div className="phdlab-tag good"><span className="dot" aria-hidden />الجوّال ٣٩٠</div>
            <iframe className="qdlab-screen" src="/ui/qr-stats/screen" title="إحصاء الباركود على الجوّال" loading="lazy" />
          </div>
        </div>
      </div>
    </main>
  );
}
