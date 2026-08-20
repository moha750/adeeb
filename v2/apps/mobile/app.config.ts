import type { ExpoConfig } from "expo/config";

/**
 * إعدادُ تطبيق أديب للجوّال.
 *
 * ملاحظتان تشرحان قرارين قد يبدوان غريبين:
 *
 * ١) **الخطوط تُسمّى صراحةً بالوزن، لا بالعائلة + الوزن.** أسماءُ العائلات المحفورةُ داخل
 *    ملفّاتنا غيرُ متّسقة: `lyon-arabic-regular.otf` و`lyon-arabic-bold.otf` عائلتُهما
 *    «Lyon Arabic Display»، بينما الفاتحُ والمتوسّطُ والأسودُ كلٌّ منها عائلةٌ مستقلّةٌ باسمها
 *    («Lyon Arabic Display Light»…). ومثلُها Eras: أربعُ عائلاتٍ لا واحدة.
 *    فلو اتّكلنا على `fontWeight` لاختار النظامُ ما يجده ثمّ **زوّر الباقي** (faux bold) —
 *    وهو العطلُ نفسُه الموثَّق في رسّام الأوراق. فكلُّ وزنٍ هنا عائلةٌ باسمه الصريح.
 *
 *    ولا يُقرأ هذا الاسمُ نفسُه على المنصّتين: iOS يأخذه من داخل الملفّ (اسمُ PostScript)،
 *    وأندرويد يشتقّ منه اسمَ موردٍ صغيرًا مسبوقًا بـ`xml_`. والجدولُ الذي يترجم بينهما
 *    في `packages/theme-native/src/fonts.ts` — وهو الموضعُ الثاني والأخير، فأيُّ تعديلٍ
 *    في `FONTS` أدناه يُقابله تعديلٌ هناك.
 *
 * ٢) **العربيّةُ تُفرَض من الطبقة الأصيلة** عبر `expo-localization`، لا بـ`I18nManager` عند
 *    الإقلاع. فرضُها من جافاسكربت يستلزم إعادةَ تشغيلٍ في أوّل فتحةٍ يراها المستخدِمُ وميضًا.
 */

const DS = "../../packages/design-system/fonts";

/** كلُّ وزنٍ ملفٌّ واسم. الاسمُ هو اسمُ PostScript كي يقبله iOS كما هو. */
const FONTS: { name: string; file: string; weight: number }[] = [
  { name: "LyonArabicDisplay-Light", file: `${DS}/lyon-arabic-light.otf`, weight: 300 },
  { name: "LyonArabicDisplay-Regular", file: `${DS}/lyon-arabic-regular.otf`, weight: 400 },
  { name: "LyonArabicDisplay-Medium", file: `${DS}/lyon-arabic-medium.otf`, weight: 500 },
  { name: "LyonArabicDisplay-Bold", file: `${DS}/lyon-arabic-bold.otf`, weight: 700 },
  { name: "LyonArabicDisplay-Black", file: `${DS}/lyon-arabic-black.otf`, weight: 900 },
  { name: "ErasITC-Light", file: `${DS}/eras-light.ttf`, weight: 300 },
  { name: "ErasITC-Medium", file: `${DS}/eras-medium.ttf`, weight: 500 },
  { name: "ErasITC-Demi", file: `${DS}/eras-demi.ttf`, weight: 600 },
  { name: "ErasITC-Bold", file: `${DS}/eras-bold.ttf`, weight: 700 },
];

const config: ExpoConfig = {
  name: "أديب",
  slug: "adeeb",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "adeeb", // الروابطُ العميقة: adeeb://…  (تُضاف إلى REDIRECTS في scripts/auth-config.mjs)
  userInterfaceStyle: "light", // الموقعُ فاتحٌ وحدَه، والتطبيقُ مثلُه (tokens.css: color-scheme: light)
  // لا `newArchEnabled`: المعماريّةُ الجديدةُ هي الوحيدةُ في SDK 57، فسقط الخيارُ من النوع

  ios: {
    bundleIdentifier: "club.adeeb.app",
    // شرطُ متجر أبل: كلُّ تطبيقٍ يعرض دخولًا اجتماعيًّا يجب أن يعرض «الدخول بأبل» معه
    usesAppleSignIn: true,
    supportsTablet: false, // منتَجُ جوّالٍ بقياس 375px، لا شاشةٌ عريضة
    infoPlist: {
      // الإذاعةُ تُسمَع والشاشةُ مغلقة، ومعها أزرارُ شاشة القفل والسيّارة
      UIBackgroundModes: ["audio"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "club.adeeb.app",
    adaptiveIcon: {
      backgroundColor: "#274060", // navy-700 — لون العلامة الرسميّ
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-localization",
      {
        // العربيّةُ تُفرَض أصيلًا: لا وميضَ إعادةِ تشغيلٍ في أوّل إقلاع
        supportsRTL: true,
        forcesRTL: true,
      },
    ],
    [
      "expo-font",
      {
        ios: { fonts: FONTS.map((f) => f.file) },
        android: {
          fonts: FONTS.map((f) => ({
            fontFamily: f.name, // نفسُ اسم iOS حرفًا بحرف
            fontDefinitions: [{ path: f.file, weight: f.weight }],
          })),
        },
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: false, // نُشغّل ولا نسجّل
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#f5f7fa", // --color-bg
        image: "./assets/splash-icon.png",
        imageWidth: 180,
      },
    ],
  ],

  experiments: { typedRoutes: true },
};

export default config;
