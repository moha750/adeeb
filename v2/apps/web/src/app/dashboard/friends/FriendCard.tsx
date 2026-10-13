"use client";

import { Button, Card } from "@adeeb/design-system";
import { ClockCounterClockwise, Phone, SquaresFour, UserCircleDashed, UserMinus, WhatsappLogo } from "@phosphor-icons/react";
import { waHref } from "@/lib/whatsapp";
import { Avatar } from "../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import type { FriendRow, Program } from "./data";

/**
 * **كرتُ الصديق** — بطاقةُ الهويّة مضطجعةً (`.acard-wide`) كرتُ سجلّ المتطوّعين نفسُه، لا كرتٌ ثالث.
 *
 * **ومتنُه بعد ملاحظات ٢٠٢٦-١٠-١٠**: كان فيه «البرامج» مرّتين (عددُها في الجنب وأسماؤها في المتن)
 * بعنوانٍ لا يقول أيُّها، فقُرئ «آخرَ برنامج»؛ و«آخرُ نشاط» يخلط المشاركةَ بالدخول وبفتح الحساب؛
 * وصفُّ جوّالٍ فارغٌ في كلّ كرتٍ بلا ملف. فصار:
 *   - الجنب: صفتُه، ووجهُه (وعلى حافّته «كان عضوًا»)، و«في أدِيب منذ» شهرَ حسابه وسنتَه.
 *   - المتن: **آخرُ مشاركة** (البرنامجُ وتاريخُه معًا)، و**شارك في** بعمقٍ يفرّق الحاضرَ من الحاجز،
 *     والجوّالُ لمن له جوّالٌ وحدَه. ومن لم يشارك بعدُ يقولها سطرٌ واحد لا سطران.
 */
/**
 * **الحقولُ ثابتةٌ في كلّ كرت** (المالك ٢٠٢٦-١٠-١٠: «البيانات تختلف من كارد إلى كارد… أريد توحيدها»):
 * ثلاثةُ صفوفٍ دائمًا (آخر مشاركة، شارك في، رقم الجوّال)، والفارغُ منها يُقال بلونٍ خافت.
 * وعُرض معها وجهُ «أعداد» (ثلاثةُ أرقامٍ لثلاثة برامج) فرفضه المالك: البرامجُ المقدَّمة للأصدقاء ستكثر
 * (والإذاعةُ قريبًا)، وخاناتُ أرقامٍ مسمّاةٍ بأسماء برامج لا تتّسع لها. «شارك في» نصٌّ يتّسع لأيّ برنامجٍ يُضاف.
 */
/**
 * **نصُّ «آخر مشاركة»** للكرت والجدول معًا. إن كانت فعاليّةً سُمّيت هي وفعلُه فيها («حضر: ملتقى …،
 * 3 أكتوبر»)، لأنّ «فعاليّات أدِيب» وحدَها لا تقول أين كان (المالك ٢٠٢٦-١٠-١٠: «الفعاليّات مبهمة جدًّا»).
 * وسائرُ البرامج تُقال باسمها وتاريخها.
 */
export function lastParticipation(f: FriendRow, programLabel: Record<Program, string>): string | null {
  const lp = f.lastProgram;
  if (!lp) return null;
  if (lp.event) {
    const she = f.gender === "female";
    const verb = lp.event.attended ? (she ? "حضرت" : "حضر") : (she ? "حجزت" : "حجز");
    return `${verb}: ${lp.event.title}، ${lp.date}`;
  }
  return `${programLabel[lp.program]}، ${lp.date}`;
}

/**
 * **علامةُ من لم يُكمل ملفَّه** (المالك ٢٠٢٦-١٠-١٠: «بلا ملف» مبهمةٌ نوعًا ما، وأريد علامةً أوضح):
 * وسامٌ تحت الصورة «لم يُكمل ملفّه»، في موضع «كان عضوًا» (لا يجتمعان: العضوُ السابق له ملف).
 * اختاره المالك (أ) من وجهين في `/ui/friend-card`؛ والآخرُ سطرٌ تحت البريد كان يُطيل كروتَ من لا ملفَّ
 * لهم وحدها فيختلف طولُ كرتين في صفٍّ واحد. والجنبُ «صديق أدِيب» كغيره: العلامةُ حالُ الملف، والصفةُ من هو.
 */
export function FriendCard({ f, programLabel, actions, onOpen }: {
  f: FriendRow; programLabel: Record<Program, string>; actions: MenuGroup[]; onOpen: () => void;
}) {
  const kind = f.gender === "female" ? "صديقة أدِيب" : "صديق أدِيب";
  const display = f.name ?? f.email;
  // **النغمةُ تعمّ الكرتَ كلَّه** (المالك ٢٠٢٦-١٠-١٠): كرتُ من لا ملفَّ له رصاصيٌّ بلا زرقةٍ واحدة
  const muted = !f.hasProfile;
  const last = lastParticipation(f, programLabel);
  const took = f.programs.map((p) => (f.depth[p] ? `${programLabel[p]} (${f.depth[p]})` : programLabel[p])).join("، ");
  return (
    <Card tone={muted ? "neutral" : "brand"} className="acard-wide">
      <div className="awide-rail">
        <span className="awide-kind">{kind}</span>
        <span className="awide-avw">
          <Avatar
            name={display}
            gender={f.gender}
            size="xl"
            className="awide-av"
            // وجهُ من لا ملفَّ له رسمُ «بلا ملف» لا حرفُ بريده (اختيارُ المالك ٢٠٢٦-١٠-١٠ في `/ui/friend-card`):
            // الحرفُ من بريدٍ أكثرُه عشوائيّ لا يقول شيئًا، والرسمُ يقول حالَ الحساب قبل أن يُقرأ الكرت
            icon={muted ? <UserCircleDashed /> : undefined}
          />
          {/* تحت الصورة لا فوقها (المالك ٢٠٢٦-١٠-١٠): موضعُ وسام كرت المتطوّع نفسُه */}
          {f.wasMember ? <span className="awide-part"><UserMinus aria-hidden />كان عضوًا</span> : null}
          {muted ? <span className="awide-part"><UserCircleDashed aria-hidden />لم يُكمل ملفّه</span> : null}
        </span>
        <span className="awide-wishwrap">
          <span className="awide-wish-lbl">في أدِيب منذ</span>
          <span className="awide-wish">{f.since || "غير معروف"}</span>
        </span>
      </div>

      <div className="awide-main">
        <div className="awide-top">
          <h4 className="awide-name" title={display}>
            {f.name ?? <span className="lat" dir="ltr">{f.email}</span>}
          </h4>
          {actions.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}><DropdownMenu groups={actions} tone={muted ? "neutral" : undefined} /></span>
          ) : null}
        </div>

        <div className="acard-info">
          <div className="acard-info-row">
            <span className="acard-ic"><ClockCounterClockwise aria-hidden /></span>
            <span className="acard-info-txt">
              <span className="acard-info-label">آخر مشاركة</span>
              {last
                ? <span className="acard-info-val" title={last}>{last}</span>
                : <span className="acard-info-val na">لم يشارك بعد</span>}
            </span>
          </div>
          <div className="acard-info-row">
            <span className="acard-ic"><SquaresFour aria-hidden /></span>
            <span className="acard-info-txt">
              <span className="acard-info-label">شارك في</span>
              {took
                ? <span className="acard-info-val" title={took}>{took}</span>
                : <span className="acard-info-val na">لا برامج بعد</span>}
            </span>
          </div>
          <div className="acard-info-row">
            <span className="acard-ic"><Phone aria-hidden /></span>
            <span className="acard-info-txt">
              <span className="acard-info-label">رقم الجوّال</span>
              {f.phone
                ? <span className="acard-info-val lat">{f.phone}</span>
                : <span className="acard-info-val na">غير مسجَّل</span>}
            </span>
          </div>
        </div>

        <div className="acard-foot">
          {f.phone ? (
            <div className="acard-foot-row">
              <Button variant="primary" size="sm" onClick={onOpen}>عرض الحساب</Button>
              <a className="abtn abtn-success abtn-sm" href={waHref(f.phone)} target="_blank" rel="noreferrer">
                <WhatsappLogo aria-hidden /> التواصل
              </a>
            </div>
          ) : (
            <Button variant={muted ? "neutral" : "primary"} size="sm" onClick={onOpen}>عرض الحساب</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
