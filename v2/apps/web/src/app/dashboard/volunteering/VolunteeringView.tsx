"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, Field, Modal, Segmented, Select, Textarea } from "@adeeb/design-system";
import { EmptyState } from "../_components/EmptyState";
import { CalendarBlank, Clock, Handshake, Hash, MapPin, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/ToastProvider";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import { saveOpportunity, setOpportunityStatus, type OppInput } from "./actions";
import type { OppRow, OppStatus } from "./data";
import { copyText } from "@/lib/clipboard";

const STATUS: Record<OppStatus, { label: string; tone: "neutral" | "success" | "warning" }> = {
  draft: { label: "مسوّدة", tone: "neutral" },
  open: { label: "مفتوحة", tone: "success" },
  closed: { label: "مغلقة", tone: "warning" },
};

const GENDER_OPTS = [
  { value: "", label: "الجميع" },
  { value: "male", label: "الرجال" },
  { value: "female", label: "النساء" },
];

const EMPTY: OppInput = {
  title: "", description: "", seats: 1, startsOn: "", endsOn: "",
  durationNote: "", location: "", committeeId: undefined, targetGender: undefined,
};

/**
 * **غرفةُ الفرص التطوّعيّة.**
 *
 * الفرصةُ تُنشأ مسوّدةً ثمّ تُفتح — فلا تظهر للمتطوّعين نصفَ مكتوبة. وحين تُفتح يُنسَخ رابطُها
 * القصير ويُلصَق في قروب المتطوّعين، والرابطُ يقود صاحبَه إلى الفرصة في حسابه.
 */
export function VolunteeringView({ rows, committees }: {
  rows: OppRow[];
  committees: { id: number; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSave] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<OppInput>(EMPTY);

  const set = <K extends keyof OppInput>(k: K, v: OppInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (o: OppRow) => {
    setEditing(o.id);
    setForm({
      title: o.title, description: o.description, seats: o.seats,
      startsOn: o.startsOn ?? "", endsOn: o.endsOn ?? "", durationNote: o.durationNote ?? "",
      location: o.location ?? "", committeeId: o.committeeId ?? undefined,
      targetGender: o.targetGender ?? undefined,
    });
    setOpen(true);
  };

  const submit = () => {
    startSave(async () => {
      const r = await saveOpportunity(form, editing ?? undefined);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      router.refresh();
    });
  };

  const flip = async (id: string, status: "open" | "closed") => {
    setBusy(id);
    const r = await setOpportunityStatus(id, status);
    setBusy(null);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/v/${id}`;
    try {
      await copyText(url);
      toast.success("نُسخ رابطُ الفرصة. الصقه في قروب المتطوّعين.");
    } catch {
      toast.error(url);
    }
  };

  return (
    <>
      <PageHeader
        title="الفرص التطوّعيّة"
        primary={{ label: "فرصة جديدة", icon: <Plus size={18} />, onClick: openNew }}
        menu={[{ items: [{
          label: "قروب المتطوّعين",
          onSelect: () => window.open(VOLUNTEERS_GROUP_URL, "_blank", "noopener"),
        }] }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<Handshake />}
          title="لا فرصَ بعد"
          description="افتح فرصةً تطوّعيّة، وانشر رابطَها في قروب المتطوّعين."
          action={<Button variant="primary" size="md" onClick={openNew}><Plus size={18} />فرصة جديدة</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((o) => (
            <Card key={o.id}>
              <CardBody className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/dashboard/volunteering/${o.id}`} className="font-bold underline">{o.title}</Link>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                    <Badge tone={o.seats != null && o.accepted >= o.seats ? "danger" : "neutral"}>
                      {o.seats == null ? `مفتوح، قُبل ${o.accepted}` : `المطلوب ${o.seats}، قُبل ${o.accepted}`}
                    </Badge>
                    {o.pending > 0 ? <Badge tone="warning">{`${o.pending} بانتظار الحسم`}</Badge> : null}
                  </div>
                </div>

                <div className="text-content-muted flex flex-wrap items-center gap-4 text-sm">
                  {o.dateLabel ? (
                    <span className="flex items-center gap-1"><CalendarBlank size={16} aria-hidden />{o.dateLabel}</span>
                  ) : null}
                  {o.committee ? (
                    <span className="flex items-center gap-1"><UsersThree size={16} aria-hidden />{o.committee}</span>
                  ) : null}
                  {o.targetGender ? (
                    <span className="flex items-center gap-1">
                      <MapPin size={16} aria-hidden />{o.targetGender === "male" ? "للرجال" : "للنساء"}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/volunteering/${o.id}`} className="abtn abtn-ghost abtn-sm">سجلّ الفرصة</Link>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>تعديل</Button>
                  {o.status === "draft" ? (
                    <Button variant="primary" size="sm" loading={busy === o.id} onClick={() => flip(o.id, "open")}>فتحُ الفرصة</Button>
                  ) : null}
                  {o.status === "open" ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(o.id)}>نسخُ الرابط</Button>
                      <Button variant="ghost-danger" size="sm" loading={busy === o.id} onClick={() => flip(o.id, "closed")}>إغلاق</Button>
                    </>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        busy={saving}
        title={editing ? "تعديل الفرصة" : "فرصة تطوّعيّة جديدة"}
        description={editing ? "يسري التعديلُ على ما يراه المتطوّعون فورًا." : "تُنشأ مسوّدةً، ولا تظهر للمتطوّعين حتّى تفتحها."}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => { setOpen(false); setEditing(null); }} disabled={saving}>إلغاء</Button>
            <Button variant="primary" size="md" loading={saving} onClick={submit}>حفظ</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field className="form-full" label="عنوان الفرصة" icon={<Handshake />} innerIcon={<PencilSimple />}
            placeholder="مصوّر في معرض التطوّع"
            value={form.title} onChange={(e) => set("title", e.target.value)} required />
          <Textarea
            className="form-full"
            label="الوصف" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="ما المطلوب من المتطوّع؟" rows={3}
            value={form.description} onChange={(e) => set("description", e.target.value)} required
          />
          {/* العددُ بابان: مخصَّصٌ برقمٍ يُحرَس عند القبول، أو مفتوحٌ بلا سقف (`null` في القاعدة).
              والرقمُ لا يُسأل إلّا لمن اختار التخصيص — فلا حقلٌ معطَّلٌ يشغل صفًّا بلا معنى. */}
          <div className="form-full flex flex-col gap-2">
            <span className="mdl-fieldlabel">عدد المتطوّعين</span>
            <Segmented
              className="seg-block"
              items={[{ value: "fixed", label: "مخصَّص" }, { value: "open", label: "مفتوح" }]}
              value={form.seats == null ? "open" : "fixed"}
              onValueChange={(v) => set("seats", v === "open" ? null : 1)}
            />
          </div>
          {form.seats != null ? (
            <Field className="form-full" label="كم متطوّعًا؟" type="number" charset="digits"
              icon={<UsersThree />} innerIcon={<Hash />} placeholder="3"
              value={String(form.seats)} onChange={(e) => set("seats", e.target.value)} required />
          ) : null}
          <Field label="تاريخ البداية" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />}
            placeholder=""
            value={form.startsOn ?? ""} onChange={(e) => set("startsOn", e.target.value)} optional />
          <Field label="تاريخ النهاية" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />}
            placeholder=""
            value={form.endsOn ?? ""} onChange={(e) => set("endsOn", e.target.value)} optional />
          <Field label="المدّة" icon={<Clock />} innerIcon={<PencilSimple />} placeholder="أربع ساعاتٍ يوميًّا"
            value={form.durationNote ?? ""} onChange={(e) => set("durationNote", e.target.value)} optional />
          <Field label="المكان" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مركز الملك سلمان"
            value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} optional />
          <Select label="الجهة المُحتاجة" options={[{ value: "", label: "بلا لجنة" },
            ...committees.map((c) => ({ value: String(c.id), label: c.name }))]}
            value={form.committeeId ? String(form.committeeId) : ""}
            onValueChange={(v) => set("committeeId", v ? Number(v) : undefined)} optional />
          <Select label="الجنس" options={GENDER_OPTS}
            value={form.targetGender ?? ""}
            onValueChange={(v) => set("targetGender", (v || undefined) as "male" | "female" | undefined)} optional />
        </div>
      </Modal>
    </>
  );
}
