"use client";

import { useState } from "react";
import { Button, Container, Field, Select, Badge, ModalSectionHeading, Segmented, Modal } from "@adeeb/design-system";
import {
  User, Envelope, At, Buildings, Phone, CalendarBlank, UsersThree, Copy, Books, GraduationCap,
  BookOpen, Certificate, IdentificationCard, AddressBook, ShareNetwork, CalendarX,
} from "@phosphor-icons/react";
import { CheckCircle } from "@/app/_components/glyphs";
import {
  Trash, Warning, PencilSimple, Star, XLogo, InstagramLogo, TiktokLogo, LinkedinLogo, Prohibit,
  WarningCircle,
} from "@/app/_components/glyphs";
import { ConfirmDialog } from "../../dashboard/_components/ConfirmDialog";
import { Avatar } from "../../dashboard/_components/Avatar";

const DEPT_OPTS = [{ value: "media", label: "الإعلام" }, { value: "events", label: "الفعاليّات" }, { value: "hr", label: "الموارد البشريّة" }];
const ROLE_OPTS = [{ value: "member", label: "عضو" }, { value: "lead", label: "رئيس لجنة" }];
const STATUSES = [{ k: "active", label: "نشط" }, { k: "pending", label: "معلّق" }, { k: "suspended", label: "موقوف" }];

// سببٌ واقعيّ من القاعدة (فقرتان) — يكشف ما يخفيه سطرٌ قصير: الالتفاف وحفظ الأسطر ومدى القراءة.
const DEMO_REASON = `خروج العضو من مجتمع أديب دون إبلاغ إدارة الموارد البشرية بالخروج.

وبعد مراجعة اللجنة تقرّر إنهاء العضوية وفق المادّة الرابعة من لائحة العضويّة.`;

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// خليّة بيانات ملفّ (مبسّطة للعرض — بلا نسخ فعليّ)؛ الحقل الفارغ → شرطة محايدة بلا زرّ نسخ.
// noCopy: قيمةٌ لا يُنسخ مثلها (تاريخ) — فالرُّكن يبقى خاليًا بدل زرٍّ لا أحد يضغطه.
function PCell({ label, value, icon, full, lat, noCopy }: { label: string; value?: string; icon: React.ReactNode; full?: boolean; lat?: boolean; noCopy?: boolean }) {
  const empty = !value;
  return (
    <div className={"pva-cell" + (full ? " full" : "")}>
      <div className="pva-lbl"><span className="pva-lic">{icon}</span>{label}</div>
      <div className={"pva-val" + (lat && !empty ? " lat" : "") + (empty ? " na" : "")}>{empty ? "—" : value}</div>
      {!empty && !noCopy && <button type="button" className="pva-copy" aria-label="نسخ"><Copy aria-hidden /></button>}
    </div>
  );
}

// قسم الملفّ = فاصل خفيف (أيقونة هوية + عنوان) ثمّ شبكة خلاياه؛ end=نغمة خطر (إنهاء العضويّة)
function PSec({ icon, title, end, children }: { icon: React.ReactNode; title: string; end?: boolean; children: React.ReactNode }) {
  return (
    <section className={"pva-sec" + (end ? " pva-sec--end" : "")}>
      <ModalSectionHeading icon={icon} title={title} tone={end ? "danger" : "default"} />
      <div className="pva-grid">{children}</div>
    </section>
  );
}

type Size = "sm" | "md" | "lg";
type Tone = "danger" | "warning" | "success";

// نغمات نافذة التأكيد: أيقونة + عنوان + نصّ + تسمية الزرّ لكلّ نغمة
const CONFIRM: Record<Tone, { icon: React.ReactNode; title: string; text: string; confirmLabel: string }> = {
  danger: {
    icon: <Trash />,
    title: "حذف العنصر؟",
    text: "سيُحذف هذا العنصر نهائيًّا ولا يمكن استرجاعه بعد التأكيد.",
    confirmLabel: "حذف نهائيّ",
  },
  warning: {
    icon: <Warning />,
    title: "تعليق الحساب؟",
    text: "سيُعلَّق الحساب مؤقّتًا ولن يتمكّن صاحبه من الدخول حتّى تُلغي التعليق.",
    confirmLabel: "تعليق",
  },
  success: {
    icon: <CheckCircle />,
    title: "تمّ الإرسال بنجاح",
    text: "وصلت رسالتك إلى المستلم، وستصلك نسخة على بريدك الإلكترونيّ.",
    confirmLabel: "تمام",
  },
};

export default function ModalPage() {
  // نافذة واحدة مفتوحة في كلّ مرّة: نحفظ مفتاحها (الحجم/النوع) أو null
  const [basic, setBasic] = useState(false);
  // معرض حالة الانشغال: الحفظ يعمل الآن — تُغلق المخارج الثلاثة
  const [busyOpen, setBusyOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [sized, setSized] = useState<Size | null>(null);
  const [confirm, setConfirm] = useState<Tone | null>(null);
  const [notice, setNotice] = useState(false);
  const [form, setForm] = useState(false);
  const [tabbed, setTabbed] = useState(false);
  const [status, setStatus] = useState("active");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"info" | "activity">("info");
  const [profile, setProfile] = useState(false);
  const [reasonB, setReasonB] = useState(false);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Modal</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض النوافذ الحواريّة</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          نوافذ Aurora بسلوك يدويّ كامل: فخّ تركيز · قفل تمرير الخلفية · ESC · حركة دخول/خروج. اضغط الأزرار لفتح كلّ حالة.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="نافذة عاديّة">
            <Lab>ترويسة (عنوان + وصف) · محتوى · تذييل بأزرار</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md" onClick={() => setBasic(true)}>افتح النافذة</Button>
            </div>
            <Modal
              open={basic}
              onClose={() => setBasic(false)}
              title="تعديل الملفّ الشخصيّ"
              description="حدّث بياناتك الأساسيّة ثمّ احفظ التغييرات."
              size="md"
              footer={
                <>
                  <Button variant="ghost" size="md" onClick={() => setBasic(false)}>إلغاء</Button>
                  <Button variant="primary" size="md" onClick={() => setBasic(false)}>حفظ التغييرات</Button>
                </>
              }
            >
              <p className="text-content-muted">
                هذا هو جسم النافذة — يقبل أيّ محتوى React: نصوصًا أو نماذج أو جداول. يُمرَّر عبر <code className="font-latin">children</code>،
                والعنوان والوصف والتذييل خصائص مستقلّة.
              </p>
            </Modal>
          </Sec>

          <Sec title="أثناء التنفيذ (busy)">
            <Lab>القاعدة ٧: الطلب انطلق للخادم فالإغلاق لا يُلغيه — تُغلق المخارج الثلاثة (إلغاء · × · ESC)</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md" onClick={() => setBusyOpen(true)}>افتح ثمّ احفظ</Button>
            </div>
            <Modal
              open={busyOpen}
              onClose={() => setBusyOpen(false)}
              busy={demoBusy}
              title="نافذة أثناء الحفظ"
              description="اضغط «حفظ التغييرات» ثمّ جرّب الإلغاء أو × أو ESC — لن يستجيب شيء حتى ينتهي."
              size="md"
              footer={
                <>
                  <Button variant="ghost" size="md" onClick={() => setBusyOpen(false)} disabled={demoBusy}>إلغاء</Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={demoBusy}
                    onClick={() => {
                      setDemoBusy(true);
                      window.setTimeout(() => { setDemoBusy(false); setBusyOpen(false); }, 3000);
                    }}
                  >
                    حفظ التغييرات
                  </Button>
                </>
              }
            >
              <p className="text-content-muted">
                أثناء التنفيذ يبقى الزرّ بلون الهوية مع دائرته، وتُعطَّل المخارج الثلاثة — فلا يَعِد «إلغاء» بما لا يملك.
              </p>
            </Modal>
          </Sec>

          <Sec title="الأحجام">
            <Lab>size: sm · md · lg</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost" size="md" onClick={() => setSized("sm")}>صغيرة (sm)</Button>
              <Button variant="ghost" size="md" onClick={() => setSized("md")}>متوسّطة (md)</Button>
              <Button variant="ghost" size="md" onClick={() => setSized("lg")}>كبيرة (lg)</Button>
            </div>
            <Modal
              open={sized !== null}
              onClose={() => setSized(null)}
              title={sized ? `نافذة بحجم ${sized}` : "نافذة"}
              description="يتحكّم المقاس في أقصى عرض للنافذة على الشاشات الواسعة."
              size={sized ?? "md"}
              footer={<Button variant="primary" size="md" onClick={() => setSized(null)}>إغلاق</Button>}
            >
              <p className="text-content-muted">
                هذه النافذة معروضة بالحجم <b className="font-latin text-content">{sized}</b>. بدّل الأزرار لمقارنة الأحجام الثلاثة.
              </p>
            </Modal>
          </Sec>

          <Sec title="نافذة تأكيد — النغمات">
            <Lab>ConfirmDialog · tone: danger · warning · success</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="danger" size="md" onClick={() => setConfirm("danger")}>خطر (danger)</Button>
              <Button variant="warning" size="md" onClick={() => setConfirm("warning")}>تحذير (warning)</Button>
              <Button variant="success" size="md" onClick={() => setConfirm("success")}>نجاح (success)</Button>
            </div>
            {confirm ? (
              <ConfirmDialog
                open
                onClose={() => setConfirm(null)}
                tone={confirm}
                icon={CONFIRM[confirm].icon}
                title={CONFIRM[confirm].title}
                text={CONFIRM[confirm].text}
                confirmLabel={CONFIRM[confirm].confirmLabel}
                onConfirm={() => setConfirm(null)}
              />
            ) : null}
          </Sec>

          <Sec title="نافذة تأكيد — إشعار بزرّ واحد">
            <Lab>ConfirmDialog · single (بلا زرّ إلغاء)</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="success" size="md" onClick={() => setNotice(true)}>إشعار نجاح</Button>
            </div>
            <ConfirmDialog
              open={notice}
              onClose={() => setNotice(false)}
              tone="success"
              icon={<CheckCircle />}
              title="حُفظت التغييرات"
              text="جرى حفظ كلّ تعديلاتك بنجاح."
              confirmLabel="تمام"
              onConfirm={() => setNotice(false)}
              single
            />
          </Sec>

          <Sec title="نافذة نموذج">
            <Lab>mdl-grid · Field · Select · mdl-full · mdl-fieldlabel · Segmented</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md" onClick={() => setForm(true)}>افتح النموذج</Button>
            </div>
            <Modal
              open={form}
              onClose={() => setForm(false)}
              title="تعديل العضو"
              description="حدّث البيانات ثمّ احفظ التغييرات."
              size="lg"
              footer={
                <>
                  <Button variant="ghost" size="md" onClick={() => setForm(false)}>إلغاء</Button>
                  <Button variant="primary" size="md" onClick={() => setForm(false)}>حفظ التغييرات</Button>
                </>
              }
            >
              <div className="mdl-grid">
                <Field label="الاسم" icon={<User />} innerIcon={<PencilSimple />} placeholder="اكتب الاسم" />
                <Field label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" />
                <Select label="القسم" icon={<Buildings />} options={DEPT_OPTS} value={dept} onValueChange={setDept} />
                <Select label="الدور" icon={<Star />} options={ROLE_OPTS} value={role} onValueChange={setRole} />
                <div className="mdl-full">
                  <span className="mdl-fieldlabel">الحالة</span>
                  <Segmented aria-label="الحالة" value={status} onValueChange={setStatus}
                    items={STATUSES.map((s) => ({ value: s.k, label: s.label }))} />
                </div>
              </div>
            </Modal>
          </Sec>

          <Sec title="نافذة مبوّبة">
            <Lab>تبويبات (Segmented) · mdl-tabpanel · mdl-info · mdl-muted</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost" size="md" onClick={() => setTabbed(true)}>افتح المبوّبة</Button>
            </div>
            <Modal
              open={tabbed}
              onClose={() => setTabbed(false)}
              title="ملفّ العضو"
              size="md"
              footer={<Button variant="primary" size="md" onClick={() => setTabbed(false)}>إغلاق</Button>}
            >
              <div className="flex justify-center">
                <Segmented aria-label="أقسام الملفّ" value={tab} onValueChange={(v) => setTab(v as "info" | "activity")}
                  items={[{ value: "info", label: "المعلومات" }, { value: "activity", label: "النشاط" }]} />
              </div>
              <div className="mdl-tabpanel">
                {tab === "info" ? (
                  <dl className="mdl-info">
                    <div className="mdl-info-row"><dt>القسم</dt><dd>الإعلام</dd></div>
                    <div className="mdl-info-row"><dt>الدور</dt><dd>عضو</dd></div>
                    <div className="mdl-info-row"><dt>تاريخ الانضمام</dt><dd>١٢ يناير ٢٠٢٥</dd></div>
                    <div className="mdl-info-row"><dt>الحالة</dt><dd>نشط</dd></div>
                  </dl>
                ) : (
                  <p className="mdl-muted">لا نشاط حديث لعرضه لهذا العضو.</p>
                )}
              </div>
            </Modal>
          </Sec>

          <Sec title="نافذة الملف الشخصيّ">
            <Lab>pvb-modal · hero (غلاف + أفتار) · pvb-name/role/badges · pva-grid (خلايا + نسخ)</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md" onClick={() => setProfile(true)}>عرض الملف</Button>
            </div>
            <Modal
              open={profile}
              onClose={() => setProfile(false)}
              title="محمد بن إسماعيل"
              size="md"
              className="pvb-modal"
              hero={
                // بصورةٍ لا بأحرف: `.pvb-av` مطوَّقٌ بحلقةٍ بيضاء، والصورةُ وحدَها تُظهر زاويتَها
                // الداخليّة (الأفتار ناقصَ الحلقة) — والأحرفُ لا تلامس الأركان فتُخفي خطأها.
                <Avatar name="محمد بن إسماعيل" src="/brand/pattern-circular.svg" size="2xl" status="online" className="pvb-av" />
              }
              footer={
                <>
                  <Button variant="ghost" size="md" onClick={() => setProfile(false)}>إغلاق</Button>
                  <Button variant="primary" size="md" onClick={() => setProfile(false)}>تعديل</Button>
                </>
              }
            >
              <div className="pvb-name">محمد بن إسماعيل</div>
              <div className="pvb-role">عضو · لجنة الإعلام</div>
              <div className="pvb-badges"><Badge tone="success" variant="soft" dot live>نشط</Badge></div>

              <div className="pva-sections">
                <PSec icon={<Books />} title="البيانات الأكاديميّة">
                  <PCell full label="الكلّيّة" icon={<GraduationCap />} value="كلّيّة الحاسب والمعلومات" />
                  <PCell label="التخصّص" icon={<BookOpen />} value="هندسة البرمجيّات" />
                  <PCell label="الدرجة العلميّة" icon={<Certificate />} value="بكالوريوس" />
                  <PCell full lat label="الرقم الأكاديميّ" icon={<IdentificationCard />} value="٤٤١٠٢٣٥٧" />
                </PSec>
                <PSec icon={<IdentificationCard />} title="بيانات العضويّة">
                  <PCell label="الدور" icon={<Star />} value="عضو" />
                  <PCell label="اللجنة" icon={<UsersThree />} value="لجنة الإعلام" />
                  <PCell label="القسم" icon={<Buildings />} value="الإعلام" />
                  <PCell label="تاريخ الانضمام" icon={<CalendarBlank />} value="١٢ يناير ٢٠٢٥" />
                </PSec>
                <PSec icon={<AddressBook />} title="التواصل">
                  <PCell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value="mohammad@adeeb.club" />
                  <PCell full lat label="رقم الجوّال" icon={<Phone />} value="٠٥٠١٢٣٤٥٦٧" />
                </PSec>
                <PSec icon={<ShareNetwork />} title="التواصل الاجتماعيّ">
                  <PCell lat label="إكس (تويتر)" icon={<XLogo />} value="@mohammad" />
                  <PCell lat label="إنستغرام" icon={<InstagramLogo />} value="@mohammad" />
                  <PCell lat label="تيك‑توك" icon={<TiktokLogo />} value="@mohammad" />
                  <PCell lat label="لينكدإن" icon={<LinkedinLogo />} value="mohammad-ismael" />
                </PSec>
                {/* شرطيّ في الإنتاج (للموقوفين) — معروض هنا لاستعراض نغمة الخطر */}
                <PSec end icon={<Prohibit />} title="إنهاء العضويّة">
                  <PCell full label="سبب الإنهاء" icon={<WarningCircle />} value="مخالفة لائحة العضويّة" />
                  <PCell full label="تاريخ الإنهاء" icon={<CalendarX />} value="٣ مارس ٢٠٢٦" />
                </PSec>
              </div>
            </Modal>
          </Sec>

          {/* نافذة السبب — الحاجة: السبب يُقصّ بـ«…» في الجدول والكرت (`.txt-clip` · `.acard-info-val`)،
              فيلزم كشفه كاملًا بلا فتح الملفّ كلّه. ترث هيئة الملفّ (غلاف + أفتار) وتلبس نغمتها. */}
          <Sec title="نافذة السبب">
            <Lab>pvb-modal · mdl-tone-danger (النغمة على السطح والحدّ والغلاف والأفتار) · pva-sec--end</Lab>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="danger" size="md" onClick={() => setReasonB(true)}>عرض السبب</Button>
            </div>
            <Modal
              open={reasonB}
              onClose={() => setReasonB(false)}
              title="سبب إنهاء العضوية — ريم صلاح الشامي"
              size="sm"
              className="pvb-modal mdl-tone-danger"
              hero={<Avatar name="ريم صلاح الشامي" size="2xl" status="busy" className="pvb-av" />}
              footer={<Button variant="ghost-danger" size="md" onClick={() => setReasonB(false)}>إغلاق</Button>}
            >
              <div className="pvb-name">ريم صلاح الشامي</div>
              <div className="pvb-role">عضوية منتهية منذ ١٣ يومًا</div>
              <div className="pva-sections">
                {/* خليّتان عاديّتان لا تصميم خاصّ: قسم الإنهاء يجعل القيمة تلتفّ كاملةً أصلًا
                    (`.pva-sec--end .pva-val`)، فالسبب يُعرض كأيّ قيمة — بأيقونته وتسميته. */}
                <PSec end icon={<Prohibit />} title="سبب إنهاء العضوية">
                  <PCell full noCopy label="سبب الإنهاء" icon={<WarningCircle />} value={DEMO_REASON} />
                  <PCell full noCopy label="تاريخ الإنهاء" icon={<CalendarX />} value="٢ يوليو ٢٠٢٦" />
                </PSec>
              </div>
            </Modal>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
