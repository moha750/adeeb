-- ٢٠٢٦-٠٨-٢٠ — إحصائيّاتُ الزوّار تعرف البابَين.
--
-- نزل عمودُ `source` في الترحيل السابق، ولم تكن الدالّةُ تعرفه: فزيارةُ التطبيق تُحسَب
-- زيارةَ موقعٍ في كلّ رقمٍ من التسعة. فصار لها معامِلٌ ثانٍ اختياريّ.
--
-- **والافتراضُ `null` = الكلّ**، فالنداءُ القديم `get_visitor_analytics(p_days => 30)` يعمل
-- كما كان بلا حرفٍ يتغيّر في نتيجته.
--
-- وأُضيف `sources`: توزيعُ البابين في المدّة نفسِها **غيرَ منخول**، كي يعرض المِرشحُ عددَ
-- ما وراء كلّ باب حتى وأنت واقفٌ داخل أحدهما.
--
-- والصلاحيّاتُ تُعاد كما كانت بالضبط (عامٌّ + anon + authenticated + service_role):
-- إغلاقُ سطح الدوالّ عن anon بندٌ مستقلٌّ في ورقة الأعمال، ولا يُهرَّب في ترحيلِ ميزة.

drop function if exists public.get_visitor_analytics(integer);

create or replace function public.get_visitor_analytics(
  p_days integer default 30,
  p_source text default null
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with span as (
    select *
    from site_pageviews
    where is_bot = false
      and coalesce(is_admin_page, false) = false
      and visited_at >= (now() - make_interval(days => greatest(p_days, 1)))
  ),
  base as (
    select * from span
    where p_source is null or source = p_source
  )
  select jsonb_build_object(
    'days', p_days,
    'source', p_source,
    'sources', (select coalesce(jsonb_object_agg(source, c), '{}'::jsonb)
                from (select source, count(*) c from span group by 1) t),
    'kpis', (select jsonb_build_object(
        'pageviews',   count(*),
        'visitors',    count(distinct visitor_id),
        'sessions',    count(distinct session_id),
        'avg_seconds', coalesce(round(avg(total_seconds)::numeric, 0), 0),
        'bounce_rate', coalesce(round(100.0 * count(*) filter (where is_bounce) / nullif(count(*), 0), 1), 0),
        'members',     count(*) filter (where user_id is not null),
        'countries',   count(distinct country_code)
      ) from base),
    'bots', (select count(*) from site_pageviews
             where is_bot = true and coalesce(is_admin_page, false) = false
               and visited_at >= (now() - make_interval(days => greatest(p_days, 1)))
               and (p_source is null or source = p_source)),
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
    'visitor_types', (select jsonb_build_object(
        'new',       count(*) filter (where v.first_seen_at >= (now() - make_interval(days => greatest(p_days, 1)))),
        'returning', count(*) filter (where v.first_seen_at <  (now() - make_interval(days => greatest(p_days, 1))))
      ) from (select distinct visitor_id from base where visitor_id is not null) b
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

grant execute on function public.get_visitor_analytics(integer, text) to anon, authenticated, service_role;

comment on function public.get_visitor_analytics(integer, text) is
  'إحصائيّاتُ الزوّار في مدّةٍ بالأيّام. p_source: web أو app، وnull = البابان معًا.';
