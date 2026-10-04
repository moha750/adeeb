"use client";

import { useState } from "react";
import { Button, Field, Textarea } from "@adeeb/design-system";
import { Newspaper, TextAlignLeft } from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, CaretDown, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { wordCount } from "../vocab";
import type { Section } from "@/lib/news/blocks";

/**
 * محرّرُ أقسام الخبر.
 *
 * **الشكلُ مطويٌّ بقرار المالك ٢٠٢٦-٠٩-٢٤** بعد معاينةِ شكلين في `/ui/news-sections`:
 * المرصوصُ المفتوحُ كان يبلغ ‏4883px لأطولِ خبرٍ حيّ (اثنا عشرَ قسمًا)، والمطويُّ يسعه
 * في شاشةٍ واحدة. واللوحةُ منتَجُ جوّالٍ قِيس أنّ ٧٩٪ من أهلها لم يفتحوها من حاسوبٍ
 * قطّ، فالطولُ ثمنٌ لا يُدفَع.
 *
 * **ولا يعرف هذا المكوّنُ شيئًا عن الحفظ ولا عن القاعدة:** يأخذ أقسامًا ويردّ أقسامًا،
 * فيصلح للوحة وللمعرض معًا بلا نسخةٍ ثانيةٍ تتخلّف عنه.
 */
export function SectionsEditor({
  value,
  onChange,
}: {
  value: Section[];
  onChange: (next: Section[]) => void;
}) {
  const [open, setOpen] = useState(0);

  const patch = (i: number, v: Partial<Section>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...v } : r)));

  const move = (i: number, by: number) => {
    const to = i + by;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
    // المفتوحُ يتبع القسمَ الذي تحرّك، وإلّا انفتح جارُه فجأةً تحت الإصبع.
    if (open === i) setOpen(to);
    else if (open === to) setOpen(i);
  };

  const drop = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    if (open === i) setOpen(-1);
    else if (open > i) setOpen(open - 1);
  };

  const add = () => {
    onChange([...value, { heading: "", body: "" }]);
    setOpen(value.length);
  };

  return (
    <div className="form-full">
      <div className="nsec">
        {value.map((r, i) => (
          <div key={i} className="nsec-item" data-open={open === i}>
            <div className="nsec-hd">
              <button
                type="button"
                className="nsec-open"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span className="nsec-num">{i + 1}</span>
                <span className="nsec-id">
                  <span className="nsec-ttl" data-unnamed={!r.heading}>
                    {r.heading || "قسمٌ بلا عنوان"}
                  </span>
                  <span className="nsec-sub">{wordCount(r.body)} كلمة</span>
                </span>
                <CaretDown size={16} />
              </button>

              <span className="nsec-acts">
                <button type="button" aria-label="أعلى" className="nsec-btn"
                  disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" aria-label="أسفل" className="nsec-btn"
                  disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" aria-label="حذف القسم" className="nsec-btn" data-tone="danger"
                  onClick={() => drop(i)}>
                  <Trash size={16} />
                </button>
              </span>
            </div>

            <div className="nsec-bd">
              <Field
                label="عنوان القسم"
                icon={<Newspaper />}
                innerIcon={<PencilSimple />}
                placeholder="اتركه فارغًا لقسمٍ بلا عنوان"
                value={r.heading ?? ""}
                onChange={(e) => patch(i, { heading: e.target.value })}
              />
              <Textarea
                label="المتن"
                icon={<TextAlignLeft />}
                innerIcon={<PencilSimple />}
                rows={8}
                placeholder="نصّ القسم…"
                value={r.body}
                onChange={(e) => patch(i, { body: e.target.value })}
                helper="ابدأ السطرَ بـ• ليصير بندًا، وضع الكلامَ بين علامتَي تنصيصٍ ليصير اقتباسًا."
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="md" className="nsec-add" style={{ marginTop: 10 }} onClick={add}>
        <Plus size={18} />
        أضف قسمًا
      </Button>
    </div>
  );
}
