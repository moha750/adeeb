import { Container } from "@adeeb/design-system";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}
function Swatch({ v, label }: { v: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-14 rounded border border-line" style={{ background: `var(${v})` }} />
      <span className="font-latin text-[11px] text-content-muted" dir="ltr">{label}</span>
    </div>
  );
}
function Scale({ name, steps }: { name: string; steps: number[] }) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
      {steps.map((s) => (
        <Swatch key={s} v={`--${name}-${s}`} label={`${name}-${s}`} />
      ))}
    </div>
  );
}

const FULL = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const NAVY = [...FULL, 950];
const GRADS: [string, string][] = [
  ["--grad-primary", "primary"], ["--grad-success", "success"], ["--grad-warning", "warning"], ["--grad-danger", "danger"],
];

export default function TokensPage() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Foundations</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الرموز والألوان</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          أسس الهوية الحيّة — تُقرأ مباشرةً من <span dir="ltr" className="font-latin">tokens.css</span>. غيّر قيمةً هناك فيتغيّر هذا وكلّ الموقع معًا.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="ألوان الهوية">
            <Lab>الكحليّ (أساسيّ · 700 لون العلامة)</Lab>
            <Scale name="navy" steps={NAVY} />
            <div className="mt-6"><Lab>الفولاذيّ (ثانويّ · 600 اللون الثانويّ)</Lab></div>
            <Scale name="steel" steps={FULL} />
          </Sec>

          <Sec title="المحايدة">
            <Scale name="neutral" steps={FULL} />
          </Sec>

          <Sec title="الدلاليّة">
            <Lab>النجاح</Lab>
            <Scale name="success" steps={FULL} />
            <div className="mt-6"><Lab>التحذير</Lab></div>
            <Scale name="warning" steps={FULL} />
            <div className="mt-6"><Lab>الخطر</Lab></div>
            <Scale name="danger" steps={FULL} />
          </Sec>

          <Sec title="تدرّجات الهوية">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GRADS.map(([v, l]) => (
                <div key={l} className="flex flex-col gap-1.5">
                  <div className="h-20 rounded border border-line" style={{ background: `var(${v})` }} />
                  <span className="font-latin text-[11px] text-content-muted" dir="ltr">{l}</span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="الطباعة">
            <div className="space-y-4 rounded border border-line bg-surface p-6">
              <p className="font-display text-4xl font-black text-content">أدِيب — عنوان بخطّ Lyon Arabic</p>
              <p className="font-display text-xl text-content">
                <span style={{ fontWeight: 300 }}>خفيف · </span>
                <span style={{ fontWeight: 400 }}>عاديّ · </span>
                <span style={{ fontWeight: 500 }}>وسط · </span>
                <span style={{ fontWeight: 700 }}>عريض · </span>
                <span style={{ fontWeight: 900 }}>أسود</span>
              </p>
              <p className="font-latin text-2xl text-content" dir="ltr">Eras — Latin &amp; Numbers 0123456789</p>
            </div>
          </Sec>

          <Sec title="الزوايا المتراكزة">
            <p className="mb-5 max-w-xl text-sm text-content-muted">
              عائلة واحدة من رمز أساس <span dir="ltr" className="font-latin font-bold text-secondary">--radius</span> (16).
              والعنصر المتداخل زاويته <b>موازية</b> لأبيه (الأب − الفراغ) — فيبدوان متشابهين.
            </p>
            <div className="flex flex-wrap items-end gap-6">
              {([
                ["--radius", "16 · الأساس", "h-20 w-24"],
                ["--radius-nested", "13 · متداخل", "h-16 w-20"],
                ["--radius-sm", "10 · صغير", "h-12 w-14"],
                ["--radius-xs", "6 · صغير جدًّا", "h-9 w-9"],
              ] as [string, string, string][]).map(([v, label, size]) => (
                <div key={v} className="flex flex-col items-center gap-2">
                  <div className={`${size} border border-line`} style={{ borderRadius: `var(${v})`, background: "var(--color-surface-2)" }} />
                  <span className="font-latin text-[11px] text-content-muted" dir="ltr">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8"><Lab>التراكز — الأب 16 والابن 13 بمنحنى موازٍ</Lab></div>
            <div className="inline-grid place-items-center border border-line" style={{ borderRadius: "var(--radius)", background: "var(--color-surface-2)", padding: "3px" }}>
              <div className="grid h-16 w-28 place-items-center text-xs text-content-muted" style={{ borderRadius: "var(--radius-nested)", background: "var(--color-surface)" }}>متراكز ✓</div>
            </div>
          </Sec>

          <Sec title="الظلال — مصفوفة (لون × مقاس)">
            <p className="mb-5 max-w-xl text-sm text-content-muted">
              بُعدان يتركّبان: المقاس (<span dir="ltr" className="font-latin">sm · md · lg</span>) × اللون (<span dir="ltr" className="font-latin">--shadow-tone-*</span>). أيّ عنصر يضبط النغمة فترثها ظلاله تلقائيًّا.
            </p>
            <div className="space-y-6">
              {([["brand", "فولاذيّ"], ["success", "نجاح"], ["warning", "تحذير"], ["danger", "خطر"]] as [string, string][]).map(([tone, label]) => (
                <div key={tone} style={{ "--shadow-tone": `var(--shadow-tone-${tone})` } as React.CSSProperties}>
                  <Lab>{label} · <span dir="ltr" className="font-latin">--shadow-tone-{tone}</span></Lab>
                  <div className="flex flex-wrap items-end gap-6">
                    {["sm", "md", "lg"].map((s) => (
                      <div key={s} className="flex flex-col gap-2">
                        <div className="h-16 w-24 bg-surface" style={{ boxShadow: `var(--shadow-${s})`, borderRadius: "var(--radius)" }} />
                        <span className="font-latin text-[11px] text-content-muted" dir="ltr">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="الحدود (Strokes)">
            <p className="mb-5 max-w-xl text-sm text-content-muted">
              حدّ البطاقات — مصدر واحد يسري على كل أنواعها (<span dir="ltr" className="font-latin">.acard · .ach-card</span>). عدّله في <span dir="ltr" className="font-latin">tokens.css</span> فيتبع الكلّ.
            </p>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-20 w-28 place-items-center bg-surface text-[10px] text-content-muted" style={{ borderRadius: "var(--radius)", border: "var(--card-stroke-w) solid var(--card-stroke)" }}>عاديّ</div>
                <span className="font-latin text-[11px] text-content-muted" dir="ltr">--card-stroke · 1.75px</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-20 w-28 place-items-center bg-surface text-[10px] text-content-muted" style={{ borderRadius: "var(--radius)", border: "var(--card-stroke-w-active) solid var(--card-stroke-active)" }}>تفاعل</div>
                <span className="font-latin text-[11px] text-content-muted" dir="ltr">--card-stroke-active · 1.75px</span>
              </div>
            </div>
          </Sec>

          <Sec title="حلقات التركيز">
            <p className="mb-5 max-w-xl text-sm text-content-muted">
              بدائيّة منفصلة عن سلّم الظلال — حالة و<span dir="ltr" className="font-latin">accessibility</span> لا عمق (<span dir="ltr" className="font-latin">0 0 0 3px</span>، بلا إزاحة ولا بلور).
              موسومة بـ<span dir="ltr" className="font-latin">--shadow-tone</span> فتتبع حالة الحقل تلقائيًّا (تركيز/خطأ/نجاح).
            </p>
            <Lab>‏--ring · حسب النغمة</Lab>
            <div className="flex flex-wrap items-end gap-6">
              {([["brand", "فولاذيّ"], ["success", "نجاح"], ["warning", "تحذير"], ["danger", "خطر"]] as [string, string][]).map(([tone, label]) => (
                <div key={tone} className="flex flex-col gap-2" style={{ "--shadow-tone": `var(--shadow-tone-${tone})` } as React.CSSProperties}>
                  <div className="grid h-12 w-40 place-items-center bg-surface text-[11px] text-content-muted" style={{ borderRadius: "var(--radius)", border: "1px solid var(--color-border)", boxShadow: "var(--ring)" }}>{label}</div>
                  <span className="font-latin text-[11px] text-content-muted" dir="ltr">--ring</span>
                </div>
              ))}
            </div>
            <div className="mt-8"><Lab>‏--ring-strong · أهداف أكبر (عناصر الاختيار)</Lab></div>
            <div className="grid h-12 w-40 place-items-center bg-surface text-[11px] text-content-muted" style={{ borderRadius: "var(--radius)", border: "1px solid var(--color-border)", boxShadow: "var(--ring-strong)" }}>أوضح</div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
