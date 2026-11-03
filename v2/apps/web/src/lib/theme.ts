/**
 * **وضعُ الموقع** — فاتحٌ أو داكن — يُعلَن مرّةً واحدة على `<html data-theme>` فيتبعه كلُّ شيء:
 * الشريطُ الجانبيّ والعلويّ، والغرف، والنوافذ والقوائم المنبثقة، والصفحاتُ العامّة.
 * قرارُ محمد ٢٠٢٦-١٠-٣٠: «الدارك مود يكون على كلّ شيء، الشريط الجانبي، كلّ شيء بلا استثناء».
 * (كانت المعاينةُ الأولى تقلب الغرفةَ وحدها بسمةٍ عليها؛ فعُدل عنها إلى الجذر.)
 *
 * **لماذا سكربتٌ قبل الرسم لا حالةٌ في React:** الوضعُ يُقرَّر قبل أوّل إطار، وإلّا ومضت الصفحة
 * بيضاءَ ثمّ انقلبت. والسكربتُ في `app/layout.tsx` مع أخويه (`js` والأعلام)، و`<html>` يحمل
 * `suppressHydrationWarning` لهذا السبب نفسِه.
 *
 * **«حسب الجهاز» يُحلّ هنا لا في CSS:** فتبقى قيمُ الداكن كتلةً واحدة في `tokens.css` تحت
 * `[data-theme="dark"]`، لا نسختين (صريحةً، وتحت `prefers-color-scheme`) تفترقان عند أوّل تعديل.
 *
 * **والزرُّ لم يظهر للناس بعد:** يظهر حين يصير كلُّ ما في الموقع داكنًا سليمًا، فلا يرى أحدٌ صفحةً
 * نصفُها ليل. وحتّى ذلك لا يكتب أحدٌ التفضيل، فالموقعُ فاتحٌ للجميع. والاستثناءُ الوحيد معاينةُ
 * القالب الجديد (`/dashboard/ad/*?theme=dark`) — مؤقّتةٌ، تُحذف مع مختبرها.
 */

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

/** مفتاحُ التفضيل في `localStorage` — المصدرُ الوحيد لاسمه. */
export const THEME_KEY = "adeeb-theme";

export const isThemePref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

/** التفضيلُ المحفوظ، والفاتحُ إن لم يُحفظ شيء (أو حُجب التخزين). */
export function storedThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemePref(v) ? v : "light";
  } catch {
    return "light";
  }
}

/** يُنزل التفضيلَ على الجذر: «حسب الجهاز» يُحلّ هنا إلى فاتحٍ أو داكن. */
export function applyThemePref(pref: ThemePref): Theme {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const theme: Theme = dark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

/**
 * السكربتُ الذي يسبق الرسم — نسخةٌ نصّيّة من `storedThemePref` + `applyThemePref` (لا تُستورد
 * دالّةٌ في سكربتٍ مضمَّن). وإن تغيّر منطقُ إحداهما تغيّر هنا معه.
 * ومعه سطرُ المعاينة المؤقّت: `?theme=` يُقرأ في `/dashboard/ad` وحدها.
 */
export const THEME_SCRIPT =
  "try{var d=document.documentElement,q=matchMedia('(prefers-color-scheme: dark)'),p=null;" +
  "if(/^\\/dashboard\\/ad(\\/|$)/.test(location.pathname))p=new URLSearchParams(location.search).get('theme');" +
  `if(!p){try{p=localStorage.getItem('${THEME_KEY}')}catch(e){}}` +
  "if(p!=='dark'&&p!=='system')p='light';" +
  "var f=function(){d.setAttribute('data-theme',p==='dark'||(p==='system'&&q.matches)?'dark':'light')};" +
  "f();if(p==='system')q.addEventListener('change',f)}catch(e){}";
