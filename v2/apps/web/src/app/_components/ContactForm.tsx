"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Textarea, Card, CardBody } from "@adeeb/design-system";
import { At, ChatText, Envelope, TextT, User } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { sendContactMessage } from "@/app/_components/contact-actions";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";

type FormState = "idle" | "submitting" | "success" | "error";

// مفتاح Turnstile العامّ — يُدمَج وقت البناء (NEXT_PUBLIC). غيابه (تجربةٌ محليّة بلا إعداد) يُسقط الدرع بلا كسر.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  // درع Turnstile — الرمز الحيّ وإشارة إعادة الضبط (الرمز يُستهلك مرّة، فيُجدَّد بعد فشل)
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const shieldOn = !!TURNSTILE_SITE_KEY;
  /** رايةُ الصيغة تُرفع عند مغادرة الحقل أو عند الإرسال — لا وهو يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set =
    (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg("يرجى تعبئة الاسم والبريد والرسالة.");
      setState("error");
      return;
    }
    if (!isEmail(form.email)) {
      setEmailTouched(true);
      setErrorMsg(`${EMAIL_HINT}.`);
      setState("error");
      return;
    }
    // درع Turnstile: لا نُرسل بلا رمزٍ صالح (غالبًا يجهز خفيةً في ثوانٍ)
    if (shieldOn && !tsToken) {
      setErrorMsg("جارٍ التأكّد أنّك لست روبوتًا، انتظر لحظةً ثمّ أعد الإرسال.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMsg("");
    // لا إدراجَ من المتصفّح: الفعلُ الخادميّ يتحقّق من الرمز ثمّ يكتب (contact-actions.ts)
    const r = await sendContactMessage({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
      turnstileToken: tsToken ?? undefined,
    });
    if (!r.ok) {
      setErrorMsg(r.message);
      setState("error");
      // الرمزُ استُهلك في المحاولة الفاشلة، فيُجدَّد قبل الثانية
      setTsToken(null);
      setTsReset((n) => n + 1);
      return;
    }
    setState("success");
    setForm({ name: "", email: "", subject: "", message: "" });
    setTsToken(null);
    setTsReset((n) => n + 1);
  }

  if (state === "success") {
    return (
      <Card className="text-center">
        <CardBody className="p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded bg-navy-50 text-2xl font-black text-success">
            ✓
          </div>
          <p className="mt-3 font-display text-xl font-bold text-content">شكرًا لك! وصلتْنا رسالتك</p>
          <p className="mt-1 text-sm text-content-muted">سنردّ عليك في أقرب وقت.</p>
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setState("idle")}>
              إرسال رسالة أخرى
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    // سطح الكرت نفسه في الحالتين (النموذج والشكر) — فلا يقف النموذج عاريًا على
    // الخلفيّة المحيطة (`amb-host`)، ولا يقفز السطح تحت المستخدم عند الإرسال.
    <Card>
      <CardBody className="p-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب اسمك" value={form.name} onChange={set("name")} required />
            <Field
              label="البريد الإلكتروني"
              icon={<Envelope />}
              innerIcon={<At />}
              placeholder="you@adeeb.club"
              type="email"
              charset="latin"
              value={form.email}
              onChange={set("email")}
              onBlur={() => setEmailTouched(true)}
              error={emailError(form.email, emailTouched)}
              required
            />
          </div>
          <Field label="الموضوع" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" value={form.subject} onChange={set("subject")} optional />
          <Textarea label="الرسالة" icon={<ChatText />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" rows={5} value={form.message} onChange={set("message")} required />
          {shieldOn ? (
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY!} onToken={setTsToken} resetSignal={tsReset} />
          ) : null}
          {state === "error" && <p className="text-sm font-bold text-danger">{errorMsg}</p>}
          <Button type="submit" size="lg" loading={state === "submitting"}>
            إرسال الرسالة
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
