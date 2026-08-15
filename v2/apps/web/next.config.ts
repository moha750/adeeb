import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ترجمة حزم الـmonorepo المكتوبة بـ TS/TSX ضمن بناء التطبيق
  transpilePackages: ["@adeeb/design-system", "@adeeb/core"],
  // جذر مساحة العمل = v2 (يمنع Next من التقاط جذر المستودع القديم بسبب lockfile قديم)
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // فتحُ التطوير لأجهزة الشبكة المحلّيّة (جوّالٌ حقيقيّ لقياس اللمس و375px).
  // بدونه تصل الأنماط ويُحجب الجافاسكربت، فتبقى الأزرار معطّلةً كما رُسمت أوّلًا.
  // العنوان يمنحه الراوتر وقد يتغيّر، فالنمطُ يغطّي الشبكة كلَّها والصريحُ ضمانٌ له.
  // ودرعُ Turnstile يحجب بدوره: مفتاحُه مقيَّدٌ بنطاقاتٍ مسموحة، فما لم يُضَف العنوانُ
  // إلى قائمة الودجة ردّ `110200` فلا يصدر رمزٌ فيرفض الدخولَ. وهو يقبل عنوانًا رقميًّا.
  allowedDevOrigins: ["192.168.8.19", "192.168.*.*", "10.*.*.*"],
  experimental: {
    // ذاكرة Turbopack الدائمة على القرص (.next/dev/cache) مفتوحةٌ افتراضيًّا في Next 16،
    // وأيُّ قتلٍ عنيفٍ للخادم أثناء كتابتها يترك ملفّات .meta تشير إلى .sst مفقودة،
    // فيسقط كلُّ تشغيلٍ تالٍ بـ«Failed to restore task data (corrupted database)» خلال دقيقة.
    // إطفاؤها يُلغي صنفَ العطل كلَّه: لا قاعدةَ على القرص تفسد. والكلفة إعادةُ ترجمةٍ باردة.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
