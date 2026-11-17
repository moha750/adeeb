-- **زوّارُ صفحتي العلنيّة** (محمد ٢٠٢٦-١١-١٧: «لماذا لا يظهر للشخص نفسه كم شخص زار صفحته الخاصة؟»).
-- عددٌ لا أسماء: لا تُخرج الدالّةُ من زار، ولو كان عضوًا مسجّلًا — فلا يتردّد أحدٌ في فتح صفحة زميله.
-- **الجلسةُ هي الحقيقة** (قاعدةُ الأمان ٢٠٢٦-١٠-١٠): لا معاملَ يُمرَّر، فالصاحبُ من `auth.uid()` وحده ولا يقرأ أحدٌ عدَّ غيره.
-- ويُعدّ الأشخاصُ (`visitor_id`) لا مرّاتُ الفتح، ولا تُحسب الروبوتات ولا زياراتُ صاحبها لنفسه: بجلسته (`user_id`)، أو من متصفّحٍ
-- دخل منه حسابَه ولو مرّةً (يفتحها قبل الدخول فتُسجَّل بلا `user_id`).
-- والمسارُ يُحفظ مرمَّزًا (`/m/%D9%85...`) فيُرمَّز الاسمُ هنا كما يرمّزه المتصفّح، ويُقبل غيرُ المرمَّز احتياطًا.
-- ولا مصادر: الزوّارُ من واتساب وأخواته لا يصل منهم مُحيل (١٣٤ من ١٧١ زيارةً بلا مُحيل، والباقي من الموقع نفسه)، فعدُّها كذب.
create or replace function public.my_profile_views()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with me as (
    select p.id, p.public_slug as slug
    from public.profiles p
    where p.id = auth.uid() and p.public_slug is not null
  ),
  paths as (
    select me.id, '/m/' || me.slug as raw,
           '/m/' || (
             select string_agg(
                      case when (get_byte(b.x, i) between 48 and 57) or (get_byte(b.x, i) between 65 and 90)
                                or (get_byte(b.x, i) between 97 and 122) or get_byte(b.x, i) in (45, 46, 95, 126)
                           then chr(get_byte(b.x, i))
                           else '%' || upper(lpad(to_hex(get_byte(b.x, i)), 2, '0')) end,
                      '' order by i)
             from (select convert_to(me.slug, 'UTF8') as x) b, generate_series(0, length(b.x) - 1) as i
           ) as enc
    from me
  ),
  v as (
    select pv.visitor_id, pv.visited_at
    from public.site_pageviews pv, paths
    where pv.page_path in (paths.enc, paths.raw)
      and not coalesce(pv.is_bot, false)
      and pv.user_id is distinct from paths.id
      and not exists (
        select 1 from public.site_pageviews o
        where o.visitor_id = pv.visitor_id and o.user_id = paths.id
      )
  )
  select case when exists (select 1 from me) then jsonb_build_object(
    'month', (select count(distinct visitor_id) from v
              where visited_at >= (date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh')),
    'total', (select count(distinct visitor_id) from v),
    'since', (select min(visited_at) from public.site_pageviews where page_path like '/m/%')
  ) end;
$function$;

-- صاحبُ الحساب وحده يناديها من متصفّحه (الدوالُّ تولد مقفلة منذ ٢٠٢٦-١٠-١٠)
revoke execute on function public.my_profile_views() from public, anon;
grant execute on function public.my_profile_views() to authenticated;
