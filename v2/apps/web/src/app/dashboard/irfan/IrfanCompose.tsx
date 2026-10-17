"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardHeader, PersonPicker, Segmented, Select, Textarea } from "@adeeb/design-system";
import { ChatTeardropText, Crown, HandHeart, Image as ImageIcon, NotePencil, PaperPlaneTilt, Quotes, WhatsappLogo } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { DownloadSimple, PencilSimple } from "@/app/_components/glyphs";
import { renderIrfanCard, renderIrfanPreview, saveIrfanCard, type IrfanCard, type IrfanLook } from "@/lib/irfan/card";
import { BODY_MAX, BODY_MIN, OPENINGS, lettersPhrase, ownWords } from "@/lib/irfan/vocab";
import { Avatar } from "../_components/Avatar";
import { CaretAct, Row } from "../_portal/Row";
import { LOOK_NAMES, type IrfanSent, type Recipient } from "./vocab";

/**
 * **شاشةُ الكتابة** — كما عُرضت على المالك في `/ui/irfan` وأقرّها: القائدُ، ثمّ الافتتاحيّة، ثمّ ما يكتبه
 * بيده، ومعاينةٌ حيّةٌ للبطاقة **بتصميمٍ يختاره المرسل** («رسالة» أو «شفق»، المالك: «وليكن تصميمين»).
 * ومكوّنٌ واحدٌ للمعرض والغرفة: المعرضُ يمرّر قادةً مخترَعين وإرسالًا لا يُرسِل.
 */

const LOOKS = (Object.keys(LOOK_NAMES) as IrfanLook[]).map((value) => ({ value, label: LOOK_NAMES[value] }));

function usePreview(card: IrfanCard, look: IrfanLook) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    const t = setTimeout(() => {
      renderIrfanCard(card, look).then((b) => {
        if (!alive) return;
        made = URL.createObjectURL(b);
        setSrc((old) => { if (old) URL.revokeObjectURL(old); return made; });
      }, () => { /* تبقى المعاينةُ السابقة */ });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [card, look]);
  return src;
}

export function IrfanCompose({ leaders, season, sender, canReceive, send }: {
  leaders: Recipient[];
  season: string;
  sender: { name: string; gender: "male" | "female" | null };
  /** أيصله هو عِرفان؟ القادةُ وحدهم يصلهم، فلا يُقال لعضو لجنةٍ «وما وصلك» (المالك ٢٠٢٦-١٠-١٧). */
  canReceive: boolean;
  send: (to: string, body: string, look: IrfanLook) => Promise<IrfanSent>;
}) {
  // بعد الحفظ تُحفظ البطاقةُ لقطةً: الإجراءُ الخادميّ يُحدِّث القائمةَ (`revalidatePath`) فيسقط منها مَن كُتب له،
  // ولو رُسمت البطاقةُ من القائد المختار لخلت من اسمه ومقعده (رآه المالك: «إلى» وحدها).
  const [done, setDone] = useState<{ id?: number; whatsapp: string | null; to: string; card: IrfanCard; look: IrfanLook } | null>(null);
  const [saving, setSaving] = useState(false);
  const [look, setLook] = useState<IrfanLook>("letter");
  const [toName, setToName] = useState<string[]>([]);
  const [opening, setOpening] = useState("thanks");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prev = useRef("");
  const leader = leaders.find((l) => l.name === toName[0]);

  const openingText = OPENINGS.find((x) => x.value === opening)?.text(leader?.gender, sender.gender) ?? "";
  // الافتتاحيّةُ تُبدَّل في رأس الرسالة ولا تمسّ ما كتبه المرسلُ بعدها (وتتبع جنسَ القائد إن تبدّل)
  // (والقديمةُ تُلتقط قبل النداء: المُحدِّثُ يجري عند الرسم التالي، وقد تبدّل المرجعُ حينها فتتكرّر الافتتاحيّة)
  useEffect(() => {
    const was = prev.current;
    prev.current = openingText;
    setBody((b) => (b.startsWith(was) ? openingText + b.slice(was.length) : openingText + b));
  }, [openingText]);

  const people = useMemo(
    () => leaders.map((l) => ({ name: l.name, hint: l.seat, group: l.council, icon: <Avatar name={l.name} gender={l.gender ?? undefined} src={l.avatar ?? undefined} size="xs" /> })),
    [leaders],
  );
  const len = body.trim().length;
  const own = ownWords(body, openingText).length;
  const short = own < BODY_MIN;
  const card = useMemo<IrfanCard>(
    () => ({ to: leader?.name ?? "", seat: leader?.seat ?? "", from: sender.name, body: body.trim() || "…", season }),
    [leader, sender.name, body, season],
  );
  const src = usePreview(done ? done.card : card, done ? done.look : look);

  const submit = async () => {
    if (!leader || short) return;
    setBusy(true);
    setError(null);
    const r = await send(leader.id, body, look);
    if (!r.ok) { setBusy(false); setError(r.message); return; }
    // صورةُ المعاينة تُرفع قبل أن تُفتح المحادثة، فيجدها واتساب حين يقرأ الرابط. وتعثّرُها لا يُسقط
    // شيئًا: الرسالةُ حُفظت، والرابطُ يفتح البطاقةَ وإن غابت صورتُه عن المعاينة.
    if (r.upload) {
      try {
        const blob = await renderIrfanPreview(card, look);
        await createClient().storage.from("images").uploadToSignedUrl(r.upload.path, r.upload.token, blob, { contentType: "image/jpeg" });
      } catch { /* تمضي بلا صورة معاينة */ }
    }
    setBusy(false);
    setDone({ id: r.id, whatsapp: r.whatsapp ?? null, to: leader.name, card, look });
  };

  /**
   * **بعد الحفظ: زرٌّ واحدٌ إلى المحادثة.** لا تُفتح وحدها، لأنّ المتصفّح لا يفتح تطبيقًا آخر إلّا بضغطةٍ
   * مباشرة، والحفظُ والرفعُ ينقضيان قبلها بثوانٍ فتسقط الضغطةُ الأولى عنده (سفاري خاصّةً).
   */
  if (done) {
    const first = done.to.split(" ")[0];
    return (
      <div className="acc-cols is-wide-aside">
        <div className="acc-main">
          <Card>
            <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title="حُفظ عِرفانُك"
              subtitle={done.whatsapp ? `يجده ${first} في بوّابته، وأرسله إليه في واتساب ليصله الآن` : `يجده ${first} في بوّابته`} />
            {done.whatsapp
              ? <Row Icon={WhatsappLogo} k="واتساب" v={`أرسله إلى ${first}`} sub="تُفتح محادثتُه وفيها رسالتُك ورابطُ بطاقتها"
                  act={CaretAct(`أرسله إلى ${first} في واتساب`, "افتح")} href={done.whatsapp} tone="ok" />
              : null}
            <Row Icon={ImageIcon} k="البطاقة" v="احفظها صورة" sub="لتنشرها أو تحتفظ بها"
              act={{ Icon: DownloadSimple, label: "حفظ البطاقة", text: "حفظ" }} disabled={saving}
              onClick={async () => { setSaving(true); try { await saveIrfanCard(done.card, done.look); } finally { setSaving(false); } }} />
            <Row Icon={HandHeart} k="عِرفان" v={canReceive ? "ما أرسلتَه وما وصلك" : "ما أرسلتَه"} act={CaretAct("عِرفان")} href={done.id ? `/dashboard/irfan?m=${done.id}` : "/dashboard/irfan"} />
            <Row Icon={NotePencil} k="قائدٌ آخر" v="اكتب عِرفانًا جديدًا" act={CaretAct("اكتب عِرفانًا جديدًا", "اكتب")}
              onClick={() => { setDone(null); setToName([]); setBody(openingText); }} />
          </Card>
        </div>
        <section className="acc-aside">
          <div className="acr-easel is-plain">
            {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
            {src ? <img className="acr-shot is-portrait" src={src} alt="بطاقة عِرفانك" /> : <span className="acr-shot is-portrait" aria-hidden />}
          </div>
        </section>
      </div>
    );
  }

  if (!leaders.length) {
    return <Alert tone="info" title="كتبتَ لكلّ قادة أدِيب في هذا الموسم">ما كتبتَه تجده في «أرسلتُ».</Alert>;
  }

  return (
    <div className="acc-cols is-wide-aside">
      <div className="acc-main">
      <div className="form-grid">
        {error ? <Alert tone="danger" className="form-full">{error}</Alert> : null}
        <PersonPicker className="form-full" label="إلى من؟" icon={<Crown />} people={people} value={toName} onChange={setToName}
          single required placeholder="ابحث باسم القائد أو مقعده" />
        <Select className="form-full" label="الافتتاحيّة" icon={<Quotes />} options={OPENINGS.map((o) => ({ value: o.value, label: o.label }))}
          value={opening} onValueChange={setOpening} />
        <Textarea className="form-full" label="رسالتك" icon={<ChatTeardropText />} innerIcon={<PencilSimple />} placeholder="اكتب ما تريد أن يعرفه"
          required rows={7} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)}
          helper={short ? `بقي ${lettersPhrase(BODY_MIN - own)} بعد الافتتاحيّة` : `${len} من ${BODY_MAX}`} />
        <div className="form-full">
          <Button loading={busy} disabled={!leader || short} onClick={submit}>
            <PaperPlaneTilt size={18} />أرسل عِرفانك
          </Button>
        </div>
      </div>
      </div>
      <section className="acc-aside">
        <Segmented items={LOOKS} value={look} onValueChange={(v) => setLook(v as IrfanLook)} aria-label="تصميم البطاقة" wide />
        <div className="acr-easel is-plain">
          {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
          {src ? <img className="acr-shot is-portrait" src={src} alt="معاينة البطاقة" /> : <span className="acr-shot is-portrait" aria-hidden />}
        </div>
      </section>
    </div>
  );
}
