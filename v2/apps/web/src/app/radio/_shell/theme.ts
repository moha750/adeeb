/**
 * **وضعُ المحطّة: فاتحٌ أو داكن** — المصدرُ الواحد للمفتاح والقراءة والكتابة.
 *
 * ══ النطاق ══
 * الموقعُ فاتحٌ وحدَه (قرارُ المالك ٢٠٢٦-٠٨-٠١ في `tokens.css`)، والإذاعةُ وحدَها
 * تُبدَّل (أمرُ المالك ٢٠٢٦-١٠-٠٩). فالوسمُ على `html` لكنّ قواعدَه كلَّها محصورةٌ
 * في `.stn` وأخواتها: يبقى الوسمُ إن خرج الزائرُ إلى الموقع، ولا يمسّ فيه شيئًا.
 *
 * ══ ولمَ على `html` لا على جذر المحطّة ══
 * ما يُرسَم خارج الجذر يحتاجه أيضًا: شريطُ المشغّل ولوحُه الكامل وقائمةُ
 * المشاركة (بوّابةٌ إلى `body`)، وخلفيّةُ الصفحة التي تظهر عند ارتداد التمرير.
 *
 * ══ ثلاثةُ اختيارات، والافتراضيُّ الجهاز (أمرُ المالك ٢٠٢٦-١٠-٠٩) ══
 * نهاريٌّ وداكنٌ يُثبَّتان ويُحفظان، و«حسب الجهاز» لا يُحفَظ فيه شيء: يتبع تفضيلَ
 * النظام ويتبدّل معه. وهو حالُ كلِّ زائرٍ لم يختر.
 */

export type RadioTheme = "light" | "dark";
/** اختيارُ الزائر: وضعٌ مثبَّت، أو اتّباعُ الجهاز (لا شيءَ محفوظ) */
export type ThemeChoice = RadioTheme | "system";

export const THEME_KEY = "adeeb-radio-theme";
export const THEME_ATTR = "data-radio-theme";
/** الاختيارُ وسمٌ ثانٍ على `html`: منه تُضيء خانةُ المحدِّد قبل الترطيب، فلا تقفز. */
export const CHOICE_ATTR = "data-radio-theme-choice";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const EVENT = "adeeb-radio-theme";

/**
 * يجري قبل أوّل رسم (سكربتٌ في تخطيط القسم) فلا يومض الفاتحُ في وجه من اختار
 * الداكن. وهو نصٌّ لا دالّة لأنّه يُحقَن كما هو.
 */
export const THEME_BOOT =
  `try{var d=document.documentElement,c=localStorage.getItem('${THEME_KEY}'),t=c;` +
  `if(c!=='light'&&c!=='dark'){c='system';t=matchMedia('${DARK_QUERY}').matches?'dark':'light'}` +
  `d.setAttribute('${THEME_ATTR}',t);d.setAttribute('${CHOICE_ATTR}',c)}catch(e){}`;

function stored(): RadioTheme | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function resolved(): RadioTheme {
  return stored() ?? (matchMedia(DARK_QUERY).matches ? "dark" : "light");
}

/** يكتب الوسمَ المحسوب على الجذر — عند الدخول بتنقّلٍ داخليٍّ لا يجري فيه سكربتُ الإقلاع. */
export function applyTheme() {
  const d = document.documentElement;
  d.setAttribute(THEME_ATTR, resolved());
  d.setAttribute(CHOICE_ATTR, stored() ?? "system");
  window.dispatchEvent(new Event(EVENT));
}

/** «حسب الجهاز» يمحو المحفوظ، فيعود الوضعُ يتبع الجهازَ ويتبدّل معه. */
export function setChoice(c: ThemeChoice) {
  try {
    if (c === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, c);
  } catch {
    /* تخزينٌ محجوب: يتبدّل الوضعُ في الجلسة ولا يُحفَظ */
    const d = document.documentElement;
    d.setAttribute(THEME_ATTR, c === "system" ? (matchMedia(DARK_QUERY).matches ? "dark" : "light") : c);
    d.setAttribute(CHOICE_ATTR, c);
    window.dispatchEvent(new Event(EVENT));
    return;
  }
  applyTheme();
}

export function currentChoice(): ThemeChoice {
  const c = document.documentElement.getAttribute(CHOICE_ATTR);
  return c === "light" || c === "dark" ? c : "system";
}

/**
 * يشترك في كلّ ما يبدّل الوضع: المفتاحُ هنا، وتبدّلُ تفضيل الجهاز (ما لم يُحفَظ
 * اختيار)، وتبويبٌ آخر غيّره (`storage`).
 */
export function subscribeTheme(onChange: () => void) {
  const mq = matchMedia(DARK_QUERY);
  const follow = () => {
    if (!stored()) applyTheme();
  };
  const other = (e: StorageEvent) => {
    if (e.key === THEME_KEY) applyTheme();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", other);
  mq.addEventListener("change", follow);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", other);
    mq.removeEventListener("change", follow);
  };
}
