"use client";

import { Badge, Card } from "@adeeb/design-system";
import { UserPlus, UserSwitch } from "@phosphor-icons/react";
import { fmtDayMonth } from "@/lib/dates";
import { firstNameOf } from "@/lib/personName";
import { Avatar } from "../../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { Holder, Position } from "../structure/model";
import { membershipLabel } from "./positionLabels";

/** ما يُقال عن الشاغل إن كان تكليفًا أو أصيلًا مجمَّدًا (20261010)، وإلّا لا شيء. */
export function holderNote(h: Holder): string | null {
  if (h.acting) {
    if (h.acting.awaits) return `تكليفًا حتى عودة ${firstNameOf(h.acting.awaits)}`;
    return h.acting.until ? `تكليفًا حتى ${fmtDayMonth(h.acting.until)}` : "تكليفًا";
  }
  if (h.frozen) return h.frozen.until ? `مجمَّد حتى ${fmtDayMonth(h.frozen.until)}` : "مجمَّد";
  return null;
}

/**
 * كرت المنصب — منصبٌ وحالته في شبكة مقاعد. كان كرتَ تبويب «تعيين المناصب» حتى ٢٠٢٦-١٠-١٠، ثمّ صار
 * التبويبُ لوحةَ مقاعد (`SeatBoard`)، وبقي الكرتُ لـ«توزيع الإشراف» في «إدارتي» (`hero="scope"`).
 * المنصب هو البطل (اسمٌ + نطاق)، ثمّ شارةُ المجلس والعضويّة مدموجةً،
 * وشريطُ شاغلٍ (أفتار + اسم + ⋯) أو نداءُ «شاغر» يفتح الإسناد. النغمةُ تقول الحالة:
 * brand = مشغول (هادئ) · warning = محجوزٌ لصاحبه المجمَّد · danger = شاغر — أنماطُه في `.pcard-*` بالمكتبة.
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
 *
 * **التكليف (20261010):** المكلَّفُ شاغلٌ كالأصيل، تحت اسمه «تكليفًا حتى …». والأصيلُ المجمَّد
 * يبقى في كرت مقعده خافتًا «مجمَّد حتى …»، والمقعدُ محجوزٌ له: لا إسناد فيه، بل تكليفٌ حتى يعود.
 * ونداءُ «تكليف» بجانب نداء الإسناد حيث يقبله المقعد (`p.actable`) وتمرّر الشاشةُ `onAct`.
 */
export function PositionCard({ position: p, actions, onAssign, onAct, hero = "role" }: {
  position: Position;
  actions: (holder: Holder) => MenuGroup[];
  onAssign: () => void;
  onAct?: () => void;
  hero?: "role" | "scope";
}) {
  const sitting = p.holders.filter((h) => !h.frozen);
  const reserved = p.holders.some((h) => h.frozen);
  const filled = sitting.length > 0;
  // المنصبُ واحدٌ مكرّرٌ عبر الشبكة: يسقط اسمُه وشارةُ عضويّته معًا (ثابتان لا يميّزان)
  const repeated = hero === "scope";
  const tone = filled ? "brand" : reserved ? "warning" : "danger";
  // والتكليف على مقعدٍ شاغر وحده (أو محجوزٍ لصاحبه)، والمتعدّد يقبله مهما امتلأ
  const act = !!onAct && p.actable && (!filled || !p.singleton);
  // المحجوزُ لا يُسنَد إسنادًا دائمًا: التكليف وحده حتى يعود صاحبه
  const assignable = !reserved && (!filled || !p.singleton);
  // المجمَّد أوّلًا (صاحبُ المقعد)، ثمّ من يجلس فيه
  const rows = [...p.holders.filter((h) => h.frozen), ...sitting];
  return (
    <Card tone={tone} className="pcard">
      <div className="pcard-id">
        <h3 className="pcard-role">{repeated ? p.scope : p.roleAr}</h3>
        {repeated ? null : <span className="pcard-scope">{p.scope}</span>}
      </div>

      {repeated ? null : (
        <div className="pcard-chips">
          {/* المجلس والعضويّة في شارةٍ واحدة؛ لونُها يتبع نغمة الكرت */}
          <Badge tone={tone === "brand" ? "info" : tone} variant="soft">{membershipLabel(p)}</Badge>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="pcard-holders">
          {rows.map((h) => {
            const groups = h.frozen ? [] : actions(h);
            const note = holderNote(h);
            return (
              <div key={`${h.userId}-${h.rowId ?? ""}`} className={"pcard-holder" + (h.frozen ? " is-frozen" : "")}>
                <Avatar name={h.name} src={h.avatar ?? undefined} gender={h.gender} size="sm" />
                <span className="pcard-holder-id">
                  <span className="pcard-holder-name">{h.name}</span>
                  {note ? <span className="pcard-holder-note">{note}</span> : null}
                </span>
                {groups.length > 0 ? <DropdownMenu groups={groups} ariaLabel={`إجراءات ${h.name}`} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {assignable || act ? (
        <div className="pcard-acts">
          {assignable ? (
            <button type="button" className="pcard-vacant" onClick={onAssign}>
              <UserPlus aria-hidden /> {filled ? "إضافة شاغل" : act ? "إسناد" : "شاغر، إسناد"}
            </button>
          ) : null}
          {act ? (
            <button type="button" className="pcard-vacant" onClick={onAct}>
              <UserSwitch aria-hidden /> تكليف
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
