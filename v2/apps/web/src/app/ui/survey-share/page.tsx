"use client";

import { useState, useTransition } from "react";
import { Button, Container, ModalSectionHeading, Modal } from "@adeeb/design-system";
import { UserPlus, UsersThree } from "@phosphor-icons/react";
import { EmptyState } from "../../dashboard/_components/EmptyState";
import { ShareAddFields, ShareRows, type ShareRow } from "../../dashboard/tools/qr/SharePanel";
import { SURVEY_SHARE_WORDS as W } from "../../dashboard/surveys/SurveyShares";

/**
 * **مشاركةُ الاستبيان فوق القائمة** (٢٠٢٦-١٠-٠٨).
 *
 * كانت «المشاركة» تنقل إلى صفحة التحرير لأنّ لوحَ الشركاء بُني بطاقةً في صفحة (سابقةُ
 * الباركود)، فاعترض المالك: من يريد أن يشارك لا شأن له ببنّاء الأسئلة. فصارت نافذةً فوق
 * القائمة، **بأجزاء اللوح المعتمد نفسِها** (صفوفُ الشركاء وحقلا الإضافة) لا برسمٍ جديد.
 *
 * عُرض خياران: **أ. نافذةٌ واحدة** (الشركاءُ فوق والإضافةُ تحتهم دائمًا) و**ب. نافذةٌ بطَورين**
 * (الإضافةُ طَورٌ يُفتح بزرّ). **اختار المالك «أ»** وحُذف «ب». والحيُّ هو `SurveyShareModal`
 * في `dashboard/surveys/SurveyShares`، وهذا معرضُه بأسماءٍ تجريبيّة وأفعالٍ محلّيّة.
 */

const SURVEY = "تقييم الأمسية الأدبيّة";

const PEOPLE = [
  { id: "1", name: "بشائر فاروق الحداد" },
  { id: "2", name: "سديم بندر القحطاني" },
  { id: "3", name: "عبد الرحمن آل الشيخ" },
  { id: "4", name: "مريم هاني العلوي" },
  { id: "5", name: "نواف ثلاب الشمري" },
];

const START: ShareRow[] = [
  { userId: "1", name: "بشائر فاروق الحداد", access: "edit" },
  { userId: "2", name: "سديم بندر القحطاني", access: "read" },
];

/** حالُ المشاركة محلّيًّا: الأفعالُ الثلاثة كما في الغرفة، بتأخيرٍ قصيرٍ يُري حالَ «يعمل الآن». */
function useLocalShares() {
  const [rows, setRows] = useState<ShareRow[]>(START);
  const [pending, start] = useTransition();
  const wait = () => new Promise((r) => setTimeout(r, 450));
  const free = PEOPLE.filter((p) => !rows.some((r) => r.userId === p.id));
  return {
    rows,
    free,
    pending,
    add: (id: string, access: "read" | "edit", after?: () => void) =>
      start(async () => {
        await wait();
        const p = PEOPLE.find((x) => x.id === id);
        if (p) setRows((rs) => [...rs, { userId: id, name: p.name, access }]);
        after?.();
      }),
    set: (id: string, access: "read" | "edit") =>
      start(async () => { await wait(); setRows((rs) => rs.map((r) => (r.userId === id ? { ...r, access } : r))); }),
    drop: (id: string) =>
      start(async () => { await wait(); setRows((rs) => rs.filter((r) => r.userId !== id)); }),
    reset: () => setRows(START),
  };
}

function Partners({ s }: { s: ReturnType<typeof useLocalShares> }) {
  return s.rows.length ? (
    <ShareRows rows={s.rows} words={W} canManage pending={s.pending} onSetAccess={s.set} onDrop={s.drop} />
  ) : (
    <EmptyState variant="soft" icon={<UsersThree />} title="لا شركاء بعد" description={W.emptyNote} />
  );
}

/** نافذةٌ واحدة: القائمةُ والإضافةُ معًا، والإضافةُ حاضرةٌ دائمًا. */
function ShareDemo() {
  const s = useLocalShares();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState("read");
  return (
    <>
      <Button variant="primary" size="md" onClick={() => { s.reset(); setWho(""); setAccess("read"); setOpen(true); }}>افتح نافذة المشاركة</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={s.pending}
        size="sm"
        title={`مشاركةُ «${SURVEY}»`}
        description={W.modalNote}
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={s.pending}
              disabled={!who}
              onClick={() => s.add(who, access === "edit" ? "edit" : "read", () => { setWho(""); setAccess("read"); })}
            >
              شارِك
            </Button>
            <Button variant="ghost" size="md" disabled={s.pending} onClick={() => setOpen(false)}>إغلاق</Button>
          </>
        }
      >
        <ModalSectionHeading icon={<UsersThree />} title="الشركاء" />
        <Partners s={s} />
        <ModalSectionHeading icon={<UserPlus />} title="أضِف شريكًا" />
        <ShareAddFields free={s.free} who={who} onWho={setWho} access={access} onAccess={setAccess} words={W} />
      </Modal>
    </>
  );
}

export default function SurveySharePage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Survey Share</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مشاركةُ الاستبيان</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          «المشاركة» في قائمة الاستبيانات تفتح نافذةً فوق القائمة: الشركاءُ فوق، والإضافةُ تحتهم دائمًا،
          و«شارِك» في التذييل. والأجزاءُ أجزاءُ لوح شركاء الباركود المعتمد بعينها. جرّب: بدّل إذن شريك،
          وأخرِج آخر، وأضِف ثالثًا.
        </p>

        <section className="mt-8">
          <ShareDemo />
        </section>
      </Container>
    </main>
  );
}
