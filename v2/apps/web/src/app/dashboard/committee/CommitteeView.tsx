"use client";

import { useState } from "react";
import { Badge, Segmented, Stat } from "@adeeb/design-system";
import { ArrowSquareOut, UsersFour } from "@phosphor-icons/react";
import { Toolbar } from "../_components/Toolbar";
import { Committee } from "../members/structure/tree";
import { MembersView } from "../members/MembersView";
import type { MemberRow } from "../members/data";
import type { CommitteeNode } from "../members/structure/model";
import { Breadcrumb } from "../_shell/Breadcrumb";

/**
 * «لجنتي» — شاشة **قائد اللجنة التنفيذيّة ونائبها**، وهي **عرضٌ محض** (20260801): لا ضمَّ ولا
 * إخراج ولا تعديل بيانات ولا إنهاء عضويّة — الأفعال بابُها «تعيين المناصب» عند صاحب سلطته،
 * وهذه غرفةُ معرفة.
 *
 * **وعينان على نطاقٍ واحد** (كـ«من أشرف عليهم»)، والمبدّل يقول أيّهما:
 *   «اللجنة» — عقدةُ الشجرة نفسها (`Committee` من `structure/tree` بـ`edit=false`): من يقودها
 *              ومن ينوبه ومن يشرف عليها من الإدارتين، وأعضاؤها أفتارًا. سؤالُ **الموقع**.
 *   «الأعضاء» — سجلُّهم جدولًا يُبحَث ويُرشَّح، ومنه «عرض الملف» (بيانات العضويّة والتواصل
 *              والأكاديميّ). سؤالُ **البيانات** — وهو ما لم تكن الشجرة تجيبه.
 *
 * والعرضُ المحض يُنفَّذ في منبعه لا بإخفاء زرّ: `readOnly` في `MembersView` يُجفّف سلطةَ كلّ
 * صفّ فتغيب أفعالُه كلُّها (ولو قالت القاعدة نعم) — فلا يُخفي زرًّا هنا ويُبقي أخاه هناك.
 *
 * **والتواصل ليس تحكّمًا** (`contact`): كرتُ كلّ عضوٍ يحمل زرَّ واتساب بجوار ملفّه — فالقائد
 * يعرف أعضاءه **ويكلّمهم**، وذاك كلُّ ما يملكه عليهم. ومن لا جوّالَ له لا زرَّ له.
 */
export function CommitteeView({
  committee: c,
  dept,
  members,
}: {
  committee: CommitteeNode;
  dept: string | null;
  members: MemberRow[];
}) {
  const [view, setView] = useState<"unit" | "member">("unit");
  const [query, setQuery] = useState("");
  const q = query.trim();

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={c.name} />
          <h1>{c.name}</h1>
        </div>
      </div>

      {/* عددٌ واحد يكفي: القيادةُ والإشرافُ يُرَيان بأعيان شاغليهم في الكرت أدناه، فرقمٌ
          يعيدهما زينةٌ لا خبر (وشغورُ المقعد يقوله الكرت صريحًا). */}
      <div className="stat-grid">
        <Stat icon={<UsersFour />} value={c.total} label="عضوًا في لجنتك" tone="brand" />
      </div>

      <div className="viewbar">
        <Segmented
          aria-label="طريقة العرض"
          value={view}
          onValueChange={(v) => setView(v as "unit" | "member")}
          items={[{ value: "unit", label: "اللجنة" }, { value: "member", label: "الأعضاء" }]}
        />
        <Badge tone="info" variant="soft">عرضٌ فقط</Badge>
      </div>

      {view === "member" ? (
        // شريطُ الجدول ومرشّحاتُه من `MembersView` نفسها — فلا شريطان في شاشةٍ واحدة
        <MembersView
          headless
          readOnly
          contact
          members={members}
          emptyNote="لا أعضاء في لجنتك بعد — يُسنَدون من «تعيين المناصب»."
        />
      ) : (
        <>
          <Toolbar
            searchPlaceholder="ابحث عن عضو بالاسم…"
            search={query}
            onSearch={setQuery}
            actions={
              c.link ? (
                // رابطٌ بثوب الزرّ (سابقةٌ قائمة في اللوحة) — الوجهة خارجيّة فهو `<a>` لا زرّ
                <a className="abtn abtn-ghost abtn-sm" href={c.link} target="_blank" rel="noreferrer">
                  <ArrowSquareOut size={16} aria-hidden /> قروب اللجنة
                </a>
              ) : null
            }
          />

          {/* مفتوحةٌ دائمًا: لجنةٌ واحدة لا شجرة — فالطيّ يُخفي كلَّ ما جاء الزائر لأجله.
              وخلوُّ البحث يقوله الكرتُ نفسه («لا مطابقون هنا») فلا سطرَ ثانٍ يعيده. */}
          <div className="org-coms">
            <Committee c={c} q={q} open onToggle={() => {}} edit={false} onMeta={() => {}} />
          </div>
        </>
      )}
    </>
  );
}
