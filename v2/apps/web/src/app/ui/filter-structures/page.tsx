"use client";

import { useMemo, useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { MagnifyingGlass, X } from "@/app/_components/glyphs";

/**
 * بِنى بديلةٌ للتصفية — **لا تنويعاتُ شكل**.
 *
 * عُرضت على المالك ستُّ معالجاتٍ لعلامة الرفع فردّها: «نفسُ التصميم مع تغييرٍ بسيط»، وكان
 * محقًّا: شريحةٌ واحدةٌ بستّة ألوان. فالاختلافُ يُطلَب في **ما يفعله المستخدمُ** لا في حبر
 * أيقونة. والبنيتان أدناه **تُلغيان المنسدلَ نفسَه**، فلا شريحةَ ولا ✕ ولا زرَّ تصفية.
 *
 * وكلتاهما تعمل: اضغط واختر وارفع.
 */

const DIMS = [
  { key: "dept", label: "القسم", options: ["الإعلام", "التقنية", "المحتوى"] },
  { key: "role", label: "الدور", options: ["عضو", "قائد", "رئيس قسم"] },
  { key: "committee", label: "اللجنة", options: ["الموارد البشريّة", "الضمان والجودة"] },
];

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "768", label: "لوح ٧٦٨" },
  { value: "1100", label: "سطح مكتب" },
];

/* ══════════ ١) شرائطُ ظاهرة ══════════ */
/**
 * القيمُ معروضةٌ لا مخبوءةٌ خلف منسدل، والاختيارُ **نقرةٌ واحدة** لا ثلاث (افتح · اقرأ ·
 * اختر). ولا ✕ ولا شريحة: «الكل» شريطٌ كسائرها، فالرفعُ اختيارٌ لا فعلٌ خاصّ. وعلى الضيّق
 * يُمرَّر الصفُّ أفقيًّا، واسمُ البُعد يلازم صدرَه فلا تضيع نسبةُ الشرائط.
 */
function Pills() {
  const [v, setV] = useState<Record<string, string>>({ dept: "الإعلام" });
  return (
    <div className="flex flex-col gap-2">
      {DIMS.map((d) => (
        <div key={d.key} className="fpill-wrap">
          <span className="fpill-lbl">{d.label}</span>
          <button type="button" className={"fpill" + (!v[d.key] ? " on" : "")} onClick={() => setV((p) => ({ ...p, [d.key]: "" }))}>الكل</button>
          {d.options.map((o) => (
            <button key={o} type="button" className={"fpill" + (v[d.key] === o ? " on" : "")} onClick={() => setV((p) => ({ ...p, [d.key]: o }))}>{o}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ══════════ ٢) حقلٌ واحدٌ بتوكنز ══════════ */
/**
 * البحثُ والتصفيةُ شيءٌ واحد: تكتب فيُقترح عليك، فإن اخترت صار توكنًا داخل الحقل. فيسقط
 * من الشريط كلُّ ضابطٍ إلّا حقلًا واحدًا — وهو أقصى ما يمكن من التقليل. وثمنُه أنّ القيمَ
 * لا تُرى حتى تكتب أو تضغط، فيحتاج من لا يعرف ما فيه أن يستكشف.
 */
function Tokens() {
  const [tokens, setTokens] = useState<{ dim: string; label: string; value: string }[]>([
    { dim: "dept", label: "القسم", value: "الإعلام" },
  ]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const taken = new Set(tokens.map((t) => t.dim));
    return DIMS.filter((d) => !taken.has(d.key)).map((d) => ({
      dim: d.key,
      label: d.label,
      hits: d.options.filter((o) => !q || o.includes(q)),
    })).filter((g) => g.hits.length > 0);
  }, [tokens, q]);

  return (
    <div>
      <div className="ftok" onClick={() => setOpen(true)}>
        <span className="ftok-ic" aria-hidden><MagnifyingGlass /></span>
        {tokens.map((t) => (
          <span key={t.dim} className="ftok-chip">
            <i>{t.label}</i> {t.value}
            <button type="button" aria-label={`ارفع ${t.label}`} onClick={(e) => { e.stopPropagation(); setTokens((p) => p.filter((x) => x.dim !== t.dim)); }}>
              <X aria-hidden />
            </button>
          </span>
        ))}
        <input
          className="ftok-in"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={tokens.length ? "أضِف مرشّحًا أو ابحث…" : "ابحث بالاسم، أو اكتب قسمًا أو دورًا…"}
        />
      </div>

      {open && suggestions.length > 0 ? (
        <div className="ftok-sug">
          {suggestions.map((g) => (
            <div key={g.dim}>
              <div className="ftok-grp">{g.label}</div>
              {g.hits.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="ftok-opt"
                  onClick={() => { setTokens((p) => [...p, { dim: g.dim, label: g.label, value: o }]); setQ(""); setOpen(false); }}
                >
                  {g.label}: <b>{o}</b>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function FilterStructuresLab() {
  const [w, setW] = useState("390");
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Filter Structures</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بِنًى بديلةٌ للتصفية</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          هاتان لا تعالجان شكلَ الشريحة، بل <b>تُلغيان المنسدلَ نفسَه</b> — فلا شريحةَ ولا ✕
          ولا زرَّ تصفية. وكلتاهما تعمل: اضغط واختر وارفع.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>

        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">١) شرائطُ ظاهرة</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              القيمُ معروضةٌ لا مخبوءة، والاختيارُ <b>نقرةٌ واحدة</b> لا ثلاث (افتح، اقرأ،
              اختر). ولا ✕: «الكل» شريطٌ كسائرها، فالرفعُ اختيارٌ لا فعلٌ خاصّ. وعلى الضيّق
              يُمرَّر الصفُّ أفقيًّا واسمُ البُعد يلازم صدرَه.
              <br />
              <b>الثمن:</b> يأخذ ارتفاعًا بعدد الأبعاد، فيصلح لبُعدٍ أو اثنين لا لخمسة.
            </p>
            <div className="phdlab"><div className="phdlab-col"><div className="phdlab-frame" style={{ paddingBottom: 14 }}><Pills /></div></div></div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">٢) حقلٌ واحدٌ يبتلع الكلّ</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              البحثُ والتصفيةُ شيءٌ واحد: تكتب فيُقترح، وإن اخترت صار توكنًا داخل الحقل.
              فيسقط من الشريط كلُّ ضابطٍ إلّا حقلًا واحدًا — أقصى ما يمكن من التقليل.
              <br />
              <b>الثمن:</b> القيمُ لا تُرى حتى تكتب أو تضغط، فمن لا يعرف ما فيه يحتاج أن
              يستكشف.
            </p>
            <div className="phdlab"><div className="phdlab-col"><div className="phdlab-frame" style={{ paddingBottom: 14 }}><Tokens /></div></div></div>
          </section>
        </div>
      </Container>
    </main>
  );
}
