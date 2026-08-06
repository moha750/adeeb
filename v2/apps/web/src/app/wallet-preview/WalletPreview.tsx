"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container, LandingHeading, Segmented } from "@adeeb/design-system";
import { DeviceMobile, Gift, Sparkle, Storefront, Wallet } from "@phosphor-icons/react";
import { ArrowCounterClockwise } from "@/app/_components/glyphs";
import { Info, Minus, Plus } from "@/app/_components/glyphs";
import { downloadBlob } from "@/lib/download";
import { qrSvg } from "@/lib/qr";
import {
  affordable,
  CATALOG,
  EARN,
  GOAL,
  isComplete,
  MEMBERS,
  memberById,
  type Mode,
  nextReward,
  num,
  pointsStatusText,
  REWARD,
  score,
  serialFor,
  statusText,
  TOP_COST,
  type DemoMember,
} from "./demo";
import { faceFor, type PassField } from "./pass";
import { useLiveCards, type LiveCard } from "./useLiveCards";
import "./card.css";

/* ── أجزاء البطاقة ─────────────────────────────────────────────────────── */

/** حقلٌ واحد — تسميةٌ فوق قيمة، كما ترسمه أبل. */
function Fld({ f, kind }: { f: PassField; kind?: "head" }) {
  return (
    <div className={kind ? `wp-fld--${kind}` : undefined}>
      {f.label ? <span className="wp-lab">{f.label}</span> : null}
      <span className="wp-val">{f.value}</span>
    </div>
  );
}

/**
 * رابطُ سطح البطاقة — **دالّةٌ في العدّاد وحده** فلا يكذب رابطُه (`strip/route.ts`).
 * والوسيطُ يسمّي النظام بنفسه: `stamps` لبطاقة الأختام و`points` لبطاقة النقاط.
 */
const stripUrl = (mode: Mode, m: DemoMember): string =>
  mode === "points" ? `/wallet-preview/strip?points=${m.points}` : `/wallet-preview/strip?stamps=${m.stamps}`;

/**
 * سطحُ البطاقة **بلا وميضٍ عند الختم**: العدّادُ يتغيّر فورًا، والصورةُ لا تُبدَّل حتى
 * تكتمل الجديدةُ في الذاكرة — وإلّا ومض إطارٌ فارغٌ مكان السطح في كلّ ضغطة.
 *
 * وتسبق إلى الجارَين (`±1`) فيصير الختمُ التالي والتراجعُ بلا انتظارٍ أصلًا؛ والردُّ
 * خالدُ التخزين، فلا يُطلَب مقاسٌ مرّتين.
 */
function useStrip(url: string, ahead: string[]): string {
  const [shown, setShown] = useState(url);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = url;
    const settle = () => {
      if (alive) setShown(url);
    };
    // `decode` يفشل على صورةٍ لم تُحمَّل — والفشلُ يعرض القديمَ لا فراغًا، فيُعامَل معاملتَه.
    void img.decode().then(settle, settle);

    for (const next of ahead) new Image().src = next;

    return () => {
      alive = false;
    };
    // `ahead` مصفوفةٌ تُبنى في كلّ رسم، فمرجعُها يتغيّر أبدًا — تُقرأ ولا تُجدوِل.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return shown;
}

/**
 * البطاقة **كما يرسمها Apple Wallet** — لا كما نتمنّاها:
 *
 * · الحقولُ من `cardFace()` نفسِه الذي يكتب `pass.json` (انظر رأس `pass.ts`).
 * · والسطحُ **صورةُ `strip.png` عينُها** التي تدخل الحزمة — لا محاكاةٌ بـCSS تشبهها.
 * · واللونُ مصمتٌ والخطُّ خطُّ النظام والرمزُ مربّعاتٌ سوداء، لأنّ ذلك ما يصل الجهاز.
 *
 * فما يُقرَّر على هذه الشاشة يُقرَّر على البطاقة الحقيقيّة، ولا مفاجأةَ عند الإضافة.
 */
function WalletCard({ member, mode }: { member: DemoMember; mode: Mode }) {
  const [back, setBack] = useState(false);
  const face = faceFor(member, mode);

  // **السَّبقُ إلى ما بعده**: في الأختام الجاران (`±1`)، وفي النقاط ما تصير إليه كلُّ
  // قيمةِ كسب — فالضغطةُ التالية تجد سطحَها جاهزًا فلا تومض.
  const strip = useStrip(
    stripUrl(mode, member),
    mode === "points"
      ? EARN.map((e) => stripUrl(mode, { ...member, points: member.points + e.points }))
      : [member.stamps - 1, member.stamps + 1]
          .filter((n) => n >= 0 && n <= GOAL)
          .map((n) => stripUrl(mode, { ...member, stamps: n })),
  );

  /**
   * الرمز يُبنى مرّةً لكلّ حمولة — بناؤه ليس رخيصًا.
   *
   * **ومربّعاتٌ سوداء لا شكلُ أديب**: يرسمه iOS من `barcodes[]` بلا تخصيص، فرمزُنا
   * السائل هنا وعدٌ لا يصل. (وهي القيمُ الافتراضيّة في `qrSvg` — تُكتب لتُقرأ قصدًا.)
   */
  const qr = useMemo(
    () =>
      qrSvg({
        text: face.barcode,
        size: 100,
        dots: { shape: "square", paint: { kind: "solid", color: "#000000" } },
        eye: { shape: "square", color: null },
        pupil: { shape: "square", color: null },
        bg: null,
      }),
    [face.barcode],
  );

  return (
    <div className="wp-stage">
      <div className="wp-flip" data-face={back ? "back" : "front"}>
        <button
          type="button"
          className="wp-turn"
          onClick={() => setBack((b) => !b)}
          aria-label={back ? "عرض وجه البطاقة" : "عرض ظهر البطاقة"}
        >
          {back ? <ArrowCounterClockwise size={14} /> : <Info size={15} />}
        </button>

        <div className="wp-side" aria-hidden={back}>
          <div className="wp-head">
            {/* الشعار الأبيض من أصول الموقع — هو نفسُه الذي يُحزَم في ملفّ المحفظة */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wp-logo" src="/brand/logo-horizontal-white.png" alt="نادي أَدِيب" />
            {face.headerFields.map((f) => (
              <Fld key={f.key} f={f} kind="head" />
            ))}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="wp-strip"
            src={strip}
            alt={mode === "points" ? `${num(member.points)} نقطة` : `${num(member.stamps)} من ${num(GOAL)} مشاركات`}
          />

          <div className="wp-fields">
            <div className="wp-row">
              {face.secondaryFields.map((f) => (
                <Fld key={f.key} f={f} />
              ))}
            </div>

            <div className="wp-row wp-row--aux">
              {face.auxiliaryFields.map((f) => (
                <Fld key={f.key} f={f} />
              ))}
            </div>
          </div>

          {/* الرمز يُحقَن نصًّا — الـSVG داخل المستند فيُرسَم كما هو */}
          <div className="wp-code" dangerouslySetInnerHTML={{ __html: qr }} />
          <span className="wp-alt">{member.serial}</span>
        </div>

        {/* ظهرُ البطاقة: حقولُ `backFields` وحدها على ورقةٍ بيضاء — لا عنوانَ فوقها، فأبل
            لا تكتب على الظهر إلّا ما كتبناه فيه. */}
        <div className="wp-side wp-side--back" aria-hidden={!back}>
          {face.backFields.map((f) => (
            <div key={f.key} className="wp-back-f">
              <span className="wp-lab">{f.label}</span>
              <span className="wp-val">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── الشاشة ────────────────────────────────────────────────────────────── */

/** ما ينقص لتشغيل التوقيع — يُقرأ من ردّ الخادم لا يُخمَّن. */
type MissingEnv = { name: string; need: string };

/**
 * أجهاز أبل هو؟ — يقرّر مسارَ التسليم لا شيئًا آخر (انظر `addToWallet`).
 * والشقّ الثاني لأيباد الحديث: يزعم أنّه «MacIntel» ويفضحه وجودُ اللمس.
 */
const isApple = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** خلاصةُ آخر مزامنة — تُعرَض كما قالها الخادم، فالدفعةُ الصامتة لا تُصدَّق بلا خبر. */
type SyncState = { devices: number; pushed: number; failures: { status: number; reason?: string }[]; error?: string };

export function WalletPreview({ initial }: { initial: Record<string, LiveCard> }) {
  const [memberId, setMemberId] = useState(MEMBERS[0].id);
  /**
   * **أيُّ النظامين معروض** — والمحاكاتان تعيشان معًا: لكلٍّ بطاقتُها ورقمُها وصفُّها في
   * القاعدة، فالتبديلُ عرضٌ لا تحويل. ولذلك تصلح البطاقتان أن تكونا في محفظةٍ واحدة.
   */
  const [mode, setMode] = useState<Mode>("stamps");
  /**
   * حالةُ البطاقات — **من القاعدة لا من `demo.ts`**، و**متابَعةٌ لحظةً بلحظة**: من ختم في
   * صفحة المسح رأيتَه هنا بلا تحديث (`useLiveCards`).
   */
  const { cards, merge } = useLiveCards(initial);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [passError, setPassError] = useState<{ message: string; missing?: MissingEnv[] } | null>(null);

  const base = memberById(memberId);
  const serial = serialFor(base, mode);
  const live = cards[serial] ?? {
    stamps: base.stamps,
    cycles: base.cycles,
    points: base.points,
    redemptions: base.redemptions,
    updatedAt: "",
  };
  const member: DemoMember = {
    ...base,
    stamps: live.stamps,
    cycles: live.cycles,
    points: live.points,
    redemptions: live.redemptions,
  };
  const done = isComplete(member.stamps);
  /** ما يبلغه رصيدُه الآن، وأقربُ ما لم يبلغه — يُحسبان مرّةً ويُقرآن في مواضع. */
  const can = affordable(member.points);
  const next = nextReward(member.points);

  /**
   * يكتب الحالة في القاعدة ثمّ يدفع نبضةً إلى الأجهزة المسجَّلة — **وهو ما يجعل البطاقة
   * في الجيب تتغيّر**. وجوابُه يُدمَج كما يُدمَج جوابُ المتابعة: الأحدثُ يفوز.
   */
  async function syncNow(patch: { stamps?: number; cycles?: number; points?: number; redemptions?: number }) {
    setSyncing(true);
    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: memberId, mode, ...patch }),
      });
      const body = (await res.json()) as SyncState & { error?: string; serial?: string } & Partial<LiveCard>;
      if (res.ok) {
        setSync({ devices: body.devices, pushed: body.pushed, failures: body.failures ?? [] });
        if (body.serial && body.updatedAt) {
          merge({
            [body.serial]: {
              stamps: body.stamps ?? live.stamps,
              cycles: body.cycles ?? live.cycles,
              points: body.points ?? live.points,
              redemptions: body.redemptions ?? live.redemptions,
              updatedAt: body.updatedAt,
            },
          });
        }
      } else {
        setSync({ devices: 0, pushed: 0, failures: [], error: body.error ?? "تعذّرت المزامنة." });
      }
    } catch {
      setSync({ devices: 0, pushed: 0, failures: [], error: "تعذّر الاتّصال بالخادم." });
    } finally {
      setSyncing(false);
    }
  }

  /**
   * **البابُ الواحد لكلّ تغييرٍ محلّيّ**: يرسم الحالة الجديدة فورًا بزمنٍ محلّيّ ثمّ يرسلها،
   * فلا تتلكّأ الضغطةُ ريثما يردّ الخادم. وجوابُه بعد حين يحمل زمنَه الحقيقيّ فيحلّ محلّه.
   */
  function apply(patch: Partial<Omit<LiveCard, "updatedAt">>) {
    merge({ [serial]: { ...live, ...patch, updatedAt: new Date().toISOString() } });
    void syncNow(patch);
  }

  /* ── أفعالُ الأختام ── */

  /** يضبط الأختام في المدى — كلّ أزرار التجربة تمرّ به فلا تخرج قيمةٌ عن حدّها. */
  function setStamps(nextStamps: number) {
    setClaimed(false);
    apply({ stamps: Math.min(GOAL, Math.max(0, nextStamps)), cycles: live.cycles });
  }

  /** استلامُ المكافأة: **يصفّر العدّاد** ويزيد عدّاد البطاقات المكتملة. */
  function claim() {
    setClaimed(true);
    apply({ stamps: 0, cycles: live.cycles + 1 });
  }

  /* ── أفعالُ النقاط ── */

  /** يضبط الرصيد في مداه — الكسبُ والتراجعُ والتصفيرُ كلُّها تمرّ به. */
  function setPoints(nextPoints: number) {
    setClaimed(false);
    apply({ points: Math.min(TOP_COST, Math.max(0, nextPoints)), redemptions: live.redemptions });
  }

  /**
   * صرفُ مكافأة: **يُخصَم ثمنُها ولا يُصفَّر الرصيد** — وهذا فرقُ النقاط عن الأختام،
   * فما زاد عن الثمن يبقى لصاحبه ويُبنى عليه.
   */
  function redeem(cost: number) {
    setClaimed(true);
    apply({ points: Math.max(0, live.points - cost), redemptions: live.redemptions + 1 });
  }

  /**
   * تنزيل الحزمة الموقَّعة **بحالة الأختام الظاهرة الآن** — فالبطاقة التي تصل الجهاز
   * هي التي على الشاشة لا الحالة الأصليّة.
   *
   * **ومساران لا مسار**: على iOS **تنقّلٌ** إلى الرابط، وعلى غيره تنزيلُ blob. السبب
   * أنّ لوحة «Add to Apple Wallet» يفتحها سفاري حين يقرأ ترويسة
   * `application/vnd.apple.pkpass` في **استجابة تنقّل**؛ أمّا عنوان blob فلا ترويسة له
   * يقرؤها، فيهبط الملفّ في «الملفّات» ويُطلَب من المستخدم أن يجده بنفسه.
   */
  async function addToWallet() {
    const url = `/wallet-preview/pkpass?member=${memberId}&mode=${mode}`;
    if (isApple()) {
      window.location.href = url;
      return;
    }

    setBusy(true);
    setPassError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; missing?: MissingEnv[] } | null;
        setPassError({ message: body?.error ?? "تعذّر توليد البطاقة.", missing: body?.missing });
        return;
      }
      downloadBlob(await res.blob(), `${serial}.pkpass`, "بطاقة-أديب.pkpass");
    } catch {
      setPassError({ message: "تعذّر الاتّصال بالخادم لتوليد البطاقة." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-14">
      <Container>
        {/* رأسُ صفحات أديب العلنيّة نفسُه («الرأس المُذهّب») — عينٌ كلمة وعنوانٌ كلمتان */}
        <LandingHeading
          eyebrow="معاينة"
          title="بطاقة الولاء"
          deck={
            mode === "points"
              ? "بطاقةُ أديب في محفظة جوّالك، تكسب نقاطًا بكلّ مشاركة، وتصرفها على ما تختاره من المتجر."
              : "بطاقةُ أديب في محفظة جوّالك، تُختَم بكلّ مشاركة، وتُصرَف مكافأتُها عند الراعي."
          }
          align="center"
        />

        {/* **مُبدِّلُ النظامين** — أعلى الصفحة لأنّه أعمُّ ما فيها: يبدّل البطاقةَ ولوحَ
            التجربة والمكافأة معًا. والنظامان محاكاتان مستقلّتان لا حالتان لشيءٍ واحد. */}
        <div className="mb-6 flex justify-center">
          <Segmented
            aria-label="نظام البطاقة"
            value={mode}
            onValueChange={(v) => {
              setMode(v as Mode);
              setClaimed(false);
              setPassError(null);
              // خلاصةُ الدفع تخصّ بطاقةً بعينها — لا تُترَك معلّقةً فوق بطاقةٍ أخرى.
              setSync(null);
            }}
            items={[
              { value: "stamps", label: "نظام الأختام" },
              { value: "points", label: "نظام النقاط" },
            ]}
          />
        </div>

        <Alert tone="warning" title="هذه مُجرد معاينةٌ" icon={<Sparkle />} className="mb-8">
          الحسابات والمشاركات والراعي في هذه الصفحة <b>وهميّةٌ كلُّها</b> وليست حسابات ومعلومات
          حقيقية
        </Alert>

        <div className="mb-8 flex flex-wrap items-start gap-8">
          {/* ── البطاقة ── */}
          <div className="flex-[1_1_320px]">
            {/* عمودُ البطاقة كلُّه بعرضها: `.wp-stage` محدودٌ بـ340px ومركَّز، فالغلافُ يحاذيه
                فيمتدّ المبدّلُ فوقها والزرُّ تحتها على طولها لا أوسع. */}
            <div className="mx-auto max-w-[340px]">
              <Segmented
                className="wp-seg mb-4"
                aria-label="الحساب الوهميّ"
                value={memberId}
                onValueChange={(v) => {
                  setMemberId(v);
                  setClaimed(false);
                  setPassError(null);
                  // خلاصةُ الدفع تخصّ بطاقةً بعينها — لا تُترَك معلّقةً فوق بطاقةٍ أخرى.
                  setSync(null);
                }}
                items={MEMBERS.map((m) => ({ value: m.id, label: m.name.split(" ")[0] }))}
              />

              <WalletCard member={member} mode={mode} />

              <Button className="mt-4 w-full" onClick={addToWallet} loading={busy}>
                <Wallet />
                أضِف إلى Apple Wallet
              </Button>

              {passError ? (
                <Alert tone="danger" title="لم تخرج البطاقة" className="mt-4">
                  {passError.message}
                  {passError.missing?.length ? (
                    <ul className="mt-2 space-y-1">
                      {passError.missing.map((m) => (
                        <li key={m.name} className="text-xs">
                          <code className="font-latin">{m.name}</code>: {m.need}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Alert>
              ) : null}

              <p className="mt-3 text-center text-xs text-content-muted">
                هذه البطاقة كما يرسمها Apple Wallet، وسطحُها الصورةُ عينُها التي تدخل الملفّ.
                اضغط الدائرة أسفل البطاقة لترى ظهرها.
              </p>
            </div>
          </div>

          {/* ── التحكّم ── */}
          <div className="flex-[2_1_420px]">
            <Card className="mb-6">
              <CardHeader
                icon={<Plus />}
                title="تحكّمٌ للتجربة"
                subtitle={
                  mode === "points"
                    ? "اكسب نقاطًا يدويًّا لترى الرصيد يعلو، في النظام الحقيقيّ يكسبها الحضورُ والتنظيم"
                    : "اختم مشاركاتٍ يدويًّا لترى البطاقة تمتلئ، في النظام الحقيقيّ يختمها حضورُ الفعاليّة"
                }
                actions={
                  <Badge tone={mode === "points" ? (can.length > 0 ? "success" : "info") : done ? "success" : "info"}>
                    {/* كتلةٌ واحدةٌ لا ثلاث — الفاصلُ المحاطُ بمسافتين ينقلب في الجملة العربيّة */}
                    <span className="font-latin">{mode === "points" ? num(member.points) : score(member.stamps)}</span>
                  </Badge>
                }
              />
              <CardBody>
                {mode === "points" ? (
                  <>
                    {/* **زرٌّ لكلّ فعلٍ بقيمته** — وهو ما يُري الفرقَ عن الأختام في ضغطةٍ
                        واحدة: من نظّم يكسب ستّةَ أضعافِ من حضر اجتماعًا. */}
                    <div className="flex flex-wrap gap-3">
                      {EARN.map((e) => (
                        <Button key={e.key} size="sm" variant={e.key === "attend" ? "primary" : "ghost"} onClick={() => setPoints(member.points + e.points)}>
                          <Plus />
                          {e.label} <span className="font-latin">+{num(e.points)}</span>
                        </Button>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button size="sm" variant="ghost" onClick={() => setPoints(0)}>
                        <ArrowCounterClockwise />
                        صفّر الرصيد
                      </Button>
                      {next ? (
                        <Button size="sm" variant="ghost" onClick={() => setPoints(next.cost)}>
                          اقفز إلى <span className="font-latin">{num(next.cost)}</span>
                        </Button>
                      ) : null}
                    </div>

                    <p className="mt-4 text-xs text-content-muted">
                      {pointsStatusText(member.points)} · مكافآتٌ صرفها:{" "}
                      <span className="font-latin">{num(member.redemptions)}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <Button size="sm" onClick={() => setStamps(member.stamps + 1)} disabled={done}>
                        <Plus />
                        اختم مشاركة
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStamps(member.stamps - 1)} disabled={member.stamps === 0}>
                        <Minus />
                        تراجَع
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStamps(GOAL - 1)}>
                        اقفز إلى <span className="font-latin">{num(GOAL - 1)}</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStamps(0)}>
                        <ArrowCounterClockwise />
                        صفّر
                      </Button>
                    </div>

                    <p className="mt-4 text-xs text-content-muted">
                      {statusText(member.stamps)} · بطاقاتٌ أكملها:{" "}
                      <span className="font-latin">{num(member.cycles)}</span>
                    </p>
                  </>
                )}

                {/* حالةُ الدفع — الدفعةُ الصامتة لا تُرى، فتُقال. */}
                <p className="mt-2 flex items-center gap-2 text-xs">
                  <DeviceMobile size={14} className="shrink-0 text-content-muted" />
                  {syncing ? (
                    <span className="text-content-muted">تُرسَل الآن…</span>
                  ) : sync?.error ? (
                    <span className="text-danger">{sync.error}</span>
                  ) : sync ? (
                    sync.devices === 0 ? (
                      <span className="text-content-muted">
                        حُفظت، ولا جهازَ سجّل هذه البطاقة بعد. أضِفها إلى محفظتك ثمّ اختم.
                      </span>
                    ) : sync.failures.length > 0 ? (
                      <span className="text-danger">
                        وصلت <span className="font-latin">{num(sync.pushed)}</span> من{" "}
                        <span className="font-latin">{num(sync.devices)}</span>، أبل تقول:{" "}
                        {sync.failures[0].reason ?? sync.failures[0].status}
                      </span>
                    ) : (
                      <span className="text-success">
                        دُفعت إلى <span className="font-latin">{num(sync.pushed)}</span>{" "}
                        {sync.pushed === 1 ? "جهاز" : "أجهزة"}، تتحدّث البطاقة خلال ثوانٍ
                      </span>
                    )
                  ) : (
                    <span className="text-content-muted">
                      كلُّ ختمٍ يُحفَظ ويُدفَع إلى الأجهزة التي أضافت هذه البطاقة
                    </span>
                  )}
                </p>
              </CardBody>
            </Card>

            {/* ── المكافأة: واحدةٌ في الأختام، ومتجرٌ في النقاط ── */}
            {mode === "points" ? (
              <Card tone={can.length > 0 ? "success" : undefined} className="mb-6">
                <CardHeader
                  icon={<Storefront />}
                  title="متجر المكافآت"
                  subtitle="نقاطُك تُصرَف على ما تختاره، وما زاد عن الثمن يبقى لك"
                  actions={<Badge tone="info" size="sm">رعاةٌ وهميّون للعرض فقط</Badge>}
                />
                <CardBody>
                  <ul className="space-y-2">
                    {CATALOG.map((r) => {
                      const enough = member.points >= r.cost;
                      return (
                        <li
                          key={r.key}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-nested border border-line px-3 py-2"
                          data-enough={enough || undefined}
                        >
                          <div className="min-w-0">
                            <b className="block truncate">{r.title}</b>
                            <span className="text-xs text-content-muted">
                              <span className="font-latin">{num(r.cost)}</span> نقطة · {r.sponsor}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant={enough ? "success" : "ghost"}
                            disabled={!enough}
                            onClick={() => redeem(r.cost)}
                          >
                            <Gift />
                            {enough ? "اصرفها" : `ينقصك ${num(r.cost - member.points)}`}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>

                  {claimed ? (
                    <Alert tone="success" title="صُرفت المكافأة" compact className="mt-4">
                      خُصم ثمنُها وبقي ما زاد في رصيدك، ولا يبدأ صاحبُها من الصفر. وهذا هو
                      فرقُ النقاط عن الأختام.
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>
            ) : (
              <Card tone={done ? "success" : undefined} className="mb-6">
                <CardHeader
                  icon={<Storefront />}
                  title="مكافأة الراعي"
                  subtitle={REWARD.sponsor}
                  actions={<Badge tone="info" size="sm">راعٍ وهمي للعرض فقط</Badge>}
                />
                <CardBody>
                  <b className="block text-lg">{REWARD.title}</b>
                  <p className="mt-1 text-xs text-content-muted">{REWARD.terms}</p>

                  <div className="mt-4">
                    {claimed ? (
                      <Alert tone="success" title="استُلمت المكافأة" compact>
                        صُفِّر العدّاد وبدأت بطاقةٌ جديدة، وهذه هي الدورة التي تجعل الولاء يتكرّر.
                      </Alert>
                    ) : (
                      <Button variant={done ? "success" : "ghost"} disabled={!done} onClick={claim}>
                        <Gift />
                        {done ? "سلّم المكافأة وصفّر البطاقة" : `تُصرَف عند المشاركة ${num(GOAL)}`}
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
