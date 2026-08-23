"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "@adeeb/design-system";
import { CalendarBlank, HandHeart, MapPin, UsersThree } from "@phosphor-icons/react";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { createClient } from "@/lib/supabase/client";
import type { MyApplication, MyCertificate, MyVolunteering as Data } from "./volunteering";

const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  NOT_VOLUNTEER: "لستَ من المتطوّعين.",
  OPPORTUNITY_CLOSED: "أُغلقت هذه الفرصة.",
  OPPORTUNITY_NOT_FOUND: "لم نجد هذه الفرصة.",
  WRONG_GENDER: "هذه الفرصة موجَّهةٌ لفئةٍ أخرى.",
  ALREADY_APPLIED: "قدّمتَ على هذه الفرصة سلفًا.",
  NOT_WITHDRAWABLE: "لا يُسحَب التقديمُ بعد حسمه.",
};
const rpcError = (raw: string | null | undefined): string => {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر تنفيذ طلبك. حاول مجدّدًا.";
};

const STATUS: Record<MyApplication["status"], { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  accepted: { label: "مقبول", tone: "success" },
  rejected: { label: "غير مقبول", tone: "danger" },
  withdrawn: { label: "مسحوب", tone: "neutral" },
};

/**
 * **خانةُ التطوّع في بيت صاحب الحساب.**
 *
 * الفرصةُ تُعلَن في قروب المتطوّعين ورابطُها يقود إلى هنا — فالقروبُ إعلانٌ، وهذه الخانةُ
 * مصدرُ الحقيقة: ما فُتح، وما قدّمتَ عليه، وما حُسم فيه.
 */
export function MyVolunteering({ data }: { data: Data }) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!data.isVolunteer) {
    return (
      <Card>
        <CardHeader
          variant="soft"
          icon={<HandHeart weight={ICON_WEIGHT} aria-hidden />}
          title="طريقُك إلى العضويّة"
          subtitle="تطوّع معنا، ومن رأينا عملَه أهديناه العضويّة"
        />
        <CardBody className="flex flex-col gap-4">
          <p className="text-content-muted text-sm leading-relaxed">
            رتّب رغباتك في لجان أدِيب فتصير من متطوّعيه، وتُعرَض عليك الفرصُ التطوّعيّة ههنا.
          </p>
          <div>
            <Link href="/join" className="abtn abtn-primary abtn-md">تقديم طلب العضويّة</Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  /** رسمُ الشهادة يُحمَّل عند الطلب: راسمُ الورق ثقيلٌ فلا يُحمَّل مع الصفحة. */
  const draw = async (c: MyCertificate, kind: "png" | "pdf") => {
    setErr(null);
    setBusy(`${c.id}-${kind}`);
    try {
      const mod = await import("@/lib/certificates/participation");
      const paper = {
        name: c.holderName, serial: c.serial, opportunity: c.opportunityTitle,
        gender: c.gender, from: c.servedFrom, to: c.servedTo,
      };
      await (kind === "pdf" ? mod.downloadParticipationPdf(paper) : mod.downloadParticipation(paper));
    } catch {
      setErr("تعذّر رسمُ الشهادة. حاول مجدّدًا.");
    } finally {
      setBusy(null);
    }
  };

  const act = async (fn: () => PromiseLike<{ error: { message: string } | null }>, key: string) => {
    setErr(null);
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) { setErr(rpcError(error.message)); return; }
    router.refresh();
  };

  return (
    <Card>
      <CardHeader
        variant="soft"
        icon={<HandHeart weight={ICON_WEIGHT} aria-hidden />}
        title="تطوّعي"
        subtitle="أنت من متطوّعي أدِيب"
      />
      <CardBody className="flex flex-col gap-6">
        {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

        {/* الرغبات */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold">رغباتك في اللجان</span>
          <div className="flex flex-wrap items-center gap-2">
            {data.prefs.map((name, i) => (
              <Badge key={i} tone="neutral">{`${i + 1}. ${name}`}</Badge>
            ))}
            <Link href="/join" className="text-sm font-bold underline">تعديل</Link>
          </div>
        </div>

        {/* الفرصُ المفتوحة */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold">الفرصُ المفتوحة</span>
          {data.open.length === 0 ? (
            <p className="text-content-muted text-sm">لا فرصَ مفتوحةً لك الآن. تُعلَن في القروب وتظهر ههنا.</p>
          ) : (
            data.open.map((o) => (
              // مِرساةُ الرابط القصير `/v/<id>` — يهبط قاصدُ الفرصة عليها لا على رأس الصفحة
              <div key={o.id} id={`opp-${o.id}`} style={{ scrollMarginTop: 96 }}>
              <Card tone="neutral">
                <CardBody className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{o.title}</span>
                    <Badge tone={o.seats != null && o.taken >= o.seats ? "danger" : "neutral"}>
                      {o.seats == null ? `العدد مفتوح` : `المطلوب ${o.seats}، قُبل ${o.taken}`}
                    </Badge>
                  </div>
                  <p className="text-content-muted text-sm leading-relaxed">{o.description}</p>
                  <div className="text-content-muted flex flex-wrap items-center gap-4 text-sm">
                    {o.dateLabel || o.durationNote ? (
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={16} aria-hidden />
                        {[o.dateLabel, o.durationNote].filter(Boolean).join("، ")}
                      </span>
                    ) : null}
                    {o.location ? (
                      <span className="flex items-center gap-1"><MapPin size={16} aria-hidden />{o.location}</span>
                    ) : null}
                    {o.committee ? (
                      <span className="flex items-center gap-1"><UsersThree size={16} aria-hidden />{o.committee}</span>
                    ) : null}
                  </div>
                  <div className="btn-row">
                    <Button
                      variant="primary" size="sm"
                      loading={busy === o.id}
                      disabled={o.seats != null && o.taken >= o.seats}
                      onClick={() => act(() => sb.rpc("apply_for_opportunity", { p_opportunity_id: o.id }), o.id)}
                    >
                      {o.seats != null && o.taken >= o.seats ? "اكتمل العدد" : "التقديم على الفرصة"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
              </div>
            ))
          )}
        </div>

        {/* شهاداتي — تُرسَم في المتصفّح من لقطتها المخزَّنة، وتُنزَّل صورةً أو PDF */}
        {data.certificates.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold">شهاداتك</span>
            {data.certificates.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-col">
                  <span className="font-bold">{c.opportunityTitle}</span>
                  <span className="text-content-muted text-sm">{`صدرت في ${c.issuedLabel}، برقم ${c.serial}`}</span>
                </div>
                <div className="btn-row">
                  <Button
                    variant="primary" size="sm" loading={busy === `${c.id}-png`}
                    onClick={() => draw(c, "png")}
                  >
                    تنزيل صورة
                  </Button>
                  <Button
                    variant="ghost" size="sm" loading={busy === `${c.id}-pdf`}
                    onClick={() => draw(c, "pdf")}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* تقديماتي */}
        {data.applications.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold">تقديماتك</span>
            {data.applications.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{a.title}</span>
                  <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                </div>
                {a.status === "rejected" && a.decisionReason ? (
                  <p className="text-content-muted text-sm">السبب: {a.decisionReason}</p>
                ) : null}
                {a.attendance === "attended" ? (
                  <p className="text-content-muted text-sm">
                    حضرتَ الفرصة
                    {a.deservesCertificate === false && a.denialReason ? `، ولم تُمنح شهادةً: ${a.denialReason}` : ""}
                    {a.deservesCertificate === true ? "، وتستحقّ شهادة المشاركة" : ""}
                  </p>
                ) : null}
                {a.attendance === "absent" ? (
                  <p className="text-content-muted text-sm">سُجّل غيابُك عن هذه الفرصة.</p>
                ) : null}
                {a.status === "pending" ? (
                  <div className="btn-row">
                    <Button
                      variant="ghost-danger" size="sm"
                      loading={busy === a.id}
                      onClick={() => act(() => sb.rpc("withdraw_my_application", { p_id: a.id }), a.id)}
                    >
                      سحبُ التقديم
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
