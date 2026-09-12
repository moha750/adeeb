-- ٢٠٢٦-٠٩-٠٥ — أسماءُ الروبوتات، لقسمٍ يعرضها بدل كرتٍ يعدّها.
--
-- رفع المالكُ كرتَ «مشاهدة روبوت» من صدر الشاشة (زحمة)، وأرادها **قسمًا** كأصناف الزوّار
-- وتوزيع الأجهزة. والقسمُ يحتاج تفصيلًا لا رقمًا واحدًا، فأُضيف `bots_by_name`: أعلى عشرة
-- روبوتاتٍ بأسمائها في المدّة نفسِها وبالنخل نفسِه.
--
-- ولا يُمسّ التوقيعُ ولا الصلاحيّات: `create or replace` وحدَها.

create or replace function public.get_visitor_analytics(
  p_days integer default 30,
  p_source text default null,
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with bounds as (
    select
      coalesce((p_from::timestamp at time zone 'Asia/Riyadh'),
               now() - make_interval(days => greatest(p_days, 1)))            as t0,
      coalesce(((p_to + 1)::timestamp at time zone 'Asia/Riyadh'), now())     as t1
  ),
  span as (
    select p.*
    from site_pageviews p, bounds b
    where p.is_bot = false
      and coalesce(p.is_admin_page, false) = false
      and p.visited_at >= b.t0
      and p.visited_at <  b.t1
  ),
  base as (
    select * from span
    where p_source is null or source = p_source
  ),
  -- الفترةُ السابقة: ملاصقةٌ لبداية المدى وبطوله نفسِه، وبشروط النخل نفسِها
  pbase as (
    select p.*
    from site_pageviews p, bounds b
    where p.is_bot = false
      and coalesce(p.is_admin_page, false) = false
      and p.visited_at >= b.t0 - (b.t1 - b.t0)
      and p.visited_at <  b.t0
      and (p_source is null or p.source = p_source)
  )
  select jsonb_build_object(
    'days', p_days,
    'source', p_source,
    -- حدودُ المدى كما تُقرأ (مفتاحُ يومٍ بتوقيت الرياض) — الشاشةُ تعرضهما ولا تعيد حسابهما
    -- حدُّ البداية المعروض: هو `t0` حين يُكتب المدى بيده، أمّا «منذ البداية» فنافذتُها
    -- المتدحرّجة عشرُ سنين، وتاريخُ ٢٠١٦ في الزرّ كذبٌ بصريّ — فيُقال أوّلُ يومٍ فيه زيارةٌ فعلًا.
    'from', (select case when p_from is not null then to_char(t0 at time zone 'Asia/Riyadh', 'YYYY-MM-DD')
                         else to_char(coalesce((select min(visited_at) from span), t0) at time zone 'Asia/Riyadh', 'YYYY-MM-DD') end
             from bounds),
    'to',   (select to_char((t1 - interval '1 second') at time zone 'Asia/Riyadh', 'YYYY-MM-DD') from bounds),
    'sources', (select coalesce(jsonb_object_agg(source, c), '{}'::jsonb)
                from (select source, count(*) c from span group by 1) t),
    'kpis', (select jsonb_build_object(
        'pageviews',   count(*),
        'visitors',    count(distinct visitor_id),
        'sessions',    count(distinct session_id),
        'avg_seconds', coalesce(round(avg(total_seconds)::numeric, 0), 0),
        -- **الارتدادُ يُحسب من الجلسات وقتَ العرض** (٢٠٢٦-٠٨-٣١): كان عمودًا مخزَّنًا يكتبه
        -- مُطلِقٌ عند **تحديث المدّة**، ومن دخل وخرج فورًا لا يصل تحديثُه — فيسقط من العدّ
        -- مَن هو الارتدادُ عينُه. فكان يعرض ٢٫٢٪ وجلساتُ الصفحة الواحدة القصيرة ٤٠٫٨٪.
        -- والحدُّ: جلسةٌ فيها صفحةٌ واحدة، وأطولُ مكثٍ فيها دون عشر ثوانٍ.
        'bounce_rate', (select coalesce(round(100.0 * count(*) filter (where pv = 1 and secs < 10) / nullif(count(*), 0), 1), 0)
                        from (select session_id, count(*) pv, max(total_seconds) secs
                              from base where session_id is not null group by 1) s),
        'members',     count(*) filter (where user_id is not null),
        -- نصيبُ الأعضاء **بوحدة الزائر** (٢٠٢٦-٠٨-٣١): كرتُ «زائر» يحمله سطرًا فرعيًّا، فطرحُ
        -- «مشاهدة عضو» من «زائر» كان يغري بحسابٍ لا معنى له (صفحاتٌ ناقص أجهزة).
        'member_visitors', count(distinct visitor_id) filter (where user_id is not null),
        -- العائدون: من كان أوّلُ ظهورٍ له **قبل** بداية المدى. والنسبةُ تُحسب في الشاشة.
        'returning', (select count(*)
                      from (select distinct visitor_id from base where visitor_id is not null) b
                      join site_visitors v on v.id = b.visitor_id
                      where v.first_seen_at < (select t0 from bounds)),
        'countries',   count(distinct country_code)
      ) from base),
    -- أرقامُ الفترة السابقة وحدَها (لا قوائمَ ولا مخطّطات): ما يُقارَن هو الأرقامُ السبعة
    'prev', (select jsonb_build_object(
        'from',        (select to_char((t0 - (t1 - t0)) at time zone 'Asia/Riyadh', 'YYYY-MM-DD') from bounds),
        'to',          (select to_char((t0 - interval '1 second') at time zone 'Asia/Riyadh', 'YYYY-MM-DD') from bounds),
        'pageviews',   count(*),
        'visitors',    count(distinct visitor_id),
        'sessions',    count(distinct session_id),
        'avg_seconds', coalesce(round(avg(total_seconds)::numeric, 0), 0),
        'bounce_rate', (select coalesce(round(100.0 * count(*) filter (where pv = 1 and secs < 10) / nullif(count(*), 0), 1), 0)
                        from (select session_id, count(*) pv, max(total_seconds) secs
                              from pbase where session_id is not null group by 1) s),
        'members',     count(*) filter (where user_id is not null),
        'member_visitors', count(distinct visitor_id) filter (where user_id is not null),
        'returning', (select count(*)
                      from (select distinct visitor_id from pbase where visitor_id is not null) b
                      join site_visitors v on v.id = b.visitor_id
                      where v.first_seen_at < (select t0 - (t1 - t0) from bounds)),
        'countries',   count(distinct country_code)
      ) from pbase),
    'bots', (select count(*) from site_pageviews p, bounds b
             where p.is_bot = true and coalesce(p.is_admin_page, false) = false
               and p.visited_at >= b.t0 and p.visited_at < b.t1
               and (p_source is null or p.source = p_source)),
    -- **أسماءُ الروبوتات** (٢٠٢٦-٠٩-٠٥): العمودُ `browser_name` يكذب عليها — يقول «Chrome»
    -- لـGooglebot لأنّ بطاقتَه تتنكّر في صورة متصفّح. فالاسمُ يُشتقّ من نصّ البطاقة نفسِه،
    -- بالقائمة التي تسِمُها بالروبوت أصلًا في دالّة الحافّة، فلا مصدرَ ثانٍ للحقيقة.
    'bots_by_name', (select coalesce(jsonb_agg(jsonb_build_object('label', nm, 'count', c) order by c desc), '[]'::jsonb)
                     from (select case
                             when ua ilike '%googlebot%'            then 'Googlebot'
                             when ua ilike '%bingbot%'              then 'Bingbot'
                             when ua ilike '%yandex%'               then 'Yandex'
                             when ua ilike '%duckduckbot%'          then 'DuckDuckBot'
                             when ua ilike '%applebot%'             then 'Applebot'
                             when ua ilike '%facebookexternalhit%'  then 'Facebook'
                             when ua ilike '%whatsapp%'             then 'WhatsApp'
                             when ua ilike '%twitterbot%'           then 'Twitter'
                             when ua ilike '%telegrambot%'          then 'Telegram'
                             when ua ilike '%semrush%'              then 'SemrushBot'
                             when ua ilike '%ahrefs%'               then 'AhrefsBot'
                             when ua ilike '%mj12bot%'              then 'MJ12bot'
                             when ua ilike '%baiduspider%'          then 'Baidu'
                             when ua ilike '%lighthouse%' or ua ilike '%pagespeed%' then 'PageSpeed'
                             when ua ilike '%headlesschrome%' or ua ilike '%puppeteer%' or ua ilike '%selenium%' then 'متصفّحٌ آليّ'
                             else 'روبوتٌ آخر' end nm,
                           count(*) c
                           from (select coalesce(p.user_agent, '') ua
                                 from site_pageviews p, bounds b
                                 where p.is_bot = true and coalesce(p.is_admin_page, false) = false
                                   and p.visited_at >= b.t0 and p.visited_at < b.t1
                                   and (p_source is null or p.source = p_source)) x
                           group by 1 order by count(*) desc limit 10) t),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d::text, 'pageviews', pv, 'visitors', uv) order by d), '[]'::jsonb)
              from (select (visited_at at time zone 'Asia/Riyadh')::date d, count(*) pv, count(distinct visitor_id) uv
                    from base group by 1) t),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('label', page_path, 'title', ttl, 'count', c) order by c desc), '[]'::jsonb)
                  from (select page_path,
                               (array_agg(page_title order by visited_at desc)
                                  filter (where page_title is not null and page_title <> ''))[1] ttl,
                               count(*) c
                        from base group by 1 order by count(*) desc limit 40) t),
    'countries', (select coalesce(jsonb_agg(jsonb_build_object('label', coalesce(country_code, '—'), 'count', c) order by c desc), '[]'::jsonb)
                  from (select country_code, count(*) c from base group by 1 order by count(*) desc limit 12) t),
    'browsers', (select coalesce(jsonb_agg(jsonb_build_object('label', coalesce(nullif(browser_name, ''), 'غير معروف'), 'count', c) order by c desc), '[]'::jsonb)
                 from (select browser_name, count(*) c from base group by 1 order by count(*) desc limit 8) t),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('label', coalesce(nullif(device_type, ''), 'غير معروف'), 'count', c) order by c desc), '[]'::jsonb)
                from (select device_type, count(*) c from base group by 1 order by count(*) desc) t),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('label', referrer_host, 'count', c) order by c desc), '[]'::jsonb)
                  from (select referrer_host, count(*) c from base where referrer_host is not null and referrer_host <> '' group by 1 order by count(*) desc limit 10) t),
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'count', c) order by h), '[]'::jsonb)
               from (select extract(hour from visited_at at time zone 'Asia/Riyadh')::int h, count(*) c
                     from base group by 1) t),
    'hourly_heat', (select coalesce(jsonb_agg(jsonb_build_object('dow', d, 'hour', h, 'count', c)), '[]'::jsonb)
                    from (select extract(dow  from visited_at at time zone 'Asia/Riyadh')::int d,
                                 extract(hour from visited_at at time zone 'Asia/Riyadh')::int h,
                                 count(*) c
                          from base group by 1, 2) t),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('label', city, 'country', cc, 'count', c) order by c desc), '[]'::jsonb)
               from (select city, country_code cc, count(*) c from base
                     where city is not null and city <> '' group by 1, 2 order by count(*) desc limit 40) t),
    -- «جديدٌ مقابل عائد» يُقاس ببداية المدى نفسِها لا بنافذةٍ ثانيةٍ تُحسَب من `now()`
    -- ثلاثةُ أصنافٍ لا صنفان (٢٠٢٦-٠٩-٠٥): **المنتسبُ يُفرَز أوّلًا** ثمّ يُقسَم من بقي
    -- جديدًا وعائدًا. فالعضويّةُ بُعدٌ متعامدٌ على «جديد/عائد» لا قسمٌ ثالثٌ فيه، ولو أُضيفت
    -- شريحةً فوقهما لصار مجموعُ الأجزاء أكبرَ من الكلّ. وبالأولويّة تجمع الثلاثةُ عددَ
    -- الزوّار بالضبط ويبقى لكلّ زائرٍ موضعٌ واحد.
    'visitor_types', (select jsonb_build_object(
        'member',    count(*) filter (where b.is_member),
        'new',       count(*) filter (where not b.is_member and v.first_seen_at >= (select t0 from bounds)),
        'returning', count(*) filter (where not b.is_member and v.first_seen_at <  (select t0 from bounds))
      ) from (select visitor_id, bool_or(user_id is not null) is_member
              from base where visitor_id is not null group by 1) b
        join site_visitors v on v.id = b.visitor_id),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', vid, 'last_seen', ls, 'pageviews', pv, 'sessions', ss, 'country', cc) order by ls desc), '[]'::jsonb)
               from (select visitor_id vid,
                            max(visited_at) ls,
                            count(*) pv,
                            count(distinct session_id) ss,
                            (array_agg(country_code order by visited_at desc)
                               filter (where country_code is not null and country_code <> ''))[1] cc
                     from base
                     where visitor_id is not null
                     group by 1
                     order by max(visited_at) desc
                     limit 12) t),
    'exit_pages', (select coalesce(jsonb_agg(jsonb_build_object('label', page_path, 'title', ttl, 'count', c) order by c desc), '[]'::jsonb)
                   from (select page_path,
                                (array_agg(page_title order by visited_at desc)
                                   filter (where page_title is not null and page_title <> ''))[1] ttl,
                                count(*) c
                         from (select distinct on (session_id) session_id, page_path, page_title, visited_at
                               from base
                               where session_id is not null
                               order by session_id, visited_at desc) last_pv
                         group by 1 order by count(*) desc limit 40) t)
  );
$function$;
