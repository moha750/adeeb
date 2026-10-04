"use client";

import { useState } from "react";
import { Button, Container, Field, Modal, Segmented } from "@adeeb/design-system";
import { Camera, Images } from "@phosphor-icons/react";
import { PencilSimple, Trash } from "@/app/_components/glyphs";

/**
 * **معرضٌ لقرارٍ واحد: كيف يُنسَب كلُّ صورةٍ إلى مصوّرها؟**
 *
 * اليوم لا يُنسَب: الاسمُ يُكتب مرّةً عند الرفع — **منسوخًا من مصوّر الغلاف لكلّ صور
 * الدفعة** — ثمّ يُعرَض نصًّا ساكنًا لا يُمسّ. وفي الأخبار الحيّة خبرٌ صورُه لمصوّرَين،
 * فالحاجةُ مقيسةٌ لا مفترَضة.
 *
 * **والمحورُ الذي تفترق عليه الهيئتان**: أتُحرَّر الأسماءُ **دفعةً** بأسرعِ ما يمكن، أم
 * تُنسَب كلُّ صورةٍ **ويقينُ نسبتِها** أهمّ؟ ولذلك لم تُجعَل إحداهما «الأخرى بزخرفة»:
 * أ تضع الحقلَ تحت المصغّرة فتُكتب الثمانيةُ بلا نقرةٍ واحدةٍ زائدة، وب تفتح الصورةَ
 * كبيرةً فلا يُنسَب اسمٌ إلى صورةٍ لم تُرَ.
 *
 * والبياناتُ أسوأُ ما يُحتمَل: ثماني صورٍ حقيقيّةٍ من أخبارٍ منشورة، فيها اسمٌ طويلٌ
 * جدًّا، واسمان متكرّران، وصورةٌ بلا مصوّر.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "900", label: "سطح مكتب" },
];

const B = "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/news/gallery/";

type Shot = { src: string; who: string };

const SEED: Shot[] = [
  { src: `${B}1770488834792-agdiqq.jpg`, who: "حوراء الشيبه" },
  { src: `${B}1770488866263-zj31ah.jpg`, who: "عبدالرحمن بن محمد بن عبدالله الشمري" },
  { src: `${B}1770488877742-yo0tjo.jpg`, who: "محمد المطر" },
  { src: `${B}1770489294939-8g1r6n.jpg`, who: "" },
  { src: `${B}1770485633374-dlpc5p.jpg`, who: "امنة الخضير" },
  { src: `${B}1770485657362-ynblsy.jpg`, who: "امنة الخضير" },
  { src: `${B}1775933122049-x079be.jpg`, who: "نورة الشواكر" },
  { src: `${B}1775933149899-s54n5f.jpg`, who: "" },
];

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

/* ══ أ) الشبكةُ تُحرَّر في مكانها ═══════════════════════════════════════ */

function ShapeA({ shots, onEdit }: { shots: Shot[]; onEdit: (i: number, who: string) => void }) {
  return (
    <div className="gcr-grid">
      {shots.map((s, i) => (
        <figure key={s.src} className="gcr-cell">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.src} alt={`صورة ${i + 1}`} className="gcr-thumb" />
          <Field
            label="المصوّر" icon={<Camera />} innerIcon={<PencilSimple />}
            placeholder="اسم المصوّر"
            value={s.who} onChange={(e) => onEdit(i, e.target.value)}
          />
          <Button variant="ghost" size="sm"><Trash size={14} />حذف</Button>
        </figure>
      ))}
    </div>
  );
}

/* ══ ب) نافذةٌ تفتح على الصورة ══════════════════════════════════════════ */

function ShapeB({ shots, onEdit }: { shots: Shot[]; onEdit: (i: number, who: string) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const shot = open === null ? null : shots[open];

  return (
    <>
      <div className="gcr-grid">
        {shots.map((s, i) => (
          <figure key={s.src} className="gcr-cell">
            <button type="button" className="gcr-open" onClick={() => { setOpen(i); setDraft(s.who); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={`صورة ${i + 1}`} className="gcr-thumb" />
              <span className={"gcr-cap" + (s.who ? "" : " gcr-cap-none")}>
                <Camera size={13} aria-hidden />
                {s.who || "بلا مصوّر"}
              </span>
            </button>
          </figure>
        ))}
      </div>

      <Modal
        open={shot !== null}
        onClose={() => setOpen(null)}
        title="صورةٌ من المعرض"
        description="انظرها كبيرةً ثمّ انسبها إلى مصوّرها."
        size="md"
        footer={
          <>
            <Button variant="ghost-danger" size="md"><Trash size={16} />حذف الصورة</Button>
            <Button variant="ghost" size="md" onClick={() => setOpen(null)}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={() => { if (open !== null) onEdit(open, draft); setOpen(null); }}>
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
          <Field
            label="المصوّر" icon={<Camera />} innerIcon={<PencilSimple />}
            placeholder="روان ناصر الهنداس"
            value={draft} onChange={(e) => setDraft(e.target.value)} optional
            helper="يظهر تحت الصورة في صفحة الخبر."
          />
        ) : null}
      </Modal>
    </>
  );
}

/* ══ الصفحة ═════════════════════════════════════════════════════════════ */

export default function GalleryCreditsLab() {
  const [w, setW] = useState("375");
  const [a, setA] = useState<Shot[]>(SEED);
  const [b, setB] = useState<Shot[]>(SEED);
  const [askOpen, setAskOpen] = useState(false);
  const [askWho, setAskWho] = useState("");

  const editA = (i: number, who: string) => setA((s) => s.map((x, j) => (j === i ? { ...x, who } : x)));
  const editB = (i: number, who: string) => setB((s) => s.map((x, j) => (j === i ? { ...x, who } : x)));

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Newsroom, Gallery Credits</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">نسبةُ الصور إلى مصوّريها</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          اليوم لا يُنسَب شيء: الاسمُ يُكتب مرّةً عند الرفع، منسوخًا من مصوّر الغلاف إلى
          صور الدفعة كلِّها، ثمّ يُعرَض نصًّا ساكنًا. والهيئتان أدناه تفترقان على محورٍ
          واحد: أتُكتَب الثمانيةُ **دفعةً** بأسرعِ ما يمكن، أم تُنسَب كلُّ صورةٍ بعد أن
          تُرى كبيرة؟ جرّبهما بيدك، والحقولُ حيّةٌ تُكتَب.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <Sec title="الهيئتان جنبًا إلى جنب">
            <Note>
              أ تكتب الأسماءَ الثمانيةَ بلا نقرةٍ واحدةٍ زائدة، وثمنُها أنّ الخليّةَ تطول
              فتصير الشبكةُ عمودًا طويلًا على الجوّال. وب تُبقي الشبكةَ نظيفةً وتُري الصورةَ
              كبيرةً قبل أن تُنسَب، وثمنُها ثماني فتحاتٍ وثمانيةُ حفظ.
            </Note>
            <div className="phdlab">
              <div className="phdlab-col">
                <div className="phdlab-tag"><span className="dot" aria-hidden />أ) الشبكةُ تُحرَّر في مكانها</div>
                <div className="phdlab-frame"><ShapeA shots={a} onEdit={editA} /></div>
              </div>
              <div className="phdlab-col">
                <div className="phdlab-tag"><span className="dot" aria-hidden />ب) نافذةٌ تفتح على الصورة</div>
                <div className="phdlab-frame"><ShapeB shots={b} onEdit={editB} /></div>
              </div>
            </div>
          </Sec>

          <Sec title="وقرارٌ ثانٍ: ماذا يحدث عند الرفع؟">
            <Note>
              اليومَ يُنسَخ اسمُ مصوّر الغلاف إلى كلّ صورةٍ في الدفعة صامتًا، فتُنسَب عشرُ
              صورٍ لثلاثة مصوّرين إلى واحد. والبديلُ أن تُسأل مرّةً واحدةً عن مصوّر الدفعة
              قبل أن ترفع، ثمّ تصحّح ما شذّ بالهيئة المختارة أعلاه. اضغط الزرَّ لترى السؤال.
            </Note>
            <Button variant="ghost" size="md" onClick={() => { setAskWho(""); setAskOpen(true); }}>
              <Images size={18} />إضافة صور
            </Button>
            <Modal
              open={askOpen}
              onClose={() => setAskOpen(false)}
              title="مَن صوّر هذه الصور؟"
              description="يُكتب على الدفعة كلِّها، وتصحّح ما شذّ منها بعد الرفع."
              size="sm"
              footer={
                <>
                  <Button variant="ghost" size="md" onClick={() => setAskOpen(false)}>تخطٍّ</Button>
                  <Button variant="primary" size="md" onClick={() => setAskOpen(false)}>ارفع الصور</Button>
                </>
              }
            >
              <Field
                label="المصوّر" icon={<Camera />} innerIcon={<PencilSimple />}
                placeholder="روان ناصر الهنداس"
                value={askWho} onChange={(e) => setAskWho(e.target.value)} optional
                helper="اتركه فارغًا إن كانوا أكثر من واحد، وانسب كلَّ صورةٍ بعد الرفع."
              />
            </Modal>
          </Sec>
        </div>
      </div>
    </main>
  );
}
