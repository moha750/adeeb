"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, IconButton, Modal, Segmented, Select } from "@adeeb/design-system";
import { ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { CaretDown, Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DropdownMenu } from "../../_components/DropdownMenu";
import { Avatar } from "../../_components/Avatar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import type { QrOwnerBrief } from "./oversight/data";

/**
 * **لوحُ الشركاء** — شكلٌ واحدٌ يخدم الباركودَ وحملتَه، والاستبيانَ (٢٠٢٦-١٠-٠٨).
 *
 * **ولم يُعَد رسمُه:** هذا اللوحُ بعينه أقرّه المالك ٢٠٢٦-٠٩-٠٧ بعد **أربع جولاتٍ رُدَّت**
 * (مرساةٌ في البداية، وسطران بدل سطر، ولا خطوطَ فاصلة، وضابطٌ ثابتُ العرض، وحذفٌ ظاهرٌ
 * دائمًا). فلمّا وُلدت مشاركةُ الحملة (م٢٠) لم يُنسَخ اللوحُ نسخةً ثانية: **نُقل كما هو**
 * ويُمرَّر إليه ما يفترق وحدَه، وهو **الكلمات** لا الشكل.
 *
 * والمنطقُ المشترك معه: نافذةُ الإضافة وحالُها، وتبديلُ الإذن، والإخراج، والإشعارُ بعد
 * كلّ فعل، وتحديثُ الصفحة. فما تُمرّره الشاشةُ ثلاثةُ أفعالٍ ترجع `{ ok, message }`.
 */

export type ShareRow = { userId: string; name: string; access: "read" | "edit" };
export type ShareResult = { ok: boolean; message: string };

/** ما يفترق بين البابين: كلماتٌ تُقال لا شكلٌ يُرسَم. */
export type ShareWords = {
  /** عنوانُ اللوح («شركاءُ الباركود»). */
  panel: string;
  /** عنوانُ نافذة الإضافة ووصفُها. */
  modal: string;
  modalNote: string;
  /** وصفُ الحال الفارغة. */
  emptyNote: string;
  /** تسميتا الإذنين في المبدّل وفي زرّ الصفّ. */
  readLabel: string;
  editLabel: string;
  /** جملةُ الإذن في سطر الشريك الثاني. */
  readLine: string;
  editLine: string;
  /** جملةُ الإذن تحت المبدّل في النافذة. */
  readHelp: string;
  editHelp: string;
  /** من يصلح شريكًا، تحت حقل العضو. يفترق بقدرة الغرفة (الباركود · الاستبيانات)،
      وغيابُه يُبقي جملةَ الباركود كما كانت فلا يُمَسّ بابٌ قائم. */
  pickerHelp?: string;
};

export function SharePanel({
  rows,
  candidates,
  canManage,
  autoOpen = false,
  words,
  onAdd,
  onSetAccess,
  onDrop,
}: {
  rows: ShareRow[];
  /** من يصلح شريكًا: حاملو قدرة المولّد (المشاركةُ مع غيرهم تعطيه بابًا لا يراه). */
  candidates: QrOwnerBrief[];
  /** المالكُ وحدَه يدير الشركاء؛ والشريكُ يقرأ القائمةَ ولا يغيّرها. */
  canManage: boolean;
  /** جاء من طريقٍ مختصرٍ في القائمة: تُفتح النافذةُ فورًا فلا يبحث عن الزرّ. */
  autoOpen?: boolean;
  words: ShareWords;
  onAdd: (userId: string, access: "read" | "edit") => Promise<ShareResult>;
  onSetAccess: (userId: string, access: "read" | "edit") => Promise<ShareResult>;
  onDrop: (userId: string) => Promise<ShareResult>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  // **الفتحُ حالٌ ابتدائيّةٌ لا أثرٌ بعد الرسم**: جاءت من العنوان قبل أن تُرسَم الشاشة،
  // فتُقرأ عند التهيئة. ونداءُ `setState` في أثرٍ يُحدث رسمًا ثانيًا بلا سبب (يردّه الحارس).
  const [open, setOpen] = useState(autoOpen && canManage);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState("read");

  const free = candidates.filter((c) => !rows.some((r) => r.userId === c.id));

  // **الطريقُ المختصر يفتح البابَ لا يقف عنده**: «المشاركة» في القائمة تحمل إلى هذه
  // الصفحة ومعها علامةٌ في العنوان، فتُفتح النافذةُ من غير نقرةٍ ثانية. ثمّ تُمحى العلامةُ
  // من العنوان كي لا تُفتح ثانيةً مع كلّ تحديثٍ للصفحة.
  useEffect(() => {
    if (!autoOpen || !canManage) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [autoOpen, canManage]);

  /** جوابُ كلّ فعلٍ واحد: إشعارٌ، ثمّ تحديثُ الصفحة إن نجح. */
  const run = (fn: () => Promise<ShareResult>, after?: () => void) =>
    startPending(async () => {
      const res = await fn();
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  return (
    <>
      <div className="card-grid mt-4">
        <Card className="card-full">
          <CardHeader
            variant="soft"
            icon={<UsersThree />}
            title={words.panel}
            actions={
              canManage ? (
                <Button variant="ghost" size="sm" onClick={() => { setWho(""); setAccess("read"); setOpen(true); }}>
                  <Plus size={16} /> أضِف شريكًا
                </Button>
              ) : null
            }
          />
          <CardBody>
            {rows.length ? (
              /**
               * **صفُّ القائمة المصقول** (اعتمده المالك ٢٠٢٦-٠٩-٠٧ بعد أربع جولاتٍ رُدَّت):
               * مرساةٌ في البداية، وسطران بدل سطر، ولا خطوطَ فاصلة، وضابطٌ ثابتُ العرض من
               * زرّ المكتبة الشبحيّ، وحذفٌ ظاهرٌ دائمًا.
               *
               * والسطرُ الثاني **يقول الإذنَ بجملته** لا بشارةٍ من كلمة: «يقرأ» وحدَها
               * تحتاج من يشرحها، والجملةُ تُغني عن الشرح وتملأ الصفَّ في آنٍ واحد.
               */
              <ShareRows rows={rows} words={words} canManage={canManage} pending={pending} onSetAccess={(id, a) => run(() => onSetAccess(id, a))} onDrop={(id) => run(() => onDrop(id))} />
            ) : (
              <EmptyState variant="soft" icon={<UsersThree />} title="لا شركاء بعد" description={words.emptyNote} />
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={words.modal}
        description={words.modalNote}
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              disabled={!who}
              onClick={() =>
                run(() => onAdd(who, access === "edit" ? "edit" : "read"), () => {
                  setOpen(false);
                  setWho("");
                  setAccess("read");
                })
              }
            >
              شارِك
            </Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setOpen(false)}>إلغاء</Button>
          </>
        }
      >
        <ShareAddFields free={free} who={who} onWho={setWho} access={access} onAccess={setAccess} words={words} />
      </Modal>
    </>
  );
}

/**
 * **أجزاءُ اللوح مُصدَّرةً** (٢٠٢٦-١٠-٠٨): صفوفُ الشركاء وحقلا الإضافة، كما أقرّهما المالك
 * حرفًا. وُلدت حين احتاجت مشاركةُ الاستبيان نافذةً فوق القائمة لا بطاقةً في صفحة: فتُركَّب
 * الأجزاءُ نفسُها في وعاءٍ آخر ولا يُرسَم صفٌّ ثانٍ. واللوحُ أعلاه يركّبها كما كان، بالـDOM نفسه.
 */
export function ShareRows({
  rows,
  words,
  canManage,
  pending,
  onSetAccess,
  onDrop,
}: {
  rows: ShareRow[];
  words: ShareWords;
  canManage: boolean;
  pending: boolean;
  onSetAccess: (userId: string, access: "read" | "edit") => void;
  onDrop: (userId: string) => void;
}) {
  return (
    <div className="lrow">
      {rows.map((r) => (
        <div className="lrow-i" key={r.userId}>
          <Avatar name={r.name} size="md" className="shrink-0" />
          <span className="lrow-tx">
            <b>{r.name}</b>
            <span>{r.access === "edit" ? words.editLine : words.readLine}</span>
          </span>
          {canManage ? (
            <span className="lrow-end">
              <DropdownMenu
                ariaLabel={`ما يستطيعه ${r.name}`}
                triggerClassName="abtn abtn-ghost abtn-sm lrow-sel"
                trigger={<>{r.access === "edit" ? "يحرّر" : "يقرأ"} <CaretDown size={14} /></>}
                groups={[
                  { header: "ما يستطيعه", items: [
                    {
                      label: words.readLabel,
                      icon: <Eye />,
                      disabled: pending || r.access === "read",
                      onSelect: () => onSetAccess(r.userId, "read"),
                    },
                    {
                      label: words.editLabel,
                      icon: <PencilSimple />,
                      disabled: pending || r.access === "edit",
                      onSelect: () => onSetAccess(r.userId, "edit"),
                    },
                  ] },
                ]}
              />
              <IconButton
                tone="danger"
                size="lg"
                aria-label={`إخراج ${r.name}`}
                disabled={pending}
                onClick={() => onDrop(r.userId)}
              >
                <Trash />
              </IconButton>
            </span>
          ) : (
            <span className="lrow-end">
              <Badge tone={r.access === "edit" ? "info" : "neutral"} size="sm">
                {r.access === "edit" ? "يحرّر" : "يقرأ"}
              </Badge>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** حقلا الإضافة: العضو، وما يستطيعه، وجملةُ أثر الاختيار تحته. */
export function ShareAddFields({
  free,
  who,
  onWho,
  access,
  onAccess,
  words,
}: {
  free: QrOwnerBrief[];
  who: string;
  onWho: (v: string) => void;
  access: string;
  onAccess: (v: string) => void;
  words: ShareWords;
}) {
  return (
    <div className="form-grid">
      <Select
        className="form-full"
        label="العضو"
        icon={<UsersThree />}
        value={who}
        onValueChange={onWho}
        searchable
        options={free.map((c) => ({ value: c.id, label: c.name }))}
        helper={free.length ? (words.pickerHelp ?? "من يملك صلاحيّة مولّد الباركود وحدَهم.") : "لا أحد متاحٌ للمشاركة الآن."}
      />
      <div className="form-full fld">
        {/* **تسميةٌ كتسمية جارتها** (المالك ٢٠٢٦-٠٩-٠٦): «العضو» حقلٌ من المكتبة يحمل
            أيقونتَه في مربّعها، وتسميتُه كانت سطرَ مساعدةٍ عاريًا فبدا الصفّان صفَّين من
            نظامين. والبدائيّةُ هي هي (`fld-lbl` + `fld-lic`)، لا شكلٌ يُنسَخ. */}
        <span className="fld-lbl">
          <span className="fld-lic" aria-hidden="true"><ShieldCheck /></span>
          ما الذي يستطيعه؟
        </span>
        <div className="mt-2">
          {/* **ممتدٌّ ويقتسمه الإذنان**: خياران في صفٍّ ضيّقٍ يتكوّمان في طرفه. */}
          <Segmented
            wide
            aria-label="ما الذي يستطيعه الشريك"
            value={access}
            onValueChange={onAccess}
            items={[
              { value: "read", label: words.readLabel },
              { value: "edit", label: words.editLabel },
            ]}
          />
          {/* **وأثرُ الاختيار يُقال تحته**: اسمُ الإذن كلمةٌ، وما يملكه صاحبُه جملةٌ.
              فمن يشارك يعرف ما أعطى قبل أن يعطيه.

              **والجملتان متقاربتا الطول** (المالك ٢٠٢٦-٠٩-٠٦): سطرٌ يطول وسطرٌ يقصر
              يُقفز به الزرُّ تحتهما كلّما بُدّل الاختيار، فتضطرب النافذةُ تحت الإصبع. */}
          <p className="fld-help mt-2 text-center">{access === "edit" ? words.editHelp : words.readHelp}</p>
        </div>
      </div>
    </div>
  );
}
