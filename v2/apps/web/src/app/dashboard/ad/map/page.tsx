import { denyUnless } from "@/app/dashboard/_shell/guard";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٥): **خريطةُ الموقع العامّ** — كلُّ صفحةٍ عامّةٍ مصغّرةً كما هي الآن (حاسوبٌ وجوّال) ومعها حكمٌ مقترح:
 * محمد: «أحسّ نحتاج نمرّ على كلّ شيء… أحسّ إنّي ضايع». فيمرّ عليها بعينه ويحكم صفحةً صفحة: قالبٌ مشترك، أو بصمةٌ خاصّة، أو هويّةٌ مستقلّة.
 */
export const metadata = { title: "خريطة الموقع العام: مختبر" };

type Kind = "template" | "signature" | "own" | "keep";
const KIND: Record<Kind, string> = {
  signature: "بصمة خاصّة: تكوينٌ مبهرٌ من مادّة الهويّة",
  template: "قالب مشترك",
  keep: "صُمّمت معك واعتُمدت",
  own: "هويّة مستقلّة باختيارك",
};
const PAGES: { group: string; items: { path: string; name: string; kind: Kind; note?: string }[] }[] = [
  { group: "الواجهة", items: [
    { path: "/", name: "الصفحة الرئيسية", kind: "signature", note: "الافتتاحية، وأهلُ الدفّة، والأقسام" },
    { path: "/vision", name: "الرؤية", kind: "keep" },
    { path: "/vision/hilal", name: "مسارُ رؤية", kind: "keep" },
    { path: "/structure", name: "هيكلة أدِيب", kind: "keep", note: "وإثراؤها المتّفق عليه" },
    { path: "/join", name: "الانضمام", kind: "template", note: "قالب الإقناع" },
  ] },
  { group: "الفهارس", items: [
    { path: "/activities", name: "الفعاليّات", kind: "template", note: "قالب الفهرس" },
    { path: "/library", name: "المكتبة", kind: "template", note: "قالب الفهرس" },
    { path: "/works", name: "أعمالنا", kind: "template", note: "قالب الفهرس" },
    { path: "/news", name: "الأخبار", kind: "template", note: "قالب الفهرس" },
    { path: "/regulations", name: "أنظمة أدِيب", kind: "keep" },
  ] },
  { group: "القراءة", items: [
    { path: "/news/news-6d3ca8893beb470b9c1c13eee4fef309", name: "الخبر", kind: "keep" },
    { path: "/activities/da6da453-f5d9-44b2-8ac3-a8c84c2ab207", name: "الفعاليّة", kind: "template", note: "قالب القراءة" },
    { path: "/library/202", name: "الكتاب", kind: "template", note: "قالب القراءة" },
    { path: "/regulations/constitution", name: "نظامٌ من الأنظمة", kind: "keep" },
    { path: "/m/صباح-منير-الدوسري", name: "صفحة العضو العلنيّة", kind: "template", note: "قالب القراءة، وأوسمتُه" },
  ] },
  { group: "الأدوات والأبواب", items: [
    { path: "/login", name: "الدخول", kind: "keep" },
    { path: "/signup", name: "إنشاء حساب", kind: "keep" },
    { path: "/join/apply", name: "التطوّع", kind: "keep", note: "تكملة إنشاء الحساب" },
    { path: "/forgot-password", name: "نسيت كلمة المرور", kind: "keep" },
    { path: "/complete", name: "إكمال البيانات", kind: "template", note: "بابٌ من أبواب الحساب" },
    { path: "/verify", name: "التحقّق من شهادة", kind: "template", note: "قالب الأداة" },
    { path: "/deebo", name: "ديبو", kind: "keep" },
    { path: "/app", name: "أدِيب على جوّالك", kind: "template", note: "قالب الأداة" },
    { path: "/irfan", name: "عِرفان العامّة", kind: "template", note: "قالب الأداة" },
  ] },
  { group: "هويّاتٌ مستقلّة", items: [
    { path: "/radio", name: "الإذاعة", kind: "own" },
    { path: "/games", name: "صالة الألعاب", kind: "own" },
  ] },
];

export default async function SiteMapLab() {
  const denied = await denyUnless("/dashboard");
  if (denied) return denied;
  return (
    <div className="ad-map">
      <h1 className="ad-lab-h">خريطة الموقع العام</h1>
      <p className="ad-map-lead">كلُّ صفحةٍ كما هي الآن، حاسوبًا وجوّالًا، ومعها ما أقترحه لها. اضغط اسمَ الصفحة لتفتحها كاملة.</p>
      <ul className="ad-map-key">
        {(Object.keys(KIND) as Kind[]).map((k) => <li key={k} data-kind={k}>{KIND[k]}</li>)}
      </ul>
      {PAGES.map((g) => (
        <section key={g.group} className="ad-map-group">
          <h2 className="ad-map-gh">{g.group}</h2>
          <div className="ad-map-grid">
            {g.items.map((p) => (
              <article key={p.path} className="ad-map-card" data-kind={p.kind}>
                <div className="ad-map-shots">
                  <span className="ad-map-desk"><iframe src={p.path} title={`${p.name}: حاسوب`} loading="lazy" tabIndex={-1} /></span>
                  <span className="ad-map-phone"><iframe src={p.path} title={`${p.name}: جوّال`} loading="lazy" tabIndex={-1} /></span>
                </div>
                <a className="ad-map-name" href={p.path} target="_blank" rel="noreferrer">{p.name}</a>
                <span className="ad-map-kind">{KIND[p.kind]}</span>
                {p.note ? <span className="ad-map-note">{p.note}</span> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
