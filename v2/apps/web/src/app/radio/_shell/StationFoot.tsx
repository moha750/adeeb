import Link from "next/link";
import { clubYear } from "@/lib/dates";
import { ThemePicker } from "./ThemePicker";

/**
 * **تذييلُ المحطّة** — الصيغةُ «ج» التي اختارها المالك من أربعٍ عُرضت
 * (٢٠٢٦-٠٩-٠٧): نقشُ المحطّة خلفيّةً، والشعارُ في طرفٍ وسطرا النادي والحقوق
 * في الطرف الآخر.
 *
 * ══ ولمَ سقطت الموجاتُ ══
 * سبقتها صيغةٌ منقولةٌ عن رسم المالك (‏SVG): أعمدةٌ في الطرفين تتدلّى وتقوم.
 * وعُرضت إلى جانب النقش فاختار النقش. فأصنافُ الأعمدة أُزيلت كلُّها ولم تُترَك
 * بلا مستدعٍ.
 *
 * ══ والنقشُ بالملفّ ذي الإطار المشدود ══
 * ‏`radio/pattern-bleed.svg` لا الأصل: الأصلُ يترك ٢٠٩ بكسلًا فارغةً على كلّ
 * جانبٍ داخل إطاره، فلا يغطّي اللوحَ عرضًا مهما كُبِّر.
 *
 * ══ والسنةُ بساعة الرياض ══
 * ‏`clubYear` لا `getFullYear()`: فيرسِل يعمل بالتوقيت العالميّ، فليلةَ رأس
 * السنة تكون الرياضُ في السنة الجديدة والخادمُ في القديمة ثلاثَ ساعات.
 *
 * ══ ومفتاحُ الوضع الداكن فوقه على الجوّال ══
 * على الحاسوب يسكن الشريطَ الجانبيّ، والجوّالُ لا شريطَ له. فيقف فوق التذييل لا
 * داخلَه: اللوحُ العنّابيُّ صيغةٌ مختارةٌ بنسبٍ محسوبة، وعنصرٌ ثالثٌ فيها يكسرها.
 */
export function StationFoot({ tagline }: { tagline: string | null }) {
  return (
    <>
      <div className="stc-theme-row">
        <ThemePicker />
      </div>
      <footer className="stc-foot">
        <div className="stc-foot-in">
          {tagline ? <p className="stc-foot-sign">{tagline}</p> : null}
          <div className="stc-foot-side">
            <p className="stc-foot-t">
              إذاعة أَدِيب أحدُ برامج <Link href="/">نادي أَدِيب</Link>
            </p>
            <p className="stc-foot-c">
              جميع الحقوق محفوظة لنادي أَدِيب <bdi dir="ltr">{clubYear()}</bdi>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
