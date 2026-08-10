"use client";

// عميليّ لأيقونات Phosphor (`createContext` ممنوعٌ في الخادميّ) — وحالتُه الوحيدة عبورُ اللمعة.

import { useState } from "react";
import { Badge } from "@adeeb/design-system";
import { CalendarBlank, HourglassMedium, SealCheck } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { MEMBER_STATUS, type MemberStatus } from "@/lib/memberStatus";

export type MembershipCardProps = {
  name: string;
  /** المنصب الحاليّ — و`null` لمن لا تعيين نشطًا له. */
  role: string | null;
  status: MemberStatus;
  avatar?: string | null;
  gender?: "male" | "female" | null;
  joined: string;
  duration: string;
};

/**
 * **بطاقة العضويّة** — بطاقةُ هويّةٍ لا لوحةَ بيانات: نصفٌ علويٌّ بتدرّج الهوية ونقشها يحمل
 * الصورةَ والاسمَ والموضع، ونصفٌ سفليٌّ فاتحٌ يحمل الحقائق الثلاث (منذ متى · كم صارت · وحالتها).
 *
 * القسمة مقصودة: الغامق للهويّة والفاتح للبيانات — فالشارة والقيم تعيش على سطحٍ صُمّمت له
 * (`Badge` الناعمة تُقرأ فوق الفاتح ولا تصير مُلصَقًا فوق التدرّج).
 *
 * **والموضعُ يُقال بوحدته** (٢٠٢٦-٠٨-١٠، قرار المالك): «قائد لجنة الفعاليات» و«عضو لجنة
 * السفراء» لا «قائد» و«عضو» مجرّدتين — فالرتبةُ ووحدتُها مضافٌ ومضافٌ إليه، تُوصلان بمسافة
 * عبر `positionLine` (المصدر الواحد). وقبلها كانت الرتبةُ تخرج عاريةً لأنّ `roleTitle` لا
 * يُلحق الوحدةَ إلّا لدورٍ له لجنةٌ أمّ، فلم يكن يُعرف قائدُ أيِّ لجنةٍ هو.
 *
 * **ولا سلسلةَ انتماءٍ فوق الوحدة** (٢٠٢٦-٠٨-٠٨): لا مجلسَ ولا قسمَ فوق اللجنة — ذاك مقولٌ
 * في كرت «مسيرتي» تحتها وفي شجرة الهيكلة، ولا يُقال ثلاثَ مرّاتٍ في شاشةٍ واحدة.
 *
 * **ولا شعارَ عليها** (٢٠٢٦-٠٨-٠٨، قرار المالك): البطاقةُ داخل لوحةِ أديب، والشعارُ في ترويستها
 * فوقها — فوسمُ المالكِ لا يُعاد على متاعه في بيته.
 *
 * أنماطها `.mcard-*` بالمكتبة (`components.css`) ومعرضها `/ui/membership` — لا تنسيقَ شاردًا.
 *
 * واللمعة عبورٌ لا يُبتر: المرور يُشعلها، و`animationend` وحده يُطفئها. لو عُلّقت بـ`:hover`
 * لأُلغيت الحركة لحظةَ خروج المؤشّر فيختفي الشريط واقفًا في وسط السطح — وهذا ما يُقبِّحها.
 */
export function MembershipCard({ name, role, status, avatar, gender, joined, duration }: MembershipCardProps) {
  const st = MEMBER_STATUS[status];
  const [sheen, setSheen] = useState(false);
  return (
    <article
      className={sheen ? "mcard is-sheen" : "mcard"}
      onMouseEnter={() => setSheen(true)}
      // حدث الحركة يُطلَق على العنصر الأصل حاملًا اسم عنصره الزائف — فيُميَّز عن حركات المحتوى.
      onAnimationEnd={(e) => { if (e.animationName === "mcard-sheen") setSheen(false); }}
    >
      {/* الهيرو الآن صفٌّ واحدٌ لا غير: صورةٌ واسمٌ وموضع. ذهبت شرائحُ الانتماء ثمّ ذهب الشعار،
          فلم يبقَ ما يُوازَن — ولذلك لم يعد `space-between` بل تدفّقًا من جهة البدء. */}
      <div className="mcard-hero">
        <Avatar name={name} src={avatar ?? undefined} gender={gender} size="2xl" status={st.dot} className="mcard-av" />
        <div className="mcard-who">
          <h2 className="mcard-name">{name}</h2>
          <p className="mcard-role">{role ?? "لا منصب حاليّ"}</p>
        </div>
      </div>
      <dl className="mcard-facts">
        <div className="mcard-fact">
          <dt><CalendarBlank aria-hidden />عضوٌ منذ</dt>
          <dd>{joined || "غير مسجّل"}</dd>
        </div>
        <div className="mcard-fact">
          <dt><HourglassMedium aria-hidden />مدّة العضويّة</dt>
          <dd>{duration || "غير معروفة"}</dd>
        </div>
        <div className="mcard-fact">
          <dt><SealCheck aria-hidden />حالة العضويّة</dt>
          {/* شارةٌ بنقطةٍ ساكنة لا نابضة: الحالة تُقال هنا وعلى نقطة الأفتار، والنبضةُ ثالثةٌ
              متحرّكة في طرف العين — وللبطاقة حركتُها عند المرور. */}
          <dd><Badge tone={st.tone} variant="soft" dot>{st.label}</Badge></dd>
        </div>
      </dl>
    </article>
  );
}
