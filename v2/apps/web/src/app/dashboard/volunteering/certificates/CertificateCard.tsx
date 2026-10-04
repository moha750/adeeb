"use client";

import { useState } from "react";
import { Button, Card, Modal } from "@adeeb/design-system";
import { Buildings, CalendarBlank, CalendarX, ClipboardText, FilePdf, NotePencil, PenNib, QrCode, SealCheck, Stamp, UserCircle } from "@phosphor-icons/react";
import { DownloadSimple, Info, Prohibit } from "@/app/_components/glyphs";
import { dateOnlyParts } from "@/lib/dates";
import { Avatar } from "../../_components/Avatar";
import { Cell } from "../../_components/Cell";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { IssuedCertRow } from "../data";

/**
 * **كرتُ شهادة المتطوّع في السجلّ — «الختم»، مُقَرٌّ من المالك ٢٠٢٦-١٠-٠١** (معرضُه `/ui/certificate-card`).
 *
 * اختاره من هيئتين بعد أن قال في كرت الحقائق العامّ: «التخطيط جميل ولكن التصميم أقلّ من عادي». فالتخطيطُ
 * باقٍ (رأسٌ فيه الوجهُ والاسمُ والحال، ثمّ حقائقُ مثنّاة)، والذي تغيّر **التصميمُ وما كان ناقصًا**:
 *
 * - الرأسُ شريطٌ بتدرّج النغمة ونقشِ الهويّة، والحالُ لافتةٌ زجاجيّةٌ عليه بارتفاع مقبض القائمة.
 * - رقاقاتُ أيقوناتٍ بنغمة الكرت (لغةُ حقائق كرت الفرصة) بدل خلايا بإطارٍ وتسميةٍ عارية.
 * - **رقمُ التحقّق ختمٌ في سطرٍ كامل** يُقرأ حرفًا بحرف (كان خانةً تقصّه)، والمُبطَلُ يُشطب.
 * - **التنزيلُ زرّان ظاهران** في الذيل (كانا بندين في ⋮)، والمُبطَلةُ ذيلُها زرُّ «تفاصيل الإبطال».
 * - **ارتفاعُه ثابت** (٢٠٢٦-١٠-٠١): الاسمُ والفرصةُ والحقيقةُ سطرٌ لكلٍّ، وسببُ الإبطال في نافذةٍ لا في الذيل،
 *   فلا يزيح نصٌّ طويلٌ أقسامَ كرتٍ عن أقسام جاره (جُرّبت قبلها مشاركةُ الصفوف بين الجارَين وطيُّ السبب فرُدّتا).
 */

/**
 * المدّةُ بأقصر صيغةٍ صادقة: يومٌ واحدٌ يومًا، وشهرٌ واحدٌ لا يُكرَّر، وسنةٌ واحدةٌ لا تُكرَّر. وبلا «من»
 * في أوّلها: الخانةُ سطرٌ واحد، و«إلى» وحدَها تقول المدى.
 */
export function servedLabel(from: string, to: string): string {
  const s = dateOnlyParts(from);
  const e = to && to !== from ? dateOnlyParts(to) : null;
  if (!s) return "";
  if (!e) return `${s.day} ${s.month} ${s.year}`;
  if (e.year !== s.year) return `${s.day} ${s.month} ${s.year} إلى ${e.day} ${e.month} ${e.year}`;
  if (e.month !== s.month) return `${s.day} ${s.month} إلى ${e.day} ${e.month} ${s.year}`;
  return `${s.day} إلى ${e.day} ${s.month} ${s.year}`;
}

type Fact = { key: string; icon: React.ReactNode; label: string; value: string | null; na: string };

export function CertificateCard({ c, busy, onDownload, onRecord, onRevoke }: {
  c: IssuedCertRow;
  /** أيُّ ورقةٍ تُرسَم الآن لهذا الكرت — فيدور زرُّها وحدَه. */
  busy?: "pdf" | "png" | null;
  onDownload: (c: IssuedCertRow, kind: "pdf" | "png") => void;
  onRecord?: (c: IssuedCertRow) => void;
  onRevoke: (c: IssuedCertRow) => void;
}) {
  const revoked = c.status === "revoked";
  // نافذةُ «تفاصيل الإبطال» يملكها الكرتُ نفسُه (٢٠٢٦-١٠-٠١): كانت في الشاشة وزرُّها يُنادي ما تمرّره، فلم
  // يفتح شيئًا في المعرض (`/ui/certificate-card`) حيث لا شاشة. والكرتُ يحمل ما تحتاجه النافذةُ كلَّه.
  const [details, setDetails] = useState(false);

  const facts: Fact[] = [
    { key: "served", icon: <CalendarBlank aria-hidden />, label: "المدّة", value: servedLabel(c.servedFrom, c.servedTo) || null, na: "غير مسجّلة" },
    { key: "issued", icon: <Stamp aria-hidden />, label: "تاريخ الإصدار", value: c.issuedAt || null, na: "غير مسجّل" },
    { key: "committee", icon: <Buildings aria-hidden />, label: "الجهة", value: c.committee, na: "بلا لجنة" },
    { key: "issuer", icon: <PenNib aria-hidden />, label: "المُصدِر", value: c.issuedBy, na: "غير معروف" },
  ];

  // التنزيلُ زرّان في الذيل، فلا يتكرّر في القائمة: يبقى فيها ما لا مكانَ له في الكرت
  const groups: MenuGroup[] = [
    { items: onRecord && c.oppId ? [{ label: "سجلّ الفرصة", icon: <ClipboardText />, onSelect: () => onRecord(c) }] : [] },
    { danger: true, items: !revoked ? [{ label: "إبطال الشهادة", icon: <Prohibit />, danger: true, onSelect: () => onRevoke(c) }] : [] },
  ].filter((g) => g.items.length > 0);

  return (
    <Card tone={revoked ? "neutral" : "brand"} className="pcert">
      <div className="pcert-head">
        <span className="pcert-av"><Avatar name={c.name} src={c.avatar ?? undefined} gender={c.gender} size="md" /></span>
        <div className="pcert-id">
          {/* اسمُ الورقة اليوم: إن صحّح صاحبُها اسمَه بعد الإصدار تبعته الشهادة (٢٠٢٦-١٠-٠١)، وما قبله
              تعرفه صفحةُ التحقّق. فلا سطرَ «تغيّر الاسم» هنا: معلومةٌ لا يترتّب عليها فعلٌ للمشرف (سؤالُ المالك) */}
          <h4 className="pcert-name" title={c.paperName}>{c.paperName}</h4>
          <p className="pcert-opp" title={c.opportunity}>{c.opportunity}</p>
        </div>
        <div className="pcert-end">
          <span className="pcert-state">
            {revoked ? <Prohibit aria-hidden /> : <SealCheck aria-hidden />}
            {revoked ? "مبطَلة" : "سارية"}
          </span>
          {groups.length ? (
            <DropdownMenu groups={groups} triggerClassName="acard-dots" tone={revoked ? "neutral" : undefined} />
          ) : null}
        </div>
      </div>

      <div className="acard-info pcert-facts">
        {facts.map((f) => (
          <div key={f.key} className="acard-info-row">
            <span className="acard-ic">{f.icon}</span>
            <span className="acard-info-txt">
              <span className="acard-info-label">{f.label}</span>
              {f.value
                ? <span className="acard-info-val" title={f.value}>{f.value}</span>
                : <span className="acard-info-val na">{f.na}</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="pcert-verify">
        <span className="acard-ic"><QrCode aria-hidden /></span>
        <span className="pcert-verify-txt">
          <span className="pcert-verify-k">{revoked ? "رقم التحقّق، لم يعد معتمدًا" : "رقم التحقّق"}</span>
          <span className="pcert-serial">{c.serial}</span>
        </span>
      </div>

      {revoked ? (
        <div className="pcert-foot btn-row">
          <Button variant="ghost" size="sm" onClick={() => setDetails(true)}>
            <Info aria-hidden /> تفاصيل الإبطال
          </Button>
        </div>
      ) : (
        <div className="pcert-foot btn-row">
          <Button variant="primary" size="sm" loading={busy === "pdf"} disabled={!!busy && busy !== "pdf"} onClick={() => onDownload(c, "pdf")}>
            <FilePdf aria-hidden /> تنزيل PDF
          </Button>
          <Button variant="ghost" size="sm" loading={busy === "png"} disabled={!!busy && busy !== "png"} onClick={() => onDownload(c, "png")}>
            <DownloadSimple aria-hidden /> صورة
          </Button>
        </div>
      )}
      {/* **تفاصيلُ الإبطال رصاصيّةٌ كلُّها كالكرت** (المالك ٢٠٢٦-١٠-٠١: «اجعله كلَّه رماديًّا وليس تنبيهًا داخل
          نافذة»). فالنافذةُ تلبس نغمتَها مرّةً (`mdl-tone-neutral`)، وما فيها خلايا عرضٍ (ق٨) تقرؤها: متى،
          وبيد من، والسببُ كاملًا يلتفّ مهما طال. لا تنبيهَ أحمر: الإبطالُ أمرٌ انتهى لا خطرٌ يُحذَّر منه. */}
      {revoked ? (
        <Modal
          open={details}
          onClose={() => setDetails(false)}
          size="sm"
          className="mdl-tone-neutral"
          title="تفاصيل الإبطال"
          description={`${c.paperName}، ${c.serial}`}
          footer={<Button variant="ghost" size="md" onClick={() => setDetails(false)}>إغلاق</Button>}
        >
          <div className="pva-grid">
            <Cell noCopy label="أُبطلت في" icon={<CalendarX />} value={c.revokedAt} />
            <Cell noCopy label="بيد" icon={<UserCircle />} value={c.revokedBy} />
            <Cell full wrap noCopy label="السبب" icon={<NotePencil />} value={c.revokeReason} />
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}

