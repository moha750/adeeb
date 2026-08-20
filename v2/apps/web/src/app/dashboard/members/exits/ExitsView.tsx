"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Modal, Textarea } from "@adeeb/design-system";
import { ChatText } from "@phosphor-icons/react";
import { Question, SignOut } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { EXIT_REASON_MIN } from "@/app/me/vocab";
import { decideExit } from "./actions";
import type { ExitRow, ExitsData } from "./data";

/** حالُ الطلب المنتهي بلونها — والمعنى في الكلمة لا في اللون وحده. */
const STATUS: Record<Exclude<ExitRow["status"], "pending">, { label: string; tone: "success" | "danger" | "neutral" }> = {
  approved: { label: "قُبل", tone: "success" },
  rejected: { label: "رُدّ", tone: "danger" },
  withdrawn: { label: "سحبه صاحبُه", tone: "neutral" },
};

export function ExitsView({ data }: { data: ExitsData }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [reject, setReject] = useState<ExitRow | null>(null);
  const [reason, setReason] = useState("");

  function decide(row: ExitRow, approve: boolean, why?: string) {
    start(async () => {
      const res = await decideExit({ id: row.id, approve, reason: why });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      if (res.ok) {
        setReject(null);
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <PageHeader title="طلبات الخروج" />

      {!data.mayDecide ? (
        <Alert tone="info" title="الاطّلاعُ لك والقضاءُ لغيرك">
          سلطةُ القضاء في كلّ طلبٍ تتبع مقعدَ صاحبه: قائدا الإدارتين للرئيسين، وعضوُ الضمان
          لقائد إدارته، وما سواهما لقائد الموارد ومن فوقه. وما تراه ههنا طلباتُك أنت.
        </Alert>
      ) : null}

      {data.pending.length === 0 ? (
        <EmptyState icon={<SignOut />} title="لا طلبَ ينتظر" description="حين يطلب صاحبُ منصبٍ إنهاءَ عضويّته، وقف طلبُه هنا." />
      ) : (
        <div className="flex flex-col gap-4">
          {data.pending.map((r) => (
            <Card key={r.id} tone="warning">
              <CardHeader
                variant="soft"
                icon={<SignOut />}
                title={r.name}
                subtitle={r.seats.length ? `${r.seats.join("، ")}، طلب ${r.since}` : `طلب ${r.since}`}
                actions={<Badge tone="warning" variant="soft" size="sm">ينتظر القرار</Badge>}
              />
              <CardBody>
                <p>{r.reason}</p>
                {data.mayDecide && !r.canDecide ? (
                  <p className="mt-3 text-sm text-content-muted">
                    هذا الطلبُ ليس من مدى سلطتك، وسلطةُ القضاء تتبع مقعدَ صاحبه.
                  </p>
                ) : null}
                {r.canDecide ? (
                  <div className="chip-row" style={{ marginTop: 14 }}>
                    <Button variant="danger" size="sm" loading={busy} onClick={() => decide(r, true)}>
                      اقبل الطلب
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setReason(""); setReject(r); }}>
                      ردَّ الطلب
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {data.past.length ? (
        <div className="flex flex-col gap-4" style={{ marginTop: 32 }}>
          <h2 className="text-lg font-bold">ما قُضي فيه</h2>
          {data.past.map((r) => (
            <Card key={r.id}>
              <CardHeader
                variant="soft"
                icon={<SignOut />}
                title={r.name}
                subtitle={r.decidedAt ? `طلب في ${r.at}، وقُضي في ${r.decidedAt}` : `طلب في ${r.at}`}
                actions={
                  <Badge tone={STATUS[r.status as keyof typeof STATUS].tone} variant="soft" size="sm">
                    {STATUS[r.status as keyof typeof STATUS].label}
                  </Badge>
                }
              />
              <CardBody>
                <p>{r.reason}</p>
                {r.decisionReason ? <p className="mt-2 text-sm text-content-muted">وجوابُه: {r.decisionReason}</p> : null}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ردُّ الطلب لا يكون صمتًا: من طلب الخروجَ يستحقّ جوابًا، والقاعدةُ تشترطه أصلًا */}
      <Modal
        open={reject !== null}
        onClose={() => setReject(null)}
        busy={busy}
        title="ردُّ الطلب"
        description="يصل سببُك إلى صاحب الطلب، فاكتبه له لا للسجلّ."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setReject(null)} disabled={busy}>تراجع</Button>
            <Button
              variant="danger"
              size="md"
              loading={busy}
              disabled={reason.trim().length < EXIT_REASON_MIN}
              onClick={() => reject && decide(reject, false, reason)}
            >
              ردَّ الطلب
            </Button>
          </>
        }
      >
        <Textarea
          label="سببُ الردّ"
          icon={<ChatText />}
          innerIcon={<Question />}
          placeholder="لماذا لا يخرج الآن؟"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helper={`مطلوب، ${EXIT_REASON_MIN} محارف على الأقلّ.`}
        />
      </Modal>
    </>
  );
}
