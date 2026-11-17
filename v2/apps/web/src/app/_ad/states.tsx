"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudWarning, Headset, LockKey } from "@phosphor-icons/react";
import { ArrowClockwise, ArrowRight, Check, MagnifyingGlass } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { fmtStamp } from "@/lib/dates";
import { reportRoomError } from "./report";
import { useRoomCrumb } from "./crumb";
import type { RoomView } from "./view";
import { AdButton, AdEmpty, AdRoom, RoomPlate } from "./primitives";
import type { RoomMeta } from "./rooms/meta";

/**
 * **حالتا الغرفة قبل بياناتها** (٢٠٢٦-١٠-٣١): التحميلُ والخطأ — في هيكل الغرفة نفسِه لا شعارًا وسط فراغ.
 * اللوحُ بالاسم والمسار حاضرٌ من أوّل لحظة (لا يتوقّفان على البيانات)، فلا يقفز شيءٌ حين تصل.
 */

const Skel = ({ w }: { w?: "s" | "m" | "l" | "xl" }) => <i className="ad-skel" data-w={w} />;

/**
 * **التحميل: هيكلُ الغرفة ينبض** — اللوحُ كاملًا، ثمّ المبدّلُ والأدواتُ والقائمةُ أشكالًا مصبوغةً بلا محتوى. والقائمةُ بالعرض الذي
 * اختاره العضو (كروتٌ أو جدولٌ بأعمدته) فلا تتبدّل حين تصل البيانات. والنبضُ يسكن لمن طلب السكون.
 */
export function AdRoomLoading({ title, navPath, cols, textCols, stub, flat, listOnly, view: saved = "cards" }: RoomMeta & { view?: RoomView }) {
  const view = listOnly ? "table" : saved;
  const crumb = useRoomCrumb(navPath, title);
  const rows = Array.from({ length: 5 }, (_, i) => i);
  return (
    <AdRoom label={title}>
      <div className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} />
        {!flat && (
          <div className="ad-switch" aria-hidden>
            {[0, 1, 2].map((i) => <span key={i} className="ad-switch-seg"><Skel w="m" /></span>)}
          </div>
        )}
      </div>
      <div className="ad-tools ad-skel-tools" aria-hidden>
        <Skel w="xl" />
        <Skel w="s" />
        <Skel w="s" />
      </div>
      <p className="ad-sr" role="status">{`جارٍ تحميل ${title}…`}</p>
      {view === "table" ? (
        <div className="ad-tbl" data-load={textCols}>
        <div className="ad-table ad-skel-table" data-cols={cols} data-stub={stub ? "" : undefined} aria-hidden>
          <div className="ad-tr ad-thead">
            {stub && <span className="ad-th" data-kind="stub"><Skel w="s" /></span>}
            <span className="ad-th"><Skel w="s" /></span>
            {Array.from({ length: cols }, (_, i) => <span key={i} className="ad-th" data-kind="col"><Skel w="s" /></span>)}
            <span className="ad-th" />
          </div>
          {rows.map((r) => (
            <div key={r} className="ad-tr">
              {/* الكعبُ المصغّر بقماشه من الآن، كما يرسم هيكلُ الكروت كعوبَها */}
              {stub && <div className="ad-td-stub" data-cut={(r % 5) + 1} />}
              <div className="ad-row-main"><Skel w="l" /><Skel w="s" /></div>
              <div className="ad-td-wrap">
                {Array.from({ length: cols }, (_, i) => <div key={i} className="ad-td"><Skel w="s" /></div>)}
              </div>
              <div className="ad-row-acts"><Skel w="m" /></div>
            </div>
          ))}
        </div>
        </div>
      ) : (
        <div className="ad-grid" aria-hidden>
          {rows.slice(0, 4).map((r) => (
            <div key={r} className="ad-card-wrap">
              <div className="ad-card">
                <div className="ad-card-stub" data-cut={r + 1} />
                <div className="ad-card-main">
                  <div className="ad-card-body ad-skel-body">
                    <Skel w="s" />
                    <Skel w="xl" />
                    <Skel w="l" />
                    <Skel w="m" />
                    <Skel w="m" />
                    <span className="ad-skel-figs"><Skel w="s" /><Skel w="s" /><Skel w="s" /></span>
                  </div>
                  <div className="ad-card-foot ad-skel-foot"><Skel w="m" /><Skel w="s" /><Skel w="s" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdRoom>
  );
}

/** نصُّ الخطأ إن كان عربيًّا قيل كما هو؛ وإن كان تقنيًّا (رسالةُ قاعدة البيانات) قيلت جملةٌ مفهومة، وبقي نصُّه تحتها في صندوقٍ بزرّ «نسخ»
 *  يضعه في الحافظة مع الغرفة والمسار والوقت — فيصل قسمَ نظم المعلومات ما يحتاجه ليتتبّعه (محمد ٢٠٢٦-١٠-٣١). */
const arabic = (s: string) => /[؀-ۿ]/.test(s);

/**
 * **الخطأ: «القطعة» نفسُها** (هيئةُ الفراغ الواحدة) برمز السحابة المنقطعة، لا تنبيهٌ ملوّن: لا كحليَّ بجانب أحمر، والكلماتُ
 * تكفي. ثمّ فعلان: «إعادة المحاولة» — يعيد طلبَ الصفحة من الخادم، أو يعيد تركيبَ ما انكسر (`reset` في `error.tsx`)؛
 * و«أبلغ الدعم الفني» — يوصل البلاغَ بنفسه لقسم نظم المعلومات (محمد ٢٠٢٦-١٠-٣١: «الزائرُ لا يعرف قناةَ التواصل»).
 * و`preview` للمختبر: يُرى الزرُّ بحالاته ولا يُرسَل بلاغ.
 */
export function AdRoomError({ title, navPath, what, message, detail, retry, preview }: Partial<RoomMeta> & Pick<RoomMeta, "title" | "navPath" | "what"> & { message?: string | null; detail?: string | null; retry?: () => void; preview?: boolean }) {
  const crumb = useRoomCrumb(navPath, title);
  const router = useRouter();
  const [pending, start] = useTransition();
  const human = message && arabic(message) ? message : "لم يصل ردُّ قاعدة البيانات. أعد المحاولة، وإن تكرّر فأبلغ الدعم الفني.";
  const tech = detail ?? (message && !arabic(message) ? message : null);
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [sending, startSend] = useTransition();
  const report = () =>
    startSend(async () => {
      if (preview) {
        await new Promise((r) => setTimeout(r, 700));
        toast.info("معاينة: لا يُرسَل بلاغٌ من المختبر.");
        setSent(true);
        return;
      }
      const r = await reportRoomError({ path: navPath, error: tech ?? message ?? "" });
      if (r.ok) { setSent(true); toast.success(r.message); } else toast.error(r.message);
    });
  return (
    <AdRoom label={title}>
      <div className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} />
      </div>
      <AdEmpty
        icon={<CloudWarning />}
        title={`تعذّر جلب ${what}`}
        desc={human}
        detail={tech}
        report={() => [`الغرفة: ${title}`, `المسار: ${navPath}`, `الوقت: ${fmtStamp(new Date().toISOString())}`, `الخطأ: ${tech}`].join("\n")}
        action={
          <>
            <AdButton variant="fill" icon={<ArrowClockwise />} busy={pending} onClick={() => start(() => { retry?.(); router.refresh(); })}>
              إعادة المحاولة
            </AdButton>
            <AdButton variant="soft" icon={sent ? <Check /> : <Headset />} busy={sending} done={sent} onClick={report}>
              {sent ? "وصل البلاغ" : "أبلغ الدعم الفني"}
            </AdButton>
          </>
        }
      />
    </AdRoom>
  );
}

/**
 * **الحالتان الأخريان بالقطعة نفسها** (٢٠٢٦-١١-١٧): كانت صفحاتُ التحرير تقول «لم يُعثر» و«لا صلاحية» و«تعذّر الجلب» برأسٍ قديم
 * (`PageHeader`) وتنبيهٍ كهرمانيٍّ من الهويّة القديمة (`Alert`)، وحدُّ «غير موجود» في اللوحة فراغٌ قديم، ومن أُقفلت دونه غرفةٌ يرى
 * بابَ الدخول نفسَه (`AuthShell`) داخل البوّابة. فصارت الثلاثُ لوحَ الغرفة باسمها وفتاتها، وتحته «القطعة» برمزها وجملتها وفعلٍ واحد
 * يوصل إلى حيث يُكمِل — كخطأ الجلب أعلاه. ونصوصُها نصوصُ صفحاتها كما كانت.
 */
type RoomPlace = { title: string; navPath: string };

/** **لم يُعثر عليه**: حُذف، أو ليس له — والجوابان واحدٌ عمدًا (لا يُكشف وجودُ ما لغيره). والفعلُ إلى القائمة التي جاء منها */
export function AdRoomMissing({ title, navPath, what, desc, back }: RoomPlace & { what: string; desc?: string; back?: { label: string; href: string } }) {
  const crumb = useRoomCrumb(navPath, title);
  return (
    <AdRoom label={title}>
      <div className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} />
      </div>
      <AdEmpty
        icon={<MagnifyingGlass />}
        title={`لم يُعثر على ${what}`}
        desc={desc ?? "الرابط الذي جئت منه لعلّه تغيّر، أو حُذف ما يشير إليه."}
        action={<AdButton variant="soft" icon={<ArrowRight />} href={back?.href ?? navPath}>{back?.label ?? "العودة"}</AdButton>}
      />
    </AdRoom>
  );
}

/** **خارج صلاحياتك**: القفلُ وجملتُه تقول من تُفتح له الغرفةُ وكيف، والفعلُ إلى البوّابة (من دخل البابَ لا يُطرد منه لغرفةٍ أُقفلت دونه) */
export function AdRoomDenied({ title, navPath, what, desc }: RoomPlace & { what?: string; desc: string }) {
  const crumb = useRoomCrumb(navPath, title);
  return (
    <AdRoom label={title}>
      <div className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} />
      </div>
      <AdEmpty
        icon={<LockKey />}
        title={what ? `لا تملك صلاحية ${what}` : "هذه الصفحة خارج صلاحياتك"}
        desc={desc}
        action={<AdButton variant="soft" icon={<ArrowRight />} href="/dashboard">العودة إلى البوّابة</AdButton>}
      />
    </AdRoom>
  );
}
