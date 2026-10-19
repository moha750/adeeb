import type { ReactNode } from "react";
import Link from "next/link";
import { House } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { Ambient } from "@adeeb/design-system";
import { DeeboFace, type Door } from "./DeeboFace";
import { Head } from "./parts";

/**
 * **بابا الحساب · «القسمان»** (اعتمده المالك ٢٠٢٦-١٠-١٨ بعد مقارنته بـ«كلام ديبو» في المتصفّح).
 *
 * لوحُ الهويّة في جهة البدء: تدرّجُها ونقشُها **واحدٌ يغطّيه كلَّه** قائمًا (لا بلاطٌ مكرّر)،
 * وعنوانُ الباب، وديبو بطلًا يعيش الخطوة (`DeeboFace`) ويقول كلمتَه في فقاعةٍ فوق رأسه. وفي
 * جهة النهاية النموذجُ على أرضٍ بيضاء — أضيقُ من النصف اللوحُ (المالك): النموذجُ صاحبُ الصفحة.
 * ولا رأسَ للموقع فيه (جُرِّب فرفضه المالك: «سيّئٌ جدًّا»).
 * والبابان **لا يُعرفان بلونٍ فاتحٍ وآخرَ غامق** (المالك): بل بالعنوان وبوقفة ديبو.
 *
 * ومن هويّة الموقع: أرضُه (`--color-bg`)، وعنوانُ أقسامه «المذهّب» (عينٌ كبيرةٌ تتلاشى،
 * وعنوانٌ بتدرّج الهويّة على تظليلٍ كقلم التحديد — `LandingHeading`).
 *
 * وفي الشاشة الضيّقة يصير اللوحُ رأسًا قصيرًا — ديبو في جهة البدء والعنوانُ بجانبه — والنموذجُ
 * صفحةٌ بيضاء تعلوه بحافّةٍ مستديرة.
 */
const SIDE: Record<Door, { big: string; small: string }> = {
  // يقول ما هي الصفحة (المالك: «المفروض توضح أن هذه بوابة»)، بلا تعدادٍ لما فيها
  login: { big: "بوّابتُك إلى أدِيب", small: "ادخل إلى حسابك في نادي أدِيب." },
  signup: { big: "ابدأ حكايتك مع أدِيب", small: "احجز الفعاليّات، وتطوّع، وكن قريبًا من النادي." },
  forgot: { big: "لا تقلق، نستعيدها معًا", small: "رابطٌ إلى بريدك، وتعود إلى بوّابتك." },
  reset: { big: "خطوةٌ أخيرة وتعود", small: "كلمةٌ جديدة، ثمّ إلى بوّابتك." },
};

export function DoorShell({ door, children }: { door: Door; children: ReactNode }) {
  const side = SIDE[door];
  return (
    <div className="door amb-host">
      {/* أرضُ الموقع المشبّكة كأغلب صفحاته — من هويّته التي افتقدها المالك هنا */}
      <Ambient />
      <aside className="door-side">
        <div className="door-side-say">
          <p className="door-side-big">{side.big}</p>
          <p className="door-side-small">{side.small}</p>
        </div>
        <div className="door-hero" aria-hidden>
          <DeeboFace door={door} />
        </div>
      </aside>
      <main className="door-main">
        <div className="door-thread">
          {children}
          {/* العودةُ إلى الموقع (المالك): زرُّ الهويّة الصغير بإطاره، في الوسط */}
          <Link href="/" className="abtn abtn-sm abtn-ghost door-out">
            <House size={17} weight={ICON_WEIGHT} aria-hidden />
            العودة إلى الموقع
          </Link>
        </div>
      </main>
    </div>
  );
}

/** رأسُ الخطوة في صفحتَي الاستعادة. */
export function DoorHead({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return <Head sub={sub}>{title}</Head>;
}
