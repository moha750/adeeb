"use client";

/**
 * سِجلُّ المحادثات — **ورقةٌ تصعد من القاع، هي ورقةُ التنقّل بعينها** (أمرُ المالك
 * ٢٠٢٦-٠٨-٢٠: «اجعلها تأتي من الأسفل مثل navbar»).
 *
 * وهي `.mnsh` نفسُها التي أقرّها للوحة: لوحٌ مذهّبٌ منقوشٌ يصعد من القاع، **بمقبضٍ
 * يُسحَب** فيُغلق، وحجابٍ **يعمّ الشاشة كلَّها** (ثابتٌ لا ابنُ الغرفة، فلا يقف عند رأس
 * الموقع كما وقف حجابُ المحاولة الأولى فبدا نصفَ ظلام).
 *
 * وقبلها أربعُ هيئاتٍ أُعدمت: لوحٌ أبيضُ منسدل · صفٌّ في الشريط · كروتٌ في الترحيب ·
 * جزيرةٌ من اليمين. ولا يبقى منها سطر.
 *
 * **وفعلُ الصفّ حذفٌ من كلّ مكان** (كلمةُ المالك ٢٠٢٦-٠٨-٢٠): يذهب الصفُّ ورسائلُه ولا
 * يبقى له أثرٌ في غرفة اللوحة. وجُرّب في اليوم نفسِه إخفاءٌ يُبقيها للنادي فنُقض.
 */

import { useRef } from "react";
import { ChatsCircle } from "@phosphor-icons/react";
import { Button } from "@adeeb/design-system";
import { Plus, Trash, X } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import type { ConversationRow } from "./actions";

/** الزمنُ رأسُ مجموعةٍ لا حاشيةَ صفّ: يُقال مرّةً لعشرةٍ لا عشرَ مرّات. */
function groupByDay(rows: ConversationRow[], todayKey: string): Array<[string, ConversationRow[]]> {
  const order = ["اليوم", "أمس", "آخر سبعة أيّام", "هذا الشهر", "أقدم"];
  const buckets = new Map<string, ConversationRow[]>();
  for (const r of rows) {
    const days = daysBetweenKeys(clubDayKey(r.lastAt), todayKey);
    const label = days <= 0 ? "اليوم" : days === 1 ? "أمس" : days <= 7 ? "آخر سبعة أيّام" : days <= 31 ? "هذا الشهر" : "أقدم";
    const list = buckets.get(label);
    if (list) list.push(r);
    else buckets.set(label, [r]);
  }
  return order.filter((l) => buckets.has(l)).map((l) => [l, buckets.get(l)!]);
}

export function DeeboIsle({
  rows,
  open,
  todayKey,
  openId,
  onClose,
  onOpen,
  onDelete,
  onNew,
}: {
  rows: ConversationRow[];
  open: boolean;
  /** مفتاحُ اليوم يأتي من الفاتح لا يُحسب في الرسم: الخادمُ والمتصفّح يرسمان سواءً. */
  todayKey: string;
  openId?: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  /** يفتح محادثةً جديدةً ويُغلق الورقة — بابُها ههنا لا في الشريط (أمرُ المالك). */
  onNew?: () => void;
  onDelete?: (id: string) => void;
}) {
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  /* **المقبضُ يُسحَب حقًّا** كما في ورقة اللوحة: يتبع الإصبعَ نزولًا، فإن جاوز خُمسَها أو
     90px أُغلقت وإلّا ارتدّت. والحركةُ تُكتب في `style` لا في حالةٍ تُرسَم: ستّون إطارًا
     في الثانية لا تُدار بإعادة رسمٍ لشجرة. */
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, dy: 0 };
    sheetRef.current?.classList.add("is-drag");
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    el.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    const { dy } = drag.current;
    drag.current = null;
    el.classList.remove("is-drag");
    el.style.transform = "";
    if (dy > Math.min(90, el.getBoundingClientRect().height * 0.2)) onClose();
  };

  /* **ولا `DuotoneZone` هنا** (أمرُ المالك ٢٠٢٦-٠٨-٢٠: «استثنِ أيقونتَي زائد وأكس»):
     المنطقةُ منقولةٌ عن ورقة اللوحة، وهي تُرجع كلَّ أيقونةٍ إلى وزن الموقع **ولو كانت في
     قائمة الاستثناء** — فعادت `+` و`×` duotone، وهما أوّلُ ما يُفسده. وورقتُنا لا تحتاجها
     أصلًا: أيقونةُ الصفّ (`ChatsCircle`) duotone بسياق الجذر، والثلاثةُ الباقية
     (`+` · `×` · السلّة) في قائمة الاستثناء فتبقى على وزنها. */
  return (
    <>
      {/* حجابُ ورقة التنقّل نفسُه: **ثابتٌ يعمّ الشاشة** فلا يقف عند رأس الموقع كما وقف
          حجابُ المحاولة الأولى فبدا نصفَ ظلام. */}
      <div className="mn-scrim" data-open={open} onClick={onClose} />
      <aside
        ref={sheetRef}
        className="ash-side mnsh dchs-isle"
        data-open={open}
        aria-label="مُحادثاتي مع ديبو"
        aria-hidden={!open}
      >
        {/* ولا `ash-canvas` هنا: النقشُ وشبكةُ الضوء رُسما لأرضٍ كحليّة، وسطحُنا صار
            زجاجَ الرأس الفاتح — فرسمٌ أبيضُ عليه لا يُرى، ولونٌ داكنٌ يُثقله. */}
        <div className="mnsh-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <i className="mnsh-grip" aria-hidden />
        </div>
        <div className="ash-brand">
          <span className="ash-mark" aria-hidden><ChatsCircle /></span>
          <b className="ash-name">مُحادثاتي</b>
          <button type="button" className="mnsh-x" aria-label="إغلاق محادثاتي" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="ash-rule" aria-hidden />

        {/* **بابُ البداية من جديد في صدر الورقة**: أوّلُ ما يُقصد فيها، وعُرفُ المحادثات
            أن يكون في رأس السِّجلّ لا في ذيله. وجلدُه جلدُ الزرّ من المكتبة. */}
        {onNew ? (
          <Button className="dchs-new" size="sm" onClick={onNew}>
            <Plus />
            محادثة جديدة
          </Button>
        ) : null}

        <nav className="ash-nav">
          {groupByDay(rows, todayKey).map(([when, list]) => (
            <div className="ash-group" key={when}>
              <div className="ash-nav-head">{when}</div>
              {list.map((c) => (
                <div className="dchs-row" key={c.id}>
                  <button
                    type="button"
                    className={"ash-i" + (c.id === openId ? " on" : "")}
                    onClick={() => {
                      onOpen(c.id);
                      onClose();
                    }}
                  >
                    <ChatsCircle />
                    <span className="lbl">{c.title || "محادثة"}</span>
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      className="dchs-row-x"
                      aria-label={`احذف: ${c.title || "محادثة"}`}
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* سطرُ القاع بنصّ المالك ٢٠٢٦-٠٨-٢٠، ولا يُقال إلّا لمن له ما يحذفه. */}
        {onDelete && rows.length > 0 ? (
          <p className="dchs-isle-note">حذفك للمحادثة يعني حذفها من كلّ مكان.</p>
        ) : null}
      </aside>
    </>
  );
}
