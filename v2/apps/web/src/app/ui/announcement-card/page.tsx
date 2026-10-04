"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  IconButton,
  Segmented,
  Switch,
} from "@adeeb/design-system";
import {
  ArrowDown,
  ArrowUp,
  DotsSixVertical,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@/app/_components/glyphs";
import { AnnouncementCard } from "@/app/dashboard/website/announcements/AnnouncementCard";

/**
 * **هيئةُ الإعلان: ثلاثٌ تُعرَض ليُختار واحدة.**
 *
 * قال المالك ٢٠٢٦-٠٩-١٩ عن الكرت الذي بنيتُه إنّه «مزدحمٌ وغيرُ جميل»، وكان محقًّا.
 * والتشخيصُ خمسةٌ: الغلافُ أكبرُ من المحتوى (جملةٌ واحدة في ثلاثة أشرطة) · أيقونةُ
 * مكبّر الصوت تتكرّر على كلّ كرتٍ في غرفةٍ كلُّها إعلانات فلا تخبر · الحالةُ تُقال
 * مرّتين (شارةٌ تقول «في الشريط» وزرُّ عينٍ بجوارها يفعل عكسها) · «الترتيب ١»
 * تسميةٌ لرقمٍ يقوله موضعُ الكرت · وخمسةُ ضوابطَ في صفٍّ تُقرأ لوحةَ تحكّم.
 *
 * **والثلاثُ مشتقّاتٌ لا اختراعات** (‏[[feedback_refine_reference_not_replace]]):
 * كلُّها من مكوّنات المكتبة وألوانها، وتفترق في **مقدار الغلاف حول الجملة** —
 * وذلك هو محورُ الشكوى نفسُه، فلا يفترقن في شيءٍ آخر يشوّش الحكم.
 *
 * والبياناتُ أسوأُ ما يقع: إعلانٌ يبلغ الحدَّ (‏١٢٠ حرفًا)، وآخرُ مُطفَأ، وأوّلٌ
 * وأخيرٌ ليُرى السهمُ معطَّلًا في طرفه.
 */

type Row = { id: string; text: string; isActive: boolean };

const ROWS: Row[] = [
  { id: "1", text: "كلُّ حكايةٍ عظيمة تبدأ بحرف", isActive: true },
  {
    id: "2",
    text: "اجتمع شغفٌ بالحرف وإيمانٌ بالكلمة في جامعة الملك فيصل فكان أدِيب، وحكايةٌ تجاوزت الأسوار وما زالت تُكتب اليوم",
    isActive: true,
  },
  { id: "3", text: "خلف كلّ إنجازٍ أُدباء صنعوه", isActive: false },
  { id: "4", text: "وما زالت الحكاية تُكتب", isActive: true },
];

const SHAPES = [
  { value: "trim", label: "المقلَّم" },
  { value: "line", label: "السطر" },
  { value: "quote", label: "الاقتباس" },
  { value: "live", label: "الشريط الحيّ" },
  { value: "ms", label: "المخطوطة" },
  { value: "strip", label: "قِطَع الشريط" },
  { value: "sign", label: "اللافتة" },
  { value: "ordbox", label: "لصيقة مؤطَّرة" },
  { value: "slab", label: "اللوح الداكن" },
];

const WIDTHS = [
  { value: "375", label: "٣٧٥" },
  { value: "900", label: "٩٠٠" },
];

/* ══ أدواتٌ مشتركةٌ بين الهيئات: الفعلُ واحدٌ وإنّما يتبدّل وعاؤه ══════ */

function Tools({ row, first, last }: { row: Row; first: boolean; last: boolean }) {
  return (
    <>
      <IconButton size="lg" aria-label="تحرير" title="تحرير">
        <PencilSimple aria-hidden />
      </IconButton>
      <IconButton size="lg" disabled={first} aria-label="تحريك لأعلى" title="لأعلى">
        <ArrowUp aria-hidden />
      </IconButton>
      <IconButton size="lg" disabled={last} aria-label="تحريك لأسفل" title="لأسفل">
        <ArrowDown aria-hidden />
      </IconButton>
      <IconButton
        size="lg"
        aria-label={row.isActive ? "إطفاء" : "إشعال"}
        title={row.isActive ? "إطفاء" : "إشعال"}
      >
        {row.isActive ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
      </IconButton>
      <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
        <Trash aria-hidden />
      </IconButton>
    </>
  );
}

/* ══ (أ) المقلَّم ══════════════════════════════════════════════════
   الكرتُ نفسُه وقد سقط منه ما لا يخبر: الأيقونةُ المكرّرة، وتسميةُ الترتيب،
   والشارةُ (اندمجت مع زرّ العين في **مزلاجٍ واحد** يقول الحالَ ويغيّرها).
   فبقيت ثلاثُ أدواتٍ وصفّان بدل ستّة عناصر وثلاثة أشرطة. */
function Trim({ row, first, last }: { row: Row; first: boolean; last: boolean }) {
  return (
    <Card>
      <CardHeader title={row.text} />
      <CardFooter>
        <Switch
          row
          label={row.isActive ? "في الشريط" : "مُطفأ"}
          checked={row.isActive}
          onChange={() => {}}
        />
        <div className="acard-foot-row">
          <Button variant="neutral" size="sm">
            <PencilSimple aria-hidden />
            تعديل
          </Button>
          <IconButton size="lg" disabled={first} aria-label="تحريك لأعلى" title="لأعلى">
            <ArrowUp aria-hidden />
          </IconButton>
          <IconButton size="lg" disabled={last} aria-label="تحريك لأسفل" title="لأسفل">
            <ArrowDown aria-hidden />
          </IconButton>
          <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
            <Trash aria-hidden />
          </IconButton>
        </div>
      </CardFooter>
    </Card>
  );
}

/* ══ (ب) السطر ════════════════════════════════════════════════════
   لا كرتَ أصلًا: لوحٌ واحدٌ فيه سطورٌ يفصلها خيط. رقمٌ باهتٌ ثمّ الجملةُ ثمّ
   الأدوات. والمُطفَأُ يُقرأ مُطفَأً بحبره وخطٍّ فوقه، بلا شارةٍ تقولها. */
function Lines({ rows }: { rows: Row[] }) {
  return (
    <div className="anc-lines">
      {rows.map((r, i) => (
        <div key={r.id} className="anc-line" data-off={!r.isActive}>
          <span className="anc-line-n">{i + 1}</span>
          <span className="anc-line-t">{r.text}</span>
          <span className="anc-line-acts">
            <Tools row={r} first={i === 0} last={i === rows.length - 1} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══ (ج) الاقتباس ═════════════════════════════════════════════════
   الجملةُ بخطّ العرض كأنّها في الشريط نفسِه، ورقمُها كبيرٌ باهتٌ وراءها علامةَ
   موضعٍ لا حقلًا. والأدواتُ تحت خيطٍ رفيع: حاضرةٌ ولا تُزاحم الكلمة. */
function Quote({ row, order, first, last }: { row: Row; order: number; first: boolean; last: boolean }) {
  return (
    <div className="anc-quote" data-off={!row.isActive}>
      <span className="anc-quote-n" aria-hidden>{order}</span>
      <p className="anc-quote-t">{row.text}</p>
      <div className="anc-quote-acts">
        <Switch
          row
          label={row.isActive ? "في الشريط" : "مُطفأ"}
          checked={row.isActive}
          onChange={() => {}}
        />
        <IconButton size="lg" aria-label="تحرير" title="تحرير">
          <PencilSimple aria-hidden />
        </IconButton>
        <IconButton size="lg" disabled={first} aria-label="تحريك لأعلى" title="لأعلى">
          <ArrowUp aria-hidden />
        </IconButton>
        <IconButton size="lg" disabled={last} aria-label="تحريك لأسفل" title="لأسفل">
          <ArrowDown aria-hidden />
        </IconButton>
        <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
          <Trash aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}


/* ══ (د) الشريطُ الحيّ ═════════════════════════════════════════════
   رأسُ الغرفة هو الشريطُ نفسُه يجري بالكلمات المُشعَلة، فيُحكَم على الجملة
   وهي تمرّ لا وهي ساكنةٌ في حقل. وتحته أسطرُ (ب) للتحرير. */
function Live({ rows }: { rows: Row[] }) {
  const on = rows.filter((r) => r.isActive);
  return (
    <>
      <div className="anc-live">
        <span className="anc-live-cap">هكذا يمرّ في الصفحة الرئيسية الآن</span>
        <div className="anc-live-strip">
          <div className="anc-live-track">
            {[0, 1].map((copy) => (
              <div key={copy} style={{ display: "flex" }}>
                {[0, 1].map((rep) =>
                  on.map((r, n) => (
                    <span key={`${rep}-${n}`} className="anc-live-i">
                      {r.text}
                    </span>
                  )),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Lines rows={rows} />
      </div>
    </>
  );
}

/* ══ (هـ) المخطوطة ════════════════════════════════════════════════
   ورقةٌ مسطَّرة: خيطٌ متقطّعٌ تحت كلّ سطر، والجملةُ بخطّ العرض، ومقبضُ جرٍّ
   في الطرف بدل سهمَي الترتيب. والسهمان يسقطان، فتصير الأدواتُ ثلاثًا. */
function Manuscript({ rows }: { rows: Row[] }) {
  return (
    <div className="anc-ms">
      {rows.map((r) => (
        <div key={r.id} className="anc-ms-line" data-off={!r.isActive}>
          <span className="anc-ms-grip" aria-hidden>
            <DotsSixVertical />
          </span>
          <span className="anc-ms-t">{r.text}</span>
          <span className="anc-ms-acts">
            <IconButton size="lg" aria-label="تحرير" title="تحرير">
              <PencilSimple aria-hidden />
            </IconButton>
            <IconButton
              size="lg"
              aria-label={r.isActive ? "إطفاء" : "إشعال"}
              title={r.isActive ? "إطفاء" : "إشعال"}
            >
              {r.isActive ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
            </IconButton>
            <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
              <Trash aria-hidden />
            </IconButton>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══ (و) قِطَعُ الشريط ═════════════════════════════════════════════
   الإعلانُ يُقرأ في النهاية حبرًا أزرقَ على ورقٍ أبيضَ فوق لوح الهويّة، فيُحرَّر
   في سياق لونه: قطعةُ ورقٍ مائلةٌ نصفَ درجةٍ على تدرّج العلامة. */
function Strip({ row, order, first, last }: { row: Row; order: number; first: boolean; last: boolean }) {
  return (
    <div className="anc-strip" data-off={!row.isActive}>
      <div className="anc-strip-paper">
        <p className="anc-strip-t">{row.text}</p>
      </div>
      <div className="anc-strip-acts">
        <span className="anc-strip-n">{row.isActive ? `في الشريط ${order}` : "مُطفأ"}</span>
        <span className="anc-strip-tools">
          <Tools row={row} first={first} last={last} />
        </span>
      </div>
    </div>
  );
}


/* ══ (ز) اللافتة ══════════════════════════════════════════════════
   صورةُ المالك: مطبوعةٌ في إطارٍ على طاولة النادي. إطارٌ رماديٌّ يحفّ ورقةً
   بيضاءَ بظلّ، والشعارُ فوق الجملة، والجملةُ متوسّطةٌ بخطّ العرض. والأدواتُ
   خارجَ الإطار فلا تدخل اللوحةَ المطبوعة. */
function Sign({ row, order, first, last }: { row: Row; order: number; first: boolean; last: boolean }) {
  return (
    <div className="anc-sign" data-off={!row.isActive}>
      <div className="anc-sign-frame">
        <div className="anc-sign-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="anc-sign-mark" src="/brand/logo-vertical.svg" alt="" />
          <p className="anc-sign-t">{row.text}</p>
        </div>
      </div>
      <div className="anc-sign-acts">
        <Switch
          row
          label={row.isActive ? `في الشريط ${order}` : "مُطفأ"}
          checked={row.isActive}
          onChange={() => {}}
        />
        <IconButton size="lg" aria-label="تحرير" title="تحرير">
          <PencilSimple aria-hidden />
        </IconButton>
        <IconButton size="lg" disabled={first} aria-label="تحريك لأعلى" title="لأعلى">
          <ArrowUp aria-hidden />
        </IconButton>
        <IconButton size="lg" disabled={last} aria-label="تحريك لأسفل" title="لأسفل">
          <ArrowDown aria-hidden />
        </IconButton>
        <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
          <Trash aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}

/* ══ (ح) لصيقةٌ مؤطَّرة ════════════════════════════════════════════
   الكرتُ المنفَّذُ نفسُه، ولا يتبدّل فيه إلّا لصيقةُ الترتيب: حدٌّ رفيعٌ بلا
   تعبئةٍ بدل الكبسولة الممتلئة — أيْ إن كان المقصودُ من الصورة **الإطار**. */
function OrdBox({ row, order, first, last }: { row: Row; order: number; first: boolean; last: boolean }) {
  return (
    <Card className="anc-card">
      <CardHeader
        icon={<span className="anc-ordbox">ترتيب <b>{order}</b></span>}
        title={row.text}
        actions={
          <>
            <IconButton size="lg" disabled={first} aria-label="تحريك لأعلى" title="لأعلى">
              <ArrowUp aria-hidden />
            </IconButton>
            <IconButton size="lg" disabled={last} aria-label="تحريك لأسفل" title="لأسفل">
              <ArrowDown aria-hidden />
            </IconButton>
            <IconButton size="lg" tone="danger" aria-label="حذف" title="حذف">
              <Trash aria-hidden />
            </IconButton>
          </>
        }
      />
      <CardFooter>
        {/* ملفوفٌ كما في الكرت المنفَّذ: `.ach` كتلةٌ بعرضٍ كامل، فلو تُرك ابنًا
            مباشرًا للذيل لَدفع الزرَّ إلى سطرٍ ثانٍ وظُلمت الهيئةُ في المقارنة. */}
        <span>
          <Switch
            row
            label={row.isActive ? "في الشريط" : "مُطفأ"}
            checked={row.isActive}
            onChange={() => {}}
          />
        </span>
        <Button variant="neutral" size="sm">
          <PencilSimple aria-hidden />
          تعديل
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ══ (ط) اللوح الداكن ═════════════════════════════════════════════
   اللوحُ الذي في يمين الصورة: سطحٌ داكنٌ مدوَّرُ الأطراف والمحتوى عليه بالأبيض. */
function Slab({ row, order, first, last }: { row: Row; order: number; first: boolean; last: boolean }) {
  return (
    <div className="anc-slab" data-off={!row.isActive}>
      <p className="anc-slab-t">{row.text}</p>
      <div className="anc-slab-acts">
        <span className="anc-slab-n">{row.isActive ? `ترتيب ${order}` : "مُطفأ"}</span>
        <Tools row={row} first={first} last={last} />
      </div>
    </div>
  );
}

/* ══ المعرض ═══════════════════════════════════════════════════════ */

export default function AnnouncementCardLab() {
  const [shape, setShape] = useState("sign");
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-latin text-xs font-bold tracking-[0.22em] text-secondary">
          Dashboard, Announcements
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          هيئةُ الإعلان، ثلاثٌ تُختار منها
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          كلُّها الأفعالُ الخمسةُ نفسُها والبياناتُ نفسُها، وتفترق في مقدار الغلاف حول الجملة.
          والأوّلُ في الأسفل هو ما هو حيٌّ اليوم، للمقارنة.
        </p>

        <h2 className="mt-14 font-display text-xl font-black text-content">هيئاتٌ لم تُختَر بعد</h2>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-muted">الهيئة</span>
            <Segmented items={SHAPES} value={shape} onValueChange={setShape} aria-label="الهيئة" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-muted">العرض</span>
            <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض الإطار" />
          </div>
        </div>

        <div className="mt-8" style={{ width: "100%", maxWidth: Number(w) }}>
          {shape === "line" ? (
            <Lines rows={ROWS} />
          ) : shape === "live" ? (
            <Live rows={ROWS} />
          ) : shape === "ms" ? (
            <Manuscript rows={ROWS} />
          ) : (
            <div className="card-grid card-grid-1col">
              {ROWS.map((r, i) =>
                shape === "trim" ? (
                  <Trim key={r.id} row={r} first={i === 0} last={i === ROWS.length - 1} />
                ) : shape === "sign" ? (
                  <Sign
                    key={r.id}
                    row={r}
                    order={i + 1}
                    first={i === 0}
                    last={i === ROWS.length - 1}
                  />
                ) : shape === "ordbox" ? (
                  <OrdBox
                    key={r.id}
                    row={r}
                    order={i + 1}
                    first={i === 0}
                    last={i === ROWS.length - 1}
                  />
                ) : shape === "slab" ? (
                  <Slab
                    key={r.id}
                    row={r}
                    order={i + 1}
                    first={i === 0}
                    last={i === ROWS.length - 1}
                  />
                ) : shape === "strip" ? (
                  <Strip
                    key={r.id}
                    row={r}
                    order={i + 1}
                    first={i === 0}
                    last={i === ROWS.length - 1}
                  />
                ) : (
                  <Quote
                    key={r.id}
                    row={r}
                    order={i + 1}
                    first={i === 0}
                    last={i === ROWS.length - 1}
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* ══ المُنفَّذُ الآن ══
            **يُستدعى المكوّنُ الحقيقيُّ لا نسخةٌ منه** (العلّةُ نفسُها التي جعلت معرضَ
            الصدر يستدعي `Hero`): كانت هذه الكتلةُ مكتوبةً بيدٍ هنا، فلمّا أُعيد بناءُ
            الكرت في الغرفة بقي المعرضُ يعرض القديمَ — ففتحه المالكُ وقال «وينه ما أشوفه».
            والآن ما تراه ههنا هو ما في الغرفة حرفًا بحرف. */}
        <h2 className="mt-14 font-display text-xl font-black text-content">المُنفَّذُ الآن في الغرفة</h2>
        <p className="mt-1 text-sm text-content-muted">
          رقمُ الترتيب في قرصٍ مصمت، وثلاثةُ أزرارٍ في طرف الرأس، والباقي في الذيل.
        </p>
        <div id="live-card" className="mt-4" style={{ width: "100%", maxWidth: Number(w) }}>
          <div className="card-grid card-grid-1col">
            {ROWS.map((r, i) => (
              <AnnouncementCard
                key={r.id}
                announcement={{ id: r.id, text: r.text, sort: i, isActive: r.isActive }}
                order={i + 1}
                canUp={i > 0}
                canDown={i < ROWS.length - 1}
                busy={false}
                onOpen={() => {}}
                onToggle={() => {}}
                onMove={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
