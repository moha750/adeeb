import { HOME } from "@/lib/capabilities";
import { NAV, type NavGroup } from "./nav";

/**
 * اشتقاق فتات المسار من **خريطة التنقّل نفسها** — لا سلسلةَ نصٍّ تُكتب في كلّ شاشة.
 *
 * الشاشات كانت تكتب مسارها بيدها، فتفرّقت: «العضوية» في شاشةٍ و«أعضاء أديب» في أختها لِما
 * هو رأسُ مجموعةٍ واحد، و«الصفحة الرئيسية» مقطعٌ لا وجود له في الخريطة ولا مسارَ له. والمقطع
 * كان نصًّا ميّتًا في ٧٠ موضعًا من ٧٣ — يسمّي صفحةً موجودةً ولا يُنقر. فالجذر: يُشتقّ من
 * `NAV` فلا يكذب، وأيّ تعديلٍ في الخريطة يتبعه المسار في اللوحة كلّها.
 *
 * **وطبقاتُه ثلاثٌ لا أربع:** الجذر (`أديب` = `HOME`) · رأسُ المجموعة (`العضوية`/`التفاعل`/
 * `المحتوى`/`النظام`) **بلا `href` أصلًا** فهو تصنيفٌ لا صفحة · ثمّ البند. ورأسُ المجموعة
 * لا يُترَك ميّتًا ولا يُحذَف: يصير **زنادًا** يفتح أخواته (المرشَّحة بقدرات صاحبها) — فيتحوّل
 * من لافتةٍ إلى تنقّلٍ جانبيّ.
 */
export type CrumbStep =
  /** نصٌّ خامد — الجذر حين نكون عليه (لا يُربَط بنفسه) */
  | { kind: "text"; label: string }
  | { kind: "link"; label: string; href: string }
  /** رأسُ المجموعة: زنادٌ يفتح أخواته */
  | { kind: "group"; label: string; siblings: { label: string; href: string }[] }
  /** الصفحة الحاليّة — آخر المقاطع، لا تُنقر */
  | { kind: "leaf"; label: string };

/** جذرُ المسار — الاسمُ الذي يقوله عنوانُ كلّ صفحةٍ في تبويب المتصفّح (`layout.tsx`)، فلا
 *  يفترق ما تقرؤه في التبويب عمّا تقرؤه في الفتات. */
const ROOT = "بوّابة أديب";

/** بنود المجموعة مسطَّحةً — المجموعة القابلة للطيّ تُفكّ إلى أوراقها، ومن لا مسارَ له يسقط. */
function leaves(g: NavGroup): { label: string; href: string }[] {
  return g.items.flatMap((it) => it.children ?? (it.href ? [{ label: it.label, href: it.href }] : []));
}

/**
 * @param visible الخريطة كما يراها صاحب القدرات (`navFor`) — منها تُبنى أخواتُ المنسدل، فلا
 *   يُعرَض بندٌ لا مفتاحَ له. أمّا **مطابقة المسار** فمن `NAV` كاملةً: من كان على صفحةٍ فهو
 *   يفتحها بحكم وجوده فيها، ولا معنى لأن يفقد مسارَه لأنّ ترشيحًا أسقط بندَها.
 * @param leaf اسم الصفحة الحاليّة حين لا يقوله بندُ الخريطة (سجلٌّ بعينه · «تحرير» · «معاينة»).
 */
export function crumbFor(pathname: string, visible: NavGroup[], leaf?: string): CrumbStep[] {
  const steps: CrumbStep[] = [
    pathname === HOME ? { kind: "text", label: ROOT } : { kind: "link", label: ROOT, href: HOME },
  ];

  // صاحبُ المسار: أطولُ بندٍ مسارُه بادئةُ المسار الحاليّ. والصدر (`HOME`) بادئةُ كلّ شيء،
  // فيُطابَق تمامًا ويُستثنى من البادئة — وإلّا صارت «عضويتي» جدَّ كلّ صفحة في اللوحة.
  let owner: { group: NavGroup; label: string; href: string } | null = null;
  for (const g of NAV) {
    for (const l of leaves(g)) {
      const hit = l.href === pathname || (l.href !== HOME && pathname.startsWith(l.href + "/"));
      if (hit && (!owner || l.href.length > owner.href.length)) owner = { group: g, label: l.label, href: l.href };
    }
  }

  if (owner?.group.head) {
    const head = owner.group.head;
    const siblings = leaves(visible.find((g) => g.head === head) ?? { items: [] });
    steps.push({ kind: "group", label: head, siblings });
  }
  // **الفتات لا تنتهي برابطٍ أبدًا** — آخرُها الصفحةُ التي أنت فيها. فالبندُ يصير رابطًا
  // **حين تُسمّى الورقة** (سجلٌّ · «تحرير» · «معاينة») ويقف قبلها؛ فإن لم تُسمَّ — كشاشة
  // «لا صلاحية» أو خطأِ جلبٍ على مسارٍ فرعيّ — وقف البندُ نفسُه ورقةً، فهو أقربُ مكانٍ له اسم.
  if (leaf && owner && owner.href !== pathname) steps.push({ kind: "link", label: owner.label, href: owner.href });

  const tail = leaf ?? owner?.label ?? null;
  if (tail) steps.push({ kind: "leaf", label: tail });

  return steps;
}
