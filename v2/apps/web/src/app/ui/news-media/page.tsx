"use client";

import { useState } from "react";
import { Button, Container, Modal, PersonPicker, Segmented } from "@adeeb/design-system";
import { Camera, Images, Image as ImageIcon } from "@phosphor-icons/react";
import { PencilSimple, Trash, UploadSimple } from "@/app/_components/glyphs";
import { Avatar } from "../../dashboard/_components/Avatar";
import { EmptyState } from "../../dashboard/_components/EmptyState";

/**
 * **معاينةُ النهاية: تبويبُ الوسائط في غرفة التحرير كما سيصير.**
 *
 * لا رسمٌ يحاكي الشاشة: هذه مكوّناتُها الحقيقيّة (`PersonPicker` · `Modal` · `EmptyState`
 * وأصنافُ `.gcr-*` في المكتبة)، وصورُها صورُ أخبارٍ منشورة. فما تراه ههنا هو ما سيُركَّب.
 *
 * **والحكمُ الذي يفرّق بين موضعين:** ما يُرى كبيرًا يُحرَّر في مكانه (الغلاف: صورةٌ
 * واحدةٌ معروضةٌ أصلًا، واسمُها تحتها بلا نقرة)، وما يُرى مصغَّرًا يُفتَح ليُحرَّر
 * (المعرض: تُنقَر الصورةُ فتكبر فتُنسَب). ولذلك يبدو الغلافُ «أ» والمعرضُ «ب»، وهما
 * قاعدةٌ واحدة لا هيئتان.
 *
 * **وثلاثةُ أبوابٍ للاسم لا باب:** يُسأل مرّةً عن مصوّر الدفعة عند الرفع (فالشائعُ
 * يصحّ من أوّله)، ويُصحَّح الشاذُّ بنقرةٍ على صورته، ويُكتب اسمُ من ليس من أدِيب كما هو.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "760", label: "سطح مكتب" },
];

const B = "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/news/gallery/";
const COVER = `${B}1770488834792-agdiqq.jpg`;

const POOL = [
  ...[
    { name: "الحَوراء أحمد الملبو", hint: "لجنة التأليف" },
    { name: "بشائر فاروق الحداد", hint: "لجنة التصميم" },
    { name: "حوراء زكريا الشيبة", hint: "لجنة التصوير" },
    { name: "حوراء عبدالله المنصور", hint: "لجنة الرواة" },
    { name: "روان ناصر الهنداس", hint: "لجنة التسويق" },
    { name: "عبدالرحمن بن محمد بن عبدالله الشمري", hint: "إدارة الموارد البشرية" },
    { name: "نوره عامر الدوسري", hint: "لجنة السُفراء" },
  ].map((p) => ({ ...p, group: "أعضاء أدِيب", gender: "female" })),
  ...[
    { name: "امنة سعد الخضير", hint: "متطوّع" },
    { name: "محمد صالح المطر", hint: "متطوّع" },
  ].map((p) => ({ ...p, group: "متطوّعو أدِيب", gender: "male" })),
].map((p) => ({ ...p, icon: <Avatar name={p.name} gender={p.gender} size="xs" /> }));

type Shot = { src: string; who: string };

const SEED: Shot[] = [
  { src: `${B}1770488866263-zj31ah.jpg`, who: "حوراء زكريا الشيبة" },
  { src: `${B}1770488877742-yo0tjo.jpg`, who: "حوراء زكريا الشيبة" },
  { src: `${B}1770489294939-8g1r6n.jpg`, who: "محمد صالح المطر" },
  { src: `${B}1770485633374-dlpc5p.jpg`, who: "" },
  { src: `${B}1770485657362-ynblsy.jpg`, who: "عبدالرحمن بن محمد بن عبدالله الشمري" },
];
const NEXT: string[] = [`${B}1775933122049-x079be.jpg`, `${B}1775933149899-s54n5f.jpg`];

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-2 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-[70ch] text-sm leading-7 text-content-muted">{children}</p>;
}

/** تبويبُ الوسائط كاملًا — يُرسَم مرّتين في الصفحة: بمحتوًى وبلا محتوًى. */
function MediaTab({ seeded }: { seeded: boolean }) {
  const [cover, setCover] = useState<string | null>(seeded ? COVER : null);
  const [coverWho, setCoverWho] = useState<string[]>(seeded ? ["حوراء زكريا الشيبة"] : []);
  const [shots, setShots] = useState<Shot[]>(seeded ? SEED : []);

  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const shot = open === null ? null : shots[open];

  const [askOpen, setAskOpen] = useState(false);
  const [askWho, setAskWho] = useState<string[]>([]);

  const edit = (i: number, who: string) => setShots((s) => s.map((x, j) => (j === i ? { ...x, who } : x)));
  const kill = (i: number) => setShots((s) => s.filter((_, j) => j !== i));
  const upload = () => {
    const taken = new Set(shots.map((s) => s.src));
    const add = NEXT.filter((src) => !taken.has(src)).map((src) => ({ src, who: askWho[0] ?? "" }));
    setShots((s) => [...s, ...add]);
    setAskOpen(false);
  };

  return (
    <>
      <section>
        <h3 className="mb-3 font-bold text-content">صورة الغلاف</h3>
        {cover ? (
          <div className="gcr-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="غلاف الخبر" className="gcr-cover-img" />
            <PersonPicker label="مصوّر الغلاف" icon={<Camera />} single people={POOL}
              value={coverWho} onChange={setCoverWho}
              placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" required />
            <div className="btn-row">
              <Button variant="ghost" size="sm"><UploadSimple size={16} />استبدال</Button>
              <Button variant="ghost" size="sm" onClick={() => { setCover(null); setCoverWho([]); }}>
                <Trash size={16} />حذف
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState variant="soft" icon={<ImageIcon />} title="بلا غلاف"
            description="الغلاف مطلوبٌ قبل النشر، يظهر في بطاقة الخبر وفي الصفحة الرئيسية."
            action={<Button variant="primary" size="md" onClick={() => setCover(COVER)}>
              <UploadSimple size={18} />رفع الغلاف
            </Button>} />
        )}
      </section>

      <section>
        <h3 className="mb-3 font-bold text-content">معرض الصور</h3>
        {shots.length ? (
          <div className="gcr-grid">
            {shots.map((s, i) => (
              <figure key={s.src} className="gcr-cell">
                <button type="button" className="gcr-open"
                  onClick={() => { setOpen(i); setDraft(s.who ? [s.who] : []); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={`صورة ${i + 1}`} className="gcr-thumb" />
                  <span className={"gcr-cap" + (s.who ? "" : " gcr-cap-none")}>
                    <PencilSimple aria-hidden />
                    {s.who || "بلا مصوّر"}
                  </span>
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-content-muted">لا صور في المعرض بعد.</p>
        )}
        <Button variant="ghost" size="md" className="mt-3"
          onClick={() => { setAskWho([]); setAskOpen(true); }}>
          <Images size={18} />إضافة صور
        </Button>
      </section>

      {/* ── نافذةُ الصورة: تُرى كبيرةً ثمّ تُنسَب أو تُرفَع ── */}
      <Modal
        open={shot !== null}
        onClose={() => setOpen(null)}
        title="صورةٌ من المعرض"
        description="انظرها كبيرةً ثمّ انسبها إلى مصوّرها."
        size="md"
        footer={
          <>
            <Button variant="ghost-danger" size="md"
              onClick={() => { if (open !== null) kill(open); setOpen(null); }}>
              <Trash size={16} />حذف الصورة
            </Button>
            <Button variant="ghost" size="md" onClick={() => setOpen(null)}>إلغاء</Button>
            <Button variant="primary" size="md" disabled={!draft.length}
              onClick={() => { if (open !== null) edit(open, draft[0] ?? ""); setOpen(null); }}>
              حفظ
            </Button>
          </>
        }
      >
        {shot ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={shot.src} alt="الصورة كاملةً" className="gcr-full" />
        ) : null}
        {shot ? (
          <PersonPicker label="المصوّر" icon={<Camera />} single people={POOL}
            value={draft} onChange={setDraft}
            placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
            helper="يظهر تحت الصورة في صفحة الخبر." required />
        ) : null}
      </Modal>

      {/* ── سؤالُ الرفع: مرّةً واحدةً للدفعة كلِّها ── */}
      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="مَن صوّر هذه الصور؟"
        description="يُكتب على الدفعة كلِّها، وتصحّح ما شذّ منها بنقرةٍ على صورته."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAskOpen(false)}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={upload} disabled={!askWho.length}>ارفع الصور</Button>
          </>
        }
      >
        <PersonPicker label="مصوّر الدفعة" icon={<Camera />} single people={POOL}
          value={askWho} onChange={setAskWho}
          placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
          helper="إن كانوا أكثر من واحد فاكتب أحدَهم، وصحّح ما شذّ بنقرةٍ على صورته." required />
      </Modal>
    </>
  );
}

export default function NewsMediaLab() {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Newsroom, Media Tab</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">تبويبُ الوسائط كما سيصير</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          معاينةٌ عاملة، لا رسمٌ يحاكيها: هذه مكوّناتُ الشاشة نفسُها وصورُ أخبارٍ منشورة.
          ارفع دفعةً فتُسأل عن مصوّرها مرّةً واحدة، وانقر صورةً شذّت فتكبر فتُنسَب، واكتب
          اسمَ ضيفٍ من خارج أدِيب فيُقبَل كما هو. والحذفُ يعمل ههنا فعلًا.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <Sec title="الحالةُ العامرة">
            <Note>
              خبرٌ له غلافٌ وخمسُ صورٍ لثلاثة مصوّرين، فيها واحدةٌ بلا مصوّر تقول نقصَها
              صراحةً. والغلافُ يُحرَّر في مكانه لأنّه معروضٌ كبيرًا أصلًا، والمصغّرةُ تُفتَح
              لتُرى قبل أن تُنسَب — قاعدةٌ واحدة لا هيئتان.
            </Note>
            <div className="phdlab">
              <div className="phdlab-col">
                <div className="phdlab-frame">
                  <div className="space-y-6"><MediaTab seeded /></div>
                </div>
              </div>
            </div>
          </Sec>

          <Sec title="الحالةُ الخالية">
            <Note>
              خبرٌ لم يُرفَع له شيءٌ بعد — أوّلُ ما يراه الكاتبُ حين يفتح التبويب. اضغط
              «رفع الغلاف» ثمّ «إضافة صور» لترى الطريقَ من أوّله.
            </Note>
            <div className="phdlab">
              <div className="phdlab-col">
                <div className="phdlab-frame">
                  <div className="space-y-6"><MediaTab seeded={false} /></div>
                </div>
              </div>
            </div>
          </Sec>
        </div>
      </div>
    </main>
  );
}
