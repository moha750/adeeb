"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Field,
  IconButton,
  Modal,
  Select,
  Textarea,
  matchesSearch,
} from "@adeeb/design-system";
import { ClipboardText, Tag, TextAa } from "@phosphor-icons/react";
import { Check, Eye, EyeSlash, PencilSimple, Plus, Trash, X } from "@/app/_components/glyphs";
import { AR_LINE, AR_WORD, arCount } from "@/lib/arabicCount";
import { IconWords } from "../../_shell/icons";
import { DataTable, type Column, type Group } from "../../_components/DataTable";
import { DataCards } from "../../_components/DataCards";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { PageHeader } from "../../_components/PageHeader";
import { LIMITS, parseBulkWords } from "../vocab";
import type { BankWordRow, CategoryRow } from "./data";
import {
  createBankWord,
  createBankWords,
  createCategory,
  deleteBankWord,
  deleteCategory,
  renameCategory,
  setBankWordActive,
  updateBankWord,
} from "./actions";

/**
 * **بنكُ الكلمات** — مادّةُ اللعبة، تُكتَب مرّةً وتُلعَب مواسم.
 *
 * **ولماذا نافذةٌ لا مسارٌ للتحرير** (خلافًا لمعرفة ديبو): الواقعةُ هناك فقرةٌ تُحرَّر
 * وتُراجَع، وهذه ثلاثةُ حقولٍ قصيرة. والفعلُ الغالبُ هنا **إضافةُ عشرين كلمةً تباعًا**،
 * ومسارٌ مستقلٌّ يعني عشرين ذهابًا وإيابًا وفقدانَ موضع القائمة في كلّ مرّة. فالنافذةُ
 * تُبقي الكاتبَ في مكانه ويعيد الفتحَ بنقرة.
 */
export function WordsView({ rows, categories }: { rows: BankWordRow[]; categories: CategoryRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [view, changeView] = usePersistentView("gw-bank-view");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ category: "", state: "" });

  const [editing, setEditing] = useState<BankWordRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [confirmKill, setConfirmKill] = useState<BankWordRow | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filters.category && r.category !== filters.category) return false;
        if (filters.state === "active" && !r.active) return false;
        if (filters.state === "off" && r.active) return false;
        return matchesSearch(search, r.word, r.hint ?? "", r.category);
      }),
    [rows, search, filters]
  );

  /**
   * **التصنيفُ شريطٌ يجمع صفوفَه لا شارةٌ تتكرّر في كلّ صفّ** (قرارُ المالك ٢٠٢٦-٠٨-٢٦).
   *
   * والبدائيّةُ قائمةٌ في المكتبة (`groups`) ونصُّ ق١٢ يسمّيها بعينها: «تقسيمٌ داخل
   * الجدول ← `groups` … هذا بديلُ الأكورديون حين يكون المطويّ صفوفَ جدول». فلا كرتٌ
   * يلفّ جدولًا ولا إطارٌ داخل إطار.
   *
   * **والخالي يظهر ما لم يقم بحثٌ**: تصنيفٌ لا كلمةَ فيه خبرٌ يُقال («أنشأتَه ولم
   * تملأه»)، أمّا أثناء البحث فشريطٌ بلا نتيجةٍ يُقرأ عطبًا — وهي علّةُ المواليد
   * المسجّلةُ في ق١٢ نفسِها.
   */
  const searching = search.trim().length > 0 || filters.category !== "" || filters.state !== "";

  const groups: Group<BankWordRow>[] = useMemo(
    () =>
      categories
        .map((c) => ({
          key: c.name,
          label: c.name,
          // العدُّ عدُّ **المعروض** لا عدُّ الكلّ: شريطٌ يقول «٤٠» فوق ثلاثة صفوفٍ يكذب.
          hint: arCount(filtered.filter((r) => r.category === c.name).length, AR_WORD),
          rows: filtered.filter((r) => r.category === c.name),
        }))
        .filter((g) => g.rows.length > 0 || !searching),
    [categories, filtered, searching]
  );

  const filterDefs: FilterDef[] = [
    {
      key: "category",
      label: "التصنيف",
      options: [
        { value: "", label: "الكل" },
        ...categories.map((c) => ({ value: c.name, label: c.name })),
      ],
    },
    {
      key: "state",
      label: "الحال",
      options: [
        { value: "", label: "الكل" },
        { value: "active", label: "في الخدمة" },
        { value: "off", label: "موقوفة" },
      ],
    },
  ];

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => {
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const actionsFor = (w: BankWordRow): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "تحرير", icon: <PencilSimple />, onSelect: () => setEditing(w) },
        {
          label: w.active ? "تعطيل" : "إعادة للخدمة",
          icon: w.active ? <EyeSlash /> : <Eye />,
          disabled: pending,
          onSelect: () => run(() => setBankWordActive(w.id, !w.active)),
        },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(w) }],
    },
  ];

  const columns: Column<BankWordRow>[] = [
    {
      key: "word",
      header: "الكلمة",
      // حرٌّ الطولِ فيُعطى `auto` مع `wrap`: العرضُ المرنُ يدفع الشبكةَ إلى أطول جملةٍ
      // فيجرّ الجدولَ أفقيًّا على ٣٧٥px (درسُ سجلّ ديبو ٢٠٢٦-٠٨-٢٢).
      width: "auto",
      wrap: true,
      icon: <TextAa />,
      render: (w) => (
        <span className="txt">
          <b>{w.word}</b>
          {w.hint ? <span className="mt-1 block text-content-muted">{w.hint}</span> : null}
        </span>
      ),
    },
    {
      key: "state",
      header: "الحال",
      width: "120px",
      render: (w) =>
        w.active ? (
          <Badge tone="success" dot>
            في الخدمة
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            موقوفة
          </Badge>
        ),
    },
  ];

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<IconWords />}
      title={rows.length === 0 ? "لا كلمات بعد" : "لا كلمة توافق البحث"}
      description={
        rows.length === 0
          ? "اكتب أوّل كلمة، فتصير مادّةً لكلّ غرفةٍ تفتحها بعدها."
          : "جرّب كلمةً أخرى أو ارفع المرشّحات."
      }
      action={
        rows.length === 0 ? (
          <Button onClick={() => setCreating(true)}>
            <Plus size={18} />
            كلمة جديدة
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageHeader
        title="بنك الكلمات"
        action={{ label: "كلمة جديدة", icon: <Plus size={18} />, onClick: () => setCreating(true) }}
        menu={[
          {
            header: "إضافة",
            items: [
              {
                label: "لصقُ قائمة",
                icon: <ClipboardText />,
                onSelect: () => setPasting(true),
              },
            ],
          },
          {
            header: "التنظيم",
            items: [
              { label: "التصنيفات", icon: <Tag />, onSelect: () => setManaging(true) },
            ],
          },
        ]}
      />

      <Toolbar
        searchPlaceholder="ابحث في الكلمات"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        view={view}
        onViewChange={changeView}
      />

      {view === "table" ? (
        <DataTable
          columns={columns}
          groups={groups}
          getRowId={(w) => w.id}
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={setEditing}
        />
      ) : (
        <DataCards
          columns={columns}
          groups={groups}
          getRowId={(w) => w.id}
          spec={{ title: "word", badge: "state" }}
          variant="compact"
          emptyState={emptyState}
          rowActions={actionsFor}
          onRowClick={setEditing}
          openLabel="تحرير الكلمة"
        />
      )}

      <CategoriesModal
        key={managing ? "cat-open" : "cat-closed"}
        open={managing}
        categories={categories}
        onClose={() => setManaging(false)}
      />

      <BulkModal
        key={pasting ? "bulk-open" : "bulk-closed"}
        open={pasting}
        categories={categories}
        onClose={() => setPasting(false)}
      />

      <WordModal
        key={editing?.id ?? (creating ? "new" : "closed")}
        open={creating || editing !== null}
        word={editing}
        categories={categories}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الكلمة؟"
        text={
          confirmKill
            ? `سيُحذف «${confirmKill.word}» من البنك نهائيًّا. ولو أردت إخراجَها من السحب وحدَه فعطّلها.`
            : undefined
        }
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteBankWord(confirmKill.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmKill(null);
              router.refresh();
            } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}

/**
 * نافذةُ الكلمة — إضافةً وتحريرًا.
 *
 * وفي الإضافة **تبقى مفتوحةً بعد الحفظ** ويُفرَّغ حقلُ الكلمة ويبقى التصنيف: من يملأ
 * بنكًا يكتب عشرين كلمةً في تصنيفٍ واحد، وإغلاقُ النافذة بعد كلّ واحدةٍ يجعله يعيد
 * فتحَها واختيارَ تصنيفها عشرين مرّة.
 */
function WordModal({
  open,
  word,
  categories,
  onClose,
}: {
  open: boolean;
  word: BankWordRow | null;
  categories: CategoryRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [text, setText] = useState(word?.word ?? "");
  const [hint, setHint] = useState(word?.hint ?? "");
  const [category, setCategory] = useState(word?.category ?? categories[0]?.name ?? "عامّة");

  const editing = word !== null;

  const save = () => {
    startSave(async () => {
      const input = { word: text, hint, category };
      const r = editing ? await updateBankWord(word.id, input) : await createBankWord(input);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(r.message);
      router.refresh();
      if (editing) onClose();
      else {
        // يُفرَّغان معًا: معنى الكلمة السابقة فوق كلمةٍ جديدةٍ كذبٌ يُحفَظ بلا انتباه.
        // والتصنيفُ يبقى — هو وحدَه ما يتكرّر في قائمةٍ تُكتَب دفعةً.
        setText("");
        setHint("");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      title={editing ? "تحرير الكلمة" : "كلمة جديدة"}
      description={
        editing ? undefined : "تُحفَظ وتبقى النافذةُ مفتوحةً للتالية، والتصنيفُ يبقى كما اخترته."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            إغلاق
          </Button>
          <Button
            onClick={save}
            loading={saving}
            disabled={!text.trim() || !hint.trim() || !category.trim()}
          >
            {editing ? "حفظ" : "إضافة"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field
          className="form-full"
          label="الكلمة"
          icon={<TextAa />}
          innerIcon={<PencilSimple />}
          placeholder="مثال: سَحاب"
          maxLength={LIMITS.bankWordMax}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          autoFocus
        />
        {/* **يُختار ولا يُكتَب** (م٠ح): النصُّ الحرّ كان يجعل الخطأَ المطبعيّ تصنيفًا
            جديدًا صامتًا («أدبية» و«أدبيّة»). والإضافةُ صارت لها بابُها في «التصنيفات». */}
        <Select
          className="form-full"
          label="التصنيف"
          icon={<Tag />}
          options={categories.map((c) => ({ value: c.name, label: c.name }))}
          value={category}
          onValueChange={setCategory}
          helper="تُضاف التصنيفاتُ من قائمة «التصنيفات» في رأس الصفحة."
          required
        />
        <Textarea
          className="form-full"
          label="معنى الكلمة"
          icon={<IconWords />}
          innerIcon={<PencilSimple />}
          placeholder="المعنى الذي تحكم به على إجابات اللاعبين"
          rows={3}
          maxLength={LIMITS.bankHintMax}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          required
          helper="يظهر لك في المِقوَد وقتَ الحكم، ولا يراه اللاعبون أبدًا."
        />
      </div>
    </Modal>
  );
}

/**
 * **نافذةُ اللصق الجماعيّ.**
 *
 * سطرٌ لكلّ كلمة: `الكلمة : معناها`. وتقبل **المسافةَ الجدوليّةَ** فاصلًا أيضًا، فمن
 * نسخ خلايا إكسل أو Google Sheets يلصق ما نسخ ولا يتعلّم صيغةً (قرارُ المالك
 * ٢٠٢٦-٠٨-٢٦: لصقٌ لا رفعُ ملفّ — وهو يخدم إكسل أصلًا بلا حزمةٍ ولا خطوةِ تصدير).
 *
 * **والمعاينةُ تسبق الحفظَ دائمًا**: تُعرَض الأسطرُ الصالحةُ معدودةً والمعوجّةُ مسمّاةً
 * برقمها وعلّتها. فلا يُحفَظ ثلاثون صفًّا ثمّ يُكتشَف أنّ خمسةً منها بلا معنًى.
 */
function BulkModal({
  open,
  categories,
  onClose,
}: {
  open: boolean;
  categories: CategoryRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [raw, setRaw] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "عامّة");

  // التحليلُ نفسُه الذي يُنادى في الخادم حراسةً — فالمعاينةُ تَصدُق ولا تُخمّن.
  const { rows, errors } = useMemo(() => parseBulkWords(raw), [raw]);
  const tooMany = rows.length > LIMITS.bulkMax;

  const save = () => {
    startSave(async () => {
      const r = await createBankWords(raw, category);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(r.message);
      router.refresh();
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="lg"
      title="لصقُ قائمة"
      description="سطرٌ لكلّ كلمة. وتقبل النسخَ من إكسل مباشرةً."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={save}
            loading={saving}
            disabled={rows.length === 0 || errors.length > 0 || tooMany || !category.trim()}
          >
            {rows.length > 0 ? `أضِف ${rows.length}` : "أضِف"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          className="form-full"
          label="التصنيف"
          icon={<Tag />}
          options={categories.map((c) => ({ value: c.name, label: c.name }))}
          value={category}
          onValueChange={setCategory}
          helper="يُطبَّق على القائمة كلِّها."
          required
        />

        <Textarea
          className="form-full"
          label="الكلمات ومعانيها"
          icon={<ClipboardText />}
          innerIcon={<PencilSimple />}
          placeholder={"سَحاب : الغَيم المتراكم\nوَجْد : الحُزن الشديد\nإطراق : إطراقُ الرأس حياءً"}
          rows={9}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          required
          helper="افصِل الكلمةَ عن معناها بنقطتين «:» أو بمسافةٍ جدوليّة. والمعنى مطلوبٌ لكلّ كلمة."
        />

        {/* **الرقمُ يتقدّم ولا تسبقه نقطتان**: «٣٧ كلمةً للإضافة» جملةٌ عربيّةٌ تُقرأ،
            و«جاهزةٌ للإضافة: 37» تسميةٌ ثمّ رقمٌ معزولٌ ينفصل عنها بفجوة. والصيغةُ
            تتبع المعدود (`arCount`) فلا يُقال «1 كلمة» ولا «2 كلمات». */}
        {rows.length > 0 || errors.length > 0 ? (
          <p className="form-full txt">
            {rows.length > 0 ? (
              <span className="text-success-700">
                <Check aria-hidden /> {arCount(rows.length, AR_WORD)} للإضافة
              </span>
            ) : null}
            {rows.length > 0 && errors.length > 0 ? "، و" : null}
            {errors.length > 0 ? (
              <span className="text-danger-700">
                {arCount(errors.length, AR_LINE)} للإصلاح
              </span>
            ) : null}
          </p>
        ) : null}

        {tooMany ? (
          <Alert className="form-full" tone="warning" title="القائمةُ أطولُ من الحدّ" compact>
            الحدُّ {LIMITS.bulkMax} كلمةً في اللصقة الواحدة. قسّمها دفعتين.
          </Alert>
        ) : null}

        {errors.length > 0 ? (
          <Alert className="form-full" tone="danger" title="أصلِح هذه الأسطر أوّلًا">
            {/* تُسمّى بأرقامها لا تُعَدّ عدًّا: من يبحث عن سطرٍ في ثلاثين يريد رقمَه. */}
            <ul>
              {errors.slice(0, 8).map((e) => (
                <li key={e.line}>
                  السطر <span className="lat" dir="ltr">{e.line}</span>: {e.reason}
                </li>
              ))}
            </ul>
            {errors.length > 8 ? (
              <p className="mt-2">وغيرُها <span className="lat" dir="ltr">{errors.length - 8}</span>.</p>
            ) : null}
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * **نافذةُ التصنيفات — بابُ إضافتها ومَقرُّ إدارتها.**
 *
 * قبل م٠ح كان التصنيفُ نصًّا حرًّا يُكتَب مع كلّ كلمة، فكان الخطأُ المطبعيّ يصنع
 * تصنيفًا صامتًا («أدبية» و«أدبيّة» صنفان)، ولا يُنشَأ تصنيفٌ قبل كلمته، ولا تُصحَّح
 * تسميةٌ إلّا بتحرير كلّ كلمةٍ تحته. صار صفًّا يُدار من هنا (قرارُ المالك ٢٠٢٦-٠٨-٢٦).
 *
 * **وإعادةُ التسمية تنساب بالقاعدة لا بالشاشة**: المفتاحُ الأجنبيّ `on update cascade`،
 * فتتبع الكلماتُ اسمَها الجديدَ في المعاملة نفسِها.
 *
 * **والحذفُ يُردّ إن كان تحته كلمات** بـ`on delete restrict` — لا بشرطٍ في هذا الملفّ.
 * والعدُّ المعروضُ هنا يقول للمستعمِل لِمَ سيُردّ **قبل** أن يضغط.
 */
function CategoriesModal({
  open,
  categories,
  onClose,
}: {
  open: boolean;
  categories: CategoryRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [fresh, setFresh] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={pending}
      title="التصنيفات"
      description="تُضاف هنا، ثمّ تُختار عند كتابة الكلمة."
      footer={
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          إغلاق
        </Button>
      }
    >
      <div className="form-grid">
        <Field
          className="form-full"
          label="تصنيفٌ جديد"
          icon={<Tag />}
          innerIcon={<Plus />}
          placeholder="مثال: أدبيّة"
          maxLength={LIMITS.bankCategoryMax}
          value={fresh}
          onChange={(e) => setFresh(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && fresh.trim()) {
              e.preventDefault();
              run(() => createCategory(fresh), () => setFresh(""));
            }
          }}
        />
        <div className="form-full">
          <Button
            onClick={() => run(() => createCategory(fresh), () => setFresh(""))}
            loading={pending}
            disabled={!fresh.trim()}
          >
            <Plus size={18} />
            أضِف
          </Button>
        </div>

        <ul className="form-full">
          {categories.map((c) => (
            <li key={c.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
              {editing === c.name ? (
                <>
                  <Field
                    label="الاسمُ الجديد"
                    icon={<Tag />}
                    innerIcon={<PencilSimple />}
                    placeholder={c.name}
                    maxLength={LIMITS.bankCategoryMax}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                  />
                  <span className="flex items-center gap-2">
                    <IconButton
                      aria-label="حفظُ الاسم"
                      disabled={pending || !draft.trim()}
                      onClick={() => run(() => renameCategory(c.name, draft), () => setEditing(null))}
                    >
                      <Check />
                    </IconButton>
                    <IconButton aria-label="إلغاء" disabled={pending} onClick={() => setEditing(null)}>
                      <X />
                    </IconButton>
                  </span>
                </>
              ) : (
                <>
                  <span className="txt">
                    {c.name}
                    <span className="mr-2 text-content-muted">
                      {c.count > 0 ? arCount(c.count, AR_WORD) : "لا كلماتٍ بعد"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <IconButton
                      aria-label={`إعادةُ تسمية ${c.name}`}
                      disabled={pending}
                      onClick={() => {
                        setEditing(c.name);
                        setDraft(c.name);
                      }}
                    >
                      <PencilSimple />
                    </IconButton>
                    {/* المعطَّلُ يقول علّتَه قبل الضغط، فلا يُضغَط ليُردّ. */}
                    <IconButton
                      aria-label={
                        c.count > 0 ? `${c.name} تحته كلمات، فلا يُحذَف` : `حذفُ ${c.name}`
                      }
                      tone="danger"
                      disabled={pending || c.count > 0}
                      onClick={() => run(() => deleteCategory(c.name))}
                    >
                      <Trash />
                    </IconButton>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
