"use client";

/**
 * **غرفةُ «عِرفان»** على قالب «الحساب» (٢٠٢٦-١١-١٤) — السلوكُ سلوكُ `dashboard/irfan/IrfanRoom.tsx` كما هو: «وصلني» و«أرسلتُ» ولا شيءَ
 * سواهما، و**لا عدّادَ في أيّ موضع** (قرار المالك ٢٠٢٦-١٠-١٧)، والمختارةُ تُوسَم مقروءةً حين تُختار (وأوّلُها مختارٌ من فتح الغرفة)،
 * والبطاقةُ تُرسَم في المتصفّح وتُحفظ صورة، ولما أرسلتُ رابطُ محادثة القائد في واتساب، وتُرمَّم صورُ المعاينة التي سقطت.
 *
 * والشكلُ **المعرض** (`AdCols sticky`): الرسائلُ سطورٌ في أقسامها تملأ عمودَ الغرفة، والمختارةُ بطاقتُها في الجانب بقدّه وأفعالُها تحتها.
 * جُرّبت قبله شبكةُ تذاكر (كلُّ رسالةٍ تذكرةُ بطاقتها) فسقطت: رسالتان أو ثلاثٌ في شبكةٍ عريضةٍ تترك أكثرَها فراغًا (محمد ٢٠٢٦-١١-١٤:
 * «لا أفضّل أن تعرض كرتًا وبقيّةُ الصفحة فراغٌ كبير»)، والبطاقةُ القائمةُ في تذكرةٍ أطولُ من الشاشة.
 */
import { useEffect, useRef, useState } from "react";
import { CaretLeft, DownloadSimple } from "@/app/_components/glyphs";
import { HandHeart, NotePencil, PaperPlaneTilt, WhatsappLogo } from "@phosphor-icons/react";
import { fmtDate } from "@/lib/dates";
import { renderIrfanCard, saveIrfanCard } from "@/lib/irfan/card";
import { uploadIrfanPreview } from "@/lib/irfan/preview";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { irfanPreviewFailed, irfanPreviewSlot, irfanWhatsApp, markIrfanRead } from "@/app/dashboard/irfan/actions";
import type { IrfanItem, IrfanRoomData } from "@/app/dashboard/irfan/vocab";
import { AdNote } from "../primitives";
import { AccountRoom, AdCols, AdLine, AdSection } from "../account";

/** البطاقةُ تُرسَم مرّةً لكلّ رسالة */
const drawn = new Map<number, Promise<string>>();
function draw(it: IrfanItem): Promise<string> {
  let p = drawn.get(it.id);
  if (!p) {
    p = renderIrfanCard(it.card, it.look).then((b) => URL.createObjectURL(b));
    drawn.set(it.id, p);
  }
  return p;
}
function Big({ it, alt }: { it: IrfanItem; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    draw(it).then((u) => { if (alive) setSrc(u); }, () => { /* تبقى المساحةُ مصبوغة */ });
    return () => { alive = false; };
  }, [it]);
  // eslint-disable-next-line @next/next/no-img-element -- صورةٌ يرسمها المتصفّح (رابطُ blob)
  return src ? <img className="ad-irfan-paper" src={src} alt={alt} /> : <span className="ad-irfan-paper" aria-hidden />;
}

const GROUPS: { dir: IrfanItem["dir"]; label: string; say: string; icon: React.ReactNode }[] = [
  { dir: "in", label: "وصلني", say: "ما كتبه لك أعضاءُ أدِيب", icon: <HandHeart /> },
  { dir: "out", label: "أرسلتُ", say: "ما كتبتَه لقادتك", icon: <PaperPlaneTilt /> },
];

/** الإغلاقُ منتصفُ الليل، فآخرُ أيّامه اليومُ الذي قبله: ثانيةٌ قبل الإغلاق تقع فيه. */
const lastDay = (closesAt: string) => fmtDate(new Date(Date.parse(closesAt) - 1000).toISOString());
const party = (it: IrfanItem) => (it.dir === "out" ? `إلى ${it.card.to}` : `من ${it.card.from}`);
const firstName = (name: string) => name.split(" ")[0];
const DEMO_WA = "https://wa.me/?text=%D9%85%D8%B9%D8%A7%D9%8A%D9%86%D8%A9";

export function IrfanRoom({ data, initial, demo }: { data: IrfanRoomData; initial?: number | null; demo?: boolean }) {
  const toast = useToast();
  const { season, items, error } = data;
  const order = GROUPS.flatMap((g) => items.filter((i) => i.dir === g.dir));
  const [sel, setSel] = useState<number | null>(initial && order.some((i) => i.id === initial) ? initial : order[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const read = useRef<Set<number>>(new Set());
  const stage = useRef<HTMLDivElement>(null);
  const cur = order.find((i) => i.id === sel) ?? order[0];
  // ما اختير في هذه الزيارة تسقط عنه «جديدة» في الحال (القاعدةُ تُخبَر في الأثر تحت)
  const [seen, setSeen] = useState<Set<number>>(() => new Set(cur ? [cur.id] : []));

  // تُوسَم مقروءةً حين تُختار — مرّةً، ولا يُنتظر ردُّها
  useEffect(() => {
    if (!cur || cur.dir !== "in" || !cur.unread || read.current.has(cur.id) || demo) return;
    read.current.add(cur.id);
    void markIrfanRead(cur.id);
  }, [cur, demo]);

  // رابطُ واتساب لما أرسلتُ: يُجلب حين تُختار الرسالة، فيكون السطرُ رابطًا حقيقيًّا تفتحه الضغطةُ نفسُها
  const [wa, setWa] = useState<{ id: number; href: string | null } | null>(null);
  useEffect(() => {
    if (!cur || cur.dir !== "out" || demo) return;
    let alive = true;
    void irfanWhatsApp(cur.id).then((href) => { if (alive) setWa({ id: cur.id, href }); });
    return () => { alive = false; };
  }, [cur, demo]);
  const waHref = cur?.dir === "out" ? (demo ? DEMO_WA : wa?.id === cur.id ? wa.href : null) : null;

  // ترميمُ ما سقطت صورةُ معاينته مما أرسلتُ: رسالةً رسالة لا معًا، ومرّةً لكلّ فتحٍ للغرفة
  const mended = useRef(false);
  useEffect(() => {
    if (demo || mended.current) return;
    mended.current = true;
    void (async () => {
      for (const it of items.filter((i) => i.dir === "out")) {
        const slot = await irfanPreviewSlot(it.id);
        if (!slot) continue;
        const res = await uploadIrfanPreview(it.card, it.look, slot);
        if (!res.ok) void irfanPreviewFailed(it.id, res.step, "room", res.error, navigator.userAgent);
      }
    })();
  }, [items, demo]);

  // في الضيّق تنزل البطاقةُ تحت السطور، فالاختيارُ يأخذك إليها
  const pick = (id: number) => {
    setSel(id);
    setSeen((x) => (x.has(id) ? x : new Set(x).add(id)));
    if (window.matchMedia("(max-width: 860px)").matches) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = async () => {
    if (!cur || busy) return;
    setBusy(true);
    try {
      await saveIrfanCard(cur.card, cur.look);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ البطاقة.");
    } finally {
      setBusy(false);
    }
  };

  const action = season ? { label: "اكتب عِرفانًا", icon: <NotePencil />, href: "/dashboard/irfan/new" } : undefined;
  // الموسمُ المفتوحُ خبرٌ لا فعل: الفعلُ في اللوح («اكتب عِرفانًا»)، والتنبيهُ يقول متى يُغلق
  const seasonLine = season ? (
    <AdNote tone="info" title={`موسمُ «${season.title}» مفتوح`}>آخرُ أيّامه {lastDay(season.closesAt)}. ما تكتبه يصل القائدَ في بوّابته، ولك أن ترسله إليه في واتساب.</AdNote>
  ) : null;

  if (!cur) {
    return (
      <AccountRoom navPath="/dashboard/irfan" title="عِرفان" action={action}>
        {error ? <AdNote tone="bad">{error}</AdNote> : null}
        {seasonLine}
        <AdSection icon={<HandHeart />} title="لا عِرفانَ بعد"
          sub={season ? "اكتب لقائدٍ في أدِيب، وما يصلك يظهر هنا" : "يُفتح موسمُ عِرفان في مناسباته، وما يصلك يبقى هنا"} />
      </AccountRoom>
    );
  }

  const card = (
    <div ref={stage}>
      <AdSection icon={cur.dir === "in" ? <HandHeart /> : <PaperPlaneTilt />} title={party(cur)} sub={cur.card.season}
        media={<Big key={cur.id} it={cur} alt={`عِرفان ${party(cur)}`} />}>
        <AdLine icon={<DownloadSimple />} k="البطاقة" v="احفظها صورة" sub="لتنشرها أو تحتفظ بها" disabled={busy}
          act={{ icon: <DownloadSimple />, text: "حفظ", label: "حفظ البطاقة" }} onClick={() => void save()} />
        {waHref ? (
          <AdLine icon={<WhatsappLogo />} k="واتساب" v={`أرسله إلى ${firstName(cur.card.to)}`} sub="محادثتُه، وفيها رسالتُك ورابطُ بطاقتها"
            act={{ icon: <CaretLeft />, text: "افتح", label: "أرسله في واتساب" }} href={waHref} />
        ) : null}
      </AdSection>
    </div>
  );

  return (
    <AccountRoom navPath="/dashboard/irfan" title="عِرفان" action={action}>
      {error ? <AdNote tone="bad">{error}</AdNote> : null}
      {seasonLine}
      <AdCols sticky aside={card}>
        {GROUPS.map((g) => {
          const xs = items.filter((i) => i.dir === g.dir);
          if (!xs.length) return null;
          return (
            <AdSection key={g.dir} icon={g.icon} title={g.label} sub={g.say}>
              {xs.map((i) => (
                <AdLine key={i.id} icon={g.icon} k={i.card.season} v={party(i)} current={cur.id === i.id}
                  sub={i.dir === "in" && i.unread && !seen.has(i.id) ? "جديدة، لم تقرأها بعد" : i.dir === "out" ? i.card.seat : undefined}
                  tone={i.dir === "in" && i.unread && !seen.has(i.id) ? "ok" : undefined} toneAt="sub"
                  act={{ icon: <CaretLeft />, text: "عرض", label: `عرض عِرفان ${party(i)}` }} onClick={() => pick(i.id)} />
              ))}
            </AdSection>
          );
        })}
      </AdCols>
    </AccountRoom>
  );
}
