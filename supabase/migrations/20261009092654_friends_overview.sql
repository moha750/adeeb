-- تبويبُ «أصدقاء أدِيب» (قرار المالك ٢٠٢٦-١٠-٠٩)
--
-- للرئاسة وحدها: رئيسُ النادي ومستشارُه ورئيسُ المجلس التنفيذيّ. قفلٌ جديد `view_friends`.
--
-- **الصديقُ** كلُّ صاحب حسابٍ ليس عضوًا ولا متطوّعًا الآن (`adeeb_standing = 'visitor'`)،
-- **أكمل ملفَّه أو لم يُكمله**: الحسابُ بلا ملفٍّ يُقرأ ببريده من `auth.users` (قرار المالك).
-- ويُستثنى حسابُ النادي المؤسّسيّ (`adeeb_admin`) ومن حُذف ملفُّه.
--
-- **ويُقرأ ببرامج أدِيب كلِّها لا بالفعاليّات وحدها** (اعتراضُ المالك على المعاينة الأولى):
-- الفعاليّات، ودربك خضر، والاستبيانات، والإذاعة (بالمتابعة: الاستماعُ يُسجَّل بالجهاز لا بالحساب)،
-- ومحادثاتُ ديبو المحفوظة. صفٌّ واحدٌ لكلّ صديق، وكلُّ برنامجٍ أعمدتُه، والنافذةُ تقرأ منه.
--
-- دالّةٌ واحدة لا قراءاتٌ متفرّقة: البرامجُ خمسةُ جداول وبريدُ الحساب في `auth`، فتُجمع في القاعدة
-- مرّةً ولا يُسحب كلُّ جدولٍ كاملًا إلى الخادم. تُنادى بمفتاح الخدمة وحده.

insert into public.permissions (permission_key, permission_name_ar, category, description)
values ('view_friends', 'عرض أصدقاء أدِيب', 'membership',
        'تبويب أصدقاء أدِيب: من له حساب بلا عضوية ولا تطوّع، وبرامج أدِيب التي شارك فيها، وبيانات التواصل معه')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_name, permission_id)
select r, p.id from public.permissions p,
  unnest(array['club_president', 'president_advisor', 'executive_council_president']) as r
where p.permission_key = 'view_friends'
on conflict do nothing;

create or replace function public.friends_overview()
 returns table (
   user_id uuid, full_name text, email text, phone text, gender text, city text,
   has_profile boolean, was_member boolean, volunteered_before boolean,
   account_created timestamptz, last_sign_in timestamptz,
   events_booked integer, events_attended integer, events_last_attended timestamptz, events_last timestamptz,
   darb_nickname text, darb_best integer, darb_runs integer, darb_tamr integer, darb_last timestamptz,
   radio_shows text[], radio_last timestamptz,
   surveys_done integer, surveys_last timestamptz,
   deebo_chats integer, deebo_last timestamptz
 )
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with friends as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at
    from auth.users u
    left join profiles p on p.id = u.id
    where p.deleted_at is null
      and adeeb_standing(u.id) = 'visitor'
      and not exists (select 1 from user_roles ur where ur.user_id = u.id and ur.role_name = 'adeeb_admin' and ur.is_active)
  ),
  ev as (
    select r.user_id,
           count(*) filter (where r.status <> 'cancelled')::int as booked,
           count(*) filter (where r.attendance_status = 'attended')::int as attended,
           max(r.attended_at) as last_attended,
           greatest(max(r.reserved_at), max(r.attended_at)) as last_any
    from activity_reservations r join friends f on f.id = r.user_id
    group by r.user_id
  ),
  rf as (
    select x.user_id, array_agg(s.title order by x.created_at) as shows, max(x.created_at) as last_at
    from radio_show_followers x join radio_shows s on s.id = x.show_id join friends f on f.id = x.user_id
    group by x.user_id
  ),
  sv as (
    select s.user_id, count(*) filter (where s.completed_at is not null)::int as done,
           max(coalesce(s.completed_at, s.updated_at)) as last_at
    from survey_responses s join friends f on f.id = s.user_id
    group by s.user_id
  ),
  dc as (
    select c.user_id, count(*)::int as chats, max(c.last_at) as last_at
    from deebo_conversations c join friends f on f.id = c.user_id
    where c.hidden_at is null
    group by c.user_id
  )
  select f.id, p.full_name, f.email, p.phone, p.gender, p.city,
         p.id is not null,
         coalesce(p.joined_date is not null and p.account_status = 'suspended', false),
         exists (select 1 from volunteers v where v.user_id = f.id and v.status = 'former'),
         f.created_at, f.last_sign_in_at,
         coalesce(ev.booked, 0), coalesce(ev.attended, 0), ev.last_attended, ev.last_any,
         d.nickname, d.best_dist, d.runs, d.tamr_total, d.last_seen_at,
         rf.shows, rf.last_at,
         coalesce(sv.done, 0), sv.last_at,
         coalesce(dc.chats, 0), dc.last_at
  from friends f
  left join profiles p on p.id = f.id
  left join ev on ev.user_id = f.id
  left join darb_players d on d.user_id = f.id
  left join rf on rf.user_id = f.id
  left join sv on sv.user_id = f.id
  left join dc on dc.user_id = f.id;
$function$;

revoke all on function public.friends_overview() from public, anon, authenticated;
grant execute on function public.friends_overview() to service_role;
