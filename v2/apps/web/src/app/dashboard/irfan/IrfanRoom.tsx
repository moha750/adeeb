"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Card, CardHeader, CarouselNav } from "@adeeb/design-system";
import { HandHeart, Image as ImageIcon, NotePencil, PaperPlaneTilt, WhatsappLogo } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { fmtDate } from "@/lib/dates";
import { renderIrfanCard, saveIrfanCard } from "@/lib/irfan/card";
import { useToast } from "../_components/ToastProvider";
import { CaretAct, Row, type Ico } from "../_portal/Row";
import { uploadIrfanPreview } from "@/lib/irfan/preview";
import { irfanPreviewSlot, irfanWhatsApp, markIrfanRead } from "./actions";
import type { IrfanItem, IrfanRoomData } from "./vocab";

/**
 * **غرفةُ «عِرفان»** — على معرض «شهاداتي» المعتمَد (قائمةٌ يمنةً والبطاقةُ معلّقةٌ يسرةً)، لأنّ الشيءَ
 * واحد: ورقةٌ تُرى وتُحفظ. والفرقُ أنّ البطاقة قائمة (‎`.acr-shot.is-portrait`‎).
 *
 * - **وصلني** و**أرسلتُ**، ولا شيء سواهما (أسقط المالكُ «لم تصله رسالةٌ بعد» والبلاغَ، ٢٠٢٦-١٠-١٧:
 *   «ليس لها داعٍ»).
 * - **لا عدّادَ في أيّ موضع** (قرار المالك): لا يُقال لأحدٍ كم وصله ولا كم وصل غيرَه.
 * - المختارةُ غيرُ المقروءة تُوسَم مقروءةً لحظةَ تُفتح.
 */

const drawn = new Map<number, Promise<string>>();
function draw(it: IrfanItem): Promise<string> {
  let p = drawn.get(it.id);
  if (!p) {
    p = renderIrfanCard(it.card, it.look).then((b) => URL.createObjectURL(b));
    drawn.set(it.id, p);
  }
  return p;
}

function Shot({ it, alt }: { it: IrfanItem; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    draw(it).then((u) => { if (alive) setSrc(u); }, () => { /* تبقى المساحةُ فارغة */ });
    return () => { alive = false; };
  }, [it]);
  // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob)
  return src ? <img className="acr-shot is-portrait" src={src} alt={alt} /> : <span className="acr-shot is-portrait" aria-hidden />;
}

const GROUPS: { dir: IrfanItem["dir"]; label: string; Icon: Ico; say: string }[] = [
  { dir: "in", label: "وصلني", Icon: HandHeart, say: "ما كتبه لك أعضاءُ أدِيب" },
  { dir: "out", label: "أرسلتُ", Icon: PaperPlaneTilt, say: "ما كتبتَه لقادتك" },
];

/** الإغلاقُ منتصفُ الليل، فآخرُ أيّامه اليومُ الذي قبله: ثانيةٌ قبل الإغلاق تقع فيه. */
const lastDay = (closesAt: string) => fmtDate(new Date(Date.parse(closesAt) - 1000).toISOString());

const party = (it: IrfanItem) => (it.dir === "out" ? `إلى ${it.card.to}` : `من ${it.card.from}`);

export function IrfanRoom({ data, initial, demo }: { data: IrfanRoomData; initial?: number | null; demo?: boolean }) {
  const toast = useToast();
  const { season, items, error } = data;
  const order = GROUPS.flatMap((g) => items.filter((i) => i.dir === g.dir));
  const [sel, setSel] = useState<number | null>(initial && order.some((i) => i.id === initial) ? initial : order[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const read = useRef<Set<number>>(new Set());
  const stage = useRef<HTMLElement>(null);

  const cur = order.find((i) => i.id === sel) ?? order[0];
  const at = cur ? order.indexOf(cur) : -1;

  // تُوسَم مقروءةً حين تُفتح — مرّةً، ولا يُنتظر ردُّها
  useEffect(() => {
    if (!cur || cur.dir !== "in" || !cur.unread || read.current.has(cur.id) || demo) return;
    read.current.add(cur.id);
    void markIrfanRead(cur.id);
  }, [cur, demo]);

  // رابطُ واتساب لما أرسلتُه: يُجلب حين تُختار الرسالة، فيكون السطرُ رابطًا حقيقيًّا تفتحه الضغطةُ نفسُها
  const [wa, setWa] = useState<{ id: number; href: string | null } | null>(null);
  useEffect(() => {
    if (!cur || cur.dir !== "out" || demo) return;
    let alive = true;
    void irfanWhatsApp(cur.id).then((href) => { if (alive) setWa({ id: cur.id, href }); });
    return () => { alive = false; };
  }, [cur, demo]);
  const waHref = cur && wa?.id === cur.id ? wa.href : null;

  // ترميمُ ما سقطت صورةُ معاينته مما أرسلتُ (`irfanPreviewSlot`): رسالةً رسالة لا معًا، فلا تمتلئ ذاكرةُ
  // الألواح التي أسقطتها أوّلَ مرّة. ومرّةً لكلّ فتحٍ للغرفة
  const mended = useRef(false);
  useEffect(() => {
    if (demo || mended.current) return;
    mended.current = true;
    const mine = items.filter((i) => i.dir === "out");
    void (async () => {
      for (const it of mine) {
        const slot = await irfanPreviewSlot(it.id);
        if (slot) await uploadIrfanPreview(it.card, it.look, slot);
      }
    })();
  }, [items, demo]);

  const pick = (id: number) => {
    setSel(id);
    if (window.matchMedia("(max-width: 860px)").matches) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const step = (d: number) => { const n = order[at + d]; if (n) setSel(n.id); };

  const save = async () => {
    if (!cur) return;
    setBusy("save");
    try {
      await saveIrfanCard(cur.card, cur.look);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ البطاقة.");
    } finally {
      setBusy(null);
    }
  };
  const write = season
    ? <Row Icon={NotePencil} k={season.title} v="اكتب عِرفانًا لقائد" sub={`آخرُ أيّام الموسم ${lastDay(season.closesAt)}`}
        act={CaretAct("اكتب عِرفانًا", "اكتب")} href="/dashboard/irfan/new" />
    : null;

  const list = (
    <Card className="acr-list">
      <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="عِرفان" subtitle="رسائلُ شكرٍ بين أعضاء أدِيب وقادتهم" />
      {write}
      {order.length ? (
        <nav aria-label="رسائل عِرفان">
          {GROUPS.map((g) => {
            const xs = items.filter((i) => i.dir === g.dir);
            if (!xs.length) return null;
            return (
              <div key={g.dir} className="acr-group">
                <h3>
                  <span className="acr-gic" aria-hidden><g.Icon /></span>
                  <span className="acr-gtx">{g.label}<small>{g.say}</small></span>
                </h3>
                {xs.map((i) => (
                  <button key={i.id} type="button" className="acc-row acr-pick" aria-current={cur?.id === i.id} onClick={() => pick(i.id)}>
                    <Shot it={i} alt="" />
                    <span className="acc-kv">
                      <span className="acr-title"><b>{party(i)}</b></span>
                      <small>{i.card.season}</small>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      ) : null}
    </Card>
  );

  if (!cur) {
    return (
      <div className="acc-main">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Card>
          <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="لا عِرفانَ بعد"
            subtitle={season ? "اكتب لقائدٍ في أدِيب، وما يصلك يظهر هنا" : "يُفتح موسمُ عِرفان في مناسباته، وما يصلك يبقى هنا"} />
          {write}
        </Card>
      </div>
    );
  }

  return (
    <>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="acr-room">
        {list}
        <section ref={stage} className="acr-stage" aria-live="polite">
          <Card>
            <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title={party(cur)} subtitle={cur.card.season} />
            <div className="acr-easel">
              <Shot key={cur.id} it={cur} alt={`عِرفان ${party(cur)}`} />
              {order.length > 1
                ? <CarouselNav onPrev={() => step(-1)} onNext={() => step(1)} prevDisabled={at === 0} nextDisabled={at === order.length - 1} />
                : null}
            </div>
            <Row Icon={ImageIcon} k="البطاقة" v="صورةٌ للمشاركة" sub="احفظها أو انشرها في قصّتك"
              act={{ Icon: DownloadSimple, label: "حفظ البطاقة", text: "حفظ" }} disabled={busy !== null} onClick={save} />
            {cur.dir === "out" && waHref ? (
              <Row Icon={WhatsappLogo} k="واتساب" v={`أرسله إلى ${cur.card.to.split(" ")[0]}`} sub="محادثتُه، وفيها رسالتُك ورابطُ بطاقتها"
                act={CaretAct("أرسله في واتساب", "افتح")} href={waHref} />
            ) : null}
          </Card>
        </section>
      </div>

    </>
  );
}
