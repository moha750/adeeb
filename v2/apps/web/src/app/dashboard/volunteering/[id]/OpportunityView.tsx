"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, Modal, Textarea } from "@adeeb/design-system";
import { EmptyState } from "../../_components/EmptyState";
import { CalendarBlank, MapPin, UsersThree } from "@phosphor-icons/react";
import { CheckCircle, PencilSimple, XCircle } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { useToast } from "../../_components/ToastProvider";
import { decideApplication, evaluate, issueCertificate, markAttendance } from "../actions";
import type { AppRow, OppDetail } from "../data";

const STATUS: Record<AppRow["status"], { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  accepted: { label: "مقبول", tone: "success" },
  rejected: { label: "غير مقبول", tone: "danger" },
  withdrawn: { label: "مسحوب", tone: "neutral" },
};

type Ask =
  | { kind: "reject"; row: AppRow }
  | { kind: "deny"; row: AppRow }
  | { kind: "note"; row: AppRow }
  | null;

/**
 * **سجلُّ الفرصة** — واقعةٌ واحدةٌ لا سجلُّ متطوّعٍ عامّ: من قدّم، ومن قُبل، ومن حضر، ومن استحقّ
 * شهادتَه. والرفضُ والحرمانُ لا يمرّان بلا سبب (القاعدةُ تردّهما، والشاشةُ تسأل قبل أن تُردّ).
 */
export function OpportunityView({ opp, rows }: { opp: OppDetail; rows: AppRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const run = async (key: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    return r.ok;
  };

  const pending = rows.filter((r) => r.status === "pending");
  const accepted = rows.filter((r) => r.status === "accepted");
  const others = rows.filter((r) => r.status === "rejected" || r.status === "withdrawn");

  const closeAsk = () => { setAsk(null); setReason(""); setNote(""); };

  const confirmAsk = async () => {
    if (!ask) return;
    const { kind, row } = ask;
    const ok = await run(row.id, () =>
      kind === "reject" ? decideApplication(row.id, false, reason, opp.id)
        : kind === "deny" ? evaluate(row.id, false, reason, row.adminNote ?? "", opp.id)
        : evaluate(row.id, row.deservesCertificate === true, row.denialReason ?? "", note, opp.id),
    );
    if (ok) closeAsk();
  };

  return (
    <>
      <PageHeader
        title={opp.title}
        crumbLeaf={opp.title}
        status={{
          tone: opp.seats != null && opp.accepted >= opp.seats ? "danger" : "neutral",
          label: opp.seats == null ? `مفتوح، قُبل ${opp.accepted}` : `المطلوب ${opp.seats}، قُبل ${opp.accepted}`,
        }}
      />

      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <p className="text-content-muted text-sm leading-relaxed">{opp.description}</p>
          <div className="text-content-muted flex flex-wrap items-center gap-4 text-sm">
            {opp.dateLabel || opp.durationNote ? (
              <span className="flex items-center gap-1">
                <CalendarBlank size={16} aria-hidden />
                {[opp.dateLabel, opp.durationNote].filter(Boolean).join("، ")}
              </span>
            ) : null}
            {opp.location ? (
              <span className="flex items-center gap-1"><MapPin size={16} aria-hidden />{opp.location}</span>
            ) : null}
            {opp.committee ? (
              <span className="flex items-center gap-1"><UsersThree size={16} aria-hidden />{opp.committee}</span>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<UsersThree />}
          title="لا مُتقدِّمين بعد"
          description={opp.status === "open" ? "انسخ رابط الفرصة وانشره في قروب المتطوّعين." : "افتح الفرصة ليتقدّم إليها المتطوّعون."}
        />
      ) : null}

      {pending.length > 0 ? (
        <section className="flex flex-col gap-3" style={{ marginTop: 24 }}>
          <h2 className="font-bold">بانتظار الحسم</h2>
          {pending.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-col">
                  <span className="font-bold">{r.name}</span>
                  <span className="text-content-muted text-sm" dir="ltr">{r.phone}</span>
                </div>
                <div className="btn-row">
                  <Button
                    variant="primary" size="sm" loading={busy === r.id}
                    disabled={opp.seats != null && opp.accepted >= opp.seats}
                    onClick={() => run(r.id, () => decideApplication(r.id, true, "", opp.id))}
                  >
                    قبول
                  </Button>
                  <Button variant="ghost-danger" size="sm" onClick={() => setAsk({ kind: "reject", row: r })}>رفض</Button>
                </div>
              </CardBody>
            </Card>
          ))}
          {opp.seats != null && opp.accepted >= opp.seats ? (
            <Alert tone="warning">اكتمل العددُ المطلوب. زِد العددَ في الفرصة أو ارفض الباقين بسبب.</Alert>
          ) : null}
        </section>
      ) : null}

      {accepted.length > 0 ? (
        <section className="flex flex-col gap-3" style={{ marginTop: 24 }}>
          <h2 className="font-bold">سجلُّ الحضور والتقييم</h2>
          {accepted.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-content-muted text-sm" dir="ltr">{r.phone}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.attendance ? (
                      <Badge tone={r.attendance === "attended" ? "success" : "danger"}>
                        {r.attendance === "attended" ? "حضر" : "غاب"}
                      </Badge>
                    ) : null}
                    {r.certificateSerial ? <Badge tone="success">{`شهادة ${r.certificateSerial}`}</Badge> : null}
                  </div>
                </div>

                {/* الحضورُ أوّلًا، فالتقييمُ لا يُفتح قبله */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={r.attendance === "attended" ? "primary" : "ghost"} size="sm"
                    loading={busy === `${r.id}-att`}
                    onClick={() => run(`${r.id}-att`, () => markAttendance(r.id, "attended", opp.id))}
                  >
                    <CheckCircle size={16} />حاضر
                  </Button>
                  <Button
                    variant={r.attendance === "absent" ? "danger" : "ghost"} size="sm"
                    loading={busy === `${r.id}-abs`}
                    onClick={() => run(`${r.id}-abs`, () => markAttendance(r.id, "absent", opp.id))}
                  >
                    <XCircle size={16} />غائب
                  </Button>

                  {r.attendance === "attended" ? (
                    <>
                      <Button
                        variant={r.deservesCertificate === true ? "primary" : "ghost"} size="sm"
                        loading={busy === `${r.id}-ok`}
                        onClick={() => run(`${r.id}-ok`, () => evaluate(r.id, true, "", r.adminNote ?? "", opp.id))}
                      >
                        يستحقّ الشهادة
                      </Button>
                      <Button
                        variant={r.deservesCertificate === false ? "danger" : "ghost"} size="sm"
                        onClick={() => setAsk({ kind: "deny", row: r })}
                      >
                        لا يستحقّ
                      </Button>
                    </>
                  ) : null}

                  <Button variant="ghost" size="sm" onClick={() => { setNote(r.adminNote ?? ""); setAsk({ kind: "note", row: r }); }}>
                    {r.adminNote ? "تعديلُ الملاحظة" : "ملاحظة"}
                  </Button>

                  {r.deservesCertificate === true && !r.certificateSerial ? (
                    <Button
                      variant="primary" size="sm" loading={busy === `${r.id}-cert`}
                      onClick={() => run(`${r.id}-cert`, () => issueCertificate(r.id, opp.id))}
                    >
                      إصدارُ الشهادة
                    </Button>
                  ) : null}
                </div>

                {r.denialReason ? (
                  <p className="text-content-muted text-sm">سببُ الحرمان: {r.denialReason}</p>
                ) : null}
                {r.adminNote ? (
                  <p className="text-content-muted text-sm">ملاحظةٌ إداريّة (لا يراها المتطوّع): {r.adminNote}</p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="flex flex-col gap-2" style={{ marginTop: 24 }}>
          <h2 className="font-bold">غيرُ المقبولين</h2>
          {others.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
              <span>{r.name}</span>
              <div className="flex items-center gap-2">
                {r.decisionReason ? <span className="text-content-muted text-sm">{r.decisionReason}</span> : null}
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <Modal
        open={ask !== null}
        onClose={closeAsk}
        busy={busy !== null}
        title={ask?.kind === "reject" ? "سببُ الرفض" : ask?.kind === "deny" ? "سببُ الحرمان من الشهادة" : "ملاحظةٌ إداريّة"}
        description={
          ask?.kind === "note"
            ? "لا يراها المتطوّع. وإن كانت مخالفةً تستوجب عقوبةً فمكانُها سجلّ الإنذارات."
            : "يُكتب السببُ ويُحفَظ، ويراه صاحبُه."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={closeAsk}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy !== null} onClick={confirmAsk}>حفظ</Button>
          </>
        }
      >
        {ask?.kind === "note" ? (
          <Textarea
            label="الملاحظة" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="ما تريد تسجيله عن هذا المتطوّع" rows={3}
            value={note} onChange={(e) => setNote(e.target.value)} optional
          />
        ) : (
          <Textarea
            label="السبب" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="يُقرأ كما تكتبه" rows={3}
            value={reason} onChange={(e) => setReason(e.target.value)} required
          />
        )}
      </Modal>
    </>
  );
}
