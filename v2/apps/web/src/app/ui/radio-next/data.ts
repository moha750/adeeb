/**
 * بياناتُ المعاينة — ساكنةٌ بأسماء الإذاعة الحقيقيّة كي تبقى المعاينةُ واحدةً عبر المعارض.
 *
 * والتواريخُ تفترق عمدًا: كرتُ البرنامج يقول «أسبوعيّ»، وثلاثةُ تواريخَ متطابقةٍ
 * تكذّبه في أوّل نظرة.
 */
export type DemoEpisode = {
  id: number;
  title: string;
  dateLabel: string;
  lengthLabel: string;
  seconds: number;
  summary: string;
};

export const DEMO_SHOW = {
  title: "منعطف",
  tagline: "حوارٌ عن منعطفات الحياة",
  hostName: "نورة سامي",
  description:
    "برنامجٌ أسبوعيٌّ عن مسارات ومنعطفات الحياة، نجلس فيه مع من غيّر طريقَه فنسأله عن اللحظة التي التفت فيها.",
};

export const DEMO_STATION = {
  name: "إذاعة أَدِيب",
  tagline: "حيثُ يَصيرُ الصوتُ أثرًا",
  description: "الذراعُ الصوتيّ لنادي أَدِيب، مساحةٌ نحوّل فيها ما يُكتب إلى ما يُسمَع.",
};

export const DEMO_EPISODES: DemoEpisode[] = [
  {
    id: 3, title: "أسطورة الشغف", dateLabel: "27 أغسطس", lengthLabel: "20:28", seconds: 1228,
    summary: "«اعمل ما تحبّ» نصيحةٌ جميلة، لكن متى تحوّلت إلى معيارٍ يقيس فشلنا ونجاحنا؟",
  },
  {
    id: 2, title: "من الحلم إلى الواقع", dateLabel: "20 أغسطس", lengthLabel: "21:27", seconds: 1287,
    summary: "الحلمُ وحده لا يكفي، فبين الحلم والواقع طريقٌ طويلٌ من العمل والتعلّم والتجربة.",
  },
  {
    id: 1, title: "من أنا فعلًا؟", dateLabel: "13 أغسطس", lengthLabel: "11:36", seconds: 696,
    summary: "سؤالٌ يبدو بسيطًا، لكنه من أصعب ما يواجهه الإنسان في حياته.",
  },
];

/** حلقةُ الصفحة الثالثة. المشغّلُ الداخليُّ مربوطٌ بها لا بما يُذاع. */
export const PAGE_EPISODE_ID = 1;

export const DEMO_CHAPTERS = [
  { at: 0, title: "سؤالٌ لا يُجاب بجملة" },
  { at: 128, title: "أين تختبئ الموهبة؟" },
  { at: 438, title: "فطرةٌ أم اكتشاف؟" },
];

/**
 * ذُرى الموجة — مولَّدةٌ بمولّدٍ خطّيٍّ مبذور، فتُرسَم نفسَها في كلّ تحميل.
 * وهي **زينةٌ في المعاينة وحدَها**: في الإنتاج تُقرأ من `audio_music_peaks`.
 */
export function demoPeaks(count: number): number[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    let v: number;
    if (t < 0.06) v = 0.78 + rnd() * 0.2;                       // المقدّمة الموسيقيّة
    else if (t < 0.085) v = 0.14 + rnd() * 0.08;                // صمتٌ فاصل
    else {
      v = 0.46 + 0.2 * Math.sin(t * 23) + 0.1 * Math.sin(t * 61) + (rnd() - 0.5) * 0.5;
      if (rnd() > 0.93) v *= 0.3;                               // وقفات
      v = Math.max(0.1, Math.min(0.98, v));
    }
    out.push(v);
  }
  return out;
}

/** مدّةٌ مقروءة. ولها فرعُ ساعاتٍ: حلقةُ ٦٨ دقيقةً كانت تُكتب «68:23». */
export function fmt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
