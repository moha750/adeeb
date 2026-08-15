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

/** عددُ الأعمدة المرسومة افتراضًا: عمودٌ بـ٣px وفجوةٌ بـ٢px يملآن نحو ٦٠٠px. */
export const DRAWN_BARS = 120;

/** ينزل بالقمم إلى عددٍ أقلّ بأخذ **أعلى قمّةٍ** في كلّ شريحة، فلا تُطمَس الذُّرى. */
export function downsample(peaks: number[], bars = DRAWN_BARS): number[] {
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
