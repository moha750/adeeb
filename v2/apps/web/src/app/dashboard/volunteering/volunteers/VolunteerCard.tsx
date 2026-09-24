"use client";

import { Button, Card } from "@adeeb/design-system";
import { CalendarBlank, HandHeart, ListNumbers, Phone, SignIn } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { VolunteerRow } from "../data";

function menu(v: VolunteerRow, onEnd: () => void): MenuGroup[] {
  return v.status === "former"
    ? []
    : [{ items: [{ label: "إنهاءُ التطوّع", icon: <HandHeart size={18} />, danger: true, onSelect: onEnd }] }];
}

/**
 * **كرتُ المتطوّع — بطاقةُ الهويّة مضطجعةً** (`.acard-wide`)، أقرّها المالك ٢٠٢٦-٠٩-٢٤ من
 * ستّة توجّهاتٍ عُرضت حيّةً في `/ui/volunteer-card`، وأُعدمت الخمسةُ الباقيةُ بأصنافها.
 *
 * اللغةُ لغةُ كرت العضو (`.acard-profile`) حرفًا بحرف — الشريطُ المنقوشُ بتدرّج النغمة،
 * والصورةُ بطوقها، وصفوفُ الأيقونات المؤطَّرة، وقدمٌ ببابيه — **والمحورُ وحدَه انقلب**:
 * الشريطُ عمودٌ رأسيٌّ في الطرف لا سقفًا، فيُمسح الكشفُ الطويلُ بالعين مسحًا رأسيًّا.
 *
 * والجنبُ **ثلاثُ مناطق**: صفتُه في الأعلى، ووجهُه يتوسّط ما بين الطرفين مهما طال الكرت،
 * ورغبتُه الأولى في القاع على شعرةٍ تفصلها. والنغمةُ **تعمّ الكرتَ كلَّه** لا سطحَه وحدَه:
 * الوهجُ ومربّعُ الأفتار والرقاقاتُ والحبرُ والتذييل، كلُّها تقرأ `--card-t/--card-grad`
 * بالارتداد — فكرتُ السابق رصاصيٌّ بلا زرقةٍ واحدة، والسارِي على هويّته بلا تغيير.
 */
export function VolunteerCard({ v, onOpen, onGrant, onEnd, avatar = "grad" }: {
  v: VolunteerRow; onOpen: () => void; onGrant: () => void; onEnd: () => void;
  /** سطحُ الأفتار : تدرّجُ النغمة، أو أبيضُ بوجهٍ محبَّر — يُقارَنان في `/ui/volunteer-card`. */
  avatar?: "grad" | "light";
}) {
  const groups = menu(v, onEnd);
  const next = v.prefs.slice(1);
  const former = v.status === "former";
  return (
    <Card tone={former ? "neutral" : "brand"} className="acard-wide">
      <div className="awide-rail">
        {/* صفتُه فوق وجهه (بأمره) : «متطوّع أدِيب»، وللسابق صفتُه الصادقة */}
        <span className="awide-kind">{former ? "متطوّعٌ سابق" : "متطوّع نشط"}</span>
        <Avatar name={v.name} src={v.avatarUrl ?? undefined} gender={v.gender} size="xl" className={"awide-av" + (avatar === "light" ? " awide-av-light" : "")} />
        {/* رغبتُه الأولى لافتةً تحت الصورة، وفوقها تسميتُها : الجنبُ يقول الهويّةَ كاملةً */}
        {v.prefs[0] ? (
          <span className="awide-wishwrap">
            <span className="awide-wish-lbl">الرغبةُ الأولى</span>
            <span className="awide-wish" title={v.prefs[0].name}>{v.prefs[0].name}</span>
          </span>
        ) : (
          <span className="awide-wish na">بلا رغبات</span>
        )}
      </div>

      <div className="awide-main">
        <div className="awide-top">
          <h4 className="awide-name" title={v.name}>{v.name}</h4>
          {groups.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}><DropdownMenu groups={groups} /></span>
          ) : null}
        </div>

        {/* ترتيبُ الصفوف بأمره : الجوّالُ ثمّ الرغباتُ التالية ثمّ آخرُ دخول (والمدينةُ خرجت) */}
        <div className="acard-info">
          <div className="acard-info-row">
            <span className="acard-ic"><Phone aria-hidden /></span>
            <span className="acard-info-txt">
              <span className="acard-info-label">رقم الجوّال</span>
              {v.phone
                ? <span className="acard-info-val lat">{v.phone}</span>
                : <span className="acard-info-val na">غير متوفّر</span>}
            </span>
          </div>
          <div className="acard-info-row">
            <span className="acard-ic"><ListNumbers aria-hidden /></span>
            <span className="acard-info-txt">
              <span className="acard-info-label">رغباتُه التالية</span>
              {next.length
                ? <span className="acard-info-val" title={next.map((p, i) => `${i + 2}. ${p.name}`).join("، ")}>
                    {next.map((p, i) => `${i + 2}. ${p.name}`).join("، ")}
                  </span>
                : <span className="acard-info-val na">لا رغبةَ بعدها</span>}
            </span>
          </div>
          <div className="acard-info-row">
            <span className="acard-ic">{former ? <CalendarBlank aria-hidden /> : <SignIn aria-hidden />}</span>
            <span className="acard-info-txt">
              <span className="acard-info-label">{former ? "سببُ انتهاء التطوّع" : "آخرُ دخول"}</span>
              {former
                ? (v.endReason
                    ? <span className="acard-info-val" title={v.endReason}>{v.endReason}</span>
                    : <span className="acard-info-val na">غير مذكور</span>)
                : (v.lastSignInAt
                    ? <span className="acard-info-val">{v.lastSignInAt}</span>
                    : <span className="acard-info-val na">لم يدخل قطّ</span>)}
            </span>
          </div>
        </div>

        <div className="acard-foot">
          {former ? (
            <Button variant="neutral" size="sm" onClick={onOpen}>السجلُّ الكامل</Button>
          ) : (
            <div className="acard-foot-row">
              <Button variant="primary" size="sm" onClick={onGrant}>إهداءُ العضويّة</Button>
              <Button variant="ghost" size="sm" onClick={onOpen}>السجلُّ الكامل</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
