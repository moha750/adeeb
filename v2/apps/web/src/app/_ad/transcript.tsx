"use client";

/**
 * **قطعةُ الحوار** (اختارها محمد ٢٠٢٦-١١-٠٧ من ثلاثة اتّجاهات في صفحة محادثةٍ حقيقيّة: «الفقاعات»، «أسهلُ بالقراءة»).
 * نصٌّ محكيٌّ بين طرفين يُقرأ من أوّله إلى آخره — لا `AdLog` (ذاك يقلب الأحدثَ أوّلًا) ولا سطورُ «حسابي» (تلك قيمٌ عريضةٌ لا كلامٌ يُقرأ).
 * - الطرفُ الآخر (`them`: السائل) ورقةٌ في جهة البداية، وطرفُنا (`us`: ديبو) قطعةٌ من اللوح في جهة النهاية — فرقٌ بالمادّة يصحّ في الوضعين.
 * - الاسمُ والوقتُ فوق الفقاعة، والوجهُ عند رأسها وركنُها الحادُّ إليه، و`flag` تنبيهٌ بجانب الاسم («حجب رقمًا»).
 * - النصُّ بوزن القراءة ويحفظ أسطرَه (`pre-line`). والوجهُ زينةٌ مخفيّةٌ عن قارئ الشاشة، فالاسمُ بعده يكفي ولا يُقرأ مرّتين.
 * والـCSS: `ad.css` قسم «قطعةُ الحوار» (`.ad-tsc-*`).
 */
import type { ReactNode } from "react";

export type AdTurn = {
  id: string | number;
  side: "them" | "us";
  /** الوجه: صورةٌ دائريّة (`img`) أو `Avatar` */
  face: ReactNode;
  who: string;
  when: string;
  /** تنبيهٌ بجانب الاسم: رمزٌ وكلمة */
  flag?: ReactNode;
  text: string;
  /** فعلُ الفقاعة في سطر اسمها («حذف» التعليق) — زرُّ الأيقونة وحدها (مختبر محرّر الخبر ٢٠٢٦-١١-١٣) */
  act?: ReactNode;
  /** فقاعةٌ لا يراها أحد (تعليقٌ لم يُنشر): خافتةٌ عن جاراتها */
  muted?: boolean;
};

/** `bare`: الحوارُ وحده داخل قسمٍ يسمّيه (قسمُ «حديث الغرفة» في محرّر الخبر)، لا قسمٌ في قسم */
export function AdTranscript({ icon, title, turns, bare }: { icon: ReactNode; title: string; turns: AdTurn[]; bare?: boolean }) {
  const list = (
      // `role="list"`: سفاري يُسقط معنى القائمة عن `ol` بلا ترقيم
      <ol className="ad-tsc-list" role="list" aria-label={bare ? title : undefined}>
        {turns.map((t) => (
          <li key={t.id} className="ad-tsc-turn" data-side={t.side} data-muted={t.muted || undefined}>
            <span className="ad-tsc-face" aria-hidden>{t.face}</span>
            <div className="ad-tsc-body">
              {/* المسافاتُ بين الأجزاء للنسخ وقارئ الشاشة، وفجوةُ المرن لا تعدّها */}
              <p className="ad-tsc-who">
                <b>{t.who}</b>{" "}<span>{t.when}</span>
                {t.flag ? <>{" "}<span className="ad-tsc-flag">{t.flag}</span></> : null}
                {t.act ? <span className="ad-tsc-act">{t.act}</span> : null}
              </p>
              <p className="ad-tsc-text">{t.text}</p>
            </div>
          </li>
        ))}
      </ol>
  );
  if (bare) return <div className="ad-tsc" data-bare="">{list}</div>;
  return (
    <section className="ad-sec ad-tsc" aria-label={title}>
      <header className="ad-sec-head">
        <span className="ad-sec-ic" aria-hidden>{icon}</span>
        <span className="ad-sec-t"><h2>{title}</h2></span>
      </header>
      {list}
    </section>
  );
}
