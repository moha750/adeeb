-- حاويةٌ لا تبقى يتيمةً: مفتاحُ صاحبِ الحملة (م١٩)
--
-- ## العلّة، مقيسةٌ لا مظنونة
-- كُتب في م١٨ أنّ `qr_links.owner_id` بلا مفتاحٍ أجنبيّ، فبُنيت الحاويةُ على ذلك. وعند
-- التطبيق (٢٠٢٦-٠٩-٢٤) تبيّن أنّ له مفتاحًا: `qr_links_owner_id_fkey` إلى `auth.users`
-- بـ`on delete cascade` — ومن أجله بُني محفّزُ التوريث (م٦) يسبق الحذفَ فينقل الباركودات
-- إلى حساب النادي.
--
-- ## والثغرة
-- المحفّزُ ينقل الحملاتِ والباركودات معًا، **إلّا حين لا يجد حسابَ نادٍ**: عندها يخرج
-- صامتًا، فتذهب الباركوداتُ بالـcascade وتبقى **الحملاتُ صفوفًا يتيمةً** صاحبُها معدوم،
-- لا تظهر لأحدٍ (سياسةُ own-row) ولا تُحذف أبدًا.
--
-- ## والعلاج: مفتاحٌ يوازي أخاه
-- الحاويةُ تتبع صاحبَها كما يتبعه باركودُه. ولا يضيع بها ملصقٌ مطبوع: `campaign_id` في
-- `qr_links` مفتاحُه `on delete set null`، فالباركودُ يخرج من الحاوية ويبقى يعمل.

begin;

-- صفوفٌ يتيمةٌ إن وُجدت تُحذف قبل المفتاح، وإلّا رُدّ إنشاؤه. ولا يضيع بحذفها باركود.
delete from public.qr_campaigns c
where not exists (select 1 from auth.users u where u.id = c.owner_id);

alter table public.qr_campaigns drop constraint if exists qr_campaigns_owner_id_fkey;
alter table public.qr_campaigns
  add constraint qr_campaigns_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;

-- ═══ وحارسُ الحاوية لا يُنادى من الويب ═══════════════════════════════════════
-- مدقّقُ Supabase رصده (٢٠٢٦-٠٩-٢٤): دالّةٌ `security definer` تُنشَر على
-- `/rest/v1/rpc/qr_campaign_guard` لأنّ المنحَ الافتراضيّ عامّ. ونداؤها يُردّ عمليًّا
-- (دالّةُ محفّزٍ لا تُنفَّذ خارج سياقها)، لكنّ الأصلَ ألّا يُمنَح ما لا يُستعمَل، وهو عُرفُ
-- دوالّ هذه الغرفة (م٧ وم١٦ تنزعان ثمّ تمنحان بقدر الحاجة).
revoke all on function public.qr_campaign_guard() from public, anon, authenticated;

commit;
