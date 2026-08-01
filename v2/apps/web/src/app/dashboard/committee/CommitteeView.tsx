"use client";

import { useState } from "react";
import { Badge, Stat } from "@adeeb/design-system";
import { ArrowSquareOut, UsersFour } from "@phosphor-icons/react";
import { Toolbar } from "../_components/Toolbar";
import { Committee } from "../members/structure/tree";
import type { CommitteeNode } from "../members/structure/model";

/**
 * «لجنتي» — شاشة **قائد اللجنة التنفيذيّة ونائبها**، وهي **عرضٌ محض** (20260801): من فيها،
 * وما نقص من قيادتها، ومن يشرف عليها من الإدارتين. لا ضمَّ ولا إخراج ولا تعديل بيانات ولا
 * إنهاء عضويّة — الأفعال بابُها «تعيين المناصب» عند صاحب سلطته، وهذه غرفةُ معرفة.
 *
 * ولا كرتَ جديدًا لها: عقدةُ اللجنة في الشجرة (`Committee` من `structure/tree`) تقول هذا
 * كلَّه — قائدًا ونائبًا ومشرفَين وأعضاءً — و`edit=false` يُسقط قلمها. مصدرٌ واحد للشكل،
 * فما يتحسّن في الشجرة يتحسّن هنا.
 */
export function CommitteeView({ committee: c, dept }: { committee: CommitteeNode; dept: string | null }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › {dept ? `${dept} › ` : ""}<b>{c.name}</b></div>
          <h1>{c.name}</h1>
        </div>
      </div>

      {/* عددٌ واحد يكفي: القيادةُ والإشرافُ يُرَيان بأعيان شاغليهم في الكرت أدناه، فرقمٌ
          يعيدهما زينةٌ لا خبر (وشغورُ المقعد يقوله الكرت صريحًا). */}
      <div className="stat-grid">
        <Stat icon={<UsersFour weight="fill" />} value={c.total} label="عضوًا في لجنتك" tone="brand" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث عن عضو بالاسم…"
        search={query}
        onSearch={setQuery}
        actions={
          <>
            <Badge tone="info" variant="soft">عرضٌ فقط</Badge>
            {c.link ? (
              // رابطٌ بثوب الزرّ (سابقةٌ قائمة في اللوحة) — الوجهة خارجيّة فهو `<a>` لا زرّ
              <a className="abtn abtn-ghost abtn-sm" href={c.link} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={16} aria-hidden /> قروب اللجنة
              </a>
            ) : null}
          </>
        }
      />

      {/* مفتوحةٌ دائمًا: لجنةٌ واحدة لا شجرة — فالطيّ يُخفي كلَّ ما جاء الزائر لأجله.
          وخلوُّ البحث يقوله الكرتُ نفسه («لا مطابقون هنا») فلا سطرَ ثانٍ يعيده. */}
      <div className="org-coms">
        <Committee c={c} q={q} open onToggle={() => {}} edit={false} onMeta={() => {}} />
      </div>
    </>
  );
}
