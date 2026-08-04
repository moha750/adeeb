/**
 * وصفُ البطاقة — **مصدرٌ واحدٌ للمعاينة وللملفّ الموقَّع معًا**.
 *
 * `cardFace()` يبني حقول البطاقة مرّةً، فترسمها الصفحةُ في المتصفّح ويكتبها
 * `pkpass/route.ts` في `pass.json` — فما يراه المالك في المعاينة **هو** ما يصل جهازَه.
 * (نفسُ مبدأ `lib/qr.ts`: راسمٌ واحدٌ لا راسمان يفترقان يومًا.)
 *
 * **وسطحُ البطاقة صورةُ شريط (`strip.png`) لا لونٌ ولا حقول**: PassKit لا يعرف من
 * الألوان إلّا `backgroundColor` واحدًا مصمتًا، ولا يرسم شبكاتٍ بل حقولًا. فالشريط هو
 * **المنفَذ الوحيد** إلى سطحٍ يشبه هويّتنا، وفيه يُرسَم التدرّجُ وبؤرةُ الضوء والنقشُ
 * والأختامُ العشرة بعدد ما خُتم (انظر `png.ts`) — فتُقرأ البطاقة في المحفظة بطاقةَ
 * أختامٍ حقًّا لا سطرَ رقم. والعدّادُ حقلٌ في الترويسة فوقه (`٧ / ١٠`).
 * ولذلك `primaryFields` **فارغة عمدًا**: أبل ترسمها **فوق** الشريط، فتحجب ما فيه.
 */

import { GOAL, isComplete, num, score, statusText, type DemoMember } from "./demo";

/**
 * حقلٌ واحدٌ كما يعرّفه PassKit: مفتاحٌ وتسميةٌ وقيمة.
 *
 * **و`changeMessage` هو ما يُظهر الإشعار** — لا الدفعة. دفعتُنا صامتةٌ بطبعها (حمولةٌ
 * خاوية) ولا تُنبّه أحدًا؛ إنّما iOS هو الذي يقارن الحقلَ بنظيره في النسخة السابقة، فإن
 * تغيّرت قيمتُه **وكان عليه `changeMessage`** عرض إشعارًا بنصّه. و`%@` تُستبدَل بالقيمة
 * الجديدة.
 *
 * **وحقلٌ واحدٌ يحمله لا حقلان**: كلُّ حقلٍ يتغيّر ومعه رسالةٌ يُخرج إشعارًا مستقلًّا،
 * فيصير الختمُ الواحد إشعارين.
 */
export type PassField = { key: string; label?: string; value: string; changeMessage?: string };

/** وجهُ البطاقة وظهرُها — بلغة PassKit لا بلغتنا، فلا ترجمةَ بين الطبقتين. */
export type CardFace = {
  headerFields: PassField[];
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  backFields: PassField[];
  /** حمولةُ الباركود — الرابط الذي يُفتَح عند المسح. */
  barcode: string;
};

/**
 * وجهةُ الباركود — **صفحةُ المسح عند الباب**.
 *
 * هي التي تجعل الباركود عاملًا لا زينة: يمسحه مسؤولُ الحضور فتُفتَح له بطاقةُ العضو
 * بحالتها الراهنة وزرُّ ختمٍ واحد. فالختمُ يقع حيث يقع الحضور، لا في زرٍّ بحاسوب.
 *
 * **والنطاق مكتوبٌ صريحًا** لا مشتقٌّ من أصل الطلب: البطاقةُ تُبنى في الخادم وتُسحَب من
 * الجيب في مكانٍ آخر، فرمزٌ يحمل `localhost` لا يُمسَح.
 */
export const cardUrl = (serial: string): string => `https://adeeb.club/wallet-preview/card/${serial}`;

/* ألوان البطاقة من رموز الهوية لا من الذاكرة: كحليّ‑700 سطحًا، وفولاذيّ‑200 للتسميات. */
export const PASS_COLORS = {
  // ⚠️ **مؤقّت — تجربةُ تشخيصٍ تُردّ بعد الجواب.** ذهبيٌّ صارخ (`--warning-600`) مكان
  // الكحليّ: إن تحوّل مربّعُ الإشعار في الجهاز إلى ذهبيّ ثبت أنّه مشتقٌّ من
  // `backgroundColor` وحده — فيكون اللونُ هو المقبض الوحيد الذي نملكه فيه.
  // (والشريطُ سيُظهر خطَّ قصٍّ عند حافّتيه، إذ هو مرسومٌ ليذوب في الكحليّ — مقصودٌ ومؤقّت.)
  background: "rgb(184,122,12)", // --warning-600 #b87a0c
  foreground: "rgb(255,255,255)",
  label: "rgb(255,255,255)",
} as const;

/**
 * **حامِلُ الإشعار** — حقلٌ في ظهر البطاقة، قيمتُه **عبارةٌ** لا رقم، ورسالتُه تلفّها.
 *
 * ثلاثُ لحظاتٍ لا واحدة (بصياغة المالك ٢٠٢٦-٠٨-٠٤): ختمٌ، واكتمالٌ، وبدايةٌ بعد الاستلام —
 * إذ رسالةُ الصفر تأتي عقب الفرح، فلو كانت رسالةَ الختم نفسِها لَقُرئت تراجعًا.
 *
 * ### لماذا حقلٌ في الظهر لا الترويسة
 *
 * `%@` **لا تُحذَف**: جُرّبت رسالةٌ مجرّدةٌ منها على جهازٍ حقيقيّ، فلم يصمت الإشعار كما
 * توقّعنا بل جاء **بعبارة أبل العامّة** («تم تغيير بطاقة المتجر») — وهذا أسوأ من الصمت،
 * نصٌّ باردٌ يحلّ محلّ صياغة النادي ولا يُنبّه إلى الخطأ. فالحكم: **`%@` شرطُ اعتمادِ
 * النصّ لا شرطُ ظهوره**.
 *
 * وهي تُستبدَل بقيمة **الحقل الذي يحملها**. فما دامت على الترويسة (قيمتُها رقم) لزم
 * الرقمُ كلَّ رسالة — وسأل المالك: أفي الاكتمال والاستلام حاجةٌ إليه؟ لا.
 *
 * **فنُقلت إلى حقلٍ في الظهر قيمتُه جملة**، فصارت `%@` تُستبدَل بعبارةٍ لا برقم، وتحرّرت
 * الرسائلُ من عدٍّ لا معنى له فيها. والحقلُ ليس حيلةً: «آخر تحديث» سطرٌ نافعٌ في ظهر
 * البطاقة يقول لصاحبها ما آخرُ ما جرى فيها.
 *
 * **وواحدٌ يحمل الرسالة لا اثنان** — ولذلك نُزعت من الترويسة: كلُّ حقلٍ يتغيّر ومعه رسالةٌ
 * يُخرج إشعارًا مستقلًّا، فيصير الختمُ الواحد إشعارين.
 *
 * **والإيموجي نصٌّ كسائره** (UTF-8)، لا تشترط أبل فيه شيئًا.
 */
function lastEvent(stamps: number): { value: string; changeMessage: string } {
  if (isComplete(stamps)) {
    return { value: "مُكافأتك في انتظارك", changeMessage: "أكملت مُشاركاتك🥳 %@😎" };
  }
  if (stamps === 0) {
    return { value: "تم استلام المُكافأة", changeMessage: "بالعافية!😋 %@" };
  }
  // هنا وحدها يُذكَر الرقم — لأنّ الرسالة عنه
  return { value: `مُشاركاتك ${num(stamps)}`, changeMessage: "مبروك! حصدت مُشاركة جديدة🥳 %@" };
}

/** يبني وجهَ البطاقة من عضو — انظر رأس الملفّ. */
export function cardFace(m: DemoMember): CardFace {
  const done = isComplete(m.stamps);

  return {
    // **بلا `changeMessage`** — حاملُها حقلُ «آخر تحديث» في الظهر (انظر `lastEvent`).
    headerFields: [{ key: "stamps", label: "المشاركات", value: score(m.stamps) }],
    // فارغةٌ عمدًا — أبل ترسمها فوق شريط الأختام فتحجبه (انظر رأس الملفّ).
    primaryFields: [],
    secondaryFields: [
      { key: "holder", label: "العضو", value: m.name },
      { key: "department", label: "القسم", value: m.department },
    ],
    auxiliaryFields: [
      { key: "committee", label: "اللجنة", value: m.committee },
      { key: "status", label: "الحالة", value: statusText(m.stamps) },
    ],
    backFields: [
      // **حاملُ الإشعار** — أوّلُ الظهر لأنّه أحدثُ ما فيه (انظر `lastEvent`).
      { key: "last", label: "آخر تحديث", ...lastEvent(m.stamps) },
      { key: "serial", label: "رقم البطاقة", value: m.serial },
      {
        key: "how",
        label: "كيف تعمل البطاقة",
        value:
          `تُختَم بمشاركةٍ واحدة في كلّ فعاليّةٍ تحضرها مع أديب. ` +
          `فإذا بلغت ${num(GOAL)} مشاركاتٍ استحققتَ مكافأة الراعي، ` +
          `وبعد استلامها يعود العدّاد صفرًا وتبدأ بطاقةٌ جديدة.`,
      },
      ...(done
        ? [{ key: "ready", label: "مكافأتك جاهزة", value: "اعرض هذه البطاقة عند الراعي لتستلمها." }]
        : []),
      { key: "cycles", label: "بطاقاتٌ أكملتَها", value: num(m.cycles) },
      {
        key: "notice",
        label: "تنبيه",
        value: "هذه بطاقةُ معاينةٍ ببياناتٍ وهميّة، صدرت لتجربة النظام قبل إقراره. لا تُخوّل حاملَها شيئًا.",
      },
    ],
    barcode: cardUrl(m.serial),
  };
}

/**
 * `pass.json` كاملًا — يُكتب في الحزمة كما هو.
 *
 * `hasLogo` يقرّر شيئًا واحدًا: **`logoText`**. شعارُ أديب يحمل اسمَه مرسومًا، فكتابةُ
 * الاسم بجانبه تكرارٌ — فلا تُكتب إلّا حين يتعذّر جلبُ الصورة، فتبقى البطاقة معنونةً.
 *
 * **والحقلان اللذان يجعلان التحديث لحظيًّا** هما `webServiceURL` و`authenticationToken`:
 * الأوّل يقول للجهاز أين يسأل عن نسخةٍ جديدة، والثاني يُثبت أنّ السائل صاحبُ البطاقة.
 * بدونهما تبقى البطاقة لقطةً ساكنةً مهما دفعنا إليها — فالجهاز لا يعرف بابًا يطرقه.
 */
export function passJson(
  m: DemoMember,
  ids: {
    passTypeIdentifier: string;
    teamIdentifier: string;
    hasLogo: boolean;
    webServiceURL: string;
    authenticationToken: string;
  },
): Record<string, unknown> {
  const face = cardFace(m);
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: m.serial,
    organizationName: "نادي أَدِيب",
    description: "بطاقة ولاء نادي أديب",
    webServiceURL: ids.webServiceURL,
    authenticationToken: ids.authenticationToken,
    ...(ids.hasLogo ? {} : { logoText: "أَدِيب" }),
    backgroundColor: PASS_COLORS.background,
    foregroundColor: PASS_COLORS.foreground,
    labelColor: PASS_COLORS.label,
    // أبل تضع بريقًا افتراضيًّا فوق الشريط. وشريطُنا **سطحُ هويّةٍ مرسوم** (تدرّجٌ وبؤرةُ
    // ضوءٍ ونقش)، فبريقُها يقع فوق ضوئنا فيغسله ويكشف حافّةَ الشريط خطًّا لامعًا.
    suppressStripShine: true,
    // البطاقة عربيّة، وiOS يعكس تخطيطها تلقائيًّا حين تكون لغةُ الجهاز عربيّة.
    storeCard: {
      headerFields: face.headerFields,
      primaryFields: face.primaryFields,
      secondaryFields: face.secondaryFields,
      auxiliaryFields: face.auxiliaryFields,
      backFields: face.backFields,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: face.barcode,
        messageEncoding: "iso-8859-1",
        altText: m.serial,
      },
    ],
  };
}
