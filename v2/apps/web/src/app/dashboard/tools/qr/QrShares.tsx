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
 */
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
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  // **الفتحُ حالٌ ابتدائيّةٌ لا أثرٌ بعد الرسم**: جاءت من العنوان قبل أن تُرسَم الشاشة،
  // فتُقرأ عند التهيئة. ونداءُ `setState` في أثرٍ يُحدث رسمًا ثانيًا بلا سبب (يردّه الحارس).
  const [open, setOpen] = useState(autoOpen && canManage);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState("read");

  const free = candidates.filter((c) => !rows.some((r) => r.userId === c.id));

  // **الطريقُ المختصر يفتح البابَ لا يقف عنده**: «المشاركة» في قائمة الباركودات تحمل
  // إلى هذه الصفحة ومعها علامةٌ في العنوان، فتُفتح النافذةُ من غير نقرةٍ ثانية. ثمّ
  // تُمحى العلامةُ من العنوان كي لا تُفتح ثانيةً مع كلّ تحديثٍ للصفحة.
  useEffect(() => {
    if (!autoOpen || !canManage) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [autoOpen, canManage]);

  const add = () =>
    startPending(async () => {
      const res = await shareQrLink(linkId, who, access === "edit" ? "edit" : "read");
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      setOpen(false);
      setWho("");
      setAccess("read");
      router.refresh();
    });

  // **الإذنُ يُبدَّل ولا يُهدَم ويُبنى** (المالك ٢٠٢٦-٠٩-٠٦): كان الإخراجُ وحدَه في الصفّ،
  // فمن أراد ترقيةَ قارئٍ إلى محرِّرٍ لزمه أن يُخرجه ثمّ يعيده. والصفُّ نفسُه يحمل الفعلين.
  const setAccessOf = (userId: string, next: "read" | "edit") =>
    startPending(async () => {
      const res = await setQrShareAccess(linkId, userId, next);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  const drop = (userId: string) =>
    startPending(async () => {
      const res = await unshareQrLink(linkId, userId);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <>
      <div className="card-grid mt-4">
        <Card className="card-full">
          <CardHeader
            variant="soft"
            icon={<UsersThree />}
            title="شركاءُ الباركود"
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
              <div className="lrow">
                {rows.map((r) => (
                  <div className="lrow-i" key={r.userId}>
                    <Avatar name={r.name} size="md" className="shrink-0" />
                    <span className="lrow-tx">
                      <b>{r.name}</b>
                      <span>
                        {r.access === "edit"
                          ? "يبدّل الوجهة والتصميم والحالة والجدولة"
                          : "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه"}
                      </span>
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
                                label: "يقرأ الإحصاء",
                                icon: <Eye />,
                                disabled: pending || r.access === "read",
                                onSelect: () => setAccessOf(r.userId, "read"),
                              },
                              {
                                label: "يحرّر الباركود",
                                icon: <PencilSimple />,
                                disabled: pending || r.access === "edit",
                                onSelect: () => setAccessOf(r.userId, "edit"),
                              },
                            ] },
                          ]}
                        />
                        <IconButton
                          tone="danger"
                          size="lg"
                          aria-label={`إخراج ${r.name}`}
                          disabled={pending}
                          onClick={() => drop(r.userId)}
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
            ) : (
              <EmptyState
                variant="soft"
                icon={<UsersThree />}
                title="لا شركاء بعد"
                description="شارِك الباركود مع عضوٍ ليقرأ إحصاءه أو يبدّل وجهته معك، والملكيّةُ تبقى لك."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="مشاركةُ الباركود"
        description="الملكيّةُ تبقى لك، والشريكُ يقرأ أو يحرّر بحسب إذنك. وكلُّ تغييرٍ يُقيَّد في السجلّ باسم فاعله."
        footer={
          <>
            <Button variant="primary" size="md" loading={pending} disabled={!who} onClick={add}>شارِك</Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setOpen(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            className="form-full"
            label="العضو"
            icon={<UsersThree />}
            value={who}
            onValueChange={setWho}
            searchable
            options={free.map((c) => ({ value: c.id, label: c.name }))}
            helper={free.length ? "من يملك صلاحيّة مولّد الباركود وحدَهم." : "لا أحد متاحٌ للمشاركة الآن."}
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
                onValueChange={setAccess}
                items={[
                  { value: "read", label: "يقرأ الإحصاء" },
                  { value: "edit", label: "يحرّر الباركود" },
                ]}
              />
              {/* **وأثرُ الاختيار يُقال تحته**: اسمُ الإذن كلمةٌ، وما يملكه صاحبُه جملةٌ.
                  فمن يشارك يعرف ما أعطى قبل أن يعطيه.

                  **والجملتان متقاربتا الطول** (المالك ٢٠٢٦-٠٩-٠٦): سطرٌ يطول وسطرٌ يقصر
                  يُقفز به الزرُّ تحتهما كلّما بُدّل الاختيار، فتضطرب النافذةُ تحت الإصبع. */}
              <p className="fld-help mt-2 text-center">
                {access === "edit"
                  ? "يبدّل الوجهة والتصميم والحالة والجدولة. لا يحذف ولا يشارك."
                  : "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه. لا يبدّل شيئًا."}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
