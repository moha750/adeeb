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
  /** سلسلة الانتماء من الأعلى: مجلس ← قسم ← لجنة. الفارغة تُسقِط الصفّ كلّه. */
  chain?: readonly string[];
  joined: string;
  duration: string;
};

/**
 * **بطاقة العضويّة** — بطاقةُ هويّةٍ لا لوحةَ بيانات: نصفٌ علويٌّ بتدرّج الهوية ونقشها يحمل
 * الشعار والصورة والاسم والموضع، ونصفٌ سفليٌّ فاتحٌ يحمل الحقائق الثلاث (منذ متى · كم صارت · وحالتها).
 *
 * القسمة مقصودة: الغامق للهويّة والفاتح للبيانات — فالشارة والقيم تعيش على سطحٍ صُمّمت له
 * (`Badge` الناعمة تُقرأ فوق الفاتح ولا تصير مُلصَقًا فوق التدرّج)، والشرائح الزجاجيّة تبقى للغامق
 * كما في ترويسات المجالس ونمط `acard-header-solid` — كلٌّ في موضعه من الهويّة.
 *
 * أنماطها `.mcard-*` بالمكتبة (`components.css`) ومعرضها `/ui/membership` — لا تنسيقَ شاردًا.
 *
 * واللمعة عبورٌ لا يُبتر: المرور يُشعلها، و`animationend` وحده يُطفئها. لو عُلّقت بـ`:hover`
 * لأُلغيت الحركة لحظةَ خروج المؤشّر فيختفي الشريط واقفًا في وسط السطح — وهذا ما يُقبِّحها.
 */
export function MembershipCard({ name, role, status, avatar, gender, chain = [], joined, duration }: MembershipCardProps) {
  const st = MEMBER_STATUS[status];
  const [sheen, setSheen] = useState(false);
  return (
    <article
      className={sheen ? "mcard is-sheen" : "mcard"}
      onMouseEnter={() => setSheen(true)}
      // حدث الحركة يُطلَق على العنصر الأصل حاملًا اسم عنصره الزائف — فيُميَّز عن حركات المحتوى.
      onAnimationEnd={(e) => { if (e.animationName === "mcard-sheen") setSheen(false); }}
    >
      <div className="mcard-hero">
        <div className="mcard-top">
          {/* الشعار الأبيض — النسخة المخصّصة للأسطح الغامقة، لا تلوينَ لملوّن.
              ولا شريحةَ «بطاقة عضويّة» بجانبه: وسمٌ يقوله الشكلُ والشعارُ والتبويب، وكان
              يزاحم شرائح السلسلة بنفس زجاجها ووزنها — فيستوي الوسمُ والبيانات في العين. */}
          <img className="mcard-logo" src="/brand/logo-horizontal-white.svg" alt="نادي أديب" />
        </div>
        <div className="mcard-id">
          <Avatar name={name} src={avatar ?? undefined} gender={gender} size="2xl" status={st.dot} className="mcard-av" />
          <div className="mcard-who">
            <h2 className="mcard-name">{name}</h2>
            <p className="mcard-role">{role ?? "لا منصب حاليّ"}</p>
          </div>
          {/* سلسلة الانتماء في الطرف المقابل — «من أنت» في جانبٍ و«أين تجلس» في الآخر، فيتوازن
              السطح العريض بمحتوًى حقيقيّ لا بحشو. وبلا محرف فصلٍ محايد: (›) في سياقٍ عربيّ يأخذ
              اتّجاه الفقرة فيقفز طرفًا، فيقلب قراءة السلسلة — والترتيب والتجاور يقولانها. */}
          {chain.length ? (
            <ol className="mcard-chain">
              {chain.map((c) => <li key={c}>{c}</li>)}
            </ol>
          ) : null}
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
