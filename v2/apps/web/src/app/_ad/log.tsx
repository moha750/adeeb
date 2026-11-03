"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdBadge, AdButton, AdDayTile, AdInfo, type AdMeta, type AdTone } from "./primitives";
import { dayName, fmtClock, localDay } from "./format";

/**
 * **سجلُّ الأحداث** (محمد ٢٠٢٦-١١-٠٢: «إذا ترى أن نحتاج أن نصمّم سجلّ الأحداث فبسم الله»): ما جرى، مَن فعله، ومتى — لا سجلّاتٌ
 * تُدار بل وقائعُ تُقرأ. فشكلُه **خطٌّ زمنيٌّ واحد** لا جدول: يمرّ بكعوب الأيّام (قطعةُ الجدول نفسُها: رقمُ اليوم وتحته شهرُه،
 * وبجانبها «اليوم» أو «أمس» أو «الخميس») وبنقاط الوقائع تحت كلّ يوم، الأحدثُ أوّلًا. الواقعةُ: ساعتُها في البداية، ورمزُ
 * نوعها في نقطتها بنغمته، ثمّ ما وقعت عليه بخطّ العنوان ونوعُها شارةً وحالُها بجانبه، وما تغيّر ومَن فعله تحته — **في عمودٍ
 * واحدٍ تقرؤه العينُ نازلةً** لا في طرفٍ بعيد. والمتكرّرُ المتتالي (`same`) سطرٌ واحدٌ بعدده («4 مرّات»).
 * كان «ما الذي جرى» جدولًا بستّة أعمدة — المعلومةُ نفسُها، لكنّ الجدولَ يقرأ كلَّ عمودٍ وحده، والواقعةُ جملةٌ تُقرأ مرّةً.
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
export function AdLog<T>({ title, icon, items, at, idOf, event, same, noun, now, empty, bare, total, more }: {
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
  now: number;
  empty?: { title: string; text: string };
  /** بلا ورقةٍ ولا إطار: السجلُّ داخل إطارٍ آخر (بندُ درج، نافذة) فلا يكون إطارًا في إطار */
  bare?: boolean;
  /** عددُ الرأس حين يُعرض بعضُ السجلّ (`more`): الكلُّ لا المعروض */
  total?: number;
  /** ذيلٌ داخل السجلّ تحت خطّه («عرض بقيّة السجلّ») */
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

  return (
    <section className="ad-log" data-bare={bare || undefined} aria-label={title}>
      {title && (
        <header className="ad-log-head">
          <span className="ad-log-head-icon" aria-hidden>{icon}</span>
          <h2 className="ad-log-title">{title}</h2>
          {(total ?? items.length) > 0 && <span className="ad-log-count">{arCount(total ?? items.length, noun)}</span>}
        </header>
      )}
      {days.length === 0 && empty ? (
        <div className="ad-log-empty">
          <strong>{empty.title}</strong>
          <span>{empty.text}</span>
        </div>
      ) : (
        <div className="ad-log-flow">
          {days.map((d) => (
            <Fragment key={d.key}>
              <h3 className="ad-log-row ad-log-day">
                <span className="ad-log-axis"><AdDayTile iso={d.iso} /></span>
                <span className="ad-log-day-l">
                  {dayName(d.iso, now)}
                  <span className="ad-log-day-n">{arCount(d.runs.reduce((n, r) => n + r.length, 0), noun)}</span>
                </span>
              </h3>
              <ol className="ad-log-list">
                {d.runs.map((run) => {
                  const it = run[0];
                  const e = event(it);
                  return (
                    <li key={idOf(it)} className="ad-log-row ad-log-item" data-tone={e.tone === "neutral" ? undefined : e.tone}>
                      <time className="ad-log-time" dateTime={at(it)}>{fmtClock(at(it))}</time>
                      <span className="ad-log-axis"><span className="ad-log-dot" aria-hidden>{e.icon}</span></span>
                      <div className="ad-log-body">
                        <div className="ad-log-line">
                          <span className="ad-log-obj">{e.title}</span>
                          {e.label && <AdBadge tone={e.tone}>{e.label}</AdBadge>}
                          {run.length > 1 && <span className="ad-log-times">{arCount(run.length, AR_TIMES)}</span>}
                          {e.side}
                        </div>
                        {(e.change || (e.meta && e.meta.length > 0) || e.open) && (
                          <span className="ad-row-sub">
                            {e.change && <span className="ad-row-info">{e.changeIcon}<span>{e.change}</span></span>}
                            {e.meta?.map((m) => <AdInfo key={m.text} m={m} />)}
                            {e.open && (e.open.href ? (
                              <a className="ad-btn ad-btn-soft ad-btn-sm" href={e.open.href} target="_blank" rel="noreferrer">{e.open.icon}{e.open.label}</a>
                            ) : (
                              <AdButton variant="soft" size="sm" icon={e.open.icon} onClick={e.open.onClick ?? (() => undefined)}>{e.open.label}</AdButton>
                            ))}
                          </span>
                        )}
                        {e.acts && <div className="ad-log-acts">{e.acts}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Fragment>
          ))}
        </div>
      )}
      {more && <div className="ad-log-more">{more}</div>}
    </section>
  );
}
