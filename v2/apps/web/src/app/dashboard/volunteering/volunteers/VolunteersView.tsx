"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, Field, Modal, Segmented, Select, Textarea } from "@adeeb/design-system";
import { EmptyState } from "../../_components/EmptyState";
import { HandHeart } from "@phosphor-icons/react";
import { MagnifyingGlass, PencilSimple } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { useToast } from "../../_components/ToastProvider";
import { endVolunteering, grantMembership } from "../actions";
import type { VolunteerRow } from "../data";
import { copyText } from "@/lib/clipboard";

type Ask = { kind: "grant" | "end"; row: VolunteerRow } | null;

/**
 * **سجلُّ المتطوّعين** — غيرُ سجلّ الفرصة: ذاك واقعةٌ واحدة، وهذا مسيرةُ المتطوّع كلُّها.
 *
 * ومنه فعلان: **الإهداءُ** (عضويّةٌ ومنصبٌ في فعلٍ واحد، واللجنةُ المقترحةُ رغبتُه الأولى)،
 * و**إنهاءُ التطوّع** بسببٍ مكتوب. والترشيحُ بالرغبة هو ما تسأل عنه الموارد حين ينقصها أعضاء.
 */
export function VolunteersView({ rows, committees }: {
  rows: VolunteerRow[];
  committees: { id: number; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"active" | "former">("active");
  const [search, setSearch] = useState("");
  const [pref, setPref] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [committee, setCommittee] = useState("");
  const [reason, setReason] = useState("");

  const shown = useMemo(
    () =>
      rows.filter((r) => {
        if (r.status !== tab) return false;
        if (pref && r.prefs[0]?.id !== Number(pref)) return false;
        if (search.trim() && !r.name.includes(search.trim()) && !r.phone.includes(search.trim())) return false;
        return true;
      }),
    [rows, tab, pref, search],
  );

  const copyPhones = async () => {
    const list = shown.map((r) => r.phone).filter(Boolean).join("\n");
    if (!list) { toast.error("لا أرقامَ في هذا الكشف."); return; }
    try {
      await copyText(list);
      toast.success(`نُسخ ${shown.length} رقمًا، قابِلها بأعضاء القروب.`);
    } catch {
      toast.error("تعذّر النسخ.");
    }
  };

  const openAsk = (kind: "grant" | "end", row: VolunteerRow) => {
    setCommittee(row.prefs[0] ? String(row.prefs[0].id) : "");
    setReason("");
    setAsk({ kind, row });
  };

  const confirm = async () => {
    if (!ask) return;
    setBusy(ask.row.userId);
    const r = ask.kind === "grant"
      ? await grantMembership(ask.row.userId, Number(committee))
      : await endVolunteering(ask.row.userId, reason);
    setBusy(null);
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    setAsk(null);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title="سجلّ المتطوّعين"
        action={{ label: "نسخُ الأرقام", onClick: copyPhones }}
      />

      <div className="flex flex-wrap items-end gap-3" style={{ marginBottom: 16 }}>
        <Segmented
          items={[
            { value: "active", label: "متطوّعون" },
            { value: "former", label: "سابقون" },
          ]}
          value={tab}
          onValueChange={(v) => setTab(v as "active" | "former")}
        />
        <Select
          label="الرغبة الأولى"
          options={[{ value: "", label: "كلُّ اللجان" }, ...committees.map((c) => ({ value: String(c.id), label: c.name }))]}
          value={pref}
          onValueChange={setPref}
        />
        <Field label="بحث" icon={<MagnifyingGlass />} innerIcon={<MagnifyingGlass />} placeholder="اسم أو جوّال"
          value={search} onChange={(e) => setSearch(e.target.value)} optional />
      </div>

      {shown.length === 0 ? (
        <EmptyState variant="soft" icon={<HandHeart />} title="لا متطوّعين هنا"
          description="من قدّم للعضويّة ورتّب رغباته ظهر في هذا الكشف." />
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((r) => (
            <Card key={r.userId}>
              <CardBody className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-content-muted text-sm" dir="ltr">{r.phone}</span>
                  </div>
                  <span className="text-content-muted text-sm">{`تطوّع منذ ${r.appliedAt}`}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.prefs.map((p, i) => (
                    <Badge key={p.id} tone={i === 0 ? "success" : "neutral"}>{`${i + 1}. ${p.name}`}</Badge>
                  ))}
                </div>

                <div className="text-content-muted flex flex-wrap items-center gap-4 text-sm">
                  <span>{`قدّم ${r.applied}`}</span>
                  <span>{`قُبل ${r.accepted}`}</span>
                  <span>{`حضر ${r.attended}`}</span>
                  <span>{`غاب ${r.absent}`}</span>
                  <span>{`شهادات ${r.certificates}`}</span>
                </div>

                {r.status === "former" && r.endReason ? (
                  <p className="text-content-muted text-sm">انتهى تطوّعه: {r.endReason}</p>
                ) : null}

                {r.status === "active" ? (
                  <div className="btn-row">
                    <Button variant="primary" size="sm" loading={busy === r.userId} onClick={() => openAsk("grant", r)}>
                      إهداءُ العضويّة
                    </Button>
                    <Button variant="ghost-danger" size="sm" onClick={() => openAsk("end", r)}>إنهاءُ التطوّع</Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={ask !== null}
        onClose={() => setAsk(null)}
        busy={busy !== null}
        title={ask?.kind === "grant" ? "إهداءُ العضويّة" : "إنهاءُ التطوّع"}
        description={
          ask?.kind === "grant"
            ? "يصير عضوًا في أدِيب ويُسنَد إلى لجنته، وينتهي تطوّعُه في الفعل نفسه."
            : "يبقى في السجلّ سابقًا بسببه المكتوب، ويُخرَج من قروب المتطوّعين."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAsk(null)}>إلغاء</Button>
            <Button
              variant={ask?.kind === "grant" ? "primary" : "danger"} size="md"
              loading={busy !== null} onClick={confirm}
            >
              {ask?.kind === "grant" ? "إهداء" : "إنهاء"}
            </Button>
          </>
        }
      >
        {ask?.kind === "grant" ? (
          <Select
            label="اللجنة"
            options={committees.map((c) => ({ value: String(c.id), label: c.name }))}
            value={committee}
            onValueChange={setCommittee}
            helper="المقترحةُ رغبتُه الأولى، ولك أن تغيّرها."
            required
          />
        ) : (
          <Textarea
            label="السبب" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="يبقى في سجلّه" rows={3}
            value={reason} onChange={(e) => setReason(e.target.value)} required
          />
        )}
      </Modal>
    </>
  );
}
