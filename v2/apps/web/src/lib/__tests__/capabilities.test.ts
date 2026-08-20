import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DASHBOARD_CAPS, HOME, SECTION_CAP, canOpen, type NavHref } from "@/lib/capabilities";

/**
 * أقفالُ اللوحة — والمِعيارُ ههنا **يقرأ القرص** لا الخريطةَ وحدها.
 *
 * فالخريطةُ تُراجَع بالعين ويُظنّ أنّها تامّة، والغرفةُ الجديدة تُبنى ويُنسى قفلُها فلا يقول
 * ذلك بناءٌ ولا مراجعة: بندُ التنقّل يُخفى، والمسارُ يبقى يُكتب في شريط العنوان. فالاختباران
 * الأخيران أدناه يمشيان في شجرة `app/dashboard` صفحةً صفحة، ويقارنان ما على القرص بما في
 * الخريطة وبما في الحرّاس.
 */

/* ══ قراءةُ الشجرة من القرص ═══════════════════════════════════════════ */

const DASHBOARD_DIR = fileURLToPath(new URL("../../app/dashboard", import.meta.url));

/** كلُّ صفحةٍ تحت اللوحة: مسارُها كما يُكتب في المتصفّح، ومتنُها كما هو. */
function dashboardPages(dir = DASHBOARD_DIR, route = "/dashboard"): { route: string; source: string }[] {
  const out: { route: string; source: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // المجلّدات الخاصّة (`_shell` · `_components` · `__tests__`) ليست مقاطعَ مسار
      if (entry.name.startsWith("_")) continue;
      out.push(...dashboardPages(join(dir, entry.name), `${route}/${entry.name}`));
    } else if (entry.name === "page.tsx") {
      out.push({ route, source: readFileSync(join(dir, entry.name), "utf8") });
    }
  }
  return out;
}

const PAGES = dashboardPages();

/** المقطعُ الديناميكيّ يطابق أيَّ اسم، والجامعُ يطابق ما بقي. */
function routeMatches(pattern: string, path: string): boolean {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith("[...")) return s.length >= i;
    if (s[i] === undefined) return false;
    if (p[i].startsWith("[")) continue;
    if (p[i] !== s[i]) return false;
  }
  return p.length === s.length;
}

/** حرّاسُ الصفحة المكتوبون نصًّا: `denyUnless("/dashboard/…")`. */
const guardsIn = (source: string): string[] =>
  [...source.matchAll(/denyUnless\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);

/* ══ الخريطة في نفسها ═════════════════════════════════════════════════ */

describe("SECTION_CAP", () => {
  it("لكلّ مسارٍ قفلٌ نصّيٌّ غيرُ فارغ", () => {
    for (const [section, cap] of Object.entries(SECTION_CAP)) {
      expect(typeof cap, section).toBe("string");
      expect(cap.trim(), section).not.toBe("");
    }
  });

  it("كلُّ مفتاحٍ مسارٌ مطلقٌ تحت اللوحة", () => {
    for (const section of Object.keys(SECTION_CAP)) {
      expect(section === "/dashboard" || section.startsWith("/dashboard/"), section).toBe(true);
      expect(section.endsWith("/"), section).toBe(false);
    }
  });

  it("صدرُ اللوحة مفتاحٌ في الخريطة", () => {
    expect(SECTION_CAP[HOME]).toBe("view_own_membership");
  });
});

describe("DASHBOARD_CAPS", () => {
  it("هي قيمُ الخريطة بلا تكرار، لا أقلّ ولا أكثر", () => {
    expect([...DASHBOARD_CAPS].sort()).toEqual([...new Set(Object.values(SECTION_CAP))].sort());
  });

  it("لا تكرارَ فيها", () => {
    expect(DASHBOARD_CAPS.length).toBe(new Set(DASHBOARD_CAPS).size);
  });

  // من لا يملك أيًّا منها يُردّ عند الباب (`lib/auth.ts` يبني `isAdmin` منها)
  it("كلُّ قفلٍ في الخريطة موجودٌ فيها", () => {
    for (const cap of Object.values(SECTION_CAP)) expect(DASHBOARD_CAPS).toContain(cap);
  });
});

describe("canOpen", () => {
  it("يفتح المسار لمن يحمل قفلَه", () => {
    expect(canOpen(["manage_surveys"], "/dashboard/surveys")).toBe(true);
  });

  it("يردّ من يحمل قدراتٍ أخرى", () => {
    expect(canOpen(["manage_news", "manage_radio"], "/dashboard/surveys")).toBe(false);
  });

  it("يردّ من لا قدرةَ له", () => {
    expect(canOpen([], "/dashboard/surveys")).toBe(false);
  });

  it("قفلٌ واحدٌ يفتح غرفَ الموضوع الواحد (عضويّتي · ملفّي · إعداداتي · مهامّي)", () => {
    const caps = ["view_own_membership"];
    expect(canOpen(caps, "/dashboard")).toBe(true);
    expect(canOpen(caps, "/dashboard/profile")).toBe(true);
    expect(canOpen(caps, "/dashboard/settings")).toBe(true);
    expect(canOpen(caps, "/dashboard/tasks")).toBe(true);
  });

  // «لا مفتاحَ يفتح أربعة أبواب»: من مُنح أعياد الميلاد لم يُمنح سجلَّ الأعضاء
  it("مفتاحُ غرفةٍ لا يفتح غرفةً أخرى", () => {
    expect(canOpen(["view_birthdays"], "/dashboard/members/birthdays")).toBe(true);
    expect(canOpen(["view_birthdays"], "/dashboard/members/active")).toBe(false);
    expect(canOpen(["manage_sponsors"], "/dashboard/website/works")).toBe(false);
  });

  /**
   * **لا يحلّ التداخل**: `canOpen` سؤالٌ عن مسارِ **قسم** لا عن أيّ رابط. والصفحةُ الفرعيّة
   * تستعير قفلَ قسمها بأن **يُنادى الحارسُ بمسار القسم** (`denyUnless("/dashboard/surveys")`
   * في `/surveys/new`)، لا بأن تشتقّه هذه الدالّة. فلو مُرّر إليها مسارٌ فرعيّ ردّت — وهو
   * الفشلُ الآمن المقصود، وليس عيبًا يُصلَح بجعلها تبحث عن أطول بادئة.
   */
  it("يردّ المسار الفرعيّ لأنّه ليس قسمًا: القسمُ يُمرَّر صراحةً", () => {
    expect(canOpen(["manage_surveys"], "/dashboard/surveys/new" as NavHref)).toBe(false);
  });

  it("يردّ المسار المجهول بلا رميٍ (قفلُه `undefined` فلا يطابق شيئًا)", () => {
    expect(canOpen(["manage_surveys"], "/dashboard/ghost" as NavHref)).toBe(false);
    expect(canOpen([], "" as NavHref)).toBe(false);
  });
});

/* ══ الخريطةُ مقابلَ القرص ════════════════════════════════════════════ */

describe("الخريطة والقرص", () => {
  it("قُرئت صفحاتُ اللوحة فعلًا (فلا يمرّ الحارسُ لأنّه لم يجد شيئًا)", () => {
    expect(PAGES.length).toBeGreaterThan(40);
    expect(PAGES.map((p) => p.route)).toContain("/dashboard");
  });

  // قفلٌ لمسارٍ لا وجودَ له وسخٌ يُبقي غرفةً ميتةً في الخريطة وفي بند التنقّل
  it("كلُّ مسارٍ في الخريطة تخدمه صفحةٌ على القرص", () => {
    const patterns = PAGES.map((p) => p.route).filter((r) => !r.includes("[..."));
    const orphans = Object.keys(SECTION_CAP).filter((s) => !patterns.some((p) => routeMatches(p, s)));
    expect(orphans).toEqual([]);
  });

  it("كلُّ حارسٍ مكتوبٍ في صفحةٍ يسمّي مسارًا في الخريطة", () => {
    const unknown: string[] = [];
    for (const page of PAGES) {
      for (const section of guardsIn(page.source)) {
        if (!(section in SECTION_CAP)) unknown.push(`${page.route} ⇐ ${section}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  /**
   * **الجائزةُ الحقيقيّة**: غرفةٌ جديدة بلا قفل.
   *
   * إخفاءُ بند التنقّل ليس حراسة (تعليقُ `guard.tsx` بنصّه) — الحارسُ هو `denyUnless`.
   * فكلُّ `page.tsx` تحت اللوحة يجب أن يحرس نفسَه، وما لا يحرس يُسمّى ههنا **بعلّته**.
   * والمقارنةُ **مساواةٌ تامّة** لا احتواء: فلو بُنيت غرفةٌ جديدة بلا حارس سقط الاختبار
   * من فوره، ولو حُرست إحدى المستثنَيات وجب حذفُها من القائمة.
   */
  it("لا صفحةَ لوحةٍ بلا حارس، إلّا الأربع الموصوفة بعلّتها", () => {
    const EXEMPT: Record<string, string> = {
      // لا شاشةَ فيه: يرمي `notFound()` فيلتقطه حدُّ اللوحة، فلا يقع خلفه شيءٌ يُحرَس
      "/dashboard/[...slug]": "مسارٌ جامعٌ يرمي notFound",
      // تحويلٌ محضٌ إلى `/dashboard/members/active` وهو محروس
      "/dashboard/members": "تحويلٌ إلى قسمٍ محروس",
      // يحرس بـ`denyUnless(locked.section)`، والقيمةُ من خريطةٍ نوعُها `Section` فيحرسها المترجم
      "/dashboard/members/[status]": "حارسٌ بمتغيّرٍ نوعُه Section",
      // يحرس بيده على `view_election_candidates` لأنّه يفرّع بعدها بـ`manage_elections`
      "/dashboard/elections/[id]": "حارسٌ يدويّ على قفل القسم نفسِه",
    };

    /**
     * **لا غرفةَ بلا قفل.** كانت هنا واحدةٌ (`/dashboard/components`): الخريطةُ تقول إنّ قفلَه
     * `manage_permissions`، وصفحتُه `"use client"` بلا حارسٍ البتّة — فيفتحها كلُّ من دخل
     * اللوحة بأيّ قفلٍ كان. كشفها هذا الاختبارُ يومَ كُتب (٢٠٢٦-٠٨-١٦) وأُغلقت في يومها:
     * قُسمت الصفحةُ خادميّةً تحرس وجسدًا عميليًّا يُعرَض (`ComponentsGallery.tsx`).
     *
     * والقائمةُ تبقى فارغةً عمدًا: أيُّ غرفةٍ تُبنى بلا `denyUnless` تُسقط هذا الاختبارَ فورًا،
     * ولا سبيلَ إلى إسكاته إلّا بكتابة اسمِها هنا صراحةً — وذاك قرارٌ يُرى في المراجعة.
     */
    const KNOWN_UNLOCKED: string[] = [];

    const unguarded = PAGES
      .filter((p) => guardsIn(p.source).length === 0 && !(p.route in EXEMPT))
      .map((p) => p.route)
      .sort();

    expect(unguarded).toEqual([...KNOWN_UNLOCKED].sort());
  });
});
