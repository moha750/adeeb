/**
 * **مفرداتُ الجغرافيا — مصدرٌ واحد، ولغةُ العرض خيارٌ لا حتم.**
 *
 * الموقعُ عربيّ، والقاعدةُ تخزّن ما يرسله مزوّد الموقع: رمزَ دولةٍ بمعيار آيزو (`SA`) واسمَ مدينةٍ
 * **إنجليزيًّا** (`Dammam`). فالفصلُ هنا بين ثلاثة: **الهويّة** المخزَّنة، و**التسمية** المعروضة،
 * و**اللغة** التي تُطلب بها. وكلُّ دالّةٍ تأخذ `locale` افتراضُه العربيّة — فيوم تُضاف الإنجليزيّة
 * إلى الموقع لا يُغيَّر إلّا ما يُمرَّر، لا ما يُخزَّن ولا ما يُكتب في الشاشات.
 *
 * **الدول: بلا جدولٍ أصلًا.** الاسمُ من `Intl.DisplayNames` (معيار ECMA-402): يتبع النظامَ في
 * التسمية وفي أيّ دولةٍ تتغيّر أو تُستجدّ، ويعطي أيّ لغةٍ تُطلب. والعلمُ بخوارزميّة يونيكود من
 * حرفَي الرمز. فدولةٌ لم تزُرنا قطّ تُعرَض صحيحةً بلا سطرٍ يُضاف.
 *
 * **المدن: لا معيارَ لها، فالجدولُ ضرورةٌ لا اختيار.** جرّبتُ المزوّد بـ`?lang=ar` فردّ الإنجليزيّة،
 * ولا `Intl` يترجم المدن، ولا سبيلَ إلى إعادة استنتاجها من الصفوف القديمة (نخزّن بصمةَ العنوان
 * لا العنوان). فالجدولُ أدناه هو الحلّ الوحيد، **وفيه ما هو أنفعُ من الترجمة**:
 *
 *   المزوّد يرسل للمدينة الواحدة أكثرَ من رسم: `Hofuf` و`Al Hufuf` · `Jubail` و`Al Jubayl`،
 *   فتُعدّ مدينتين ويُقسَم رقمُها ويختلّ الترتيب. والجدولُ يجمع الرسوم كلَّها في **هويّةٍ واحدة**
 *   (`id`)، فيصحّ العدّ قبل أن تصحّ اللغة.
 *
 * **وما ليس في الجدول لا ينكسر:** يُعرَض باسمه كما أرسله المزوّد، ويُعدّ بمفتاحه المُطبَّع. فالنقصُ
 * ظاهرٌ للعين (اسمٌ إنجليزيّ بين العربيّة) لا صامتٌ في الأرقام.
 */

export type GeoLocale = "ar" | "en";

const ISO2 = /^[A-Z]{2}$/;

/* ────────── الدول ────────── */

// مثيلٌ لكلّ لغةٍ (بناؤه ليس رخيصًا)، ويُحمى بـtry: بعض البيئات بلا DisplayNames.
const regionNames = new Map<GeoLocale, Intl.DisplayNames | null>();
const regionsOf = (locale: GeoLocale) => {
  if (!regionNames.has(locale)) {
    try {
      regionNames.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      regionNames.set(locale, null);
    }
  }
  return regionNames.get(locale) ?? null;
};

const norm = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

/** اسم الدولة من رمزها باللغة المطلوبة — وإن جهلناه رُدّ الرمز كما هو. */
export function countryName(code: string | null | undefined, locale: GeoLocale = "ar"): string {
  const c = norm(code);
  if (!ISO2.test(c)) return code ?? "";
  try {
    return regionsOf(locale)?.of(c) ?? c;
  } catch {
    return c;
  }
}

/** علم الدولة من رمزها (حرفا المؤشّر الإقليميّ) — و`null` لرمزٍ غير معياريّ. */
export function countryFlag(code: string | null | undefined): string | null {
  const c = norm(code);
  if (!ISO2.test(c)) return null;
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/**
 * عَلَمُ الدولة عنصرًا — **لا يُكتب العلم يدويًّا في شاشة**: هذا المكوّن يضمن صنف `.cflag` الذي
 * يُسنده إلى خطّ الأعلام المُستضاف، فيُرسَم على ويندوز أيضًا (النظام هناك بلا رسوم أعلام).
 * و`aria-hidden` لأنّ اسم الدولة مكتوبٌ بجانبه دائمًا، فالعلم زيادةُ تعرّفٍ لا معلومةٌ وحيدة.
 */
export function CountryFlag({ code }: { code: string | null | undefined }) {
  const f = countryFlag(code);
  return f ? <span className="cflag" aria-hidden>{f}</span> : null;
}

/* ────────── المدن ────────── */

/**
 * مفتاحُ المدينة: يُذيب اختلافَ الرسم اللاتينيّ ليبقى الجوهر — حركاتٌ لاتينيّة (`Al Qaţīf`)
 * وهمزاتٌ وشُرَطٌ وأداةُ التعريف (`Al`/`Ad`/`Ash`…) كلُّها تسقط. فيلتقي `Al Hufuf` و`Hufuf`،
 * ويبقى `Hofuf` مختلفًا (واوٌ لا ضمّة) فيُلحَق به في الجدول صراحةً.
 */
export function cityKey(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[`'’‘´]/g, "")
    .replace(/[-_.]+/g, " ")
    .replace(/^(al|el|ad|ash|as|at|az|an|ar)\s+/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type CityEntry = { ar: string; en: string };

/**
 * جدولُ المدن: المفتاحُ رسمٌ لاتينيٌّ مُطبَّع، والقيمةُ اسمٌ في اللغتين. وأكثرُ من مفتاحٍ قد يشير
 * إلى المدينة نفسها (اختلافُ رسم المزوّد) فيتّحد عدُّها. مرتَّبٌ: السعوديّة أوّلًا (تسعون في المئة
 * من الزيارات)، ثمّ الخليج والعربيّة، ثمّ ما يظهر من مدن العالم في السجلّ.
 */
const CITY_TABLE: Record<string, CityEntry> = {
  // ــ السعوديّة ــ
  dammam: { ar: "الدمّام", en: "Dammam" },
  riyadh: { ar: "الرياض", en: "Riyadh" },
  khobar: { ar: "الخُبر", en: "Khobar" },
  jeddah: { ar: "جدّة", en: "Jeddah" },
  jiddah: { ar: "جدّة", en: "Jeddah" },
  abqaiq: { ar: "بقيق", en: "Abqaiq" },
  buqayq: { ar: "بقيق", en: "Abqaiq" },
  hufuf: { ar: "الهُفوف", en: "Hofuf" },
  hofuf: { ar: "الهُفوف", en: "Hofuf" },
  mubarraz: { ar: "المُبرَّز", en: "Al Mubarraz" },
  qatif: { ar: "القطيف", en: "Qatif" },
  jubayl: { ar: "الجُبيل", en: "Jubail" },
  jubail: { ar: "الجُبيل", en: "Jubail" },
  dhahran: { ar: "الظهران", en: "Dhahran" },
  zahran: { ar: "الظهران", en: "Dhahran" },
  medina: { ar: "المدينة المنوّرة", en: "Medina" },
  madinah: { ar: "المدينة المنوّرة", en: "Medina" },
  mecca: { ar: "مكّة المكرّمة", en: "Mecca" },
  makkah: { ar: "مكّة المكرّمة", en: "Mecca" },
  "hafar al batin": { ar: "حفر الباطن", en: "Hafar Al-Batin" },
  "hafar albatin": { ar: "حفر الباطن", en: "Hafar Al-Batin" },
  yanbu: { ar: "ينبع", en: "Yanbu" },
  "yanbu al bahr": { ar: "ينبع", en: "Yanbu" },
  buraidah: { ar: "بُريدة", en: "Buraidah" },
  buraydah: { ar: "بُريدة", en: "Buraidah" },
  unaizah: { ar: "عُنيزة", en: "Unaizah" },
  hail: { ar: "حائل", en: "Hail" },
  taif: { ar: "الطائف", en: "Taif" },
  tabuk: { ar: "تبوك", en: "Tabuk" },
  sakakah: { ar: "سكاكا", en: "Sakakah" },
  saffaniyah: { ar: "الصفانية", en: "Safaniya" },
  sayhat: { ar: "سيهات", en: "Sayhat" },
  safwa: { ar: "صفوى", en: "Safwa" },
  "baqa ash sharqiyah": { ar: "بقعاء الشرقيّة", en: "Baqa" },
  ras: { ar: "الرس", en: "Ar Rass" },
  khafji: { ar: "الخفجي", en: "Khafji" },
  qaisumah: { ar: "القيصومة", en: "Qaisumah" },
  nairyah: { ar: "النعيريّة", en: "Nairyah" },
  abha: { ar: "أبها", en: "Abha" },
  khamis: { ar: "خميس مشيط", en: "Khamis Mushait" },
  "khamis mushait": { ar: "خميس مشيط", en: "Khamis Mushait" },
  najran: { ar: "نجران", en: "Najran" },
  jazan: { ar: "جازان", en: "Jazan" },
  jizan: { ar: "جازان", en: "Jazan" },
  bahah: { ar: "الباحة", en: "Al Bahah" },
  arar: { ar: "عرعر", en: "Arar" },
  "hawtat bani tamim": { ar: "حوطة بني تميم", en: "Hawtat Bani Tamim" },
  kharj: { ar: "الخرج", en: "Al Kharj" },
  zulfi: { ar: "الزلفي", en: "Az Zulfi" },
  "wadi ad dawasir": { ar: "وادي الدواسر", en: "Wadi ad-Dawasir" },
  // ــ الخليج والعربيّة ــ
  kuwait: { ar: "الكويت", en: "Kuwait City" },
  "kuwait city": { ar: "الكويت", en: "Kuwait City" },
  manama: { ar: "المنامة", en: "Manama" },
  doha: { ar: "الدوحة", en: "Doha" },
  dubai: { ar: "دبي", en: "Dubai" },
  "abu dhabi": { ar: "أبوظبي", en: "Abu Dhabi" },
  sharjah: { ar: "الشارقة", en: "Sharjah" },
  muscat: { ar: "مسقط", en: "Muscat" },
  cairo: { ar: "القاهرة", en: "Cairo" },
  alexandria: { ar: "الإسكندريّة", en: "Alexandria" },
  baghdad: { ar: "بغداد", en: "Baghdad" },
  karbala: { ar: "كربلاء", en: "Karbala" },
  basrah: { ar: "البصرة", en: "Basra" },
  basra: { ar: "البصرة", en: "Basra" },
  najaf: { ar: "النجف", en: "Najaf" },
  amman: { ar: "عمّان", en: "Amman" },
  beirut: { ar: "بيروت", en: "Beirut" },
  damascus: { ar: "دمشق", en: "Damascus" },
  sanaa: { ar: "صنعاء", en: "Sanaa" },
  khartoum: { ar: "الخرطوم", en: "Khartoum" },
  tunis: { ar: "تونس", en: "Tunis" },
  casablanca: { ar: "الدار البيضاء", en: "Casablanca" },
  rabat: { ar: "الرباط", en: "Rabat" },
  algiers: { ar: "الجزائر", en: "Algiers" },
  tripoli: { ar: "طرابلس", en: "Tripoli" },
  // ــ مدنٌ عالميّة تظهر في السجلّ ــ
  london: { ar: "لندن", en: "London" },
  paris: { ar: "باريس", en: "Paris" },
  amsterdam: { ar: "أمستردام", en: "Amsterdam" },
  frankfurt: { ar: "فرانكفورت", en: "Frankfurt" },
  warsaw: { ar: "وارسو", en: "Warsaw" },
  istanbul: { ar: "إسطنبول", en: "Istanbul" },
  singapore: { ar: "سنغافورة", en: "Singapore" },
  toronto: { ar: "تورونتو", en: "Toronto" },
  "new york city": { ar: "نيويورك", en: "New York" },
  "new york": { ar: "نيويورك", en: "New York" },
  "mountain view": { ar: "ماونتن فيو", en: "Mountain View" },
  "council bluffs": { ar: "كاونسل بلَفس", en: "Council Bluffs" },
  "monte vista": { ar: "مونتي فيستا", en: "Monte Vista" },
  "santa clara": { ar: "سانتا كلارا", en: "Santa Clara" },
  "san jose": { ar: "سان خوسيه", en: "San Jose" },
  "las vegas": { ar: "لاس فيغاس", en: "Las Vegas" },
  ashburn: { ar: "آشبيرن", en: "Ashburn" },
  gravelines: { ar: "غرافلين", en: "Gravelines" },
  dublin: { ar: "دبلن", en: "Dublin" },
  helsinki: { ar: "هلسنكي", en: "Helsinki" },
  stockholm: { ar: "ستوكهولم", en: "Stockholm" },
  moscow: { ar: "موسكو", en: "Moscow" },
  beijing: { ar: "بكين", en: "Beijing" },
  shanghai: { ar: "شنغهاي", en: "Shanghai" },
  tokyo: { ar: "طوكيو", en: "Tokyo" },
  seoul: { ar: "سول", en: "Seoul" },
  mumbai: { ar: "مومباي", en: "Mumbai" },
  delhi: { ar: "دلهي", en: "Delhi" },
  karachi: { ar: "كراتشي", en: "Karachi" },
  lahore: { ar: "لاهور", en: "Lahore" },
  dhaka: { ar: "دكا", en: "Dhaka" },
  manila: { ar: "مانيلا", en: "Manila" },
  jakarta: { ar: "جاكرتا", en: "Jakarta" },
};

/**
 * هويّةُ المدينة وتسميتُها: `id` يجمع رسومَ المزوّد المختلفة في واحد (فيصحّ الجمعُ والترتيب)،
 * و`ar`/`en` تسميتُها. وما ليس في الجدول يأخذ مفتاحَه هويّةً واسمَه الخام تسميةً في اللغتين.
 */
export function cityOf(raw: string | null | undefined): { id: string; ar: string; en: string } {
  const key = cityKey(raw);
  const hit = CITY_TABLE[key];
  if (hit) return { id: hit.en, ar: hit.ar, en: hit.en };
  const shown = (raw ?? "").trim();
  return { id: key || shown, ar: shown, en: shown };
}

/** اسم المدينة باللغة المطلوبة — والافتراضُ العربيّة لأنّ الموقع عربيّ. */
export function cityName(raw: string | null | undefined, locale: GeoLocale = "ar"): string {
  const c = cityOf(raw);
  return locale === "ar" ? c.ar : c.en;
}
