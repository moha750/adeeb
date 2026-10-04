import "server-only";
import { createClient } from "@/lib/supabase/server";
import { QR_LINK_COLS, shapeQrLink } from "../data";
import type { QrLinkRaw, QrLinkRow } from "../data";

/**
 * **قراءاتُ الحاوية** — بعميل الجلسة لا بمفتاح الخدمة، كأختها في `../data`.
 *
 * المدى «كلٌّ يرى حملاتِه هو» تحكمه سياسةُ own-row في القاعدة، ومفتاحُ الخدمة يتجاوزها
 * فيصير الحارسُ سطرَ `where` في التطبيق، وسطرٌ يُنسى مرّةً يكشف حملاتِ الجميع.
 *
 * **والتصفيةُ بالمِلكيّة قائمةٌ مع ذلك**: من يملك `oversee_qr` تفتح له سياسةُ الإشراف كلَّ
 * الصفوف، فلولا `owner_id` في الاستعلام لوجد حملاتِ الناس في «حملاتي» (وهي العلّةُ عينُها
 * التي صُحّحت في قائمة الباركودات ٢٠٢٦-٠٩-٠٦).
 */

/** حملةٌ كما تُقرأ في القائمة: اسمُها ومجاميعُها المحسوبة. */
export type QrCampaignRow = {
  id: string;
  name: string;
  note: string | null;
  ownerId: string;
  createdAt: string;
  /** عددُ باركوداتها. */
  links: number;
  /** مجموعُ مسحاتها. */
  scans: number;
  /** أنشطُ ملصقٍ فيها، أو `null` لحاويةٍ لم تُملأ بعد. */
  topTitle: string | null;
  /**
   * منزلةُ الناظر منها (م٢٠): مالكٌ، أو شريكٌ يحرّر، أو شريكٌ يقرأ. والشاشةُ تقرؤها
   * لتعرف ما تعرض: البنيةُ (التسميةُ والحذفُ والمشاركةُ والضمّ) للمالك وحدَه.
   */
  access: QrCampaignAccess;
};

/** منزلةُ الناظر من حاوية. نظيرُ `QrAccess` في الباركود. */
export type QrCampaignAccess = "owner" | "edit" | "read";

type RawCamp = { id: string; name: string; note: string | null; owner_id: string; created_at: string };
type Tally = { campaign_id: string | null; title: string; scan_count: number };

const CAMP_COLS = "id, name, note, owner_id, created_at";

/**
 * **المجاميعُ تُحسَب ولا تُخزَّن**: عدّادٌ على الحملة يفترق عن `scan_count` يومَ يخرج منها
 * باركودٌ أو يُحذَف. والحسابُ في التطبيق لا في القاعدة عمدًا وبحدّ: باركوداتُ عضوٍ عشراتٌ،
 * وجلبُ سطرٍ لكلٍّ ثمّ عدُّه أرخصُ من `view` تُصان. فإن بلغت المئاتِ انتقل إلى `group by`.
 */
export async function getMyQrCampaigns(): Promise<{ rows: QrCampaignRow[]; error: string | null }> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const me = auth.user?.id ?? null;
  if (!me) return { rows: [], error: null };

  // **ملكٌ وشِركة** (م٢٠): ما أملكه، وما شُورِكتُ فيه. لا ما تسمح لي سياسةُ الإشراف برؤيته.
  const [own, shared] = await Promise.all([
    sb.from("qr_campaigns").select(CAMP_COLS).eq("owner_id", me).order("created_at", { ascending: false }),
    sb.from("qr_campaign_shares").select("campaign_id, access").eq("user_id", me),
  ]);
  if (own.error) return { rows: [], error: own.error.message };

  const shares = new Map(
    ((shared.data ?? []) as { campaign_id: string; access: QrCampaignAccess }[]).map((r) => [r.campaign_id, r.access]),
  );
  const sharedIds = [...shares.keys()];
  const withMe = sharedIds.length
    ? await sb.from("qr_campaigns").select(CAMP_COLS).in("id", sharedIds).order("created_at", { ascending: false })
    : { data: [], error: null };

  const camps = { data: [...((own.data ?? []) as RawCamp[]), ...((withMe.data ?? []) as RawCamp[])], error: null };

  // **والمجاميعُ تُحسَب ممّا تسمح به السياسةُ داخل هذه الحاويات بعينها**: باركوداتُ حملةٍ
  // شُورِكتُ فيها ليست لي، فلا يصحّ أن تُنخَل بمالكها. والسياسةُ هي التي تحجب ما لا يُرى.
  const ids = camps.data.map((c) => c.id);
  const links = ids.length
    ? await sb.from("qr_links").select("campaign_id, title, scan_count").in("campaign_id", ids)
    : { data: [], error: null };

  const tally = new Map<string, { links: number; scans: number; top: Tally | null }>();
  for (const l of (links.data ?? []) as Tally[]) {
    if (!l.campaign_id) continue;
    const cur = tally.get(l.campaign_id) ?? { links: 0, scans: 0, top: null };
    cur.links += 1;
    cur.scans += l.scan_count ?? 0;
    if (!cur.top || (l.scan_count ?? 0) > (cur.top.scan_count ?? 0)) cur.top = l;
    tally.set(l.campaign_id, cur);
  }

  return {
    rows: camps.data.map((c) => {
      const t = tally.get(c.id);
      return {
        id: c.id,
        name: c.name,
        note: c.note,
        ownerId: c.owner_id,
        createdAt: c.created_at,
        links: t?.links ?? 0,
        scans: t?.scans ?? 0,
        topTitle: t?.top?.title ?? null,
        access: c.owner_id === me ? ("owner" as const) : (shares.get(c.id) ?? "read"),
      };
    }),
    error: null,
  };
}

/** حاويةٌ واحدةٌ بما فيها — غرفةُ الحملة. */
export type QrCampaignRoom = {
  campaign: QrCampaignRow | null;
  links: QrLinkRow[];
  error: string | null;
};

/**
 * **الترتيبُ بالمسحات تنازليًّا** لا بتاريخ الإنشاء: الغرفةُ تُفتح على سؤال «أيُّ موضعٍ
 * نجح؟»، فأنشطُ ملصقٍ أوّلُ ما تقع عليه العين، وذيلُ القائمة هو الذي يُراجَع.
 */
export async function getQrCampaign(id: string): Promise<QrCampaignRoom> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const me = auth.user?.id ?? null;
  if (!me) return { campaign: null, links: [], error: null };

  const { data: row, error } = await sb.from("qr_campaigns").select(CAMP_COLS).eq("id", id).maybeSingle();
  if (error) return { campaign: null, links: [], error: error.message };
  if (!row) return { campaign: null, links: [], error: null };

  const c = row as RawCamp;
  // **المنزلةُ من القاعدة لا من مقارنةٍ في الشاشة**: المالكُ معلومٌ بالصفّ، والشريكُ إذنُه
  // في جدولٍ آخر، فتُسأل دالّةٌ واحدةٌ تجمعهما (`qr_campaign_access`) فلا تفترق الشاشاتُ.
  const { data: access } = await sb.rpc("qr_campaign_access", { p_campaign: id });
  const { data: links, error: linkErr } = await sb
    .from("qr_links")
    .select(QR_LINK_COLS)
    .eq("campaign_id", id)
    .order("scan_count", { ascending: false });
  if (linkErr) return { campaign: null, links: [], error: linkErr.message };

  /* الصائغُ واحدٌ في `../data`، والاسمُ وحدَه يُلصَق ههنا: الحاويةُ معلومةٌ سلفًا
     (صفُّها مقروءٌ فوق)، فلا يُنادى لها نداءٌ ثانٍ كما في غرفة الباركودات. */
  const rows: QrLinkRow[] = ((links ?? []) as QrLinkRaw[]).map((r) => ({
    ...shapeQrLink(r),
    campaignName: c.name,
  }));

  const scans = rows.reduce((n, r) => n + r.scanCount, 0);
  return {
    campaign: {
      id: c.id,
      name: c.name,
      note: c.note,
      ownerId: c.owner_id,
      createdAt: c.created_at,
      links: rows.length,
      scans,
      topTitle: rows[0]?.title ?? null,
      access: (access as QrCampaignAccess | null) ?? (c.owner_id === me ? "owner" : "read"),
    },
    links: rows,
    error: null,
  };
}

/** حملاتي أسماءً ومعرّفاتٍ وحدها — لنافذة الضمّ ولمرشِّح القائمة. */
export type QrCampaignBrief = { id: string; name: string };

export async function getMyQrCampaignBriefs(): Promise<QrCampaignBrief[]> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const me = auth.user?.id ?? null;
  if (!me) return [];

  const { data } = await sb
    .from("qr_campaigns")
    .select("id, name")
    .eq("owner_id", me)
    .order("created_at", { ascending: false });
  return ((data ?? []) as QrCampaignBrief[]).map((c) => ({ id: c.id, name: c.name }));
}

/** شريكٌ في حملة: اسمُه وإذنُه. نظيرُ `QrShare` في الباركود. */
export type QrCampaignShare = { userId: string; name: string; access: "read" | "edit" };

/**
 * **شركاءُ حملةٍ بعينها.**
 *
 * بعميل الجلسة: سياسةُ الجدول تُري المالكَ شركاءَ حاويته، والشريكَ صفَّه هو، والمشرفَ
 * الكلَّ. فلا سطرَ `where` في التطبيق يحرس ما تحرسه القاعدة.
 */
export async function getQrCampaignShares(
  campaignId: string,
): Promise<{ rows: QrCampaignShare[]; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("qr_campaign_shares")
    .select("user_id, access")
    .eq("campaign_id", campaignId);
  if (error) return { rows: [], error: error.message };

  const raw = (data ?? []) as { user_id: string; access: "read" | "edit" }[];
  if (!raw.length) return { rows: [], error: null };

  const { data: people } = await sb.from("profiles").select("id, full_name").in("id", raw.map((r) => r.user_id));
  const byId = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));

  return {
    rows: raw.map((r) => ({ userId: r.user_id, name: byId.get(r.user_id) ?? "غيرُ معروف", access: r.access })),
    error: null,
  };
}
