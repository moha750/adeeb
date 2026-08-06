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

import {
  affordable,
  CATALOG,
  GOAL,
  isComplete,
  type Mode,
  nextReward,
  num,
  pointsSerial,
  pointsStatusText,
  score,
  serialFor,
  statusText,
  type DemoMember,
} from "./demo";

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
  background: "rgb(39,64,96)", // --navy-700 #274060
  foreground: "rgb(255,255,255)",
  label: "rgb(188,207,224)", // --steel-200 #bccfe0
} as const;

/**
 * **مربّعُ الإشعار ليس لنا — وهذه خلاصةُ ثلاث تجاربَ على جهازٍ حقيقيّ** (٢٠٢٦-٠٨-٠٤):
 *
 * | جُرّب | النتيجة |
 * |---|---|
 * | حذفُ البطاقة وإعادتُها بأيقونةٍ تحمل العلامة | المربّع كما هو |
 * | قرصٌ أبيضُ يملأ ثلث الأيقونة | المربّع كما هو ⇒ **لا يقرأ `icon.png`** |
 * | خلفيّةٌ ذهبيّة | **البطاقةُ صارت ذهبيّةً والمربّعُ بقي كحليًّا** |
 *
 * فالثالثةُ تحسمها: المربّعُ **لقطةٌ تُؤخَذ مرّةً عند إضافة البطاقة ولا تُعاد**، ولونُه لونُ
 * خلفيّتها يومئذٍ. فلا صورةَ نضعها فيه ولا لونَ نغيّره بعد الإضافة.
 *
 * **وأثرٌ عمليّ في النظام الحقيقيّ**: مظهرُ البطاقة (لونًا وأيقونةً) يُستقرّ عليه **قبل**
 * التوزيع — فمن حملها بمظهرٍ قديمٍ بقي إشعارُه عليه، ولا يملك النظامُ إصلاحَه له.
 */

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

/* ── وجهُ بطاقة النقاط ──────────────────────────────────────────────────── */

/**
 * حاملُ إشعارِ بطاقة النقاط — نظيرُ `lastEvent` للأختام، وبقاعدته نفسِها: **حقلٌ واحدٌ
 * يحمل `changeMessage`** وإلّا صار الكسبُ الواحد إشعارين.
 *
 * **والرسالةُ تقول الرصيد لا الزيادة**: النسخةُ السابقة عند الجهاز لا عندنا، فلا نعرف
 * كم كان الفرق. و`%@` تُستبدَل بالقيمة الجديدة — وهي الرصيد.
 */
function lastPointsEvent(points: number, redemptions: number): { value: string; changeMessage: string } {
  const can = affordable(points);
  if (can.length > 0) {
    return {
      value: `رصيدك ${num(points)} — يكفي «${can[can.length - 1].title}»`,
      changeMessage: "رصيدك %@ 🎉 ويكفي مكافأةً من المتجر",
    };
  }
  if (points === 0 && redemptions > 0) {
    return { value: "صُرف رصيدك", changeMessage: "بالعافية!😋 رصيدك %@" };
  }
  return { value: `رصيدك ${num(points)}`, changeMessage: "كسبت نقاطًا جديدة🥳 رصيدك %@" };
}

/**
 * وجهُ بطاقة النقاط — نظيرُ `cardFace` وبقواعده: `primaryFields` **فارغةٌ عمدًا** (أبل
 * ترسمها فوق السطح فتحجب السُّلَّم)، والعدّادُ في الترويسة، والمتجرُ في الظهر.
 *
 * **والمتجرُ في الظهر لا الوجه**: أربعُ مكافآتٍ لا تسعها حقولُ الوجه، ولأنّ ما يهمّ في
 * الجيب رصيدٌ وأقربُ محطّة — والتفصيلُ لمن قلّبها.
 */
export function pointsFace(m: DemoMember): CardFace {
  const next = nextReward(m.points);
  const can = affordable(m.points);

  return {
    headerFields: [{ key: "balance", label: "النقاط", value: num(m.points) }],
    primaryFields: [],
    secondaryFields: [
      { key: "holder", label: "العضو", value: m.name },
      { key: "department", label: "القسم", value: m.department },
    ],
    auxiliaryFields: [
      { key: "committee", label: "اللجنة", value: m.committee },
      { key: "status", label: "الحالة", value: pointsStatusText(m.points) },
    ],
    backFields: [
      { key: "last", label: "آخر تحديث", ...lastPointsEvent(m.points, m.redemptions) },
      { key: "serial", label: "رقم البطاقة", value: pointsSerial(m) },
      {
        key: "how",
        label: "كيف تعمل البطاقة",
        value:
          `تكسب نقاطًا بكلّ مشاركةٍ مع أديب، وقيمتُها تتفاوت بتفاوت الجهد: ` +
          `الحضورُ دون التنظيم، والتنظيمُ دون التقديم. ` +
          `ثمّ تصرف رصيدك على ما تختاره من المتجر أدناه — ولا يعود العدّاد صفرًا إلّا بما تصرفه.`,
      },
      {
        key: "store",
        label: "متجر المكافآت",
        // سطرٌ لكلّ مكافأة، وعلامةٌ على ما يكفيه رصيدُه الآن
        value: CATALOG.map((r) => `${m.points >= r.cost ? "✓" : "·"} ${num(r.cost)} — ${r.title} · ${r.sponsor}`).join(
          "\n",
        ),
      },
      ...(next ? [{ key: "next", label: "المحطّة التالية", value: `${next.title} · ${num(next.cost)} نقطة` }] : []),
      ...(can.length > 0
        ? [{ key: "ready", label: "يكفي رصيدُك الآن", value: can.map((r) => r.title).join(" · ") }]
        : []),
      { key: "redemptions", label: "مكافآتٌ صرفتَها", value: num(m.redemptions) },
      {
        key: "notice",
        label: "تنبيه",
        value: "هذه بطاقةُ معاينةٍ ببياناتٍ وهميّة، صدرت لتجربة النظام قبل إقراره. لا تُخوّل حاملَها شيئًا.",
      },
    ],
    barcode: cardUrl(pointsSerial(m)),
  };
}

/** وجهُ البطاقة في النظام المطلوب — البابُ الواحد الذي يناديه الرسمُ والحزمةُ معًا. */
export const faceFor = (m: DemoMember, mode: Mode): CardFace => (mode === "points" ? pointsFace(m) : cardFace(m));

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
    /** أيُّ النظامين تُبنى له هذه الحزمة — والافتراضُ الأختام، فهو الأصل. */
    mode?: Mode;
  },
): Record<string, unknown> {
  const mode: Mode = ids.mode ?? "stamps";
  const face = faceFor(m, mode);
  const serial = serialFor(m, mode);
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    teamIdentifier: ids.teamIdentifier,
    serialNumber: serial,
    organizationName: "نادي أَدِيب",
    description: mode === "points" ? "بطاقة نقاط نادي أديب" : "بطاقة ولاء نادي أديب",
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
        altText: serial,
      },
    ],
  };
}
