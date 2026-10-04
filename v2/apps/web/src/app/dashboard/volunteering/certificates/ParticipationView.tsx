"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, LogoLoader, Modal, Segmented, Textarea, matchesSearch } from "@adeeb/design-system";
import { CalendarCheck, Certificate, ChatCenteredText, NotePencil, SealCheck, Sparkle } from "@phosphor-icons/react";
import { MagnifyingGlass, PencilSimple, Prohibit } from "@/app/_components/glyphs";
import { AR_CERTIFICATE, arCount } from "@/lib/arabicCount";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EmptyState } from "../../_components/EmptyState";
import { MasonryGrid } from "../../_components/MasonryGrid";
import { PageHeader } from "../../_components/PageHeader";
import { Pagination } from "../../_components/Pagination";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import {
  issueCertificate, issueCertificates, markAttendance, nominateDistinction, revokeParticipation, volunteerRecord, withholdCertificate,
} from "../actions";
import type { CertificatesRoom, CertQueueRow, IssuedCertRow, ManualIssueOptions, VolunteerRow } from "../data";
import { timeOf } from "../OpportunityCard";
import { VolunteerHero, VolunteerRecord } from "../volunteers/VolunteerRecord";
import { AwaitOpportunityCard, OwedOpportunityCard, type AwaitHandlers, type OwedHandlers } from "./AwaitingCards";
import { CertificateCard } from "./CertificateCard";
import { ManualIssueModal } from "./ManualIssueModal";

type Tab = "awaiting" | "owed" | "issued";
const TABS: Tab[] = ["awaiting", "owed", "issued"];
const TAB_LABEL: Record<Tab, string> = {
  awaiting: "بانتظار الحضور",
  owed: "جاهزة لم تصدر",
  issued: "السجلّ",
};

const findQueue = (rows: CertQueueRow[], q: string) =>
  q ? rows.filter((r) => matchesSearch(q, `${r.name} ${r.phone} ${r.opportunity}`)) : rows;

/**
 * **شهاداتُ المتطوّعين** — دفترٌ واحدٌ للفرص كلِّها، بثلاثة تبويباتٍ على ترتيب الحياة:
 *
 * 1. **بانتظار الحضور**: مقبولٌ في فرصةٍ حلّ موعدُها لم يُسجَّل حضورُه. **كرتٌ لكلّ فرصة** (`AwaitOpportunityCard`،
 *    مُقَرٌّ ٢٠٢٦-١٠-٠٣) والحضورُ زرّان في سطر المتطوّع نفسِه، والضغطُ على المتطوّع يفتح ملفَّه.
 * 2. **جاهزة لم تصدر**: حضر ولم تصدر شهادتُه. **كلُّ حاضرٍ يأخذ شهادتَه** (سياسةُ المجلس الإداريّ ٢٠٢٦-١٠-٠٣،
 *    كانت «يستحقّ ولا يستحقّ» قبلها)، فهنا الإصدار، للكلّ من شريط الأدوات أو لواحدٍ بزرّه، ومعه ترشيحُه للتميّز
 *    بجملةٍ تُطبع في شهادته، وحجبُها استثناءً بسببٍ مكتوب (`OwedOpportunityCard`).
 * 3. **السجلّ**: الصادرةُ كلُّها، ساريةً ومُبطَلة، بكرت «الختم» المُقَرّ: تُنزَّل من لقطتها وتُبطَل بسبب.
 *
 * **كروتٌ لا جداول** (أمرُ المالك ٢٠٢٦-١٠-٠١): الطابوران بكرت الفرصة (`AwaitingCards`)، والسجلُّ بكرته. ولأنّ
 * الكرتَ بلا تحديد، صار الإصدارُ الجماعيّ «إصدار الكلّ» بتأكيدٍ يقول العدد، والفرديُّ زرًّا في سطر الحاضر.
 *
 * وحلولُ الموعد يُقرأ من `timeOf` (مصدرُ كرت الفرصة نفسُه)، فلا تقول هذه الغرفةُ «تأخّر» عن فرصةٍ
 * يقول كرتُها إنّها لم تبدأ.
 */
export function ParticipationView({ room, today, manual }: {
  room: CertificatesRoom;
  today: string;
  /** خياراتُ «إصدار شهادة» لمتطوّعٍ بلا طلب، وغيابُها يُسقط الفعل (معاينةُ المعرض). */
  manual?: ManualIssueOptions;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("awaiting");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [issuingAll, setIssuingAll] = useState(false);
  const [revoking, setRevoking] = useState<IssuedCertRow | null>(null);
  const [drawing, setDrawing] = useState<{ id: string; kind: "pdf" | "png" } | null>(null);
  const [reason, setReason] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  // الطابور: زرُّ السطر الذي يعمل (`<id>-yes|no|issue`) بانتقالٍ وحدَه، فلا يدور زرٌّ في سطرٍ لعملٍ في تبويبٍ آخر
  const [rowPending, startRow] = useTransition();
  const [rowKey, setRowKey] = useState<string | null>(null);
  // نافذةُ السطر في «جاهزة لم تصدر»: جملةُ التميّز أو سببُ الحجب
  const [asking, setAsking] = useState<{ kind: "distinction" | "withhold"; row: CertQueueRow } | null>(null);
  const [askText, setAskText] = useState("");
  // الملفُّ يبقى في النافذة وهي تُغلَق، فلا تفرغ في حركة خروجها؛ و`null` وهي مفتوحةٌ يعني أنّه يُجلَب
  const [profileOf, setProfileOf] = useState<CertQueueRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<VolunteerRow | null>(null);

  // الدَّينُ ما حلّ موعدُه: مقبولٌ في فرصةٍ لم تبدأ ليس متأخّرًا بشيء
  const awaiting = useMemo(() => {
    return room.awaiting.filter((r) => {
      const t = timeOf(r, today);
      return t.ended || t.running;
    });
  }, [room.awaiting, today]);

  const counts: Record<Tab, number> = { awaiting: awaiting.length, owed: room.owed.length, issued: room.issued.length };

  const changeTab = (t: Tab) => {
    setTab(t);
    setSearch("");
    setFilters({});
  };

  // البحثُ عثورٌ على صفٍّ تعرفه، والمجموعاتُ تُبنى بعده فلا يبقى شريطُ فرصةٍ بلا كروت
  const q = search.trim();
  const awaitingShown = useMemo(() => findQueue(awaiting, q), [awaiting, q]);
  const owedShown = useMemo(() => findQueue(room.owed, q), [room.owed, q]);
  // كرتٌ لكلّ فرصة بترتيب ظهورها في الطابور
  const awaitingByOpp = useMemo(() => {
    const m = new Map<string, CertQueueRow[]>();
    for (const r of awaitingShown) m.set(r.oppId, [...(m.get(r.oppId) ?? []), r]);
    return [...m.values()];
  }, [awaitingShown]);

  const issuedShown = useMemo(
    () => room.issued.filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      return matchesSearch(q, `${r.name} ${r.paperName} ${r.holderName} ${r.opportunity} ${r.serial}`);
    }),
    [room.issued, filters, q],
  );

  const pageKey = `${tab}|${q}|${pageSize}|${JSON.stringify(filters)}`;
  const [prevKey, setPrevKey] = useState(pageKey);
  if (prevKey !== pageKey) { setPrevKey(pageKey); setPage(1); }
  const totalPages = Math.max(1, Math.ceil(issuedShown.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const issuedPage = issuedShown.slice((safePage - 1) * pageSize, safePage * pageSize);

  const after = (r: { ok: boolean; message: string }) => {
    if (!r.ok) { toast.error(r.message); return false; }
    toast.success(r.message);
    router.refresh();
    return true;
  };


  /** «الكلّ» هو المعروض: من ضيّق بالبحث أصدر لمن رآه، والتأكيدُ يقول العددَ قبل الفعل. */
  const issueAll = () => {
    start(async () => {
      if (after(await issueCertificates(owedShown.map((r) => r.id)))) setIssuingAll(false);
    });
  };

  /** الورقةُ تُرسَم من **اللقطة** لا من حال المتطوّع اليوم: الشهادةُ واحدةٌ لا تتبدّل بإعادة التنزيل. */
  const draw = async (r: IssuedCertRow, kind: "png" | "pdf") => {
    setDrawing({ id: r.id, kind });
    try {
      // راسمُ الورق ثقيل، فيُحمَّل عند الطلب لا مع الصفحة (سنّةُ `/me`)
      const mod = await import("@/lib/certificates/participation");
      const paper = {
        name: r.paperName, serial: r.serial, opportunity: r.opportunity,
        gender: r.gender, from: r.servedFrom, to: r.servedTo, hours: r.hours, distinction: r.distinction,
      };
      await (kind === "pdf" ? mod.downloadParticipationPdf(paper) : mod.downloadParticipation(paper));
      toast.success("نُزّلت الشهادة.");
    } catch {
      toast.error("تعذّر رسمُ الشهادة. حاول مجدّدًا.");
    } finally {
      setDrawing(null);
    }
  };

  const submitRevoke = () => {
    if (!revoking) return;
    start(async () => {
      if (after(await revokeParticipation(revoking.id, reason))) { setRevoking(null); setReason(""); }
    });
  };

  const openRecord = (oppId: string) => router.push(`/dashboard/volunteering/${oppId}`);

  /** فعلُ سطرٍ في الطابور: يدور زرُّه حتى يعود الطابورُ من القاعدة بحاله الجديد، لا حتى يُجاب الطلبُ وحدَه. */
  const rowAct = (key: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setRowKey(key);
    startRow(async () => { after(await fn()); });
  };

  const awaitH: AwaitHandlers = {
    busy: rowPending ? rowKey : null,
    onAttend: (r, a) => rowAct(`${r.id}-${a === "attended" ? "yes" : "no"}`, () => markAttendance(r.id, a, r.oppId)),
    onRecord: openRecord,
    onProfile: async (r) => {
      setProfileOf(r);
      setProfile(null);
      setProfileOpen(true);
      const v = await volunteerRecord(r.userId);
      if (v) setProfile(v);
      else { setProfileOpen(false); toast.error("تعذّر فتحُ ملفّه."); }
    },
  };

  // طابورُ الإصدار: الزرُّ في سطر الحاضر، يدور حتى يغادر السطرُ إلى السجلّ
  const owedH: OwedHandlers = {
    busy: rowPending ? rowKey : null,
    onIssue: (r) => rowAct(`${r.id}-issue`, () => issueCertificate(r.id, r.oppId)),
    onDistinction: (r) => { setAsking({ kind: "distinction", row: r }); setAskText(r.distinctionNote ?? ""); },
    onWithhold: (r) => { setAsking({ kind: "withhold", row: r }); setAskText(""); },
    onRecord: openRecord,
    onProfile: awaitH.onProfile,
  };
  const owedByOpp = useMemo(() => {
    const m = new Map<string, CertQueueRow[]>();
    for (const r of owedShown) m.set(r.oppId, [...(m.get(r.oppId) ?? []), r]);
    return [...m.values()];
  }, [owedShown]);

  const submitAsk = (text = askText) => {
    if (!asking) return;
    const { kind, row } = asking;
    rowAct(`${row.id}-${kind}`, async () => {
      const res = kind === "distinction"
        ? await nominateDistinction(row.id, text, row.oppId)
        : await withholdCertificate(row.id, text, row.oppId);
      if (res.ok) setAsking(null);
      return res;
    });
  };



  const statusFilter: FilterDef[] = [
    { key: "status", label: "الحالة", options: [{ value: "active", label: "سارية" }, { value: "revoked", label: "مبطَلة" }] },
  ];

  /** **فراغُ البحث غيرُ فراغِ الكشف**: «لا شيء هنا» وفي التبويب صفوفٌ كذبٌ يُقلق قارئَه. */
  const noMatch = (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا نتيجةَ تطابق طلبك"
      description="لم يطابق بحثُك ولا تصفيتُك أحدًا في هذا التبويب."
      action={<Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilters({}); }}>مسحُ البحث والتصفية</Button>}
    />
  );

  return (
    <>
      {/* فعلُ الرأس: شهادةٌ لمن شارك بلا طلب (٢٠٢٦-١٠-٠٣) — ما سواه يصدر من طابوره */}
      <PageHeader
        title="شهادات المتطوّعين"
        action={manual ? { label: "إصدار شهادة", icon: <SealCheck size={18} />, onClick: () => setManualOpen(true) } : undefined}
      />

      <div style={{ marginBottom: 16 }}>
        {/* ممتدٌّ على الصفّ: الخيارُ هنا هو الشاشةُ نفسُها (سنّةُ سجلّ المتطوّعين وكشف الفرص) */}
        <Segmented
          wide
          aria-label="أيّ دفتر"
          items={TABS.map((t) => ({ value: t, label: <>{TAB_LABEL[t]} <span className="seg-num">{counts[t]}</span></> }))}
          value={tab}
          onValueChange={(v) => changeTab(v as Tab)}
        />
      </div>

      {tab === "awaiting" ? (
        <>
          <Toolbar searchPlaceholder="اسم أو جوّال أو فرصة" search={search} onSearch={setSearch} />
          {awaitingByOpp.length ? (
            // عمودان كتبويب السجلّ في الشاشة نفسِها (القاعدة ٦، سؤالُ المالك ٢٠٢٦-١٠-٠٣)، وكلُّ كرتٍ بطول سطوره
            // وكلُّ عمودٍ ينساب وحدَه (`MasonryGrid`): فرصةٌ بعشرة متطوّعين بجوار فرصةٍ بواحدٍ لا تفتح تحت القصيرة فراغًا
            <MasonryGrid>
              {awaitingByOpp.map((g) => <AwaitOpportunityCard key={g[0]!.oppId} rows={g} {...awaitH} />)}
            </MasonryGrid>
          ) : (
            <div className="card-empty">
              {q ? noMatch : (
                <EmptyState
                  variant="soft"
                  icon={<CalendarCheck />}
                  title="لا أحدَ ينتظر تأكيدَ حضوره"
                  description="كلُّ من قُبل في فرصةٍ حلّ موعدُها سُجّل حضورُه."
                />
              )}
            </div>
          )}
        </>
      ) : null}

      {tab === "owed" ? (
        <>
          <Toolbar
            searchPlaceholder="اسم أو جوّال أو فرصة"
            search={search}
            onSearch={setSearch}
            actions={
              owedShown.length > 0 ? (
                <Button variant="primary" size="sm" onClick={() => setIssuingAll(true)}>
                  <SealCheck aria-hidden /> إصدار الكلّ
                </Button>
              ) : null
            }
          />
          {/* كرتُ الفرصة نفسُه الذي في «بانتظار الحضور» (٢٠٢٦-١٠-٠٣)، والإصدارُ زرٌّ في سطر كلّ حاضر */}
          {owedByOpp.length ? (
            // عمودان ينساب كلٌّ منهما وحدَه، كطابور الحضور
            <MasonryGrid>
              {owedByOpp.map((g) => <OwedOpportunityCard key={g[0]!.oppId} rows={g} {...owedH} />)}
            </MasonryGrid>
          ) : (
            <div className="card-empty">
              {q ? noMatch : (
                <EmptyState
                  variant="soft"
                  icon={<SealCheck />}
                  title="لا شهادةَ جاهزةً معلّقة"
                  description="كلُّ من حضر صدرت شهادتُه أو حُجبت بسببها."
                />
              )}
            </div>
          )}
        </>
      ) : null}

      {tab === "issued" ? (
        <>
          <Toolbar
            searchPlaceholder="ابحث بالاسم أو الفرصة أو الرقم المرجعيّ…"
            search={search}
            onSearch={setSearch}
            filters={statusFilter}
            filterValues={filters}
            onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            onReset={() => setFilters({})}
          />
          {/* «الختم» المُقَرّ (`CertificateCard`) لا كرتُ الحقائق العامّ: أعجبه تخطيطُه ورأى تصميمَه
              «أقلّ من عادي» (٢٠٢٦-١٠-٠١)، فصُمّم له كرتٌ في المكتبة بمعرضه، واختاره من هيئتين */}
          {issuedPage.length ? (
            <div className="card-grid card-grid-2col">
              {issuedPage.map((c) => (
                <CertificateCard
                  key={c.id}
                  c={c}
                  busy={drawing?.id === c.id ? drawing.kind : null}
                  onDownload={(x, kind) => void draw(x, kind)}
                  onRecord={(x) => { if (x.oppId) openRecord(x.oppId); }}
                  onRevoke={(x) => { setRevoking(x); setReason(""); }}
                />
              ))}
            </div>
          ) : (
            <div className="card-empty">
              {room.issued.length === 0 ? (
                <EmptyState
                  variant="aurora"
                  icon={<Certificate />}
                  title="لا شهادات بعد"
                  description="تصدر الشهادةُ لكلّ من حضر، فتُحفظ هنا برقمها المرجعيّ."
                />
              ) : noMatch}
            </div>
          )}
          {issuedShown.length > 0 ? (
            <div className="card-pager">
              <Pagination
                page={safePage} pageSize={pageSize} total={issuedShown.length}
                onPageChange={setPage} onPageSizeChange={setPageSize} noun="شهادة"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {/* نافذةُ السطر: جملةُ التميّز تُطبع في شهادته، وسببُ الحجب يُحفظ ويراه صاحبُه (كسجلّ الفرصة نفسِه) */}
      <Modal
        open={asking !== null}
        onClose={() => setAsking(null)}
        size="sm"
        busy={rowPending}
        title={asking?.kind === "withhold" ? "حجبُ الشهادة" : "ترشيحٌ للتميّز"}
        description={asking ? `${asking.row.name}، ${asking.row.opportunity}. ${asking.kind === "withhold"
          ? "استثناءٌ لمخالفةٍ صريحة: يُحفظ السببُ في السجلّ، ويراه صاحبُه. ويُرفع الحجبُ من سجلّ الفرصة."
          : "تصدر الشهادةُ بختم «بتميّز»، وتُطبع جملتُك فيها كما تكتبها."}` : undefined}
        footer={
          <>
            {asking?.kind === "distinction" && asking.row.distinctionNote ? (
              <Button variant="ghost-danger" size="md" disabled={rowPending} onClick={() => submitAsk("")}>إلغاءُ الترشيح</Button>
            ) : null}
            <Button variant="ghost" size="md" onClick={() => setAsking(null)} disabled={rowPending}>إلغاء</Button>
            <Button variant={asking?.kind === "withhold" ? "danger" : "primary"} size="md" loading={rowPending}
              disabled={askText.trim().length < 5} onClick={() => submitAsk()}>
              {asking?.kind === "withhold" ? "حجبُ الشهادة" : "ترشيحُه"}
            </Button>
          </>
        }
      >
        <Textarea
          label={asking?.kind === "withhold" ? "سببُ الحجب" : "سببُ تميّزه"}
          icon={asking?.kind === "withhold" ? <Prohibit /> : <Sparkle />} innerIcon={<PencilSimple />}
          placeholder={asking?.kind === "withhold" ? "ما الذي خالف فيه" : "مثلًا: أدار ركن الاستقبال وحده بعد غياب زميله"}
          rows={3} maxLength={asking?.kind === "distinction" ? 300 : undefined}
          value={askText} onChange={(e) => setAskText(e.target.value)} required helper="خمسة أحرف فأكثر."
        />
      </Modal>

      {/* ملفُّ المتطوّع: نافذةُ سجلّ المتطوّعين نفسُها لا شكلٌ ثانٍ لها، تُجلَب عند الضغط */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={profileOf?.name ?? "الملفّ"}
        size="md"
        className="pvb-modal"
        hero={profile ? <VolunteerHero v={profile} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setProfileOpen(false)}>إغلاق</Button>}
      >
        {profile ? <VolunteerRecord v={profile} /> : <LogoLoader orientation="horizontal" minHeight="240px" label="يُجلَب الملفّ…" />}
      </Modal>

      {manual ? <ManualIssueModal open={manualOpen} onClose={() => setManualOpen(false)} options={manual} /> : null}

      <ConfirmDialog
        open={issuingAll}
        onClose={() => setIssuingAll(false)}
        tone="success"
        icon={<SealCheck />}
        title="إصدار الشهادات الجاهزة؟"
        text={`تصدر الآن ${arCount(owedShown.length, AR_CERTIFICATE)} لمن في هذا الكشف، كلٌّ برقمه المرجعيّ، وتظهر في حساب صاحبها.`}
        confirmLabel="إصدار"
        loading={pending}
        onConfirm={issueAll}
      />

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title="إبطال الشهادة"
        description="لا تُمحى، تبقى في السجلّ مشطوبةً بسببها. ويعود صاحبُها إلى «جاهزة لم تصدر» حتى تُصدَر له من جديد أو تُحجب بسببها."
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} disabled={reason.trim().length < 5} onClick={submitRevoke}>
              <Prohibit aria-hidden /> إبطال
            </Button>
            <Button variant="ghost-danger" size="md" onClick={() => setRevoking(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        {revoking ? (
          <Alert tone="danger" title={`${revoking.paperName}، ${revoking.serial}`}>
            الورقةُ التي بيده لا تُسترجع؛ الإبطالُ يُعلن في السجلّ أنّها لم تعد معتمدة.
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإبطال"
          icon={<ChatCenteredText />}
          innerIcon={<NotePencil />}
          placeholder="لماذا أُبطلت؟ (خطأٌ في الاسم أو المدّة، أو مخالفةٌ تستوجب حجبَها…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر."
        />
      </Modal>
    </>
  );
}
