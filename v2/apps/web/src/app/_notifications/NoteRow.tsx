"use client";

import { fmtSince } from "@/lib/dates";
import type { InboxItem } from "@/lib/notifications/types";
import { ICONS } from "../dashboard/_shell/icons";

/**
 * **صفُّ الإشعار** — بلاطةُ القسم، ثمّ العنوانُ والمتنُ والوقت، ثمّ نقطةُ «لم يُقرأ» (`.ntf-row`).
 * رابطٌ إلى وِجهته، أو زرٌّ لإشعارٍ يتيمٍ لا وِجهةَ له (حُذف نوعُه من الدليل).
 *
 * والنقرُ العاديّ يمرّ بالمستدعي (يؤشّر «قُرئ» ويغلق اللوح ثمّ ينتقل)، أمّا النقرُ بمفتاحٍ (لسانٌ
 * جديد) فيُترك للمتصفّح كما هو: لا يُسرَق من المستخدم ما تعوّده.
 */
export function NoteRow({ item, onOpen }: { item: InboxItem; onOpen: (item: InboxItem) => void }) {
  const Icon = ICONS[item.icon] ?? ICONS.gear;
  const inner = (
    <>
      <span className="ntf-ic">
        <Icon />
      </span>
      <span className="ntf-tx">
        <span className="ntf-t">{item.title}</span>
        {item.body && <span className="ntf-b">{item.body}</span>}
        <span className="ntf-when" suppressHydrationWarning>
          {fmtSince(item.at)}
        </span>
      </span>
      {/* النقطةُ ترى، والجملةُ تُقرأ: `aria-label` على `span` عارٍ لا ينطقه قارئُ الشاشة. */}
      {item.unread ? (
        <span className="ntf-dot">
          <span className="sr-only">لم يُقرأ</span>
        </span>
      ) : (
        <span aria-hidden />
      )}
    </>
  );
  const attrs = { className: "ntf-row", "data-unread": item.unread || undefined, "data-level": item.level };

  return item.href ? (
    <a
      {...attrs}
      href={item.href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onOpen(item);
      }}
    >
      {inner}
    </a>
  ) : (
    <button {...attrs} type="button" onClick={() => onOpen(item)}>
      {inner}
    </button>
  );
}
