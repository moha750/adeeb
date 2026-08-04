"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container, LandingHeading, Segmented } from "@adeeb/design-system";
import {
  ArrowCounterClockwise,
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
import { GOAL, isComplete, MEMBERS, memberById, num, REWARD, score, statusText, type DemoMember } from "./demo";
import { cardFace, type PassField } from "./pass";
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

/** رابطُ سطح البطاقة — دالّةٌ في عدد الأختام لا غير، فلا يكذب رابطُه (`strip/route.ts`). */
const stripUrl = (stamps: number): string => `/wallet-preview/strip?stamps=${stamps}`;

/**
 * سطحُ البطاقة **بلا وميضٍ عند الختم**: العدّادُ يتغيّر فورًا، والصورةُ لا تُبدَّل حتى
 * تكتمل الجديدةُ في الذاكرة — وإلّا ومض إطارٌ فارغٌ مكان السطح في كلّ ضغطة.
 *
 * وتسبق إلى الجارَين (`±1`) فيصير الختمُ التالي والتراجعُ بلا انتظارٍ أصلًا؛ والردُّ
 * خالدُ التخزين، فلا يُطلَب مقاسٌ مرّتين.
 */
function useStrip(stamps: number): string {
  const [shown, setShown] = useState(stamps);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = stripUrl(stamps);
    const settle = () => {
      if (alive) setShown(stamps);
    };
    // `decode` يفشل على صورةٍ لم تُحمَّل — والفشلُ يعرض القديمَ لا فراغًا، فيُعامَل معاملتَه.
    void img.decode().then(settle, settle);

    for (const n of [stamps - 1, stamps + 1]) {
      if (n >= 0 && n <= GOAL) new Image().src = stripUrl(n);
    }

    return () => {
      alive = false;
    };
  }, [stamps]);

  return stripUrl(shown);
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
function WalletCard({ member }: { member: DemoMember }) {
  const [back, setBack] = useState(false);
  const face = cardFace(member);
  const strip = useStrip(member.stamps);

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
          <img className="wp-strip" src={strip} alt={`${num(member.stamps)} من ${num(GOAL)} مشاركات`} />

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
  const live = cards[base.serial] ?? { stamps: base.stamps, cycles: base.cycles, updatedAt: "" };
  const member = { ...base, stamps: live.stamps, cycles: live.cycles };
  const done = isComplete(member.stamps);

  /**
   * يكتب الحالة في القاعدة ثمّ يدفع نبضةً إلى الأجهزة المسجَّلة — **وهو ما يجعل البطاقة
   * في الجيب تتغيّر**. وجوابُه يُدمَج كما يُدمَج جوابُ المتابعة: الأحدثُ يفوز.
   */
  async function syncNow(stamps: number, cycles: number) {
    setSyncing(true);
    try {
      const res = await fetch("/wallet-preview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: memberId, stamps, cycles }),
      });
      const body = (await res.json()) as SyncState & { error?: string; serial?: string; updatedAt?: string };
      if (res.ok) {
        setSync({ devices: body.devices, pushed: body.pushed, failures: body.failures ?? [] });
        if (body.serial && body.updatedAt) {
          merge({ [body.serial]: { stamps, cycles, updatedAt: body.updatedAt } });
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
   * يضبط الأختام في المدى — كلّ أزرار التجربة تمرّ به فلا تخرج قيمةٌ عن حدّها.
   *
   * **ويُقدَّم الفعلُ على الشبكة**: تُرسَم الحالة الجديدة فورًا بزمنٍ محلّيّ، فلا تتلكّأ
   * الضغطةُ ريثما يردّ الخادم. وجوابُه بعد حين يحمل زمنَه الحقيقيّ فيحلّ محلّه.
   */
  function setStamps(next: number) {
    const stamps = Math.min(GOAL, Math.max(0, next));
    setClaimed(false);
    merge({ [base.serial]: { stamps, cycles: live.cycles, updatedAt: new Date().toISOString() } });
    void syncNow(stamps, live.cycles);
  }

  /** استلامُ المكافأة: **يصفّر العدّاد** ويزيد عدّاد البطاقات المكتملة. */
  function claim() {
    const cycles = live.cycles + 1;
    setClaimed(true);
    merge({ [base.serial]: { stamps: 0, cycles, updatedAt: new Date().toISOString() } });
    void syncNow(0, cycles);
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
        {/* رأسُ صفحات أديب العلنيّة نفسُه («الرأس المُذهّب») — عينٌ كلمة وعنوانٌ كلمتان */}
        <LandingHeading
          eyebrow="معاينة"
          title="بطاقة الولاء"
          deck="بطاقةُ أديب في محفظة جوّالك، تُختَم بكلّ مشاركة، وتُصرَف مكافأتُها عند الراعي."
          align="center"
        />

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

              <WalletCard member={member} />

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
                          <code className="font-latin">{m.name}</code> — {m.need}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Alert>
              ) : null}

              <p className="mt-3 text-center text-xs text-content-muted">
                هذه البطاقة كما يرسمها Apple Wallet — وسطحُها الصورةُ عينُها التي تدخل الملفّ.
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
                subtitle="اختم مشاركاتٍ يدويًّا لترى البطاقة تمتلئ — في النظام الحقيقيّ يختمها حضورُ الفعاليّة"
                actions={
                  <Badge tone={done ? "success" : "info"}>
                    {/* كتلةٌ واحدةٌ لا ثلاث — الفاصلُ المحاطُ بمسافتين ينقلب في الجملة العربيّة */}
                    <span className="font-latin">{score(member.stamps)}</span>
                  </Badge>
                }
              />
              <CardBody>
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
                        حُفظت — ولا جهازَ سجّل هذه البطاقة بعد. أضِفها إلى محفظتك ثمّ اختم.
                      </span>
                    ) : sync.failures.length > 0 ? (
                      <span className="text-danger">
                        وصلت <span className="font-latin">{num(sync.pushed)}</span> من{" "}
                        <span className="font-latin">{num(sync.devices)}</span> — أبل تقول:{" "}
                        {sync.failures[0].reason ?? sync.failures[0].status}
                      </span>
                    ) : (
                      <span className="text-success">
                        دُفعت إلى <span className="font-latin">{num(sync.pushed)}</span>{" "}
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
                      صُفِّر العدّاد وبدأت بطاقةٌ جديدة — وهذه هي الدورة التي تجعل الولاء يتكرّر.
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
          </div>
        </div>
      </Container>
    </main>
  );
}
