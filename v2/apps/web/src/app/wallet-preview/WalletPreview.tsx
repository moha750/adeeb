"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container, SectionHeading, Segmented, Stat } from "@adeeb/design-system";
import {
  ArrowsClockwise,
  ArrowUUpLeft,
  CheckCircle,
  Info,
  Lock,
  Medal,
  Sparkle,
  Storefront,
  Ticket,
  Trophy,
  Wallet,
} from "@phosphor-icons/react";
import { downloadBlob } from "@/lib/download";
import { qrSvg } from "@/lib/qr";
import { arDate, arNum, MEMBERS, memberById, nextTier, OFFERS, TIERS, tierOf, tierUnlocks, type Offer } from "./demo";
import { cardFace, type PassField } from "./pass";
import "./card.css";

/* ── أجزاء البطاقة ─────────────────────────────────────────────────────── */

/** حقلٌ واحد — تسميةٌ فوق قيمة، كما ترسمه أبل. */
function Fld({ f, kind }: { f: PassField; kind?: "head" | "primary" }) {
  return (
    <div className={kind ? `wp-fld--${kind}` : undefined}>
      {f.label ? <span className="wp-lab">{f.label}</span> : null}
      <span className="wp-val">{f.value}</span>
    </div>
  );
}

/**
 * البطاقة كما يعرضها Apple Wallet — **من `cardFace()` نفسِه** الذي يكتب `pass.json`.
 * فما يُرى هنا هو ما يصل الجهاز، لا محاكاةٌ تُشبهه (انظر رأس `pass.ts`).
 */
function WalletCard({ face }: { face: ReturnType<typeof cardFace> }) {
  const [back, setBack] = useState(false);

  // الرمز يُبنى مرّةً لكلّ حمولة — بناؤه ليس رخيصًا ويُعاد الرسم عند كلّ استبدال نقاط.
  const qr = useMemo(
    () =>
      qrSvg({
        text: face.barcode,
        size: 116,
        dots: { shape: "fluid", paint: { kind: "solid", color: "var(--navy-800)" } },
        eye: { shape: "rounded", color: null },
        pupil: { shape: "rounded", color: null },
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
          {back ? <ArrowUUpLeft size={15} weight="bold" /> : <Info size={15} weight="bold" />}
        </button>

        <div className="wp-side" aria-hidden={back}>
          <div className="wp-head">
            <span className="wp-logo">{face.logoText}</span>
            {face.headerFields.map((f) => (
              <Fld key={f.key} f={f} kind="head" />
            ))}
          </div>

          {face.primaryFields.map((f) => (
            <Fld key={f.key} f={f} kind="primary" />
          ))}

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
          <span className="wp-alt">{face.backFields.find((f) => f.key === "serial")?.value}</span>
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

export function WalletPreview() {
  const [memberId, setMemberId] = useState(MEMBERS[0].id);
  /** ما استُبدل في هذه الجلسة — بمعرّف العضو، فلا يتسرّب رصيدٌ بين الحسابات. */
  const [redeemed, setRedeemed] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [passError, setPassError] = useState<{ message: string; missing?: MissingEnv[] } | null>(null);

  const member = memberById(memberId);
  const mine = redeemed[memberId] ?? [];
  const spent = OFFERS.filter((o) => mine.includes(o.id)).reduce((s, o) => s + o.cost, 0);

  // الرصيد الحيّ = المرصود ناقص المستبدَل. البطاقة تُبنى منه، فتتغيّر الرتبةُ أمام العين.
  const live = { ...member, points: member.points - spent };
  const face = cardFace(live);
  const tier = tierOf(live.points);
  const next = nextTier(live.points);

  /** نسبةُ التقدّم داخل الرتبة الحاليّة — ١٠٠٪ عند القمّة. */
  const progress = next
    ? Math.round(((live.points - tier.from) / (next.tier.from - tier.from)) * 100)
    : 100;

  function redeem(o: Offer) {
    setRedeemed((r) => ({ ...r, [memberId]: [...(r[memberId] ?? []), o.id] }));
  }

  /**
   * تنزيل الحزمة الموقَّعة. **والخطأ يُعرَض كما قاله الخادم** — إن نقصت شهادةٌ ظهر
   * اسمُ المتغيّر الناقص بعينه، فلا يضيع الوقت في تخمين سبب صمت الجهاز.
   *
   * **ومساران لا مسار**: على iOS **تنقّلٌ** إلى الرابط، وعلى غيره تنزيلُ blob.
   * السبب أنّ لوحة «Add to Apple Wallet» يفتحها سفاري حين يقرأ ترويسة
   * `application/vnd.apple.pkpass` في **استجابة تنقّل**؛ أمّا عنوان blob فلا ترويسة
   * له يقرؤها، فيهبط الملفّ في «الملفّات» ويُطلَب من المستخدم أن يجده بنفسه — وهذا
   * يقتل العرض في اللحظة التي يُفترض أن يُبهر فيها.
   */
  async function addToWallet() {
    const url = `/wallet-preview/pkpass?member=${member.id}`;
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

        <Alert
          tone="warning"
          title="هذه معاينةٌ لا نظامٌ حيّ"
          icon={<Sparkle weight="fill" />}
          className="mb-8"
        >
          الحسابات والنقاط وعروض الرعاة في هذه الصفحة <b>وهميّةٌ كلُّها</b> — لا صفَّ منها في قاعدة
          البيانات ولا اتّصال بها. غايتُها أن تُجرَّب البطاقة وتُعرَض الفكرة قبل بنائها، ثمّ تُحذف
          الصفحةُ بمجلّدها.
        </Alert>

        {/* ── الحساب الوهميّ ── */}
        <div className="mb-8">
          <Segmented
            aria-label="الحساب الوهميّ"
            value={memberId}
            onValueChange={(v) => {
              setMemberId(v);
              setPassError(null);
            }}
            items={MEMBERS.map((m) => ({ value: m.id, label: m.name.split(" ")[0] }))}
          />
        </div>

        <div className="mb-10 flex flex-wrap items-start gap-8">
          {/* ── البطاقة ── */}
          <div className="flex-[1_1_320px]">
            <WalletCard face={face} />
            <p className="mt-3 text-center text-xs text-content-muted">اضغط الدائرة أعلى البطاقة لترى ظهرها</p>
          </div>

          {/* ── حالة الرصيد ── */}
          <div className="flex-[2_1_420px]">
            <div className="stat-grid mb-6">
              <Stat icon={<Trophy weight="fill" />} value={arNum(live.points)} label="الرصيد الحاليّ" />
              <Stat icon={<Medal weight="fill" />} value={tier.name} label="الرتبة" tone="warning" />
              <Stat
                icon={<Ticket weight="fill" />}
                value={arNum(mine.length)}
                label="عروضٌ استُبدلت"
                tone="success"
              />
            </div>

            <Card className="mb-6">
              <CardBody>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <b className="text-sm">{next ? `إلى رتبة «${next.tier.name}»` : "بلغَ قمّة السلّم"}</b>
                  <span className="text-xs text-content-muted">
                    {next ? `${arNum(next.remaining)} نقطة` : tier.perk}
                  </span>
                </div>
                <div className="wp-meter">
                  <i style={{ width: `${progress}%` }} />
                </div>
              </CardBody>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={addToWallet} loading={busy}>
                <Wallet weight="fill" />
                أضِف إلى Apple Wallet
              </Button>
              {mine.length > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setRedeemed((r) => ({ ...r, [memberId]: [] }))}
                >
                  <ArrowsClockwise weight="bold" />
                  أعِد الرصيد
                </Button>
              ) : null}
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

        {/* ── سلّم الرتب ── */}
        <Card className="mb-8">
          <CardHeader
            icon={<Medal weight="fill" />}
            title="سلّم الرتب"
            subtitle="الرتبة تُشتقّ من الرصيد ولا تُمنَح — فلا يُسأل أحدٌ عن ترقيةِ أحد"
          />
          <CardBody>
            <div className="card-grid">
              {TIERS.map((t) => {
                const at = t.key === tier.key;
                return (
                  <Card key={t.key} tone={at ? "warning" : undefined}>
                    <CardBody>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <b className="font-display text-lg">{t.name}</b>
                        {at ? <Badge tone="warning" variant="solid" size="sm">رتبتُه الآن</Badge> : null}
                      </div>
                      <p className="font-latin text-xs text-content-muted">{arNum(t.from)} نقطة فأكثر</p>
                      <p className="mt-2 text-sm">{t.perk}</p>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* ── عروض الرعاة ── */}
        <Card className="mb-8">
          <CardHeader
            icon={<Storefront weight="fill" />}
            title="عروض الرعاة"
            subtitle="ما يُستبدَل بالنقاط — وهو ما يُعرَض على الراعي: جمهورٌ مُقاسٌ يصله عرضُه"
            actions={<Badge tone="info" size="sm">رعاةٌ مُختلَقون للعرض</Badge>}
          />
          <CardBody>
            <div className="card-grid">
              {OFFERS.map((o) => {
                const done = mine.includes(o.id);
                const unlocked = tierUnlocks(live.points, o);
                const affordable = live.points >= o.cost;
                const need = TIERS.find((t) => t.key === o.minTier)!;

                return (
                  <Card key={o.id} tone={done ? "success" : undefined}>
                    <CardBody>
                      <p className="text-xs text-content-muted">{o.sponsor}</p>
                      <b className="mt-1 block text-base">{o.title}</b>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge tone="info" size="sm">
                          <span className="font-latin">{arNum(o.cost)}</span> نقطة
                        </Badge>
                        <Badge tone="neutral" variant="outline" size="sm">
                          {need.name} فأعلى
                        </Badge>
                        <Badge tone="neutral" variant="outline" size="sm">
                          بقي <span className="font-latin">{arNum(o.left)}</span>
                        </Badge>
                      </div>

                      <div className="mt-4">
                        {done ? (
                          <Badge tone="success" variant="solid" icon={<CheckCircle weight="fill" />}>
                            استُبدل
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={unlocked && affordable ? "primary" : "ghost"}
                            disabled={!unlocked || !affordable}
                            onClick={() => redeem(o)}
                          >
                            {unlocked && affordable ? null : <Lock weight="fill" />}
                            {!unlocked
                              ? `يفتحه «${need.name}»`
                              : !affordable
                                ? `ينقصه ${arNum(o.cost - live.points)} نقطة`
                                : "استبدِل"}
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* ── الإنجازات ── */}
        <Card className="mb-8">
          <CardHeader
            icon={<Sparkle weight="fill" />}
            title="الإنجازات المرصودة"
            subtitle="تُرصَد يدويًّا باسم من رصدها — فلكلّ نقطةٍ سببٌ مكتوبٌ ومسؤولٌ عنه"
          />
          <CardBody>
            <ul className="space-y-3">
              {member.achievements.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <b className="block text-sm">{a.label}</b>
                    <span className="text-xs text-content-muted">
                      {arDate(a.date)} · رصدها {a.by}
                    </span>
                  </div>
                  <Badge tone="success" size="sm">
                    +<span className="font-latin">{arNum(a.points)}</span>
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-content-muted">
              المجموع المرصود <span className="font-latin">{arNum(member.points)}</span> نقطة
              {spent > 0 ? (
                <>
                  {" "}— استُبدل منها <span className="font-latin">{arNum(spent)}</span>
                </>
              ) : null}
            </p>
          </CardBody>
        </Card>

        <Alert tone="info" title="ما يلزم لتصير البطاقة حقيقيّةً على جهازك" icon={<Wallet weight="fill" />}>
          الصفحة تولّد ملفّ <code className="font-latin">.pkpass</code> موقَّعًا فعلًا — ينقصها من حساب
          مطوّر أبل <b>شهادةُ Pass Type ID</b> ومفتاحُها وشهادةُ أبل الوسيطة (WWDR). اضغط «أضِف إلى
          Apple Wallet» فيقول لك الخادمُ أيّ متغيّرٍ ينقص بالاسم. وشهادةُ المطوّر التي بيدك <b>غيرُ</b>
          شهادة نوع البطاقة — تُنشَأ الثانيةُ من الحساب نفسه بضغطات.
        </Alert>
      </Container>
    </main>
  );
}
