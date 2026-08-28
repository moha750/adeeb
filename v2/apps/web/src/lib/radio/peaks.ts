/**
 * قممُ الموجة الصوتيّة — تُحسَب من الملفّ نفسِه، فالموجةُ تصف صوتًا حقيقيًّا
 * ولا تُزخرف بشكلٍ يُخترع.
 *
 * **والفكُّ يجري بترددٍ منخفضٍ عمدًا:** حلقةٌ من إحدى وعشرين دقيقة بترددها
 * الأصليّ (٤٤١٠٠ ستيريو) تصير نحو **٤٤٥ ميغابايت** في الذاكرة، وهو ما يُثقل
 * جهاز المستخدم بلا فائدة. و`decodeAudioData` **يعيد التردّد إلى تردّد السياق**،
 * فسياقٌ بـ٨٠٠٠ أحاديّ يهبط بها إلى نحو ٤٠ ميغابايت، ودقّتُها تكفي رسمَ قممٍ
 * عرضُ الواحدة منها بضعةُ بكسلات.
 */

/**
 * عددُ القمم **المخزونة**. أربعُمئة تكفي أعرضَ عرضٍ نرسمه، وحجمُها أقلُّ من
 * كيلوبايت. وهي غيرُ عدد الأعمدة **المرسومة**: تلك أقلُّ ويُنزَل إليها بـ`downsample`،
 * فأعمدةٌ غليظةٌ قليلة أوضحُ من شعيراتٍ كثيفة.
 */
export const PEAK_BUCKETS = 400;

/**
 * **خطوةُ العمود** ‏٥px: عمودٌ ‏٣px وفجوةٌ ‏٢px (وهي `gap` في `.radn-wave`).
 * وعددُ الأعمدة **يُشتقّ من عرض اللوحة** بها، ولا يُكتب رقمًا ثابتًا.
 *
 * **ولِمَ لا يبقى رقمًا:** كان ‏١٢٠ عمودًا لكلّ شاشة، وقِيست اللوحةُ في الإنتاج
 * (٢٠٢٦-٠٨-١٨) فوُجدت **‏285px** على جوّالٍ بـ375px و**‏1062px** على سطح المكتب:
 * مدًى يبلغ ‏٣٫٧ أضعاف. والفجواتُ لا تتنازل (‏١١٩ × ٢px = ٢٣٨px مهما ضاقت اللوحة)،
 * فلم يفضل للأعمدة على الجوّال إلّا ‏٤٧px — **‏0.39px للعمود**. وما دون البكسل
 * يرسمه المتصفّح بشفافيّةٍ جزئيّة، فبدت الموجةُ باهتةً ولم يُقرأ المسموعُ عن باقيه
 * (بلاغُ المالك من جهازه). وفي الطرف الآخر كان العمودُ **‏6.86px**: لوحٌ غليظٌ
 * يُبدّد سعةً موجودة. فالعلّةُ واحدةٌ في الطرفين: رقمٌ ثابتٌ يُشدّ على مدًى متغيّر.
 *
 * والمقاسُ اختِيرَ من `/ui/waveform` بأربعة مقترحاتٍ عُرضت جنبًا إلى جنب.
 */
export const BAR_W = 3;
export const BAR_GAP = 2;
export const BAR_STEP = BAR_W + BAR_GAP;

/**
 * أقلُّ عددٍ تبقى معه الموجةُ موجةً: دونه تصير مدرَّجَ أعمدةٍ لا صوتًا. ولوحةٌ
 * أضيقُ من ‏120px لا وجود لها اليوم، وهو حارسٌ لا حالة.
 */
const MIN_BARS = 24;

/**
 * عددُ الأعمدة المرسومة لعرضٍ **مقيسٍ** بالبكسل. ويُسقَف بالمخزون: فوق ‏٤٠٠ عمودٍ
 * لا قممَ جديدةً تُرسَم، إنّما تُكرَّر — فالسقفُ صدقٌ لا اقتصاد.
 */
export function barsForWidth(width: number): number {
  // ‏n عمودًا بينها ‏n-1 فجوة: ‏n × الخطوة ناقصَ فجوةٍ واحدة يجب ألّا يتجاوز العرض.
  const fit = Math.floor((width + BAR_GAP) / BAR_STEP);
  return Math.max(MIN_BARS, Math.min(PEAK_BUCKETS, fit));
}

/** ينزل بالقمم إلى عددٍ أقلّ بأخذ **أعلى قمّةٍ** في كلّ شريحة، فلا تُطمَس الذُّرى. */
export function downsample(peaks: number[], bars: number): number[] {
  if (peaks.length <= bars) return peaks;
  const per = peaks.length / bars;
  return Array.from({ length: bars }, (_, i) => {
    let max = 0;
    for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    return max;
  });
}

/** فكُّ ملفٍّ إلى عيّناتٍ أحاديّةِ القناة منخفضةِ التردّد. `null` إن تعذّر. */
async function decodeMono(source: File | string): Promise<{ data: Float32Array; duration: number } | null> {
  try {
    const bytes = typeof source === "string"
      ? await (await fetch(source)).arrayBuffer()
      : await source.arrayBuffer();

    // سياقٌ أحاديُّ القناة منخفضُ التردّد: `decodeAudioData` يعيد العيّنات إليه.
    const Ctx = window.OfflineAudioContext ?? window.webkitOfflineAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx(1, 1, 8000);
    const buffer = await ctx.decodeAudioData(bytes);
    return { data: buffer.getChannelData(0), duration: buffer.duration };
  } catch {
    return null;
  }
}

/**
 * يقسم العيّنات إلى دلاءٍ ويأخذ أعلى قمّةٍ في كلّ دلو، ثمّ يطبّع على أعلاها.
 *
 * والتطبيعُ **على أعلى قمّةٍ في الملفّ** لا على الصفر: الحديثُ المسموع أهدأُ من
 * الموسيقى بكثير، فلو تُرك خامًا لبدت الموجةُ خطًّا مسطّحًا.
 */
function bucketize(data: Float32Array): number[] {
  const per = Math.floor(data.length / PEAK_BUCKETS) || 1;
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < PEAK_BUCKETS; i++) {
    let peak = 0;
    const start = i * per;
    for (let j = 0; j < per; j++) {
      const v = Math.abs(data[start + j] ?? 0);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  return peaks.map((p) => Math.round((max > 0 ? p / max : 0) * 100));
}

/**
 * يردّ القممَ **أعدادًا من ٠ إلى ١٠٠** (كما تُخزَّن) ومعها مدّةُ الملفّ، أو
 * `null` إن تعذّر الفكّ (صيغةٌ لا يفكّها المتصفّح مثلًا) — وحينها يرتدّ المستدعي
 * إلى الشريط الزمنيّ ولا يتعطّل شيء.
 *
 * والمدّةُ تُؤخَذ من الفكّ نفسِه لا من قراءةٍ ثانية: فكٌّ واحدٌ يعطي الأمرين.
 */
export async function computePeaks(source: File | string): Promise<{ peaks: number[]; duration: number } | null> {
  const got = await decodeMono(source);
  if (!got) return null;
  return { peaks: bucketize(got.data), duration: got.duration };
}

/**
 * موجةُ **ما يُسمَع بالموسيقى** حين تكون الحلقةُ مسارين: تُحسَب من مجموعهما.
 *
 * ولا تُشتقّ من موجةِ الصوت وحدَها: المقدّمةُ موسيقى خالصة، فموجةُ الصوت صامتةٌ
 * فيها تمامًا وتكذب على العين. ولا يكفي أخذُ الأعلى من الموجتين: القمّةُ يحجبها
 * الأعلى، والجمعُ هو ما تسمعه الأذنُ فعلًا فهو ما تُرسَم منه.
 *
 * ويُفكّ الملفّان بترددٍ منخفض (٨٠٠٠ أحاديّ) فيكلّفان نحو أربعين ميغابايت لا
 * أربعمئة، ويُجمَعان عيّنةً بعيّنة — وهما متطابقان زمنيًّا لأنّهما تصديرتان من
 * تايم لاينٍ واحد (قِيس على الحلقة الثانية: الإزاحةُ صفرُ عيّنة).
 */
export async function computeMixedPeaks(
  voice: File | string, music: File | string,
): Promise<{ peaks: number[]; duration: number } | null> {
  const [v, m] = await Promise.all([decodeMono(voice), decodeMono(music)]);
  if (!v) return null;
  if (!m) return { peaks: bucketize(v.data), duration: v.duration };

  const n = Math.min(v.data.length, m.data.length);
  const sum = new Float32Array(n);
  for (let i = 0; i < n; i++) sum[i] = v.data[i] + m.data[i];
  return { peaks: bucketize(sum), duration: v.duration };
}

declare global {
  interface Window { webkitOfflineAudioContext?: typeof OfflineAudioContext }
}

/**
 * **الموجةُ تُسوَّى بأعلى ما فيها.**
 *
 * القممُ المخزونةُ مطلقةٌ لا نسبيّة، ومستوى التسجيل يختلف بين حلقةٍ وأخرى: قِيست
 * الحلقاتُ الثلاث في الإنتاج (٢٠٢٦-٠٨-٢٨) فكان متوسّطُ الأولى **٢٥** والثانية
 * **٦٨**. فتُرسَم الأولى خيطًا مسطَّحًا في ربع اللوحة وتُرسَم الثانية موجةً، وهما
 * مسجَّلتان في الغرفة نفسِها بالصوت نفسِه. والعينُ تقرأ الفرقَ عطلًا لا هدوءًا.
 *
 * **والتسويةُ في الرسم لا في البيانات**: القممُ المخزونةُ تبقى كما قِيست (فهي
 * وصفٌ صادقٌ للملفّ)، وإنّما يُنسَب المرسومُ إلى **المئينِ الخامس والتسعين** من
 * الحلقة نفسِها. والمئينُ لا الأقصى: قمّةٌ شاذّةٌ واحدة (طرقةٌ على المِيك) تكفي
 * لتسحق باقي الموجة لو قُسم عليها.
 *
 * وخالصةٌ فتُختبَر وحدَها.
 */
export function normalizePeaks(peaks: number[]): number[] {
  if (peaks.length === 0) return peaks;
  const sorted = [...peaks].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  // موجةٌ صامتةٌ أو مسوّاةٌ أصلًا: لا شيء يُقسَم عليه، فتُترَك كما هي
  if (p95 <= 0 || p95 >= 96) return peaks;
  const k = 100 / p95;
  return peaks.map((v) => Math.max(2, Math.min(100, Math.round(v * k))));
}
