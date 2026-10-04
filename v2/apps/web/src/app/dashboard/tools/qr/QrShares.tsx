"use client";

import { SharePanel, type ShareWords } from "./SharePanel";
import { setQrShareAccess, shareQrLink, unshareQrLink } from "./actions";
import type { QrOwnerBrief } from "./oversight/data";
import type { QrShare } from "./data";

/**
 * **شركاءُ الباركود** — عملٌ يشترك فيه اثنان: قائدٌ يصنع الملصق، وعضوٌ يبدّل وجهتَه ليلة
 * الفعاليّة، وثالثٌ يقرأ أرقامَه في الصباح.
 *
 * **وإذنان لا واحد**: «يقرأ» يرى الإحصاء فقط، و«يحرّر» يبدّل الوجهةَ والتصميمَ والحالَ
 * والجدول. **وثلاثةٌ تبقى للمالك**: الحذفُ ونقلُ الملكيّة والمشاركةُ نفسُها، فلا يشارك
 * شريكٌ شريكًا ولا تتّسع الدائرةُ بلا علم صاحبها.
 *
 * والحارسُ في القاعدة لا في هذه الشاشة: من ليس مالكًا تردّه السياسةُ ولو نبت له زرّ.
 *
 * **والشكلُ صار في `SharePanel`** يومَ وُلدت مشاركةُ الحملة (م٢٠): لوحٌ واحدٌ يخدم البابين،
 * وهذه الشاشةُ تقول كلماتِها وتمرّر أفعالَها. فلا يُعاد رسمُ لوحٍ أقرّه المالك بعد أربع
 * جولات، ولا يفترق البابان يومَ يُصقَل أحدُهما.
 */

const WORDS: ShareWords = {
  panel: "شركاءُ الباركود",
  modal: "مشاركةُ الباركود",
  modalNote: "الملكيّةُ تبقى لك، والشريكُ يقرأ أو يحرّر بحسب إذنك. وكلُّ تغييرٍ يُقيَّد في السجلّ باسم فاعله.",
  emptyNote: "شارِك الباركود مع عضوٍ ليقرأ إحصاءه أو يبدّل وجهته معك، والملكيّةُ تبقى لك.",
  readLabel: "يقرأ الإحصاء",
  editLabel: "يحرّر الباركود",
  readLine: "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه",
  editLine: "يبدّل الوجهة والتصميم والحالة والجدولة",
  readHelp: "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه. لا يبدّل شيئًا.",
  editHelp: "يبدّل الوجهة والتصميم والحالة والجدولة. لا يحذف ولا يشارك.",
};

export function QrShares({
  linkId,
  rows,
  candidates,
  canManage,
  autoOpen = false,
}: {
  linkId: string;
  rows: QrShare[];
  /** من يصلح شريكًا: حاملو قدرة المولّد (المشاركةُ مع غيرهم تعطيه بابًا لا يراه). */
  candidates: QrOwnerBrief[];
  /** المالكُ وحدَه يدير الشركاء؛ والشريكُ يقرأ القائمةَ ولا يغيّرها. */
  canManage: boolean;
  /** جاء من «المشاركة» في قائمة الباركودات: تُفتح النافذةُ فورًا فلا يبحث عن الزرّ. */
  autoOpen?: boolean;
}) {
  return (
    <SharePanel
      rows={rows}
      candidates={candidates}
      canManage={canManage}
      autoOpen={autoOpen}
      words={WORDS}
      onAdd={(userId, access) => shareQrLink(linkId, userId, access)}
      onSetAccess={(userId, access) => setQrShareAccess(linkId, userId, access)}
      onDrop={(userId) => unshareQrLink(linkId, userId)}
    />
  );
}
