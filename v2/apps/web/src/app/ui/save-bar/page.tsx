"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Container, Field, SaveBar } from "@adeeb/design-system";
import { At, Envelope, Hash, Phone, User } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
// (الأيقونات كلّها من عائلة النظام — لا رسمَ خاصًّا لمعرض)

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

/**
 * معرض **شريط الحفظ اللاصق** — يظهر حين يتغيّر شيء، ويلازم أسفل حاوية التمرير.
 * والمعرض يُريه في حالتيه: ساكنًا (لا شريط) ومتغيّرًا (شريطٌ يلاحقك وأنت تمرّر).
 */
export default function SaveBarGallery() {
  // **المحفوظ حالةٌ لا ثابت**: هو المرجع الذي يُقاس عليه «هل تغيّر شيء؟»، ويتبدّل بالحفظ.
  // (ثابتٌ يُعاد بناؤه كلّ رسمةٍ كان سيُرجِع الحقولَ إلى قيمها الأولى بعد الحفظ.)
  const [saved, setSaved] = useState({ name: "محمد بن إسماعيل", phone: "0512345678", email: "member@adeeb.club", nick: "أبو عبدالله" });
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState(saved.email);
  const [nick, setNick] = useState(saved.nick);
  const [saving, setSaving] = useState(false);
  const dirty = name !== saved.name || phone !== saved.phone || email !== saved.email || nick !== saved.nick;

  const reset = () => { setName(saved.name); setPhone(saved.phone); setEmail(saved.email); setNick(saved.nick); };
  const save = () => {
    setSaving(true);
    window.setTimeout(() => { setSaved({ name, phone, email, nick }); setSaving(false); }, 900);
  };

  return (
    <Container className="py-14">
      <h1 className="font-display text-4xl font-black text-content">شريط الحفظ اللاصق</h1>
      <p className="mt-3 max-w-2xl text-content-muted">
        غيّر حقلًا من الحقول أدناه فيظهر الشريط، ثمّ مرّر الصفحة — يلازم أسفلها. وهو للشاشات
        الطويلة التي يدخلها صاحبها ليمسّ حقلًا واحدًا ويخرج، لا للنموذج القصير الذي يُملأ من
        أوّله إلى آخره (ذاك زرُّه في ذيله).
      </p>

      <div className="mt-12 space-y-14">
        <Sec title="الحالتان">
          <Lab>ساكنٌ ⇐ لا شريط · متغيّرٌ ⇐ شريطٌ يعلن ويحفظ</Lab>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader variant="soft" icon={<User />} title="بياناتك" subtitle="عدّل حقلًا ليظهر الشريط" />
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب الاسم"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                  <Field label="رقم الجوّال" charset="digits" icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
                    value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  <Field className="sm:col-span-2" label="البريد" charset="latin" icon={<Envelope />} innerIcon={<At />}
                    placeholder="you@adeeb.club" value={email} onChange={(e) => setEmail(e.target.value)} optional />
                </div>
              </CardBody>
            </Card>

            {/* حشوٌ يطيل الصفحة كي يُرى الالتصاق حقًّا عند التمرير */}
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader variant="soft" icon={<User />} title={`بطاقةٌ ${i}`} subtitle="حشوٌ ليطول التمرير" />
                <CardBody><p className="text-content-muted">محتوًى لا يعني شيئًا — غرضُه أن تطول الصفحة فيُرى الشريط ملازمًا.</p></CardBody>
              </Card>
            ))}

            {/* **حقلٌ في الذيل** — هنا تُختبَر مسألة الحجب: الشريط يظهر فوق آخر ما في الصفحة،
                فيجب أن يبقى هذا الحقل مرئيًّا وأنت تكتب فيه (حجزُ المكان + رفعُ المركَّز). */}
            <Card>
              <CardHeader variant="soft" icon={<PencilSimple />} title="آخرُ حقلٍ في الصفحة" subtitle="اكتب فيه وأنت في ذيل الصفحة — يجب ألّا يحجبه الشريط" />
              <CardBody>
                <Field label="اسم الشهرة" icon={<User />} innerIcon={<PencilSimple />} placeholder="كنيتك بين إخوانك"
                  value={nick} onChange={(e) => setNick(e.target.value)} optional />
              </CardBody>
            </Card>
          </div>

          <SaveBar open={dirty}>
            <Button variant="ghost" size="md" onClick={reset} disabled={saving}>تراجع</Button>
            <Button variant="primary" size="md" loading={saving} onClick={save}>حفظ التغييرات</Button>
          </SaveBar>
        </Sec>
      </div>
    </Container>
  );
}
