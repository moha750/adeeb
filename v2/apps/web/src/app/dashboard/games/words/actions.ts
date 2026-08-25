"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGamesManager } from "@/lib/games/authz";
import { LIMITS, cleanText, parseBulkWords } from "../vocab";

export type BankResult = { ok: boolean; message: string; id?: string };

export type BankWordInput = {
  word: string;
  hint: string;
  category: string;
};

/**
 * التحقّقُ المشترك — نفسُ قيود القاعدة برسائلَ عربيّة. يُنادى في الخادم دائمًا،
 * وفي المتصفّح تجربةً: **فحصُ العميل تجربةٌ لا حراسة**.
 */
function validate(input: BankWordInput): string | null {
  const word = cleanText(input.word);
  const category = cleanText(input.category);
  const hint = cleanText(input.hint);

  if (!word) return "الكلمةُ مطلوبة.";
  if (word.length > LIMITS.bankWordMax) return `الكلمةُ طويلة، الحدُّ ${LIMITS.bankWordMax} حرفًا.`;
  if (!category) return "التصنيفُ مطلوب.";
  if (category.length > LIMITS.bankCategoryMax) {
    return `التصنيفُ طويل، الحدُّ ${LIMITS.bankCategoryMax} حرفًا.`;
  }
  // **المعنى إجباريّ** (قرار المالك ٢٠٢٦-٠٨-٢٦) — ويحرسه `guess_word_bank_hint_check`
  // في القاعدة. وهذا يقول العلّةَ بالعربيّة قبل أن تُردّ الرحلةُ بعُطلٍ لاتينيّ.
  if (!hint) return "معنى الكلمة مطلوب.";
  if (hint.length > LIMITS.bankHintMax) return `المعنى طويل، الحدُّ ${LIMITS.bankHintMax} حرفًا.`;
  return null;
}

/** رسالةُ عطلٍ من القاعدة. التكرارُ له رسالتُه، وما سواه يُقال عامًّا ولا يُعرَض خامًا. */
function dbMessage(code: string | undefined, fallback: string): string {
  if (code === "23505") return "هذه الكلمةُ موجودةٌ في هذا التصنيف.";
  if (code === "42501") return "لا تملك قدرةَ إدارة الألعاب.";
  return fallback;
}

export async function createBankWord(input: BankWordInput): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data, error } = await sb
    .from("guess_word_bank")
    .insert({
      word: cleanText(input.word),
      hint: cleanText(input.hint),
      category: cleanText(input.category),
      // الهويّة تُقرأ من الجلسة هنا: لا يُؤتمن العميلُ على من كتب الصفّ.
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: dbMessage(error.code, "تعذّرت إضافةُ الكلمة.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "أُضيفت الكلمة.", id: data.id };
}

export async function updateBankWord(id: string, input: BankWordInput): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const sb = await createClient();
  const { error } = await sb
    .from("guess_word_bank")
    .update({
      word: cleanText(input.word),
      hint: cleanText(input.hint),
      category: cleanText(input.category),
    })
    .eq("id", id);

  if (error) return { ok: false, message: dbMessage(error.code, "تعذّر حفظُ الكلمة.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "حُفظت الكلمة." };
}

/**
 * التعطيلُ لا الحذف — وهو الفعلُ المعتاد.
 *
 * الكلمةُ المعطَّلةُ لا تُسحَب في غرفةٍ جديدة، ويبقى أثرُها في غرفٍ لُعِبت. والغرفةُ
 * المنتهيةُ لا تتأثّر أصلًا: نصُّ الكلمة **منسوخٌ** فيها لا مُشارٌ إليه.
 */
export async function setBankWordActive(id: string, active: boolean): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const sb = await createClient();
  const { error } = await sb.from("guess_word_bank").update({ active }).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error.code, "تعذّر تغييرُ الحال.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: active ? "عادت الكلمةُ للخدمة." : "عُطّلت الكلمة." };
}

/**
 * الحذفُ النهائيّ. لا يُعرَض إلّا في نافذة تأكيد.
 *
 * ولا يُفرِغ غرفةً منتهية: `source_word_id` يُصفَّر بـ`on delete set null` والنصُّ
 * المنسوخُ باقٍ في `guess_word_words`. أيْ أنّ ما ضاع هو **أثرُ المصدر** وحدَه.
 */
export async function deleteBankWord(id: string): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const sb = await createClient();
  const { error } = await sb.from("guess_word_bank").delete().eq("id", id);
  if (error) return { ok: false, message: dbMessage(error.code, "تعذّر حذفُ الكلمة.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "حُذفت الكلمة." };
}

/* ────────────────────────── اللصقُ الجماعيّ ────────────────────────── */

export type BulkResult = BankResult & { added?: number; skipped?: number };

/**
 * **إضافةُ قائمةٍ ملصوقةٍ دفعةً واحدة.**
 *
 * والتحليلُ يقع **مرّتين**: في المتصفّح ليرى الكاتبُ معاينتَه قبل الحفظ، وهنا حراسةً.
 * فحصُ العميل تجربةٌ لا حراسة، ومن نادى الفعلَ مباشرةً يُردّ بالقاعدة نفسِها.
 *
 * **والمكرَّرُ يُتخطّى ولا يُسقِط الدفعة:** من يلصق ثلاثين كلمةً فيها اثنتان موجودتان
 * سلفًا يريد الثمانيَ والعشرين، لا رسالةَ عطلٍ تردّ الكلَّ. و`ignoreDuplicates` تُنفّذها
 * القاعدةُ ذرّيًّا على قيد `(category, word)`، فلا سباقَ بين قراءةٍ وكتابة.
 */
export async function createBankWords(rawText: string, category: string): Promise<BulkResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const cat = cleanText(category);
  if (!cat) return { ok: false, message: "التصنيفُ مطلوب." };
  if (cat.length > LIMITS.bankCategoryMax) {
    return { ok: false, message: `التصنيفُ طويل، الحدُّ ${LIMITS.bankCategoryMax} حرفًا.` };
  }

  const { rows, errors } = parseBulkWords(rawText);
  if (errors.length > 0) {
    return { ok: false, message: `أصلِح ${errors.length} سطرًا قبل الحفظ.` };
  }
  if (rows.length === 0) return { ok: false, message: "لا كلمةَ في النصّ الملصوق." };
  if (rows.length > LIMITS.bulkMax) {
    return { ok: false, message: `الحدُّ الأقصى ${LIMITS.bulkMax} كلمةً في اللصقة الواحدة.` };
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data, error } = await sb
    .from("guess_word_bank")
    .upsert(
      rows.map((r) => ({ word: r.word, hint: r.hint, category: cat, created_by: user?.id ?? null })),
      { onConflict: "category,word", ignoreDuplicates: true }
    )
    .select("id");

  if (error) return { ok: false, message: dbMessage(error.code, "تعذّرت إضافةُ الكلمات.") };

  const added = data?.length ?? 0;
  const skipped = rows.length - added;

  revalidatePath("/dashboard/games/words");
  return {
    ok: true,
    added,
    skipped,
    message: skipped > 0 ? `أُضيفت ${added} كلمة، وتُخطّيت ${skipped} موجودةً سلفًا.` : `أُضيفت ${added} كلمة.`,
  };
}

/* ────────────────────────── التصنيفات ────────────────────────── */

/** يُقرأ عند كلّ فعلِ تصنيف: الحدُّ نفسُه الذي يحرسه قيدُ `guess_word_categories`. */
function validCategory(raw: string): string | null {
  const name = cleanText(raw);
  if (!name) return "اسمُ التصنيف مطلوب.";
  if (name.length > LIMITS.bankCategoryMax) {
    return `الاسمُ طويل، الحدُّ ${LIMITS.bankCategoryMax} حرفًا.`;
  }
  return null;
}

/** رسائلُ عطلِ التصنيف — و`23503` علّتُها أنّ تحته كلمات. */
function categoryMessage(code: string | undefined, fallback: string): string {
  if (code === "23505") return "هذا التصنيفُ موجودٌ سلفًا.";
  if (code === "23503") return "تحت هذا التصنيف كلمات. انقُلها أو احذفها أوّلًا.";
  if (code === "42501") return "لا تملك قدرةَ إدارة الألعاب.";
  return fallback;
}

export async function createCategory(name: string): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };
  const invalid = validCategory(name);
  if (invalid) return { ok: false, message: invalid };

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { error } = await sb
    .from("guess_word_categories")
    .insert({ name: cleanText(name), created_by: user?.id ?? null });

  if (error) return { ok: false, message: categoryMessage(error.code, "تعذّرت إضافةُ التصنيف.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "أُضيف التصنيف." };
}

/**
 * إعادةُ التسمية.
 *
 * **ولا `update` على الكلمات هنا**: المفتاحُ الأجنبيّ `on update cascade`، فتنساب
 * التسميةُ على كلّ كلمةٍ تحته في المعاملة نفسِها. ولو كُتب التحديثُ يدويًّا لصار
 * حارسان لحقيقةٍ واحدةٍ يفترقان يومًا.
 */
export async function renameCategory(from: string, to: string): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };
  const invalid = validCategory(to);
  if (invalid) return { ok: false, message: invalid };
  if (cleanText(from) === cleanText(to)) return { ok: true, message: "لا تغيير." };

  const sb = await createClient();
  const { error } = await sb
    .from("guess_word_categories")
    .update({ name: cleanText(to) })
    .eq("name", from);

  if (error) return { ok: false, message: categoryMessage(error.code, "تعذّرت إعادةُ التسمية.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "أُعيدت التسمية." };
}

/** الحذفُ يُردّ إن كان تحته كلمات — بالقاعدة (`on delete restrict`) لا بالشاشة. */
export async function deleteCategory(name: string): Promise<BankResult> {
  if (!(await getGamesManager())) return { ok: false, message: "لا تملك قدرةَ إدارة الألعاب." };

  const sb = await createClient();
  const { error } = await sb.from("guess_word_categories").delete().eq("name", name);

  if (error) return { ok: false, message: categoryMessage(error.code, "تعذّر حذفُ التصنيف.") };

  revalidatePath("/dashboard/games/words");
  return { ok: true, message: "حُذف التصنيف." };
}
