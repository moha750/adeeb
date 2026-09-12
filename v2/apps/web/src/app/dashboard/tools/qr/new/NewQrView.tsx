"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, SectionCard, Switch } from "@adeeb/design-system";
import { Globe, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { QR_TITLE_MAX, SITE_ORIGIN, checkCode, checkTarget, newQrCode, qrShortUrl } from "@/lib/qrLinks";
import { PageHeader } from "../../../_components/PageHeader";
import { createQrLink, isQrCodeTaken } from "../actions";
import { defaultQrSpec } from "../defaults";

/**
 * **الخطوةُ الأولى: اسمٌ ورابط** (قرارُ المالك ٢٠٢٦-٠٨-٢٢).
 *
 * كان المحرّرُ هو ما يستقبلك، والاسمُ والرابطُ حقلين فيه بين الألوان والأشكال. فانقسم
 * البابُ خطوتين: **البيانات ثمّ الشكل**. وليست ترتيبًا أجمل وحسب، بل هي ما يجعل المعاينةَ
 * صادقة:
 *
 * الرمزُ القصيرُ يُولَد هنا، فيدخل المصمِّمُ على **رمزٍ حيٍّ يُمسح فيعمل**، وعددُ وحداته هو
 * عددُ وحدات المطبوع لا يزيد ولا ينقص مهما طالت الوجهة. وقبل هذا كانت المعاينةُ إمّا رمزًا
 * نائبًا لا وجهةَ له، وإمّا رمزًا يحمل الوجهةَ نفسَها فيكثُف بطولها ثمّ يتبدّل عند الحفظ.
 *
 * **والصفُّ يُنشأ هنا قبل أن يُصمَّم**: من كتب اسمًا ورابطًا ثمّ انصرف خلّف رمزًا بهيئته
 * الأولى في «رموزي»، يُحذف بيده كأيّ رمز.
 */
export function NewQrView() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  /**
   * **المثالُ رمزٌ حقيقيٌّ يُقرَع مرّةً واحدة**: `abc` نصٌّ لا يشبه ما سيقع، والقارعُ في كلّ
   * رسمةٍ يجعل السطرَ يرقص تحت الإصبع. فيُقرَع عند فتح الشاشة ويثبت.
   */
  const [sample] = useState(() => newQrCode());
  /** حالُ الفحص اللحظيّ: لا شيء · يُسأل · متاح · مأخوذ. */
  const [avail, setAvail] = useState<"idle" | "asking" | "free" | "taken">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = target.trim();
  // الحَكَمُ نفسُه الذي يحرس الخادم، فلا رسالتان لعيبٍ واحد
  const link = trimmed ? checkTarget(trimmed) : null;
  const linkError = link && !link.ok ? link.message : null;
  /**
   * **الرمزُ اختياريٌّ ويُختار مرّةً واحدة**: من تركه أخذ سبعةَ محارفَ مقروعة، ومن كتبه ملك
   * عنوانًا يُقرأ ويُملى (`‎/q/majles`). ولا يُبدَّل بعد اليوم: الرمزُ محفورٌ في كلّ ملصقٍ
   * يُطبَع، وتبديلُه يقتل ورقةً في الشارع — ولذلك لا يُعرَض في نافذة التعديل أصلًا.
   */
  const wanted = code.trim();
  const codeCheck = wanted ? checkCode(wanted) : null;
  const codeError = codeCheck && !codeCheck.ok ? codeCheck.message : null;
  const ready = !!title.trim() && !!link?.ok && !codeError && avail !== "taken";

  /**
   * **الفحصُ يسأل بعد سكون** (٢٠٢٦-٠٩-٠٥): كلُّ حرفٍ نداءٌ لو سُئل مع كلّ ضغطة، فتُنتظَر
   * أربعُ مئةِ ميلّي ثانيةٍ من الهدوء. والجوابُ يُلغى إن تبدّل الرمزُ قبل وصوله، فلا يقول
   * «متاح» عن رمزٍ لم يعد مكتوبًا (سباقُ الأجوبة).
   */
  useEffect(() => {
    if (!codeOpen || !wanted || codeError) { setAvail("idle"); return; }
    let alive = true;
    setAvail("asking");
    const t = setTimeout(async () => {
      const res = await isQrCodeTaken(wanted);
      if (!alive) return;
      setAvail(res.ok ? (res.taken ? "taken" : "free") : "idle");
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [wanted, codeError, codeOpen]);

  const start = async () => {
    if (!link?.ok) return;
    setBusy(true);
    setError(null);
    // الوصفةُ الأولى هيئةُ الهويّة، ونصُّها يكتبه الخادمُ رابطًا قصيرًا بعد توليد الرمز
    const res = await createQrLink({
      title,
      target: link.url,
      spec: defaultQrSpec(qrShortUrl("")),
      code: codeCheck?.ok ? codeCheck.code : undefined,
    });
    if (res.ok && res.id) {
      router.push(`/dashboard/tools/qr/${res.id}/design`);
      return;
    }
    setBusy(false);
    setError(res.message);
  };

  return (
    <>
      <PageHeader title="باركود جديد" crumbLeaf="باركود جديد" />

      <div className="card-grid mt-4">
        <SectionCard headerVariant="soft" icon={<QrCode />} title="اسمُ الباركود ووجهتُه">
          <Field
            label="اسم الباركود"
            icon={<TextAa />}
            innerIcon={<QrCode />}
            placeholder="اكتب اسم الباركود"
            value={title}
            onChange={(e) => { setTitle(e.target.value.slice(0, QR_TITLE_MAX)); setError(null); }}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
            required
          />

          <div className="mt-4">
            <Field
              label="وجهة الباركود"
              icon={<LinkSimple />}
              innerIcon={<Globe />}
              placeholder="https://adeeb.club"
              dir="ltr"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setError(null); }}
              error={linkError ?? undefined}
              helper="انسخ الرابط وألصقه هنا كاملًا."
              required
            />
          </div>

          {/**
            * **الرمزُ المختارُ خلف مبدّل** (المالك ٢٠٢٦-٠٩-٠٥): حالتُه نادرةٌ (ما يُقال
            * بالصوت، وما يُلصَق نصًّا، والرابطُ المكتوبُ تحت الملصق)، وحقلٌ ثالثٌ دائمٌ لأجلها
            * يزحم شاشةَ الإنشاء. وجُرّب زرًّا مفرَّغًا يُنقر فرآه المالك غيرَ جميل: زرٌّ وحيدٌ
            * عريضٌ في نموذجٍ حقولُه صفوفٌ نشاز. والمبدّلُ **من جنس النموذج**: صفٌّ له تسميةٌ
            * وشرحٌ كسائر صفوفه، وحالُه ظاهرةٌ بلا نقرة.
            */}
          <div className="mt-4">
            <Switch
              row
              label="رمز مخصّص للرابط"
              description="عنوانٌ مُخصص بدل حروفٍ عشوائيّة."
              checked={codeOpen}
              onChange={(e) => { setCodeOpen(e.target.checked); if (!e.target.checked) setCode(""); }}
            />
          </div>

          {codeOpen ? (
            <div className="mt-3">
              <Field
                label="رمز الرابط"
                icon={<LinkSimple />}
                innerIcon={<Globe />}
                placeholder="adeeb"
                dir="ltr"
                charset="latin"
                optional
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(null); }}
                error={codeError ?? (avail === "taken" ? "هذا الرمزُ مأخوذٌ لباركودٍ آخر. اختر غيرَه." : undefined)}
                success={avail === "free"}
                helper="اتركه فارغًا فتوضع حروفٌ عشوائيّة. ولا يُبدَّل بعد الإنشاء."
              />
              {/* **العنوانُ يتبدّل تحت إصبعه**: من يكتب رمزًا لا يقرأ قاعدةً، يرى رابطَه يُبنى
                  حرفًا حرفًا فيفهم ما الذي يغيّره. ولوحُه متوسّطٌ على سطحٍ خافتٍ بحدٍّ من
                  مفردات الكروت، فيُقرأ لوحةَ عرضٍ لا هامشَ تلميح. وحالُ الفحص شارةٌ بجانبه:
                  «متاح» أو «مأخوذ»، فالخبرُ حيث ينظر لا في زاويةٍ أخرى. */}
              <div className={`qcplate mt-3${avail === "free" ? " is-free" : avail === "taken" ? " is-taken" : ""}`}>
                {/* الإطارُ عنصرٌ لا خاصّيّة: الحدُّ المقطَّع لا يدور مع الزاوية، والـ`svg` يدور. */}
                <svg className="qcplate-frame" aria-hidden><rect /></svg>
                <span className="fld-help">عنوانُ الباركود يظهر</span>
                <bdi className="qcplate-url" dir="ltr">
                  {`${SITE_ORIGIN.replace(/^https?:\/\//, "")}/q/${codeCheck?.ok ? codeCheck.code : wanted || sample}`}
                </bdi>
                {avail === "free" ? <Badge tone="success" size="sm">الرمزُ متاح</Badge> : null}
                {avail === "taken" ? <Badge tone="danger" size="sm">الرمزُ مأخوذ</Badge> : null}
                {avail === "asking" ? <span className="fld-help">يُفحَص…</span> : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4">
              <Alert tone="danger" title="تعذّر إنشاء الباركود">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="md" disabled={!ready} loading={busy} onClick={() => void start()}>
              ابدأ بتصميم الباركود <ArrowLeft size={18} />
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
