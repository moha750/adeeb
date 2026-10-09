"use client";

import { Button, Card } from "@adeeb/design-system";
import { CalendarBlank, Certificate, HandHeart, ListNumbers, Phone, SignIn } from "@phosphor-icons/react";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { Avatar } from "../../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { VolunteerRow } from "../data";

/** «شارك مرّةً واحدة» · «مرّتين» · «3 مرّات» · «11 مرّةً» */
const AR_TIMES: ArForms = ["مرّةً واحدة", "مرّتين", "مرّات", "مرّةً"];
/** «نال شهادةً واحدة» · «شهادتين» · «3 شهادات» · «11 شهادةً» (منصوبةٌ بالفعل) */
const AR_CERTS_ACC: ArForms = ["شهادةً واحدة", "شهادتين", "شهادات", "شهادةً"];

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
export function VolunteerCard({ v, onOpen, onGrant, onEnd }: {
  v: VolunteerRow; onOpen: () => void; onGrant?: () => void; onEnd: () => void;
}) {
  const groups = menu(v, onEnd);
  const next = v.prefs.slice(1);
  const former = v.status === "former";
  // **كم مرّةً شارك** (المالك ٢٠٢٦-١٠-٠٣): فرصٌ أُكّد حضورُه فيها، تُعدّ بالفرصة لا بالفترة (فترتان من فرصةٍ مشاركةٌ واحدة)،
  // كما تُعدّ الشهادة. ومن لم يشارك قطّ لا يحمل شيئًا، فيتميّز المشاركُ في كشفٍ أكثرُه لم يشارك بعد.
  const times = new Set(v.apps.filter((a) => a.status === "accepted" && a.attendance === "attended").map((a) => a.opportunityId)).size;
  return (
    <Card tone={former ? "neutral" : "brand"} className="acard-wide">
      <div className="awide-rail">
        {/* صفتُه فوق وجهه (بأمره) : «متطوّع أدِيب»، وللسابق صفتُه الصادقة */}
        <span className="awide-kind">{former ? "متطوّعٌ سابق" : "متطوّع نشط"}</span>
        {/* وساما الصورة كشارة المستوى في البطاقات، أبيضان على الجنب الداكن: الشهاداتُ النافذةُ على حافّتها العليا
            (المالك ٢٠٢٦-١٠-٠٣: «كذلك أريد للشهادة»)، والمشاركاتُ على السفلى. ومن لم ينل شيئًا لا يحمل وسامَه */}
        <span className="awide-avw">
          {v.certificates ? <span className="awide-part is-cert"><Certificate aria-hidden />{`نال ${arCount(v.certificates, AR_CERTS_ACC)}`}</span> : null}
          <Avatar name={v.name} src={v.avatarUrl ?? undefined} gender={v.gender} size="xl" className="awide-av" />
          {times ? <span className="awide-part"><HandHeart aria-hidden />{`شارك ${arCount(times, AR_TIMES)}`}</span> : null}
        </span>
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
              {/* الطابعُ بساعته يُبتر على الجوّال بـ«…» — **ويبقى بأمر المالك ٢٠٢٦-٠٩-٢٦**:
                  البترُ دلالةُ تكملةٍ وبابُها «السجلُّ الكامل»، لا نقصٌ يُخفى. فلا يُختصر
                  إلى تاريخٍ بلا ساعةٍ بحجّة الضيق. */}
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
              {onGrant ? <Button variant="primary" size="sm" onClick={onGrant}>إهداءُ العضويّة</Button> : null}
              <Button variant="ghost" size="sm" onClick={onOpen}>السجلُّ الكامل</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
