import type { RoomView } from "../view";
import { LIBRARY_ROOM } from "./library.meta";
import { CONTACT_ROOM } from "./contact.meta";
import { MEMBER_CERTIFICATES_ROOM } from "./member-certificates.meta";
import { FAQ_ROOM } from "./faq.meta";
import { SPONSORS_ROOM } from "./sponsors.meta";
import { WORKS_ROOM } from "./works.meta";
import { ELECTIONS_ROOM } from "./elections.meta";
import { VOLUNTEERING_ROOM } from "./volunteering.meta";
import { TASKS_ROOM } from "./tasks.meta";
import { WARNINGS_ROOM } from "./warnings.meta";
import { IRFAN_OVERSIGHT_ROOM } from "./irfan-oversight.meta";
import { DEEBO_KNOWLEDGE_ROOM } from "./deebo-knowledge.meta";
import { QR_OVERSIGHT_ROOM } from "./qr-oversight.meta";
import { EMAIL_LOG_ROOM } from "./email-log.meta";
import { DEEBO_LOG_ROOM } from "./deebo-log.meta";
import { BIRTHDAYS_ROOM } from "./birthdays.meta";
import { QR_LINKS_ROOM } from "./qr-links.meta";
import { QR_CAMPAIGNS_ROOM } from "./qr-campaigns.meta";
import { ACHIEVEMENTS_ROOM } from "./achievements.meta";
import { TICKER_ROOM } from "./ticker.meta";
import { HERO_NEWS_ROOM } from "./hero-news.meta";
import { RADIO_ROOM } from "./radio.meta";
import { REGULATIONS_ROOM } from "./regulations.meta";
import { VOLUNTEERS_ROOM } from "./volunteers.meta";
import { FRIENDS_ROOM } from "./friends.meta";
import { UNIT_ROOM } from "./unit.meta";
import { MEMBERS_ROOM } from "./members.meta";
import { SUPERVISED_ROOM } from "./supervised.meta";
import { DEPARTMENT_ROOM } from "./department.meta";
import { COMMITTEE_ROOM } from "./committee.meta";
/**
 * **هويّةُ كلّ غرفة** (اسمُها ومسارُها ومفتاحُ طريقة عرضها وأعمدةُ جدولها) — مصدرٌ واحدٌ تقرؤه الغرفةُ وحالتا تحميلها وخطئها،
 * فيرى العضوُ الهيكلَ نفسَه قبل البيانات وبعدها. ملفٌّ بلا `"use client"` لأنّ صفحاتِ الخادم و`loading.tsx` تقرؤه قيمًا.
 */
/** `cols`: أعمدةُ الجدول بلا عنوانه وكعبه وأفعاله (0–6، وهو حدُّ `.ad-table[data-cols]`) — يرسم بها هيكلُ التحميل جدولَه قبل البيانات. */
export type RoomMeta = {
  title: string; navPath: string; viewKey: string; cols: 0 | 1 | 2 | 3 | 4 | 5 | 6; what: string;
  /** للجدول كعبٌ مصغّر أوّلَ سطوره (`table.stub`) — فيرسمه هيكلُ التحميل أيضًا */
  stub?: true;
  /** غرفةٌ بلا مواضع: لا يرسم هيكلُ التحميل مبدّلًا يختفي حين تصل البيانات */
  flat?: true;
  /** العرضُ قبل أن يختار العضو (`roomView`): جدولٌ لغرفةٍ كانت جدولًا وحده */
  defaultView?: RoomView;
  /** كم من `cols` عريضٌ (`AdColumn.text` أو `wide`) — فيتحوّل هيكلُ التحميل إلى سطور الضيّق عند العرض الذي يتحوّل عنده الجدول */
  textCols?: 1 | 2 | 3;
  /** قائمةٌ وحدها (مجمّعةٌ أو مرتّبةٌ يدويًّا — `CollectionRoom`): هيكلُ التحميل جدولٌ دائمًا مهما كان العرضُ المحفوظ */
  listOnly?: true;
};

export const NEWS_ROOM: RoomMeta = { title: "غرفة تحرير أدِيب", navPath: "/dashboard/news", viewKey: "news-view", cols: 3, stub: true, what: "الأخبار" };
export const SURVEYS_ROOM: RoomMeta = { title: "الاستبيانات", navPath: "/dashboard/surveys", viewKey: "surveys-view", cols: 3, textCols: 1, stub: true, what: "الاستبيانات" };
export const EVENTS_ROOM: RoomMeta = { title: "الفعاليّات", navPath: "/dashboard/events", viewKey: "events-view", cols: 2, stub: true, what: "الفعاليّات" };

/** كلُّ غرفةٍ على القالب — منه يعرف بلاغُ الخطأ (`report.ts`) أنّ المسارَ غرفةٌ حقًّا ويقرأ اسمَها، فلا يُؤخذ اسمٌ ولا رابطٌ من المتصفّح. */
export const ROOMS: readonly RoomMeta[] = [
  NEWS_ROOM, SURVEYS_ROOM, EVENTS_ROOM, LIBRARY_ROOM, CONTACT_ROOM, MEMBER_CERTIFICATES_ROOM, FAQ_ROOM, SPONSORS_ROOM, WORKS_ROOM,
  ELECTIONS_ROOM, VOLUNTEERING_ROOM, TASKS_ROOM, WARNINGS_ROOM, IRFAN_OVERSIGHT_ROOM, DEEBO_KNOWLEDGE_ROOM, QR_OVERSIGHT_ROOM,
  EMAIL_LOG_ROOM, DEEBO_LOG_ROOM, BIRTHDAYS_ROOM, QR_LINKS_ROOM, QR_CAMPAIGNS_ROOM,
  ACHIEVEMENTS_ROOM, TICKER_ROOM, HERO_NEWS_ROOM, RADIO_ROOM, REGULATIONS_ROOM,
  VOLUNTEERS_ROOM, FRIENDS_ROOM, UNIT_ROOM, MEMBERS_ROOM, SUPERVISED_ROOM, DEPARTMENT_ROOM, COMMITTEE_ROOM,
];
