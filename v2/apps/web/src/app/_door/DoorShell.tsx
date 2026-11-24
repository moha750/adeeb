import "@adeeb/design-system/ad.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { House } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
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
 * **على الهويّة الجديدة** (محمد ٢٠٢٦-١١-٢٣، خطوةً خطوة): أرضُ الصفحات العامّة لا الشبكةُ القديمة، والنموذجُ على ورقة الهويّة مقابلَ اللوح،
 * والشعارُ أعلى اللوح، ورأسُ الخطوة عنوانُ الهويّة (التحيّةُ تسميةٌ فوقه — كانت الكلمةَ الكبيرة الباهتة)، والطرقُ أزرارُها الكبيرة كتلةً
 * واحدة، والحقولُ والتنبيهاتُ («الملاحظة») قطعُها، و«ليس لك حساب؟» سطرُ الطريق الآخر. وحركةُ المرور حركتُها وحدها.
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
  // جملةُ الهويّة التي كانت في لوح الباب القديم (`AuthShell`)
  denied: { big: "بوّابةُ أدِيب", small: "من هنا يُدار نادي أدِيب." },
  // تكملةُ بابِ الحساب لمن جاء ليتطوّع (١١-٢٤): خطوتان بعد الحساب، ثمّ هو متطوّع
  volunteer: { big: "خطوتُك إلى التطوّع", small: "دقيقةٌ واحدة، وتصير من متطوّعي أدِيب." },
  // مهلةُ الحذف (١١-٢٤): البابُ مفتوحٌ حتى يومها
  leaving: { big: "ننتظر بقاءك", small: "حسابُك في مهلة الحذف، والبابُ مفتوحٌ حتى يومها." },
  // بابُ السجلّ (١١-٢٤): عضوٌ بلا سجلّ يُكمله مرّةً، ثمّ يدخل بوّابته
  record: { big: "سجلُّك في أدِيب", small: "دقيقتان، ثمّ إلى بوّابتك." },
};

/** `say`: قولُ اللوح لحالٍ بعينها داخل الباب (المتطوّعُ في بابه يعيد ترتيب رغباته، لا يخطو إلى التطوّع) */
export function DoorShell({ door, children, say }: { door: Door; children: ReactNode; say?: { big: string; small: string } }) {
  const side = say ?? SIDE[door];
  return (
    <div className="door">
      <aside className="door-side">
        <div className="door-side-say">
          {/* **الشعارُ أعلى اللوح** (محمد ٢٠٢٦-١١-٢٣): من يكتب بريدَه وكلمةَ مروره يطمئنّ أوّلًا أنّه في أدِيب — ولم يكن في الصفحة شعارٌ إلّا ما على صدرية ديبو.
              وهو رابطُ الرئيسية كشعار رأس الموقع */}
          <Link href="/" className="door-logo" aria-label="نادي أدِيب، الرئيسية">
            {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ متّجه */}
            <img src="/brand/logo-horizontal-white.svg" alt="" />
          </Link>
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
          <Link href="/" className="ad-btn ad-btn-line ad-btn-sm door-out">
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
