"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container, SectionHeading, Segmented } from "@adeeb/design-system";
import {
  ArrowCounterClockwise,
  Check,
  DeviceMobile,
  Gift,
  Info,
  Minus,
  Plus,
  Sparkle,
  Storefront,
  Wallet,
} from "@phosphor-icons/react";
import { downloadBlob } from "@/lib/download";
import { qrSvg } from "@/lib/qr";
import { arNum, GOAL, isComplete, MEMBERS, memberById, REWARD, statusText, type DemoMember } from "./demo";
import { cardFace, type PassField } from "./pass";
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
 * الأختام العشرة — نظيرُ `strip.png` الذي يُولَّد للمحفظة، بالتخطيط نفسه (صفّان).
 * قيمتُهما واحدة (`stamps`)، والفرق في الوسيط لا في البيانات.
 */
function Stamps({ filled }: { filled: number }) {
  return (
    <div className="wp-stamps" role="img" aria-label={`${arNum(filled)} من ${arNum(GOAL)} مشاركات`}>
      {Array.from({ length: GOAL }, (_, i) => (
        <span key={i} className="wp-stamp" data-on={i < filled} data-last={i === GOAL - 1} aria-hidden>
          <Check size={14} weight="bold" />
        </span>
      ))}
    </div>
  );
}

/**
 * البطاقة كما يعرضها Apple Wallet — **من `cardFace()` نفسِه** الذي يكتب `pass.json`.
 * فما يُرى هنا هو ما يصل الجهاز، لا محاكاةٌ تُشبهه (انظر رأس `pass.ts`).
 */
function WalletCard({ member }: { member: DemoMember }) {
  const [back, setBack] = useState(false);
  /**
   * تلألؤُ السطح — **صنفٌ يُشعله المرور وتُطفئه النهاية**، لا `:hover` في الورقة: خروجُ
   * المؤشّر وسطَ العبور يبتر الشريطَ فيختفي فجأةً في منتصف البطاقة (انظر `card.css`).
   */
  const [sheen, setSheen] = useState(false);
  const face = cardFace(member);
  const done = isComplete(member.stamps);

  // الرمز يُبنى مرّةً لكلّ حمولة — بناؤه ليس رخيصًا ويُعاد الرسم عند كلّ ختم.
  const qr = useMemo(
    () =>
      qrSvg({
        text: face.barcode,
        size: 108,
        dots: { shape: "fluid", paint: { kind: "solid", color: "var(--navy-800)" } },
        eye: { shape: "rounded", color: null },
        pupil: { shape: "rounded", color: null },
        bg: null,
      }),
    [face.barcode],
  );

  return (
    <div className="wp-stage">
      <div
        className={sheen ? "wp-flip is-sheen" : "wp-flip"}
        data-face={back ? "back" : "front"}
        onMouseEnter={() => setSheen(true)}
        onAnimationEnd={(e) => {
          // القلبُ نفسُه لا يُحرَّك بـ`animation`، لكن نبضةَ الختم الأخير تصعد إلى هنا —
          // فلا يُطفَأ التلألؤ إلّا بنهايته هو.
          if (e.animationName.startsWith("wp-sheen")) setSheen(false);
        }}
      >
        <button
          type="button"
          className="wp-turn"
          onClick={() => setBack((b) => !b)}
          aria-label={back ? "عرض وجه البطاقة" : "عرض ظهر البطاقة"}
        >
          {back ? <ArrowCounterClockwise size={15} weight="bold" /> : <Info size={15} weight="bold" />}
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

          <Stamps filled={member.stamps} />

          {done ? (
            <div className="wp-ready">
              <Gift size={16} weight="fill" />
              مكافأتك جاهزة — {REWARD.title}
            </div>
          ) : null}

          <div className="wp-row">
            {face.secondaryFields.map((f) => (
              <Fld key={f.key} f={f} />
            ))}
          </div>

          <div className="wp-row">
            {face.auxiliaryFields.map((f) => (
              <Fld key={f.key} f={f} />
            ))}
          </div>

          {/* الرمز يُحقَن نصًّا: الـSVG داخل المستند فتُحَلّ فيه `var(--…)` من الرموز */}
          <div className="wp-code" dangerouslySetInnerHTML={{ __html: qr }} />
          <span className="wp-alt">{member.serial}</span>
        </div>

        <div className="wp-side wp-side--back" aria-hidden={!back}>
          <span className="wp-back-h">ظهر البطاقة</span>
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

export function WalletPreview({ initial }: { initial: Record<string, { stamps: number; cycles: number }> }) {
  const [memberId, setMemberId] = useState(MEMBERS[0].id);
  /**
   * حالةُ التجربة لكلّ حساب — **مبدوءةٌ بما في القاعدة** لا بقيم `demo.ts`: البطاقة في
   * الجوّال تقرأ من القاعدة، فلو بدأت الشاشةُ من البذرة لَاختلف الاثنان.
   */
  const [state, setState] = useState<Record<string, { stamps: number; cycles: number }>>(() =>
    Object.fromEntries(MEMBERS.map((m) => [m.id, initial[m.serial] ?? { stamps: m.stamps, cycles: m.cycles }])),
  );
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [passError, setPassError] = useState<{ message: string; missing?: MissingEnv[] } | null>(null);

  const member = { ...memberById(memberId), ...state[memberId] };
  const done = isComplete(member.stamps);

  /**
   * يكتب الحالة في القاعدة ثمّ يدفع نبضةً إلى الأجهزة المسجَّلة — **وهو ما يجعل البطاقة
   * في الجيب تتغيّر**. يُنادى بعد كلّ تغييرٍ محلّيّ، والشاشةُ لا تنتظره فتبقى فوريّة.
   */
  async function syncNow(id: string, stamps: number, cycles: number) {
    setSyncing(true);
    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: id, stamps, cycles }),
      });
      const body = (await res.json()) as SyncState & { error?: string };
      setSync(
        res.ok
          ? { devices: body.devices, pushed: body.pushed, failures: body.failures ?? [] }
          : { devices: 0, pushed: 0, failures: [], error: body.error ?? "تعذّرت المزامنة." },
      );
    } catch {
      setSync({ devices: 0, pushed: 0, failures: [], error: "تعذّر الاتّصال بالخادم." });
    } finally {
      setSyncing(false);
    }
  }

  /** يضبط الأختام في المدى — كلّ أزرار التجربة تمرّ به فلا تخرج قيمةٌ عن حدّها. */
  function setStamps(next: number) {
    const stamps = Math.min(GOAL, Math.max(0, next));
    setClaimed(false);
    setState((s) => ({ ...s, [memberId]: { ...s[memberId], stamps } }));
    void syncNow(memberId, stamps, state[memberId].cycles);
  }

  /** استلامُ المكافأة: **يصفّر العدّاد** ويزيد عدّاد البطاقات المكتملة. */
  function claim() {
    const cycles = state[memberId].cycles + 1;
    setState((s) => ({ ...s, [memberId]: { stamps: 0, cycles } }));
    setClaimed(true);
    void syncNow(memberId, 0, cycles);
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
    const url = `/wallet-preview/pkpass?member=${memberId}&stamps=${member.stamps}`;
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
      downloadBlob(await res.blob(), `${member.serial}.pkpass`, "بطاقة-أديب.pkpass");
    } catch {
      setPassError({ message: "تعذّر الاتّصال بالخادم لتوليد البطاقة." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-14">
      <Container>
        <SectionHeading eyebrow="معاينة" title="بطاقة ولاء أَدِيب" />

        <Alert tone="warning" title="هذه معاينةٌ لا نظامٌ حيّ" icon={<Sparkle weight="fill" />} className="mb-8">
          الحسابات والمشاركات والراعي في هذه الصفحة <b>وهميّةٌ كلُّها</b> — لا تمسّ عضويّةً ولا
          سجلًّا في النادي، وتعيش في جدولين مؤقّتين يُحذفان مع الصفحة. غايتُها أن تُجرَّب البطاقة
          وتُعرَض الفكرة قبل بنائها.
        </Alert>

        <div className="mb-8">
          <Segmented
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
        </div>

        <div className="mb-8 flex flex-wrap items-start gap-8">
          {/* ── البطاقة ── */}
          <div className="flex-[1_1_320px]">
            <WalletCard member={member} />
            <p className="mt-3 text-center text-xs text-content-muted">اضغط الدائرة أسفل البطاقة لترى ظهرها</p>
          </div>

          {/* ── التحكّم ── */}
          <div className="flex-[2_1_420px]">
            <Card className="mb-6">
              <CardHeader
                icon={<Plus weight="bold" />}
                title="تحكّمٌ للتجربة"
                subtitle="اختم مشاركاتٍ يدويًّا لترى البطاقة تمتلئ — في النظام الحقيقيّ يختمها حضورُ الفعاليّة"
                actions={
                  <Badge tone={done ? "success" : "info"}>
                    <span className="font-latin">{arNum(member.stamps)}</span> / <span className="font-latin">{arNum(GOAL)}</span>
                  </Badge>
                }
              />
              <CardBody>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" onClick={() => setStamps(member.stamps + 1)} disabled={done}>
                    <Plus weight="bold" />
                    اختم مشاركة
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStamps(member.stamps - 1)} disabled={member.stamps === 0}>
                    <Minus weight="bold" />
                    تراجَع
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStamps(GOAL - 1)}>
                    اقفز إلى <span className="font-latin">{arNum(GOAL - 1)}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStamps(0)}>
                    <ArrowCounterClockwise weight="bold" />
                    صفّر
                  </Button>
                </div>

                <p className="mt-4 text-xs text-content-muted">
                  {statusText(member.stamps)} · بطاقاتٌ أكملها:{" "}
                  <span className="font-latin">{arNum(member.cycles)}</span>
                </p>

                {/* حالةُ الدفع — الدفعةُ الصامتة لا تُرى، فتُقال. */}
                <p className="mt-2 flex items-center gap-2 text-xs">
                  <DeviceMobile size={14} weight="fill" className="shrink-0 text-content-muted" />
                  {syncing ? (
                    <span className="text-content-muted">تُرسَل الآن…</span>
                  ) : sync?.error ? (
                    <span className="text-danger">{sync.error}</span>
                  ) : sync ? (
                    sync.devices === 0 ? (
                      <span className="text-content-muted">
                        حُفظت — ولا جهازَ سجّل هذه البطاقة بعد. أضِفها إلى محفظتك ثمّ اختم.
                      </span>
                    ) : sync.failures.length > 0 ? (
                      <span className="text-danger">
                        وصلت <span className="font-latin">{arNum(sync.pushed)}</span> من{" "}
                        <span className="font-latin">{arNum(sync.devices)}</span> — أبل تقول:{" "}
                        {sync.failures[0].reason ?? sync.failures[0].status}
                      </span>
                    ) : (
                      <span className="text-success">
                        دُفعت إلى <span className="font-latin">{arNum(sync.pushed)}</span>{" "}
                        {sync.pushed === 1 ? "جهاز" : "أجهزة"} — تتحدّث البطاقة خلال ثوانٍ
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

            {/* ── المكافأة ── */}
            <Card tone={done ? "success" : undefined} className="mb-6">
              <CardHeader
                icon={<Storefront weight="fill" />}
                title="مكافأة الراعي"
                subtitle={REWARD.sponsor}
                actions={<Badge tone="info" size="sm">راعٍ مُختلَقٌ للعرض</Badge>}
              />
              <CardBody>
                <b className="block text-lg">{REWARD.title}</b>
                <p className="mt-1 text-xs text-content-muted">{REWARD.terms}</p>

                <div className="mt-4">
                  {claimed ? (
                    <Alert tone="success" title="استُلمت المكافأة" compact>
                      صُفِّر العدّاد وبدأت بطاقةٌ جديدة — وهذه هي الدورة التي تجعل الولاء يتكرّر.
                    </Alert>
                  ) : (
                    <Button variant={done ? "success" : "ghost"} disabled={!done} onClick={claim}>
                      <Gift weight="fill" />
                      {done ? "سلّم المكافأة وصفّر البطاقة" : `تُصرَف عند المشاركة ${arNum(GOAL)}`}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={addToWallet} loading={busy}>
                <Wallet weight="fill" />
                أضِف إلى Apple Wallet
              </Button>
            </div>

            {passError ? (
              <Alert tone="danger" title="لم تخرج البطاقة" className="mt-4">
                {passError.message}
                {passError.missing?.length ? (
                  <ul className="mt-2 space-y-1">
                    {passError.missing.map((m) => (
                      <li key={m.name} className="text-xs">
                        <code className="font-latin">{m.name}</code> — {m.need}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Alert>
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
