"use client";

/**
 * قالبُ «قائمة السجلّات» (٢٠٢٦-١٠-٣٠) — الطبقة ٤. تسعٌ وثلاثون غرفةً في البوّابة من هذا النوع.
 *
 * القالبُ يملك ما كانت كلُّ غرفة تقرّره وحدها: ترتيبُ الأجزاء (لوحٌ بمواضعه، ثمّ الأدوات،
 * ثمّ السجلّات)، والعدُّ، والبحثُ والمرشّحات، والفراغُ بأنواعه، وطريقةُ العرض، و«عرضُ المزيد».
 * والغرفةُ تقدّم بياناتها وما يُرسم به السجلّ وأفعالُه، ولا تكتب سطرَ تنسيق.
 *
 * والعدُّ يتبع البحثَ والمرشّحات في كلّ موضع، فيُبصر الباحثُ أين وقعت نتائجه عبر المواضع كلّها.
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { SortArea, SortItem, type ReorderSpec } from "./reorder";
import { DownloadSimple, MagnifyingGlass, Trash, X } from "@/app/_components/glyphs";
import { Archive } from "@phosphor-icons/react";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { ICONS } from "@/app/dashboard/_shell/icons";
import { asView, viewCookie, type RoomView } from "./view";
import { roomIconKey, useRoomCrumb } from "./crumb";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { useAdLab } from "./lab";
import {
  AdButton, AdEmpty, AdList, AdPager, AdPickItem, AdPickScope, AdRoom, AdSelBar, AdSwitch, AdTools, RoomPlate,
  AD_HEAD, type AdAction, type AdColumn, type AdFilter, type AdOp, type AdSort,
} from "./primitives";

export type Position<T> = {
  key: string;
  label: string;
  match: (item: T) => boolean;
  /** نصُّ الفراغ حين يخلو الموضع بلا بحث. */
  empty: string;
  /** يظهر فعلُ الإنشاء في فراغه. */
  canCreate?: boolean;
  /** يُفتح نادرًا (الأرشيف، والمحذوفات، والملغاة): مكانُه «المزيد» في المبدّل. */
  rare?: boolean;
};

export type FilterDef<T> = {
  key: string;
  label: string;
  options: { value: string; label: string; group?: string }[];
  match: (item: T, value: string) => boolean;
  /**
   * **مرشّحٌ يخصّ مواضعَ بعينها** (مفاتيحُها): يظهر فيها وحدها ويُحسب فيها وحدها — «السبب» للأعضاء السابقين، والدورُ واللجنةُ
   * للقائمين. بلا قيمةٍ: في المواضع كلّها. (كان المرشّحُ على الغرفة كلّها، فاختيارُ لجنةٍ في «سابقون» يعطي صفرًا لا معنى له.)
   */
  in?: string[];
  /**
   * **ترتيبُ ما يطابق** حين يُختار (الأصغرُ أوّلًا، وعند التساوي ترتيبُ البيانات): مرشّحُ «الرغبة» في المتطوّعين يقدّم من جعل اللجنةَ
   * رغبتَه الأولى ثمّ الثانية ثمّ الثالثة — فالمرشّحُ يجيب «من يريدها؟» بأولاهم بها. والفرزُ من رأس الجدول يعلوه.
   */
  rank?: (item: T, value: string) => number;
};

const PAGE_SIZE = 50;

/** قيمةُ الترتيب: رقمٌ (يبدأ بالأكبر) أو نصٌّ (يبدأ بالألف) — كما كانت الجداولُ القديمة (`toggleSorting`). */
export type SortKey = number | string;
/** عمودُ الجدول، وإن أُعطي `sortBy` رُتّب الجدولُ به من رأسه. */
export type TableColumn<T> = AdColumn & { sortBy?: (item: T) => SortKey };

export function CollectionRoom<T>({
  navPath, title, action, extra, noun, items, positions, defaultPosition,
  searchPlaceholder, matchSearch, filters = [], viewKey, initialView, emptyAll, createAction,
  renderCard, renderRow, table, notice, after, idOf, bulk, reorder, group,
}: {
  /** مسارُ الغرفة في خريطة التنقّل — منه الفتات (بوّابة أدِيب › المجموعة)، والاسمُ نفسُه عنوانُ اللوح. */
  navPath?: string;
  title: string;
  action?: AdAction;
  /** فعلٌ ثانٍ هادئٌ على اللوح (`RoomPlate.extra`) */
  extra?: AdAction;
  /** اسمُ السجلّ بصيغ العدّ الأربع من مصدرها الواحد (`lib/arabicCount`): «خبرٌ واحد، خبران، أخبار، خبرًا». */
  noun: ArForms;
  items: T[];
  positions: Position<T>[];
  defaultPosition?: string;
  searchPlaceholder: string;
  matchSearch: (item: T, q: string) => boolean;
  filters?: FilterDef<T>[];
  /** مفتاحُ حفظ طريقة العرض؛ بدونه الكروتُ وحدها. */
  viewKey?: string;
  /** العرضُ المختار كما قرأه الخادمُ من كوكيه (`roomView`) — فلا تتبدّل الكروتُ جدولًا بعد الرسم. */
  initialView?: RoomView;
  emptyAll: { title: string; desc: string };
  createAction?: ReactNode;
  renderCard: (item: T) => ReactNode;
  renderRow?: (item: T) => ReactNode;
  /**
   * رأسُ الجدول: اسمُ عمود السجلّ («الخبر»)، ثمّ أعمدتُه بأسمائها ورموزها — والسطرُ يملؤها بالترتيب نفسِه.
   * و`headSortBy` و`sortBy` لكلّ عمود: ما يُرتَّب به من رأسه (في الجدول وحده؛ الكروتُ بترتيب البيانات).
   */
  table?: { head: string; headSortBy?: (item: T) => SortKey; columns: TableColumn<T>[]; stub?: TableColumn<T> };
  notice?: ReactNode;
  /**
   * قسمٌ ثانٍ بعد القائمة داخل الغرفة نفسِها (سجلُّ أحداث الباركود «ما الذي جرى») — بعرضها وفجوتها. كان القسمُ يُلفّ مع الغرفة في
   * غرفةٍ ثانية فانكمشت الداخلةُ إلى عرض محتواها وسط الصفحة (وجده محمد ٢٠٢٦-١١-٠٢ بحساب أدِيب)
   */
  after?: ReactNode;
  /**
   * **سجلّاتٌ تحت أصحابها** (محمد ٢٠٢٦-١١-٠٢ في الإنذارات: «شريطٌ باسم الشخص وتحته إنذاراته — بدل أن أقرأ الإنذارَ الثاني ثمّ
   * أنزل وأمرّ على أشخاص حتى أصل إلى الأوّل»): `of` مفتاحُ المجموعة، و`head` رأسُها (`AdGroupHead`) من سجلّاتها الظاهرة،
   * و`order` ترتيبُ المجموعات، و`inner` ترتيبُ السجلّات داخلها. والبحثُ والمواضعُ والمرشّحاتُ تنخل السجلّات، فالمجموعةُ
   * تظهر ما بقي فيها سجلّ؛ والفرزُ من رأس الجدول يرتّب داخل كلّ مجموعة. والصفحةُ خمسون سجلًّا، فمجموعةٌ تنقسم بين صفحتين
   * يتكرّر رأسُها في أوّل الثانية.
   * **والغرفةُ المجمّعةُ قائمةٌ وحدها** (قاعدةٌ أقرّها محمد ٢٠٢٦-١١-٠٢): الكروتُ لتصفّح سجلّاتٍ مستقلّة، وتحت أصحابها تصير
   * مجموعاتٍ صغيرةً تتعرّج بها الشبكة (إنذارٌ واحدٌ ونصفُ سطرٍ فارغ)؛ والقائمةُ تستوعب أيَّ عددٍ بلا فراغ، ورأسُ المجموعة
   * فيها شريطٌ بعرضها. فلا زرَّ للكروت، ويُشترط `renderRow` و`table`.
   */
  group?: {
    of: (item: T) => string;
    head: (items: T[]) => ReactNode;
    order?: (a: T[], b: T[]) => number;
    inner?: (a: T, b: T) => number;
  };
  /** معرّفُ السجلّ — للتحديد الجماعيّ */
  idOf?: (item: T) => string;
  /** الأفعالُ الجماعيّة على المحدَّد؛ بدونها لا تحديدَ في الغرفة */
  bulk?: (ids: string[]) => AdOp[];
  /**
   * غرفةٌ ترتيبُها يدويّ (يحدّد ترتيبَ قسمها في الموقع): كعبُ كلّ سجلٍّ مقبضٌ يُسحب في القائمة نفسِها، والحفظُ عند الإفلات
   * (`reorder.tsx`). ويتطلّب `idOf`، و`items` بترتيبها المحفوظ
   */
  reorder?: ReorderSpec<T>;
}) {
  const lab = useAdLab();
  const PAGE = lab.pageSize ?? PAGE_SIZE;
  const router = useRouter();
  const toast = useToast();
  // **الترتيبُ بالسحب** (`reorder.tsx`): الإفلاتُ يرتّب القائمةَ في مكانها فورًا (`moved`) ثمّ يحفظ. والترتيبُ المؤقّت مربوطٌ
  // بالبيانات التي رُتّب عليها (`base`): متى عادت من الخادم بعد الحفظ سقط وحده، فالمعروضُ ما حُفظ؛ وإن فشل الحفظ سقط فعاد السجلّ
  const [moved, setMoved] = useState<{ base: T[]; ids: string[] } | null>(null);
  const [, startSave] = useTransition();
  // النقلاتُ المتتابعة (ضغطاتُ سهمٍ سريعة) تُحفظ كلٌّ بالقائمة كاملةً وبترتيبها (دوالُّ الخادم في Next تُنفَّذ واحدةً بعد واحدة)،
  // والترتيبُ المؤقّت يبقى حتى تنتهي كلُّها: تحديثٌ من الخادم بعد أولاها كان يُرجع السجلَّ خطوةً ثمّ يقدّمه
  const saves = useRef({ pending: 0, failed: false });
  const sortable = !!reorder && !!idOf;
  const ordered = useMemo(() => {
    if (!moved || moved.base !== items || !idOf) return items;
    const at = new Map(moved.ids.map((id, i) => [id, i]));
    return [...items].sort((a, b) => (at.get(idOf(a)) ?? 0) - (at.get(idOf(b)) ?? 0));
  }, [moved, items, idOf]);
  // رقمُ الموضع في القائمة كلِّها (لا فيما بقي بعد البحث): هو رقمُ الكعب، وبه تُعلَن المواضع
  const placeAt = useMemo(() => new Map(sortable ? ordered.map((x, i) => [idOf!(x), i + 1]) : []), [sortable, ordered, idOf]);
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  // أفعالُ المعاينة (`?f=select`): الشكلُ وحدَه، ولا شيءَ يُنفَّذ على البيانات
  const preview = (ids: string[]): AdOp[] => {
    const say = () => toast.info(`معاينة: لا يُنفَّذ شيءٌ على ${ids.length} من السجلّات.`);
    return [
      { key: "arc", label: "أرشفة", icon: <Archive />, onClick: say },
      { key: "exp", label: "تصدير", icon: <DownloadSimple />, onClick: say },
      { key: "del", label: "حذف", icon: <Trash />, onClick: say, danger: true },
    ];
  };
  const bulkOps = bulk ?? (lab.select ? preview : undefined);
  const canPick = !!idOf && !!bulkOps;
  // الموضعُ والصفحةُ في الرابط (`?pos=`، `?page=`): الرجوعُ من سجلٍّ فُتح في الصفحة الثالثة يعيد إليها لا إلى أوّل القائمة
  const sp = useSearchParams();
  const fallback = defaultPosition ?? positions[0]?.key ?? "all";
  const [position, setPosition] = useState(() => {
    const p = sp.get("pos");
    return p && positions.some((x) => x.key === p) ? p : fallback;
  });
  const [query, setQuery] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPageState] = useState(() => Math.max(1, Math.floor(Number(sp.get("page"))) || 1));
  const head = useRef<HTMLDivElement>(null);
  // غرفةٌ بلا مواضع: موضعٌ واحدٌ يجمع كلَّ شيء، ولا مبدّلَ يُرسم (`plates.length > 1`)
  const ALL = useMemo<Position<T>>(() => ({ key: "all", label: "الكلّ", match: () => true, empty: emptyAll.title }), [emptyAll.title]);
  const writeUrl = (pos: string, pg: number) => {
    const q = new URLSearchParams(window.location.search);
    if (pos === fallback) q.delete("pos"); else q.set("pos", pos);
    if (pg > 1) q.set("page", String(pg)); else q.delete("page");
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  };
  const [savedView, setView] = useRoomView(viewKey, initialView);
  const pair = process.env.NODE_ENV !== "production" && sp.get("f") === "pair";
  /**
   * **قائمةٌ وحدها** حيث الترتيبُ أو التجميعُ هو المعنى (قاعدتان أقرّهما محمد ٢٠٢٦-١١-٠٢): الغرفةُ المجمّعة (سجلّاتٌ تحت
   * أصحابها)، والغرفةُ المرتّبة يدويًّا — ترتيبُها تسلسلٌ واحد (1، 2، 3…) والشبكةُ ترسمه متعرّجًا بين صفّين، فيلتبس «قبلَه»
   * و«بعدَه» ويغرب السحبُ بين الصفوف. فلا زرَّ للكروت فيهما، ويُشترط `renderRow` و`table`.
   */
  const listOnly = (!!group || sortable) && !!renderRow && !!table;
  const view: "cards" | "list" = listOnly || (viewKey && savedView === "table" && renderRow && table) ? "list" : "cards";
  const twoViews = !!viewKey && !!renderRow && !!table && !listOnly;
  // التحديدُ في الجدول وحده: الجدولُ عرضُ الإدارة، والتذكرةُ للتصفّح
  const selectable = canPick && view === "list";

  // رمزُ الغرفة في الفراغ **من خريطة الشريط نفسِها** (مصدرٌ واحد): ما ضغطه العضوُ في الشريط هو ما يراه في المربّع،
  // وكلُّ غرفةٍ تنتقل إلى القالب تأخذ رمزَها بلا سطر. (كانت كلُّ غرفةٍ تمرّره بيدها: `emptyIcon`.)
  const iconKey = navPath ? roomIconKey(navPath) : null;
  const RoomIcon = iconKey ? ICONS[iconKey] : null;
  const roomIcon = RoomIcon ? <RoomIcon /> : undefined;
  const roomCrumb = useRoomCrumb(navPath ?? "", title);
  const crumb = navPath ? roomCrumb : undefined;

  const q = query.trim();
  // المرشّحُ يُحسب ما دام ظاهرًا وقيمتُه من خياراته: مرشّحٌ اختفى (خيارٌ واحدٌ بقي) أو قيمةٌ سقطت لا تُبقي القائمةَ مصفّاةً بلا حبّةٍ تُمسح
  const live = (f: FilterDef<T>) => !!fv[f.key] && f.options.some((o) => o.value === fv[f.key]);
  const applies = (f: FilterDef<T>, pos: string) => !f.in || f.in.includes(pos);
  const current = positions.find((p) => p.key === position) ?? positions[0] ?? ALL;
  const filtering = !!q || filters.some((f) => live(f) && applies(f, current.key));
  const matches = useMemo(
    () => (item: T, pos: string) =>
      (!q || matchSearch(item, q)) && filters.every((f) => !live(f) || !applies(f, pos) || f.match(item, fv[f.key])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `live` و`applies` يقرآن fv وfilters نفسَيهما
    [q, fv, filters, matchSearch],
  );

  const inPos = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const p of positions.length ? positions : [ALL]) map.set(p.key, ordered.filter((i) => p.match(i) && matches(i, p.key)));
    return map;
  }, [ordered, positions, matches, ALL]);
  const [sort, setSort] = useState<AdSort | null>(null);
  const sorter = (key: string) =>
    key === AD_HEAD ? table?.headSortBy : table?.stub?.key === key ? table.stub.sortBy : table?.columns.find((c) => c.key === key)?.sortBy;
  // أعمدةُ الرأس بلا دوالّ ترتيبها: يكفي الرأسَ أن يعرف أيُّها يُرتَّب
  const colHead = (c: TableColumn<T>) => { const { sortBy, ...rest } = c; return { ...rest, sortable: !!sortBy }; };
  const inCurrent = inPos.get(current.key) ?? [];
  const rankers = filters.filter((f) => f.rank && live(f) && applies(f, current.key));
  const found = rankers.length
    ? [...inCurrent].sort((a, b) => {
        for (const f of rankers) { const d = f.rank!(a, fv[f.key]) - f.rank!(b, fv[f.key]); if (d) return d; }
        return 0;
      })
    : inCurrent;
  const by = view === "list" && sort ? sorter(sort.key) : undefined;
  // ترتيبٌ ثابت (`sort` في JS ثابت): المتساويان يبقيان على ترتيب البيانات
  const sorted = by
    ? [...found].sort((a, b) => {
        const x = by(a), y = by(b);
        const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ar");
        return sort!.desc ? -d : d;
      })
    : found;
  // المجموعاتُ بترتيبها، والسجلّاتُ داخلها بالفرز من الرأس إن كان، وإلّا بترتيب المجموعة — ثمّ تُسطَّح فتُرقَّم الصفحاتُ بالسجلّات
  const groups = useMemo(() => {
    if (!group) return null;
    const m = new Map<string, T[]>();
    for (const it of sorted) { const k = group.of(it); const l = m.get(k); if (l) l.push(it); else m.set(k, [it]); }
    const list = [...m.values()].map((l) => (by || !group.inner ? l : [...l].sort(group.inner)));
    if (group.order) list.sort(group.order);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `group` و`by` يُبنيان في كلّ رسم؛ ما يغيّر النتيجةَ هو `sorted`
  }, [sorted]);
  const rows = groups ? groups.flat() : sorted;
  const groupOf = useMemo(() => {
    const m = new Map<T, T[]>();
    for (const g of groups ?? []) for (const it of g) m.set(it, g);
    return m;
  }, [groups]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pg = Math.min(page, pages); // بحثٌ قلّص القائمةَ تحت الصفحة المحفوظة: آخرُ صفحةٍ قائمة
  const visible = rows.slice((pg - 1) * PAGE, pg * PAGE);

  const plates = positions.map((p) => {
    const list = inPos.get(p.key) ?? [];
    return { key: p.key, label: p.label, count: list.length, rare: p.rare };
  });

  // الصفحةُ في الرابط ما لم يكن بحثٌ أو تصفية: الرجوعُ يعيد القائمةَ بلا بحثها، فصفحتُها الثالثة لا معنى لها هناك
  const setPage = (n: number) => { setPageState(n); writeUrl(current.key, filtering ? 1 : n); };
  // التحديدُ يتبع ما يُرى: تغييرُ الموضع أو البحث أو التصفية يُسقطه (لا يُحذف ما لم يعد ظاهرًا)
  const unpick = () => setSel((s) => (s.size ? new Set() : s));
  const choose = (key: string) => { setPosition(key); setPageState(1); writeUrl(key, 1); unpick(); };
  const clear = () => { setQuery(""); setFv({}); setPage(1); unpick(); };
  // كلُّ سجلٍّ يعرف معرّفَه من سياقه، فالسطرُ والتذكرةُ يرسمان مربّعَهما بلا سطرٍ في الغرفة
  const pageIds = selectable ? visible.map((i) => idOf!(i)) : [];
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pickPage = (on: boolean) => setSel((s) => { const n = new Set(s); pageIds.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  // السحبُ في القائمة كما رُتّبت: لا أثناء البحث أو التصفية (ترتيبُ قائمةٍ ناقصةٍ يخفي ما بين سجلّاتها)، ولا والجدولُ مفروزٌ من رأسه
  // — والرقمُ يبقى في كلّ ذلك
  const canDrag = sortable && !filtering && !(view === "list" && sort) && !pair;
  const why = canDrag ? undefined : filtering
    ? `الترتيبُ بالسحب متوقّفٌ أثناء ${filters.length ? "البحث والتصفية" : "البحث"}`
    : "الترتيبُ بالسحب متوقّفٌ والجدولُ مفروزٌ من رأسه";
  const visIds = sortable ? visible.map(idOf!) : [];
  const wrap = (item: T, render: (item: T) => ReactNode) => {
    let el = selectable ? <AdPickItem key={idOf!(item)} id={idOf!(item)}>{render(item)}</AdPickItem> : render(item);
    if (sortable) {
      const id = idOf!(item);
      const i = visIds.indexOf(id);
      el = (
        <SortItem key={id} id={id} label={reorder!.title(item)} n={placeAt.get(id) ?? 0} on={canDrag} why={why}
          prev={i > 0} next={i >= 0 && i < visIds.length - 1} onStep={(dir) => { const to = visIds[i + dir]; if (to) { snap(); onMove(id, to); } }}>
          {el}
        </SortItem>
      );
    }
    return el;
  };
  // **النقلُ بالسهم يُرى سفرًا لا قفزة** (محمد ٢٠٢٦-١١-٠١: «في الكروت التبديلُ صعبٌ وغريب»): كان السجلّان يتبادلان مكانيهما في
  // لحظة، وفي شبكةٍ من عمودين ينتقل الكرتُ من آخر صفٍّ إلى أوّل الذي بعده فلا يُدرى أين ذهب. فتُحفظ أماكنُ السجلّات قبل النقل،
  // ثمّ يبدأ كلٌّ ممّا تغيّر مكانُه من مكانه القديم ويمضي إلى الجديد (FLIP) — والسحبُ لا يحتاجه: اليدُ أوصلته
  const flip = useRef<Map<string, DOMRect> | null>(null);
  const snap = () => {
    const room = head.current?.parentElement;
    if (!room || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    flip.current = new Map([...room.querySelectorAll<HTMLElement>("[data-sort-id]")].map((el) => [el.dataset.sortId!, el.getBoundingClientRect()]));
  };
  useLayoutEffect(() => {
    const before = flip.current;
    const room = head.current?.parentElement;
    if (!before || !room) return;
    flip.current = null;
    // زمنُ الحركة ومنحناها من الهويّة (`tokens.css`): ما يتحرّك على الشاشة
    const css = getComputedStyle(room);
    const dur = css.getPropertyValue("--ad-dur-lift").trim(); // المتصفّحُ يعيده بوحدته كما يشاء («.28s» لا «280ms»)
    const duration = (parseFloat(dur) || 0) * (dur.endsWith("ms") ? 1 : 1000);
    const easing = css.getPropertyValue("--ad-ease-io").trim() || "ease";
    for (const el of room.querySelectorAll<HTMLElement>("[data-sort-id]")) {
      const was = before.get(el.dataset.sortId!);
      if (!was) continue;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left, dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing });
    }
  }, [ordered]);
  // المسحوبُ يأخذ مكانَ ما أُفلت عليه بين الظاهر، والظاهرُ يبقى في خاناته من القائمة كلِّها (صفحةٌ من خمسين لا تمسّ غيرها)
  const onMove = (from: string, to: string) => {
    if (!reorder || !idOf) return;
    const vis = visible.map(idOf);
    const i = vis.indexOf(from), j = vis.indexOf(to);
    if (i < 0 || j < 0) return;
    const next = arrayMove(vis, i, j);
    const shown = new Set(vis);
    let k = 0;
    const ids = ordered.map(idOf).map((id) => (shown.has(id) ? next[k++] : id));
    setMoved({ base: items, ids });
    const q = saves.current;
    q.pending++;
    startSave(async () => {
      const r = await reorder.save(ids);
      q.pending--;
      if (!r.ok && !q.failed) { q.failed = true; toast.error(r.message); }
      if (q.pending > 0) return;
      // آخرُ النقلات: رسالةٌ واحدة، ثمّ الترتيبُ من الخادم (إن فشل شيءٌ عاد ما حُفظ فعلًا)
      if (q.failed) { q.failed = false; setMoved(null); } else toast.success(r.message);
      router.refresh();
    });
  };
  const titles = useMemo(() => new Map(reorder && idOf ? items.map((x) => [idOf(x), reorder.title(x)]) : []), [reorder, idOf, items]);
  const sortArea = (node: ReactNode) =>
    sortable ? (
      <SortArea ids={visible.map(idOf!)} total={ordered.length} nameOf={(id) => titles.get(id) ?? ""} placeOf={(id) => placeAt.get(id) ?? 0} onMove={onMove}>
        {node}
      </SortArea>
    ) : node;
  const turn = (n: number) => {
    setPage(n);
    unpick(); // التحديدُ يتبع ما يُرى: صفحةٌ أخرى سجلّاتٌ أخرى
    // الصفحةُ الجديدة تُقرأ من أوّلها: يرجع النظرُ إلى شريط الأدوات فوق القائمة
    const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    head.current?.parentElement?.querySelector<HTMLElement>(".ad-tools")?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  };
  // أوّلُ ضغطةٍ بالاتّجاه الطبيعيّ (الأرقامُ من الأكبر، والنصوصُ من الألف)، والثانيةُ تعكس، والثالثةُ تعيد ترتيبَ البيانات
  const onSort = (key: string) => {
    const get = sorter(key);
    if (!get) return;
    const first = found.length > 0 && typeof get(found[0]) === "number";
    setSort((s) => (!s || s.key !== key ? { key, desc: first } : s.desc === first ? { key, desc: !first } : null));
    setPage(1);
    unpick();
  };
  const elsewhere = filtering && rows.length === 0 ? plates.filter((p) => p.key !== current.key && p.count > 0) : [];

  const adFilters: AdFilter[] = filters.filter((f) => applies(f, current.key)).map((f) => ({
    key: f.key, label: f.label, options: f.options, value: fv[f.key] ?? "",
    onChange: (v) => { setFv((prev) => ({ ...prev, [f.key]: v })); setPage(1); unpick(); },
  }));

  const counted = arCount(rows.length, noun);
  // «النتائج: 5 أخبار» لا «5 أخبار تطابق»: الفعلُ بعد العدد يتصرّف بجنسه وعدده وعاقله («خبرٌ يطابق»، «أعضاءٌ يطابقون»)
  const count = filtering ? `النتائج: ${counted}` : counted;
  // المحدَّدُ ما بقي منه في القائمة: سجلٌّ خرج من الموضع بعد فعلٍ (أُرشف فانتقل) لا يبقى محدَّدًا بلا علامة
  const rowIds = new Set(idOf ? rows.map((i) => idOf(i)) : []);
  const picked = [...sel].filter((id) => rowIds.has(id));

  /** السجلّاتُ الظاهرةُ مقسومةً على مجموعاتها بترتيبها — ورأسُ كلّ مجموعةٍ من سجلّاتها كلِّها لا من صفحتها وحدها */
  const segments = (list: T[]) => {
    const out: { key: string; all: T[]; items: T[] }[] = [];
    for (const it of list) {
      const all = groupOf.get(it)!;
      const key = group!.of(it);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(it); else out.push({ key, all, items: [it] });
    }
    return out;
  };

  let body: ReactNode;
  if (items.length === 0) {
    body = <AdEmpty icon={roomIcon} title={emptyAll.title} desc={emptyAll.desc} action={createAction} />;
  } else if (rows.length === 0 && filtering) {
    body = elsewhere.length > 0 ? (
      <AdEmpty
        icon={<MagnifyingGlass />}
        title={`لا نتائج في «${current.label}»`}
        desc="لكنّ بحثك طابق في مواضع أخرى:"
        action={
          <span className="ad-empty-acts">
            {elsewhere.map((p) => (
              <AdButton key={p.key} variant="soft" size="sm" onClick={() => choose(p.key)}>{`${p.label} ${p.count}`}</AdButton>
            ))}
            <AdButton variant="soft" size="sm" icon={<X className="ad-line" />} onClick={clear}>مسح البحث</AdButton>
          </span>
        }
      />
    ) : (
      <AdEmpty
        icon={<MagnifyingGlass />}
        title="لا نتائج لبحثك"
        desc="لم نعثر على ما يطابق بحثك أو المرشّح."
        action={<AdButton variant="soft" icon={<X />} onClick={clear}>مسح المرشّحات</AdButton>}
      />
    );
  } else if (rows.length === 0) {
    // الموضعُ الخالي لا يقف عند «لا شيء»: يدلّ على أقرب موضعٍ فيه عمل (مسودّتان تنتظران مثلًا)
    const next = plates.find((p) => p.key !== current.key && p.count > 0 && positions.find((x) => x.key === p.key)?.canCreate);
    body = (
      <AdEmpty
        icon={roomIcon}
        title={current.empty}
        action={
          next || current.canCreate ? (
            <>
              {next && <AdButton variant="soft" onClick={() => choose(next.key)}>{`افتح «${next.label}» (${next.count})`}</AdButton>}
              {current.canCreate && createAction}
            </>
          ) : undefined
        }
      />
    );
  } else if (pair && renderRow && table) {
    // **مراجعةُ العرضين** (`?f=pair`، في التطوير وحده — محمد ٢٠٢٦-١١-٠١: «أحكم بالرؤية»): كلُّ سجلٍّ بكرته وسطره جنبًا إلى جنب،
    // فيُرى بنظرةٍ أنّ العرضين يقولان الشيءَ نفسَه بالترتيب نفسِه — أداةُ نقل الغرف، لا عرضٌ للأعضاء
    body = (
      <div className="ad-pairs">
        {visible.map((item, i) => (
          <div key={idOf ? idOf(item) : i} className="ad-pair">
            {renderCard(item)}
            <AdList label={title} head={table.head} columns={table.columns.map(colHead)} stub={table.stub && colHead(table.stub)}>
              {renderRow(item)}
            </AdList>
          </div>
        ))}
      </div>
    );
  } else if (view === "list" && renderRow && table) {
    body = sortArea(
      <AdList
        label={title}
        head={table.head}
        columns={table.columns.map(colHead)}
        stub={table.stub && colHead(table.stub)}
        grip={sortable}
        headSortable={!!table.headSortBy}
        sort={sort}
        onSort={onSort}
        select={selectable ? { all: pageIds.length > 0 && pageIds.every((id) => sel.has(id)), some: pageIds.some((id) => sel.has(id)), onAll: pickPage } : undefined}
        foot={<AdPager inTable page={pg} size={PAGE} total={rows.length} noun={noun} onPage={turn} />}
      >
        {groups
          ? segments(visible).map((sg) => (
              <Fragment key={sg.key}>
                <div className="ad-tr ad-tgroup" role="row"><div className="ad-tgroup-cell" role="cell">{group!.head(sg.all)}</div></div>
                {sg.items.map((item) => wrap(item, renderRow))}
              </Fragment>
            ))
          : visible.map((item) => wrap(item, renderRow))}
      </AdList>,
    );
  } else {
    body = (
      <>
        {sortArea(<div className="ad-grid">{visible.map((item) => wrap(item, renderCard))}</div>)}
        <AdPager page={pg} size={PAGE} total={rows.length} noun={noun} onPage={turn} />
      </>
    );
  }

  return (
    <AdPickScope value={selectable ? { selected: sel, toggle } : null}>
    <AdRoom label={title}>
      <div ref={head} className="ad-room-head">
        <RoomPlate title={title} crumb={crumb} action={action} extra={extra} />
        {plates.length > 1 && <AdSwitch positions={plates} position={current.key} onPosition={choose} />}
      </div>
      {notice}
      {selectable && picked.length > 0 ? (
        <AdSelBar
          count={picked.length}
          noun={noun}
          ops={bulkOps(picked)}
          // الشريطُ يعود شريطَ أدوات فيختفي الزرّ: التركيزُ إلى البحث لا إلى أوّل الصفحة
          onClear={() => { unpick(); requestAnimationFrame(() => head.current?.parentElement?.querySelector<HTMLInputElement>(".ad-search-input")?.focus()); }}
        />
      ) : (
        <AdTools
          search={{ value: query, onChange: (v) => { setQuery(v); setPage(1); unpick(); }, placeholder: searchPlaceholder }}
          filters={adFilters}
          view={twoViews ? { value: view, onChange: (v) => { setView(v === "list" ? "table" : "cards"); unpick(); } } : undefined}
          count={rows.length > 0 ? count : undefined}
        />
      )}
      {body}
      {after}
    </AdRoom>
    </AdPickScope>
  );
}

/**
 * العرضُ المختار: يبدأ بما قرأه الخادم (فالرسمُ الأوّل صحيح)، ويُحفظ في كوكي يقرؤه الخادمُ في الزيارة القادمة. ومن اختار
 * قبل الكوكي (في `localStorage` بالمفتاح نفسِه، كالغرف القديمة) يُنقل اختيارُه مرّةً واحدة.
 */
function useRoomView(key: string | undefined, initial: RoomView = "cards"): [RoomView, (v: RoomView) => void] {
  const [view, setViewState] = useState<RoomView>(initial);
  const save = (v: RoomView) => {
    setViewState(v);
    if (!key) return;
    document.cookie = `${viewCookie(key)}=${v}; path=/; max-age=31536000; samesite=lax`;
    try { localStorage.setItem(key, v); } catch { /* التخزينُ ممنوعٌ في التصفّح الخاصّ: الكوكي يكفي */ }
  };
  useEffect(() => {
    if (!key || document.cookie.split("; ").some((c) => c.startsWith(`${viewCookie(key)}=`))) return;
    let old: RoomView | null = null;
    try { old = asView(localStorage.getItem(key)); } catch { /* لا تخزين */ }
    if (!old) return;
    document.cookie = `${viewCookie(key)}=${old}; path=/; max-age=31536000; samesite=lax`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- نقلٌ لمرّةٍ واحدة من localStorage الذي لا يقرؤه الخادم (انظر أعلاه)
    setViewState(old);
  }, [key]);
  return [view, save];
}
