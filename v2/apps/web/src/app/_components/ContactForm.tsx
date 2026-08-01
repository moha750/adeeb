"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createAdeebClient } from "@adeeb/core";
import { Button, Field, Textarea, Card, CardBody } from "@adeeb/design-system";
import { At, ChatText, Envelope, PencilSimple, TextT, User } from "@phosphor-icons/react";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const sb = useMemo(
    () =>
      createAdeebClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setErrorMsg("يرجى إدخال بريد إلكتروني صحيح.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMsg("");
    const { error } = await sb.from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    });
    if (error) {
      setErrorMsg("تعذّر إرسال الرسالة، حاول لاحقًا.");
      setState("error");
      return;
    }
    setState("success");
    setForm({ name: "", email: "", subject: "", message: "" });
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
              required
            />
          </div>
          <Field label="الموضوع" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" value={form.subject} onChange={set("subject")} optional />
          <Textarea label="الرسالة" icon={<ChatText />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" rows={5} value={form.message} onChange={set("message")} required />
          {state === "error" && <p className="text-sm font-bold text-danger">{errorMsg}</p>}
          <Button type="submit" size="lg" loading={state === "submitting"}>
            إرسال الرسالة
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
