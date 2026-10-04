"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkCampaignName, checkCampaignNote } from "@/lib/qrLinks";
import { CAMPAIGN_NOT_FOUND, qrActor } from "../guard";

/**
 * **أفعالُ الحاوية** — إنشاءٌ وتسميةٌ وحذفٌ، وضمُّ باركوداتٍ إليها وإخراجُها منها.
 *
 * وحارسُها واحدٌ مع أفعال الباركود (`../guard`): قدرةُ المولّد لصاحب الجلسة، ثمّ القاعدةُ
 * هي التي تقول «هذا لك» بسياسة own-row. فما لم تأذن به السياسةُ يُردّ بلا صفٍّ متأثّر،
 * ولا يقف عليه سطرُ `where` في التطبيق.
 */

export type QrCampaignResult = { ok: boolean; message: string; id?: string };

const refresh = () => {
  revalidatePath("/dashboard/tools/qr/links");
  revalidatePath("/dashboard/tools/qr/campaigns");
};

/** إنشاءُ حاويةٍ فارغةٍ تنتظر ملصقاتِها. وفراغُها حالٌ صحيحةٌ لا نقص. */
export async function createQrCampaign(input: { name: string; note: string }): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const name = checkCampaignName(input.name);
  if (!name.ok) return { ok: false, message: name.message };
  const note = checkCampaignNote(input.note ?? "");
  if (!note.ok) return { ok: false, message: note.message };

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_campaigns")
    .insert({ name: name.name, note: note.note, owner_id: me.id })
    .select("id")
    .single();
  if (error) return { ok: false, message: `تعذّر إنشاء الحملة: ${error.message}` };

  refresh();
  return { ok: true, message: "أُنشئت الحملة، وتبقى فارغةً حتّى تضمّ إليها باركوداتِها.", id: data.id };
}

/** تعديلُ الاسم والتعريف. ولا يمسّ هذا باركودًا ولا رمزًا مطبوعًا. */
export async function renameQrCampaign(id: string, input: { name: string; note: string }): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const name = checkCampaignName(input.name);
  if (!name.ok) return { ok: false, message: name.message };
  const note = checkCampaignNote(input.note ?? "");
  if (!note.ok) return { ok: false, message: note.message };

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_campaigns")
    .update({ name: name.name, note: note.note, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: `تعذّر التعديل: ${error.message}` };
  if (!data) return { ok: false, message: CAMPAIGN_NOT_FOUND };

  refresh();
  revalidatePath(`/dashboard/tools/qr/campaigns/${id}`);
  return { ok: true, message: "حُدّثت الحملة." };
}

/**
 * **حذفُ الحاوية لا يحذف ما فيها.**
 *
 * `on delete set null` في القاعدة (م١٨): الباركوداتُ تخرج منها وتبقى تعمل، والملصقُ
 * المطبوعُ في الشارع لا يُمسّ. وهذا هو الفرقُ الذي يجعل الحذفَ هنا فعلًا هيّنًا بخلاف
 * حذف الباركود.
 */
export async function deleteQrCampaign(id: string): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb.from("qr_campaigns").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };
  if (!data) return { ok: false, message: CAMPAIGN_NOT_FOUND };

  refresh();
  return { ok: true, message: "حُذفت الحملة، وخرجت باركوداتُها منها وهي تعمل." };
}

/**
 * **ضمُّ باركوداتٍ إلى حاوية، أو إخراجُها** (`campaignId = null`).
 *
 * فعلٌ واحدٌ للحالتين ولواحدٍ وللجملة: الشاشةُ تُرسل قائمةَ معرّفات، والفرقُ بين «ضمّ»
 * و«نقل» و«إخراج» جملةُ جوابٍ لا مسارُ كود.
 *
 * والحارسُ في القاعدة لا هنا: محفّزُ `qr_campaign_guard` يردّ وضعَ باركودٍ في حملةٍ ليست
 * لمالكه، ويردّ شريكًا محرِّرًا ينقل باركودَ غيره. فنُترجم خطأه إلى جملةٍ تُقرأ.
 */
export async function setLinksCampaign(linkIds: string[], campaignId: string | null): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;
  if (!linkIds.length) return { ok: false, message: "لم تُحدِّد باركودًا." };

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_links")
    .update({ campaign_id: campaignId, updated_at: new Date().toISOString() })
    .in("id", linkIds)
    .select("id");

  if (error) {
    const raw = error.message ?? "";
    if (raw.includes("CAMPAIGN_NOT_YOURS")) return { ok: false, message: "هذه الحملة ليست لك." };
    if (raw.includes("CAMPAIGN_OWNER_ONLY")) {
      return { ok: false, message: "لا تنقل باركودًا لا تملكه بين الحملات. المالكُ وحدَه يفعل ذلك." };
    }
    return { ok: false, message: `تعذّر الضمّ: ${raw}` };
  }

  const touched = (data ?? []).length;
  if (!touched) return { ok: false, message: "لم يتأثّر باركودٌ. راجِع ما حدّدتَه." };

  refresh();
  if (campaignId) revalidatePath(`/dashboard/tools/qr/campaigns/${campaignId}`);

  const word = touched === 1 ? "الباركود" : `${touched} باركودات`;
  return {
    ok: true,
    message: campaignId ? `ضُمّ ${word} إلى الحملة.` : `خرج ${word} من حملته.`,
  };
}

/**
 * **مشاركةُ الحملة** (م٢٠) — إذنان لا واحد: `read` يقرأ إحصاءها وإحصاءَ ما فيها،
 * و`edit` يبدّل وجهاتِ باركوداتها وتصاميمَها وحالَها وجداولَها.
 *
 * **والبنيةُ تبقى للمالك**: التسميةُ والحذفُ والضمُّ والإخراجُ والمشاركةُ نفسُها. فالشريكُ
 * يعمل فيما بداخلها ولا يعيد ترتيبَها.
 *
 * والحارسُ في القاعدة: سياسةُ الكتابة تشترط أن يكون الفاعلُ **مالكَ** الحاوية، وأن يملك
 * المشارَكُ معه قدرةَ المولّد. فما لم تأذن به السياسةُ يُردّ ههنا بلا صفٍّ متأثّر.
 */
export async function shareQrCampaign(
  campaignId: string,
  userId: string,
  access: "read" | "edit",
): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_campaign_shares")
    .upsert({ campaign_id: campaignId, user_id: userId, access, granted_by: me.id }, { onConflict: "campaign_id,user_id" })
    .select("user_id")
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      message: error.code === "42501" || error.code === "23514"
        ? "لا تستطيع المشاركة: إمّا أنّك لست مالكَ الحملة، وإمّا أنّ من تشاركه لا يملك صلاحيّة مولّد الباركود."
        : error.message,
    };
  }
  if (!data) return { ok: false, message: CAMPAIGN_NOT_FOUND };

  refresh();
  revalidatePath(`/dashboard/tools/qr/campaigns/${campaignId}`);
  return {
    ok: true,
    message: access === "edit" ? "شُورِكت الحملة بإذن التحرير." : "شُورِكت الحملة للقراءة.",
  };
}

/**
 * **تبديلُ إذن شريكٍ قائم** — من القراءة إلى التحرير وبالعكس.
 *
 * وفعلٌ مستقلٌّ لا نداءٌ ثانٍ للمشاركة (سابقةُ الباركود ٢٠٢٦-٠٩-٠٦): «شُورِكت الحملة»
 * جوابٌ عن إدخالِ شريكٍ جديد، ومن بدّل إذنَ شريكٍ عنده يريد أن يُقال له ما صار إليه.
 */
export async function setQrCampaignShareAccess(
  campaignId: string,
  userId: string,
  access: "read" | "edit",
): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_campaign_shares")
    .update({ access })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: CAMPAIGN_NOT_FOUND };

  refresh();
  revalidatePath(`/dashboard/tools/qr/campaigns/${campaignId}`);
  return {
    ok: true,
    message: access === "edit" ? "صار يحرّر باركودات الحملة." : "صار يقرأ إحصاءها ولا يبدّل شيئًا.",
  };
}

/** إخراجُ شريكٍ من الحملة. للمالك وحدَه، كالإدخال. */
export async function unshareQrCampaign(campaignId: string, userId: string): Promise<QrCampaignResult> {
  const { me, deny } = await qrActor();
  if (!me) return deny!;

  const sb = await createClient();
  const { error } = await sb
    .from("qr_campaign_shares")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/dashboard/tools/qr/campaigns/${campaignId}`);
  return { ok: true, message: "أُخرج الشريك، وسقط إذنُه عن باركودات الحملة." };
}
