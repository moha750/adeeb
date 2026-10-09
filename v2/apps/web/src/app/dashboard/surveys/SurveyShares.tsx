"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Modal, ModalSectionHeading } from "@adeeb/design-system";
import { UserPlus, UsersThree } from "@phosphor-icons/react";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { ShareAddFields, ShareRows, type ShareWords } from "../tools/qr/SharePanel";
import { getSurveyShares, setSurveyShareAccess, shareSurvey, unshareSurvey, type SurveyResult } from "./actions";
import type { SurveyShareCandidate, SurveyShareRow } from "./data";

/**
 * **شركاءُ الاستبيان** (2026-10-08) — الاستبيانُ لصاحبه وحده، ولا يراه أحدٌ إلّا بإذنه.
 *
 * **وإذنان لا واحد**: «يقرأ» يرى الاستبيانَ ونتائجه، و«يحرّر» يعدّل الأسئلةَ والإعدادات
 * وينشر ويوقف ويُنهي. **وثلاثةٌ تبقى لصاحبه**: الأرشفةُ والحذفُ والمشاركةُ نفسُها، فلا يشارك
 * شريكٌ شريكًا ولا تتّسع الدائرةُ بلا علمه. والحارسُ في القاعدة لا هنا.
 */

/**
 * كلماتُ مشاركة الاستبيان: يقرؤها اللوحُ هنا، ومعرضُ `/ui/survey-share`.
 * وسطرا الصفّ قصيران عمدًا: النافذةُ أضيقُ من بطاقة الباركود، والأطولُ يُقصّ بـ«…» فيضيع معناه.
 */
export const SURVEY_SHARE_WORDS: ShareWords = {
  panel: "شركاءُ الاستبيان",
  modal: "مشاركةُ الاستبيان",
  modalNote: "الاستبيانُ يبقى لك، والشريكُ يقرأ أو يحرّر بحسب إذنك. ولا يراه غيرُ من تختار.",
  emptyNote: "الاستبيانُ لك وحدك الآن. شارِكه مع عضوٍ ليقرأ نتائجه أو يحرّره معك، والملكيّةُ تبقى لك.",
  readLabel: "يقرأ النتائج",
  editLabel: "يحرّر الاستبيان",
  readLine: "يقرأ نتائجه ومشاركاته",
  editLine: "يعدّل وينشر ويوقف",
  readHelp: "يفتح الاستبيان ويقرأ نتائجه ومشاركاته. لا يبدّل شيئًا.",
  editHelp: "يعدّل الأسئلة والإعدادات وينشر ويوقف. لا يحذف ولا يشارك.",
  pickerHelp: "من يملك صلاحيّة الاستبيانات وحدَهم.",
};

const W = SURVEY_SHARE_WORDS;

export type SurveyShareData = { rows: SurveyShareRow[]; candidates: SurveyShareCandidate[] };
type ShareTarget = { id: number; title: string; data: SurveyShareData };

/** يجلب شركاءَ الاستبيان قبل أن تُفتح نافذتُه (كمعاينة القائمة): تُفتح ممتلئةً لا فارغةً ثمّ تقفز. */
export function useSurveyShareOpener() {
  const toast = useToast();
  const [target, setTarget] = useState<ShareTarget | null>(null);
  const [, start] = useTransition();
  // **آخرُ طلبٍ وحدَه يفتح**: نقرتان سريعتان على استبيانين قد يعود جوابُ الأوّل بعد الثاني،
  // فتُفتح نافذةُ ما لم تعد تقصده. فكلُّ طلبٍ يحمل رقمَه، وما سبقه يُترك.
  const latest = useRef(0);
  const open = (s: { id: number; title: string }) => {
    const ticket = ++latest.current;
    start(async () => {
      const r = await getSurveyShares(s.id);
      if (ticket !== latest.current) return;
      if (r.ok) setTarget({ id: s.id, title: s.title, data: { rows: r.rows, candidates: r.candidates } });
      else toast.error(r.message);
    });
  };
  return { target, open, close: () => setTarget(null) };
}

/**
 * **نافذةُ المشاركة فوق القائمة** — اختارها المالك من `/ui/survey-share` (الخيار أ: نافذةٌ واحدة).
 *
 * كانت «المشاركة» تنقل إلى صفحة التحرير لأنّ لوحَ الشركاء بُني بطاقةً في صفحة (سابقةُ الباركود)،
 * ومن يريد أن يشارك لا شأن له ببنّاء الأسئلة. فصارت نافذةً: **الشركاءُ فوق والإضافةُ تحتهم دائمًا**،
 * و«شارِك» في التذييل. والأجزاءُ أجزاءُ لوح الباركود المعتمد بعينها (`ShareRows` · `ShareAddFields`)،
 * فلا يُرسَم صفٌّ ثانٍ لسؤالٍ واحد.
 *
 * وبعد كلّ فعلٍ تُجلَب القائمةُ من الخادم ولا تُرقَّع في المتصفّح: ما تراه هو ما في القاعدة.
 */
export function SurveyShareModal({ survey, onClose }: { survey: ShareTarget | null; onClose: () => void }) {
  // تُبنى من جديد مع كلّ استبيان (`key`)، فلا يرث حقلُ العضو اختيارًا من نافذةٍ سابقة
  return survey ? <ShareModalBody key={survey.id} survey={survey} onClose={onClose} /> : null;
}

function ShareModalBody({ survey, onClose }: { survey: ShareTarget; onClose: () => void }) {
  const toast = useToast();
  const [pending, startPending] = useTransition();
  const [data, setData] = useState<SurveyShareData>(survey.data);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState("read");

  /** جوابُ كلّ فعلٍ واحد: إشعارٌ، ثمّ جلبُ الشركاء من جديد إن نجح. */
  const run = (fn: () => Promise<SurveyResult>, after?: () => void) =>
    startPending(async () => {
      const res = await fn();
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      after?.();
      const fresh = await getSurveyShares(survey.id);
      if (fresh.ok) return setData({ rows: fresh.rows, candidates: fresh.candidates });
      // نجح الفعلُ وتعذّر جلبُ القائمة بعده: صفوفٌ قديمةٌ في نافذةٍ مفتوحة تَعِد بما لم يعد قائمًا،
      // فتُغلق ويُقال السبب، ويفتحها صاحبُها من جديد على ما في القاعدة.
      toast.error(fresh.message);
      onClose();
    });

  return (
    <Modal
      open
      onClose={onClose}
      busy={pending}
      size="sm"
      title={`مشاركةُ «${survey.title}»`}
      description={W.modalNote}
      footer={
        <>
          <Button
            variant="primary"
            size="md"
            loading={pending}
            disabled={!who}
            onClick={() =>
              run(() => shareSurvey(survey.id, who, access === "edit" ? "edit" : "read"), () => {
                setWho("");
                setAccess("read");
              })
            }
          >
            شارِك
          </Button>
          <Button variant="ghost" size="md" disabled={pending} onClick={onClose}>إغلاق</Button>
        </>
      }
    >
      <ModalSectionHeading icon={<UsersThree />} title="الشركاء" />
      {data.rows.length ? (
        <ShareRows
          rows={data.rows}
          words={W}
          canManage
          pending={pending}
          onSetAccess={(id, a) => run(() => setSurveyShareAccess(survey.id, id, a))}
          onDrop={(id) => run(() => unshareSurvey(survey.id, id))}
        />
      ) : (
        <EmptyState variant="soft" icon={<UsersThree />} title="لا شركاء بعد" description={W.emptyNote} />
      )}
      <ModalSectionHeading icon={<UserPlus />} title="أضِف شريكًا" />
      <ShareAddFields free={data.candidates} who={who} onWho={setWho} access={access} onAccess={setAccess} words={W} />
    </Modal>
  );
}
