"use client";

/**
 * **«اكتب عِرفانًا»** على قالب «النموذج» (٢٠٢٦-١١-١٣) — السلوكُ سلوكُ `dashboard/irfan/IrfanCompose.tsx` حرفًا: القائدُ، ثمّ العنوانُ
 * (بجنس القائد والمرسل، أو عنوانٌ يكتبه)، ثمّ المتنُ يكتبه كلَّه بيده (15 إلى 500 حرف)، وتصميمُ البطاقة («رسالة» أو «شفق»)، ومعاينةٌ حيّة.
 * وبعد الإرسال تُرفع صورةُ المعاينة قبل أن يظهر زرُّ واتساب، فيجد واتساب الصورةَ حين يقرأ الرابط.
 *
 * والشكلُ: الحقولُ أقسامٌ في عمود النموذج، و«كما ستظهر» في جانبه **تذكرتُها في غرفة عِرفان** (`AdCard paper="portrait"`) بالبطاقة
 * المرسومة نفسِها — فالمرسلُ يرى ما سيصل حرفًا. وبعد الحفظ: ما حُفظ وأفعالُه، والبطاقةُ بجانبها.
 */
import { useEffect, useMemo, useState } from "react";
import { Field, PersonPicker, Select, Textarea, overBy } from "@adeeb/design-system";
import { CalendarDots, ChatTeardropText, Crown, HandHeart, Image as ImageIcon, NotePencil, Palette, PaperPlaneTilt, TextT, WhatsappLogo } from "@phosphor-icons/react";
import { CaretLeft, DownloadSimple, PencilSimple } from "@/app/_components/glyphs";
import { renderIrfanCard, saveIrfanCard, type IrfanCard, type IrfanLook } from "@/lib/irfan/card";
import { uploadIrfanPreview } from "@/lib/irfan/preview";
import { BODY_MAX, BODY_MIN, HEADINGS, TITLE_MAX, headingLabel, headingText, lettersPhrase } from "@/lib/irfan/vocab";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { irfanPreviewFailed } from "@/app/dashboard/irfan/actions";
import { LOOK_NAMES, type IrfanSent, type Recipient } from "@/app/dashboard/irfan/vocab";
import { AdCard, AdNote } from "../primitives";
import { FormRoom, FormSection } from "../form";
import { AccountRoom, AdCols, AdLine, AdSection } from "../account";

// «تصميم: رسالة» لا «رسالة» وحدها: كلمةٌ مفردةٌ بجانب «رسالتك» تُقرأ نوعَ رسالةٍ لا شكلَ بطاقة (المالك ٢٠٢٦-١٠-١٧)
const LOOKS = (Object.keys(LOOK_NAMES) as IrfanLook[]).map((value) => ({ value, label: `تصميم: ${LOOK_NAMES[value]}` }));

/** بصمةُ البطاقة: بها يُعرف أنّ ما في المعاينة هو ما سيُرسل حرفًا حرفًا، فيُعاد استعمالُه بلا رسم. */
const printOf = (card: IrfanCard, look: IrfanLook) => JSON.stringify([card, look]);

/** المعاينةُ الحيّة، ومعها البطاقةُ نفسُها (`blob`) وبصمتُها: يأخذها الإرسالُ فيبني منها صورةَ واتساب بلا رسمٍ جديد. */
function usePreview(card: IrfanCard, look: IrfanLook) {
  const [shot, setShot] = useState<{ src: string; blob: Blob; print: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const print = printOf(card, look);
    const t = setTimeout(() => {
      renderIrfanCard(card, look).then((blob) => {
        if (!alive) return;
        const src = URL.createObjectURL(blob);
        setShot((old) => { if (old) URL.revokeObjectURL(old.src); return { src, blob, print }; });
      }, () => { /* تبقى المعاينةُ السابقة */ });
    }, 600);
    return () => { alive = false; clearTimeout(t); };
  }, [card, look]);
  return shot;
}

export function IrfanComposeRoom({ leaders, season, sender, canReceive, send, error: loadError }: {
  leaders: Recipient[];
  season: string;
  sender: { name: string; gender: "male" | "female" | null };
  /** أيصله هو عِرفان؟ القادةُ وحدهم يصلهم، فلا يُقال لعضو لجنةٍ «وما وصلك» (المالك ٢٠٢٦-١٠-١٧). */
  canReceive: boolean;
  send: (to: string, body: string, look: IrfanLook, heading: string, custom?: string | null) => Promise<IrfanSent>;
  error?: string | null;
}) {
  // بعد الحفظ تُحفظ البطاقةُ لقطةً: الإجراءُ الخادميّ يُحدِّث القائمة فيسقط منها مَن كُتب له، ولو رُسمت من القائد المختار لخلت من اسمه
  const [done, setDone] = useState<{ id?: number; whatsapp: string | null; to: string; card: IrfanCard; look: IrfanLook; pictured: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [look, setLook] = useState<IrfanLook>("letter");
  const [toName, setToName] = useState<string[]>([]);
  const [heading, setHeading] = useState("thanks");
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leader = leaders.find((l) => l.name === toName[0]);

  // العناوينُ تُعرض بجنس القائد المختار (والمرسلِ حيث يتكلّم عن نفسه)، فيرى المرسلُ ما سيُرسم حرفيًّا
  const headings = useMemo(
    () => HEADINGS.map((h) => ({ value: h.value, label: headingLabel(h, leader?.gender, sender.gender) })),
    [leader?.gender, sender.gender],
  );
  const writing = heading === "custom";
  const title = headingText(heading, leader?.gender, sender.gender, custom);
  const noTitle = writing && !title;

  const people = useMemo(
    () => leaders.map((l) => ({ name: l.name, hint: l.seat, group: l.council, icon: <Avatar name={l.name} gender={l.gender ?? undefined} src={l.avatar ?? undefined} size="xs" /> })),
    [leaders],
  );
  const len = body.trim().length;
  const short = len < BODY_MIN;
  const long = overBy(body.trim(), BODY_MAX) > 0;
  const card = useMemo<IrfanCard>(
    () => ({ to: leader?.name ?? "", seat: leader?.seat ?? "", from: sender.name, body: body.trim() || "…", season, title }),
    [leader, sender.name, body, season, title],
  );
  const shot = usePreview(done ? done.card : card, done ? done.look : look);
  const src = shot?.src ?? null;

  const submit = async () => {
    if (!leader || short || long || noTitle || busy) return;
    setBusy(true);
    setError(null);
    const r = await send(leader.id, body, look, heading, writing ? custom : null);
    if (!r.ok) { setBusy(false); setError(r.message); return; }
    // صورةُ المعاينة تُرفع قبل أن تُفتح المحادثة، وتعثّرُها لا يُسقط شيئًا: الرسالةُ حُفظت، والرابطُ يفتح البطاقةَ وإن غابت صورتُه
    let pictured = false;
    if (r.upload) {
      const ready = shot && shot.print === printOf(card, look) ? shot.blob : null;
      const res = await uploadIrfanPreview(card, look, r.upload, ready);
      pictured = res.ok;
      if (!res.ok && r.id) void irfanPreviewFailed(r.id, res.step, "compose", res.error, navigator.userAgent);
    }
    setBusy(false);
    setDone({ id: r.id, whatsapp: r.whatsapp ?? null, to: leader.name, card, look, pictured });
    // الزرُّ آخرُ الصفحة في الجوّال وما بعد الحفظ أوّلُها: بلا صعودٍ لا يرى صاحبُه زرَّ واتساب (المالك ٢٠٢٦-١٠-١٧)
    document.querySelector(".ash-content")?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // التذكرةُ كما ستظهر في «أرسلتُ»: البطاقةُ المرسومةُ نفسُها رأسَها
  const ticket = (c: IrfanCard) => (
    <AdCard seed="irfan-new" paper="portrait" cover={src} title={c.to ? `إلى ${c.to}` : "إلى القائد"}
      meta={[{ icon: <CalendarDots />, text: c.season }, ...(c.seat ? [{ icon: <Crown />, text: c.seat }] : [])]} />
  );

  /**
   * **بعد الحفظ: زرٌّ واحدٌ إلى المحادثة.** لا تُفتح وحدها، لأنّ المتصفّح لا يفتح تطبيقًا آخر إلّا بضغطةٍ مباشرة، والحفظُ والرفعُ ينقضيان
   * قبلها بثوانٍ فتسقط الضغطةُ الأولى عنده (سفاري خاصّةً).
   */
  if (done) {
    const first = done.to.split(" ")[0];
    return (
      <AccountRoom navPath="/dashboard/irfan" title="حُفظ عِرفانك">
        <AdCols aside={<div className="ad-irfan-side">{ticket(done.card)}</div>}>
          <AdSection icon={<HandHeart />} title={`إلى ${done.to}`}
            sub={done.whatsapp ? `يجده ${first} في بوّابته، وأرسله إليه في واتساب ليصله الآن` : `يجده ${first} في بوّابته`}>
            {done.whatsapp ? (
              <AdLine icon={<WhatsappLogo />} k="واتساب" v={`أرسله إلى ${first}`} tone="ok"
                sub={done.pictured ? "تُفتح محادثتُه وفيها رسالتُك ورابطُ بطاقتها" : "تعذّر تجهيزُ صورة البطاقة، فيصله الرابطُ بلا صورتها، والبطاقةُ تُفتح منه كاملة"}
                act={{ icon: <CaretLeft />, text: "افتح", label: `أرسله إلى ${first} في واتساب` }} href={done.whatsapp} />
            ) : null}
            <AdLine icon={<ImageIcon />} k="البطاقة" v="احفظها صورة" sub="لتنشرها أو تحتفظ بها" disabled={saving}
              act={{ icon: <DownloadSimple />, text: "حفظ", label: "حفظ البطاقة" }}
              onClick={async () => { setSaving(true); try { await saveIrfanCard(done.card, done.look); } finally { setSaving(false); } }} />
            <AdLine icon={<HandHeart />} k="عِرفان" v={canReceive ? "ما أرسلتَه وما وصلك" : "ما أرسلتَه"}
              act={{ icon: <CaretLeft />, text: "فتح", label: "عِرفان" }} href={done.id ? `/dashboard/irfan?m=${done.id}` : "/dashboard/irfan"} />
            <AdLine icon={<NotePencil />} k="قائدٌ آخر" v="اكتب عِرفانًا جديدًا" act={{ icon: <CaretLeft />, text: "اكتب", label: "اكتب عِرفانًا جديدًا" }}
              onClick={() => { setDone(null); setToName([]); setBody(""); setCustom(""); }} />
          </AdSection>
        </AdCols>
      </AccountRoom>
    );
  }

  if (!leaders.length) {
    return (
      <AccountRoom navPath="/dashboard/irfan" title="اكتب عِرفانًا">
        {loadError ? <AdNote tone="bad">{loadError}</AdNote> : null}
        <AdSection icon={<HandHeart />} title="كتبتَ لكلّ قادة أدِيب في هذا الموسم" sub="ما كتبتَه تجده في «أرسلتُ»">
          <AdLine icon={<HandHeart />} k="عِرفان" v="ما أرسلتَه" act={{ icon: <CaretLeft />, text: "فتح", label: "عِرفان" }} href="/dashboard/irfan" />
        </AdSection>
      </AccountRoom>
    );
  }

  return (
    <FormRoom
      path="/dashboard/irfan/new"
      title="اكتب عِرفانًا"
      preview={ticket(card)}
      commit={{
        // لا يُرسَل ما لم يكتمل: القائدُ، والعنوانُ إن كتبه، والمتنُ بين حدّيه
        primary: { label: "أرسل عِرفانك", icon: <PaperPlaneTilt />, onClick: () => void submit(), busy, held: !leader || short || long || noTitle },
        // **بلا الفعل الطافي** في الضيّق: الزرُّ بعد «كما ستظهر» عمدًا، فلا يُرسَل ما لم يُرَ (المالك ٢٠٢٦-١٠-١٧) — والطافي يُرسل من فوق الحقول
        cancelHref: "/dashboard/irfan",
      }}
    >
      {loadError ? <AdNote tone="bad">{loadError}</AdNote> : null}
      {error ? <AdNote tone="bad">{error}</AdNote> : null}
      <FormSection icon={<Crown />} title="إلى من؟" mark="required" sub={`قادةُ المجلسين، وموسمُ ${season}`}>
        <div className="form-grid">
          <PersonPicker className="form-full" label="القائد" icon={<Crown />} people={people} value={toName} onChange={setToName}
            single required placeholder="ابحث باسم القائد أو مقعده" />
        </div>
      </FormSection>
      <FormSection icon={<ChatTeardropText />} title="رسالتك" mark="required">
        <div className="form-grid">
          <Select className="form-full" label="العنوان" icon={<TextT />} options={headings} value={heading} onValueChange={setHeading} />
          {writing ? (
            <Field className="form-full" label="عنوانك" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثلًا: أستاذي في الإعلام"
              required count={{ max: TITLE_MAX }} value={custom} onChange={(e) => setCustom(e.target.value)} />
          ) : null}
          <Textarea className="form-full" label="رسالتك" icon={<ChatTeardropText />} innerIcon={<PencilSimple />} placeholder="اكتب ما تريد أن يعرفه"
            required rows={7} count={{ max: BODY_MAX }} value={body} onChange={(e) => setBody(e.target.value)}
            helper={short ? `بقي ${lettersPhrase(BODY_MIN - len)}` : undefined} />
        </div>
      </FormSection>
      <FormSection icon={<Palette />} title="تصميم البطاقة" sub="يراها القائد كما في «كما ستظهر»">
        <div className="form-grid">
          <Select className="form-full" label="التصميم" icon={<Palette />} options={LOOKS} value={look} onValueChange={(v) => setLook(v as IrfanLook)} />
        </div>
      </FormSection>
    </FormRoom>
  );
}
