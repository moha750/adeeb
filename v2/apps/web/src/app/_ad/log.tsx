"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdBadge, AdButton, AdInfo, type AdMeta, type AdTone } from "./primitives";
import { dayName, fmtClock, fmtDayFull, localDay } from "./format";

/**
 * **سجلُّ الأحداث** (محمد ٢٠٢٦-١١-٠٢: «إذا ترى أن نحتاج أن نصمّم سجلّ الأحداث فبسم الله»): ما جرى، مَن فعله، ومتى — لا سجلّاتٌ
 * تُدار بل وقائعُ تُقرأ، الأحدثُ أوّلًا. والمتكرّرُ المتتالي (`same`) سطرٌ واحدٌ بعدده («4 مرّات»).
 * كان «ما الذي جرى» جدولًا بستّة أعمدة — المعلومةُ نفسُها، لكنّ الجدولَ يقرأ كلَّ عمودٍ وحده، والواقعةُ جملةٌ تُقرأ مرّةً.
 *
 * **وشكلُه سطورُ الهويّة** (`.ad-line`، قرار محمد ٢٠٢٦-١١-٢٠ بعد مقارنةٍ على سجلّ انتخابٍ حقيقيّ: «أريح للعين وأفضل للقراءة»)، كـ«رحلة
 * ترشّحك»، لا الخطُّ الزمنيّ بكعوب الأيّام الذي كان قبله: فلا يبقى للسجلّ شكلان في الموقع. كلُّ يومٍ شريطٌ هادئ («الأحد، 16 أغسطس 2026»
 * وعددُ أحداثه)، والواقعةُ تحته: رمزُ نوعها بنغمته في مربّعه، ثمّ جملتُها، ثمّ الفاعلُ والملاحظةُ **كلٌّ بأيقونته** — وهو ما أبقاه محمد
 * من الخطّ الزمنيّ («طريقة عرض الوقت وبيد الشخص أجمل») — والساعةُ وحدها في طرف السطر، فتُقرأ عمودًا تحت شريط اليوم.
 */
export type AdLogEvent = {
  /** رمزُ نوع الواقعة في نقطتها */
  icon: ReactNode;
  /** نغمةُ نوعها: ما يغيّر ما يراه الناس `warn`، والهدمُ `bad` */
  tone?: AdTone;
  /**
   * اسمُ نوعها («بدّل الوجهة») شارةً بجانب ما وقعت عليه. **ويُترك في سجلّ الشيء الواحد** (سجلّ الخبر، سجلّ الانتخاب، نسخُ
   * الشخصيّة): هناك العنوانُ نفسُه جملةُ الواقعة («نُشر الخبر»)، فالشارةُ بجانبه تكرارٌ («نشر») — والنوعُ يقوله رمزُ النقطة ونغمتُها.
   */
  label?: string;
  /** ما وقعت عليه («صورة التسول») */
  title: ReactNode;
  /** ما تغيّر — جملةٌ قد تخلط العربيّةَ باللاتينيّة، فهي عقدةٌ لا نصّ */
  change?: ReactNode;
  changeIcon?: ReactNode;
  /** بقيّةُ السطر: مَن فعلها وما يشبهه */
  meta?: AdMeta[];
  /** حالُها بجانب نوعها (تنبيهٌ أُرسل، رسالةٌ وصلت) */
  side?: ReactNode;
  /** فعلُها الوحيد إن كان («الملف الجديد») — آخرَ سطر المعلومات */
  open?: { label: string; icon?: ReactNode; href?: string; onClick?: () => void };
  /** أو أفعالُها على قاعدة الأفعال (`AdActs`: الأساسيُّ ظاهر، وفعلٌ واحدٌ باسمه، وفعلان فأكثر في «المزيد») — سطرٌ تحت المعلومات */
  acts?: ReactNode;
};

const AR_TIMES: ArForms = ["مرّةً واحدة", "مرّتان", "مرّات", "مرّةً"];

/**
 * السجلُّ قسمٌ في صفحة: `title` و`icon` رأسُه و`empty` فراغُه («ما الذي جرى» تحت الباركودات)، وبلا رأسٍ حيث يسمّيه ما حوله.
 * **ولا رابطَ فيه** (محمد ٢٠٢٦-١١-٠٢): ما يُفتح إلى صفحته سجلٌّ في قائمة السجلّات لا واقعةٌ هنا.
 */
export function AdLog<T>({ title, icon, items, at, idOf, event, same, noun, now, empty, bare, total, more, foot }: {
  title?: string;
  icon?: ReactNode;
  items: T[];
  at: (item: T) => string;
  idOf: (item: T) => string;
  event: (item: T) => AdLogEvent;
  /** أهذه تكرارٌ لتلك؟ (النوعُ نفسُه على الشيء نفسِه بيد الشخص نفسِه، ولا تغييرَ يُقال) — فتُطوى في سطرٍ بعددها */
  same?: (a: T, b: T) => boolean;
  noun: ArForms;
  /** ساعةُ الطلب (`requestNow`) لا ساعةُ الجهاز: «اليوم» في الخادم هو «اليوم» بعد الإماهة */
  /** **قاعُ القسم لفعلٍ نادرٍ لا رجعة فيه** («إلغاء الانتخاب»، كالانسحاب في قاع «رحلة ترشّحك»): تحت السجلّ لا في رأس الصفحة */
  foot?: ReactNode;
  now: number;
  empty?: { title: string; text: string };
  /** بلا ورقةٍ ولا إطار: السجلُّ داخل إطارٍ آخر (بندُ درج، نافذة) فلا يكون إطارًا في إطار */
  bare?: boolean;
  /** عددُ الرأس حين يُعرض بعضُ السجلّ (`more`): الكلُّ لا المعروض */
  total?: number;
  /** ذيلٌ داخل السجلّ تحت سطوره («عرض بقيّة السجلّ») */
  more?: ReactNode;
}) {
  const days = useMemo(() => {
    const sorted = [...items].sort((a, b) => +new Date(at(b)) - +new Date(at(a)));
    const out: { key: string; iso: string; runs: T[][] }[] = [];
    for (const it of sorted) {
      const key = localDay(+new Date(at(it)));
      let day = out[out.length - 1];
      if (day?.key !== key) out.push((day = { key, iso: at(it), runs: [] }));
      const run = day.runs[day.runs.length - 1];
      if (run && same?.(run[run.length - 1], it)) run.push(it);
      else day.runs.push([it]);
    }
    return out;
  }, [items, at, same]);
  const lines = (
    <ul className="ad-lines ad-log">
      {days.map((d) => (
        <Fragment key={d.key}>
          {/* عنوانُ اليوم شريطٌ هادئ: يُعرَف به أين يبدأ يومٌ في عشرين حدثًا، ولا يزاحم كعبَ التذكرة في رأس الصفحة */}
          <li className="ad-log-day">
            <span>{`${dayName(d.iso, now)}، ${fmtDayFull(d.iso)}`}</span>
            <small>{arCount(d.runs.reduce((n, r) => n + r.length, 0), noun)}</small>
          </li>
          {d.runs.map((run) => {
            const it = run[0];
            const e = event(it);
            return (
              <li key={idOf(it)} className="ad-line">
                <div className="ad-line-hit">
                  <span className="ad-line-ic" data-tone={e.tone === "neutral" ? undefined : e.tone} aria-hidden>{e.icon}</span>
                  <span className="ad-line-kv">
                    <span className="ad-line-v ad-log-v">
                      <span>{e.title}</span>
                      {e.label && <AdBadge tone={e.tone}>{e.label}</AdBadge>}
                      {run.length > 1 && <span className="ad-log-times">{arCount(run.length, AR_TIMES)}</span>}
                      {e.side}
                    </span>
                    {/* **كلُّ معلومةٍ بأيقونتها** كما كان في الخطّ الزمنيّ (محمد ٢٠٢٦-١١-٢٠: «طريقة عرض… بيد الشخص أجمل»): الفاعلُ
                        والملاحظةُ في سطر المعلومات نفسِه، لا جملةً رماديّةً واحدة يُضغط فيها كلُّ شيء */}
                    {(e.change || (e.meta && e.meta.length > 0)) && (
                      <span className="ad-row-sub ad-log-sub">
                        {e.change && <span className="ad-row-info">{e.changeIcon}<span>{e.change}</span></span>}
                        {e.meta?.map((m) => <AdInfo key={m.text} m={m} />)}
                      </span>
                    )}
                  </span>
                  {/* والساعةُ في طرف السطر وحدها: تُقرأ عمودًا واحدًا تحت شريط اليوم */}
                  <time className="ad-log-at" dateTime={at(it)}>{fmtClock(at(it))}</time>
                </div>
                {(e.open || e.acts) && (
                  <div className="ad-log-acts">
                    {e.open && (e.open.href ? (
                      <a className="ad-btn ad-btn-soft ad-btn-sm" href={e.open.href} target="_blank" rel="noreferrer">{e.open.icon}{e.open.label}</a>
                    ) : (
                      <AdButton variant="soft" size="sm" icon={e.open.icon} onClick={e.open.onClick ?? (() => undefined)}>{e.open.label}</AdButton>
                    ))}
                    {e.acts}
                  </div>
                )}
              </li>
            );
          })}
        </Fragment>
      ))}
    </ul>
  );
  const body = days.length === 0 && empty ? (
    <div className="ad-log-empty"><strong>{empty.title}</strong><span>{empty.text}</span></div>
  ) : lines;
  if (bare) return <div className="ad-log-bare">{body}{more && <div className="ad-log-more">{more}</div>}</div>;
  return (
    <section className="ad-sec" aria-label={title}>
      {title && (
        <header className="ad-sec-head">
          <span className="ad-sec-ic" aria-hidden>{icon}</span>
          <span className="ad-sec-t">
            <h2>{title}</h2>
            {(total ?? items.length) > 0 ? <p>{arCount(total ?? items.length, noun)}</p> : null}
          </span>
        </header>
      )}
      {body}
      {more && <div className="ad-sec-foot ad-log-more">{more}</div>}
      {foot ? <div className="ad-sec-foot ad-elw-pg-acts">{foot}</div> : null}
    </section>
  );

}
