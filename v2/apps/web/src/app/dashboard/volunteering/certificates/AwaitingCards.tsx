"use client";

import { Button, Card } from "@adeeb/design-system";
import type { ReactNode } from "react";
import { Buildings, CalendarBlank, Certificate, ClipboardText, NotePencil, SealCheck, Sparkle, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { CaretLeft, CheckCircle, Prohibit, XCircle } from "@/app/_components/glyphs";
import { AR_CERTIFICATE, AR_VOLUNTEER, arCount } from "@/lib/arabicCount";
import { waHref } from "@/lib/whatsapp";
import { Avatar } from "../../_components/Avatar";
import { Leaf } from "../OpportunityCard";
import type { CertQueueRow } from "../data";

/**
 * **كرتُ «بانتظار الحضور» — كرتُ الفرصة، مُقَرٌّ من المالك ٢٠٢٦-١٠-٠٢** (معرضُه `/ui/awaiting-card`).
 *
 * الطابورُ صندوقٌ يُفرَّغ لا كشفٌ يُقرأ: كان كرتُه اسمًا وشارةَ «ما ينقص» وزرَّ «سجلّ الفرصة»، فكلُّ متطوّعٍ
 * رحلةٌ إلى صفحةٍ ثمّ عودة. فصار الحضورُ زرَّين في السطر نفسِه، وما يُسجَّل يخرج من الطابور: الحاضرُ إلى «جاهزة
 * لم تصدر»، والغائبُ لا شهادةَ له. (وكان فيه التقييمُ زرَّين بعد الحضور، فأسقطته سياسةُ ٢٠٢٦-١٠-٠٣: كلُّ حاضرٍ
 * يأخذ شهادتَه.)
 *
 * واختاره من هيئتين: كرتٌ لكلّ متطوّعٍ بأسرة «الختم» وخطِّ مراحل، وكرتٌ لكلّ فرصة (هذا). والفرصةُ وحدةُ
 * العمل: يُسجَّل أهلُ الفعالية الواحدة معًا، واسمُها يُكتب مرّةً لا على كلّ كرت. وأُعدمت الأخرى.
 */

export type AwaitHandlers = {
  /** الزرُّ الذي يعمل الآن (`<id>-yes` · `<id>-no`): يدور وحدَه ويُعطَّل أخوه في الصفّ نفسِه. */
  busy?: string | null;
  onAttend: (r: CertQueueRow, a: "attended" | "absent") => void;
  onRecord: (oppId: string) => void;
  /** يفتح ملفَّ المتطوّع (سجلُّه في «متطوّعو أدِيب»): الاسمُ في السطر زرٌّ إليه. */
  onProfile?: (r: CertQueueRow) => void;
};

/** كلماتُ الخطوة الأولى: الحضورُ ليومٍ، والإنجازُ لعملٍ مرنٍ لا يومَ له (كلماتُ سجلّ الفرصة نفسُها). */
export function queueWords(flexible: boolean) {
  return flexible
    ? { station: "الإنجاز", yes: "أنجز", no: "لم ينجز", was: "أنجز", wait: "بانتظار الإنجاز", after: "بعد الإنجاز" }
    : { station: "الحضور", yes: "حاضر", no: "غائب", was: "حضر", wait: "بانتظار الحضور", after: "بعد الحضور" };
}

/** زرّا الحضور: الأوّلُ يمضي به (أساسيّ)، والثاني يقطعه (شبحيّ). */
function StepButtons({ r, h }: { r: CertQueueRow; h: AwaitHandlers }) {
  const w = queueWords(r.flexible);
  const mine = (k: string) => h.busy === `${r.id}-${k}`;
  const held = (k: string) => !!h.busy && h.busy.startsWith(`${r.id}-`) && !mine(k);
  return (
    <>
      <Button variant="primary" size="sm" loading={mine("yes")} disabled={held("yes")} onClick={() => h.onAttend(r, "attended")}>
        <CheckCircle aria-hidden /> {w.yes}
      </Button>
      <Button variant="ghost" size="sm" loading={mine("no")} disabled={held("no")} onClick={() => h.onAttend(r, "absent")}>
        <XCircle aria-hidden /> {w.no}
      </Button>
    </>
  );
}

/* ── السطر ─────────────────────────────────────────────────────────── */

/**
 * سطرُ المتطوّع (طلبُ المالك ٢٠٢٦-١٠-٠٢ «نطوّر طريقة عرض العضو ببياناته»، واختار بياناته):
 * - **خانةُ الشخص كلُّها زرٌّ إلى ملفّه** (سجلُّه في «متطوّعو أدِيب»: مشاركاتُه وحضورُه وشهاداتُه)، وبجانب اسمه
 *   سهمٌ ظاهرٌ أبدًا (المالك ٢٠٢٦-١٠-٠٣). كان الاسمُ وحدَه زرًّا يدلّ عليه خطٌّ عند المرور، والجوّالُ لا مرورَ فيه
 *   فلا يُعرف أنّه يُضغط. ولم يصر زرًّا رابعًا في السطر: الملفُّ يُفتح أحيانًا، والحكمُ عملُ الطابور.
 * - **ما ينتظره** سطرٌ تحته، و**واتساب** زرٌّ في آخر خانته لمن شكّ في حضوره. والجوّالُ نصًّا أُزيل بأمر المالك
 *   ٢٠٢٦-١٠-٠٣: الزرُّ يحمله، فكان الرقمُ تكرارًا يزحم السطر.
 * - **ملاحظةُ المشرف** إن كُتبت سطرٌ كاملٌ تحته يلتفّ ولا يُقصّ: هي أوّلُ ما يُقرأ قبل الحكم.
 */
/** وجهُ المتطوّع واسمُه وحالُه (وما بعدها خافتًا) — داخلَ زرّ الملفّ أو بلا زرّ، والسهمُ لا يُرسَم إلّا حيث يُفتح شيء. */
function Person({ r, status, aside, link = false }: { r: CertQueueRow; status: string; aside?: string | null; link?: boolean }) {
  return (
    <>
      <Avatar name={r.name} src={r.avatar ?? undefined} gender={r.gender} size="sm" />
      <span className="vwq-who-t">
        <span className="vwq-name-row">
          <span className="vwq-name">{r.name}</span>
          {link ? <CaretLeft className="vwq-go" aria-hidden /> : null}
        </span>
        <span className="vwq-sub">
          <b>{status}</b>
          {aside ? <span className="vwq-sub-x" title={aside}>{aside}</span> : null}
        </span>
      </span>
    </>
  );
}

/** خانةُ الشخص: زرُّ ملفّه إن وُجد من يفتحه، وواتساب في آخرها حيث يُحتاج. */
function Who({ r, status, aside, onProfile, wa }: {
  r: CertQueueRow; status: string; aside?: string | null; onProfile?: (r: CertQueueRow) => void; wa?: boolean;
}) {
  return (
    <span className="vwq-who">
      {onProfile ? (
        <button type="button" className="vwq-person is-link" title={`ملفّ ${r.name}`} onClick={() => onProfile(r)}>
          <Person r={r} status={status} aside={aside} link />
        </button>
      ) : (
        <span className="vwq-person"><Person r={r} status={status} aside={aside} /></span>
      )}
      {/* التواصلُ وجهةٌ خارجيّة: رابطٌ بثوب الزرّ لا زرٌّ يعد بفعلٍ في الصفحة، **مصمتٌ أخضر** كزرّ «التواصل» في
          كرت العضو (أمرُ المالك ٢٠٢٦-١٠-٠٣ «اجعل الزرَّ مصمتًا»)، وبقامة زرَّي الخطوة، مربّعًا بأيقونته duotone */}
      {wa && r.phone ? (
        <a className="abtn abtn-success abtn-sm vwq-wa" href={waHref(r.phone)} target="_blank" rel="noreferrer" aria-label={`مراسلة ${r.name} على واتساب`} title="واتساب">
          <WhatsappLogo aria-hidden />
        </a>
      ) : null}
    </span>
  );
}

function QueueRow({ r, h }: { r: CertQueueRow; h: AwaitHandlers }) {
  const w = queueWords(r.flexible);
  return (
    <li className="vwq-row">
      <Who r={r} status={w.wait} onProfile={h.onProfile} wa />
      {r.adminNote ? (
        <p className="vwq-note">
          <NotePencil aria-hidden />
          <span><b>ملاحظةُ المشرف:</b> {r.adminNote}</span>
        </p>
      ) : null}
      <span className="vwq-acts"><StepButtons r={r} h={h} /></span>
    </li>
  );
}

/* ── الكرت ─────────────────────────────────────────────────────────── */

/** **السطورُ تحت فتراتها** (٢٠٢٦-١٠-٠٢): الحضورُ للفترة، والفترةُ كانت تتكرّر في كلّ سطر. فهي عنوانٌ مرّةً بعدد
 *  من فيها، والفرصةُ بلا فترات (وطابورُ الإصدار: الشهادةُ للفرصة كلِّها) مجموعةٌ واحدةٌ بلا عنوان. */
function bandsOf(rows: CertQueueRow[]) {
  const bands: { period: string | null; rows: CertQueueRow[] }[] = [];
  for (const r of rows) {
    const b = bands.find((x) => x.period === r.period);
    if (b) b.rows.push(r);
    else bands.push({ period: r.period, rows: [r] });
  }
  return bands;
}

/**
 * **هيكلُ كرت الفرصة في غرفة الشهادات** — واحدٌ للطابورين (`AwaitOpportunityCard` و`OwedOpportunityCard`):
 * رأسٌ مصمتٌ بورقة التقويم والعنوان وسطرَي الوصف، ثمّ السطورُ تحت فتراتها، ثمّ «سجلّ الفرصة». والطابوران
 * يختلفان في سطر «ما ينتظرك» تحت العنوان، وفي سطر المتطوّع وزرّه، لا في الكرت.
 */
function OppQueueCard({ rows, due, onRecord, renderRow }: {
  rows: CertQueueRow[];
  due: { icon: ReactNode; text: string };
  onRecord: (oppId: string) => void;
  renderRow: (r: CertQueueRow) => ReactNode;
}) {
  const o = rows[0];
  if (!o) return null;
  const bands = bandsOf(rows);
  return (
    <Card tone="brand" className="vop vop-mono vwq">
      {/* الرأسُ مصمتٌ بتدرّج الهويّة ونقشِها كرأس «الختم» في تبويب السجلّ من الشاشة نفسِها (المالك ٢٠٢٦-١٠-٠٣):
          الفرصةُ أعلى المستويات فرأسُها أثقلُ ما في الكرت، وشريطُ الفترة تحته يبقى خفيفًا */}
      <div className="vop-head vwq-head">
        <Leaf o={o} />
        <div className="vop-id">
          <h4 className="vop-name" title={o.opportunity}>{o.opportunity}</h4>
          {/* تحت العنوان سطران بلغةٍ واحدة (أيقونةٌ في مربّع الوهج ثمّ نصّ)، كلٌّ سطرٌ وحدَه (المالك ٢٠٢٦-١٠-٠٣):
              كانا عددًا في شارةٍ ولجنةً نصًّا عاريًا في سطرٍ واحدٍ فتفاوتا. **اللجنةُ أوّلًا** لأنّها من وصف الفرصة
              فتلي عنوانَها، و**ما ينتظرك آخرًا** يثقُل بنغمة الكرت، ويُفضي إلى السطور تحته */}
          <div className="vwq-meta">
            {o.committee ? <span className="vwq-meta-i"><span className="acard-ic"><Buildings aria-hidden /></span>{o.committee}</span> : null}
            <span className="vwq-meta-i is-due"><span className="acard-ic">{due.icon}</span>{due.text}</span>
          </div>
        </div>
      </div>

      {bands.map((b) => (
        <section key={b.period ?? "-"} className="vwq-band">
          {b.period ? (
            // عنوانُ الفترة بلغة سطرَي الوصف فوقه: كلٌّ من اليوم والعدد أيقونةٌ في مربّع الوهج (المالك ٢٠٢٦-١٠-٠٣)
            <h5 className="vwq-band-h">
              <span className="acard-ic"><CalendarBlank aria-hidden /></span>
              <span className="vwq-band-t">{b.period}</span>
              {bands.length > 1 ? (
                <span className="vwq-band-n"><span className="acard-ic"><UsersThree aria-hidden /></span>{arCount(b.rows.length, AR_VOLUNTEER)}</span>
              ) : null}
            </h5>
          ) : null}
          <ul className="vwq-list">{b.rows.map((r) => renderRow(r))}</ul>
        </section>
      ))}

      <div className="vwq-foot btn-row">
        {/* مصمتٌ بأمر المالك ٢٠٢٦-١٠-٠٣ (كان شبحيًّا) */}
        <Button variant="primary" size="sm" onClick={() => onRecord(o.oppId)}>
          <ClipboardText aria-hidden /> سجلّ الفرصة
        </Button>
      </div>
    </Card>
  );
}

export function AwaitOpportunityCard({ rows, ...h }: { rows: CertQueueRow[] } & AwaitHandlers) {
  return (
    <OppQueueCard
      rows={rows}
      due={{ icon: <UsersThree aria-hidden />, text: `${arCount(rows.length, AR_VOLUNTEER)} بانتظارك` }}
      onRecord={h.onRecord}
      renderRow={(r) => <QueueRow key={r.id} r={r} h={h} />}
    />
  );
}

/* ── طابورُ الإصدار: «جاهزة لم تصدر» (٢٠٢٦-١٠-٠٣) ─────────────────────── */

export type OwedHandlers = {
  /** الزرُّ الذي يعمل الآن (`<id>-issue`). */
  busy?: string | null;
  onIssue: (r: CertQueueRow) => void;
  /** يفتح نافذةَ جملة التميّز: تُطبع في شهادته بختم «بتميّز». */
  onDistinction: (r: CertQueueRow) => void;
  /** يفتح نافذةَ سبب الحجب: استثناءٌ لا يمرّ بلا سبب. */
  onWithhold: (r: CertQueueRow) => void;
  onRecord: (oppId: string) => void;
  onProfile?: (r: CertQueueRow) => void;
};

/**
 * **كرتُ «جاهزة لم تصدر» — مُقَرٌّ من المالك ٢٠٢٦-١٠-٠٣** (معاينتُه `/ui/owed-card`). الهيكلُ نفسُه بطلبه («طوّره،
 * اجعله أجمل بصريًّا»): كرتُ الفرصة نفسُه الذي في «بانتظار الحضور»، والإصدارُ زرٌّ ظاهرٌ في سطر كلّ حاضر.
 * و**سياسةُ ٢٠٢٦-١٠-٠٣** تجعل كلَّ حاضرٍ هنا بلا تقييم، فبجانب الإصدار ترشيحُه للتميّز، وحجبُها استثناءً أيقونةً
 * صغيرةً في الطرف. وسطرُ الحال **لا يُذكّر ولا يُؤنَّث**: «الشهادةُ جاهزة» يصدق في المتطوّع والمتطوّعة. ولا واتساب
 * هنا: الحضورُ حُسم، ولا شكَّ يُسأل عنه.
 */
function OwedRow({ r, h }: { r: CertQueueRow; h: OwedHandlers }) {
  const mine = h.busy === `${r.id}-issue`;
  return (
    <li className="vwq-row">
      <Who r={r} status={r.distinctionNote ? "الشهادةُ جاهزة بتميّز" : "الشهادةُ جاهزة"} onProfile={h.onProfile} />
      {r.distinctionNote ? (
        <p className="vwq-note">
          <Sparkle aria-hidden />
          <span><b>تميّزه:</b> {r.distinctionNote}</span>
        </p>
      ) : null}
      <span className="vwq-acts">
        <Button variant="primary" size="sm" loading={mine} onClick={() => h.onIssue(r)}>
          <SealCheck aria-hidden /> إصدار الشهادة
        </Button>
        <Button variant="ghost" size="sm" disabled={mine} onClick={() => h.onDistinction(r)}>
          <Sparkle aria-hidden /> {r.distinctionNote ? "تعديلُ التميّز" : "ترشيحٌ للتميّز"}
        </Button>
        <Button variant="ghost-danger" size="sm" className="vwq-ic" disabled={mine} title="حجبُ الشهادة"
          aria-label={`حجبُ شهادة ${r.name}`} onClick={() => h.onWithhold(r)}>
          <Prohibit aria-hidden />
        </Button>
      </span>
    </li>
  );
}

export function OwedOpportunityCard({ rows, ...h }: { rows: CertQueueRow[] } & OwedHandlers) {
  return (
    <OppQueueCard
      rows={rows}
      due={{ icon: <Certificate aria-hidden />, text: `${arCount(rows.length, AR_CERTIFICATE)} بانتظار الإصدار` }}
      onRecord={h.onRecord}
      renderRow={(r) => <OwedRow key={r.id} r={r} h={h} />}
    />
  );
}
