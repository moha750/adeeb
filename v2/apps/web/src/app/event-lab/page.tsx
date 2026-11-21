import "@adeeb/design-system/ad.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";
import { LabRead } from "./LabRead";
import type { PublicActivity } from "../activities/data";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٥): **صفحةُ الفعاليّة بحالاتها** ببياناتٍ وهميّة — محمد: «اعمل أنشطة وهميّة قادمة أو منتهية لنرى ونقدّر».
 * لا يمسّ القاعدة: الفعاليّاتُ هنا كائناتٌ في الذاكرة، وقاعدةُ الموقع هي قاعدةُ الموقع الحيّ. ولا يُفتح في الإنتاج.
 */
export const metadata = { title: "مختبر صفحة الفعالية" };

const POSTER = "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/activities/1777924022789-ifbzte.jpg";
const POSTER_2 = "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/activities/1777783020067-fdm2wr.jpg";
const base: PublicActivity = {
  id: "00000000-0000-4000-8000-000000000001", name: "أثرٌ ومعرفةٌ في عوالم متعدّدة", type: "dialogue",
  description: "جلسةٌ حواريّة تفتح أبوابَ المعرفة على عوالم متعدّدة، مع ضيفةٍ تروي رحلتها من سؤالٍ إلى مسار، ومن الشغف إلى الإنجاز.\nالحضورُ مفتوحٌ لجميع فئات المجتمع.",
  location: "مدرج معمل كود", locationUrl: "https://maps.google.com", date: "2026-11-18", dateLabel: "18 نوفمبر 2026",
  timeLabel: "من 7 إلى 9 مساءً", startTime: "19:00:00", endTime: "21:00:00", cover: POSTER,
  splitByGender: false, unlimited: false, targetGender: null, totalSeats: 40, totalRemaining: 12,
  maleSeats: null, femaleSeats: null, maleRemaining: null, femaleRemaining: null, full: false, past: false, cancelled: false,
  organizer: "لجنة الفعاليات", certificate: true, closesLabel: "17 نوفمبر 2026 الساعة 11:59 مساءً", closed: false, booked: 28, attended: null,
  guests: [
    { name: "لمار محمد الحربي", honorific: null, role: "guest", gender: "female" },
    { name: "هياء حمد السبيعي", honorific: "أ.", role: "moderator", gender: "female" },
  ],
  coverage: null,
};

const LONG = "جلسةٌ حواريّة تفتح أبوابَ المعرفة على عوالم متعدّدة، مع ضيفةٍ تروي رحلتها من سؤالٍ إلى مسار، ومن الشغف إلى الإنجاز.\nنبدأ بالسؤال الأوّل: كيف يصير الفضولُ طريقًا؟ ثمّ نمشي معها في التجربة والاكتشاف، وما تعلّمته من البدايات المتعثّرة، وكيف تحوّلت الفكرةُ إلى واقعٍ يُرى.\nوفي الختام مساحةٌ مفتوحةٌ للأسئلة، يحاور فيها الحضورُ الضيفةَ عن عالم الأبحاث وصناعة الفرص.\nالحضورُ مفتوحٌ لجميع فئات المجتمع، والمقاعدُ محدودة.";

const CASES: { key: string; label: string; a: PublicActivity; demo?: "guest" | "booked" }[] = [
  { key: "open", label: "قادمة: مقاعد مشتركة", a: base },
  { key: "guest", label: "قادمة: زائرٌ بلا حساب", a: base, demo: "guest" },
  { key: "booked", label: "قادمة: حجزتَ فيها", a: base, demo: "booked" },
  { key: "nocover", label: "بلا ملصق", a: { ...base, cover: null } },
  { key: "long", label: "وصفٌ طويل", a: { ...base, description: LONG } },
  { key: "short", label: "وصفٌ بسطر", a: { ...base, description: "لقاءٌ مفتوحٌ مع ضيفةٍ تروي رحلتها." } },
  { key: "split", label: "قادمة: مقاعد للجنسين", a: { ...base, type: "workshop", name: "احتراف الفوتوغراف", cover: POSTER_2, splitByGender: true, maleSeats: 20, femaleSeats: 20, maleRemaining: 3, femaleRemaining: 0, totalRemaining: 3, booked: 37, certificate: false, guests: [{ name: "محمد إسماعيل المطر", honorific: null, role: "trainer", gender: "male", avatar: "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/avatars/8dd48fe4-d01f-4fa9-90bc-1bcaf154fe22-1785819138210.webp", slug: "محمد-إسماعيل-المطر" }, { name: "نورة يوسف الصالح", honorific: "أ.", role: "host", gender: "female" }] } },
  { key: "women", label: "قادمة: للنساء", a: { ...base, type: "workshop", targetGender: "female", totalSeats: 25, totalRemaining: 9, booked: 16, organizer: null } },
  { key: "full", label: "مكتملة", a: { ...base, totalRemaining: 0, full: true, booked: 40 } },
  { key: "closed", label: "أُغلق التسجيل", a: { ...base, closed: true, closesLabel: "14 نوفمبر 2026 الساعة 11:59 مساءً" } },
  { key: "bare", label: "بلا ملصق ولا وصف", a: { ...base, cover: null, description: null, unlimited: true, totalSeats: null, totalRemaining: null, booked: 5, guests: [], certificate: false, closesLabel: null, organizer: null, location: null, locationUrl: null } },
  { key: "past", label: "منتهية", a: { ...base, past: true, date: "2026-05-06", dateLabel: "6 مايو 2026", booked: 40, attended: 26, coverage: { slug: "x", title: "«أثرٌ ومعرفةٌ في عوالم متعدّدة»: حين يصير السؤالُ أفقًا" } } },
  { key: "cancelled", label: "ملغاة", a: { ...base, cancelled: true, booked: 0 } },
];

export default async function EventLab({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { c } = await searchParams;
  const cur = CASES.find((x) => x.key === c) ?? CASES[0];
  return (
    <>
      <SiteHeader activeHref="/activities" />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <nav aria-label="حالات المختبر" className="ad-bk-row">
            {CASES.map((x) => (
              <Link key={x.key} href={`/event-lab?c=${x.key}`} className="ad-badge" data-tone={x.key === cur.key ? "info" : undefined}>{x.label}</Link>
            ))}
          </nav>
          <br />
          <LabRead a={cur.a} demo={cur.demo} />
        </div>
      </main>
      <Footer />
    </>
  );
}
