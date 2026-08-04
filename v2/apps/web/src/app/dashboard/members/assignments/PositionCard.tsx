"use client";

import { Badge, Card } from "@adeeb/design-system";
import { UserPlus } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { Holder, Position } from "../structure/model";
import { membershipLabel } from "./positionLabels";

/**
 * كرت المنصب — عرضُ منصبٍ قياديّ وحالته في تبويب «تعيين المناصب».
 * المنصب هو البطل (اسمٌ + نطاق)، ثمّ شارةُ المجلس والعضويّة مدموجةً،
 * وشريطُ شاغلٍ (أفتار + اسم + ⋯) أو نداءُ «شاغر» يفتح الإسناد. النغمةُ تقول الحالة:
 * brand = مشغول (هادئ) · danger = شاغر — أنماطُه في `.pcard-*` بالمكتبة (ق١، المسار الثاني).
 *
 * **`hero` — أيّ السطرين البطل:** الافتراض المنصب (شبكةٌ تعرض مناصب شتّى). أمّا حيث
 * يكون المنصب **واحدًا مكرّرًا** والنطاقُ هو المتغيّر — «توزيع الإشراف»: مقعدُ إدارةٍ
 * واحدةٍ على تسع لجان — فالبطلُ النطاق (`hero="scope"`). والدورُ حينئذٍ **يسقط لا يتزحزح**:
 * اسمُه وشارةُ عضويّته ثابتان على الكروت التسعة كلّها، وما لا يتغيّر عبر الشبكة لا يميّز
 * كرتًا عن كرت — يقوله عنوانُ الشاشة وفتاتُها مرّةً واحدة. فيبقى في الكرت ما يتغيّر:
 * اللجنةُ، والشاغلُ أو نداءُ «شاغر»، والنغمة.
 *
 * **المفرد والمتعدّد:** الشاغلون قائمةٌ لا واحد، و`p.singleton` (مصدره `roles.holder_uniqueness`)
 * يقول أيّ نداءٍ يُختم به الكرت: المفردُ المشغول لا نداء له (يُستبدَل من قائمته)، والمتعدّدُ
 * يبقى نداءُ الزيادة مفتوحًا مهما امتلأ. و`actions` دالّةٌ في الشاغل لا قائمةٌ للكرت:
 * حيث يجلس أكثر من شاغل، لكلٍّ إزالتُه.
 */
export function PositionCard({ position: p, actions, onAssign, hero = "role" }: { position: Position; actions: (holder: Holder) => MenuGroup[]; onAssign: () => void; hero?: "role" | "scope" }) {
  const filled = p.holders.length > 0;
  // المنصبُ واحدٌ مكرّرٌ عبر الشبكة: يسقط اسمُه وشارةُ عضويّته معًا (ثابتان لا يميّزان)
  const repeated = hero === "scope";
  return (
    <Card tone={filled ? "brand" : "danger"} className="pcard">
      <div className="pcard-id">
        <h3 className="pcard-role">{repeated ? p.scope : p.roleAr}</h3>
        {repeated ? null : <span className="pcard-scope">{p.scope}</span>}
      </div>

      {repeated ? null : (
        <div className="pcard-chips">
          {/* المجلس والعضويّة في شارةٍ واحدة؛ لونُها يتبع نغمة الكرت: info (فولاذيّ) مشغول · danger شاغر */}
          <Badge tone={filled ? "info" : "danger"} variant="soft">{membershipLabel(p)}</Badge>
        </div>
      )}

      {filled ? (
        <div className="pcard-holders">
          {p.holders.map((h) => {
            const groups = actions(h);
            return (
              <div key={h.userId} className="pcard-holder">
                <Avatar name={h.name} src={h.avatar ?? undefined} gender={h.gender} size="sm" />
                <span className="pcard-holder-name">{h.name}</span>
                {/* الكرت المشغول نغمته brand فقائمته بلا نغمة (فولاذيّ) — كما في كرت العضو والجدول */}
                {groups.length > 0 ? <DropdownMenu groups={groups} ariaLabel={`إجراءات ${h.name}`} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {!filled ? (
        <button type="button" className="pcard-vacant" onClick={onAssign}>
          <UserPlus aria-hidden /> شاغر — إسناد
        </button>
      ) : !p.singleton ? (
        <button type="button" className="pcard-vacant" onClick={onAssign}>
          <UserPlus aria-hidden /> إضافة شاغل
        </button>
      ) : null}
    </Card>
  );
}
