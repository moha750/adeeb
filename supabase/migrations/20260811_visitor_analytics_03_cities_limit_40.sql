-- المدنُ تُجمَع قبل أن تُقتطَع.
--
-- القصّة: مزوّدُ الموقع يرسل للمدينة الواحدة أكثرَ من رسمٍ لاتينيّ (`Hofuf` و`Al Hufuf` ·
-- `Jubail` و`Al Jubayl`)، فتُعدّ مدينتين ويُقسَم رقمُها. والدمجُ يقع في الواجهة (`lib/geo.tsx`)
-- لأنّ الترجمةَ والهويّةَ هناك، لا في القاعدة التي تخزّن ما وصلها كما وصلها.
--
-- لكنّ الدمجَ بعد الاقتطاع كذبٌ آخر: لو رجعت اثنتا عشرة مدينةً فقط، جاز أن يقع أحدُ الرسمين
-- خارجها فيُدمَج نصفُ العدد. فرُفع حدُّ **المدن وحدها** إلى أربعين: تُجمَع في الواجهة ثمّ
-- تُقتطَع اثنتا عشرة. وأربعون صفًّا لا تكلّف شيئًا (١٥٨ مدينةً حيّةً في السجلّ كلّه).
--
-- ولا يُمسّ غيرُ هذا الرقم: استبدالُ تعريفٍ لدالّةٍ قارئة، بلا جدولٍ ولا عمودٍ ولا صفّ.

create or replace function public.get_visitor_analytics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with base as (
    select *
    from site_pageviews
    where is_bot = false
      and coalesce(is_admin_page, false) = false
      and visited_at >= (now() - make_interval(days => greatest(p_days, 1)))
  )
  select jsonb_build_object(
    'days', p_days,
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
               and visited_at >= (now() - make_interval(days => greatest(p_days, 1)))),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d::text, 'pageviews', pv, 'visitors', uv) order by d), '[]'::jsonb)
              from (select (visited_at at time zone 'Asia/Riyadh')::date d, count(*) pv, count(distinct visitor_id) uv
                    from base group by 1) t),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('label', page_path, 'count', c) order by c desc), '[]'::jsonb)
                  from (select page_path, count(*) c from base group by 1 order by count(*) desc limit 12) t),
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
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('label', city, 'count', c) order by c desc), '[]'::jsonb)
               from (select city, count(*) c from base
                     where city is not null and city <> '' group by 1 order by count(*) desc limit 40) t),
    'visitor_types', (select jsonb_build_object(
        'new',       count(*) filter (where v.first_seen_at >= (now() - make_interval(days => greatest(p_days, 1)))),
        'returning', count(*) filter (where v.first_seen_at <  (now() - make_interval(days => greatest(p_days, 1))))
      ) from (select distinct visitor_id from base where visitor_id is not null) b
        join site_visitors v on v.id = b.visitor_id),
    'exit_pages', (select coalesce(jsonb_agg(jsonb_build_object('label', page_path, 'count', c) order by c desc), '[]'::jsonb)
                   from (select page_path, count(*) c
                         from (select distinct on (session_id) session_id, page_path
                               from base
                               where session_id is not null
                               order by session_id, visited_at desc) last_pv
                         group by 1 order by count(*) desc limit 12) t)
  );
$function$;
