"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Textarea } from "@adeeb/design-system";
import { CalendarBlank, ChatText, HandHeart, MapPin, UsersThree } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { createClient } from "@/lib/supabase/client";
import type { MyApplication, MyCertificate, MyPeriod, MyVolunteering as Data } from "./volunteering";

const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  NOT_VOLUNTEER: "لستَ من المتطوّعين.",
  OPPORTUNITY_CLOSED: "انتهى التقديم على هذه الفرصة.",
  OPPORTUNITY_NOT_FOUND: "لم نجد هذه الفرصة.",
  WRONG_GENDER: "هذه الفرصة موجَّهةٌ لفئةٍ أخرى.",
  ALREADY_APPLIED: "قدّمتَ على هذه الفرصة سلفًا.",
  NOT_WITHDRAWABLE: "لا يُسحَب التقديمُ بعد مراجعته.",
  // الفترات (٢٠٢٦-١٠-٠١)
  PERIOD_REQUIRED: "اختر فترتك من فترات الفرصة.",
  NO_PERIOD: "اختر فترةً واحدةً على الأقلّ.",
  BAD_PERIOD: "فترةٌ لا تتبع هذه الفرصة. حدّث الصفحة.",
  PERIOD_PASSED: "انتهت فترةٌ اخترتها، فاختر غيرها.",
  PERIOD_FULL: "اكتمل عددُ فترةٍ اخترتها. اختر غيرها.",
  // اعتذارُ المقبول (٢٠٢٦-١٠-٠٣)
  REASON_REQUIRED: "اكتب سببَ اعتذارك.",
  NOT_EXCUSABLE: "لا يُعتذر عن هذا التقديم. حدّث الصفحة.",
  ALREADY_STARTED: "بدأ موعدُك، فلا يُعتذر عنه الآن. تواصل مع المشرف.",
};

/** زرُّ التقديم بعدد ما اختير، بالمثنّى لا «2 فترات». */
const applyLabel = (n: number): string =>
  n <= 1 ? "التقديم على الفترة" : n === 2 ? "التقديم على الفترتين" : n <= 10 ? `التقديم على ${n} فترات` : `التقديم على ${n} فترةً`;

/** حالُ الفترة تحت اسمها: ما يمنع اختيارَها أوّلًا، وإلّا ما بقي من مقاعدها. */
const periodNote = (p: MyPeriod): string =>
  p.mine ? "قدّمتَ عليها" : p.passed ? "انتهت" : p.full ? "اكتمل عددُها"
    : p.seats == null ? "العددُ مفتوح" : `باقٍ ${p.seats - p.taken} من ${p.seats}`;
const rpcError = (raw: string | null | undefined): string => {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر تنفيذ طلبك. حاول مجدّدًا.";
};

const STATUS: Record<MyApplication["status"], { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  accepted: { label: "مقبول", tone: "success" },
  rejected: { label: "غير مقبول", tone: "danger" },
  withdrawn: { label: "مسحوب", tone: "neutral" },
  expired: { label: "انتهى الموعد قبل المراجعة", tone: "neutral" },
  excused: { label: "اعتذرت", tone: "neutral" },
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
  // الاعتذارُ المفتوحُ الآن وسببُه المكتوب
  const [excusing, setExcusing] = useState<string | null>(null);
  const [excuse, setExcuse] = useState("");
  // ما اختاره من فترات كلِّ فرصة: يقدّم على فترةٍ أو أكثر بضغطةٍ واحدة
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const toggle = (oppId: string, periodId: string) => setPicked((m) => {
    const cur = m[oppId] ?? [];
    return { ...m, [oppId]: cur.includes(periodId) ? cur.filter((x) => x !== periodId) : [...cur, periodId] };
  });

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
        gender: c.gender, from: c.servedFrom, to: c.servedTo, hours: c.hours, distinction: c.distinction,
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
    if (error) { setErr(rpcError(error.message)); return false; }
    router.refresh();
    return true;
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
                    {o.periods.length === 0 ? (
                      <Badge tone={o.seats != null && o.taken >= o.seats ? "danger" : "neutral"}>
                        {o.seats == null ? `العدد مفتوح` : `المطلوب ${o.seats}، قُبل ${o.taken}`}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-content-muted text-sm leading-relaxed">{o.description}</p>
                  <div className="text-content-muted flex flex-wrap items-center gap-4 text-sm">
                    {o.periods.length === 0 && (o.dateLabel || o.timeLabel) ? (
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={16} aria-hidden />
                        {[o.dateLabel, o.timeLabel].filter(Boolean).join("، ")}
                      </span>
                    ) : null}
                    {o.location ? (
                      <span className="flex items-center gap-1"><MapPin size={16} aria-hidden />{o.location}</span>
                    ) : null}
                    {o.committee ? (
                      <span className="flex items-center gap-1"><UsersThree size={16} aria-hidden />{o.committee}</span>
                    ) : null}
                  </div>
                  {o.periods.length ? (
                    // **فتراتُها** (٢٠٢٦-١٠-٠١): يختار المتطوّعُ فترةً أو أكثر، وما قدّم عليه أو اكتمل أو مضى يُعرض ولا يُختار
                    <>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold">اختر فترتك، أو أكثر من فترة</span>
                        {o.periods.map((p) => (
                          <Checkbox
                            key={p.id}
                            label={p.label}
                            description={periodNote(p)}
                            disabled={p.mine || p.full || p.passed}
                            checked={p.mine || (picked[o.id] ?? []).includes(p.id)}
                            onChange={() => toggle(o.id, p.id)}
                          />
                        ))}
                      </div>
                      <div className="btn-row">
                        <Button
                          variant="primary" size="sm"
                          loading={busy === o.id}
                          disabled={(picked[o.id] ?? []).length === 0}
                          onClick={() => act(
                            () => sb.rpc("apply_for_periods", { p_opportunity_id: o.id, p_period_ids: picked[o.id] ?? [] }),
                            o.id,
                          ).then(() => setPicked((m) => ({ ...m, [o.id]: [] })))}
                        >
                          {applyLabel((picked[o.id] ?? []).length)}
                        </Button>
                      </div>
                    </>
                  ) : (
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
                  )}
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
                {a.period ? <p className="text-content-muted text-sm">{a.period}</p> : null}
                {a.status === "rejected" && a.decisionReason ? (
                  <p className="text-content-muted text-sm">السبب: {a.decisionReason}</p>
                ) : null}
                {a.status === "excused" && a.excuseReason ? (
                  <p className="text-content-muted text-sm">سببُ اعتذارك: {a.excuseReason}</p>
                ) : null}
                {a.attendance === "attended" ? (
                  <p className="text-content-muted text-sm">
                    {a.flexible ? "أنجزتَ العمل" : a.period ? "حضرتَ الفترة" : "حضرتَ الفرصة"}
                    {/* كلُّ حاضرٍ يأخذ شهادتَه (٢٠٢٦-١٠-٠٣)، والمحجوبةُ تُقال بسببها */}
                    {a.deservesCertificate === false ? `، وحُجبت شهادتُك${a.denialReason ? `: ${a.denialReason}` : ""}` : "، ولك شهادةُ المشاركة"}
                  </p>
                ) : null}
                {a.attendance === "absent" ? (
                  <p className="text-content-muted text-sm">{a.flexible ? "سُجّل أنّك لم تنجز العمل." : a.period ? "سُجّل غيابُك عن هذه الفترة." : "سُجّل غيابُك عن هذه الفرصة."}</p>
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
                {/* **اعتذارُ المقبول** (أمرُ المالك ٢٠٢٦-١٠-٠٣): ما لم يبدأ موعدُه، وبسببٍ إلزاميٍّ يقرؤه المشرف.
                    ومقعدُه يعود لغيره، فإن كانت الفرصةُ أُغلقت لاكتمال عددها فُتحت */}
                {a.canExcuse && excusing !== a.id ? (
                  <div className="btn-row">
                    <Button variant="ghost-danger" size="sm" onClick={() => { setExcusing(a.id); setExcuse(""); }}>
                      الاعتذارُ عن المشاركة
                    </Button>
                  </div>
                ) : null}
                {a.canExcuse && excusing === a.id ? (
                  <div className="flex flex-col gap-3">
                    <Textarea
                      label="سببُ الاعتذار" icon={<ChatText />} innerIcon={<PencilSimple />} rows={2} required value={excuse}
                      placeholder="ما الذي يمنعك؟ يقرؤه المشرف وحدَه."
                      onChange={(e) => setExcuse(e.target.value)}
                    />
                    <div className="btn-row">
                      <Button
                        variant="danger" size="sm" loading={busy === a.id} disabled={!excuse.trim()}
                        onClick={() => act(() => sb.rpc("excuse_my_application", { p_id: a.id, p_reason: excuse.trim() }), a.id)
                          .then((ok) => { if (ok) setExcusing(null); })}
                      >
                        إرسالُ الاعتذار
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExcusing(null)}>تراجع</Button>
                    </div>
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
